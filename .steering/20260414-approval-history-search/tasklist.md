# 承認履歴検索画面 タスクリスト

## 実装方針

**真 Agent Teams (`TeamCreate` + `team_name` + `SendMessage` 自動配信) で 4 Agent
並行実装する。** Phase 3 と同じ正規運用パターンだが、本タスクは合意形成フェーズを
意図的に置かず、**仕様を明確に与えた通常タスク** として A1/A2 依存ハンドオフルールの
実運用検証を行う。

## Orchestrator 事前作業

### TeamCreate 必須
- [ ] `TeamCreate(team_name="approval-history-search", description="承認履歴検索画面 + Agent Teams 2回目運用検証")`
- [ ] `TaskCreate` でチーム共有 TaskList に各 Agent タスクを登録

### 横断的制約の収集 (Agent 起動プロンプトに埋め込む)
- [ ] BFF rate limit: `POST /api/v1/auth/login` のみ 10/min/IP burst 10、他は無制限 (Phase 3 で確認済み)
- [ ] audit_log middleware: 認証エンドポイント全てで INSERT。今回の `/history` は既存 approvals グループに含めるため audit 対象
- [ ] 既存 seed user: `test@example.com` (contract-manager)、`approver@example.com` (Phase 3 で docker exec 作成)、`viewer@example.com` (Phase 3 で作成)
- [ ] 構造化エラー規約: `google.rpc.ErrorInfo` + `Domain="contract.example.com"`
- [ ] Phase 2 既存 API: `ListPendingApprovals` / `ListWorkflowsByContract` / `CountPendingApprovals` はそのまま維持 (破壊的変更禁止)

### 前提タスクの完了確認 (Phase 2 + Phase 3)
- [ ] 各サブモジュールが main ブランチの最新状態にあることを確認
- [ ] Phase 3 のマージが完了していることを確認 (backend/bff/frontend すべて)
- [ ] 承認機能が統合 Docker Compose で動作することを確認

### contracts マスター更新 (Orchestrator 事前同期)
- [ ] `contracts/proto/approval.proto` に `ListApprovalHistory` RPC + request/response メッセージ追加
- [ ] `contracts/openapi/bff-api.yaml` に `GET /api/v1/approvals/history` エンドポイント追加 (クエリパラメータ + レスポンススキーマ)
- [ ] 親リポで commit + push

### featureブランチ作成 (3 サブモジュール + 親)
- [ ] backend: `feature/approval-history-search`
- [ ] bff: `feature/approval-history-search`
- [ ] frontend: `feature/approval-history-search`
- [ ] 親: `feature/approval-history-search`

### Agent 起動 (team_name 必須)
- [ ] `Agent(name="backend-agent", team_name="approval-history-search", ...)`
- [ ] `Agent(name="bff-agent", team_name="approval-history-search", ...)`
- [ ] `Agent(name="frontend-agent", team_name="approval-history-search", ...)`
- [ ] `Agent(name="e2e-agent", team_name="approval-history-search", ...)`
- [ ] `TaskUpdate(owner=...)` で各 Agent にタスク割り当て

### 🎯 A1/A2 依存ハンドオフの実行 (本タスクの検証フォーカス)

各 Agent の完了通知を受けたら、**即座に** 下流 Agent に wake-up DM を送る:

1. **backend-agent が `TaskUpdate(completed)` → bff-agent に wake-up DM**
   - 内容: "Backend 完了。proto はすでに親リポに push 済み。`cd ../..  && git pull` で
     同期 → proto 再生成 → handler 実装してください"
   - ラグ目標: 1 ターン以内

2. **bff-agent が `TaskUpdate(completed)` → frontend-agent に wake-up DM**
   - 内容: "BFF 完了。OpenAPI yaml は親リポに事前反映済み。`npm run generate:api-types`
     で型再生成 → フック実装 → バッジ UI 実装してください"
   - ラグ目標: 1 ターン以内

3. **frontend-agent が `TaskUpdate(completed)` → e2e-agent に wake-up DM**
   - 内容: "Frontend 完了。Docker Compose rebuild 後に E2E 実装してください"
   - Docker rebuild は Orchestrator が実施
   - ラグ目標: 2 ターン以内 (Docker rebuild 含む)

---

## Agent 別タスク分担

### Backend Agent

**担当範囲:** `services/backend/`

#### 並行実行可能な準備作業 (proto 確定待ちの間)
- [ ] `.steering/20260414-approval-history-search/` のドキュメント熟読
- [ ] 既存の `ListPendingApprovals` 実装パターンを参考にする
- [ ] sqlc クエリの設計スケッチ (空文字/null チェックパターン)

#### 実装フェーズ
- [ ] `make proto` で親リポの `contracts/proto/approval.proto` から再生成
- [ ] `db/queries/approval.sql` に `ListApprovalHistory` + `CountApprovalHistory` クエリ追加 (design.md の SQL そのまま)
- [ ] `sqlc generate` で再生成
- [ ] `internal/repository/approval_repository.go` に以下を追加:
  - `ListApprovalHistory(ctx, params) ([]model.ApprovalWorkflow, error)`
  - `CountApprovalHistory(ctx, params) (int64, error)`
- [ ] `ApprovalServiceInterface` に `ListApprovalHistory(ctx, ...) ([]model.ApprovalWorkflow, *Pagination, error)` 追加
- [ ] `internal/service/approval_service.go` に実装追加
  - UUID 検証 (`requester_id` / `approver_id` が空文字でない場合)
  - 日付文字列のパース (`requested_from` / `requested_to` が空文字でない場合、RFC3339)
  - limit のデフォルト値 (20) と最大値 (100) の強制
  - page のデフォルト値 (1) と正値チェック
- [ ] `internal/grpc/approval_server.go` に gRPC ハンドラ追加
- [ ] `mockApprovalRepo` (`internal/service/approval_service_test.go`) に新メソッド追加
- [ ] `mockApprovalService` (`internal/grpc/approval_server_test.go`) に新メソッド追加
- [ ] 単体テスト追加 (各フィルタの動作、pagination、不正 UUID エラー、日付パースエラー)
- [ ] `go vet` / `go fmt` / `go test ./...` クリーン

#### コミット・プッシュ + 完了マーク
- [ ] feature/approval-history-search にコミット・プッシュ
- [ ] `TaskUpdate(taskId="1", status="completed")`
- [ ] team-lead (Orchestrator) に完了 DM を送信

---

### BFF Agent

**担当範囲:** `services/bff/`

#### 並行実行可能な準備作業 (Backend proto 確定待ちの間)
- [ ] 既存の `ListPendingApprovals` ハンドラを参考にする
- [ ] クエリパラメータ解析パターンの設計 (validator + 空文字許容)
- [ ] テスト骨格の準備

#### 実装フェーズ (Orchestrator からの wake-up DM 受信後)
- [ ] `cd ../..  && git pull` で親リポ最新取得 (Backend の proto が push 済み)
- [ ] `cp ../../contracts/proto/approval.proto proto/approval.proto` で同期
- [ ] `protoc` で `internal/pb/approval.{pb,grpc.pb}.go` 再生成
- [ ] `internal/handler/approval_handler.go` に `GetApprovalHistory(c echo.Context) error` 追加
  - 認証チェック (`c.Get("user_id")` → `uuid.UUID`)
  - 権限チェック: `contracts:read`
  - クエリパラメータ解析:
    - `status` (enum 検証: `""`, `PENDING`, `APPROVED`, `REJECTED`)
    - `contract_number` (string、そのまま)
    - `requester_id` / `approver_id` (UUID 形式検証、空文字許容)
    - `requested_from` / `requested_to` (ISO8601 形式検証、空文字許容)
    - `page` (int、default 1、min 1)
    - `limit` (int、default 20、min 1、max 100)
  - Backend gRPC 呼び出し
  - レスポンス `{workflows, pagination}`
  - エラーは既存 `handleApprovalGRPCError` 流用
- [ ] `cmd/server/main.go` の既存 `approvals` グループに `GET /history` ルート追加
  - ⚠️ `approvalsPolling` ではなく `approvals` グループに追加 (AuditLog 対象)
- [ ] `internal/handler/approval_handler_test.go` にテスト追加:
  - 正常系 (各フィルタ)
  - 401 (認証なし)
  - 403 (`contracts:read` なし)
  - 400 (不正 status / 不正 UUID / 不正 ISO8601 / 不正 page/limit)
  - BFF 側 `ExcludeRequesterId` を自動セットしない (履歴閲覧は SoD 除外不要)
- [ ] mockApprovalServiceClient に `historyFunc` 追加
- [ ] `go vet` / `go fmt` / `go test ./...` クリーン

#### コミット・プッシュ + 完了マーク
- [ ] feature/approval-history-search にコミット・プッシュ
- [ ] `TaskUpdate(taskId="2", status="completed")`
- [ ] team-lead に完了 DM を送信

---

### Frontend Agent

**担当範囲:** `services/frontend/`

#### 並行実行可能な準備作業 (BFF OpenAPI 確定待ちの間)
- [ ] 既存の `ApprovalList.tsx` / `usePendingApprovals` のパターンを参考
- [ ] UI モック設計 (フィルタフォームのレイアウト、結果表示テーブル)
- [ ] Zod スキーマドラフト
- [ ] URL クエリパラメータ同期の戦略検討 (`useSearchParams` + `useRouter`)

#### 実装フェーズ (Orchestrator からの wake-up DM 受信後)
- [ ] `cd ../.. && git pull` で親リポ最新取得
- [ ] `npm run generate:api-types` で型再生成 (新規エンドポイント `/api/v1/approvals/history` の型が追加される)
- [ ] `src/lib/schemas/approval-history.ts` 新規作成 (Zod)
- [ ] `src/hooks/use-approval-history.ts` 新規作成
  - `queryKey: ['approval-history', filters]`
  - `keepPreviousData: true` でページネーション時のちらつき防止
- [ ] `src/components/approvals/ApprovalHistoryFilters.tsx` 新規作成
  - react-hook-form + Zod
  - URL クエリパラメータと同期 (`useSearchParams` + `router.replace`)
  - ステータス select / 契約番号 input / requester_id input / 日付範囲 picker (HTML5 `<input type="date">` で十分)
  - 「検索」ボタン + 「クリア」ボタン
- [ ] `src/components/approvals/ApprovalHistoryList.tsx` 新規作成
  - 既存 `ApprovalList.tsx` のパターンを踏襲
  - `ApprovalStatusBadge` 再利用
  - TableRow クリックで `/dashboard/approvals/[id]` 遷移
  - ページネーション UI (Prev / Next)
- [ ] `src/app/dashboard/approvals/history/page.tsx` 新規作成
- [ ] `src/components/dashboard/Sidebar.tsx` に「承認履歴」ナビ追加
  - `requiredPermission: 'contracts:read'`
  - Phase 3 で追加した「承認管理」バッジとは独立 (新規ナビ側にバッジは不要)
- [ ] `src/app/dashboard/approvals/page.tsx` に「履歴を見る」リンク追加
- [ ] テスト追加:
  - `tests/ApprovalHistoryFilters.test.tsx` (フィルタ送信、URL 同期)
  - `tests/ApprovalHistoryList.test.tsx` (結果表示、空状態、ページネーション)
  - `tests/Sidebar.test.tsx` 更新 (「承認履歴」ナビ表示テスト)
- [ ] `npm run lint` / `npm run type-check` / `npm test` クリーン

#### コミット・プッシュ + 完了マーク
- [ ] feature/approval-history-search にコミット・プッシュ
- [ ] `TaskUpdate(taskId="3", status="completed")`
- [ ] team-lead に完了 DM を送信

---

### E2E Agent

**担当範囲:** `e2e/tests/contracts/approval-history-search.spec.ts`

#### 並行実行可能な準備作業 (Frontend 完了待ちの間)
- [ ] 既存の `approval-count-badge.spec.ts` (Phase 3) のパターンを参考
- [ ] `storageState` 方式でログイン回数最小化 (Phase 3 の学び)
- [ ] `ensureViewerUser()` / `ensureApproverUser()` ヘルパーを再利用
- [ ] テストデータ準備の戦略 (既存 Phase 2 の approve/reject データを活用)

#### 実装フェーズ (Orchestrator からの wake-up DM 受信後)
- [ ] Docker Compose rebuild は Orchestrator が実施済みであることを確認
- [ ] `e2e/tests/contracts/approval-history-search.spec.ts` 新規作成 (4 シナリオ):
  1. **初期表示**: 履歴ページにアクセスして全件表示 (PENDING/APPROVED/REJECTED 混在を確認)
  2. **ステータスフィルタ**: APPROVED のみ / REJECTED のみを切り替えて結果が絞り込まれる
  3. **契約番号部分一致**: `C-00001` で検索 → 該当履歴のみ表示
  4. **権限あり (viewer) で閲覧可能**: `viewer@example.com` でログイン → サイドバーに「承認履歴」表示、ページアクセス可能、結果表示される
  5. **詳細画面遷移**: 結果行クリック → `/dashboard/approvals/[id]` に遷移

**シナリオ4 の補足:** 既存 seed で `contracts:read` は全ロール (system-admin / contract-manager /
sales / viewer) に付与されているため、「権限なし」ロールが存在しない。動的な seed 追加はスコープ外
なので、**E2E では「contracts:read あり (viewer) で閲覧可能」を検証するのみ** に留め、
権限拒否 (`contracts:read` なしで 403) は **BFF ハンドラの単体テスト側**でカバーする。
(`.steering/20260414-approval-history-search/steering-review.md` W2 参照)
- [ ] BFF login rate limit を考慮し、ログイン回数最小化 (合計 3 回以下)
- [ ] 新規テストは単独実行で全パス
- [ ] フルスイート `--workers=1` もデグレなし (既存 36 + 新規 5 = 41 を目標)

#### コミット・プッシュ + 完了マーク
- [ ] 親リポ feature/approval-history-search にコミット・プッシュ
- [ ] `TaskUpdate(taskId="4", status="completed")`
- [ ] team-lead に完了 DM を送信

---

## Agent 間の依存関係

```
Orchestrator
    ├──(事前)── contracts/proto + openapi 更新 → push
    ├──(spawn)── backend-agent ──────┐
    ├──(spawn)── bff-agent ──────────┤ 並行起動だが
    ├──(spawn)── frontend-agent ─────┤ 実装は依存順
    └──(spawn)── e2e-agent ──────────┘
                      │
         各 Agent 完了 → Orchestrator wake-up DM → 下流 Agent 起動
```

### Wake-up チェーン
```
Backend 完了 → Orchestrator → BFF wake-up
BFF 完了 → Orchestrator → Frontend wake-up
Frontend 完了 → Orchestrator (Docker rebuild) → E2E wake-up
```

---

## 完了条件

### Backend Agent
- [ ] `ListApprovalHistory` gRPC RPC 動作 (7 種類のフィルタ + pagination)
- [ ] 単体テスト全パス (最低 6 件: フィルタ各種 + pagination + エラー系)
- [ ] `go vet` / `go fmt` クリーン

### BFF Agent
- [ ] `GET /api/v1/approvals/history` REST エンドポイント動作
- [ ] クエリパラメータ検証完備
- [ ] `contracts:read` 権限チェック動作
- [ ] AuditLog 対象 (approvals グループに含める)
- [ ] 単体テスト全パス (最低 6 件)
- [ ] `go vet` / `go fmt` クリーン

### Frontend Agent
- [ ] `/dashboard/approvals/history` ページ表示
- [ ] 5 種類のフィルタ全部動作
- [ ] URL クエリパラメータ同期
- [ ] ページネーション動作
- [ ] 詳細画面への遷移リンク動作
- [ ] サイドバーナビ表示 (contracts:read 権限保持者)
- [ ] 承認管理画面からの「履歴を見る」リンク動作
- [ ] テスト全パス、lint / type-check クリーン

### E2E Agent
- [ ] 4〜5 シナリオ全パス
- [ ] フルスイートもデグレなし

### Orchestrator
- [ ] 統合 docker compose で動作確認
- [ ] **A1/A2 依存ハンドオフの実運用記録** を retrospective 用に収集:
  - 各 wake-up DM の送信時刻
  - 上流完了 → 下流起動までのラグ (秒)
  - Orchestrator 介入回数
  - 認識齟齬の発生有無 (目標: ゼロ)
- [ ] `shutdown_request` → 全 Agent shutdown_response → `TeamDelete` でクリーンアップ

---

## 振り返り観点 (本タスク固有)

実装完了後の `/retrospective` では以下を記録:

1. **A1/A2 依存ハンドオフの実効性**
   - Orchestrator の wake-up DM が時間通りに届いたか
   - Agent 停滞時間 (idle のまま動かなかった時間) の合計
   - Phase 3 との比較 (Phase 3 では Frontend が数ターン停止)
2. **並列実行の効率**
   - 依存関係のため実質的には直列になるが、準備作業の並行度は高いか
   - Backend 完了までに BFF/Frontend が何を進められたか
3. **仕様明確タスクでの認識齟齬**
   - Phase 3 は合意形成で齟齬ゼロだったが、本タスクは仕様明確
   - 仕様明確 → 齟齬ゼロ維持できるか、それとも別の種類の齟齬が出るか
4. **Phase 3 との比較**
   - 実装時間
   - Agent 間 DM 数
   - 新規テスト数
   - Critical/High 指摘数

---

**作成日:** 2026-04-14
**作成者:** Claude Code
