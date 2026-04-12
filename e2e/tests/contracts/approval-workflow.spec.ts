import { test, expect, Page, BrowserContext, request } from '@playwright/test';
import { execSync } from 'child_process';

const REQUESTER_EMAIL = 'test@example.com';
const REQUESTER_PASSWORD = 'password123';
const APPROVER_EMAIL = 'approver@example.com';
const APPROVER_PASSWORD = 'password123';

const BFF_URL = process.env.BFF_URL || 'http://localhost:8080';

/**
 * Robust login that retries 3 times. We can't depend on the global
 * test-helpers `login()` because shared test state (large audit_logs / many
 * accumulated sessions) can make a single login attempt slow enough to
 * exceed its 15s timeout when this spec runs after the rest of the suite.
 */
async function loginWithRetry(page: Page, email: string, password: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 20000 });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      await page.waitForTimeout(1500);
    }
  }
}

/**
 * Ensure the approver user exists. Uses a direct DB upsert (no API login)
 * to avoid spending a login-rate-limit token.
 */
function ensureApproverUser() {
  // Run docker compose from the project root (e2e/ has no compose file).
  execSync(
    `docker compose exec -T bff-db psql -U bff_user -d bff_db -c "INSERT INTO users (email, password_hash, name, role_id) VALUES ('${APPROVER_EMAIL}', (SELECT password_hash FROM users WHERE email='${REQUESTER_EMAIL}'), '承認者太郎', 'contract-manager') ON CONFLICT (email) DO NOTHING;"`,
    { stdio: 'inherit', cwd: `${__dirname}/../../..` },
  );
}

/**
 * Create a fresh ACTIVE contract using the supplied APIRequestContext.
 * The caller is responsible for logging in once and keeping the context
 * alive across helpers — we want to minimize login calls because BFF
 * rate-limits /api/v1/auth/login at 10/min/IP burst 10.
 */
async function createActiveContract(
  ctx: import('@playwright/test').APIRequestContext,
): Promise<string> {
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

  const activateRes = await ctx.put(
    `${BFF_URL}/api/v1/contracts/${contractId}`,
    {
      data: {
        status: 'ACTIVE',
        start_date: '2026-04-01',
        end_date: '2027-03-31',
        monthly_fee: '50000',
        initial_fee: '100000',
      },
    },
  );
  expect(activateRes.ok()).toBeTruthy();
  return contractId;
}

test.describe.serial('承認ワークフロー E2E', () => {
  let requesterContext: BrowserContext;
  let approverContext: BrowserContext;
  let requesterPage: Page;
  let approverPage: Page;
  let apiCtx: import('@playwright/test').APIRequestContext;
  let contractId: string;

  test.beforeAll(async ({ browser }) => {
    ensureApproverUser();

    // Total login budget for this entire spec: 3 (1 API + 2 browser).
    // Verification calls reuse the same APIRequestContext to avoid extras.
    apiCtx = await request.newContext();
    const apiLogin = await apiCtx.post(`${BFF_URL}/api/v1/auth/login`, {
      data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
    });
    expect(apiLogin.ok()).toBeTruthy();

    contractId = await createActiveContract(apiCtx);

    // Isolated browser contexts so cookie state cannot bleed between
    // requester/approver and isn't left behind for subsequent specs.
    requesterContext = await browser.newContext();
    requesterPage = await requesterContext.newPage();
    await loginWithRetry(requesterPage, REQUESTER_EMAIL, REQUESTER_PASSWORD);

    approverContext = await browser.newContext();
    approverPage = await approverContext.newPage();
    await loginWithRetry(approverPage, APPROVER_EMAIL, APPROVER_PASSWORD);
  });

  test.afterAll(async () => {
    await requesterContext?.close();
    await approverContext?.close();
    await apiCtx?.dispose();
  });

  test('申請者が金額変更すると承認待ちになる (202)', async () => {
    await requesterPage.goto(`/dashboard/contracts/${contractId}/edit`);
    await requesterPage.waitForSelector('#monthly_fee');
    await requesterPage.fill('#monthly_fee', '75000');

    await expect(requesterPage.locator('button[type="submit"]')).toContainText(
      '承認申請',
    );

    await requesterPage.click('button[type="submit"]');

    await expect(
      requesterPage.locator('text=承認待ちです'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('申請者は契約詳細で承認待ちバッジ + 編集ボタン非表示 + 却下理由（今回は無し）を確認', async () => {
    await requesterPage.goto(`/dashboard/contracts/${contractId}`);
    await expect(
      requesterPage.locator('text=承認待ち').first(),
    ).toBeVisible({ timeout: 10000 });

    // 編集・解約ボタンは非表示（要件#7全面ロック）
    await expect(requesterPage.locator('button:has-text("編集")')).toHaveCount(0);
    await expect(requesterPage.locator('button:has-text("解約")')).toHaveCount(0);
    // ロックバナーが表示される
    await expect(
      requesterPage.locator('text=承認待ちのため編集・解約はロック中です'),
    ).toBeVisible();
  });

  test('承認者の承認待ち一覧に表示される（自分の申請は除外）', async () => {
    await approverPage.goto('/dashboard/approvals');
    await expect(
      approverPage.locator('text=承認待ち').first(),
    ).toBeVisible({ timeout: 10000 });

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

    // API でも契約金額の実更新を検証（既存の apiCtx を再利用、追加loginなし）
    const verify = await apiCtx.get(`${BFF_URL}/api/v1/contracts/${contractId}`);
    const data = await verify.json();
    expect(data.contract.monthly_fee).toBe('75000.00');
  });

  test('却下フロー: 新規申請 → 承認者却下 → 申請者の契約詳細に却下理由が表示される (H1 verification)', async () => {
    // 申請者が再度金額変更（新しい承認ワークフロー作成）
    await requesterPage.goto(`/dashboard/contracts/${contractId}/edit`);
    await requesterPage.waitForSelector('#monthly_fee');
    await requesterPage.fill('#monthly_fee', '99999');
    await requesterPage.click('button[type="submit"]');
    await expect(
      requesterPage.locator('text=承認待ちです'),
    ).toBeVisible({ timeout: 10000 });

    // 承認者が却下
    await approverPage.goto('/dashboard/approvals');
    const row = approverPage.locator('tr', { hasText: 'C-' }).first();
    await row.click();
    await approverPage.waitForURL(/\/dashboard\/approvals\/[a-f0-9-]+/);
    await approverPage.click('button:has-text("却下")');
    // 却下ダイアログで理由を入力（最小10文字）
    const reasonInput = approverPage.locator(
      'textarea[name="rejection_reason"], textarea#rejection_reason, textarea',
    ).first();
    await reasonInput.fill('金額が予算上限を超過しているため却下します');
    await approverPage.click('button:has-text("却下する")');
    await approverPage.waitForURL('**/dashboard/approvals', { timeout: 10000 });

    // 申請者の契約詳細画面に却下理由が表示される（H1 検証）
    await requesterPage.goto(`/dashboard/contracts/${contractId}`);
    await expect(
      requesterPage.locator('text=直近の申請は却下されました'),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      requesterPage.locator('text=金額が予算上限を超過'),
    ).toBeVisible();
  });
});
