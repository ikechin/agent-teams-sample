---
name: start-implementation
description: Start Agent Teams implementation for a specified steering directory
---

# Start Implementation with Agent Teams

このスキルは、指定されたステアリングディレクトリのAgent Teams実装を開始します。

## Parameters

- `$1`: ステアリングディレクトリ名（例: `20250407-frontend-bff-only`）

## 使用方法

```
/start-implementation 20250407-frontend-bff-only
```

**利用可能なステアリングディレクトリを確認:**
```bash
ls -1 .steering/
```

---

## 実行内容

このスキルは以下を自動的に実行します：

1. 指定されたステアリングディレクトリの存在確認
2. 必須ファイル（requirements.md, design.md, tasklist.md）の存在確認
3. ステアリングファイルを読み込み
4. タスクスコープを要約して確認
5. Agent Teamsプロンプトを生成し、並行実装を開始

---

## 実行手順

### 1. 引数の確認

引数 `$1` が提供されているか確認してください。

**引数なしの場合:**
```
エラー: ステアリングディレクトリ名を指定してください。

使用方法: /start-implementation <steering-directory-name>

利用可能なステアリングディレクトリ:
```
```bash
ls -1 .steering/
```
```
例: /start-implementation 20250407-frontend-bff-only
```

### 2. ステアリングディレクトリの存在確認

引数 `$1` を使用して、以下のパスが存在することを確認してください：

```
.steering/$1/
```

**存在しない場合:**
```
エラー: ステアリングディレクトリ `.steering/$1/` が見つかりません。

利用可能なステアリングディレクトリ:
```
```bash
ls -1 .steering/
```
```
使用方法: /start-implementation <steering-directory-name>
例: /start-implementation 20250407-frontend-bff-only
```

### 3. 必須ファイルの存在確認

以下の3つのファイルが存在することを確認してください：

```
.steering/$1/requirements.md
.steering/$1/design.md
.steering/$1/tasklist.md
```

**ファイルが不足している場合:**
```
エラー: 必須ファイルが不足しています。

ステアリングディレクトリ: .steering/$1/

見つからないファイル:
[不足しているファイルをリスト表示]

ステアリングディレクトリには以下の3ファイルが必須です:
- requirements.md
- design.md
- tasklist.md
```

### 4. requirements.mdを読み込む

```
.steering/$1/requirements.md を読み込んでください。

以下の情報を確認し、ユーザーに要約を提示：
- タスクの目的
- 実装するもの（スコープ）
- 実装しないもの（次回以降）
- 制約事項
```

**ユーザーへの確認:**
```
📋 実装対象のタスク: [タスク名]

ステアリングディレクトリ: .steering/$1/

スコープ:
[requirements.mdから抽出したスコープ要約]

このタスクで実装を開始しますか？
- はい → Agent Teams実装を開始します
- いいえ → 実装を中止します
```

### 5. design.mdとtasklist.mdを読み込む

ユーザーが「はい」と回答した場合:

```
.steering/$1/design.md を読み込む
.steering/$1/tasklist.md を読み込む

tasklist.mdから以下を確認:
- Agent別タスク分担
- Agent間の依存関係
- 実装順序
```

### 6. docs/ENVIRONMENT.mdを読み込む

```
docs/ENVIRONMENT.md を読み込んで、環境設定情報を確認してください。
```

### 6.5. 横断的制約リストの作成（フルメッシュ型 Agent Teams 必須事前作業）

**Phase 2 (2026-04-12) 振り返り由来の改善アクション。**
ハイブリッド型から**フルメッシュ型 Agent Teams** への移行に伴い、Orchestrator は
各 Agent 起動前に「横断的制約リスト」を必ず作成し、起動時プロンプトに埋め込む必要があります。

**収集すべき情報:**
- **rate limit**: ログイン (10/min/IP burst 10)、API 呼び出しの上限など
  - 確認場所: `services/bff/cmd/server/main.go` の `loginRateLimitMiddleware` 等
- **セッション関連**: 最大有効期間、同時セッション数の上限など
- **タイムアウト**: gRPC 呼び出し、HTTP リクエスト、DB クエリ
- **共通 middleware の挙動**: auditLog、CORS、CSRF、認証
- **既知の seed データ**: ユーザー、ロール、権限の前提（テスト用追加ユーザーが必要か等）
- **DB 制約**: 外部キー、UNIQUE INDEX、CHECK 制約の存在
- **既存の構造化エラー規約**: ErrorInfo Reason の命名規則、HTTP マッピング

**確認方法:**
```bash
# 例: BFF の middleware 設定確認
grep -rn "RateLimit\|Middleware\|Timeout\|MaxAge" services/bff/cmd/ services/bff/internal/middleware/ 2>&1 | head -30

# 既存の構造化エラー一覧
grep -rn "errdetails.ErrorInfo\|Reason:" services/backend/internal/service/ 2>&1 | head -20

# seed データ
ls services/bff/db/migrations/V*seed*.sql
```

収集した結果は次のステップ 8 で各 Agent の起動プロンプトに必ず埋め込むこと。

### 7. 実装対象サービスのブランチ作成（サブモジュール版）

**重要:** このプロジェクトはサブモジュール構成です。Agent Teams実装を開始する前に、Orchestrator（あなた）が実装対象の各サブモジュールでfeatureブランチを作成してください。

#### 手順

**1. tasklist.mdから実装対象サービスを特定**

```
tasklist.mdの「Agent別タスク分担」セクションを確認し、
以下のいずれかのAgentが担当するサービスを特定：
- Frontend Agent → services/frontend/
- BFF Agent → services/bff/
- Backend Agent → services/backend/
```

**2. 各サブモジュールでブランチ作成**

各サブモジュール（独立したGitリポジトリ）に移動し、mainから新しいfeatureブランチを作成します。

**ブランチ命名規則:**
```
feature/<issue-number>-<task-name>
```

**例: Frontend→BFF実装の場合**
```bash
# Frontendサブモジュールでブランチ作成
cd services/frontend
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/1-frontend-bff-impl
cd ../..

# BFFサブモジュールでブランチ作成
cd services/bff
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/1-frontend-bff-impl
cd ../..
```

**例: 全サービス実装の場合**
```bash
# Frontend
cd services/frontend
git fetch origin && git checkout main && git pull origin main
git checkout -b feature/2-full-implementation
cd ../..

# BFF
cd services/bff
git fetch origin && git checkout main && git pull origin main
git checkout -b feature/2-full-implementation
cd ../..

# Backend
cd services/backend
git fetch origin && git checkout main && git pull origin main
git checkout -b feature/2-full-implementation
cd ../..
```

**3. ブランチ作成の確認**
```bash
# 各サブモジュールのブランチを確認
cd services/frontend && git branch --show-current && cd ../..
cd services/bff && git branch --show-current && cd ../..
cd services/backend && git branch --show-current && cd ../..
```

**4. 親リポジトリのブランチ作成（contracts/更新がある場合）**

API契約やドキュメントを更新する場合、親リポジトリでもブランチを作成：

```bash
# 親リポジトリでブランチ作成
git checkout -b feature/1-frontend-bff-impl
```

**5. Agent Teamsへの指示**

Agent Teams起動時に、各Agentに以下を明示的に指示してください：
```
- Frontend Agent: services/frontend/ (サブモジュール) の feature/<ブランチ名> で作業
- BFF Agent: services/bff/ (サブモジュール) の feature/<ブランチ名> で作業
- Backend Agent: services/backend/ (サブモジュール) の feature/<ブランチ名> で作業
- 各Agentは自分のサブモジュール内でコミット・プッシュ
- Agent 間通信: フルメッシュ型 (CLAUDE.md「Agent間通信方針（フルメッシュ型）」参照)
  すべての Agent は他の全 Agent と SendMessage で直接通信可能。
  実装の暗黙前提（クエリのハードコード、レスポンス形状、エラー区分、
  バリデーション境界値、横断的制約の発見等）を発見した時点で、
  関係する Agent 全員に即座に発信する義務を負う。
```

#### サブモジュール特有の注意事項

**コミット・プッシュの順序:**
1. 各サブモジュール内でコミット・プッシュ
2. 親リポジトリでサブモジュール参照を更新（必要な場合）

**mainブランチでの直接作業は禁止**
**全Agentが同じブランチ名を使用** (例: `feature/1-frontend-bff-impl`)
**ブランチ作成後は各Agentに現在のブランチを確認させる** (`git branch --show-current`)
**実装完了後は各サブモジュールで個別にPRを作成**

### 7.5. チーム context の作成 (TeamCreate) — 必須

**Agent を spawn する前に必ず `TeamCreate` を呼び、チーム context を作成すること。**
これにより以下が同時に作成される:
- `~/.claude/teams/<team-name>/config.json` (チーム設定 + members 配列)
- `~/.claude/tasks/<team-name>/` (チーム共有 TaskList)

```
TeamCreate(
  team_name="<task-name>",                # 例: "20260412-contract-management-phase2"
  description="<タスクの説明>",
)
```

**重要:** `TeamCreate` を呼ばず、後段の `Agent` ツールに `team_name` を指定しないと、
ただの並列バックグラウンド subagent でしかなく、子 Agent 同士の `SendMessage`
直接通信は成立しない。**真の Agent Teams にならない。**

### 7.6. チーム共有タスクの作成

`TaskCreate` で各 Agent 担当タスクをチーム共有 TaskList に登録する。

```
TaskCreate(
  subject="Backend: 承認ワークフロー実装",
  description="V8 マイグレーション、ApprovalService 4 RPC、ContractService 修正…",
)
TaskCreate(subject="BFF: ...", description="...")
TaskCreate(subject="Frontend: ...", description="...")
TaskCreate(subject="E2E: ...", description="...")
```

### 8. Agent Teamsプロンプトを生成・実行

各 Agent を `team_name` を必須指定して spawn する。spawn 後 `TaskUpdate` でタスクを
メンバーに割り当てる。

```
Agent(
  subagent_type="general-purpose",
  name="backend-agent",                       # Required: SendMessage の宛先
  team_name="<task-name>",                    # Required: チーム context への参加
  run_in_background=true,                     # 並列実行のため
  description="Backend Phase 2 implementation",
  prompt="<以下のテンプレ>",
)
# Same for bff-agent, frontend-agent, e2e-agent

# Then assign tasks:
TaskUpdate(taskId="<id>", owner="backend-agent")
TaskUpdate(taskId="<id>", owner="bff-agent")
...
```

各 Agent 起動プロンプトのテンプレ（`$1` を実際の引数に置き換え）：

```
Agent Teamsを使用して、以下のタスクを並行実装してください。

**重要: サブモジュール構成**
各サービスは独立したGitリポジトリ（サブモジュール）です。
各Agentは自分のサブモジュール内で独立してコミット・プッシュしてください。

**重要: Agent 間通信方針（フルメッシュ型 Agent Teams）**
- あなたはチーム `<team-name>` のメンバーです
- チーム config: `~/.claude/teams/<team-name>/config.json` (members を Read で確認可能)
- 他のメンバーには `SendMessage({to: "<name>", message: "...", summary: "..."})` で
  直接 DM 可能。積極的に活用すること
- 自分宛のメッセージは自動配信される (inbox 確認不要)
- TaskList を定期的に確認し、自分に割り当てられたタスクを `TaskUpdate` で進める
- 完了は `TaskUpdate(status="completed")` でマーク (SendMessage で完了報告は不要)
- broadcast (`to: "*"`) は高コストなので、必要最小限の相手にのみ DM する
- 以下を発見・決定した時点で、関係する Agent (および team-lead に CC) に
  「設計判断ログ」として 1〜3 行で即座に発信する義務がある:
  * クエリ・条件式のハードコード (例: WHERE status='PENDING')
  * レスポンス形状の選択 (フィールド命名、optional/null 表現)
  * エラー区分の追加・変更 (新コード、HTTP ステータス、ErrorInfo Reason)
  * バリデーション境界値、権限判定基準
  * 横断的制約の発見 (rate limit、middleware 挙動等)
- 設計方針の変更が必要と判明したら勝手に決めず team-lead (Orchestrator) に上げる
- 矛盾する指示を受けた場合も team-lead に確認する
- 詳細は CLAUDE.md「Agent Teams の正しい使い方」参照

**横断的制約 (Orchestrator 事前共有事項):**
{ステップ 6.5 で収集した rate limit / セッション / middleware / seed データ等を
 Orchestrator がここに具体的に列挙する。例:
 - BFF login rate limit: 10/min/IP burst 10 (services/bff/cmd/server/main.go)
 - 既存 seed user: test@example.com のみ。承認テスト時は別ユーザーの作成が必要
 - 構造化エラー規約: google.rpc.ErrorInfo + Reason="UPPER_SNAKE_CASE" + Domain="contract.example.com"
}

タスク定義: .steering/$1/tasklist.md

**重要: ブランチ確認**
各Agentは作業開始前に必ず以下を実行してください：
1. サブモジュールディレクトリに移動: `cd services/{service}/`
2. 現在のブランチを確認: `git branch --show-current`
3. featureブランチにいることを確認（mainブランチでの作業は禁止）
4. リモート接続確認: `git remote -v`

**ブランチ情報:**
- Frontend Agent: services/frontend/ (サブモジュール) の feature/<ブランチ名>
- BFF Agent: services/bff/ (サブモジュール) の feature/<ブランチ名>
- Backend Agent: services/backend/ (サブモジュール) の feature/<ブランチ名>

**サブモジュールからの相対パス:**
各Agentはサブモジュール内で作業するため、親リポジトリのリソースは相対パスで参照：
- ステアリングファイル: ../../.steering/$1/
- 環境設定: ../../docs/ENVIRONMENT.md
- API契約: ../../contracts/openapi/ または ../../contracts/proto/
- 横断的ドキュメント: ../../docs/

必須確認ドキュメント:
1. ../../.steering/$1/requirements.md - 要求定義
2. ../../.steering/$1/design.md - 設計
3. ../../.steering/$1/tasklist.md - タスクリスト
4. ../../docs/ENVIRONMENT.md - 環境設定
5. ../../contracts/openapi/ または ../../contracts/proto/ - API仕様
6. ./CLAUDE.md - サービス別開発ルール（サブモジュール内）
7. ./docs/development-guidelines.md - Git規約含む（サブモジュール内）

**コミット・プッシュ手順:**
1. サブモジュール内で変更をコミット:
   ```bash
   cd services/frontend
   git add .
   git commit -m "feat: Implement feature"
   git push origin feature/<ブランチ名>
   cd ../..
   ```

2. Orchestratorが親リポジトリでサブモジュール参照を更新（必要な場合）:
   ```bash
   git add services/frontend
   git commit -m "chore: Update frontend submodule"
   git push origin feature/<ブランチ名>
   ```

**PR作成:**
- 各Agentは自分のサブモジュールでPRを作成
- OrchestratorがサブモジュールPRのマージ後、親リポジトリでPRを作成（必要な場合）

Agent構成は tasklist.md の「Agent別タスク分担」セクションを参照してください。
```

### 8.5. 依存関係のある Agent 間のハンドオフ (必須)

**Agent Teams 運用の最重要注意点:** 子 Agent は他 Agent の `TaskUpdate(completed)` を
**自律的には検知しません**。次のメッセージが届くまで idle のまま待機するため、
**Orchestrator が明示的に下流 Agent を wake up する必要があります**。

#### シナリオ

典型的なパターン (Frontend が BFF の OpenAPI 更新を待つ場合):

```
1. backend-agent 実装中 → 完了 → TaskUpdate(completed) → idle
2. bff-agent 実装中 → 完了 → TaskUpdate(completed) → idle
3. frontend-agent は D1-D4 合意後ずっと idle (BFF 完了を自動検知できない)
   → Orchestrator の介入がないと永久に停止
```

#### Orchestrator がやるべきこと

上流 Agent (backend/bff) からの完了通知を会話ターンで受け取ったら、**下流 Agent
(frontend/e2e) に明示的な wake-up DM を送信する**:

```
SendMessage({
  to: "frontend-agent",
  summary: "Backend/BFF完了、実装開始してください",
  message: "<以下を含む具体的な指示>"
})
```

wake-up DM に含めるべき内容:
- **何が完了したか** (例: "bff-agent が GET /api/v1/approvals/pending-count を実装完了、
  親リポの OpenAPI yaml も更新済み")
- **合意済み仕様の再掲** (D1-D4 の結論、エンドポイント名、レスポンス形状等)
- **次にやるべき具体的な手順** (例: "`cd ../.. && git pull` で親リポ同期 →
  `npm run generate:api-types` で型生成 → 実装")
- **完了条件** (テスト、lint、type-check、コミット・プッシュ、TaskUpdate)

#### ハンドオフのチェックポイント

| 依存関係 | Wake-up タイミング |
|---|---|
| BFF Agent は Backend proto 完了後に起動 | Backend Agent が `TaskUpdate(completed)` → Orchestrator が BFF Agent に DM |
| Frontend Agent は BFF OpenAPI 完了後に起動 | BFF Agent が `TaskUpdate(completed)` → Orchestrator が Frontend Agent に DM |
| E2E Agent は Frontend 完了後に起動 | Frontend Agent が `TaskUpdate(completed)` → Orchestrator が E2E Agent を spawn または DM |

#### TaskCreate 時の依存関係明示 (併用推奨)

`TaskCreate` の description に依存関係を明記し、起動後に `TaskUpdate` の `addBlockedBy`
で blocker を設定:

```
TaskCreate(
  subject="Frontend: サイドバーバッジ実装",
  description="依存: Task #2 完了後。BFF の OpenAPI yaml が親リポに push されてから
   型再生成 → 実装。合意済み仕様は .steering/<dir>/design.md を参照"
)
TaskUpdate(taskId="3", addBlockedBy=["2"])
```

これにより下流 Agent が `TaskList` で「自分のタスクは blocker 待ち」と認識できる。
ただし **blocker 解消の自律検知はできない**ので、Orchestrator の明示的 wake-up DM は
引き続き必須。

#### 実例 (参考)

`.steering/20260413-approval-count-badge/retrospective.md` に本問題の初回観測ケースが
記録されている。Frontend Agent が BFF 完了後も idle のまま動かず、Orchestrator が
ファイルシステム覗き見で検知して wake-up DM を送った事例。次回以降は本セクションに従って
完了通知を受けた時点で即座に下流に DM すれば回避可能。

### 9. チームの shutdown と TeamDelete

全タスク完了後、チーム context を片付ける:

```
1. Orchestrator から全メンバーに shutdown_request:
   SendMessage({to: "*", message: {type: "shutdown_request"}})

2. 各メンバーが shutdown_response で承認 → プロセス終了

3. TeamDelete でクリーンアップ:
   TeamDelete()  # 現在のチーム context を削除
```

`TeamDelete` は以下を削除する:
- `~/.claude/teams/<team-name>/`
- `~/.claude/tasks/<team-name>/`

**注意:** `TeamDelete` はアクティブメンバーが残っていると失敗するので、必ず先に
shutdown_request → shutdown_response の合意を取ること。

---

## 使用例

### 例1: Frontend→BFF実装タスクを開始

```
/start-implementation 20250407-frontend-bff-only
```

**実行結果:**
1. `.steering/20250407-frontend-bff-only/` の存在確認 ✅
2. 必須ファイル確認 ✅
3. requirements.mdを読み込み、スコープを要約提示
4. ユーザー確認後、Agent Teams実装開始

### 例2: Backend追加実装タスクを開始

```
/start-implementation 20250415-add-backend
```

**実行結果:**
1. `.steering/20250415-add-backend/` の存在確認 ✅
2. 必須ファイル確認 ✅
3. requirements.mdを読み込み、スコープを要約提示
4. ユーザー確認後、Agent Teams実装開始

---

## トラブルシューティング

### Agent Teamsが起動しない

1. `.claude/settings.json` に `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` が設定されているか確認
2. Claude Codeを再起動
3. 新しいセッションを開始
4. 再度スキルを実行

### ステアリングファイルが見つからない

```bash
# ルートディレクトリにいることを確認
pwd

# .steering/ ディレクトリの存在確認
ls -la | grep steering

# 利用可能なステアリングディレクトリを確認
ls -1 .steering/
```

---

## 参考ドキュメント

- [docs/QUICKSTART.md](../../docs/QUICKSTART.md) - Quick Start Guide
- [docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md) - 環境設定チートシート
- [docs/initial-setup-tasks.md](../../docs/initial-setup-tasks.md) - 現在の実装対象
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体のルール

---

**最終更新日:** 2026-04-08
**作成者:** Claude Code
