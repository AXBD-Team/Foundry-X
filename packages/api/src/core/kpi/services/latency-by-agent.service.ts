import type { LatencyByAgentResponse, AgentLatencyItem } from "../schemas/latency-by-agent.js";

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.min(idx, sorted.length - 1)] ?? null;
}

export class LatencyByAgentService {
  constructor(private readonly db: D1Database) {}

  async calculateByAgent(since?: string): Promise<LatencyByAgentResponse> {
    // eslint-disable-next-line foundry-x-api/no-cross-domain-d1
    let sql = `
      SELECT agent_id, duration_ms
      FROM agent_run_metrics
      WHERE duration_ms IS NOT NULL AND status = 'completed'
    `;
    const bindings: string[] = [];
    if (since) {
      sql += ` AND started_at >= ?`;
      bindings.push(since);
    }
    sql += ` ORDER BY agent_id ASC, duration_ms ASC`;

    const stmt = this.db.prepare(sql);
    const rows = bindings.length > 0
      ? await stmt.bind(...bindings).all<{ agent_id: string; duration_ms: number }>()
      : await stmt.all<{ agent_id: string; duration_ms: number }>();

    // Group by agent_id
    const groups = new Map<string, number[]>();
    for (const row of rows.results) {
      const list = groups.get(row.agent_id) ?? [];
      list.push(row.duration_ms);
      groups.set(row.agent_id, list);
    }

    const agents: AgentLatencyItem[] = [];
    for (const [agentId, durations] of groups.entries()) {
      const sorted = [...durations].sort((a, b) => a - b);
      const avg = sorted.length > 0
        ? Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length)
        : null;
      agents.push({
        agentId,
        count: sorted.length,
        avg,
        p50: percentile(sorted, 0.5),
        p75: percentile(sorted, 0.75),
        p95: percentile(sorted, 0.95),
        p99: percentile(sorted, 0.99),
      });
    }

    return { agents, computedAt: new Date().toISOString() };
  }
}
