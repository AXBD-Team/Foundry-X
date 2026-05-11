# Sprint 387 Design — F652 master push CI 회귀 fix

**Feature**: F652 (FX-REQ-715, P1)  
**Sprint**: 387

---

## §1 환경 차이 분석 결과 (4축)

| 축 | PR CI | Master push CI | 차이 |
|----|-------|----------------|------|
| reuseExistingServer | false | false | 동일 |
| webServer timing | web(3000)+api(3001) 병렬 | 동일 | 동일 |
| harness-kit prebuild | build 완료 후 실행 | 동일 | 동일 |
| Playwright retry | 2 retries | 동일 | **runner 부하/속도 차이** |

**결론**: CI 환경 설정 차이 없음 → runner 성능 variability + Vite lazy route cold 컴파일이 근본 원인.
- PR CI: sprint/386 branch (이전 pnpm cache 활용 가능)
- Master push CI: squash merge 후 fresh commit (cache miss 가능성↑)

---

## §2 Lazy Route 영향 분석

```
router.tsx L30: { path: "roadmap", lazy: () => import("@/routes/roadmap"), hydrateFallbackElement: <Spinner /> }
router.tsx L94: { path: "ax-bd/bmc", lazy: () => import("@/routes/ax-bd/bmc") }
```

- `/roadmap`: lazy + Spinner fallback → 첫 navigate 시 Vite 컴파일 1~5초
- `/ax-bd/bmc`: lazy + **Spinner fallback 없음** → AppLayout `main`이 렌더되지만, 내부 `<Outlet />` empty 상태가 길어질 수 있음
- 두 라우트 모두 `useEffect` 기반 API 호출 → 컴파일 완료 후 mount → fetch → re-render 사이클

---

## §3 6 Failing Spec Line-Level 매핑

### [1] ax-bd-hub.spec.ts L42-49
```typescript
// 현재 (L47-48)
await page.goto("/ax-bd/bmc");
await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

// 수정 (L47-49)
await page.goto("/ax-bd/bmc");
await page.waitForLoadState("domcontentloaded");
await expect(page.locator("main")).toBeVisible({ timeout: 20000 });
```

### [2] discovery-detail-advanced.spec.ts L256-258
```typescript
// 현재 (L257)
await expect(startBtn).toBeVisible({ timeout: 5000 });

// 수정 (L257)
await expect(startBtn).toBeVisible({ timeout: 15000 });
```

### [3] roadmap-changelog.spec.ts L40-41
```typescript
// 현재 (L41)
await expect(page.getByText("Phase 37").first()).toBeVisible({ timeout: 10000 });

// 수정 (L41)
await expect(page.getByText("Phase 37").first()).toBeVisible({ timeout: 20000 });
```

---

## §4 파일 매핑

| 파일 | 변경 라인 | 변경 내용 |
|------|-----------|-----------|
| `packages/web/e2e/ax-bd-hub.spec.ts` | L47-48 | `waitForLoadState` 추가, timeout 10000→20000 |
| `packages/web/e2e/discovery-detail-advanced.spec.ts` | L257 | timeout 5000→15000 |
| `packages/web/e2e/roadmap-changelog.spec.ts` | L41 | timeout 10000→20000 |
| `reports/sprint-387-master-push-regression.md` | 신규 | P-a 분석 보고서 |

---

## §5 TDD 적용 범위

본 Sprint는 E2E spec 수정 (TDD 면제 — spec 파일 자체가 테스트). 타입체크 + 회귀 검증으로 대체.

---

## §6 위험 분석

| 위험 | 대응 |
|------|------|
| timeout 증가로도 flaky 지속 | .skip + 설계 사유 기록 (F650 패턴) |
| roadmap "Phase 37" 텍스트 미렌더 | 컴포넌트 조건 확인: `active` 리스트 포함 여부 (pct:66 → active ✅) |
| BMC `main` 여전히 timeout | AppLayout 구조 확인 완료: `main`은 lazy 라우트 외부에 렌더 → timeout 증가로 충분 |
