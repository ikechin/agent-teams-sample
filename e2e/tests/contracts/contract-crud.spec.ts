import { test, expect, Page } from '@playwright/test';
import { waitForElement } from '../../utils/test-helpers';
import { ROLES } from '../../utils/roles';

test.use({ storageState: ROLES['contract-manager'].storageStatePath });

test.describe.serial('契約管理CRUD操作', () => {
  let page: Page;
  let createdContractId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({
      storageState: ROLES['contract-manager'].storageStatePath,
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('契約を新規登録できる', async () => {
    await page.goto('/dashboard/contracts/new');

    // フォームが表示される
    await expect(page.locator('text=契約情報')).toBeVisible();

    // 加盟店をドロップダウンから選択（データの読み込みを待つ）
    await expect(async () => {
      const optionCount = await page.locator('#merchant_id option').count();
      expect(optionCount).toBeGreaterThan(1);
    }).toPass({ timeout: 10000 });
    const merchantOptions = await page.locator('#merchant_id option').all();
    const merchantValue = await merchantOptions[1].getAttribute('value');
    if (merchantValue) {
      await page.selectOption('#merchant_id', merchantValue);
    }

    // サービスをドロップダウンから選択（データの読み込みを待つ）
    await expect(async () => {
      const optionCount = await page.locator('#service_id option').count();
      expect(optionCount).toBeGreaterThan(1);
    }).toPass({ timeout: 10000 });
    const serviceOptions = await page.locator('#service_id option').all();
    const serviceValue = await serviceOptions[1].getAttribute('value');
    if (serviceValue) {
      await page.selectOption('#service_id', serviceValue);
    }

    // 開始日を入力
    await page.fill('#start_date', '2026-04-01');

    // 終了日を入力
    await page.fill('#end_date', '2027-03-31');

    // 月額費用を入力
    await page.fill('#monthly_fee', '50000');

    // 初期費用を入力
    await page.fill('#initial_fee', '100000');

    // 登録ボタンをクリック
    await page.click('button:has-text("登録")');

    // 詳細画面にリダイレクトされる
    await expect(page).toHaveURL(/.*contracts\/[a-f0-9-]+$/, { timeout: 15000 });

    // 契約IDをURLから保存
    const url = page.url();
    const match = url.match(/contracts\/([a-f0-9-]+)$/);
    if (match) {
      createdContractId = match[1];
    }

    // 契約番号（C-XXXXX）が表示される
    await expect(page.locator('h2')).toContainText('C-', { timeout: 10000 });

    // ステータスが「下書き」（DRAFT）で表示される
    await expect(page.locator('span.inline-flex:has-text("下書き")').first()).toBeVisible();
  });

  test('契約詳細画面が表示される', async () => {
    // 一覧から契約をクリック
    await page.goto('/dashboard/contracts');
    await waitForElement(page, 'table');

    // 最初の契約をクリック
    await page.click('table tbody tr:first-child');

    // 詳細画面が表示される
    await expect(page).toHaveURL(/.*contracts\/[a-f0-9-]+$/);

    // 契約番号がh2で表示される
    await expect(page.locator('h2')).toContainText('C-');

    // 契約情報カードが表示される
    await expect(page.locator('h3:has-text("契約情報"), [class*="CardTitle"]:has-text("契約情報")')).toBeVisible();

    // 加盟店ラベルが表示される（カード内のラベル）
    await expect(page.locator('p.text-muted-foreground:has-text("加盟店")')).toBeVisible();

    // サービスラベルが表示される（カード内のラベル）
    await expect(page.locator('p.text-muted-foreground:has-text("サービス")')).toBeVisible();

    // ステータスバッジが表示される
    const statusBadge = page.locator('span.inline-flex:has-text("下書き"), span.inline-flex:has-text("有効"), span.inline-flex:has-text("停止中"), span.inline-flex:has-text("解約済")');
    await expect(statusBadge.first()).toBeVisible();

    // 金額が表示される（期間・費用カード）
    await expect(page.locator('text=月額費用')).toBeVisible();
  });

  test('契約一覧画面が表示される', async () => {
    await page.goto('/dashboard/contracts');
    await waitForElement(page, 'table');

    // ヘッダーが表示される
    await expect(page.locator('h2:has-text("契約一覧")')).toBeVisible();

    // テーブルヘッダーが表示される
    await expect(page.locator('text=契約番号')).toBeVisible();

    // ステータスフィルターボタンが存在する
    await expect(page.locator('button:has-text("全て")')).toBeVisible();
    await expect(page.locator('button:has-text("下書き")')).toBeVisible();
    await expect(page.locator('button:has-text("有効")')).toBeVisible();
  });

  test('契約を編集できる（ステータス変更: DRAFT→ACTIVE）', async () => {
    // 登録した契約の詳細画面に遷移
    if (createdContractId) {
      await page.goto(`/dashboard/contracts/${createdContractId}`);
    } else {
      // IDが取得できなかった場合は一覧から最初の契約を選択
      await page.goto('/dashboard/contracts');
      await waitForElement(page, 'table');
      await page.click('table tbody tr:first-child');
    }

    await expect(page).toHaveURL(/.*contracts\/[a-f0-9-]+$/);

    // 編集ボタンをクリック
    await page.click('button:has-text("編集")');
    await expect(page).toHaveURL(/.*edit$/);

    // 編集画面が表示される
    await expect(page.locator('text=契約情報の編集')).toBeVisible();

    // ステータスをACTIVEに変更
    await page.selectOption('#status', 'ACTIVE');

    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');

    // 詳細画面にリダイレクトされる
    await expect(page).toHaveURL(/.*contracts\/[a-f0-9-]+$/, { timeout: 10000 });

    // ステータスが「有効」（ACTIVE）に変わっている
    await expect(page.locator('span.inline-flex:has-text("有効")').first()).toBeVisible({ timeout: 10000 });
  });

  test('契約を解約できる（ACTIVE→TERMINATED）', async () => {
    // 編集した契約の詳細画面に遷移
    if (createdContractId) {
      await page.goto(`/dashboard/contracts/${createdContractId}`);
    } else {
      await page.goto('/dashboard/contracts');
      await waitForElement(page, 'table');
      await page.click('table tbody tr:first-child');
    }

    await expect(page).toHaveURL(/.*contracts\/[a-f0-9-]+$/);

    // 解約ボタンをクリック
    await page.click('button:has-text("解約")');

    // 確認ダイアログが表示される
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=解約しますか')).toBeVisible();

    // 「解約」ボタンをクリック（ダイアログ内）
    await page.locator('[role="dialog"] button:has-text("解約")').click();

    // 解約後、一覧に遷移するか、ステータスが変わる
    // TerminateContractDialogの実装ではrouter.push('/dashboard/contracts')している
    await expect(page).toHaveURL(/.*contracts$/, { timeout: 15000 });
  });

  test('契約登録画面で必須項目が空の場合、バリデーションエラーが表示される', async () => {
    await page.goto('/dashboard/contracts/new');

    // フォームが表示される
    await expect(page.locator('text=契約情報')).toBeVisible();

    // 何も入力せず登録ボタンをクリック
    await page.click('button:has-text("登録")');

    // バリデーションエラーメッセージが表示される
    await expect(page.locator('text=加盟店を選択してください')).toBeVisible();
    await expect(page.locator('text=サービスを選択してください')).toBeVisible();
    await expect(page.locator('text=開始日は必須です')).toBeVisible();
  });

  test('サイドバーに「契約管理」リンクがある', async () => {
    await page.goto('/dashboard');

    // サイドバーに「契約管理」リンクが表示される
    const contractLink = page.locator('a:has-text("契約管理")');
    await expect(contractLink).toBeVisible();

    // クリックすると /dashboard/contracts に遷移する
    await contractLink.click();
    await expect(page).toHaveURL(/.*\/dashboard\/contracts$/);
  });
});
