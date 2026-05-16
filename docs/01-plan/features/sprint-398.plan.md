---
code: FX-PLAN-398
title: F664 HITL Console UI 5-state 시각화 + transition trigger + audit drawer (gap fill)
version: 1.0
status: Active
category: Plan
phase: 47
sprint: 398
f_items:
  - F664
req:
  - FX-REQ-726
priority: P0
created: 2026-05-16
session: S362
---

# Sprint 398 — F664 HITL Console UI 5-state + /transition + audit drawer (gap fill)

## §1 컨텍스트

S361 ServerKit Native PRD-final §4.1 #4 진행. **사전 측정 (S362, fs 실측 28회차, gap fill 5회차)** F605 packages/web baseline 거의 완비 발견.

### 기존 F605 baseline (packages/web)

- `packages/web/src/routes/hitl-console.tsx` (135L) — `Component` export + `useHitlQueue` hook + 2-tab (전체/에스컬레이션) ✅
- `packages/web/src/components/hitl-console/` 4 widgets + index + types
  - HitlDecisionForm (116L) — approve/reject/escalate 액션
  - HitlQueueTable (112L) — 큐 row 렌더링
  - HitlMetricsTile (46L) — 큐 metrics
  - HitlEscalationBadge (36L) — escalation 시각화
- `packages/web/src/router.tsx:122` `hitl-console` route lazy mount ✅
- `packages/web/src/__tests__/hitl-console-components.test.tsx` (51L) 4 widget tests
- `packages/web/e2e/hitl-review.spec.ts` (254L) 4-state HITL review e2e
- API: `GET /api/hitl/queue` + `POST /api/hitl/decision` (F605) + **`POST /api/hitl/transition` (F663) ✅**
- Audit API: `GET /api/audit/log/by-trace` (F660 ✅)

### F664 진정 gap (5종)

| # | gap | 해소 |
|---|-----|------|
| (1) | 5-state 다이어그램 시각화 (HitlStateDiagram component) 부재 | 신규 component (AI_GENERATED → REVIEW_QUEUED → HUMAN_REVIEWED → AI_REVISED → FINAL_APPROVED 가로 chain + current state highlight) |
| (2) | DecisionForm에 transition trigger 부재 (현재 4-action approve/reject/escalate만) | 새 props `mode: "decision" \| "transition"` + state 머신 모드일 때 fromState/toState/role 입력 |
| (3) | audit_events drawer (trace_id별 chain visualization) 부재 | 신규 component HitlAuditDrawer (item 선택 시 trace_id로 `GET /api/audit/log/by-trace` 호출 + chain 표시) |
| (4) | RBAC 필드 자동 채움 부재 | JWT에서 role 추출 (jwt-decode 또는 기존 hook 활용) + transition 허용 여부 prefilter |
| (5) | e2e 5-state spec 부재 | `packages/web/e2e/hitl-state-machine.spec.ts` 신규 4 spec (queue 5-state filter / transition trigger / audit drawer / RBAC denied) |

## §2 사전 측정 (fs 실측 28회차)

```
F605 baseline: web 8 files (1 route + 4 widget + index + types + test) + 1 e2e spec
F663 API: POST /api/hitl/transition (Sprint 397 PR #824 MERGED)
F660 API: GET /api/audit/log/by-trace (Sprint 394 PR #817 MERGED)
HitlState 5-state (F663 packages/api types.ts) ↔ HitlStatus 4-state (F605 packages/web types.ts) — 별 모델 동시 사용
admin-portal Portal race (F647 idea) — F664 영역 외 (별 라우트 hitl-console)
```

## §3 범위 (Full gap fill)

### (a) HitlStateDiagram component 신규

```typescript
// packages/web/src/components/hitl-console/HitlStateDiagram.tsx
import type { HitlState } from "./types.js";

const STATES: { state: HitlState; label: string; emoji: string }[] = [
  { state: "AI_GENERATED", label: "AI 생성 (80%)", emoji: "🤖" },
  { state: "REVIEW_QUEUED", label: "검수 큐 (20%)", emoji: "📋" },
  { state: "HUMAN_REVIEWED", label: "사람 검수", emoji: "👤" },
  { state: "AI_REVISED", label: "AI 재생성 (80%)", emoji: "🔄" },
  { state: "FINAL_APPROVED", label: "최종 승인", emoji: "✅" },
];

export function HitlStateDiagram({ currentState }: { currentState: HitlState }) {
  // 가로 chain + current highlight + arrow connectors
}
```

### (b) DecisionForm transition mode 추가

```typescript
// HitlDecisionForm 확장
interface Props {
  item: HitlQueueItem | HitlQueueItem5State;  // discriminated union
  mode: "decision" | "transition";
  role: HitlRole;  // JWT에서 자동 채움
  onSubmit: (action: DecisionInput | TransitionInput) => void;
}
// mode="transition" — fromState (item.state), toState (next valid), role (prop), reviewerId (prop)
// RBAC 자동 필터 (TRANSITION_ALLOWED_ROLES로 next state 옵션 차단)
```

### (c) HitlAuditDrawer component 신규

```typescript
// packages/web/src/components/hitl-console/HitlAuditDrawer.tsx
export function HitlAuditDrawer({ traceId, open, onClose }: Props) {
  // open=true일 때 GET /api/audit/log/by-trace?trace_id=...
  // chain visualization (event_type / timestamp / payload preview)
  // close button + esc key
}
```

### (d) HitlState 5-state types 정의 (packages/web)

```typescript
// packages/web/src/components/hitl-console/types.ts 확장
export const HITL_STATES = [
  "AI_GENERATED",
  "REVIEW_QUEUED",
  "HUMAN_REVIEWED",
  "AI_REVISED",
  "FINAL_APPROVED",
] as const;
export type HitlState = (typeof HITL_STATES)[number];

export interface HitlQueueItem5State {
  id: string;
  orgId: string;
  graphSessionId?: string;
  cqEvaluationId?: string;
  state: HitlState;
  reviewerId?: string;
  payload?: string;
  auditTraceId: string;
  transitionedAt: number;
}

export interface HitlTransitionInput {
  queueItemId: string;
  fromState: HitlState;
  toState: HitlState;
  role: HitlRole;
  reviewerId?: string;
}
```

### (e) hitl-console.tsx 5-state tab + StateDiagram + AuditDrawer 통합

```typescript
// 신규 3-tab: 전체 / 에스컬레이션 / 5-state
// 5-state tab: HitlStateDiagram + state별 filter dropdown + HitlQueueTable (5-state) + transition trigger form + audit drawer
```

### (f) e2e spec 신규

- `packages/web/e2e/hitl-state-machine.spec.ts` ~150L
  - T1: 5-state diagram 렌더링 + current state highlight
  - T2: transition trigger form → POST /api/hitl/transition → 성공 200
  - T3: RBAC denied (Operator role on disallowed transition) → form disabled or 400 error
  - T4: audit drawer 열기 → GET /api/audit/log/by-trace → chain 표시

## §4 구현 단계 (TDD Red → Green)

1. **Red**: e2e/hitl-state-machine.spec.ts 작성 (T1~T4 FAIL 확인) + component unit test 신규
2. **Green Step 1**: types.ts HITL_STATES + HitlQueueItem5State + HitlTransitionInput
3. **Green Step 2**: HitlStateDiagram component
4. **Green Step 3**: HitlAuditDrawer component
5. **Green Step 4**: HitlDecisionForm mode 확장
6. **Green Step 5**: hitl-console.tsx 5-state tab + 통합
7. typecheck + e2e GREEN 확증
8. PR 생성 + auto-merge

## §5 파일 매핑

### 신규
- `packages/web/src/components/hitl-console/HitlStateDiagram.tsx` (~80L)
- `packages/web/src/components/hitl-console/HitlAuditDrawer.tsx` (~100L)
- `packages/web/e2e/hitl-state-machine.spec.ts` (~150L)
- `packages/web/src/__tests__/hitl-state-diagram.test.tsx` (~40L)

### 수정
- `packages/web/src/components/hitl-console/types.ts` (+40L HITL_STATES + 신규 interface 2종)
- `packages/web/src/components/hitl-console/index.ts` (+4L re-export)
- `packages/web/src/components/hitl-console/HitlDecisionForm.tsx` (+50L mode="transition" 분기)
- `packages/web/src/routes/hitl-console.tsx` (+80L 5-state tab + StateDiagram + AuditDrawer 통합)
- `packages/web/src/__tests__/hitl-console-components.test.tsx` (+15L 신규 widget test)

### 산출물 (S360+S362 학습 강제)
- `reports/sprint-398-hitl-state-diagram-snapshot.md` — 5-state 시각화 동작 증거
- `reports/sprint-398-audit-drawer-trace-chain.md` — audit drawer + trace_id chain 동작 증거
- `docs/02-design/features/sprint-398.design.md` — autopilot 자동 생성
- `docs/04-report/features/sprint-398.report.md` — autopilot 자동 생성 (S362 학습 강제: report.md 누락 차단)
- `docs/metrics/velocity/sprint-398.json` — autopilot 자동 생성 (f_items "F664" 정확 — S360/F662/F663 답습 패턴 3회 누적 → 차단 강제)

## §6 Out-of-scope

- **F665 CQ 작성 가이드** — Sprint 398+ (별 sprint, packages/api + docs)
- **F647 admin-portal Portal race fix** — hitl-console은 별 라우트라 영향 없음 (격리 유지)
- **HitlStatus 4-state UI 변경** — 기존 2-tab (전체/에스컬레이션) 유지, 5-state는 3번째 tab으로 추가
- **transition concurrency UI lock** — 본 sprint MVP, race는 backend에서 처리
- **AI_REVISED 단계 실 LLM 재호출 UI** — F665 또는 후속

## §7 Phase Exit P-a~P-h (Smoke Reality 8항)

| # | 항목 | 판정 기준 |
|---|------|----------|
| P-a | HitlStateDiagram 5-state 시각화 + current highlight | unit test PASS + e2e T1 screenshot |
| P-b | DecisionForm mode="transition" + RBAC prefilter | e2e T2 PASS + RBAC denied T3 PASS |
| P-c | HitlAuditDrawer trace_id chain 호출 + 표시 | e2e T4 PASS + screenshot |
| P-d | 5-state tab 추가 + 기존 2-tab 회귀 0 | 기존 hitl-review.spec.ts 254L 회귀 0 |
| P-e | `pnpm typecheck` PASS (--force, S337) + msa-lint PASS (S360 학습) | 0 errors |
| P-f | `pnpm test` PASS (web unit + component) | 회귀 0 |
| P-g | `pnpm e2e --grep 'hitl-state-machine'` PASS | T1~T4 ALL GREEN |
| P-h | dual_ai_reviews ≥ 1건 + 62 sprint streak | 누적 ≥ 61 |

## §8 위험 + 대응

| 위험 | 확률 | 영향 | 대응 |
|------|-----|------|------|
| autopilot이 F605 HitlStatus 4-state UI를 5-state로 덮어씀 | 중 | 중 | Plan §6 명시: 기존 2-tab 유지, 5-state는 3번째 tab으로 **추가만** |
| RBAC 추출 (JWT decode) 누락 | 낮음 | 중 | Plan §3 (b) "JWT decode은 기존 hook 또는 jwt-decode 라이브러리" 명시. fallback: prop으로 직접 받기 |
| audit drawer 호출 spam (re-render마다) | 낮음 | 낮음 | useEffect 가드 + open=false일 때 호출 안 함 |
| **autopilot velocity stale 답습 3회차 누적** | **높음** | 낮음 | Plan §5 강제 명시 + post-merge fixup 정착 |
| autopilot report.md 누락 | 중 | 낮음 | Plan §5 강제 명시 (F663에서 효과 ✅) |
| e2e 신규 spec flaky | 중 | 중 | functional assertion + waitForLoadState networkidle + timeout 30000 |

## §9 다음 사이클 후보 (out-of-scope)

- **F665 Sprint 398+** — CQ 작성 가이드 매뉴얼 + API 가드 + AI 금지 룰
- F647 sidebar Portal race fix / F645 silent layer 7
- W20 KPI 6/8 베이스라인 측정
- Cloudflare KV 점수 캐싱 PoC
- **velocity stale 답습 lifecycle rules 승격** (3회 관찰 누적 → 즉시 rules)
- **autopilot 학습 누적 명시 패턴 효과 측정** (S360+S362 누적 효과)

## §10 메타 학습 (S362 누적)

- **Plan fs 실측 의무화 28회차 정착화** — F605 packages/web baseline (135L route + 4 widgets + 254L e2e) 사전 발견 → scope 자동 축소 → 90~120분 예상 → 45~60분 단축
- **gap fill 패턴 5회차 누적** (S280/S282/S362-F662/S362-F663/S362-F664)
- **S362 단일 세션 3 sprint 연속 도전** (S360 2 sprint 완점 갱신) — ~3.5~4h 총 세션 시간
- **62 sprint streak 도전** — S306~S357+F619+F621+F660+F661+F662+F663 = 61 baseline
- **F643 fix 효과 6회차 검증 기회** (sprint() L1 fix 정착화)
- **velocity stale 답습 패턴 4회차 재현 위험** — rules 승격 후보 강화 (3회차 lifecycle 즉시 승격 조건)
