# Claude Code Skills - スキル一覧

このドキュメントは、プロジェクトで利用可能なClaude Codeスキル（スラッシュコマンド）の一覧と使い方を説明します。

## 📚 目次

- [スキル一覧](#スキル一覧)
- [開発フェーズ別の推奨スキル](#開発フェーズ別の推奨スキル)
- [よくある使い方のパターン](#よくある使い方のパターン)

---

## スキル一覧

### 1. タスク計画・管理

#### `/plan-task`
**説明:** 新しいタスクのステアリングファイル作成を支援
**使用タイミング:** 新機能追加・バグ修正など、新しいタスクを開始する前

**ヒアリング項目:**
- タスクの基本情報（名前、概要、背景）
- 影響範囲（Frontend/BFF/Backend/E2E）
- 技術的変更点（API/DB/共通言語）
- 非機能要件（パフォーマンス、セキュリティ、J-SOX）
- 受け入れ条件
- 制約事項（技術/スケジュール/リソース/ビジネス）

**出力:**
- `.steering/[YYYYMMDD]-[タスク名]/requirements.md`
- `.steering/[YYYYMMDD]-[タスク名]/design.md`
- `.steering/[YYYYMMDD]-[タスク名]/tasklist.md`

**使用例:**
```bash
/plan-task
```

---

#### `/start-implementation <steering-directory>`
**説明:** 指定したステアリングディレクトリのAgent Teams実装を開始
**使用タイミング:** ステアリングファイル作成完了後、実装を開始する時

**引数:**
- `$1`: ステアリングディレクトリ名（例: `20250407-frontend-bff-only`）

**機能:**
- ステアリングファイルの読み込み
- タスクスコープのサマリー表示
- Agent Teams用プロンプトの生成

**使用例:**
```bash
/start-implementation 20250407-frontend-bff-only
```

---

### 2. 環境構築

#### `/setup-dev-env`
**説明:** 開発環境のセットアップガイド
**使用タイミング:** 新メンバー参画時、または開発環境を一から構築する時

**セットアップ内容:**
- 必要なツールの確認（Node.js, Go, Docker, Git）
- リポジトリのクローン
- 環境変数ファイルの作成
- 依存関係のインストール
- Dockerコンテナの起動
- データベースマイグレーション
- 開発サーバーの起動
- 疎通確認

**使用例:**
```bash
/setup-dev-env
```

---

### 3. 実装・品質チェック

#### `/review-implementation <steering-directory>`
**説明:** 実装がステアリングファイルの仕様に準拠しているか包括的にレビュー
**使用タイミング:** Agent Teams実装完了後、PRを作成する前

**レビュー項目（9カテゴリ）:**
1. ステアリングファイル準拠性チェック
2. 機能過不足チェック
3. API契約準拠性チェック
4. 用語統一チェック
5. セキュリティチェック（認証・入力検証・データ保護）
6. パフォーマンスチェック（DB・API・フロントエンド）
7. J-SOX準拠チェック（監査証跡・職務分掌・アクセス制御）
8. コード品質チェック
9. ドキュメント整合性チェック

**出力:**
- 問題の重要度別リスト（Critical/High/Medium/Low）
- 修正推奨事項
- レビューレポート（`.steering/[YYYYMMDD]-[タスク名]/review-report.md`）

**使用例:**
```bash
/review-implementation 20250407-frontend-bff-only
```

---

#### `/run-tests [test-type]`
**説明:** 全サービスのテスト一括実行とカバレッジレポート生成
**使用タイミング:** 実装完了後、PRを作成する前、またはCI/CDパイプラインで定期実行

**引数:**
- `$1`: テストタイプ（`unit` | `e2e` | `all`、デフォルト: `all`）

**テスト内容:**
- Frontend: Jest + React Testing Library
- BFF: Go標準テスト + カバレッジ
- Backend: Go標準テスト + カバレッジ
- E2E: Playwright

**出力:**
- テスト実行サマリー
- カバレッジレポート（HTML形式）
- 失敗テストの分析と修正優先度

**使用例:**
```bash
/run-tests all
/run-tests unit
/run-tests e2e
```

---

#### `/check-docs-sync`
**説明:** コードとドキュメントの乖離を検出
**使用タイミング:** 実装完了後、または定期的（週次等）に実行

**チェック項目:**
1. API実装 vs OpenAPI仕様
2. 機能実装 vs 永続的ドキュメント
3. 用語統一（コード vs `docs/glossary.md`）
4. DB実装 vs 設計ドキュメント
5. ステアリングファイルの完了ステータス
6. 環境変数 vs `docs/ENVIRONMENT.md`

**出力:**
- 問題の重要度別リスト
- 更新が必要なドキュメントのリスト
- ドキュメント同期レポート

**使用例:**
```bash
/check-docs-sync
```

---

### 4. PR・デプロイ準備

#### `/prepare-pr <steering-directory>`
**説明:** PRを作成前の包括的チェックとPR説明文の生成
**使用タイミング:** 実装・テスト完了後、PRを作成する直前

**実行内容:**
1. `/review-implementation` の実行
2. リント・型チェック
3. `/run-tests` の実行
4. コミットメッセージの確認
5. 変更内容の確認
6. `/check-docs-sync` の実行
7. mainブランチの最新化（rebase）
8. PR説明文の生成

**出力:**
- チェックリスト結果
- PR説明文（マークダウン形式）
- 問題があれば修正推奨事項

**使用例:**
```bash
/prepare-pr 20250407-frontend-bff-only
```

---

### 5. 影響分析・調査

#### `/analyze-impact [変更内容]`
**説明:** 変更が他サービスに与える影響を分析
**使用タイミング:** 機能追加・修正を計画する時、または既存コードを変更する前

**引数:**
- `$1`: 変更内容の説明（オプション。指定しない場合は対話形式）

**分析項目:**
1. API契約の影響（エンドポイント追加・変更・削除）
2. データベース変更の影響（テーブル・カラム・インデックス）
3. 共通型・ユビキタス言語の影響
4. 認証・認可の影響
5. 環境変数・設定の影響

**出力:**
- 影響範囲サマリー（サービス別）
- マイグレーション手順
- 後方互換性評価
- リスク評価
- 更新が必要なドキュメント

**使用例:**
```bash
/analyze-impact "BFF APIに新しいエンドポイントを追加"
/analyze-impact
```

---

#### `/debug-issue`
**説明:** 本番・開発環境で発生した問題の調査支援
**使用タイミング:** バグ発生時、統合テストやE2Eテストでエラーが発生した時

**調査フロー:**
1. 問題のヒアリング（概要、環境、再現手順等）
2. ログ・エラーメッセージの分析
3. 影響サービスの特定（Frontend/BFF/Backend）
4. 関連ステアリングファイルの特定
5. 原因の仮説立て
6. デバッグ手順の提示
7. 修正案の提示（クイックフィックス + 恒久対応）

**出力:**
- デバッグレポート
- 原因の仮説
- 修正優先度
- 再発防止策

**使用例:**
```bash
/debug-issue
```

---

### 6. デプロイ・ロールバック

#### `/rollback-plan <steering-directory>`
**説明:** デプロイ失敗時のロールバック計画を作成
**使用タイミング:** 本番デプロイ前の事前準備、またはデプロイ失敗時

**引数:**
- `$1`: ステアリングディレクトリ名（例: `20250407-frontend-bff-only`）

**計画内容:**
1. デプロイ内容の分析
2. ロールバックの必要性判定（Critical/High/Medium/Low）
3. ロールバック手順
   - アプリケーションコードのロールバック
   - データベースマイグレーションのロールバック
   - 環境変数のロールバック
   - API契約のロールバック
4. ロールバック順序の決定
5. リスク評価（データ損失リスク、サービス停止時間）
6. ロールバック後の確認項目

**出力:**
- ロールバック計画書
- 推定所要時間
- リスク評価とデータバックアップ推奨

**使用例:**
```bash
/rollback-plan 20250407-frontend-bff-only
```

---

## 開発フェーズ別の推奨スキル

### フェーズ1: 計画（Planning）

```
/plan-task
  ↓
（ステアリングファイルを作成）
  ↓
/analyze-impact
  ↓
（影響範囲を確認して設計を調整）
```

---

### フェーズ2: 環境構築（Setup）

```
/setup-dev-env
  ↓
（開発環境が整ったことを確認）
```

---

### フェーズ3: 実装（Implementation）

```
/start-implementation <steering-directory>
  ↓
（Agent Teamsで並行実装）
  ↓
/debug-issue （必要に応じて）
  ↓
（問題を修正）
```

---

### フェーズ4: 品質チェック（Quality Check）

```
/review-implementation <steering-directory>
  ↓
（Critical/High問題を修正）
  ↓
/run-tests all
  ↓
（失敗テストを修正）
  ↓
/check-docs-sync
  ↓
（ドキュメントを更新）
```

---

### フェーズ5: PR作成（Pull Request）

```
/prepare-pr <steering-directory>
  ↓
（すべてのチェックが通ることを確認）
  ↓
gh pr create （GitHub CLIまたはUI）
```

---

### フェーズ6: デプロイ準備（Deployment）

```
/rollback-plan <steering-directory>
  ↓
（ロールバック計画を事前にレビュー）
  ↓
デプロイ実施
  ↓
/debug-issue （問題発生時）
  ↓
ロールバック実施 （必要に応じて）
```

---

## よくある使い方のパターン

### パターン1: 新機能を実装する

```bash
# ステップ1: タスク計画
/plan-task

# ステップ2: 影響分析
/analyze-impact

# ステップ3: 実装開始
/start-implementation 20250410-add-search-feature

# ステップ4: 品質チェック
/review-implementation 20250410-add-search-feature
/run-tests all
/check-docs-sync

# ステップ5: PR作成
/prepare-pr 20250410-add-search-feature
```

---

### パターン2: バグを修正する

```bash
# ステップ1: 問題調査
/debug-issue

# ステップ2: タスク計画（軽微な場合はスキップ可）
/plan-task

# ステップ3: 影響分析
/analyze-impact "加盟店検索のフィルタバグ修正"

# ステップ4: 実装・テスト
/start-implementation 20250411-fix-search-filter
/run-tests all

# ステップ5: PR作成
/prepare-pr 20250411-fix-search-filter
```

---

### パターン3: 新メンバーがプロジェクトに参画

```bash
# ステップ1: 環境構築
/setup-dev-env

# ステップ2: 現在のタスクを開始
/start-implementation 20250407-frontend-bff-only

# ステップ3: 定期的なチェック
/check-docs-sync
/run-tests all
```

---

### パターン4: 定期メンテナンス（週次）

```bash
# ドキュメント同期チェック
/check-docs-sync

# 全テスト実行
/run-tests all

# 問題があれば修正
/debug-issue
```

---

### パターン5: 本番デプロイ前の準備

```bash
# PR作成前の最終チェック
/prepare-pr 20250407-frontend-bff-only

# ロールバック計画作成
/rollback-plan 20250407-frontend-bff-only

# （チームでレビュー後、デプロイ実施）
```

---

## スキルの連携フロー図

```
┌─────────────┐
│ /plan-task  │ タスク計画
└──────┬──────┘
       │
       ↓
┌──────────────────┐
│ /analyze-impact  │ 影響分析
└──────┬───────────┘
       │
       ↓
┌───────────────────────┐
│ /start-implementation │ 実装開始
└──────┬────────────────┘
       │
       ↓
┌──────────────────────┐
│ /review-implementation│ 実装レビュー
└──────┬────────────────┘
       │
       ↓
┌──────────────┐
│ /run-tests   │ テスト実行
└──────┬───────┘
       │
       ↓
┌───────────────────┐
│ /check-docs-sync  │ ドキュメント同期チェック
└──────┬────────────┘
       │
       ↓
┌──────────────┐
│ /prepare-pr  │ PR作成準備
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│ /rollback-plan   │ ロールバック計画
└──────────────────┘

※ 問題発生時はいつでも /debug-issue を実行
```

---

## 注意事項

- スキルは必要に応じて使用してください（すべてを毎回実行する必要はありません）
- `/prepare-pr` は包括的なチェックを実行するため、実行時間が長くなる可能性があります
- `/rollback-plan` は本番デプロイ前に必ず実行し、チームでレビューしてください
- 定期的に `/check-docs-sync` を実行して、ドキュメントの陳腐化を防いでください
- 新メンバーには `/setup-dev-env` を実行してもらい、スムーズなオンボーディングを実現してください

---

## 参考リンク

- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体の開発ルール
- [QUICKSTART.md](QUICKSTART.md) - 新セッション開始ガイド
- [ENVIRONMENT.md](ENVIRONMENT.md) - 環境設定一覧
- `.claude/skills/` - スキルの詳細定義
