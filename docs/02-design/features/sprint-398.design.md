---
code: FX-DESIGN-398
title: F664 HITL Console UI 5-state 시각화 + transition trigger + audit drawer (gap fill)
version: 1.0
status: Active
category: Design
phase: 47
sprint: 398
f_items:
  - F664
req:
  - FX-REQ-726
created: 2026-05-16
session: S362
---

# Sprint 398 Design — F664 HITL Console UI 5-state

## §1 컨텍스트

F605 packages/web baseline 거의 완비 상태에서 5종 gap fill만 수행.
기존 HitlStatus 4-state 큐 UI(2-tab)는 전혀 수정하지 않음.
3번째 tab "5-state 머신"만 추가.

## §2 아키텍처 결정

### 별 모델 병존
- `HitlStatus` 4-state (pending/in_review/escalated/resolved) = F605 큐 item status
- `HitlState` 5-state (AI_GENERATED→…→FINAL_APPROVED) = F663 80-20-80 머신

### RBAC role 추출
JWT localStorage "token" 디코딩 → payload.role (또는 payload.orgRole) → HitlRole 타입으로 캐스팅.
기존 api-client.ts의 `JSON.parse(atob(token.split(".")[1]))` 패턴 재사용.

### TRANSITION_ALLOWED_ROLES (web 미러)
API 정의와 동일:
```
"AI_GENERATED->REVIEW_QUEUED": ["Admin", "Reviewer", "Operator"]
"REVIEW_QUEUED->HUMAN_REVIEWED": ["Admin", "Reviewer", "Approver"]
"HUMAN_REVIEWED->AI_REVISED": ["Admin", "Reviewer"]
"AI_REVISED->FINAL_APPROVED": ["Admin", "Approver"]
```

## §3 컴포넌트 설계

### (a) HitlStateDiagram.tsx

```
props: { currentState: HitlState }
layout: 가로 flex chain
  [🤖 AI 생성] → [📋 검수 큐] → [👤 사람 검수] → [🔄 AI 재생성] → [✅ 최종 승인]
active state: border-primary + bg-primary/10 + font-semibold
inactive: border-muted + text-muted-foreground
arrow: "→" separator
data-testid="hitl-state-diagram"
각 state node: data-testid="state-node-{state}" data-active="{true|false}"
```

### (b) HitlAuditDrawer.tsx

```
props: { traceId: string; open: boolean; onClose: () => void }
동작: open=true && traceId → useEffect → GET /api/audit/log/by-trace?trace_id={traceId}
chain 표시: event_type / timestamp / payload preview (truncated 100chars)
close: X button + Escape key
overlay: fixed inset-0 z-50 (conditional)
data-testid="hitl-audit-drawer"
chain item: data-testid="audit-chain-item"
```

### (c) types.ts 확장

추가:
- `HITL_STATES` const (5-enum)
- `HitlState` type
- `HitlQueueItem5State` interface
- `HitlTransitionInput` interface
- `TRANSITION_ALLOWED_ROLES` const (web 미러)
- `VALID_TRANSITIONS` const

### (d) HitlDecisionForm.tsx 확장

```
mode?: "decision" | "transition"  (default "decision" — 하위호환)
transition 모드 추가 props:
  - fromState: HitlState
  - toState options: VALID_TRANSITIONS[fromState] filtered by TRANSITION_ALLOWED_ROLES + userRole
  - role: HitlRole (JWT 추출)
  - reviewerId?: string

mode="decision" 동작: 기존 100% 유지
mode="transition" 동작:
  - toState select (허용된 전환만)
  - POST /api/hitl/transition { queueItemId, fromState, toState, role }
  - RBAC prefilter: 허용 안 되면 select disabled + "역할 권한 없음" 표시
```

### (e) hitl-console.tsx 3번째 tab

```
ConsoleTab = "all" | "escalated" | "state-machine"
"5-state 머신" tab layout:
  - HitlStateDiagram (currentState = selectedState5 or 첫 item의 state)
  - state별 filter dropdown (선택 시 5-state 아이템 필터)
  - HitlQueueTable placeholder (5-state items)
  - 우측: HitlDecisionForm mode="transition" + HitlAuditDrawer trigger button
기존 2-tab 동작: 100% 유지
```

## §4 API 연동

| API | 사용처 | 이미 존재 |
|-----|--------|----------|
| `GET /api/hitl/queue` | tab all/escalated | ✅ F605 |
| `POST /api/hitl/decision` | HitlDecisionForm mode=decision | ✅ F605 |
| `POST /api/hitl/transition` | HitlDecisionForm mode=transition | ✅ F663 |
| `GET /api/audit/log/by-trace?trace_id=` | HitlAuditDrawer | ✅ F660 |

## §5 파일 매핑

### 신규
| 파일 | LOC | 내용 |
|------|-----|------|
| `packages/web/src/components/hitl-console/HitlStateDiagram.tsx` | ~80L | 5-state 가로 chain |
| `packages/web/src/components/hitl-console/HitlAuditDrawer.tsx` | ~100L | audit chain drawer |
| `packages/web/e2e/hitl-state-machine.spec.ts` | ~150L | T1~T4 e2e spec |
| `packages/web/src/__tests__/hitl-state-diagram.test.tsx` | ~40L | unit tests |

### 수정
| 파일 | 변경 | 내용 |
|------|------|------|
| `packages/web/src/components/hitl-console/types.ts` | +60L | HITL_STATES + HitlState + 2 interfaces + RBAC consts |
| `packages/web/src/components/hitl-console/index.ts` | +6L | 신규 component re-export |
| `packages/web/src/components/hitl-console/HitlDecisionForm.tsx` | +60L | mode="transition" 분기 |
| `packages/web/src/routes/hitl-console.tsx` | +90L | 3번째 tab + StateDiagram + AuditDrawer |
| `packages/web/src/__tests__/hitl-console-components.test.tsx` | +20L | StateDiagram unit test 추가 |

### 산출물 (S362 학습 강제)
| 파일 | 내용 |
|------|------|
| `reports/sprint-398-hitl-state-diagram-snapshot.md` | 5-state 시각화 동작 증거 |
| `reports/sprint-398-audit-drawer-trace-chain.md` | audit drawer trace chain 동작 증거 |
| `docs/metrics/velocity/sprint-398.json` | f_items="F664" 정확 + duration_minutes 정확 |
| `docs/04-report/features/sprint-398.report.md` | autopilot 자동 생성 |

## §6 TDD 계약

### Red 대상
- `hitl-state-diagram.test.tsx`: HitlStateDiagram render + currentState highlight
- `hitl-console-components.test.tsx`: StateDiagram unit test 추가
- `hitl-state-machine.spec.ts` T1~T4: e2e (신규 components 없으면 fail)

### D1 체크리스트 (CLAUDE.md Stage 3 Exit)
- D1: HitlStateDiagram + HitlAuditDrawer 모두 index.ts에 re-export ✅
- D2: HitlTransitionInput.role = HitlRole type (API와 동일 계약) ✅
- D3: 기존 HitlQueueItem / HitlStatus / HitlAction 타입 무변경 ✅
- D4: TDD Red 커밋 존재 ✅ (Green Phase 이전)

## §7 Out-of-scope

- F665 CQ 작성 가이드 (별 sprint)
- F647 Portal race fix (별 라우트)
- HitlStatus 4-state 변경 없음
- transition concurrency UI lock
- AI_REVISED 실 LLM 재호출 UI
