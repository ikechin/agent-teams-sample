# BFF Service - 開発ガイドライン

## 概要

このドキュメントは **BFF (Backend for Frontend) サービス** の開発ガイドラインを定義します。

コーディング規約、テスト規約、セキュリティ実装、コミット規約などを明確化し、開発者全員が統一したコーディングスタイルで実装できるようにします。

---

## Go コーディング規約

### 1. コードフォーマット

**必須:** すべてのGoコードは `gofmt` または `goimports` で自動整形してからコミットすること。

```bash
# 自動整形
gofmt -w .

# または goimports（import文も整理）
goimports -w .
```

**VSCode設定例:**
```json
{
  "go.formatTool": "goimports",
  "editor.formatOnSave": true
}
```

---

### 2. 命名規則

#### パッケージ名
- 小文字のみ
- 短く、簡潔に
- 複数形は避ける
- アンダースコア不要

✅ **良い例:**
```go
package handler
package service
package repository
```

❌ **悪い例:**
```go
package handlers     // 複数形
package auth_handler // アンダースコア
package BFFService   // 大文字
```

#### ファイル名
- スネークケース（snake_case）
- 小文字のみ

✅ **良い例:**
```go
auth_handler.go
user_repository.go
permission_service.go
```

❌ **悪い例:**
```go
authHandler.go      // キャメルケース
UserRepository.go   // 大文字開始
auth-handler.go     // ハイフン
```

#### 変数・関数名
- キャメルケース（camelCase）
- **Public:** 大文字開始（`GetUser`, `UserService`）
- **Private:** 小文字開始（`validatePassword`, `sessionToken`）

✅ **良い例:**
```go
// Public
type UserService struct {}
func (s *UserService) GetUser(id string) {}

// Private
func validatePassword(password string) bool {}
var sessionTimeout = 24 * time.Hour
```

#### 定数
- アッパースネークケース（UPPER_SNAKE_CASE）またはキャメルケース

✅ **良い例:**
```go
const (
    MaxSessionTimeout = 24 * time.Hour
    DefaultPageSize   = 20
    SESSION_TIMEOUT   = 86400 // アッパースネークケースも可
)
```

#### 略語
- 略語は全て大文字または全て小文字

✅ **良い例:**
```go
userID    // ✅
HTTPServer // ✅
APIKey    // ✅
```

❌ **悪い例:**
```go
userId    // ❌
HttpServer // ❌
ApiKey    // ❌
```

---

### 3. コメント

#### Public な関数・構造体
**必須:** Publicな関数・構造体には必ずコメントを記載すること。

```go
// UserService はユーザー管理のビジネスロジックを提供します。
type UserService struct {
    repo   *repository.UserRepository
    logger *zap.Logger
}

// GetUser は指定されたIDのユーザーを取得します。
// ユーザーが存在しない場合はエラーを返します。
func (s *UserService) GetUser(id uuid.UUID) (*model.User, error) {
    return s.repo.FindByID(id)
}
```

#### コメント形式
- パッケージコメント: `package` 文の直前
- 関数コメント: 関数名で開始
- 構造体コメント: 構造体名で開始

✅ **良い例:**
```go
// HashPassword はパスワードをbcryptでハッシュ化します。
func HashPassword(password string) (string, error) {
    // ...
}
```

❌ **悪い例:**
```go
// パスワードをハッシュ化する関数
func HashPassword(password string) (string, error) {
    // ...
}
```

---

### 4. エラーハンドリング

#### エラーは即座にチェック

✅ **良い例:**
```go
user, err := s.repo.FindByID(id)
if err != nil {
    return nil, fmt.Errorf("failed to find user: %w", err)
}
```

❌ **悪い例:**
```go
user, err := s.repo.FindByID(id)
// エラーチェックを後回しにしない
doSomething()
if err != nil {
    return nil, err
}
```

#### エラーのラップ

Go 1.13以降の `%w` を使用してエラーをラップする。

```go
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

#### カスタムエラー

```go
var (
    ErrUserNotFound     = errors.New("user not found")
    ErrInvalidPassword  = errors.New("invalid password")
    ErrSessionExpired   = errors.New("session expired")
)
```

---

### 5. 構造体とインターフェース

#### 構造体タグ

```go
type User struct {
    UserID       uuid.UUID `json:"user_id" db:"user_id"`
    Email        string    `json:"email" validate:"required,email" db:"email"`
    PasswordHash string    `json:"-" db:"password_hash"` // JSONに含めない
    Name         string    `json:"name" validate:"required" db:"name"`
    RoleID       string    `json:"role_id" db:"role_id"`
    IsActive     bool      `json:"is_active" db:"is_active"`
    CreatedAt    time.Time `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}
```

#### インターフェース

小さく、シンプルに定義する（"Accept interfaces, return structs"）。

```go
type UserRepository interface {
    FindByID(id uuid.UUID) (*model.User, error)
    FindByEmail(email string) (*model.User, error)
    Create(user *model.User) error
    Update(user *model.User) error
}
```

---

### 6. コンテキスト使用

#### データベース操作・gRPC呼び出しには必ずcontextを使う

```go
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
    return r.q.GetUser(ctx, id)
}

func (c *MerchantClient) ListMerchants(ctx context.Context, page, limit int) (*pb.ListMerchantsResponse, error) {
    return c.client.ListMerchants(ctx, &pb.ListMerchantsRequest{
        Page:  int32(page),
        Limit: int32(limit),
    })
}
```

#### タイムアウト設定

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := c.backendClient.ListMerchants(ctx, req)
```

---

## API実装ガイドライン

### 1. ハンドラーの実装パターン

```go
func (h *MerchantHandler) CreateMerchant(c echo.Context) error {
    // 1. 認証済みユーザー取得
    userID := c.Get("user_id").(uuid.UUID)

    // 2. 権限チェック
    if !h.permissionService.HasPermission(userID, "merchants:create") {
        return c.JSON(http.StatusForbidden, ErrorResponse{
            Error: "Permission denied",
        })
    }

    // 3. リクエストボディのバインド
    var req CreateMerchantRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request body",
        })
    }

    // 4. バリデーション
    if err := c.Validate(&req); err != nil {
        return c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: err.Error(),
        })
    }

    // 5. ビジネスロジック実行（gRPC呼び出し）
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resp, err := h.backendClient.CreateMerchant(ctx, &pb.CreateMerchantRequest{
        MerchantCode: req.MerchantCode,
        Name:         req.Name,
        Address:      req.Address,
    })
    if err != nil {
        h.logger.Error("Failed to create merchant", zap.Error(err))
        return c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to create merchant",
        })
    }

    // 6. 監査ログ記録（ミドルウェアで自動記録される場合はスキップ可）
    h.auditService.Log(AuditLog{
        UserID:       userID,
        Action:       "CREATE_MERCHANT",
        ResourceType: "merchants",
        ResourceID:   resp.MerchantId,
        RequestPath:  c.Request().URL.Path,
        IPAddress:    c.RealIP(),
    })

    // 7. レスポンス返却
    return c.JSON(http.StatusCreated, resp)
}
```

---

### 2. バリデーション

#### validator/v10 を使用

```go
import "github.com/go-playground/validator/v10"

type CreateUserRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
    Name     string `json:"name" validate:"required,max=100"`
    RoleID   string `json:"role_id" validate:"required"`
}

// カスタムバリデーター登録（main.goで実行）
func setupValidator(e *echo.Echo) {
    v := validator.New()
    e.Validator = &CustomValidator{validator: v}
}

type CustomValidator struct {
    validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
    return cv.validator.Struct(i)
}
```

---

### 3. エラーレスポンス統一

```go
type ErrorResponse struct {
    Error   string `json:"error"`
    Message string `json:"message,omitempty"`
    Code    string `json:"code,omitempty"`
}

// 使用例
return c.JSON(http.StatusForbidden, ErrorResponse{
    Error:   "Permission denied",
    Message: "You don't have permission to access this resource",
    Code:    "PERMISSION_DENIED",
})
```

---

## セキュリティ実装

### 1. パスワードハッシュ化

**bcrypt を使用（コスト12以上）**

```go
import "golang.org/x/crypto/bcrypt"

// ユーザー登録時
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    return string(bytes), err
}

// ログイン時
func CheckPasswordHash(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

---

### 2. セッション管理

#### セッショントークン生成

```go
import (
    "crypto/rand"
    "encoding/base64"
)

func GenerateSessionToken() (string, error) {
    b := make([]byte, 32)
    _, err := rand.Read(b)
    if err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(b), nil
}
```

#### Cookie設定

```go
func SetSessionCookie(c echo.Context, sessionToken string) {
    cookie := &http.Cookie{
        Name:     "session_token",
        Value:    sessionToken,
        Path:     "/",
        HttpOnly: true,                    // JavaScript からアクセス不可
        Secure:   true,                    // HTTPS のみ
        SameSite: http.SameSiteLaxMode,    // CSRF 対策
        MaxAge:   86400,                   // 24時間
    }
    c.SetCookie(cookie)
}
```

---

### 3. CSRF対策（Double Submit Cookie）

```go
func CSRFMiddleware() echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            // GET リクエストはスキップ
            if c.Request().Method == "GET" {
                return next(c)
            }

            // CSRFトークン検証
            cookieToken, err := c.Cookie("csrf_token")
            if err != nil {
                return c.JSON(http.StatusForbidden, ErrorResponse{Error: "CSRF token missing"})
            }

            headerToken := c.Request().Header.Get("X-CSRF-Token")
            if cookieToken.Value != headerToken {
                return c.JSON(http.StatusForbidden, ErrorResponse{Error: "Invalid CSRF token"})
            }

            return next(c)
        }
    }
}
```

---

### 4. SQLインジェクション対策

**sqlc を使用することで自動的にプレースホルダーが使われる**

```sql
-- db/queries/user.sql
-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;
```

生成されるコード:
```go
// 自動的にプレースホルダーが使われる
func (q *Queries) GetUserByEmail(ctx context.Context, email string) (User, error) {
    row := q.db.QueryRowContext(ctx, getUserByEmail, email)
    // ...
}
```

---

## テスト規約

### 1. ユニットテスト

#### テストファイル配置
- `tests/unit/{package}/` に配置
- ファイル名: `{対象ファイル名}_test.go`

#### テスト関数命名
```go
func TestFunctionName(t *testing.T) {
    // テーブル駆動テスト
    tests := []struct {
        name    string
        input   string
        want    string
        wantErr bool
    }{
        {
            name:    "正常系",
            input:   "test@example.com",
            want:    "test@example.com",
            wantErr: false,
        },
        {
            name:    "異常系: 空文字",
            input:   "",
            want:    "",
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := FunctionName(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            if got != tt.want {
                t.Errorf("got = %v, want %v", got, tt.want)
            }
        })
    }
}
```

#### モック使用

**gomock を使用してモックを生成**

```bash
# モック生成
mockgen -source=internal/repository/user_repository.go -destination=tests/mocks/mock_user_repository.go
```

**テストでの使用:**
```go
import (
    "testing"
    "github.com/golang/mock/gomock"
    "github.com/stretchr/testify/assert"
)

func TestAuthService_Login(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockUserRepo := mocks.NewMockUserRepository(ctrl)
    mockSessionRepo := mocks.NewMockSessionRepository(ctrl)

    service := &AuthService{
        userRepo:    mockUserRepo,
        sessionRepo: mockSessionRepo,
    }

    // モックの振る舞い設定
    mockUserRepo.EXPECT().
        FindByEmail("test@example.com").
        Return(&model.User{Email: "test@example.com"}, nil)

    // テスト実行
    session, err := service.Login("test@example.com", "password")
    assert.NoError(t, err)
    assert.NotNil(t, session)
}
```

---

### 2. 統合テスト

#### testcontainers を使用してPostgreSQLコンテナを起動

```go
import (
    "context"
    "testing"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestIntegration_AuthFlow(t *testing.T) {
    ctx := context.Background()

    // PostgreSQLコンテナ起動
    pgContainer, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15-alpine"),
        postgres.WithDatabase("test_db"),
        postgres.WithUsername("test_user"),
        postgres.WithPassword("test_password"),
    )
    if err != nil {
        t.Fatal(err)
    }
    defer pgContainer.Terminate(ctx)

    // マイグレーション実行
    connStr, _ := pgContainer.ConnectionString(ctx, "sslmode=disable")
    runMigrations(connStr)

    // テスト実行
    t.Run("ログイン成功", func(t *testing.T) {
        // ...
    })
}
```

---

### 3. テストカバレッジ

**目標: 80%以上**

```bash
# カバレッジ計測
go test -coverprofile=coverage.out ./...

# カバレッジ表示
go tool cover -html=coverage.out
```

---

## ロギング

### zap を使用した構造化ログ

```go
import "go.uber.org/zap"

// ロガー初期化（main.goで実行）
func initLogger() *zap.Logger {
    logger, _ := zap.NewProduction()
    return logger
}

// 使用例
logger.Info("User logged in",
    zap.String("user_id", userID.String()),
    zap.String("ip_address", ipAddr),
)

logger.Error("Failed to create merchant",
    zap.Error(err),
    zap.String("merchant_code", merchantCode),
)
```

---

## データベースマイグレーション

### golang-migrate を使用

#### マイグレーションファイル作成
```bash
migrate create -ext sql -dir db/migrations -seq create_users
```

生成されるファイル:
- `000001_create_users.up.sql`
- `000001_create_users.down.sql`

#### マイグレーション実行
```bash
# Up（適用）
migrate -path db/migrations -database "postgres://user:pass@localhost:5432/bff_db?sslmode=disable" up

# Down（ロールバック）
migrate -path db/migrations -database "postgres://user:pass@localhost:5432/bff_db?sslmode=disable" down 1
```

---

## sqlc 使用方法

### クエリ定義

`db/queries/user.sql`:
```sql
-- name: GetUser :one
SELECT * FROM users WHERE user_id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: CreateUser :exec
INSERT INTO users (email, password_hash, name, role_id)
VALUES ($1, $2, $3, $4);

-- name: UpdateUser :exec
UPDATE users SET name = $1, updated_at = NOW() WHERE user_id = $2;

-- name: DeleteUser :exec
DELETE FROM users WHERE user_id = $1;

-- name: ListUsers :many
SELECT * FROM users ORDER BY created_at DESC;
```

### sqlc 実行
```bash
sqlc generate
```

生成されたコードの使用:
```go
import "github.com/your-org/agent-teams-sample/services/bff/db/sqlc"

q := sqlc.New(db)

// ユーザー取得
user, err := q.GetUser(ctx, userID)

// ユーザー作成
err = q.CreateUser(ctx, sqlc.CreateUserParams{
    Email:        "test@example.com",
    PasswordHash: hashedPassword,
    Name:         "Test User",
    RoleID:       "sales",
})
```

---

## Git コミット規約

### コミットメッセージ形式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（必須）
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルドプロセス・補助ツール変更

### Scope（任意）
- `auth`: 認証機能
- `merchant`: 加盟店機能
- `contract`: 契約機能
- `audit`: 監査ログ
- `db`: データベース

### 例

```
feat(auth): ログイン機能を実装

- セッションベース認証を実装
- bcryptでパスワードハッシュ化
- セッションCookie設定（HttpOnly, Secure）

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 環境構築手順

### 1. 依存関係インストール
```bash
cd services/bff
go mod download
```

### 2. PostgreSQL起動
```bash
docker-compose up -d postgres
```

### 3. マイグレーション実行
```bash
./scripts/migrate.sh
```

### 4. sqlc生成
```bash
sqlc generate
```

### 5. サーバー起動
```bash
go run cmd/server/main.go
```

---

## デバッグ方法

### VSCode launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch BFF",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/services/bff/cmd/server",
      "env": {
        "PORT": "8080",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_USER": "bff_user",
        "DB_PASSWORD": "bff_password",
        "DB_NAME": "bff_db"
      },
      "args": []
    }
  ]
}
```

---

## パフォーマンスベストプラクティス

### 1. データベースコネクションプール設定

```go
db, err := sqlx.Connect("postgres", dsn)
db.SetMaxOpenConns(25)        // 最大オープン接続数
db.SetMaxIdleConns(5)         // 最大アイドル接続数
db.SetConnMaxLifetime(5 * time.Minute) // 接続の最大ライフタイム
```

### 2. gRPC接続のKeepAlive設定

```go
import "google.golang.org/grpc/keepalive"

conn, err := grpc.Dial(
    "backend:50051",
    grpc.WithInsecure(),
    grpc.WithKeepaliveParams(keepalive.ClientParameters{
        Time:                10 * time.Second,
        Timeout:             3 * time.Second,
        PermitWithoutStream: true,
    }),
)
```

### 3. ページネーションの実装

```go
type PaginationParams struct {
    Page  int `query:"page"`
    Limit int `query:"limit"`
}

func (p *PaginationParams) Validate() {
    if p.Page < 1 {
        p.Page = 1
    }
    if p.Limit < 1 || p.Limit > 100 {
        p.Limit = 20
    }
}

func (p *PaginationParams) Offset() int {
    return (p.Page - 1) * p.Limit
}
```

---

## 参照ドキュメント

### ルートドキュメント
- [CLAUDE.md](../../CLAUDE.md)
- [docs/glossary.md](../../docs/glossary.md)
- [docs/security-guidelines.md](../../docs/security-guidelines.md)
- [docs/jsox-compliance.md](../../docs/jsox-compliance.md)

### BFF固有ドキュメント
- [CLAUDE.md](../CLAUDE.md)
- [functional-design.md](functional-design.md)
- [repository-structure.md](repository-structure.md)

---

**最終更新日:** 2026-04-07
**作成者:** Claude Code
