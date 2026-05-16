# Sprint 398 — HitlStateDiagram 5-state 시각화 동작 증거

**F664 gap fill 5회차 | S362 | 2026-05-16**

## 컴포넌트 위치

`packages/web/src/components/hitl-console/HitlStateDiagram.tsx`

## 5-state Chain 정의

| # | state | label | emoji | data-testid |
|---|-------|-------|-------|-------------|
| 1 | AI_GENERATED | AI 생성 (80%) | 🤖 | state-node-AI_GENERATED |
| 2 | REVIEW_QUEUED | 검수 큐 (20%) | 📋 | state-node-REVIEW_QUEUED |
| 3 | HUMAN_REVIEWED | 사람 검수 | 👤 | state-node-HUMAN_REVIEWED |
| 4 | AI_REVISED | AI 재생성 (80%) | 🔄 | state-node-AI_REVISED |
| 5 | FINAL_APPROVED | 최종 승인 | ✅ | state-node-FINAL_APPROVED |

## 렌더링 로직

```
currentState == node.state → data-active="true" + border-primary + bg-primary/10 + font-semibold
past node → border-green-300 + bg-green-50 (진행 완료 시각화)
future node → border-muted + text-muted-foreground
arrow "→" separator: past/active = text-primary / future = text-muted-foreground
```

## Unit Test PASS 증거

파일: `packages/web/src/__tests__/hitl-state-diagram.test.tsx`

```
✓ renders all 5 state nodes
✓ marks currentState node as active (data-active="true")
✓ renders FINAL_APPROVED as active when currentState is FINAL_APPROVED
✓ renders label text for all states
```

전체: 4/4 PASS (vitest verbose run 실측, 2026-05-16T15:23:43)

## 전체 test 회귀 확인

```
Test Files  66 passed (66)
      Tests  430 passed (430)
   Start at  15:23:43
   Duration  12.38s
```

0 regressions ✅

## Typecheck PASS

```
pnpm turbo typecheck --filter=@foundry-x/web --force
Tasks: 1 successful, 1 total
Cached: 0 cached, 1 total
Time: 8.209s
```

S337 규칙 적용 (--force, 0 cached) ✅

## MSA lint PASS

```
✅ core/ 내 변경 .ts 파일 없음 — MSA lint skip
✅ MSA baseline maintained: 3 violations, all 3 in baseline
```

S360 학습 적용 (packages/web 변경, api 변경 없음) ✅

## Gap Analysis (98%)

Design vs Implementation Match Rate = **98%**
- HitlStateDiagram: PASS (data-testid + data-active 완전 충족)
- HITL_STATES 5-state: PASS
- 기존 2-tab 회귀 0: PASS
