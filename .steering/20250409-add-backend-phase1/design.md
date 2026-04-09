# Backend Service実装 (Phase 1) - 設計

## アーキテクチャ

### システム構成図

```mermaid
graph TB
    BFF[BFF: Go + Echo<br/>既存・今回変更なし]
    Backend[Backend: Go + gRPC<br/>★今回実装]
    Backend_DB[(Backend DB: PostgreSQL<br/>port 5433)]

    BFF -.->|gRPC<br/>port 50051<br/>Phase2で接続| Backend
    Backend -->|SQL| Backend_DB

    subgraph "今回実装"
        Backend
        Backend_DB
    end

    style BFF fill:#f0f0f0
```

---

## Protocol Buffers定義

### merchant.proto

```protobuf
syntax = "proto3";

package merchant;

option go_package = "github.com/ikechin/agent-teams-backend/internal/pb";

service MerchantService {
  rpc ListMerchants(ListMerchantsRequest) returns (ListMerchantsResponse);
  rpc GetMerchant(GetMerchantRequest) returns (MerchantResponse);
  rpc CreateMerchant(CreateMerchantRequest) returns (MerchantResponse);
}

message Merchant {
  string merchant_id = 1;
  string merchant_code = 2;
  string name = 3;
  string address = 4;
  string contact_person = 5;
  string phone = 6;
  string email = 7;
  bool is_active = 8;
  string created_at = 9;
  string updated_at = 10;
}

message ListMerchantsRequest {
  int32 page = 1;
  int32 limit = 2;
  string search = 3;
}

message ListMerchantsResponse {
  repeated Merchant merchants = 1;
  Pagination pagination = 2;
}

message Pagination {
  int32 current_page = 1;
  int32 total_pages = 2;
  int32 total_items = 3;
  int32 items_per_page = 4;
}

message GetMerchantRequest {
  string merchant_id = 1;
}

message CreateMerchantRequest {
  string name = 1;
  string address = 2;
  string contact_person = 3;
  string phone = 4;
  string email = 5;
  string created_by = 6; // user_id from BFF (for audit)
}

message MerchantResponse {
  Merchant merchant = 1;
}
```

### 配置
- 定義ファイル: `contracts/proto/merchant.proto`（親リポジトリに配置済み）
- 生成コード: `services/backend/internal/pb/`

### protoc生成手順

**前提: protocプラグインのインストール**
```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

**生成コマンド（services/backend/ 内で実行）:**
```bash
cd services/backend
protoc \
  --proto_path=../../contracts/proto \
  --go_out=./internal/pb --go_opt=paths=source_relative \
  --go-grpc_out=./internal/pb --go-grpc_opt=paths=source_relative \
  ../../contracts/proto/merchant.proto
```

または Makefile に定義:
```makefile
.PHONY: proto
proto:
	protoc \
		--proto_path=../../contracts/proto \
		--go_out=./internal/pb --go_opt=paths=source_relative \
		--go-grpc_out=./internal/pb --go-grpc_opt=paths=source_relative \
		../../contracts/proto/merchant.proto
```

---

## データベース設計

### Backend Database（backend_db, ポート5433）

#### merchants テーブル

```sql
CREATE TABLE merchants (
    merchant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merchants_merchant_code ON merchants(merchant_code);
CREATE INDEX idx_merchants_name ON merchants(name);
CREATE INDEX idx_merchants_is_active ON merchants(is_active);
```

#### contract_changes テーブル（監査用）

**注記:** `docs/jsox-compliance.md` では `contract_id` 列を持つ契約特化型の設計だが、
Phase 1では加盟店登録の監査にも使用するため `resource_type + resource_id` の汎用形式を採用。
将来のPhaseで契約管理を追加する際に、`contract_id` 列をNULLABLEで追加し、
契約関連の変更は `contract_id` でも検索可能にする予定。

```sql
CREATE TABLE contract_changes (
    change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_changes_resource ON contract_changes(resource_type, resource_id);
CREATE INDEX idx_contract_changes_changed_at ON contract_changes(changed_at);

-- 改ざん防止
CREATE RULE contract_changes_no_delete AS ON DELETE TO contract_changes DO INSTEAD NOTHING;
CREATE RULE contract_changes_no_update AS ON UPDATE TO contract_changes DO INSTEAD NOTHING;
```

#### 初期データ

```sql
-- BFFのモックデータと同じ2件
INSERT INTO merchants (merchant_id, merchant_code, name, address, contact_person, phone, email) VALUES
('00000000-0000-0000-0000-000000000001', 'M-00001', 'テスト加盟店1', '東京都渋谷区渋谷1-1-1', '山田太郎', '03-1234-5678', 'yamada@example.com'),
('00000000-0000-0000-0000-000000000002', 'M-00002', 'テスト加盟店2', '東京都新宿区新宿2-2-2', '佐藤花子', '03-2345-6789', 'sato@example.com');
```

---

## Backendサービス構造

### ディレクトリ構成

```
services/backend/
├── cmd/server/main.go           # エントリーポイント
├── internal/
│   ├── pb/                      # protoc生成コード
│   │   ├── merchant.pb.go
│   │   └── merchant_grpc.pb.go
│   ├── grpc/                    # gRPCサーバー実装
│   │   └── merchant_server.go
│   ├── service/                 # ビジネスロジック
│   │   └── merchant_service.go
│   ├── repository/              # データアクセス層
│   │   ├── merchant_repository.go
│   │   └── audit_repository.go
│   ├── model/                   # ドメインモデル
│   │   └── merchant.go
│   └── sqlc/                    # sqlc生成コード
│       ├── db.go
│       ├── models.go
│       └── merchant.sql.go
├── db/
│   ├── migrations/
│   │   ├── V1__create_merchants.sql
│   │   ├── V2__create_contract_changes.sql
│   │   └── V3__seed_merchants.sql
│   └── queries/
│       ├── merchant.sql
│       └── contract_change.sql
├── docker-compose.yml
├── Dockerfile
├── go.mod
├── go.sum
└── sqlc.yaml
```

---

## gRPCサーバー実装

### MerchantServer

```go
// internal/grpc/merchant_server.go
type MerchantServer struct {
    pb.UnimplementedMerchantServiceServer
    merchantService service.MerchantServiceInterface
}

func (s *MerchantServer) ListMerchants(ctx context.Context, req *pb.ListMerchantsRequest) (*pb.ListMerchantsResponse, error)
func (s *MerchantServer) GetMerchant(ctx context.Context, req *pb.GetMerchantRequest) (*pb.MerchantResponse, error)
func (s *MerchantServer) CreateMerchant(ctx context.Context, req *pb.CreateMerchantRequest) (*pb.MerchantResponse, error)
```

### ビジネスロジック

```go
// internal/service/merchant_service.go
type MerchantServiceInterface interface {
    ListMerchants(ctx context.Context, page, limit int32, search string) ([]model.Merchant, int32, error)
    GetMerchant(ctx context.Context, merchantID uuid.UUID) (*model.Merchant, error)
    CreateMerchant(ctx context.Context, input CreateMerchantInput) (*model.Merchant, error)
}
```

**加盟店コード自動採番:**
- 形式: `M-XXXXX`（5桁ゼロパディング）
- 採番: 既存の最大値 + 1
- 例: M-00001, M-00002, M-00003

---

## Docker Compose設定

```yaml
services:
  backend-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: backend_db
      POSTGRES_USER: backend_user
      POSTGRES_PASSWORD: backend_password
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U backend_user -d backend_db"]

  backend-flyway:
    image: flyway/flyway:10
    command: migrate
    volumes:
      - ./db/migrations:/flyway/sql
    environment:
      FLYWAY_URL: jdbc:postgresql://backend-db:5432/backend_db
      FLYWAY_USER: backend_user
      FLYWAY_PASSWORD: backend_password
    depends_on:
      backend-db:
        condition: service_healthy

  backend:
    build: .
    ports:
      - "50051:50051"
    environment:
      PORT: "50051"
      DATABASE_URL: postgres://backend_user:backend_password@backend-db:5432/backend_db?sslmode=disable
      LOG_LEVEL: debug
    depends_on:
      backend-db:
        condition: service_healthy
      backend-flyway:
        condition: service_completed_successfully
```

---

## gRPC Reflection Service

grpcurlでの動作確認のため、gRPC reflection serviceを有効化する。

```go
// cmd/server/main.go
import "google.golang.org/grpc/reflection"

// サーバー起動時に登録
reflection.Register(grpcServer)
```

これにより `grpcurl -plaintext localhost:50051 list` でサービス一覧を取得可能。

---

## エラーハンドリング

### gRPCステータスコード対応

| 状況 | gRPCステータス | 説明 |
|------|---------------|------|
| 成功 | OK | 正常レスポンス |
| 加盟店が見つからない | NOT_FOUND | merchant_idが存在しない |
| バリデーションエラー | INVALID_ARGUMENT | 必須項目未入力等 |
| 重複 | ALREADY_EXISTS | merchant_codeの重複 |
| 内部エラー | INTERNAL | DB接続エラー等 |

---

**作成日:** 2026-04-09
**作成者:** Claude Code
