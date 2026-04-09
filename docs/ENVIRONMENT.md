# 🔧 環境設定チートシート

**すべてのポート番号・環境変数・Dockerコマンドをこの1ページにまとめています**

---

## 📡 ポート番号一覧

| サービス | ポート | URL | 説明 |
|---------|--------|-----|------|
| **Frontend** | 3000 | http://localhost:3000 | Next.js開発サーバー |
| **BFF** | 8080 | http://localhost:8080 | Go Echo APIサーバー |
| **BFF DB** | 5432 | localhost:5432 | PostgreSQL（BFF用） |
| **Backend** | 50051 | localhost:50051 | gRPCサーバー |
| **Backend DB** | 5433 | localhost:5433 | PostgreSQL（Backend用） |

---

## 🔑 環境変数

### Frontend (`services/frontend/.env.local`)

```bash
# BFF API URL
NEXT_PUBLIC_BFF_API_URL=http://localhost:8080

# Next.js設定
NODE_ENV=development
```

**作成方法:**
```bash
cd services/frontend
cat > .env.local <<EOF
NEXT_PUBLIC_BFF_API_URL=http://localhost:8080
NODE_ENV=development
EOF
```

---

### BFF (`services/bff/.env`)

```bash
# サーバー設定
PORT=8080
ENVIRONMENT=development

# データベース接続
DATABASE_URL=postgres://bff_user:bff_password@localhost:5432/bff_db?sslmode=disable

# セッション設定
SESSION_SECRET=your-secret-key-change-in-production
SESSION_EXPIRY=86400

# ログ設定
LOG_LEVEL=debug
```

**作成方法:**
```bash
cd services/bff
cat > .env <<EOF
PORT=8080
ENVIRONMENT=development
DATABASE_URL=postgres://bff_user:bff_password@localhost:5432/bff_db?sslmode=disable
SESSION_SECRET=your-secret-key-change-in-production
SESSION_EXPIRY=86400
LOG_LEVEL=debug
EOF
```

**注意:** `SESSION_SECRET`は本番環境では必ず変更してください。

---

### Backend (`services/backend/.env`)

```bash
# サーバー設定
PORT=50051

# データベース接続
DATABASE_URL=postgres://backend_user:backend_password@localhost:5433/backend_db?sslmode=disable

# ログ設定
LOG_LEVEL=debug
```

**作成方法:**
```bash
cd services/backend
cat > .env <<EOF
PORT=50051
DATABASE_URL=postgres://backend_user:backend_password@localhost:5433/backend_db?sslmode=disable
LOG_LEVEL=debug
EOF
```

---

### E2E Test (`e2e/.env`)

```bash
# テスト対象のURL
FRONTEND_URL=http://localhost:3000
BFF_URL=http://localhost:8080

# テストユーザー認証情報
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

**作成方法:**
```bash
cd e2e
cat > .env <<EOF
FRONTEND_URL=http://localhost:3000
BFF_URL=http://localhost:8080
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
EOF
```

---

## 🐳 Docker Composeコマンド

### BFF開発環境

**ディレクトリ:** `services/bff/`

**起動:**
```bash
cd services/bff
docker compose up -d
```

**含まれるサービス:**
- `bff-db`: PostgreSQL データベース（ポート5432）
- `bff-flyway`: Flywayマイグレーション（起動時に自動実行）
- `bff`: Go Echoサーバー（ポート8080）

**停止:**
```bash
docker compose down
```

**ログ確認:**
```bash
# 全サービスのログ
docker compose logs -f

# 特定のサービスのログ
docker compose logs -f bff
docker compose logs -f bff-db
docker compose logs -f bff-flyway
```

**DB接続確認:**
```bash
docker compose exec bff-db psql -U bff_user -d bff_db -c "\dt"
```

**Flywayマイグレーション再実行:**
```bash
docker compose up bff-flyway
```

---

### Backend開発環境

**ディレクトリ:** `services/backend/`

**起動:**
```bash
cd services/backend
docker compose up -d
```

**含まれるサービス:**
- `backend-db`: PostgreSQL データベース（ポート5433）
- `backend-flyway`: Flywayマイグレーション（起動時に自動実行）
- `backend`: Go gRPCサーバー（ポート50051）

**停止:**
```bash
docker compose down
```

**ログ確認:**
```bash
docker compose logs -f backend
docker compose logs -f backend-db
```

**DB接続確認:**
```bash
docker compose exec backend-db psql -U backend_user -d backend_db -c "\dt"
```

**gRPC動作確認（grpcurl）:**
```bash
# サービス一覧
grpcurl -plaintext localhost:50051 list

# 加盟店一覧取得
grpcurl -plaintext -d '{"page": 1, "limit": 20}' localhost:50051 merchant.MerchantService/ListMerchants
```

---

### E2E Test環境

**ディレクトリ:** `e2e/`

**起動:**
```bash
cd e2e
docker compose up -d
```

**含まれるサービス:**
- `frontend`: Next.jsアプリ（ポート3000）
- `bff`: Go Echoサーバー（ポート8080）
- `bff-db`: PostgreSQL（ポート5432）
- `bff-flyway`: Flywayマイグレーション

**テスト実行:**
```bash
# E2E環境起動後
npm run test:e2e
```

**停止:**
```bash
docker compose down
```

---

## 🗄️ データベース接続情報

### BFF Database

```
Host: localhost
Port: 5432
Database: bff_db
Username: bff_user
Password: bff_password
```

**psqlで接続:**
```bash
psql -h localhost -p 5432 -U bff_user -d bff_db
# パスワード: bff_password
```

**Docker Composeから接続:**
```bash
cd services/bff
docker compose exec bff-db psql -U bff_user -d bff_db
```

**テーブル一覧確認:**
```sql
\dt
```

**テーブル構造確認:**
```sql
\d users
\d roles
\d permissions
\d sessions
\d audit_logs
```

---

### Backend Database

```
Host: localhost
Port: 5433
Database: backend_db
Username: backend_user
Password: backend_password
```

**psqlで接続:**
```bash
psql -h localhost -p 5433 -U backend_user -d backend_db
# パスワード: backend_password
```

**Docker Composeから接続:**
```bash
cd services/backend
docker compose exec backend-db psql -U backend_user -d backend_db
```

**テーブル構造確認:**
```sql
\d merchants
\d contract_changes
```

---

## 🧪 テストユーザー情報

### デフォルトテストユーザー

```
Email: test@example.com
Password: password123
Role: contract-manager
Permissions: merchant.read
```

**このユーザーは:**
- BFF DBに初期データとして登録されます（`V10__seed_users.sql`）
- E2Eテストで使用されます
- ログイン画面でテスト可能です

---

## 🔄 よく使うコマンド集

### Frontend開発

```bash
cd services/frontend

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# 型チェック
npm run type-check

# Lint
npm run lint

# ビルド
npm run build
```

### BFF開発

```bash
cd services/bff

# 依存関係インストール
go mod download

# sqlc生成
sqlc generate

# サーバー起動（ローカル）
go run cmd/server/main.go

# テスト実行
go test ./...

# フォーマット
go fmt ./...

# Lint
go vet ./...
```

### E2E Test

```bash
cd e2e

# Playwrightインストール
npm install
npx playwright install

# Docker Compose起動
docker compose up -d

# テスト実行
npm run test:e2e

# 特定のテスト実行
npx playwright test tests/auth/login-flow.spec.ts

# UIモードでテスト
npx playwright test --ui

# レポート表示
npx playwright show-report
```

---

## 🚨 トラブルシューティング

### ポートが既に使用されている

**エラー:** `port 3000 is already allocated`

**解決方法:**
```bash
# 使用中のプロセスを確認
lsof -i :3000
lsof -i :8080
lsof -i :5432

# プロセスを終了
kill -9 <PID>

# または、Docker Composeを停止
docker compose down
```

### データベース接続エラー

**エラー:** `connection refused` または `FATAL: password authentication failed`

**解決方法:**
```bash
# Docker Composeを再起動
cd services/bff
docker compose down
docker compose up -d

# ログ確認
docker compose logs bff-db

# DBコンテナが起動しているか確認
docker compose ps
```

### Flywayマイグレーションエラー

**エラー:** `Flyway migration failed`

**解決方法:**
```bash
# Flywayコンテナのログ確認
docker compose logs bff-flyway

# マイグレーションをクリーンアップ（開発環境のみ）
docker compose exec bff-db psql -U bff_user -d bff_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# マイグレーション再実行
docker compose up bff-flyway
```

### 環境変数が読み込まれない

**解決方法:**
```bash
# .envファイルが存在するか確認
ls -la services/frontend/.env.local
ls -la services/bff/.env
ls -la e2e/.env

# .envファイルを再作成（このドキュメントの環境変数セクションを参照）

# サーバーを再起動
# Frontend: Ctrl+C して npm run dev
# BFF: docker compose restart bff
```

---

## 📋 環境設定チェックリスト

実装開始前に以下を確認してください：

### 全体
- [ ] `.claude/settings.json` に `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` が設定済み
- [ ] Claude Codeを再起動済み

### Frontend
- [ ] `services/frontend/.env.local` 作成済み
- [ ] `NEXT_PUBLIC_BFF_API_URL=http://localhost:8080` 設定済み

### BFF
- [ ] `services/bff/.env` 作成済み
- [ ] `DATABASE_URL` 設定済み
- [ ] `docker compose up -d` でBFF環境起動済み
- [ ] Flywayマイグレーション成功確認済み（`docker compose logs bff-flyway`）

### E2E Test
- [ ] `e2e/.env` 作成済み
- [ ] `TEST_USER_EMAIL` と `TEST_USER_PASSWORD` 設定済み
- [ ] Playwrightインストール済み（`npx playwright install`）

---

## 🔗 関連ドキュメント

- [docs/QUICKSTART.md](QUICKSTART.md) - Quick Start Guide
- [.steering/20250407-frontend-bff-only/requirements.md](../.steering/20250407-frontend-bff-only/requirements.md) - 要求定義
- [.steering/20250407-frontend-bff-only/design.md](../.steering/20250407-frontend-bff-only/design.md) - 設計
- [services/frontend/docs/development-guidelines.md](../services/frontend/docs/development-guidelines.md) - Frontend開発ガイドライン
- [services/bff/docs/development-guidelines.md](../services/bff/docs/development-guidelines.md) - BFF開発ガイドライン

---

**最終更新日:** 2026-04-08
**作成者:** Claude Code
