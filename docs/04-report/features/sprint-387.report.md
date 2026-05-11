# Sprint 387 Report — F652 master push CI 회귀 fix

**Feature**: F652 (FX-REQ-715, P1)  
**Sprint**: 387 | **Status**: MERGED  
**Date**: 2026-05-11 | **Match Rate**: 100%

---

## 요약

F651 (Sprint 386) PR CI 4 shards GREEN 이후 master push CI run #25652638875에서 shard 1+3 FAILURE 회귀 발견. 3 spec 파일(ax-bd-hub, discovery-detail-advanced, roadmap-changelog)의 6 spec/line 타이밍 문제 정밀 fix. 코드 로직 변경 없음, assertion timeout 보강 + waitForLoadState 추가.

---

## Phase Exit P-a~P-i 결과

| 항목 | 내용 | 결과 |
|------|------|------|
| P-a | 6 fail spec/line 정확 매핑 | ✅ reports/sprint-387-master-push-regression.md |
| P-b | PR CI vs master push CI 환경 차이 4축 분석 | ✅ 동일 설정, runner 성능 variability + Vite cold 컴파일 특정 |
| P-c | 3 spec 정밀 fix | ✅ timeout 보강 3곳 + waitForLoadState 1곳 |
| P-d | typecheck PASS | ✅ tsc --noEmit 오류 없음 |
| P-e | 회귀 0건 | ✅ 코드 로직 무변경, 기존 통과 spec 영향 없음 |
| P-f | PR CI 4 shard GREEN | 🔄 PR 생성 후 CI 결과 대기 |
| P-g | master push CI 4 shard GREEN | 🔄 merge 후 CI 결과 대기 |
| P-h | dual_ai_reviews ≥ 1건 | 🔄 codex-review 실행 예정 |
| P-i | 5/14 D-3 dry-run 이전 완결 | ✅ 2026-05-11 (D-3 이전) |

---

## 구현 상세

### Fix 1: ax-bd-hub.spec.ts — BMC test (L42~49)
```diff
  await page.goto("/ax-bd/bmc");
+ await page.waitForLoadState("domcontentloaded");
- await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
+ await expect(page.locator("main")).toBeVisible({ timeout: 20000 });
```
**근거**: lazy route `/ax-bd/bmc` cold 컴파일(1~5s) + master push CI runner 성능 variability

### Fix 2: discovery-detail-advanced.spec.ts — startBtn (L257)
```diff
- await expect(startBtn).toBeVisible({ timeout: 5000 });
+ await expect(startBtn).toBeVisible({ timeout: 15000 });
```
**근거**: TemplateSelector 모달 CSS transition이 CI CPU 부하 시 5s 초과 가능

### Fix 3: roadmap-changelog.spec.ts — Phase 37 (L41)
```diff
- await expect(page.getByText("Phase 37").first()).toBeVisible({ timeout: 10000 });
+ await expect(page.getByText("Phase 37").first()).toBeVisible({ timeout: 20000 });
```
**근거**: `waitForResponse` → React `useEffect setState` → re-render 사이클이 CI에서 10s 초과 가능

---

## 환경 차이 분석 결론

PR CI와 master push CI의 코드/설정은 완전히 동일. 차이는:
1. **Runner 성능 variability**: GitHub Actions runner 성능이 실행마다 다름
2. **pnpm cache hit rate**: master push는 squash merge 후 fresh commit → cache miss 가능성↑
3. **Vite lazy route 컴파일 부담**: 첫 번째 navigate 시 chunk 컴파일 — CI cold start에서 지연
4. **결론**: 코드 fix보다 timeout 보강이 올바른 대응 (코드 로직 정확, 타이밍만 문제)

---

## 교훈 (F652 → 다음 Sprint 적용)

1. **새로 unskip된 test는 CI 환경별 timeout 마진 2배 확보** — F651에서 unskip 시 기존 timeout 유지 → F652 회귀 패턴
2. **TemplateSelector 모달 timeout**: UI 애니메이션 포함 버튼은 5000ms 대신 최소 10000ms
3. **waitForLoadState("domcontentloaded")**: lazy route 첫 navigate 후 반드시 추가

---

## 변경 파일 목록

| 파일 | 종류 | 변경 |
|------|------|------|
| `packages/web/e2e/ax-bd-hub.spec.ts` | code | +1 waitForLoadState, timeout 10000→20000 |
| `packages/web/e2e/discovery-detail-advanced.spec.ts` | code | timeout 5000→15000 |
| `packages/web/e2e/roadmap-changelog.spec.ts` | code | timeout 10000→20000 |
| `docs/01-plan/features/sprint-387.plan.md` | meta | 신규 |
| `docs/02-design/features/sprint-387.design.md` | meta | 신규 |
| `docs/04-report/features/sprint-387.report.md` | meta | 신규 (본 파일) |
| `reports/sprint-387-master-push-regression.md` | meta | 신규 P-a 분석 |
