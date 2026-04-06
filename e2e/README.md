# E2Eテスト

## 概要

本ディレクトリは、加盟店契約管理システム全体のE2E（End-to-End）テストを管理します。

**特徴:**
- Frontend、BFF、Backend全体を統合的にテスト
- Playwrightを使用
- Docker Composeで全サービスを起動してテスト実行
- Agent Teams使用時は**E2E Test Agent**が担当

---

## ディレクトリ構造

```
e2e/
├── tests/                          # テストファイル
│   ├── auth/                       # 認証関連
│   │   └── login-flow.spec.ts
│   ├── merchants/                  # 加盟店管理
│   │   ├── merchant-crud.spec.ts
│   │   └── merchant-search.spec.ts
│   └── contracts/                  # 契約管理
│       ├── contract-crud.spec.ts
│       ├── contract-approval.spec.ts
│       └── contract-history.spec.ts
├── fixtures/                       # テストデータ
│   ├── users.json
│   ├── merchants.json
│   └── contracts.json
├── utils/                          # テストユーティリティ
│   ├── test-helpers.ts
│   └── db-seeder.ts
├── playwright.config.ts            # Playwright設定
├── package.json
└── README.md                       # このファイル
```

---

## セットアップ

### 依存関係のインストール

```bash
cd e2e
npm install
```

### Playwrightブラウザのインストール

```bash
npx playwright install
```

---

## テスト実行

### ローカル環境でのテスト実行

**Step 1: 全サービスを起動**
```bash
# ルートディレクトリで実行
docker-compose up -d
```

**Step 2: テストデータの投入**
```bash
cd e2e
npm run seed
```

**Step 3: E2Eテスト実行**
```bash
npm run test
```

### CI/CD環境でのテスト実行

```bash
# Docker Composeでテスト専用環境を起動
docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit

# または
npm run test:ci
```

---

## テストの書き方

### 基本構造

```typescript
// tests/merchants/merchant-crud.spec.ts
import { test, expect } from '@playwright/test';
import { login } from '../utils/test-helpers';

test.describe('加盟店CRUD操作', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await login(page, 'test@example.com', 'password123');
  });

  test('加盟店を新規登録できる', async ({ page }) => {
    // 加盟店一覧へ
    await page.goto('http://localhost:3000/dashboard/merchants');

    // 新規登録ボタンをクリック
    await page.click('text=新規登録');

    // フォーム入力
    await page.fill('[name="merchant_code"]', 'M-999');
    await page.fill('[name="name"]', 'E2Eテスト加盟店');
    await page.fill('[name="address"]', '東京都渋谷区');
    await page.fill('[name="contact_person"]', '山田太郎');
    await page.fill('[name="contact_phone"]', '03-1234-5678');
    await page.fill('[name="contact_email"]', 'test@example.com');

    // 保存
    await page.click('button:has-text("保存")');

    // 成功メッセージ確認
    await expect(page.locator('text=保存しました')).toBeVisible();

    // 一覧に表示されることを確認
    await expect(page.locator('text=E2Eテスト加盟店')).toBeVisible();
  });

  test('加盟店を編集できる', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/merchants');

    // 最初の加盟店をクリック
    await page.click('table tbody tr:first-child');

    // 編集ボタンをクリック
    await page.click('button:has-text("編集")');

    // 店舗名を変更
    await page.fill('[name="name"]', '更新後の店舗名');
    await page.click('button:has-text("保存")');

    // 成功確認
    await expect(page.locator('text=保存しました')).toBeVisible();
    await expect(page.locator('text=更新後の店舗名')).toBeVisible();
  });

  test('加盟店を削除できる', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/merchants');

    // 最初の加盟店をクリック
    await page.click('table tbody tr:first-child');

    // 削除ボタンをクリック
    await page.click('button:has-text("削除")');

    // 確認ダイアログで確定
    await page.click('button:has-text("削除する")');

    // 成功確認
    await expect(page.locator('text=削除しました')).toBeVisible();
  });
});
```

### テストヘルパー関数

```typescript
// utils/test-helpers.ts
import { Page } from '@playwright/test';

/**
 * ログイン処理
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('http://localhost:3000/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

/**
 * ログアウト処理
 */
export async function logout(page: Page) {
  await page.click('[aria-label="ユーザーメニュー"]');
  await page.click('text=ログアウト');
  await page.waitForURL('**/login');
}

/**
 * 加盟店を作成
 */
export async function createMerchant(page: Page, data: MerchantData) {
  await page.goto('http://localhost:3000/dashboard/merchants/new');
  await page.fill('[name="merchant_code"]', data.merchant_code);
  await page.fill('[name="name"]', data.name);
  await page.fill('[name="address"]', data.address);
  await page.fill('[name="contact_person"]', data.contact_person);
  await page.fill('[name="contact_phone"]', data.contact_phone);
  await page.fill('[name="contact_email"]', data.contact_email);
  await page.click('button:has-text("保存")');
  await page.waitForURL('**/merchants');
}
```

---

## テストカテゴリ

### 1. 認証テスト (`tests/auth/`)

- ログインフロー
- ログアウトフロー
- セッションタイムアウト
- 不正アクセス防止

### 2. 加盟店管理テスト (`tests/merchants/`)

- 加盟店CRUD操作
- 加盟店検索
- 加盟店一覧ページネーション
- バリデーションエラー処理

### 3. 契約管理テスト (`tests/contracts/`)

- 契約CRUD操作
- 契約承認フロー（J-SOX対応）
- 契約変更履歴表示
- 金額変更時の承認申請

### 4. サービス管理テスト (`tests/services/`)

- サービスCRUD操作
- サービス有効化/無効化

### 5. レポートテスト (`tests/reports/`)

- レポート表示
- データエクスポート

---

## テストデータ管理

### テストデータのシード

```bash
npm run seed
```

### テストデータのクリア

```bash
npm run clean
```

### Fixtureファイル

```json
// fixtures/users.json
[
  {
    "email": "admin@example.com",
    "password": "admin123",
    "name": "管理者",
    "roles": ["SYSTEM_ADMIN"]
  },
  {
    "email": "manager@example.com",
    "password": "manager123",
    "name": "契約管理者",
    "roles": ["CONTRACT_MANAGER"]
  }
]
```

---

## CI/CD統合

### GitHub Actions例

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Start services
        run: docker-compose -f docker-compose.e2e.yml up -d

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000/api/health; do sleep 2; done'

      - name: Install dependencies
        working-directory: e2e
        run: npm ci

      - name: Install Playwright browsers
        working-directory: e2e
        run: npx playwright install --with-deps

      - name: Run E2E tests
        working-directory: e2e
        run: npm run test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

---

## Agent Teams使用時

### E2E Test Agentの役割

実装フェーズでAgent Teamsを使用する場合、**E2E Test Agent**が以下を担当：

1. **E2Eテストの実装**
   - `.steering/[日付]-initial-implementation/tasklist.md`のE2Eテストタスク
   - Frontend/BFF/Backend Agentの実装に基づいてテスト作成

2. **テストデータの準備**
   - `fixtures/`にテストデータ作成
   - シードスクリプト実装

3. **統合テストの実行**
   - 全サービスが実装完了後、統合テスト実行
   - バグ発見時は該当Agentに報告

### 他Agentとの連携

- **Frontend Agent**: 画面要素のセレクタ情報を共有
- **BFF Agent**: APIエンドポイント情報を共有
- **Backend Agent**: テストデータ要件を共有

---

## トラブルシューティング

### サービスが起動しない

```bash
# ログ確認
docker-compose logs

# サービス再起動
docker-compose restart
```

### テストがタイムアウトする

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 60秒に延長
});
```

### ブラウザが見つからない

```bash
npx playwright install
```

---

## 参考リンク

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Docker Compose](https://docs.docker.com/compose/)

---

**最終更新日:** 2026-04-05
**作成者:** Claude Code
