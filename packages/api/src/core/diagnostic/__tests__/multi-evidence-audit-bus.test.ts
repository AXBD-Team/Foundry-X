// F619: Multi-Evidence + F606 audit-bus trace_id 전파 검증
import { describe, it, expect } from "vitest";
import { processMultiEvidence } from "../services/multi-evidence.service.js";
import type { DiagnosticFinding } from "../types.js";

describe("F619+F606: trace_id chain 보존", () => {
  it("T1: traceId가 MultiEvidenceResult에 그대로 전파됨", () => {
    const traceId = "0af7651916cd43dd8448eb211c80319c"; // W3C 32-hex
    const findings: DiagnosticFinding[] = [
      { id: "f-1", runId: "run-1", orgId: "org-1", diagnosticType: "missing", severity: "critical", entityId: "e-1", detail: {}, createdAt: 1000 },
    ];

    const result = processMultiEvidence(findings, traceId);

    expect(result.traceId).toBe(traceId);
    // diagnosticSessionId는 새로 생성 (UUID v4)
    expect(result.diagnosticSessionId).not.toBe(traceId);
    expect(result.diagnosticSessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("T2: 동일 traceId로 두 번 processMultiEvidence → diagnosticSessionId는 다름 (각 세션 독립)", () => {
    const traceId = "1234567890abcdef1234567890abcdef";
    const findings: DiagnosticFinding[] = [
      { id: "f-1", runId: "run-1", orgId: "org-1", diagnosticType: "duplicate", severity: "warning", entityId: null, detail: {}, createdAt: 1000 },
    ];

    const r1 = processMultiEvidence(findings, traceId);
    const r2 = processMultiEvidence(findings, traceId);

    expect(r1.traceId).toBe(traceId);
    expect(r2.traceId).toBe(traceId);
    expect(r1.diagnosticSessionId).not.toBe(r2.diagnosticSessionId);
  });
});
