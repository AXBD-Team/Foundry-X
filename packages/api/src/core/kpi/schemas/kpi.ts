import { z } from "zod";
import { KPI_IDS } from "../types.js";

export const KpiIdSchema = z.enum(KPI_IDS);

export const KpiResultSchema = z.object({
  id: KpiIdSchema,
  label: z.string(),
  value: z.number().nullable(),
  unit: z.string(),
  trend: z.enum(["up", "down", "stable", "unknown"]),
  threshold: z.number().nullable(),
  description: z.string(),
  dataSource: z.string(),
});

export const KpiListResponseSchema = z.object({
  kpis: z.array(KpiResultSchema),
  computedAt: z.string(),
});

export const KpiQuerySchema = z.object({
  orgId: z.string().optional(),
  since: z.string().optional(),
});
