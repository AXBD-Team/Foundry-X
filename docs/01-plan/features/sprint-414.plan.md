---
sprint: 414
fitem: F681
req: FX-REQ-742
priority: P2
session: S372
date: 2026-05-20
mode: master-direct
---

# Sprint 414 — F681 e2e Group B+D fix (pipeline mock + operations selector strict mode)

## §1 배경

F678 (Sprint 411 ✅ S371) 진단의 H10 (Group B BusinessPlanViewer mount race) + H9 (Group D operations data shape) 가설 모두 부정확. F679+F680 패턴 재현 — local e2e 1회 실측 + debug spec(`page.on("response")` + `page.on("framenavigated")`)으로 진정 root cause 확정.

## §2 사전 측정 (S372, 2026-05-20, fs 실측 39회차)

### Group B 진정 원인 — unmocked endpoint 401 → /login redirect

debug spec 결과 (`/tmp/debug.spec.ts` 실측):
```
NAV → http://localhost:3000/discovery/items/biz-1
API_ERR 401 GET http://localhost:3000/api/pipeline/items/biz-1
NAV → http://localhost:3000/login    ← 401 후 1.5s 뒤 redirect
```

- `discovery-detail.tsx:96` `getPipelineItemDetail(id)` → `/api/pipeline/items/biz-1` 호출
- spec `setupDetailMocks`가 이 endpoint 미 mock → webServer 401
- `api-client.ts:84-85` `setTimeout(() => window.location.assign("/login"), 1500)` 트리거
- TemplateSelector 모달이 1.5s 안에 열렸다 사라지거나 / 모달 열리기 전 페이지 navigation
- 30s timeout 후 `getByRole("button", { name: "기획서 생성 시작" })` 미발견

### Group D 진정 원인 — strict mode violation 4 element 매칭

local e2e 결과:
```
Error: strict mode violation: getByText('KOAMI') resolved to 4 elements:
  1) <button>KOAMI</button> (OrgSelector)
  2) <h2>KOAMI</h2> (column header)
  3) <h3>KOAMI — KPI</h3>
  4) <h3>KOAMI — HITL</h3>
```

- spec line 58 `getByText(orgId)` → ORG_UNITS 4종 모두 동일 패턴
- F655 strict mode violation 패턴 재현 (roadmap-changelog 사례와 동계열)
- data shape OK, ORG_UNITS labels (KOAMI/AXIS-DS/Decode-X/Foundry-X) 정확 일치

## §3 인터뷰 (S372)

1차 (Group D selector fix): "h2 정확 매칭" Recommended — heading role + level 2 + exact (column header 의도 정확 보존)
2차 (Group B mock scope): "setupDetailMocks에 mock 추가" Recommended — spec 전체 8 test 일관 안정화 + 잠재 재발 위험 0

## §4 범위 (~5 lines + 1 import, 2 spec files)

### Group D fix — heading role + level 2 + exact

`packages/web/e2e/operations.spec.ts:58`:

```diff
   test("should display all 4 org unit columns", async ({ authenticatedPage: page }) => {
     await page.goto("/operations");
     for (const orgId of ORG_IDS) {
-      await expect(page.getByText(orgId)).toBeVisible();
+      await expect(
+        page.getByRole("heading", { name: orgId, exact: true, level: 2 }),
+      ).toBeVisible();
     }
   });
```

### Group B fix — pipeline endpoint 404 mock

`packages/web/e2e/discovery-detail-advanced.spec.ts setupDetailMocks` 함수 내부 (route 배열):

```diff
     page.route("**/api/biz-items/biz-1/discovery-progress", (route) =>
       route.fulfill({ json: { stages: [], currentStage: null, completedCount: 0, totalCount: 0 } }),
     ),
+    page.route("**/api/pipeline/items/**", (route) =>
+      route.fulfill({ status: 404, json: { error: "not found" } }),
+    ),
     page.route("**/api/bdp/biz-1", (route) =>
       route.fulfill({ json: withPlan ? MOCK_BDP : { error: "not found" }, status: withPlan ? 200 : 404 }),
     ),
```

`loadData` line 96 `getPipelineItemDetail(id).catch(() => null)` 안전 swallow. api-client는 404에 redirect 안 함 (401만 redirect — line 65-87 확증).

## §5 Phase Exit 체크리스트 (P-a~P-g)

| # | 항목 | 검증 방법 |
|---|------|----------|
| P-a | Group D heading role+level 2+exact fix diff | git diff operations.spec.ts 확인 |
| P-b | Group B setupDetailMocks pipeline mock 추가 diff | git diff discovery-detail-advanced.spec.ts 확인 (1 route block ~3 lines) |
| P-c | local Group D PASS | `pnpm e2e --grep "all 4 org unit"` PASS |
| P-d | local Group B PASS | `pnpm e2e --grep "형상화 탭에서 생성하기"` PASS (RBAC unblocked happy path 입증) |
| P-e | operations.spec.ts 3 test 회귀 0 | `pnpm e2e --grep "Operations Dashboard"` 3/3 PASS |
| P-f | discovery-detail-advanced.spec.ts 7 test 회귀 0 | `pnpm e2e --grep "F439|F440"` 7/7 PASS |
| P-g | dual_ai_reviews sprint 414 자동 INSERT ≥ 1건 | hook 78 sprint 연속 검증 |

## §6 위험 + 대응

| # | 위험 | 대응 |
|---|------|------|
| R1 | pipeline mock 404 fallthrough 안전성 | `api-client.ts:65-87` 검증 완료 — 401만 redirect, 404는 ApiError throw → `.catch(() => null)` swallow |
| R2 | heading role+level 2 매칭 다른 spec 영향 | operations.spec.ts 단독 변경, OrgSelector button + h3 panel header 영향 0 |
| R3 | 다른 unmocked endpoint 잠재 | debug spec 결과 `/api/pipeline/items/biz-1`만 401, 다른 endpoint 모두 mocked 확증 |
| R4 | level: 2 가 향후 컴포넌트 변경 시 깨질 가능성 | h2 → h3로 변경 시 spec 동반 업데이트. exact match라 false positive 0 |

## §7 예상 시간

- Master 직접 fix: ~3분 (2 file edit)
- local e2e 4건 검증 (Group D + Group B + operations.spec 전체 + discovery-detail-advanced 전체): ~5~8분
- PR + auto-merge: ~5분
- **합계**: ~15~20분

## §8 다음 사이클 후보 (out of scope)

- **F677 v0.3.0 harness-kit** — Cache headers + Compression + D1 강제 membership lookup
- **W20 KPI 6/8 베이스라인** 측정
- **Auth fixture role case mismatch 근본 fix** — `"admin"` → `"Admin"` 또는 component normalize (F680 학습 보강)
- Cloudflare KV PoC

## §9 메타 학습 후보

- **진단 정확도 검증 효과 누적 3회** (F679+F680+F681) — code inspection 진단(H7/H8/H9/H10)이 모두 부정확하거나 부분 부합. **debug spec(`page.on("response")` + `page.on("framenavigated")`)이 표준 진단 도구로 정착화 후보**
- **api-client silent /login redirect의 영향** — 401 응답이 1.5s 후 page navigation 트리거 = 모든 spec에 잠재 위험. 신규 endpoint 추가 시 spec mock 동반 의무화 필요 (Plan checklist 추가 권고)
- **strict mode violation 패턴 누적 (F655 + F681 Group D)** — `getByText` 단독 사용 위험. role + exact + level 명시가 표준 패턴
- **F664/F621 admin merge 시점 잠재 부채** — 신규 spec 도입 시 e2e GREEN 실측 의무화 (S371 결산 학습 재확증)
