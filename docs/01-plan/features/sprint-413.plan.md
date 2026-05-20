---
sprint: 413
fitem: F680
req: FX-REQ-741
priority: P2
session: S372
date: 2026-05-20
mode: master-direct
---

# Sprint 413 — F680 e2e Group C fix (T2 dangling waitForRequest + role case mismatch)

## §1 배경

F678 (Sprint 411 ✅ S371) 진단의 H7 가설("F664 hitl 실 API 미연결 — mock items 패턴")이 부정확함을 local e2e 실측으로 확증. `HitlTransitionForm` (HitlDecisionForm.tsx:83)이 실제 `postApi("/hitl/transition")`를 호출하므로 mock 패턴 안티가 아님. 진정 원인은 **2개 layer 복합**:

- **L1 (test code bug)** — `page.waitForRequest()` promise가 RBAC-blocked branch에서 await 안 되어 dangling
- **L2 (contract mismatch)** — auth fixture `role: "admin"` (lowercase) vs `HitlRole` type `"Admin" | ...` (PascalCase) case-sensitive 비교로 모든 transition denied

## §2 사전 측정 (S372, 2026-05-20, fs 실측 38회차)

| 항목 | 결과 |
|------|------|
| local e2e T2 실행 | ❌ `page.waitForRequest: Test ended` 에러 line 131 |
| `HitlTransitionForm` postApi 호출 여부 | ✅ line 83 호출함 (F678 H7 부정확) |
| auth fixture role | `"admin"` (lowercase, packages/web/e2e/fixtures/auth.ts) |
| HitlRole type | `"Admin" \| "Reviewer" \| "Approver" \| "Operator" \| "Auditor"` (PascalCase) |
| `TRANSITION_ALLOWED_ROLES[].includes()` | case-sensitive |
| T1 RBAC 영향 | 없음 (diagram render만 검증, 5state-item-list 클릭 없음) |
| T3 RBAC 영향 | 명시적 Operator role 주입 패턴 사용 (선례) |
| T4 RBAC 영향 | 없음 (Audit drawer만, transition form 안 거침) |

→ T2만 dangling 노출. T1/T3/T4는 다른 path로 우회.

## §3 인터뷰 (S372)

1차 (next track): "F680 Group C fix (Recommended)" 선택
2차 (RBAC fix L2): "Spec-local Admin 주입 (Recommended)" 선택 — T3 Operator 주입 패턴 재사용, 다른 spec 영향 0

## §4 범위 (~5 lines change, T2 spec only)

### L1 fix — dangling promise 차단

`packages/web/e2e/hitl-state-machine.spec.ts:131` 의 `const transitionReq = page.waitForRequest(...)` 를 `if (!isBlocked)` branch 안쪽으로 이동 (line 142 직전):

```diff
-  // API 호출 감시
-  const transitionReq = page.waitForRequest("**/api/hitl/transition");
-
   // "전환" 버튼 클릭
   const submitBtn = transitionForm.getByRole("button", { name: "전환" });
   await expect(submitBtn).toBeVisible();

   // RBAC blocked 아닌지 확인 후 클릭
   const rbacBlocked = page.getByTestId("rbac-blocked");
   const isBlocked = (await rbacBlocked.count()) > 0;

   if (!isBlocked) {
+    // API 호출 감시 (RBAC unblocked branch 내부에서만 promise 생성)
+    const transitionReq = page.waitForRequest("**/api/hitl/transition");
     await submitBtn.click();
     const req = await transitionReq;
```

### L2 fix — Admin role 주입

T2 시작 부분 (setupMocks 호출 전, T3 line 167-178 패턴 재사용):

```diff
   test("T2: transition trigger form → POST /api/hitl/transition 200", async ({
     authenticatedPage: page,
   }) => {
+    // Admin role 명시 주입 (auth fixture는 "admin" lowercase, HitlRole 타입은 PascalCase)
+    await page.addInitScript(() => {
+      const payload = btoa(JSON.stringify({
+        sub: "test-user",
+        role: "Admin",
+        exp: Math.floor(Date.now() / 1000) + 3600,
+      }));
+      localStorage.setItem("token", `header.${payload}.sig`);
+    });
     await setupMocks(page);
     await page.goto("/hitl-console");
```

## §5 Phase Exit 체크리스트 (P-a~P-f)

| # | 항목 | 검증 방법 |
|---|------|----------|
| P-a | L1 dangling promise fix (waitForRequest 위치 조정) | git diff hitl-state-machine.spec.ts 확인 |
| P-b | L2 Admin role addInitScript 주입 ≥1 block | git diff hitl-state-machine.spec.ts 확인 |
| P-c | local T2 PASS (RBAC unblocked happy path) | `pnpm e2e --grep "T2: transition trigger"` PASS + postData queueItemId/fromState/toState 검증 통과 |
| P-d | T1/T3/T4 회귀 0 | `pnpm e2e --grep "HITL 5-state"` 4 test 모두 PASS |
| P-e | typecheck PASS | spec only 변경, 변경 없음 (확인) |
| P-f | dual_ai_reviews sprint 413 자동 INSERT ≥ 1건 | hook 77 sprint 연속 검증 |

## §6 위험 + 대응

| # | 위험 | 대응 |
|---|------|------|
| R1 | Admin 주입이 setupMocks의 다른 localStorage 설정과 충돌 | addInitScript는 page.goto 전 실행되어 순서 안전 (T3 패턴 정착) |
| R2 | T1/T4에도 dangling promise 위험? | T1은 waitForRequest 미사용, T4는 line 233 `auditReq` 즉시 234에서 click 후 236에서 await → 위험 0 |
| R3 | role payload field 이름 변경 가능성 | `getRoleFromToken` (HitlDecisionForm.tsx:16-28)는 `payload.role ?? payload.orgRole` 둘 다 시도 → Admin 주입은 role field 사용 → 호환 |

## §7 예상 시간

- Master 직접 fix: ~3분
- local e2e T2 + 4 test 회귀: ~5분
- PR + auto-merge + CI: ~10분
- **합계**: ~15~20분

## §8 다음 사이클 후보 (out of scope)

- **F681 Group B+D fix** — discovery-detail-advanced:218 + operations:55+62 (~30~50분 1 sprint 또는 분리)
- **F677 v0.3.0** — Cache headers + Compression + D1 강제 membership lookup
- **W20 KPI 6/8 베이스라인** 측정
- Cloudflare KV PoC

## §9 메타 학습 후보

- **진단 정확도 검증 반복 (F679, F680 연속)** — code inspection 진단의 한계 + local e2e 1회 실측의 가치 확증 누적 2회
- **Spec-local override 패턴 정착** — T3 Operator 주입 → T2 Admin 주입 재사용 = 같은 파일 내 일관성
- **Auth fixture와 type contract 분리** — role case mismatch는 다른 spec에도 잠재. 정착 후 fixture 정정 또는 normalize 검토 (별 sprint 후보)
