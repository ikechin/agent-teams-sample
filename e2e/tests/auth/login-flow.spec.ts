import { test, expect } from '@playwright/test';

test.describe('ログインフロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('正常にログインできる', async ({ page }) => {
    // メールアドレスとパスワードを入力
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*dashboard/);

    // ダッシュボードのタイトルが表示されることを確認
    await expect(page.locator('h1')).toContainText('ダッシュボード');
  });

  test('メールアドレスが空の場合エラーが表示される', async ({ page }) => {
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // バリデーションエラーが表示される
    await expect(page.locator('text=メールアドレスは必須です')).toBeVisible();
  });

  test('パスワードが空の場合エラーが表示される', async ({ page }) => {
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // バリデーションエラーが表示される
    await expect(page.locator('text=パスワードは必須です')).toBeVisible();
  });

  test('不正な認証情報の場合エラーが表示される', async ({ page }) => {
    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // 認証エラーが表示される
    await expect(page.locator('text=メールアドレスまたはパスワードが正しくありません')).toBeVisible();
  });

  test('ログイン後、ログアウトできる', async ({ page }) => {
    // ログイン
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // ユーザーメニューを開く
    await page.click('[aria-label="ユーザーメニュー"]');

    // ログアウトをクリック
    await page.click('text=ログアウト');

    // ログイン画面にリダイレクトされることを確認
    await expect(page).toHaveURL(/.*login/);
  });

  test('未認証でダッシュボードにアクセスするとログイン画面にリダイレクトされる', async ({ page }) => {
    // ダッシュボードに直接アクセス
    await page.goto('/dashboard');

    // ログイン画面にリダイレクトされる
    await expect(page).toHaveURL(/.*login/);
  });
});
