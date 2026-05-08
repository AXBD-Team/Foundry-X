---
code: FX-DSGN-371
title: Sprint 371 — F636 @hono/zod-openapi 0.9.0 → 0.18.4 버전업 (Design)
version: 1.0
status: Active
category: DESIGN
created: 2026-05-08
updated: 2026-05-08
sprint: 371
f_item: F636
req: FX-REQ-701
priority: P2
---

# Sprint 371 Design — F636 @hono/zod-openapi 0.9.0 → 0.18.4

> Plan: `docs/01-plan/features/sprint-371.plan.md`

## §1 현황

### 현재 lock 상태

pnpm-lock.yaml에 두 버전이 공존:
- `@hono/zod-openapi@0.18.4` — gate-x 전용
- `@hono/zod-openapi@0.9.10` — api + fx-agent + fx-modules + fx-offering + fx-shaping

### 마이그레이션 대상 5 packages

| 패키지 | 현재 specifier | 목표 |
|--------|---------------|------|
| `packages/api` | `^0.9.0` | `^0.18.4` |
| `packages/fx-agent` | `^0.9.0` | `^0.18.4` |
| `packages/fx-modules` | `^0.9.0` | `^0.18.4` |
| `packages/fx-offering` | `^0.9.0` | `^0.18.4` |
| `packages/fx-shaping` | `^0.9.0` | `^0.18.4` |

fx-discovery: zod-openapi 미사용 (zod ^3.20.0만) → skip

## §2 Breaking Change 사전 조사

### 0.9 → 0.18 주요 변경 이력

| 버전 | 변경 |
|------|------|
| 0.10 | `createRoute` options `request.body` → `request.body.content['application/json']` 패턴 강화 |
| 0.12 | `OpenAPIHono` 타입 파라미터 변경 (generic 추가) |
| 0.15 | `z.string().openapi()` `description` → metadata 객체 구조 변화 |
| 0.18 | `@hono/zod-openapi` exports 정리 — `createRoute`, `z`, `OpenAPIHono` 동일 유지 |

### Foundry-X 사용 패턴 (안전 분석)

```typescript
// api (큰 surface)
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
// → 동일 import 유지됨 (0.18.x 기준 확인)

// fx-* 5 (작은 surface — z 사용만)
import { z } from "@hono/zod-openapi";
// → 동일 import 유지됨
```

**예상 breaking change**: 없음 (gate-x가 이미 0.18.4 사용 중으로 동일 모노리포 내 환경 검증됨)

## §3 구현 상세 — TDD 적용 여부

**TDD 적용 등급**: 면제 (dependency upgrade는 소스 로직 변경 없음)

직접 패키지 갱신 + 검증 사이클:
1. 5 package.json 갱신
2. `pnpm install`
3. Breaking change 발견 시 src fix
4. 검증 (cache 우회)

## §4 검증 시나리오

### Primary (turbo --force)

| 검증 | 명령 | 기준 |
|------|------|------|
| typecheck | `pnpm turbo run typecheck --force` | Cached: 0, 19/19 PASS |
| lint | `pnpm turbo run lint --force` | Cached: 0, errors: 0 |
| test | `pnpm turbo run test --force` | Cached: 0, 회귀 0 |

### Secondary (turbo 완전 우회 — S337 함정 회피)

```bash
cd packages/api && pnpm exec tsc --noEmit && cd ../..
cd packages/fx-agent && pnpm exec tsc --noEmit && cd ../..
cd packages/fx-modules && pnpm exec tsc --noEmit && cd ../..
cd packages/fx-offering && pnpm exec tsc --noEmit && cd ../..
cd packages/fx-shaping && pnpm exec tsc --noEmit && cd ../..
```

### S336 silent layer 4 회귀 방지

```bash
cd packages/api && pnpm exec vitest run src/__tests__/openapi-spec.test.ts
# → HTTP 200 + ZodEnum.values walk 0 errors
```

## §5 파일 매핑 (Worker 작업 목록)

| # | 파일 | 변경 내용 | 비고 |
|---|------|----------|------|
| 1 | `packages/api/package.json` | `"@hono/zod-openapi": "^0.18.4"` | line 28 수정 |
| 2 | `packages/fx-agent/package.json` | `"@hono/zod-openapi": "^0.18.4"` | line 17 수정 |
| 3 | `packages/fx-modules/package.json` | `"@hono/zod-openapi": "^0.18.4"` | line 17 수정 |
| 4 | `packages/fx-offering/package.json` | `"@hono/zod-openapi": "^0.18.4"` | line 17 수정 |
| 5 | `packages/fx-shaping/package.json` | `"@hono/zod-openapi": "^0.18.4"` | line 17 수정 |
| 6 | `pnpm-lock.yaml` | `pnpm install` 자동 갱신 | 0.9.10 잔존 0건 |
| 7 | (조건) src 파일들 | breaking change fix | 예상 0건 |

## §6 Phase Exit P-a~P-l

| # | 항목 |
|---|------|
| P-a | 5 packages `^0.18.4` grep 5건 |
| P-b | lock `0.9` 잔존 0건, `^0.18.4` ≥ 5건 |
| P-c | pnpm-lock multi-instance 0건 |
| P-d | pnpm install exit 0 |
| P-e | turbo 우회 tsc 5 packages PASS |
| P-f | lint --force 0 errors |
| P-g | typecheck --force 19/19 |
| P-h | test --force 회귀 0 |
| P-i | openapi-spec.test.ts HTTP 200 + ZodEnum walk PASS |
| P-j | Production `/api/openapi.json` 200 |
| P-k | dual_ai_reviews sprint 371 INSERT ≥ 1 |
| P-l | 209 files import 패턴 회귀 0 |
