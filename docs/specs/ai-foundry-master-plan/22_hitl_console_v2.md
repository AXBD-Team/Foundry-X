---
code: AIF-DOC-022
type: spec
phase: 47
sprint: 393
status: active
created: 2026-05-10
updated: 2026-05-12
version: v2
predecessor: 22_hitl_console_v1.md (v1, Sprint 378 작성, 보존)
related_docs:
  - 17_internal_dev_plan_with_besir_v2.md (Tier 진척 F605 ✅ + F621 ✅)
  - 20_live_demo_scenario_v2.md (Step 4 ethics + Step 7 /operations 통합)
  - 21_kpi_calculation_table_v2.md (KPI-6 hitl_avg_processing + KPI-8 차단율)
---

# 22. HITL Console v2 — F605 production + F621 4 본부 통합 모니터링

## 0. v1 → v2 변경 요약

| 항목 | v1 (Sprint 378 작성) | v2 (S357, 2026-05-12) |
|------|----------------------|------------------------|
| F605 상태 | active (작성 중) | **✅ MERGED** (Sprint 378 ✅, master HEAD `eb8185a4` 검증) |
| 통합 화면 | `/hitl-console` 단일 | + **`/operations` (F621) 4 본부 동시 HITL 모니터링** |
| RBAC | mock 정책 명시 | + **JWT claims 강제는 F601 SSO unlock 후 후속 F-item 명시** |
| applyDecision | 3 source 분기 (스펙) | + **실 구현 = meta-approval + expert-review 2 source D1 UPDATE / artifact-review = stub success** (Production 정합성) |
| Escalation 룰 | confidence < 0.7 | + **HITL_CONFIDENCE_THRESHOLD = 0.7 상수 + meta-approval rubric_score만 escalated 산정 / expert-review + artifact-review는 escalated=false 기본** |
| F607 연동 | 미명시 | + **F607 kill_switch와 trace_id chain 통합** (Step 4 → Step 5 audit chain) |
| 5/14 dry-run 매핑 | 미명시 | + **`/api/hitl/queue` 실측 + Step 7 4 본부 OrgHitlPanel 화면 시연** |

---

## 1. 개요 (v1 + v2 확장)

AI 에이전트 결정 중 신뢰도가 낮거나(confidence < 0.7) 사람 검토가 필요한 항목을 단일 콘솔에서 통합 관리하는 Console UI.

**목표**: 분산된 7+ HITL 서비스의 pending 큐를 하나의 화면에서 승인·거부·에스컬레이션할 수 있는 운영 콘솔 제공.

**v2 추가**: F621 운영 통합 대시보드(`/operations`)에서 4 본부(KOAMI/AXIS-DS/Decode-X/Foundry-X)의 HITL 메트릭을 한 화면에서 동시 모니터링.

---

## 2. 아키텍처 (v2 갱신)

```
[Web] /hitl-console (F605, Sprint 378 ✅)
  └── HitlMetricsTile     — pending/escalated/avgConfidence 요약
  └── HitlQueueTable      — 분산 큐 통합 표시 + 액션 버튼
  └── HitlDecisionForm    — 선택 항목 승인/거부/에스컬레이션 폼
  └── HitlEscalationBadge — confidence 시각화

[Web] /operations (F621, Sprint 393 ✅) ★ NEW v2
  └── OrgHitlPanel × 4 (본부별)
       ├── HitlMetricsTile (F605 재사용, orgId filter via metricsFromQueue())
       └── HitlEscalationBadge (F605 재사용)
  └── (KPI panel과 column 단위로 동거)

[API] GET /api/hitl/queue → HitlQueueCollector (Sprint 378 ✅)
  ├── agent_improvement_proposals     (F530 MetaApproval, meta-approval source)
  ├── cross_org_review_queue          (F620 ExpertReviewManager, expert-review source)
  └── hitl_artifact_reviews           (F266 HitlReviewService, artifact-review source)

[API] POST /api/hitl/decision → applyDecision() (Sprint 378 ✅)
  ├── meta-approval     → agent_improvement_proposals UPDATE status
  ├── expert-review     → cross_org_review_queue UPDATE status + decision + notes
  └── artifact-review   → stub success (TODO: 후속 F-item)

[Ethics F607] kill_switch_state ← escalated 항목 trace_id로 연계 (NEW v2)
[Audit F642 ] trace_id chain ← Step 4 ethics → Step 5 audit log 통합 (NEW v2)
```

---

## 3. API Contract (v1 + v2 정합성 검증)

### 3.1 GET /api/hitl/queue (v1 그대로)

**Auth**: `Authorization: Bearer <JWT>` 필수 (없으면 401 fast — lightweight auth)

**Query params**:
- `orgId` (optional, string)
- `escalatedOnly` (optional, boolean)

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

**Response 401**: `{ "error": "Unauthorized" }` — Authorization 헤더 부재 또는 Bearer 형식 아님

### 3.2 POST /api/hitl/decision (v1 그대로 + v2 source별 실 구현 명시)

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

**Response 400**: 필수 필드 누락 (itemId, source, action) — zod schema validation

**Response 401**: 인증 토큰 없음

### 3.3 NEW v2 — source별 D1 UPDATE 실 구현

| source | D1 테이블 | UPDATE 컬럼 | action → status 매핑 |
|--------|-----------|--------------|----------------------|
| `meta-approval` | `agent_improvement_proposals` | status + updated_at | approve → approved / reject → rejected / escalate → pending |
| `expert-review` | `cross_org_review_queue` | status + decision + notes | approve → signed_off / escalate → in_review / reject → pending |
| `artifact-review` | (미구현) | — | **stub: `{success: true}` 응답만, D1 UPDATE 없음** (TODO 후속 F-item) |

**시연 시 안전 룰** (NEW v2): 5/14 dry-run에서 artifact-review POST 시도 시 success 200 받지만 D1 변화 없음 — 5/15 미팅에서는 meta-approval 또는 expert-review 시연만 권장.

---

## 4. Escalation Rule (v2 정밀화)

**상수**: `HITL_CONFIDENCE_THRESHOLD = 0.7` (`core/hitl/types.ts:45`)

**source별 escalated 산정**:

| source | escalated 산정 로직 | confidence 출처 |
|--------|---------------------|------------------|
| `meta-approval` | `rubric_score !== null && rubric_score < 0.7` | `agent_improvement_proposals.rubric_score` |
| `expert-review` | `false` (기본) | `null` (rubric 시스템 미적용) |
| `artifact-review` | `false` (기본) | `null` (현재 escalation 없음) |

**UI 시각화**:
- escalation 항목은 빨간 배지(`⬆ escalated`)로 시각화 (`HitlEscalationBadge`)
- `GET /queue?escalatedOnly=true`로 필터링 가능 (frontend-side filter via `response.items.filter(i => i.escalated)`)

**NEW v2 — F607 ethics escalation과의 차이**:
- **HITL escalation**: meta-approval rubric_score < 0.7 → 사람 검토 큐로 진입
- **F607 ethics escalation**: confidence < 0.7 → kill_switch 활성화 가능
- **두 룰 모두 threshold 0.7로 일관** — PRD §6.4 단일 정책

---

## 5. RBAC 5역 Mock (v1 + v2 후속 명시)

| 역할 | 허용 액션 | 비고 |
|------|----------|------|
| Admin | approve, reject, escalate | 전체 권한 |
| Reviewer | approve, reject, escalate | Admin과 동일 |
| Approver | approve, reject | escalate 불가 (의사결정 한정) |
| Operator | (없음 — view only) | 모니터링만 |
| Auditor | (없음 — view only) | 감사 목적, 변경 불가 |

**v1 그대로 + v2 후속 명시**:
- 현재 = **type-level 정의만** (`ROLE_ALLOWED_ACTIONS: Record<HitlRole, HitlAction[]>` in `types.ts`)
- 실 JWT claims 강제는 **F601 SSO unlock 후 후속 F-item** (W19+ BeSir 미팅 결과 따라 시동)
- 시연 시: 5/15 미팅에서는 mock 정책만 설명, 본 시점 production에서는 누구나 모든 액션 가능

---

## 6. 통합 소스 3종 (v1 + v2 production 검증)

| 소스 | 서비스 | D1 테이블 | Sprint | applyDecision 구현 |
|------|--------|-----------|--------|---------------------|
| `meta-approval` | MetaApprovalService | `agent_improvement_proposals` | F530 (Sprint 283) | ✅ status + updated_at UPDATE |
| `expert-review` | ExpertReviewManager | `cross_org_review_queue` | F620 | ✅ status + decision + notes UPDATE |
| `artifact-review` | HitlReviewService | `hitl_artifact_reviews` | F266 | ⚠️ stub success (D1 UPDATE 없음, TODO 후속) |

---

## 7. NEW v2 — F621 운영 통합 화면 HITL 패널

### 7.1 OrgHitlPanel 구조 (`/operations` 본문 일부)

```
─ 본부 column (예: KOAMI) ─────────────────────────────
│  [KPI section]                                       │
│  MetricGrid (KPI 4 위젯)                              │
├──────────────────────────────────────────────────────┤
│  [HITL section]                                       │
│  ┌─ HitlMetricsTile (F605 재사용) ─────────────────┐ │
│  │ pending: X / escalated: Y / avgConfidence: Z   │ │
│  │ HitlEscalationBadge (escalated > 0 시 빨간색)   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 7.2 frontend filtering (NEW v2 옵션 B)

`packages/web/src/routes/operations.tsx:49` `metricsFromQueue()`:

```typescript
function metricsFromQueue(data: HitlQueueResponse | null, orgId: string): HitlMetrics {
  const items = data?.items.filter((item) => !item.orgId || item.orgId === orgId) ?? [];
  return {
    pending: items.filter((i) => i.status === "pending" || i.status === "in_review").length,
    escalated: items.filter((i) => i.escalated).length,
    approvedToday: 0,
    avgConfidence:
      items.length > 0
        ? items.reduce((sum, i) => sum + (i.confidence ?? 0), 0) / items.length
        : null,
  };
}
```

**핵심 패턴**:
- 단일 `GET /api/hitl/queue` 호출 응답을 4 본부별로 client-side filter
- backend API 변경 0건 (옵션 B frontend filtering)
- F601 SSO unlock 후 backend orgId filter API 호출로 swap 가능 (~5분 코드 변경)

### 7.3 시연 시 안전 룰 (NEW v2)

- `HitlQueueItem.orgId`는 source별로 다름:
  - **meta-approval**: undefined (current schema, sessionId 안에서 추출 가능)
  - **expert-review**: `cross_org_review_queue.org_id` 그대로
  - **artifact-review**: `hitl_artifact_reviews.tenant_id` (orgId 대용)
- frontend filter 식: `!item.orgId || item.orgId === orgId` — orgId 없으면 모든 본부에 표시 (graceful)
- 시연 시 4 본부 column에 동일 meta-approval 항목이 4번 표시될 수 있음 (orgId 부재 시) — "전사 공통 항목"으로 reframing

---

## 8. NEW v2 — 20 demo v2 Step 4/Step 7 통합 시연

### 8.1 Step 4 ethics → Step 7 HITL 화면 연결

```
[Step 4 F607]
  POST /api/ethics/check-confidence
  → response.action = "escalate_to_hitl"
  → response.violation_id = "viol-001"
  → response.audit_event_id = "evt_ethics_001"
  → response.trace_id = "trc-demo-2026-05-15"

         ↓ (trace_id chain)

[Step 5 F642] GET /api/audit/log/by-trace
  → 4 events 모두 회수, evt_ethics_001 포함

         ↓ (운영 통합 모니터링)

[Step 7 F621] /operations
  → OrgHitlPanel.pending +1 (escalation 큐로 진입)
  → OrgHitlPanel.escalated +1 (HITL_CONFIDENCE_THRESHOLD 미달)
  → HitlEscalationBadge 빨간색 표시
  → 본부장이 즉시 식별 → /hitl-console로 이동 → 승인/거부/에스컬레이션
```

### 8.2 시연 멘트 (NEW v2)

> "AI 에이전트가 confidence 0.65로 결정을 내릴 때 자동으로 HITL escalation. 본부장은 4 본부 운영 통합 화면에서 빨간 배지로 즉시 식별 가능. 클릭하면 HITL Console에서 승인/거부 결정 가능. 모든 액션은 trace_id로 audit log에 영구 기록."

이 멘트로 **Step 4 ethics + Step 7 HITL + Step 5 audit 3단계가 단일 trace_id chain**임을 강조.

---

## 9. Phase Exit Smoke Reality (v1 그대로 + v2 검증)

| 항목 | 체크 방법 | v2 검증 결과 (S357 master `eb8185a4`) |
|------|-----------|---------------------------------------|
| P-a | `ls packages/web/src/components/hitl-console/` — 4 widgets + types + index | ✅ HitlDecisionForm/HitlEscalationBadge/HitlMetricsTile/HitlQueueTable + index.ts + types.ts |
| P-b | `ls packages/api/src/core/hitl/` — routes/ + services/ + schemas/ + types.ts | ✅ routes/index.ts + services/hitl-queue-collector.service.ts + schemas/ + types.ts + __tests__/ |
| P-c | `curl -s -w "\n%{http_code}" /api/hitl/queue` → 401 | ✅ S357 검증 |
| P-d | `curl -s -X POST -w "\n%{http_code}" /api/hitl/decision` → 401 | ✅ S357 검증 |
| P-e | `grep hitl-console packages/web/src/router.tsx` — 등록 확인 | ✅ line 122 |
| P-f | `pnpm --filter @foundry-x/api test -- hitl` PASS (7 tests) | ✅ Sprint 378 PASS |
| P-g | `pnpm exec tsc --noEmit` (turbo 우회) + `pnpm lint:msa-baseline` 회귀 0 | ✅ Sprint 378 검증 |
| P-h | openapi-spec.test.ts 회귀 0 | ✅ Sprint 378 검증 |
| P-i | `dual_ai_reviews` Sprint 378 INSERT ≥ 1건 | ✅ Sprint 378 검증 |
| **P-j (NEW v2)** | `grep operations packages/web/src/router.tsx` — F621 등록 확인 | ✅ line 136 (F621 ✅ Sprint 393) |
| **P-k (NEW v2)** | `grep HitlMetricsTile packages/web/src/components/operations/OrgHitlPanel.tsx` — F605 재사용 확인 | ✅ S357 검증 |

---

## 10. NEW v2 — 5/14 dry-run + 5/15 미팅 시연 시 HITL 기대값

### 10.1 dry-run 사전 D1 시드 후

| Source | D1 테이블 | 시드 권장 | 시연 표시 |
|--------|-----------|----------|-----------|
| meta-approval | `agent_improvement_proposals` | 1건 (rubric_score=0.65로 escalated 시연) | escalated 배지 빨간색 |
| expert-review | `cross_org_review_queue` | 1건 (status='pending', org_id='demo-org') | pending count +1 |
| artifact-review | `hitl_artifact_reviews` | 1건 (tenant_id='demo-org') | pending count +1 |

### 10.2 5/14 dry-run 점검 항목 (20 demo v2 §5.2 E + F 추가)

> ⚠️ **5/13 D-2 production 실측 보강 (S358+)**: `/api/hitl/queue`는 **production D1 전체** 응답이라 시드 10건 + 운영 누적 ~34건 = **total 44** 표시됨. 단 escalatedCount=1만 정확히 시드(prop-demo-001 rubric_score=0)와 일치. 5/15 시연 시 escalated 배지만 강조 권장.

| # | 점검 | 기대 결과 | 5/13 실측 |
|---|------|----------|----------|
| 1 | `curl GET /api/hitl/queue` (JWT 있음) | 200 + items 3 source 합산 | ✅ 200 + total=**44** (시드 10 + 운영 누적 ~34 discovery-stage-runner) |
| 2 | `escalatedCount` | 1 (meta-approval rubric_score=0) | ✅ **1** (prop-demo-001 정확) |
| 3 | `curl POST /api/hitl/decision` meta-approval approve | 200 + D1 status='approved' 확인 | (5/14 dry-run 실 호출) |
| 4 | `curl POST /api/hitl/decision` expert-review escalate | 200 + D1 status='in_review' 확인 | (5/14 dry-run 실 호출) |
| 5 | `curl POST /api/hitl/decision` artifact-review approve | 200 (stub success) — D1 변화 없음 (TODO 명시) | (5/14 dry-run 실 호출) |
| 6 | `/operations` 4 본부 column OrgHitlPanel pending count | 본부별 frontend filter 결과 표시 | (5/14 브라우저 실 확인) |
| 7 | `/operations` HitlEscalationBadge | escalated > 0 본부만 빨간 배지 | (5/14 브라우저 실 확인 — meta orgId=undefined로 4 본부 모두 1건 표시) |

**시연 멘트 (5/15 미팅)**: total=44는 "운영 자동 제안 큐 누적 — discovery-stage-runner가 매 sprint마다 self-reflection / token-budget / context compression 제안 등록"으로 reframe. escalated=1 빨간 배지만 직접 가리키며 "BeSir demo 시나리오 rubric_score=0 제안이 자동 escalated 처리되어 본부장 결재 대기" 시연.

---

## 11. 잔존 후속 F-item (NEW v2)

본 v2 시점 production에 미반영된 항목 — 5/15 미팅 후 sprint 시동 검토:

| 항목 | 의존 | 추정 시간 |
|------|------|----------|
| `artifact-review` applyDecision D1 UPDATE 구현 | 없음 (즉시 가능) | ~15분 |
| RBAC 5역 JWT claims 강제 | F601 SSO unlock | ~30분 (claims parsing + role guard middleware) |
| HitlQueueItem orgId 정합성 (meta-approval에 orgId 명시) | agent_improvement_proposals schema 갱신 | ~20분 (D1 migration + service 수정) |
| HITL escalation → kill_switch trigger 자동화 | F607 ✅ + F605 ✅ + trace_id | ~25분 (audit-bus event listener) |
| approvedToday 메트릭 산정 (현재 frontend 하드코딩 = 0) | hitl_decisions audit table | ~20분 |

---

## 12. 이력

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| v1 | 2026-05-10 | 최초 작성 (F605 Sprint 378 작성 시점). 아키텍처 + API contract + 3 source 통합 + Phase Exit Smoke | Sinclair |
| v2 | 2026-05-12 | F605 ✅ MERGED 검증 + F621 ✅ 4 본부 통합 매핑 + source별 D1 UPDATE 실 구현 + escalated 산정 source별 분기 + F607 trace_id 통합 + 20 demo v2 Step 4/7 시연 시나리오 + RBAC 후속 F-item + dry-run 점검 7 항목 + 잔존 후속 5 F-item. v1 보존, v2 정본 | Sinclair (S357) |

---

**Status**: v2.0 (S357, 2026-05-12) — F605 production 검증 + F621 4 본부 통합 모니터링 매핑 + 20 demo v2 Step 4/7 통합 시연 + 잔존 5 F-item 후속 명시. 5/14 BeSir D-2 dry-run + 5/15 W19 본 미팅 정본 HITL 자료.
