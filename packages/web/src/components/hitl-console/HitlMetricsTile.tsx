import type { HitlMetrics } from "./types";

interface HitlMetricsTileProps {
  metrics: HitlMetrics;
  className?: string;
}

interface Stat {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export function HitlMetricsTile({ metrics, className = "" }: HitlMetricsTileProps) {
  const stats: Stat[] = [
    { label: "대기 중", value: metrics.pending },
    { label: "에스컬레이션", value: metrics.escalated, highlight: metrics.escalated > 0 },
    { label: "오늘 승인", value: metrics.approvedToday },
    {
      label: "평균 신뢰도",
      value: metrics.avgConfidence !== null
        ? `${Math.round(metrics.avgConfidence * 100)}%`
        : "—",
    },
  ];

  return (
    <div
      className={`grid grid-cols-2 gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-4 ${className}`}
      aria-label="HITL 콘솔 메트릭"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
          <span
            className={`text-2xl font-bold tabular-nums ${
              stat.highlight ? "text-red-600" : "text-foreground"
            }`}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
