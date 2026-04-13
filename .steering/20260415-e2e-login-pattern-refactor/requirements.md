# E2E Login パターン構造刷新 要求定義

## 目的

`.steering/20260414-approval-history-search/retrospective.md` で根本原因が特定された
**E2E フルスイート login rate limit 飽和問題** の構造的解決。現行の `beforeEach UI login`
パターンから `beforeAll + storageState` 共有パターンへの全面移行を行う。

**前提:**
- `.steering/20260414-approval-history-search/` で採用した login ヘルパーの指数バック
  オフリトライ (commit `06b1194`) は「対症療法」。rate limit window を跨ぐ待機で救済
  しているだけで、テストスイート全体の login 数は依然として spec 数に線形にスケール
- BFF の `POST /api/v1/auth/login` は 10/min/IP + burst 10 の制限 (セキュリティ要件)。
  緩和ではなく **消費側の設計を変える**
- 本タスク完了後は login ヘルパーのリトライロジックを「最後の保険」として残しつつ、
  通常運用では発火しないことを期待する

---

## スコープ

### 実装するもの

#### E2E 共通ヘルパー
- **`e2e/utils/storage-states.ts` 新規作成** — ロール別 storageState を beforeAll で
  取得・キャッシュする lazy initializer
  - `getSystemAdminState()` / `getContractManagerState()` / `getApproverState()` /
    `getSalesState()` / `getViewerState()` の 5 関数
  - 初回呼び出し時のみ API login で取得、以降はメモリキャッシュを返す
  - フルスイート全体で **各ロール 1 回の login** に集約 → 合計 login 数を定数化
- **`e2e/utils/fixtures.ts` 新規作成 (or 既存拡張)** — Playwright `test.extend()` で
  ロール別 `page` fixture を提供
  - 例: `test('...', async ({ authenticatedAsContractManager }) => { ... })` で
    すでにログイン済みの page を受け取れる

#### 既存 spec の移行 (段階的)
以下の順で `beforeEach UI login` パターンを撲滅する:
1. `contract-crud.spec.ts`
2. `service-crud.spec.ts`
3. `merchant-crud.spec.ts`
4. `approval-workflow.spec.ts` (すでに loginWithRetry 使用、優先度低)
5. `approval-count-badge.spec.ts` (Phase 3)
6. `approval-history-search.spec.ts` (Phase 4、本 PR の成果物)
7. その他 spec (`auth-login.spec.ts` 等、login 自体をテストする spec は対象外)

各 spec で:
- `beforeAll` で storageState を取得 (ヘルパー経由)
- `test.use({ storageState: ... })` または fixture で注入
- `beforeEach` の UI login を削除
- login フローそのものをテストする assertion (例: `auth-login.spec.ts`) は従来通り

#### login ヘルパーの位置づけ明文化
- `e2e/utils/test-helpers.ts` の `login` リトライロジックは **残す**
- ただし通常運用では発火しないことをコメントで明記
- フルスイート実行時の login 発火回数を CI で計測・監視 (optional)

### 実装しないもの
- **BFF 側の rate limit 緩和** — セキュリティ要件として維持
- **新しい E2E 機能テスト** — 既存 spec の移行のみ、新規シナリオは本タスクでは追加しない
- **unit テストへの影響** — Backend/BFF/Frontend の単体テストは無変更

---

## ユーザーストーリー

### ストーリー1: フルスイート実行の安定化

**As a** 開発者
**I want to** `npx playwright test --workers=1` を何度実行しても rate limit 由来の
フレーキーさで失敗しない
**So that** CI / ローカルで信頼できるテストシグナルを得られる

**受け入れ条件:**
- フルスイート連続 5 回実行で全 pass (rate limit 失敗ゼロ)
- 各ロール毎の UI login 発火回数が 1 回に集約 (合計 login 数が spec 数に依存しない)
- login ヘルパーのリトライロジックは **発火しない** (監視ログ or コメントで確認)

### ストーリー2: 新規 spec 追加時の login 予算気遣い撤廃

**As a** E2E テストを追加する開発者
**I want to** 新しい spec を追加するときに「login 予算が足りるか」を考えなくてよい
**So that** テスト追加の心理的コストを下げ、カバレッジ拡大を促進できる

**受け入れ条件:**
- 新規 spec 作成テンプレートに「fixture 経由で storageState を使う」パターンが記載される
- `.claude/skills/start-implementation/` 等の開発ガイドラインが更新される

---

## 制約事項

### 技術的制約
1. **BFF login rate limit 不変**: 10/min/IP + burst 10 をセキュリティ要件として維持
2. **既存 seed user 流用**: test@/approver@/viewer@example.com に新ユーザー追加しない
3. **auth-login.spec.ts は対象外**: login フロー自体のテストは従来通り
4. **storageState のセッション有効期限**: BFF のセッション TTL より短い実行時間内で完結する
   こと (現行 24h なので問題ない想定)

### ビジネス制約
- **J-SOX 監査ログ**: E2E 実行によって生成される audit_log は影響を受けない (テスト DB)

---

## 成功の定義

### 機能面
1. フルスイート `--workers=1` 連続 5 回 pass
2. 各ロールの UI login 発火回数 1 回に集約
3. 既存 41 件 E2E のデグレなし
4. 新規 spec テンプレート / 開発ガイドラインに storageState パターン反映

### 構造面
1. `e2e/utils/storage-states.ts` (or fixtures.ts) 新規追加
2. `beforeEach UI login` を使っている spec 数がゼロ (auth-login.spec.ts を除く)
3. login ヘルパーのリトライ発火ゼロ (通常運用で)

---

## 優先度と推定工数

- **優先度: 中〜高** — 現状は login ヘルパーの retry で救済されているため即時障害はない
  が、spec 数がさらに増えると retry でも耐えきれなくなる。Phase 5 以降のタスクが増える
  前に着手したい
- **推定工数: 半日** — ヘルパー実装 1〜2h、既存 6 spec の移行各 15〜30min、動作確認 1h

---

## 参照ドキュメント

- `.steering/20260414-approval-history-search/retrospective.md` — 問題の発見経緯
- `.steering/20260414-approval-history-search/review-report.md` — 対症療法の記録
- `services/bff/cmd/server/main.go` — rate limit middleware 設定
- `e2e/utils/test-helpers.ts` — 現行 login ヘルパー

---

**作成日:** 2026-04-15
**作成者:** Claude Code
**起票理由:** 20260414-approval-history-search retrospective の改善アクション #6
