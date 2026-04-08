# Backend Service - 開発ガイドライン

## 概要

このドキュメントは **Backend サービス** の開発ガイドラインを定義します。

コーディング規約、テスト規約、gRPC実装、コミット規約などを明確化し、開発者全員が統一したコーディングスタイルで実装できるようにします。

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
package grpc
package service
package repository
```

❌ **悪い例:**
```go
package grpc_server   // アンダースコア
package services      // 複数形
package BackendService // 大文字
```

#### ファイル名
- スネークケース（snake_case）
- 小文字のみ

✅ **良い例:**
```go
merchant_server.go
contract_repository.go
approval_service.go
```

#### 変数・関数名
- キャメルケース（camelCase）
- **Public:** 大文字開始（`CreateMerchant`, `MerchantService`）
- **Private:** 小文字開始（`recordChange`, `validateContract`）

#### 定数
- アッパースネークケース（UPPER_SNAKE_CASE）またはキャメルケース

✅ **良い例:**
```go
const (
    DefaultPageSize = 20
    MaxPageSize     = 100
    STATUS_DRAFT    = "DRAFT" // アッパースネークケースも可
)
```

---

### 3. コメント

#### Public な関数・構造体
**必須:** Publicな関数・構造体には必ずコメントを記載すること。

```go
// ContractService は契約管理のビジネスロジックを提供します。
type ContractService struct {
    repo   *repository.ContractRepository
    logger *zap.Logger
}

// CreateContract は新規契約を作成します。
// 金額変更時は承認ワークフローを自動作成します。
func (s *ContractService) CreateContract(ctx context.Context, req *pb.CreateContractRequest) (*pb.Contract, error) {
    // ...
}
```

---

### 4. エラーハンドリング

#### エラーは即座にチェック

✅ **良い例:**
```go
contract, err := s.repo.GetByID(ctx, id)
if err != nil {
    return nil, status.Error(codes.NotFound, "Contract not found")
}
```

❌ **悪い例:**
```go
contract, err := s.repo.GetByID(ctx, id)
// エラーチェックを後回しにしない
doSomething()
if err != nil {
    return nil, err
}
```

#### gRPCエラーの返却

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// リソース未存在
return nil, status.Error(codes.NotFound, "Merchant not found")

// バリデーションエラー
return nil, status.Errorf(codes.InvalidArgument, "Invalid merchant_code: %s", code)

// 承認必須
return nil, status.Error(codes.FailedPrecondition, "Approval required for amount change")

// 内部エラー
return nil, status.Error(codes.Internal, "Database error")
```

---

## gRPC実装ガイドライン

### 1. gRPCサーバーの実装パターン

```go
// internal/grpc/contract_server.go
type ContractServer struct {
    pb.UnimplementedContractServiceServer
    service *service.ContractService
    logger  *zap.Logger
}

func (s *ContractServer) UpdateContract(ctx context.Context, req *pb.UpdateContractRequest) (*pb.Contract, error) {
    // 1. バリデーション
    if req.ContractId == "" {
        return nil, status.Error(codes.InvalidArgument, "contract_id is required")
    }

    // 2. サービス層呼び出し
    contract, err := s.service.UpdateContract(ctx, req)
    if err != nil {
        s.logger.Error("Failed to update contract", zap.Error(err))

        // エラーの種類に応じたgRPCステータスコード返却
        if errors.Is(err, repository.ErrNotFound) {
            return nil, status.Error(codes.NotFound, "Contract not found")
        }
        if errors.Is(err, service.ErrApprovalRequired) {
            return nil, status.Error(codes.FailedPrecondition, err.Error())
        }
        return nil, status.Error(codes.Internal, "Internal server error")
    }

    // 3. レスポンス返却
    return contract, nil
}
```

---

### 2. Protocol Buffers メッセージ変換

```go
// internal/model/contract.go

// ドメインモデル → Protocol Buffers
func (c *Contract) ToPB() *pb.Contract {
    return &pb.Contract{
        ContractId:     c.ContractID.String(),
        ContractNumber: c.ContractNumber,
        MerchantId:     c.MerchantID.String(),
        ServiceId:      c.ServiceID.String(),
        Status:         c.Status,
        MonthlyFee:     c.MonthlyFee,
        InitialFee:     c.InitialFee,
        CreatedAt:      timestamppb.New(c.CreatedAt),
        UpdatedAt:      timestamppb.New(c.UpdatedAt),
    }
}

// Protocol Buffers → ドメインモデル
func ContractFromPB(pb *pb.Contract) (*Contract, error) {
    contractID, err := uuid.Parse(pb.ContractId)
    if err != nil {
        return nil, err
    }

    return &Contract{
        ContractID:     contractID,
        ContractNumber: pb.ContractNumber,
        Status:         pb.Status,
        MonthlyFee:     pb.MonthlyFee,
        InitialFee:     pb.InitialFee,
        // ...
    }, nil
}
```

---

### 3. バリデーション

#### validator/v10 を使用

```go
import "github.com/go-playground/validator/v10"

type CreateContractParams struct {
    MerchantID  uuid.UUID `validate:"required"`
    ServiceID   uuid.UUID `validate:"required"`
    StartDate   time.Time `validate:"required"`
    MonthlyFee  float64   `validate:"gte=0"`
    InitialFee  float64   `validate:"gte=0"`
}

func (s *ContractService) CreateContract(ctx context.Context, params *CreateContractParams) error {
    validate := validator.New()
    if err := validate.Struct(params); err != nil {
        return status.Error(codes.InvalidArgument, err.Error())
    }

    // 処理続行
}
```

---

## ビジネスロジック実装

### 1. 契約更新ロジック（金額変更チェック）

```go
// internal/service/contract_service.go
func (s *ContractService) UpdateContract(ctx context.Context, req *pb.UpdateContractRequest) (*pb.Contract, error) {
    // 現在の契約取得
    current, err := s.contractRepo.GetByID(ctx, uuid.MustParse(req.ContractId))
    if err != nil {
        return nil, err
    }

    // 金額変更チェック
    amountChanged := false
    if req.MonthlyFee != nil && *req.MonthlyFee != current.MonthlyFee {
        amountChanged = true
    }
    if req.InitialFee != nil && *req.InitialFee != current.InitialFee {
        amountChanged = true
    }

    if amountChanged {
        // 承認ワークフロー作成
        workflowID, err := s.createApprovalWorkflow(ctx, current, req)
        if err != nil {
            return nil, err
        }

        // 変更内容を記録
        s.recordChanges(ctx, current, req)

        return nil, status.Errorf(codes.FailedPrecondition,
            "Approval required for amount change (workflow_id: %s)", workflowID)
    }

    // 金額変更なし: 即座に更新
    updated, err := s.contractRepo.Update(ctx, req)
    if err != nil {
        return nil, err
    }

    // 変更履歴記録
    s.recordChanges(ctx, current, updated)

    return updated.ToPB(), nil
}
```

---

### 2. 変更履歴記録

```go
func (s *ContractService) recordChanges(ctx context.Context, old, new *model.Contract, userID uuid.UUID) error {
    changes := []model.ContractChange{}

    // ステータス変更
    if old.Status != new.Status {
        changes = append(changes, model.ContractChange{
            ContractID: old.ContractID,
            ChangeType: "UPDATE",
            FieldName:  "status",
            OldValue:   old.Status,
            NewValue:   new.Status,
            ChangedBy:  userID,
            ChangedAt:  time.Now(),
        })
    }

    // 月額料金変更
    if old.MonthlyFee != new.MonthlyFee {
        changes = append(changes, model.ContractChange{
            ContractID: old.ContractID,
            ChangeType: "UPDATE",
            FieldName:  "monthly_fee",
            OldValue:   fmt.Sprintf("%.2f", old.MonthlyFee),
            NewValue:   fmt.Sprintf("%.2f", new.MonthlyFee),
            ChangedBy:  userID,
            ChangedAt:  time.Now(),
        })
    }

    // 一括記録
    for _, change := range changes {
        if err := s.changeRepo.Create(ctx, &change); err != nil {
            s.logger.Error("Failed to record change", zap.Error(err))
        }
    }

    return nil
}
```

---

## データベースマイグレーション

### Flyway を使用

Backendサービスでは **Flyway** をマイグレーションツールとして使用します。

#### マイグレーションファイル配置

```
services/backend/db/migrations/
├── V1__create_merchants.sql
├── V2__create_services.sql
├── V3__create_contracts.sql
├── V4__create_contract_changes.sql
├── V5__create_approval_workflows.sql
└── V6__seed_services.sql
```

#### 命名規則

```
V{バージョン番号}__{説明}.sql
```

- **バージョン番号**: 1, 2, 3... （連番、先頭の0不要）
- **説明**: スネークケース（例: `create_merchants`, `add_index_to_contracts`）

#### マイグレーションファイル作成例

**V1__create_merchants.sql:**
```sql
CREATE TABLE merchants (
    merchant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merchants_code ON merchants(merchant_code);
CREATE INDEX idx_merchants_name ON merchants(name);
```

#### Flyway設定ファイル

**flyway.conf:**
```properties
flyway.url=jdbc:postgresql://localhost:5432/backend_db
flyway.user=backend_user
flyway.password=backend_password
flyway.locations=filesystem:./db/migrations
flyway.baselineOnMigrate=true
```

#### マイグレーション実行

**Docker Composeでの実行（推奨）:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: backend_db
      POSTGRES_USER: backend_user
      POSTGRES_PASSWORD: backend_password
    ports:
      - "5433:5432"

  backend-flyway:
    image: flyway/flyway:10
    command: migrate
    volumes:
      - ./db/migrations:/flyway/sql
    environment:
      FLYWAY_URL: jdbc:postgresql://backend-db:5432/backend_db
      FLYWAY_USER: backend_user
      FLYWAY_PASSWORD: backend_password
      FLYWAY_BASELINE_ON_MIGRATE: "true"
    depends_on:
      - backend-db
```

**実行:**
```bash
# マイグレーション実行
docker-compose up backend-flyway

# または直接実行
flyway -configFiles=flyway.conf migrate
```

#### Flywayコマンド

```bash
# マイグレーション実行
flyway migrate

# マイグレーション状態確認
flyway info

# マイグレーション検証
flyway validate

# クリーン（開発環境のみ）
flyway clean
```

#### 注意事項

- **本番環境では `flyway clean` を実行しない**（全データ削除）
- マイグレーションファイルは一度適用したら変更しない
- 新しい変更は新しいバージョンのファイルで追加する
- ロールバック用のUndoファイルは基本的に使用しない（Forward Onlyアプローチ）

---

## sqlc 使用方法

### クエリ定義

`db/queries/contract.sql`:
```sql
-- name: GetContract :one
SELECT * FROM contracts WHERE contract_id = $1 LIMIT 1;

-- name: ListContracts :many
SELECT * FROM contracts ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateContract :exec
INSERT INTO contracts (contract_number, merchant_id, service_id, status, start_date, monthly_fee, initial_fee)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: UpdateContract :exec
UPDATE contracts SET status = $1, monthly_fee = $2, initial_fee = $3, updated_at = NOW()
WHERE contract_id = $4;

-- name: DeleteContract :exec
DELETE FROM contracts WHERE contract_id = $1;
```

### sqlc 実行
```bash
sqlc generate
```

生成されたコードの使用:
```go
import "github.com/your-org/agent-teams-sample/services/backend/db/sqlc"

q := sqlc.New(db)

// 契約取得
contract, err := q.GetContract(ctx, contractID)

// 契約作成
err = q.CreateContract(ctx, sqlc.CreateContractParams{
    ContractNumber: "C-2025-00001",
    MerchantID:     merchantID,
    ServiceID:      serviceID,
    Status:         "DRAFT",
    StartDate:      time.Now(),
    MonthlyFee:     10000.00,
    InitialFee:     50000.00,
})
```

---

## テスト規約

### 1. ユニットテスト

#### テストファイル配置
- `tests/unit/{package}/` に配置
- ファイル名: `{対象ファイル名}_test.go`

#### テスト関数命名
```go
func TestContractService_UpdateContract(t *testing.T) {
    // テーブル駆動テスト
    tests := []struct {
        name    string
        setup   func(*gomock.Controller) *ContractService
        input   *pb.UpdateContractRequest
        want    *pb.Contract
        wantErr error
    }{
        {
            name: "正常系: 金額変更なし",
            setup: func(ctrl *gomock.Controller) *ContractService {
                mockRepo := mocks.NewMockContractRepository(ctrl)
                mockRepo.EXPECT().GetByID(gomock.Any(), gomock.Any()).Return(&model.Contract{
                    MonthlyFee: 5000.00,
                }, nil)
                return &ContractService{contractRepo: mockRepo}
            },
            input: &pb.UpdateContractRequest{
                ContractId: "xxx",
                Status:     strPtr("ACTIVE"),
            },
            want:    &pb.Contract{Status: "ACTIVE"},
            wantErr: nil,
        },
        {
            name: "異常系: 金額変更あり（承認必須）",
            // ...
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            ctrl := gomock.NewController(t)
            defer ctrl.Finish()

            svc := tt.setup(ctrl)
            got, err := svc.UpdateContract(context.Background(), tt.input)

            if tt.wantErr != nil {
                assert.Error(t, err)
                return
            }
            assert.NoError(t, err)
            assert.Equal(t, tt.want.Status, got.Status)
        })
    }
}
```

---

### 2. 統合テスト

#### testcontainers + Flyway を使用してPostgreSQLコンテナを起動

```go
import (
    "context"
    "testing"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestIntegration_ContractFlow(t *testing.T) {
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

    // Flywayマイグレーション実行
    connStr, _ := pgContainer.ConnectionString(ctx, "sslmode=disable")
    runFlywayMigrations(connStr)

    // テスト実行
    t.Run("契約登録・更新・承認フロー", func(t *testing.T) {
        // ...
    })
}

func runFlywayMigrations(connStr string) error {
    // Flywayマイグレーション実行ロジック
    // flyway migrate -url=connStr -locations=filesystem:db/migrations
    return nil
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
logger.Info("Contract created",
    zap.String("contract_id", contractID.String()),
    zap.String("merchant_code", merchantCode),
)

logger.Error("Failed to update contract",
    zap.Error(err),
    zap.String("contract_id", contractID.String()),
)
```

---

## Protocol Buffers生成

### protoc実行

```bash
# scripts/generate.sh
#!/bin/bash

# protoc生成（contracts/proto から）
protoc --go_out=pb --go-grpc_out=pb \
  --go_opt=paths=source_relative \
  --go-grpc_opt=paths=source_relative \
  ../../contracts/proto/merchant.proto \
  ../../contracts/proto/contract.proto \
  ../../contracts/proto/service.proto \
  ../../contracts/proto/approval.proto
```

実行:
```bash
./scripts/generate.sh
```

生成されたコードは `pb/` に配置されます。

---

## Git ブランチ戦略

### ブランチモデル: GitHub Flow

**main ブランチ**: 常にデプロイ可能な状態を維持

### ブランチ命名規則

**形式:**
```
<type>/<issue-number>-<short-description>
```

**Type:**
- `feature/` - 新機能
- `fix/` - バグ修正
- `refactor/` - リファクタリング
- `chore/` - ビルド・設定変更

**例:**
- `feature/123-merchant-grpc`
- `fix/456-approval-bug`
- `refactor/789-repository-layer`
- `chore/234-update-deps`

### ワークフロー

**1. mainから新ブランチ作成**
```bash
git checkout main
git pull origin main
git checkout -b feature/123-merchant-grpc
```

**2. 開発・コミット**
```bash
git add .
git commit -m "feat(merchant): 加盟店管理gRPCサービスを実装"
```

**3. Pull Request作成**
- レビュー依頼
- CI/CD自動実行（lint, test, build）

**4. レビュー承認後マージ**
- **Squash Merge推奨** (コミット履歴を整理)
- マージ後はブランチ削除

### マージ方針

| ケース | マージ方法 | 理由 |
|--------|-----------|------|
| 通常のPR | Squash Merge | 履歴をクリーンに保つ |
| Revert | Revert Merge | 履歴を明示的に残す |
| 緊急修正 | 直接main (禁止) | 必ずPRを経由 |

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
- `merchant`: 加盟店機能
- `contract`: 契約機能
- `approval`: 承認ワークフロー
- `db`: データベース

### 例

```
feat(contract): 金額変更時の承認フロー実装

- 金額変更検出ロジック追加
- approval_workflowsテーブルへのレコード作成
- FailedPreconditionエラー返却

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 環境構築手順

### 1. 依存関係インストール
```bash
cd services/backend
go mod download
```

### 2. PostgreSQL起動
```bash
docker-compose up -d backend-db
```

### 3. Flywayマイグレーション実行
```bash
# Docker Composeで実行（推奨）
docker-compose up backend-flyway

# または直接実行
flyway -configFiles=flyway.conf migrate
```

### 4. sqlc生成
```bash
sqlc generate
```

### 5. protoc生成
```bash
./scripts/generate.sh
```

### 6. サーバー起動
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
      "name": "Launch Backend gRPC Server",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/services/backend/cmd/server",
      "env": {
        "GRPC_PORT": "50051",
        "DB_HOST": "localhost",
        "DB_PORT": "5433",
        "DB_USER": "backend_user",
        "DB_PASSWORD": "backend_password",
        "DB_NAME": "backend_db"
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

### 2. ページネーションの実装

```go
type PaginationParams struct {
    Page  int32
    Limit int32
}

func (p *PaginationParams) Validate() {
    if p.Page < 1 {
        p.Page = 1
    }
    if p.Limit < 1 || p.Limit > 100 {
        p.Limit = 20
    }
}

func (p *PaginationParams) Offset() int32 {
    return (p.Page - 1) * p.Limit
}
```

### 3. トランザクション管理

```go
func (s *ContractService) CreateContractWithApproval(ctx context.Context, req *pb.CreateContractRequest) error {
    // トランザクション開始
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // 契約作成
    contractID, err := s.contractRepo.CreateTx(ctx, tx, req)
    if err != nil {
        return err
    }

    // 変更履歴記録
    err = s.changeRepo.CreateTx(ctx, tx, &model.ContractChange{
        ContractID: contractID,
        ChangeType: "CREATE",
        ChangedBy:  req.UserId,
    })
    if err != nil {
        return err
    }

    // コミット
    return tx.Commit()
}
```

---

## 参照ドキュメント

### ルートドキュメント
- [CLAUDE.md](../../CLAUDE.md)
- [docs/glossary.md](../../docs/glossary.md)
- [docs/security-guidelines.md](../../docs/security-guidelines.md)
- [docs/jsox-compliance.md](../../docs/jsox-compliance.md)

### Backend固有ドキュメント
- [CLAUDE.md](../CLAUDE.md)
- [functional-design.md](functional-design.md)
- [repository-structure.md](repository-structure.md)

---

**最終更新日:** 2026-04-07
**作成者:** Claude Code
