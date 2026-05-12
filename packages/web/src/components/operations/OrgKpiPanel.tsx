// F621: 본부별 KPI 패널 — F604 위젯(MetricGrid) 재사용
import { MetricGrid } from "@/components/kpi";
import type { KpiResult } from "@/components/kpi";
import type { OrgUnit } from "./types";

interface OrgKpiPanelProps {
  orgUnit: OrgUnit;
  kpis: KpiResult[];
  loading: boolean;
}

export function OrgKpiPanel({ orgUnit, kpis, loading }: OrgKpiPanelProps) {
  return (
    <section aria-label={`${orgUnit.label} KPI`}>
      <h3
        className="mb-3 text-sm font-semibold"
        style={{ color: orgUnit.color }}
      >
        {orgUnit.label} — KPI
      </h3>
      {loading ? (
        <div
          className="flex h-20 items-center justify-center rounded-lg border bg-muted/50"
          aria-busy="true"
          data-testid="kpi-loading"
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : kpis.length > 0 ? (
        <MetricGrid kpis={kpis} columns={2} />
      ) : (
        <p className="text-xs text-muted-foreground">KPI 데이터 없음</p>
      )}
    </section>
  );
}
