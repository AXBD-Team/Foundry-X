// F662: graph_session 종결 CQ hook + failure_reason 자동 분류 integration test
import { describe, it, expect, vi } from "vitest";
import { CQEvaluator } from "./services/cq-evaluator.service.js";

interface BindCapture {
  args: unknown[];
}

function makeD1MockCapturing(questionRow: unknown = null) {
  const binds: BindCapture[] = [];
  return {
    _binds: () => binds,
    prepare: vi.fn().mockImplementation(() => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        binds.push({ args });
        return {
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(questionRow),
          all: vi.fn().mockResolvedValue({ results: [] }),
        };
      }),
    })),
  };
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

function makeLLMMockParseable(rawScore: number) {
  const axes = ["ontology_usage", "tool_selection", "code_quality", "result_match", "governance"];
  const body = Object.fromEntries(axes.map((k) => [k, { rawScore, reasoning: "ok" }]));
  return {
    generate: vi.fn().mockResolvedValue({ content: JSON.stringify(body), model: "test", tokensUsed: 0 }),
  };
}

function makeLLMMockUnparseable() {
  return {
    generate: vi.fn().mockResolvedValue({ content: "NOT_JSON", model: "test", tokensUsed: 0 }),
  };
}

describe("F662 CQEvaluator — graph_session hook + failure_reason", () => {
  const orgId = "org-f662";
  const questionId = "auto-cq-graph-session-1";
  const graphSessionId = "graph-session-1";
  const llmCtx = { sessionId: graphSessionId, response: '{"result":"ok"}' };

  it("T4: graphSessionId 제공 → cq_evaluations INSERT에 graph_session_id 포함", async () => {
    const db = makeD1MockCapturing();
    const bus = makeAuditBusMock();
    const llm = makeLLMMockParseable(95);
    const evaluator = new CQEvaluator(db as unknown as D1Database, llm as any, bus as any);

    const result = await evaluator.evaluate({ orgId, questionId, llmCallContext: llmCtx, graphSessionId });

    expect(result.graphSessionId).toBe(graphSessionId);
    expect(result.failureReason).toBeUndefined();

    // INSERT bind 캡처 확인: SELECT + INSERT 순으로 2회 prepare
    const insertBind = db._binds().find((b) => b.args.includes(graphSessionId));
    expect(insertBind).toBeDefined();
  });

  it("T5: 파싱 성공 + totalScore<90 → failureReason='human_error'", async () => {
    const db = makeD1MockCapturing();
    const bus = makeAuditBusMock();
    const llm = makeLLMMockParseable(60);
    const evaluator = new CQEvaluator(db as unknown as D1Database, llm as any, bus as any);

    const result = await evaluator.evaluate({ orgId, questionId, llmCallContext: llmCtx, graphSessionId });

    expect(result.handoffDecision).toBe("human_review");
    expect(result.totalScore).toBeLessThan(90);
    expect(result.failureReason).toBe("human_error");

    // audit-bus emit payload에 failureReason 포함 확인
    const emitCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls;
    const evalCall = emitCalls.find((c: unknown[]) => c[0] === "cq.evaluated");
    expect(evalCall?.[1]).toMatchObject({ failureReason: "human_error", graphSessionId });
  });

  it("T6: LLM 응답 파싱 실패 → failureReason='infra_issue'", async () => {
    const db = makeD1MockCapturing();
    const bus = makeAuditBusMock();
    const llm = makeLLMMockUnparseable();
    const evaluator = new CQEvaluator(db as unknown as D1Database, llm as any, bus as any);

    const result = await evaluator.evaluate({ orgId, questionId, llmCallContext: llmCtx, graphSessionId });

    expect(result.handoffDecision).toBe("human_review");
    expect(result.failureReason).toBe("infra_issue");
  });

  it("T7: graphSessionId 미제공 → failureReason/graphSessionId undefined (F632 baseline 회귀 0)", async () => {
    const db = makeD1MockCapturing();
    const bus = makeAuditBusMock();
    const llm = makeLLMMockParseable(95);
    const evaluator = new CQEvaluator(db as unknown as D1Database, llm as any, bus as any);

    const result = await evaluator.evaluate({ orgId, questionId: "q-1", llmCallContext: { sessionId: "s-1", response: "ok" } });

    expect(result.handoffDecision).toBe("handoff");
    expect(result.graphSessionId).toBeUndefined();
    expect(result.failureReason).toBeUndefined();
  });
});
