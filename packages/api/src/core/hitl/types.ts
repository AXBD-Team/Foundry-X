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

// F663: 80-20-80 HITL 5-state 머신 — HitlStatus 4-state와 병존 (별 모델)
export const HITL_STATES = [
  "AI_GENERATED",      // 1: AI 80% 자동 생성 직후
  "REVIEW_QUEUED",     // 2: 20% 식별 + 검수 큐 등록
  "HUMAN_REVIEWED",    // 3: 사람 집중 검수 완료
  "AI_REVISED",        // 4: AI 80% 최종 재생성
  "FINAL_APPROVED",    // 5: 사람 최종 체크 입력
] as const;

export type HitlState = (typeof HITL_STATES)[number];

// 유효 전환 map (state machine guards) — 선형 단방향 체인
export const VALID_TRANSITIONS: Record<HitlState, HitlState[]> = {
  AI_GENERATED: ["REVIEW_QUEUED"],
  REVIEW_QUEUED: ["HUMAN_REVIEWED"],
  HUMAN_REVIEWED: ["AI_REVISED"],
  AI_REVISED: ["FINAL_APPROVED"],
  FINAL_APPROVED: [],
};

// transition별 허용 역할 (RBAC matrix)
export const TRANSITION_ALLOWED_ROLES: Record<string, HitlRole[]> = {
  "AI_GENERATED->REVIEW_QUEUED": ["Admin", "Reviewer", "Operator"],
  "REVIEW_QUEUED->HUMAN_REVIEWED": ["Admin", "Reviewer", "Approver"],
  "HUMAN_REVIEWED->AI_REVISED": ["Admin", "Reviewer"],  // Operator 불허 — 검수 완료 후 AI 재생성 트리거는 Reviewer 이상
  "AI_REVISED->FINAL_APPROVED": ["Admin", "Approver"],
};

export interface HitlTransitionInput {
  queueItemId: string;
  fromState: HitlState;
  toState: HitlState;
  role: HitlRole;
  reviewerId?: string;
}

export interface HitlTransitionResult {
  id: string;
  graphSessionId?: string;
  cqEvaluationId?: string;
  orgId: string;
  state: HitlState;
  reviewerId?: string;
  auditTraceId: string;
  transitionedAt: number;
}
