# Backend Service実装 (Phase 1) - 要求定義

## 目的

Backend Serviceを新規実装し、加盟店データをgRPC経由でBFFに提供する。
これは3フェーズ構成の第1フェーズであり、Backendサービス単体の実装に集中する。

**3フェーズ構成:**
1. **Phase 1（本タスク）:** Backend gRPCサービス + DB実装
2. **Phase 2:** BFFのモック実装をBackend gRPC呼び出しに置換
3. **Phase 3:** Frontend 加盟店詳細・登録画面追加

**前提タスク:** `.steering/20250407-frontend-bff-only/` が完了していること

---

## スコープ

### 実装するもの

#### Backend Service（新規）
- ✅ **gRPCサーバー**（ポート50051）
  - `ListMerchants` - 加盟店一覧取得（ページネーション対応）
  - `GetMerchant` - 加盟店詳細取得
  - `CreateMerchant` - 加盟店登録

- ✅ **データベース（backend_db）**
  - merchants テーブル（加盟店）
  - Flywayマイグレーション
  - 初期データ投入（テスト用加盟店2件）

- ✅ **Protocol Buffers定義**
  - `contracts/proto/merchant.proto` - MerchantService定義
  - `contracts/proto/` にProtocol Buffers定義を配置

- ✅ **ビジネスロジック**
  - 加盟店コード自動採番（M-XXXXX形式）
  - 入力バリデーション
  - データ変更監査（contract_changesテーブル）

- ✅ **Docker Compose設定**
  - backend（Go gRPCサーバー、ポート50051）
  - backend-db（PostgreSQL、ポート5433）
  - backend-flyway（Flywayマイグレーション）

- ✅ **テスト**
  - サービス層ユニットテスト
  - gRPCハンドラーテスト

### 実装しないもの（Phase 2以降）

- ❌ BFF→Backend gRPC接続（Phase 2）
- ❌ Frontend画面追加（Phase 3）
- ❌ 契約管理（contracts, services テーブル）- 将来タスク
- ❌ 承認ワークフロー - 将来タスク
- ❌ 加盟店更新・削除 - 将来タスク

---

## ユーザーストーリー

### ストーリー1: 加盟店一覧取得（gRPC）

**As a** BFFサービス
**I want to** Backend gRPC経由で加盟店一覧を取得する
**So that** 実データをFrontendに返却できる

**受け入れ条件:**
- gRPC `ListMerchants` が加盟店一覧をページネーション付きで返却
- page, limit パラメータを受け付ける
- search パラメータで名前・コードの部分一致検索

### ストーリー2: 加盟店詳細取得（gRPC）

**As a** BFFサービス
**I want to** merchant_id指定で加盟店詳細を取得する
**So that** 加盟店詳細画面のデータを提供できる

**受け入れ条件:**
- gRPC `GetMerchant` がmerchant_id指定で1件返却
- 存在しない場合はgRPC NOT_FOUNDエラー

### ストーリー3: 加盟店登録（gRPC）

**As a** BFFサービス
**I want to** 加盟店を新規登録する
**So that** ユーザーが加盟店を追加できる

**受け入れ条件:**
- gRPC `CreateMerchant` で加盟店を登録
- merchant_code は自動採番（M-XXXXX形式）
- バリデーション（name, address, contact_person, phone は必須）
- 登録時にcontract_changesテーブルに監査レコード追加

---

## 制約事項

### 技術的制約
1. **gRPC通信**: BFFとの通信はgRPCのみ（REST APIは提供しない）
2. **DB分離**: backend_db（ポート5433）はbff_db（ポート5432）と完全に独立
3. **Protocol Buffers**: `contracts/proto/` に定義し、Backend内で生成コードを使用
4. **sqlc**: 型安全なSQLクエリ生成を使用

### 環境設定
- **Backend gRPC**: `localhost:50051`
- **Backend DB**: `localhost:5433`（PostgreSQL）
  - Database: backend_db
  - User: backend_user
  - Password: backend_password

---

## 非機能要件

### セキュリティ
- gRPCサーバーは内部ネットワークのみ公開（外部アクセス不可）
- SQLインジェクション対策（sqlcプレースホルダー使用）

### パフォーマンス
- gRPCレスポンスタイム: 100ms以内
- ページネーション: デフォルト20件/ページ

### J-SOX対応
- 加盟店登録時にcontract_changesテーブルに記録
  - change_type: CREATE
  - changed_by: user_id（BFFから渡される）
  - changed_at: タイムスタンプ

### 監視
- ヘルスチェックエンドポイント（gRPC Health Checking Protocol）
- 構造化ログ（zap）

---

## 成功の定義

1. ✅ gRPC `ListMerchants`, `GetMerchant`, `CreateMerchant` が正常動作
2. ✅ Docker Composeで backend + backend-db + backend-flyway が起動
3. ✅ ユニットテストが全パス
4. ✅ `grpcurl` 等でgRPCエンドポイントの動作確認可能
5. ✅ contract_changesテーブルに監査レコードが記録される

---

**作成日:** 2026-04-09
**作成者:** Claude Code
