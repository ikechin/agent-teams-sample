# Steering Review Report

## Summary
- **ステアリング:** `.steering/20260414-approval-history-search/`
- **レビュー実施日:** 2026-04-14
- **判定:** ✅ 承認
- **Agent Teams 準備状態:** ✅ Ready

## Checklist Results

| カテゴリ | 結果 | 備考 |
|---|---|---|
| 1. 構造・完全性 | ✅ | 3 ファイル揃い、必須セクション完備 |
| 2. 3 ファイル間整合性 | ✅ | requirements の「実装するもの」がすべて design + tasklist に展開済み |
| 3. 既存ドキュメント整合性 | ✅ | glossary 更新不要、system-architecture と矛盾なし、既存権限 (`contracts:read`) seed 済み |
| 4. API 契約・DB 設計 | ✅ | proto/openapi の追加形式、SQL クエリ詳細、既存インデックス活用方針明記 |
| 5. タスクリスト品質 | ✅ | 4 Agent 分担明確、wake-up チェーンと準備/実装の 2 段構成 |
| 6. リスク・実現可能性 | ⚠️ | 日付範囲 + ステータスの複合クエリでパフォーマンス懸念あり (容認範囲) |
| 7. Agent Teams 準備状態 | ✅ | 前提条件・環境・CLAUDE.md すべて揃っている |

---

## Issues Found

### ❌ 要修正 (実装前に必ず修正) — 0 件

なし。

---

### ⚠️ 修正推奨 — 2 件

#### W1. 日付範囲 + ステータス複合クエリのパフォーマンス懸念

- **場所:** `design.md` の `ListApprovalHistory` SQL クエリ
- **症状:** 既存インデックスは `idx_approval_workflows_status` (単一カラム) と
  `idx_approval_workflows_requested_at` (単一カラム DESC) のみ。日付範囲 + ステータス
  の複合フィルタでは **どちらか片方のインデックスしか使われず**、件数が多いと
  遅くなる可能性がある。
- **容認理由:** 現状の想定データ量 (1000 件以下 / 承認ワークフロー全履歴) では
  単一インデックス + filter で十分高速。複合インデックス追加は YAGNI。
- **モニタリング提案:** E2E 後に本番相当のデータ量 (例: 5000 件以上) で負荷試験を
  行い、500ms 以内を満たせない場合に `CREATE INDEX ON approval_workflows (status, requested_at DESC)`
  を追加検討する。今回のタスクスコープ外。
- **対応:** 現状のままで OK。振り返りで言及する程度に留める。

#### W2. E2E シナリオ4 (権限制御) の実装方針

- **場所:** `tasklist.md` E2E Agent セクション、シナリオ4
- **症状:** 「`contracts:read` なしロール」が既存 seed に存在しない (system-admin /
  contract-manager / sales / viewer すべてに contracts:read 付与済み) ため、そのまま
  では「権限なし」のテストができない。
- **対応オプション:**
  - **案A (推奨):** シナリオ4 の内容を「`contracts:read` あり (viewer) でサイドバーに
    『承認履歴』が表示され、アクセスできる」に変更し、権限なしテストを省略
  - **案B:** 動的に権限なしロール `no-contracts-read` を docker exec で作成 (複雑)
  - **案C:** 案A に加えて、BFF ハンドラの権限チェックは単体テスト側でカバー
- **推奨:** **案A + 案C の組み合わせ**。E2E では viewer の閲覧可能シナリオで満足、
  権限拒否は BFF のハンドラテストで網羅する。tasklist に明記すべき。

---

### ℹ️ 情報 (参考) — 3 件

#### I1. `approvals` グループへのルート追加は既存構造と整合

`services/bff/cmd/server/main.go:219` で既存 `approvals` グループ (AuditLog 対象) と
`approvalsPolling` グループ (AuditLog 除外) がすでに分離されている (Phase 3 で追加)。
本タスクの `/history` は前者に追加するだけで良く、既存構造との親和性が高い。

#### I2. `contracts:read` 権限の seed 状況

- `contracts:read` 権限自体は V8 seed 済み
- system-admin / contract-manager / sales / viewer すべてに付与済み (V9 seed)
- **本タスクで新規マイグレーション不要**

#### I3. フロントエンドの URL クエリパラメータ同期パターン

設計で採用した `useSearchParams` + `router.replace` によるフィルタ状態 URL 同期は、
Next.js App Router ではベストプラクティス。参照・ブックマーク・ページ遷移の復元が
自然に動く。実装難度は中程度だが、既存 `usePendingApprovals` のパターンとは差異が
あるため Frontend Agent が参考にできる既存実装がない点は注意。

---

## 3 ファイル間整合性の詳細

### requirements.md → design.md 対応

| 要求 | 設計記述 | 対応 |
|---|---|---|
| `/dashboard/approvals/history` 履歴一覧 | Frontend § 新規ページ | ✅ |
| 5 種類のフィルタ (status/contract_number/requester/approver/日付範囲) | Backend § SQL クエリ、BFF § クエリパラメータ、Frontend § フィルタコンポーネント | ✅ |
| ページネーション | Backend § LIMIT/OFFSET、BFF § page/limit、Frontend § keepPreviousData | ✅ |
| 既存詳細画面へのリンク | Frontend § TableRow クリック遷移 | ✅ |
| サイドバーナビ | Frontend § Sidebar 更新 | ✅ |
| 既存承認管理画面からのリンク | Frontend § 既存画面更新 | ✅ |
| 単体テスト + E2E テスト | 各サービス変更ファイル一覧にテスト記載 | ✅ |

### design.md → tasklist.md 対応

| 設計項目 | タスク |
|---|---|
| Backend 新規 SQL + RPC | Backend Agent § 実装フェーズ | ✅ |
| BFF 新規エンドポイント (audit 対象) | BFF Agent § 実装フェーズ (`approvals` グループに追加) | ✅ |
| Frontend 新規ページ + 2 コンポーネント + フック + Zod | Frontend Agent § 実装フェーズ | ✅ |
| Sidebar 更新 | Frontend Agent § 実装フェーズ | ✅ |
| E2E 5 シナリオ | E2E Agent § 実装フェーズ | ✅ |
| Orchestrator 事前 proto/openapi 同期 | Orchestrator 事前作業 | ✅ |

整合性 ✅

---

## Agent Teams 起動判定

| # | 条件 | 結果 | 備考 |
|---|---|---|---|
| 1 | 3 ファイル揃っている | ✅ | requirements / design / tasklist |
| 2 | 3 ファイル間整合性 | ✅ | 齟齬なし |
| 3 | API 契約確定 | ✅ | proto/openapi の具体的な追加内容が design.md に明記、Orchestrator が事前同期 |
| 4 | 前提タスク完了 | ✅ | Phase 2 / Phase 3 すべてマージ済み、サブモジュール main 同期済み |
| 5 | Agent 担当・完了条件明確 | ✅ | 4 Agent 分の担当、完了条件、wake-up ラグ目標が明記 |
| 6 | サービス CLAUDE.md 存在 | ✅ | backend / bff / frontend すべて |
| 7 | 環境設定定義済み | ✅ | 既存 Docker Compose を再利用、新規環境変数なし |

**判定: ✅ Ready**

### 事前確認で検証した項目

- ✅ サブモジュール 3 つとも main ブランチで Phase 3 merge commit まで同期完了
  - backend: `d37176b`
  - bff: `8ee0d6c`
  - frontend: `c7d5516`
- ✅ BFF の `approvals` / `approvalsPolling` ルート構造が既に存在 (`cmd/server/main.go:219/232`)
- ✅ `contracts:read` 権限は seed V8/V9 で既存 4 ロール (system-admin / contract-manager / sales / viewer) に付与済み → 新規マイグレーション不要

---

## Recommendations

### マージ前任意対応

1. **W2 修正** — E2E シナリオ4 の方針を tasklist.md に明記 (案A + 案C)。実装時に
   e2e-agent が迷わないように。

### 実装中の観察ポイント (retrospective 用)

2. **W1 のパフォーマンス実測** — 統合確認フェーズで本番相当データで計測し、必要なら
   複合インデックス追加を次タスク候補に記録
3. **A1/A2 wake-up チェーンのラグ計測** — 本タスクの最重要検証目的なので、各 wake-up
   DM の送信時刻と下流起動時刻を記録
4. **Phase 3 との差異** — 合意形成なしタスクで Orchestrator 介入回数 / 認識齟齬数が
   どう変わるかを定量比較

### 観察しない (既に解決済み)

- ~~認識齟齬の発生~~ — Phase 3 で解決済み
- ~~Peer DM サマリの機能性~~ — Phase 3 で確認済み

---

## 結論

**実装開始可能 (Ready)。** W2 のみ tasklist.md の軽微修正を推奨しますが、ブロッカーではありません。

W2 を修正してから `/start-implementation 20260414-approval-history-search` に進むか、
W2 を残したまま実装中に e2e-agent に直接指示する方法でも問題ありません。

---

**レビュー実施者:** Claude Code (Orchestrator / team-lead)
**作成日:** 2026-04-14
