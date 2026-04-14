# 実装レビュー報告: E2E Login パターン構造刷新

## Summary
- ステアリング: `.steering/20260415-e2e-login-pattern-refactor/`
- 対象: 親リポ `e2e/` のみ (サブモジュール変更なし)
- 実施日: 2026-04-14
- 実装者: team-lead 単一 Agent
- PR: https://github.com/ikechin/agent-teams-sample/pull/11
- commit: `da7391f`

## 総合結論

**✅ Ready to Merge** — Critical/High なし、Medium 2 件・Low 1 件。スコープ拡張 2 件あり (ただし目的合致で妥当)。

## 受け入れ条件の達成状況

| # | 条件 (requirements §成功の定義) | 結果 |
|---|---|---|
| 1 | `auth.setup.ts` が 3 ロール分の storageState を生成 | ✅ (+ seed 投入 setup 1 件) |
| 2 | 既存 5 spec が storageState ベース | ✅ |
| 3 | `auth/login-flow.spec.ts` は空 storageState で維持 | ✅ |
| 4 | フルスイート 44/44 pass | ✅ **45/45** (setup 4 + chromium 41) |
| 5 | **5 回連続実行で全 pass** | ✅ **45×5 すべて pass** |
| 6 | 新規 spec テンプレート README 反映 | ✅ |
| 7 | login retry 発火なし | ✅ (通常運用で発火ゼロ) |
| 8 | 実行時間が悪化しない | ✅ **37s → 12s (3 倍速化)** |

## Issues Found

### Critical (0 件)
なし。

### High (0 件)
なし。

### Medium (2 件)

**M1. スコープ拡張: approval-count-badge / approval-history-search の API login 撤廃**
- 場所: `e2e/tests/contracts/approval-count-badge.spec.ts` / `approval-history-search.spec.ts`
- 内容: tasklist.md では「既に storageState 方式」と記載されており本来対象外だったが、実際には beforeAll で API login を 3〜6 回実行していた。本 PR でこれらも storageState (`ROLES[...].storageStatePath`) に統一した
- 判断: **妥当な拡張** — requirements の「合計 login 数を定数化」目標を達成するには必要だった。design.md の「API login の Cookie は browser context に転用不可」の根拠が覆され、`domain=localhost` により APIRequestContext にも storageState 流用可能と実測で確認
- 影響: retrospective で「design の初期判断を実装時に更新した」として記録するとよい

**M2. 30 分 TTL による storageState 再利用 (設計追加)**
- 場所: `e2e/tests/auth.setup.ts:25-32`
- 内容: design.md では言及されていなかったが、**連続実行時の rate limit 対策**として storageState ファイルの mtime を見て 30 分以内なら再 login をスキップする機構を追加した
- 理由: login-flow.spec.ts (3+ 回の login 試行を含む) と setup project 3 回の合計が連続実行 2 回目で rate limit burst=10 を超過したため
- 判断: **妥当な追加** — これがないと受け入れ条件 5 (5 回連続 pass) が達成不能。Playwright 公式ドキュメントでも言及されている推奨パターン

### Low (1 件)

**L1. seed-users.ts のパスワードハードコード**
- 場所: `e2e/utils/seed-users.ts:14, 23`
- 問題: `test@example.com` / `approver@example.com` / `viewer@example.com` の値がハードコードされている (`roles.ts` は環境変数フォールバックあり)
- 判断: **許容** — docker exec で DB に直接 INSERT する seed 専用ヘルパーで、credential 自体は既存 seed user (`test@example.com`) の password_hash を流用する構造。テスト専用の価値なので実害なし
- 修正案: 必要なら `ROLES[...]` から取得するように統一可能

## 追加観察事項 (スコープ外)

**データ汚染問題の顕在化**
- 観察: 5 回連続実行検証中、クリーンな DB から開始すれば全 pass だが、累積約 18 runs で merchant-list spec の「テスト加盟店1」検証がページ 1 から押し出されて失敗する現象を観測
- 根本原因: `merchant-crud.spec.ts` / `contract-crud.spec.ts` がテスト作成したレコードを cleanup しないため、DB に蓄積する
- スコープ: **本 PR の対象外** (login rate limit とは無関係、Phase 2/3 以前から存在した潜在問題)
- 次タスク候補として retrospective に記録推奨

## Checklist Results

| カテゴリ | 結果 |
|---|---|
| 1. ステアリング準拠性 | ✅ 100% (全 8 条件達成) |
| 2. 機能過不足 | ✅ (Medium 2 件はスコープ拡張、過剰ではなく必要な追加) |
| 3. API 契約準拠 | ✅ (N/A — API 変更なし) |
| 4. 用語統一 | ✅ (新規用語なし、glossary 更新不要) |
| 5. セキュリティ | ✅ (session Cookie の取り扱いは既存パターン踏襲、.auth/ は gitignore) |
| 6. パフォーマンス | ✅ **3 倍速化** (37s → 12s) |
| 7. J-SOX | ✅ (E2E テスト内部の変更、audit_log 挙動変わらず) |
| 8. コード品質 | ✅ (lint/type-check クリーン、重複ヘルパーを共通化) |
| 9. ドキュメント整合 | ✅ (e2e/README.md 更新済み、glossary 不要) |

## Recommendations

1. **本 PR はこのままマージ可能** — Critical/High ゼロ、Medium は正当化済みの拡張
2. **retrospective で記録**:
   - design.md の仮説 (API login の Cookie 転用不可) が実測で覆された経緯 → 設計段階の調査精度向上の学び
   - 30 分 TTL storageState 再利用は Playwright 公式パターンだが初回設計で見落としていた → テンプレ化候補
   - **データ汚染問題** は別ステアリング候補 (`e2e-test-data-cleanup` 等)
3. **将来タスク候補**:
   - login ヘルパー完全削除 (retry 発火ゼロが継続観測されたら)
   - `seed-users.ts` を `ROLES` 参照に統一 (L1)
   - E2E データ汚染 cleanup (merchant-crud / contract-crud の afterAll に cleanup 追加 or beforeAll で reset)

---

**レビュー実施日:** 2026-04-14
**レビュアー:** team-lead (Orchestrator 相当、自己レビュー)
