# E2E Login パターン構造刷新 タスクリスト

## 実装方針

**単一 Agent で実施** (Agent Teams は使用しない)。
影響範囲は親リポの `e2e/` のみで、サブモジュール (Backend / BFF / Frontend) への変更は
一切ない。並行作業にする価値がないため、通常の Claude Code 単一 Agent で順次実装する。

## 前提タスク
- `20260414-approval-history-search` 完了済み (commit `d59da5a` 以降が main に反映済み)
- 本タスク起票元の retrospective: `.steering/20260414-approval-history-search/retrospective.md`

---

## 実装タスク (単一 Agent、単一フェーズ)

### Phase 1: 基盤整備 (30 分想定)

- [ ] **T1.1** `e2e/utils/roles.ts` 新規作成
  - `RoleName` type + `ROLES` record (contract-manager / approver / viewer)
  - 環境変数 (TEST_USER_EMAIL / TEST_USER_PASSWORD) フォールバック
  - storageStatePath を `e2e/.auth/<role>.json` で定義
- [ ] **T1.2** `e2e/tests/auth.setup.ts` 新規作成
  - Playwright `test as setup` パターンで 3 ロール分の API login → storageState 保存
  - APIRequestContext (`request.newContext`) で `POST /api/v1/auth/login` を直接叩く
  - ファイル保存前に `.auth/` ディレクトリを `fs.mkdirSync` で作成
  - login 失敗時は `expect(response.status()).toBe(200)` で即座に fail
- [ ] **T1.3** `e2e/playwright.config.ts` の `projects` 配列を再編
  - `setup` project を追加 (`testMatch: /auth\.setup\.ts/`)
  - `chromium` project に `dependencies: ['setup']` を追加
  - 既存の共通 `use` 設定はそのまま維持
- [ ] **T1.4** `e2e/.gitignore` に `.auth/` を追加 (存在しなければ `.gitignore` 新規作成)
- [ ] **T1.5** setup project の単発実行確認
  - `npx playwright test --project=setup` で 3 テスト全 pass を確認
  - `e2e/.auth/contract-manager.json` / `approver.json` / `viewer.json` が生成されていること

### Phase 2: 既存 spec の移行 (1〜1.5h 想定)

各 spec 移行後、**個別に** `npx playwright test <spec>` で単独 pass を確認してから次へ進む。

- [ ] **T2.1** `e2e/tests/contracts/contract-crud.spec.ts` 移行
  - `test.use({ storageState: ROLES['contract-manager'].storageStatePath })` をファイル上部に追加
  - `beforeAll` 内の `login()` 呼び出しを削除
  - `browser.newPage({ storageState: ... })` に変更
  - `import { login }` を削除、`import { ROLES } from '../../utils/roles'` 追加
  - 単独実行 pass 確認
- [ ] **T2.2** `e2e/tests/merchants/merchant-list.spec.ts` 移行 (同上パターン)
- [ ] **T2.3** `e2e/tests/merchants/merchant-crud.spec.ts` 移行
- [ ] **T2.4** `e2e/tests/services/service-crud.spec.ts` 移行
- [ ] **T2.5** `e2e/tests/contracts/approval-workflow.spec.ts` 移行
  - 複数ロールを使う可能性あり。spec 内の login call を調査し、承認操作があれば
    `approver` ロール用の context を別途用意
  - 必要なら `test.describe` を分割 or `browser.newContext({ storageState })` で
    ロール別 context を切り替える
- [ ] **T2.6** `e2e/tests/auth/login-flow.spec.ts` に空 storageState を明示指定
  - `test.use({ storageState: { cookies: [], origins: [] } })` を追加
  - 既存 test は変更不要

### Phase 3: login ヘルパー非推奨化 (10 分)

- [ ] **T3.1** `e2e/utils/test-helpers.ts` の `login()` 関数の JSDoc を更新
  - 「**非推奨**: 通常 spec からの呼び出しは `test.use({ storageState })` 方式に移行済み。
    本関数は ad-hoc デバッグ / login-flow.spec.ts の内部検証向け」を明記
  - リトライロジックは削除せず残置 (最後の保険)
  - 可能なら `@deprecated` JSDoc タグも付与

### Phase 4: 検証 (30 分)

- [ ] **T4.1** `npx playwright test` で全スイート pass 確認 (既存 41 + setup 3 = 44 目標)
- [ ] **T4.2** `npx playwright test --workers=1` で直列実行 pass 確認
- [ ] **T4.3** **5 回連続** `npx playwright test` を実行 (`for i in 1 2 3 4 5; do npx playwright test; done`)
  - 全 5 回 pass で rate limit フレーキーが消えたことを確認
  - 途中 fail した場合は原因調査
- [ ] **T4.4** BFF ログで `rate_limit_exceeded` / 429 が発生していないことを確認
  - `docker compose logs bff | grep -Ei 'rate|429'`
- [ ] **T4.5** login retry 発火の有無を確認
  - 発火なし = 理想 (retry ロジック不要な状態)
  - 発火ありでも pass するなら許容 (retry は保険)

### Phase 5: ドキュメント更新 (15 分)

- [ ] **T5.1** `e2e/README.md` に storageState パターンの説明追加
  - setup project の役割
  - 新規 spec 作成時のパターン (`test.use({ storageState: ROLES['<role>'].storageStatePath })`)
  - `.auth/` ディレクトリは gitignore 対象であること
- [ ] **T5.2** (optional) `docs/development-workflow.md` の E2E 新規 spec ガイドに
  storageState 使用を追記

### Phase 6: コミット・PR (10 分)

- [ ] **T6.1** feature ブランチ作成
  - 親リポ: `git checkout -b feature/e2e-login-pattern-refactor`
  - サブモジュール変更なしなので親リポのみ
- [ ] **T6.2** 変更をコミット
  - 1 commit にまとめる or Phase ごとに分ける (推奨: Phase 1〜2 / Phase 3〜4 / Phase 5 で 3 commit)
- [ ] **T6.3** push + PR 作成 (`gh pr create`)
- [ ] **T6.4** `/retrospective 20260415-e2e-login-pattern-refactor` で振り返り実施

---

## Agent 間の依存関係

**単一 Agent タスクのため依存関係なし**。

---

## 完了条件

### 機能面
- [ ] `e2e/tests/auth.setup.ts` が 3 ロール分の storageState を生成する
- [ ] 既存 5 spec が storageState ベースに移行済み
- [ ] `auth/login-flow.spec.ts` は空 storageState 指定で従来通り login UI をテスト
- [ ] フルスイート 44/44 (41 + setup 3) pass
- [ ] **5 回連続実行で全 pass** (rate limit フレーキー解消)
- [ ] 新規 spec テンプレートが README に反映

### 非機能面
- [ ] 通常運用で login retry が発火しない (発火しても pass すれば許容)
- [ ] E2E 総実行時間が現行より大幅に悪化していない (期待: 改善)

---

## 振り返り観点 (本タスク固有)

実装完了後の `/retrospective` で以下を記録:

1. **rate limit フレーキー解消の定量効果**
   - 5 回連続実行の pass 率 (目標 100%)
   - 実行時間 (現行 vs 改修後)
2. **storageState 方式への移行容易性**
   - 各 spec の移行工数
   - テスト対象ロジックへの副作用
3. **login ヘルパー retry の発火有無**
   - 発火ゼロなら retry ロジックを将来削除できる根拠になる
4. **新規 spec 作成の心理的コスト変化**
   - 今後 spec 追加時に「login 予算」を気にしなくてよくなるか

---

**作成日:** 2026-04-14
**作成者:** Claude Code
