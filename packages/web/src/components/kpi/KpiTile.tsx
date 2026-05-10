import type { KpiResult } from "./types";

interface KpiTileProps {
  kpi: KpiResult;
  className?: string;
}

export function KpiTile({ kpi, className = "" }: KpiTileProps) {
  const isAboveThreshold =
    kpi.threshold !== null && kpi.value !== null && kpi.value >= kpi.threshold;

  return (
    <article
      className={`rounded-lg border bg-card p-4 shadow-sm ${className}`}
      aria-label={kpi.label}
    >
      <header className="mb-1 text-xs font-medium text-muted-foreground">{kpi.label}</header>
      <div className="flex items-end gap-2">
        <span
          className={`text-2xl font-bold tabular-nums ${
            isAboveThreshold ? "text-green-600" : "text-foreground"
          }`}
          aria-live="polite"
        >
          {kpi.value !== null ? kpi.value.toLocaleString() : "—"}
        </span>
        {kpi.unit && <span className="mb-0.5 text-sm text-muted-foreground">{kpi.unit}</span>}
      </div>
      <footer className="mt-1 text-xs text-muted-foreground">{kpi.description}</footer>
    </article>
  );
}
