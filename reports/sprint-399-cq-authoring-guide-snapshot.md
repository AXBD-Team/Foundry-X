# Sprint 399 — CQ 작성 가이드 핵심 발췌

> Sprint 399 F665 산출물 — 매뉴얼 핵심 구조 스냅샷
> 생성: 2026-05-16 | 원본: docs/specs/fx-serverkit-native/cq-authoring-guide.md

## 매뉴얼 구조 (7개 섹션)

| 섹션 | 내용 | 라인 수 |
|------|------|---------|
| §1 End User 정의 | AX BD 컨설턴트 7 + Admin 3 | 10L |
| §2 CQ란? | graph_session 종결 → 5축 평가 → 90점 핸드오프 플로우 | 25L |
| §3 좋은 CQ 예시 3건 | KOAMI + Decode-X + 사내 BD 도메인 | 50L |
| §4 나쁜 CQ 예시 3건 | 모호함 + 측정불가 + AI 의존 안티 패턴 | 35L |
| §5 5축별 작성 가이드 | ontology_usage/tool_selection/code_quality/result_match/governance | 60L |
| §6 AI 금지 정책 | AI_AUTHOR_BLOCKLIST regex + 차단 케이스 | 30L |
| §7 Dogfood 5건 + 등록 절차 | KOAMI 3 + Decode-X 2 + 단계별 절차 | 25L |

**총 라인수**: 235L (목표 150L 대비 +85L, 실사용 가이드 품질)

## 5축 가중치 요약

```
ontology_usage  ████████████████████████ 25%
tool_selection  ████████████████████     20%
code_quality    ████████████             15%
result_match    ████████████████████████████████ 30% ← 최고 비중
governance      ██████████               10%
```

## 핵심 정책 (§6 요약)

```typescript
// AI 차단 정규식 (routes/index.ts에 구현)
const AI_AUTHOR_BLOCKLIST = /^(ai|bot|gemini|claude|chatgpt|gpt|anthropic|openai)[-_\s]?/i;

// 허용: "Sinclair Seo", "홍길동", "BD팀 컨설턴트"
// 차단: "ai-claude", "claude", "ChatGPT", "bot"
```

## 검증 결과

- 매뉴얼 작성 완료: ✅
- End User 정의 포함: ✅ (AX BD 컨설턴트 7 + Admin 3)
- 5축 가이드 완비: ✅ (각 축별 체크리스트 포함)
- AI 금지 정책 명시: ✅ (regex + 케이스 예시)
- 좋은 CQ 예시 3건: ✅ (KOAMI × 2 + Decode-X × 1)
- 나쁜 CQ 예시 3건: ✅ (모호 + 측정불가 + AI의존)
- Dogfood 절차: ✅ (5건 목록 + 단계별 절차)
