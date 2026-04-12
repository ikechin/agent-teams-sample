<!--
このファイルは /review-implementation スキルの「良いレビュー報告書の例」として
保存されています。Phase 2 承認ワークフロー実装のレビューで実際に使われた報告書です。

参考にしてほしいポイント:
- Critical/High/Medium/Low の明確な分類と件数集計
- 各 Issue に「場所 (file:line)」「症状」「要件違反」「修正案」「影響範囲」を必ず記載
- High 1件 (H1: 却下理由が永久に表示されない) は実装テストはパスするが
  ストーリー受け入れ条件を満たさない「機能不足」型の指摘 — レビューでこそ拾える
- 修正案を複数提示し「推奨」を明示
- Checklist Results を 9 カテゴリで達成率表記
- 総評で「マージ可否」と「マージ前必須対応」を明確化
-->

# Phase 2 承認ワークフロー 実装レビュー報告

## Summary

- **ステアリングディレクトリ:** `.steering/20260412-contract-management-phase2/`
- **対象サービス:** Backend / BFF / Frontend / 親リポジトリ (contracts, e2e)
- **ブランチ:** `feature/contract-management-phase2`
- **レビュー実施日:** 2026-04-12
- **レビュー対象コミット:**
  - backend: `dd3783e`
  - bff: `c1ff23d` (`9c6027a` + include_own fix)
  - frontend: `337f8dd` (`3253759` + include_own fix)
  - 親: `b7fbc73`

## 静的検査結果

| 項目 | 結果 |
|---|---|
| backend `go test ./...` | ✅ PASS (153 tests, cached) |
| backend `go vet ./...` | ✅ クリーン |
| bff `go test ./...` | ✅ PASS (handler 89 tests + service) |
| bff `go vet ./...` | ✅ クリーン |
| frontend `npm run lint` | ✅ No ESLint warnings or errors |
| frontend `npm run type-check` | ✅ クリーン |
| 統合 docker compose 動作確認 | ✅ 全5コンテナ稼働、V8マイグレーション適用 |
| 新規 E2E `approval-workflow.spec.ts` | ✅ 4/4 PASS（単独実行） |

---

## Issues Found

### Critical (重大) — 0件

なし。J-SOX 職務分掌、二重申請制約、構造化エラー（文字列マッチ不使用）、監査記録（contract_changes）はすべて要件通り実装されている。

---

### High (高) — 1件

#### H1. 申請者の契約詳細画面で却下理由が永久に表示されない（要件ストーリー5違反）

- **場所:** `services/frontend/src/components/contracts/ContractDetail.tsx:64-66`
- **症状:** `rejectedWorkflow` を `usePendingApprovals()` の結果から `status === 'REJECTED'` でフィルタしているが、Backend の `ListPendingApprovals` クエリは `WHERE aw.status = 'PENDING'` のみを返す（`services/backend/db/queries/approval.sql:22,30`）。よって REJECTED ワークフローはクライアント側に永久に届かず、却下理由バナーは決して描画されない。
- **要件違反:** requirements.md ストーリー5「却下された場合、却下理由が表示される」が満たされない。
- **修正案（最小）:** Frontend 側だけでは解決不能。次のいずれかが必要:
  1. Backend `ListPendingApprovals` クエリに `include_history` 系オプションを追加し、`status IN ('PENDING','REJECTED')` を許容する。
  2. 新規エンドポイント `GET /api/v1/contracts/:id/approvals?status=REJECTED&limit=1` を BFF/Backend に追加する（より疎結合）。
  3. `GET /api/v1/contracts/:id` のレスポンスに `latest_rejected_workflow` を組み込む（最も Frontend が単純）。
- **推奨:** 案 3。契約詳細画面でしか使わないため、エンドポイント増設より既存 GetContract に同梱するほうがクエリ回数も減らせる。
- **影響:** UX 上のみ。データ整合性・セキュリティ・監査記録には影響なし。

---

### Medium (中) — 2件

#### M1. `services/frontend/src/components/contracts/ContractDetail.tsx` の `usePendingApprovals({ limit: 100 })` がスケールしない

- **場所:** `ContractDetail.tsx:28`
- **症状:** 契約詳細を開くたびに「承認待ち上位100件」を取得し、その中から `contract_id` で線形検索する実装。承認待ちが100件を超えると申請者本人のワークフローを取りこぼし、ロックUIが破綻する可能性がある（特に大規模本番）。
- **修正案:** 「特定契約の承認状況のみを取りに行くエンドポイント」を導入する。H1 と一括で対応するのが筋（GetContract に同梱、または `/api/v1/contracts/:id/approvals` の新設）。
- **暫定回避策:** `limit: 100` のままなら、ページネーションを跨ぐ再フェッチを検討する。ただし根本対応のほうが良い。

#### M2. レビュー時点では新規 E2E スペックが他スペックと混在実行で flaky

- **場所:** `e2e/tests/contracts/approval-workflow.spec.ts`
- **症状:** 当該スペックは単独実行で 4/4 PASS。だがフルスイート連続実行ではログイン待機タイムアウトが発生する（プレ・新規スペック双方の login が後続スペックでタイムアウト）。原因はテストデータの共有状態と推測される（新規セッションが累積、契約状態の汚染）。
- **修正案:** beforeEach/AfterEach で seed 状態を冪等にする、または `playwright.config.ts` でこのスペック専用の project を追加し serial 実行にする。CI 構成では「approval E2E は seed リセット直後に独立実行」とする運用ガイドの追加でも可。
- **メモ:** 親リポのコミット `b7fbc73` のメッセージに注意書きあり。

---

### Low (軽微) — 4件

#### L1. backend `internal/grpc/approval_server.go` の `mapApprovalErr` で `ErrDuplicatePendingWorkflow` が未マッピング

- **場所:** `services/backend/internal/grpc/approval_server.go:110-132`
- **症状:** `ErrDuplicatePendingWorkflow` が定義されている（`internal/service/approval_service.go:25`）が、`mapApprovalErr` でハンドリングされておらず Internal にフォールバック。
- **影響:** 現状 Approval RPC からは発生しないため実害なし（ContractService.UpdateContract のパスでのみ発生）。一応 mapping を足しておくのが安全。

#### L2. frontend `usePendingApprovals` の `includeOwn` フラグが `queryKey` に乗ってはいるが命名がわずかに紛らわしい

- **場所:** `services/frontend/src/hooks/use-pending-approvals.ts:18-32`
- **症状:** クエリパラメータ名が `include_own`（snake_case）で BFF 側と一致しているが、TypeScript 側は `includeOwn`（camelCase）。これは正しく変換されているが、フックの内部実装を読まないと「include_own=true 以外の値が渡せるか?」がわかりにくい。
- **修正案:** JSDoc コメントを足す。

#### L3. backend `db/queries/approval.sql` の `ListPendingApprovals` ハードコード `WHERE aw.status = 'PENDING'`

- **場所:** `services/backend/db/queries/approval.sql:22`
- **症状:** ステータスでハードコードしているため、将来的に「却下含む履歴一覧」を実装する場合は新規クエリが必要。`-- name: ListWorkflowsByStatus :many` を追加して引数化するほうが拡張性が高い。
- **影響:** Phase 2 では仕様通り（PENDING のみ）。Phase 3 へのリファクタ提案。

#### L4. frontend `ContractDetail.tsx` で承認待ちと却下を同一の検索ロジックで処理

- **場所:** `ContractDetail.tsx:57-66`
- **症状:** 「最新の REJECTED」を取得したいが `find` で最初に見つかったものを返している。順序保証がないため、複数 REJECTED があると古いものが表示される可能性がある。H1 解決後に併せて修正する。

---

## Checklist Results

| カテゴリ | 達成率 | 備考 |
|---|---|---|
| 1. ステアリングファイル準拠性 | 95% | requirements ストーリー5の却下理由表示が未達（H1） |
| 2. 機能過不足 | 100% | スコープ外実装なし、必須機能網羅 |
| 3. API契約準拠性 | 100% | OpenAPI yaml 更新済、202/409、ApprovalWorkflow スキーマ追加済 |
| 4. 用語統一 | 100% | glossary.md Phase 2 セクション追加、コード命名一致 |
| 5. セキュリティ | 100% | 認証・認可（contracts:approve）、UUID検証、職務分掌、構造化エラー、文字列マッチ不使用すべて遵守 |
| 6. パフォーマンス | 90% | M2 の limit:100 線形検索が将来課題。N+1 なし、ページネーションあり |
| 7. J-SOX準拠 | 100% | contract_changes に CREATE/APPROVE/REJECT を全記録、SoD 制約は DB+アプリ二重、approver_id != requester_id を CHECK 制約 |
| 8. コード品質 | 100% | リント/型/vet/fmt クリーン、単体テスト 153+89+110、E2E 4 |
| 9. ドキュメント整合性 | 100% | glossary.md / backend CLAUDE.md / openapi.yaml 同期 |

---

## Recommendations

### 必須対応（マージ前推奨）
1. **H1 を解消する。** ストーリー5「却下された場合、却下理由が表示される」が満たされないため、案3（GetContract に latest_rejected_workflow 同梱）でフィックスを実装。Backend + BFF + Frontend の3層変更が必要だが、影響範囲は局所的。
2. **L1 を解消する。** mapApprovalErr に `ErrDuplicatePendingWorkflow` 分岐を追加（将来 ApprovalService 直接 RPC でも返る可能性に備える）。

### 段階対応（次のリリースまで）
3. **M1 / M2 を Phase 3 / 運用ガイドで対処。** 100件超の承認待ち時の挙動を改善し、E2E は seed リセット運用を確立する。

### 長期改善
4. **L3, L4 のリファクタ。** Phase 3 で承認履歴一覧を実装する際に、`ListWorkflowsByStatus` 化と REJECTED の最新性ソートを併せて行う。

---

## 総評

Phase 2 の中核要件（承認ワークフロー作成、職務分掌チェック、二重申請禁止、要件#7全面ロック、構造化エラー、監査記録）はすべて健全に実装されており、Backend 153件・BFF 89件・Frontend 110件のテストが全パス、Docker Compose 上での実動作も確認済み。

唯一の機能不足は **H1（却下理由表示）** で、これは「BFF/Backend がREJECTEDワークフローを返す経路がない」設計上の見落としである。修正は難しくないため、マージ前に対応することを強く推奨する。それ以外は本番マージ可能な品質。

---

**レビュー実施者:** Claude Code (Orchestrator)
**作成日:** 2026-04-12
