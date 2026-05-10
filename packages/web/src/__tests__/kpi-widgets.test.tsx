// F604: KPI 위젯 4종 render + props
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiTile } from "../components/kpi/KpiTile";
import { Sparkline } from "../components/kpi/Sparkline";
import { MetricGrid } from "../components/kpi/MetricGrid";
import { TrendArrow } from "../components/kpi/TrendArrow";
import type { KpiResult } from "../components/kpi/types";

const mockKpi: KpiResult = {
  id: "bureau_active_count",
  label: "본부 동시 운영 수",
  value: 3,
  unit: "개",
  trend: "up",
  threshold: 4,
  description: "현재 실행 중인 본부 수",
  dataSource: "graph_sessions",
};

describe("KpiTile — F604", () => {
  it("renders label and value", () => {
    render(<KpiTile kpi={mockKpi} />);
    expect(screen.getByText("본부 동시 운영 수")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("개")).toBeInTheDocument();
  });

  it("renders null value as em dash", () => {
    render(<KpiTile kpi={{ ...mockKpi, value: null }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<KpiTile kpi={mockKpi} />);
    expect(screen.getByText("현재 실행 중인 본부 수")).toBeInTheDocument();
  });
});

describe("Sparkline — F604", () => {
  it("renders svg with polyline for multi-point data", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} label="test sparkline" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(container.querySelector("polyline")).toBeTruthy();
  });

  it("renders a line for single-point data", () => {
    const { container } = render(<Sparkline data={[5]} label="single" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders empty data gracefully", () => {
    const { container } = render(<Sparkline data={[]} label="empty" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("MetricGrid — F604", () => {
  it("renders all kpis as tiles", () => {
    const kpis: KpiResult[] = [
      mockKpi,
      { ...mockKpi, id: "asset_reuse_rate", label: "자산 재사용률", value: 42 },
    ];
    render(<MetricGrid kpis={kpis} />);
    expect(screen.getByText("본부 동시 운영 수")).toBeInTheDocument();
    expect(screen.getByText("자산 재사용률")).toBeInTheDocument();
  });

  it("renders empty grid with no kpis", () => {
    const { container } = render(<MetricGrid kpis={[]} />);
    expect(container.querySelector("section")).toBeTruthy();
  });
});

describe("TrendArrow — F604", () => {
  it("renders up arrow", () => {
    render(<TrendArrow trend="up" />);
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("renders down arrow", () => {
    render(<TrendArrow trend="down" />);
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  it("renders stable arrow", () => {
    render(<TrendArrow trend="stable" />);
    expect(screen.getByText("→")).toBeInTheDocument();
  });

  it("renders unknown as em dash", () => {
    render(<TrendArrow trend="unknown" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("applies green color for positive up trend", () => {
    const { container } = render(<TrendArrow trend="up" positiveDirection="up" />);
    expect(container.querySelector(".text-green-500")).toBeTruthy();
  });

  it("applies red color for negative up trend", () => {
    const { container } = render(<TrendArrow trend="up" positiveDirection="down" />);
    expect(container.querySelector(".text-red-500")).toBeTruthy();
  });
});
