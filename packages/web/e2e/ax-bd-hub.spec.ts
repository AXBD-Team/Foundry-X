/**
 * E2E: AX BD Hub — 사업개발 허브 (아이디어/BMC/Discovery)
 * API mock 기반 — API 서버 없이도 동작
 */
import { test, expect } from "./fixtures/auth";

// @service: bd-demo
// @sprint: 187
// @tagged-by: F400

test.describe("AX BD Hub", () => {
  test("ax-bd 허브 — 사업기획서 인덱스 렌더링", async ({ authenticatedPage: page }) => {
    // /shaping/proposal은 사업기획서 목록 전용 페이지 (F644 이후 허브 레이아웃 해체)
    await page.route("**/api/biz-items", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.goto("/shaping/proposal");

    await expect(page.getByRole("heading", { name: "사업기획서" })).toBeVisible({ timeout: 10000 });
    // 빈 상태 표시 — 목록 페이지 정상 렌더링 확인
    await expect(page.getByText("등록된 아이템이 없어요.")).toBeVisible();
  });

  test("아이디어 목록 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/ideas*", (route) =>
      route.fulfill({
        json: {
          items: [
            { id: "idea-1", title: "AI 챗봇 자동화", tags: ["AI", "자동화"], syncStatus: "synced", createdAt: 1711929600, updatedAt: 1711929600, description: null, gitRef: "", authorId: "u1", orgId: "o1" },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      }),
    );

    await page.goto("/ax-bd/ideas");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("BMC 목록 페이지 렌더링", async ({ authenticatedPage: page }) => {
    await page.route("**/api/ax-bd/bmc*", (route) =>
      route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } }),
    );

    await page.goto("/ax-bd/bmc");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible({ timeout: 20000 });
  });

  test("Discovery 프로세스 페이지 — ServiceContainer 렌더링", async ({ authenticatedPage: page }) => {
    await page.goto("/discovery/items");
    // ServiceContainer (iframe 기반)가 렌더링되는지 확인
    await expect(page.locator("main")).toBeVisible({ timeout: 30000 });
  });
});
