// F605: HITL Console — AI Foundry P0-6
// F664: 5-state 머신 tab + HitlStateDiagram + HitlAuditDrawer 추가
"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchApi, postApi } from "@/lib/api-client";
import {
  HitlQueueTable,
  HitlDecisionForm,
  HitlMetricsTile,
  HitlStateDiagram,
  HitlAuditDrawer,
} from "@/components/hitl-console";
import type {
  HitlQueueResponse,
  HitlQueueItem,
  HitlAction,
  HitlMetrics,
  HitlState,
  HitlQueueItem5State,
} from "@/components/hitl-console";
import { HITL_STATES } from "@/components/hitl-console";

function useHitlQueue(escalatedOnly = false) {
  const [data, setData] = useState<HitlQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    const path = escalatedOnly ? "/hitl/queue?escalatedOnly=true" : "/hitl/queue";
    fetchApi<HitlQueueResponse>(path)
      .then((res) => { setData(res); setError(null); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [escalatedOnly]);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

// 5-state 머신 mock items (API 없이 UI 검증용 — 실 데이터는 별도 endpoint 연동 후속)
const MOCK_5STATE_ITEMS: HitlQueueItem5State[] = [
  {
    id: "5s-item-001",
    orgId: "org-1",
    state: "REVIEW_QUEUED",
    auditTraceId: "trace-5s-001",
    transitionedAt: Date.now() - 3600_000,
  },
  {
    id: "5s-item-002",
    orgId: "org-1",
    state: "AI_GENERATED",
    auditTraceId: "trace-5s-002",
    transitionedAt: Date.now() - 7200_000,
  },
];

type ConsoleTab = "all" | "escalated" | "state-machine";

const TABS: { key: ConsoleTab; label: string }[] = [
  { key: "all", label: "전체 큐" },
  { key: "escalated", label: "에스컬레이션" },
  { key: "state-machine", label: "5-state 머신" },
];

export function Component() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("all");
  const [selectedItem, setSelectedItem] = useState<HitlQueueItem | null>(null);

  // 5-state 머신 탭 전용 state
  const [selected5StateItem, setSelected5StateItem] =
    useState<HitlQueueItem5State | null>(null);
  const [stateFilter, setStateFilter] = useState<HitlState | "all">("all");
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  const { data, loading, error, refresh } = useHitlQueue(activeTab === "escalated");

  const metrics: HitlMetrics = {
    pending: data?.total ?? 0,
    escalated: data?.escalatedCount ?? 0,
    approvedToday: 0,
    avgConfidence: null,
  };

  const handleDecision = (_itemId: string, action: HitlAction, item: HitlQueueItem) => {
    setSelectedItem(item);
    void action;
  };

  const handleDecisionComplete = (_action: HitlAction) => {
    setSelectedItem(null);
    refresh();
  };

  const filtered5StateItems =
    stateFilter === "all"
      ? MOCK_5STATE_ITEMS
      : MOCK_5STATE_ITEMS.filter((it) => it.state === stateFilter);

  const diagramState: HitlState =
    selected5StateItem?.state ?? filtered5StateItems[0]?.state ?? "AI_GENERATED";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">HITL Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 결정 신뢰도가 낮거나 검토가 필요한 항목을 승인·거부·에스컬레이션해요
        </p>
      </header>

      <HitlMetricsTile metrics={metrics} className="mb-6" />

      {/* Tab Navigation */}
      <div className="mb-4 flex gap-0 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedItem(null);
              setSelected5StateItem(null);
              setAuditDrawerOpen(false);
            }}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "escalated" && (data?.escalatedCount ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {data?.escalatedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          큐 로드 실패: {error}
        </div>
      )}

      {/* 5-state 머신 탭 */}
      {activeTab === "state-machine" && (
        <div data-testid="state-machine-tab">
          <HitlStateDiagram currentState={diagramState} className="mb-6" />

          {/* state filter */}
          <div className="mb-4 flex items-center gap-2">
            <label className="text-xs font-medium text-foreground">State 필터:</label>
            <select
              value={stateFilter}
              onChange={(e) =>
                setStateFilter(e.target.value as HitlState | "all")
              }
              className="rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="state-filter-select"
            >
              <option value="all">전체</option>
              {HITL_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {filtered5StateItems.length}건
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {filtered5StateItems.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  선택한 state의 항목이 없어요
                </div>
              ) : (
                <ul className="space-y-2" data-testid="5state-item-list">
                  {filtered5StateItems.map((it) => (
                    <li
                      key={it.id}
                      onClick={() => setSelected5StateItem(it)}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted ${
                        selected5StateItem?.id === it.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {it.id.slice(0, 16)}…
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {it.state}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(it.transitionedAt).toLocaleString("ko-KR")}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected5StateItem(it);
                            setAuditDrawerOpen(true);
                          }}
                          className="text-xs text-blue-600 underline hover:text-blue-800"
                          data-testid="open-audit-drawer"
                        >
                          Audit 보기
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              {selected5StateItem ? (
                <HitlDecisionForm
                  mode="transition"
                  item={selected5StateItem}
                  onComplete={() => {
                    setSelected5StateItem(null);
                  }}
                  onCancel={() => setSelected5StateItem(null)}
                />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  항목을 선택하면 state 전환 폼이 나타나요
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 기존 큐 탭 (all / escalated) — 100% 유지 */}
      {activeTab !== "state-machine" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <HitlQueueTable
              items={data?.items ?? []}
              loading={loading}
              onDecision={handleDecision}
            />
            {data && (
              <p className="mt-2 text-xs text-muted-foreground">
                총 {data.total}건 · 마지막 갱신: {new Date(data.collectedAt).toLocaleTimeString("ko-KR")}
              </p>
            )}
          </div>

          <div>
            {selectedItem ? (
              <HitlDecisionForm
                item={selectedItem}
                onComplete={handleDecisionComplete}
                onCancel={() => setSelectedItem(null)}
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                큐에서 항목을 선택하면 의사결정 폼이 나타나요
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Drawer */}
      {selected5StateItem && (
        <HitlAuditDrawer
          traceId={selected5StateItem.auditTraceId}
          open={auditDrawerOpen}
          onClose={() => setAuditDrawerOpen(false)}
        />
      )}
    </div>
  );
}
