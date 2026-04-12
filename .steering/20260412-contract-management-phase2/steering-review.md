# Steering Review Report

## Summary
- ステアリング: `.steering/20260412-contract-management-phase2/`
- レビュー実施日: 2026-04-12
- 判定: ⚠️ 修正推奨
- Agent Teams準備状態: ⚠️ Conditional（下記「要修正」を解消すれば Ready）

## Checklist Results

| # | カテゴリ | 結果 | 備考 |
|---|---------|------|------|
| 1 | 構造・完全性 | ✅ | requirements/design/tasklist の3ファイル揃う。必須セクションあり |
| 2 | 3ファイル間整合性 | ⚠️ | 要件#7「承認待ち中は金額以外の変更もブロック」が design で未設計、tasklist では「要検討」のまま |
| 3 | 既存ドキュメント整合性 | ❌ | Backend CLAUDE.md の approval_workflows スキーマと design.md のスキーマが不一致。ApprovalService RPC 構成も不一致 |
| 4 | API契約・DB設計 | ❌ | BFF 側マイグレーション番号 V13 が誤り（既存は V9 まで → 次は V10）。BFF には `contracts:approve` が既に system-admin と contract-manager に付与済 |
| 5 | タスクリスト品質 | ✅ | Agent分担・依存関係・完了条件は明確 |
| 6 | リスク・実現可能性 | ⚠️ | FailedPrecondition のメッセージ文字列マッチ（"承認が必要"）でBFFが分岐する設計は脆い |
| 7 | Agent Teams準備 | ⚠️ | 前提（Phase 1）完了前提・CLAUDE.md存在・環境整備はOKだが、上記不整合解消が必要 |

## Issues Found

### ❌ 要修正

1. **BFF マイグレーション番号誤り**
   - design.md / tasklist.md に `V13__seed_approval_permissions.sql` とあるが、BFF の既存マイグレーションは V1〜V9 まで。次に採番すべきは **V10**。
   - さらに `services/bff/db/migrations/V8__seed_permissions.sql` で `contracts:approve` は既に定義済、V9 で `system-admin` と `contract-manager` に割当済。**マイグレーション自体が不要**。design.md の「既存なら不要」の注記と矛盾しないよう、tasklist から新規マイグレーション項目を削除し「確認のみ」に変更すべき。

2. **Backend CLAUDE.md と approval_workflows スキーマ不一致**
   - Backend CLAUDE.md 版: `change_id UUID REFERENCES contract_changes(change_id)` を持ち、old/new 金額カラムは無い
   - design.md 版: `change_id` 無し、`old_monthly_fee/new_monthly_fee/old_initial_fee/new_initial_fee` を持つ
   - いずれかに統一する必要あり。Phase 2 の要件（承認詳細画面で変更前後を表示）を考慮すると design.md 版の方が UI に直結するが、CLAUDE.md を更新する or 両方を採用する判断を明記すべき。

3. **ApprovalService RPC 構成不一致**
   - Backend CLAUDE.md: `ListPendingApprovals` / `ApproveContract` / `RejectContract` の3 RPC
   - design.md: 上記 + `GetApprovalWorkflow` の4 RPC
   - Frontend 承認詳細画面に `GetApprovalWorkflow` は必要なので design.md 側が妥当。Backend CLAUDE.md を更新する対応をタスク化すべき。

### ⚠️ 修正推奨

1. **職務分掌のロール設計が弱い**
   - BFF 既存シードで `contract-manager` が `contracts:update` も `contracts:approve` も両方持つ。ユーザー単位の SoD チェック（requester_id != approver_id）はあるが、同一ロール内で申請/承認が閉じる。design.md でも「専用ロール新設が考えられるが Phase 2 では既存活用」と言及あり。J-SOX 要件を厳格化するなら、`contract-approver` 専用ロールを検討するか、少なくとも「同一組織内の別人物が承認する」運用前提であることを requirements.md に明記すべき。

2. **要件#7「金額以外の変更もブロック」が未設計**
   - requirements.md の制約#7 は「承認待ち中は金額以外（日付、ステータス等）も変更不可」だが、design.md では触れられておらず、tasklist でも「要検討: 制約の強さ」で宙ぶらりん。要件を落とすか design に組み込むか決定が必要。

3. **FailedPrecondition のエラー識別が文字列マッチ**
   - design.md の BFF 側 `strings.Contains(st.Message(), "承認が必要")` による分岐は、ロケールやメッセージ変更に弱い。gRPC `status.WithDetails` に構造化エラーを載せるか、エラーコード+理由タグで判別する方式を推奨。workflow_id のパースも正規表現依存になるため同様。

4. **DRAFT ステータスの二重申請チェック順序**
   - design.md の擬似コードでは「PENDING 存在チェック → DRAFT チェック」の順だが、DRAFT は承認不要で常に更新可のはずなので、PENDING ワークフローが DRAFT 契約で存在しうるかの前提整理が必要（通常起こり得ないはずなので問題は小さい）。

5. **`approver_id` 型の扱い**
   - design.md 擬似コードで `workflow.ApproverID = &req.ApproverId` と nullable ポインタ前提だが、ApprovalWorkflowItem proto は `string` のみ（オプショナル無し）。Phase 1 踏襲で empty string 扱いか、`optional string` にするか決めておくと実装が迷わない。

### ℹ️ 情報

- Backend マイグレーション番号 V8 は空き（既存は V1-V7, V10-V12）なので衝突なし。
- glossary.md への追加用語は requirements/design で揃っており、Orchestrator 事前作業に含まれている。
- tasklist は Phase 1 と同じパターンを踏襲しており、Agent 分担と依存関係の表現は明瞭。

## Agent Teams起動判定

| # | 条件 | 状態 | 備考 |
|---|------|------|------|
| 1 | 3ファイル揃い | ✅ | |
| 2 | 3ファイル整合性 | ⚠️ | 要件#7 が未反映 |
| 3 | API契約確定 | ⚠️ | Backend CLAUDE.md との不整合、FailedPrecondition 構造未確定 |
| 4 | 前提タスク(Phase 1)完了 | ✅ | Phase 1 ステアリング存在、コミット済 |
| 5 | 各Agent担当・完了条件 | ✅ | 明確 |
| 6 | サービスCLAUDE.md | ✅ | backend/bff 存在 |
| 7 | 環境設定 | ✅ | 既存 docker-compose で起動可 |

**判定: ⚠️ Conditional Ready** — 「要修正」3点（BFFマイグレーション番号、スキーマ統一、RPC構成統一）を解消すれば即起動可能。修正規模は小さく、Orchestrator 事前作業フェーズで吸収できる。

## Recommendations

1. **Orchestrator 事前作業を追記:**
   - BFF V13 → 新規マイグレーション不要に変更（既存を確認するタスクのみ残す）
   - Backend CLAUDE.md の approval_workflows スキーマ定義を Phase 2 設計に合わせて更新（old/new 金額カラム追加、GetApprovalWorkflow RPC 追加）
2. **FailedPrecondition のエラー契約を proto/openapi に明文化:**
   - 例: gRPC `google.rpc.ErrorInfo` に `reason=APPROVAL_REQUIRED` / `workflow_id=<uuid>` を載せ、BFF は構造化エラーで判定。design.md に追記。
3. **要件#7 を決定:**
   - 「承認待ち中は金額以外のフィールドも全面ロック」を採用するなら、`ContractService.UpdateContract` の冒頭で PENDING ワークフロー存在時は常に FailedPrecondition を返す実装に統一し、design.md と tasklist に反映。採用しないなら requirements.md から制約#7 を削除。
4. **職務分掌運用ルールの明記:**
   - Phase 2 では既存ロール活用だが、`contract-manager` が申請も承認も可能な点について、「運用上は別担当者で分担する前提」を requirements.md に注記。将来 `contract-approver` ロール分離を Phase 3 候補に追加。
5. **approver_id の proto 仕様:**
   - `optional string approver_id` とするか空文字規約かを design.md に明記し、Frontend/BFF のハンドリング齟齬を防ぐ。
