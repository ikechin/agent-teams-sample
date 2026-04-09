---
name: submodule-sync
description: Sync all submodules to latest commits
---

# Submodule Sync

このスキルは、すべてのサブモジュールを最新の状態に同期します。

## 使用方法

```
/submodule-sync
```

## 実行内容

1. すべてのサブモジュールを最新コミットに更新
2. 各サブモジュールのブランチとコミットハッシュを表示
3. 親リポジトリでサブモジュール参照を更新

## コマンド

```bash
# すべてのサブモジュールを更新
git submodule update --remote --merge

# 各サブモジュールの状態を確認
git submodule status

# サブモジュール参照を更新してコミット
git add services/
git commit -m "chore: Update submodule references"
```

## トラブルシューティング

### サブモジュールが古いコミットを指している

```bash
cd services/frontend
git checkout main
git pull origin main
cd ../..
git add services/frontend
git commit -m "chore: Update frontend to latest"
```

### サブモジュールの変更が反映されない

```bash
# サブモジュールを強制更新
git submodule update --init --recursive --force
```

### 新しいサブモジュールを追加した場合

```bash
# 初期化して取得
git submodule update --init --recursive
```

## 詳細

### サブモジュールの更新プロセス

1. **各サブモジュールで最新のmainブランチを取得**
2. **親リポジトリがサブモジュールの最新コミットを参照**
3. **親リポジトリでコミット・プッシュして参照を更新**

### サブモジュールの状態確認

```bash
# 各サブモジュールの現在のコミット
git submodule status

# 各サブモジュールの詳細情報
git submodule foreach 'echo "=== $name ===" && git status && git log -1 --oneline'
```

---

**最終更新日:** 2026-04-09
**作成者:** Claude Code
