import { test, expect, Page, BrowserContext, request } from '@playwright/test';
import { execSync } from 'child_process';

const REQUESTER_EMAIL = 'test@example.com';
const REQUESTER_PASSWORD = 'password123';
const APPROVER_EMAIL = 'approver@example.com';
const APPROVER_PASSWORD = 'password123';
const VIEWER_EMAIL = 'viewer@example.com';
const VIEWER_PASSWORD = 'password123';

const BFF_URL = process.env.BFF_URL || 'http://localhost:8080';
const BADGE = '[data-testid="approval-count-badge"]';
const APPROVAL_NAV = 'a[href="/dashboard/approvals"]';

function ensureApproverUser() {
  execSync(
    `docker compose exec -T bff-db psql -U bff_user -d bff_db -c "INSERT INTO users (email, password_hash, name, role_id) VALUES ('${APPROVER_EMAIL}', (SELECT password_hash FROM users WHERE email='${REQUESTER_EMAIL}'), '承認者太郎', 'contract-manager') ON CONFLICT (email) DO NOTHING;"`,
    { stdio: 'inherit', cwd: `${__dirname}/../../..` },
  );
}

function ensureViewerUser() {
  execSync(
    `docker compose exec -T bff-db psql -U bff_user -d bff_db -c "INSERT INTO users (email, password_hash, name, role_id) VALUES ('${VIEWER_EMAIL}', (SELECT password_hash FROM users WHERE email='${REQUESTER_EMAIL}'), '閲覧太郎', 'viewer') ON CONFLICT (email) DO NOTHING;"`,
    { stdio: 'inherit', cwd: `${__dirname}/../../..` },
  );
}

/**
 * Clear any pending approval workflows so the spec has a deterministic
 * baseline for scenario 1 (zero badge). Other specs may have left approved
 * / rejected workflows but we only care about PENDING here.
 */
function clearPendingApprovals() {
  execSync(
    `docker compose exec -T backend-db psql -U backend_user -d backend_db -c "UPDATE approval_workflows SET status='REJECTED', rejection_reason='cleared by e2e' WHERE status='PENDING';"`,
    { stdio: 'inherit', cwd: `${__dirname}/../../..` },
  );
}

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

test.describe.serial('承認待ち件数バッジ E2E', () => {
  let apiCtx: import('@playwright/test').APIRequestContext;
  let requesterContext: BrowserContext;
  let approverContext: BrowserContext;
  let viewerContext: BrowserContext;
  let requesterPage: Page;
  let approverPage: Page;
  let viewerPage: Page;
  let contractId: string;

  test.beforeAll(async ({ browser }) => {
    ensureApproverUser();
    ensureViewerUser();
    clearPendingApprovals();

    // Login budget: 3 total (API only, no browser UI logins).
    // BFF rate-limits POST /auth/login at 10/min/IP burst 10, and this spec
    // runs at the tail of the suite so we minimize token usage.
    apiCtx = await request.newContext();
    const apiLogin = await apiCtx.post(`${BFF_URL}/api/v1/auth/login`, {
      data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD },
    });
    expect(apiLogin.ok()).toBeTruthy();

    contractId = await createActiveContract(apiCtx);

    // Reuse the API session cookie jar for the requester browser context
    // (httpOnly session + csrf cookies transfer via storageState).
    const requesterState = await apiCtx.storageState();
    requesterContext = await browser.newContext({ storageState: requesterState });
    requesterPage = await requesterContext.newPage();

    // Approver: separate API login → storageState → browser context.
    const approverApi = await request.newContext();
    const approverLogin = await approverApi.post(`${BFF_URL}/api/v1/auth/login`, {
      data: { email: APPROVER_EMAIL, password: APPROVER_PASSWORD },
    });
    expect(approverLogin.ok()).toBeTruthy();
    approverContext = await browser.newContext({
      storageState: await approverApi.storageState(),
    });
    approverPage = await approverContext.newPage();
    await approverApi.dispose();

    // Viewer: same pattern.
    const viewerApi = await request.newContext();
    const viewerLogin = await viewerApi.post(`${BFF_URL}/api/v1/auth/login`, {
      data: { email: VIEWER_EMAIL, password: VIEWER_PASSWORD },
    });
    expect(viewerLogin.ok()).toBeTruthy();
    viewerContext = await browser.newContext({
      storageState: await viewerApi.storageState(),
    });
    viewerPage = await viewerContext.newPage();
    await viewerApi.dispose();
  });

  test.afterAll(async () => {
    await requesterContext?.close();
    await approverContext?.close();
    await viewerContext?.close();
    await apiCtx?.dispose();
  });

  test('1. 初期状態: 承認待ち 0 件で承認者サイドバーのバッジ非表示', async () => {
    await approverPage.goto('/dashboard');
    // 承認管理ナビは表示される (contract-manager は contracts:approve 保持)
    await expect(approverPage.locator(APPROVAL_NAV)).toBeVisible();
    // バッジは描画されない (count=0)
    await expect(approverPage.locator(BADGE)).toHaveCount(0);
  });

  test('2. 申請者には自分の申請がカウントされない (SoD 検証)', async () => {
    // 申請者が金額変更 → 承認待ち作成
    await requesterPage.goto(`/dashboard/contracts/${contractId}/edit`);
    await requesterPage.waitForSelector('#monthly_fee');
    await requesterPage.fill('#monthly_fee', '75000');
    await requesterPage.click('button[type="submit"]');
    await expect(
      requesterPage.locator('text=承認待ちです'),
    ).toBeVisible({ timeout: 10000 });

    // 申請者のサイドバー: 承認管理ナビは表示 (contract-manager 権限持ち)、
    // しかし自分の申請は exclude_requester_id で除外されるのでバッジ非表示
    await requesterPage.goto('/dashboard');
    await expect(requesterPage.locator(APPROVAL_NAV)).toBeVisible();
    await expect(requesterPage.locator(BADGE)).toHaveCount(0);
  });

  test('3. 承認者には他人の申請が件数に含まれる', async () => {
    // 承認者のページをハードリロードしてキャッシュを無効化
    await approverPage.goto('/dashboard');
    await approverPage.reload({ waitUntil: 'domcontentloaded' });
    const badge = approverPage.locator(BADGE);
    await expect(badge).toBeVisible({ timeout: 15000 });
    await expect(badge).toHaveText(/\d+/);
    const text = (await badge.textContent())?.trim() ?? '';
    expect(Number(text)).toBeGreaterThanOrEqual(1);
    // aria-label には「あなたが承認可能な申請: N 件」の形式
    await expect(badge).toHaveAttribute('aria-label', /あなたが承認可能な申請: \d+ 件/);
  });

  test('4. 承認実行後、バッジ件数が減少する', async () => {
    await approverPage.goto('/dashboard/approvals');
    const row = approverPage.locator('tr', { hasText: 'C-' }).first();
    await row.click();
    await approverPage.waitForURL(/\/dashboard\/approvals\/[a-f0-9-]+/);
    await approverPage.click('button:has-text("承認"):not(:has-text("承認する"))');
    await approverPage.click('button:has-text("承認する")');
    await approverPage.waitForURL('**/dashboard/approvals', { timeout: 10000 });

    // invalidate により即時更新。ダッシュボードへ戻ってバッジが消えていることを確認。
    await approverPage.goto('/dashboard');
    await expect(approverPage.locator(APPROVAL_NAV)).toBeVisible();
    await expect(approverPage.locator(BADGE)).toHaveCount(0);
  });

  test('5. 権限がないユーザーにはサイドバーに承認管理が表示されない', async () => {
    await viewerPage.goto('/dashboard');
    // サイドバー自体は表示されるが、承認管理ナビは存在しない
    await expect(viewerPage.locator('h1:has-text("契約管理システム")')).toBeVisible();
    await expect(viewerPage.locator(APPROVAL_NAV)).toHaveCount(0);
    await expect(viewerPage.locator(BADGE)).toHaveCount(0);
  });
});
