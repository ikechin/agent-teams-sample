---
name: check-docs-sync
description: Check if code and documentation are synchronized
---

# Check Docs Sync - ドキュメント同期チェック

このスキルは、コードとドキュメントの乖離を検出し、更新が必要なドキュメントをリスト化します。

## 使用方法

```
/check-docs-sync
```

---

## チェックフロー

### 1. API実装と契約の同期チェック

#### チェック項目

```markdown
### API実装 vs OpenAPI仕様

- [ ] `contracts/openapi/bff-api.yaml` に定義されたエンドポイントがすべて実装されているか
- [ ] 実装されているエンドポイントがすべてOpenAPI仕様に記載されているか
- [ ] リクエスト/レスポンスの型が一致しているか
- [ ] HTTPステータスコードが一致しているか
- [ ] 認証・認可の要件が一致しているか
```

#### チェック方法

**BFF APIエンドポイントの抽出:**
```bash
# OpenAPI仕様からエンドポイント一覧を取得
grep -E "^\s+(/api/v1/[^:]+):" contracts/openapi/bff-api.yaml

# BFF実装からエンドポイント一覧を取得
grep -r "e.GET\|e.POST\|e.PUT\|e.DELETE\|e.PATCH" services/bff/internal/handler/
```

**差分の検出:**
- OpenAPI仕様にあるが実装にないエンドポイント → **実装不足**
- 実装にあるがOpenAPI仕様にないエンドポイント → **ドキュメント不足**

### 2. 実装済み機能とドキュメントの整合性チェック

#### チェック項目

```markdown
### 機能実装 vs 永続的ドキュメント

#### Frontend
- [ ] `services/frontend/docs/functional-design.md` に記載された機能がすべて実装されているか
- [ ] 画面遷移図と実際のルーティングが一致しているか
- [ ] UIコンポーネント構成が設計通りか

#### BFF
- [ ] `services/bff/docs/functional-design.md` に記載されたAPI仕様が実装されているか
- [ ] ミドルウェア（認証・認可・ログ等）が設計通りか
- [ ] データ変換ロジックが設計通りか

#### Backend
- [ ] `services/backend/docs/functional-design.md` に記載されたビジネスロジックが実装されているか
- [ ] データモデルが設計通りか
- [ ] gRPCサービスが設計通りか
```

### 3. 用語統一チェック

#### チェック項目

```markdown
### コード vs docs/glossary.md

- [ ] `docs/glossary.md` に定義された用語がコード上で使われているか
- [ ] コード上の主要な用語が `docs/glossary.md` に定義されているか
- [ ] 用語の英語・日本語対応が正しいか
- [ ] 命名規則が統一されているか
```

#### チェック方法

**用語の使用状況確認:**
```bash
# glossary.md から用語を抽出
grep "^###" docs/glossary.md

# 各用語がコードベースで使われているか確認
grep -r "Merchant\|Contract\|Service" services/
```

**用語の不統一を検出:**
- 同じ概念を異なる用語で表現していないか（例: "加盟店" と "店舗" の混在）
- キャメルケース/スネークケースが統一されているか

### 4. データベーススキーマとドキュメントの同期チェック

#### チェック項目

```markdown
### DB実装 vs 設計ドキュメント

- [ ] Flywayマイグレーションファイルで定義されたテーブル構造がドキュメントと一致するか
- [ ] ER図とテーブル定義が一致するか
- [ ] インデックスが設計通りに設定されているか
- [ ] 外部キー制約が設計通りか
```

#### チェック方法

**テーブル定義の抽出:**
```bash
# Flywayマイグレーションファイルからテーブル定義を確認
cat services/bff/migrations/*.sql | grep "CREATE TABLE"
cat services/backend/migrations/*.sql | grep "CREATE TABLE"

# 設計ドキュメントのER図と照合
```

### 5. ステアリングファイルの完了ステータス確認

#### チェック項目

```markdown
### .steering/[YYYYMMDD]-[タスク名]/tasklist.md

- [ ] すべてのタスクが completed になっているか
- [ ] 実装中に追加された変更が記録されているか
- [ ] 完了条件がすべて満たされているか
```

#### チェック方法

```bash
# 最新のステアリングディレクトリを確認
ls -lt .steering/

# tasklist.mdの状態を確認
grep "\- \[" .steering/[YYYYMMDD]-[タスク名]/tasklist.md
```

### 6. 環境変数のドキュメント同期チェック

#### チェック項目

```markdown
### .env ファイル vs docs/ENVIRONMENT.md

- [ ] すべての環境変数が `docs/ENVIRONMENT.md` に記載されているか
- [ ] コード上で参照される環境変数が定義されているか
- [ ] 環境変数の説明が最新か
```

#### チェック方法

**環境変数の抽出:**
```bash
# .envファイルから環境変数を抽出
grep -h "^[A-Z_]" services/*/.env services/*/.env.local 2>/dev/null | cut -d= -f1 | sort -u

# コードから環境変数の参照を抽出
grep -rh "os.Getenv\|process.env\|Getenv" services/ | grep -oE "[A-Z_]{3,}" | sort -u

# docs/ENVIRONMENT.md に記載されている環境変数
grep "^###\|^\*\*" docs/ENVIRONMENT.md
```

---

## 出力形式

```markdown
# Documentation Sync Report

## 実行日時
2025-04-08 20:00:00

## サマリー

| チェック項目 | 状態 | 問題数 |
|------------|------|--------|
| API実装 vs OpenAPI仕様 | ❌ | 3 |
| 機能実装 vs ドキュメント | ✅ | 0 |
| 用語統一 | ⚠️ | 2 |
| DB実装 vs 設計 | ✅ | 0 |
| ステアリングファイル完了状況 | ✅ | 0 |
| 環境変数 vs ドキュメント | ⚠️ | 1 |

**全体**: ⚠️ 6件の問題が見つかりました

---

## 1. API実装 vs OpenAPI仕様

### ❌ 問題: OpenAPI仕様に定義されているが実装されていないエンドポイント

1. **GET /api/v1/merchants/:id**
   - 場所: `contracts/openapi/bff-api.yaml:125`
   - 影響: Frontend側で加盟店詳細を取得できない
   - 対応: BFFに実装を追加

2. **PUT /api/v1/merchants/:id**
   - 場所: `contracts/openapi/bff-api.yaml:145`
   - 影響: Frontend側で加盟店情報を更新できない
   - 対応: BFFに実装を追加

### ⚠️ 問題: 実装されているがOpenAPI仕様に記載されていないエンドポイント

1. **GET /api/v1/health**
   - 場所: `services/bff/internal/handler/health.go:12`
   - 影響: API仕様が不完全
   - 対応: OpenAPI仕様に追加（または除外を明示）

### ✅ 正常: リクエスト/レスポンスの型は一致しています

---

## 2. 機能実装 vs ドキュメント

### ✅ 問題なし

すべての機能が設計ドキュメントと一致しています。

---

## 3. 用語統一

### ⚠️ 問題: 用語の不統一

1. **"加盟店" と "Merchant" の不統一**
   - 場所: `services/frontend/src/components/StoreList.tsx`
   - 問題: ファイル名に "Store" が使われているが、glossary.md では "Merchant" が正式用語
   - 対応: ファイル名を `MerchantList.tsx` にリネーム

2. **"契約" と "Agreement" の混在**
   - 場所: `services/backend/internal/domain/agreement.go`
   - 問題: glossary.md では "Contract" が正式用語だが、コードでは "Agreement" が使用
   - 対応: "Agreement" を "Contract" にリネーム、または glossary.md を更新

---

## 4. DB実装 vs 設計

### ✅ 問題なし

データベーススキーマは設計ドキュメントと一致しています。

---

## 5. ステアリングファイル完了状況

### ✅ 問題なし

`.steering/20250407-frontend-bff-only/tasklist.md` のすべてのタスクが completed になっています。

---

## 6. 環境変数 vs ドキュメント

### ⚠️ 問題: ドキュメントに記載されていない環境変数

1. **LOG_LEVEL**
   - 場所: `services/bff/.env` (参照: `services/bff/internal/logger/logger.go:23`)
   - 問題: `docs/ENVIRONMENT.md` に記載がない
   - 対応: ドキュメントに追加

---

## 更新が必要なドキュメント

### 高優先度
1. `contracts/openapi/bff-api.yaml`
   - GET /api/v1/health エンドポイントを追加

2. `docs/ENVIRONMENT.md`
   - LOG_LEVEL 環境変数を追加

### 中優先度
3. `docs/glossary.md`
   - "Agreement" vs "Contract" の用語を統一

### 低優先度
4. ファイルリネーム
   - `services/frontend/src/components/StoreList.tsx` → `MerchantList.tsx`

---

## 推奨対応

### ステップ1: OpenAPI仕様の更新（最優先）
```bash
# contracts/openapi/bff-api.yaml を編集
# - GET /api/v1/merchants/:id を実装に合わせて追加 or 削除
# - PUT /api/v1/merchants/:id を実装に合わせて追加 or 削除
# - GET /api/v1/health を追加
```

### ステップ2: ドキュメントの更新
```bash
# docs/ENVIRONMENT.md に LOG_LEVEL を追加
# docs/glossary.md の用語を統一
```

### ステップ3: コードの修正（必要に応じて）
```bash
# ファイルリネーム
git mv services/frontend/src/components/StoreList.tsx services/frontend/src/components/MerchantList.tsx

# 用語の統一（リファクタリング）
# "Agreement" → "Contract"
```

### ステップ4: 再チェック
```bash
/check-docs-sync
```

---

## 自動化の提案

定期的にこのチェックを実行するため、以下を推奨します：

1. **Pre-commit hook**
   - コミット前に用語統一チェックを実行

2. **CI/CD パイプライン**
   - PR作成時に自動でドキュメント同期チェックを実行
   - 問題があればPRをブロック

3. **定期実行（週次）**
   - cron jobで毎週月曜日にチェックを実行
   - Slackに結果を通知
```

---

## 注意事項

- ドキュメントとコードの乖離は、時間が経つほど修正コストが高くなります
- 定期的にこのチェックを実行し、早期に問題を発見してください
- 大きな変更（API追加、ドメイン用語変更等）の際は、必ずドキュメントも同時に更新してください
- チェック結果は `.steering/[YYYYMMDD]-[タスク名]/docs-sync-report.md` として保存することを推奨
