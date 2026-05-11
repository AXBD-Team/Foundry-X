---
id: FX-DESIGN-389
sprint: 389
feature: F654
status: draft
created: 2026-05-12
---

# Sprint 389 Design — F654 assertion timeout/strategy fix

## 1. 배경

F653 진단에서 6 assertion이 CI 환경 지연에 취약한 timeout/strategy를 사용함을 확정.
Vite cold compile 시 JS 파싱에 5~15초 소요되므로, 기존 10000/15000ms는 CI에서 margin 없음.

## 2. Class 분류

| Class | 정의 | 처리 방식 |
|-------|------|----------|
| A | timeout 단순 부족 | timeout 값을 30000으로 증가 |
| B | toBeVisible() timeout 미명시 | `{ timeout: 30000 }` 옵션 추가 |
| B' | loadState strategy 불충분 | domcontentloaded → networkidle (JS 파싱 완료 보장) |

networkidle 선택 근거: Vite dev server는 초기 JS bundle hydration 완료 후 network idle 상태가 됨.
domcontentloaded는 HTML만 파싱 — React hydration 전이라 컴포넌트가 아직 미렌더링 상태.

## 3. 파일별 변경 상세

### 3-1. packages/web/e2e/ax-bd-hub.spec.ts

**Fix 1 (Class B' — line 48)**: waitForLoadState strategy 변경
```diff
- await page.waitForLoadState("domcontentloaded");
+ await page.waitForLoadState("networkidle");
```

**Fix 2 (Class A — line 55)**: timeout 10000 → 30000
```diff
- await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
+ await expect(page.locator("main")).toBeVisible({ timeout: 30000 });
```

### 3-2. packages/web/e2e/discovery-detail-advanced.spec.ts

**Fix 3 (Class A — line 257)**: timeout 15000 → 30000
```diff
- await expect(startBtn).toBeVisible({ timeout: 15000 });
+ await expect(startBtn).toBeVisible({ timeout: 30000 });
```

**Fix 4 (Class A — line 261)**: timeout 15000 → 30000
```diff
- await expect(page.getByText("v1").first()).toBeVisible({ timeout: 15000 });
+ await expect(page.getByText("v1").first()).toBeVisible({ timeout: 30000 });
```

### 3-3. packages/web/e2e/offering-pipeline.spec.ts

**Fix 5 (Class B — line 141-143)**: toBeVisible()에 timeout 추가
```diff
- ).toBeVisible();
+ ).toBeVisible({ timeout: 30000 });
```
(page.getByText("발굴 아이템 선택").or(page.getByText("새 사업기획서 만들기")).first())

### 3-4. packages/web/e2e/roadmap-changelog.spec.ts

**Fix 6 (Class B — line 40)**: timeout 20000 → 30000
```diff
- await expect(page.getByText("Phase 37").first()).toBeVisible({ timeout: 20000 });
+ await expect(page.getByText("Phase 37").first()).toBeVisible({ timeout: 30000 });
```

## 4. 영향 분석

- 테스트 실행 시간 증가: 성공 케이스는 실제 렌더링 시간에만 의존 (30s까지 기다리지 않음)
- 실패 감지 시간 연장: 실패 시 최대 30s 대기 후 fail (기존 10/15s 대비 ~15s 증가)
- CI 비용: timeout 증가분은 실패 케이스만 영향, 정상 CI는 차이 없음
- Scope: E2E spec 4 파일만 (packages/web/e2e/), 구현 코드 0건 변경

## 5. 파일 매핑 (Implementation)

| 파일 | 변경 유형 | 변경 내용 |
|------|----------|----------|
| packages/web/e2e/ax-bd-hub.spec.ts | timeout + strategy fix | Fix 1 (B') + Fix 2 (A) |
| packages/web/e2e/discovery-detail-advanced.spec.ts | timeout fix | Fix 3 (A) + Fix 4 (A) |
| packages/web/e2e/offering-pipeline.spec.ts | timeout 추가 | Fix 5 (B) |
| packages/web/e2e/roadmap-changelog.spec.ts | timeout 증가 | Fix 6 (B) |

총 4 파일 / 6 assertion 변경 / 0 구현 파일

## 6. TDD 적용 여부

tdd-workflow.md 기준: E2E assertion timeout/strategy 수정 → "권장" 등급이지만
본 건은 테스트 코드 자체 수정이므로 별도 Red Phase 불필요. 직접 implement.

## 7. 위험

- timeout 30000도 부족 시: F655 Vite cache CI 최적화로 escalation (DoD에 명시)
- networkidle이 너무 느린 경우: load 전략 대안 (Vite dev 환경에서 networkidle은 표준)
