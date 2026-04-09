import { test, expect } from '@playwright/test';
import { login } from '../../utils/test-helpers';

test.describe('ログインフロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('正常系: ログイン成功 → ダッシュボードにリダイレクト', async ({ page }) => {
    // メールアドレスとパスワードを入力
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // ダッシュボード画面の要素が表示されることを確認
    await expect(page.locator('h1, h2, [data-testid="dashboard-title"]').first()).toBeVisible();
  });

  test('異常系: パスワード誤り → エラーメッセージ表示', async ({ page }) => {
    // 正しいメールアドレスと誤ったパスワードを入力
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'wrongpassword');

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されることを確認
    // BFF APIは "Invalid credentials" を返すため、Frontendでの表示テキストを検出
    const errorMessage = page.locator('[role="alert"], .text-red-500, .text-destructive, [data-testid="login-error"]');
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });

    // ログイン画面に留まっていることを確認
    await expect(page).toHaveURL(/.*login/);
  });

  test('異常系: 未認証で/dashboardアクセス → /loginにリダイレクト', async ({ page }) => {
    // ダッシュボードに直接アクセス
    await page.goto('/dashboard');

    // ログイン画面にリダイレクトされることを確認
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});
