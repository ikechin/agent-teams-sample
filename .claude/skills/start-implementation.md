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

### 7. 実装対象サービスのブランチ作成（Agent Teams開始前）

**重要:** Agent Teams実装を開始する前に、Orchestrator（あなた）が実装対象の各サービスでfeatureブランチを作成してください。

#### 手順

**1. tasklist.mdから実装対象サービスを特定**

```
tasklist.mdの「Agent別タスク分担」セクションを確認し、
以下のいずれかのAgentが担当するサービスを特定：
- Frontend Agent → services/frontend/
- BFF Agent → services/bff/
- Backend Agent → services/backend/
```

**2. 各サービスでブランチ作成**

各サービスのディレクトリに移動し、mainから新しいfeatureブランチを作成します。

**ブランチ命名規則:**
```
feature/<issue-number>-<task-name>
```

**例: Frontend→BFF実装の場合**
```bash
# Frontendブランチ作成
cd services/frontend
git checkout main
git pull origin main
git checkout -b feature/1-frontend-bff-impl
cd ../..

# BFFブランチ作成
cd services/bff
git checkout main
git pull origin main
git checkout -b feature/1-frontend-bff-impl
cd ../..
```

**例: 全サービス実装の場合**
```bash
# Frontend
cd services/frontend && git checkout main && git pull origin main && git checkout -b feature/2-full-implementation && cd ../..

# BFF
cd services/bff && git checkout main && git pull origin main && git checkout -b feature/2-full-implementation && cd ../..

# Backend
cd services/backend && git checkout main && git pull origin main && git checkout -b feature/2-full-implementation && cd ../..
```

**3. ブランチ作成の確認**
```bash
# 各サービスのブランチを確認
cd services/frontend && git branch && cd ../..
cd services/bff && git branch && cd ../..
cd services/backend && git branch && cd ../..
```

**4. Agent Teamsへの指示**

Agent Teams起動時に、各Agentに以下を明示的に指示してください：
```
- Frontend Agent: services/frontend/ の feature/<ブランチ名> で作業
- BFF Agent: services/bff/ の feature/<ブランチ名> で作業
- Backend Agent: services/backend/ の feature/<ブランチ名> で作業
```

#### 注意事項

- **mainブランチでの直接作業は禁止**
- **全Agentが同じブランチ名を使用** (例: `feature/1-frontend-bff-impl`)
- **ブランチ作成後は各Agentに現在のブランチを確認させる** (`git branch --show-current`)
- **実装完了後は各サービスで個別にPRを作成**

### 8. Agent Teamsプロンプトを生成・実行

以下のプロンプトを実行してください（`$1` を実際の引数に置き換え）：

```
Agent Teamsを使用して、以下のタスクを並行実装してください。

タスク定義: .steering/$1/tasklist.md

**重要: ブランチ確認**
各Agentは作業開始前に必ず以下を実行してください：
1. 現在のブランチを確認: `git branch --show-current`
2. featureブランチにいることを確認（mainブランチでの作業は禁止）
3. ブランチ名が正しいことを確認

**ブランチ情報:**
- Frontend Agent: services/frontend/ の feature/<ブランチ名>
- BFF Agent: services/bff/ の feature/<ブランチ名>
- Backend Agent: services/backend/ の feature/<ブランチ名>

必須確認ドキュメント:
1. .steering/$1/requirements.md - 要求定義
2. .steering/$1/design.md - 設計
3. .steering/$1/tasklist.md - タスクリスト
4. docs/ENVIRONMENT.md - 環境設定
5. contracts/openapi/ または contracts/proto/ - API仕様
6. services/{service}/CLAUDE.md - サービス別開発ルール
7. services/{service}/docs/development-guidelines.md - Git規約含む

Agent構成は tasklist.md の「Agent別タスク分担」セクションを参照してください。

実装完了後、各Agentは担当サービスのブランチでコミットし、
Orchestratorが統合確認後に各サービスでPRを作成します。
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
