# CLAUDE.md (Backend Service)

## 概要

このドキュメントは **Backend サービス** の開発ルールを定義します。

**Backendサービスの役割:**
- ビジネスロジックの実装
- データ管理（加盟店・契約・サービス）
- 承認ワークフローの管理
- gRPCサーバーとしてBFFにAPIを提供
- データ変更監査の記録

**重要:** このドキュメントはルートの `CLAUDE.md` を継承します。競合する場合はルートのルールを優先してください。

---

## 技術スタック

### コア技術
- **言語:** Go 1.21+
- **gRPCフレームワーク:** google.golang.org/grpc
- **ORM:** sqlc（型安全なSQLクエリ生成）
- **データベース:** PostgreSQL 15+

### 主要ライブラリ
- **Protocol Buffers:** google.golang.org/protobuf
- **バリデーション:** go-playground/validator/v10
- **環境変数管理:** godotenv
- **ロギング:** zap（構造化ログ）
- **UUID生成:** google/uuid
- **マイグレーション:** Flyway

### テスト
- **ユニットテスト:** Go標準testing + testify/assert
- **モック生成:** gomock
- **統合テスト:** testcontainers-go（PostgreSQL）

---

## プロジェクト構造

```
services/backend/
├── CLAUDE.md                    # このファイル
├── docs/                        # Backend設計ドキュメント
│   ├── functional-design.md
│   ├── repository-structure.md  # ← 詳細はこちらを参照
│   └── development-guidelines.md
├── cmd/
│   └── server/
│       └── main.go              # エントリーポイント
├── internal/
│   ├── grpc/                    # gRPCサーバー実装
│   ├── service/                 # ビジネスロジック
│   ├── repository/              # データアクセス層（sqlc生成コード使用）
│   └── model/                   # ドメインモデル
├── db/
│   ├── migrations/              # Flywayマイグレーションファイル
│   └── queries/                 # sqlcクエリ定義（*.sql）
└── proto/                       # Protocol Buffers定義（contracts/からコピー）
```

**詳細なディレクトリ構造は [docs/repository-structure.md](docs/repository-structure.md) を参照してください。**

---

## 開発原則

### 1. API契約ファースト
- `contracts/proto/` に定義されたProtocol Buffers仕様に厳密に従う
- gRPCメソッド、リクエスト/レスポンス型を契約通り実装
- API変更時は必ず `contracts/proto/` を先に更新

### 2. 型安全性の重視
- sqlcによる型安全なSQLクエリ生成を活用
- Protocol Buffersによる型安全なgRPC通信
- interface{} の使用を最小限に抑える

### 3. エラーハンドリング
- すべてのエラーを適切にハンドリング
- gRPCステータスコードを適切に使用
- 構造化ログにエラー詳細を記録

### 4. ドメイン駆動設計（DDD）
- 用語は `docs/glossary.md` に厳密に従う
- ビジネスロジックはserviceレイヤーに集約
- データアクセス層とビジネスロジック層を分離

### 5. J-SOX対応
- すべてのデータ変更を契約変更履歴に記録（contract_changesテーブル）
- 金額変更時は承認ワークフローを必須とする
- 変更履歴には以下を含める:
  - change_type（CREATE, UPDATE, DELETE）
  - field_name（変更されたフィールド）
  - old_value, new_value（変更前後の値）
  - changed_by（変更者のuser_id）
  - changed_at（変更日時）

### 6. パフォーマンス
- データベースクエリのN+1問題を回避
- 適切なインデックス設計
- ページネーション実装（デフォルト20件/ページ）
- トランザクション管理の適切な実装

---

## データベース設計

### Backend固有のテーブル（backend_db）

Backendサービスは独自のPostgreSQLデータベース（`backend_db`）を持ち、以下のテーブルを管理します。

#### 1. merchants（加盟店）
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
```

#### 2. services（サービス）
```sql
CREATE TABLE services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. contracts（契約）
```sql
CREATE TABLE contracts (
    contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(merchant_id),
    service_id UUID NOT NULL REFERENCES services(service_id),
    status VARCHAR(20) NOT NULL, -- 'DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED'
    contract_date DATE,
    start_date DATE NOT NULL,
    end_date DATE,
    monthly_fee DECIMAL(10, 2),
    initial_fee DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. contract_changes（契約変更履歴）
```sql
CREATE TABLE contract_changes (
    change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(contract_id),
    change_type VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by UUID NOT NULL,         -- BFFのuser_id
    changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. approval_workflows（承認ワークフロー）
```sql
CREATE TABLE approval_workflows (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(contract_id),
    change_id UUID REFERENCES contract_changes(change_id),
    requester_id UUID NOT NULL,       -- BFFのuser_id
    approver_id UUID,                 -- BFFのuser_id
    status VARCHAR(20) NOT NULL,      -- 'PENDING', 'APPROVED', 'REJECTED'
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT
);
```

**重要:** BFFサービスは独自の `bff_db` を持ち、ユーザー・ロール・権限・セッション・監査ログを管理します。BackendはBFFのデータベースに直接アクセスせず、必要な情報（user_id等）はgRPCリクエストで受け取ります。

---

## gRPC API設計

### サービス定義

Backendは以下のgRPCサービスを提供します。

#### 1. MerchantService（加盟店管理）
```protobuf
service MerchantService {
  rpc ListMerchants(ListMerchantsRequest) returns (ListMerchantsResponse);
  rpc GetMerchant(GetMerchantRequest) returns (Merchant);
  rpc CreateMerchant(CreateMerchantRequest) returns (Merchant);
  rpc UpdateMerchant(UpdateMerchantRequest) returns (Merchant);
  rpc DeleteMerchant(DeleteMerchantRequest) returns (google.protobuf.Empty);
}
```

#### 2. ContractService（契約管理）
```protobuf
service ContractService {
  rpc ListContracts(ListContractsRequest) returns (ListContractsResponse);
  rpc GetContract(GetContractRequest) returns (Contract);
  rpc CreateContract(CreateContractRequest) returns (Contract);
  rpc UpdateContract(UpdateContractRequest) returns (Contract);
  rpc DeleteContract(DeleteContractRequest) returns (google.protobuf.Empty);
}
```

#### 3. ServiceManagementService（サービス管理）
```protobuf
service ServiceManagementService {
  rpc ListServices(ListServicesRequest) returns (ListServicesResponse);
  rpc GetService(GetServiceRequest) returns (Service);
  rpc CreateService(CreateServiceRequest) returns (Service);
  rpc UpdateService(UpdateServiceRequest) returns (Service);
}
```

#### 4. ApprovalService（承認ワークフロー）
```protobuf
service ApprovalService {
  rpc ListPendingApprovals(ListPendingApprovalsRequest) returns (ListPendingApprovalsResponse);
  rpc ApproveContract(ApproveContractRequest) returns (ApprovalWorkflow);
  rpc RejectContract(RejectContractRequest) returns (ApprovalWorkflow);
}
```

---

## ビジネスロジック

### 1. 契約登録・更新フロー

#### 契約登録
1. BFF → Backend: `CreateContract` gRPC呼び出し（user_idを含む）
2. Backend: バリデーション（merchant_id, service_idの存在確認）
3. Backend: contractsテーブルにINSERT（status='DRAFT'）
4. Backend: contract_changesにCREATEレコード追加（changed_by=user_id）
5. Backend: レスポンス返却

#### 契約更新（金額変更なし）
1. BFF → Backend: `UpdateContract` gRPC呼び出し
2. Backend: 金額変更チェック（monthly_fee, initial_fee）
3. 金額変更なし: 即座にUPDATE実行
4. Backend: contract_changesにUPDATEレコード追加
5. Backend: レスポンス返却

#### 契約更新（金額変更あり）
1. BFF → Backend: `UpdateContract` gRPC呼び出し
2. Backend: 金額変更を検出
3. Backend: approval_workflowsにPENDINGレコード作成
4. Backend: contract_changesに変更内容を記録
5. Backend: **契約自体は更新せず**、承認待ち状態
6. 承認者が承認 → `ApproveContract` 呼び出し → 契約更新実行
7. 承認者が却下 → `RejectContract` 呼び出し → 契約更新なし

### 2. 承認フロー（職務分掌）

**原則:** 金額変更時は登録者（requester）と承認者（approver）を分離する。

```go
func (s *ContractService) UpdateContract(ctx context.Context, req *pb.UpdateContractRequest) (*pb.Contract, error) {
    // 現在の契約取得
    current, err := s.repo.GetContract(ctx, req.ContractId)
    if err != nil {
        return nil, status.Error(codes.NotFound, "Contract not found")
    }

    // 金額変更チェック
    if req.MonthlyFee != current.MonthlyFee || req.InitialFee != current.InitialFee {
        // 承認ワークフロー作成
        workflow := &model.ApprovalWorkflow{
            ContractID:   req.ContractId,
            RequesterID:  req.UserId, // BFFから渡されるuser_id
            Status:       "PENDING",
            RequestedAt:  time.Now(),
        }
        err = s.workflowRepo.Create(ctx, workflow)
        if err != nil {
            return nil, status.Error(codes.Internal, "Failed to create approval workflow")
        }

        // 変更内容を記録
        s.recordChange(ctx, req.ContractId, "monthly_fee", current.MonthlyFee, req.MonthlyFee, req.UserId)
        s.recordChange(ctx, req.ContractId, "initial_fee", current.InitialFee, req.InitialFee, req.UserId)

        return nil, status.Error(codes.FailedPrecondition, "Approval required for amount change")
    }

    // 金額変更なし: 即座に更新
    updated, err := s.repo.Update(ctx, req)
    if err != nil {
        return nil, status.Error(codes.Internal, "Failed to update contract")
    }

    // 変更履歴記録
    s.recordChange(ctx, req.ContractId, "status", current.Status, req.Status, req.UserId)

    return updated, nil
}
```

---

## データ変更監査

### contract_changes への記録

すべてのデータ変更を記録します。

```go
func (s *ContractService) recordChange(
    ctx context.Context,
    contractID uuid.UUID,
    fieldName string,
    oldValue, newValue interface{},
    changedBy uuid.UUID,
) error {
    change := &model.ContractChange{
        ContractID: contractID,
        ChangeType: "UPDATE",
        FieldName:  fieldName,
        OldValue:   fmt.Sprintf("%v", oldValue),
        NewValue:   fmt.Sprintf("%v", newValue),
        ChangedBy:  changedBy,
        ChangedAt:  time.Now(),
    }
    return s.changeRepo.Create(ctx, change)
}
```

### 保持期間
- **7年間**（J-SOX要件）
- 定期的にアーカイブ（圧縮・別ストレージ移動）

---

## エラーハンドリング

### gRPCステータスコード

| コード | 用途 |
|-------|------|
| OK | 成功 |
| InvalidArgument | リクエストパラメータ不正 |
| NotFound | リソース未存在 |
| AlreadyExists | 重複エラー（merchant_code等） |
| FailedPrecondition | 前提条件エラー（承認必須等） |
| Internal | サーバーエラー |

### エラー実装例

```go
import "google.golang.org/grpc/status"
import "google.golang.org/grpc/codes"

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

## 開発ワークフロー

### 1. 新規gRPCメソッド追加時の手順
1. `contracts/proto/` にメソッド定義追加
2. `protoc` 実行してGoコード生成
3. `internal/grpc/` にハンドラー実装
4. `internal/service/` にビジネスロジック実装
5. `db/queries/` にSQLクエリ追加（必要に応じて）
6. `sqlc generate` 実行
7. ユニットテスト作成
8. 統合テスト作成

### 2. マイグレーション作成
```bash
# 新規マイグレーションファイル作成（手動）
# V{version}__{description}.sql の形式で作成

# 例: V10__add_contract_notes.sql
vi db/migrations/V10__add_contract_notes.sql

# マイグレーション実行（Docker Compose推奨）
docker-compose up backend-flyway
```

### 3. sqlc実行
```bash
# db/queries/ のSQLからGoコード生成
sqlc generate
```

### 4. protoc実行
```bash
# contracts/proto/ からGoコード生成
./scripts/generate.sh
```

---

## テスト戦略

### ユニットテスト
- gRPCハンドラー、サービス、リポジトリのロジックをテスト
- モック（gomock）を使用してDBをモック化
- テストカバレッジ80%以上を目標

### 統合テスト
- testcontainersでPostgreSQLコンテナを起動
- 実際のDBを使用してリポジトリ層をテスト
- Flywayマイグレーション実行 → データ投入 → クエリ実行 → 検証

### E2Eテスト
- ルートの `e2e/` で実施
- Backend単体ではなく、Frontend/BFF/Backend統合テスト

---

## セキュリティ要件

詳細は `docs/security-guidelines.md` および `docs/jsox-compliance.md` を参照してください。

### 実装必須項目
- ✅ SQLインジェクション対策（sqlcプレースホルダー）
- ✅ 入力バリデーション（validator/v10）
- ✅ gRPC TLS通信（本番環境）
- ✅ データ変更監査（contract_changes）
- ✅ 承認ワークフロー（職務分掌）

---

## コーディング規約

詳細は [docs/development-guidelines.md](docs/development-guidelines.md) を参照してください。

### 主要規約
- **パッケージ名:** 小文字、短く、複数形は避ける（例: `grpc`, `service`）
- **ファイル名:** スネークケース（例: `merchant_service.go`）
- **関数名:** キャメルケース、Public関数は大文字開始（例: `CreateMerchant`）
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
- Approval Workflow（承認ワークフロー）
- Contract Change（契約変更履歴）
- Segregation of Duties（職務分掌）

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

### Backend固有ドキュメント
- [docs/functional-design.md](docs/functional-design.md) - Backend機能設計
- [docs/repository-structure.md](docs/repository-structure.md) - リポジトリ構造
- [docs/development-guidelines.md](docs/development-guidelines.md) - 開発ガイドライン

### API契約
- [contracts/proto/](../../contracts/proto/) - gRPC Protocol Buffers定義

---

## 注意事項

- ルートの `CLAUDE.md` と競合する場合は、ルートのルールを優先する
- API変更時は必ず `contracts/proto/` を先に更新
- 用語は `docs/glossary.md` に厳密に従う
- J-SOX要件（監査証跡・職務分掌）は妥協しない
- コード変更後は必ず `go fmt` と `go vet` を実行
- テストを書かずにコードをコミットしない

---

**最終更新日:** 2026-04-07
**作成者:** Claude Code
