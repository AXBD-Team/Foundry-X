import { z } from "zod";

export const AgentLatencyItemSchema = z.object({
  agentId: z.string(),
  count: z.number(),
  avg: z.number().nullable(),
  p50: z.number().nullable(),
  p75: z.number().nullable(),
  p95: z.number().nullable(),
  p99: z.number().nullable(),
});

export const LatencyByAgentResponseSchema = z.object({
  agents: z.array(AgentLatencyItemSchema),
  computedAt: z.string(),
});

export const LatencyByAgentQuerySchema = z.object({
  orgId: z.string().optional(),
  since: z.string().optional(),
});

export type AgentLatencyItem = z.infer<typeof AgentLatencyItemSchema>;
export type LatencyByAgentResponse = z.infer<typeof LatencyByAgentResponseSchema>;
