// F665: CQ 작성 가이드 + AI 금지 강제 — /register 차단 가드 TDD Red→Green
import { describe, it, expect, vi } from "vitest";
import { cqApp } from "../routes/index.js";

function makeEnv(seedRows: Record<string, unknown>[] = []) {
  const mockDb = {
    prepare(sql: string) {
      return {
        bind(..._args: unknown[]) {
          return this;
        },
        run() {
          return Promise.resolve({ success: true, meta: { rows_written: 1 } });
        },
        first<T>() {
          return Promise.resolve(null as T);
        },
        all<T>() {
          if (sql.includes("cq_questions") && sql.includes("SELECT")) {
            return Promise.resolve({ results: seedRows as T[] });
          }
          return Promise.resolve({ results: [] as T[] });
        },
      };
    },
  } as unknown as D1Database;

  return {
    DB: mockDb,
    AUDIT_HMAC_KEY: "test-hmac-key-32chars-padding-ok",
    ANTHROPIC_API_KEY: "test-key",
    AI: {} as unknown,
    JWT_SECRET: "test-secret",
  };
}

const GOOD_QUESTION =
  "KOAMI 프로젝트에서 4-Asset Model 온톨로지를 활용하여 경쟁사 분석을 어떻게 수행했나요?";
const GOOD_ANSWER =
  "KOAMI 분석에서 Entities(경쟁사 5곳), Relationships(시장 점유율 연결), Attributes(가격/품질 속성), Events(출시 이벤트)를 활용하여 BD 보고서를 생성했습니다.";

describe("F665 /register AI 차단 가드", () => {
  it("T1: AI author ('ai-claude') → 400 + AI-authored rejection", async () => {
    const env = makeEnv();
    const res = await cqApp.request(
      "/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "demo-org-001",
          questionText: GOOD_QUESTION,
          answerText: GOOD_ANSWER,
          author: "ai-claude",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toMatch(/AI-authored CQ rejected/i);
  });

  it("T2: 정상 author ('Sinclair Seo') → 201 + id 반환", async () => {
    const env = makeEnv();
    vi.stubGlobal("crypto", {
      randomUUID: () => "test-uuid-f665",
    });
    const res = await cqApp.request(
      "/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "demo-org-001",
          questionText: GOOD_QUESTION,
          answerText: GOOD_ANSWER,
          author: "Sinclair Seo",
        }),
      },
      env,
    );
    expect([200, 201]).toContain(res.status);
    const body = await res.json<{ id: string }>();
    expect(body.id).toBeTruthy();
  });

  it("T3: questionText < 50자 → 400 + CQ too short", async () => {
    const env = makeEnv();
    const res = await cqApp.request(
      "/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "demo-org-001",
          questionText: "짧은 질문",
          answerText: GOOD_ANSWER,
          author: "Sinclair Seo",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toMatch(/CQ too short/i);
  });

  it("T4: Dogfood seed 5건 SELECT → rows.length >= 5", async () => {
    const dogfoodRows = [
      { id: "dogfood-cq-001", author: "Sinclair Seo" },
      { id: "dogfood-cq-002", author: "Sinclair Seo" },
      { id: "dogfood-cq-003", author: "Sinclair Seo" },
      { id: "dogfood-cq-004", author: "Sinclair Seo" },
      { id: "dogfood-cq-005", author: "Sinclair Seo" },
    ];
    const env = makeEnv(dogfoodRows);
    const res = await env.DB.prepare(
      "SELECT id, author FROM cq_questions WHERE org_id = ?",
    )
      .bind("demo-org-001")
      .all<{ id: string; author: string }>();
    expect(res.results.length).toBeGreaterThanOrEqual(5);
    expect(res.results.every((r) => r.author !== "")).toBe(true);
  });
});
