// F605: HitlQueueCollector TDD Red — confidence escalation + multi-source aggregation
import { describe, it, expect, beforeEach } from "vitest";
import { HitlQueueCollector } from "../services/hitl-queue-collector.service.js";
import type { HitlQueueItem } from "../types.js";

function makeDb(rows: {
  proposals?: Record<string, unknown>[];
  reviewQueue?: Record<string, unknown>[];
  artifactReviews?: Record<string, unknown>[];
}) {
  return {
    prepare(sql: string) {
      return {
        bind(..._args: unknown[]) {
          return this;
        },
        all<T>() {
          if (sql.includes("agent_improvement_proposals")) {
            return Promise.resolve({ results: (rows.proposals ?? []) as T[] });
          }
          if (sql.includes("cross_org_review_queue")) {
            return Promise.resolve({ results: (rows.reviewQueue ?? []) as T[] });
          }
          if (sql.includes("hitl_artifact_reviews")) {
            return Promise.resolve({ results: (rows.artifactReviews ?? []) as T[] });
          }
          return Promise.resolve({ results: [] as T[] });
        },
        run() {
          return Promise.resolve({ meta: { rows_written: 1 } });
        },
        first<T>() {
          return Promise.resolve(null as T);
        },
      };
    },
  } as unknown as D1Database;
}

describe("HitlQueueCollector", () => {
  let collector: HitlQueueCollector;

  beforeEach(() => {
    collector = new HitlQueueCollector(
      makeDb({
        proposals: [
          {
            id: "prop-1",
            session_id: "sess-1",
            agent_id: "agent-1",
            type: "improvement",
            title: "메타 승인 대기",
            reasoning: "reason",
            yaml_diff: "",
            status: "pending",
            rejection_reason: null,
            rubric_score: 0.6,
            created_at: "2026-05-10T00:00:00Z",
            updated_at: "2026-05-10T00:00:00Z",
          },
        ],
        reviewQueue: [
          {
            review_id: "rev-1",
            assignment_id: "assign-1",
            org_id: "org-1",
            status: "pending",
            decision: null,
            reclassified_to: null,
            expert_id: null,
            notes: null,
            enqueued_at: Date.now(),
            signed_off_at: null,
          },
        ],
        artifactReviews: [],
      }),
    );
  });

  it("aggregates proposals and review queue items", async () => {
    const items = await collector.collectQueue();
    expect(items).toHaveLength(2);
  });

  it("marks items with confidence < 0.7 as escalated", async () => {
    const items = await collector.collectQueue();
    const proposal = items.find((i: HitlQueueItem) => i.id === "prop-1");
    expect(proposal?.escalated).toBe(true); // rubric_score 0.6 < 0.7
  });

  it("returns pending status for all collected items", async () => {
    const items = await collector.collectQueue();
    items.forEach((item: HitlQueueItem) => {
      expect(["pending", "in_review", "escalated"]).toContain(item.status);
    });
  });

  it("identifies source of each item", async () => {
    const items = await collector.collectQueue();
    const sources = items.map((i: HitlQueueItem) => i.source);
    expect(sources).toContain("meta-approval");
    expect(sources).toContain("expert-review");
  });
});
