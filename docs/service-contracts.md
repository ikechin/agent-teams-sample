# サービス間API契約管理

## 概要

本ドキュメントは、マイクロサービス間のAPI契約管理方針を定義します。

**API契約の目的:**
- サービス間のインターフェースを明確に定義
- Agent間の開発を独立して進められる
- 契約違反を早期発見
- ドキュメントの自動生成

---

## API契約の種類

### 1. Frontend ↔ BFF（REST API）

**契約形式:** OpenAPI 3.0

**配置場所:** `contracts/openapi/bff-api.yaml`

**担当Agent:** BFF Agent

---

### 2. BFF ↔ Backend（gRPC）

**契約形式:** Protocol Buffers（.proto）

**配置場所:** `contracts/proto/`

**担当Agent:** BFF Agent（定義）、Backend Agent（実装）

---

## OpenAPI契約管理（Frontend ↔ BFF）

### OpenAPI仕様の配置

```
contracts/
└── openapi/
    └── bff-api.yaml        # BFFが公開するREST API仕様
```

### OpenAPI仕様の構成

**基本構造:**
```yaml
openapi: 3.0.3
info:
  title: Contract Management System - BFF API
  version: 1.0.0
  description: BFF層が提供するREST API仕様

servers:
  - url: http://localhost:4000
    description: ローカル開発環境
  - url: https://api.example.com
    description: 本番環境

paths:
  /api/auth/login:
    post:
      summary: ユーザーログイン
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: ログイン成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '401':
          description: 認証失敗
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/contracts:
    get:
      summary: 契約一覧取得
      tags:
        - Contracts
      security:
        - cookieAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: merchant_id
          in: query
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 契約一覧
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

components:
  securitySchemes:
    cookieAuth:
      type: apiKey
      in: cookie
      name: session_id

  schemas:
    LoginRequest:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
          example: user@example.com
        password:
          type: string
          format: password
          minLength: 8
          example: SecureP@ss123

    LoginResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        user:
          $ref: '#/components/schemas/User'
        csrfToken:
          type: string
          example: a1b2c3d4e5f6...

    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        roles:
          type: array
          items:
            type: string
          example: ['contract-manager']

    Contract:
      type: object
      properties:
        id:
          type: string
          format: uuid
        contract_number:
          type: string
          example: CON-2026-001
        merchant:
          $ref: '#/components/schemas/Merchant'
        service:
          $ref: '#/components/schemas/Service'
        status:
          type: string
          enum: [DRAFT, ACTIVE, SUSPENDED, TERMINATED]
        monthly_fee:
          type: number
          format: decimal
          example: 10000
        start_date:
          type: string
          format: date
        end_date:
          type: string
          format: date
          nullable: true
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    ErrorResponse:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
              example: VALIDATION_ERROR
            message:
              type: string
              example: 入力内容に誤りがあります
            details:
              type: object
            timestamp:
              type: string
              format: date-time

  responses:
    Unauthorized:
      description: 認証が必要です
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Forbidden:
      description: 権限がありません
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

### OpenAPI仕様の作成タイミング

**フェーズ1（ドキュメント作成時）:**
- 基本構造とエンドポイント一覧を定義
- 主要なスキーマを定義

**フェーズ2（実装時）:**
- BFF Agentが詳細を追加しながら実装
- Frontend Agentは仕様を参照して実装

### コード生成

**OpenAPI Generatorで型を自動生成:**

**Frontend（TypeScript型）:**
```bash
npx openapi-typescript contracts/openapi/bff-api.yaml --output src/types/api.ts
```

**BFF（Express + TypeScript）:**
```bash
npx openapi-generator-cli generate \
  -i contracts/openapi/bff-api.yaml \
  -g typescript-express \
  -o services/bff/src/generated
```

---

## Protocol Buffers契約管理（BFF ↔ Backend）

### Proto定義の配置

```
contracts/
└── proto/
    ├── merchant.proto      # 加盟店管理API
    ├── contract.proto      # 契約管理API
    ├── service.proto       # サービス管理API
    ├── approval.proto      # 承認ワークフローAPI
    └── common.proto        # 共通型定義
```

### Proto定義の構成

#### common.proto（共通型）

```protobuf
syntax = "proto3";

package contract_management.common;

option go_package = "github.com/example/contract-management/common";

// 日時型
message Timestamp {
  int64 seconds = 1;
  int32 nanos = 2;
}

// UUID型
message UUID {
  string value = 1;  // UUID文字列（例: 550e8400-e29b-41d4-a716-446655440000）
}

// ページネーションリクエスト
message PaginationRequest {
  int32 page = 1;
  int32 limit = 2;
}

// ページネーションレスポンス
message PaginationResponse {
  int32 total_count = 1;
  int32 page = 2;
  int32 limit = 3;
  int32 total_pages = 4;
}

// エラー詳細
message ErrorDetail {
  string code = 1;
  string message = 2;
  map<string, string> details = 3;
}
```

#### merchant.proto（加盟店管理）

```protobuf
syntax = "proto3";

package contract_management.merchant;

import "common.proto";

option go_package = "github.com/example/contract-management/merchant";

// 加盟店サービス
service MerchantService {
  // 加盟店一覧取得
  rpc ListMerchants(ListMerchantsRequest) returns (ListMerchantsResponse);

  // 加盟店詳細取得
  rpc GetMerchant(GetMerchantRequest) returns (GetMerchantResponse);

  // 加盟店登録
  rpc CreateMerchant(CreateMerchantRequest) returns (CreateMerchantResponse);

  // 加盟店更新
  rpc UpdateMerchant(UpdateMerchantRequest) returns (UpdateMerchantResponse);

  // 加盟店削除（論理削除）
  rpc DeleteMerchant(DeleteMerchantRequest) returns (DeleteMerchantResponse);
}

// 加盟店エンティティ
message Merchant {
  common.UUID id = 1;
  string merchant_code = 2;
  string name = 3;
  string address = 4;
  string contact_person = 5;
  string contact_email = 6;
  string contact_phone = 7;
  bool is_active = 8;
  common.Timestamp created_at = 9;
  common.Timestamp updated_at = 10;
}

// 加盟店一覧取得リクエスト
message ListMerchantsRequest {
  common.PaginationRequest pagination = 1;
  string search_query = 2;  // 店舗名検索
  bool include_inactive = 3;  // 無効な加盟店も含める
}

// 加盟店一覧取得レスポンス
message ListMerchantsResponse {
  repeated Merchant merchants = 1;
  common.PaginationResponse pagination = 2;
}

// 加盟店詳細取得リクエスト
message GetMerchantRequest {
  common.UUID id = 1;
}

// 加盟店詳細取得レスポンス
message GetMerchantResponse {
  Merchant merchant = 1;
}

// 加盟店登録リクエスト
message CreateMerchantRequest {
  string merchant_code = 1;
  string name = 2;
  string address = 3;
  string contact_person = 4;
  string contact_email = 5;
  string contact_phone = 6;
  common.UUID created_by = 7;  // BFFから渡されるユーザーID
}

// 加盟店登録レスポンス
message CreateMerchantResponse {
  Merchant merchant = 1;
}

// 加盟店更新リクエスト
message UpdateMerchantRequest {
  common.UUID id = 1;
  string name = 2;
  string address = 3;
  string contact_person = 4;
  string contact_email = 5;
  string contact_phone = 6;
  common.UUID updated_by = 7;
}

// 加盟店更新レスポンス
message UpdateMerchantResponse {
  Merchant merchant = 1;
}

// 加盟店削除リクエスト
message DeleteMerchantRequest {
  common.UUID id = 1;
  common.UUID deleted_by = 2;
}

// 加盟店削除レスポンス
message DeleteMerchantResponse {
  bool success = 1;
}
```

#### contract.proto（契約管理）

```protobuf
syntax = "proto3";

package contract_management.contract;

import "common.proto";
import "merchant.proto";

option go_package = "github.com/example/contract-management/contract";

// 契約サービス
service ContractService {
  // 契約一覧取得
  rpc ListContracts(ListContractsRequest) returns (ListContractsResponse);

  // 契約詳細取得
  rpc GetContract(GetContractRequest) returns (GetContractResponse);

  // 契約登録
  rpc CreateContract(CreateContractRequest) returns (CreateContractResponse);

  // 契約更新申請
  rpc RequestContractUpdate(RequestContractUpdateRequest) returns (RequestContractUpdateResponse);

  // 契約変更履歴取得
  rpc GetContractHistory(GetContractHistoryRequest) returns (GetContractHistoryResponse);
}

// 契約ステータス
enum ContractStatus {
  CONTRACT_STATUS_UNSPECIFIED = 0;
  DRAFT = 1;
  ACTIVE = 2;
  SUSPENDED = 3;
  TERMINATED = 4;
}

// 契約エンティティ
message Contract {
  common.UUID id = 1;
  string contract_number = 2;
  merchant.Merchant merchant = 3;
  Service service = 4;
  ContractStatus status = 5;
  string contract_date = 6;  // YYYY-MM-DD形式
  string start_date = 7;
  string end_date = 8;
  double monthly_fee = 9;
  double initial_fee = 10;
  string notes = 11;
  common.Timestamp created_at = 12;
  common.Timestamp updated_at = 13;
}

// サービスエンティティ（簡易版）
message Service {
  common.UUID id = 1;
  string service_code = 2;
  string name = 3;
  string description = 4;
}

// 契約一覧取得リクエスト
message ListContractsRequest {
  common.PaginationRequest pagination = 1;
  common.UUID merchant_id = 2;  // 加盟店IDでフィルタ
  common.UUID service_id = 3;   // サービスIDでフィルタ
  ContractStatus status = 4;    // ステータスでフィルタ
}

// 契約一覧取得レスポンス
message ListContractsResponse {
  repeated Contract contracts = 1;
  common.PaginationResponse pagination = 2;
}

// 契約詳細取得リクエスト
message GetContractRequest {
  common.UUID id = 1;
}

// 契約詳細取得レスポンス
message GetContractResponse {
  Contract contract = 1;
}

// 契約登録リクエスト
message CreateContractRequest {
  common.UUID merchant_id = 1;
  common.UUID service_id = 2;
  string start_date = 3;
  string end_date = 4;
  double monthly_fee = 5;
  double initial_fee = 6;
  string notes = 7;
  common.UUID created_by = 8;
}

// 契約登録レスポンス
message CreateContractResponse {
  Contract contract = 1;
}

// 契約更新申請リクエスト
message RequestContractUpdateRequest {
  common.UUID contract_id = 1;
  double new_monthly_fee = 2;
  double new_initial_fee = 3;
  string reason = 4;
  common.UUID requested_by = 5;
}

// 契約更新申請レスポンス
message RequestContractUpdateResponse {
  common.UUID approval_workflow_id = 1;
  string status = 2;  // PENDING
}

// 契約変更履歴取得リクエスト
message GetContractHistoryRequest {
  common.UUID contract_id = 1;
}

// 契約変更履歴取得レスポンス
message GetContractHistoryResponse {
  repeated ContractChange changes = 1;
}

// 契約変更履歴エンティティ
message ContractChange {
  common.UUID id = 1;
  common.UUID contract_id = 2;
  string change_type = 3;  // CREATE, UPDATE, DELETE
  string field_name = 4;
  string old_value = 5;
  string new_value = 6;
  common.UUID changed_by = 7;
  common.Timestamp changed_at = 8;
  string approval_status = 9;  // PENDING, APPROVED, REJECTED
}
```

### コード生成

**BFF（gRPCクライアント）:**
```bash
# TypeScript用のgRPCコード生成
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=services/bff/src/generated \
  --js_out=import_style=commonjs,binary:services/bff/src/generated \
  --grpc_out=grpc_js:services/bff/src/generated \
  --proto_path=contracts/proto \
  contracts/proto/*.proto
```

**Backend（gRPCサーバー）:**
```bash
# NestJS用のgRPCコード生成
protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=services/backend/src/generated \
  --grpc_out=grpc_js:services/backend/src/generated \
  --proto_path=contracts/proto \
  contracts/proto/*.proto
```

---

## バージョニング戦略

### API契約のバージョン管理

#### OpenAPI（REST API）

**URL versioning:**
```
/api/v1/contracts
/api/v2/contracts
```

**仕様ファイル:**
```
contracts/openapi/
├── bff-api-v1.yaml
└── bff-api-v2.yaml
```

#### Protocol Buffers（gRPC）

**パッケージバージョニング:**
```protobuf
package contract_management.contract.v1;
package contract_management.contract.v2;
```

**ファイル構成:**
```
contracts/proto/
├── v1/
│   ├── merchant.proto
│   └── contract.proto
└── v2/
    ├── merchant.proto
    └── contract.proto
```

### バージョンアップのタイミング

**メジャーバージョン（破壊的変更）:**
- フィールドの削除
- 必須フィールドの追加
- レスポンス構造の大幅変更

**マイナーバージョン（後方互換）:**
- オプショナルフィールドの追加
- 新しいエンドポイントの追加

**パッチバージョン:**
- ドキュメントの修正
- バグ修正

---

## 後方互換性ポリシー

### 互換性を保つルール

1. **既存フィールドの削除禁止**
   - フィールドを非推奨（deprecated）にマークし、将来バージョンで削除

2. **必須フィールドの追加禁止**
   - 新規フィールドは常にオプショナル

3. **データ型の変更禁止**
   - string → numberなど

4. **エンドポイントURLの変更禁止**
   - 新しいエンドポイントを追加

### 非推奨（Deprecated）のマーク

**OpenAPI:**
```yaml
paths:
  /api/contracts:
    get:
      deprecated: true
      summary: 【非推奨】契約一覧取得（v2を使用してください）
      description: このエンドポイントは2027年1月1日に削除予定です
```

**Protocol Buffers:**
```protobuf
message Contract {
  common.UUID id = 1;
  string contract_number = 2 [deprecated = true];  // 非推奨
  string contract_code = 3;  // 新フィールド
}
```

---

## 契約変更管理プロセス

### 変更の提案

1. **契約変更提案書の作成**
   - 変更内容の説明
   - 破壊的変更の有無
   - 影響範囲の分析

2. **Agent間レビュー**
   - BFF Agent、Frontend Agent、Backend Agentでレビュー
   - `.steering/[日付]-api-contract-change/` に変更内容を記載

3. **承認後に実装**
   - 契約ファイルを更新
   - コード生成
   - 各Agentが実装

### 契約テスト

**OpenAPI検証:**
```bash
# OpenAPIスキーマの妥当性チェック
npx @apidevtools/swagger-cli validate contracts/openapi/bff-api.yaml
```

**Protocol Buffers検証:**
```bash
# Protoファイルのコンパイルチェック
protoc --proto_path=contracts/proto --descriptor_set_out=/dev/null contracts/proto/*.proto
```

**契約適合性テスト:**
- BFFが実際に返すレスポンスがOpenAPI仕様に準拠しているかテスト
- BackendのgRPCレスポンスがProto定義に準拠しているかテスト

---

## 契約ドキュメントの自動生成

### OpenAPIドキュメント

**Swagger UIでドキュメント公開:**
```typescript
// services/bff/src/index.ts
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('../../contracts/openapi/bff-api.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

アクセス: http://localhost:4000/api-docs

### Protocol Buffersドキュメント

**protobufdocでHTMLドキュメント生成:**
```bash
protoc \
  --doc_out=./docs/api \
  --doc_opt=html,grpc-api.html \
  --proto_path=contracts/proto \
  contracts/proto/*.proto
```

---

## Agent別の責務

### BFF Agent

- **OpenAPI仕様の定義・更新**
  - `contracts/openapi/bff-api.yaml` の作成・維持
  - Frontend向けREST APIの実装
  - OpenAPI仕様との整合性確保

- **gRPCクライアントの実装**
  - Proto定義からクライアントコード生成
  - BackendへのgRPC呼び出し実装

### Frontend Agent

- **OpenAPI仕様の参照**
  - `contracts/openapi/bff-api.yaml` を参照してAPI呼び出し実装
  - TypeScript型の自動生成

### Backend Agent

- **gRPCサーバーの実装**
  - Proto定義からサーバーコード生成
  - gRPCサービスの実装
  - Proto定義との整合性確保

---

## まとめ

本システムのAPI契約管理は以下の方針で運用されます：

1. **契約形式:**
   - Frontend ↔ BFF: OpenAPI 3.0
   - BFF ↔ Backend: Protocol Buffers

2. **配置場所:**
   - `contracts/openapi/` - OpenAPI仕様
   - `contracts/proto/` - Proto定義

3. **バージョニング:**
   - URL versioning（REST API）
   - パッケージバージョニング（gRPC）

4. **後方互換性:**
   - 既存フィールド削除禁止
   - 必須フィールド追加禁止
   - deprecatedマークで段階的廃止

5. **変更管理:**
   - Agent間レビュー
   - 契約テスト
   - ドキュメント自動生成

すべてのAgentは、この契約管理方針に従ってAPI開発を進めてください。

---

**関連ドキュメント:**
- [system-architecture.md](system-architecture.md) - サービス間通信の全体構成
- [glossary.md](glossary.md) - API契約関連の用語定義
- [initial-setup-tasks.md](initial-setup-tasks.md) - API契約定義のタイミング
