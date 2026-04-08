# 🚀 Quick Start Guide

**新しいセッション・新しい開発者はここから始めてください**

---

## このプロジェクトは何か（3行要約）

**加盟店契約管理システム** - 企業の加盟店管理と契約のライフサイクル管理を行う社内向けWebアプリケーション。
マイクロサービスアーキテクチャ（Frontend + BFF + Backend）を採用し、J-SOX対応の監査証跡機能を備えています。
Claude Code Agent Teams機能を使用して、複数のAgentが並行開発を行います。

---

## 📊 現在の開発状況

### ✅ 完了済み
- ✅ **ドキュメント作成フェーズ完了**
  - ルート永続的ドキュメント（`docs/`）: 6ファイル完成
  - Frontend Service（`services/frontend/`）: CLAUDE.md + docs 3ファイル完成
  - BFF Service（`services/bff/`）: CLAUDE.md + docs 3ファイル完成
  - Backend Service（`services/backend/`）: CLAUDE.md + docs 3ファイル完成
- ✅ **初回実装用ステアリングファイル作成完了**
  - `.steering/20250407-frontend-bff-only/`: requirements.md, design.md, tasklist.md
  - OpenAPI仕様: `contracts/openapi/bff-api.yaml`
- ✅ **Agent Teams環境設定完了**
  - `.claude/settings.json`: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

### 🎯 次のステップ
- **Agent Teamsで並行実装開始**（Frontend Agent, BFF Agent, E2E Test Agent）

---

## 🏃 Agent Teams実装の開始方法（推奨: スラッシュコマンド使用）

### 🎯 最速の方法: スラッシュコマンドを使用

**新セッション開始時に以下のコマンドを実行してください:**

```
/start-implementation
```

このコマンドは自動的に以下を実行します：
1. 実装対象のステアリングディレクトリを確認
2. 必要なドキュメントを読み込み
3. Agent Teamsプロンプトを生成・実行

**メリット:**
- ✅ プロンプトの揺れを防止
- ✅ 常に最新のステアリングディレクトリを自動検出
- ✅ 開発メンバー全員が同じ手順で実装開始

---

## 📖 手動で開始する場合（4ステップ）

スラッシュコマンドが使えない場合は、以下の手順で手動実行してください。

### ステップ0: 実装対象のタスクを確認

**重要:** 新セッション開始時は、まず実装対象のステアリングディレクトリを確認してください。

```bash
# .steering/ ディレクトリ配下を確認
ls -la .steering/
```

**ステアリングディレクトリの命名規則:**
```
.steering/[YYYYMMDD]-[タスク名]/
```

**例:**
- `.steering/20250407-frontend-bff-only/` - Frontend + BFF のみ実装
- `.steering/20250415-add-backend/` - Backend追加実装
- `.steering/20250420-add-contract-feature/` - 契約機能追加

**現在の実装対象は [docs/initial-setup-tasks.md](initial-setup-tasks.md) の「現在の実装対象」セクションに記載されています。**

---

### ステップ1: 重要なドキュメントを確認

新セッション開始時は、以下のドキュメントを順番に確認してください：

1. **[このファイル（QUICKSTART.md）](QUICKSTART.md)** ← 今ここ
2. **[docs/initial-setup-tasks.md](initial-setup-tasks.md)** - 現在の実装対象を確認
3. **`.steering/[YYYYMMDD]-[タスク名]/requirements.md`** - 今回実装する機能の要求定義
4. **`.steering/[YYYYMMDD]-[タスク名]/tasklist.md`** - Agent別の具体的なタスク一覧
5. **[docs/ENVIRONMENT.md](ENVIRONMENT.md)** - ポート番号・環境変数のチートシート

**読む順番が重要です。上記の順番で読むことで、最短時間で実装開始できます。**

---

### ステップ2: 現在のタスクのスコープを確認

実装対象のステアリングディレクトリ内の `requirements.md` で、以下を確認してください：

- **実装する機能**: どの機能を実装するか
- **実装しない機能**: 次回以降のタスクに延期される機能
- **Agent分担**: どのAgentが何を担当するか
- **制約事項**: 技術的制約や環境設定

---

### ステップ3: Agent Teams起動

**前提条件:**
- `.claude/settings.json` に `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` が設定済み（✅完了）
- Claude Codeが再起動済み

**Orchestratorプロンプトテンプレート:**

```
Agent Teamsを使用して、以下のタスクを並行実装してください。

タスク定義: .steering/[YYYYMMDD]-[タスク名]/tasklist.md

必須確認ドキュメント:
1. .steering/[YYYYMMDD]-[タスク名]/requirements.md - 要求定義
2. .steering/[YYYYMMDD]-[タスク名]/design.md - 設計
3. .steering/[YYYYMMDD]-[タスク名]/tasklist.md - タスクリスト
4. docs/ENVIRONMENT.md - 環境設定
5. contracts/openapi/ または contracts/proto/ - API仕様

Agent構成は tasklist.md の「Agent別タスク分担」セクションを参照してください。
各Agentの担当範囲、タスク、参照ドキュメントが記載されています。

実装順序と依存関係は tasklist.md の「Agent間の依存関係」セクションを参照してください。

各Agentは進捗をtasklist.mdのチェックボックスで報告してください。
```

**注意:** `[YYYYMMDD]-[タスク名]` は実装対象のステアリングディレクトリ名に置き換えてください。

**例（`.steering/20250407-frontend-bff-only/` の場合）:**
```
タスク定義: .steering/20250407-frontend-bff-only/tasklist.md
```

---

## 📚 重要なドキュメントへのリンク集

### コンテキストクリーン時に最初に読むべきドキュメント（優先度順）

| 優先度 | ファイル | 内容 | 読むタイミング |
|--------|---------|------|---------------|
| 🔴 必須 | [docs/QUICKSTART.md](QUICKSTART.md) | このファイル | 最初に必ず読む |
| 🔴 必須 | [.steering/20250407-frontend-bff-only/requirements.md](../.steering/20250407-frontend-bff-only/requirements.md) | 今回実装する機能の要求定義 | 2番目に読む |
| 🔴 必須 | [.steering/20250407-frontend-bff-only/tasklist.md](../.steering/20250407-frontend-bff-only/tasklist.md) | Agent別タスク一覧 | 3番目に読む |
| 🔴 必須 | [docs/ENVIRONMENT.md](ENVIRONMENT.md) | 環境設定チートシート | 実装開始前に確認 |
| 🟡 推奨 | [.steering/20250407-frontend-bff-only/design.md](../.steering/20250407-frontend-bff-only/design.md) | 実装設計の詳細 | 実装中に参照 |
| 🟡 推奨 | [contracts/openapi/bff-api.yaml](../contracts/openapi/bff-api.yaml) | BFF API仕様 | API実装時に参照 |
| 🟢 参考 | [CLAUDE.md](../CLAUDE.md) | プロジェクト全体のルール | 必要に応じて参照 |
| 🟢 参考 | [docs/glossary.md](glossary.md) | 用語集 | 用語確認時に参照 |

### 各Agentが参照すべきサービス別ドキュメント

#### Frontend Agent
- [services/frontend/CLAUDE.md](../services/frontend/CLAUDE.md) - Frontend開発ルール
- [services/frontend/docs/functional-design.md](../services/frontend/docs/functional-design.md) - 画面設計
- [services/frontend/docs/development-guidelines.md](../services/frontend/docs/development-guidelines.md) - コーディング規約

#### BFF Agent
- [services/bff/CLAUDE.md](../services/bff/CLAUDE.md) - BFF開発ルール
- [services/bff/docs/functional-design.md](../services/bff/docs/functional-design.md) - API設計
- [services/bff/docs/development-guidelines.md](../services/bff/docs/development-guidelines.md) - コーディング規約

#### E2E Test Agent
- [e2e/README.md](../e2e/README.md) - E2Eテスト概要
- [e2e/test-scenarios.md](../e2e/test-scenarios.md) - テストシナリオ

---

## ⚠️ よくある質問

### Q1: なぜBackend Serviceを実装しないのですか？
**A:** 今回のタスク（`.steering/20250407-frontend-bff-only/`）は、Agent Teams機能の挙動確認を目的とした最小スコープです。BFFは加盟店APIでモックデータを返却し、次回タスクでBackendを実装します。

### Q2: コンテキストが途切れた場合はどうすればいいですか？
**A:** 新しいセッションを開始し、このQUICKSTART.mdを最初に読んでください。必要な情報はすべてドキュメントに記載されています。

### Q3: Agent Teamsが起動しない場合は？
**A:** `.claude/settings.json`の設定を確認し、Claude Codeを再起動してください。それでも解決しない場合は、手動で順次実装することも可能です（BFF → Frontend → E2E Test）。

### Q4: ステアリングファイルのタスクリストはどう更新しますか？
**A:** 各Agentがタスク完了時に、`tasklist.md`の該当チェックボックスを `- [x]` に変更してコミットします。

### Q5: 環境変数やポート番号はどこで確認できますか？
**A:** [docs/ENVIRONMENT.md](ENVIRONMENT.md) にすべてまとまっています。

---

## 🎯 次のアクション

**新しいセッションを開始したら:**

1. ✅ このQUICKSTART.mdを読む（完了）
2. ⬜ [.steering/20250407-frontend-bff-only/requirements.md](../.steering/20250407-frontend-bff-only/requirements.md)を読む
3. ⬜ [.steering/20250407-frontend-bff-only/tasklist.md](../.steering/20250407-frontend-bff-only/tasklist.md)を読む
4. ⬜ [docs/ENVIRONMENT.md](ENVIRONMENT.md)を確認
5. ⬜ Agent Teamsプロンプトを実行

**それでは、良い開発を！**

---

**最終更新日:** 2026-04-08
**作成者:** Claude Code
