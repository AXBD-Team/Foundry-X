// F621: AI Foundry 운영 통합 대시보드 — 4 본부 동시 운영 KPI/HITL 한 화면
"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  OrgSelector,
  OrgKpiPanel,
  OrgHitlPanel,
  ORG_UNITS,
} from "@/components/operations";
import type { OrgFilter } from "@/components/operations";
import type { KpiListResponse } from "@/components/kpi";
import type { HitlQueueResponse, HitlMetrics } from "@/components/hitl-console";

function useKpiData() {
  const [data, setData] = useState<KpiListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchApi<KpiListResponse>("/kpi")
      .then((res) => { setData(res); setError(null); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

function useHitlData() {
  const [data, setData] = useState<HitlQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchApi<HitlQueueResponse>("/hitl/queue")
      .then((res) => { setData(res); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

function metricsFromQueue(data: HitlQueueResponse | null, orgId: string): HitlMetrics {
  const items = data?.items.filter((item) => !item.orgId || item.orgId === orgId) ?? [];
  return {
    pending: items.filter((i) => i.status === "pending" || i.status === "in_review").length,
    escalated: items.filter((i) => i.escalated).length,
    approvedToday: 0,
    avgConfidence:
      items.length > 0
        ? items.reduce((sum, i) => sum + (i.confidence ?? 0), 0) / items.length
        : null,
  };
}

export function Component() {
  const [filter, setFilter] = useState<OrgFilter>("all");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const { data: kpiData, loading: kpiLoading, error: kpiError, refresh: refreshKpi } = useKpiData();
  const { data: hitlData, loading: hitlLoading, refresh: refreshHitl } = useHitlData();

  const handleRefresh = () => {
    refreshKpi();
    refreshHitl();
    setLastRefreshed(new Date());
  };

  const visibleOrgs = filter === "all" ? ORG_UNITS : ORG_UNITS.filter((o) => o.id === filter);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">운영 통합 대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            4 본부 KPI + HITL 현황을 한 화면에서 모니터링해요
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            마지막 갱신: {lastRefreshed.toLocaleTimeString("ko-KR")}
          </span>
          <button
            onClick={handleRefresh}
            className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            새로고침
          </button>
        </div>
      </header>

      {/* Org Selector */}
      <div className="mb-6">
        <OrgSelector orgUnits={ORG_UNITS} selected={filter} onChange={setFilter} />
      </div>

      {/* Error banner */}
      {kpiError && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          KPI 로드 오류 — 데모 데이터로 표시 중 ({kpiError})
        </div>
      )}

      {/* 4 본부 grid — responsive: 1→2→4 column */}
      <div
        className={`grid gap-4 ${
          visibleOrgs.length === 1
            ? "grid-cols-1 max-w-sm"
            : visibleOrgs.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        {visibleOrgs.map((org) => (
          <div
            key={org.id}
            className="rounded-xl border bg-card p-4 shadow-sm"
            style={{ borderTopColor: org.color, borderTopWidth: 3 }}
          >
            {/* Org header */}
            <h2 className="mb-4 text-base font-bold" style={{ color: org.color }}>
              {org.label}
            </h2>

            {/* KPI section */}
            <OrgKpiPanel
              orgUnit={org}
              kpis={kpiData?.kpis ?? []}
              loading={kpiLoading}
            />

            <div className="my-4 border-t" />

            {/* HITL section */}
            <OrgHitlPanel
              orgUnit={org}
              metrics={metricsFromQueue(hitlData, org.id)}
              loading={hitlLoading}
            />
          </div>
        ))}
      </div>

      <footer className="mt-6 text-xs text-muted-foreground">
        F621 · MVP W27 게이트 · 본부 RBAC(F601 외부 unlock 후 활성화) · backend 변경 0
      </footer>
    </div>
  );
}
