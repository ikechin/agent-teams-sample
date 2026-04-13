# 承認履歴検索画面 要求定義

## 目的

Phase 2 requirements.md で「実装しないもの」として保留されていた **「承認履歴の検索・
絞り込み機能」** の本実装。PENDING 以外 (APPROVED / REJECTED) を含む承認ワークフロー
履歴を、ステータス・日付範囲・契約番号・申請者でフィルタして一覧表示する画面を追加する。

**副次的な目的:** 真 Agent Teams の 2 回目運用検証。Phase 3 で明文化した A1/A2 依存
ハンドオフルール (Orchestrator 主導 wake-up DM) が、**合意形成フェーズを意図的に置かない
通常タスク** で機能するかを実測する。Phase 3 は D1-D4 を未確定に残した検証だったのに対し、
本タスクは仕様を明確に与えた上で「依存ハンドオフの運用」そのものを観察する。

**前提タスク:**
- Phase 2 完了: `.steering/20260412-contract-management-phase2/`
- Phase 3 完了: `.steering/20260413-approval-count-badge/`
- `approval_workflows` テーブル、`ApprovalService` gRPC (5 RPC)、`/api/v1/approvals` REST、
  承認管理画面、`useContractApprovals` フック、サイドバーバッジすべて実装済み

---

## スコープ

### 実装するもの

#### Backend Service
- **新規 gRPC RPC**: `ApprovalService.ListApprovalHistory`
  - リクエスト:
    - `status_filter` (string, 空文字なら全ステータス、`PENDING`/`APPROVED`/`REJECTED` を指定可)
    - `contract_number` (string, 部分一致、空文字なら無視)
    - `requester_id` (string, 完全一致、空文字なら無視)
    - `approver_id` (string, 完全一致、空文字なら無視)
    - `requested_from` (string, ISO8601 形式、空文字なら無視)
    - `requested_to` (string, ISO8601 形式、空文字なら無視)
    - `page` (int32, 1-indexed)
    - `limit` (int32, default 20, max 100)
  - レスポンス:
    - `workflows` (repeated `ApprovalWorkflowItem`、既存 message を再利用)
    - `pagination` (`common.Pagination`)
- **新規 SQL クエリ**: `ListApprovalHistory` + `CountApprovalHistory`
  - `requested_at DESC` 順でソート
  - フィルタ条件は空文字/null チェックで無視可能にする
  - 既存 `idx_approval_workflows_status` / `idx_approval_workflows_requested_at` を活用
- **service/grpc/repository/テスト** 追加
- `go vet` / `go fmt` / `go test ./...` クリーン

#### BFF Service
- **新規 REST エンドポイント**: `GET /api/v1/approvals/history`
  - クエリパラメータ: `status` / `contract_number` / `requester_id` / `approver_id` / `requested_from` / `requested_to` / `page` / `limit`
  - 権限チェック: `contracts:read` (承認権限なしでも閲覧可能)
  - audit_log: **対象** (既存 approvals グループ配下、履歴照会は監査対象とする方針)
- **OpenAPI yaml 更新**: 新規エンドポイント定義 + `ApprovalWorkflow` スキーマ再利用
- **ハンドラー + テスト** 追加
- proto 同期 + protoc 再生成
- `go vet` / `go fmt` / `go test ./...` クリーン

#### Frontend
- **新規ページ**: `/dashboard/approvals/history`
- **新規コンポーネント**:
  - `ApprovalHistoryFilters.tsx` — フィルタフォーム (ステータス select、日付範囲 picker、契約番号 text、ソートボタン)
  - `ApprovalHistoryList.tsx` — 結果表示 TableRow
- **新規フック**: `use-approval-history.ts` — `useQuery` + クエリパラメータ組み立て
- **Sidebar ナビ追加**: 「承認履歴」リンクを `contracts:read` 権限保持者に表示
- **既存の承認管理画面から遷移可能**: `/dashboard/approvals` ページに「履歴を見る」リンク追加
- **Zod スキーマ**: フィルタフォームバリデーション
- **テスト追加**: コンポーネントテスト + フックテスト
- `lint` / `type-check` / `test` クリーン

#### 親リポ (E2E + contracts)
- `contracts/proto/approval.proto` に `ListApprovalHistory` RPC 追加 (Orchestrator 事前作業)
- `contracts/openapi/bff-api.yaml` 更新 (Orchestrator 事前作業)
- **E2E テスト**: `e2e/tests/contracts/approval-history-search.spec.ts` 新規
  - 4〜5 シナリオ

### 実装しないもの
- **承認履歴の統計・ダッシュボード** (集計グラフ等) → 将来検討
- **CSV/Excel エクスポート** → 将来検討
- **全文検索** (要約フィールドの自由入力検索) → 将来検討
- **履歴の編集・削除** (監査証跡なので不可)

---

## ユーザーストーリー

### ストーリー1: 契約管理担当者が過去の承認履歴を確認できる

**As a** 契約管理担当者 (contracts:read 権限保持者)
**I want to** 過去に申請・承認された契約変更の履歴を検索して確認する
**So that** 特定の契約の変更経緯を追跡できる、監査対応や問い合わせ対応に利用できる

**受け入れ条件:**
- `/dashboard/approvals/history` にアクセスすると履歴一覧が表示される
- デフォルトは全ステータス、最新順 (requested_at DESC)、1 ページ 20 件
- ステータスフィルタで APPROVED / REJECTED / PENDING / 全て を切り替えられる
- 日付範囲で絞り込める (申請日 from-to)
- 契約番号で部分一致検索できる
- 申請者 ID (UUID) で絞り込める
- 結果行をクリックすると既存の承認詳細画面 `/dashboard/approvals/[id]` に遷移する
- ページネーションで次ページ/前ページに移動できる

### ストーリー2: 承認権限なしでも履歴閲覧できる

**As a** 一般ユーザー (contracts:read 権限のみ保持)
**I want to** サイドバーに「承認履歴」リンクが表示され、履歴を閲覧できる
**So that** 自分が関わった契約の変更状況を把握できる

**受け入れ条件:**
- `contracts:read` 権限があれば「承認履歴」リンクがサイドバーに表示される
- `contracts:approve` 権限がなくても履歴ページにアクセスできる
- ただし承認/却下ボタンは表示されない (既存の `/dashboard/approvals/[id]` の挙動を継承)

### ストーリー3: 既存の承認管理画面から履歴へ遷移できる

**As a** 承認者
**I want to** 承認管理画面から承認履歴へワンクリックで遷移する
**So that** 「PENDING 以外」も含めた全履歴を確認できる

**受け入れ条件:**
- `/dashboard/approvals` ページ上部に「履歴を見る」リンクが配置される
- リンククリックで `/dashboard/approvals/history` に遷移

---

## 制約事項

### 技術的制約
1. **Phase 2 / Phase 3 の既存 API を破壊しない**: `ListPendingApprovals` / `ListWorkflowsByContract` / `CountPendingApprovals` はそのまま維持
2. **既存の Backend SQL クエリ `ListPendingApprovals` は変更しない** (Phase 2 review で status='PENDING' ハードコードを記録した経緯があるが、今回は新規クエリを追加する)
3. **既存インデックスを活用**: `idx_approval_workflows_status` / `idx_approval_workflows_requested_at` で日付範囲 + ステータス検索はカバーできる想定
4. **audit_log 対象**: 履歴照会は既存 approvals グループ (audit 対象) に含める。Phase 3 の `pending-count` のような AuditLog スキップは**行わない** (監査担当者が誰が履歴にアクセスしたかを追跡できるようにする)

### ビジネス制約
1. **J-SOX**: 承認履歴の閲覧も監査対象 (audit_log 記録)
2. **権限**: `contracts:read` のみで閲覧可能 (承認権限は不要)
3. **UI 一貫性**: 既存の `/dashboard/approvals` と同じデザインパターン (ApprovalStatusBadge 再利用、TableRow クリックで詳細遷移)

### 🎯 Agent Teams 検証制約 (本タスク固有)

1. **真 Agent Teams (TeamCreate + team_name) を使う** — Phase 3 と同じ正規運用
2. **並列実行** — Backend / BFF / Frontend / E2E 全 4 Agent を並行起動
3. **Phase 3 との差異**:
   - Phase 3: D1-D4 を意図的に未確定 → 合意形成フェーズを組み込み
   - **本タスク**: 仕様を明確に与える → 合意形成ではなく「依存ハンドオフ」と「並列実行効率」を検証
4. **Orchestrator の wake-up DM を観察**:
   - 上流 Agent (Backend) が `TaskUpdate(completed)` した瞬間に下流 (BFF) に DM を送れるか
   - BFF 完了 → Frontend wake-up
   - Frontend 完了 → E2E wake-up
   - ラグ (秒単位) を振り返りで計測
5. **並列実行の境界**:
   - Backend: proto 確定前でも SQL クエリ設計・テスト骨格の準備は可能
   - BFF: Backend proto 確定後に実装本格化、それまでは OpenAPI 設計・テスト骨格の準備
   - Frontend: BFF OpenAPI 確定後に型再生成・実装本格化、それまでは UI モック・コンポーネント設計
   - E2E: 他 3 Agent 完了後に実装 (シナリオ設計は並行可能)

---

## 成功の定義

### 機能面
1. 承認履歴一覧が `/dashboard/approvals/history` で表示される
2. 5 種類のフィルタ (status, contract_number, requester_id, approver_id, 日付範囲) が動作
3. ページネーションが動作
4. 既存の `/dashboard/approvals` から遷移可能
5. 全サービスの単体テスト全パス
6. E2E テスト全パス (4〜5 シナリオ)
7. 既存 E2E フルスイートがデグレしない
8. 統合 Docker Compose で動作確認

### Agent Teams 検証面
1. 4 Agent が正しく team_name で spawn され、相互 DM 可能
2. **Orchestrator の依存ハンドオフが機能** — 上流完了 → 下流 wake-up のラグが
   「Orchestrator が明示介入した場合に 1〜2 ターン以内」に収まる
3. **Phase 3 との比較**:
   - 認識齟齬数 (Phase 3 は 1 件 = エンドポイント名差異): 目標ゼロ
   - Orchestrator 介入回数: Phase 3 より増える想定 (合意形成なしで直接指示が増える) か、A1/A2 ルールにより逆に減るか
   - 実装時間: Phase 3 (約 2 時間) と比較
4. 振り返りで「並列 Agent Teams の効率性」を定量評価

---

**作成日:** 2026-04-14
**作成者:** Claude Code
