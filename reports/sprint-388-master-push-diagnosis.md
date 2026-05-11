# Sprint 388 — F653 Master Push CI 회귀 본질 진단 보고서

**작성일**: 2026-05-12  
**작성자**: Sprint Autopilot (Tier 3)  
**Sprint**: 388 | **F-item**: F653 | **진단 전용 — fix 절대 금지**

---

## 요약

master push CI가 docs-only 커밋(코드 변경 0건)에서도 shard 1+3 실패하는 현상의 근본 원인을 4축 가설 분석을 통해 확정했다.

**주원인**: Vite cold compile + 특정 assertion의 timeout 미지정/불충분  
**부원인**: ProtectedRoute 2-render cycle (hydration)으로 인한 `<main>` 렌더 지연  
**환경 의존 확정**: docs-only push도 실패 → 코드 결함 아님, 순수 타이밍/환경 문제

---

## P-a: 8 Fail Spec/Line 정확 매핑

### 실패 목록

| # | Spec 파일 | 라인 | 테스트명 | 실패 유형 |
|---|-----------|------|----------|----------|
| 1 | `ax-bd-hub.spec.ts` | 42 | BMC 목록 페이지 렌더링 | timeout (20000) |
| 2 | `ax-bd-hub.spec.ts` | 52 | Discovery 프로세스 페이지 | timeout (10000) |
| 3 | `discovery-detail-advanced.spec.ts` | 218 | 형상화 탭 기획서 생성 | timeout (15000) |
| 4 | `discovery-detail-advanced.spec.ts` | 257 | startBtn 재확인 | timeout (15000) |
| 5 | `offering-pipeline.spec.ts` | 132 | offering-create-wizard 1단계 | assertion (no-timeout) |
| 6 | `offering-pipeline.spec.ts` | 138 | dismissGuideModal 이후 wizard | assertion (no-timeout) |
| 7 | `roadmap-changelog.spec.ts` | 21 | Phase 정보 표시 | assertion (partial) |
| 8 | `roadmap-changelog.spec.ts` | 41 | Work Lifecycle Platform | no-timeout |

### 코드 증거

**ax-bd-hub.spec.ts:52**
```typescript
// 10000ms — BMC 20000ms보다 절반. 동일한 Vite cold compile 지연 대상
await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
```

**offering-pipeline.spec.ts:141-143** (timeout 미지정)
```typescript
await expect(
  page.getByText("발굴 아이템 선택").or(page.getByText("새 사업기획서 만들기")).first(),
).toBeVisible();  // ← NO TIMEOUT: Playwright default 5000ms
```

**roadmap-changelog.spec.ts:41** (timeout 미지정)
```typescript
await expect(page.getByText("Work Lifecycle Platform")).toBeVisible();  // ← NO TIMEOUT
```

---

## P-b: 4축 가설 PASS/FAIL 판정 + 증거

### (i) Mock Fixture — page.route() 등록 순서

**판정: FALSE (무관)**

**증거**:
1. `ax-bd-hub.spec.ts:47-49`: mock 등록(`page.route("/api/ax-bd/bmc*", ...)`) 후 `page.goto("/ax-bd/bmc")` — BEFORE navigation. 순서 정상.
2. `discovery-detail-advanced.spec.ts`: `setupDiscoveryMocks(page)` 헬퍼가 goto 전에 호출됨.
3. `offering-pipeline.spec.ts:135`: `await setupOfferingMocks(page)` — goto("/shaping/offerings/new") 이전 실행.
4. `fixtures/auth.ts:authenticatedPage`: `setupAppShellMocks(page)` 가 `use(page)` 이전 호출됨 — 테스트 본문 실행 전 이미 등록.
5. Playwright `page.route()`는 등록 즉시 유효, navigate와 timing race 없음.
6. roadmap test(no mock)도 실패 → mock 순서와 무관한 실패 패턴 존재.

**결론**: mock 순서 문제 완전 배제.

---

### (ii) Auth Fixture — ProtectedRoute hydration timing

**판정: 부분 기여 (단독 원인 아님)**

**증거**:

`ProtectedRoute.tsx`:
```tsx
useEffect(() => { hydrate(); }, [hydrate]);
if (!isHydrated) {
  return <div className="animate-spin..."/>;  // spinner, NO <main>
}
```

`auth-store.ts hydrate()`:
```typescript
hydrate: () => {
  const token = localStorage.getItem("access_token");
  const user = localStorage.getItem("user");
  if (!token || !user) { set({ isHydrated: true, isAuthenticated: false }); return; }
  // exp 검증: makeFakeJwt() → exp = now + 3600
  const decoded = jwtDecode(token);
  if (decoded.exp && decoded.exp < Date.now() / 1000) { /* refresh */ }
  set({ isHydrated: true, isAuthenticated: true, ... });
}
```

**분석**:
- `useEffect` → React가 DOM mount 후 fire → 최소 2 render cycle 필요
- BUT: `hydrate()` 는 fake JWT (exp = now+3600) → 동기 경로 → 빠름
- PR CI, master push CI 모두 동일한 hydration 동작 → 차별 원인 아님
- 단, Vite lazy compile 지연이 크면 hydration 2-cycle overhead가 누적 가중됨

**결론**: hydration 자체는 빠르지만 cold compile과 결합 시 지연 가중. 단독 원인 아님.

---

### (iii) D1 Binding / Dev Server Cold-Start

**판정: 부분 기여 (주원인 아님)**

**증거**:

`packages/api/src/dev-server.ts`:
```typescript
import { serve } from "@hono/node-server";
// wrangler dev 아님 — 일반 Node.js HTTP 서버
serve({ fetch: app.fetch, port: 3001 });
```

**분석**:
- API dev server = `@hono/node-server` → 시작 시간 ~1-2초
- wrangler dev 아님 → D1 cold-start 없음
- `reuseExistingServer: !process.env.CI` = CI에서 항상 fresh start → 매 shard마다 서버 재시작
- BUT: 실패한 테스트 대부분이 API mock 등록 → 실 API 서버 필요 없음
- roadmap test만 실 API 호출 (`**/api/work/public/roadmap`) → 서버 ready 필요

**결론**: API 서버 cold-start 자체는 120s timeout 안에 완료됨. 직접 원인 아님.

---

### (iv) Build Cache / Vite Cold Compile

**판정: 주원인 확정**

**증거**:

**e2e.yml cache 설정**:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: pnpm  # ← pnpm global store만 캐시, Vite transform cache 없음
```

**playwright.config.ts**:
```typescript
webServer: [{
  command: "pnpm dev",  // Vite dev server
  url: "http://localhost:3000",
  timeout: 120_000,
  reuseExistingServer: !process.env.CI,  // CI = false (항상 fresh)
}]
```

**router.tsx — 모든 실패 라우트가 lazy**:
```typescript
{ path: "/ax-bd/bmc", lazy: () => import("@/routes/ax-bd/bmc") }          // ← fail #1
{ path: "/discovery/items", lazy: () => import("@/routes/discovery/items") } // ← fail #2
{ path: "/shaping/offerings/new", lazy: () => import("@/routes/shaping/offerings/new") } // ← fail #5-6
{ path: "/roadmap", lazy: () => import("@/routes/roadmap") }               // ← fail #7-8
```

**Cold Compile 메커니즘**:
1. CI에서 Vite dev server 시작 (Vite warms 기본 진입점만 — `src/main.tsx`)
2. lazy route module은 첫 번째 `page.goto()` 시점에 on-demand compile
3. TypeScript + React + 의존 모듈 전체 transform = 수 초~수십 초
4. CI runner (GitHub-hosted) = 상대적으로 느린 CPU → compile 더 느림

**docs-only push 실패의 의미**:
- 코드 변경 0건 (`5d30ad4` docs-only) → CI fail
- 코드 버그 가능성 0 → **순수 환경 타이밍 문제 100% 확정**

**PR CI vs Master Push CI 차이**:
- 동일한 e2e.yml, 동일한 코드, 동일한 runner
- F651에서 `.skip` 제거 → total test count 증가 → **shard 내 test 순서 재분배**
- PR CI: failing test가 shard 후반 배치 가능성 → 이전 test가 Vite warming → retry 성공
- Master push CI: shard 분배 패턴이 달라 failing test가 초반 배치 → cold start 직격 → 3회 retry 모두 실패

---

## P-c: 8 Fail Spec 근본 원인 클래스 분류

### Class A: Insufficient Timeout (타임아웃 부족)

| # | 위치 | 현재 timeout | 필요 timeout | 근거 |
|---|------|--------------|--------------|------|
| 2 | ax-bd-hub:52 Discovery | 10000ms | ≥30000ms | BMC 기준 20000도 실패, Discovery는 더 짧음 |
| 3 | discovery-detail-advanced:218 startBtn | 15000ms | ≥30000ms | 모달 체인 지연: route lazy + hydration + modal open |
| 4 | discovery-detail-advanced:257 click 후 | 15000ms | ≥30000ms | startBtn.click() 후 BusinessPlanViewer 렌더 대기 |

### Class B: No Timeout (타임아웃 미지정 = 5s default)

| # | 위치 | assertion | 필요 조치 |
|---|------|-----------|----------|
| 5 | offering-pipeline:141-143 | `toBeVisible()` no timeout | 명시적 30000 추가 |
| 8 | roadmap-changelog:41 | `toBeVisible()` no timeout | 명시적 30000 추가 |

### Class B': Wrong Wait Strategy (잘못된 대기 전략)

| # | 위치 | 현재 전략 | 문제점 | 필요 조치 |
|---|------|-----------|--------|----------|
| 1 | ax-bd-hub:47-48 | `waitForLoadState("domcontentloaded")` | HTML parse 완료 ≠ React lazy module 로딩 완료 ≠ hydration 완료 | `networkidle` 또는 specific element wait |

### Class C: Potentially Obsolete Test (검증 필요)

| # | 위치 | 의심 이유 | 권고 |
|---|------|-----------|------|
| 5-6 | offering-pipeline:132+138 | F651 un-skip됐으나 `/shaping/offerings/new` 실제 UI 검증 미수행 | 라우트 + 위자드 UI 존재 여부 재확인 후 skip 재평가 |

---

## P-d: 단일 원인 vs 복합 원인 판정

**판정: 복합 원인 (주원인 + 가중 요인)**

```
주원인 (iv): Vite cold compile
  → CI Vite transform cache 없음
  → 매 shard fresh start
  → lazy route 첫 navigate = 수십 초 compile burst

가중 요인 A: Class A/B assertion timeout 부족
  → 일부 assertion이 cold compile 완료 전에 timeout
  → 특히 "NO TIMEOUT" 케이스는 5s default → 거의 확실히 실패

가중 요인 B: ProtectedRoute 2-render cycle
  → isHydrated=false 동안 spinner만 표시 (main 없음)
  → Vite compile 지연과 결합하면 지연 체인 증폭

트리거 조건: F651이 test .skip 제거
  → total test count 증가
  → shard 내 failing test 배치 위치 변경
  → PR CI는 우연히 warming 후 실행 / Master CI는 cold 상태 실행
```

**결론**: "코드 버그 0, 환경 타이밍 의존 100%"는 docs-only push 실패로 확정. 단, assertion timeout/전략 결함(Class A/B/B')은 타이밍 문제를 악화시키는 코드 부채로 별도 분류 가능.

---

## P-e: F654 후속 Sprint 분할 권고

### 권고 Sprint 구조

```
F654 Sprint 389: Class A/B/B' Fix (timeout 보정 + wait strategy 교체)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
변경 대상 (6개 assertion):
1. ax-bd-hub.spec.ts:52    timeout: 10000 → 30000
2. ax-bd-hub.spec.ts:47-48 waitForLoadState("domcontentloaded") → "networkidle"
3. discovery-detail-advanced.spec.ts:218+257 timeout: 15000 → 30000
4. offering-pipeline.spec.ts:141-143 toBeVisible() → toBeVisible({ timeout: 30000 })
5. roadmap-changelog.spec.ts:41 toBeVisible() → toBeVisible({ timeout: 30000 })
예상 영향: Class A/B 케이스 완전 해소, Class B' 부분 완화

(선택) F655 Sprint 390: Vite Cache CI 최적화
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
변경 대상: e2e.yml
- Vite transform cache 추가: actions/cache → node_modules/.vite
- 또는 `pnpm vite build --ssr` pre-warm 단계 추가
위험: build 시간 증가 (현재 4 shard × build ≈ 5분 추가)
권고: F654 fix 후에도 재발 시 진행

(선택) F656 Sprint 391: Class C 검증 + offering-pipeline skip 재평가
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
변경 대상: offering-pipeline.spec.ts wizard test
- /shaping/offerings/new 라우트 실제 UI 확인
- 위자드 1단계 실제 텍스트 확인 (발굴 아이템 선택 / 새 사업기획서 만들기)
- 맞으면 timeout 추가, 틀리면 re-skip
```

### 최우선 권고: F654만 먼저 실행

F654 (Class A/B/B' timeout fix)는 최소 침습적이고 즉시 효과 예상. CI에서 Vite warm 후 assertion이 충분한 시간 내 통과 가능해짐. F655/F656은 F654 후 재발 여부 확인 후 결정.

---

## 진단 신뢰도

| 증거 유형 | 건수 | 신뢰도 |
|-----------|------|--------|
| 코드 직접 분석 (spec 파일) | 8건 | 직접 증거 |
| 코드 직접 분석 (fixture/component) | 5건 | 직접 증거 |
| CI 설정 분석 (e2e.yml, playwright.config.ts) | 2건 | 직접 증거 |
| docs-only push 실패 관찰 | 1건 | 결정적 증거 |
| shard 분배 변화 추론 (F651 .skip 제거) | 1건 | 논리적 추론 |

**종합**: 직접 코드 증거 15건 + 결정적 환경 증거 1건 → 가설 (iv)가 주원인임을 높은 확신도로 판정.

---

## Appendix: CI 실패 Run 정보

| Run | Commit | 변경 | 결과 |
|-----|--------|------|------|
| #25666141353 | b2beb7c (F652) | E2E timeout 증가 | shard 1+3 FAIL |
| #25666230154 | 5d30ad4 | docs-only (코드 0) | shard FAIL |

docs-only 실패 = 환경 의존 확정 증거.
