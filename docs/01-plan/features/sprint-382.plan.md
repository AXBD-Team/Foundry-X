# Sprint 382 Plan — F646 e2e shard 1+2 잔존 4 spec content drift fix

> **Sprint**: 382 | **F-item**: F646 | **REQ**: FX-REQ-710 | **Priority**: P2
> **Date**: 2026-05-10 | **Session**: S352

## 1. 목표

F644 Sprint 381 PR #803 MERGED 후속. autopilot이 fixture/JWT/mock 3건 fix는 완료했으나
페이지 실 컨텐츠와 selector drift 잔존 4건 → e2e shard 1+2 FAIL.

본 sprint = 4 spec content drift fix → e2e 4 shard 100% GREEN 회복 → admin merge 0건 정착 입증.

## 2. 사전 측정 (S352, 2026-05-10, PR #803 run 25630295125)

### 2.1 잔존 FAIL 4건

| # | Shard | Spec:Line | 실패 selector | 추정 |
|---|-------|-----------|--------------|------|
| 1 | (1,4) | `ax-bd-hub.spec.ts:18` | `getByText("아이디어 목록")` | line 16 "사업기획서" 헤딩은 OK, line 18만 fail. 텍스트 변경 또는 컴포넌트 제거 |
| 2 | (1,4) | `conflict-resolution.spec.ts:57` | `getByText("에이전트 토큰 사용량 차트").first().click()` 30s timeout | 대시보드 컴포넌트 변경/제거 후 selector drift |
| 3 | (1,4) | `conflict-resolution.spec.ts:64` | 동일 패턴 다른 test | 동 |
| 4 | (2,4) | `feedback-dashboard.spec.ts:148` | `feedbackLink.toBeVisible()` | F644에서 JWT role:admin 추가했지만 sidebar 링크 selector 자체 drift |

### 2.2 F644 fix가 미해결한 이유

- F644 범위: integration-path.spec.ts (line 40 + 149) + feedback-dashboard.spec.ts (line 148) + agent-execute/streaming/work-management
- ax-bd-hub + conflict-resolution은 **F644 scope 외** (autopilot 진단 못 함)
- feedback-dashboard.spec.ts:148은 F644 범위였지만 **selector 자체 drift** (JWT role 외 추가 fix 필요)

## 3. 범위 (Phase Exit P-a~P-h Smoke Reality 8항)

### 3.1 변경 파일

| # | 파일 | 변경 |
|---|------|-----|
| (a) | `reports/sprint-382-e2e-content-drift.md` | 4 spec 정밀 진단 + 패키지 내 실 컨텐츠 매핑 표 |
| (b) | `packages/web/e2e/ax-bd-hub.spec.ts:18` | "아이디어 목록" 실 selector 동기화 또는 obsolete면 skip + 사유 |
| (c) | `packages/web/e2e/conflict-resolution.spec.ts:57+64` | "에이전트 토큰 사용량 차트" 동기화 또는 mock 보강 |
| (d) | `packages/web/e2e/feedback-dashboard.spec.ts:148` | sidebar feedback 링크 실 selector (getByRole/data-testid) |
| (e) | `docs/01-plan/features/sprint-382.plan.md` | 본 문서 |
| (f) | `docs/02-design/features/sprint-382.design.md` | autopilot 설계 |
| (g) | `docs/04-report/sprint-382.report.md` | 결과 보고 |

### 3.2 OBSERVED Phase Exit (P-a~P-h)

| # | 검증 | 판정 |
|---|------|------|
| **P-a** | 4 spec content drift reports 진단 첨부 (`reports/sprint-382-e2e-content-drift.md`) | 파일 존재 + 매핑 표 |
| **P-b** | `ax-bd-hub.spec.ts:18` PASS | shard 1 GREEN |
| **P-c** | `conflict-resolution.spec.ts:57+64` PASS | shard 1 GREEN |
| **P-d** | `feedback-dashboard.spec.ts:148` PASS | shard 2 GREEN |
| **P-e** | e2e shard 1~4 모두 PASS (4/4) — **F644 P-e 보강 완결** | CI 4 shard GREEN |
| **P-f** | `pnpm turbo run typecheck/lint --force` cache 0건 + 19/19 PASS (S337) | turbo 출력 |
| **P-g** | dual_ai_reviews sprint 382 자동 INSERT ≥ 1건 (hook 47 sprint 연속) | D1 query |
| **P-h** | master push 후 E2E Tests workflow 자동 실행 + GREEN 검증 (F644 P-i 후속) | gh run list |

### 3.3 Out-of-scope (별 sprint 후보)

- F645 content-sync silent layer 7 근본 fix (column 분리 안정화)
- e2e coverage 추가 (75% → 85%+)
- BeSir 5/15 D-5 사전 점검
- e2e (3,4) 결과 (PR #803 시점 in_progress) — pass면 무관, fail이면 본 sprint 흡수 가능

## 4. 실행 절차

### 4.1 Sprint 시동
```
bash -i -c "sprint 382"     # WT 생성 (F643 fix 적용 후 두 번째 sprint, F644 row escape pipe fix 후 첫 sprint — awk 매칭 정상화 검증)
ccs --model sonnet
/ax:sprint-autopilot
```

### 4.2 Autopilot SCOPE LOCKED
- F646 (a)~(g) 명시
- 각 4 spec 별 autopilot 진단 절차: (1) `packages/web/src/routes/{ax-bd|conflict|dashboard}/*.tsx` 실 컨텐츠 grep → (2) selector 후보 도출 → (3) spec 보정
- Out-of-scope 4종 명시

### 4.3 Master 검증 (post-merge)
- P-a~P-h 8/8 PASS 직접 검증
- e2e 4 shard 100% GREEN = admin merge 0건 회복 본격 입증
- master push 자동 e2e 트리거 GREEN 동반

## 5. 위험 + 대응

| # | 위험 | 대응 |
|---|------|------|
| R1 | 일부 spec obsolete (페이지 자체 제거) | design 사유 기록 후 `.skip()` 추가 |
| R2 | selector 변경이 다른 spec에 영향 | 회귀 verification 4 shard 2회 재실행 후 판정 |
| R3 | ax-bd-hub/conflict-resolution은 F644 scope 외 → autopilot 처음 보는 화면 | fs 실측 + 컴포넌트 grep으로 정확 selector 도출 (S352 fs 실측 의무화 패턴 28회차) |
| R4 | F644 fixture/JWT fix 후에도 feedback-dashboard.spec.ts:148 fail | sidebar 컴포넌트 직접 grep → 실 link 텍스트/role/data-testid 매핑 |

## 6. 다음 사이클 후보

- F645 silent layer 7 근본 fix (column 분리 안정화)
- W19 BeSir 5/15 D-day (5/15 진행)
- 5/14 dry-run 사전 점검 (D-4)
- e2e coverage 75% → 85%+ (별 sprint)

## 7. 메타

- **46 sprint 연속 성공** (S306~S352, F560~F644). F646 = 47번째 후보
- **F644 P-f/P-i ✅ 충족**: master push e2e 트리거 작동 검증 완료 (run 25630296570)
- **F644 P-e 부분 충족 → F646으로 보강**: e2e (4,4) ✅ 단독 → 4 shard 100% GREEN 회복 목표
- BeSir 5/15 D-5 demo 안정성 직접 영향 — e2e 100% GREEN = 데모 인프라 안정 입증 완결
- F643 fix 효과 2차 검증 자연 동반: Sprint 382 시동 시 stale F_ITEMS 0건 + signal F_ITEMS=F646 자동 추출 (F644 row escape pipe fix `9f5afc51` 이후 awk 정상)
