# 振り返り: 承認履歴検索画面 + Agent Teams 2 回目運用検証

## 実施日
2026-04-14

## タスク概要
- Phase 2 で保留されていた「承認履歴の検索・絞り込み機能」の本実装
- 副次目的: 真 Agent Teams (TeamCreate + team_name) の 2 回目運用検証、特に A1/A2
  依存ハンドオフルールの実運用観察
- Phase 3 (`20260413-approval-count-badge`) は合意形成フェーズあり、本タスクは
  仕様を明確に与えた通常タスクとして並列実行効率と認識齟齬を観察

## 定量サマリー

| 項目 | Backend | BFF | Frontend | E2E + Contracts |
|---|---|---|---|---|
| コミット数 | 2 | 1 | 2 | 6 (親リポ) |
| 変更ファイル数 | 11 | 6 | 13 | 12 |
| 変更行数 | +900 / -50 | +617 / -23 | +917 / -12 | +619 / -21 |
| 新規テスト | 14 件 (L1 含む) | 8 件 | 14 件 (M1 含む、vitest 合計 129) | 5 シナリオ |
| テスト結果 | ✅ go vet/fmt/test クリーン | ✅ go vet/fmt/test クリーン | ✅ lint/type-check/129 pass | ✅ フルスイート `--workers=1` **41/41 pass** |

**レビュー指摘:** Critical 0 / High 0 / Medium 2 / Low 2 — **全解消済み**
**Critical 誤検出:** 1 件 (Backend レビュアーが `defaultPageSize` 未定義と誤報告、実際は
同一 package の `merchant_service.go:19` で定義済み)

## Agent Teams 2 回目運用 (フルメッシュ型) 検証結果

### A1/A2 依存ハンドオフ実効性

| Handoff | 上流完了 | Wake-up DM | ラグ | 備考 |
|---|---|---|---|---|
| backend → bff | 13:09:16 | 即時 | **<1 ターン** | DM 即送信 |
| bff → frontend | 13:15:16 | 即時 | **<1 ターン** | DM 即送信 |
| frontend → e2e | 13:20:02 | Docker rebuild 後 | **2 ターン** | `docker compose up --build` ~2 分 + schedule wakeup |

### 認識齟齬
- **ゼロ** (Phase 3 では エンドポイント名差異 1 件)
- 仕様を明確に与えたことで各 Agent が独立判断に迷わず実装できた

### 実装時間
- **~50 分** (13:03 spawn → 14:01 最終 idle)
- Phase 3 (~2 時間) の **約半分**
- 合意形成フェーズを省いた分、純粋な実装時間が短縮

### Orchestrator 介入回数
- wake-up DM: 3 回 (backend→bff, bff→frontend, frontend→e2e)
- レビュー修正指示 DM: 3 回 (L1, M1, M2 並列)
- shutdown_request: 4 回 (全 Agent)
- 合計: 10 DM、全て 1〜3 行で完結

---

## 振り返り (ユーザー対話)

### うまくいったこと
**タスク完了後も Team を維持したこと** — Task #4 completed → 即 shutdown ではなく
Team を idle 状態で維持したため、実装レビュー後の Medium/Low 指摘 4 件を **同じ Agent
context** で修正できた。再 spawn 不要、背景知識の保持、コンテキスト汚染なしで <5 分
並列解消を達成。

Phase 3 では完了即シャットダウンだったため修正時にコンテキストを失っていた。本タスクで
発見した **長寿命 Team パターン** は Agent Teams 運用の新しいベストプラクティス。

### 次回改善したいこと
**E2E フルスイートが途中で停止した問題の根本解決** — 原因は BFF login rate limit
(10/min/IP + burst 10) と既存 E2E spec の `beforeEach UI login` パターンの構造的干渉。

連鎖の流れ:
1. 既存 spec (contract-crud / service-crud / merchant-crud 等) が beforeEach 毎回 login
2. フルスイートの 60 秒あたり累積 login が rate limit window に接近
3. 本タスクの 3 login 追加で境界超過
4. `contract-crud` の beforeEach が 429 or リダイレクト失敗 → waitForURL タイムアウト
5. 失敗箇所がタイミング依存で毎回違う (典型的な rate limit 枯渇症状)

**採用した対処 (commit `06b1194`)**: login ヘルパーに指数バックオフリトライ (2s→4s→8s、
最大 4 回) を組み込み。対症療法としてフルスイート 41/41 pass を達成。

**根本解決**: `beforeEach UI login` → `beforeAll + storageState 共有` への全面移行が
必要。各ロール毎に 1 回の login に集約すれば login 数が spec 数に依存しなくなる。
→ 別タスク `.steering/20260415-e2e-login-pattern-refactor/` として起票済み。

### 想定外だったこと
**レビュー後の定量サマリーを per-agent テーブル形式で提示したこと** がユーザーに刺さった。
Phase 3 まではフラットなリスト形式だったが、Backend/BFF/Frontend/E2E を列に、
コミット数/変更行数/テスト数/レビュー指摘を行にした表は、各 Agent の作業量と品質を
可視化するのに有効。retrospective テンプレートの標準化候補。

---

## 改善アクション

### ✅ 実施済み (本セッション内)

- [x] **A1. CLAUDE.md の Team shutdown タイミング修正** — 「全タスク完了後 shutdown」
  を「実装レビュー + 修正完了まで Team を維持 → その後 shutdown」に更新
  (commit pending)
- [x] **A2. 長寿命 Team パターンの明文化** — CLAUDE.md に振り返り由来のパターンを
  記載、2026-04-14 retrospective への参照を付与
- [x] **A3. review-implementation skill のガードレール追加** — 静的解析/テストがクリーンな
  場合、言語スコープレベルの違反指摘は誤検出の可能性が高いことを明記。Critical 候補前に
  必ず Grep で定義箇所を二次確認するルールを追加 (`defaultPageSize` 誤検出の再発防止)
- [x] **A4. design.md への sqlc.narg 記法注記** — L2 指摘に対応、本タスクの design.md に
  実装後注記を追加
- [x] **A5. 新規ステアリング `20260415-e2e-login-pattern-refactor/` の起票** —
  requirements.md を作成、beforeAll + storageState 全面移行の計画を記録
- [x] **A6. レビュー後並列修正ハンドオフの実証** — 本タスクで Medium/Low 4 件を 3 Agent
  並列で <5 分解消した事例を記録 (CLAUDE.md 長寿命 Team パターンの実例として)

### 次回に向けて

- [ ] **A7. E2E login パターン構造刷新の実施** — `.steering/20260415-e2e-login-pattern-refactor/`
  の design.md / tasklist.md を作成して実装着手。優先度: 中〜高 (spec 数がさらに増える前に)
- [ ] **A8. E2E セレクタ戦略の全面 role 化** — 既存 spec (contract-crud / service-crud /
  merchant-crud 等) を `getByRole` / `getByLabel` ベースに移行。本タスクでは新規 spec のみ
  対応した。別タスク候補
- [ ] **A9. Frontend 行クリック a11y 横展開** — `ApprovalList.tsx` (Phase 2) も同じ
  `onClick` のみパターン。本タスクで `ApprovalHistoryList.tsx` だけ修正済み。別タスクで
  横展開推奨
- [ ] **A10. retrospective テンプレートの per-agent 表標準化** — retrospective skill 側に
  「per-agent 定量表は必須」の旨を追記 (skill 側は既にテーブルテンプレート搭載、
  運用で形骸化しないよう注記のみ)

---

## Phase 3 との比較

| 指標 | Phase 3 (count-badge) | Phase 4 (history-search) |
|---|---|---|
| タスク性質 | 合意形成あり (D1-D4 未確定) | 仕様明確 |
| 実装時間 | ~2 時間 | ~50 分 (半分) |
| 認識齟齬 | 1 件 (エンドポイント名差異) | **0 件** |
| Orchestrator wake-up DM 回数 | 1 回 (Frontend が数ターン停止後) | 3 回 (即時) |
| 下流 Agent 停滞時間 | 数ターン (Frontend が自律起動できず) | ゼロ |
| レビュー指摘 (Critical/High) | (要確認) | 0 件 |
| 新規テスト総数 | Phase 3 と同程度 | 41 (Backend 14 / BFF 8 / Frontend 14 / E2E 5) |
| Team shutdown タイミング | タスク完了直後 | **レビュー修正完了後** (新パターン) |

**総括**: 仕様明確タスクでは合意形成のオーバーヘッドが不要になり、A1/A2 ルールが期待通り
機能することを実証。Phase 3 の学びが Phase 4 に結実した。Phase 4 の新しい学びは
**長寿命 Team パターン**と**per-agent 定量サマリーの価値**。

---

**生成日:** 2026-04-14
**生成者:** Claude Code + user interactive feedback
