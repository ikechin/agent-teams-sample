# Implementation Review Report

## Summary
- ステアリングディレクトリ: `.steering/20250409-bff-grpc-integration`
- 対象サービス: BFF (`services/bff/`)
- レビュー実施日時: 2026-04-10
- レビュー手法: git diff ベース（コンテキスト節約）

---

## Issues Found

### Critical (重大) - 0件

なし

### High (高) - 1件

1. **[パフォーマンス] gRPCクライアントにタイムアウト設定がない**
   - 場所: `internal/handler/merchant_handler.go` - 各gRPC呼び出し箇所
   - 問題: `c.Request().Context()` をそのまま使用しており、Backend無応答時にリクエストがハングする可能性がある。Echoのデフォルトタイムアウトに依存。
   - 修正案: gRPC呼び出し時に `context.WithTimeout` を設定する（例: 5秒）
   ```go
   ctx, cancel := context.WithTimeout(c.Request().Context(), 5*time.Second)
   defer cancel()
   resp, err := h.backendClient.ListMerchants(ctx, req)
   ```

### Medium (中) - 2件

1. **[コード品質] ListMerchantsのpagination構築に冗長なフォールバック**
   - 場所: `merchant_handler.go` 差分内の pagination 構築箇所
   - 問題: まずデフォルト値でpaginationを構築し、その後 `resp.GetPagination() != nil` で上書きしている。冗長。
   - 修正案: `resp.GetPagination()` のnil判定を一度だけ行い、直接構築する。

2. **[セキュリティ] gRPC接続がinsecure固定**
   - 場所: `internal/grpc/client.go:18`
   - 問題: `insecure.NewCredentials()` がハードコードされている。本番環境ではTLS接続が必要。
   - 現時点の影響: 開発環境・内部ネットワーク通信のためPhase 2では許容。将来的に環境変数でTLS切り替え可能にすべき。

### Low (軽微) - 1件

1. **[コード品質] `strings` パッケージがimportされているが不要な可能性**
   - 場所: `merchant_handler.go` のimport
   - 問題: モック時代の `filterMerchants` で使用していた `strings` がまだimportされている。`strings.TrimSpace` で使用中なので実際は必要だが、確認が必要。

---

## Checklist Results

| カテゴリ | 結果 | 備考 |
|---------|------|------|
| 1. ステアリング準拠性 | ✅ 100% | 全要件実装済み |
| 2. 機能過不足 | ✅ PASS | モック完全削除、3 RPC実装 |
| 3. API契約準拠性 | ✅ PASS | OpenAPI更新済み |
| 4. 用語統一 | ✅ PASS | glossary準拠 |
| 5. セキュリティ | ✅ PASS | 認証・認可・バリデーション実装 |
| 6. パフォーマンス | ⚠️ | gRPCタイムアウト未設定 (High #1) |
| 7. J-SOX準拠 | ✅ PASS | 監査ログミドルウェア適用済み、created_by渡し |
| 8. コード品質 | ✅ PASS | 15テスト全パス、go vet/fmtクリーン |
| 9. ドキュメント整合性 | ✅ PASS | OpenAPI更新済み |

### 詳細

**ステアリング準拠性:**
- ✅ mockMerchants・filterMerchants完全削除
- ✅ gRPCクライアント（BackendClient）作成
- ✅ ListMerchants: gRPC呼び出しに置換
- ✅ GetMerchant: 新規実装、NOT_FOUND→404
- ✅ CreateMerchant: 新規実装、201 Created、created_by渡し
- ✅ handleGRPCError: gRPC→HTTPステータス変換
- ✅ PermissionServiceInterface に変更
- ✅ Docker Compose: version削除、外部ネットワーク追加
- ✅ Makefile: protoターゲット追加
- ✅ .env.example: BACKEND_GRPC_ADDR追加

**テスト:**
- 15テスト全パス（新規）
- 既存テスト（auth_handler, auth_service）も全パス
- gRPCクライアントモック + PermissionServiceモックでユニットテスト

**統合動作確認:**
- Backend + BFF Docker Compose統合起動 ✅
- ListMerchants: 実データ返却 ✅
- GetMerchant: 詳細取得 + NOT_FOUND ✅
- CreateMerchant: 新規登録（M-00004自動採番）✅

---

## Recommendations

### 推奨対応 (High)
1. **gRPC呼び出しにタイムアウトを追加**: 各ハンドラーで `context.WithTimeout(ctx, 5*time.Second)` を使用

### 将来対応 (Medium/Low)
2. 本番環境向けにgRPC TLS接続オプションの追加
3. ListMerchantsのpagination構築のリファクタリング

---

**レビュー担当:** Claude Code (Orchestrator)
**レビュー日:** 2026-04-10
