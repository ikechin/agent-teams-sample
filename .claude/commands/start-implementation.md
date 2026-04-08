# Start Implementation with Agent Teams

このコマンドは、実装対象のステアリングディレクトリを自動検出し、Agent Teams実装を開始します。

## 実行内容

1. `.steering/` ディレクトリ配下の最新のステアリングディレクトリを検出
2. ステアリングファイル（requirements.md, design.md, tasklist.md）を確認
3. Agent Teamsプロンプトを生成し、並行実装を開始

## 手順

### ステップ1: 最新のステアリングディレクトリを確認

```bash
ls -lt .steering/ | head -5
```

最新のディレクトリ（最上部）が実装対象です。

### ステップ2: ステアリングディレクトリ名を確認

**確認したディレクトリ名:** `.steering/[YYYYMMDD]-[タスク名]/`

例: `.steering/20250407-frontend-bff-only/`

### ステップ3: 重要なドキュメントを確認

以下のファイルが存在することを確認してください：

1. `.steering/[YYYYMMDD]-[タスク名]/requirements.md` - 要求定義
2. `.steering/[YYYYMMDD]-[タスク名]/design.md` - 設計
3. `.steering/[YYYYMMDD]-[タスク名]/tasklist.md` - タスクリスト
4. `docs/ENVIRONMENT.md` - 環境設定

### ステップ4: requirements.mdを読む

```
実装対象のステアリングディレクトリ内の requirements.md を読んでください。
以下の情報を確認：
- 実装する機能のスコープ
- 実装しない機能（次回以降）
- Agent分担
- 制約事項
```

### ステップ5: tasklist.mdを読む

```
実装対象のステアリングディレクトリ内の tasklist.md を読んでください。
以下の情報を確認：
- Agent別タスク分担
- Agent間の依存関係
- 実装順序
```

### ステップ6: Agent Teamsプロンプトを実行

以下のプロンプトを実行してください（`[YYYYMMDD]-[タスク名]` を実際のディレクトリ名に置き換えてください）：

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

---

## トラブルシューティング

### `.steering/` ディレクトリが見つからない

```bash
# ルートディレクトリにいることを確認
pwd

# .steering/ ディレクトリが存在するか確認
ls -la | grep steering
```

### ステアリングファイルが不完全

```bash
# 必要なファイルが存在するか確認
ls -la .steering/[YYYYMMDD]-[タスク名]/
```

以下の3ファイルが必須です：
- `requirements.md`
- `design.md`
- `tasklist.md`

### Agent Teamsが起動しない

1. `.claude/settings.json` に `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` が設定されているか確認
2. Claude Codeを再起動
3. 新しいセッションを開始

---

## 参考

- [docs/QUICKSTART.md](../../docs/QUICKSTART.md) - Quick Start Guide
- [docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md) - 環境設定チートシート
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体のルール
