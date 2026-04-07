# Backend Service - リポジトリ構造

## 概要

このドキュメントは **Backend サービス** のディレクトリ構造とファイル配置ルールを定義します。

---

## ディレクトリ構造

```
services/backend/
├── CLAUDE.md                           # Backend開発ルール
├── docs/                               # 設計ドキュメント
│   ├── functional-design.md            # 機能設計書
│   ├── repository-structure.md         # このファイル
│   └── development-guidelines.md       # 開発ガイドライン
│
├── cmd/                                # アプリケーションエントリーポイント
│   └── server/
│       └── main.go                     # gRPCサーバー起動スクリプト
│
├── internal/                           # 非公開パッケージ
│   ├── grpc/                           # gRPCサーバー実装
│   │   ├── merchant_server.go          # 加盟店gRPCサーバー
│   │   ├── contract_server.go          # 契約gRPCサーバー
│   │   ├── service_server.go           # サービス管理gRPCサーバー
│   │   ├── approval_server.go          # 承認ワークフローgRPCサーバー
│   │   └── server.go                   # gRPCサーバー共通構造体
│   │
│   ├── service/                        # ビジネスロジック層
│   │   ├── merchant_service.go         # 加盟店ビジネスロジック
│   │   ├── contract_service.go         # 契約ビジネスロジック
│   │   ├── service_management.go       # サービス管理ビジネスロジック
│   │   ├── approval_service.go         # 承認ワークフローロジック
│   │   ├── change_tracker.go           # 変更履歴記録ロジック
│   │   └── service.go                  # サービス共通構造体
│   │
│   ├── repository/                     # データアクセス層
│   │   ├── merchant_repository.go      # merchantsテーブルアクセス
│   │   ├── contract_repository.go      # contractsテーブルアクセス
│   │   ├── service_repository.go       # servicesテーブルアクセス
│   │   ├── contract_change_repository.go # contract_changesテーブルアクセス
│   │   ├── approval_repository.go      # approval_workflowsテーブルアクセス
│   │   └── repository.go               # リポジトリ共通構造体
│   │
│   ├── model/                          # ドメインモデル
│   │   ├── merchant.go                 # Merchantモデル
│   │   ├── contract.go                 # Contractモデル
│   │   ├── service.go                  # Serviceモデル
│   │   ├── contract_change.go          # ContractChangeモデル
│   │   └── approval_workflow.go        # ApprovalWorkflowモデル
│   │
│   └── config/                         # 設定管理
│       ├── config.go                   # 設定構造体
│       └── env.go                      # 環境変数読み込み
│
├── db/                                 # データベース関連
│   ├── migrations/                     # Flywayマイグレーションファイル
│   │   ├── V1__create_merchants.sql
│   │   ├── V2__create_services.sql
│   │   ├── V3__create_contracts.sql
│   │   ├── V4__create_contract_changes.sql
│   │   ├── V5__create_approval_workflows.sql
│   │   └── V6__seed_services.sql       # サービス初期データ
│   │
│   ├── queries/                        # sqlcクエリ定義（*.sql）
│   │   ├── merchant.sql                # merchantsテーブルクエリ
│   │   ├── contract.sql                # contractsテーブルクエリ
│   │   ├── service.sql                 # servicesテーブルクエリ
│   │   ├── contract_change.sql         # contract_changesテーブルクエリ
│   │   └── approval_workflow.sql       # approval_workflowsテーブルクエリ
│   │
│   └── sqlc/                           # sqlc生成コード（自動生成、編集禁止）
│       ├── db.go
│       ├── models.go
│       ├── merchant.sql.go
│       ├── contract.sql.go
│       ├── service.sql.go
│       ├── contract_change.sql.go
│       └── approval_workflow.sql.go
│
├── proto/                              # Protocol Buffers定義（contracts/からコピー）
│   ├── merchant.proto
│   ├── contract.proto
│   ├── service.proto
│   └── approval.proto
│
├── pb/                                 # Protocol Buffers生成コード（自動生成）
│   ├── merchant.pb.go
│   ├── merchant_grpc.pb.go
│   ├── contract.pb.go
│   ├── contract_grpc.pb.go
│   ├── service.pb.go
│   ├── service_grpc.pb.go
│   ├── approval.pb.go
│   └── approval_grpc.pb.go
│
├── tests/                              # テストコード
│   ├── unit/                           # ユニットテスト
│   │   ├── grpc/
│   │   │   ├── merchant_server_test.go
│   │   │   └── contract_server_test.go
│   │   ├── service/
│   │   │   ├── contract_service_test.go
│   │   │   └── approval_service_test.go
│   │   └── repository/
│   │       ├── merchant_repository_test.go
│   │       └── contract_repository_test.go
│   │
│   ├── integration/                    # 統合テスト
│   │   ├── contract_flow_test.go       # 契約フローテスト
│   │   ├── approval_flow_test.go       # 承認フローテスト
│   │   └── change_tracking_test.go     # 変更履歴記録テスト
│   │
│   └── testutil/                       # テストユーティリティ
│       ├── mock.go                     # モック生成ヘルパー
│       ├── fixtures.go                 # テストデータフィクスチャ
│       └── container.go                # testcontainers設定
│
├── scripts/                            # 運用スクリプト
│   ├── migrate.sh                      # Flywayマイグレーション実行スクリプト
│   └── generate.sh                     # sqlc/protoc 生成スクリプト
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
gRPCサーバーのエントリーポイント。

**役割:**
- gRPCサーバー起動
- 設定読み込み
- DB接続
- gRPCサービス登録

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

    // 4. gRPCサーバー作成
    grpcServer := grpc.NewServer()

    // 5. サービス登録
    pb.RegisterMerchantServiceServer(grpcServer, grpc.NewMerchantServer(db))
    pb.RegisterContractServiceServer(grpcServer, grpc.NewContractServer(db))
    pb.RegisterServiceManagementServiceServer(grpcServer, grpc.NewServiceServer(db))
    pb.RegisterApprovalServiceServer(grpcServer, grpc.NewApprovalServer(db))

    // 6. リスナー作成
    lis, _ := net.Listen("tcp", ":50051")

    // 7. サーバー起動
    logger.Info("gRPC server listening on :50051")
    grpcServer.Serve(lis)
}
```

---

### `internal/grpc/`
gRPCサーバーの実装層。

**役割:**
- gRPCリクエストの受信
- リクエストのバリデーション
- サービス層の呼び出し
- gRPCレスポンスの構築
- エラーハンドリング

**命名規則:**
- ファイル名: `{resource}_server.go` (例: `merchant_server.go`)
- 構造体名: `{Resource}Server` (例: `MerchantServer`)
- メソッド名: Protocol Buffersで定義されたメソッド名（例: `ListMerchants`, `CreateMerchant`）

**実装例:**
```go
// internal/grpc/merchant_server.go
type MerchantServer struct {
    pb.UnimplementedMerchantServiceServer
    service *service.MerchantService
    logger  *zap.Logger
}

func (s *MerchantServer) CreateMerchant(ctx context.Context, req *pb.CreateMerchantRequest) (*pb.Merchant, error) {
    // 1. バリデーション
    if req.MerchantCode == "" {
        return nil, status.Error(codes.InvalidArgument, "merchant_code is required")
    }

    // 2. サービス層呼び出し
    merchant, err := s.service.CreateMerchant(ctx, req)
    if err != nil {
        s.logger.Error("Failed to create merchant", zap.Error(err))
        return nil, status.Error(codes.Internal, "Failed to create merchant")
    }

    // 3. レスポンス返却
    return merchant, nil
}
```

---

### `internal/service/`
ビジネスロジック層。

**役割:**
- ビジネスルールの実装
- 複数リポジトリの調整
- トランザクション管理
- 変更履歴記録
- 承認フロー制御

**命名規則:**
- ファイル名: `{resource}_service.go` (例: `contract_service.go`)
- 構造体名: `{Resource}Service` (例: `ContractService`)

**実装例:**
```go
// internal/service/contract_service.go
type ContractService struct {
    contractRepo *repository.ContractRepository
    changeRepo   *repository.ContractChangeRepository
    workflowRepo *repository.ApprovalRepository
    logger       *zap.Logger
}

func (s *ContractService) UpdateContract(ctx context.Context, req *pb.UpdateContractRequest) (*pb.Contract, error) {
    // 現在の契約取得
    current, err := s.contractRepo.GetByID(ctx, req.ContractId)
    if err != nil {
        return nil, err
    }

    // 金額変更チェック
    if req.MonthlyFee != current.MonthlyFee || req.InitialFee != current.InitialFee {
        // 承認フロー作成
        return s.createApprovalWorkflow(ctx, current, req)
    }

    // 金額変更なし: 即座に更新
    updated, err := s.contractRepo.Update(ctx, req)
    if err != nil {
        return nil, err
    }

    // 変更履歴記録
    s.recordChange(ctx, current, updated, req.UserId)

    return updated, nil
}
```

---

### `internal/repository/`
データアクセス層（sqlc生成コードを使用）。

**役割:**
- sqlc生成コードのラッパー
- トランザクション管理
- エラーハンドリング

**命名規則:**
- ファイル名: `{table}_repository.go` (例: `merchant_repository.go`)
- 構造体名: `{Table}Repository` (例: `MerchantRepository`)
- メソッド名: `List`, `GetByID`, `Create`, `Update`, `Delete` 等

**実装例:**
```go
// internal/repository/merchant_repository.go
type MerchantRepository struct {
    db *sqlx.DB
    q  *db.Queries // sqlc生成コード
}

func (r *MerchantRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Merchant, error) {
    merchant, err := r.q.GetMerchant(ctx, id)
    if err != nil {
        return nil, err
    }
    return toModelMerchant(merchant), nil
}

func (r *MerchantRepository) Create(ctx context.Context, merchant *model.Merchant) error {
    return r.q.CreateMerchant(ctx, db.CreateMerchantParams{
        MerchantCode:  merchant.MerchantCode,
        Name:          merchant.Name,
        Address:       merchant.Address,
        ContactPerson: merchant.ContactPerson,
    })
}
```

---

### `internal/model/`
ドメインモデル定義。

**役割:**
- ビジネスロジックで使用する構造体定義
- Protocol Buffers型との変換

**実装例:**
```go
// internal/model/contract.go
type Contract struct {
    ContractID     uuid.UUID
    ContractNumber string
    MerchantID     uuid.UUID
    ServiceID      uuid.UUID
    Status         string
    ContractDate   *time.Time
    StartDate      time.Time
    EndDate        *time.Time
    MonthlyFee     float64
    InitialFee     float64
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

// Protocol Buffers への変換
func (c *Contract) ToPB() *pb.Contract {
    return &pb.Contract{
        ContractId:     c.ContractID.String(),
        ContractNumber: c.ContractNumber,
        MerchantId:     c.MerchantID.String(),
        ServiceId:      c.ServiceID.String(),
        Status:         c.Status,
        MonthlyFee:     c.MonthlyFee,
        InitialFee:     c.InitialFee,
        // ...
    }
}
```

---

### `db/migrations/`
Flywayマイグレーションファイル。

**命名規則:**
```
V{バージョン番号}__{説明}.sql
```

- **バージョン番号**: 1, 2, 3... （連番、先頭の0不要）
- **説明**: スネークケース（例: `create_merchants`, `add_index_to_contracts`）

**例:**
- `V1__create_merchants.sql`
- `V2__create_services.sql`
- `V3__create_contracts.sql`

**マイグレーション実行:**
```bash
# Docker Composeで実行（推奨）
docker-compose up backend-flyway

# または直接実行
flyway -configFiles=flyway.conf migrate
```

**注意事項:**
- 一度適用したマイグレーションファイルは変更しない
- 新しい変更は新しいバージョンのファイルで追加する
- ロールバック用のdownファイルは使用しない（Forward Onlyアプローチ）

---

### `db/queries/`
sqlcクエリ定義ファイル。

**命名規則:**
- ファイル名: `{table}.sql` (例: `merchant.sql`)

**クエリ記述例:**
```sql
-- name: GetMerchant :one
SELECT * FROM merchants WHERE merchant_id = $1 LIMIT 1;

-- name: ListMerchants :many
SELECT * FROM merchants ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateMerchant :exec
INSERT INTO merchants (merchant_code, name, address, contact_person, phone, email)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: UpdateMerchant :exec
UPDATE merchants SET name = $1, address = $2, updated_at = NOW() WHERE merchant_id = $3;

-- name: DeleteMerchant :exec
DELETE FROM merchants WHERE merchant_id = $1;
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

### `proto/`
Protocol Buffers定義ファイル（`contracts/proto/` からコピー）。

**ファイル例:**
- `merchant.proto`
- `contract.proto`
- `service.proto`
- `approval.proto`

**protoc実行:**
```bash
./scripts/generate.sh
```

生成されたコードは `pb/` に配置されます。

---

### `pb/`
Protocol Buffers自動生成コード（**編集禁止**）。

**含まれるファイル:**
- `merchant.pb.go` - メッセージ定義
- `merchant_grpc.pb.go` - gRPCサービス定義
- `contract.pb.go`
- `contract_grpc.pb.go`
- 等

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
- `merchant_server_test.go`
- `contract_service_test.go`

#### `tests/integration/`
統合テスト（実際のDB使用、testcontainers + Flyway）。

**実装例:**
```go
// tests/integration/contract_flow_test.go
func TestContractFlow(t *testing.T) {
    ctx := context.Background()

    // PostgreSQLコンテナ起動
    pgContainer, err := postgres.RunContainer(ctx, ...)
    require.NoError(t, err)
    defer pgContainer.Terminate(ctx)

    // Flywayマイグレーション実行
    runFlywayMigrations(pgContainer.ConnectionString(ctx))

    // テスト実行
    t.Run("契約登録", func(t *testing.T) {
        // ...
    })
}
```

---

## ファイル命名規則

### Go ソースコード
- **パッケージ名:** 小文字、短く、複数形は避ける（`grpc`, `service`, `repository`）
- **ファイル名:** スネークケース（`merchant_server.go`, `contract_repository.go`）
- **テストファイル:** `{対象ファイル名}_test.go` （`merchant_server_test.go`）

### SQL ファイル
- **Flywayマイグレーション:** `V{バージョン番号}__{説明}.sql` （例: `V1__create_merchants.sql`）
- **sqlcクエリ:** `{table}.sql` （`merchant.sql`, `contract.sql`）

### Protocol Buffers
- **定義ファイル:** `{resource}.proto` （`merchant.proto`, `contract.proto`）

### 設定ファイル
- `.env.example` - 環境変数サンプル（リポジトリにコミット）
- `.env` - 実際の環境変数（`.gitignore` で除外）

---

## 環境変数設定

`.env.example`:
```env
# Server
GRPC_PORT=50051

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=backend_user
DB_PASSWORD=backend_password
DB_NAME=backend_db

# Logging
LOG_LEVEL=info
```

---

## スクリプト

### `scripts/migrate.sh`
Flywayマイグレーション実行スクリプト。

```bash
#!/bin/bash
# Flywayマイグレーション実行（Docker Compose推奨）
docker-compose up backend-flyway

# または直接実行
# flyway -configFiles=flyway.conf migrate
```

### `scripts/generate.sh`
sqlc/protoc 生成スクリプト。

```bash
#!/bin/bash
# sqlc生成
sqlc generate

# protoc生成（contracts/proto から）
protoc --go_out=pb --go-grpc_out=pb \
  --go_opt=paths=source_relative \
  --go-grpc_opt=paths=source_relative \
  ../../contracts/proto/*.proto
```

---

## 依存関係管理

### `go.mod`
主要な依存関係:

```go
module github.com/your-org/agent-teams-sample/services/backend

go 1.21

require (
    google.golang.org/grpc v1.60.1
    google.golang.org/protobuf v1.32.0
    github.com/jmoiron/sqlx v1.3.5
    github.com/lib/pq v1.10.9
    github.com/go-playground/validator/v10 v10.16.0
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

- [CLAUDE.md](../CLAUDE.md) - Backend開発ルール
- [functional-design.md](functional-design.md) - 機能設計書
- [development-guidelines.md](development-guidelines.md) - 開発ガイドライン

---

**最終更新日:** 2026-04-07
**作成者:** Claude Code
