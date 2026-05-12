// F619: Decode-X stub adapter contract types
import { z } from "zod";

export const EVIDENCE_LAYERS = ["E1_COLLECTION", "E2_VALIDATION", "E3_INTEGRATION"] as const;
export type EvidenceLayer = (typeof EVIDENCE_LAYERS)[number];

export const AnalysisCompletedEventSchema = z.object({
  eventId: z.string(),
  eventType: z.literal("analysis.completed"),
  documentId: z.string(),
  orgId: z.string(),
  analysisType: z.enum(["missing", "duplicate", "overspec", "inconsistency"]),
  findings: z.array(
    z.object({
      entityId: z.string().nullable(),
      severity: z.enum(["info", "warning", "critical"]),
      detail: z.record(z.unknown()),
    }),
  ),
  traceId: z.string().optional(),
  timestamp: z.number(),
});

export type AnalysisCompletedEvent = z.infer<typeof AnalysisCompletedEventSchema>;

export interface DecodeXAdapter {
  publishAnalysisCompleted(event: AnalysisCompletedEvent): Promise<void>;
  getEventQueue(): AnalysisCompletedEvent[];
  clearEventQueue(): void;
}
