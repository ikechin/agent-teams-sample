# 契約管理 Phase 2 - 承認ワークフロー 要求定義

## 目的

契約金額変更時の承認ワークフロー機能を実装し、J-SOX要件に基づく職務分掌（Segregation of Duties）を実現する。
申請者と承認者を分離することで、不正な金額変更を防止し、監査証跡を確保する。

**前提タスク:**
- Phase 1完了済み: `.steering/20250411-contract-management-phase1/`
- サービス管理CRUD、契約管理CRUD、ステータス遷移バリデーションが実装済み
- Backend CLAUDE.md に `approval_workflows` テーブル設計が既に存在

---

## スコープ

### 実装するもの

#### A. 承認ワークフロー基盤

##### Backend Service
- **DBマイグレーション**: `approval_workflows` テーブル作成（V8）
- **Protocol Buffers定義**: `contracts/proto/approval.proto` 新規作成
- **gRPC RPC追加（ApprovalService）**
  - `ListPendingApprovals` - 承認待ち一覧取得（ページネーション）
  - `GetApprovalWorkflow` - 承認詳細取得
  - `ApproveContract` - 承認実行（契約更新 + ワークフロー完了）
  - `RejectContract` - 却下実行（却下理由必須 + ワークフロー却下）
- **ContractService修正**
  - `UpdateContract`: 金額変更（monthly_fee/initial_fee）検出時は承認ワークフロー作成を返す
  - DRAFTステータスの契約は承認不要（自由に変更可）
- **職務分掌チェック**: 申請者と承認者が同一人物の場合は承認不可
- **監査記録**: ワークフロー作成・承認・却下をcontract_changesに記録
- **テスト追加**

##### BFF Service
- **RESTエンドポイント追加**
  - `GET /api/v1/approvals` - 承認待ち一覧（ページネーション + 自分が申請した承認の除外オプション）
  - `GET /api/v1/approvals/:id` - 承認詳細
  - `POST /api/v1/approvals/:id/approve` - 承認実行
  - `POST /api/v1/approvals/:id/reject` - 却下実行
- **権限チェック**: `contracts:approve` 権限を持つロールのみアクセス可能
- **BFF DBマイグレーション**: `contracts:approve` 権限のロール割り当て確認（V13、既存なら不要）
- **OpenAPI仕様更新**: `contracts/openapi/bff-api.yaml`
- **ContractHandler修正**
  - `UpdateContract`: Backendからの FailedPrecondition レスポンスを適切にハンドリング
  - 承認ワークフロー作成情報をフロントエンドに返す（status: 202 Accepted）
- **テスト追加**

##### Frontend
- **サイドバーに「承認管理」追加**（contracts:approve 権限持ちのみ表示）
- **承認待ち一覧画面**（`/dashboard/approvals`）
  - 承認待ちワークフロー一覧表示
  - 契約番号、加盟店名、サービス名、申請者、申請日時、変更内容サマリー
- **承認詳細画面**（`/dashboard/approvals/[id]`）
  - 変更前後の値を並べて表示（old_values vs new_values）
  - 承認ボタン、却下ボタン
  - 却下時の理由入力フォーム
- **契約編集画面の挙動変更**
  - 金額変更時、「承認申請する」というボタン文言に変更
  - 送信後、「承認待ちです」のステータス表示
- **契約詳細画面に承認状態バッジ追加**（承認待ちの場合）
- **テスト追加**

#### B. 親リポジトリ
- **Proto定義**: `contracts/proto/approval.proto` 新規作成
- **OpenAPI仕様更新**: `contracts/openapi/bff-api.yaml`
- **E2Eテスト**: 承認ワークフローのE2Eテスト
- **glossary.md更新**: 新規用語追加

### 実装しないもの
- 複数段階承認（階層的な承認フロー）→ 将来検討
- 承認委任機能（代理承認者の設定）→ 将来検討
- 承認期限・自動却下機能 → 将来検討
- メール・Slack通知 → 将来検討
- 承認履歴の検索・絞り込み機能（Phase 2では一覧表示のみ）

---

## ユーザーストーリー

### ストーリー1: 契約金額変更の承認申請

**As a** 契約管理担当者（contract-manager ロール）
**I want to** 契約の金額を変更する際に承認申請を出す
**So that** 職務分掌を守りながら金額変更を行える

**受け入れ条件:**
- 契約編集画面で金額（月額料金、初期費用）を変更できる
- 保存ボタンクリック時、「承認申請中」のステータスでワークフローが作成される
- 契約自体はまだ変更されていない（承認待ち）
- 申請者の user_id がワークフローに記録される
- ワークフロー作成が contract_changes に記録される（J-SOX）
- `contracts:update` 権限が必要

### ストーリー2: 承認待ち一覧の確認

**As a** 承認者（contracts:approve 権限保持者）
**I want to** 自分が承認すべきワークフロー一覧を確認する
**So that** 未処理の承認業務を把握できる

**受け入れ条件:**
- `/dashboard/approvals` にアクセスすると承認待ち一覧が表示される
- 自分が申請したワークフローは除外される（職務分掌）
- 一覧には契約番号、加盟店名、申請者、申請日時、変更サマリーが表示される
- ページネーションで大量データに対応
- `contracts:approve` 権限がないとアクセスできない

### ストーリー3: 承認実行

**As a** 承認者
**I want to** 承認待ちワークフローを承認する
**So that** 契約金額変更を確定できる

**受け入れ条件:**
- 承認詳細画面で変更前後の値を並べて確認できる
- 「承認」ボタンをクリックすると承認が実行される
- 契約が新しい値で更新される
- ワークフローのステータスが APPROVED に変わる
- approver_id と approved_at が記録される
- 承認実行が contract_changes に記録される（J-SOX）
- 申請者と同一人物は承認できない（403エラー）
- `contracts:approve` 権限が必要

### ストーリー4: 却下実行

**As a** 承認者
**I want to** 承認待ちワークフローを却下する
**So that** 不適切な変更を差し戻せる

**受け入れ条件:**
- 承認詳細画面で「却下」ボタンをクリックすると却下フォームが表示される
- 却下理由の入力が必須
- 却下実行後、ワークフローのステータスが REJECTED に変わる
- 契約は変更されない
- rejection_reason が記録される
- 却下実行が contract_changes に記録される（J-SOX）
- 申請者と同一人物は却下できない（403エラー）

### ストーリー5: 承認状態の確認

**As a** 申請者
**I want to** 自分が申請した承認ワークフローの状態を確認する
**So that** 申請が処理されたか把握できる

**受け入れ条件:**
- 契約詳細画面に承認状態バッジが表示される（PENDING/APPROVED/REJECTED）
- 却下された場合、却下理由が表示される
- 却下後は再度編集できる（新しいワークフローが作成される）

---

## 制約事項

### 技術的制約
1. **ステータス遷移ルール**: Phase 1のステータス遷移ルールを維持
2. **金額変更の検出**: `monthly_fee` または `initial_fee` のいずれかに変更がある場合に承認フロー作動
3. **DRAFTステータスの例外**: DRAFTステータスの契約は承認不要（自由に変更可、テンプレート的な扱い）
4. **職務分掌**: 申請者と承認者は必ず別人物（DB制約orアプリケーション制約）
5. **却下後の再申請**: 却下後は新しいワークフローを作成（古いワークフローはREJECTEDのまま残る）
6. **承認ワークフロー中の契約ロック**: 承認待ちの契約は他の金額変更を受け付けない（二重申請禁止）
7. **同時変更制限**: 金額変更以外のフィールド（日付、ステータス等）も承認待ち中は変更不可
8. **監査記録**: 全変更をcontract_changesに記録（J-SOX）

### ビジネス制約
1. **J-SOX要件**: 申請者≠承認者の職務分掌を厳守
2. **後方互換性**: 既存のPhase 1機能に影響しない（金額以外の変更は従来通り）
3. **権限**: `contracts:approve` 権限が必要（system-admin, contract-approver等）

---

## 成功の定義

1. 契約金額変更時に承認ワークフローが作成される
2. 承認者が承認/却下できる（申請者自身は不可）
3. 承認成功時、契約が新しい値で更新される
4. 却下時、契約は変更されず理由が記録される
5. 監査記録（contract_changes）に全アクションが記録される
6. 全サービスのテストがパス
7. E2Eテストがパス
8. 統合Docker Composeで動作確認

---

**作成日:** 2026-04-12
**作成者:** Claude Code
