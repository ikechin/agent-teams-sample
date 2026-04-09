# Steering Review Report

## Summary
- ステアリング: `.steering/20250409-bff-grpc-integration/`
- レビュー実施日: 2026-04-09
- 判定: ⚠️ 修正推奨
- Agent Teams準備状態: ⚠️ Conditional

## Checklist Results

| カテゴリ | 結果 | 備考 |
|---------|------|------|
| 1. 構造・完全性 | ✅ | 3ファイル揃っている、必須セクション完備 |
| 2. 3ファイル間整合性 | ✅ | requirements↔design↔tasklistの対応問題なし |
| 3. 既存ドキュメント整合性 | ⚠️ | design.mdのPermissionService型が現行コードと不一致 |
| 4. API契約・DB設計 | ✅ | Proto定義済み、OpenAPI更新計画あり |
| 5. タスクリスト品質 | ⚠️ | 単一Agent（BFF）タスクなのにAgent Teams不要 |
| 6. リスク・実現可能性 | ✅ | スコープ適切、技術リスク低 |
| 7. Agent Teams準備状態 | ⚠️ | 前提条件の注意点あり |

## Issues Found

### ❌ 要修正（実装前に必ず修正）

なし

### ⚠️ 修正推奨（可能であれば修正）

1. **[整合性] design.mdのMerchantHandler構造体でPermissionServiceの型が不正確**
   - design.mdでは `permissionService service.PermissionServiceInterface` と記載
   - 現行コード（`merchant_handler.go:12`）は `permissionService *service.PermissionService`（具体型）
   - design.mdの記載が正しい方向性（インターフェース依存）だが、現行コードの具体型からインターフェースに変更する作業がtasklist.mdに明記されていない
   - **対応案:** tasklist.mdの「MerchantHandler改修」に「PermissionServiceの依存をインターフェースに変更」を追加するか、現行の具体型のまま設計を記載する

2. **[タスクリスト] Agent Teams不要の可能性**
   - tasklist.mdではBFF Agent + Orchestratorの2分担だが、実質BFF Agentのみの作業
   - Orchestratorの作業（OpenAPI更新、統合確認）は実装後に手動で行える小規模作業
   - CLAUDE.mdの方針: 「Agent Teamsは実装フェーズでのみ使用（コスト最適化のため）」
   - **対応案:** 通常のClaude Code（単一Agent）で実装し、コスト最適化する。tasklist.mdはそのままガイドとして活用可能

3. **[design.md] protoc go_packageオーバーライドの方針が2通り記載されている**
   - design.mdでは「Backend用のgo_packageのまま使用」と「BFF用にオーバーライド」の2案が並記
   - 実装時に混乱する可能性がある
   - **対応案:** BFF用にオーバーライドする方法を一本化して記載。`merchant.proto` のgo_packageは `github.com/ikechin/agent-teams-backend/internal/pb` なので、BFFでは `M` オプションでオーバーライドが必要

4. **[環境] BFF docker-compose.ymlのversion指定が非推奨**
   - 現行の `docker-compose.yml` に `version: '3.8'` が記載されている
   - Docker Compose V2ではversion指定は非推奨（警告が出る）
   - **対応案:** 今回の改修時にversionキーを削除

### ℹ️ 情報（参考）

1. **`merchants:create` 権限は既にBFF DBに存在する**
   - `V8__seed_permissions.sql` で定義済み
   - `V9__seed_role_permissions.sql` で system-admin, contract-manager に付与済み
   - tasklist.mdの「権限マイグレーション（必要な場合）」は不要と判断可能

2. **BFFのfeatureブランチについて**
   - 現在BFFは `feature/1-frontend-bff-impl` ブランチにいる
   - Phase 2用に新しいfeatureブランチを作成するか、既存ブランチをmainにマージしてから新ブランチを作成するかの判断が必要
   - Phase 1のBackendと同様に、実装開始前にOrchestratorがブランチ戦略を決定すべき

3. **BFFの `go.mod` にgRPC依存がまだない**
   - 現行の go.mod には `google.golang.org/grpc` や `google.golang.org/protobuf` が含まれていない
   - 実装時に追加が必要（tasklist.mdに記載済み）

## Agent Teams起動判定

| # | 条件 | 結果 |
|---|------|------|
| 1 | 3ファイル揃っている | ✅ |
| 2 | 3ファイル間整合性 | ✅ |
| 3 | API契約確定 | ✅ merchant.proto配置済み |
| 4 | 前提タスク完了 | ✅ Backend Phase1完了 |
| 5 | Agent担当・完了条件明確 | ✅ |
| 6 | サービスCLAUDE.md存在 | ✅ services/bff/CLAUDE.md存在 |
| 7 | 環境設定定義済み | ✅ |

**判定: ⚠️ Conditional**

Agent Teams自体は起動可能だが、BFF Agent単体の作業なので **通常のClaude Code（単一Agent）での実装を推奨**。コスト最適化のため。

## Recommendations

1. **protoc go_package方針を一本化**: BFF用オーバーライド（`M` オプション）に統一
2. **Agent Teams不使用を検討**: 単一Agent作業のため通常のClaude Codeで実行しコスト最適化
3. **BFFブランチ戦略を確定**: 既存 `feature/1-frontend-bff-impl` のマージ状態を確認してからPhase 2用ブランチを作成
4. **権限マイグレーション不要を明記**: tasklist.mdの該当タスクを「確認済み: 不要」に更新

---

**レビュー担当:** Claude Code (Orchestrator)
**レビュー日:** 2026-04-09
