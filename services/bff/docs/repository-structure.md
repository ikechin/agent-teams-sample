# BFF Service - リポジトリ構造

## 概要

このドキュメントは **BFF (Backend for Frontend) サービス** のディレクトリ構造とファイル配置ルールを定義します。

---

## ディレクトリ構造

```
services/bff/
├── CLAUDE.md                           # BFF開発ルール
├── docs/                               # 設計ドキュメント
│   ├── functional-design.md            # 機能設計書
│   ├── repository-structure.md         # このファイル
│   └── development-guidelines.md       # 開発ガイドライン
│
├── cmd/                                # アプリケーションエントリーポイント
│   └── server/
│       └── main.go                     # サーバー起動スクリプト
│
├── internal/                           # 非公開パッケージ
│   ├── handler/                        # HTTPハンドラー（Echoルーティング）
│   │   ├── auth_handler.go             # 認証ハンドラー（ログイン/ログアウト）
│   │   ├── merchant_handler.go         # 加盟店ハンドラー
│   │   ├── contract_handler.go         # 契約ハンドラー
│   │   ├── service_handler.go          # サービスハンドラー
│   │   ├── approval_handler.go         # 承認ワークフローハンドラー
│   │   ├── user_handler.go             # ユーザー管理ハンドラー
│   │   ├── role_handler.go             # ロール管理ハンドラー
│   │   ├── audit_log_handler.go        # 監査ログハンドラー
│   │   └── handler.go                  # ハンドラー共通構造体
│   │
│   ├── middleware/                     # ミドルウェア
│   │   ├── auth.go                     # 認証ミドルウェア（セッション検証）
│   │   ├── permission.go               # 権限チェックミドルウェア
│   │   ├── audit.go                    # 監査ログ記録ミドルウェア
│   │   ├── csrf.go                     # CSRF対策ミドルウェア
│   │   ├── logger.go                   # ロギングミドルウェア
│   │   └── cors.go                     # CORS設定ミドルウェア
│   │
│   ├── service/                        # ビジネスロジック層
│   │   ├── auth_service.go             # 認証ロジック（ログイン・セッション生成）
│   │   ├── permission_service.go       # 権限チェックロジック
│   │   ├── user_service.go             # ユーザー管理ロジック
│   │   ├── role_service.go             # ロール管理ロジック
│   │   ├── audit_service.go            # 監査ログ記録ロジック
│   │   └── service.go                  # サービス共通構造体
│   │
│   ├── repository/                     # データアクセス層
│   │   ├── user_repository.go          # usersテーブルアクセス
│   │   ├── session_repository.go       # sessionsテーブルアクセス
│   │   ├── role_repository.go          # rolesテーブルアクセス
│   │   ├── permission_repository.go    # permissionsテーブルアクセス
│   │   ├── audit_log_repository.go     # audit_logsテーブルアクセス
│   │   └── repository.go               # リポジトリ共通構造体
│   │
│   ├── grpc/                           # gRPCクライアント（Backend呼び出し）
│   │   ├── merchant_client.go          # 加盟店gRPCクライアント
│   │   ├── contract_client.go          # 契約gRPCクライアント
│   │   ├── service_client.go           # サービスgRPCクライアント
│   │   ├── approval_client.go          # 承認ワークフローgRPCクライアント
│   │   └── client.go                   # gRPCクライアント初期化
│   │
│   ├── model/                          # ドメインモデル
│   │   ├── user.go                     # Userモデル
│   │   ├── session.go                  # Sessionモデル
│   │   ├── role.go                     # Roleモデル
│   │   ├── permission.go               # Permissionモデル
│   │   ├── audit_log.go                # AuditLogモデル
│   │   └── request.go                  # APIリクエスト構造体
│   │
│   └── config/                         # 設定管理
│       ├── config.go                   # 設定構造体
│       └── env.go                      # 環境変数読み込み
│
├── db/                                 # データベース関連
│   ├── migrations/                     # マイグレーションファイル
│   │   ├── 000001_create_users.up.sql
│   │   ├── 000001_create_users.down.sql
│   │   ├── 000002_create_roles.up.sql
│   │   ├── 000002_create_roles.down.sql
│   │   ├── 000003_create_permissions.up.sql
│   │   ├── 000003_create_permissions.down.sql
│   │   ├── 000004_create_role_permissions.up.sql
│   │   ├── 000004_create_role_permissions.down.sql
│   │   ├── 000005_create_sessions.up.sql
│   │   ├── 000005_create_sessions.down.sql
│   │   ├── 000006_create_audit_logs.up.sql
│   │   ├── 000006_create_audit_logs.down.sql
│   │   ├── 000007_seed_roles.up.sql         # ロール初期データ
│   │   ├── 000008_seed_permissions.up.sql   # 権限初期データ
│   │   └── 000009_seed_role_permissions.up.sql # ロール-権限初期データ
│   │
│   ├── queries/                        # sqlcクエリ定義（*.sql）
│   │   ├── user.sql                    # usersテーブルクエリ
│   │   ├── session.sql                 # sessionsテーブルクエリ
│   │   ├── role.sql                    # rolesテーブルクエリ
│   │   ├── permission.sql              # permissionsテーブルクエリ
│   │   └── audit_log.sql               # audit_logsテーブルクエリ
│   │
│   └── sqlc/                           # sqlc生成コード（自動生成、編集禁止）
│       ├── db.go
│       ├── models.go
│       ├── user.sql.go
│       ├── session.sql.go
│       ├── role.sql.go
│       ├── permission.sql.go
│       └── audit_log.sql.go
│
├── tests/                              # テストコード
│   ├── unit/                           # ユニットテスト
│   │   ├── handler/
│   │   │   ├── auth_handler_test.go
│   │   │   ├── merchant_handler_test.go
│   │   │   └── contract_handler_test.go
│   │   ├── service/
│   │   │   ├── auth_service_test.go
│   │   │   └── permission_service_test.go
│   │   └── repository/
│   │       ├── user_repository_test.go
│   │       └── session_repository_test.go
│   │
│   ├── integration/                    # 統合テスト
│   │   ├── auth_flow_test.go           # 認証フローテスト
│   │   ├── permission_test.go          # 権限チェックテスト
│   │   └── audit_log_test.go           # 監査ログテスト
│   │
│   └── testutil/                       # テストユーティリティ
│       ├── mock.go                     # モック生成ヘルパー
│       ├── fixtures.go                 # テストデータフィクスチャ
│       └── container.go                # testcontainers設定
│
├── proto/                              # Protocol Buffers生成コード（自動生成）
│   ├── merchant/
│   │   ├── merchant.pb.go
│   │   └── merchant_grpc.pb.go
│   ├── contract/
│   │   ├── contract.pb.go
│   │   └── contract_grpc.pb.go
│   └── service/
│       ├── service.pb.go
│       └── service_grpc.pb.go
│
├── scripts/                            # 運用スクリプト
│   ├── migrate.sh                      # マイグレーション実行スクリプト
│   ├── generate.sh                     # sqlc/protoc 生成スクリプト
│   └── seed.sh                         # 初期データ投入スクリプト
│
├── go.mod                              # Go module定義
├── go.sum                              # Go依存関係ロックファイル
├── sqlc.yaml                           # sqlc設定ファイル
├── .env.example                        # 環境変数サンプル
├── .gitignore                          # Git除外ファイル
├── Dockerfile                          # Dockerイメージ定義
├── docker-compose.yml                  # ローカル開発用Docker Compose
└── README.md                           # サービスREADME
```

---

## ディレクトリの役割

### `cmd/server/`
アプリケーションのエントリーポイント。

**役割:**
- サーバー起動
- 設定読み込み
- ミドルウェア登録
- ルーティング設定
- gRPCクライアント初期化
- DB接続

**main.go の構成:**
```go
func main() {
    // 1. 設定読み込み
    cfg := config.LoadConfig()

    // 2. ロガー初期化
    logger := initLogger()

    // 3. DB接続
    db := connectDB(cfg)
    defer db.Close()

    // 4. gRPCクライアント初期化
    backendClient := grpc.NewBackendClient(cfg.BackendAddr)

    // 5. Echoインスタンス作成
    e := echo.New()

    // 6. ミドルウェア登録
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())
    e.Use(middleware.CORS())
    e.Use(middleware.Auth(db))
    e.Use(middleware.AuditLog(db))

    // 7. ルーティング設定
    setupRoutes(e, db, backendClient)

    // 8. サーバー起動
    e.Logger.Fatal(e.Start(":8080"))
}
```

---

### `internal/handler/`
HTTPリクエストを受け取り、レスポンスを返すハンドラー層。

**役割:**
- リクエストのバインド・バリデーション
- サービス層の呼び出し
- レスポンスの構築
- エラーハンドリング

**命名規則:**
- ファイル名: `{resource}_handler.go` (例: `merchant_handler.go`)
- 構造体名: `{Resource}Handler` (例: `MerchantHandler`)
- メソッド名: HTTPメソッド + リソース名 (例: `GetMerchants`, `CreateMerchant`)

**実装例:**
```go
// internal/handler/merchant_handler.go
type MerchantHandler struct {
    backendClient pb.MerchantServiceClient
    authService   *service.AuthService
    auditService  *service.AuditService
    logger        *zap.Logger
}

func (h *MerchantHandler) ListMerchants(c echo.Context) error {
    // 1. 認証済みユーザー取得
    userID := c.Get("user_id").(uuid.UUID)

    // 2. 権限チェック
    if !h.authService.HasPermission(userID, "merchants:read") {
        return c.JSON(http.StatusForbidden, ErrorResponse{Error: "Permission denied"})
    }

    // 3. クエリパラメータ取得
    page := c.QueryParam("page")
    limit := c.QueryParam("limit")

    // 4. gRPC呼び出し
    resp, err := h.backendClient.ListMerchants(ctx, &pb.ListMerchantsRequest{...})
    if err != nil {
        return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal error"})
    }

    // 5. レスポンス返却
    return c.JSON(http.StatusOK, resp)
}
```

---

### `internal/middleware/`
HTTPリクエストの前後処理を行うミドルウェア層。

**役割:**
- 認証チェック（セッション検証）
- 権限チェック（RBAC）
- 監査ログ記録
- CSRF対策
- ロギング
- CORS設定

**主要ミドルウェア:**

#### 1. `auth.go` - 認証ミドルウェア
```go
func AuthMiddleware(db *sqlx.DB) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            // セッショントークン取得
            cookie, err := c.Cookie("session_token")
            if err != nil {
                return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
            }

            // セッション検証
            session, err := validateSession(db, cookie.Value)
            if err != nil {
                return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Invalid session"})
            }

            // user_id をコンテキストに設定
            c.Set("user_id", session.UserID)
            return next(c)
        }
    }
}
```

#### 2. `permission.go` - 権限チェックミドルウェア
```go
func PermissionMiddleware(requiredPermission string) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            userID := c.Get("user_id").(uuid.UUID)
            if !hasPermission(userID, requiredPermission) {
                return c.JSON(http.StatusForbidden, ErrorResponse{Error: "Permission denied"})
            }
            return next(c)
        }
    }
}
```

---

### `internal/service/`
ビジネスロジックを実装するサービス層。

**役割:**
- 認証ロジック（パスワード検証、セッション生成）
- 権限チェックロジック（RBAC）
- 監査ログ記録ロジック
- ビジネスルール適用

**命名規則:**
- ファイル名: `{resource}_service.go` (例: `auth_service.go`)
- 構造体名: `{Resource}Service` (例: `AuthService`)

**実装例:**
```go
// internal/service/auth_service.go
type AuthService struct {
    userRepo    *repository.UserRepository
    sessionRepo *repository.SessionRepository
    logger      *zap.Logger
}

func (s *AuthService) Login(email, password string) (*model.Session, error) {
    // 1. ユーザー取得
    user, err := s.userRepo.FindByEmail(email)
    if err != nil {
        return nil, err
    }

    // 2. パスワード検証
    if !checkPasswordHash(password, user.PasswordHash) {
        return nil, errors.New("invalid credentials")
    }

    // 3. セッション生成
    sessionToken, _ := generateSessionToken()
    session := &model.Session{
        UserID:       user.UserID,
        SessionToken: sessionToken,
        ExpiresAt:    time.Now().Add(24 * time.Hour),
    }
    err = s.sessionRepo.Create(session)
    if err != nil {
        return nil, err
    }

    return session, nil
}
```

---

### `internal/repository/`
データベースアクセス層（sqlc生成コードを使用）。

**役割:**
- sqlc生成コードのラッパー
- トランザクション管理
- エラーハンドリング

**命名規則:**
- ファイル名: `{table}_repository.go` (例: `user_repository.go`)
- 構造体名: `{Table}Repository` (例: `UserRepository`)
- メソッド名: `Find`, `Create`, `Update`, `Delete` 等

**実装例:**
```go
// internal/repository/user_repository.go
type UserRepository struct {
    db *sqlx.DB
    q  *db.Queries // sqlc生成コード
}

func (r *UserRepository) FindByEmail(email string) (*model.User, error) {
    user, err := r.q.GetUserByEmail(context.Background(), email)
    if err != nil {
        return nil, err
    }
    return toModelUser(user), nil
}

func (r *UserRepository) Create(user *model.User) error {
    return r.q.CreateUser(context.Background(), db.CreateUserParams{
        Email:        user.Email,
        PasswordHash: user.PasswordHash,
        Name:         user.Name,
        RoleID:       user.RoleID,
    })
}
```

---

### `internal/grpc/`
Backend gRPCサービスを呼び出すクライアント層。

**役割:**
- gRPCクライアントの初期化・管理
- Backend APIの呼び出し
- エラーハンドリング

**実装例:**
```go
// internal/grpc/merchant_client.go
type MerchantClient struct {
    client pb.MerchantServiceClient
}

func NewMerchantClient(conn *grpc.ClientConn) *MerchantClient {
    return &MerchantClient{
        client: pb.NewMerchantServiceClient(conn),
    }
}

func (c *MerchantClient) ListMerchants(ctx context.Context, page, limit int) (*pb.ListMerchantsResponse, error) {
    return c.client.ListMerchants(ctx, &pb.ListMerchantsRequest{
        Page:  int32(page),
        Limit: int32(limit),
    })
}
```

---

### `internal/model/`
ドメインモデル定義。

**役割:**
- ビジネスロジックで使用する構造体定義
- JSON/バリデーションタグ付与

**実装例:**
```go
// internal/model/user.go
type User struct {
    UserID       uuid.UUID `json:"user_id"`
    Email        string    `json:"email" validate:"required,email"`
    PasswordHash string    `json:"-"` // JSONに含めない
    Name         string    `json:"name" validate:"required"`
    RoleID       string    `json:"role_id"`
    IsActive     bool      `json:"is_active"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}
```

---

### `db/migrations/`
データベースマイグレーションファイル。

**命名規則:**
```
{連番6桁}_{説明}.up.sql
{連番6桁}_{説明}.down.sql
```

**例:**
- `000001_create_users.up.sql`
- `000001_create_users.down.sql`

**作成方法:**
```bash
migrate create -ext sql -dir db/migrations -seq create_users
```

---

### `db/queries/`
sqlcクエリ定義ファイル。

**命名規則:**
- ファイル名: `{table}.sql` (例: `user.sql`)

**クエリ記述例:**
```sql
-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: CreateUser :exec
INSERT INTO users (email, password_hash, name, role_id)
VALUES ($1, $2, $3, $4);

-- name: UpdateUser :exec
UPDATE users SET name = $1, updated_at = NOW() WHERE user_id = $2;
```

**sqlc実行:**
```bash
sqlc generate
```

生成されたコードは `db/sqlc/` に配置されます。

---

### `db/sqlc/`
sqlc自動生成コード（**編集禁止**）。

**含まれるファイル:**
- `db.go` - データベース接続インターフェース
- `models.go` - テーブル構造体定義
- `*.sql.go` - クエリメソッド実装

---

### `tests/`
テストコード。

#### `tests/unit/`
ユニットテスト（モック使用）。

**テストファイル命名規則:**
```
{対象ファイル名}_test.go
```

**例:**
- `auth_handler_test.go`
- `permission_service_test.go`

#### `tests/integration/`
統合テスト（実際のDB使用、testcontainers）。

**実装例:**
```go
// tests/integration/auth_flow_test.go
func TestAuthFlow(t *testing.T) {
    // testcontainersでPostgreSQLコンテナ起動
    ctx := context.Background()
    pgContainer, err := postgres.RunContainer(ctx, ...)
    require.NoError(t, err)
    defer pgContainer.Terminate(ctx)

    // マイグレーション実行
    runMigrations(pgContainer.ConnectionString(ctx))

    // テスト実行
    t.Run("ログイン成功", func(t *testing.T) {
        // ...
    })
}
```

---

## ファイル命名規則

### Go ソースコード
- **パッケージ名:** 小文字、短く、複数形は避ける（`handler`, `service`, `repository`）
- **ファイル名:** スネークケース（`auth_handler.go`, `user_repository.go`）
- **テストファイル:** `{対象ファイル名}_test.go` （`auth_handler_test.go`）

### SQL ファイル
- **マイグレーション:** `{連番6桁}_{説明}.up.sql` / `.down.sql`
- **sqlcクエリ:** `{table}.sql` （`user.sql`, `session.sql`）

### 設定ファイル
- `.env.example` - 環境変数サンプル（リポジトリにコミット）
- `.env` - 実際の環境変数（`.gitignore` で除外）

---

## 環境変数設定

`.env.example`:
```env
# Server
PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=bff_user
DB_PASSWORD=bff_password
DB_NAME=bff_db

# Backend gRPC
BACKEND_GRPC_ADDR=localhost:50051

# Session
SESSION_SECRET=your-secret-key
SESSION_TIMEOUT=24h

# Logging
LOG_LEVEL=info
```

---

## スクリプト

### `scripts/migrate.sh`
マイグレーション実行スクリプト。

```bash
#!/bin/bash
migrate -path db/migrations -database "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable" up
```

### `scripts/generate.sh`
sqlc/protoc 生成スクリプト。

```bash
#!/bin/bash
# sqlc生成
sqlc generate

# protoc生成（contracts/proto から）
protoc --go_out=proto --go-grpc_out=proto ../../contracts/proto/*.proto
```

---

## 依存関係管理

### `go.mod`
主要な依存関係:

```go
module github.com/your-org/agent-teams-sample/services/bff

go 1.21

require (
    github.com/labstack/echo/v4 v4.11.4
    github.com/jmoiron/sqlx v1.3.5
    github.com/lib/pq v1.10.9
    google.golang.org/grpc v1.60.1
    google.golang.org/protobuf v1.32.0
    github.com/go-playground/validator/v10 v10.16.0
    golang.org/x/crypto v0.18.0
    github.com/google/uuid v1.5.0
    go.uber.org/zap v1.26.0
    github.com/joho/godotenv v1.5.1
    github.com/stretchr/testify v1.8.4
    github.com/golang/mock v1.6.0
    github.com/testcontainers/testcontainers-go v0.27.0
)
```

---

## 参照ドキュメント

- [CLAUDE.md](../CLAUDE.md) - BFF開発ルール
- [functional-design.md](functional-design.md) - 機能設計書
- [development-guidelines.md](development-guidelines.md) - 開発ガイドライン

---

**最終更新日:** 2026-04-07
**作成者:** Claude Code
