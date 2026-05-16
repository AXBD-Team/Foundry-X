// F664: HITL 5-state 머신 시각화 — 80-20-80 체인 다이어그램
import type { HitlState } from "./types";

const STATE_META: { state: HitlState; label: string; emoji: string }[] = [
  { state: "AI_GENERATED", label: "AI 생성 (80%)", emoji: "🤖" },
  { state: "REVIEW_QUEUED", label: "검수 큐 (20%)", emoji: "📋" },
  { state: "HUMAN_REVIEWED", label: "사람 검수", emoji: "👤" },
  { state: "AI_REVISED", label: "AI 재생성 (80%)", emoji: "🔄" },
  { state: "FINAL_APPROVED", label: "최종 승인", emoji: "✅" },
];

interface Props {
  currentState: HitlState;
  className?: string;
}

export function HitlStateDiagram({ currentState, className = "" }: Props) {
  return (
    <div
      data-testid="hitl-state-diagram"
      className={`flex items-center gap-1 overflow-x-auto py-3 ${className}`}
      aria-label="HITL 5-state 머신 다이어그램"
    >
      {STATE_META.map((meta, idx) => {
        const isActive = meta.state === currentState;
        const isPast = STATE_META.findIndex((s) => s.state === currentState) > idx;

        return (
          <div key={meta.state} className="flex items-center gap-1">
            <div
              data-testid={`state-node-${meta.state}`}
              data-active={isActive}
              className={`flex min-w-[100px] flex-col items-center rounded-lg border px-3 py-2 text-center transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : isPast
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-muted bg-background text-muted-foreground"
              }`}
            >
              <span className="text-base" aria-hidden="true">
                {meta.emoji}
              </span>
              <span className="mt-0.5 text-xs leading-tight">{meta.label}</span>
            </div>

            {idx < STATE_META.length - 1 && (
              <span
                className={`text-sm font-bold ${isPast || isActive ? "text-primary" : "text-muted-foreground"}`}
                aria-hidden="true"
              >
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
