---
name: setup-dev-env
description: Setup development environment for new team members
---

# Setup Dev Environment - 開発環境セットアップ

このスキルは、新しいチームメンバーが開発環境をセットアップするためのガイドを提供します。

## 使用方法

```
/setup-dev-env
```

---

## セットアップフロー

### 1. 必要なツールの確認

以下のツールがインストールされているか確認します：

```bash
# Node.js (v18以上)
node --version

# npm
npm --version

# Go (v1.21以上)
go version

# Docker
docker --version

# Docker Compose
docker compose version

# Git
git --version
```

#### インストールが必要な場合

**macOS:**
```bash
# Homebrew経由でインストール
brew install node go docker git
```

**Windows:**
- [Node.js公式サイト](https://nodejs.org/)
- [Go公式サイト](https://go.dev/dl/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git公式サイト](https://git-scm.com/)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y nodejs npm golang docker.io docker-compose git
```

### 2. リポジトリのクローン

```bash
# リポジトリをクローン
git clone <repository-url>
cd agent-teams-sample

# ブランチの確認
git branch -a
```

### 3. 環境変数ファイルの作成

各サービスの `.env` ファイルを作成します。

#### Frontend (.env.local)

```bash
# services/frontend/.env.local
cat > services/frontend/.env.local <<'EOF'
NEXT_PUBLIC_BFF_API_URL=http://localhost:8080
EOF
```

#### BFF (.env)

```bash
# services/bff/.env
cat > services/bff/.env <<'EOF'
# Server
PORT=8080

# Database
DB_HOST=bff-db
DB_PORT=5432
DB_USER=bff_user
DB_PASSWORD=bff_password
DB_NAME=bff_db
DB_SSLMODE=disable

# Session
SESSION_SECRET=your-secret-key-change-in-production

# Backend (将来の実装用)
BACKEND_GRPC_ADDR=backend:50051
EOF
```

#### Backend (.env)

```bash
# services/backend/.env
cat > services/backend/.env <<'EOF'
# Server
GRPC_PORT=50051

# Database
DB_HOST=backend-db
DB_PORT=5432
DB_USER=backend_user
DB_PASSWORD=backend_password
DB_NAME=backend_db
DB_SSLMODE=disable
EOF
```

詳細は [`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md) を参照してください。

### 4. 依存関係のインストール

#### Frontend

```bash
cd services/frontend
npm install
cd ../..
```

#### BFF

```bash
cd services/bff
go mod download
cd ../..
```

#### Backend

```bash
cd services/backend
go mod download
cd ../..
```

### 5. Dockerコンテナの起動

#### BFF環境の起動

```bash
cd services/bff
docker compose up -d
cd ../..
```

起動するコンテナ：
- `bff-db`: PostgreSQL (ポート 5432)
- `bff-flyway`: Flywayマイグレーション

#### Backend環境の起動（将来実装時）

```bash
cd services/backend
docker compose up -d
cd ../..
```

#### E2E環境の起動（テスト実行時）

```bash
cd e2e
docker compose up -d
cd ..
```

### 6. データベースマイグレーションの実行

```bash
# BFF
cd services/bff
docker compose up bff-flyway
cd ../..
```

マイグレーションが成功したことを確認：
```bash
docker compose -f services/bff/docker-compose.yml logs bff-flyway
```

### 7. 開発サーバーの起動

#### Frontend

```bash
cd services/frontend
npm run dev
# http://localhost:3000 でアクセス可能
```

#### BFF

```bash
cd services/bff
go run cmd/api/main.go
# http://localhost:8080 でアクセス可能
```

#### Backend（将来実装時）

```bash
cd services/backend
go run cmd/grpc/main.go
# gRPC: localhost:50051
```

### 8. 疎通確認

#### 8.1 BFFのヘルスチェック

```bash
curl http://localhost:8080/health
# 期待される出力: {"status":"ok"}
```

#### 8.2 Frontendの確認

ブラウザで http://localhost:3000 を開く

#### 8.3 ログイン確認

テストユーザーでログイン：
- メールアドレス: `test@example.com`
- パスワード: `password123`

#### 8.4 データベース接続確認

```bash
# BFF DB
docker compose -f services/bff/docker-compose.yml exec bff-db psql -U bff_user -d bff_db -c "\dt"

# テーブル一覧が表示されればOK
```

### 9. トラブルシューティング

#### ポートが既に使用されている

```bash
# ポート使用状況の確認
lsof -i :3000  # Frontend
lsof -i :8080  # BFF
lsof -i :5432  # PostgreSQL

# プロセスを停止
kill -9 <PID>
```

#### Dockerコンテナが起動しない

```bash
# ログの確認
docker compose -f services/bff/docker-compose.yml logs

# コンテナの再起動
docker compose -f services/bff/docker-compose.yml down
docker compose -f services/bff/docker-compose.yml up -d
```

#### 依存関係のインストールエラー

```bash
# Frontendのキャッシュクリア
cd services/frontend
rm -rf node_modules package-lock.json
npm install

# Goのモジュールキャッシュクリア
cd services/bff
go clean -modcache
go mod download
```

#### データベースマイグレーションの失敗

```bash
# Flywayのログ確認
docker compose -f services/bff/docker-compose.yml logs bff-flyway

# データベースを初期化してやり直し
docker compose -f services/bff/docker-compose.yml down -v
docker compose -f services/bff/docker-compose.yml up -d bff-db
docker compose -f services/bff/docker-compose.yml up bff-flyway
```

#### 環境変数が読み込まれない

```bash
# .envファイルが正しい場所にあるか確認
ls -la services/frontend/.env.local
ls -la services/bff/.env
ls -la services/backend/.env

# サーバーを再起動
```

---

## セットアップ完了チェックリスト

```markdown
- [ ] Node.js, Go, Docker, Gitがインストールされている
- [ ] リポジトリがクローンされている
- [ ] 環境変数ファイル (.env) が作成されている
- [ ] Frontend: npm install が成功している
- [ ] BFF: go mod download が成功している
- [ ] Backend: go mod download が成功している
- [ ] Dockerコンテナが起動している
- [ ] データベースマイグレーションが成功している
- [ ] Frontend開発サーバーが起動している (http://localhost:3000)
- [ ] BFF開発サーバーが起動している (http://localhost:8080)
- [ ] BFFのヘルスチェックが成功している
- [ ] テストユーザーでログインできる
```

すべてにチェックが入れば、開発環境のセットアップは完了です！

---

## 次のステップ

セットアップが完了したら、以下のドキュメントを確認してください：

1. [`docs/QUICKSTART.md`](../../docs/QUICKSTART.md) - 新セッションでの開発開始方法
2. [`CLAUDE.md`](../../CLAUDE.md) - プロジェクト全体の開発ルール
3. `.steering/[YYYYMMDD]-[タスク名]/` - 現在のタスクのステアリングファイル

開発を開始する場合は、以下のスキルを使用してください：

```
/start-implementation <steering-directory-name>
```

---

## 参考リンク

- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Go公式ドキュメント](https://go.dev/doc/)
- [Echo (Go Web Framework)](https://echo.labstack.com/)
- [Docker Compose公式ドキュメント](https://docs.docker.com/compose/)
- [Flyway公式ドキュメント](https://flywaydb.org/documentation/)
