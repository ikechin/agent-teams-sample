# システムアーキテクチャ設計書

## 概要

本システムは、加盟店契約管理を行う社内向けWebアプリケーションです。
マイクロサービスアーキテクチャを採用し、Frontend（Next.js）、BFF（Backend for Frontend）、Backend（ビジネスロジック）の3層構成で構築します。

## システム全体構成

### アーキテクチャ図

```mermaid
graph TB
    User[社内ユーザー<br/>営業/契約管理/経理/経営層]

    subgraph "Frontend Service"
        FE[Next.js<br/>React UI]
    end

    subgraph "BFF Service"
        BFF[BFF API Gateway<br/>Node.js/Express]
        BFFAuth[認証・認可<br/>セッション管理]
        BFFAudit[監査ログ記録]
        BFFUserMgmt[ユーザー管理]
        BFFDB[(PostgreSQL<br/>BFF DB)]
    end

    subgraph "Backend Service"
        BE[Backend API<br/>Node.js/NestJS]
        BELogic[ビジネスロジック<br/>契約管理/加盟店管理]
        BEAudit[データ変更監査]
        BEDB[(PostgreSQL<br/>Backend DB)]
    end

    User -->|HTTPS| FE
    FE -->|REST API| BFF
    BFF --> BFFAuth
    BFF --> BFFAudit
    BFF --> BFFUserMgmt
    BFFAuth --> BFFDB
    BFFAudit --> BFFDB
    BFFUserMgmt --> BFFDB
    BFF -->|gRPC| BE
    BE --> BELogic
    BE --> BEAudit
    BELogic --> BEDB
    BEAudit --> BEDB
```

### 各サービスの責務

#### Frontend Service
- **技術スタック**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **責務**:
  - ユーザーインターフェースの提供
  - クライアント側のバリデーション
  - BFF APIの呼び出し
  - レスポンシブデザイン対応
- **データ保持**: なし（ステートレス）

#### BFF Service
- **技術スタック**: Node.js, Express, TypeScript, Prisma (ORM)
- **責務**:
  - **認証・認可**: ユーザー認証、セッション管理、ロールベースアクセス制御
  - **ユーザー管理**: ユーザー情報の登録・更新・削除、ロール管理
  - **監査ログ記録**: 全API呼び出しの記録（誰が・いつ・何を実行したか）
  - **データ加工**: Frontend向けにBackendデータを最適化
  - **API集約**: 複数のBackend APIを集約してFrontendに提供
  - **認可チェック**: リクエストごとにユーザー権限を確認
- **データベース**: PostgreSQL（ユーザー情報、セッション、監査ログ）

#### Backend Service
- **技術スタック**: Node.js, NestJS, TypeScript, Prisma (ORM), gRPC
- **責務**:
  - **ビジネスロジック**: 加盟店管理、契約管理、サービス管理、承認ワークフロー
  - **データ永続化**: 加盟店情報、契約情報、サービス情報の管理
  - **データ変更監査**: すべてのデータ変更履歴の記録（J-SOX対応）
  - **ドメインロジック**: 契約の整合性チェック、金額計算、承認ルール適用
  - **gRPC API提供**: BFF向けにProtocol Buffers形式のAPI公開
- **データベース**: PostgreSQL（加盟店、契約、サービス、変更履歴）

---

## サービス間通信

### 通信プロトコル
- **Frontend ↔ BFF**: HTTPS / REST API (JSON)
- **BFF ↔ Backend**: gRPC / Protocol Buffers（内部通信）

### API契約管理
- **Frontend向けREST API**: `contracts/openapi/bff-api.yaml`（OpenAPI 3.0形式）
- **Backend向けgRPC API**: `contracts/proto/` にProtocol Buffers定義を配置
  - 例: `contracts/proto/merchant.proto`、`contracts/proto/contract.proto`
- BFF AgentがProto定義を作成し、Frontend/Backend Agentが参照

### gRPC採用の利点
- **型安全性**: Protocol Buffersによる厳密な型定義
- **パフォーマンス**: バイナリプロトコルによる高速通信
- **コード自動生成**: クライアント/サーバーコードの自動生成
- **双方向ストリーミング**: 将来的なリアルタイム機能拡張に対応

### エラーハンドリング
- 統一されたエラーレスポンス形式:
```json
{
  "error": {
    "code": "CONTRACT_NOT_FOUND",
    "message": "指定された契約が見つかりません",
    "details": {},
    "timestamp": "2026-04-05T10:00:00Z"
  }
}
```

---

## 認証・認可アーキテクチャ

### 認証フロー

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant BFF
    participant BFF_DB

    User->>Frontend: ログイン（email/password）
    Frontend->>BFF: POST /api/auth/login
    BFF->>BFF_DB: ユーザー認証情報確認
    BFF_DB-->>BFF: ユーザー情報 + ロール
    BFF->>BFF: セッション作成
    BFF->>BFF_DB: セッション保存
    BFF-->>Frontend: Set-Cookie (session_id)
    Frontend-->>User: ログイン成功

    Note over Frontend,BFF: 以降のリクエストはCookieでセッション認証

    User->>Frontend: 契約一覧表示
    Frontend->>BFF: GET /api/contracts (Cookie付き)
    BFF->>BFF_DB: セッション検証
    BFF_DB-->>BFF: ユーザー情報 + 権限
    BFF->>BFF: 認可チェック（契約閲覧権限あり？）
    BFF->>Backend: gRPC ListContracts()
    Backend-->>BFF: 契約データ（Protocol Buffers）
    BFF-->>Frontend: 契約一覧（JSON、加工済み）
    Frontend-->>User: 契約一覧表示
```

### 認証方式（初期実装）
- **セッションベース認証**
  - Cookie + サーバーサイドセッション
  - セッションストア: PostgreSQL（BFF DB）
  - セッションタイムアウト: 30分（アイドル時）
  - CSRF対策: CSRF トークン（Double Submit Cookie）

### 将来対応（SSO連携）
- Azure AD / Okta 等の社内SSOとの連携
- SAML 2.0 または OpenID Connect
- 既存の簡易認証と併存可能な設計

### ロールベースアクセス制御（RBAC）

**ロール定義:**
- `SYSTEM_ADMIN`: システム管理者（全機能アクセス可）
- `CONTRACT_MANAGER`: 契約管理者（契約の登録・編集・承認可）
- `SALES`: 営業担当者（契約閲覧・新規登録・申請可）
- `VIEWER`: 閲覧者（契約の閲覧のみ）

**権限マトリクス:**

| 機能 | SYSTEM_ADMIN | CONTRACT_MANAGER | SALES | VIEWER |
|------|--------------|------------------|-------|--------|
| 加盟店閲覧 | ✅ | ✅ | ✅ | ✅ |
| 加盟店登録 | ✅ | ✅ | ✅ | ❌ |
| 加盟店編集 | ✅ | ✅ | ❌ | ❌ |
| 契約閲覧 | ✅ | ✅ | ✅ | ✅ |
| 契約登録 | ✅ | ✅ | ✅ | ❌ |
| 契約編集申請 | ✅ | ✅ | ✅ | ❌ |
| 契約編集承認 | ✅ | ✅ | ❌ | ❌ |
| サービス管理 | ✅ | ❌ | ❌ | ❌ |
| ユーザー管理 | ✅ | ❌ | ❌ | ❌ |
| 監査ログ閲覧 | ✅ | ✅ | ❌ | ❌ |

### 職務分掌（J-SOX対応）
- **登録者と承認者の分離**: 契約の金額変更は登録者≠承認者を強制
- **承認フロー**: 金額変更時は必ず`CONTRACT_MANAGER`以上の承認が必要
- **監査証跡**: すべての認可チェック結果を監査ログに記録

---

## データベース設計

### BFF Database（PostgreSQL）

**目的:** 認証、認可、監査ログの管理

**主要エンティティ:**
- **users**: ユーザー情報とロール管理（email, password_hash, role）
- **sessions**: セッション管理（session_token, user_id, expires_at）
- **audit_logs**: API呼び出し記録（user_id, action, resource_type, request_path）

**詳細設計:** `services/bff/docs/functional-design.md` に記載

### Backend Database（PostgreSQL）

**目的:** ビジネスデータの管理

**主要エンティティ:**
- **merchants**: 加盟店情報（merchant_code, name, address, contact_info）
- **services**: サービス情報（service_code, name, description）
- **contracts**: 契約情報（contract_number, merchant_id, service_id, fees, dates）
- **contract_changes**: 契約変更履歴（J-SOX対応、change_type, old_value, new_value）
- **approval_workflows**: 承認ワークフロー（change_request, status, approver）

**詳細設計:** `services/backend/docs/functional-design.md` に記載

### データベース間の整合性

- **ユーザーID**: BFFのユーザーIDをBackendでも記録（created_by, updated_by）
- **外部キー制約なし**: BFFとBackendのDB間は疎結合（IDは参照するが制約は設けない）
- **トランザクション**: 各サービス内でACID保証、サービス間はSagaパターンで整合性担保

---

## インフラ構成

### コンテナ構成（Docker Compose）

```yaml
version: '3.8'

services:
  frontend:
    build: ./services/frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_BFF_API_URL=http://bff:4000
    depends_on:
      - bff

  bff:
    build: ./services/bff
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://bff_user:password@bff-db:5432/bff_db
      - BACKEND_GRPC_URL=backend:50051
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - bff-db
      - backend

  bff-db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=bff_user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=bff_db
    volumes:
      - bff-db-data:/var/lib/postgresql/data

  backend:
    build: ./services/backend
    ports:
      - "50051:50051"  # gRPC port
    environment:
      - DATABASE_URL=postgresql://backend_user:password@backend-db:5432/backend_db
      - GRPC_PORT=50051
    depends_on:
      - backend-db

  backend-db:
    image: postgres:15-alpine
    ports:
      - "5433:5432"  # 外部からのアクセス用（開発時）
    environment:
      - POSTGRES_USER=backend_user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=backend_db
    volumes:
      - backend-db-data:/var/lib/postgresql/data

volumes:
  bff-db-data:
  backend-db-data:
```

### クラウドデプロイ戦略

**対象プラットフォーム:** AWS（または Azure）

**構成案（AWS）:**
- **Frontend**: AWS ECS Fargate（またはVercel）
- **BFF**: AWS ECS Fargate + ALB
- **Backend**: AWS ECS Fargate（内部ロードバランサー）
- **BFF Database**: Amazon RDS for PostgreSQL
- **Backend Database**: Amazon RDS for PostgreSQL
- **コンテナレジストリ**: Amazon ECR
- **ログ**: CloudWatch Logs
- **監視**: CloudWatch + X-Ray

**移行容易性:**
- Docker Composeで開発・ステージング環境構築
- 本番環境ではECS Task Definitionに変換
- 環境変数で設定を外部化（SSM Parameter Store / Secrets Manager）

---

## セキュリティ設計

### 通信の暗号化
- **外部通信**: HTTPS（TLS 1.3）必須
- **内部通信**: HTTP（コンテナ内ネットワーク）
  - 将来的にmTLS対応も検討

### データ暗号化
- **転送中**: TLS
- **保存時**:
  - データベース: RDS暗号化（AES-256）
  - 機密情報（パスワード）: bcryptでハッシュ化
  - 個人情報（メールアドレス等）: アプリケーションレベルで暗号化検討

### 認証・認可のセキュリティ
- セッションタイムアウト: 30分
- パスワードポリシー: 最低8文字、英数字記号必須
- 認証失敗ロック: 5回失敗で30分ロック
- CSRF対策: Double Submit Cookie
- XSS対策: Content Security Policy、自動エスケープ

### 監査ログ
- すべてのAPI呼び出しを記録（BFF audit_logs）
- すべてのデータ変更を記録（Backend contract_changes）
- ログの改ざん防止: 書き込み専用テーブル（DELETE不可）

---

## スケーラビリティ

### 水平スケーリング
- **Frontend**: ステートレス、複数インスタンス起動可能
- **BFF**: セッションをDBに保存することで複数インスタンス対応
- **Backend**: ステートレス、複数インスタンス起動可能
- **Database**: Read Replica追加で読み取り性能向上

### キャッシング戦略
- **Frontend**: Next.jsのISR（Incremental Static Regeneration）
- **BFF**: Redis導入でセッションとAPIレスポンスをキャッシュ（将来）
- **Backend**: データベースクエリ結果のキャッシュ（将来）

---

## 監視・ログ

### ログ種別
- **アプリケーションログ**: 構造化ログ（JSON）
- **監査ログ**: データベースに永続化
- **アクセスログ**: nginx/ALBレベル

### メトリクス
- CPU、メモリ使用率
- API応答時間（P50, P95, P99）
- エラー率
- データベース接続数

### アラート
- エラー率が5%超過
- API応答時間がP95で3秒超過
- データベース接続プール枯渇

---

## デプロイ戦略

### CI/CDパイプライン
1. **ビルド**: Docker イメージをビルド
2. **テスト**: ユニットテスト、統合テスト実行
3. **プッシュ**: ECRにイメージをプッシュ
4. **デプロイ**: ECSタスク定義を更新、ローリングアップデート

### ブルーグリーンデプロイ
- 新バージョンを並行稼働
- トラフィックを段階的に切り替え
- 問題発生時は即座にロールバック

---

## 非機能要件の実現

| 要件 | 実現方法 |
|------|----------|
| パフォーマンス（画面表示3秒以内） | Next.js SSR/ISR、コード分割、画像最適化 |
| API応答時間1秒以内 | データベースインデックス、N+1クエリ対策 |
| 稼働率99.5% | ECS Auto Scaling、Multi-AZ構成、ヘルスチェック |
| J-SOX対応 | 監査ログ、職務分掌、承認フロー実装 |
| セキュリティ | TLS、認証・認可、CSRF/XSS対策、暗号化 |
| 拡張性（新サービス追加） | サービステーブルのマスタ化、コード変更最小化 |

---

## 将来拡張

### Phase 2以降の検討事項
- **SSO連携**: Azure AD / Okta
- **外部システム連携**: 請求システムAPI連携
- **イベント駆動アーキテクチャ**: Kafka / SQS導入
- **マイクロサービス追加**: 通知サービス、レポートサービス等
- **GraphQL**: BFF層にGraphQL Gateway追加
- **モバイルアプリ**: React Native対応
