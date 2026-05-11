---
id: FX-PLAN-390
type: plan
sprint: 390
f_items: [F655]
status: active
created: 2026-05-12
---

# Sprint 390 Plan — F655 e2e master push CI 잔존 부채 fix

## 목적

F654 (Sprint 389) timeout fix가 ~50% 효과에 그쳐 master push CI 동일 SHA에서
success/failure 교번하는 flakiness 잔존. 신규 발견 3종을 정밀 fix한다.

## F655 범위 (FX-REQ-718, P1)

### 버그 1: roadmap-changelog.spec.ts strict mode violation
- **파일**: `packages/web/e2e/roadmap-changelog.spec.ts`
- **현재 line 42**: `await expect(page.getByText("Work Lifecycle Platform")).toBeVisible();`
- **문제**: "Work Lifecycle Platform" 텍스트가 페이지에 2개 이상 (phase name + page title) → strict mode violation
- **fix**: `.first()` + `{ timeout: 30000 }` 추가

### 버그 2: fixtures/auth.ts dismissGuideModal click race
- **파일**: `packages/web/e2e/fixtures/auth.ts`
- **현재 lines 119+122**: `isVisible({ timeout: 500 })` 후 즉시 `.click()` — disabled 버튼 click race
- **문제**: CI에서 버튼이 visible이지만 disabled 상태일 때 click → 30s timeout fail
- **fix**: timeout 500→2000 + enabled check before click

### 버그 3: roadmap-changelog mock 진단
- **판단**: `waitForResponse` 패턴이 이미 올바르게 적용됨. timing 문제 없음.
- **action**: Bug 1 fix (.first()) 만으로 해소됨. data-testid 전환은 deferred.

## 구현 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `packages/web/e2e/roadmap-changelog.spec.ts` | line 42: `.first()` + `{ timeout: 30000 }` |
| `packages/web/e2e/fixtures/auth.ts` | dismissGuideModal: timeout 500→2000, enabled check |

## Phase Exit 기준

- P-a: roadmap-changelog:42 `.first()` + timeout diff 적용
- P-b: fixtures/auth.ts dismissGuideModal enabled check diff 적용
- P-c: roadmap mock timing 진단 결과 (timing OK 확인)
- P-d: typecheck PASS
- P-e: lint 회귀 0
- P-f: PR CI 4 shard GREEN
- P-g: master push CI 4 shard GREEN (결정론적 PASS)
- P-h: dual_ai_reviews ≥ 1건 INSERT

## OUT OF SCOPE

- playwright retries 변경
- Vite cache CI 최적화
- Class C obsolete 검증
- playwright.config.ts webServer 변경
- 다른 spec timeout 조정
