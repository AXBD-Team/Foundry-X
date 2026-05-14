// F660: TraceChain types — aligned with API AuditLog response
export interface TraceEvent {
  id: string;
  traceId: string | null;
  eventType: string;
  agentId: string | null;
  tenantId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  source?: "manual" | "live";
}

export interface TraceChainResult {
  traceId: string;
  events: TraceEvent[];
  chainValid: boolean;
}
