# Steering Review Report

## Summary
- **ステアリング:** `.steering/20260413-approval-count-badge/`
- **レビュー実施日:** 2026-04-13
- **判定:** ⚠️ 修正推奨 (軽微な指摘あり、ブロッカーなし)
- **Agent Teams 準備状態:** ⚠️ Conditional (サブモジュール detached HEAD のみ要対応)

## Checklist Results

| カテゴリ | 結果 | 備考 |
|---|---|---|
| 1. 構造・完全性 | ✅ | 3ファイル揃い必須セクションも網羅 |
| 2. 3ファイル間整合性 | ✅ | 「実装するもの」が design/tasklist に対応済 |
| 3. 既存ドキュメント整合性 | ⚠️ | glossary 更新不要、rate limit 認識の誤差あり |
| 4. API 契約・DB 設計 | ⚠️ | 意図的に未確定 (検証目的)、通常タスクなら要修正 |
| 5. タスクリスト品質 | ✅ | Agent 分担・依存・完了条件明確 |
| 6. リスク・実現可能性 | ⚠️ | Agent Teams 初運用のリスク、要観察 |
| 7. Agent Teams 準備状態 | ⚠️ | submodule detached HEAD → 実装開始前に main に戻す必要 |

---

## Issues Found

### ❌ 要修正 (ブロッカー) — 0件

なし。

---

### ⚠️ 修正推奨

#### W1. BFF rate limit の記述が過度に慎重

- **場所:** `requirements.md` 制約事項 / `design.md` 分岐 E (ポーリング間隔) / `tasklist.md` 横断的制約
- **指摘内容:** BFF の rate limit (10/min/IP burst 10) は **`POST /api/v1/auth/login` のみ** に適用されており、`/api/v1/approvals/*` を含む他エンドポイントには適用されない (`services/bff/cmd/server/main.go:179` で確認)。そのため 30 秒ポーリング程度で rate limit に引っかかる懸念は実質ない。
- **実際の懸念:** 代わりに audit_log middleware が全リクエストに `INSERT` を発生させるため、過度なポーリングは audit_logs テーブルの肥大化を招く (Phase 2 でセッション 64 件累積を観察した)。
- **修正案:** 設計 D3 の論点を「rate limit」→「audit_log 書き込み頻度」に書き換える。これにより Agent の合意形成論点がより現実的になる。
- **検証目的への影響:** この誤認識を **故意にステアリングに残しておき、BFF Agent が「実は rate limit はログインだけですよ」と Backend/Frontend Agent に DM で訂正してくれるか** を検証するのも面白い。これは真の Agent Teams のフルメッシュ通信が**暗黙前提の訂正**にも機能するかを試す良い材料。→ 意図的に残すことを推奨。

#### W2. 「前提タスクの完了」確認手順が不足

- **場所:** `tasklist.md` Orchestrator 事前作業
- **指摘内容:** Phase 2 の承認ワークフローが実装・マージ済みであることの前提確認が「completed」マークされていない。サブモジュールが Phase 2 後の main 状態であるかを検証する手順 (例: `git submodule status` で Phase 2 コミットを含む)が明記されていない。
- **修正案:** Orchestrator 事前作業に以下を追加:
  ```
  - [ ] 各サブモジュールが main ブランチの最新状態にあることを確認
        (git -C services/backend checkout main && git pull)
  - [ ] approval_workflows テーブルが Phase 2 で作成済みであることを確認
        (docker compose exec backend-db psql ... \d approval_workflows)
  ```

#### W3. レスポンス形状 D4 の選択肢が未記載

- **場所:** `requirements.md` D4
- **指摘内容:** requirements.md では「`{count: N}` vs `{count: N, include_own: false}` vs `{count: N, updated_at: ...}`」の 3 選択肢を挙げているが、design.md では 1 選択肢 (`{count: number}`) しか例示していない。Agent 合意形成の余地を残すなら design.md にも 3 選択肢を明示すべき。
- **修正案:** design.md の「BFF 変更」セクションに 3 選択肢を列挙する。

---

### ℹ️ 情報 (参考)

#### I1. サブモジュールが detached HEAD 状態

- 現在 3 サブモジュールがすべて detached HEAD (Phase 2 マージコミットの直接チェックアウト状態)。
- Agent Teams 起動前に Orchestrator が `git -C services/{backend,bff,frontend} checkout main && git pull` を実行する必要あり。
- `/start-implementation` スキルのステップ 7 (featureブランチ作成) で自動的にカバーされる想定だが、一応念のため。

#### I2. Agent Teams 検証目的の明記は適切

- `requirements.md` の「🎯 意図的に未確定な判断ポイント」セクションと `tasklist.md` の「振り返り観点」セクションで本タスクの検証目的が明確に文書化されている。
- 次回 retrospective で定量データを比較するために必要な項目 (DM 数、齟齬発生タイミング、Orchestrator 介入回数) も列挙されており、計測可能。

#### I3. テスト観点の網羅性

- E2E シナリオ 5 件すべてが受け入れ条件と対応しており抜けなし。
- 単体テスト観点は各 Agent セクションに含まれており十分。

#### I4. サービス CLAUDE.md とのぶつかりなし

- backend/bff/frontend すべての CLAUDE.md を確認。本タスクの技術スタック (Go + sqlc + Echo / Next.js + React Query + Tailwind) と矛盾なし。
- 新規ライブラリ追加もなし。

---

## 3ファイル間整合性の詳細

### requirements.md → design.md 対応

| 要求 | 設計記述 | 対応 |
|---|---|---|
| サイドバーに件数バッジ表示 | Frontend 変更 § バッジ UI 仕様 | ✅ |
| SoD 除外 | 分岐 D (include_own) | ✅ (意図的に未確定) |
| 0 件で非表示 | Frontend 変更 § バッジ UI 仕様 | ✅ |
| 権限なしで非表示 | Frontend 変更 (既存ロジック踏襲) | ✅ |
| 承認/却下後 30 秒以内に更新 | Frontend 変更 § ポーリング戦略 (invalidate) | ✅ |
| Backend/BFF/Frontend テスト追加 | 各サービス変更ファイル一覧にテスト記載 | ✅ |

### design.md → tasklist.md 対応

| 設計項目 | タスク |
|---|---|
| Backend `CountPendingApprovals` RPC (選択肢 A1) | Backend Agent § 実装フェーズ | ✅ |
| BFF `/api/v1/approvals/count` (選択肢 B1) | BFF Agent § 実装フェーズ | ✅ |
| Frontend `useApprovalCount` + Sidebar バッジ | Frontend Agent § 実装フェーズ | ✅ |
| 意図的に未確定な D1-D4 | 各 Agent § 合意形成フェーズ | ✅ |
| E2E 5 シナリオ | E2E Agent § 実装フェーズ | ✅ |

整合性 ✅

---

## Agent Teams 起動判定

| # | 条件 | 結果 | 備考 |
|---|---|---|---|
| 1 | 3ファイル揃っている | ✅ | requirements / design / tasklist |
| 2 | 3ファイル間整合性 | ✅ | 重大な齟齬なし |
| 3 | API 契約確定 | ⚠️ | **意図的に未確定** (検証目的)、ただし確定手順 (Agent 合意) が明記されている |
| 4 | 前提タスク完了 | ✅ | Phase 2 マージ済 (W2 の検証手順を tasklist に追加すれば完璧) |
| 5 | Agent 担当・完了条件明確 | ✅ | 4 Agent 分の担当と完了条件が明記 |
| 6 | サービス CLAUDE.md 存在 | ✅ | 3 サブモジュールすべて |
| 7 | 環境設定定義済み | ✅ | Docker Compose 既存、ポート・DB 既存利用 |

**判定: ⚠️ Conditional → Ready (軽微修正後)**

### 判定理由

条件 3「API 契約確定」を ⚠️ としているが、これは**本タスクの検証目的により意図的に
未確定**としているもの。通常タスクであればブロッカーだが、本タスクは「Agent 間合意形成が
機能するか」の実測が主目的なので、この未確定は**バグではなく仕様**。

唯一の実質的指摘は W2 (前提タスク完了の確認手順不足)。これは tasklist.md への数行の
追記で解消可能。

---

## Recommendations

### マージ前必須対応
1. **W2 修正** — tasklist.md の Orchestrator 事前作業にサブモジュール main 追従確認手順を追加

### 任意対応 (推奨)
2. **W3 修正** — design.md に D4 の 3 選択肢を明示 (Agent 合意形成の余地を明確化)
3. **W1 は意図的に残す** — BFF Agent が rate limit 誤認識を DM で訂正するかを検証する絶好の機会

### 検証段階での観察ポイント (retrospective 用)
4. **D1 (include_own) の論点に最初に気付く Agent はどれか** を記録
5. **Agent 間 DM の総数と broadcast 使用回数** を計測
6. **Orchestrator が方針決定を求められる回数 (= Agent 間合意形成の失敗回数)** を記録
7. **実装完了前に D1-D4 すべてが合意されたか** を確認

---

## 結論

**Agent Teams 実装を開始する前に W2 (サブモジュール main 追従確認手順の追加) を修正することを推奨。** それ以外はブロッカーなし。

W2 修正後は `/start-implementation 20260413-approval-count-badge` で実装開始可能。
本タスクは Agent Teams 初運用検証を兼ねるため、特に **Agent 起動プロンプトに
`team_name` 指定が入っていること**、**Orchestrator が `TeamCreate` を実行していること**
を実行時に必ず確認すること。

---

**レビュー実施者:** Claude Code (Orchestrator)
**作成日:** 2026-04-13
