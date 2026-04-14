# E2E テストデータ汚染の構造解決 要求定義

## 目的

`.steering/20260415-e2e-login-pattern-refactor/retrospective.md` で顕在化した
**E2E テスト実行による DB データ累積問題** を構造的に解決する。

現状、`merchant-crud.spec.ts` / `contract-crud.spec.ts` などの CRUD 系 spec は
テスト実行時に作成したレコードを削除しないため、フルスイートを繰り返し実行すると
DB に merchants / contracts / approval_workflows が蓄積する。

**実測結果 (20260415 検証時)**:
- 18 runs 程度で `merchants` テーブルに 20+ 件蓄積
- `merchant-list.spec.ts` の seed 検証 (「テスト加盟店1」) がページ 1 から押し出されて失敗
- クリーンな DB から開始すれば 5 連続 pass、汚染 DB では 2〜3 連続で失敗

この問題は Phase 2 以前から潜在していたが、login rate limit で単発実行主体だったため
顕在化していなかった。Phase 5 (20260415) で連続実行テストを導入したことで初めて観察できた。

---

## スコープ

### 実装するもの

#### 共通 cleanup ヘルパー
- **`e2e/utils/test-data-cleanup.ts` 新規作成** — `cleanupTestData()` 関数
  - docker exec 経由で backend-db に直接接続
  - 非 seed (`M-00001`〜`M-00003` 以外) の merchants, contracts, approval_workflows を外部キー順で削除
  - 冪等 (何度実行しても安全)

#### 実行タイミングの選択肢
以下のいずれかを採用 (設計段階で決定):

**案A: 全 spec 共通の beforeAll hook**
- `playwright.config.ts` の `globalSetup` で `cleanupTestData()` を呼ぶ
- フルスイート実行開始時に 1 回だけ cleanup
- メリット: シンプル、spec 変更不要
- デメリット: 単一 spec 実行時も cleanup が走る (許容)

**案B: CRUD 系 spec の afterAll で個別 cleanup**
- 各 CRUD spec が自分の作ったデータを削除
- メリット: テストデータの責任が明確、他 spec への影響最小
- デメリット: 全 CRUD spec を変更する必要あり、仕様変更時の保守コスト

**選択候補**: 設計段階で判断。案 A を第一候補として検討 (変更影響最小)。

#### CI 設定 (optional)
- GitHub Actions に `e2e-consecutive` job を追加
- PR 時 or nightly に **連続 3 回フルスイート実行**
- 全 3 回 pass を merge 条件とする
- データ汚染が再発したら即座に検出できる

### 実装しないもの
- **seed データの変更** — seed merchants (M-00001〜M-00003) の仕様は維持
- **新規 spec の追加** — 既存 spec の構造修正のみ
- **merchant-list.spec.ts の検証ロジック変更** — seed データが常にページ 1 にいることを
  前提とした現行ロジックはそのまま (cleanup でデータ累積を抑える)
- **backend-db のスキーマ変更**

---

## ユーザーストーリー

### ストーリー1: 開発者が CI/ローカルで連続実行しても E2E が安定する

**As a** 開発者
**I want to** フルスイート E2E を連続 10 回以上実行しても全 pass する
**So that** PR レビューや CI で信頼できるテストシグナルを得られ、データ汚染由来の
フレーキーに悩まされない

**受け入れ条件:**
- クリーンな DB から **連続 10 回** フルスイート実行して全 pass (45/45 × 10)
- 実行後の `merchants` テーブルに非 seed データが累積しない (cleanup が効いている)
- 単一 spec 実行 (`npx playwright test <spec>`) も影響を受けない

### ストーリー2: 新規 spec 追加時にデータ cleanup を気にしなくてよい

**As a** E2E spec を追加する開発者
**I want to** テスト作成データの cleanup 責任を個別 spec ではなく共通機構に委譲する
**So that** 新規 spec で cleanup コードを書き忘れてもデータ汚染が発生しない

**受け入れ条件:**
- 新規 spec テンプレートに cleanup 不要であることが記載される
- 共通 cleanup ヘルパーの docstring に対象テーブルと削除条件が明記される

---

## 制約事項

### 技術的制約
1. **seed データ無変更**: `M-00001`〜`M-00003` は常に存在する前提を維持
2. **docker exec 経由の cleanup**: 既存の `seed-users.ts` と同じパターンで、docker 依存を新規に増やさない
3. **FK 順序**: `approval_workflows` → `contracts` → `merchants` の順で削除 (FK 制約を尊重)
4. **冪等性**: 複数回実行しても安全、エラーで止まらない

### ビジネス制約
- **J-SOX 監査ログ**: テストデータの cleanup によって audit_log が発生するが、テスト DB なので実害なし
- 本番 DB には絶対に実行しない設計 (テスト DB ホスト固定)

---

## 成功の定義

### 機能面
1. `cleanupTestData()` ヘルパー実装完了
2. `playwright.config.ts` から globalSetup で呼ばれる (案 A の場合)
3. **連続 10 回フルスイート実行で 45/45 × 10 全 pass**
4. 単一 spec 実行で影響なし
5. CI で連続 3 回実行 job が追加される (optional)

### 非機能面
- フルスイート実行時間に **悪影響なし** (cleanup は数秒以内)
- 既存 spec の変更は案 A なら不要、案 B なら CRUD 系のみ

---

## 優先度と推定工数

- **優先度: 中** — 現状は login rate limit 問題が解決済みで、連続 5 回程度なら pass する。
  ただし CI で nightly full suite を回す場合や、spec 数が増えた時に再発リスクあり
- **推定工数: 2〜3 時間** (設計判断 + cleanup ヘルパー実装 + 検証)

---

## 参照ドキュメント

- `.steering/20260415-e2e-login-pattern-refactor/retrospective.md` — 問題の発見経緯
- `.steering/20260415-e2e-login-pattern-refactor/review-report.md` — スコープ外観察の記録
- `e2e/tests/merchants/merchant-list.spec.ts` — 押し出される検証の場所
- `e2e/utils/seed-users.ts` — docker exec cleanup パターンの参考

---

**作成日:** 2026-04-14
**作成者:** Claude Code
**起票理由:** 20260415-e2e-login-pattern-refactor retrospective 改善アクション A4
