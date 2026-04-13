import { Page, expect } from '@playwright/test';

/**
 * ログイン処理 (rate limit リトライ組み込み)
 *
 * BFF `/api/v1/auth/login` は 10/min/IP burst 10 で rate limit がかかる。
 * フルスイート (`--workers=1`) で多数の spec が beforeEach login する結果、
 * burst を使い切って後続 spec が 429 で落ちる事象があったため、
 * ここでは既定でリトライ + 指数バックオフを行う。
 *
 * リトライ条件: 遷移タイムアウト、429 レスポンス表示、または
 * `waitForURL('**\/dashboard**')` が時間内に成立しないケース全般。
 *
 * 既存 spec (呼び出し側) は変更不要 — シグネチャは後方互換。
 * rate limit 緩和の一部として追加 (2026-04-13)。
 */
export async function login(
  page: Page,
  email: string,
  password: string,
  options: { maxAttempts?: number } = {},
) {
  const maxAttempts = options.maxAttempts ?? 4;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 20000 });
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      // Exponential backoff: 2s, 4s, 8s. Rate limit window is 1 min /
      // burst 10, so by the 3rd retry we should have at least one token
      // freed even if the bucket was completely empty on the first try.
      const delayMs = 2000 * Math.pow(2, attempt - 1);
      await page.waitForTimeout(delayMs);
    }
  }

  throw lastErr;
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
