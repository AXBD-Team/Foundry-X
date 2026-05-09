# Sprint 375 — F640: @hono/zod-openapi 0.18.4 본 통합 변경 요약

## 업그레이드 패키지 (4개)

| 패키지 | 이전 | 이후 |
|--------|------|------|
| packages/api | ^0.9.0 | ^0.18.4 |
| packages/fx-agent | ^0.9.0 | ^0.18.4 |
| packages/fx-offering | ^0.9.0 | ^0.18.4 |
| packages/fx-shaping | ^0.9.0 | ^0.18.4 |

## Lock 검증 (P-c, P-d)

- `pnpm install --frozen-lockfile`: PASS — lock 불일치 0건
- `@hono/zod-openapi` resolve: `0.18.4(hono@4.12.8)(zod@3.25.76)` 단일 버전, 5개 패키지 모두 일치

## API 수정 파일 목록 (0.18.4 handler 타입 고정)

| 파일 | 수정 내용 |
|------|----------|
| core/agent/services/agent.ts | c.json(role) → c.json(role, 200) x2 |
| core/harness/routes/expansion-pack.ts | c.json(pack) → c.json(pack, 200) x2 |
| core/harness/routes/governance.ts | c.json({updated, rule}) → , 200) |
| core/harness/routes/mcp.ts | 13 handlers Promise<any>, status codes added |
| core/spec/routes/spec-library.ts | c.json(spec) → c.json(spec, 200) x2 |
| core/spec/routes/spec.ts | c.json({ok}) → c.json({ok}, 200) |
| core/work/routes/work.ts | c.json(result) → c.json(result, 200) x3 |
| modules/auth/routes/auth.ts | 400/401/500 response declarations + c.json(..., 200) x7 |
| modules/portal/routes/github.ts | Promise<any> x2 (ExternalReviewResult type mismatch) |
| modules/portal/routes/kpi.ts | c.json({...}) → c.json({...}, 200) |
| modules/portal/routes/nps.ts | c.json(summary) → c.json(summary, 200) |
| modules/portal/routes/onboarding.ts | c.json(result) → c.json(result, 200) |
| modules/portal/routes/org-shared.ts | c.json(result/items) → , 200) x2 |
| modules/portal/routes/party-session.ts | c.json(session) → c.json(session, 200) |
| modules/portal/routes/reconciliation.ts | c.json(result) → c.json(result, 200) |
| modules/portal/routes/wiki.ts | c.json({...}) → , 200) x3 |
| routes/event-status.ts | Promise<any> x2 + c.json({ok}) → , 200) |
| routes/requirements.ts | (c): any handler + c.json(updated, 200) |

## fx-agent 수정 (routes/agent.ts, routes/workflow.ts)

- 52 openapi handlers: `async (c) =>` → `async (c): Promise<any> =>`
- 7 workflow handlers: 동일
- 3 stale `@ts-expect-error` 제거 (Promise<any>로 이미 해결)
- agent.ts:897 `body.model as string | undefined` 캐스트 (unresolved shared 타입 cascade)

## 검증 결과

| Gate | 결과 |
|------|------|
| typecheck (turbo --force) | 19/19 PASS (no TS2345) |
| test (turbo --force) | 2399/2401 PASS (2 pre-existing skip) |
| lint (turbo --force) | PASS |
| pnpm install --frozen-lockfile | PASS |
| lock single version | 0.18.4 x5 패키지 PASS |
| P-g regression tests | 4 cases (no body / empty / partial / malformed) pre-existing ✓ |
| P-f smoke probe | 4 multi-input cases 추가 (smoke-test.sh) ✓ |
