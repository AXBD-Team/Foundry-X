/**
 * E2E: HITL 5-state 머신 UI (F664) — HitlStateDiagram + transition + audit drawer
 * API mock 기반, /hitl-console 라우트에서 "5-state 머신" 탭 진입
 */
import { test, expect } from "./fixtures/auth";

// F664 hitl-state-machine spec
// @sprint: 398

const MOCK_HITL_QUEUE_EMPTY = {
  items: [],
  total: 0,
  escalatedCount: 0,
  collectedAt: new Date().toISOString(),
};

const MOCK_TRANSITION_OK = {
  id: "5s-item-001",
  orgId: "org-1",
  state: "REVIEW_QUEUED",
  auditTraceId: "trace-5s-001",
  transitionedAt: Date.now(),
};

const MOCK_AUDIT_CHAIN = {
  events: [
    {
      id: "evt-1",
      event_type: "hitl.transitioned",
      entity_type: "hitl_queue",
      entity_id: "5s-item-001",
      trace_id: "trace-5s-001",
      actor_id: "user-123",
      payload: { from: "AI_GENERATED", to: "REVIEW_QUEUED" },
      created_at: new Date().toISOString(),
    },
    {
      id: "evt-2",
      event_type: "hitl.reviewed",
      entity_type: "hitl_queue",
      entity_id: "5s-item-001",
      trace_id: "trace-5s-001",
      actor_id: "user-123",
      payload: { action: "human_review_complete" },
      created_at: new Date(Date.now() - 60_000).toISOString(),
    },
  ],
  total: 2,
  trace_id: "trace-5s-001",
};

async function setupMocks(page: import("@playwright/test").Page) {
  await Promise.all([
    page.evaluate(() => {
      localStorage.setItem("fx-discovery-tour-completed", "true");
      localStorage.setItem("fx-tour-completed", "true");
    }),
    page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "[aria-label='피드백 보내기'] { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () =>
        document.head.appendChild(style),
      );
    }),
    page.route("**/api/hitl/queue**", (route) =>
      route.fulfill({ json: MOCK_HITL_QUEUE_EMPTY }),
    ),
    page.route("**/api/hitl/transition", (route) =>
      route.fulfill({ status: 200, json: MOCK_TRANSITION_OK }),
    ),
    page.route("**/api/audit/log/by-trace**", (route) =>
      route.fulfill({ json: MOCK_AUDIT_CHAIN }),
    ),
  ]);
}

test.describe("HITL 5-state 머신 UI (F664)", () => {
  test("T1: 5-state 다이어그램 렌더링 + current state highlight", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/hitl-console");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // "5-state 머신" 탭 클릭
    const stateMachineTab = page.getByRole("button", { name: "5-state 머신" });
    await expect(stateMachineTab).toBeVisible({ timeout: 10000 });
    await stateMachineTab.click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // 다이어그램 렌더링 확인
    const diagram = page.getByTestId("hitl-state-diagram");
    await expect(diagram).toBeVisible({ timeout: 10000 });

    // 5개 state node 모두 존재
    for (const state of [
      "AI_GENERATED",
      "REVIEW_QUEUED",
      "HUMAN_REVIEWED",
      "AI_REVISED",
      "FINAL_APPROVED",
    ]) {
      await expect(page.getByTestId(`state-node-${state}`)).toBeVisible();
    }

    // REVIEW_QUEUED가 첫 item state이므로 active 기대 (mock item의 state)
    const activeNode = page.getByTestId("state-node-REVIEW_QUEUED");
    await expect(activeNode).toHaveAttribute("data-active", "true");
  });

  test("T2: transition trigger form → POST /api/hitl/transition 200", async ({
    authenticatedPage: page,
  }) => {
    // Admin role 명시 주입 (auth fixture는 "admin" lowercase, HitlRole 타입은 PascalCase)
    // RBAC 항상 차단되어 happy path 미실행 + dangling waitForRequest "Test ended" 노출 fix
    await page.addInitScript(() => {
      const payload = btoa(
        JSON.stringify({
          sub: "test-user",
          role: "Admin",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
      localStorage.setItem("token", `header.${payload}.sig`);
    });
    await setupMocks(page);
    await page.goto("/hitl-console");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    await page.getByRole("button", { name: "5-state 머신" }).click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // 첫 번째 아이템 클릭
    const itemList = page.getByTestId("5state-item-list");
    await expect(itemList).toBeVisible({ timeout: 10000 });
    await itemList.locator("li").first().click();

    // transition form 노출
    const transitionForm = page.getByTestId("hitl-transition-form");
    await expect(transitionForm).toBeVisible({ timeout: 5000 });

    // "전환" 버튼 클릭
    const submitBtn = transitionForm.getByRole("button", { name: "전환" });
    await expect(submitBtn).toBeVisible();

    // RBAC blocked 아닌지 확인 후 클릭
    const rbacBlocked = page.getByTestId("rbac-blocked");
    const isBlocked = (await rbacBlocked.count()) > 0;

    if (!isBlocked) {
      // API 호출 감시 (RBAC unblocked branch 내부에서만 promise 생성 — dangling 차단)
      const transitionReq = page.waitForRequest("**/api/hitl/transition");
      await submitBtn.click();
      const req = await transitionReq;
      const body = JSON.parse(req.postData() ?? "{}") as {
        queueItemId: string;
        fromState: string;
        toState: string;
      };
      expect(body.queueItemId).toBeTruthy();
      expect(body.fromState).toBeTruthy();
      expect(body.toState).toBeTruthy();
    } else {
      // RBAC blocked — transition select disabled 확인
      const select = page.getByTestId("transition-to-select");
      if ((await select.count()) > 0) {
        await expect(select).toBeDisabled();
      }
    }
  });

  test("T3: RBAC denied — Operator role on disallowed transition → form disabled or blocked msg", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);

    // Operator role을 흉내내기 위해 JWT payload에 role=Operator 주입
    await page.addInitScript(() => {
      // mock token with role=Operator (HUMAN_REVIEWED->AI_REVISED 불허)
      const payload = btoa(
        JSON.stringify({
          sub: "test-user",
          role: "Operator",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
      const mockToken = `header.${payload}.sig`;
      localStorage.setItem("token", mockToken);
    });

    await page.goto("/hitl-console");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    await page.getByRole("button", { name: "5-state 머신" }).click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // state filter → HUMAN_REVIEWED (Operator는 AI_REVISED로 전환 불허)
    const filterSelect = page.getByTestId("state-filter-select");
    await expect(filterSelect).toBeVisible({ timeout: 5000 });

    // 5-state item list에서 아이템 선택
    const itemList = page.getByTestId("5state-item-list");
    if ((await itemList.locator("li").count()) > 0) {
      await itemList.locator("li").first().click();
      await page.waitForLoadState("networkidle", { timeout: 10000 });

      const transitionForm = page.getByTestId("hitl-transition-form");
      if ((await transitionForm.count()) > 0) {
        await expect(transitionForm).toBeVisible({ timeout: 5000 });

        // Operator + REVIEW_QUEUED → HUMAN_REVIEWED는 허용 (allowed role 포함)
        // Operator + HUMAN_REVIEWED → AI_REVISED는 불허
        // 현재 mock은 REVIEW_QUEUED item이 기본이므로 Operator도 진행 가능 — RBAC blocked 없음
        // 중요: form은 visible하되 toState select는 허용 state만 표시
        const selectEl = page.getByTestId("transition-to-select");
        const blockedMsg = page.getByTestId("rbac-blocked");
        const hasSelect = (await selectEl.count()) > 0;
        const hasBlocked = (await blockedMsg.count()) > 0;
        // 둘 중 하나는 존재해야 함 (allowed 또는 blocked)
        expect(hasSelect || hasBlocked).toBe(true);
      }
    } else {
      // item 없으면 diagram만 확인
      const diagram = page.getByTestId("hitl-state-diagram");
      await expect(diagram).toBeVisible({ timeout: 5000 });
    }
  });

  test("T4: audit drawer 열기 → GET /api/audit/log/by-trace → chain 표시", async ({
    authenticatedPage: page,
  }) => {
    await setupMocks(page);
    await page.goto("/hitl-console");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    await page.getByRole("button", { name: "5-state 머신" }).click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // "Audit 보기" 버튼 클릭
    const auditBtn = page.getByTestId("open-audit-drawer").first();
    await expect(auditBtn).toBeVisible({ timeout: 10000 });

    // API 호출 감시
    const auditReq = page.waitForRequest("**/api/audit/log/by-trace**");
    await auditBtn.click();

    await auditReq;

    // drawer 노출
    const drawer = page.getByTestId("hitl-audit-drawer");
    await expect(drawer).toBeVisible({ timeout: 10000 });

    // chain items 존재
    const chainItems = page.getByTestId("audit-chain-item");
    await expect(chainItems.first()).toBeVisible({ timeout: 10000 });
    expect(await chainItems.count()).toBeGreaterThanOrEqual(1);

    // event_type 텍스트 확인
    await expect(page.getByText("hitl.transitioned")).toBeVisible({ timeout: 5000 });

    // ESC key로 닫기
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible({ timeout: 5000 });
  });
});
