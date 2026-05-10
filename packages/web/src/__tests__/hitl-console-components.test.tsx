// F605: HITL Console components TDD Red
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HitlEscalationBadge } from "@/components/hitl-console/HitlEscalationBadge";
import { HitlMetricsTile } from "@/components/hitl-console/HitlMetricsTile";
import type { HitlQueueItem, HitlMetrics } from "@/components/hitl-console/types";

const baseItem: HitlQueueItem = {
  id: "item-1",
  title: "Test Item",
  source: "meta-approval",
  status: "pending",
  escalated: false,
  confidence: 0.8,
  createdAt: "2026-05-10T00:00:00Z",
};

describe("HitlEscalationBadge", () => {
  it("renders 'escalated' label when escalated=true", () => {
    const { getByText } = render(
      <HitlEscalationBadge escalated={true} confidence={0.6} />,
    );
    expect(getByText(/escalat/i)).toBeTruthy();
  });

  it("renders 'normal' indicator when not escalated", () => {
    const { container } = render(
      <HitlEscalationBadge escalated={false} confidence={0.9} />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});

describe("HitlMetricsTile", () => {
  const metrics: HitlMetrics = {
    pending: 5,
    escalated: 2,
    approvedToday: 10,
    avgConfidence: 0.75,
  };

  it("renders pending count", () => {
    const { getByText } = render(<HitlMetricsTile metrics={metrics} />);
    expect(getByText("5")).toBeTruthy();
  });

  it("renders escalated count", () => {
    const { getByText } = render(<HitlMetricsTile metrics={metrics} />);
    expect(getByText("2")).toBeTruthy();
  });
});
