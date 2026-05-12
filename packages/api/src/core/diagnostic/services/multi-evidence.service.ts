// F619: Multi-Evidence E1/E2/E3 통합 알고리즘 — pure functions, no external dependencies
import type {
  DiagnosticFinding,
  DiagnosticType,
  E1CollectionResult,
  E2ValidationResult,
  E3IntegrationResult,
  MultiEvidenceResult,
  ValidatedEvidence,
} from "../types.js";
import { EVIDENCE_CONFIDENCE_THRESHOLD } from "../types.js";

const SEVERITY_CONFIDENCE: Record<DiagnosticFinding["severity"], number> = {
  critical: 1.0,
  warning: 0.8,
  info: 0.5,
};

const RISK_LEVELS: Array<[number, E3IntegrationResult["riskLevel"]]> = [
  [0.9, "critical"],
  [0.7, "high"],
  [0.4, "medium"],
  [0.0, "low"],
];

function toRiskLevel(score: number): E3IntegrationResult["riskLevel"] {
  for (const [threshold, level] of RISK_LEVELS) {
    if (score >= threshold) return level;
  }
  return "low";
}

export function collectEvidence(findings: DiagnosticFinding[]): E1CollectionResult {
  const byType: Record<DiagnosticType, DiagnosticFinding[]> = {
    missing: [],
    duplicate: [],
    overspec: [],
    inconsistency: [],
  };
  for (const f of findings) {
    byType[f.diagnosticType].push(f);
  }
  return { layer: "E1_COLLECTION", rawFindings: findings, byType, totalCount: findings.length };
}

export function validateEvidence(
  e1: E1CollectionResult,
  threshold: number = EVIDENCE_CONFIDENCE_THRESHOLD,
): E2ValidationResult {
  const validatedItems: ValidatedEvidence[] = e1.rawFindings.map((finding) => {
    const confidenceScore = SEVERITY_CONFIDENCE[finding.severity] ?? 0;
    return { finding, confidenceScore, passed: confidenceScore >= threshold };
  });
  const passCount = validatedItems.filter((v) => v.passed).length;
  return {
    layer: "E2_VALIDATION",
    confidenceThreshold: threshold,
    validatedItems,
    passCount,
    filteredCount: validatedItems.length - passCount,
  };
}

export function integrateEvidence(e2: E2ValidationResult): E3IntegrationResult {
  const passed = e2.validatedItems.filter((v) => v.passed);

  if (passed.length === 0) {
    return { layer: "E3_INTEGRATION", integrationScore: 0, dominantType: null, riskLevel: "low" };
  }

  const integrationScore =
    passed.reduce((sum, v) => sum + v.confidenceScore, 0) / passed.length;

  const typeCounts: Record<DiagnosticType, number> = {
    missing: 0,
    duplicate: 0,
    overspec: 0,
    inconsistency: 0,
  };
  for (const v of passed) {
    typeCounts[v.finding.diagnosticType]++;
  }

  let dominantType: DiagnosticType | null = null;
  let maxCount = 0;
  for (const [type, count] of Object.entries(typeCounts) as [DiagnosticType, number][]) {
    if (count > maxCount) {
      maxCount = count;
      dominantType = type;
    }
  }

  return {
    layer: "E3_INTEGRATION",
    integrationScore,
    dominantType,
    riskLevel: toRiskLevel(integrationScore),
  };
}

export function processMultiEvidence(
  findings: DiagnosticFinding[],
  traceId: string,
  threshold: number = EVIDENCE_CONFIDENCE_THRESHOLD,
): MultiEvidenceResult {
  const e1 = collectEvidence(findings);
  const e2 = validateEvidence(e1, threshold);
  const e3 = integrateEvidence(e2);
  return {
    diagnosticSessionId: crypto.randomUUID(),
    traceId,
    e1,
    e2,
    e3,
    processedAt: Date.now(),
  };
}
