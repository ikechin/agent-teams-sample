import { test, expect, Page, request } from '@playwright/test';
import { execSync } from 'child_process';
import { login } from '../../utils/test-helpers';

const REQUESTER_EMAIL = 'test@example.com';
const REQUESTER_PASSWORD = 'password123';
const APPROVER_EMAIL = 'approver@example.com';
const APPROVER_PASSWORD = 'password123';

const BFF_URL = process.env.BFF_URL || 'http://localhost:8080';

async function ensureApproverUser() {
  const ctx = await request.newContext();
  const res = await ctx.post(`${BFF_URL}/api/v1/auth/login`, {
    data: { email: APPROVER_EMAIL, password: APPROVER_PASSWORD },
    failOnStatusCode: false,
  });
  if (res.ok()) {
    await ctx.dispose();
    return;
  }
  await ctx.dispose();

  execSync(
    `docker compose exec -T bff-db psql -U bff_user -d bff_db -c "INSERT INTO users (email, password_hash, name, role_id) VALUES ('${APPROVER_EMAIL}', (SELECT password_hash FROM users WHERE email='${REQUESTER_EMAIL}'), '承認者太郎', 'contract-manager') ON CONFLICT (email) DO NOTHING;"`,
    { stdio: 'inherit' },
  );
}

async function createActiveContract(): Promise<{ contractId: string }> {
  const ctx = await request.newContext();
  const loginRes = await ctx.post(`${BFF_URL}/api/v1/auth/login`, {
    data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
  });
  expect(loginRes.ok()).toBeTruthy();

  const merchantsRes = await ctx.get(`${BFF_URL}/api/v1/merchants?limit=1`);
  const servicesRes = await ctx.get(`${BFF_URL}/api/v1/services?limit=1`);
  const merchantId = (await merchantsRes.json()).merchants[0].merchant_id;
  const serviceId = (await servicesRes.json()).services[0].service_id;

  const createRes = await ctx.post(`${BFF_URL}/api/v1/contracts`, {
    data: {
      merchant_id: merchantId,
      service_id: serviceId,
      start_date: '2026-04-01',
      end_date: '2027-03-31',
      monthly_fee: '50000',
      initial_fee: '100000',
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const contractId = (await createRes.json()).contract.contract_id;

  // DRAFT → ACTIVE (no amount change, so direct update)
  const activateRes = await ctx.put(`${BFF_URL}/api/v1/contracts/${contractId}`, {
    data: {
      status: 'ACTIVE',
      start_date: '2026-04-01',
      end_date: '2027-03-31',
      monthly_fee: '50000',
      initial_fee: '100000',
    },
  });
  expect(activateRes.ok()).toBeTruthy();

  await ctx.dispose();
  return { contractId };
}

test.describe.serial('承認ワークフロー E2E', () => {
  let requesterPage: Page;
  let approverPage: Page;
  let contractId: string;

  test.beforeAll(async ({ browser }) => {
    await ensureApproverUser();
    const created = await createActiveContract();
    contractId = created.contractId;

    requesterPage = await browser.newPage();
    await login(requesterPage, REQUESTER_EMAIL, REQUESTER_PASSWORD);

    approverPage = await browser.newPage();
    await login(approverPage, APPROVER_EMAIL, APPROVER_PASSWORD);
  });

  test.afterAll(async () => {
    await requesterPage?.close();
    await approverPage?.close();
  });

  test('申請者が金額変更すると承認待ちになる (202)', async () => {
    await requesterPage.goto(`/dashboard/contracts/${contractId}/edit`);
    await requesterPage.waitForSelector('#monthly_fee');
    await requesterPage.fill('#monthly_fee', '75000');

    await expect(requesterPage.locator('button[type="submit"]')).toContainText('承認申請');

    await requesterPage.click('button[type="submit"]');

    await expect(requesterPage.locator('text=承認待ちです')).toBeVisible({ timeout: 10000 });
  });

  test('申請者は契約詳細で承認待ちバッジ表示と編集ボタン非活性化を確認', async () => {
    await requesterPage.goto(`/dashboard/contracts/${contractId}`);
    await expect(requesterPage.locator('text=承認待ち').first()).toBeVisible({ timeout: 10000 });

    // 編集・解約ボタンは非表示（要件#7全面ロック）
    await expect(requesterPage.locator('button:has-text("編集")')).toHaveCount(0);
    await expect(requesterPage.locator('button:has-text("解約")')).toHaveCount(0);
    // ロックバナーが表示される
    await expect(requesterPage.locator('text=承認待ちのため編集・解約はロック中です')).toBeVisible();
  });

  test('承認者の承認待ち一覧に表示される（自分の申請は除外）', async () => {
    await approverPage.goto('/dashboard/approvals');
    await expect(approverPage.locator('text=承認待ち').first()).toBeVisible({ timeout: 10000 });

    const row = approverPage.locator('tr', { hasText: 'C-' }).first();
    await expect(row).toBeVisible();
  });

  test('承認者が承認すると契約金額が更新される', async () => {
    await approverPage.goto('/dashboard/approvals');
    const row = approverPage.locator('tr', { hasText: 'C-' }).first();
    await row.click();

    await approverPage.waitForURL(/\/dashboard\/approvals\/[a-f0-9-]+/);
    await approverPage.click('button:has-text("承認"):not(:has-text("承認する"))');
    await approverPage.click('button:has-text("承認する")');

    // 承認後は承認待ち一覧へリダイレクトされる
    await approverPage.waitForURL('**/dashboard/approvals', { timeout: 10000 });

    const ctx = await request.newContext();
    await ctx.post(`${BFF_URL}/api/v1/auth/login`, {
      data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
    });
    const verify = await ctx.get(`${BFF_URL}/api/v1/contracts/${contractId}`);
    const data = await verify.json();
    expect(data.contract.monthly_fee).toBe('75000.00');
    await ctx.dispose();
  });
});
