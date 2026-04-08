# Frontend→BFF Agent Teams検証 - 要求定義

## 目的

このタスクの主な目的は以下の通りです：

1. **Agent Teamsの挙動確認**
   - Frontend Agent / BFF Agent / E2E Test Agent の並行開発を検証
   - Agent間の依存関係管理を確認
   - Taskツールの使用方法を習得

2. **レビュー負荷の最小化**
   - 最小限の機能実装でAgent Teamsの動作を確認
   - 人間のレビューが可能な規模に抑える

3. **段階的な実装の第一歩**
   - Frontend→BFFのみを実装（Backendは次回タスク）
   - マイクロサービス構成の基盤を確立

---

## スコープ

### 実装するもの

#### Frontend
- ✅ **ログイン画面**（`/login`）
  - メールアドレス・パスワード入力フォーム
  - ログインボタン
  - バリデーション（Zod + React Hook Form）
  - エラーメッセージ表示
  - ログイン成功時にダッシュボードへリダイレクト

- ✅ **ダッシュボード画面**（`/dashboard`）
  - ログイン後のトップ画面
  - サイドバーナビゲーション
  - ヘッダー（ログアウトボタン）

- ✅ **加盟店一覧画面**（`/dashboard/merchants`）
  - 加盟店一覧テーブル表示（モックデータ）
  - ページネーション（UI表示のみ、データ取得は実装しない）
  - 検索フォーム（UI表示のみ、検索機能は実装しない）

- ✅ **共通コンポーネント**
  - レイアウトコンポーネント（DashboardLayout）
  - shadcn/uiコンポーネント（Button, Input, Table等）

- ✅ **API Client**
  - 認証API呼び出し（login, logout, me）
  - 加盟店API呼び出し（一覧取得）
  - openapi-typescriptによる型定義生成

- ✅ **状態管理**
  - Zustandによる認証状態管理
  - ログイン状態の永続化（Cookie経由）

#### BFF
- ✅ **認証API**
  - `POST /api/v1/auth/login` - ログイン
  - `POST /api/v1/auth/logout` - ログアウト
  - `GET /api/v1/auth/me` - 現在のユーザー情報取得

- ✅ **加盟店API（モックデータ返却）**
  - `GET /api/v1/merchants` - 加盟店一覧取得（モックデータ）

- ✅ **ミドルウェア**
  - セッション認証ミドルウェア
  - 監査ログ記録ミドルウェア
  - CORSミドルウェア
  - ロギングミドルウェア

- ✅ **権限チェック**
  - 認証済みユーザーのみがAPIにアクセス可能
  - 加盟店一覧APIは `merchant.read` 権限を持つユーザーのみアクセス可能
  - 権限不足の場合は403エラーを返却

- ✅ **データベース**
  - Flywayマイグレーション実行（users, roles, permissions, sessions, audit_logs）
  - 初期データ投入（users, roles, permissions, role_permissions）

- ✅ **セッション管理**
  - セッション生成（ログイン時）
  - セッション検証（認証ミドルウェア）
  - セッション削除（ログアウト時）

- ✅ **監査ログ**
  - すべてのAPI呼び出しを自動記録

#### E2E Test
- ✅ **ログインフローテスト**
  - 正常系: ログイン成功
  - 異常系: ログイン失敗（パスワード誤り）
  - 異常系: 未認証でダッシュボードアクセス時のリダイレクト

- ✅ **加盟店一覧表示テスト**
  - ログイン後に加盟店一覧が表示されること
  - モックデータが正しく表示されること

---

### 実装しないもの（次回以降のタスク）

#### Backend
- ❌ **Backend Service全体**（次回タスクで実装）
- ❌ gRPC通信（次回タスクで実装）
- ❌ Backend DB（次回タスクで実装）

#### Frontend
- ❌ 加盟店詳細画面
- ❌ 加盟店登録画面
- ❌ 加盟店編集・削除機能
- ❌ 契約管理画面
- ❌ 承認ワークフロー画面
- ❌ ユーザー管理画面
- ❌ ロール管理画面
- ❌ 監査ログ閲覧画面

#### BFF
- ❌ 加盟店詳細・登録・編集・削除API
- ❌ 契約管理API
- ❌ 承認ワークフローAPI
- ❌ ユーザー管理API
- ❌ ロール管理API
- ❌ Backend gRPC呼び出し（次回タスクで実装）

---

## ユーザーストーリー

### ストーリー1: ログイン

**As a** 社内ユーザー
**I want to** メールアドレスとパスワードでログインする
**So that** システムを利用できる

**受け入れ条件:**
- メールアドレスとパスワードを入力してログインボタンをクリックできる
- ログイン成功時にダッシュボードへリダイレクトされる
- ログイン失敗時にエラーメッセージが表示される
- セッションがCookieに保存される（HttpOnly, Secure, SameSite=Lax）

---

### ストーリー2: 加盟店一覧閲覧

**As a** 社内ユーザー
**I want to** ログイン後に加盟店一覧を閲覧する
**So that** 加盟店の情報を確認できる

**受け入れ条件:**
- ログイン後にダッシュボードが表示される
- サイドバーから「加盟店管理」をクリックできる
- 加盟店一覧画面でモックデータ（2件）が表示される
- 各加盟店の情報（加盟店コード、名前、住所、担当者）が表示される

---

### ストーリー3: ログアウト

**As a** 社内ユーザー
**I want to** ログアウトボタンをクリックしてログアウトする
**So that** セキュリティを保つことができる

**受け入れ条件:**
- ヘッダーのログアウトボタンをクリックできる
- ログアウト後にログイン画面へリダイレクトされる
- セッションが削除される

---

## 制約事項

### 技術的制約

1. **BFFは加盟店APIでモックデータを返却**
   - Backend gRPC呼び出しは行わない
   - ハンドラー内でハードコードされたモックデータを返却
   - 次回タスクでBackend gRPC呼び出しに置き換える

2. **加盟店一覧は表示のみ**
   - 登録・編集・削除機能は実装しない
   - ページネーション・検索はUI表示のみ（機能は実装しない）

3. **E2EテストはFrontend + BFFのみ**
   - Backendコンテナは起動しない
   - モックデータの表示確認のみ

### 環境設定

#### ポート番号
- **Frontend**: `http://localhost:3000`
- **BFF**: `http://localhost:8080`
- **BFF DB**: `localhost:5432`（PostgreSQL）

#### 環境変数
- Frontend環境変数（`.env.local`）:
  - `NEXT_PUBLIC_BFF_API_URL=http://localhost:8080`
- BFF環境変数（`.env`）:
  - `PORT=8080`
  - `DATABASE_URL=postgres://user:password@localhost:5432/bff_db`

---

## 非機能要件

### セキュリティ
- ✅ セッションベース認証
- ✅ パスワードのbcryptハッシュ化（コスト12）
- ✅ HttpOnly Cookie（XSS対策）
- ❌ CSRF対策（次回タスクで実装）
- ✅ HTTPS通信（本番環境のみ）

### パフォーマンス
- ✅ ページ初期表示: 2秒以内
- ✅ API応答時間: 500ms以内

### 監査
- ✅ すべてのAPI呼び出しを監査ログに記録
- ✅ 記録内容: user_id, action, resource_type, request_path, ip_address, created_at

---

## 成功の定義

このタスクは以下の条件を満たした場合に成功とみなします：

1. ✅ **E2Eテストが成功**
   - ログインフローテストが成功
   - 加盟店一覧表示テストが成功

2. ✅ **Agent Teamsが並行動作**
   - Frontend Agent / BFF Agent / E2E Test Agent が並行作業
   - 各Agentのタスクが完了

3. ✅ **ドキュメントとコードの整合性**
   - OpenAPI仕様（contracts/openapi/bff-api.yaml）に準拠
   - CLAUDE.mdの規約に準拠
   - glossary.mdの用語に準拠

4. ✅ **レビューが完了**
   - 人間によるコードレビューが完了
   - 指摘事項が修正済み

---

## 次回タスクへの引き継ぎ

次回タスク（`.steering/20250410-add-backend/`）では以下を実装します：

1. **Backend Service実装**
   - MerchantService（gRPC）
   - Backend DB（merchants, services, contracts, contract_changes, approval_workflows）

2. **BFFのモック実装をBackend gRPC呼び出しに置き換え**
   - `internal/handler/merchant_handler.go` を修正
   - gRPCクライアント初期化

3. **加盟店の詳細・登録機能追加**
   - Frontend: 加盟店詳細・登録画面
   - BFF: 加盟店詳細・登録API
   - Backend: CreateMerchant, GetMerchant gRPCメソッド

---

**作成日:** 2026-04-07
**作成者:** Claude Code
