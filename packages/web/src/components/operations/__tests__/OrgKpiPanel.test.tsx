// F621: OrgKpiPanel unit tests (TDD Red)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgKpiPanel } from "../OrgKpiPanel";
import type { OrgUnit } from "../types";
import type { KpiResult } from "@/components/kpi";

const mockOrg: OrgUnit = { id: "KOAMI", label: "KOAMI", color: "#6366f1" };

const mockKpis: KpiResult[] = [
  {
    id: "bureau_active_count",
    label: "활성 본부",
    value: 4,
    unit: "개",
    trend: "stable",
    threshold: 1,
    description: "운영 중인 본부 수",
    dataSource: "mock",
  },
];

vi.mock("@/lib/api-client", () => ({
  fetchApi: vi.fn().mockResolvedValue({ kpis: [], computedAt: new Date().toISOString() }),
}));

describe("OrgKpiPanel (F621)", () => {
  it("should render org label and KPI metrics", () => {
    render(<OrgKpiPanel orgUnit={mockOrg} kpis={mockKpis} loading={false} />);
    expect(screen.getByText(/KOAMI/)).toBeInTheDocument();
    expect(screen.getByText("활성 본부")).toBeInTheDocument();
  });

  it("should show loading state when loading is true", () => {
    render(<OrgKpiPanel orgUnit={mockOrg} kpis={[]} loading={true} />);
    expect(screen.getByTestId("kpi-loading")).toBeTruthy();
  });
});
