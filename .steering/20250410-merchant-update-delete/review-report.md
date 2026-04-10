# Implementation Review Report

## Summary
- ステアリングディレクトリ: `.steering/20250410-merchant-update-delete`
- 対象サービス: Backend, BFF, Frontend, 親リポジトリ
- レビュー実施日時: 2026-04-10

## Overall Assessment

**実装品質: 良好** - 全サービスでステアリングファイルの仕様に準拠した実装がされており、テスト・静的解析もクリーンです。Critical/High問題はなく、いくつかのMedium/Low改善提案があります。

---

## Issues Found

### Critical (重大) - 0件

なし

### High (高) - 0件

なし

### Medium (中) - 3件

#### M-1. [Backend] SoftDeleteMerchantクエリの競合状態（TOCTOU）

- **場所**: `services/backend/internal/service/merchant_service.go` DeleteMerchant メソッド
- **詳細**: `GetMerchant`（存在確認）がトランザクション開始前に実行されている。トランザクション内の`SoftDeleteMerchant`は`:exec`（affected rows未チェック）なので、GetMerchant後・トランザクション開始前に別リクエストで削除された場合、削除されたことを検知できず空の監査記録が生成される可能性がある。
- **影響**: 実運用上は低リスク（同一加盟店の同時削除は稀）
- **修正案**: `SoftDeleteMerchant`を`:one`（RETURNING付き）に変更し、0行の場合はErrNotFoundを返す。または`GetMerchant`をトランザクション内で`SELECT ... FOR UPDATE`する。

#### M-2. [Backend] UpdateMerchant でも同様のTOCTOU

- **場所**: `services/backend/internal/service/merchant_service.go` UpdateMerchant メソッド
- **詳細**: M-1と同様に、GetMerchant（変更検出用）がトランザクション外で実行されている。ただしUpdateMerchantは`:one`でRETURNINGするため、更新自体は`is_active = TRUE`チェック付きで安全。
- **影響**: 監査記録の old_value が最新でない可能性（微小リスク）
- **修正案**: GetMerchantもトランザクション内で実行するか、現状維持（実用上問題なし）

#### M-3. [Frontend] DeleteMerchantDialogのアクセシビリティ

- **場所**: `services/frontend/src/components/merchants/DeleteMerchantDialog.tsx`
- **詳細**: モーダルダイアログが `div` + `bg-black/50` オーバーレイで実装されているが、`role="dialog"` や `aria-modal="true"`、ESCキーでの閉じる機能、フォーカストラップが未実装。
- **修正案**: shadcn/ui の `Dialog` コンポーネントを使用するか、適切なARIA属性を追加する。

### Low (軽微) - 2件

#### L-1. [BFF] merchantIDのUUID形式バリデーション未実施

- **場所**: `services/bff/internal/handler/merchant_handler.go` UpdateMerchant/DeleteMerchant
- **詳細**: パスパラメータ `id` をUUID形式チェックせずにgRPCに渡している。Backend側でInvalidArgumentエラーが返るため機能上は問題ないが、BFF側で早期エラーを返す方が効率的。
- **影響**: なし（エラーは正しく返る）

#### L-2. [Frontend] MerchantEditFormとMerchantFormのZodスキーマ重複

- **場所**: `services/frontend/src/components/merchants/MerchantEditForm.tsx`
- **詳細**: 登録画面（MerchantForm.tsx）と編集画面（MerchantEditForm.tsx）で同一のZodスキーマが重複定義されている。将来的にバリデーションルール変更時に一方を変更し忘れるリスクがある。
- **修正案**: 共通スキーマを別ファイル（例: `src/lib/schemas/merchant.ts`）に切り出す。ただし現時点では2箇所のみで実害は低い。

---

## Checklist Results

### 1. ステアリングファイル準拠性
- ✅ requirements.md受け入れ条件: 100% (すべて満たされている)
- ✅ design.md設計準拠: 100%
- ✅ tasklist.md全タスク完了: 100%

### 2. 機能過不足
- ✅ 機能過剰なし: スコープ内の実装に限定されている
- ✅ 機能不足なし: 全必須機能が実装されている
- ✅ エラーハンドリング: 適切

### 3. API契約準拠性
- ✅ Proto定義: UpdateMerchant/DeleteMerchant RPC追加
- ✅ OpenAPI仕様: PUT/DELETE エンドポイント追加
- ✅ HTTPステータスコード: 200(更新)、204(削除)、400、401、403、404
- ✅ リクエスト・レスポンス型: 仕様通り

### 4. セキュリティ
- ✅ 認証チェック: user_idの存在確認
- ✅ 認可チェック: `merchants:update` / `merchants:delete` 権限
- ✅ 入力バリデーション: Go validate + Zodスキーマ
- ✅ SQLインジェクション対策: sqlcパラメータバインド使用
- ✅ XSS対策: React自動エスケープ
- ✅ ログに機密情報なし: merchant_idのみログ出力

### 5. J-SOX準拠
- ✅ 監査記録(UPDATE): フィールドごとのold_value/new_value記録
- ✅ 監査記録(DELETE): change_type='DELETE'で記録
- ✅ トランザクション内で実行: 更新/削除と監査記録がアトミック
- ✅ Who: updated_by / deleted_by (user_id)
- ✅ What: change_type, field_name

### 6. パフォーマンス
- ✅ N+1問題なし
- ✅ 適切なインデックス使用（merchant_id主キー + is_active条件）
- ✅ Frontendキャッシュ無効化: 更新/削除後にクエリ無効化

### 7. コード品質
- ✅ Backend: `go vet` / `go fmt` クリーン
- ✅ BFF: `go vet` / `go fmt` クリーン
- ✅ Frontend: `npm run type-check` / `npm run lint` クリーン
- ✅ Backend テスト: 38テスト全パス
- ✅ BFF テスト: 全パス
- ✅ Frontend テスト: 10ファイル60テスト全パス

### 8. 既存機能への影響
- ✅ 後方互換性: 既存のList/Get/Create APIに変更なし
- ✅ 既存テスト: すべてパス
- ✅ merchantToProto リファクタ: CreateMerchantでも重複排除

---

## Recommendations

1. **M-1/M-2は次回以降のイテレーションで対応を検討** - 現時点では実運用上問題になる可能性は低い
2. **M-3(アクセシビリティ)は次のUIイテレーションで改善推奨** - shadcn/ui Dialog使用が最短
3. **L-1/L-2は優先度低、対応は任意**
4. **全体として仕様準拠・テストカバレッジともに良好で、マージ可能な品質**

---

**レビュー実施者:** Claude Code (Orchestrator)
**レビュー日:** 2026-04-10
