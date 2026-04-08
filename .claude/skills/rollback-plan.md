---
name: rollback-plan
description: Create rollback plan for deployment failures
---

# Rollback Plan - ロールバック支援

このスキルは、デプロイ失敗時のロールバック計画を作成します。

## Parameters

- `$1`: ステアリングディレクトリ名（例: `20250407-frontend-bff-only`）

## 使用方法

```
/rollback-plan 20250407-frontend-bff-only
```

---

## ロールバック計画フロー

### 1. デプロイ内容の分析

ステアリングファイルから、デプロイされた変更内容を分析します。

```markdown
## デプロイ内容

### 対象サービス
- Frontend
- BFF
- Backend

### 変更内容
- API追加/変更
- データベーススキーマ変更
- 環境変数追加
- 依存ライブラリ更新
```

### 2. ロールバックの必要性判定

どのような状況でロールバックが必要か定義します。

```markdown
## ロールバックトリガー

### Critical（即座にロールバック）
- [ ] アプリケーションが起動しない
- [ ] 重大なセキュリティ脆弱性が発見された
- [ ] データ損失が発生している
- [ ] 全ユーザーに影響する機能障害

### High（迅速にロールバック検討）
- [ ] 主要機能が動作しない
- [ ] パフォーマンスが著しく低下している
- [ ] 一部ユーザーに深刻な影響

### Medium（修正 or ロールバック検討）
- [ ] 一部機能が動作しない
- [ ] 軽微なパフォーマンス低下
- [ ] UIの表示崩れ

### Low（修正で対応）
- [ ] 軽微なバグ
- [ ] ログ出力の問題
```

### 3. ロールバック手順の作成

サービスごとのロールバック手順を作成します。

#### 3.1 アプリケーションコードのロールバック

```markdown
### アプリケーションコードのロールバック

#### ロールバック対象コミット
- 現在のコミット: `abc1234`
- ロールバック先: `def5678`（前回の安定バージョン）

#### 手順

**1. Gitで前バージョンに戻す**
\`\`\`bash
# 該当ブランチに移動
git checkout main

# ロールバック先のコミットを確認
git log --oneline -10

# ロールバック実行（revert推奨）
git revert abc1234..HEAD

# または、特定のコミットに戻す（force pushが必要）
git reset --hard def5678
git push origin main --force
\`\`\`

**2. 再デプロイ**
\`\`\`bash
# Frontend
cd services/frontend
npm run build
# デプロイコマンド（環境により異なる）

# BFF
cd services/bff
go build -o bin/api cmd/api/main.go
# デプロイコマンド

# Backend
cd services/backend
go build -o bin/grpc cmd/grpc/main.go
# デプロイコマンド
\`\`\`

**3. 動作確認**
\`\`\`bash
# ヘルスチェック
curl http://frontend-url/
curl http://bff-url/health
curl http://backend-url/health

# 主要機能の確認
# - ログイン
# - 加盟店一覧表示
# - その他主要機能
\`\`\`
```

#### 3.2 データベースマイグレーションのロールバック

```markdown
### データベースマイグレーションのロールバック

#### ロールバック対象マイグレーション
[.steering/$1/design.md からDBマイグレーション内容を抽出]

#### 手順

**1. Flywayでマイグレーションを確認**
\`\`\`bash
# BFF DB
docker compose -f services/bff/docker-compose.yml exec bff-db psql -U bff_user -d bff_db
SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;
\q
\`\`\`

**2. ロールバックSQLの準備**

Flywayは自動ロールバックをサポートしていないため、手動でダウンマイグレーションSQLを実行します。

\`\`\`sql
-- 例: V003__add_tags_to_merchants.sql のロールバック
ALTER TABLE merchants DROP COLUMN IF EXISTS tags;
\`\`\`

**3. ロールバックSQLの実行**
\`\`\`bash
# BFF DB
docker compose -f services/bff/docker-compose.yml exec bff-db psql -U bff_user -d bff_db -c "
ALTER TABLE merchants DROP COLUMN IF EXISTS tags;
"

# Backend DB
docker compose -f services/backend/docker-compose.yml exec backend-db psql -U backend_user -d backend_db -c "
-- ロールバックSQL
"
\`\`\`

**4. Flyway履歴の更新（オプション）**

Flywayの履歴テーブルを手動で更新する場合：
\`\`\`sql
DELETE FROM flyway_schema_history WHERE version = '003';
\`\`\`

**注意**: 本番環境では慎重に実施してください。データ損失のリスクがあります。

**5. 動作確認**
\`\`\`bash
# テーブル構造の確認
docker compose -f services/bff/docker-compose.yml exec bff-db psql -U bff_user -d bff_db -c "\d merchants"
\`\`\`
```

#### 3.3 環境変数のロールバック

```markdown
### 環境変数のロールバック

#### 追加された環境変数
[.steering/$1/requirements.md から環境変数の変更を抽出]

#### 手順

**1. 環境変数を削除 or 前の値に戻す**
\`\`\`bash
# 本番環境の環境変数管理ツールで削除 or 変更
# 例: AWS Systems Manager Parameter Store, Kubernetes Secrets, etc.
\`\`\`

**2. サービスの再起動**
\`\`\`bash
# 環境変数を反映するためにサービスを再起動
# 例: Kubernetes
kubectl rollout restart deployment/frontend
kubectl rollout restart deployment/bff
kubectl rollout restart deployment/backend
\`\`\`
```

#### 3.4 API契約のロールバック

```markdown
### API契約のロールバック

#### 変更されたAPI
[contracts/openapi/ の変更内容を抽出]

#### 手順

**1. OpenAPI仕様を前バージョンに戻す**
\`\`\`bash
# contracts/openapi/bff-api.yaml を前バージョンに戻す
git show def5678:contracts/openapi/bff-api.yaml > contracts/openapi/bff-api.yaml
git add contracts/openapi/bff-api.yaml
git commit -m "revert: API契約を前バージョンに戻す"
\`\`\`

**2. Frontend側の型を再生成**
\`\`\`bash
cd services/frontend
npm run generate:types
\`\`\`

**3. API呼び出しコードのロールバック**

Gitでアプリケーションコードをロールバックすれば自動的に戻ります。
```

### 4. ロールバック順序の決定

マイクロサービスの依存関係を考慮し、ロールバック順序を決定します。

```markdown
## ロールバック順序

### 推奨順序（依存関係の逆順）

1. **Frontend** （最初にロールバック）
   - 理由: ユーザー影響を最小化
   - 時間: 5分

2. **BFF** （次にロールバック）
   - 理由: Frontendが前バージョンAPIを呼べるようにする
   - 時間: 10分（DBマイグレーションロールバック含む）

3. **Backend** （最後にロールバック）
   - 理由: BFFが前バージョンAPIを呼べるようにする
   - 時間: 10分（DBマイグレーションロールバック含む）

### 合計所要時間
**約25分**（並行実行可能な場合は短縮）
```

### 5. リスク評価

ロールバックに伴うリスクを評価します。

```markdown
## ロールバックのリスク

### データ損失リスク

| 変更内容 | リスク | 対策 |
|---------|--------|------|
| テーブル追加 | 低 | データを削除する前にバックアップ |
| カラム追加 | 低 | データを削除する前にバックアップ |
| カラム変更 | 高 | データ移行が困難な可能性 |
| データ削除 | 高 | 事前にバックアップ必須 |

### サービス停止時間

- **推定停止時間**: 25分
- **許容停止時間**: [ビジネス要件により決定]

### 影響範囲

- **影響ユーザー数**: [推定]
- **影響機能**: [リスト]

### 後方互換性

- [ ] 前バージョンのFrontendが新バージョンのBFF APIを呼べるか → [Yes/No]
- [ ] 前バージョンのBFFが新バージョンのBackend APIを呼べるか → [Yes/No]
```

### 6. ロールバック後の確認項目

```markdown
## ロールバック後の確認項目

### 動作確認

- [ ] Frontendが正常に表示される
- [ ] ログイン機能が動作する
- [ ] 主要機能（加盟店一覧等）が動作する
- [ ] エラーログに異常がない

### データ整合性確認

- [ ] データベースのテーブル構造が正しい
- [ ] データが欠損していない
- [ ] 外部キー制約が維持されている

### パフォーマンス確認

- [ ] レスポンスタイムが正常
- [ ] CPUメモリ使用率が正常範囲内

### セキュリティ確認

- [ ] 認証・認可が正常に動作
- [ ] セキュリティ脆弱性が解消されている（該当する場合）
```

---

## 出力形式

```markdown
# Rollback Plan

## ステアリングディレクトリ
`.steering/20250407-frontend-bff-only/`

## デプロイ内容

### 対象サービス
- Frontend (Next.js)
- BFF (Go + Echo)
- E2E (Playwright)

### 変更内容
- ログイン機能実装
- 加盟店一覧機能実装
- セッションベース認証
- PostgreSQL + Flyway環境構築

### DBマイグレーション
- BFF: V001__create_users.sql, V002__create_sessions.sql

### 環境変数追加
- BFF: SESSION_SECRET

### API契約変更
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- GET /api/v1/auth/me
- GET /api/v1/merchants

## ロールバックトリガー

✅ Critical: アプリケーション起動失敗 → **即座にロールバック**

## ロールバック手順

### 1. Frontend のロールバック（5分）

#### 現在のコミット
`abc1234` (feat: ログイン・加盟店一覧実装)

#### ロールバック先
`def5678` (前回の安定バージョン)

#### コマンド
\`\`\`bash
git checkout main
git revert abc1234..HEAD
# または
git reset --hard def5678
git push origin main --force

cd services/frontend
npm run build
# デプロイ
\`\`\`

### 2. BFF のロールバック（10分）

#### アプリケーションコード
\`\`\`bash
git checkout main
git revert abc1234..HEAD
cd services/bff
go build -o bin/api cmd/api/main.go
# デプロイ
\`\`\`

#### DBマイグレーション
\`\`\`bash
# V002のロールバック
docker compose -f services/bff/docker-compose.yml exec bff-db psql -U bff_user -d bff_db -c "
DROP TABLE IF EXISTS sessions;
DELETE FROM flyway_schema_history WHERE version = '002';
"

# V001のロールバック
docker compose -f services/bff/docker-compose.yml exec bff-db psql -U bff_user -d bff_db -c "
DROP TABLE IF EXISTS users;
DELETE FROM flyway_schema_history WHERE version = '001';
"
\`\`\`

#### 環境変数
\`\`\`bash
# SESSION_SECRET を削除
# 本番環境の環境変数管理ツールで削除
\`\`\`

### 3. E2E テストの削除（2分）

\`\`\`bash
git revert <e2e-commit-hash>
\`\`\`

## ロールバック順序

1. Frontend → 2. BFF → 3. E2E

**合計所要時間: 約17分**

## リスク評価

### データ損失リスク

| 変更内容 | リスク | 対策 |
|---------|--------|------|
| users テーブル削除 | 中 | ロールバック前にデータエクスポート |
| sessions テーブル削除 | 低 | セッションは一時的なので影響小 |

### 推奨対策
\`\`\`bash
# ロールバック前にデータをバックアップ
docker compose -f services/bff/docker-compose.yml exec bff-db pg_dump -U bff_user bff_db > backup_$(date +%Y%m%d_%H%M%S).sql
\`\`\`

### サービス停止時間
- **推定停止時間**: 17分
- **影響ユーザー**: 全ユーザー
- **影響機能**: ログイン、加盟店一覧

## ロールバック後の確認項目

### 動作確認
- [ ] Frontend トップページが表示される
- [ ] 既存機能（該当する場合）が動作する
- [ ] エラーログに異常がない

### データ整合性確認
- [ ] データベースが前バージョンの状態に戻っている
- [ ] flyway_schema_history が正しい

### パフォーマンス確認
- [ ] レスポンスタイムが正常

## 再発防止策

1. ステージング環境で十分にテストしてから本番デプロイ
2. カナリアリリース（段階的ロールアウト）の検討
3. ロールバック手順の事前テスト
4. モニタリング・アラート体制の強化
5. 本番デプロイ前のチェックリスト整備（`/prepare-pr`の活用）

## 関連ドキュメント

- ステアリングファイル: `.steering/20250407-frontend-bff-only/`
- DBマイグレーション: `services/bff/migrations/`
- API仕様: `contracts/openapi/bff-api.yaml`
```

---

## 注意事項

- ロールバックは最終手段です。可能であれば前方修正（hotfix）を優先してください
- データベースのロールバックは特に慎重に実施してください（データ損失のリスク）
- 本番環境でのロールバック実施前に、必ずステージング環境で手順を確認してください
- ロールバック実施時は、チーム全体に通知し、承認を得てから実施してください
- ロールバック計画は `.steering/$1/rollback-plan.md` として保存することを推奨
- 大規模なデプロイの場合は、事前にロールバック計画をレビューしてください
