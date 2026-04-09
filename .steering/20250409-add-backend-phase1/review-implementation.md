# Implementation Review Report

## Summary
- ステアリングディレクトリ: `.steering/20250409-add-backend-phase1`
- 対象サービス: Backend (`services/backend/`)
- レビュー実施日時: 2026-04-09

---

## Issues Found

### Critical (重大) - 1件

1. **[J-SOX] 監査記録の失敗がサイレントに無視される**
   - 場所: `internal/service/merchant_service.go:159-161`
   - 問題: `CreateMerchant` で監査レコード（contract_changes）の書き込みが失敗しても、ログ出力のみで処理が成功扱いになる。J-SOX要件として監査記録は必須であり、記録できない場合はトランザクション全体を失敗させるべき。
   - 修正案: 加盟店作成と監査記録を同一トランザクション内で実行し、監査記録が失敗した場合はロールバックする。

### High (高) - 2件

1. **[並行性] 加盟店コード自動採番にレースコンディションの可能性**
   - 場所: `internal/repository/merchant_repository.go:95-123`
   - 問題: `GetMaxMerchantCode` で最大値を取得してから `CreateMerchant` するまでの間に、別リクエストが同じコードを生成する可能性がある。並行リクエスト時にUNIQUE制約違反が発生する。
   - 修正案: `SELECT ... FOR UPDATE` を使用するか、PostgreSQLのシーケンスを活用する、またはリトライロジックを追加する。

2. **[エラーハンドリング] エラー判定が文字列比較に依存**
   - 場所: `internal/grpc/merchant_server.go:73,130-134`
   - 問題: `strings.Contains(err.Error(), "invalid merchant_id")` や `"duplicate"`, `"unique"` でエラー種別を判定している。エラーメッセージが変更されると判定が壊れる。
   - 修正案: カスタムエラー型（`errors.Is` / `errors.As` で判定可能な型）をサービス層で定義し、gRPC層で型判定する。

### Medium (中) - 3件

1. **[トランザクション] CreateMerchant にトランザクション管理がない**
   - 場所: `internal/service/merchant_service.go:119-170`
   - 問題: 加盟店作成（INSERT）と監査記録作成（INSERT）が別々のDB操作として実行されている。部分的な失敗時にデータ不整合が発生する可能性がある。
   - 修正案: `database/sql.Tx` を使用してトランザクションで括る。

2. **[パフォーマンス] ListMerchants の検索クエリ**
   - 場所: `db/queries/merchant.sql:1-10`
   - 問題: `ILIKE '%' || @search || '%'` は前方一致インデックスが効かない。データ量が増えるとフルスキャンになる。
   - 現時点の影響: Phase 1のデータ量では問題なし。将来的にデータ増加時に対応が必要。

3. **[セキュリティ] DB接続にコネクションプール設定がない**
   - 場所: `cmd/server/main.go:44-48`
   - 問題: `sql.Open()` 後に `SetMaxOpenConns`, `SetMaxIdleConns`, `SetConnMaxLifetime` が設定されていない。本番環境で接続数が無制限に増加する可能性がある。
   - 修正案: 適切なコネクションプール設定を追加する。

### Low (軽微) - 2件

1. **[コード品質] GetMaxMerchantCode の型アサーション処理が複雑**
   - 場所: `internal/repository/merchant_repository.go:101-108`
   - 問題: `interface{}` から `string` / `[]byte` への型アサーション処理がやや冗長。sqlcの型定義を活用して戻り値型を明確にできる。

2. **[テスト] テストカバレッジ確認が必要**
   - 問題: リポジトリ層のテストがない（モックで代替されているため単体テストとしては問題ないが）。
   - 備考: 統合テスト（testcontainers）はPhase 1スコープ外だが、将来的に追加推奨。

---

## Checklist Results

### 1. ステアリングファイル準拠性
- ✅ requirements.md との整合性: **95%** (19/20)
  - ✅ ListMerchants（ページネーション + search）実装済み
  - ✅ GetMerchant（UUID指定）実装済み
  - ✅ CreateMerchant（コード自動採番 + 監査記録）実装済み
  - ✅ gRPCサーバー（ポート50051）実装済み
  - ✅ Docker Compose設定完備
  - ❌ 監査記録の信頼性（Critical #1: 失敗時にサイレント無視）

- ✅ design.md との整合性: **100%** (20/20)
  - ✅ Protocol Buffers定義が設計通り
  - ✅ merchantsテーブル定義が設計通り
  - ✅ contract_changesテーブル定義が設計通り（汎用形式）
  - ✅ 初期データ2件が設計通り
  - ✅ ディレクトリ構成が設計通り
  - ✅ Docker Compose設定が設計通り
  - ✅ gRPC Reflection Service有効化済み
  - ✅ エラーハンドリング（gRPCステータスコード対応）

- ✅ tasklist.md との整合性: **100%** (28/28)
  - ✅ 環境セットアップ完了
  - ✅ Protocol Buffers生成完了
  - ✅ データベースマイグレーション作成完了
  - ✅ sqlcクエリ定義・生成完了
  - ✅ ドメインモデル作成完了
  - ✅ リポジトリ層実装完了
  - ✅ サービス層実装完了
  - ✅ gRPCサーバー実装完了
  - ✅ サーバー起動（main.go）完了
  - ✅ テスト実装完了（22テスト全パス）

### 2. 機能過不足
- ✅ 機能過剰チェック: **PASS**
  - スコープ外の実装なし
  - 過度な抽象化なし
  - `ListChangesByResource` はauditリポジトリに含まれるが、将来利用を見据えた最小限の追加
- ⚠️ 機能不足チェック: **1件** (Critical #1)

### 3. API契約準拠性 (Protocol Buffers)
- ✅ `contracts/proto/merchant.proto` と実装が一致: **100%**
  - ✅ 3つのRPC全て実装
  - ✅ リクエスト・レスポンス型が正確
  - ✅ gRPCステータスコードが仕様通り

### 4. 用語統一
- ✅ 用語統一: **PASS**
  - Merchant（加盟店）: 統一使用
  - ContractChange: 設計通り
  - コード上の命名がglossary準拠

### 5. セキュリティ
- ✅ SQLインジェクション対策: **PASS** (sqlcプレースホルダー使用)
- ✅ 環境変数から機密情報読込: **PASS**
- ✅ ログに機密情報なし: **PASS**
- ✅ gRPC内部ネットワークのみ: **PASS** (設計方針に準拠)
- ⚠️ コネクションプール: **未設定** (Medium #3)

### 6. パフォーマンス
- ✅ ページネーション: **実装済み** (デフォルト20件)
- ✅ インデックス: **設計通り**（merchant_code, name, is_active）
- ⚠️ ILIKE検索: **インデックス非活用** (Medium #2, 現時点では許容)

### 7. J-SOX準拠
- ✅ contract_changesテーブル: **設計通り**
- ✅ 改ざん防止ルール: **PASS** (DELETE/UPDATE禁止ルール)
- ✅ 変更者・変更日時の記録: **PASS**
- ❌ 監査記録の信頼性: **FAIL** (Critical #1)

### 8. コード品質
- ✅ go vet: **クリーン**
- ✅ go fmt: **クリーン**
- ✅ テスト: **22/22 全パス**
  - サービス層: 11テスト
  - gRPCハンドラー: 11テスト
- ✅ インターフェースベース設計: **PASS** (モック可能)
- ✅ 構造化ログ (zap): **PASS**

### 9. ドキュメント整合性
- ✅ 既存ドキュメントとの整合: **PASS**
- ✅ ENVIRONMENT.md との整合: **PASS**（ポート番号、DB設定）

---

## Recommendations

### 必須対応 (Critical)
1. **監査記録をトランザクション化する**: 加盟店作成と監査記録作成を `database/sql.Tx` で同一トランザクションに包み、監査記録失敗時はロールバックする。J-SOX要件として監査記録の欠損は許容されない。

### 推奨対応 (High)
2. **加盟店コード採番のレースコンディション対策**: シーケンスの利用またはリトライロジックの追加。
3. **カスタムエラー型の導入**: サービス層でセンチネルエラー（`ErrNotFound`, `ErrValidation`等）を定義し、gRPC層で `errors.Is` で判定する。

### 将来対応 (Medium/Low)
4. コネクションプール設定追加
5. 将来的にデータ増加時のILIKE検索パフォーマンス対策
6. 統合テスト（testcontainers）の追加

---

**レビュー担当:** Claude Code (Orchestrator)
**レビュー日:** 2026-04-09
