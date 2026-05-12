---
code: FX-PLAN-391
title: F656 — e2e master push CI shard 1 Vite cache CI 최적화
sprint: 391
date: 2026-05-12
status: DONE
---

# Sprint 391 Plan — F656

## 목적

F655에서 shard 3 부채를 100% 해소했으나 shard 1에 race condition이 잔존한다.
사전 측정 결과 50% flakiness 패턴 (2 SHA × 2 run = 4 runs, 2 PASS / 2 FAIL).

실패 spec:
- ax-bd-hub:42 + ax-bd-hub:49
- discovery-detail-advanced:218 + discovery-detail-advanced:257

근본 원인: CI 환경에서 매번 cold-start하는 Vite dep pre-bundling burst.
각 shard runner가 `pnpm dev` 시작 시 `.vite/deps/` 가 비어있어 첫 테스트 페이지 로드 중 대규모 lazy transform 발생 → timeout.

## 해결 전략

### Step A: Vite deps cache 복원
`actions/cache@v4`로 `packages/web/node_modules/.vite` 폴더를 저장/복원.
- cache key: `pnpm-lock.yaml` + `vite.config.ts` 기반 → dep 변경 시 자동 무효화
- 4 shard 모두 동일 cache key → 동일 job에서 restore (matrix 전 단계)

### Step B: cache miss 시 pre-warm
`steps.vite-deps-cache.outputs.cache-hit != 'true'` 조건으로 `vite optimize` 실행.
- `vite optimize`: Vite CLI 내장 명령, 모든 optimizedDeps를 사전 번들링하여 `.vite/deps/` 생성
- 첫 실행(cache miss)에만 ~10~15초 추가, 이후 cache hit으로 즉시 복원

## 범위

- `.github/workflows/e2e.yml` 1개 파일만 수정 (2 step 추가)
- 기타 모든 파일 변경 절대 금지 (SCOPE LOCKED)

## DoD (Phase Exit P-a~P-h)

- P-a: e2e.yml diff — actions/cache + vite optimize 2 step 추가 확인
- P-b: CI run output에서 cache hit/miss 로그 확인 가능
- P-c: shard 1 ax-bd-hub + discovery-detail-advanced 4 assertion PASS
- P-d: typecheck PASS
- P-e: lint/회귀 0
- P-f: PR CI 4 shard GREEN
- P-g: 동일 SHA master push 2 run 모두 PASS (결정론적 GREEN)
- P-h: dual_ai_reviews sprint 391 자동 INSERT ≥ 1건
