# BFF gRPC統合 (Phase 2) - 要求定義

## 目的

BFFの加盟店モックデータをBackend gRPC呼び出しに置換し、実データでの加盟店管理を実現する。
これは3フェーズ構成の第2フェーズである。

**3フェーズ構成:**
1. **Phase 1（完了）:** Backend gRPCサービス + DB実装 → `.steering/20250409-add-backend-phase1/`
2. **Phase 2（本タスク）:** BFFのモック実装をBackend gRPC呼び出しに置換
3. **Phase 3:** Frontend 加盟店詳細・登録画面追加

**前提タスク:** `.steering/20250409-add-backend-phase1/` が完了していること

---

## スコープ

### 実装するもの

#### BFF Service（変更）
- ✅ **gRPCクライアント**（`internal/grpc/`）
  - Backend MerchantService への接続（`backend:50051`）
  - 接続管理（グレースフルシャットダウン時のクローズ）

- ✅ **加盟店ハンドラー改修**（`internal/handler/merchant_handler.go`）
  - `GET /api/v1/merchants` - モックデータ → gRPC `ListMerchants` 呼び出しに置換
  - `GET /api/v1/merchants/:id` - 新規追加、gRPC `GetMerchant` 呼び出し
  - `POST /api/v1/merchants` - 新規追加、gRPC `CreateMerchant` 呼び出し

- ✅ **Protocol Buffers生成コード**
  - `contracts/proto/merchant.proto` から BFF用の生成コード配置（`internal/pb/`）

- ✅ **Docker Compose設定変更**
  - 外部ネットワーク追加（Backendサービスとの通信用）
  - `BACKEND_GRPC_ADDR` 環境変数追加

- ✅ **OpenAPI仕様更新**
  - `contracts/openapi/bff-api.yaml` に `GET /merchants/:id`, `POST /merchants` を追加
  - モックデータの記述を削除

- ✅ **テスト**
  - gRPCクライアントのモックを使用したハンドラーテスト
  - 既存テストの更新

### 実装しないもの（Phase 3以降）

- ❌ Frontend画面追加（加盟店詳細・登録）- Phase 3
- ❌ 加盟店更新・削除エンドポイント - 将来タスク
- ❌ 契約管理エンドポイント - 将来タスク
- ❌ 承認ワークフロー - 将来タスク

---

## ユーザーストーリー

### ストーリー1: 加盟店一覧取得（実データ）

**As a** Frontendアプリケーション
**I want to** BFF REST API経由で実際の加盟店データを取得する
**So that** モックではない実データを表示できる

**受け入れ条件:**
- `GET /api/v1/merchants` がBackend gRPCを呼び出して実データを返却
- ページネーション、検索パラメータが正しくgRPCリクエストに変換される
- レスポンス形式は既存のモックレスポンスと同一（後方互換性維持）

### ストーリー2: 加盟店詳細取得

**As a** Frontendアプリケーション
**I want to** merchant_id指定で加盟店詳細を取得する
**So that** 加盟店詳細画面を表示できる

**受け入れ条件:**
- `GET /api/v1/merchants/:id` がgRPC `GetMerchant` を呼び出して1件返却
- 存在しない場合は 404 Not Found
- `merchants:read` 権限が必要

### ストーリー3: 加盟店登録

**As a** 認可されたユーザー
**I want to** 新しい加盟店を登録する
**So that** システムに加盟店を追加できる

**受け入れ条件:**
- `POST /api/v1/merchants` がgRPC `CreateMerchant` を呼び出して登録
- `merchants:create` 権限が必要
- BFFのuser_idがcreated_byとしてBackendに渡される（監査用）
- バリデーションエラー時は 400 Bad Request
- 登録成功時は 201 Created

---

## 制約事項

### 技術的制約
1. **gRPC接続**: BFF → Backend はgRPC（`google.golang.org/grpc`）
2. **ネットワーク共有**: BFFとBackendは Docker外部ネットワークで接続（BFFのdocker-compose.ymlにBackendサービスを含めない）
3. **後方互換性**: `GET /api/v1/merchants` のレスポンス形式は変更しない
4. **Protocol Buffers**: `contracts/proto/merchant.proto` から生成（既存定義を変更しない）

### 環境設定
- **Backend gRPC**: 環境変数 `BACKEND_GRPC_ADDR`（デフォルト: `localhost:50051`）
- Docker Compose使用時: `backend:50051`（外部ネットワーク経由）
- ローカル開発時: `localhost:50051`

---

## 非機能要件

### パフォーマンス
- gRPCレスポンスタイム: BFF追加分は10ms以内
- gRPC接続プーリング（コネクション再利用）

### セキュリティ
- 認証・認可は既存のBFFミドルウェアを使用
- gRPCは内部ネットワーク通信のため平文（insecure）で許容

### エラーハンドリング
- Backend gRPC NOT_FOUND → BFF HTTP 404
- Backend gRPC INVALID_ARGUMENT → BFF HTTP 400
- Backend gRPC INTERNAL → BFF HTTP 500
- Backend接続不可 → BFF HTTP 503 Service Unavailable

---

## 成功の定義

1. ✅ `GET /api/v1/merchants` がBackend gRPCから実データを返却
2. ✅ `GET /api/v1/merchants/:id` が正常動作（存在/不存在）
3. ✅ `POST /api/v1/merchants` が正常動作（登録 + 監査記録）
4. ✅ モックデータ（`mockMerchants`, `filterMerchants`）が完全に削除されている
5. ✅ Docker Compose（BFF + Backend）で統合動作確認
6. ✅ ユニットテストが全パス
7. ✅ OpenAPI仕様が更新されている

---

**作成日:** 2026-04-09
**作成者:** Claude Code
