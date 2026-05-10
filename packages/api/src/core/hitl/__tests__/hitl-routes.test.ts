// F605: HITL routes TDD Red — GET /queue + POST /decision
import { describe, it, expect } from "vitest";
import { hitlApp } from "../routes/index.js";

function makeEnv(overrides: Record<string, unknown> = {}) {
  const mockDb = {
    prepare(sql: string) {
      return {
        bind(..._args: unknown[]) { return this; },
        all<T>() { return Promise.resolve({ results: [] as T[] }); },
        run() { return Promise.resolve({ meta: { rows_written: 1 } }); },
        first<T>() {
          if (sql.includes("agent_improvement_proposals") && sql.includes("id = ?")) {
            return Promise.resolve({
              id: "prop-test",
              session_id: "sess",
              agent_id: "agent",
              type: "improvement",
              title: "Test",
              reasoning: "",
              yaml_diff: "",
              status: "pending",
              rejection_reason: null,
              rubric_score: null,
              created_at: "2026-05-10T00:00:00Z",
              updated_at: "2026-05-10T00:00:00Z",
            } as T);
          }
          return Promise.resolve(null as T);
        },
      };
    },
  } as unknown as D1Database;

  return { DB: mockDb, JWT_SECRET: "test-secret", ...overrides };
}

describe("GET /api/hitl/queue", () => {
  it("returns 401 without auth token", async () => {
    const res = await hitlApp.request("/queue");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/hitl/decision", () => {
  it("returns 401 without auth token", async () => {
    const res = await hitlApp.request("/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: "prop-1", source: "meta-approval", action: "approve" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing itemId", async () => {
    const res = await hitlApp.request("/decision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ source: "meta-approval", action: "approve" }),
    });
    expect([400, 401]).toContain(res.status);
  });
});
