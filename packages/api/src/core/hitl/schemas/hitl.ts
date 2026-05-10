import { z } from "zod";

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
