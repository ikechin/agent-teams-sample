# Implementation Review Report

## Summary

- **ステアリングディレクトリ:** `.steering/20260413-approval-count-badge/`
- **対象サービス:** Backend / BFF / Frontend / E2E / 親リポ (contracts, e2e)
- **ブランチ:** `feature/approval-count-badge`
- **レビュー実施日:** 2026-04-13
- **レビュー対象コミット:**
  - backend: `7edff0d`
  - bff: `8376ed4`
  - frontend: `963ee1a`
  - 親リポ: `4deb867` (submodule refs) + `b02c6e5` (E2E) + `d57fcde` (OpenAPI) + `26d85c5` (proto)

## 静的検査結果

| 項目 | 結果 |
|---|---|
| backend `go test ./...` | ✅ PASS |
| backend `go vet ./...` | ✅ クリーン |
| bff `go test ./...` | ✅ PASS (handler 0.311s) |
| bff `go vet ./...` | ✅ クリーン |
| frontend `npm run lint` | ✅ No warnings/errors |
| frontend `npm run type-check` | ✅ クリーン |
| frontend `npm test` | ✅ **115/115** (前回 110 → +5) |
| E2E フルスイート (`--workers=1`) | ✅ **36/36** (31 既存 + 5 新規、デグレなし) |
| AuditLog スキップ実機動作確認 | ✅ 成功 (5 pending-count calls → 0 audit rows, 対照: ListPendingApprovals 1 call → 1 audit row) |

## 実装規模

| リポ | ファイル変更 | 挿入 | 削除 |
|---|---|---|---|
| backend | 6 | 263 | 24 |
| bff | 6 | 374 | 24 |
| frontend | 7 | 219 | 3 |
| 親リポ | 6 | 262 | 3 |
| **合計** | **25** | **1,118** | **54** |

---

## Issues Found

### 🔴 Critical (重大) — 0 件

なし。

### 🟠 High (高) — 0 件

なし。

### 🟡 Medium (中) — 0 件

なし。

### 🟢 Low (軽微) — 1 件 (✅ 修正済み)

#### L1. BFF ハンドラーの `c.Get("user_id")` キャストエラー時のメッセージ — ✅ **修正済み** (bff `bef3e64`)

- **場所:** `services/bff/internal/handler/approval_handler.go:GetPendingCount`
- **症状:** `userID, ok := c.Get("user_id").(uuid.UUID)` が失敗した場合、元々は 401 "Not authenticated" を返していた。しかし `AuthMiddleware` は常に `uuid.UUID` 型で `user_id` を設定するため、キャスト失敗は**プログラマエラー** (middleware 未適用・テスト設定不備等) に相当し、401 は誤ったセマンティクスだった。
- **修正内容:**
  - 401 → **500 Internal Server Error** に変更
  - ERROR レベルで詳細ログを出力 (`zap.Any("user_id_value", c.Get("user_id"))` でデバッグ可能)
  - インラインコメントで根拠を明記 (「プログラマエラー vs 認証失敗」の区別)
  - テストを `TestGetPendingCount_NotAuthenticated` → `TestGetPendingCount_MissingUserIDContext_ReturnsInternalError` にリネームし、期待値を 500 に変更
- **スコープ:** 新規追加の `GetPendingCount` のみに適用。既存の `ListPendingApprovals` 等は従来パターンのまま (スコープ外、将来の別タスクで handler パッケージにヘルパー集約予定)。
- **検証:** `go test ./internal/handler/...` 全パス、`go vet` / `go fmt` クリーン。

---

## Checklist Results

| カテゴリ | 達成率 | 備考 |
|---|---|---|
| 1. ステアリング準拠性 | **100%** | requirements / design / tasklist の D1-D4 合意・実装・検証すべて対応 |
| 2. 機能過不足 | **100%** | スコープ外実装なし、YAGNI 遵守 (NavBadge 抽出しない) |
| 3. API契約準拠性 | **100%** | OpenAPI yaml と実装レスポンス `{count: number}` 一致、proto も整合 |
| 4. 用語統一 | **100%** | Phase 2 の用語で足りる (新規用語なし、glossary 更新不要) |
| 5. セキュリティ | **100%** | `contracts:approve` 権限チェック / SoD 自動適用 / enabled ガードで 401/403 予防 / Frontend retry:false |
| 6. パフォーマンス | **100%** | COUNT クエリは `idx_approval_workflows_status` 経由、N+1 なし、30s polling + staleTime / refetchIntervalInBackground:false で無駄打ち回避 |
| 7. J-SOX 準拠 | **100%** | 参照系 GET を audit_log 対象外にする判断を明示的に行い、コードコメントで根拠を残す。変更操作 (approve/reject) は既存通り完全に監査される |
| 8. コード品質 | **100%** | 全サービス lint / vet / fmt / test クリーン、23 新規テスト |
| 9. ドキュメント整合性 | **100%** | OpenAPI 更新、design.md に J-SOX 判断記録あり、コード内コメントで設計判断を追跡可能 |

---

## ハイライト (特筆すべき良い実装)

### ✨ H1. BFF の AuditLog スキップ実装

`cmd/server/main.go` と `approval_handler.go` の両方に J-SOX 判断根拠がインラインコメントとして残されており、将来のメンテナーが「なぜこのエンドポイントだけ別グループなのか」を読み解ける。コードが自己文書化されている好例。

```go
// Polling-optimized endpoint (no audit log, read-only).
// J-SOX rationale: the audit trail targets state-changing operations.
// High-frequency read-only polling (e.g. badge count refresh every 30s)
// would dilute the audit log signal and bury significant events.
```

### ✨ H2. Frontend の `enabled` ガードによる 401/403 予防

```typescript
const canApprove = user?.permissions?.includes('contracts:approve') ?? false;
return useQuery({
  enabled: canApprove,
  retry: false,
  // ...
});
```

権限のないユーザーには **そもそもリクエストが飛ばない** ため、サーバー側で 403 を返す必要がなく、ログ汚染・ネットワーク負荷・レートリミット消費をゼロに抑えられる。「セキュリティは深層防御」の良い実践。

### ✨ H3. E2E の `storageState` による rate limit 回避

実装中に frontend の UI ログイン方式では rate limit (10/min/IP) を踏んでフルスイートで既存の `service-crud.spec.ts` を崩壊させると発見 → **API ログイン 1 回 → `apiCtx.storageState()` → `browser.newContext({ storageState })` 注入** で解決。このパターンは将来の E2E タスクでもテンプレート化できる貴重な知見。

### ✨ H4. 実機 AuditLog スキップ検証

レビュー時点で実機対照実験を実施:
- `pending-count` × 5 回 → audit_logs +0 行
- `ListPendingApprovals` × 1 回 → audit_logs +1 行

**単体テストでは検証できない middleware 構成** を Orchestrator が Docker Compose 経由で最終確認した。BFF Agent の完了報告で明示的に「統合確認を Orchestrator に委ねる」と言及していた点を受けて実施しており、Agent 間の責任分界が機能している。

### ✨ H5. Agent Teams 動作検証の成果

このタスクは真の Agent Teams (`TeamCreate` + `team_name` + `SendMessage` 自動配信) の初運用検証を兼ねており、以下が実測できた:

1. **認識齟齬ゼロ** — Phase 2 の H1 と同質の論点 (D1 include_own) が、実装開始前に 3 Agent 間 DM で合意
2. **実装中の暗黙前提発掘** — BFF Agent が audit_log middleware の GET 発火を発掘して案A 提案 (Phase 2 では見られなかった挙動)
3. **認識差異の即時検知** — Frontend と BFF のエンドポイント名差異 (`count` vs `pending-count`) を Orchestrator が Peer DM サマリから即座に検知し訂正
4. **Agent 自律解決** — E2E Agent が rate limit 衝突を Orchestrator 介入なしで `storageState` 方式に切り替えて解決

---

## Recommendations

### 必須対応 (マージ前)

なし。Critical / High / Medium 指摘がないため、現状のままマージ可能。

### 任意対応 (次回以降の検討)

1. **L1 のリファクタ** — `c.Get("user_id")` キャストエラー時の扱いを `middleware/auth.go` で不変条件化する。今回のタスクスコープ外。
2. **将来の audit_log スコープ見直し** — BFF Agent と Backend Agent が指摘した以下も将来の検討候補:
   - `GET /api/v1/auth/me` (セッションチェック用途)
   - 既存 `GET /api/v1/approvals` (`ListPendingApprovals`)
   - 一覧系 GET (`merchants`, `services`, `contracts`)
3. **観測計装** — `audit_logs` テーブル肥大化の監視メトリクス追加 (本タスクで肥大化リスクを認識したので予防線として)

---

## 総評

**Critical / High / Medium 指摘ゼロの綺麗な実装**。機能要件はすべて満たされ、パフォーマンス・セキュリティ・J-SOX すべてに配慮がある。さらに以下の点で Phase 2 と比較して顕著な質の向上が見られる:

- **設計判断の自己文書化**: コード内に J-SOX rationale がコメントとして残されており、ドキュメントを追わずに実装意図が読める
- **テストの充実**: 23 新規テスト (Backend 7 + BFF 6 + Frontend 5 + E2E 5) がすべて PASS、E2E は SoD 検証 (mock capture) と実機フローの両方
- **実機検証**: 単体テストでは拾えない middleware 構成を Docker Compose で最終確認
- **Agent Teams の実運用成功**: 真の `TeamCreate` + `team_name` + 自動配信を初めて完走、Phase 2 の認識齟齬問題を根本解消

**マージ可能品質。** PR 作成 (`/prepare-pr`) に進んで問題ありません。

---

**レビュー実施者:** Claude Code (Orchestrator / team-lead)
**作成日:** 2026-04-13
