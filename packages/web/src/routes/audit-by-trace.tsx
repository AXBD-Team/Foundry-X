"use client";

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchApi } from "@/lib/api-client";
import { TraceChainView } from "@/components/audit";
import type { TraceChainResult } from "@/components/audit";

function AuditByTrace() {
  const [params] = useSearchParams();
  const traceId = params.get("traceId") ?? "";

  const [result, setResult] = useState<TraceChainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(traceId);

  useEffect(() => {
    if (!traceId) return;
    setLoading(true);
    setError(null);
    fetchApi<TraceChainResult>(`/audit/log/by-trace?trace_id=${encodeURIComponent(traceId)}`)
      .then((data) => setResult(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [traceId]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/dashboard" style={{ color: "#6b7280", fontSize: 13 }}>
          ← Back to Dashboard
        </Link>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        Audit Trace Chain
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter trace ID..."
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        <a
          href={`/audit/by-trace?traceId=${encodeURIComponent(inputValue)}`}
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: 6,
            fontSize: 14,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Search
        </a>
      </div>
      {loading && <div style={{ color: "#6b7280" }}>Loading...</div>}
      {error && (
        <div style={{ color: "#dc2626", padding: 12, background: "#fee2e2", borderRadius: 6 }}>
          {error}
        </div>
      )}
      {result && !loading && <TraceChainView result={result} />}
      {!traceId && !loading && (
        <div style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>
          Enter a trace ID above to view the audit chain.
        </div>
      )}
    </div>
  );
}

export default AuditByTrace;

export const Component = AuditByTrace;
