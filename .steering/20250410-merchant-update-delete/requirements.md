# 加盟店更新・削除機能 - 要求定義

## 目的

加盟店の更新（編集）と削除（論理削除）機能を全サービス（Backend/BFF/Frontend）に追加する。

**前提タスク:**
- Phase 1-3 完了済み（Backend gRPC + BFF REST API + Frontend画面）
- 加盟店のCREATE/READ は実装済み

---

## スコープ

### 実装するもの

#### Backend Service
- ✅ **gRPC RPC追加**
  - `UpdateMerchant` - 加盟店情報更新
  - `DeleteMerchant` - 加盟店論理削除（`is_active = false`）
- ✅ **Protocol Buffers定義更新**（`contracts/proto/merchant.proto`）
- ✅ **監査記録**: UPDATE/DELETE時にcontract_changesテーブルに記録（J-SOX）
- ✅ **テスト追加**

#### BFF Service
- ✅ **RESTエンドポイント追加**
  - `PUT /api/v1/merchants/:id` - 加盟店更新
  - `DELETE /api/v1/merchants/:id` - 加盟店論理削除
- ✅ **権限チェック**: `merchants:update` / `merchants:delete`
- ✅ **protoc再生成**（BFF用）
- ✅ **テスト追加**

#### Frontend
- ✅ **加盟店編集画面**（`/dashboard/merchants/[id]/edit`）
  - 既存データをプリフィル
  - バリデーション（登録画面と同じルール）
  - 更新成功→詳細画面へ遷移
- ✅ **削除機能**
  - 詳細画面に「削除」ボタン
  - 確認ダイアログ表示
  - 削除成功→一覧画面へ遷移
- ✅ **詳細画面に「編集」ボタン追加**
- ✅ **APIフック追加**（use-update-merchant, use-delete-merchant）
- ✅ **OpenAPI型再生成**
- ✅ **テスト追加**

#### 親リポジトリ
- ✅ **OpenAPI仕様更新**（`contracts/openapi/bff-api.yaml`）
- ✅ **Proto定義更新**（`contracts/proto/merchant.proto`）

### 実装しないもの
- ❌ 契約管理機能 - 将来タスク
- ❌ 加盟店の物理削除 - 論理削除のみ
- ❌ 一括更新・一括削除

---

## ユーザーストーリー

### ストーリー1: 加盟店情報の編集

**As a** 契約管理担当者
**I want to** 加盟店の情報を更新する
**So that** 住所変更や担当者変更を反映できる

**受け入れ条件:**
- 詳細画面に「編集」ボタンがある
- 編集画面で既存データがプリフィルされている
- バリデーション（name, address, contact_person, phone 必須）
- 更新成功時に詳細画面へ遷移し、更新された内容が確認できる
- 更新がcontract_changesテーブルに記録される（J-SOX）
- `merchants:update` 権限が必要

### ストーリー2: 加盟店の無効化（論理削除）

**As a** 契約管理担当者
**I want to** 加盟店を無効化する
**So that** 取引終了した加盟店をシステムから除外できる

**受け入れ条件:**
- 詳細画面に「削除」ボタンがある
- 確認ダイアログが表示される（「本当に削除しますか？」）
- 削除（`is_active = false`）成功時に一覧画面へ遷移
- 削除がcontract_changesテーブルに記録される（J-SOX）
- `merchants:delete` 権限が必要
- 一覧画面には無効化された加盟店は表示されない（既存の`is_active = TRUE`フィルター）

---

## 制約事項

### 技術的制約
1. **論理削除**: 物理削除は行わない。`is_active = false` に更新する
2. **監査記録**: UPDATE/DELETEの全変更をcontract_changesテーブルに記録
3. **後方互換性**: 既存のListMerchants/GetMerchant/CreateMerchantに影響しない
4. **権限**: `merchants:update` と `merchants:delete` がBFF DBに存在するか確認（存在しない場合は追加）

---

## 成功の定義

1. ✅ 加盟店更新が全サービスで正常動作
2. ✅ 加盟店論理削除が全サービスで正常動作
3. ✅ 監査記録（contract_changes）にUPDATE/DELETEが記録される
4. ✅ 全サービスのテストがパス
5. ✅ 統合Docker Composeで動作確認

---

**作成日:** 2026-04-10
**作成者:** Claude Code
