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
```

#### サブモジュール特有の注意事項

**コミット・プッシュの順序:**
1. 各サブモジュール内でコミット・プッシュ
2. 親リポジトリでサブモジュール参照を更新（必要な場合）

**mainブランチでの直接作業は禁止**
**全Agentが同じブランチ名を使用** (例: `feature/1-frontend-bff-impl`)
**ブランチ作成後は各Agentに現在のブランチを確認させる** (`git branch --show-current`)
**実装完了後は各サブモジュールで個別にPRを作成**

### 8. Agent Teamsプロンプトを生成・実行

以下のプロンプトを実行してください（`$1` を実際の引数に置き換え）：

```
Agent Teamsを使用して、以下のタスクを並行実装してください。

**重要: サブモジュール構成**
各サービスは独立したGitリポジトリ（サブモジュール）です。
各Agentは自分のサブモジュール内で独立してコミット・プッシュしてください。

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
