---
name: retrospective
description: ステアリングタスク完了後の振り返りを実施し、改善アクションを導出する
---

# Retrospective - 振り返りと改善

このスキルは、ステアリングタスク完了後に定量データとユーザーの主観的フィードバックを組み合わせて振り返りを行い、具体的な改善アクションに落とし込みます。

## Parameters

- `$1`: ステアリングディレクトリ名（例: `20250411-contract-management-phase1`）

## 使用方法

```
/retrospective 20250411-contract-management-phase1
```

---

## 実行フロー

### ステップ1: 引数の確認

引数のバリデーションを行う。

**引数がない場合:**
```
エラー: ステアリングディレクトリ名を指定してください。

利用可能なステアリングディレクトリ:
```
続けて `ls -1 .steering/` の結果を表示する。

**指定されたディレクトリが存在しない場合:**
```
エラー: .steering/$1 が見つかりません。

利用可能なステアリングディレクトリ:
```
続けて `ls -1 .steering/` の結果を表示する。

### ステップ2: 自動データ収集

コンテキスト節約のため、Bashで効率的にデータを収集する。**ステアリングファイルは必要最小限のみ読む。**

#### a. ステアリングファイル読み込み

```
Read .steering/$1/requirements.md   # スコープ確認
Read .steering/$1/tasklist.md       # タスク完了状況
```

**注意:** design.md は振り返りでは不要。スコープとタスク完了状況のみ確認する。

#### b. ステアリング日付の抽出

ディレクトリ名の先頭8文字（YYYYMMDD）から日付を抽出し、gitログのフィルタに使用する。

```bash
STEERING_DATE=$(echo "$1" | grep -oE '^[0-9]{8}' | sed 's/\(....\)\(..\)\(..\)/\1-\2-\3/')
```

#### c. gitログ（各サブモジュール + 親リポジトリ）

```bash
# 各サブモジュールのコミット数
echo "=== Backend ==="
cd services/backend && git log --oneline --since="$STEERING_DATE" 2>/dev/null | wc -l
cd services/backend && git log --since="$STEERING_DATE" --stat --format="" 2>/dev/null | tail -1

echo "=== BFF ==="
cd services/bff && git log --oneline --since="$STEERING_DATE" 2>/dev/null | wc -l
cd services/bff && git log --since="$STEERING_DATE" --stat --format="" 2>/dev/null | tail -1

echo "=== Frontend ==="
cd services/frontend && git log --oneline --since="$STEERING_DATE" 2>/dev/null | wc -l
cd services/frontend && git log --since="$STEERING_DATE" --stat --format="" 2>/dev/null | tail -1

echo "=== Parent repo ==="
git log --oneline --since="$STEERING_DATE" | wc -l
git log --since="$STEERING_DATE" --stat --format="" | tail -1
```

#### d. テスト結果

```bash
# Backend
cd services/backend && go test ./... 2>&1 | tail -5

# BFF
cd services/bff && go test ./... 2>&1 | tail -5

# Frontend
cd services/frontend && npm test -- --watchAll=false 2>&1 | tail -10

# E2E（存在する場合のみ）
if [ -d "e2e" ]; then
  cd e2e && npx playwright test --reporter=list 2>&1 | tail -5
fi
```

#### e. レビュー結果（存在する場合）

以下のファイルが存在する場合のみ読み込み、指摘件数をカウントする。

```
.steering/$1/steering-review.md
.steering/$1/review-report.md
```

レビュー指摘の重要度別件数をカウント:
```bash
grep -c "Critical" .steering/$1/review-report.md 2>/dev/null || echo "0"
grep -c "High" .steering/$1/review-report.md 2>/dev/null || echo "0"
grep -c "Medium" .steering/$1/review-report.md 2>/dev/null || echo "0"
grep -c "Low" .steering/$1/review-report.md 2>/dev/null || echo "0"
```

### ステップ3: 定量サマリーの提示

収集したデータを以下の形式でユーザーに提示する:

```
## 定量サマリー

| 項目 | Backend | BFF | Frontend | E2E |
|------|---------|-----|----------|-----|
| コミット数 | X | X | X | - |
| 変更行数 | +XXX/-XX | +XXX/-XX | +XXX/-XX | +XX |
| テスト数 | XX件 | XX件 | XX件 | XX件 |
| テスト結果 | 全パス | 全パス | 全パス | 全パス |

レビュー指摘: Critical X件 / High X件 / Medium X件 / Low X件
```

データが取得できなかったサービスは「-」と表示する。

### ステップ4: ユーザーへの振り返り質問（対話）

以下の3つの質問を **1つずつ順番に** 聞く。一度に全部聞かない。

**重要:** 各質問はユーザーの回答を待ってから次の質問に進む。ユーザーが「特になし」「なし」「n/a」等と答えた場合はスキップして次に進む。

**質問1:**
```
今回のタスクで「うまくいったこと」は何ですか？
（Agent構成、事前作業、実装プロセス、コミュニケーション等）
```

**質問2:**
```
「次回改善したいこと」はありますか？
（ボトルネック、手戻り、無駄な作業、ツール不足等）
```

**質問3:**
```
「想定外だったこと」はありますか？
（予想より難しかった点、予想より簡単だった点、発見等）
```

### ステップ5: 改善アクションの提案

収集した定量データとユーザーの回答を分析し、以下の3つの観点で改善アクションを提案する。

#### a. プロセス改善
- Agent構成の改善提案（並行/段階的/単一の選択基準）
- 事前作業の改善提案（API契約確定のタイミング等）
- レビュー・修正プロセスの改善提案

#### b. ドキュメント・ルール改善
- CLAUDE.mdへの反映候補
- ステアリングファイルのテンプレート改善
- 開発ガイドラインの追加

#### c. ツール・自動化
- 新しいスキルの提案
- 既存スキルの改善提案
- CI/CD・自動化の提案

**重要:** 各アクションは「提案のみ」とし、ユーザーの承認を得てから実行する。提案時に、各アクションの優先度（高/中/低）も付記する。

### ステップ6: retrospective.md の保存

ユーザーに最終確認を取った上で、以下の形式で `.steering/$1/retrospective.md` に保存する。

```markdown
# 振り返り: [ステアリングタイトル]

## 実施日
YYYY-MM-DD

## 定量サマリー

| 項目 | Backend | BFF | Frontend | E2E |
|------|---------|-----|----------|-----|
| コミット数 | X | X | X | - |
| 変更行数 | +XXX/-XX | +XXX/-XX | +XXX/-XX | +XX |
| テスト数 | XX件 | XX件 | XX件 | XX件 |
| テスト結果 | 全パス | 全パス | 全パス | 全パス |

レビュー指摘: Critical X件 / High X件 / Medium X件 / Low X件

## 振り返り

### うまくいったこと
[ユーザーの回答]

### 次回改善したいこと
[ユーザーの回答]

### 想定外だったこと
[ユーザーの回答]

## 改善アクション

### 実施済み
- [ ] アクション1（対応: CLAUDE.md更新等）

### 次回に向けて
- [ ] アクション2
- [ ] アクション3

---
**生成日:** YYYY-MM-DD
**生成者:** Claude Code
```

### ステップ7: 改善アクションの実行（ユーザー承認後）

ユーザーが承認したアクションのみ実行する。実行可能なアクションの例:

- CLAUDE.md更新
- テンプレート修正
- 新スキル作成
- 開発ガイドライン追記
- glossary.md更新

実行後、`.steering/$1/retrospective.md` の該当アクションのチェックボックスを `[x]` に更新し、「実施済み」セクションに移動する。

---

## 注意事項

- **対話的であること**: 自動分析だけでなく、ユーザーの主観的な感想を重視する
- **アクション志向**: 振り返りで終わらず、具体的な改善まで落とし込む
- **軽量に保つ**: 5分程度で完了する設計。質問は3つのみ、各質問で「特になし」のスキップを許可
- **コンテキスト節約**: ステアリングファイルは必要最小限のみ読む（requirements.mdのスコープ + tasklist.mdのタスク完了状況）。design.mdは読まない
- **テスト実行は結果のみ取得**: --reporter=listの末尾のみ。テスト全文は不要
- **提案は承認制**: 改善アクションは必ずユーザーの承認を得てから実行する
