// F605: HITL Console — AI Foundry P0-6
"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchApi, postApi } from "@/lib/api-client";
import {
  HitlQueueTable,
  HitlDecisionForm,
  HitlMetricsTile,
} from "@/components/hitl-console";
import type {
  HitlQueueResponse,
  HitlQueueItem,
  HitlAction,
  HitlMetrics,
} from "@/components/hitl-console";

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

type ConsoleTab = "all" | "escalated";

const TABS: { key: ConsoleTab; label: string }[] = [
  { key: "all", label: "전체 큐" },
  { key: "escalated", label: "에스컬레이션" },
];

export function Component() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("all");
  const [selectedItem, setSelectedItem] = useState<HitlQueueItem | null>(null);

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
            onClick={() => { setActiveTab(tab.key); setSelectedItem(null); }}
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
    </div>
  );
}
