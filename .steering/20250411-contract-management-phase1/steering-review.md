# Steering Review Report

## Summary
- ステアリング: `.steering/20250411-contract-management-phase1/`
- レビュー実施日: 2026-04-11
- 判定: **⚠️ 修正推奨**
- Agent Teams準備状態: **⚠️ Conditional**（軽微な問題を修正すればReady）

## Checklist Results

| カテゴリ | 結果 | 備考 |
|---------|:---:|------|
| 1. 構造・完全性 | ✅ | 3ファイル揃っており、必須セクションすべて記載 |
| 2. 3ファイル間整合性 | ✅ | requirements→design→tasklist の対応関係が一貫 |
| 3. 既存ドキュメント整合性 | ✅ | glossary/security/J-SOX要件が反映済み |
| 4. API契約・DB設計 | ⚠️ | 2件の問題あり |
| 5. タスクリスト品質 | ✅ | Agent分担・依存関係・完了条件が明確 |
| 6. リスク・実現可能性 | ⚠️ | 1件の問題あり |
| 7. Agent Teams準備状態 | ⚠️ | API契約修正後にReady |

## Issues Found

### ❌ 要修正（実装前に必ず修正）

なし

### ⚠️ 修正推奨（可能であれば修正）

#### S-1. contract_changesテーブルのスキーマ不一致

- **場所**: design.md の契約管理DB設計 / CLAUDE.md の contract_changes 定義
- **詳細**: CLAUDE.md(Backend)では `contract_changes` テーブルに `contract_id UUID NOT NULL REFERENCES contracts(contract_id)` があるが、実際のマイグレーション(V2)では `resource_type` + `resource_id` の汎用設計になっている。design.md の Proto定義でも `contract_id` は使わず `resource_type/resource_id` パターンで加盟店管理の監査記録を既に実装済み。
- **影響**: 設計ドキュメント(CLAUDE.md)と実装の乖離。新規実装では実装に合わせて `resource_type='contract'` を使う必要がある。
- **推奨**: design.md にcontract_changesへの記録は `resource_type='contract'` + `resource_id=contract_id` で記録する旨を明記する。

#### S-2. Proto パッケージ名 `service_mgmt` の命名

- **場所**: design.md の `contracts/proto/service.proto`
- **詳細**: Go の「service」パッケージとの名前衝突を避けるため `service_mgmt` を使用しているが、既存の `merchant.proto` は `package merchant` でサービス名も `MerchantService`。一貫性のため `service_mgmt` の命名について検討が必要。
- **推奨**: 問題ないが、Agentへの指示でこの命名理由（Goの予約語回避）を明記すると混乱を避けられる。

#### S-3. BFFマイグレーション番号の確認

- **場所**: design.md の `V11__seed_service_permissions.sql`
- **詳細**: BFF DBの現在の最新マイグレーションは `V10__seed_users.sql`。V11は正しい番号。ただしtasklist.mdではBFF AgentにV11を作成させるが、同時にBackend AgentがV5/V6/V7を作成する。各Agentが独立してマイグレーション番号を決定するため、衝突の可能性は低いが、Orchestrator事前作業でマイグレーション番号を確定させることを推奨。
- **推奨**: design.mdで確定済みなので問題なし。ただし実装時にAgentが勝手に番号を変えないよう指示に含める。

### ℹ️ 情報（参考）

#### I-1. タスクサイズについて

- 影響ファイル数: Backend約20ファイル + BFF約10ファイル + Frontend約30ファイル = 約60ファイル
- タスク分割基準（30ファイル以上）を大幅に超過しているが、サービス管理と契約管理は密結合（契約にサービスIDが必要）であり、分割するとかえって統合テストが困難になるため、1タスクでの実装は妥当。

#### I-2. テストユーザーの権限

- テストユーザー(contract-manager)は `contracts:read/create/update/approve` 権限あり、`contracts:delete` 権限なし。
- 新規追加の `services:*` 権限は V11 マイグレーションで contract-manager に `services:read` のみ付与。
- E2Eテストで契約削除やサービス登録を行う場合、テストユーザーの権限不足に注意。

#### I-3. 金額のDecimal型の取り扱い

- Proto定義では `monthly_fee`/`initial_fee` を `string` 型で定義（浮動小数点の精度問題回避）。
- Goでは `decimal.Decimal` ライブラリの使用か、`string` ↔ `DECIMAL` の変換が必要。
- 既存パターンがないため、Agentに変換方針を明示的に指示する必要がある。

## Agent Teams起動判定

| # | 条件 | 結果 |
|---|------|:---:|
| 1 | 3ファイル揃っている | ✅ |
| 2 | 3ファイル間整合性 | ✅ |
| 3 | API契約確定（Orchestrator事前作業で確定） | ✅ |
| 4 | 前提タスク完了（加盟店CRUD） | ✅ |
| 5 | Agent担当・完了条件明確 | ✅ |
| 6 | サービスCLAUDE.md存在 | ✅ |
| 7 | 環境設定定義済み | ✅ |

**判定: ⚠️ Conditional**

S-1（contract_changesの記録方式明記）を修正すれば、`/start-implementation` で実装開始可能。S-2, S-3は軽微で実装時に対応可能。

## Recommendations

1. **S-1を修正**: design.md に「contract_changesへの記録は既存パターン（`resource_type` + `resource_id`）に従う」旨を追記
2. **I-3を対応**: 金額のstring↔Decimal変換方針をdesign.mdに追記するか、Agentへの指示に含める
3. **I-2を留意**: E2Eテスト実装時にテストユーザーの権限を考慮する

---

**レビュー実施者:** Claude Code
**レビュー日:** 2026-04-11
