import { test as setup, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ROLES, RoleName } from '../utils/roles';
import { ensureApproverUser, ensureViewerUser } from '../utils/seed-users';

/**
 * Playwright setup project that authenticates each role ONCE and saves
 * the resulting storageState to `e2e/.auth/<role>.json`. Regular specs
 * declare `test.use({ storageState: ROLES['<role>'].storageStatePath })`
 * to start authenticated without hitting `POST /api/v1/auth/login` again.
 *
 * Why UI login (not API login):
 * BFF `/api/v1/auth/login` returns a session cookie scoped to the BFF
 * origin. A Playwright `request.newContext({ baseURL: BFF_URL })` storage
 * state cannot be transferred to a browser context running on the
 * frontend origin (http://localhost:3000). Logging in through the
 * frontend login page ensures the cookie is written for the frontend
 * origin and is reusable across every browser context.
 */

/**
 * BFF のセッション TTL (24h) よりずっと短い 30 分以内に生成された storageState は
 * そのまま流用する。連続フル実行で rate limit を消費しないための Playwright
 * 公式推奨パターン。ファイルがなければ新規 login、古ければ再 login。
 */
const STORAGE_STATE_TTL_MS = 30 * 60 * 1000;

function isStorageStateFresh(storagePath: string): boolean {
  try {
    const stat = fs.statSync(storagePath);
    return Date.now() - stat.mtimeMs < STORAGE_STATE_TTL_MS;
  } catch {
    return false;
  }
}

async function authenticateRole(role: RoleName, page: Page) {
  const credentials = ROLES[role];
  fs.mkdirSync(path.dirname(credentials.storageStatePath), { recursive: true });

  if (isStorageStateFresh(credentials.storageStatePath)) {
    // storageState が 30 分以内に生成されているのでスキップ
    return;
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('[name="email"]', credentials.email);
  await page.fill('[name="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 20000 });

  await page.context().storageState({ path: credentials.storageStatePath });
}

setup('seed approver and viewer users', async () => {
  ensureApproverUser();
  ensureViewerUser();
  expect(true).toBe(true);
});

setup('authenticate as contract-manager', async ({ page }) => {
  await authenticateRole('contract-manager', page);
});

setup('authenticate as approver', async ({ page }) => {
  await authenticateRole('approver', page);
});

setup('authenticate as viewer', async ({ page }) => {
  await authenticateRole('viewer', page);
});
