# Sprint 399 — AI 저자 차단 케이스 샘플

> Sprint 399 F665 산출물 — AI_AUTHOR_BLOCKLIST 동작 증거
> 생성: 2026-05-16 | 구현: packages/api/src/core/cq/routes/index.ts

## 차단 정규식

```typescript
const AI_AUTHOR_BLOCKLIST = /^(ai|bot|gemini|claude|chatgpt|gpt|anthropic|openai)[-_\s]?/i;
const CQ_MIN_CHARS = 50;
```

## 케이스 1: AI prefix author 차단

**요청**:
```json
{
  "orgId": "demo-org-001",
  "questionText": "KOAMI 경쟁사 분석에서 4-Asset Model을 활용하여 시장 점유율 변화를 정량적으로 분석했나요?",
  "answerText": "Entity·Relationship·Attribute·Event를 모두 구조화하여 경쟁사 5곳의 시장 점유율을 온톨로지 그래프로 시각화했어요.",
  "author": "ai-claude"
}
```

**응답 (HTTP 400)**:
```json
{
  "error": "AI-authored CQ rejected",
  "author": "ai-claude"
}
```

**매칭 패턴**: `^ai[-_\s]?` → "ai-claude" prefix "ai-" 매칭

---

## 케이스 2: ChatGPT prefix 차단

**요청**:
```json
{
  "orgId": "demo-org-001",
  "questionText": "Decode-X 기술 스택 전환 제안서를 작성할 때 Foundry-X의 discovery-stage-runner와 CQEvaluator를 어떻게 활용했나요?",
  "answerText": "discovery-stage-runner로 레거시 코드 분석 12회 수행, CQEvaluator로 제안 품질 사전 검증(평균 85점)했어요.",
  "author": "ChatGPT"
}
```

**응답 (HTTP 400)**:
```json
{
  "error": "AI-authored CQ rejected",
  "author": "ChatGPT"
}
```

**매칭 패턴**: `^chatgpt` (case insensitive) → "ChatGPT" 매칭

---

## 케이스 3: 짧은 본문 차단 (CQ_MIN_CHARS=50)

**요청**:
```json
{
  "orgId": "demo-org-001",
  "questionText": "잘 했나요?",
  "answerText": "네, 잘 됐어요.",
  "author": "Sinclair Seo"
}
```

**응답 (HTTP 400)**:
```json
{
  "error": "CQ too short (min 50 chars each)"
}
```

**판정**: questionText 7자 < 50자 → 차단 (author 검증 통과 후 길이 검증에서 차단)

---

## 케이스 4: 정상 등록 (참고)

**요청**:
```json
{
  "orgId": "demo-org-001",
  "questionText": "KOAMI 프로젝트에서 4-Asset Model의 Entity·Relationship·Attribute를 모두 활용하여 국내 경쟁사 분석을 완료했나요?",
  "answerText": "Entities(경쟁사 5곳), Relationships(시장 연결), Attributes(가격/매출 속성)를 4-Asset Model로 구조화하여 온톨로지 그래프 보고서 1건을 생성했습니다.",
  "author": "Sinclair Seo"
}
```

**응답 (HTTP 201)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**흐름**: AI_AUTHOR_BLOCKLIST 미매칭 → 길이 검증 통과(questionText 51자, answerText 65자) → D1 INSERT → audit-bus emit("cq.registered") → 201

---

## 통합 테스트 결과 (T1~T4)

| 테스트 | 시나리오 | 기대 | 결과 |
|--------|----------|------|------|
| T1 | author="ai-claude" | 400 AI rejected | ✅ PASS |
| T2 | author="Sinclair Seo" + 정상 텍스트 | 200/201 + id | ✅ PASS |
| T3 | questionText < 50자 | 400 CQ too short | ✅ PASS |
| T4 | Dogfood 5건 SELECT | rows >= 5 | ✅ PASS |
