# 承認履歴検索画面 実装レビュー報告

## Summary
- ステアリング: `.steering/20260414-approval-history-search/`
- 対象: Backend / BFF / Frontend / E2E + contracts (親リポ)
- レビュー実施: 2026-04-14 (team-lead Orchestrator + 4 並列 Explore レビュアー)
- ブランチ: `feature/approval-history-search`
- 最終 commit:
  - 親: `06b1194` (e2e login retry helper, 075191a7 submodule bump 含)
  - backend: `4d0ddfa`
  - bff: `45f7da6`
  - frontend: `826b07e`

## 総合結論

**✅ Ready to Merge** — Critical / High なし、Medium 2 件・Low 2 件。すべてスコープ外の将来改善または既知の構造的問題。

- Backend/BFF/Frontend/E2E すべて lint/type-check/test クリーン
- 新規テスト: Backend 13 / BFF 8 / Frontend 13 / E2E 5
- フルスイート E2E `--workers=1`: **41/41 pass** (既存 36 + 新規 5、デグレなし)
- contracts (proto + openapi) と実装の整合性 100%
- requirements.md の受け入れ条件すべて満たす
- Phase 2 既存 API (ListPendingApprovals / ListWorkflowsByContract / CountPendingApprovals) 破壊なし

---

## Issues Found

### Critical (0 件)
なし。

> **誤検出 1 件の記録**: Backend レビュアーが `defaultPageSize` 未定義を Critical として指摘したが、実際には `services/backend/internal/service/merchant_service.go:19` にパッケージスコープで定義済み。Go は同一パッケージ内の全ファイルから const を参照可能なため、approval_service.go からの参照は有効。go vet/test が通っていることで裏付けられる。

### High (0 件)
なし。

### Medium (2 件)

**M1. Frontend: 行クリックのキーボード操作対応なし**
- 場所: `services/frontend/src/components/approvals/ApprovalHistoryList.tsx:117-125`
- 問題: `<TableRow onClick={...}>` のみ実装。キーボードユーザーが Enter/Space で詳細画面に遷移できない。
- 影響: アクセシビリティ (WCAG 2.1.1 Keyboard)。
- 修正案: `<Link>` ラッパー、または `role="button"` + `onKeyDown` ハンドラ追加。既存 `ApprovalList.tsx` も同じパターンなので、併せて別タスクで横展開推奨。
- 優先度判断: **本 PR ではスコープ外** (既存実装との一貫性)、別タスクで a11y 横展開。

**M2. E2E: UI 文言依存セレクタ**
- 場所: `e2e/tests/contracts/approval-history-search.spec.ts:233, 277-278, 285-286, 314`
- 問題: `h2:has-text("承認履歴")` / `button[type="submit"]:has-text("検索")` / `select#status` など UI 文言・ID 依存。文言変更で break する脆弱性あり。
- 修正案: `getByRole("button", { name: "検索" })` 等 Playwright recommended locator への移行。Phase 3 spec でも同傾向なので、E2E 全体のセレクタ戦略として別タスクで統一推奨。
- 優先度判断: **本 PR では許容** (既存スイートと一貫)、将来タスクで統一。

### Low (2 件)

**L1. Backend: 契約番号部分一致 (ILIKE) の動作テスト不足**
- 場所: `services/backend/internal/service/approval_service_test.go`
- 問題: status / UUID / 日付 / pagination のテストはあるが、`contract_number` ILIKE 部分一致の正常系テストが欠落 (リポジトリ層モックで素通しのみ)。
- 修正案: `TestApprovalService_ListApprovalHistory_ContractNumberPartialMatch` 追加。E2E シナリオ 3 で end-to-end はカバー済みなので、単体で追加するなら repository layer。
- 優先度判断: **Low** (E2E でカバー済み)。

**L2. 設計書と実装の sqlc narg 記法差異**
- 場所: `services/backend/db/queries/approval.sql` vs `.steering/20260414-approval-history-search/design.md`
- 問題: design.md では `@requested_from::timestamptz IS NULL` の仮記法、実装は `sqlc.narg('requested_from')::timestamptz IS NULL` (sqlc nullable パラメータの正規記法)。
- 判断: **実装が正しい** (設計書が sqlc 流儀を反映していなかった)。
- 対応: 振り返りで design.md に注記するか、次回以降テンプレートを修正。

---

## Checklist Results

| カテゴリ | 結果 |
|---|---|
| 1. ステアリング準拠性 | ✅ 100% |
| 1.1 requirements.md 受け入れ条件 | ✅ 全 3 ストーリー満たす |
| 1.2 design.md 整合 | ✅ SQL/proto/openapi/component 構成一致 |
| 1.3 tasklist.md 全タスク完了 | ✅ Task #1〜#4 + 緩和策すべて completed |
| 2. 機能過不足 | ✅ スコープ内のみ、過剰実装なし |
| 3. API 契約準拠 | ✅ contracts ↔ 実装 100% 同期 |
| 4. 用語統一 (glossary) | ✅ 新規用語なし、既存用語 (承認履歴・ワークフロー) に準拠 |
| 5. セキュリティ | ✅ contracts:read 権限、UUID/ISO8601 検証、XSS/SQLi 対策、機密情報ログなし |
| 6. パフォーマンス | ✅ idx_approval_workflows_status/requested_at 活用、keepPreviousData、pagination |
| 7. J-SOX | ✅ 履歴閲覧 audit_log 対象 (approvals グループ)、`contracts:read` RBAC |
| 8. コード品質 | ✅ lint/type-check/test 全クリーン |
| 9. ドキュメント整合 | ✅ glossary 更新不要、service-contracts は proto/openapi 同期済み |

## Recommendations

1. **本 PR はこのままマージ可能**。Medium/Low は別タスク候補として残す。
2. **別タスク候補**:
   - 既存 ApprovalList も含めた行クリック a11y 横展開
   - E2E セレクタ戦略統一 (`getByRole` 優先)
   - approval_service_test に ILIKE 単体テスト追加 (任意)
3. **振り返りで扱う**:
   - Agent Teams フルメッシュ型 2 回目の A1/A2 依存ハンドオフ実効性 (ラグ測定結果)
   - 仕様明確タスクでの認識齟齬ゼロ達成の背景
   - design.md の sqlc 記法テンプレート改善

---

**レビュー実施日:** 2026-04-14
**レビュアー:** team-lead (Orchestrator) + 4 Explore sub-agents
