---
code: FX-PLAN-371
title: Sprint 371 — F636 @hono/zod-openapi 0.9.0 → 0.18.4 버전업 (gate-x align, S336 silent layer 4 견고화)
version: 1.0
status: Active
category: PLAN
created: 2026-05-08
updated: 2026-05-08
sprint: 371
f_item: F636
req: FX-REQ-701
priority: P2
---

# Sprint 371 — F636 @hono/zod-openapi 0.9.0 → 0.18.4 버전업

> SPEC.md §5 F636 row가 권위 소스. 본 plan은 S336 production 장애 #2(`/api/openapi.json` HTTP 500) silent layer 4 견고화 + gate-x align 모노리포 일관성 회복.

## §1 배경 + 사전 측정

### 동기

S336에서 식별된 silent fail 6 layer 중 **layer 4** — types↔schemas 순환 import + ZodEnum.values undefined 함정. 본질적으로 zod-openapi 0.9.x의 schema spec gen 시점에 의존. 더 신뢰할 수 있는 0.18.x로 격상하여 재발 차단.

추가로 모노리포 내 **버전 분기 상태** 회복:
- gate-x: `^0.18.4` (F614 시점 신규 도입)
- api / fx-* 5: `^0.9.0` (실설치 0.9.10) — 격차 9 minor

### 사전 측정 (S340, 2026-05-08)

```bash
# 영향 packages
grep -rn '@hono/zod-openapi' packages/*/package.json | grep -v node_modules
# packages/api/package.json:28:    "@hono/zod-openapi": "^0.9.0",
# packages/fx-agent/package.json:17:    "@hono/zod-openapi": "^0.9.0",
# packages/fx-modules/package.json:17:    "@hono/zod-openapi": "^0.9.0",
# packages/fx-offering/package.json:17:    "@hono/zod-openapi": "^0.9.0",
# packages/fx-shaping/package.json:17:    "@hono/zod-openapi": "^0.9.0",
# packages/gate-x/package.json:16:    "@hono/zod-openapi": "^0.18.4",   ← 이미 마이그레이션됨
# fx-discovery: zod-openapi 미사용 (zod ^3.20.0만)
```

→ **5 packages 마이그레이션 대상** (gate-x 제외).

```bash
# import 사용 위치
grep -rln '@hono/zod-openapi' packages/*/src/ | grep -v node_modules | wc -l
# → 209 files
```

→ **209 files** 모두 `import { z } from "@hono/zod-openapi"` 또는 `import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"` 패턴.

```bash
# zod 호환성
# api/fx-* 5: zod ^3.23.0
# 실설치: zod 3.25.76
# zod-openapi 0.18.4 peer: zod ^3.20.x → 3.25.76 호환 OK (zod 4.x 의존 없음)
```

### 사용 패턴 분석

**api**: `OpenAPIHono` + `createRoute` 사용 (큰 surface)
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
export const app = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();
```

**fx-* 5**: schema 정의에 z 사용만 (작은 surface)
```typescript
import { z } from "@hono/zod-openapi";
export const SomeSchema = z.object({ ... });
```

**gate-x 0.18.4**: 일반 `Hono` 사용으로 zod-openapi import 0건 — 진짜 0.18.x 코드 사용 검증은 본 sprint가 처음.

## §2 인터뷰 4회 패턴 (S340)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 타겟 버전 | **0.18.4** (gate-x align) | 모노리포 단일 instance 강제 + zod 3.23+ 호환 + breaking 최소 (gate-x에서 환경 검증됨) |
| 2차 범위 | **5 packages 일괄** (api + fx-agent/fx-modules/fx-offering/fx-shaping) | 단일 sprint, 일관성 확보 — fx-discovery skip(미사용) |
| 3차 시동 | **Sprint WT autopilot** | F-item Sprint 표준 흐름 + 35 세션 연속 패턴 유지 |
| 4차 검증 | **`pnpm exec tsc --noEmit` 직접 + `--force` cache 0건** | S337 Turbo Cache 함정 회피 3회차 — 신규 deps install 후 cache miss로 진짜 검증 |

## §3 범위

### 의존성 갱신

**(a)** 5 packages package.json `dependencies`:

```json
{
  "dependencies": {
    "@hono/zod-openapi": "^0.18.4"
  }
}
```

대상:
- `packages/api/package.json`
- `packages/fx-agent/package.json`
- `packages/fx-modules/package.json`
- `packages/fx-offering/package.json`
- `packages/fx-shaping/package.json`

**(b)** `pnpm install` — pnpm-lock.yaml 갱신:
```yaml
# Before
'@hono/zod-openapi':
  specifier: ^0.9.0
  version: 0.9.10(hono@4.12.8)(zod@3.25.76)

# After (예상)
'@hono/zod-openapi':
  specifier: ^0.18.4
  version: 0.18.x(hono@4.12.8)(zod@3.25.76)
```

→ **단일 0.18.x instance** (gate-x도 동일 minor 사용, multi-instance 0건 P-c 검증).

### 검증 (cache 우회 — S337 함정 회피)

**(c)** `pnpm turbo run typecheck --force`:
- cache 0건 (Cached: 0 cached, N total) 명시 확인
- 19/19 PASS

**(d)** `pnpm turbo run lint --force`:
- cache 0건
- errors 0 + warnings 변화 없음 (MSA baseline 161→0 유지)

**(e)** `pnpm turbo run test --force`:
- cache 0건
- 모든 테스트 PASS (api ~2300+/fx-* 합산)

**(f)** turbo 완전 우회 — 직접 tsc 실행:

```bash
for pkg in api fx-agent fx-modules fx-offering fx-shaping; do
  cd packages/$pkg && pnpm exec tsc --noEmit && cd -
done
```

→ S337 함정 회피 (신규 deps cache miss 진정 검증).

### S336 silent layer 4 견고화 검증

**(g)** `openapi-spec.test.ts` 회귀 0:

```bash
cd packages/api && pnpm exec vitest run src/__tests__/openapi-spec.test.ts
# 예상:
# - HTTP 200 응답 검증 PASS
# - 모든 ZodEnum.values walk PASS (undefined 0건)
```

→ S336에서 도입된 회귀 차단막이 0.18.4에서도 유효한지 확증.

### Breaking change 대응 (Plan B)

**(h)** typecheck/test FAIL 발견 시 fallback:

1. **점진적 binary search**: 0.18.4 fail → 0.11.x 시도 → 0.10.x 시도
2. **0.10도 fail**: API surface 변경 발견 — sprint drop + F-item rollback (master revert)
3. **zod 4.x 강제 의존 발견** (zod-openapi 1.x 진입): 별 sprint 분할 (본 sprint scope 외)
4. **OpenAPIHono.openapi() signature 변경**: codemod 또는 wrapper 추가 (sprint scope 내)

## §4 파일 매핑

| 작업 | 파일 | 변경 |
|------|------|------|
| 수정 | `packages/api/package.json` | `^0.9.0` → `^0.18.4` |
| 수정 | `packages/fx-agent/package.json` | `^0.9.0` → `^0.18.4` |
| 수정 | `packages/fx-modules/package.json` | `^0.9.0` → `^0.18.4` |
| 수정 | `packages/fx-offering/package.json` | `^0.9.0` → `^0.18.4` |
| 수정 | `packages/fx-shaping/package.json` | `^0.9.0` → `^0.18.4` |
| 자동 갱신 | `pnpm-lock.yaml` | `0.9.10(...)` → `0.18.x(...)` |
| 잠재적 fix | 209 files src/ | breaking change 발견 시 codemod (예상: 0건 또는 ≤5건) |

총 변경: **5 files (확정) + 1 lock + 0~5 src** = 6~11 files. LOC 변경 자체는 미미.

## §5 Phase Exit Criteria (P-a~P-l)

| # | 항목 | 검증 |
|---|------|------|
| P-a | 5 packages package.json `^0.18.4` 정확 grep | `grep -c '"@hono/zod-openapi": "\^0.18.4"' packages/{api,fx-agent,fx-modules,fx-offering,fx-shaping}/package.json` = 5 |
| P-b | pnpm-lock.yaml `0.18` 등록 + `0.9` 잔존 0건 | `grep -c "0.9.10(hono" pnpm-lock.yaml` = 0, `grep -c "specifier: \^0.18.4" pnpm-lock.yaml` ≥ 5 |
| P-c | 단일 0.18.x version (multi-instance 0건) | `grep -oP "version: 0\.18\.\d+" pnpm-lock.yaml \| sort -u \| wc -l` = 1 (gate-x 0.18.4 + api 0.18.4 단일 instance) |
| P-d | `pnpm install` 정상 + workspace symlink | `pnpm install` exit 0, `node_modules/.pnpm/@hono+zod-openapi*/` 디렉토리 존재 |
| P-e | turbo 우회 tsc 5 packages PASS | 위 (f) 명령 모두 exit 0 |
| P-f | `pnpm turbo run lint --force` cache 0건 + baseline 0 | output에 "Cached: 0 cached" + errors 0 |
| P-g | `pnpm turbo run typecheck --force` cache 0건 + 19/19 | output에 "Cached: 0 cached" + 19/19 PASS |
| P-h | `pnpm turbo run test --force` 회귀 0 | api 2300+ tests PASS, fx-* 합산 PASS |
| P-i | `openapi-spec.test.ts` HTTP 200 + ZodEnum.values walk 0 errors | S336 silent layer 4 견고화 검증 |
| P-j | Production smoke `/api/openapi.json` HTTP 200 | 배포 후 curl 검증 |
| P-k | dual_ai_reviews sprint 371 자동 INSERT ≥ 1건 | D1 쿼리, hook 36 sprint 연속 정상 |
| P-l | 209 files import 패턴 회귀 0건 | `grep -c '@hono/zod-openapi' packages/*/src/**/*.ts` = 209 (회귀 0) |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| 0.9 → 0.18 between **9 minor** breaking change 가능성 | 점진적 binary search fallback (0.11.x → 0.10.x) + zod-openapi 0.18.4 release notes 확인 |
| zod 4.x 강제 의존 (zod-openapi 1.x 진입 시) | 본 sprint scope 외 — F-item drop 후 별 sprint 분할 |
| OpenAPIHono / createRoute API surface 변경 | codemod 또는 wrapper 함수 도입 (sprint 내 fix) |
| pnpm-lock multi-instance (gate-x 0.18.4 + api 0.18.x) | P-c numeric strict check + pnpm overrides 적용 가능성 |
| Turbo cache 함정 (S337) — typecheck cache hit으로 회귀 미검출 | `--force` 명시 + `pnpm exec tsc --noEmit` 직접 실행 (S337 회피 3회차 정착) |
| api `OpenAPIHono` schema gen 시점 ZodEnum.values 변경 | S336 회귀 test (P-i) 보존 + `openapi-spec.test.ts` 추가 시나리오 검토 |
| 209 files schema 정의 중 일부가 0.18.x에서 strict mode 위반 | typecheck 실패 시 individual file fix (S337 strict mode 패턴 활용) |

## §7 다음 사이클 후보 (out of scope)

1. zod 3.x → 4.x 마이그레이션 (zod-openapi 1.x prerequisite, 큰 sprint)
2. hono 4.12 → 4.x latest 버전업
3. ESLint base config TypeScript 타입 export
4. **AI Foundry W19 BeSir 5/15 D-7** (Conditional 게이트 카운트다운, 우선순위 高)

## §8 시동

- master 직접 commit + push (meta-only: SPEC + plan)
- `bash -i -c "sprint 371"` Sprint WT 시동
- autopilot pipeline (plan → design → impl → verify → gap → report → PR)
- Stale F_ITEMS 패턴 9회차 가능성 — 시동 후 signal/.sprint-context 보정 필요시 즉시 fix
- breaking change fallback 시 점진 binary search (0.11.x → 0.10.x → drop)
