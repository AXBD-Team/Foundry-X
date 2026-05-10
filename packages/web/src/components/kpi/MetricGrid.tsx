import { KpiTile } from "./KpiTile";
import type { KpiResult } from "./types";

interface MetricGridProps {
  kpis: KpiResult[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({ kpis, columns = 4, className = "" }: MetricGridProps) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <section
      className={`grid gap-4 ${colClass} ${className}`}
      aria-label="KPI metrics grid"
    >
      {kpis.map((kpi) => (
        <KpiTile key={kpi.id} kpi={kpi} />
      ))}
    </section>
  );
}
