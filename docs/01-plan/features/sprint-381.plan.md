# Sprint 381 Plan — F644 E2E selector/fixture 누적 부채 fix

> **Sprint**: 381 | **F-item**: F644 | **REQ**: FX-REQ-709 | **Priority**: P2
> **Date**: 2026-05-10 | **Session**: S352

## 1. 목표

직전 6개 PR(#794 F641 / #792 F639 / #798 F604 hotfix / #795 F604 / #799 F605 / **#802 F643**) e2e shard 1~3
연속 FAILURE 후 admin merge 정당화 누적 부채 영구 해소.

추가로 master push에 E2E Tests workflow 미트리거 패턴(가시화 0)을 회복하여 동일 부채 재축적 차단.

## 2. 사전 측정 (S352, 2026-05-10)

### 2.1 PR #802 (sprint/380) e2e 실패 로그

```
e2e (1, 4) shard 1/4
  > 149 |     await expect(page.getByText(/실행 실패|503/)).toBeVisible({ timeout: 10000 });
       Error: element(s) not found

e2e (2, 4) shard 2/4
  > 148 |     await expect(feedbackLink).toBeVisible();
       Error: element(s) not found
  > 40 |      await expect(page.locator("main")).toBeVisible();
       Error: element(s) not found

e2e (3, 4) shard 3/4
  (similar pattern)
```

### 2.2 실패 spec 파일 식별

- `packages/web/e2e/integration-path.spec.ts` (line 40 + 149)
- `packages/web/e2e/feedback-dashboard.spec.ts` (line 148)
- `packages/web/e2e/agent-execute.spec.ts` (실행 실패/503 grep 매칭)
- `packages/web/e2e/agent-streaming.spec.ts` (동)
- `packages/web/e2e/work-management.spec.ts` (동)

### 2.3 추정 근본 원인

**S313 패턴 후보** (`feedback_playwright_fixture_route_gotchas.md`):
- fixture destructure `{page}` → `{authenticatedPage:page}` 누락 → ProtectedRoute 통과 못 함 → `main` 미렌더
- E2E audit 회복(S313, PR #695) 시 12곳 fix 했지만 후속 spec에서 재발 가능

**추가 가능성**:
1. 라우팅 변경 후 spec 미동기화 (S347 docs/specs 경로 stale 패턴 후보)
2. mock data shape mismatch (page.route mock과 실 API response shape drift)
3. dev server cold-start race / port collision

### 2.4 master push CI 미트리거 (가시화 0)

```bash
$ gh run list --workflow="E2E Tests" --limit 5
sprint/380 failure  (PR #802)
sprint/379 failure  (PR #801)
fix/s349-f605-session-end failure  (PR #800)
sprint/378 failure  (PR #799)
fix/sprint-377-kpi-test-bugs failure  (PR #798)
```

→ master push에는 e2e 미실행 → admin merge 후 가시화 0 → 누적 부채.

## 3. 범위 (Phase Exit P-a~P-i Smoke Reality 9항)

### 3.1 변경 파일 (예상)

| # | 파일 | 변경 |
|---|------|-----|
| (a) | `reports/sprint-381-e2e-diagnosis.md` | 5 spec 정밀 진단 + 패턴별 분류 |
| (b) | `packages/web/e2e/integration-path.spec.ts` | fixture destructure 보정 + main 가시성 회복 |
| (c) | `packages/web/e2e/feedback-dashboard.spec.ts` | feedbackLink 라우팅 정합성 |
| (d) | `packages/web/e2e/agent-*.spec.ts` (3종) | `getByText(/실행 실패\|503/)` mock + wait 보정 |
| (e) | `packages/web/e2e/work-management.spec.ts` | 동 패턴 fix |
| (f) | `packages/web/e2e/_helpers/*` (있으면) | 공통 fixture/wait 보강 (선택) |
| (g) | `.github/workflows/e2e.yml` | `on: push: branches: [master]` 추가 |
| (h) | `docs/01-plan/features/sprint-381.plan.md` | 본 문서 |
| (i) | `docs/02-design/features/sprint-381.design.md` | autopilot 설계 |
| (j) | `docs/04-report/sprint-381.report.md` | 결과 보고 |

### 3.2 OBSERVED Phase Exit (P-a~P-i)

| # | 검증 | 판정 |
|---|------|------|
| **P-a** | 실패 spec 5건 reports 진단 첨부 (`reports/sprint-381-e2e-diagnosis.md`) | 파일 존재 + 분류 표 |
| **P-b** | fixture destructure 누락 fix 적용 (S313 패턴) — `{page}` → `{authenticatedPage:page}` grep 0건 | grep 결과 |
| **P-c** | `integration-path.spec.ts` `main` 가시성 PASS | shard 1+3 GREEN |
| **P-d** | `feedback-dashboard.spec.ts` feedbackLink PASS | shard 2 GREEN |
| **P-e** | e2e shard 1~4 모두 PASS (4/4) | CI 4 shard GREEN |
| **P-f** | `e2e.yml` master push 트리거 추가 + 회귀 0 | yml grep + master push 1회 자동 실행 검증 |
| **P-g** | `pnpm turbo run typecheck/lint --force` cache 0건 + 19/19 PASS (S337 함정 회피) | turbo 출력 |
| **P-h** | dual_ai_reviews sprint 381 자동 INSERT ≥ 1건 (hook 46 sprint 연속) | D1 query |
| **P-i** | master push 후 E2E Tests workflow 1회 자동 실행 + GREEN 검증 (가시화 회복 실증) | gh run list |

### 3.3 Out-of-scope (별 sprint 후보)

- F645 content-sync silent layer 7 fix (column 4/5 정확 추출, S351/S352 신규 발견)
- e2e coverage 추가 (75% → 85%+, S313 후속, 별 sprint)
- BeSir 5/15 D-5 사전 점검 (별 트랙)
- archive S332~S352 → MEMORY 압축 (META 병행)

## 4. 실행 절차

### 4.1 Sprint 시동
```
bash -i -c "sprint 381"     # WT 생성 (F643 fix 적용 후 첫 sprint — stale 검증 trigger)
ccs --model sonnet
/ax:sprint-autopilot
```

### 4.2 Autopilot SCOPE LOCKED 주입
- F644 (a)~(g) 명시
- Out-of-scope 4종 명시
- Phase Exit P-a~P-i numerical 강제

### 4.3 Master 검증 (post-merge)
- 위 P-a~P-i 9/9 PASS 직접 검증
- Stale F_ITEMS 17회차 재발 0건 검증 (F643 P-f, P-g 충족)
- master push e2e workflow 자동 실행 1회 GREEN

## 5. 위험 + 대응

| # | 위험 | 대응 |
|---|------|------|
| R1 | 실패 원인 다층 (라우팅+mock+timing) 복합 | autopilot 우선순위 분류 + 부분 fix + 잔존 plan 별 PR |
| R2 | dev server cold-start race | 회귀 verification 2회 재실행 후 판정 |
| R3 | master push 트리거 추가 시 CI 비용 증가 | 수용 (admin merge 0건 회복 가치 > 비용) |
| R4 | F643 stale fix 효과 미검증 | sprint 381 시동 시 stale 0건 = F643 P-f/P-g 자연 충족 (이중 효과) |

## 6. 다음 사이클 후보

- F645 content-sync silent layer 7 fix (S351/S352 신규 발견)
- W19 BeSir 5/15 D-day (5/15 진행)
- 5/14 dry-run 사전 점검 (D-4)
- archive S332~S352 → MEMORY 압축 (META 병행)
- e2e coverage 75% → 85%+ (별 sprint)

## 7. 메타

- **45 sprint 연속 성공** (S306~S351, F560~F643) + production-fail-revert 1 (S341) + cascading-revert 1 (S345)
  + PoC-deferred 1 (S343) + lint-fail-hotfix-forward 1 (S348) + autopilot-failed-master-recovery-admin-merge 1 (S351)
- F644 = **e2e CI 회복 + master push 가시화** = 5 PR 누적 부채 종결 + F643 fix 검증 동반
- BeSir 5/15 D-5 demo 안정성 직접 영향 — e2e GREEN 회복 = 데모 인프라 안정 입증
