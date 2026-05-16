# Sprint 397 — RBAC Denied 케이스 샘플

**날짜**: 2026-05-16  
**Sprint**: 397 (F663)  
**관련 테스트**: T4 PASS ✅

## RBAC Denied 케이스 3종

### Case 1: Operator — HUMAN_REVIEWED → AI_REVISED (T4)

```
Input:  { queueItemId, fromState: "HUMAN_REVIEWED", toState: "AI_REVISED", role: "Operator" }
Check:  TRANSITION_ALLOWED_ROLES["HUMAN_REVIEWED->AI_REVISED"] = ["Admin", "Reviewer"]
Result: { error: "Role 'Operator' not allowed for transition 'HUMAN_REVIEWED->AI_REVISED'" }
```

**의도**: AI 재생성 트리거는 검토자 이상 권한만 가능 (Operator는 큐 진입까지만 허용)

### Case 2: Auditor — 어떤 전환도 불가

```
Input:  { queueItemId, fromState: "AI_GENERATED", toState: "REVIEW_QUEUED", role: "Auditor" }
Check:  TRANSITION_ALLOWED_ROLES["AI_GENERATED->REVIEW_QUEUED"] = ["Admin", "Reviewer", "Operator"]
Result: { error: "Role 'Auditor' not allowed for transition 'AI_GENERATED->REVIEW_QUEUED'" }
```

**의도**: Auditor는 읽기 전용 — 어떤 상태 전환도 수행할 수 없음

### Case 3: Operator — AI_REVISED → FINAL_APPROVED 불가

```
Input:  { queueItemId, fromState: "AI_REVISED", toState: "FINAL_APPROVED", role: "Operator" }
Check:  TRANSITION_ALLOWED_ROLES["AI_REVISED->FINAL_APPROVED"] = ["Admin", "Approver"]
Result: { error: "Role 'Operator' not allowed for transition 'AI_REVISED->FINAL_APPROVED'" }
```

**의도**: 최종 승인은 Approver 이상만 가능

## RBAC Matrix 전체 (TRANSITION_ALLOWED_ROLES)

| Transition | Admin | Reviewer | Approver | Operator | Auditor |
|------------|:-----:|:--------:|:--------:|:--------:|:-------:|
| AI_GENERATED → REVIEW_QUEUED | ✅ | ✅ | ❌ | ✅ | ❌ |
| REVIEW_QUEUED → HUMAN_REVIEWED | ✅ | ✅ | ✅ | ❌ | ❌ |
| HUMAN_REVIEWED → AI_REVISED | ✅ | ✅ | ❌ | ❌ | ❌ |
| AI_REVISED → FINAL_APPROVED | ✅ | ❌ | ✅ | ❌ | ❌ |

## 오류 처리 경로

```
transition() {
  1. VALID_TRANSITIONS guard → error "Invalid transition"
  2. TRANSITION_ALLOWED_ROLES RBAC → error "Role '...' not allowed"
  3. DB row fetch → error "Queue item not found"
  4. state 불일치 → error "State mismatch"
  5. UPDATE + audit emit → 성공 200
}
```
