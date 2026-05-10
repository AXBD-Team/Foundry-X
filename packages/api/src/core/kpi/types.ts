export const KPI_IDS = [
  "bureau_active_count",
  "critical_inconsistency_rate",
  "asset_reuse_rate",
  "diagnostic_time_reduction",
  "five_layer_e2e_success_rate",
  "hitl_avg_processing",
  "api_p95",
  "core_diff_blocking_rate",
] as const;

export type KpiId = (typeof KPI_IDS)[number];

export interface KpiResult {
  id: KpiId;
  label: string;
  value: number | null;
  unit: string;
  trend: "up" | "down" | "stable" | "unknown";
  threshold: number | null;
  description: string;
  dataSource: string;
}

export interface KpiListResponse {
  kpis: KpiResult[];
  computedAt: string;
}
