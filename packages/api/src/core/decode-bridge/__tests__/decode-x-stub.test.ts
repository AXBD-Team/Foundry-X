// F619: Decode-X Stub Adapter — TDD Red Phase
import { describe, it, expect, beforeEach } from "vitest";
import { DecodeXStubAdapter } from "../services/decode-x-stub.adapter.js";
import type { AnalysisCompletedEvent } from "../types.js";

function makeEvent(overrides: Partial<AnalysisCompletedEvent> = {}): AnalysisCompletedEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType: "analysis.completed",
    documentId: "doc-1",
    orgId: "org-1",
    analysisType: "missing",
    findings: [{ entityId: "e-1", severity: "warning", detail: { reason: "test" } }],
    traceId: "trace-123",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("F619: DecodeXStubAdapter", () => {
  let adapter: DecodeXStubAdapter;

  beforeEach(() => {
    adapter = new DecodeXStubAdapter();
  });

  it("T1: publishAnalysisCompleted → getEventQueue에 event 추가됨", async () => {
    const event = makeEvent();
    await adapter.publishAnalysisCompleted(event);

    const queue = adapter.getEventQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.eventId).toBe(event.eventId);
    expect(queue[0]?.analysisType).toBe("missing");
  });

  it("T1b: 여러 event → 순서 보존", async () => {
    const ev1 = makeEvent({ analysisType: "missing" });
    const ev2 = makeEvent({ analysisType: "duplicate" });
    const ev3 = makeEvent({ analysisType: "overspec" });

    await adapter.publishAnalysisCompleted(ev1);
    await adapter.publishAnalysisCompleted(ev2);
    await adapter.publishAnalysisCompleted(ev3);

    const queue = adapter.getEventQueue();
    expect(queue).toHaveLength(3);
    expect(queue[0]?.analysisType).toBe("missing");
    expect(queue[1]?.analysisType).toBe("duplicate");
    expect(queue[2]?.analysisType).toBe("overspec");
  });

  it("T2: clearEventQueue → 빈 배열", async () => {
    await adapter.publishAnalysisCompleted(makeEvent());
    expect(adapter.getEventQueue()).toHaveLength(1);

    adapter.clearEventQueue();
    expect(adapter.getEventQueue()).toHaveLength(0);
  });

  it("T3: parseEventSafe — 유효한 event → success:true", () => {
    const event = makeEvent();
    const result = DecodeXStubAdapter.parseEventSafe(event);
    expect(result.success).toBe(true);
  });

  it("T3b: parseEventSafe — 누락 필드 → success:false", () => {
    const invalid = { eventType: "analysis.completed" }; // missing required fields
    const result = DecodeXStubAdapter.parseEventSafe(invalid);
    expect(result.success).toBe(false);
  });

  it("T4: getLastEvent — 마지막 publish된 event 반환", async () => {
    await adapter.publishAnalysisCompleted(makeEvent({ documentId: "doc-A" }));
    await adapter.publishAnalysisCompleted(makeEvent({ documentId: "doc-B" }));

    const last = adapter.getLastEvent();
    expect(last?.documentId).toBe("doc-B");
  });

  it("T4b: 빈 queue → getLastEvent = undefined", () => {
    expect(adapter.getLastEvent()).toBeUndefined();
  });
});
