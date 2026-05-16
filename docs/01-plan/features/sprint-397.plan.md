---
code: FX-PLAN-397
title: F663 HITL 80-20-80 5-state 머신 + hitl_queue + /transition endpoint (gap fill)
version: 1.0
status: Active
category: Plan
phase: 47
sprint: 397
f_items:
  - F663
req:
  - FX-REQ-725
priority: P0
created: 2026-05-16
session: S362
---

# Sprint 397 — F663 HITL 5-state 머신 + hitl_queue 신설 (gap fill)

## §1 컨텍스트

S361 ServerKit Native PRD-final §4.1 #3 진행. **사전 측정 결과 (S362, fs 실측 27회차)** F663 baseline이 이미 F605 era에 부분 구축됨 발견 (gap fill 패턴 4회차 누적).

### 기존 F605 baseline

- `packages/api/src/core/hitl/` 디렉토리 **이미 존재**
  - `types.ts` — HitlSource + HitlStatus(4-state: pending/in_review/escalated/resolved) + HitlAction + **HitlRole 5-역 (Admin/Reviewer/Approver/Operator/Auditor)** + `ROLE_ALLOWED_ACTIONS` (RBAC matrix 이미 완비) + HitlQueueItem + HitlDecisionInput
  - `routes/index.ts` — **`GET /api/hitl/queue`** + **`POST /api/hitl/decision`** (Bearer auth 확인 + HitlDecisionSchema 검증) ✅
  - `services/hitl-queue-collector.service.ts` — HitlQueueCollector (분산 7+ HITL services 통합 collector)
  - `schemas/hitl.ts` — HitlDecisionSchema + HitlQueueQuerySchema
  - `__tests__/hitl-routes.test.ts` + `hitl-queue-collector.test.ts` 2 test files
- `app.ts:357 /api/hitl` **이미 mount**

### F663 진정 gap (F605 baseline 위에 추가)

| # | gap | 해소 |
|---|-----|------|
| (1) | hitl_queue D1 테이블 부재 (5-state 머신 추적용) | D1 0156 신규 |
| (2) | 5-state 머신 (AI_GENERATED → REVIEW_QUEUED → HUMAN_REVIEWED → AI_REVISED → FINAL_APPROVED) 미정의 — 기존 HitlStatus 4-state와 다른 모델 | types.ts HitlState type + state machine guards |
| (3) | `POST /api/hitl/transition` endpoint 부재 | routes/index.ts 추가 |
| (4) | trace_id audit-bus emit 부재 | service에서 emit (F662 패턴 재사용) |
| (5) | RBAC transition 시점 적용 부재 | service에서 ROLE_ALLOWED_ACTIONS 확장 (또는 transition별 별도 matrix) |
| (6) | hitl-state-machine.service.ts 부재 | 신규 service (단일 책임) |

## §2 사전 측정 (fs 실측 27회차)

```
Latest D1 migration: 0155_cq_evaluations_graph_session.sql (F662 직후) → 신규 0156
F605 baseline: core/hitl/ 5 files (types + routes + collector + schemas + 2 test)
RBAC matrix: ROLE_ALLOWED_ACTIONS 5 roles × 3 actions 정의됨 (types.ts:48~54)
4-state HitlStatus (pending/in_review/escalated/resolved) — 5-state와 별 모델
Audit Bus (F606 ✅) emit 패턴: audit-bus.ts:96 INSERT INTO audit_events with trace_id
F662 trace_id 전파 패턴: CQEvaluator.evaluate() → auditBus.emit("cq.evaluated", payload, ctx)
F643 fix 효과 5회차 검증 대기: signal F_ITEMS=F663 + .sprint-context 부재
```

## §3 범위 (Full gap fill)

### (a) D1 migration `0156_hitl_queue_state_machine.sql` 신규

```sql
-- F663: HITL 80-20-80 5-state 머신 hitl_queue 테이블
CREATE TABLE IF NOT EXISTS hitl_queue (
  id TEXT PRIMARY KEY,
  graph_session_id TEXT,
  cq_evaluation_id TEXT,
  org_id TEXT NOT NULL,
  state TEXT NOT NULL,
  reviewer_id TEXT,
  payload TEXT,
  audit_trace_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  transitioned_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (state IN ('AI_GENERATED','REVIEW_QUEUED','HUMAN_REVIEWED','AI_REVISED','FINAL_APPROVED'))
);

CREATE INDEX IF NOT EXISTS idx_hitl_queue_org_state ON hitl_queue(org_id, state);
CREATE INDEX IF NOT EXISTS idx_hitl_queue_graph_session ON hitl_queue(graph_session_id);
CREATE INDEX IF NOT EXISTS idx_hitl_queue_trace ON hitl_queue(audit_trace_id);
```

### (b) `core/hitl/types.ts` 확장 — HitlState + 전환 valid map

```typescript
export const HITL_STATES = [
  "AI_GENERATED",      // 1: AI 80% 자동 생성 직후
  "REVIEW_QUEUED",     // 2: 20% 식별 + 검수 큐 등록
  "HUMAN_REVIEWED",    // 3: 사람 집중 검수 완료
  "AI_REVISED",        // 4: AI 80% 최종 재생성
  "FINAL_APPROVED",    // 5: 사람 최종 체크 입력
] as const;

export type HitlState = (typeof HITL_STATES)[number];

// 유효 전환 map (state machine guards)
export const VALID_TRANSITIONS: Record<HitlState, HitlState[]> = {
  AI_GENERATED: ["REVIEW_QUEUED"],
  REVIEW_QUEUED: ["HUMAN_REVIEWED"],
  HUMAN_REVIEWED: ["AI_REVISED"],
  AI_REVISED: ["FINAL_APPROVED"],
  FINAL_APPROVED: [],  // 최종 상태
};

// transition별 허용 역할 (RBAC matrix 확장)
export const TRANSITION_ALLOWED_ROLES: Record<string, HitlRole[]> = {
  "AI_GENERATED->REVIEW_QUEUED": ["Admin", "Reviewer", "Operator"],
  "REVIEW_QUEUED->HUMAN_REVIEWED": ["Admin", "Reviewer", "Approver"],
  "HUMAN_REVIEWED->AI_REVISED": ["Admin", "Reviewer", "Operator"],
  "AI_REVISED->FINAL_APPROVED": ["Admin", "Approver"],
};

export interface HitlTransitionInput {
  queueItemId: string;
  fromState: HitlState;
  toState: HitlState;
  role: HitlRole;
  reviewerId?: string;
}

export interface HitlTransitionResult {
  id: string;
  graphSessionId?: string;
  cqEvaluationId?: string;
  orgId: string;
  state: HitlState;
  reviewerId?: string;
  auditTraceId: string;
  transitionedAt: number;
}
```

### (c) `core/hitl/services/hitl-state-machine.service.ts` 신규 (별 service)

```typescript
import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import {
  VALID_TRANSITIONS,
  TRANSITION_ALLOWED_ROLES,
  type HitlState,
  type HitlRole,
  type HitlTransitionInput,
  type HitlTransitionResult,
} from "../types.js";

export class HitlStateMachine {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async createInitial(orgId: string, graphSessionId?: string, cqEvaluationId?: string, payload?: string): Promise<HitlTransitionResult> {
    const id = crypto.randomUUID();
    const traceId = generateTraceId();
    const now = Date.now();
    await this.db.prepare(
      `INSERT INTO hitl_queue (id, graph_session_id, cq_evaluation_id, org_id, state, payload, audit_trace_id, transitioned_at)
       VALUES (?, ?, ?, ?, 'AI_GENERATED', ?, ?, ?)`,
    ).bind(id, graphSessionId ?? null, cqEvaluationId ?? null, orgId, payload ?? null, traceId, now).run();
    const ctx = { traceId, spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit("hitl.state.created", { id, orgId, state: "AI_GENERATED", graphSessionId, cqEvaluationId }, ctx);
    return { id, graphSessionId, cqEvaluationId, orgId, state: "AI_GENERATED", auditTraceId: traceId, transitionedAt: now };
  }

  async transition(input: HitlTransitionInput): Promise<HitlTransitionResult | { error: string }> {
    const { queueItemId, fromState, toState, role, reviewerId } = input;
    // 1. State machine guard
    const validTargets = VALID_TRANSITIONS[fromState] ?? [];
    if (!validTargets.includes(toState)) {
      return { error: `Invalid transition: ${fromState} → ${toState}` };
    }
    // 2. RBAC check
    const transitionKey = `${fromState}->${toState}`;
    const allowedRoles = TRANSITION_ALLOWED_ROLES[transitionKey] ?? [];
    if (!allowedRoles.includes(role)) {
      return { error: `Role '${role}' not allowed for transition '${transitionKey}'` };
    }
    // 3. fetch current item + state verification
    const row = await this.db.prepare(
      `SELECT id, graph_session_id, cq_evaluation_id, org_id, state, audit_trace_id FROM hitl_queue WHERE id = ?`,
    ).bind(queueItemId).first<{ id: string; graph_session_id: string | null; cq_evaluation_id: string | null; org_id: string; state: string; audit_trace_id: string }>();
    if (!row) return { error: "Queue item not found" };
    if (row.state !== fromState) return { error: `State mismatch: db=${row.state}, expected=${fromState}` };
    // 4. UPDATE state + reviewer_id + transitioned_at
    const now = Date.now();
    await this.db.prepare(
      `UPDATE hitl_queue SET state = ?, reviewer_id = ?, transitioned_at = ? WHERE id = ?`,
    ).bind(toState, reviewerId ?? null, now, queueItemId).run();
    // 5. audit-bus emit (trace_id 전파)
    const ctx = { traceId: row.audit_trace_id, spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit(`hitl.state.${toState.toLowerCase()}`, {
      id: queueItemId, orgId: row.org_id, fromState, toState, role, reviewerId,
    }, ctx);
    return {
      id: queueItemId,
      graphSessionId: row.graph_session_id ?? undefined,
      cqEvaluationId: row.cq_evaluation_id ?? undefined,
      orgId: row.org_id,
      state: toState,
      reviewerId,
      auditTraceId: row.audit_trace_id,
      transitionedAt: now,
    };
  }
}
```

### (d) `core/hitl/routes/index.ts` `/transition` endpoint 추가

```typescript
hitlApp.post("/transition", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = HitlTransitionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400);
  const auditBus = new AuditBus(c.env.DB, c.env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
  const sm = new HitlStateMachine(c.env.DB, auditBus);
  const result = await sm.transition(parsed.data);
  if ("error" in result) return c.json(result, 400);
  return c.json(result, 200);
});
```

### (e) `core/hitl/schemas/hitl.ts` HitlTransitionSchema 추가

```typescript
export const HitlTransitionSchema = z.object({
  queueItemId: z.string().uuid(),
  fromState: z.enum(HITL_STATES),
  toState: z.enum(HITL_STATES),
  role: z.enum(["Admin","Reviewer","Approver","Operator","Auditor"]),
  reviewerId: z.string().optional(),
});
```

### (f) Integration test 신규

- `packages/api/src/core/hitl/__tests__/hitl-state-machine.test.ts` ~150L
  - T1: createInitial → AI_GENERATED row INSERT + audit emit
  - T2: AI_GENERATED → REVIEW_QUEUED 정상 (Reviewer role)
  - T3: invalid transition (AI_GENERATED → FINAL_APPROVED) → error
  - T4: RBAC denied (Operator role for HUMAN_REVIEWED→AI_REVISED) → error
  - T5: state mismatch → error
  - T6: full lifecycle 5 transitions PASS + trace_id chain valid

## §4 구현 단계 (TDD Red → Green)

1. **Red**: hitl-state-machine.test.ts 작성 (T1~T6 FAIL 확인)
2. **Green Step 1**: migration 0156 작성
3. **Green Step 2**: types.ts HITL_STATES + VALID_TRANSITIONS + TRANSITION_ALLOWED_ROLES + types
4. **Green Step 3**: schemas/hitl.ts HitlTransitionSchema 추가
5. **Green Step 4**: hitl-state-machine.service.ts 신규
6. **Green Step 5**: routes/index.ts /transition endpoint 추가
7. typecheck + tests GREEN 확증
8. PR 생성 + auto-merge

## §5 파일 매핑

### 신규
- `packages/api/src/db/migrations/0156_hitl_queue_state_machine.sql` (~20L)
- `packages/api/src/core/hitl/services/hitl-state-machine.service.ts` (~120L)
- `packages/api/src/core/hitl/__tests__/hitl-state-machine.test.ts` (~150L)

### 수정
- `packages/api/src/core/hitl/types.ts` (+45L HITL_STATES + 전환 maps + 새 interface)
- `packages/api/src/core/hitl/schemas/hitl.ts` (+10L HitlTransitionSchema)
- `packages/api/src/core/hitl/routes/index.ts` (+15L /transition endpoint)

### 산출물 (reports — S360 hallucination 회피 강제)
- `reports/sprint-397-hitl-state-machine-transitions.md` — 5 transition 동작 증거
- `reports/sprint-397-rbac-denied-samples.md` — RBAC denied 3 케이스+
- `docs/02-design/features/sprint-397.design.md` — autopilot 자동 생성
- `docs/04-report/features/sprint-397.report.md` — autopilot 자동 생성 (S362 학습 강제: report.md autopilot 누락 패턴 차단)
- `docs/metrics/velocity/sprint-397.json` — autopilot 자동 생성 (f_items "F663" 정확 + duration 정확)

## §6 Out-of-scope

- **F664 HITL Console UI** — Sprint 398 (별 sprint). Console UI에서 5-state 시각화 + transition 트리거 form.
- **F665 CQ 작성 가이드** — Sprint 398+
- **AI_REVISED 단계 실 LLM 재호출 로직** — 본 sprint는 state 머신 + endpoint만, 실 AI 재생성은 F664/F665에서
- **graph_session 종결 hook 자동 createInitial** — F662 autoTriggerCQEvaluator 직후 추가 가능하지만 본 sprint scope 외 (cq_evaluation_id FK로 연결 가능)
- **HitlQueueCollector(F605) 5-state 통합 조회** — 본 sprint는 hitl_queue 단일 테이블만, 통합은 F664에서
- **확장 RBAC matrix 외 새 role 추가** — 5 role 그대로 유지

## §7 Phase Exit P-a~P-h (Smoke Reality 8항)

| # | 항목 | 판정 기준 |
|---|------|----------|
| **P-a** | migration 0156 apply + hitl_queue 테이블 + 3 INDEX 검증 | PRAGMA table_info(hitl_queue) → 5-state CHECK 확증 |
| **P-b** | createInitial → AI_GENERATED row INSERT 동작 | T1 PASS |
| **P-c** | 5 valid transitions 모두 PASS | T6 full lifecycle T2/T3/T4/T5/T6 |
| **P-d** | invalid transition (AI_GENERATED → FINAL_APPROVED) → 400 error | T3 PASS |
| **P-e** | RBAC denied (Operator for HUMAN_REVIEWED→AI_REVISED) → 400 error | T4 PASS |
| **P-f** | audit-bus emit `hitl.state.*` + trace_id chainValid=true (5 events for full lifecycle) | T6 audit_events row 6건 검증 (createInitial + 5 transition) |
| **P-g** | `pnpm exec tsc --noEmit` PASS (S337 turbo 우회) + msa-lint PASS (S360 학습) | --force cache 0 + 0 errors |
| **P-h** | dual_ai_reviews hook 자동 INSERT ≥ 1건 + 61 sprint streak | 누적 ≥ 60 |

## §8 위험 + 대응

| 위험 | 확률 | 영향 | 대응 |
|------|-----|------|------|
| autopilot이 F605 HitlStatus 4-state와 신규 HitlState 5-state 혼동 | 중 | 중 | Plan §3 (b) "별 모델 분리 명시 — HitlStatus(4-state)는 큐 status, HitlState(5-state)는 80-20-80 머신" 강제 |
| transition concurrency race (2 reviewer 동시 transition) | 낮음 | 중 | 본 sprint MVP — SELECT FOR UPDATE 또는 optimistic version 컬럼 없이 last-write-wins. F664+에서 강화 가능 |
| RBAC matrix 누락 transition (예: AI_GENERATED→AI_REVISED 직진) | 낮음 | 중 | VALID_TRANSITIONS는 1 → 1만 허용 (linear), 분기 없음 |
| autopilot velocity stale 답습 (S360+S362 누적 2회차) | **높음** | 낮음 | Plan §5 "f_items: 'F663' 정확 + duration_minutes 정확" 강제 명시 |
| autopilot report.md 누락 (S362 관찰) | **높음** | 낮음 | Plan §5 "docs/04-report/features/sprint-397.report.md autopilot 자동 생성 의무" 강제 명시 |
| Production smoke 14회차 변종 재현 | 낮음 | 중 | reports/sprint-397-*.md 신규 2건+ 의무화 + msa-lint 사전 검증 |

## §9 다음 사이클 후보 (out-of-scope)

- **F664 Sprint 398** — HITL Console UI (5-state 시각화 + transition form + audit drawer)
- **F665 Sprint 398+** — CQ 작성 가이드 + AI 금지 강제
- F647 sidebar Portal race / F645 silent layer 7
- W20 KPI 6/8 베이스라인 측정
- Cloudflare KV 점수 캐싱 PoC

## §10 메타 학습 (S362 누적)

- **Plan fs 실측 의무화 27회차 정착화** — F663 row PRD 가정 "hitl_queue 신규" + "5-state 머신 신설" 모두 정확 (F605 baseline은 별 모델 4-state HitlStatus). 사전 측정으로 두 모델 분리 인지 + 진정한 작업 식별.
- **gap fill 패턴 4회차 누적** (S280/S282/S362-F662/S362-F663) — F605 baseline + F662 trace_id 전파 패턴 재사용으로 60~90분 예상 → ~30~45분.
- **autopilot 학습 누적 강제 명시** — S360+S362 velocity/report.md 누락 패턴 2회 → Plan §8에 "높은 확률" 위험 명시 + §7 P-h에 60+ sprint streak 강제. autopilot이 학습 대상으로 이를 인지하면 누락 회피 가능 (의식적 학습 적용 19회차 변종 정착화 패턴).
- **F643 fix 효과 5회차 검증 기회** — signal F_ITEMS=F663 + .sprint-context 부재 예상.
- **61 sprint streak 도전** — S306~S357 + F619 + F621 + F660 + F661 + F662 + F663 = 61 baseline.
