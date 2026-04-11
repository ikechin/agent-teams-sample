# サービス管理 + 契約管理（Phase 1）- 要求定義

## 目的

サービス管理CRUDと契約管理CRUDを全サービス（Backend/BFF/Frontend）に追加する。
加盟店×サービスの契約を管理できるようにするシステムの中核機能。

**前提タスク:**
- 加盟店管理CRUD完了済み（Phase 1-4 + Update/Delete）
- 加盟店と同じアーキテクチャパターン（gRPC → REST → React）を踏襲

---

## スコープ

### 実装するもの

#### A. サービス管理（services）

##### Backend Service
- **gRPC RPC追加**
  - `ListServices` - サービス一覧取得（ページネーション + 検索）
  - `GetService` - サービス詳細取得
  - `CreateService` - サービス登録
  - `UpdateService` - サービス更新
- **DBマイグレーション**: servicesテーブル作成 + シードデータ
- **Protocol Buffers定義**: `contracts/proto/service.proto` 新規作成
- **監査記録**: CREATE/UPDATEをcontract_changesに記録（J-SOX）
- **テスト追加**

##### BFF Service
- **RESTエンドポイント追加**
  - `GET /api/v1/services` - サービス一覧
  - `GET /api/v1/services/:id` - サービス詳細
  - `POST /api/v1/services` - サービス登録
  - `PUT /api/v1/services/:id` - サービス更新
- **権限チェック**: `services:read` / `services:create` / `services:update`
- **BFF DB権限マイグレーション**: services権限の追加
- **OpenAPI仕様更新**: `contracts/openapi/bff-api.yaml`
- **テスト追加**

##### Frontend
- **サイドバーに「サービス管理」追加**
- **サービス一覧画面**（`/dashboard/services`）
- **サービス詳細画面**（`/dashboard/services/[id]`）
- **サービス登録画面**（`/dashboard/services/new`）
- **サービス編集画面**（`/dashboard/services/[id]/edit`）
- **テスト追加**

#### B. 契約管理（contracts）

##### Backend Service
- **gRPC RPC追加**
  - `ListContracts` - 契約一覧取得（ページネーション + 検索 + フィルター）
  - `GetContract` - 契約詳細取得
  - `CreateContract` - 契約登録（ステータス: DRAFT）
  - `UpdateContract` - 契約更新（ステータス変更含む）
  - `DeleteContract` - 契約論理削除（TERMINATED化）
- **DBマイグレーション**: contractsテーブル作成
- **Protocol Buffers定義**: `contracts/proto/contract.proto` 新規作成
- **ステータス管理**: DRAFT → ACTIVE → SUSPENDED → TERMINATED
- **バリデーション**: merchant_id/service_idの存在確認、日付整合性
- **監査記録**: 全変更をcontract_changesに記録（J-SOX）
- **テスト追加**

##### BFF Service
- **RESTエンドポイント追加**
  - `GET /api/v1/contracts` - 契約一覧（フィルター: status, merchant_id, service_id）
  - `GET /api/v1/contracts/:id` - 契約詳細
  - `POST /api/v1/contracts` - 契約登録
  - `PUT /api/v1/contracts/:id` - 契約更新
  - `DELETE /api/v1/contracts/:id` - 契約解約
- **権限チェック**: `contracts:read` / `contracts:create` / `contracts:update` / `contracts:delete`
- **OpenAPI仕様更新**
- **テスト追加**

##### Frontend
- **サイドバーに「契約管理」追加**
- **契約一覧画面**（`/dashboard/contracts`）
  - ステータスフィルター（DRAFT/ACTIVE/SUSPENDED/TERMINATED）
  - 加盟店名・契約番号で検索
- **契約詳細画面**（`/dashboard/contracts/[id]`）
  - 契約情報 + 紐づく加盟店・サービス情報表示
  - ステータスバッジ表示
- **契約登録画面**（`/dashboard/contracts/new`）
  - 加盟店選択（ドロップダウン）
  - サービス選択（ドロップダウン）
  - 金額・日付入力
- **契約編集画面**（`/dashboard/contracts/[id]/edit`）
- **テスト追加**

#### C. 親リポジトリ
- **Proto定義**: `contracts/proto/service.proto`, `contracts/proto/contract.proto` 新規作成
- **OpenAPI仕様更新**: `contracts/openapi/bff-api.yaml`
- **E2Eテスト**: サービス管理 + 契約管理のCRUDテスト

### 実装しないもの
- 承認ワークフロー（金額変更時の承認申請・承認・却下）→ Phase 2
- サービスの論理削除（無効化のみ、is_active=falseで対応）
- 契約のバルク操作（一括登録・一括更新）
- レポート・ダッシュボード機能

---

## ユーザーストーリー

### ストーリー1: サービスの登録・管理

**As a** システム管理者
**I want to** サービス（決済サービス、ポイントサービス等）を登録・管理する
**So that** 契約登録時にサービスを選択できる

**受け入れ条件:**
- サービス一覧画面でサービスが一覧表示される
- サービスを新規登録できる（service_codeは自動生成）
- サービスを編集できる
- サービスの有効/無効を切り替えられる
- 変更がcontract_changesに記録される（J-SOX）

### ストーリー2: 契約の新規登録

**As a** 契約管理担当者
**I want to** 加盟店とサービスを紐づけた契約を登録する
**So that** 契約情報を一元管理できる

**受け入れ条件:**
- 契約登録画面で加盟店とサービスをドロップダウンから選択できる
- 契約番号（contract_number）が自動生成される
- 金額（月額料金・初期費用）を入力できる
- 開始日・終了日を設定できる
- 初期ステータスはDRAFT
- 登録がcontract_changesに記録される（J-SOX）
- `contracts:create` 権限が必要

### ストーリー3: 契約の一覧・検索

**As a** 契約管理担当者
**I want to** 契約を一覧表示し、ステータスや加盟店で絞り込む
**So that** 目的の契約を素早く見つけられる

**受け入れ条件:**
- 契約一覧画面で全契約が表示される
- ステータスでフィルターできる（DRAFT/ACTIVE/SUSPENDED/TERMINATED）
- 加盟店名・契約番号で検索できる
- ページネーションで大量データに対応

### ストーリー4: 契約のステータス変更

**As a** 契約管理担当者
**I want to** 契約のステータスを変更する（DRAFT→ACTIVE, ACTIVE→SUSPENDED等）
**So that** 契約のライフサイクルを管理できる

**受け入れ条件:**
- 契約詳細画面からステータスを変更できる
- 有効なステータス遷移のみ許可される
- ステータス変更がcontract_changesに記録される（J-SOX）
- `contracts:update` 権限が必要

### ストーリー5: 契約の解約

**As a** 契約管理担当者
**I want to** 契約を解約（TERMINATED）する
**So that** 取引終了した契約をシステム上で管理できる

**受け入れ条件:**
- 契約詳細画面に「解約」ボタンがある
- 確認ダイアログが表示される
- 解約成功→ステータスがTERMINATEDに変更
- 解約がcontract_changesに記録される（J-SOX）
- `contracts:delete` 権限が必要

---

## 制約事項

### 技術的制約
1. **ステータス遷移ルール**: DRAFT→ACTIVE, ACTIVE→SUSPENDED, SUSPENDED→ACTIVE, ACTIVE→TERMINATED, SUSPENDED→TERMINATED のみ許可
2. **参照整合性**: 契約のmerchant_id/service_idは存在するアクティブな加盟店/サービスを参照
3. **監査記録**: 全変更をcontract_changesに記録（J-SOX）
4. **後方互換性**: 既存の加盟店管理機能に影響しない
5. **権限**: BFF DBに contracts/services 関連の権限が存在するか確認（V8/V9で定義済み）
6. **サービス権限**: services:read / services:create / services:update が必要（未定義の場合は追加）

---

## 成功の定義

1. サービスのCRUDが全サービスで正常動作
2. 契約のCRUD + ステータス管理が全サービスで正常動作
3. 監査記録（contract_changes）に全変更が記録される
4. 全サービスのテストがパス
5. E2Eテストがパス
6. 統合Docker Composeで動作確認

---

**作成日:** 2026-04-11
**作成者:** Claude Code
