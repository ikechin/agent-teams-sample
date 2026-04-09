import { test, expect } from '@playwright/test';
import { login } from '../../utils/test-helpers';

test.describe.skip('加盟店CRUD操作（次回タスクで実装予定）', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await login(page, process.env.TEST_USER_EMAIL || 'test@example.com', process.env.TEST_USER_PASSWORD || 'password123');
  });

  test('加盟店を新規登録できる', async ({ page }) => {
    // 加盟店一覧へ
    await page.goto('/dashboard/merchants');

    // 新規登録ボタンをクリック
    await page.click('text=新規登録');
    await expect(page).toHaveURL(/.*merchants\/new/);

    // フォーム入力
    await page.fill('[name="merchant_code"]', 'M-E2E-001');
    await page.fill('[name="name"]', 'E2Eテスト加盟店');
    await page.fill('[name="address"]', '東京都渋谷区テスト町1-2-3');
    await page.fill('[name="contact_person"]', '山田太郎');
    await page.fill('[name="contact_phone"]', '03-1234-5678');
    await page.fill('[name="contact_email"]', 'test@example.com');

    // 保存ボタンをクリック
    await page.click('button:has-text("保存")');

    // 成功メッセージが表示される
    await expect(page.locator('text=保存しました')).toBeVisible();

    // 一覧画面にリダイレクトされる
    await expect(page).toHaveURL(/.*merchants$/);

    // 一覧に新規登録した加盟店が表示される
    await expect(page.locator('text=E2Eテスト加盟店')).toBeVisible();
  });

  test('加盟店詳細を表示できる', async ({ page }) => {
    await page.goto('/dashboard/merchants');

    // 最初の加盟店をクリック
    await page.click('table tbody tr:first-child');

    // 詳細画面が表示される
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 加盟店情報が表示される
    await expect(page.locator('text=加盟店詳細')).toBeVisible();
  });

  test('加盟店を編集できる', async ({ page }) => {
    await page.goto('/dashboard/merchants');

    // 最初の加盟店をクリック
    await page.click('table tbody tr:first-child');

    // 編集ボタンをクリック
    await page.click('button:has-text("編集")');
    await expect(page).toHaveURL(/.*edit$/);

    // 店舗名を変更
    await page.fill('[name="name"]', '更新後の店舗名（E2E）');

    // 保存ボタンをクリック
    await page.click('button:has-text("保存")');

    // 成功メッセージが表示される
    await expect(page.locator('text=保存しました')).toBeVisible();

    // 詳細画面に戻る
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 更新後の店舗名が表示される
    await expect(page.locator('text=更新後の店舗名（E2E）')).toBeVisible();
  });

  test('加盟店を削除できる', async ({ page }) => {
    await page.goto('/dashboard/merchants');

    // 最初の加盟店をクリック
    await page.click('table tbody tr:first-child');

    // 削除ボタンをクリック
    await page.click('button:has-text("削除")');

    // 確認ダイアログが表示される
    await expect(page.locator('text=本当に削除しますか？')).toBeVisible();

    // 削除を確定
    await page.click('button:has-text("削除する")');

    // 成功メッセージが表示される
    await expect(page.locator('text=削除しました')).toBeVisible();

    // 一覧画面にリダイレクトされる
    await expect(page).toHaveURL(/.*merchants$/);
  });

  test('必須項目が未入力の場合、バリデーションエラーが表示される', async ({ page }) => {
    await page.goto('/dashboard/merchants/new');

    // 保存ボタンをクリック（何も入力せずに）
    await page.click('button:has-text("保存")');

    // バリデーションエラーが表示される
    await expect(page.locator('text=加盟店コードは必須です')).toBeVisible();
    await expect(page.locator('text=店舗名は必須です')).toBeVisible();
    await expect(page.locator('text=住所は必須です')).toBeVisible();
    await expect(page.locator('text=担当者名は必須です')).toBeVisible();
    await expect(page.locator('text=電話番号は必須です')).toBeVisible();
    await expect(page.locator('text=メールアドレスは必須です')).toBeVisible();
  });

  test('電話番号の形式が不正な場合、バリデーションエラーが表示される', async ({ page }) => {
    await page.goto('/dashboard/merchants/new');

    await page.fill('[name="merchant_code"]', 'M-TEST');
    await page.fill('[name="name"]', 'テスト加盟店');
    await page.fill('[name="address"]', '東京都');
    await page.fill('[name="contact_person"]', '山田');
    await page.fill('[name="contact_phone"]', '123456'); // 不正な形式
    await page.fill('[name="contact_email"]', 'test@example.com');

    await page.click('button:has-text("保存")');

    // バリデーションエラーが表示される
    await expect(page.locator('text=電話番号の形式が正しくありません')).toBeVisible();
  });
});
