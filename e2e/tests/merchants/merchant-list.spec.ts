import { test, expect } from '@playwright/test';
import { login, waitForElement } from '../../utils/test-helpers';

test.describe('加盟店一覧表示', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await login(page, process.env.TEST_USER_EMAIL || 'test@example.com', process.env.TEST_USER_PASSWORD || 'password123');
  });

  test('ログイン後に加盟店一覧画面にアクセスできること', async ({ page }) => {
    // 加盟店一覧画面に遷移
    await page.goto('/dashboard/merchants');

    // ページが正しく表示されることを確認
    await expect(page).toHaveURL(/.*dashboard\/merchants/);

    // 加盟店一覧のテーブルまたはリストが表示されることを確認
    const table = page.locator('table, [data-testid="merchant-list"]');
    await expect(table.first()).toBeVisible({ timeout: 10000 });
  });

  test('モックデータ（2件: テスト加盟店1、テスト加盟店2）が表示されること', async ({ page }) => {
    await page.goto('/dashboard/merchants');

    // テーブルが表示されるまで待機
    await waitForElement(page, 'table');

    // モックデータの加盟店名が表示されることを確認
    await expect(page.locator('text=テスト加盟店1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=テスト加盟店2')).toBeVisible();

    // テーブルの行数を確認（ヘッダー行を除く）
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(2);
  });

  test('テーブルの各カラム（加盟店コード、名前、住所、担当者）が表示されること', async ({ page }) => {
    await page.goto('/dashboard/merchants');

    // テーブルが表示されるまで待機
    await waitForElement(page, 'table');

    // テーブルヘッダーの確認
    const headerRow = page.locator('table thead tr');
    await expect(headerRow).toBeVisible();

    // 1件目のモックデータの各カラムが表示されていることを確認
    // 加盟店コード
    await expect(page.locator('text=M-00001')).toBeVisible();
    // 名前
    await expect(page.locator('text=テスト加盟店1')).toBeVisible();
    // 住所
    await expect(page.locator('text=東京都渋谷区渋谷1-1-1')).toBeVisible();
    // 担当者
    await expect(page.locator('text=山田太郎')).toBeVisible();

    // 2件目のモックデータの各カラムが表示されていることを確認
    // 加盟店コード
    await expect(page.locator('text=M-00002')).toBeVisible();
    // 名前
    await expect(page.locator('text=テスト加盟店2')).toBeVisible();
    // 住所
    await expect(page.locator('text=東京都新宿区新宿2-2-2')).toBeVisible();
    // 担当者
    await expect(page.locator('text=佐藤花子')).toBeVisible();
  });
});
