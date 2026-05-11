---
id: FX-DESIGN-390
type: design
sprint: 390
f_items: [F655]
status: active
created: 2026-05-12
---

# Sprint 390 Design — F655 e2e 2종 정밀 fix

## §1 근본 원인 분석

### Bug 1: roadmap-changelog strict mode violation
- `getByText("Work Lifecycle Platform")` 는 strict mode에서 1개만 매칭해야 함
- 실제로 렌더링 시 phase name + 메타 텍스트(페이지 타이틀 또는 헤딩) 2개 이상 매칭
- F654에서 line 41 `getByText("Phase 37")` 는 `.first()` 적용됨
- line 42 `getByText("Work Lifecycle Platform")` 은 `.first()` 미적용 → 잔존

### Bug 2: fixtures/auth.ts dismissGuideModal click race
- `isVisible({ timeout: 500 })` — 500ms 안에 버튼 안 보이면 break (정상)
- 문제: CI 환경에서 Vite cold compile 지연으로 버튼이 500ms 후에 나타나는 케이스
  - → `isVisible` false → break → guide modal 미해소 → 이후 assertion fail
- 또는 버튼이 visible이지만 disabled 상태 (로딩 중)
  - → `isVisible` true → `.click()` → button not actionable → 30s timeout → fail
- F654에서 timeout 관련 fix 적용됐지만 dismiss 로직 자체는 미수정

## §2 Fix 상세 설계

### Fix 1: roadmap-changelog.spec.ts

```typescript
// Before (line 42):
await expect(page.getByText("Work Lifecycle Platform")).toBeVisible();

// After:
await expect(page.getByText("Work Lifecycle Platform").first()).toBeVisible({ timeout: 30000 });
```

근거:
- `.first()` — strict mode에서 첫 번째 매칭 요소만 사용
- `{ timeout: 30000 }` — CI cold compile 지연 내성 (line 41과 동일 기준)

### Fix 2: fixtures/auth.ts dismissGuideModal

```typescript
// Before (lines 119+122):
if (await nextBtn.isVisible({ timeout: 500 }).catch(() => false)) {
  await nextBtn.click();
  await page.waitForTimeout(300);
} else if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
  await skipBtn.click();
  await page.waitForTimeout(300);
} else {
  break;
}

// After:
if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await nextBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
} else if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await skipBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
} else {
  break;
}
```

근거:
- `timeout: 500 → 2000`: CI cold compile 지연으로 버튼 늦게 나타나는 케이스 대응
- `.click({ timeout: 5000 })`: Playwright 자체 actionability check (enabled 포함) 5s 대기
- `.catch(() => {})`: 버튼이 5s 내 actionable 안 되면 silently skip (guide 미해소는 다음 assertion에서 검출)

## §3 파일 매핑 (SDD Triangle)

| 파일 | 변경 타입 | 변경 내용 |
|------|---------|----------|
| `packages/web/e2e/roadmap-changelog.spec.ts` | E2E spec fix | line 42: `.first()` + `{ timeout: 30000 }` |
| `packages/web/e2e/fixtures/auth.ts` | fixture fix | dismissGuideModal: 500→2000, click timeout 5000 |

## §4 TDD

- E2E 테스트 파일 수정 (테스트 코드 자체가 fix 대상)
- 실행: `cd packages/web && pnpm e2e --grep 'roadmap\|offering'`
- 검증 기준: 10회 연속 PASS (결정론적)

## §5 위험 요소

| 위험 | 대응 |
|------|------|
| dismissGuideModal timeout 2000으로 증가 시 전체 E2E 속도 저하 | 루프 최대 12회 × 2000ms = 최대 24s 추가. 단 break 조건에 해당하면 즉시 종료 |
| offering-create-wizard 계속 fail | wizard page의 "다음" 버튼이 dismissGuideModal과 충돌 여부 확인 필요 |
