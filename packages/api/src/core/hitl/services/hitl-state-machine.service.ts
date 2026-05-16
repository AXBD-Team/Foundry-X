// F663: HITL 80-20-80 5-state 머신 서비스 — AI_GENERATED→REVIEW_QUEUED→HUMAN_REVIEWED→AI_REVISED→FINAL_APPROVED
import type { AuditBus } from "../../infra/types.js";
import { generateTraceId, generateSpanId } from "../../infra/types.js";
import {
  VALID_TRANSITIONS,
  TRANSITION_ALLOWED_ROLES,
  type HitlState,
  type HitlRole,
  type HitlTransitionInput,
  type HitlTransitionResult,
} from "../types.js";

interface HitlQueueRow {
  id: string;
  graph_session_id: string | null;
  cq_evaluation_id: string | null;
  org_id: string;
  state: string;
  audit_trace_id: string;
}

export class HitlStateMachine {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async createInitial(
    orgId: string,
    graphSessionId?: string,
    cqEvaluationId?: string,
    payload?: string,
  ): Promise<HitlTransitionResult> {
    const id = crypto.randomUUID();
    const traceId = generateTraceId();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO hitl_queue (id, graph_session_id, cq_evaluation_id, org_id, state, payload, audit_trace_id, transitioned_at)
         VALUES (?, ?, ?, ?, 'AI_GENERATED', ?, ?, ?)`,
      )
      .bind(id, graphSessionId ?? null, cqEvaluationId ?? null, orgId, payload ?? null, traceId, now)
      .run();

    const ctx = { traceId, spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit(
      "hitl.state.created",
      { id, orgId, state: "AI_GENERATED", graphSessionId, cqEvaluationId },
      ctx,
    );

    return {
      id,
      graphSessionId,
      cqEvaluationId,
      orgId,
      state: "AI_GENERATED",
      auditTraceId: traceId,
      transitionedAt: now,
    };
  }

  async transition(
    input: HitlTransitionInput,
  ): Promise<HitlTransitionResult | { error: string }> {
    const { queueItemId, fromState, toState, role, reviewerId } = input;

    // 1. State machine guard
    const validTargets = VALID_TRANSITIONS[fromState] ?? [];
    if (!validTargets.includes(toState)) {
      return { error: `Invalid transition: ${fromState} → ${toState}` };
    }

    // 2. RBAC check
    const transitionKey = `${fromState}->${toState}`;
    const allowedRoles = TRANSITION_ALLOWED_ROLES[transitionKey] ?? [];
    if (!(allowedRoles as HitlRole[]).includes(role)) {
      return { error: `Role '${role}' not allowed for transition '${transitionKey}'` };
    }

    // 3. Fetch current item + state verification
    const row = await this.db
      .prepare(
        `SELECT id, graph_session_id, cq_evaluation_id, org_id, state, audit_trace_id
         FROM hitl_queue WHERE id = ?`,
      )
      .bind(queueItemId)
      .first<HitlQueueRow>();

    if (!row) return { error: "Queue item not found" };
    if (row.state !== fromState) {
      return { error: `State mismatch: db=${row.state}, expected=${fromState}` };
    }

    // 4. UPDATE state + reviewer_id + transitioned_at
    const now = Date.now();
    await this.db
      .prepare(
        `UPDATE hitl_queue SET state = ?, reviewer_id = ?, transitioned_at = ? WHERE id = ?`,
      )
      .bind(toState, reviewerId ?? null, now, queueItemId)
      .run();

    // 5. Audit-bus emit (기존 trace_id 전파)
    const ctx = { traceId: row.audit_trace_id, spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit(
      `hitl.state.${toState.toLowerCase()}`,
      { id: queueItemId, orgId: row.org_id, fromState, toState, role, reviewerId },
      ctx,
    );

    return {
      id: queueItemId,
      graphSessionId: row.graph_session_id ?? undefined,
      cqEvaluationId: row.cq_evaluation_id ?? undefined,
      orgId: row.org_id,
      state: toState,
      reviewerId,
      auditTraceId: row.audit_trace_id,
      transitionedAt: now,
    };
  }
}
