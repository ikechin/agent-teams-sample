# Steering Review Report

## Summary
- ステアリング: `.steering/20260415-e2e-login-pattern-refactor/`
- レビュー実施日: 2026-04-14
- 判定: **✅ 承認** (軽微な情報追記あり)
- 実装準備状態: **✅ Ready** (ただし Agent Teams ではなく **単一 Agent** で実施)

## Checklist Results

| # | カテゴリ | 結果 | 備考 |
|---|---|---|---|
| 1 | 構造・完全性 | ✅ | 3 ファイル揃、必須セクション完備 |
| 2 | 3 ファイル間整合性 | ✅ | requirements スコープが design / tasklist に対応 |
| 3 | 既存ドキュメント整合性 | ✅ | E2E 単体、glossary / J-SOX / security 影響なし |
| 4 | API 契約・DB 設計 | ✅ (N/A) | **API/DB 変更なし** (E2E のみ) |
| 5 | タスクリスト品質 | ✅ | Phase 1〜6 で粒度適切、完了条件具体的 |
| 6 | リスク・実現可能性 | ✅ | Playwright 公式推奨パターン、技術リスク低 |
| 7 | Agent Teams 準備状態 | ⚠️ (N/A) | **本タスクは単一 Agent 実施**。Agent Teams 判定不要 |

---

## Issues Found

### ❌ 要修正 (実装前に必ず修正)
なし。

### ⚠️ 修正推奨 (可能であれば修正)

**W1. approval-workflow.spec.ts の移行ロールが「要調査」扱い**
- 場所: `tasklist.md` T2.5
- 問題: 既存 spec が approver 権限を使う箇所があるか未確認のまま実装フェーズに入る設計。
  実装 Agent が途中で詰まる可能性あり
- 修正案: 実装前に `grep -n "approve\|reject" e2e/tests/contracts/approval-workflow.spec.ts` で
  承認操作の有無を確認しておく。接続するロールが決まればタスク記述を具体化できる
- **優先度**: 低 (実装 Agent が自然に発見できるレベル、Blocker ではない)

**W2. setup project で API login したレスポンスの Cookie 取り扱い**
- 場所: `design.md` §2 `auth.setup.ts`
- 問題: `request.newContext({ baseURL: BFF_URL })` の後に `ctx.storageState()` で保存する
  設計だが、**BFF の Cookie が Frontend オリジン (http://localhost:3000) で再利用可能か**
  を検証する必要がある。Cookie の `Domain` / `Path` 属性次第で、単純に storageState を
  Frontend context に当てても認証が効かない可能性がある
- 修正案: 実装時に 2 択を検証:
  - (a) `request.newContext({ baseURL: FRONTEND_URL })` で Frontend 経由で login (Frontend が
    BFF にプロキシする構造なら Cookie が Frontend オリジンに付く)
  - (b) BFF に直接 API login し、返却 Cookie を `context.addCookies()` で手動注入
- design.md §2 に「Cookie 取得経路の検証手順」として注記しておくと Agent が迷わない
- **優先度**: 中 (実装段階で詰まりうるポイント)

### ℹ️ 情報 (参考)

**I1. Agent Teams vs 単一 Agent の選択が妥当**
- tasklist.md で「単一 Agent で実施」と明記されている通り、E2E 単体の refactor は
  Agent Teams のオーバーヘッドに見合わない。妥当な判断

**I2. login ヘルパー `login()` 関数の将来削除計画**
- 本タスクでは非推奨マーク付与のみで残置。将来 retry 発火ゼロが観測されれば削除候補。
  retrospective で定量観測する旨が既に記載されており問題なし

**I3. Playwright setup project の dependency chain**
- `chromium` project が `dependencies: ['setup']` を持つので、setup 失敗時には
  chromium project は実行されない。これは正しい挙動だが、CI で setup の失敗原因が
  わかりにくくなる可能性あり。`--reporter=list` で setup のログが見えるため実用上は問題ない

---

## 既存ドキュメント整合性チェック詳細

| 項目 | 確認結果 |
|---|---|
| `docs/glossary.md` 新規用語 | なし (`storageState` / `setup project` は Playwright 用語で glossary 対象外) |
| `docs/system-architecture.md` との矛盾 | なし (E2E のみ、アーキテクチャ変更なし) |
| `docs/security-guidelines.md` | storageState に保存される Cookie は **gitignore 対象** として明記済み ✅ |
| `docs/jsox-compliance.md` | E2E テストは audit_log を生成するが、本タスクで挙動は変わらず影響なし |
| `docs/ENVIRONMENT.md` | 既存の `BFF_URL` / `FRONTEND_URL` / `TEST_USER_EMAIL` 環境変数のみ使用、追加なし |
| `contracts/openapi/bff-api.yaml` | `POST /api/v1/auth/login` は既存、変更なし |
| `e2e/playwright.config.ts` | 変更対象、設計済み |
| `e2e/CLAUDE.md` | **存在しない**。サービス別 CLAUDE.md は services/ 配下にあるが、e2e は親リポ管轄なので問題なし |

---

## 実装準備判定

本タスクは **単一 Agent** で実施するため、通常の Agent Teams 起動判定とは異なる観点で確認:

| # | 条件 | 結果 |
|---|---|---|
| 1 | 3 ファイル揃っている | ✅ |
| 2 | 3 ファイル間整合性 | ✅ |
| 3 | API 契約確定 (N/A — API 変更なし) | ✅ |
| 4 | 前提タスク完了 (Phase 4 merge 済み) | ✅ |
| 5 | 単一 Agent の担当範囲・完了条件明確 | ✅ |
| 6 | 対象ディレクトリのコードベース理解可能 | ✅ (`e2e/utils/test-helpers.ts` を既に読了) |
| 7 | 環境設定 (ポート / Docker) 定義済み | ✅ (`docker compose up -d` 既存パターンを踏襲) |

**判定: ✅ Ready** — 実装着手可能。

**推奨:**
1. 実装開始前に W2 (Cookie 取得経路) を 5 分程度調査してから着手するとスムーズ
2. 本タスクは `/start-implementation` スキルで Agent Teams 起動するのではなく、
   **通常の Claude Code 単一 Agent で順次実施** するのが適切 (tasklist に明記済み)

---

## Recommendations

1. **即実装可**: requirements / design / tasklist は十分な品質。Phase 1 から順次着手できる
2. **W2 の事前確認** (任意): 実装着手前に `e2e/tests/contracts/approval-history-search.spec.ts`
   の既存 API login → storageState 実装を参考にすれば、Cookie 取得経路は既に解決済みの
   パターンが流用できる。該当ファイルの `beforeAll` を確認すると API login の正解コードがある
3. **完了後の retrospective**: 定量観測 (5 回連続 pass 率、login retry 発火回数、総実行時間)
   を記録する旨が既に tasklist に含まれており問題なし

---

**レビュー実施日:** 2026-04-14
**レビュアー:** team-lead (Orchestrator 相当)
