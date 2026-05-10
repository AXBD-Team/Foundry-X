"use client";

import { HitlEscalationBadge } from "./HitlEscalationBadge";
import type { HitlQueueItem, HitlAction } from "./types";

const SOURCE_LABELS: Record<string, string> = {
  "meta-approval": "MetaApproval",
  "expert-review": "ExpertReview",
  "artifact-review": "ArtifactReview",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_review: "bg-blue-100 text-blue-700",
  escalated: "bg-red-100 text-red-700",
  resolved: "bg-green-100 text-green-700",
};

interface HitlQueueTableProps {
  items: HitlQueueItem[];
  onDecision?: (itemId: string, action: HitlAction, item: HitlQueueItem) => void;
  loading?: boolean;
}

export function HitlQueueTable({ items, onDecision, loading = false }: HitlQueueTableProps) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
        큐 로드 중...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        처리 대기 항목이 없어요
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border" role="table" aria-label="HITL 큐">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">항목</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">소스</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">신뢰도</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">등록일</th>
            {onDecision && (
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">액션</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">{item.title}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {SOURCE_LABELS[item.source] ?? item.source}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_STYLES[item.status] ?? ""
                  }`}
                >
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <HitlEscalationBadge
                  escalated={item.escalated}
                  confidence={item.confidence}
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString("ko-KR")}
              </td>
              {onDecision && (
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onDecision(item.id, "approve", item)}
                      className="rounded bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => onDecision(item.id, "reject", item)}
                      className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                    >
                      거부
                    </button>
                    <button
                      onClick={() => onDecision(item.id, "escalate", item)}
                      className="rounded bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      에스컬
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
