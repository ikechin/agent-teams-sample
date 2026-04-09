import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Playwright設定
 * Frontend + BFF 統合E2Eテスト用
 */
export default defineConfig({
  // テストディレクトリ
  testDir: './tests',

  // 並列実行数
  fullyParallel: true,

  // CI環境でのリトライ
  retries: process.env.CI ? 2 : 0,

  // ワーカー数
  workers: process.env.CI ? 1 : undefined,

  // レポーター
  reporter: [
    ['html'],
    ['list'],
  ],

  // タイムアウト設定
  timeout: 30000, // 30秒

  // 共通設定
  use: {
    // ベースURL（Frontend）
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',

    // トレース
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ブラウザコンテキスト設定
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  },

  // プロジェクト: chromiumのみ（CI向け軽量構成）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
