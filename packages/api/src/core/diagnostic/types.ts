// F602: 4대 진단 PoC types

export const DIAGNOSTIC_TYPES = ["missing", "duplicate", "overspec", "inconsistency"] as const;
export type DiagnosticType = (typeof DIAGNOSTIC_TYPES)[number];

export const SEVERITIES = ["info", "warning", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface DiagnosticFinding {
  id: string;
  runId: string;
  orgId: string;
  diagnosticType: DiagnosticType;
  severity: Severity;
  entityId: string | null;
  detail: Record<string, unknown>;
  createdAt: number;
}

export interface DiagnosticReport {
  runId: string;
  orgId: string;
  status: "running" | "completed" | "failed";
  summary: Record<DiagnosticType, number>;
  findings: DiagnosticFinding[];
  startedAt: number;
  completedAt: number | null;
}

export { DiagnosticEngine } from "./services/diagnostic-engine.service.js";
// NOTE: schemas/diagnostic.js 의 z.enum(DIAGNOSTIC_TYPES/SEVERITIES) 가 이 파일을 import 하므로
// 여기서 re-export 하면 순환 import → const=undefined 위험 (S336 entity 선례).
// schemas 심볼은 호출자가 "./schemas/diagnostic.js" 에서 직접 import.

// F619: Multi-Evidence E1/E2/E3 통합 알고리즘 types
export type { EvidenceLayer } from "../decode-bridge/types.js";

export const EVIDENCE_CONFIDENCE_THRESHOLD = 0.7 as const;
export type EvidenceScoreThreshold = typeof EVIDENCE_CONFIDENCE_THRESHOLD;

export interface E1CollectionResult {
  layer: "E1_COLLECTION";
  rawFindings: DiagnosticFinding[];
  byType: Record<DiagnosticType, DiagnosticFinding[]>;
  totalCount: number;
}

export interface ValidatedEvidence {
  finding: DiagnosticFinding;
  confidenceScore: number;
  passed: boolean;
}

export interface E2ValidationResult {
  layer: "E2_VALIDATION";
  confidenceThreshold: number;
  validatedItems: ValidatedEvidence[];
  passCount: number;
  filteredCount: number;
}

export interface E3IntegrationResult {
  layer: "E3_INTEGRATION";
  integrationScore: number;
  dominantType: DiagnosticType | null;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface MultiEvidenceResult {
  diagnosticSessionId: string;
  traceId: string;
  e1: E1CollectionResult;
  e2: E2ValidationResult;
  e3: E3IntegrationResult;
  processedAt: number;
}
