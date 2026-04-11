import { test, expect, Page } from '@playwright/test';
import { login, waitForElement } from '../../utils/test-helpers';

test.describe.serial('サービス管理', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, process.env.TEST_USER_EMAIL || 'test@example.com', process.env.TEST_USER_PASSWORD || 'password123');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('サービス一覧画面が表示される', async () => {
    await page.goto('/dashboard/services');
    await waitForElement(page, 'table');

    // ヘッダーが表示される
    await expect(page.locator('h2:has-text("サービス一覧")')).toBeVisible();

    // シードデータが表示される（テーブルのサービス名列で確認）
    await expect(page.locator('table tbody tr:first-child')).toBeVisible();
    const tableText = await page.locator('table tbody').textContent();
    expect(tableText).toContain('決済サービス');
    expect(tableText).toContain('ポイントサービス');
  });

  test('サービス詳細画面が表示される', async () => {
    await page.goto('/dashboard/services');
    await waitForElement(page, 'table');

    // 最初のサービスの名前を取得
    const firstServiceName = await page.locator('table tbody tr:first-child td:nth-child(2)').textContent();

    // 最初のサービスをクリック
    await page.click('table tbody tr:first-child');

    // 詳細画面が表示される
    await expect(page).toHaveURL(/.*services\/[a-f0-9-]+$/);

    // サービス名がh2で表示される
    if (firstServiceName) {
      await expect(page.locator('h2')).toContainText(firstServiceName.trim());
    }

    // 基本情報カードが表示される
    await expect(page.locator('text=基本情報')).toBeVisible();

    // サービスコードが表示される
    await expect(page.locator('text=サービスコード')).toBeVisible();

    // 有効/無効ステータスが表示される
    const statusBadge = page.locator('span.inline-flex:has-text("有効"), span.inline-flex:has-text("無効")');
    await expect(statusBadge.first()).toBeVisible();
  });

  test('サービス登録画面にアクセスして権限エラーを確認する', async () => {
    await page.goto('/dashboard/services/new');

    // フォームが表示される
    await expect(page.locator('text=サービス情報')).toBeVisible();

    // フォームに入力
    await page.fill('#name', 'E2Eテストサービス');
    await page.fill('#description', 'テスト用サービスです');

    // 登録ボタンをクリック
    await page.click('button:has-text("登録")');

    // テストユーザー(contract-manager)にはservices:create権限がないためエラーが表示される
    // APIエラーメッセージが表示されるまで待機
    await expect(
      page.locator('.text-destructive:not(span), [role="alert"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test('サイドバーに「サービス管理」リンクがある', async () => {
    await page.goto('/dashboard');

    // サイドバーに「サービス管理」リンクが表示される
    const serviceLink = page.locator('a:has-text("サービス管理")');
    await expect(serviceLink).toBeVisible();

    // クリックすると /dashboard/services に遷移する
    await serviceLink.click();
    await expect(page).toHaveURL(/.*\/dashboard\/services$/);
  });
});
