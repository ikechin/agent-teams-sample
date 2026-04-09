# Implementation Review Report

## Summary
- **ステアリングディレクトリ:** `.steering/20250407-frontend-bff-only/`
- **対象サービス:** Frontend, BFF, E2E Test
- **レビュー実施日時:** 2026-04-09

---

## Issues Found

### Critical (重大) - 1件

1. **[API契約] Cookie名がOpenAPI仕様と不一致**
   - OpenAPI定義: `session_id`
   - BFF実装: `session_token`
   - 場所: `services/bff/internal/handler/auth_handler.go`, `contracts/openapi/bff-api.yaml:205`
   - 影響: Frontend側は`withCredentials: true`でCookie自動送信のため動作するが、仕様と実装の乖離は混乱を招く
   - 修正案: OpenAPI定義を`session_token`に統一するか、実装を`session_id`に変更

### High (高) - 5件

1. **[セキュリティ] Rate Limiting未実装**
   - 場所: `services/bff/cmd/server/main.go`
   - 影響: ログインエンドポイントがブルートフォース攻撃に脆弱
   - 修正案: echo-ratelimit等でログインAPIにrate limiter追加

2. **[セキュリティ] CSRF対策が未完成**
   - 場所: Frontend API Client (`services/frontend/src/lib/api/client.ts`)、BFF CORS設定
   - 影響: POST/PUT/DELETEリクエストがCSRF攻撃に脆弱（SameSite=Laxで部分的に緩和）
   - 修正案: requirements.mdで次回タスクに延期と明記されているが、リスクを認識しておく

3. **[機能不足] BFF加盟店APIのページネーション・検索パラメータ未実装**
   - 場所: `services/bff/internal/handler/merchant_handler.go`
   - 影響: OpenAPI仕様にpage/limit/searchパラメータが定義されているが、実装で無視
   - 修正案: モック実装でもパラメータの受け取りと基本的なフィルタリングを実装

4. **[テスト] テストカバレッジが不十分**
   - Frontend: LoginFormとuseAuthStoreのみ（MerchantList、useMerchants等なし）
   - BFF: バリデーションとbcrypt関連のみ（統合テスト、ミドルウェアテストなし）
   - 目標80%に対して推定30-40%程度

5. **[コード品質] BFFでインターフェース未定義**
   - 場所: `services/bff/internal/repository/`, `services/bff/internal/service/`
   - 影響: テスト用モック作成が困難、DIパターン未実装
   - 修正案: Repository/Serviceにインターフェースを定義

### Medium (中) - 7件

1. **[コード品質] Frontend認証ストアの型安全性不足**
   - 場所: `services/frontend/src/stores/use-auth-store.ts`
   - 内容: `error as { response?: { data?: { error?: string } } }` という複雑な型キャスト
   - 修正案: ApiError型を定義して統一

2. **[セキュリティ] Frontendに権限チェックなし**
   - 場所: `services/frontend/src/app/dashboard/layout.tsx`
   - 内容: `/dashboard`配下は認証チェックのみで権限チェックなし
   - 修正案: Next.js middlewareで権限チェック追加（UI側ガード）

3. **[機能過剰] E2Eに加盟店CRUDテストが存在**
   - 場所: `e2e/tests/merchants/merchant-crud.spec.ts`
   - 内容: requirements.mdのスコープ外（CRUD機能は未実装）
   - 影響: テスト実行時に失敗する（存在しない画面/機能をテスト）

4. **[J-SOX] 監査ログの非同期記録でのエラーハンドリング**
   - 場所: `services/bff/internal/middleware/audit.go`
   - 内容: ゴルーチン内でのエラーが握りつぶされる可能性
   - 修正案: エラーログ出力を確認、失敗時のリトライ機構検討

5. **[パフォーマンス] N+1問題の可能性**
   - 場所: `services/bff/internal/service/auth_service.go:GetCurrentUser()`
   - 内容: ユーザー取得と権限取得が別クエリ
   - 修正案: JOINで一度に取得するクエリ追加

6. **[コード品質] BFFのエラーレスポンス形式不統一**
   - 場所: `services/bff/internal/handler/`
   - 内容: 一部が`map[string]string`、一部がErrorResponse構造体
   - 修正案: すべてErrorResponse構造体で統一

7. **[ドキュメント] Frontendダッシュボードのハードコード値**
   - 場所: `services/frontend/src/app/dashboard/page.tsx`
   - 内容: 加盟店数"2"、システムステータス"正常"がハードコード
   - 修正案: APIから取得するか、明示的にモックと記載

### Low (軽微) - 5件

1. **[アクセシビリティ] テーブルにcaptionなし**
   - 場所: `services/frontend/src/components/merchants/MerchantList.tsx`

2. **[運用] BFFヘルスチェックがDB接続を確認しない**
   - 場所: `services/bff/cmd/server/main.go` (GET /health)

3. **[運用] BFFにグレースフルシャットダウン未実装**
   - 場所: `services/bff/cmd/server/main.go`

4. **[セキュリティ] BFF Cookie Secureフラグがfalse**
   - 場所: `services/bff/internal/handler/auth_handler.go`
   - 注記: 開発環境のため意図的。本番ではENVIRONMENT変数で切り替え必要

5. **[テスト] E2Eテストで環境変数TEST_USER_EMAIL/PASSWORDが未活用**
   - 場所: `e2e/tests/auth/login-flow.spec.ts`
   - 内容: .envに定義あるがテスト内でハードコード

---

## Checklist Results

### 1. ステアリングファイル準拠性
| 項目 | 結果 | 備考 |
|------|------|------|
| requirements.md受け入れ条件 | ⚠️ 90% | Cookie名不一致、ページネーションパラメータ未実装 |
| design.md設計準拠 | ✅ 95% | アーキテクチャ・データフロー概ね一致 |
| tasklist.md完了率 | ⚠️ 85% | 一部テスト不足、searchパラメータ未実装 |

### 2. 機能過不足
| 項目 | 結果 | 備考 |
|------|------|------|
| 機能過剰 | ⚠️ | E2E CRUDテスト（スコープ外）、BFF permissions seed（11権限、今回使用は1つ） |
| 機能不足 | ⚠️ | 加盟店API page/limit/searchパラメータ、Frontendコンポーネントテスト |

### 3. API契約準拠性
| 項目 | 結果 | 備考 |
|------|------|------|
| エンドポイント | ✅ 100% | 4エンドポイント全実装 |
| リクエスト/レスポンス型 | ✅ 95% | User, Merchant, Pagination型一致 |
| Cookie名 | ❌ | session_id vs session_token |
| HTTPステータスコード | ✅ 100% | 200, 400, 401, 403対応 |

### 4. セキュリティ
| 項目 | 結果 | 備考 |
|------|------|------|
| パスワードハッシュ化 | ✅ | bcrypt cost 12 |
| セッション管理 | ✅ | HttpOnly, SameSite=Lax, 32バイトランダムトークン |
| SQLインジェクション | ✅ | sqlcプレースホルダー使用 |
| XSS対策 | ✅ | Reactの自動エスケープ、dangerouslySetInnerHTML不使用 |
| CSRF対策 | ⚠️ | SameSite=Laxのみ、トークン未実装（次回タスク） |
| Rate Limiting | ❌ | 未実装 |

### 5. J-SOX準拠
| 項目 | 結果 | 備考 |
|------|------|------|
| 監査証跡 | ✅ | 全API呼び出し記録、who/when/what/where |
| 改ざん防止 | ✅ | PostgreSQL RULEでDELETE/UPDATE禁止 |
| アクセス制御 | ✅ | RBAC実装（4ロール、11権限） |
| 職務分掌 | ⚠️ | ロール分離設計済み、承認フロー未実装（Backend待ち） |

### 6. コード品質
| 項目 | 結果 | 備考 |
|------|------|------|
| Frontend ESLint/TypeScript | ✅ | エラーなし、ビルド成功 |
| BFF go vet/go fmt | ✅ | エラーなし |
| テストカバレッジ | ⚠️ | Frontend: ~30%, BFF: ~25% |
| 命名規約 | ✅ | 一貫性あり |

### 7. E2Eテスト
| 項目 | 結果 | 備考 |
|------|------|------|
| ログインフローテスト | ✅ | 正常系1件+異常系2件（requirements.md完全一致） |
| 加盟店一覧表示テスト | ✅ | 3件（requirements.md以上の詳細テスト） |
| Docker Compose | ✅ | 4サービス構成、health check完備 |
| テストヘルパー | ✅ | login/logout/waitForElement |

---

## Score Summary

| カテゴリ | スコア | 備考 |
|---------|--------|------|
| ステアリングファイル準拠性 | 90% | Cookie名不一致が主要問題 |
| 機能過不足 | 85% | ページネーションパラメータ、テスト不足 |
| API契約準拠性 | 90% | Cookie名以外は一致 |
| セキュリティ | 75% | Rate Limiting、CSRF未完成 |
| J-SOX準拠 | 85% | 監査ログ優秀、職務分掌未完成 |
| コード品質 | 80% | 構造良好、テストカバレッジ不足 |
| E2Eテスト | 90% | 要件カバー、スコープ外テスト混在 |
| **総合** | **85%** | |

---

## Recommendations

### 即時対応（本PR内で修正）
1. **Critical:** OpenAPI Cookie名を`session_token`に統一（`bff-api.yaml`修正）
2. **Medium:** `e2e/tests/merchants/merchant-crud.spec.ts`を削除またはskip（スコープ外）

### 次回タスクで対応
3. **High:** Rate Limiting実装（ログインAPI）
4. **High:** CSRF対策実装（Double Submit Cookie）
5. **High:** テストカバレッジ向上（目標80%）
6. **High:** BFF Repository/Serviceインターフェース定義

### 将来的に対応
7. BFFヘルスチェック強化（DB接続確認）
8. グレースフルシャットダウン実装
9. フロントエンド権限チェックMiddleware
10. パフォーマンス最適化（N+1解消）

---

**レビュー実施者:** Claude Code (Orchestrator)
**レビュー実施日:** 2026-04-09
