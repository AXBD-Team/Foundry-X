// F664: HITL audit drawer — trace_id별 audit chain 시각화
"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";

interface AuditEvent {
  id: string;
  event_type: string;
  entity_type?: string;
  entity_id?: string;
  trace_id?: string;
  actor_id?: string;
  payload?: unknown;
  created_at: string;
}

interface AuditByTraceResponse {
  events: AuditEvent[];
  total: number;
  trace_id: string;
}

interface Props {
  traceId: string;
  open: boolean;
  onClose: () => void;
}

function formatPayloadPreview(payload: unknown): string {
  if (!payload) return "—";
  try {
    const str = typeof payload === "string" ? payload : JSON.stringify(payload);
    return str.length > 100 ? `${str.slice(0, 100)}…` : str;
  } catch {
    return "—";
  }
}

export function HitlAuditDrawer({ traceId, open, onClose }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChain = useCallback(() => {
    if (!open || !traceId) return;
    setLoading(true);
    setError(null);
    fetchApi<AuditByTraceResponse>(`/audit/log/by-trace?trace_id=${encodeURIComponent(traceId)}`)
      .then((res) => setEvents(res.events ?? []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, traceId]);

  useEffect(() => { loadChain(); }, [loadChain]);

  // ESC key 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      data-testid="hitl-audit-drawer"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* drawer panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Audit Chain
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {traceId.slice(0, 12)}…
            </span>
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}
          {!loading && !error && events.length === 0 && (
            <p className="text-sm text-muted-foreground">이벤트 없음</p>
          )}

          <ol className="space-y-3">
            {events.map((evt, idx) => (
              <li
                key={evt.id}
                data-testid="audit-chain-item"
                className="flex gap-3"
              >
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {idx + 1}
                  </span>
                  {idx < events.length - 1 && (
                    <div className="mt-1 h-full w-px bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-xs font-semibold text-foreground">
                    {evt.event_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(evt.created_at).toLocaleString("ko-KR")}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {formatPayloadPreview(evt.payload)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
