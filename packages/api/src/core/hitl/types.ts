export type HitlSource =
  | "meta-approval"
  | "expert-review"
  | "artifact-review";

export type HitlStatus = "pending" | "in_review" | "escalated" | "resolved";

export type HitlAction = "approve" | "reject" | "escalate";

export type HitlRole = "Admin" | "Reviewer" | "Approver" | "Operator" | "Auditor";

export interface HitlQueueItem {
  id: string;
  title: string;
  source: HitlSource;
  status: HitlStatus;
  escalated: boolean;
  confidence: number | null;
  orgId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface HitlDecisionInput {
  itemId: string;
  source: HitlSource;
  action: HitlAction;
  reason?: string;
}

export interface HitlQueueResponse {
  items: HitlQueueItem[];
  total: number;
  escalatedCount: number;
  collectedAt: string;
}

export interface HitlMetrics {
  pending: number;
  escalated: number;
  approvedToday: number;
  avgConfidence: number | null;
}

export const HITL_CONFIDENCE_THRESHOLD = 0.7;

// RBAC: 역할별 허용 액션
export const ROLE_ALLOWED_ACTIONS: Record<HitlRole, HitlAction[]> = {
  Admin: ["approve", "reject", "escalate"],
  Reviewer: ["approve", "reject", "escalate"],
  Approver: ["approve", "reject"],
  Operator: [],
  Auditor: [],
};
