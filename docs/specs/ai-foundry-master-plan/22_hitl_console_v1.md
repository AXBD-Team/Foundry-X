---
code: AIF-DOC-022
type: spec
phase: 47
sprint: 378
status: active
created: 2026-05-10
---

# 22. HITL Console v1 — AI Foundry P0-6

## 1. 개요

AI 에이전트 결정 중 신뢰도가 낮거나(confidence < 0.7) 사람 검토가 필요한 항목을 단일 콘솔에서 통합 관리하는 Console UI.

**목표**: 분산된 7+ HITL 서비스의 pending 큐를 하나의 화면에서 승인·거부·에스컬레이션할 수 있는 운영 콘솔 제공.

## 2. 아키텍처

```
[Web] /hitl-console
  └── HitlMetricsTile — pending/escalated/avgConfidence 요약
  └── HitlQueueTable  — 분산 큐 통합 표시 + 액션 버튼
  └── HitlDecisionForm — 선택 항목 승인/거부/에스컬레이션 폼
  └── HitlEscalationBadge — confidence 시각화

[API] GET /api/hitl/queue → HitlQueueCollector
  ├── agent_improvement_proposals (F530 MetaApproval)
  ├── cross_org_review_queue (F620 ExpertReviewManager)
  └── hitl_artifact_reviews (F266 HitlReviewService)

[API] POST /api/hitl/decision → applyDecision()
  └── source별 D1 UPDATE 분기
```

## 3. API Contract

### GET /api/hitl/queue

**Query params**: `orgId` (optional), `escalatedOnly` (boolean, optional)

**Response 200**:
```json
{
  "items": [
    {
      "id": "prop-uuid",
      "title": "Agent Proposal: improvement",
      "source": "meta-approval",
      "status": "pending",
      "escalated": true,
      "confidence": 0.6,
      "orgId": "org-1",
      "createdAt": "2026-05-10T00:00:00Z",
      "metadata": { "sessionId": "...", "agentId": "...", "type": "improvement" }
    }
  ],
  "total": 1,
  "escalatedCount": 1,
  "collectedAt": "2026-05-10T15:00:00Z"
}
```

**Response 401**: 인증 토큰 없음

### POST /api/hitl/decision

**Body**:
```json
{
  "itemId": "prop-uuid",
  "source": "meta-approval",
  "action": "approve",
  "reason": "optional reason text"
}
```

**source enum**: `meta-approval` | `expert-review` | `artifact-review`

**action enum**: `approve` | `reject` | `escalate`

**Response 200**: `{ "success": true }`

**Response 400**: 필수 필드 누락 (itemId, source, action)

**Response 401**: 인증 토큰 없음

## 4. Escalation Rule

`confidence < 0.7` → `escalated: true` 자동 마킹

- `agent_improvement_proposals.rubric_score`를 confidence 프록시로 사용
- 에스컬레이션 항목은 UI에서 빨간 배지(`⬆ escalated`)로 시각화
- `GET /queue?escalatedOnly=true`로 필터링 가능

## 5. RBAC 5역 Mock

| 역할 | 허용 액션 |
|------|----------|
| Admin | approve, reject, escalate |
| Reviewer | approve, reject, escalate |
| Approver | approve, reject |
| Operator | (없음 — view only) |
| Auditor | (없음 — view only) |

> v1은 mock 정책. 실제 JWT claims 기반 강제는 Phase 후속 F-item으로 처리.

## 6. 통합 소스 3종

| 소스 | 서비스 | D1 테이블 | Sprint |
|------|--------|-----------|--------|
| `meta-approval` | MetaApprovalService | `agent_improvement_proposals` | F530 (Sprint 283) |
| `expert-review` | ExpertReviewManager | `cross_org_review_queue` | F620 |
| `artifact-review` | HitlReviewService | `hitl_artifact_reviews` | F266 |

## 7. Phase Exit Smoke Reality (P-a~P-i)

| 항목 | 체크 방법 |
|------|----------|
| P-a | `ls packages/web/src/components/hitl-console/` — 4 widgets + types + index |
| P-b | `ls packages/api/src/core/hitl/` — routes/ + services/ + schemas/ + types.ts |
| P-c | `curl -s -w "\n%{http_code}" /api/hitl/queue` → 401 |
| P-d | `curl -s -X POST -w "\n%{http_code}" /api/hitl/decision` → 401 |
| P-e | `grep hitl-console packages/web/src/router.tsx` — 등록 확인 |
| P-f | `pnpm --filter @foundry-x/api test -- hitl` PASS (7 tests) |
| P-g | `pnpm exec tsc --noEmit` (turbo 우회) + `pnpm lint:msa-baseline` 회귀 0 |
| P-h | openapi-spec.test.ts 회귀 0 |
| P-i | `dual_ai_reviews` Sprint 378 INSERT ≥ 1건 |
