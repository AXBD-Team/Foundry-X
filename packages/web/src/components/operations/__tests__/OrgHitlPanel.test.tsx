// F621: OrgHitlPanel unit tests (TDD Red)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgHitlPanel } from "../OrgHitlPanel";
import type { OrgUnit } from "../types";
import type { HitlMetrics } from "@/components/hitl-console";

const mockOrg: OrgUnit = { id: "AXIS-DS", label: "AXIS-DS", color: "#f59e0b" };

const mockMetrics: HitlMetrics = {
  pending: 3,
  escalated: 1,
  approvedToday: 5,
  avgConfidence: 0.82,
};

vi.mock("@/lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue({ items: [], total: 0, escalatedCount: 0, collectedAt: new Date().toISOString() }),
}));

describe("OrgHitlPanel (F621)", () => {
  it("should render org label and HITL metrics tile", () => {
    render(<OrgHitlPanel orgUnit={mockOrg} metrics={mockMetrics} loading={false} />);
    expect(screen.getByText(/AXIS-DS/)).toBeInTheDocument();
    expect(screen.getByText("대기 중")).toBeInTheDocument();
  });

  it("should show escalation badge when escalated > 0", () => {
    render(<OrgHitlPanel orgUnit={mockOrg} metrics={mockMetrics} loading={false} />);
    const badge = screen.queryByLabelText(/Escalated/i) ?? screen.queryByText(/escalated/i);
    expect(badge).toBeTruthy();
  });
});
