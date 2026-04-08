---
name: debug-issue
description: Investigate and analyze issues in development or production environment
---

# Debug Issue - 問題調査支援

このスキルは、本番・開発環境で発生した問題の調査を支援します。

## 使用方法

```
/debug-issue
```

---

## 調査フロー

### 1. 問題のヒアリング

以下の情報を収集します：

- **問題の概要**: 何が起きているか（エラーメッセージ、異常な動作等）
- **発生環境**: 本番 / ステージング / 開発
- **発生タイミング**: いつから発生しているか
- **再現手順**: どうすれば再現するか
- **影響範囲**: どのユーザー・機能が影響を受けているか
- **緊急度**: Critical / High / Medium / Low

### 2. ログ・エラーメッセージの分析

```markdown
#### 分析項目
- [ ] エラースタックトレースの確認
- [ ] エラーの発生箇所特定（ファイル名・行番号）
- [ ] エラーの種類（認証エラー、DB接続エラー、バリデーションエラー等）
- [ ] 関連するログエントリの抽出
```

### 3. 影響サービスの特定

マイクロサービスのどこで問題が発生しているか特定します：

- [ ] **Frontend**: ブラウザコンソールエラー、レンダリング問題
- [ ] **BFF**: API エンドポイント、リクエスト/レスポンス
- [ ] **Backend**: ビジネスロジック、データベース
- [ ] **インフラ**: Docker, ネットワーク、環境変数

### 4. 関連ステアリングファイルの特定

問題が発生した機能に関連するステアリングファイルを特定します：

```bash
# 最近の変更を確認
ls -lt .steering/

# 該当するステアリングディレクトリ
.steering/[YYYYMMDD]-[タスク名]/
```

関連ドキュメント：
- `requirements.md`: この機能の仕様
- `design.md`: 実装設計
- `tasklist.md`: 実装されたタスク

### 5. 原因の仮説立て

収集した情報から原因の仮説を立てます：

#### チェックポイント
- [ ] 最近のコード変更（git log, git diff）
- [ ] 環境変数の設定ミス
- [ ] データベーススキーマの不整合
- [ ] API契約の違反
- [ ] 依存ライブラリのバージョン問題
- [ ] リソース不足（メモリ、CPU、ディスク）
- [ ] 外部サービスの障害

### 6. デバッグ手順の提示

仮説に基づいて、具体的なデバッグ手順を提示します：

```markdown
## デバッグ手順

### ステップ1: ログの確認
\`\`\`bash
# Frontend
npm run dev -- --debug

# BFF
docker compose logs bff -f

# Backend
docker compose logs backend -f
\`\`\`

### ステップ2: データベースの確認
\`\`\`bash
docker compose exec bff-db psql -U bff_user -d bff_db
# SELECT * FROM users WHERE id = 'xxx';
\`\`\`

### ステップ3: API呼び出しの確認
\`\`\`bash
curl -X GET http://localhost:8080/api/v1/merchants \
  -H "Cookie: session_token=xxx"
\`\`\`
```

### 7. 修正案の提示

#### クイックフィックス（緊急対応）
本番で即座に問題を解決する暫定対応：
- ロールバック
- 設定変更
- 再起動

#### 恒久対応（根本解決）
問題の根本原因を解決する対応：
- コード修正
- テスト追加
- ドキュメント更新
- 再発防止策

---

## 出力形式

```markdown
# Debug Report

## 問題の概要
- **問題**: ログイン後に403エラーが発生
- **環境**: 開発環境
- **発生タイミング**: 2025-04-08 18:00以降
- **緊急度**: High

## 分析結果

### エラーメッセージ
\`\`\`
403 Forbidden: Permission denied for merchant.read
\`\`\`

### 影響サービス
- BFF (services/bff/internal/handler/auth.go:123)

### 原因の仮説
1. 権限チェックロジックのバグ（可能性: 高）
2. セッション情報の不整合（可能性: 中）
3. データベースの権限データ不足（可能性: 低）

### 関連ステアリングファイル
- `.steering/20250407-frontend-bff-only/`

## デバッグ手順

### ステップ1: BFFのログ確認
\`\`\`bash
docker compose logs bff -f | grep "Permission"
\`\`\`

### ステップ2: セッション情報の確認
\`\`\`bash
# Redis/DBからセッション情報を取得
\`\`\`

### ステップ3: 権限チェックロジックの確認
\`\`\`
services/bff/internal/middleware/auth.go:56
\`\`\`

## 修正案

### クイックフィックス（即座に対応）
\`\`\`go
// services/bff/internal/middleware/auth.go:56
// 一時的に権限チェックをスキップ（本番環境では実施しないこと）
if os.Getenv("SKIP_PERMISSION_CHECK") == "true" {
    return next(c)
}
\`\`\`

### 恒久対応（根本解決）
1. 権限チェックロジックの修正
   - 場所: services/bff/internal/middleware/auth.go:56
   - 修正内容: hasPermission() の実装を見直し

2. テストの追加
   - 権限チェックのユニットテスト
   - 権限不足時のE2Eテスト

3. ドキュメント更新
   - `.steering/20250407-frontend-bff-only/design.md` に権限チェックの詳細を追記

## 再発防止策
- 権限チェックのテストカバレッジを向上
- デプロイ前のE2Eテスト必須化
- 権限関連の変更は必ずレビュー2名以上
```

---

## 注意事項

- 本番環境での調査は慎重に行ってください
- 個人情報・機密情報をログに出力しないよう注意
- クイックフィックスは一時的な対応であり、必ず恒久対応を実施してください
- 調査結果は `.steering/[YYYYMMDD]-[タスク名]/debug-report.md` として保存することを推奨
