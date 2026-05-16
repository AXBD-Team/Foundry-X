// F663: HITL 5-state 머신 통합 테스트 — T1~T6
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HitlStateMachine } from "../services/hitl-state-machine.service.js";
import type { HitlState } from "../types.js";

// ─── Mock helpers ────────────────────────────────────────────────────────────

type AuditEmit = (event: string, payload: unknown, ctx: { traceId: string; spanId: string; sampled: boolean }) => Promise<void>;

function makeAuditBus() {
  const emit = vi.fn<AuditEmit>().mockResolvedValue(undefined);
  return { emit };
}

interface DbRow {
  id: string;
  graph_session_id: string | null;
  cq_evaluation_id: string | null;
  org_id: string;
  state: string;
  audit_trace_id: string;
}

function makeDb(firstRow: DbRow | null = null) {
  const rows: DbRow[] = [];
  let storedRow: DbRow | null = firstRow;

  const stmt = {
    bind: (..._args: unknown[]) => stmt,
    run: vi.fn().mockImplementation(() => {
      // capture INSERT for createInitial
      return Promise.resolve({ meta: { rows_written: 1 } });
    }),
    first: vi.fn().mockImplementation(() => Promise.resolve(storedRow)),
  };

  return {
    prepare: vi.fn().mockReturnValue(stmt),
    _stmt: stmt,
    _setFirstRow: (row: DbRow | null) => { storedRow = row; rows.push(row as DbRow); },
  } as unknown as D1Database & { _stmt: typeof stmt; _setFirstRow: (r: DbRow | null) => void };
}

// ─── T1: createInitial → AI_GENERATED INSERT + audit emit ───────────────────

describe("T1: createInitial", () => {
  it("inserts AI_GENERATED row and emits hitl.state.created", async () => {
    const db = makeDb();
    const auditBus = makeAuditBus();
    const sm = new HitlStateMachine(db as unknown as D1Database, auditBus);

    const result = await sm.createInitial("org-1", "gs-001", "cq-001");

    expect(result.state).toBe("AI_GENERATED");
    expect(result.orgId).toBe("org-1");
    expect(result.graphSessionId).toBe("gs-001");
    expect(result.cqEvaluationId).toBe("cq-001");
    expect(result.auditTraceId).toMatch(/^[0-9a-f]{32}$/);
    expect(auditBus.emit).toHaveBeenCalledOnce();
    expect(auditBus.emit.mock.calls[0]?.[0]).toBe("hitl.state.created");
  });
});

// ─── T2: AI_GENERATED → REVIEW_QUEUED 정상 (Reviewer role) ─────────────────

describe("T2: valid transition AI_GENERATED → REVIEW_QUEUED", () => {
  it("updates state and emits hitl.state.review_queued", async () => {
    const itemId = "item-001";
    const traceId = "a".repeat(32);
    const db = makeDb({
      id: itemId,
      graph_session_id: "gs-001",
      cq_evaluation_id: null,
      org_id: "org-1",
      state: "AI_GENERATED",
      audit_trace_id: traceId,
    });
    const auditBus = makeAuditBus();
    const sm = new HitlStateMachine(db as unknown as D1Database, auditBus);

    const result = await sm.transition({
      queueItemId: itemId,
      fromState: "AI_GENERATED",
      toState: "REVIEW_QUEUED",
      role: "Reviewer",
      reviewerId: "user-1",
    });

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.state).toBe("REVIEW_QUEUED");
      expect(result.auditTraceId).toBe(traceId);
    }
    expect(auditBus.emit).toHaveBeenCalledOnce();
    expect(auditBus.emit.mock.calls[0]?.[0]).toBe("hitl.state.review_queued");
  });
});

// ─── T3: invalid transition (AI_GENERATED → FINAL_APPROVED) → error ─────────

describe("T3: invalid transition", () => {
  it("returns error for AI_GENERATED → FINAL_APPROVED (skips states)", async () => {
    const db = makeDb(null);
    const auditBus = makeAuditBus();
    const sm = new HitlStateMachine(db as unknown as D1Database, auditBus);

    const result = await sm.transition({
      queueItemId: "item-001",
      fromState: "AI_GENERATED" as HitlState,
      toState: "FINAL_APPROVED" as HitlState,
      role: "Admin",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Invalid transition");
    }
    expect(auditBus.emit).not.toHaveBeenCalled();
  });
});

// ─── T4: RBAC denied (Operator for HUMAN_REVIEWED → AI_REVISED) ─────────────

describe("T4: RBAC denied", () => {
  it("returns error when Operator tries HUMAN_REVIEWED → AI_REVISED", async () => {
    // State machine guard passes (valid transition), but RBAC blocks Operator
    const itemId = "item-002";
    const traceId = "b".repeat(32);
    const db = makeDb({
      id: itemId,
      graph_session_id: null,
      cq_evaluation_id: null,
      org_id: "org-1",
      state: "HUMAN_REVIEWED",
      audit_trace_id: traceId,
    });
    const auditBus = makeAuditBus();
    const sm = new HitlStateMachine(db as unknown as D1Database, auditBus);

    const result = await sm.transition({
      queueItemId: itemId,
      fromState: "HUMAN_REVIEWED",
      toState: "AI_REVISED",
      role: "Operator",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("not allowed");
    }
    expect(auditBus.emit).not.toHaveBeenCalled();
  });
});

// ─── T5: state mismatch → error ─────────────────────────────────────────────

describe("T5: state mismatch", () => {
  it("returns error when db state differs from fromState", async () => {
    const itemId = "item-003";
    const db = makeDb({
      id: itemId,
      graph_session_id: null,
      cq_evaluation_id: null,
      org_id: "org-1",
      state: "REVIEW_QUEUED", // db has REVIEW_QUEUED
      audit_trace_id: "c".repeat(32),
    });
    const auditBus = makeAuditBus();
    const sm = new HitlStateMachine(db as unknown as D1Database, auditBus);

    const result = await sm.transition({
      queueItemId: itemId,
      fromState: "AI_GENERATED", // caller claims AI_GENERATED
      toState: "REVIEW_QUEUED",
      role: "Reviewer",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("State mismatch");
    }
    expect(auditBus.emit).not.toHaveBeenCalled();
  });
});

// ─── T6: full lifecycle 5 transitions + audit trace_id chain ─────────────────

describe("T6: full lifecycle", () => {
  it("chains all 5 transitions and emits correct events with same traceId", async () => {
    const traceId = "d".repeat(32);
    const itemId = "item-full";
    const orgId = "org-full";

    // Shared state tracking across transitions
    let currentState: HitlState = "AI_GENERATED";
    const emitCalls: string[] = [];

    const fakeStmt = {
      bind: (..._args: unknown[]) => fakeStmt,
      run: vi.fn().mockResolvedValue({ meta: { rows_written: 1 } }),
      first: vi.fn().mockImplementation(() =>
        Promise.resolve({
          id: itemId,
          graph_session_id: "gs-full",
          cq_evaluation_id: "cq-full",
          org_id: orgId,
          state: currentState,
          audit_trace_id: traceId,
        }),
      ),
    };

    const fakeDb = {
      prepare: vi.fn().mockReturnValue(fakeStmt),
    } as unknown as D1Database;

    const fakeAuditBus = {
      emit: vi.fn().mockImplementation(async (eventType: string) => {
        emitCalls.push(eventType);
      }),
    };

    const sm = new HitlStateMachine(fakeDb, fakeAuditBus);

    // createInitial (uses INSERT path — state from result)
    const created = await sm.createInitial(orgId, "gs-full", "cq-full");
    expect(created.state).toBe("AI_GENERATED");
    currentState = "AI_GENERATED";

    // Transition 1: AI_GENERATED → REVIEW_QUEUED (Reviewer)
    currentState = "AI_GENERATED";
    const r1 = await sm.transition({ queueItemId: itemId, fromState: "AI_GENERATED", toState: "REVIEW_QUEUED", role: "Reviewer" });
    expect("error" in r1).toBe(false);
    currentState = "REVIEW_QUEUED";

    // Transition 2: REVIEW_QUEUED → HUMAN_REVIEWED (Approver)
    const r2 = await sm.transition({ queueItemId: itemId, fromState: "REVIEW_QUEUED", toState: "HUMAN_REVIEWED", role: "Approver" });
    expect("error" in r2).toBe(false);
    currentState = "HUMAN_REVIEWED";

    // Transition 3: HUMAN_REVIEWED → AI_REVISED (Reviewer)
    const r3 = await sm.transition({ queueItemId: itemId, fromState: "HUMAN_REVIEWED", toState: "AI_REVISED", role: "Reviewer" });
    expect("error" in r3).toBe(false);
    currentState = "AI_REVISED";

    // Transition 4: AI_REVISED → FINAL_APPROVED (Approver)
    const r4 = await sm.transition({ queueItemId: itemId, fromState: "AI_REVISED", toState: "FINAL_APPROVED", role: "Approver" });
    expect("error" in r4).toBe(false);
    if (!("error" in r4)) {
      expect(r4.state).toBe("FINAL_APPROVED");
      expect(r4.auditTraceId).toBe(traceId); // trace_id 전파 검증
    }

    // Audit chain 검증: createInitial(1) + 4 transitions = 5 emit calls
    expect(emitCalls).toHaveLength(5);
    expect(emitCalls[0]).toBe("hitl.state.created");
    expect(emitCalls[1]).toBe("hitl.state.review_queued");
    expect(emitCalls[2]).toBe("hitl.state.human_reviewed");
    expect(emitCalls[3]).toBe("hitl.state.ai_revised");
    expect(emitCalls[4]).toBe("hitl.state.final_approved");

    // trace_id가 모든 transition에서 동일 값 전파
    const emitCtxCalls = (fakeAuditBus.emit as ReturnType<typeof vi.fn>).mock.calls;
    for (let i = 1; i < emitCtxCalls.length; i++) {
      expect(emitCtxCalls[i]?.[2]?.traceId).toBe(traceId);
    }
  });
});
