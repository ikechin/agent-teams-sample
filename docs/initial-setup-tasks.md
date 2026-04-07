# 初回セットアップ タスクリスト

## 概要

このドキュメントは、加盟店契約管理システムの初回セットアップ作業のタスクリストです。
CLAUDE.mdの手順に沿って、順次実行してください。

**作業状況:**
- ✅ 完了
- 🔄 作業中
- ⏸️ 保留
- ❌ 未着手

---

## フェーズ1: ドキュメント作成（Agent Teams不使用）

### ステップ1: ディレクトリ構造作成 ✅

**状況:** ✅ 完了

```bash
mkdir -p docs .steering contracts/openapi contracts/proto contracts/types
mkdir -p services/{frontend,bff,backend}/{docs,.steering}
```

---

### ステップ2: ルート永続的ドキュメント作成（`docs/`）

#### 2-1. product-requirements.md ✅

**状況:** ✅ 完了

**内容:**
- プロダクトビジョンと目的
- ターゲットユーザーと課題
- 機能要件・非機能要件
- J-SOX対応要件
- ユーザーストーリー

---

#### 2-2. system-architecture.md ✅

**状況:** ✅ 完了

**内容:**
- マイクロサービス全体構成図
- Frontend → BFF（REST API）→ Backend（gRPC）
- 認証・認可アーキテクチャ
- データベース設計概要
- Docker Compose構成
- クラウドデプロイ戦略

---

#### 2-3. glossary.md ✅

**状況:** ✅ 完了

**内容:**
- ドメイン用語定義（加盟店、契約、サービス等）
- ビジネス用語（職務分掌、監査証跡等）
- 技術用語（Frontend/BFF/Backend、gRPC等）
- 命名規則
- 英語・日本語対応表

---

#### 2-4. jsox-compliance.md ✅

**状況:** ✅ 完了

**内容:**
- J-SOX要件の詳細（5つの統制要素）
- 監査証跡設計（audit_logs, contract_changes）
- 職務分掌の実装方針（登録者≠承認者）
- アクセス制御設計（権限ベースのチェック）
- データ保護・暗号化方針
- 承認フロー設計

---

#### 2-5. security-guidelines.md ✅

**状況:** ✅ 完了

**内容:**
- 認証・認可の実装ガイドライン（Session, bcrypt, 権限チェック）
- データ暗号化の実装方法（TLS, at-rest encryption）
- セキュリティベストプラクティス（CSRF, XSS, SQLi対策）
- OWASP Top 10対策
- セキュリティテストガイドライン

---

#### 2-6. service-contracts.md ✅

**状況:** ✅ 完了

**内容:**
- API契約管理の方針
- OpenAPI 3.0仕様の管理方法
- Protocol Buffers（gRPC）の管理方法
- バージョニング戦略
- 後方互換性ポリシー
- 変更管理プロセス
- コード生成手順

---

### ステップ3: サービス別CLAUDE.mdとドキュメント作成

#### 3-1. Frontend Service ✅

**状況:** ✅ 完了（4/4完了）

**作成ファイル:**
1. ✅ `services/frontend/CLAUDE.md` - Frontend開発ルール（ルートCLAUDE.mdを継承）
   - 技術スタック: Next.js 14 + React + TypeScript + Tailwind CSS + shadcn/ui
   - 開発原則、コーディング規約、テスト戦略を定義
2. ✅ `services/frontend/docs/functional-design.md` - Frontend機能設計
   - 画面設計（10画面以上）、画面遷移図
   - コンポーネント設計、状態管理設計
   - APIクライアント、エラーハンドリング、テスト戦略
3. ✅ `services/frontend/docs/repository-structure.md` - ディレクトリ構造
   - 完全なディレクトリ構造、設定ファイル詳細
   - 命名規則、インポートエイリアス
4. ✅ `services/frontend/docs/development-guidelines.md` - 開発ガイドライン
   - 開発フロー、コーディング規約（TypeScript/React/CSS）
   - データフェッチング、フォーム処理、セキュリティ、パフォーマンス
   - テスト戦略、アクセシビリティ、コードレビューチェックリスト

**参照:**
- `docs/product-requirements.md` のユーザーストーリー
- `docs/system-architecture.md` のFrontend設計
- `docs/glossary.md` の用語統一
- `contracts/openapi/bff-api.yaml`（BFF APIのOpenAPI仕様）

---

#### 3-2. BFF Service ❌

**状況:** ❌ 未着手

**作成ファイル:**
1. `services/bff/CLAUDE.md` - BFF開発ルール（ルートCLAUDE.mdを継承）
2. `services/bff/docs/functional-design.md` - BFF機能設計
   - API Gateway設計
   - 認証・認可ロジック
   - **BFF DBのテーブル定義詳細**（users, sessions, audit_logs）
   - gRPCクライアント実装
3. `services/bff/docs/repository-structure.md` - ディレクトリ構造
4. `services/bff/docs/development-guidelines.md` - 開発ガイドライン

**参照:**
- `docs/system-architecture.md` のBFF設計
- `docs/glossary.md` の用語統一
- `docs/jsox-compliance.md` の監査ログ要件
- `contracts/proto/`（Backend gRPC API仕様）

---

#### 3-3. Backend Service ❌

**状況:** ❌ 未着手

**作成ファイル:**
1. `services/backend/CLAUDE.md` - Backend開発ルール（ルートCLAUDE.mdを継承）
2. `services/backend/docs/functional-design.md` - Backend機能設計
   - ビジネスロジック設計
   - ドメインモデル設計
   - **Backend DBのテーブル定義詳細**（merchants, contracts, services, contract_changes, approval_workflows）
   - gRPCサーバー実装
3. `services/backend/docs/repository-structure.md` - ディレクトリ構造
4. `services/backend/docs/development-guidelines.md` - 開発ガイドライン

**参照:**
- `docs/product-requirements.md` のビジネス要件
- `docs/system-architecture.md` のBackend設計
- `docs/glossary.md` の用語統一
- `docs/jsox-compliance.md` の契約変更履歴要件

---

### ステップ4: 初回実装用のステアリングファイル作成 ❌

**状況:** ❌ 未着手

**ディレクトリ作成:**
```bash
mkdir -p .steering/YYYYMMDD-initial-implementation
```

**作成ファイル:**

#### 4-1. requirements.md
初回実装の要求（MVP定義）
- 実装する機能の範囲
- 優先順位
- スコープ外の機能

#### 4-2. design.md
実装設計（サービス横断）
- API契約の詳細
- データフロー
- 認証フロー
- エラーハンドリング

#### 4-3. tasklist.md
Agent別タスク分担

**例:**
```markdown
## Frontend Agent
- [ ] 加盟店一覧画面の実装
- [ ] 契約詳細画面の実装
- [ ] ログイン画面の実装

## BFF Agent
- [ ] 認証APIの実装（/api/auth/login, /api/auth/logout）
- [ ] 加盟店APIの実装（/api/merchants）
- [ ] 契約APIの実装（/api/contracts）
- [ ] gRPCクライアントの実装

## Backend Agent
- [ ] gRPCサーバーのセットアップ
- [ ] 加盟店管理ドメインロジックの実装
- [ ] 契約管理ドメインロジックの実装
- [ ] データベーススキーマの作成
- [ ] 契約変更履歴機能の実装（J-SOX対応）
```

---

## フェーズ2: 実装（Agent Teams使用）✅

**前提条件:**
- フェーズ1のすべてのドキュメントが完成していること
- `.steering/[YYYYMMDD]-initial-implementation/tasklist.md`が作成されていること
- `contracts/openapi/bff-api.yaml`が定義されていること
- `contracts/proto/`にgRPC API定義が配置されていること

### Agent Teams起動方法

**設定:**
```json
// Claude Code settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**実行:**
```
Orchestratorが以下のように複数Agentを並行起動：

Task 1 (Frontend Agent):
  subagent_type: general-purpose
  workspace: services/frontend/
  prompt: "ルートとサービスのCLAUDE.mdに従い、.steering/[日付]-initial-implementation/tasklist.mdのFrontend担当タスクを実装してください"

Task 2 (BFF Agent):
  subagent_type: general-purpose
  workspace: services/bff/
  prompt: "ルートとサービスのCLAUDE.mdに従い、.steering/[日付]-initial-implementation/tasklist.mdのBFF担当タスクを実装してください"

Task 3 (Backend Agent):
  subagent_type: general-purpose
  workspace: services/backend/
  prompt: "ルートとサービスのCLAUDE.mdに従い、.steering/[日付]-initial-implementation/tasklist.mdのBackend担当タスクを実装してください"
```

---

## 進捗サマリー

### ✅ 完了（12/17タスク）

1. ✅ ディレクトリ構造作成
2. ✅ product-requirements.md
3. ✅ system-architecture.md
4. ✅ glossary.md
5. ✅ GitHubリポジトリ作成・プッシュ
6. ✅ CLAUDE.mdのマイクロサービス対応
7. ✅ Agent Teams運用方針の明記
8. ✅ jsox-compliance.md
9. ✅ security-guidelines.md
10. ✅ service-contracts.md
11. ✅ services/frontend/ のドキュメント一式（4/4完了）
    - ✅ services/frontend/CLAUDE.md
    - ✅ services/frontend/docs/functional-design.md
    - ✅ services/frontend/docs/repository-structure.md
    - ✅ services/frontend/docs/development-guidelines.md
12. ✅ E2Eテスト環境の構築
    - ✅ e2e/ ディレクトリ作成
    - ✅ e2e/README.md（Playwright設定・テストガイド）
    - ✅ e2e/test-scenarios.md（テストシナリオ定義）
    - ✅ e2e/playwright.config.ts
    - ✅ e2e/tests/ サンプルテスト
    - ✅ docs/glossary.md にE2E用語追加

**ステップ2（ルート永続的ドキュメント）完了！**
**ステップ3-1（Frontend Service）完了！**
**E2Eテスト環境セットアップ完了！**

### 🔄 次にやること（2/17タスク）

13. ❌ services/bff/ のドキュメント一式（4ファイル）
    - ❌ services/bff/CLAUDE.md
    - ❌ services/bff/docs/functional-design.md
    - ❌ services/bff/docs/repository-structure.md
    - ❌ services/bff/docs/development-guidelines.md
14. ❌ services/backend/ のドキュメント一式（4ファイル）
    - ❌ services/backend/CLAUDE.md
    - ❌ services/backend/docs/functional-design.md
    - ❌ services/backend/docs/repository-structure.md
    - ❌ services/backend/docs/development-guidelines.md

### ⏸️ その後（3/17タスク）

15. ❌ .steering/[日付]-initial-implementation/ の作成
16. ❌ API契約定義（OpenAPI, Protocol Buffers）
17. ❌ 環境セットアップ（Docker Compose等）
18. ❌ Agent Teams実装開始

---

## 注意事項

- 各ドキュメント作成後、必ず確認・承認を得てから次へ進む
- 用語は必ず `docs/glossary.md` に従う
- Agent Teams実装フェーズは、すべてのドキュメントが完成してから開始
- 会話が途切れた場合は、このドキュメントを参照して続きから再開
- **技術スタック確定（2026-04-07更新）:**
  - Frontend: Next.js 14 + React + TypeScript + Tailwind CSS + shadcn/ui
  - BFF: **Go + Echo + sqlc**
  - Backend: **Go + sqlc + gRPC**

---

**最終更新日:** 2026-04-07
**作成者:** Claude Code
