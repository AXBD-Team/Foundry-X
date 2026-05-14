// F661 (d): agent별 latency 분포 대시보드 — agent_id 기준 p50/p75/p95/p99
import { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";

interface AgentLatencyItem {
  agentId: string;
  count: number;
  avg: number | null;
  p50: number | null;
  p75: number | null;
  p95: number | null;
  p99: number | null;
}

interface LatencyByAgentResponse {
  agents: AgentLatencyItem[];
  computedAt: string;
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function LatencyRow({ item }: { item: AgentLatencyItem }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-2 pr-3 font-mono text-xs text-foreground max-w-[180px] truncate" title={item.agentId}>
        {item.agentId}
      </td>
      <td className="py-2 px-2 text-right text-xs text-muted-foreground">{item.count}</td>
      <td className="py-2 px-2 text-right text-xs">{formatMs(item.p50)}</td>
      <td className="py-2 px-2 text-right text-xs">{formatMs(item.p75)}</td>
      <td className="py-2 px-2 text-right text-xs">{formatMs(item.p95)}</td>
      <td className="py-2 px-2 text-right text-xs font-semibold">{formatMs(item.p99)}</td>
    </tr>
  );
}

export function AgentLatencyPanel() {
  const [data, setData] = useState<LatencyByAgentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchApi<LatencyByAgentResponse>("/kpi/latency-by-agent")
      .then((res) => { setData(res); setError(null); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm" aria-label="Agent Latency Dashboard">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Agent 응답 시간 분포</h2>
        <span className="text-xs text-muted-foreground">agent_run_metrics 기준</span>
      </header>

      {loading && (
        <div className="flex h-20 items-center justify-center" aria-busy="true" data-testid="latency-loading">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          로드 오류 — {error}
        </p>
      )}

      {!loading && !error && data && (
        data.agents.length === 0 ? (
          <p className="text-xs text-muted-foreground">데이터 없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Agent ID</th>
                  <th className="pb-2 px-2 text-right font-medium">Count</th>
                  <th className="pb-2 px-2 text-right font-medium">p50</th>
                  <th className="pb-2 px-2 text-right font-medium">p75</th>
                  <th className="pb-2 px-2 text-right font-medium">p95</th>
                  <th className="pb-2 px-2 text-right font-medium">p99</th>
                </tr>
              </thead>
              <tbody>
                {data.agents.map((item) => (
                  <LatencyRow key={item.agentId} item={item} />
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-right text-xs text-muted-foreground">
              {new Date(data.computedAt).toLocaleTimeString("ko-KR")} 기준
            </p>
          </div>
        )
      )}
    </section>
  );
}
