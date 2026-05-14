import type { KpiId, KpiResult } from "../types.js";

// F604: 8 KPI 산정 메서드 — D1 쿼리 기반
export class KpiCalculatorService {
  constructor(private readonly db: D1Database) {}

  async calculateBureauActiveCount(orgId?: string): Promise<KpiResult> {
    const where = orgId ? "WHERE org_id = ?" : "";
    const bindings = orgId ? [orgId] : [];
    const row = await this.db
      .prepare(`SELECT COUNT(DISTINCT org_id) AS cnt FROM graph_sessions WHERE status = 'running' ${where}`)
      .bind(...bindings)
      .first<{ cnt: number }>();
    return {
      id: "bureau_active_count",
      label: "본부 동시 운영 수",
      value: row?.cnt ?? 0,
      unit: "개",
      trend: "stable",
      threshold: 4,
      description: "현재 graph_sessions 테이블에서 status=running인 고유 org 수",
      dataSource: "graph_sessions (0135)",
    };
  }

  async calculateCriticalInconsistencyRate(orgId?: string): Promise<KpiResult> {
    const where = orgId ? "WHERE org_id = ?" : "";
    const bindings = orgId ? [orgId] : [];
    const row = await this.db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
         FROM feedback_queue ${where}`,
      )
      .bind(...bindings)
      .first<{ total: number; failed: number }>();
    const total = row?.total ?? 0;
    const failed = row?.failed ?? 0;
    const rate = total > 0 ? Math.round((failed / total) * 1000) / 10 : null;
    return {
      id: "critical_inconsistency_rate",
      label: "Critical inconsistency 비율",
      value: rate,
      unit: "%",
      trend: rate !== null && rate < 10 ? "down" : "stable",
      threshold: 10,
      description: "feedback_queue 중 status=failed 비율 (낮을수록 좋음)",
      dataSource: "feedback_queue (0094)",
    };
  }

  async calculateAssetReuseRate(): Promise<KpiResult> {
    const row = await this.db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN output_tokens > 0 AND cache_read_tokens > 0 THEN 1 ELSE 0 END) AS reused
         FROM agent_run_metrics`,
      )
      .first<{ total: number; reused: number }>();
    const total = row?.total ?? 0;
    const reused = row?.reused ?? 0;
    const rate = total > 0 ? Math.round((reused / total) * 1000) / 10 : null;
    return {
      id: "asset_reuse_rate",
      label: "자산 재사용률",
      value: rate,
      unit: "%",
      trend: rate !== null && rate > 30 ? "up" : "stable",
      threshold: 30,
      description: "cache_read_tokens > 0인 agent run 비율",
      dataSource: "agent_run_metrics (0132)",
    };
  }

  async calculateDiagnosticTimeReduction(): Promise<KpiResult> {
    const row = await this.db
      .prepare(
        `SELECT AVG(
          CASE
            WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
            THEN (julianday(completed_at) - julianday(started_at)) * 86400
            ELSE NULL
          END
        ) AS avg_secs
         FROM graph_sessions
         WHERE status = 'completed'`,
      )
      .first<{ avg_secs: number | null }>();
    const avgSecs = row?.avg_secs ?? null;
    const minutes = avgSecs !== null ? Math.round(avgSecs / 60) : null;
    return {
      id: "diagnostic_time_reduction",
      label: "진단 시간 단축",
      value: minutes,
      unit: "분",
      trend: minutes !== null && minutes < 30 ? "down" : "stable",
      threshold: 30,
      description: "완료된 graph_sessions의 평균 소요 시간(분)",
      dataSource: "graph_sessions (0135)",
    };
  }

  async calculate5LayerE2ESuccessRate(): Promise<KpiResult> {
    const row = await this.db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS success
         FROM graph_sessions`,
      )
      .first<{ total: number; success: number }>();
    const total = row?.total ?? 0;
    const success = row?.success ?? 0;
    const rate = total > 0 ? Math.round((success / total) * 1000) / 10 : null;
    return {
      id: "five_layer_e2e_success_rate",
      label: "5-Layer E2E 성공률",
      value: rate,
      unit: "%",
      trend: rate !== null && rate >= 90 ? "up" : "stable",
      threshold: 90,
      description: "graph_sessions에서 status=completed 비율",
      dataSource: "graph_sessions (0135)",
    };
  }

  async calculateHitlAvgProcessing(): Promise<KpiResult> {
    const row = await this.db
      .prepare(
        `SELECT AVG(
          CASE
            WHEN codex_verdict IS NOT NULL AND claude_verdict IS NOT NULL
            THEN 1
            ELSE 0
          END
        ) AS review_rate
         FROM dual_ai_reviews`,
      )
      .first<{ review_rate: number | null }>();
    const rate = row?.review_rate !== null ? Math.round((row?.review_rate ?? 0) * 1000) / 10 : null;
    return {
      id: "hitl_avg_processing",
      label: "HITL 평균 처리율",
      value: rate,
      unit: "%",
      trend: "stable",
      threshold: 80,
      description: "dual_ai_reviews 중 양방향 verdict 완료 비율",
      dataSource: "dual_ai_reviews (0138)",
    };
  }

  async calculateApiP95(): Promise<KpiResult> {
    const row = await this.db
      .prepare(
        `SELECT duration_ms
         FROM agent_run_metrics
         WHERE duration_ms IS NOT NULL AND status = 'completed'
         ORDER BY duration_ms ASC`,
      )
      .all<{ duration_ms: number }>();
    const durations = row.results.map((r) => r.duration_ms).sort((a, b) => a - b);
    let p95: number | null = null;
    if (durations.length > 0) {
      const idx = Math.ceil(durations.length * 0.95) - 1;
      p95 = durations[Math.min(idx, durations.length - 1)] ?? null;
    }
    return {
      id: "api_p95",
      label: "API p95 응답시간",
      value: p95,
      unit: "ms",
      trend: p95 !== null && p95 < 40000 ? "down" : "stable",
      threshold: 40000,
      description: "agent_run_metrics duration_ms의 95번째 백분위수 (LLM 9-stage workflow 기준, threshold 40s)",
      dataSource: "agent_run_metrics (0132)",
    };
  }

  async calculateApiP99(): Promise<KpiResult> {
    const row = await this.db
      .prepare(
        `SELECT duration_ms
         FROM agent_run_metrics
         WHERE duration_ms IS NOT NULL AND status = 'completed'
         ORDER BY duration_ms ASC`,
      )
      .all<{ duration_ms: number }>();
    const durations = row.results.map((r) => r.duration_ms).sort((a, b) => a - b);
    let p99: number | null = null;
    if (durations.length > 0) {
      const idx = Math.ceil(durations.length * 0.99) - 1;
      p99 = durations[Math.min(idx, durations.length - 1)] ?? null;
    }
    return {
      id: "api_p99",
      label: "API p99 응답시간",
      value: p99,
      unit: "ms",
      trend: p99 !== null && p99 < 41000 ? "down" : "stable",
      threshold: 41000,
      description: "agent_run_metrics duration_ms의 99번째 백분위수 (LLM 9-stage workflow 기준, threshold 41s)",
      dataSource: "agent_run_metrics (0132)",
    };
  }

  async calculateCoreDiffBlockingRate(): Promise<KpiResult> {
    const row = await this.db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN codex_verdict = 'BLOCK' THEN 1 ELSE 0 END) AS blocked
         FROM dual_ai_reviews`,
      )
      .first<{ total: number; blocked: number }>();
    const total = row?.total ?? 0;
    const blocked = row?.blocked ?? 0;
    const rate = total > 0 ? Math.round((blocked / total) * 1000) / 10 : null;
    return {
      id: "core_diff_blocking_rate",
      label: "core_diff default-deny 차단율",
      value: rate,
      unit: "%",
      trend: rate !== null && rate < 5 ? "down" : "stable",
      threshold: 5,
      description: "dual_ai_reviews에서 codex_verdict=BLOCK 비율",
      dataSource: "dual_ai_reviews (0138)",
    };
  }

  async computeAll(orgId?: string): Promise<KpiResult[]> {
    const results = await Promise.allSettled([
      this.calculateBureauActiveCount(orgId),
      this.calculateCriticalInconsistencyRate(orgId),
      this.calculateAssetReuseRate(),
      this.calculateDiagnosticTimeReduction(),
      this.calculate5LayerE2ESuccessRate(),
      this.calculateHitlAvgProcessing(),
      this.calculateApiP95(),
      this.calculateApiP99(),
      this.calculateCoreDiffBlockingRate(),
    ]);
    return results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      const ids: KpiId[] = [
        "bureau_active_count",
        "critical_inconsistency_rate",
        "asset_reuse_rate",
        "diagnostic_time_reduction",
        "five_layer_e2e_success_rate",
        "hitl_avg_processing",
        "api_p95",
        "api_p99",
        "core_diff_blocking_rate",
      ];
      return {
        id: ids[i] as KpiId,
        label: ids[i] as string,
        value: null,
        unit: "",
        trend: "unknown" as const,
        threshold: null,
        description: "계산 오류",
        dataSource: "",
      };
    });
  }
}
