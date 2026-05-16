// F664: HitlStateDiagram unit tests (TDD Green)
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HitlStateDiagram } from "@/components/hitl-console/HitlStateDiagram";
import type { HitlState } from "@/components/hitl-console/types";

describe("HitlStateDiagram", () => {
  it("renders all 5 state nodes", () => {
    const { getByTestId } = render(
      <HitlStateDiagram currentState="AI_GENERATED" />,
    );
    const diagram = getByTestId("hitl-state-diagram");
    expect(diagram).toBeTruthy();

    const states: HitlState[] = [
      "AI_GENERATED",
      "REVIEW_QUEUED",
      "HUMAN_REVIEWED",
      "AI_REVISED",
      "FINAL_APPROVED",
    ];
    for (const state of states) {
      const node = getByTestId(`state-node-${state}`);
      expect(node).toBeTruthy();
    }
  });

  it("marks currentState node as active", () => {
    const { getByTestId } = render(
      <HitlStateDiagram currentState="REVIEW_QUEUED" />,
    );
    const activeNode = getByTestId("state-node-REVIEW_QUEUED");
    expect(activeNode.dataset.active).toBe("true");

    const inactiveNode = getByTestId("state-node-AI_GENERATED");
    expect(inactiveNode.dataset.active).toBe("false");
  });

  it("renders FINAL_APPROVED as active when currentState is FINAL_APPROVED", () => {
    const { getByTestId } = render(
      <HitlStateDiagram currentState="FINAL_APPROVED" />,
    );
    const node = getByTestId("state-node-FINAL_APPROVED");
    expect(node.dataset.active).toBe("true");
  });

  it("renders label text for all states", () => {
    const { getByText } = render(
      <HitlStateDiagram currentState="AI_GENERATED" />,
    );
    expect(getByText("AI 생성 (80%)")).toBeTruthy();
    expect(getByText("검수 큐 (20%)")).toBeTruthy();
    expect(getByText("사람 검수")).toBeTruthy();
    expect(getByText("AI 재생성 (80%)")).toBeTruthy();
    expect(getByText("최종 승인")).toBeTruthy();
  });
});
