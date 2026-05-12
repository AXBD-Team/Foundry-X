// F621: 본부별 HITL 패널 — F605 위젯(HitlMetricsTile + HitlEscalationBadge) 재사용
import { HitlMetricsTile, HitlEscalationBadge } from "@/components/hitl-console";
import type { HitlMetrics } from "@/components/hitl-console";
import type { OrgUnit } from "./types";

interface OrgHitlPanelProps {
  orgUnit: OrgUnit;
  metrics: HitlMetrics;
  loading: boolean;
}

export function OrgHitlPanel({ orgUnit, metrics, loading }: OrgHitlPanelProps) {
  return (
    <section aria-label={`${orgUnit.label} HITL`}>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        {orgUnit.label} — HITL{" "}
        {metrics.escalated > 0 && (
          <HitlEscalationBadge
            escalated={true}
            confidence={metrics.avgConfidence}
            className="ml-1"
          />
        )}
      </h3>
      {loading ? (
        <div
          className="flex h-16 items-center justify-center rounded-lg border bg-muted/50"
          aria-busy="true"
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <HitlMetricsTile metrics={metrics} />
      )}
    </section>
  );
}
