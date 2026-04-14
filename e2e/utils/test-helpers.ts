import { Page, expect } from '@playwright/test';

/**
 * ログイン処理 (rate limit リトライ組み込み)
 *
 * **⚠️ 非推奨 (2026-04-14)**: 通常 spec からの呼び出しは
 * `test.use({ storageState: ROLES['<role>'].storageStatePath })` 方式に移行済み。
 * 本関数は以下の用途にのみ使用する:
 *   - `auth/login-flow.spec.ts` の login UI 自体の検証
 *   - ad-hoc デバッグ / 新しいロール追加時の一時的な動作確認
 *
 * リトライロジックは rate limit 対策の保険として残置しているが、
 * 通常運用では発火しないはず。発火が観測された場合は login-flow.spec 以外での
 * 呼び出しがないか確認すること。
 *
 * @deprecated setup project + storageState パターンを使用してください
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
