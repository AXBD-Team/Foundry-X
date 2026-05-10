import { HITL_CONFIDENCE_THRESHOLD } from "./types";

interface HitlEscalationBadgeProps {
  escalated: boolean;
  confidence: number | null;
  className?: string;
}

export function HitlEscalationBadge({ escalated, confidence, className = "" }: HitlEscalationBadgeProps) {
  if (escalated) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 ${className}`}
        aria-label="Escalated — confidence below threshold"
      >
        ⬆ escalated
        {confidence !== null && (
          <span className="ml-1 text-red-500">({Math.round(confidence * 100)}%)</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 ${className}`}
      aria-label={`Confidence: ${confidence !== null ? Math.round(confidence * 100) : "—"}%`}
    >
      {confidence !== null
        ? confidence >= HITL_CONFIDENCE_THRESHOLD
          ? `✓ ${Math.round(confidence * 100)}%`
          : `${Math.round(confidence * 100)}%`
        : "—"}
    </span>
  );
}
