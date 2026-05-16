import { z } from "zod";
import { HITL_STATES } from "../types.js";

export const HitlSourceSchema = z.enum([
  "meta-approval",
  "expert-review",
  "artifact-review",
]);

export const HitlActionSchema = z.enum(["approve", "reject", "escalate"]);

export const HitlDecisionSchema = z.object({
  itemId: z.string().min(1),
  source: HitlSourceSchema,
  action: HitlActionSchema,
  reason: z.string().optional(),
});

export const HitlQueueQuerySchema = z.object({
  orgId: z.string().optional(),
  escalatedOnly: z.coerce.boolean().optional(),
});

export type HitlDecisionInput = z.infer<typeof HitlDecisionSchema>;

// F663: 5-state 머신 transition endpoint 스키마
export const HitlTransitionSchema = z.object({
  queueItemId: z.string().uuid(),
  fromState: z.enum(HITL_STATES),
  toState: z.enum(HITL_STATES),
  role: z.enum(["Admin", "Reviewer", "Approver", "Operator", "Auditor"]),
  reviewerId: z.string().optional(),
});

export type HitlTransitionRequest = z.infer<typeof HitlTransitionSchema>;
