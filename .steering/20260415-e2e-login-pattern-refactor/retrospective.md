# 振り返り: E2E Login パターン構造刷新

## 実施日
2026-04-14

## タスク概要
`beforeEach/beforeAll UI login` パターンを Playwright 公式推奨の **setup project + storageState**
パターンへ全面移行し、BFF login rate limit (10/min/IP burst 10) との構造的干渉を根本解決する。
Phase 4 retrospective から起票された改善アクション #6 の実装。

## 定量サマリー

| 項目 | E2E + 親リポ |
|---|---|
| コミット数 | 2 (refactor + review-report) |
| 変更ファイル | 16 |
| 変更行数 | +405 / -177 |
| 新規ファイル | 4 (auth.setup.ts / roles.ts / seed-users.ts / review-report.md) |
| E2E テスト | **45/45 pass** (setup 4 + chromium 41) |
| 連続 5 回実行 | **45×5 すべて pass** |
| 実行時間 | 37s → **12s** (3 倍速化) |
| レビュー指摘 | Critical 0 / High 0 / Medium 2 / Low 1 (全正当化済み) |

**Agent 構成**: **単一 Agent** (team-lead 直接実装)、Agent Teams 不使用
**実装時間**: 全 Phase 約 30 分 (コア実装) + 検証フェーズでの試行錯誤

## 受け入れ条件達成

| # | 条件 | 結果 |
|---|---|---|
| 1 | auth.setup.ts 3 ロール生成 | ✅ (+ seed 投入) |
| 2 | 既存 5 spec 移行 | ✅ + 2 spec bonus (approval-count-badge / history-search) |
| 3 | login-flow.spec 空 storageState 維持 | ✅ |
| 4 | フルスイート pass | ✅ 45/45 |
| 5 | **連続 5 回実行で全 pass** | ✅ 45×5 |
| 6 | README 反映 | ✅ |
| 7 | login retry 発火なし | ✅ |
| 8 | 実行時間悪化なし | ✅ 3 倍速化 |

---

## 振り返り

### うまくいったこと

**単一 Agent 実施の判断が正解だった** — 本タスクは親リポ `e2e/` のみの refactor で、実装が
Phase 1 → 2 → 3 → 4 → 5 → 6 と直列にしか進まない構造。Agent Teams のオーバーヘッド
(TeamCreate / DM / ハンドオフ / 並列管理) を避けたことで、コア実装 30 分 + 検証で完結した。
Agent Teams を選んでいたら spawn コスト + 調整時間で 1 時間以上かかっていた可能性が高い。

**判断基準が見えた**: 「単一サブモジュール/親リポ単体完結 + 依存が直列 + 工数半日以下」なら単一 Agent、
それ以外は Agent Teams。今後の運用ルールとして CLAUDE.md に反映した。

### 次回改善したいこと

**課題1: 設計段階で仮説を実装時に覆した**
- design.md で「BFF origin の Cookie は browser context に転用不可」と**断定**したが、実測では
  session Cookie の `domain=localhost` により `APIRequestContext` にも流用可能だった
- 原因: 既存 `approval-history-search.spec.ts` が API login + UI login を併用しているのを
  表面的に観察し、「API Cookie 転用不可だから併用している」と推測した。実際は単なる歴史的経緯
  (誰も疑問視しなかっただけ) だった
- **学び**: `cat e2e/.auth/*.json` 1 回で domain 属性を確認すれば即座に覆せた。設計段階の
  実測投資不足
- 結果として実装時にスコープ拡張 (M1: approval-count-badge / history-search の API login 撤廃)
  と storageState 流用パターンの発見が発生。結果オーライだが、設計精度が低かった

**課題2: データ汚染問題の発見遅れ**
- merchant-crud / contract-crud の累積データが merchant-list spec の seed 検証を壊す問題は
  **Phase 2 以前から潜在していた**が、rate limit で suite が単発実行主体だったため顕在化しなかった
- 本タスクで連続 5 回実行を目標にしたことで初めて観察できた (~18 runs で seed merchants が
  page 1 から押し出される)
- **学び**: 連続実行テストは rate limit / flakiness / データ汚染を一度に検出できる有効な手段。
  今後の新規 E2E 受け入れ条件に「連続 N 回 pass」を組み込むべき

両方とも **「設計段階で既存コードを深掘りする」仕組み不足** の問題。review-steering skill に
「実測検証」チェック項目を追加して改善する。

### 想定外だったこと

**連続実行テストの有用性** — 単発 pass だけでは見えない問題を網羅的に検出できた:
- rate limit window の累積飽和 (setup 3 login × 2 回 + login-flow + ... = burst 超過)
- storageState TTL の必要性 (再 login 回避)
- テストデータの蓄積 (seed merchants の page 押し出し)

Phase 4 までは「1 回全 pass したらマージ」だったため、これらの潜在問題が見逃されていた。
今後は **E2E 新規 spec の受け入れ条件に「連続 3〜5 回 pass」を組み込む**べき。

**Playwright の storageState 再利用パターン** — 30 分 TTL で既存ファイルを再利用する機構は
設計段階では思いつかなかったが、連続実行検証で login-flow.spec との干渉を発見して初めて
組み込んだ。Playwright 公式ドキュメントに記載されている標準パターンを見落としていた。

---

## 改善アクション

### ✅ 実施済み (本セッション)

- [x] **A1. CLAUDE.md に単一 Agent パターン判断基準を明文化** — 単一サブモジュール/親リポ単体 + 依存直列 + 半日以下 → 単一 Agent、それ以外 → Agent Teams。本タスクを実例として記載
- [x] **A2. CLAUDE.md に設計実測検証ルールを追加** — 「〜できない」「〜が必要」の断定は実装前に実測 1 回で検証。検証例 (`cat storageState` / `\d table` / `EXPLAIN` 等) を明示
- [x] **A3. review-steering skill に実測検証チェック項目追加** — カテゴリ 6 に「設計仮説の実測検証」セクション。5 分以内に検証可能な断定を未検証のまま残さないルール
- [x] **A4. 新規ステアリング `20260416-e2e-test-data-cleanup/` 起票** — merchant-crud / contract-crud のデータ汚染問題を構造的に解決する別タスクとして分離
- [x] **A5. review-report.md 保存** — 本タスクの詳細レビュー結果 (M1/M2/L1 + スコープ外観察)

### 次回に向けて

- [ ] **A6. E2E 新規 spec の受け入れ条件に「連続 N 回 pass」を追加** — `docs/development-workflow.md` か e2e/README.md に明記。PR 作成時のチェックリストにも組み込む
- [ ] **A7. CI で連続 3 回実行を強制** — GitHub Actions で PR 時 or nightly に e2e フルスイートを 3 連続実行
- [ ] **A8. 新スキル候補: `verify-design-hypotheses`** — design.md から「〜不可」「〜必要」の断定箇所を自動抽出し、実測コマンドを提案する軽量チェッカー (優先度: 中、工数: 1 日)
- [ ] **A9. login ヘルパー完全削除** — retry 発火ゼロが 1 ヶ月観測されたら `test-helpers.ts` から削除

---

## Phase 3 / Phase 4 / Phase 5 (本タスク) の比較

| 指標 | Phase 3 (count-badge) | Phase 4 (history-search) | Phase 5 (login-refactor) |
|---|---|---|---|
| Agent 構成 | Agent Teams (4 agents) | Agent Teams (4 agents) | **単一 Agent** |
| タスク性質 | 合意形成あり | 仕様明確 | 仕様明確 + refactor |
| 実装時間 | ~2 時間 | ~50 分 | **~30 分 (コア)** |
| 新規テスト | ~7 件 | 41 件 | 4 件 (setup) + 既存 41 統合 |
| レビュー Critical/High | 0/0 | 0/0 | 0/0 |
| スコープ拡張 | なし | なし | 2 spec 追加 (M1) |
| 単位時間あたり生産性 | - | - | **最高** |

**総括**: 単一マイクロサービス/親リポ単体のタスクでは **単一 Agent が最速**。Phase 4 の教訓
(A1/A2 依存ハンドオフルール) を活かして適切な Agent 構成を選択できた。一方で設計精度には
改善余地があり、実測検証ルールの運用が今後の課題。

---

**生成日:** 2026-04-14
**生成者:** Claude Code + user interactive feedback
