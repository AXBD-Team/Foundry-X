---
id: FX-DESIGN-388
sprint: 388
f_items: [F653]
status: done
created: 2026-05-12
---

# Sprint 388 Design — F653 진단 설계

## 진단 아키텍처

```
GitHub Actions CI
├── e2e.yml (동일 steps for pull_request + push:master)
│   ├── pnpm install (cache: pnpm 글로벌 스토어만)
│   ├── build shared-contracts → shared → harness-kit
│   └── pnpm e2e --shard=N/4
│
├── playwright.config.ts
│   ├── workers: 1 (CI only)
│   ├── retries: 2 (CI only)
│   ├── reuseExistingServer: false (CI only)
│   └── webServer[2]: web(3000) + api(3001)
│
└── test fixture stack
    ├── authenticatedPage: goto("/") → localStorage → mocks → use(page)
    └── test: page.route(mock) → goto("/protected/route") → assertions
```

## 4축 가설 분류 표

| 축 | 가설 내용 | 결정 증거 | 판정 |
|----|----------|----------|------|
| (i) mock fixture | page.route() 등록 순서 문제 | 모든 failing test가 goto() 전에 mock 등록 | **FAIL (무관)** |
| (ii) auth fixture | hydrate() timing race | ProtectedRoute 분석, isHydrated=false → spinner | 조건부 |
| (iii) dev server cold-start | API server 미준비 | roadmap public test도 fail (API mock 있음) | 부분 기여 |
| (iv) Vite cold compile | lazy route 첫 compile 지연 | docs-only push fail = 코드 무관 = 환경 의존 | **주원인** |

## 세부 분석 — 8 Fail Spec

### 1. ax-bd-hub:42 — BMC 목록 페이지 렌더링

```typescript
// 현재 코드 (F652 수정 후)
await page.goto("/ax-bd/bmc");
await page.waitForLoadState("domcontentloaded");
await expect(page.locator("main")).toBeVisible({ timeout: 20000 });
```

**경로**: `/ax-bd/bmc` → ProtectedRoute (lazy) → AppLayout (static) → bmc route (lazy)  
**root cause**: 
- ProtectedRoute가 lazy module → 첫 번째 compile은 Vite cold
- `domcontentloaded`는 HTML parse 완료를 기다리지만 React hydration 완료 ≠
- lazy route module 로딩 (추가 HTTP round-trip to Vite) → `<main>` render 지연
- timeout: 20000ms가 충분하지 않은 경우 존재 (cold start CI runner)

**없는 것**: 명시적 assertion 전 `waitForLoadState("networkidle")` 또는 더 긴 timeout

### 2. ax-bd-hub:52 — Discovery 프로세스 페이지

```typescript
await page.goto("/discovery/items");
await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
//                                                               ↑ 10초만
```

**root cause**: timeout: 10000 — BMC의 20000보다 짧음. 동일한 cold-start 지연 + 더 짧은 tolerance

### 3. discovery-detail-advanced:218 — 기획서 생성

```typescript
const startBtn = page.getByRole("button", { name: "기획서 생성 시작" });
await expect(startBtn).toBeVisible({ timeout: 15000 });  // 15s
await startBtn.click();
// BusinessPlanViewer 표시 확인 — v1 뱃지
await expect(page.getByText("v1").first()).toBeVisible({ timeout: 15000 });
```

**root cause**: startBtn이 모달 내부 요소 → 모달 열림 + 렌더링 지연 체인

### 4. discovery-detail-advanced:257 — startBtn timeout

```typescript
await expect(startBtn).toBeVisible({ timeout: 15000 });
```

Line 257은 `startBtn.click()` 이후 체인. 15s timeout 내 모달 미렌더링

### 5-6. offering-pipeline:132 + :138

```typescript
test("offering-create-wizard — 위자드 1단계 표시"  // line 132
  await page.goto("/shaping/offerings/new");
  await dismissGuideModal(page);               // line 138
  await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByText("발굴 아이템 선택").or(page.getByText("새 사업기획서 만들기")).first(),
  ).toBeVisible();  // ← NO TIMEOUT! 5s default
```

**root cause 2가지**:
1. `dismissGuideModal` loop (12회 × 500ms = 최대 6s) 가 실패하거나 느린 경우
2. wizard text assertion에 **명시적 timeout 없음** → default 5s (Playwright default)
   → `main` 이 나타난 뒤에도 wizard content lazy-render 추가 지연

### 7. roadmap-changelog:21 — Phase 정보 표시

```typescript
test("Roadmap 페이지에 Phase 정보가 표시된다"   // test start at line 21
  const responsePromise = page.waitForResponse("**/api/work/public/roadmap");
  await page.goto("/roadmap");
  await responsePromise;
  await expect(page.getByText("Phase 37").first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Work Lifecycle Platform")).toBeVisible();  // ← NO TIMEOUT
```

**root cause**: 
- `roadmap` 라우트도 lazy: `lazy: () => import("@/routes/roadmap")`
- Vite cold compile of roadmap.tsx → 첫 번째 테스트에서 지연
- **Line 41**: `Work Lifecycle Platform` assertion에 **timeout 없음 → 5s default**
- "Phase 37" 이 겨우 20s에 통과했다면 "Work Lifecycle Platform" 은 이미 timeout

### 8. roadmap-changelog:41 — Work Lifecycle Platform

동일 문제 — `await expect(page.getByText("Work Lifecycle Platform")).toBeVisible()` NO TIMEOUT

## PR CI 통과 / Master push CI 실패 메커니즘

```
PR CI 통과 이유 (가설):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. retries: 2 → 3회 시도. 1회 fail 후 2회째 Vite 캐시 warm → PASS
2. 특정 shard에서 failing test가 나중 순서 → Vite warm 상태에서 실행
3. 두 현상의 조합

Master push CI 실패 이유:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 동일 환경 (e2e.yml 동일), 동일 코드
2. 하지만 shard distribution이 PR vs push 사이에 달라질 수 있음
   → F651에서 .skip 제거로 total test count 증가 → shard 재분배
   → failing tests가 shard의 초반에 배치될 경우 cold start 직격
3. retries=2 이지만 3회 모두 failing: 
   해당 shard의 다른 tests가 먼저 실행되어 Vite 충분히 warming하지 못한 경우

docs-only push도 실패하는 이유:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
코드 변경 0 → 코드 버그 아님 → 순수 환경 타이밍 문제 확정
```

## 근본 원인 분류

### Class A: Insufficient Timeout (수정 가능)
- Discovery test: timeout: 10000 → 30000 이상 필요
- offering-wizard text: timeout 미지정 → 30000 필요
- roadmap Work Lifecycle Platform: timeout 미지정 → 30000 필요

### Class B: Wrong Wait Strategy (수정 필요)
- BMC test: `waitForLoadState("domcontentloaded")` 는 Vite lazy module load 완료 보장 안 함
  → `waitForLoadState("networkidle")` 또는 specific element wait로 교체 필요

### Class C: Potentially Obsolete (skip 재평가 필요)  
- offering-pipeline:132 wizard test: `/shaping/offerings/new` 라우트 + wizard UI 실제 존재 여부 확인 필요
  → F651에서 un-skip됐으나 근본 UI 변경 확인 없이 mock data만 조정됨

## §5 파일 매핑 (진단 산출물만)

| 파일 | 역할 | 변경 여부 |
|------|------|----------|
| `docs/01-plan/features/sprint-388.plan.md` | Plan | 신규 ✅ |
| `docs/02-design/features/sprint-388.design.md` | Design | 신규 ✅ |
| `reports/sprint-388-master-push-diagnosis.md` | 진단 보고서 | 신규 ✅ |
| `docs/04-report/features/sprint-388.report.md` | Sprint Report | 신규 ✅ |

**변경 금지 파일**: 모든 packages/**, playwright.config.ts, e2e/*.spec.ts
