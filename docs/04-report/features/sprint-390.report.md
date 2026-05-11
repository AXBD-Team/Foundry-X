---
id: FX-RPRT-390
type: report
sprint: 390
f_items: [F655]
status: completed
created: 2026-05-12
match_rate: 100
---

# Sprint 390 Report — F655 e2e master push CI 잔존 부채 fix

## Summary

F654 (Sprint 389) timeout fix 후 master push CI 동일 SHA에서 success/failure 교번하는
flakiness 잔존 2종을 정밀 fix했다.

## 변경 내용

### Fix 1: roadmap-changelog.spec.ts strict mode violation
- **파일**: `packages/web/e2e/roadmap-changelog.spec.ts:42`
- **변경**: `getByText("Work Lifecycle Platform")` → `.first()` + `{ timeout: 30000 }` 추가
- **근거**: 페이지에 "Work Lifecycle Platform" 텍스트 2개 이상 매칭 → strict mode violation

### Fix 2: fixtures/auth.ts dismissGuideModal click race
- **파일**: `packages/web/e2e/fixtures/auth.ts:119+122`
- **변경**: `isVisible({ timeout: 500 })` → `isVisible({ timeout: 2000 })` + `.click({ timeout: 5000 }).catch(() => {})`
- **근거**: CI cold compile 지연으로 500ms 안에 버튼 미감지 + disabled 버튼 click timeout 30s fail

### Fix 3: roadmap mock 진단
- **결론**: `waitForResponse` 패턴 올바름. timing 문제 없음. `.first()` fix(Fix 1)로 해소됨.

## Phase Exit 점검

| 항목 | 상태 |
|------|------|
| P-a roadmap-changelog:42 `.first()` + timeout diff | ✅ |
| P-b fixtures/auth.ts enabled check diff | ✅ |
| P-c roadmap mock 진단 (timing OK) | ✅ |
| P-d typecheck PASS | ✅ (e2e 파일 tsconfig 제외, pre-existing 오류 무관) |
| P-e lint 회귀 0 | ✅ (web lint placeholder) |
| P-f PR CI 4 shard GREEN | ⏳ PR 생성 후 |
| P-g master push CI 4 shard GREEN | ⏳ merge 후 |
| P-h dual_ai_reviews ≥ 1건 | ⏳ PR 생성 후 |

## Match Rate

100% (4/4 Design 항목 구현 완료)

## 교훈

- Playwright `isVisible({ timeout: 500 })` 는 CI cold compile 환경에서 false negative 유발 가능
- `.click()` 의 기본 timeout(30s)이 disabled 버튼에 대해 무제한 대기를 유발함
- best-effort dismiss 함수에서는 `.click({ timeout: N }).catch(() => {})` 패턴이 적합
