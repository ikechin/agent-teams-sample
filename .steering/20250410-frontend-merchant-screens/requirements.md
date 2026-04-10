# Frontend 加盟店画面追加 (Phase 3) - 要求定義

## 目的

Frontend に加盟店詳細画面と加盟店登録画面を追加し、BFF API経由で加盟店の閲覧・登録を可能にする。
これは3フェーズ構成の第3フェーズであり、エンドユーザー向け画面の実装に集中する。

**3フェーズ構成:**
1. **Phase 1（完了）:** Backend gRPCサービス + DB実装
2. **Phase 2（完了）:** BFFモック → Backend gRPC呼び出し置換
3. **Phase 3（本タスク）:** Frontend 加盟店詳細・登録画面追加

**前提タスク:**
- `.steering/20250409-add-backend-phase1/` 完了
- `.steering/20250409-bff-grpc-integration/` 完了
- BFF API `GET /merchants/:id`, `POST /merchants` が稼働中

---

## スコープ

### 実装するもの

#### 加盟店詳細画面（新規）
- ✅ `/dashboard/merchants/[id]` ページ
- ✅ 加盟店情報の全項目表示（コード、名前、住所、担当者、電話、メール、ステータス、登録日、更新日）
- ✅ 一覧画面からの遷移（行クリック or 詳細ボタン）
- ✅ 一覧に戻るナビゲーション
- ✅ ローディング・エラー状態の表示

#### 加盟店登録画面（新規）
- ✅ `/dashboard/merchants/new` ページ
- ✅ 登録フォーム（name, address, contact_person, phone, email）
- ✅ フォームバリデーション（Zod + React Hook Form）
  - name: 必須、200文字以内
  - address: 必須
  - contact_person: 必須、100文字以内
  - phone: 必須、20文字以内
  - email: 任意、メール形式
- ✅ 登録成功時: 加盟店詳細画面へ遷移
- ✅ 登録エラー時: エラーメッセージ表示
- ✅ 一覧画面への「新規登録」ボタン追加

#### API連携（hooks追加）
- ✅ `use-merchant.ts` - 加盟店詳細取得フック（`GET /merchants/:id`）
- ✅ `use-create-merchant.ts` - 加盟店登録フック（`POST /merchants`）

#### OpenAPI型再生成
- ✅ `src/types/api.ts` を最新のOpenAPI仕様から再生成

### 実装しないもの（将来タスク）

- ❌ 加盟店更新画面（PUT /merchants/:id）
- ❌ 加盟店削除機能（DELETE /merchants/:id）
- ❌ 契約管理画面
- ❌ 承認ワークフロー画面

---

## ユーザーストーリー

### ストーリー1: 加盟店詳細閲覧

**As a** 契約管理担当者
**I want to** 加盟店一覧から特定の加盟店の詳細情報を確認する
**So that** 加盟店の連絡先や状態を把握できる

**受け入れ条件:**
- 一覧画面の加盟店行をクリックすると詳細画面に遷移
- 全項目（コード、名前、住所、担当者、電話、メール、ステータス、登録日、更新日）が表示される
- 存在しない加盟店IDの場合は「見つかりません」表示
- 「一覧に戻る」リンクで一覧画面に戻れる

### ストーリー2: 加盟店新規登録

**As a** 契約管理担当者
**I want to** 新しい加盟店を登録する
**So that** システムに加盟店を追加できる

**受け入れ条件:**
- 一覧画面に「新規登録」ボタンがある
- フォームに必須項目（名前、住所、担当者、電話）を入力して送信
- バリデーションエラーは各フィールドに表示
- 登録成功時は詳細画面に遷移し、登録された内容が確認できる
- 登録失敗時はエラーメッセージが表示される

---

## 制約事項

### 技術的制約
1. **Next.js App Router**: `app/dashboard/merchants/[id]/page.tsx`, `app/dashboard/merchants/new/page.tsx`
2. **shadcn/ui**: UIコンポーネントは shadcn/ui を使用
3. **フォーム**: Zod + React Hook Form（CLAUDE.md準拠）
4. **データフェッチ**: TanStack Query（既存パターン踏襲）
5. **型安全**: OpenAPI仕様から `openapi-typescript` で型生成

### 環境設定
- BFF API: `http://localhost:8080`（`.env.local` の `NEXT_PUBLIC_BFF_API_URL`）

---

## 非機能要件

### パフォーマンス
- 詳細画面の初期表示: 1秒以内
- フォーム送信後の遷移: 2秒以内

### アクセシビリティ
- フォームラベルの適切な設定
- キーボード操作対応
- エラーメッセージのARIA属性

### セキュリティ
- XSS対策（Reactの自動エスケープに依存）
- 認証済みユーザーのみアクセス可能（既存ミドルウェア）

---

## 成功の定義

1. ✅ 加盟店一覧から詳細画面への遷移が動作
2. ✅ 加盟店詳細画面に全項目が表示される
3. ✅ 加盟店登録フォームのバリデーションが動作
4. ✅ 加盟店登録成功時に詳細画面へ遷移
5. ✅ OpenAPI型が最新の仕様から再生成されている
6. ✅ ユニットテストが全パス
7. ✅ 型チェック（`npm run type-check`）エラーなし

---

**作成日:** 2026-04-10
**作成者:** Claude Code
