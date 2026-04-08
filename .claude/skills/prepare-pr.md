---
name: prepare-pr
description: Prepare for pull request creation with comprehensive checks
---

# Prepare PR - プルリクエスト作成準備

このスキルは、プルリクエスト作成前のチェックリストを実行し、PR説明文を生成します。

## Parameters

- `$1`: ステアリングディレクトリ名（例: `20250407-frontend-bff-only`）

## 使用方法

```
/prepare-pr 20250407-frontend-bff-only
```

---

## 準備フロー

### 1. 成果物レビュー

まず、実装がステアリングファイルの仕様に準拠しているかレビューします。

```bash
/review-implementation $1
```

レビュー結果をチェックし、Critical/High問題がある場合は修正を促します。

### 2. リント・型チェック

各サービスでリント・型チェックを実行します。

#### Frontend

```bash
cd services/frontend
npm run lint
npm run type-check
```

#### BFF

```bash
cd services/bff
golangci-lint run ./...
go vet ./...
```

#### Backend

```bash
cd services/backend
golangci-lint run ./...
go vet ./...
```

### 3. テスト実行

全テストを実行し、すべて成功することを確認します。

```bash
/run-tests all
```

テストが失敗している場合は、修正を促します。

### 4. コミットメッセージの確認

コミットメッセージが適切か確認します。

```bash
git log --oneline origin/main..HEAD
```

**確認項目:**
- [ ] コミットメッセージが明確か
- [ ] Conventional Commits形式に従っているか（feat:, fix:, refactor: 等）
- [ ] コミット粒度が適切か（大きすぎない、小さすぎない）

### 5. 変更内容の確認

変更されたファイルを確認します。

```bash
git diff --stat origin/main..HEAD
git diff origin/main..HEAD
```

**確認項目:**
- [ ] 意図しないファイルが含まれていないか
- [ ] デバッグコード・コメントアウトが残っていないか
- [ ] 機密情報（パスワード、トークン等）が含まれていないか
- [ ] console.log, fmt.Println等のデバッグ出力が残っていないか

### 6. ドキュメント更新確認

ドキュメントが最新か確認します。

```bash
/check-docs-sync
```

ドキュメントの乖離がある場合は、更新を促します。

### 7. ブランチの最新化

mainブランチの最新の変更を取り込みます。

```bash
git fetch origin
git rebase origin/main
```

コンフリクトがある場合は、解決してから次に進みます。

### 8. PR説明文の生成

ステアリングファイルから情報を収集し、PR説明文を生成します。

```markdown
# PR Title
[YYYYMMDD] タスク名

# Description

## 📋 概要
[.steering/$1/requirements.md から概要を抽出]

## 🎯 変更内容
[.steering/$1/design.md から変更内容を抽出]

### Frontend
- 変更点1
- 変更点2

### BFF
- 変更点1
- 変更点2

### Backend
- 変更点1
- 変更点2

## ✅ 完了タスク
[.steering/$1/tasklist.md から完了タスクを抽出]

- [x] Frontend Agent
  - [x] タスク1
  - [x] タスク2
- [x] BFF Agent
  - [x] タスク1
  - [x] タスク2
- [x] Backend Agent
  - [x] タスク1
  - [x] タスク2

## 🧪 テスト
- [ ] ユニットテスト: ✅ 通過 (120/120)
- [ ] E2Eテスト: ✅ 通過 (15/15)
- [ ] カバレッジ: 85.3% (Frontend), 78.6% (BFF), 81.2% (Backend)

## 📝 関連ドキュメント
- ステアリングファイル: `.steering/$1/`
- API仕様: `contracts/openapi/bff-api.yaml`

## 🔍 レビューポイント
[重点的にレビューしてほしい箇所]
- ポイント1
- ポイント2

## 📸 スクリーンショット（該当する場合）
[UIの変更がある場合、スクリーンショットを添付]

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## チェックリスト

### 実装品質
- [ ] `/review-implementation` で Critical/High 問題がない
- [ ] リント・型チェックが通る
- [ ] すべてのテストが成功している
- [ ] コードカバレッジが80%以上（目安）

### コード品質
- [ ] デバッグコード・コメントアウトが残っていない
- [ ] console.log, fmt.Println等のデバッグ出力が残っていない
- [ ] 適切な命名がされている
- [ ] 複雑な処理にコメントがある
- [ ] 重複コードがない（DRY原則）

### セキュリティ
- [ ] 機密情報（パスワード、トークン等）がハードコードされていない
- [ ] 環境変数から機密情報を読み込んでいる
- [ ] 入力バリデーションが実装されている
- [ ] 認証・認可チェックが実装されている

### ドキュメント
- [ ] `/check-docs-sync` で問題がない
- [ ] API仕様（OpenAPI）が更新されている
- [ ] 新しい用語が `docs/glossary.md` に追加されている
- [ ] 環境変数が `docs/ENVIRONMENT.md` に記載されている

### Git
- [ ] コミットメッセージが適切
- [ ] 意図しないファイルが含まれていない
- [ ] mainブランチの最新の変更を取り込んでいる
- [ ] コンフリクトが解決されている

### ステアリングファイル
- [ ] `.steering/$1/tasklist.md` のすべてのタスクが completed
- [ ] 実装中に判明した変更点が記録されている

---

## 出力形式

```markdown
# PR Preparation Report

## ステアリングディレクトリ
`.steering/20250407-frontend-bff-only/`

## チェック結果

### ✅ 実装品質
- レビュー: 問題なし
- リント: 通過
- 型チェック: 通過
- テスト: 120/120 通過
- カバレッジ: 85.3% (Frontend), 78.6% (BFF), 81.2% (Backend)

### ✅ コード品質
- デバッグコード: なし
- 命名: 適切
- コメント: 十分
- 重複: なし

### ✅ セキュリティ
- 機密情報: なし
- バリデーション: 実装済み
- 認証・認可: 実装済み

### ✅ ドキュメント
- API仕様: 更新済み
- 用語定義: 更新済み
- 環境変数: 記載済み

### ✅ Git
- コミットメッセージ: 適切
- 不要ファイル: なし
- mainブランチ: 最新
- コンフリクト: なし

### ✅ ステアリングファイル
- タスク: すべて completed
- 変更記録: 記載済み

## PR説明文

以下の内容でPRを作成してください：

---

# [20250407] Frontend→BFF初回実装（Agent Teams検証）

## 📋 概要
Agent Teams機能の検証を目的とした、Frontend→BFF間の基本機能実装。
ログイン機能と加盟店一覧表示機能を実装し、マイクロサービス間の連携を確立。

## 🎯 変更内容

### Frontend (Next.js 14 + TypeScript)
- ログイン画面実装 (`/login`)
- ダッシュボード画面実装 (`/dashboard`)
- 加盟店一覧表示画面実装 (`/dashboard/merchants`)
- OpenAPIからの型自動生成設定
- 認証フックの実装 (`useAuth`)

### BFF (Go + Echo)
- セッションベース認証API (`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`)
- ユーザー情報取得API (`GET /api/v1/auth/me`)
- 加盟店一覧API (`GET /api/v1/merchants`)
- PostgreSQL + Flyway環境構築
- モックデータ実装（Backend呼び出しは次回）

### E2E (Playwright)
- ログイン機能のE2Eテスト
- 加盟店一覧表示のE2Eテスト

## ✅ 完了タスク

- [x] Frontend Agent
  - [x] Next.js 14プロジェクトセットアップ
  - [x] ログイン画面実装
  - [x] ダッシュボード・加盟店一覧画面実装
  - [x] 認証フック実装
- [x] BFF Agent
  - [x] Echo + PostgreSQL環境構築
  - [x] 認証API実装（セッション管理）
  - [x] 加盟店一覧API実装（モック）
  - [x] Flyway DBマイグレーション
- [x] E2E Test Agent
  - [x] Playwright環境構築
  - [x] ログインE2Eテスト実装
  - [x] 加盟店一覧E2Eテスト実装

## 🧪 テスト
- ✅ ユニットテスト: 通過 (120/120)
- ✅ E2Eテスト: 通過 (15/15)
- ✅ カバレッジ: 85.3% (Frontend), 78.6% (BFF), 81.2% (Backend)

## 📝 関連ドキュメント
- ステアリングファイル: `.steering/20250407-frontend-bff-only/`
- API仕様: `contracts/openapi/bff-api.yaml`
- 環境変数: `docs/ENVIRONMENT.md`

## 🔍 レビューポイント
- セッション管理の実装（HttpOnly Cookie）
- 権限チェックのロジック（`merchant.read`）
- OpenAPI仕様とコードの整合性

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

## 次のステップ

すべてのチェックが完了したら、以下のコマンドでPRを作成できます：

```bash
git push origin <branch-name>
gh pr create --title "[20250407] Frontend→BFF初回実装（Agent Teams検証）" --body "<上記のPR説明文>"
```

または、GitHub UIからPRを作成してください。
```

---

## 注意事項

- すべてのチェックが通るまでPRを作成しないでください
- Critical/High問題がある場合は、必ず修正してからPRを作成してください
- PR作成後は、レビュワーにSlack等で通知してください
- レビュー指摘があった場合は、迅速に対応してください
