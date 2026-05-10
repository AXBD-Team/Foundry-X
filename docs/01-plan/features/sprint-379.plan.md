---
id: FX-PLAN-379
sprint: 379
f_items: [F642]
status: plan
created: 2026-05-10
---

# Sprint 379 Plan — F642 AI Foundry P0-7 Audit Bus T2 trace_id chain enrichment

## 목적

F606(Sprint 351 ✅) Audit Log Bus T1 후속. BeSir 5/15 demo Step 5
(`GET /api/audit/log?trace_id=...`) 사실 정합성 검증 중 발견된 3가지 결함 해소:
1. `audit_logs` 테이블에 `trace_id` 컬럼 부재
2. 실제 endpoint가 trace_id query param 미지원
3. Demo 핵심 클라이맥스(5단계 trace chain 검증) 코드 미구현

## 범위 (Tier 3 minimal)

| # | 항목 | 파일 |
|---|------|------|
| a | D1 migration | `0154_audit_logs_trace_id.sql` |
| b | Service traceId 지원 | `core/harness/services/audit-logger.ts` |
| c | 신규 route `/audit/log/by-trace` | `core/harness/routes/audit.ts` |
| d | 스키마 확장 | `core/harness/schemas/audit.ts` |
| e | TDD 테스트 | `__tests__/audit-trace-chain.test.ts` |

## Out of Scope

- 호출자 4건(cross-org/diagnostic/ethics/launch) trace_id 전파 통합 (별 Sprint)
- 20 docs §6 patch (Master 직접)

## DoD (Definition of Done)

- P-a: `0154` migration 적용 + `PRAGMA table_info(audit_logs)` trace_id 컬럼 확인
- P-b: `createLog(event)` traceId param 수용 + INSERT 정상
- P-c: `getByTraceId('test-001')` 정확 반환
- P-d: `GET /api/audit/log/by-trace?trace_id=t-1` 401 production smoke PASS
- P-e: `pnpm exec tsc --noEmit` PASS (turbo 우회)
- P-f: `audit-trace-chain.test.ts` + 회귀 `audit.routes.test.ts` GREEN
- P-g: openapi-spec 회귀 0 + lint:msa-baseline 회귀 0
- P-h: dual_ai_reviews sprint 379 ≥ 1건
- P-i: Production smoke 3 input pattern 5xx 0건
