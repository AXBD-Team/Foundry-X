---
id: FX-PLAN-388
sprint: 388
f_items: [F653]
status: done
created: 2026-05-12
---

# Sprint 388 Plan — F653: master push CI 회귀 본질 진단

## Goal

master push CI 회귀의 근본 원인을 진단한다.  
**SCOPE LOCKED — 진단 전용, fix 절대 금지.**

## Background

- F652 (Sprint 387) timeout 20s + waitForLoadState fix 적용 후에도  
  master push run #25666141353 (b2beb7c) shard 1+3 FAILURE 재현
- docs-only push 5d30ad4 (코드 변경 0건) run #25666230154 도 FAILURE  
  → 환경/누적 부채 의존 확정, timing 가설 단순 false 판정됨

## 8 Fail Spec/Line 목록

| # | Spec:Line | Test 이름 | 실패 유형 |
|---|-----------|-----------|----------|
| 1 | ax-bd-hub:42 | BMC 목록 페이지 렌더링 | timeout |
| 2 | ax-bd-hub:49/52 | Discovery 프로세스 페이지 | timeout |
| 3 | discovery-detail-advanced:218 | 형상화 탭 기획서 생성 | timeout/assertion |
| 4 | discovery-detail-advanced:257 | startBtn timeout 15000 | timeout |
| 5 | offering-pipeline:132 | offering-create-wizard | assertion |
| 6 | offering-pipeline:138 | dismissGuideModal 이후 | assertion |
| 7 | roadmap-changelog:21 | Phase 정보 표시 | assertion |
| 8 | roadmap-changelog:41 | Work Lifecycle Platform | no-timeout |

## 4축 가설

### (i) mock fixture — api-fixtures.ts 등록 timing
PR branch vs master push 에서 `page.route()` mock 등록 순서/타이밍 차이 존재 여부

### (ii) auth fixture — ProtectedRoute hydration timing
`authenticatedPage` fixture가 localStorage 세팅 후 2차 navigation 시  
ProtectedRoute `hydrate()` → `isHydrated=true` 전환까지의 레이턴시

### (iii) D1 binding / dev server cold-start
`reuseExistingServer: !process.env.CI` (false in CI) → 매 shard 독립 fresh start  
harness-kit build → API dev server 시작 → playwright webServer timeout 120s 내 ready

### (iv) build cache — harness-kit + Vite cold compile
CI는 pnpm 글로벌 스토어만 캐시 (`cache: pnpm`), Vite transform 캐시 없음  
→ 매 shard 첫 번째 `page.goto()` 시 lazy route modules cold compile (수 초~수십 초 지연)

## 진단 방법

1. **로컬 재현 시도** — `CI=true pnpm e2e --grep` 로 각 실패 test 재현 시도
2. **단계별 timing probe** — `page.goto()` 전후 `Date.now()` diff
3. **가설별 코드 분석** — auth store, ProtectedRoute, router.tsx 구조 분석
4. **CI 환경 vs 로컬 환경 구조 비교** — e2e.yml, playwright.config.ts 비교

## DoD (진단 전용)

- P-a 8 fail spec/line 정확 매핑 ✅ (본 Plan)
- P-b 4축 가설 PASS/FAIL 증거 4건
- P-c 각 spec 코드 분석 + 근본 원인 클래스 분류 8건
- P-d 단일 원인 가설 확정 또는 분류
- P-e F654 후속 sprint 분할 권고
- P-f typecheck PASS (변경 0)
- P-g 회귀 0건
- P-h dual_ai_reviews INSERT ≥ 1건
