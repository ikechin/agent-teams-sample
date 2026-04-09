import { Page, expect } from '@playwright/test';

/**
 * ログイン処理
 * ログイン画面に遷移し、メールアドレスとパスワードを入力してログインする
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
}

/**
 * ログアウト処理
 * ヘッダーのログアウトボタンをクリックしてログアウトする
 */
export async function logout(page: Page) {
  // ログアウトボタンまたはユーザーメニュー経由でログアウト
  const logoutButton = page.locator('button:has-text("ログアウト"), [aria-label="ログアウト"]');
  const userMenu = page.locator('[aria-label="ユーザーメニュー"]');

  if (await userMenu.isVisible()) {
    await userMenu.click();
    await page.click('text=ログアウト');
  } else if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }

  await page.waitForURL('**/login', { timeout: 10000 });
}

/**
 * 要素の表示を待機する
 * 指定されたセレクタの要素が表示されるまで待機する
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}
