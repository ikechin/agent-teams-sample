# 振り返り: 承認待ち件数バッジ + 真の Agent Teams 初運用検証

## 実施日
2026-04-13

## 定量サマリー

| 項目 | Backend | BFF | Frontend | E2E (親リポ) |
|---|---|---|---|---|
| 実装コミット数 | 1 | 2 (本体 + L1 fix) | 1 | 7 (proto/openapi/e2e/refs/reviews) |
| 変更行数 | +263 / -24 | +387 / -24 | +219 / -3 | +4,348 / -53 (steering + e2e + docs) |
| 新規テスト | 7 (service 4 + handler 3) | 6 (handler) | 5 (Sidebar) | 5 (E2E シナリオ) |
| テスト結果 | ✅ 全パス | ✅ 全パス | ✅ 115/115 | ✅ 36/36 (31 既存 + 5 新規) |

**合計新規テスト:** 23 件
**レビュー指摘:** Critical 0 / High 0 / Medium 0 / Low 1 (修正済み)

**プロセス特性:**
- Agent 構成: パターン1 (3 Agent 並行 + E2E Agent 後追い)
- **真の Agent Teams 初運用** (`TeamCreate` + `team_name` + `SendMessage` 自動配信)
- D1-D4 判断分岐を意図的に未確定 → 3 Agent フルメッシュ DM で実装前合意
- 暗黙前提発掘 1 件: BFF Agent が audit_log middleware の GET 発火を事前検出
- 認識差異即時検知 1 件: Frontend/BFF のエンドポイント名差異を Orchestrator が Peer DM サマリで検知
- PR 4 本マージ完了 + サブモジュール参照更新済み

## 振り返り

### うまくいったこと

**Agent Teams の動作**

真の Agent Teams (`TeamCreate` + `team_name` + `SendMessage` 自動配信) が仕様通りに
機能し、Phase 2 で成立しなかった基礎機能がすべて動作した:

- `TeamCreate` → `team_name` → `SendMessage` 自動配信で子 Agent 同士が `name` で直接 DM 可能
- Peer DM サマリが Orchestrator に自動配信され、`git status` 覗き見なしで進捗把握できた
- **合意形成フェーズが実装前に成立** — D1 (include_own) が Phase 2 H1 と同質の論点
  だったが、3 Agent 間で実装前に合意して齟齬ゼロ
- **暗黙前提の事前発掘** — BFF Agent が実装前に audit_log middleware の GET 発火を
  発掘し案A を提案 → J-SOX 観点で副次的品質改善
- **認識差異の即時検知** — Frontend と BFF のエンドポイント名差異 (`count` vs
  `pending-count`) を Orchestrator が Peer DM サマリから検知して訂正指示
- **E2E Agent の自律解決** — rate limit 衝突を Orchestrator 介入なしで `storageState`
  方式に切り替えて解決
- **shutdown_request → shutdown_approved → TeamDelete の正規ライフサイクル完走**

### 次回改善したいこと

**frontend-agent は BFF/Backend の完了を自動的には認識しなかったため、各 Agent が
ストップしてしまい先に進まなくなってしまった**

具体的な事象:
- backend-agent と bff-agent は合意形成後に実装 → `TaskUpdate(completed)` → idle
- **frontend-agent は D1-D4 合意後ずっと idle** で、上流完了を自動検知する経路がない
- Orchestrator が `git status` で「frontend submodule に変更なし」を確認してようやく気付き、
  明示的 wake up DM で再開

原因:
- **Idle Agent は TaskList を自律ポーリングしない** — 次のメッセージが来るまで待つだけ
- **上流 Agent の完了が下流 Agent に自動通知されない**
- **Orchestrator の責任分界が曖昧** — 「BFF が終わったら Frontend を起こす」のが誰の
  仕事か CLAUDE.md に明示されていなかった

### 想定外だったこと

**予想以上に Agent Teams が素晴らしかった**

Phase 2 振り返り時点での懸念 (ノイズ、コスト増、Peer DM の使いにくさ) がひとつも実体化せず、
むしろ想定以上の成果が出た:

- **ノイズはほぼなかった** — 3 Agent は自分の担当に必要な論点だけを DM、無関係な会話ゼロ
- **Peer DM サマリが期待以上に機能** — 1 行サマリで「誰と誰が何について話しているか」が
  分かり、本文を読まずとも全体像を追えた
- **Agent の自律判断品質が高かった** — BFF Agent の audit_log 発掘、E2E Agent の
  storageState 解決は Orchestrator の指示なしで生まれた独自の問題発見と解決
- **Phase 2 H1 と同質の論点 (D1) が実装前に消えた** — 最大のサプライズ。Phase 2 では
  実装後にレビューで発覚した論点が、本タスクでは合意形成フェーズで完全事前解消
- **設計判断の自己文書化** — Agent 同士の DM が実装時のインラインコメント (J-SOX
  rationale 等) に書き起こされ、コードが自己文書化された

つまり「フルメッシュの欠点」として懸念していたものが一つも実体化せず、Phase 2 で痛い目を
見た「暗黙前提問題」と「認識齟齬問題」が両方とも解消された。

## 改善アクション

### 実施済み

- [x] **A1: 依存関係のある Agent 間ハンドオフのルール明文化** (高優先度)
  - `CLAUDE.md` 「Agent Teams の正しい使い方」に「依存関係のある Agent 間のハンドオフ (必須ルール)」
    セクションを追加
  - **Orchestrator 主導** の wake-up DM 方式を推奨方針として明示
  - 代替案 (上流 Agent 自発 / ポーリング) との比較表を記載
  - 本タスクの事例を retrospective.md から参照

- [x] **A2: TaskCreate 時の依存関係明示** (高優先度、A1 と併用)
  - `CLAUDE.md` に `TaskCreate` description への依存記載 + `TaskUpdate.addBlockedBy`
    の使用例を追加
  - 「blocker 解消の自律検知はできない」ため Orchestrator DM は引き続き必要、という
    制約もあわせて明記
  - `.claude/skills/start-implementation/SKILL.md` にもステップ 8.5「依存関係のある
    Agent 間のハンドオフ (必須)」を新規追加。依存関係別 wake-up タイミング表と
    wake-up DM に含めるべき内容のテンプレートを記載

### 次回に向けて (未実施・候補として保留)

- [ ] **A3: 「想定以上」の成果を `.claude/skills/start-implementation/examples/` に保存** (中)
  - 本タスクの運用ログを「良い Agent Teams 運用例」として保存
  - D1-D4 意図的未確定 → 合意形成フェーズの組み込みパターン
  - 横断的制約リストの事前共有
  - E2E Agent の後追い起動パターン
- [ ] **A4: Phase 2 vs Phase 3 の比較を社外共有用ドキュメント化** (低)
  - 親リポ PR #7 の比較表を詳細化してブログ記事化の可能性
- [ ] **A5: 起動プロンプトで idle の仕様を明記** (低)
  - Agent への起動プロンプトに「TaskList ポーリングは機能しない、team-lead からの
    wake-up を待つ」と明示して誤解を防ぐ

---
**生成日:** 2026-04-13
**生成者:** Claude Code
