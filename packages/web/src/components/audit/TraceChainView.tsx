"use client";

import type { TraceChainResult, TraceEvent } from "./types";

interface Props {
  result: TraceChainResult;
}

function SourceBadge({ source }: { source?: "manual" | "live" }) {
  if (!source) return null;
  const isLive = source === "live";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        background: isLive ? "#16a34a" : "#2563eb",
        color: "#fff",
        marginLeft: 6,
        verticalAlign: "middle",
      }}
    >
      {isLive ? "LIVE" : "MANUAL"}
    </span>
  );
}

function EventRow({ event, index }: { event: TraceEvent; index: number }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: event.source === "live" ? "#dcfce7" : "#dbeafe",
          color: event.source === "live" ? "#16a34a" : "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {event.eventType}
          <SourceBadge source={event.source} />
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          {event.createdAt}
          {event.agentId && <> · agent: {event.agentId}</>}
          {event.tenantId && <> · tenant: {event.tenantId}</>}
        </div>
      </div>
    </div>
  );
}

export function TraceChainView({ result }: Props) {
  const { traceId, events, chainValid } = result;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Trace ID</div>
        <code style={{ fontSize: 13, fontFamily: "monospace" }}>{traceId}</code>
        <span
          style={{
            marginLeft: 10,
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            background: chainValid ? "#dcfce7" : "#fee2e2",
            color: chainValid ? "#16a34a" : "#dc2626",
            fontWeight: 600,
          }}
        >
          {chainValid ? "VALID" : "EMPTY"}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
        {events.length} event{events.length !== 1 ? "s" : ""} ·{" "}
        {events.filter((e) => e.source === "manual").length} manual ·{" "}
        {events.filter((e) => e.source === "live").length} live
      </div>
      <div>
        {events.length === 0 ? (
          <div style={{ color: "#9ca3af", padding: "24px 0", textAlign: "center" }}>
            No events found for this trace ID.
          </div>
        ) : (
          events.map((event, i) => <EventRow key={event.id} event={event} index={i} />)
        )}
      </div>
    </div>
  );
}
