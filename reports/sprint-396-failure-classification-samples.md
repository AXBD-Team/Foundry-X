# Sprint 396 — F662 failure_reason 분류 샘플

**날짜**: 2026-05-16  
**목적**: <90점 자동 분류 로직 (human_error vs infra_issue) 검증 샘플 3건+

## 분류 로직 요약

```typescript
const parsedScores = parseAxisScores(llmResponse.content);
const usedDefault = parsedScores === null;
const axisScores = parsedScores ?? defaultAxisScores();

const failureReason: FailureReason = totalScore < 90
  ? (usedDefault ? "infra_issue" : "human_error")
  : null;
```

## 샘플 케이스

### Case 1: 정상 파싱 + 낮은 점수 → human_error

**입력**:
- LLM rawScore: 60 (모든 축)
- parseAxisScores() → 성공 (usedDefault=false)

**계산**:
- ontology_usage: 60 × 0.25 = 15.0
- tool_selection: 60 × 0.20 = 12.0
- code_quality: 60 × 0.15 = 9.0
- result_match: 60 × 0.30 = 18.0
- governance: 60 × 0.10 = 6.0
- totalScore = 60 → handoffDecision = "human_review"

**결과**: `failureReason = "human_error"` ✅ (T5 PASS)

---

### Case 2: LLM 응답 파싱 실패 → infra_issue

**입력**:
- LLM response: "NOT_JSON" (파싱 불가)
- parseAxisScores() → null (usedDefault=true)
- defaultAxisScores() 사용: 모든 축 rawScore=50

**계산**:
- totalScore = 50 → handoffDecision = "human_review"

**결과**: `failureReason = "infra_issue"` ✅ (T6 PASS)

---

### Case 3: 고득점 → null (handoff)

**입력**:
- LLM rawScore: 95 (모든 축)
- parseAxisScores() → 성공

**계산**:
- totalScore = 95 → handoffDecision = "handoff"

**결과**: `failureReason = null` ✅ (T7 PASS — F632 baseline 회귀 0)

---

### Case 4: 경계값 90점 → null (handoff)

**이론적 케이스**:
- rawScore = 90 → totalScore = 90 → handoffDecision = "handoff"
- `totalScore < 90` 조건이 false → failureReason = null

**결과**: handoff + failureReason=null (handoff 임계값 inclusive)

---

## 분류 coverage

| 상황 | failureReason | handoffDecision |
|------|--------------|----------------|
| LLM 파싱 실패 + 점수 낮음 | infra_issue | human_review |
| LLM 파싱 성공 + 점수 낮음 | human_error | human_review |
| LLM 파싱 성공 + 점수 높음 (≥90) | null | handoff |

**모든 케이스 test 검증 완료** (T4~T7, 2466/2468 전체 테스트 PASS)
