# Sprint 397 — HITL State Machine Transition 동작 증거

**날짜**: 2026-05-16  
**Sprint**: 397 (F663)  
**테스트**: 6 / 6 PASS (T1~T6)

## 5 Valid Transitions

| # | fromState | toState | 허용 역할 | 테스트 |
|---|-----------|---------|-----------|--------|
| 1 | AI_GENERATED | REVIEW_QUEUED | Admin, Reviewer, Operator | T2 PASS |
| 2 | REVIEW_QUEUED | HUMAN_REVIEWED | Admin, Reviewer, Approver | T6 PASS |
| 3 | HUMAN_REVIEWED | AI_REVISED | Admin, Reviewer | T6 PASS |
| 4 | AI_REVISED | FINAL_APPROVED | Admin, Approver | T6 PASS |
| 5 | FINAL_APPROVED | (없음) | 종단 상태 | T6 PASS |

## T6 Full Lifecycle 동작 로그 (mock 기반)

```
createInitial(orgId="org-full", graphSessionId="gs-full", cqEvaluationId="cq-full")
  → state=AI_GENERATED, traceId="dddddddd...32chars", emit hitl.state.created ✅

transition(AI_GENERATED → REVIEW_QUEUED, role=Reviewer)
  → state=REVIEW_QUEUED, traceId 전파 ✅, emit hitl.state.review_queued ✅

transition(REVIEW_QUEUED → HUMAN_REVIEWED, role=Approver)
  → state=HUMAN_REVIEWED, traceId 전파 ✅, emit hitl.state.human_reviewed ✅

transition(HUMAN_REVIEWED → AI_REVISED, role=Reviewer)
  → state=AI_REVISED, traceId 전파 ✅, emit hitl.state.ai_revised ✅

transition(AI_REVISED → FINAL_APPROVED, role=Approver)
  → state=FINAL_APPROVED, traceId 전파 ✅, emit hitl.state.final_approved ✅
```

## Audit Event Chain 검증

```
emitCalls[0] = "hitl.state.created"      ← createInitial
emitCalls[1] = "hitl.state.review_queued"
emitCalls[2] = "hitl.state.human_reviewed"
emitCalls[3] = "hitl.state.ai_revised"
emitCalls[4] = "hitl.state.final_approved"

모든 transition emit: ctx.traceId = traceId (동일 값 전파 ✅)
```

## 오류 케이스 동작

| 케이스 | 입력 | 출력 |
|--------|------|------|
| T3: 잘못된 전환 | AI_GENERATED → FINAL_APPROVED | `{error: "Invalid transition: ..."}` |
| T5: state 불일치 | fromState=AI_GENERATED, db.state=REVIEW_QUEUED | `{error: "State mismatch: ..."}` |
