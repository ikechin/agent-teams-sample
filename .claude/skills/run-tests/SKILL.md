---
name: run-tests
description: Run all tests across services and generate coverage report
---

# Run Tests - テスト実行・レポート生成

このスキルは、全サービスのテストを一括実行し、カバレッジレポートを生成します。

## Parameters

- `$1`: テストタイプ（オプション: `unit` | `e2e` | `all`。デフォルト: `all`）

## 使用方法

```
/run-tests all
```

または

```
/run-tests unit
/run-tests e2e
```

---

## テスト実行フロー

### 1. 事前チェック

テスト実行前に以下を確認します：

```markdown
- [ ] Docker Composeが起動しているか
- [ ] 環境変数ファイル (.env) が存在するか
- [ ] 依存関係がインストールされているか
- [ ] リント・型チェックが通るか
```

### 2. テスト種別の選択

#### 2.1 ユニットテスト (`unit`)

各サービスの単体テストを実行します。

**Frontend:**
```bash
cd services/frontend
npm run test
npm run test:coverage
```

**BFF:**
```bash
cd services/bff
go test ./... -v -cover
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

**Backend:**
```bash
cd services/backend
go test ./... -v -cover
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

#### 2.2 E2Eテスト (`e2e`)

統合E2Eテストを実行します。

**前提条件:**
- すべてのサービスが起動していること
- E2E用のDocker Compose環境が起動していること

```bash
cd e2e

# Docker Compose起動
docker compose up -d

# Playwrightテスト実行
npm run test:e2e

# テスト終了後、コンテナ停止
docker compose down
```

#### 2.3 全テスト (`all`)

ユニットテスト + E2Eテストを順次実行します。

### 3. カバレッジレポート生成

各サービスのカバレッジを集計し、レポートを生成します。

```markdown
## カバレッジレポート

### Frontend
- **カバレッジ**: 85.3%
- **ファイル**: services/frontend/coverage/index.html
- **詳細**:
  - Statements: 87.2%
  - Branches: 82.1%
  - Functions: 88.5%
  - Lines: 85.3%

### BFF
- **カバレッジ**: 78.6%
- **ファイル**: services/bff/coverage.html
- **詳細**:
  - Statements: 78.6%

### Backend
- **カバレッジ**: 81.2%
- **ファイル**: services/backend/coverage.html
- **詳細**:
  - Statements: 81.2%

### E2E
- **実行テスト数**: 15
- **成功**: 15
- **失敗**: 0
- **スキップ**: 0
```

### 4. 失敗テストの分析

テストが失敗した場合、原因を分析します。

```markdown
## 失敗テストの分析

### Test: "ログイン後に加盟店一覧が表示される"
- **ファイル**: e2e/tests/auth/login.spec.ts:42
- **エラー**: `Expected element to be visible, but was hidden`
- **原因の仮説**:
  1. APIレスポンスが遅延している
  2. 認証トークンが正しく設定されていない
  3. UIコンポーネントのレンダリングエラー
- **修正優先度**: High

### Test: "加盟店の検索フィルタが動作する"
- **ファイル**: services/frontend/src/components/MerchantList.test.tsx:78
- **エラー**: `TypeError: Cannot read property 'filter' of undefined`
- **原因の仮説**:
  1. モックデータが正しく設定されていない
  2. 非同期処理のタイミング問題
- **修正優先度**: Medium
```

### 5. 修正優先度の提示

失敗したテストの修正優先度を提示します。

```markdown
## 修正優先度

### Critical（重大） - 即座に修正が必要
- なし

### High（高） - できるだけ早く修正
1. ログイン後に加盟店一覧が表示される (E2E)
   - 影響: 主要な機能が動作しない
   - 推定修正時間: 2時間

### Medium（中） - 次のスプリントで修正
2. 加盟店の検索フィルタが動作する (Frontend)
   - 影響: 一部機能が動作しない
   - 推定修正時間: 1時間

### Low（軽微） - 時間があれば修正
- なし
```

---

## 出力形式

```markdown
# Test Report

## 実行日時
2025-04-08 19:30:00

## テストタイプ
All (Unit + E2E)

## サマリー

| サービス | ユニットテスト | カバレッジ | E2Eテスト | 状態 |
|---------|--------------|-----------|----------|------|
| Frontend | ✅ 45/45 | 85.3% | - | 成功 |
| BFF | ✅ 32/32 | 78.6% | - | 成功 |
| Backend | ✅ 28/28 | 81.2% | - | 成功 |
| E2E | - | - | ❌ 14/15 | 失敗 |

**全体**: ❌ 119/120 (99.2%)

## 詳細

### Frontend (services/frontend)

#### ユニットテスト
```
PASS  src/components/LoginForm.test.tsx
PASS  src/components/MerchantList.test.tsx
PASS  src/hooks/useAuth.test.ts
...

Test Suites: 15 passed, 15 total
Tests:       45 passed, 45 total
Time:        12.345s
```

#### カバレッジ
- Statements: 87.2% (523/600)
- Branches: 82.1% (145/176)
- Functions: 88.5% (92/104)
- Lines: 85.3% (510/598)

カバレッジが低いファイル:
- `src/utils/validation.ts`: 65.2%
- `src/components/MerchantDetail.tsx`: 70.1%

### BFF (services/bff)

#### ユニットテスト
```
ok      github.com/example/bff/internal/handler 0.523s  coverage: 78.6% of statements
ok      github.com/example/bff/internal/middleware      0.312s  coverage: 85.2% of statements
...

PASS
coverage: 78.6% of statements in ./...
```

カバレッジが低いパッケージ:
- `internal/handler`: 78.6%
- `internal/service`: 72.3%

### Backend (services/backend)

#### ユニットテスト
```
ok      github.com/example/backend/internal/domain      0.412s  coverage: 81.2% of statements
ok      github.com/example/backend/internal/repository  0.298s  coverage: 88.9% of statements
...

PASS
coverage: 81.2% of statements in ./...
```

カバレッジが低いパッケージ:
- `internal/domain`: 81.2%

### E2E (e2e)

#### テスト結果
```
Running 15 tests using 1 worker

  ✅ auth/login.spec.ts:12:5 › ログインページが表示される
  ✅ auth/login.spec.ts:18:5 › 正しい認証情報でログインできる
  ❌ auth/login.spec.ts:42:5 › ログイン後に加盟店一覧が表示される
  ✅ merchants/list.spec.ts:10:5 › 加盟店一覧が表示される
  ...

  14 passed (42.3s)
  1 failed (42.3s)
```

#### 失敗テスト

**Test: "ログイン後に加盟店一覧が表示される"**
- ファイル: e2e/tests/auth/login.spec.ts:42
- エラー:
```
Error: Timed out 30000ms waiting for expect(locator).toBeVisible()

Call log:
  - expect.toBeVisible with timeout 30000ms
  - waiting for locator('[data-testid="merchant-list"]')
```

## カバレッジ改善提案

### Frontend
- `src/utils/validation.ts`: エッジケースのテストを追加
- `src/components/MerchantDetail.tsx`: モックデータのバリエーションを増やす

### BFF
- `internal/handler`: エラーハンドリングのテストを追加
- `internal/service`: ビジネスロジックの境界値テストを追加

### Backend
- `internal/domain`: ドメインロジックの複雑な条件分岐のテストを追加

## 失敗テストの修正優先度

### High（高） - できるだけ早く修正
1. **ログイン後に加盟店一覧が表示される** (E2E)
   - 影響: 主要な機能が動作しない
   - 原因の仮説: APIレスポンスの遅延、または認証トークンの問題
   - 推奨対応:
     1. BFFのログを確認して認証が成功しているか確認
     2. Playwrightのトレースを確認してネットワークリクエストを調査
     3. タイムアウト時間を延長して再試行
   - 推定修正時間: 2時間

## 推奨事項

1. **E2Eの失敗テストを修正してから次のタスクに進む**
2. カバレッジが80%未満のファイル/パッケージにテストを追加
3. 定期的にテストを実行してリグレッションを防ぐ
4. CI/CDパイプラインにテスト実行を組み込む

## レポートファイル

- Frontend: `services/frontend/coverage/index.html`
- BFF: `services/bff/coverage.html`
- Backend: `services/backend/coverage.html`
- E2E: `e2e/playwright-report/index.html`
```

---

## 注意事項

- テスト実行前に必ずリント・型チェックを実施してください
- E2Eテストは環境依存のため、失敗した場合は複数回再試行してください
- カバレッジの目標は80%以上を推奨します
- 失敗したテストは必ず修正してからコミットしてください
- テストレポートは `.steering/[YYYYMMDD]-[タスク名]/test-report.md` として保存することを推奨

## CI/CD統合

このスキルはCI/CDパイプラインでの使用を想定しています。

**GitHub Actions の例:**
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - name: Run tests
        run: |
          # Frontend
          cd services/frontend && npm install && npm run test:coverage
          # BFF
          cd services/bff && go test ./... -coverprofile=coverage.out
          # Backend
          cd services/backend && go test ./... -coverprofile=coverage.out
          # E2E
          cd e2e && docker compose up -d && npm run test:e2e && docker compose down
```
