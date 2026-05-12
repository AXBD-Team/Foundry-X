// F619: Multi-Evidence E1/E2/E3 통합 알고리즘 — TDD Red Phase
import { describe, it, expect } from "vitest";
import {
  collectEvidence,
  validateEvidence,
  integrateEvidence,
  processMultiEvidence,
} from "../services/multi-evidence.service.js";
import type { DiagnosticFinding } from "../types.js";
import { EVIDENCE_CONFIDENCE_THRESHOLD } from "../types.js";

function makeFindings(overrides: Partial<DiagnosticFinding>[] = []): DiagnosticFinding[] {
  const base: DiagnosticFinding[] = [
    { id: "f-1", runId: "run-1", orgId: "org-1", diagnosticType: "missing", severity: "critical", entityId: "e-1", detail: {}, createdAt: 1000 },
    { id: "f-2", runId: "run-1", orgId: "org-1", diagnosticType: "duplicate", severity: "warning", entityId: null, detail: {}, createdAt: 1001 },
    { id: "f-3", runId: "run-1", orgId: "org-1", diagnosticType: "overspec", severity: "info", entityId: "e-3", detail: {}, createdAt: 1002 },
    { id: "f-4", runId: "run-1", orgId: "org-1", diagnosticType: "inconsistency", severity: "warning", entityId: null, detail: {}, createdAt: 1003 },
  ];
  return overrides.length ? base.map((b, i) => ({ ...b, ...(overrides[i] ?? {}) })) : base;
}

describe("F619: Multi-Evidence E1 — collectEvidence", () => {
  it("T1: 4 진단 결과 → byType 분류 정확", () => {
    const findings = makeFindings();
    const e1 = collectEvidence(findings);

    expect(e1.layer).toBe("E1_COLLECTION");
    expect(e1.totalCount).toBe(4);
    expect(e1.byType.missing).toHaveLength(1);
    expect(e1.byType.duplicate).toHaveLength(1);
    expect(e1.byType.overspec).toHaveLength(1);
    expect(e1.byType.inconsistency).toHaveLength(1);
  });

  it("T1b: 빈 findings → totalCount=0, byType 모두 빈 배열", () => {
    const e1 = collectEvidence([]);
    expect(e1.totalCount).toBe(0);
    expect(e1.byType.missing).toHaveLength(0);
  });
});

describe("F619: Multi-Evidence E2 — validateEvidence", () => {
  it("T2: severity=info(0.5) 필터됨, critical(1.0) + warning(0.8) PASS", () => {
    const findings = makeFindings();
    const e1 = collectEvidence(findings);
    const e2 = validateEvidence(e1);

    expect(e2.layer).toBe("E2_VALIDATION");
    expect(e2.confidenceThreshold).toBe(EVIDENCE_CONFIDENCE_THRESHOLD);
    // critical(1.0) + warning(0.8) + warning(0.8) = 3 pass, info(0.5) = 1 filtered
    expect(e2.passCount).toBe(3);
    expect(e2.filteredCount).toBe(1);
  });

  it("T2b: 모두 critical → filteredCount=0", () => {
    const findings = [
      { id: "f-1", runId: "r", orgId: "o", diagnosticType: "missing" as const, severity: "critical" as const, entityId: null, detail: {}, createdAt: 0 },
    ];
    const e1 = collectEvidence(findings);
    const e2 = validateEvidence(e1);
    expect(e2.filteredCount).toBe(0);
    expect(e2.passCount).toBe(1);
  });
});

describe("F619: Multi-Evidence E3 — integrateEvidence", () => {
  it("T3: integration score = passed items 평균 confidence", () => {
    const findings = makeFindings();
    const e1 = collectEvidence(findings);
    const e2 = validateEvidence(e1);
    const e3 = integrateEvidence(e2);

    expect(e3.layer).toBe("E3_INTEGRATION");
    // Passed: critical(1.0) + warning(0.8) + warning(0.8) → avg = 0.8667
    expect(e3.integrationScore).toBeCloseTo(0.867, 2);
    expect(e3.riskLevel).toBe("high");
    expect(e3.dominantType).toBeDefined();
  });

  it("T3b: passed items 없음 → score=0, riskLevel=low", () => {
    const findings = [
      { id: "f-1", runId: "r", orgId: "o", diagnosticType: "missing" as const, severity: "info" as const, entityId: null, detail: {}, createdAt: 0 },
    ];
    const e1 = collectEvidence(findings);
    const e2 = validateEvidence(e1);
    const e3 = integrateEvidence(e2);
    expect(e3.integrationScore).toBe(0);
    expect(e3.riskLevel).toBe("low");
    expect(e3.dominantType).toBeNull();
  });
});

describe("F619: Multi-Evidence Full Pipeline — processMultiEvidence", () => {
  it("T4: 4 진단 결과 → MultiEvidenceResult 전체 구조 + diagnosticSessionId 생성", () => {
    const findings = makeFindings();
    const traceId = "abcd1234".repeat(4);
    const result = processMultiEvidence(findings, traceId);

    expect(result.diagnosticSessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID
    expect(result.traceId).toBe(traceId);
    expect(result.processedAt).toBeGreaterThan(0);
    expect(result.e1.layer).toBe("E1_COLLECTION");
    expect(result.e2.layer).toBe("E2_VALIDATION");
    expect(result.e3.layer).toBe("E3_INTEGRATION");
  });

  it("T4b: 빈 findings → integration score=0, riskLevel=low", () => {
    const result = processMultiEvidence([], "trace-empty");
    expect(result.e1.totalCount).toBe(0);
    expect(result.e3.integrationScore).toBe(0);
    expect(result.e3.riskLevel).toBe("low");
  });
});
