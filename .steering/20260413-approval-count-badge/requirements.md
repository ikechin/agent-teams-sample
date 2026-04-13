# 承認待ち件数バッジ 要求定義

## 目的

サイドバー「承認管理」リンク横に、自分が承認可能な承認待ちワークフローの件数を
バッジとして表示する。Phase 2 requirements.md で「オプション、余裕があれば」と
されていた未実装項目の本実装。

**副次的な目的:** 真の Agent Teams (`TeamCreate` + `team_name` + `SendMessage`
自動配信) の初動作検証を兼ねる。Phase 2 ではそもそも `TeamCreate` を呼んでおらず
本来の Agent Teams 機能を使えていなかったことが判明したため、小さな検証タスクで
仕様通りに動くかを実測する。

**前提タスク:**
- Phase 2 完了: `.steering/20260412-contract-management-phase2/`
- `approval_workflows` テーブル、`ApprovalService` gRPC、`/api/v1/approvals` REST、
  承認管理画面、`contracts:approve` 権限がすべて実装済みであること

---

## スコープ

### 実装するもの

#### Backend Service
- **gRPC RPC の新設または既存流用の判断** (意図的に未確定)
  - 選択肢 A: `ApprovalService.CountPendingApprovals` を独立 RPC として新設
  - 選択肢 B: 既存 `ListPendingApprovals({limit: 1})` のレスポンスに含まれる
    `Pagination.TotalItems` をそのまま流用する
  - **この判断は Agent Teams 運用の検証ポイント**。Backend Agent が判断した時点で
    BFF Agent に即時 DM で共有すること
- 既存の `approval_service.go` に実装。トランザクション不要
- テスト追加
- `go vet` / `go fmt` クリーン

#### BFF Service
- **REST エンドポイントの形の判断** (意図的に未確定)
  - 選択肢 A: `GET /api/v1/approvals/count` を新設 (レスポンス: `{count: number}`)
  - 選択肢 B: 既存 `GET /api/v1/approvals?limit=1` を流用し、Frontend がレスポンスの
    `pagination.total_items` を読む
  - Backend の選択肢 A/B と対応させる必要があるため、BFF Agent と Backend Agent の
    合意形成が必須。**フルメッシュ DM で合意すること**
- 既存の権限チェック (`contracts:approve`) を踏襲
- テスト追加

#### Frontend
- **サイドバー `Sidebar.tsx` のバッジ表示**
- バッジの条件:
  - `contracts:approve` 権限を持つユーザーのみ表示 (既存のサイドバー制御を踏襲)
  - 件数が 0 のときはバッジ非表示
  - 件数は自分が承認可能なもの (後述の `include_own` 判断による)
- ポーリング間隔: 30 秒を推奨 (ただし BFF の rate limit を考慮して要調整)
- 承認・却下実行後は即時 invalidate でキャッシュをクリアして再フェッチ
- 新規フック (例: `useApprovalCount`) を追加するか、既存 `usePendingApprovals` を
  流用するかは Frontend Agent の判断 (これも Backend/BFF の判断と整合させる)
- テスト追加

#### 親リポ (E2E)
- E2E 1 シナリオ追加:
  - 申請者がログイン → 他ユーザーが承認申請を作成 → 申請者はバッジが 0 のまま
    (SoD 除外の検証)
  - 承認者がログイン → バッジに 1 が表示される → 承認実行 → バッジが 0 になる

### 実装しないもの
- バッジのアニメーション (静的表示のみ)
- カウントの詳細ブレイクダウン表示 (総数のみ)
- PENDING 以外のステータス (APPROVED / REJECTED) のカウント
- 通知機能 (Phase 2 と同じく将来検討)

---

## 🎯 意図的に未確定な判断ポイント (Agent Teams 検証用)

以下は**故意に方針を決めず**、Agent 間の合意形成プロセスを検証するために残す。
通常のタスクではこれらは Orchestrator が事前決定すべきだが、本タスクでは検証目的のため
**各 Agent が自律的に合意**することを期待する。

### D1. `include_own` の扱い 🎯最重要
- カウントから自分の申請を除外すべきか?
- **候補:**
  - 除外する (`include_own=false`) → 承認可能件数 = バッジが示す意味が明確
  - 除外しない (`include_own=true`) → 全 PENDING 件数 = ユーザーには自分の申請も含まれることを知らせられる
- **合意に必要な論点:**
  - Phase 2 で既存の `ListPendingApprovals` は `include_own=false` がデフォルトで、
    `?include_own=true` で本人含む形になっている
  - バッジの意味「自分が承認すべき件数」を考えると除外が自然
  - Phase 2 で H1 を引き起こした論点と同質なので、**Backend・BFF・Frontend の 3 Agent が
    独立判断すると齟齬が起きやすい**
- **検証ポイント:** どの Agent が最初にこの論点に気付き、他 Agent に DM で問い合わせ
  られるか? 齟齬は実装完了前に解消できるか?

### D2. 新規 RPC vs 既存流用
- Backend に `CountPendingApprovals` を独立 RPC として新設するか?
- それとも既存 `ListPendingApprovals({limit: 1})` で済ますか?
- **候補:**
  - 独立 RPC 新設 → 意図が明確、将来の最適化 (index only scan 等) 余地あり
  - 既存流用 → コード追加ゼロ、実装が軽い
- **合意に必要な論点:**
  - Backend Agent が独断で決めると、BFF Agent の API 設計と齟齬が出る
  - Frontend もフック設計 (新規 `useApprovalCount` vs 既存流用) が影響される
  - **3 Agent の合意が必須**

### D3. ポーリング間隔
- Frontend から BFF への再フェッチ間隔は何秒か?
- **候補:**
  - 30 秒 (推奨): UX 十分、rate limit 余裕あり
  - 10 秒: UX 向上だが rate limit リスク
  - 60 秒: UX 劣化だが最安全
- **合意に必要な論点:**
  - Phase 2 で E2E が崩壊した原因は BFF ログイン rate limit (10/min/IP)
  - カウント取得は login ではないが、audit_log テーブル書き込みが発生するので
    頻度が高すぎると DB 負荷増加
  - **Frontend Agent が単独で決めず、BFF Agent に現在の rate limit / middleware 挙動を
    確認すべき**

### D4. レスポンス形状
- BFF のレスポンス JSON はどうするか?
- **候補:**
  - `{"count": 5}` — 最小
  - `{"count": 5, "include_own": false}` — メタデータ明示
  - `{"count": 5, "updated_at": "..."}` — キャッシュ制御用
- **合意に必要な論点:**
  - Backend Agent が決めた時点で BFF/Frontend に即時 DM
  - Frontend の型生成 (OpenAPI) も影響される

---

## ユーザーストーリー

### ストーリー1: 承認者が承認待ち件数を一目で把握できる

**As a** 承認者 (contracts:approve 権限保持者)
**I want to** サイドバーの「承認管理」横に現在の承認待ち件数を表示して欲しい
**So that** 未処理の承認業務を一目で把握できる

**受け入れ条件:**
- サイドバーの「承認管理」リンク横に件数バッジが表示される
- 件数は自分が承認可能なもの (SoD 除外) を表示する
- 0 件のときはバッジが非表示
- 自分が申請した承認ワークフローはカウントに含まれない (職務分掌)
- 承認または却下を実行後、30 秒以内にバッジが更新される

### ストーリー2: 権限のないユーザーにはバッジが表示されない

**As a** `contracts:approve` 権限を持たないユーザー
**I want** 承認管理リンクもバッジも表示されないこと
**So that** 不要な UI ノイズがなくなる

**受け入れ条件:**
- `contracts:approve` 権限がないと「承認管理」リンク自体が非表示
- バッジも当然非表示

---

## 制約事項

### 技術的制約
1. **Phase 2 の既存 API を破壊しない**: `ListPendingApprovals` の挙動は変更不可
2. **監査記録**: カウント取得も既存の audit_log middleware で自動記録される
3. **認可**: `contracts:approve` 権限を要求 (既存と同じ)
4. **rate limit**: BFF ログイン rate limit (10/min/IP, burst 10) とぶつからないこと

### ビジネス制約
1. **J-SOX**: 既存の職務分掌ルールを継承
2. **後方互換性**: 既存 Phase 2 機能に影響を与えない

### 🎯 Agent Teams 検証制約 (本タスク固有)
1. **TeamCreate + team_name 必須**: Orchestrator は実装開始前に必ず `TeamCreate` を呼び、
   各 Agent を `team_name` 指定で spawn する
2. **SendMessage 自動配信の活用**: `git status` 覗き見でなく、子 Agent からのメッセージを
   会話ターンとして受け取る運用を実測する
3. **D1-D4 の判断は Orchestrator が事前決定しない**: 各 Agent が `SendMessage` で
   合意形成するプロセスを観察する
4. **合意に齟齬が出た場合の検出タイミング**: 実装完了前か、レビュー時か、E2E 失敗時か
   を記録する (振り返り資料として)

---

## 成功の定義

### 機能面
1. サイドバーにバッジが表示される
2. バッジの件数が正しく (SoD 除外した承認可能件数)
3. 承認・却下後に即時更新される
4. 0 件で非表示、権限なしで非表示
5. 全サービスの単体テストがパス
6. E2E テストがパス

### Agent Teams 検証面
1. `TeamCreate` → `Agent(team_name)` → `SendMessage` 自動配信の動作が想定通り
2. D1-D4 の判断が実装中に 3 Agent 間で合意形成される (理想)
   - 齟齬が発生した場合、**どのタイミングで検出されたか**を記録
3. Orchestrator は `git status` 覗き見せず、メッセージ自動配信のみで進捗把握できる
4. Phase 2 と比較して認識齟齬の数が減少したかを定性的に評価
5. 振り返り (`/retrospective`) で実測データをもとにハイブリッド型 vs フルメッシュ型を
   比較評価する

---

**作成日:** 2026-04-13
**作成者:** Claude Code
