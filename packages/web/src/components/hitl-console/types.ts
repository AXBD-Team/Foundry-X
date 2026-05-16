export type HitlSource = "meta-approval" | "expert-review" | "artifact-review";

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

// F664: 80-20-80 HITL 5-state 머신 (HitlStatus 4-state와 별 모델 병존)
export const HITL_STATES = [
  "AI_GENERATED",
  "REVIEW_QUEUED",
  "HUMAN_REVIEWED",
  "AI_REVISED",
  "FINAL_APPROVED",
] as const;

export type HitlState = (typeof HITL_STATES)[number];

// 유효 전환 map — 선형 단방향 체인
export const VALID_TRANSITIONS: Record<HitlState, HitlState[]> = {
  AI_GENERATED: ["REVIEW_QUEUED"],
  REVIEW_QUEUED: ["HUMAN_REVIEWED"],
  HUMAN_REVIEWED: ["AI_REVISED"],
  AI_REVISED: ["FINAL_APPROVED"],
  FINAL_APPROVED: [],
};

// RBAC matrix (API core/hitl/types.ts와 동일 계약)
export const TRANSITION_ALLOWED_ROLES: Record<string, HitlRole[]> = {
  "AI_GENERATED->REVIEW_QUEUED": ["Admin", "Reviewer", "Operator"],
  "REVIEW_QUEUED->HUMAN_REVIEWED": ["Admin", "Reviewer", "Approver"],
  "HUMAN_REVIEWED->AI_REVISED": ["Admin", "Reviewer"],
  "AI_REVISED->FINAL_APPROVED": ["Admin", "Approver"],
};

export interface HitlQueueItem5State {
  id: string;
  orgId: string;
  graphSessionId?: string;
  cqEvaluationId?: string;
  state: HitlState;
  reviewerId?: string;
  payload?: string;
  auditTraceId: string;
  transitionedAt: number;
}

export interface HitlTransitionInput {
  queueItemId: string;
  fromState: HitlState;
  toState: HitlState;
  role: HitlRole;
  reviewerId?: string;
}
