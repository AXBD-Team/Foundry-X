"use client";

import { useState } from "react";
import { postApi } from "@/lib/api-client";
import type { HitlQueueItem, HitlAction } from "./types";

interface HitlDecisionFormProps {
  item: HitlQueueItem;
  onComplete?: (action: HitlAction) => void;
  onCancel?: () => void;
}

export function HitlDecisionForm({ item, onComplete, onCancel }: HitlDecisionFormProps) {
  const [action, setAction] = useState<HitlAction | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresReason = action === "reject" || action === "escalate";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    if (requiresReason && !reason.trim()) {
      setError("사유를 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await postApi("/hitl/decision", {
        itemId: item.id,
        source: item.source,
        action,
        reason: reason.trim() || undefined,
      });
      onComplete?.(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          소스: {item.source} · ID: {item.id}
        </p>
      </div>

      <div className="flex gap-2">
        {(["approve", "reject", "escalate"] as HitlAction[]).map((act) => (
          <button
            key={act}
            type="button"
            onClick={() => { setAction(act); setError(null); }}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
              action === act
                ? act === "approve"
                  ? "bg-green-600 text-white"
                  : act === "reject"
                  ? "bg-red-600 text-white"
                  : "bg-amber-500 text-white"
                : "border bg-background hover:bg-muted"
            }`}
          >
            {act === "approve" ? "승인" : act === "reject" ? "거부" : "에스컬"}
          </button>
        ))}
      </div>

      {requiresReason && (
        <div>
          <label htmlFor={`reason-${item.id}`} className="mb-1 block text-xs font-medium text-foreground">
            사유 <span className="text-red-500">*</span>
          </label>
          <textarea
            id={`reason-${item.id}`}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="처리 사유를 입력해 주세요..."
            className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2 text-sm hover:bg-muted"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={!action || loading}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "처리 중..." : "적용"}
        </button>
      </div>
    </form>
  );
}
