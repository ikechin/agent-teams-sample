# CLAUDE.md (BFF Service)

## 概要

このドキュメントは **BFF (Backend for Frontend) サービス** の開発ルールを定義します。

**BFFサービスの役割:**
- Frontend向けのAPI Gatewayとして機能
- 認証・認可・セッション管理
- 監査ログ記録（J-SOX対応）
- Backend（gRPC）とFrontend（REST API）の橋渡し
- ユーザー・ロール・権限管理

**重要:** このドキュメントはルートの `CLAUDE.md` を継承します。競合する場合はルートのルールを優先してください。

---

## 技術スタック

### コア技術
- **言語:** Go 1.21+
- **Webフレームワーク:** Echo v4
- **ORM:** sqlc（型安全なSQLクエリ生成）
- **データベース:** PostgreSQL 15+
- **gRPCクライアント:** google.golang.org/grpc

### 主要ライブラリ
- **認証・セッション:** gorilla/sessions（セッションストア）
- **パスワードハッシュ化:** golang.org/x/crypto/bcrypt
- **バリデーション:** go-playground/validator/v10
- **環境変数管理:** godotenv
- **ロギング:** zap（構造化ログ）
- **API定義:** OpenAPI 3.0（contracts/openapi/bff-api.yaml）

### テスト
- **ユニットテスト:** Go標準testing + testify/assert
- **モック生成:** gomock
- **統合テスト:** testcontainers-go（PostgreSQL）

---

## プロジェクト構造

```
services/bff/
├── CLAUDE.md                    # このファイル
├── docs/                        # BFF設計ドキュメント
│   ├── functional-design.md
│   ├── repository-structure.md  # ← 詳細はこちらを参照
│   └── development-guidelines.md
├── cmd/
│   └── server/
│       └── main.go              # エントリーポイント
├── internal/
│   ├── handler/                 # HTTPハンドラー（Echoルーティング）
│   ├── middleware/              # ミドルウェア（認証・ログ）
│   ├── service/                 # ビジネスロジック
│   ├── repository/              # データアクセス層（sqlc生成コード使用）
│   ├── grpc/                    # gRPCクライアント（Backend呼び出し）
│   └── model/                   # ドメインモデル
├── db/
│   ├── migrations/              # マイグレーションファイル
│   └── queries/                 # sqlcクエリ定義（*.sql）
└── sqlc.yaml                    # sqlc設定
```

**詳細なディレクトリ構造は [docs/repository-structure.md](docs/repository-structure.md) を参照してください。**

---

## 開発原則

### 1. API契約ファースト
- `contracts/openapi/bff-api.yaml` に定義されたOpenAPI仕様に厳密に従う
- エンドポイント、リクエスト/レスポンス型、ステータスコードを契約通り実装
- API変更時は必ず `contracts/openapi/bff-api.yaml` を先に更新

### 2. 型安全性の重視
- sqlcによる型安全なSQLクエリ生成を活用
- 構造体タグ（json, validate）を適切に使用
- interface{} の使用を最小限に抑える

### 3. エラーハンドリング
- すべてのエラーを適切にハンドリング
- エラーメッセージはユーザーフレンドリーに（内部詳細は隠す）
- 構造化ログにエラー詳細を記録

### 4. セキュリティファースト
- すべてのAPIエンドポイントに認証ミドルウェアを適用（ログインエンドポイント除く）
- CSRFトークン検証（Double Submit Cookie方式）
- パスワードはbcryptでハッシュ化（コスト12以上）
- SQLインジェクション対策（sqlcによるプレースホルダー使用）
- 入力値バリデーションを徹底

### 5. J-SOX対応
- すべてのAPI呼び出しを監査ログに記録（audit_logsテーブル）
- 契約変更時は変更履歴を記録（contract_changesテーブル）
- 承認フローの実装（職務分掌）
- ログには以下を含める:
  - user_id（誰が）
  - action（何を）
  - resource_type, resource_id（どのリソースに）
  - ip_address（どこから）
  - created_at（いつ）

### 6. パフォーマンス
- データベースクエリのN+1問題を回避
- 適切なインデックス設計
- ページネーション実装（デフォルト20件/ページ）
- gRPC接続のプーリング

---

## データベース設計

### BFF固有のテーブル（bff_db）

BFFサービスは独自のPostgreSQLデータベース（`bff_db`）を持ち、以下のテーブルを管理します。

#### 1. users（ユーザー）
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role_id VARCHAR(50) NOT NULL REFERENCES roles(role_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. roles（ロール）
```sql
CREATE TABLE roles (
    role_id VARCHAR(50) PRIMARY KEY, -- 'system-admin', 'contract-manager', etc.
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. permissions（権限）
```sql
CREATE TABLE permissions (
    permission_id VARCHAR(50) PRIMARY KEY, -- 'contracts:approve', 'users:manage', etc.
    resource VARCHAR(50) NOT NULL,         -- 'contracts', 'users', etc.
    action VARCHAR(50) NOT NULL,           -- 'approve', 'manage', etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. role_permissions（ロール-権限紐付け）
```sql
CREATE TABLE role_permissions (
    role_id VARCHAR(50) REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id VARCHAR(50) REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

#### 5. sessions（セッション）
```sql
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. audit_logs（監査ログ）
```sql
CREATE TABLE audit_logs (
    audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,           -- 'CREATE_CONTRACT', 'UPDATE_CONTRACT', etc.
    resource_type VARCHAR(50) NOT NULL,     -- 'contracts', 'merchants', etc.
    resource_id VARCHAR(255),
    request_path TEXT,
    request_method VARCHAR(10),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**重要:** Backendサービスは独自の `backend_db` を持ち、加盟店・契約・サービスのデータを管理します。BFFはBackendのデータベースに直接アクセスせず、必ずgRPC経由で通信します。

---

## API設計

### エンドポイント構成

すべてのエンドポイントは `/api/v1` プレフィックスを持ちます。

#### 認証エンドポイント
- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `GET /api/v1/auth/me` - 現在のユーザー情報取得

#### 加盟店エンドポイント（Backend gRPC呼び出し）
- `GET /api/v1/merchants` - 加盟店一覧取得
- `GET /api/v1/merchants/:id` - 加盟店詳細取得
- `POST /api/v1/merchants` - 加盟店登録
- `PUT /api/v1/merchants/:id` - 加盟店更新
- `DELETE /api/v1/merchants/:id` - 加盟店削除

#### 契約エンドポイント（Backend gRPC呼び出し）
- `GET /api/v1/contracts` - 契約一覧取得
- `GET /api/v1/contracts/:id` - 契約詳細取得
- `POST /api/v1/contracts` - 契約登録
- `PUT /api/v1/contracts/:id` - 契約更新
- `DELETE /api/v1/contracts/:id` - 契約削除

#### サービスエンドポイント（Backend gRPC呼び出し）
- `GET /api/v1/services` - サービス一覧取得
- `GET /api/v1/services/:id` - サービス詳細取得
- `POST /api/v1/services` - サービス登録
- `PUT /api/v1/services/:id` - サービス更新

#### 承認ワークフローエンドポイント（Backend gRPC呼び出し）
- `GET /api/v1/approvals` - 承認待ち一覧取得
- `POST /api/v1/approvals/:id/approve` - 承認実行
- `POST /api/v1/approvals/:id/reject` - 却下実行

#### ユーザー・ロール管理エンドポイント（BFF自身のDB）
- `GET /api/v1/users` - ユーザー一覧取得
- `GET /api/v1/users/:id` - ユーザー詳細取得
- `POST /api/v1/users` - ユーザー登録
- `PUT /api/v1/users/:id` - ユーザー更新
- `GET /api/v1/roles` - ロール一覧取得
- `POST /api/v1/roles` - ロール作成
- `PUT /api/v1/roles/:id` - ロール更新
- `GET /api/v1/permissions` - 権限一覧取得

#### 監査ログエンドポイント（BFF自身のDB）
- `GET /api/v1/audit-logs` - 監査ログ一覧取得

---

## 認証・認可フロー

### 認証（Authentication）

**セッションベース認証**を採用します。

#### ログインフロー
1. Frontend → BFF: `POST /api/v1/auth/login` （email, password）
2. BFF: usersテーブルでemailを検索
3. BFF: パスワードをbcryptで検証
4. BFF: sessionsテーブルに新規セッション作成（session_token生成）
5. BFF → Frontend: Set-Cookieヘッダーでセッショントークンを返却（HttpOnly, Secure, SameSite=Lax）
6. Frontend: Cookieに保存（自動）

#### 認証確認（ミドルウェア）
1. Frontend → BFF: リクエスト（Cookieにsession_token含む）
2. BFF: セッションミドルウェアでsession_tokenを検証
3. BFF: sessionsテーブルでセッション有効性確認（expires_at > NOW()）
4. BFF: user_idをコンテキストに設定
5. BFF: ハンドラー処理実行

### 認可（Authorization）

**ロールベースアクセス制御（RBAC）**を採用します。

#### 権限チェックフロー
1. ハンドラー内でユーザーのrole_idを取得
2. role_permissions テーブルで該当ロールの権限を確認
3. 必要な権限（例: `contracts:approve`）があるか検証
4. 権限がない場合は 403 Forbidden を返却

#### 権限の例
- `merchants:read` - 加盟店閲覧
- `merchants:create` - 加盟店登録
- `contracts:read` - 契約閲覧
- `contracts:create` - 契約登録
- `contracts:update` - 契約編集申請
- `contracts:approve` - 契約承認（職務分掌）
- `users:manage` - ユーザー管理
- `roles:manage` - ロール・権限管理

---

## gRPC通信（Backend呼び出し）

BFFはBackendとgRPCで通信します。

### Protocol Buffers定義の配置
- `contracts/proto/merchant.proto` - 加盟店サービス
- `contracts/proto/contract.proto` - 契約サービス
- `contracts/proto/service.proto` - サービス管理

### gRPCクライアント実装

#### 1. クライアント初期化（起動時）
```go
// internal/grpc/client.go
func NewBackendClient() (pb.MerchantServiceClient, error) {
    conn, err := grpc.Dial("backend:50051", grpc.WithInsecure())
    if err != nil {
        return nil, err
    }
    return pb.NewMerchantServiceClient(conn), nil
}
```

#### 2. ハンドラーでのgRPC呼び出し
```go
// internal/handler/merchant_handler.go
func (h *MerchantHandler) GetMerchants(c echo.Context) error {
    // 認証済みユーザー取得
    userID := c.Get("user_id").(string)

    // gRPC呼び出し
    resp, err := h.backendClient.ListMerchants(ctx, &pb.ListMerchantsRequest{
        Page:  1,
        Limit: 20,
    })
    if err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch merchants"})
    }

    // 監査ログ記録
    h.auditLogger.Log(userID, "LIST_MERCHANTS", "merchants", "", c.Request())

    return c.JSON(http.StatusOK, resp)
}
```

---

## 監査ログ実装

すべてのAPI呼び出しを監査ログに記録します（J-SOX対応）。

### ミドルウェアによる自動ログ記録

```go
// internal/middleware/audit.go
func AuditLogMiddleware(db *sql.DB) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            // リクエスト処理
            err := next(c)

            // 監査ログ記録
            userID := c.Get("user_id") // 認証ミドルウェアで設定
            if userID != nil {
                logAuditEvent(db, AuditLog{
                    UserID:        userID.(string),
                    Action:        determineAction(c.Request()),
                    ResourceType:  extractResourceType(c.Path()),
                    RequestPath:   c.Request().URL.Path,
                    RequestMethod: c.Request().Method,
                    IPAddress:     c.RealIP(),
                    UserAgent:     c.Request().UserAgent(),
                })
            }

            return err
        }
    }
}
```

---

## 開発ワークフロー

### 1. 新規API追加時の手順
1. `contracts/openapi/bff-api.yaml` にエンドポイント定義追加
2. Backend側にgRPCサービスが必要な場合は `contracts/proto/` を更新
3. `db/queries/` にSQLクエリ追加（BFF DBアクセスが必要な場合）
4. `sqlc generate` 実行
5. `internal/handler/` にハンドラー実装
6. `internal/middleware/` に認可チェック追加
7. ユニットテスト作成
8. 統合テスト作成

### 2. マイグレーション作成
```bash
# 新規マイグレーションファイル作成
migrate create -ext sql -dir db/migrations -seq add_users_table

# マイグレーション実行
migrate -path db/migrations -database "postgres://..." up

# ロールバック
migrate -path db/migrations -database "postgres://..." down 1
```

### 3. sqlc実行
```bash
# db/queries/ のSQLからGoコード生成
sqlc generate
```

---

## テスト戦略

### ユニットテスト
- ハンドラー、サービス、リポジトリのロジックをテスト
- モック（gomock）を使用してgRPCクライアント、DBをモック化
- テストカバレッジ80%以上を目標

### 統合テスト
- testcontainersでPostgreSQLコンテナを起動
- 実際のDBを使用してリポジトリ層をテスト
- マイグレーション実行 → データ投入 → クエリ実行 → 検証

### E2Eテスト
- ルートの `e2e/` で実施
- BFF単体ではなく、Frontend/BFF/Backend統合テスト

---

## セキュリティ要件

詳細は `docs/security-guidelines.md` および `docs/jsox-compliance.md` を参照してください。

### 実装必須項目
- ✅ セッションベース認証（HttpOnly Cookie）
- ✅ CSRF対策（Double Submit Cookie）
- ✅ bcryptパスワードハッシュ化（コスト12以上）
- ✅ SQLインジェクション対策（sqlcプレースホルダー）
- ✅ 入力バリデーション（validator/v10）
- ✅ HTTPS通信（本番環境）
- ✅ セッションタイムアウト（24時間）
- ✅ 監査ログ記録（すべてのAPI呼び出し）

---

## コーディング規約

詳細は [docs/development-guidelines.md](docs/development-guidelines.md) を参照してください。

### 主要規約
- **パッケージ名:** 小文字、短く、複数形は避ける（例: `handler`, `service`）
- **ファイル名:** スネークケース（例: `merchant_handler.go`）
- **関数名:** キャメルケース、Public関数は大文字開始（例: `GetMerchants`）
- **エラーハンドリング:** `if err != nil` を即座にチェック
- **コメント:** Publicな関数・構造体には必ずコメントを記載
- **フォーマット:** `gofmt` または `goimports` で自動整形

---

## 用語の統一

すべての用語は `docs/glossary.md` に従ってください。

**主要用語:**
- Merchant（加盟店）
- Contract（契約）
- Service（サービス）
- User（ユーザー）
- Role（ロール）
- Permission（権限）
- Approval Workflow（承認ワークフロー）
- Audit Log（監査ログ）

---

## 参照ドキュメント

### ルートドキュメント（必読）
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体ルール
- [docs/product-requirements.md](../../docs/product-requirements.md) - プロダクト要求定義
- [docs/system-architecture.md](../../docs/system-architecture.md) - システムアーキテクチャ
- [docs/glossary.md](../../docs/glossary.md) - ユビキタス言語定義
- [docs/jsox-compliance.md](../../docs/jsox-compliance.md) - J-SOX対応設計
- [docs/security-guidelines.md](../../docs/security-guidelines.md) - セキュリティガイドライン
- [docs/service-contracts.md](../../docs/service-contracts.md) - API契約方針

### BFF固有ドキュメント
- [docs/functional-design.md](docs/functional-design.md) - BFF機能設計
- [docs/repository-structure.md](docs/repository-structure.md) - リポジトリ構造
- [docs/development-guidelines.md](docs/development-guidelines.md) - 開発ガイドライン

### API契約
- [contracts/openapi/bff-api.yaml](../../contracts/openapi/bff-api.yaml) - REST API仕様
- [contracts/proto/](../../contracts/proto/) - gRPC Protocol Buffers定義

---

## 注意事項

- ルートの `CLAUDE.md` と競合する場合は、ルートのルールを優先する
- API変更時は必ず `contracts/openapi/bff-api.yaml` を先に更新
- 用語は `docs/glossary.md` に厳密に従う
- セキュリティ・J-SOX要件は妥協しない
- コード変更後は必ず `go fmt` と `go vet` を実行
- テストを書かずにコードをコミットしない

---

**最終更新日:** 2026-04-07
**作成者:** Claude Code
