# 振り返り: 契約管理 Phase 2 - 承認ワークフロー

## 実施日
2026-04-12

## 定量サマリー

| 項目 | Backend | BFF | Frontend | Parent (含 E2E) |
|---|---|---|---|---|
| コミット数 | 3 (+merge) | 3 (+merge) | 3 (+merge) | 5 |
| 変更行数 | +3,617 / -111 | +2,188 | +1,963 / -20 | +836 / -3 |
| ファイル変更 | 24 | 9 | 23 | 8 |
| 単体テスト | 153 | handler 22+ / service既存 | 110 | - |
| E2Eテスト | - | - | - | 31/31 (新規5含む) |
| テスト結果 | ✅ 全パス | ✅ 全パス | ✅ 全パス | ✅ 全パス |

**レビュー指摘:** Critical 0 / High 1 / Medium 2 / Low 4 → すべて修正済み

**プロセス:**
- Agent構成: パターン1 (3 Agent並行起動)
- Orchestrator事前作業: Proto + OpenAPI + glossary + featureブランチ作成
- 統合確認時に発見した実バグ (`include_own` 不在) 1件 + レビュー指摘 (H1) 1件 → 2回のフィックスサイクル
- 4 PR (backend / bff / frontend / parent) すべてマージ完了

## 振り返り

### うまくいったこと

**レビュー (`/review-implementation`) が機能的に深い問題を発見した**

- H1（却下理由が永久に表示されない仕様バグ）という、テストはパスするが要件ストーリー5を満たさない「機能不足型」の指摘をレビューで発見できた
- `git diff` ベースのレビューでコンテキスト節約しつつ、9カテゴリのチェックリストを適用
- レビュー報告書を `.steering/` 配下に保存して履歴化（後の振り返り・改善の基礎データに）
- 指摘を Critical/High/Medium/Low に分類 → 修正の優先度判断が明確
- 修正後の再E2E (31/31) で副作用がないことも併せて確認できた

### 次回改善したいこと

**Agent協調の問題**

具体的に観察できた事象:

1. **Frontend Agent が API契約の前提を見落とした** — `usePendingApprovals` (BFF が SoD で申請者を除外する) を契約詳細画面に流用したため、申請者が自分の状態を見られないという H1 が発生。BFFのエンドポイント仕様を読まずに「pending一覧フックを使い回せばいい」と判断した結果。Agent間通信 (BFF Agent への確認) があれば防げた可能性。

2. **mockのスコープ食い違い** — Backend Agent が `ApprovalServiceInterface` を拡張する際、別ファイルのmock (contract_service_test.go等) も更新する必要があるが、新規メソッド追加時に他のmock実装への波及を見落としやすい。Orchestrator が後から追加した `ListWorkflowsByContract` でも同じ問題が出た。

3. **rate limit のような横断的非機能要件をどのAgentも認識していなかった** — BFFログイン rate limit (10/min/IP) は E2E Agent ですら把握しておらず、E2E spec設計時に5回ログインしてしまった。横断的制約は事前に Orchestrator から共有すべきだった。

### 想定外だったこと

**Agent間通信方針（ハイブリッド型）の構造的弱み**

各エージェントの途中経過が「完了通知」まで Orchestrator に伝達されず、Orchestrator は内部状態が見えない。`git status` でファイルシステムを覗く間接的な方法しか取れなかった。

ハイブリッド型は「方針はOrchestrator経由 / 実装詳細は直接通信OK」というルールだが、実際には:
- Backend が `WHERE status='PENDING'` でハードコードした時点で BFF/Frontend Agent に共有されず
- Frontend が誤った前提で `usePendingApprovals` を流用 → H1 発生
- レスポンス形状や除外ルールのような「実装の暗黙の前提」が、完了報告という最終アウトプットでは伝わらず、コードを書いた本人にしか見えない

仮説として、全Agentが SendMessage で常時連携する**通常の Agent Teams 方式の方が認識齟齬を減らせる可能性**がある。

懸念点:
- メッセージ量が爆発し、ノイズで重要な決定が埋もれる
- Agent が「他Agentの全メッセージを読む」のは現実的にコスト高
- リーダー経由の構造化された方が責任の所在は明確

ハイブリッド型を維持するなら必要な補強:
- 各 Agent が「実装の暗黙前提」を**設計判断ログ**として Orchestrator に随時報告するルール
- Orchestrator が中間チェックポイントを設けて、各Agentに「現時点で他Agentが知るべき決定はあるか」と能動的に問う
- API契約確定後も「実装の細部レベルの仕様」を契約として明文化する

## 改善アクション

### 実施済み
- [x] **A5: レビュー成果を `/review-implementation` スキルの examples に追加**
  - `.claude/skills/review-implementation/examples/20260412-phase2-approval-workflow.md` を作成
  - 良いレビュー報告書のお手本として、Critical/High/Medium/Low 分類・場所/症状/修正案/影響範囲の必須記載・H1のような「テストはパスするが受け入れ条件を満たさない機能不足型指摘」の見本を残した
- [x] **検討課題への結論: フルメッシュ型 Agent Teams への移行を決定**
  - ハイブリッド型は構造的弱みが H1 として顕在化したため、次フェーズからフルメッシュ型を採用
  - CLAUDE.md「Agent間通信方針」を「（ハイブリッド型）」→「（フルメッシュ型）」に書き換え
  - 全 Agent が `SendMessage` で相互直接通信、設計判断ログの即時発信を義務化
  - Orchestrator 中間チェックポイント (主要層完了時の能動問い合わせ) を追加
- [x] **A1 を併せて反映: 中間チェックポイント方式の導入**
  - フルメッシュ型と統合する形で CLAUDE.md「Orchestrator 中間チェックポイント」項を追加
- [x] **A2: 横断的非機能要件の事前共有を Orchestrator 必須作業化**
  - `/start-implementation` スキルにステップ 6.5「横断的制約リストの作成」を追加
  - 起動プロンプトテンプレートに「横断的制約 (Orchestrator 事前共有事項)」セクションを必須化
  - rate limit / seed データ / 構造化エラー規約 等を Agent 起動前に明示的に列挙する運用に

### 次回に向けて（未実施・候補として保留）

- [ ] **A3: レビュー観点の追加 - 「他Agentの前提を壊す実装」チェック** (中)
  - 契約クエリのハードコード抽出
  - フックの流用が SoD・除外ルールと矛盾しないかチェック
- [ ] **A4: mockの波及検知ヘルパー** (中)
  - interface 拡張時、すべての mock 実装への新規メソッド追加を pre-commit hook 等で検知
- [ ] **次フェーズでの検証**: フルメッシュ型 Agent Teams 運用で認識齟齬数・コスト増を実測し、ハイブリッド型と比較する

---
**生成日:** 2026-04-12
**生成者:** Claude Code
