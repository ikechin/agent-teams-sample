import { test, expect, Page } from '@playwright/test';
import { waitForElement } from '../../utils/test-helpers';
import { ROLES } from '../../utils/roles';

test.use({ storageState: ROLES['contract-manager'].storageStatePath });

test.describe.serial('加盟店一覧表示', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({
      storageState: ROLES['contract-manager'].storageStatePath,
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('ログイン後に加盟店一覧画面にアクセスできること', async () => {
    // 加盟店一覧画面に遷移
    await page.goto('/dashboard/merchants');

    // ページが正しく表示されることを確認
    await expect(page).toHaveURL(/.*dashboard\/merchants/);

    // 加盟店一覧のテーブルが表示されることを確認
    const table = page.locator('table, [data-testid="merchant-list"]');
    await expect(table.first()).toBeVisible({ timeout: 10000 });
  });

  test('シードデータ（テスト加盟店1、テスト加盟店2）が表示されること', async () => {
    await page.goto('/dashboard/merchants');

    // テーブルが表示されるまで待機
    await waitForElement(page, 'table');

    // シードデータの加盟店名が表示されることを確認
    await expect(page.locator('text=テスト加盟店1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=テスト加盟店2')).toBeVisible();

    // テーブルに1件以上の行があることを確認（件数はテスト実行順序で変動しうるため固定値にしない）
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('テーブルの各カラム（加盟店コード、名前、住所、担当者）が表示されること', async () => {
    await page.goto('/dashboard/merchants');

    // テーブルが表示されるまで待機
    await waitForElement(page, 'table');

    // テーブルヘッダーの確認
    const headerRow = page.locator('table thead tr');
    await expect(headerRow).toBeVisible();

    // 1件目のシードデータの各カラムが表示されていることを確認（1行目に限定してstrict mode violation回避）
    const firstRow = page.locator('table tbody tr:first-child');
    await expect(firstRow).toBeVisible();

    // テーブル全体にシードデータのカラム値が含まれることを確認
    const tableBody = page.locator('table tbody');
    // 加盟店コード
    await expect(tableBody.locator('text=M-00001').first()).toBeVisible();
    // 名前
    await expect(tableBody.locator('text=テスト加盟店1').first()).toBeVisible();
    // 住所
    await expect(tableBody.locator('text=東京都渋谷区渋谷1-1-1').first()).toBeVisible();
    // 担当者
    await expect(tableBody.locator('text=山田太郎').first()).toBeVisible();

    // 2件目のシードデータも存在することを確認
    await expect(tableBody.locator('text=M-00002').first()).toBeVisible();
    await expect(tableBody.locator('text=テスト加盟店2').first()).toBeVisible();
  });
});
