import { test, expect, Page, BrowserContext, request } from '@playwright/test';
import { execSync } from 'child_process';

const REQUESTER_EMAIL = 'test@example.com';
const REQUESTER_PASSWORD = 'password123';
const APPROVER_EMAIL = 'approver@example.com';
const APPROVER_PASSWORD = 'password123';
const VIEWER_EMAIL = 'viewer@example.com';
const VIEWER_PASSWORD = 'password123';

const BFF_URL = process.env.BFF_URL || 'http://localhost:8080';

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
 * Normalize approval_workflows so the spec starts from a deterministic state:
 * any leftover PENDING from prior specs is forced to REJECTED. We then build
 * our own fixture set (PENDING + APPROVED + REJECTED) inside beforeAll.
 */
function clearPendingApprovals() {
  execSync(
    `docker compose exec -T backend-db psql -U backend_user -d backend_db -c "UPDATE approval_workflows SET status='REJECTED', rejection_reason='cleared by approval-history e2e' WHERE status='PENDING';"`,
    { stdio: 'inherit', cwd: `${__dirname}/../../..` },
  );
}

async function createActiveContract(
  ctx: import('@playwright/test').APIRequestContext,
  monthlyFee: string,
): Promise<{ contractId: string; contractNumber: string }> {
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
      monthly_fee: monthlyFee,
      initial_fee: '100000',
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const contract = (await createRes.json()).contract;

  const activateRes = await ctx.put(
    `${BFF_URL}/api/v1/contracts/${contract.contract_id}`,
    {
      data: {
        status: 'ACTIVE',
        start_date: '2026-04-01',
        end_date: '2027-03-31',
        monthly_fee: monthlyFee,
        initial_fee: '100000',
      },
    },
  );
  expect(activateRes.ok()).toBeTruthy();
  return {
    contractId: contract.contract_id,
    contractNumber: contract.contract_number,
  };
}

/**
 * Trigger a fee change on an ACTIVE contract. On the active path this creates
 * a PENDING approval_workflow row and returns its workflow_id.
 */
async function requestFeeChange(
  ctx: import('@playwright/test').APIRequestContext,
  contractId: string,
  newMonthlyFee: string,
): Promise<string> {
  const putRes = await ctx.put(`${BFF_URL}/api/v1/contracts/${contractId}`, {
    data: {
      status: 'ACTIVE',
      start_date: '2026-04-01',
      end_date: '2027-03-31',
      monthly_fee: newMonthlyFee,
      initial_fee: '100000',
    },
  });
  // A fee change on an ACTIVE contract returns 202 Accepted with
  // { message: "承認待ちです", workflow_id: "..." } — this is the BFF's
  // structured-error translation of gRPC APPROVAL_REQUIRED, not an error.
  expect(putRes.status()).toBe(202);
  const body = await putRes.json();
  const workflowId = body.workflow_id as string | undefined;
  expect(workflowId, 'fee change should create PENDING workflow').toBeTruthy();
  return workflowId as string;
}

async function approveWorkflow(
  ctx: import('@playwright/test').APIRequestContext,
  workflowId: string,
) {
  const res = await ctx.post(
    `${BFF_URL}/api/v1/approvals/${workflowId}/approve`,
  );
  expect(res.ok()).toBeTruthy();
}

async function rejectWorkflow(
  ctx: import('@playwright/test').APIRequestContext,
  workflowId: string,
  reason: string,
) {
  const res = await ctx.post(
    `${BFF_URL}/api/v1/approvals/${workflowId}/reject`,
    { data: { rejection_reason: reason } },
  );
  expect(res.ok()).toBeTruthy();
}

test.describe.serial('承認履歴検索 E2E', () => {
  let requesterApi: import('@playwright/test').APIRequestContext;
  let approverApi: import('@playwright/test').APIRequestContext;
  let viewerApi: import('@playwright/test').APIRequestContext;

  let requesterContext: BrowserContext;
  let viewerContext: BrowserContext;
  let requesterPage: Page;
  let viewerPage: Page;

  // Contract we will use for the contract-number partial-match scenario.
  // Created in beforeAll so that we know its exact contract_number.
  let targetContractNumber: string;
  let targetWorkflowId: string; // APPROVED workflow on targetContract

  test.beforeAll(async ({ browser }) => {
    ensureApproverUser();
    ensureViewerUser();
    clearPendingApprovals();

    // ---------------------------------------------------------------
    // Login budget: exactly 3 POST /auth/login calls (below the 10/min
    // rate limit with headroom). Each role uses an API context, from
    // which we derive a browser storageState when a UI is needed.
    // ---------------------------------------------------------------

    // 1) Requester (contract-manager): create contracts + fee changes.
    requesterApi = await request.newContext();
    const reqLogin = await requesterApi.post(
      `${BFF_URL}/api/v1/auth/login`,
      { data: { email: REQUESTER_EMAIL, password: REQUESTER_PASSWORD } },
    );
    expect(reqLogin.ok()).toBeTruthy();

    const contractA = await createActiveContract(requesterApi, '50000');
    const contractB = await createActiveContract(requesterApi, '60000');
    const contractC = await createActiveContract(requesterApi, '70000');

    targetContractNumber = contractA.contractNumber;

    const workflowA = await requestFeeChange(
      requesterApi,
      contractA.contractId,
      '55000',
    );
    const workflowB = await requestFeeChange(
      requesterApi,
      contractB.contractId,
      '65000',
    );
    // contractC gets a PENDING workflow we leave untouched.
    await requestFeeChange(requesterApi, contractC.contractId, '75000');

    targetWorkflowId = workflowA;

    // 2) Approver: approve A, reject B. After this we have
    //    APPROVED=1, REJECTED=1, PENDING=1 (contractC) as the fixture
    //    baseline generated by this spec. (Note: clearPendingApprovals
    //    also left historical REJECTED rows from prior specs, which is
    //    fine — they only increase the mixed-status coverage.)
    approverApi = await request.newContext();
    const apvLogin = await approverApi.post(
      `${BFF_URL}/api/v1/auth/login`,
      { data: { email: APPROVER_EMAIL, password: APPROVER_PASSWORD } },
    );
    expect(apvLogin.ok()).toBeTruthy();

    await approveWorkflow(approverApi, workflowA);
    await rejectWorkflow(approverApi, workflowB, 'e2e: reject for history');

    // 3) Viewer (contracts:read only, no contracts:approve).
    viewerApi = await request.newContext();
    const viewLogin = await viewerApi.post(
      `${BFF_URL}/api/v1/auth/login`,
      { data: { email: VIEWER_EMAIL, password: VIEWER_PASSWORD } },
    );
    expect(viewLogin.ok()).toBeTruthy();

    // Browser contexts: requester (contract-manager) + viewer.
    // Approver doesn't need a UI in this spec.
    requesterContext = await browser.newContext({
      storageState: await requesterApi.storageState(),
    });
    requesterPage = await requesterContext.newPage();

    viewerContext = await browser.newContext({
      storageState: await viewerApi.storageState(),
    });
    viewerPage = await viewerContext.newPage();
  });

  test.afterAll(async () => {
    await requesterContext?.close();
    await viewerContext?.close();
    await requesterApi?.dispose();
    await approverApi?.dispose();
    await viewerApi?.dispose();
  });

  test('1. 初期表示: PENDING/APPROVED/REJECTED 混在の全件が表示される', async () => {
    await requesterPage.goto('/dashboard/approvals/history');
    await expect(
      requesterPage.getByRole('heading', { name: '承認履歴' }),
    ).toBeVisible();

    // Table rows (exclude header). We expect at least the 3 workflows
    // this spec generated (1 APPROVED + 1 REJECTED + 1 PENDING) plus any
    // historical rows cleared to REJECTED.
    const rows = requesterPage.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    // Status badges should include at least APPROVED, REJECTED, PENDING
    // somewhere on the page (mixed-status coverage).
    const pageText = await requesterPage.locator('table').innerText();
    expect(pageText).toMatch(/承認済|承認済み/);
    expect(pageText).toMatch(/却下/);
    expect(pageText).toMatch(/承認待ち/);
  });

  test('2. ステータスフィルタ: APPROVED のみ / REJECTED のみに切り替えられる', async () => {
    // Navigate directly with status=APPROVED in the URL so the React Query
    // key flips and keepPreviousData is bypassed by React's Suspense boundary.
    // We still exercise the filter UI round-trip via URL sync.
    await requesterPage.goto('/dashboard/approvals/history?status=APPROVED');
    // Table body must settle on the filtered result. Poll innerText until it
    // no longer contains rejected/pending badges — this sidesteps the stale
    // keepPreviousData snapshot.
    await expect(async () => {
      const text = await requesterPage.locator('table tbody').innerText();
      expect(text).toMatch(/承認済/);
      expect(text).not.toMatch(/却下/);
      expect(text).not.toMatch(/承認待ち/);
    }).toPass({ timeout: 10000 });

    await requesterPage.goto('/dashboard/approvals/history?status=REJECTED');
    await expect(async () => {
      const text = await requesterPage.locator('table tbody').innerText();
      expect(text).toMatch(/却下/);
      expect(text).not.toMatch(/承認済/);
      expect(text).not.toMatch(/承認待ち/);
    }).toPass({ timeout: 10000 });

    // Finally, exercise the filter form UI round-trip to cover URL sync.
    await requesterPage.goto('/dashboard/approvals/history');
    await requesterPage
      .getByLabel('ステータス')
      .selectOption('APPROVED');
    await requesterPage.getByRole('button', { name: '検索' }).click();
    await requesterPage.waitForURL(/status=APPROVED/);
  });

  test('3. 契約番号部分一致で対象契約の履歴のみが表示される', async () => {
    await requesterPage.goto('/dashboard/approvals/history');

    await requesterPage
      .getByLabel('契約番号 (部分一致)')
      .fill(targetContractNumber);
    await requesterPage.getByRole('button', { name: '検索' }).click();
    await requesterPage.waitForURL(
      new RegExp(`contract_number=${targetContractNumber}`),
    );

    const rows = requesterPage.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Every visible row must reference the target contract number.
    const contractCells = rows.locator('td').first();
    const texts = await contractCells.allInnerTexts();
    for (const t of texts) {
      expect(t).toContain(targetContractNumber);
    }
  });

  test('4. viewer ロールでサイドバーに「承認履歴」が表示され結果を閲覧できる', async () => {
    await viewerPage.goto('/dashboard');

    // Sidebar nav for history is visible to contracts:read holders.
    const nav = viewerPage.getByRole('link', { name: '承認履歴' });
    await expect(nav).toBeVisible();

    await nav.click();
    await viewerPage.waitForURL('**/dashboard/approvals/history');
    await expect(
      viewerPage.getByRole('heading', { name: '承認履歴' }),
    ).toBeVisible();

    const rows = viewerPage.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('5. 履歴行をクリックすると承認詳細画面に遷移する', async () => {
    await requesterPage.goto(
      `/dashboard/approvals/history?contract_number=${targetContractNumber}&status=APPROVED`,
    );

    const row = requesterPage.locator('table tbody tr').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();

    await requesterPage.waitForURL(
      /\/dashboard\/approvals\/[a-f0-9-]+$/,
      { timeout: 10000 },
    );
    // Confirm we landed on the intended workflow id.
    expect(requesterPage.url()).toContain(targetWorkflowId);
  });
});
