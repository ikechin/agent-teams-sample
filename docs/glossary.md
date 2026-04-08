# ユビキタス言語定義（Glossary）

## 概要

本ドキュメントは、加盟店契約管理システム全体で使用するドメイン用語を定義します。
全サービス（Frontend/BFF/Backend）および全Agentは、このドキュメントに記載された用語を統一して使用してください。

---

## ドメイン用語

### 加盟店（Merchant）

**定義:**
当社のサービスを利用する契約先企業・店舗

**日本語:** 加盟店
**英語:** Merchant
**コード上の命名:** `merchant`, `Merchant`, `merchants`

**属性例:**
- 加盟店コード（merchant_code）
- 加盟店名（name）
- 住所（address）
- 連絡担当者（contact_person）

**関連用語:**
- 契約（Contract）
- サービス（Service）

---

### 契約（Contract）

**定義:**
加盟店と当社間で締結されたサービス利用契約

**日本語:** 契約
**英語:** Contract
**コード上の命名:** `contract`, `Contract`, `contracts`

**属性例:**
- 契約番号（contract_number）
- 契約ステータス（status）
- 契約日（contract_date）
- 開始日（start_date）
- 終了日（end_date）
- 月額料金（monthly_fee）
- 初期費用（initial_fee）

**ステータス:**
- `DRAFT`: 仮契約（下書き）
- `ACTIVE`: 有効契約（稼働中）
- `SUSPENDED`: 停止中
- `TERMINATED`: 解約済み

**関連用語:**
- 加盟店（Merchant）
- サービス（Service）
- 契約変更履歴（Contract Change）
- 承認ワークフロー（Approval Workflow）

---

### サービス（Service）

**定義:**
当社が提供するビジネスサービス（決済サービス、ポイントサービス等）

**日本語:** サービス
**英語:** Service
**コード上の命名:** `service`, `Service`, `services`

**注意:** 技術用語の「マイクロサービス」と区別するため、文脈で明確にする

**属性例:**
- サービスコード（service_code）
- サービス名（name）
- 説明（description）
- 有効/無効（is_active）

**例:**
- 決済サービス（Payment Service）
- ポイントサービス（Point Service）
- 販促支援サービス（Promotion Service）

**関連用語:**
- 契約（Contract）
- 加盟店（Merchant）

---

### 契約変更履歴（Contract Change / Change History）

**定義:**
契約内容の変更記録（J-SOX対応のための監査証跡）

**日本語:** 契約変更履歴、変更履歴
**英語:** Contract Change, Change History
**コード上の命名:** `contractChange`, `ContractChange`, `contract_changes`

**属性例:**
- 変更種別（change_type: CREATE, UPDATE, DELETE）
- フィールド名（field_name）
- 変更前の値（old_value）
- 変更後の値（new_value）
- 変更者（changed_by）
- 変更日時（changed_at）

**関連用語:**
- 契約（Contract）
- 承認ワークフロー（Approval Workflow）
- 監査ログ（Audit Log）

---

### 承認ワークフロー（Approval Workflow）

**定義:**
金額変更等の重要な契約変更を承認するプロセス

**日本語:** 承認ワークフロー、承認フロー
**英語:** Approval Workflow
**コード上の命名:** `approvalWorkflow`, `ApprovalWorkflow`, `approval_workflows`

**ステータス:**
- `PENDING`: 承認待ち
- `APPROVED`: 承認済み
- `REJECTED`: 却下

**関連用語:**
- 契約（Contract）
- 承認者（Approver）
- 申請者（Requester）
- 職務分掌（Segregation of Duties）

---

### ユーザー（User）

**定義:**
システムを利用する社内従業員

**日本語:** ユーザー
**英語:** User
**コード上の命名:** `user`, `User`, `users`

**属性例:**
- メールアドレス（email）
- 氏名（name）
- 有効/無効（is_active）

**関連用語:**
- ロール（Role）
- 権限（Permission）
- セッション（Session）

---

### ロール（Role）

**定義:**
ユーザーの職務に応じた権限セット。BFF DBで管理され、システム管理者が自由に作成・編集可能。

**日本語:** ロール、役割
**英語:** Role
**コード上の命名:** `role`, `Role`, `roles`

**重要:** ロール名はソースコードにハードコードせず、DBから動的に取得すること

**初期ロール例（システム管理者が変更可能）:**
- **system-admin**: システム管理者（全機能アクセス可能、ロール・権限管理可能）
- **contract-manager**: 契約管理者（契約の登録・編集・承認可能）
- **sales**: 営業担当者（契約閲覧・新規登録・申請可能）
- **viewer**: 閲覧者（契約の閲覧のみ）

**属性例:**
- ロールID（role_id: `system-admin`, `contract-manager`等）
- ロール名（role_name）
- 説明（description）

**関連用語:**
- ユーザー（User）
- 権限（Permission）
- ロールベースアクセス制御（RBAC）

---

### 権限（Permission）

**定義:**
機能単位のアクセス権限。ロールに紐付けて管理される。

**日本語:** 権限
**英語:** Permission
**コード上の命名:** `permission`, `Permission`, `permissions`

**権限の命名規則:**
`{resource}:{action}` 形式
- resource: リソース名（merchants, contracts, users等）
- action: 操作（read, create, update, delete, approve, manage等）

**権限の例:**
- `merchants:read` - 加盟店閲覧
- `merchants:create` - 加盟店登録
- `contracts:read` - 契約閲覧
- `contracts:create` - 契約登録
- `contracts:update` - 契約編集申請
- `contracts:approve` - 契約承認
- `users:manage` - ユーザー管理
- `roles:manage` - ロール・権限管理

**属性例:**
- 権限ID（permission_id）
- 権限名（permission_name: `contracts:approve`等）
- リソース（resource: `contracts`）
- アクション（action: `approve`）

**関連用語:**
- ロール（Role）
- ユーザー（User）

---

### 監査ログ（Audit Log）

**定義:**
システム上のすべてのAPI呼び出しを記録したログ（J-SOX対応）

**日本語:** 監査ログ
**英語:** Audit Log
**コード上の命名:** `auditLog`, `AuditLog`, `audit_logs`

**記録内容:**
- ユーザーID（user_id）
- 操作内容（action）
- リソース種別（resource_type）
- リクエストパス（request_path）
- 実行日時（created_at）
- IPアドレス（ip_address）

**関連用語:**
- 契約変更履歴（Contract Change）
- J-SOX対応（J-SOX Compliance）

---

### セッション（Session）

**定義:**
ユーザーのログイン状態を管理する仕組み

**日本語:** セッション
**英語:** Session
**コード上の命名:** `session`, `Session`, `sessions`

**属性例:**
- セッショントークン（session_token）
- ユーザーID（user_id）
- 有効期限（expires_at）
- 最終アクセス日時（last_accessed_at）

**関連用語:**
- ユーザー（User）
- 認証（Authentication）
- 認可（Authorization）

---

## ビジネス用語

### 新サービス展開

**定義:**
当社が新規にビジネスサービスを立ち上げ、既存加盟店に提案・契約を結ぶこと

**背景:**
当社は頻繁に新サービスを立ち上げており、既存加盟店への迅速なクロスセルが収益の柱

**システム要件:**
- サービステーブルに新サービスを追加するだけで、即座に契約管理対象にできること
- コードのデプロイなしに新サービスを追加できること

---

### クロスセル

**定義:**
既存加盟店に新しいサービスの契約を追加すること

**英語:** Cross-sell

**システム上の操作:**
既存加盟店に対して、新しいサービスの契約レコードを作成

---

### 職務分掌（Segregation of Duties, SoD）

**定義:**
J-SOX対応のため、契約の登録者と承認者を分離する統制

**英語:** Segregation of Duties (SoD)
**略称:** SoD

**システム実装:**
- 金額変更時は必ず承認フローを経由
- 登録者（Requester）≠ 承認者（Approver）を強制

**関連用語:**
- J-SOX対応（J-SOX Compliance）
- 承認ワークフロー（Approval Workflow）

---

### 監査証跡（Audit Trail）

**定義:**
すべてのデータ変更を記録し、後から追跡可能にすること

**英語:** Audit Trail

**システム実装:**
- 契約変更履歴（contract_changes）
- 監査ログ（audit_logs）
- 変更者・変更日時・変更内容を記録

**関連用語:**
- J-SOX対応（J-SOX Compliance）
- 監査ログ（Audit Log）

---

## 技術用語

### Frontend（フロントエンド）

**定義:**
ユーザーインターフェースを提供するサービス（Next.js）

**技術スタック:** Next.js, React, TypeScript

**コード上の命名:** `frontend`, `Frontend`

**ディレクトリ:** `services/frontend/`

---

### BFF（Backend for Frontend）

**定義:**
Frontend向けのAPI Gatewayサービス（認証・認可・監査ログを担当）

**略称:** BFF

**技術スタック:** Go, Echo, sqlc, gRPC Client

**コード上の命名:** `bff`, `BFF`

**ディレクトリ:** `services/bff/`

**責務:**
- 認証（Authentication）
- 認可（Authorization）
- ユーザー管理（User Management）
- 監査ログ記録（Audit Logging）
- Backend APIの集約

---

### Backend（バックエンド）

**定義:**
ビジネスロジックとデータ管理を担当するサービス

**技術スタック:** Go, gRPC Server, PostgreSQL

**コード上の命名:** `backend`, `Backend`

**ディレクトリ:** `services/backend/`

**責務:**
- 加盟店管理
- 契約管理
- サービス管理
- 承認ワークフロー
- データ変更監査

---

### gRPC（gRPC）

**定義:**
BFF ↔ Backend間で使用する高速通信プロトコル

**正式名称:** gRPC Remote Procedure Call

**特徴:**
- Protocol Buffers形式
- 型安全
- 高速

**関連用語:**
- Protocol Buffers
- API契約

---

### Protocol Buffers（protobuf）

**定義:**
gRPCで使用するインターフェース定義言語とバイナリフォーマット

**略称:** protobuf

**配置場所:** `contracts/proto/`

**例:**
- `contracts/proto/merchant.proto`
- `contracts/proto/contract.proto`

---

### API契約（API Contract）

**定義:**
サービス間のAPIインターフェース仕様

**種類:**
- **Frontend ↔ BFF**: OpenAPI 3.0形式（`contracts/openapi/bff-api.yaml`）
- **BFF ↔ Backend**: Protocol Buffers形式（`contracts/proto/`）

**関連用語:**
- OpenAPI
- Protocol Buffers

---

### J-SOX対応（J-SOX Compliance）

**定義:**
日本版SOX法（金融商品取引法）に基づく内部統制の実装

**英語:** J-SOX Compliance

**システム要件:**
- 監査証跡の記録
- 職務分掌の実装
- アクセス制御
- データ保護

**関連ドキュメント:** `docs/jsox-compliance.md`

---

### E2Eテスト（E2E Test）

**定義:**
Frontend、BFF、Backendの全サービスを統合してユーザーの実際の操作フローをテストする統合テスト

**正式名称:** End-to-End Test

**略称:** E2E Test

**技術スタック:** Playwright

**ディレクトリ:** `e2e/`

**特徴:**
- 全サービスをDocker Composeで起動してテスト実行
- ブラウザ自動操作によるユーザーフローの検証
- 実環境に近い統合テスト

**関連用語:**
- テストシナリオ（Test Scenario）
- クリティカルパス（Critical Path）
- Playwright

**関連ドキュメント:** `e2e/README.md`, `e2e/test-scenarios.md`

---

### テストシナリオ（Test Scenario）

**定義:**
E2Eテストで検証すべきユーザー操作フローを定義したドキュメント

**英語:** Test Scenario

**コード上の命名:** `testScenario`, `TestScenario`

**管理場所:** `e2e/test-scenarios.md`

**構成要素:**
- シナリオ名
- 優先度（High/Medium/Low）
- 実装状況（✅ 実装済み / ❌ 未実装）
- 前提条件
- テストケース（ステップ）

**重要:** 新しい画面や機能を実装した際は、必ず`e2e/test-scenarios.md`にテストシナリオを追加すること

**関連用語:**
- E2Eテスト（E2E Test）
- クリティカルパス（Critical Path）

---

### クリティカルパス（Critical Path）

**定義:**
システムの中核となるユーザーフローで、必ず動作保証が必要な最重要テストシナリオ

**英語:** Critical Path

**例:**
- ログインから契約登録・承認までの一連のフロー
- 加盟店登録から契約追加までのフロー

**優先度:** 最高（High）

**関連用語:**
- E2Eテスト（E2E Test）
- テストシナリオ（Test Scenario）

---

### Playwright

**定義:**
Microsoftが開発したブラウザ自動化テストフレームワーク

**技術分類:** E2Eテストツール

**対応ブラウザ:**
- Chromium
- Firefox
- WebKit（Safari）

**設定ファイル:** `e2e/playwright.config.ts`

**特徴:**
- クロスブラウザテスト対応
- 並列実行サポート
- スクリーンショット・トレース機能

**関連用語:**
- E2Eテスト（E2E Test）

---

## UI/UX用語

### 加盟店一覧画面

**英語:** Merchant List Page

**URL例:** `/merchants`

**主な機能:**
- 加盟店の検索
- 加盟店一覧表示
- ページネーション

---

### 契約詳細画面

**英語:** Contract Detail Page

**URL例:** `/contracts/:id`

**主な機能:**
- 契約情報の表示
- 契約変更履歴の表示
- 契約編集（申請）

---

### 承認待ち一覧画面

**英語:** Pending Approvals Page

**URL例:** `/approvals`

**主な機能:**
- 承認待ちの契約変更一覧
- 承認・却下操作

---

## 命名規則

### データベーステーブル

- **形式:** スネークケース（snake_case）
- **複数形:** 使用する
- **例:** `merchants`, `contracts`, `audit_logs`

### APIエンドポイント（REST）

- **形式:** ケバブケース（kebab-case）
- **複数形:** コレクションは複数形、単一リソースは単数形
- **例:**
  - `GET /api/merchants` - 加盟店一覧
  - `GET /api/merchants/:id` - 加盟店詳細
  - `POST /api/contracts` - 契約登録

### gRPC メソッド

- **形式:** パスカルケース（PascalCase）
- **動詞 + 名詞**
- **例:**
  - `ListMerchants`
  - `GetMerchant`
  - `CreateContract`
  - `UpdateContract`
  - `ApproveContractChange`

### TypeScript/JavaScript

- **変数・関数:** キャメルケース（camelCase）
  - 例: `merchantCode`, `getContract`, `approveWorkflow`
- **クラス・型:** パスカルケース（PascalCase）
  - 例: `Merchant`, `Contract`, `ApprovalWorkflow`
- **定数:** アッパースネークケース（UPPER_SNAKE_CASE）
  - 例: `MAX_SESSION_TIMEOUT`, `DEFAULT_PAGE_SIZE`

### React コンポーネント

- **形式:** パスカルケース（PascalCase）
- **例:** `MerchantList`, `ContractDetail`, `ApprovalWorkflowCard`

---

## 禁止用語・非推奨用語

### 避けるべき用語

| ❌ 使わない | ✅ 使う | 理由 |
|------------|---------|------|
| 店舗 | 加盟店（Merchant） | ドメイン用語の統一 |
| クライアント | 加盟店（Merchant） | 「クライアント」は技術用語と混同 |
| 案件 | 契約（Contract） | ビジネス用語の統一 |
| 合意 / Agreement | 契約（Contract） | ドメイン用語の統一 |
| 変更ログ | 契約変更履歴（Contract Change） | 正確な用語使用 |
| 決裁 | 承認（Approval） | 用語の統一 |

---

## 英語・日本語対応表

| 日本語 | 英語 | コード |
|--------|------|--------|
| 加盟店 | Merchant | `merchant` |
| 契約 | Contract | `contract` |
| サービス | Service | `service` |
| ユーザー | User | `user` |
| ロール | Role | `role` |
| 承認ワークフロー | Approval Workflow | `approvalWorkflow` |
| 監査ログ | Audit Log | `auditLog` |
| セッション | Session | `session` |
| 職務分掌 | Segregation of Duties | `segregationOfDuties` |
| 監査証跡 | Audit Trail | `auditTrail` |
| E2Eテスト | E2E Test / End-to-End Test | `e2eTest` |
| テストシナリオ | Test Scenario | `testScenario` |
| クリティカルパス | Critical Path | `criticalPath` |

---

## 用語の追加・変更プロセス

新しいドメイン用語が必要になった場合：

1. このドキュメント（`docs/glossary.md`）に用語を追加
2. プルリクエストで全Agentにレビュー依頼
3. 承認後、全サービスで統一使用

**重要:**
- 全Agent・全サービスがこのドキュメントを参照すること
- コード上の命名もこの用語に従うこと
- 用語の独自解釈や変更は禁止
