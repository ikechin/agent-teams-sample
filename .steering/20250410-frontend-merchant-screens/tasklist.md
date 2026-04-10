# Frontend 加盟店画面追加 (Phase 3) - タスクリスト

## 実装方針

**通常のClaude Code（単一Agent）で実装する。**
Frontend Agent単体の作業であり、Agent Teamsを使用するとコストが増大するため。

## タスク分担

### Frontend Agent（単一Agent実行）

**担当範囲:** `services/frontend/`

#### OpenAPI型再生成
- [ ] `openapi-typescript` で `src/types/api.ts` を最新の `contracts/openapi/bff-api.yaml` から再生成
- [ ] getMerchant, createMerchant の型が生成されていることを確認
- [ ] Merchant スキーマに email, is_active が含まれていることを確認

#### 依存ライブラリ追加（必要な場合）
- [ ] `zod` インストール確認（未インストールの場合追加）
- [ ] `react-hook-form` インストール確認（未インストールの場合追加）
- [ ] `@hookform/resolvers` インストール確認（未インストールの場合追加）

#### APIフック作成
- [ ] `src/hooks/use-merchant.ts` - 加盟店詳細取得フック（TanStack Query `useQuery`）
- [ ] `src/hooks/use-create-merchant.ts` - 加盟店登録フック（TanStack Query `useMutation` + キャッシュ無効化）

#### 加盟店詳細画面
- [ ] `src/app/dashboard/merchants/[id]/page.tsx` - 詳細ページ
- [ ] `src/components/merchants/MerchantDetail.tsx` - 詳細コンポーネント
  - [ ] 全項目表示（コード、名前、住所、担当者、電話、メール、ステータス、登録日、更新日）
  - [ ] ローディング状態
  - [ ] エラー状態
  - [ ] 404（見つかりません）表示
  - [ ] 「一覧に戻る」ナビゲーション

#### 加盟店登録画面
- [ ] `src/app/dashboard/merchants/new/page.tsx` - 登録ページ
- [ ] `src/components/merchants/MerchantForm.tsx` - 登録フォームコンポーネント
  - [ ] Zodバリデーションスキーマ定義
  - [ ] React Hook Form + Zodリゾルバー
  - [ ] 各フィールド（name, address, contact_person, phone, email）
  - [ ] バリデーションエラー表示
  - [ ] 送信中ローディング状態
  - [ ] 登録成功→詳細画面遷移
  - [ ] 登録エラー→エラーメッセージ表示
  - [ ] キャンセルボタン→一覧に戻る

#### 既存画面の変更
- [ ] `src/app/dashboard/merchants/page.tsx` - 新規登録ボタン追加
- [ ] `src/components/merchants/MerchantList.tsx` - 行クリックで詳細画面遷移

#### テスト
- [ ] `tests/MerchantDetail.test.tsx` - 詳細コンポーネントテスト
- [ ] `tests/MerchantForm.test.tsx` - フォームコンポーネントテスト
- [ ] 既存テスト（MerchantList, LoginForm等）が引き続きパスすることを確認

#### 静的解析
- [ ] `npm run type-check`
- [ ] `npm run lint`

#### コミット・プッシュ
- [ ] featureブランチでコミット
- [ ] リモートにプッシュ

---

## 実装順序（推奨）

### フェーズ1: 基盤
1. OpenAPI型再生成
2. 依存ライブラリ確認・追加
3. APIフック作成（use-merchant, use-create-merchant）

### フェーズ2: 画面実装
1. 加盟店詳細コンポーネント + ページ
2. 加盟店登録フォーム + ページ
3. 一覧画面の変更（行クリック遷移、新規登録ボタン）

### フェーズ3: テスト・品質
1. ユニットテスト作成
2. 型チェック・リント実行
3. コミット・プッシュ

---

## 完了条件

- [ ] 加盟店一覧から詳細画面への遷移が動作
- [ ] 加盟店詳細画面に全項目が表示される
- [ ] 加盟店登録フォームのバリデーションが動作
- [ ] 加盟店登録成功時に詳細画面へ遷移
- [ ] OpenAPI型が最新仕様から再生成されている
- [ ] ユニットテストが全パス
- [ ] `npm run type-check` エラーなし
- [ ] `npm run lint` エラーなし

---

**作成日:** 2026-04-10
**作成者:** Claude Code
