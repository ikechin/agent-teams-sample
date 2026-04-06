import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定
 * 全サービス統合E2Eテスト用
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
    ['json', { outputFile: 'test-results.json' }],
  ],

  // タイムアウト設定
  timeout: 60000, // 60秒

  // 共通設定
  use: {
    // ベースURL（Frontend）
    baseURL: 'http://localhost:3000',

    // トレース
    trace: 'on-first-retry',

    // スクリーンショット
    screenshot: 'only-on-failure',

    // ビデオ
    video: 'retain-on-failure',

    // ブラウザコンテキスト設定
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  },

  // プロジェクト（ブラウザ別）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // モバイル
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Webサーバー設定（ローカル実行時）
  // Docker Composeを使う場合はコメントアウト
  // webServer: {
  //   command: 'docker-compose up',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
