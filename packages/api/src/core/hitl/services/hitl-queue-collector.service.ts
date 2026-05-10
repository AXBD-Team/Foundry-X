// F605: HITL Queue Collector — 분산 7+ services에서 pending 큐 통합 조회
// Cross-domain D1 query (KPI 패턴) — lint-baseline에 추가 필요
import type { HitlQueueItem, HitlQueueResponse } from "../types.js";
import { HITL_CONFIDENCE_THRESHOLD } from "../types.js";

interface ProposalRow {
  id: string;
  session_id: string;
  agent_id: string;
  type: string;
  title: string;
  status: string;
  rubric_score: number | null;
  created_at: string;
}

interface ReviewQueueRow {
  review_id: string;
  assignment_id: string;
  org_id: string;
  status: string;
  enqueued_at: number;
}

interface ArtifactReviewRow {
  id: string;
  tenant_id: string;
  artifact_id: string;
  action: string;
  created_at: string;
}

export class HitlQueueCollector {
  constructor(private readonly db: D1Database) {}

  async collectQueue(orgId?: string): Promise<HitlQueueItem[]> {
    const [proposals, reviewQueueItems, artifactReviews] = await Promise.all([
      this.collectProposals(orgId),
      this.collectReviewQueue(orgId),
      this.collectArtifactReviews(orgId),
    ]);

    return [...proposals, ...reviewQueueItems, ...artifactReviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getQueueResponse(orgId?: string): Promise<HitlQueueResponse> {
    const items = await this.collectQueue(orgId);
    const escalatedCount = items.filter((i) => i.escalated).length;
    return {
      items,
      total: items.length,
      escalatedCount,
      collectedAt: new Date().toISOString(),
    };
  }

  private async collectProposals(orgId?: string): Promise<HitlQueueItem[]> {
    const sql = orgId
      ? "SELECT * FROM agent_improvement_proposals WHERE status = 'pending' AND session_id LIKE ? ORDER BY created_at DESC"
      : "SELECT * FROM agent_improvement_proposals WHERE status = 'pending' ORDER BY created_at DESC";
    const stmt = this.db.prepare(sql);
    const result = orgId
      ? await stmt.bind(`%${orgId}%`).all<ProposalRow>()
      : await stmt.all<ProposalRow>();

    return (result.results ?? []).map((row) => {
      const confidence = row.rubric_score;
      return {
        id: row.id,
        title: row.title || `Agent Proposal: ${row.type}`,
        source: "meta-approval" as const,
        status: "pending" as const,
        escalated: confidence !== null && confidence < HITL_CONFIDENCE_THRESHOLD,
        confidence,
        createdAt: row.created_at,
        metadata: { sessionId: row.session_id, agentId: row.agent_id, type: row.type },
      };
    });
  }

  private async collectReviewQueue(orgId?: string): Promise<HitlQueueItem[]> {
    const sql = orgId
      ? "SELECT * FROM cross_org_review_queue WHERE status = 'pending' AND org_id = ? ORDER BY enqueued_at DESC"
      : "SELECT * FROM cross_org_review_queue WHERE status = 'pending' ORDER BY enqueued_at DESC";
    const stmt = this.db.prepare(sql);
    const result = orgId
      ? await stmt.bind(orgId).all<ReviewQueueRow>()
      : await stmt.all<ReviewQueueRow>();

    return (result.results ?? []).map((row) => ({
      id: row.review_id,
      title: `Expert Review: ${row.assignment_id}`,
      source: "expert-review" as const,
      status: "pending" as const,
      escalated: false,
      confidence: null,
      orgId: row.org_id,
      createdAt: new Date(row.enqueued_at).toISOString(),
      metadata: { assignmentId: row.assignment_id },
    }));
  }

  private async collectArtifactReviews(orgId?: string): Promise<HitlQueueItem[]> {
    const sql = orgId
      ? "SELECT * FROM hitl_artifact_reviews WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20"
      : "SELECT * FROM hitl_artifact_reviews ORDER BY created_at DESC LIMIT 20";
    const stmt = this.db.prepare(sql);
    const result = orgId
      ? await stmt.bind(orgId).all<ArtifactReviewRow>()
      : await stmt.all<ArtifactReviewRow>();

    return (result.results ?? []).map((row) => ({
      id: row.id,
      title: `Artifact Review: ${row.artifact_id}`,
      source: "artifact-review" as const,
      status: "pending" as const,
      escalated: false,
      confidence: null,
      orgId: row.tenant_id,
      createdAt: row.created_at,
      metadata: { artifactId: row.artifact_id, action: row.action },
    }));
  }

  async applyDecision(input: {
    itemId: string;
    source: string;
    action: "approve" | "reject" | "escalate";
    reason?: string;
  }): Promise<{ success: boolean }> {
    if (input.source === "meta-approval") {
      const newStatus = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "pending";
      await this.db
        .prepare(
          `UPDATE agent_improvement_proposals SET status = ?, updated_at = ? WHERE id = ?`,
        )
        .bind(newStatus, new Date().toISOString(), input.itemId)
        .run();
    } else if (input.source === "expert-review") {
      const newStatus = input.action === "approve" ? "signed_off" : input.action === "escalate" ? "in_review" : "pending";
      await this.db
        .prepare(
          `UPDATE cross_org_review_queue SET status = ?, decision = ?, notes = ? WHERE review_id = ?`,
        )
        .bind(newStatus, input.action, input.reason ?? null, input.itemId)
        .run();
    }
    return { success: true };
  }
}
