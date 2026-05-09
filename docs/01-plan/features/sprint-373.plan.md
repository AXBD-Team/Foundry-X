---
code: FX-PLAN-373
title: Sprint 373 — F638 @hono/zod-openapi 0.18.4 본 통합
version: 1.0
status: Active
category: PLAN
created: 2026-05-09
updated: 2026-05-09
sprint: 373
f_item: F638
req: FX-REQ-703
priority: P1
---

# Sprint 373 — F638 @hono/zod-openapi 0.18.4 본 통합

> SPEC.md §5 F638 row가 권위 소스. 본 plan은 실행 절차 + Phase Exit 체크리스트 정리용.

## §1 배경 + 사전 측정

**Root cause (F637 PoC 확증)**: `@hono/zod-openapi 0.18.4`에서 Content-Type 헤더 없는 POST 요청의
body validation이 skip되어 handler가 `{undefined}` 수신 → D1 query에 undefined 전달 → D1_TYPE_ERROR HTTP 500.

- **F636**: Sprint 371 PR #783 MERGED → production smoke `POST /api/auth/login` HTTP 500 → revert PR #784 (약 4h41m downtime)
- **F637**: Sprint 372 PoC로 root cause 확증 + auth.ts null guard 분리 PR #786 MERGED (`de739c37`)
  - auth.ts line 149: `if (!email || !password) return c.json({error: "..."}, 400)` 적용 완료

**사전 측정 (S345)**:

| 항목 | 측정값 |
|------|--------|
| 영향 packages | 5 (api, fx-agent, fx-modules, fx-offering, fx-shaping) |
| gate-x | 이미 0.18.4 → skip |
| fx-discovery | 미사용 → skip |
| null guard 필요 handlers | ~16 (auth.ts login 제외) |
| null guard 완료 | 1 (auth.ts login, PR #786) |

**`c.req.valid("json")` 사용 파일 목록 (packages/api/src)**:
- `core/agent/services/agent.ts`
- `core/agent/services/task-state.ts`
- `core/docs/routes/shard-doc.ts`
- `core/entity/routes/entities.ts`
- `core/harness/routes/audit.ts`
- `core/harness/routes/expansion-pack.ts`
- `core/harness/routes/governance.ts`
- `core/harness/routes/guard-rail.ts`
- `core/harness/routes/mcp.ts`
- `core/spec/routes/spec-library.ts`
- `core/spec/routes/spec.ts`
- `core/work/routes/work.ts`
- `modules/auth/routes/admin.ts`
- `modules/auth/routes/auth.ts` (login ✅ 완료)
- `modules/auth/routes/sso.ts`
- `modules/portal/routes/feedback.ts`
- `modules/portal/routes/kpi.ts`
- `modules/portal/routes/nps.ts`
- `modules/portal/routes/onboarding.ts`
- `modules/portal/routes/org.ts`
- `modules/portal/routes/reconciliation.ts`
- `modules/portal/routes/wiki.ts`
- `routes/requirements.ts`

**fx-* packages handler 파일 (별도)**:
- `packages/fx-agent/src/routes/` 10 files

## §2 범위 (a~i)

### (a) 5 packages version bump
```
packages/api, fx-agent, fx-modules, fx-offering, fx-shaping
@hono/zod-openapi: "^0.9.0" → "^0.18.4"
```

### (b) pnpm install + lock 갱신
```bash
pnpm install
# 검증: grep "zod-openapi" pnpm-lock.yaml | grep "0.9" → 0건
```

### (c) 17 handlers null guard 일괄 적용 (auth.ts login 포함 총 17개)
패턴 (F637 auth.ts PR #786 레퍼런스):
```typescript
const { fieldA, fieldB } = c.req.valid("json");
if (!fieldA || !fieldB) {
  return c.json({ error: "fieldA and fieldB are required" }, 400);
}
```
- 각 handler별로 어떤 fields를 check해야 하는지 라인 단위 분석
- 이미 null check 있는 handler는 skip

### (d) deploy.yml smoke-test step 보강
multi-input 5 케이스:
1. no body (plain POST, no Content-Type)
2. empty JSON body `{}`
3. partial body (일부 필드만)
4. malformed body (잘못된 JSON)
5. valid body

모두 4xx/2xx → **5xx 0건 gate**

### (e) 회귀 test fixture 강화
`modules/auth/__tests__/auth.test.ts` 패턴(4 테스트)을 주요 handler에도 적용:
- plain POST no body → 400
- partial body → 400
- malformed → 400
- valid → 200/201

### (f) typecheck (turbo 우회)
```bash
pnpm exec tsc --noEmit  # packages/api
# fx-* packages 각각
```

### (g) turbo force run
```bash
pnpm turbo run typecheck --force  # Cached: 0
pnpm turbo run lint --force       # Cached: 0
pnpm turbo run test --force       # Cached: 0
```

### (h) Deploy + wrangler tail
- deploy.yml 트리거 또는 수동 wrangler deploy
- `wrangler tail` 30s runtime exception 0건 검증

### (i) Production smoke (multi-input)
`POST /api/auth/login` 5 input pattern → 5xx 0건

## §3 Phase Exit 체크리스트 P-a~P-l

| # | 항목 | 기준 |
|---|------|------|
| P-a | 5 packages `^0.18.4` | grep "0.18.4" 5건 |
| P-b | pnpm-lock.yaml 단일 instance + 0.9 잔존 0건 | grep 검증 |
| P-c | 17 handlers null guard | grep `if (!` after `c.req.valid("json")` ≥ 17건 |
| P-d | deploy.yml multi-input probe 5 케이스 | yaml diff 확인 |
| P-e | 회귀 test expectation 4종 이상 신규 | vitest 테스트 count 증가 |
| P-f | `pnpm exec tsc --noEmit` 5 packages PASS | 직접 실행 |
| P-g | `pnpm turbo run typecheck --force` 19/19 PASS Cached: 0 | 출력 확인 |
| P-h | `pnpm turbo run lint --force` baseline 0 Cached: 0 | 출력 확인 |
| P-i | `pnpm turbo run test --force` 회귀 0 Cached: 0 | 출력 확인 |
| P-j | Production smoke 5 input → 5xx 0건 | curl 결과 |
| P-k | `wrangler tail` 30s exception 0건 | 로그 확인 |
| P-l | dual_ai_reviews sprint 373 INSERT ≥ 1건 | hook 확인 |

## §4 DoD (Definition of Done)

- [ ] 5 packages `@hono/zod-openapi ^0.18.4` package.json + pnpm-lock 갱신
- [ ] 17 handler null guard 적용 (auth.ts login 포함)
- [ ] deploy.yml smoke multi-input 5 케이스 게이트
- [ ] `pnpm turbo run typecheck/lint/test --force` 모두 PASS (Cached: 0)
- [ ] Production smoke 5xx 0건 (F636 blocked 영구 해소)

## §5 의존 + 위험

| 의존 | F637 ✅(PoC), auth.ts null guard PR #786 MERGED |
|------|-----|
| 위험 1 | 0.18.4 추가 breaking change 발견 → binary search 0.10~0.17 또는 sprint drop |
| 위험 2 | handler 17개 정확 식별 어려움 → grep 전수 audit |
| 위험 3 | F636 재발 → smoke probe가 deploy.yml 1차 차단 |

예상 시간: ~60~120분 autopilot
