# 契約管理 Phase 2 - 承認ワークフロー 設計

## アーキテクチャ

### データフロー（承認申請フロー）

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as BFF (REST)
    participant G as Backend (gRPC)
    participant DB as Backend DB

    Note over F,DB: 金額変更時の承認申請フロー
    F->>B: PUT /api/v1/contracts/:id (monthly_fee変更)
    B->>B: 認証・認可 (contracts:update)
    B->>G: gRPC UpdateContract
    G->>G: 金額変更検出 + DRAFTステータスチェック
    G->>DB: INSERT approval_workflows (status=PENDING) + INSERT contract_changes (TX)
    G-->>B: FailedPrecondition + workflow_id
    B-->>F: 202 Accepted { workflow: {...}, message: "承認待ちです" }
```

### データフロー（承認実行フロー）

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as BFF (REST)
    participant G as Backend (gRPC)
    participant DB as Backend DB

    Note over F,DB: 承認実行フロー
    F->>B: POST /api/v1/approvals/:id/approve
    B->>B: 認証・認可 (contracts:approve)
    B->>G: gRPC ApproveContract (approver_id)
    G->>G: 職務分掌チェック (requester_id != approver_id)
    G->>DB: UPDATE contracts (new values) + UPDATE approval_workflows (status=APPROVED) + INSERT contract_changes (TX)
    G-->>B: ApprovalWorkflowResponse
    B-->>F: 200 { workflow: {...} }
```

### データフロー（却下フロー）

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as BFF (REST)
    participant G as Backend (gRPC)
    participant DB as Backend DB

    Note over F,DB: 却下フロー
    F->>B: POST /api/v1/approvals/:id/reject {reason}
    B->>B: 認証・認可 (contracts:approve)
    B->>G: gRPC RejectContract (approver_id, reason)
    G->>G: 職務分掌チェック
    G->>DB: UPDATE approval_workflows (status=REJECTED, rejection_reason) + INSERT contract_changes (TX)
    G-->>B: ApprovalWorkflowResponse
    B-->>F: 200 { workflow: {...} }
```

---

## Protocol Buffers定義

### `contracts/proto/approval.proto`（新規作成）

```protobuf
syntax = "proto3";

package approval;

import "common.proto";

option go_package = "github.com/ikechin/agent-teams-backend/internal/pb";

service ApprovalService {
  rpc ListPendingApprovals(ListPendingApprovalsRequest) returns (ListPendingApprovalsResponse);
  rpc GetApprovalWorkflow(GetApprovalWorkflowRequest) returns (ApprovalWorkflowResponse);
  rpc ApproveContract(ApproveContractRequest) returns (ApprovalWorkflowResponse);
  rpc RejectContract(RejectContractRequest) returns (ApprovalWorkflowResponse);
}

message ApprovalWorkflowItem {
  string workflow_id = 1;
  string contract_id = 2;
  string contract_number = 3;    // JOIN結果
  string merchant_name = 4;       // JOIN結果
  string service_name = 5;        // JOIN結果
  string requester_id = 6;
  string approver_id = 7;         // 承認/却下時のみ
  string status = 8;              // PENDING, APPROVED, REJECTED
  string old_monthly_fee = 9;
  string new_monthly_fee = 10;
  string old_initial_fee = 11;
  string new_initial_fee = 12;
  string requested_at = 13;
  string approved_at = 14;
  string rejection_reason = 15;
}

message ListPendingApprovalsRequest {
  int32 page = 1;
  int32 limit = 2;
  string exclude_requester_id = 3; // 申請者自身を除外（職務分掌）
}

message ListPendingApprovalsResponse {
  repeated ApprovalWorkflowItem workflows = 1;
  common.Pagination pagination = 2;
}

message GetApprovalWorkflowRequest {
  string workflow_id = 1;
}

message ApproveContractRequest {
  string workflow_id = 1;
  string approver_id = 2;
}

message RejectContractRequest {
  string workflow_id = 1;
  string approver_id = 2;
  string rejection_reason = 3;
}

message ApprovalWorkflowResponse {
  ApprovalWorkflowItem workflow = 1;
}
```

### `contracts/proto/contract.proto`（修正）

`UpdateContractRequest` のレスポンスは従来通りだが、金額変更時はgRPCエラー `FailedPrecondition` を返し、エラーメッセージに `workflow_id` を含める。

---

## Backend変更

### DBマイグレーション

#### V8__create_approval_workflows.sql
```sql
CREATE TABLE approval_workflows (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(contract_id),
    requester_id UUID NOT NULL,
    approver_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    old_monthly_fee DECIMAL(10, 2),
    new_monthly_fee DECIMAL(10, 2),
    old_initial_fee DECIMAL(10, 2),
    new_initial_fee DECIMAL(10, 2),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    CONSTRAINT chk_approval_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT chk_approval_segregation CHECK (approver_id IS NULL OR approver_id != requester_id)
);

CREATE INDEX idx_approval_workflows_contract_id ON approval_workflows(contract_id);
CREATE INDEX idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX idx_approval_workflows_requester_id ON approval_workflows(requester_id);
CREATE INDEX idx_approval_workflows_requested_at ON approval_workflows(requested_at DESC);

-- 二重申請禁止: 同一契約で PENDING 状態のワークフローは1件のみ
CREATE UNIQUE INDEX idx_approval_workflows_pending_contract 
ON approval_workflows(contract_id) 
WHERE status = 'PENDING';
```

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `db/migrations/V8__create_approval_workflows.sql` | approval_workflowsテーブル作成 |
| `db/queries/approval.sql` | ListPendingApprovals, GetApprovalWorkflow, CreateWorkflow, ApproveWorkflow, RejectWorkflow, GetPendingByContract クエリ |
| `internal/sqlc/approval.sql.go` | sqlc再生成 |
| `internal/model/approval.go` | ApprovalWorkflowドメインモデル + ValidStatusTransitions |
| `internal/pb/approval.pb.go` | protoc再生成 |
| `internal/pb/approval_grpc.pb.go` | protoc再生成 |
| `internal/repository/approval_repository.go` | ApprovalRepository（WithTx対応） |
| `internal/service/approval_service.go` | 承認ビジネスロジック |
| `internal/service/contract_service.go` | UpdateContract修正: 金額変更検出時にワークフロー作成 |
| `internal/grpc/approval_server.go` | ApprovalService gRPCハンドラー |
| `cmd/server/main.go` | ApprovalService登録 |
| テスト | approval_service_test.go, approval_server_test.go, contract_service_test.go（修正） |

### ContractService.UpdateContract の修正ロジック

```go
func (s *ContractService) UpdateContract(ctx context.Context, req *pb.UpdateContractRequest) (*model.Contract, error) {
    current, err := s.repo.GetContract(ctx, req.ContractId)
    if err != nil {
        return nil, ErrNotFound
    }

    // 既存のPENDINGワークフローチェック（二重申請禁止）
    existing, _ := s.approvalRepo.GetPendingByContract(ctx, req.ContractId)
    if existing != nil {
        return nil, status.Error(codes.FailedPrecondition, "既に承認待ちの変更があります")
    }

    // DRAFTステータスは承認不要
    if current.Status == "DRAFT" {
        return s.directUpdate(ctx, req, current)
    }

    // 金額変更検出
    amountChanged := req.MonthlyFee != current.MonthlyFee || req.InitialFee != current.InitialFee
    
    if amountChanged {
        // 承認ワークフロー作成
        workflow := &model.ApprovalWorkflow{
            ContractID:     req.ContractId,
            RequesterID:    req.UpdatedBy,
            Status:         "PENDING",
            OldMonthlyFee:  current.MonthlyFee,
            NewMonthlyFee:  req.MonthlyFee,
            OldInitialFee:  current.InitialFee,
            NewInitialFee:  req.InitialFee,
        }
        
        err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
            if err := s.approvalRepo.WithTx(tx).Create(ctx, workflow); err != nil {
                return err
            }
            return s.changeRepo.WithTx(tx).Create(ctx, &model.ContractChange{
                ResourceType: "approval_workflow",
                ResourceID:   workflow.WorkflowID,
                ChangeType:   "CREATE",
                ChangedBy:    req.UpdatedBy,
            })
        })
        
        if err != nil {
            return nil, err
        }
        
        return nil, status.Errorf(codes.FailedPrecondition, 
            "金額変更には承認が必要です (workflow_id=%s)", workflow.WorkflowID)
    }

    // 金額変更なし: 即座に更新（既存ロジック）
    return s.directUpdate(ctx, req, current)
}
```

### 職務分掌チェック（ApprovalService）

```go
func (s *ApprovalService) ApproveContract(ctx context.Context, req *pb.ApproveContractRequest) (*model.ApprovalWorkflow, error) {
    workflow, err := s.repo.GetByID(ctx, req.WorkflowId)
    if err != nil {
        return nil, ErrNotFound
    }

    // 職務分掌チェック
    if workflow.RequesterID == req.ApproverId {
        return nil, status.Error(codes.PermissionDenied, "申請者自身は承認できません")
    }

    if workflow.Status != "PENDING" {
        return nil, status.Errorf(codes.FailedPrecondition, "このワークフローは既に処理済みです (status=%s)", workflow.Status)
    }

    // 承認実行: 契約更新 + ワークフロー更新 + 監査記録（トランザクション）
    err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
        // 契約更新
        if err := s.contractRepo.WithTx(tx).UpdateFees(ctx, workflow.ContractID, workflow.NewMonthlyFee, workflow.NewInitialFee); err != nil {
            return err
        }
        // ワークフロー承認
        workflow.Status = "APPROVED"
        workflow.ApproverID = &req.ApproverId
        now := time.Now()
        workflow.ApprovedAt = &now
        if err := s.repo.WithTx(tx).Approve(ctx, workflow); err != nil {
            return err
        }
        // 監査記録
        return s.changeRepo.WithTx(tx).Create(ctx, &model.ContractChange{
            ResourceType: "approval_workflow",
            ResourceID:   workflow.WorkflowID,
            ChangeType:   "APPROVE",
            FieldName:    "status",
            OldValue:     "PENDING",
            NewValue:     "APPROVED",
            ChangedBy:    req.ApproverId,
        })
    })

    return workflow, err
}
```

---

## BFF変更

### 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `internal/pb/approval.pb.go` | protoc再生成 |
| `internal/pb/approval_grpc.pb.go` | protoc再生成 |
| `internal/grpc/client.go` | ApprovalServiceClient追加 |
| `internal/handler/approval_handler.go` | ListPendingApprovals, GetApprovalWorkflow, ApproveContract, RejectContract ハンドラー |
| `internal/handler/contract_handler.go` | UpdateContract修正: FailedPrecondition時のレスポンス処理（202 Accepted） |
| `cmd/server/main.go` | 承認ルート追加 |
| `db/migrations/V13__seed_approval_permissions.sql` | contracts:approve権限の割り当て確認（既存なら不要） |
| テスト | approval_handler_test.go |

### contracts:approve 権限の割り当て

既存のV8マイグレーションで `contracts:approve` 権限は定義済み。ロール割り当ては既存のV9で `system-admin` と `contract-manager` の両方に付与されている可能性が高いが、確認が必要。

**注意:** contract-manager は申請者になることが多いので、承認者には `contract-approver` という専用ロールを新設する設計も考えられるが、Phase 2ではexisting ロールを活用する方針とする。

### UpdateContractハンドラーの修正

```go
func (h *ContractHandler) UpdateContract(c echo.Context) error {
    // ... gRPC呼び出し ...
    
    resp, err := h.grpcClient.Contract.UpdateContract(ctx, req)
    if err != nil {
        st, ok := status.FromError(err)
        if ok && st.Code() == codes.FailedPrecondition {
            // 承認ワークフロー作成（または二重申請エラー）
            if strings.Contains(st.Message(), "承認が必要") {
                return c.JSON(http.StatusAccepted, map[string]interface{}{
                    "message": "承認待ちです",
                    "detail":  st.Message(),
                })
            }
            return c.JSON(http.StatusConflict, map[string]string{
                "error": st.Message(),
            })
        }
        return handleGRPCError(c, err, "contract")
    }
    
    return c.JSON(http.StatusOK, map[string]interface{}{"contract": contractToMap(resp.Contract)})
}
```

---

## Frontend変更

### 新規ファイル

#### 承認管理

| ファイル | 説明 |
|---------|------|
| `src/app/dashboard/approvals/page.tsx` | 承認待ち一覧ページ |
| `src/app/dashboard/approvals/[id]/page.tsx` | 承認詳細ページ |
| `src/components/approvals/ApprovalList.tsx` | 承認待ち一覧コンポーネント |
| `src/components/approvals/ApprovalDetail.tsx` | 承認詳細（old vs new比較表示） |
| `src/components/approvals/ApproveConfirmDialog.tsx` | 承認確認ダイアログ |
| `src/components/approvals/RejectDialog.tsx` | 却下ダイアログ（理由入力付き） |
| `src/components/approvals/ApprovalStatusBadge.tsx` | 承認ステータスバッジ（PENDING/APPROVED/REJECTED） |
| `src/hooks/use-pending-approvals.ts` | 承認待ち一覧取得フック |
| `src/hooks/use-approval.ts` | 承認詳細取得フック |
| `src/hooks/use-approve-contract.ts` | 承認実行フック |
| `src/hooks/use-reject-contract.ts` | 却下実行フック |
| `src/lib/schemas/approval.ts` | Zodバリデーション（却下理由） |

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/dashboard/Sidebar.tsx` | 「承認管理」ナビ追加（contracts:approve 権限持ちのみ表示） |
| `src/components/contracts/ContractEditForm.tsx` | 金額変更検出 → ボタン文言を「承認申請する」に変更 |
| `src/components/contracts/ContractDetail.tsx` | 承認状態バッジ追加（承認待ち中の場合） |
| `src/hooks/use-update-contract.ts` | 202 Acceptedレスポンスのハンドリング |
| `src/types/api.ts` | OpenAPI型再生成 |

### 承認詳細画面のUI設計

```
┌─────────────────────────────────────────────┐
│ 承認: C-00001                    [PENDING]  │
├─────────────────────────────────────────────┤
│ 加盟店: テスト加盟店1                        │
│ サービス: 決済サービス                        │
│ 申請者: 山田太郎                              │
│ 申請日時: 2026-04-12 10:30                   │
├─────────────────────────────────────────────┤
│ 変更内容                                     │
│                                              │
│         変更前          変更後                │
│ 月額:   ¥50,000   →    ¥60,000              │
│ 初期費: ¥100,000  →    ¥120,000             │
├─────────────────────────────────────────────┤
│ [却下] [承認]                                │
└─────────────────────────────────────────────┘
```

---

## OpenAPI仕様追加

`contracts/openapi/bff-api.yaml` に以下を追加：

### 承認管理
- `GET /api/v1/approvals` - 承認待ち一覧
- `GET /api/v1/approvals/{id}` - 承認詳細
- `POST /api/v1/approvals/{id}/approve` - 承認実行
- `POST /api/v1/approvals/{id}/reject` - 却下実行

### 新規スキーマ
- `ApprovalWorkflow`: workflow_id, contract_id, contract_number, merchant_name, service_name, requester_id, approver_id, status, old_monthly_fee, new_monthly_fee, old_initial_fee, new_initial_fee, requested_at, approved_at, rejection_reason

### 変更
- `PUT /api/v1/contracts/{id}` のレスポンスに `202 Accepted` を追加（承認待ち時）

---

## glossary.md への追加

```markdown
## 承認ワークフロー関連

| 日本語 | 英語 | コード上の命名 | 定義 |
|-------|------|-------------|------|
| 承認ワークフロー | Approval Workflow | ApprovalWorkflow, approval_workflow | 契約金額変更時に承認を経るプロセス |
| 申請者 | Requester | requester, requester_id | 契約変更を申請したユーザー |
| 承認者 | Approver | approver, approver_id | 変更内容を承認/却下するユーザー |
| 承認待ち | Pending | PENDING | 承認ワークフローが開始され結果待ちの状態 |
| 承認済み | Approved | APPROVED | 承認ワークフローが承認された状態 |
| 却下 | Rejected | REJECTED | 承認ワークフローが却下された状態 |
| 職務分掌 | Segregation of Duties | - | 申請者と承認者を分離する原則（J-SOX要件） |
| 却下理由 | Rejection Reason | rejection_reason | 却下時に必須で入力する理由 |
```

---

**作成日:** 2026-04-12
**作成者:** Claude Code
