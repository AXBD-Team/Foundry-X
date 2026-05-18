---
title: ServerKit Native MVP Dogfood — 2026-05-18 (S363)
subtitle: F662~F665 4 sprint 통합 검증 — Web UI 운영자 시점
version: v1 (2026-05-18, S363)
owner: Sinclair Seo
audience: admin 권한 보유 운영자 (KTDS-AXBD)
based_on:
  - F662 Sprint 396 ✅ (PR #822) — CQ 5축 graph_session hook + failure_reason heuristic
  - F663 Sprint 397 ✅ (PR #824) — HITL 5-state machine + hitl_queue + /transition
  - F664 Sprint 398 ✅ (PR #825) — HITL Console UI (StateDiagram + AuditDrawer + DecisionForm transition)
  - F665 Sprint 399 ✅ (PR #827) — CQ authoring guide + AI_AUTHOR_BLOCKLIST + dogfood seed 5건
estimated_time: 15분 (브라우저 클릭 dogfood) + 10분 (결과 정리)
status: 🔧 진행 — 사용자 dogfood 대기
---

# ServerKit Native MVP Dogfood — Web UI 운영자 검증

> **목적**: F662~F665 4 sprint 통합 — 코드 PASS / Match 100% / 63 sprint streak이지만 실 사용성 미검증. 운영자가 fx.minu.best에서 Web UI dogfood 1회 실행하여 (1) CQ 5축 평가 트리거 (2) HITL 5-state 시각화 (3) Transition 동작 (4) Audit Drawer 시각화 (5) AI block enforce 5종 통합 검증.
>
> **왜 운영자 dogfood가 필요한가**: autopilot Match % + CI green ≠ production 동작 (rules/development-workflow.md 19회 누적 패턴). Web UI는 SSO 인증 + admin RBAC + production D1 binding 모두 통합돼야 정상. 사전측정으로는 mount + 401 보호 + seed 코드 존재까지만 확증, 실 row 생성 + 5-state 도식 시각 + transition row 갱신은 운영자가 실 클릭으로만 검증 가능.

---

## STEP 0 — 환경 준비

| 항목 | 값 |
|------|-----|
| URL | https://fx.minu.best |
| 인증 | SSO 로그인 (Sinclair Seo admin) |
| 시연 org | demo-org-001 (F665 seed 격리) |
| 기대 데이터 | CQ 5건 (`0157_dogfood_cq_seed.sql`) + HITL queue items |

### 사전측정 결과 (사용자 dogfood 전 확증, S363)

| 항목 | 결과 |
|------|------|
| `/api/cq` mount (app.ts:145) | ✅ |
| `/api/hitl` mount (app.ts:357) | ✅ |
| Production endpoint 401 보호 | ✅ |
| Web `/hitl-console` route 존재 | ✅ |
| HitlStateDiagram + HitlAuditDrawer 컴포넌트 | ✅ |
| F665 seed migration 0157 코드 존재 | ✅ |
| Production D1 0157 적용 여부 | ❓ 사용자 확인 필요 |

---

## STEP 1 — HITL Console 시각 검증 (F664)

### 1.1 진입

1. https://fx.minu.best 접속 → SSO 로그인
2. 사이드바 **"HITL Console"** 클릭 → `/hitl-console` 로드

### 1.2 화면 시각 체크 (5개 컴포넌트)

| # | 컴포넌트 | 기대 동작 | 결과 |
|---|----------|----------|------|
| C1 | HitlStateDiagram | **5-state 도식 표시**: AI_GENERATED → REVIEW_QUEUED → HUMAN_REVIEWED → AI_REVISED → FINAL_APPROVED | ⬜ PASS / ⬜ FAIL |
| C2 | HitlMetricsTile | 각 state별 카운트 표시 (숫자 표시) | ⬜ PASS / ⬜ FAIL |
| C3 | HitlQueueTable | queue items 1건+ 표시 (orgId, state, escalated 칼럼) | ⬜ PASS / ⬜ FAIL |
| C4 | HitlEscalationBadge | escalated=true 항목에 뱃지 표시 | ⬜ PASS / ⬜ FAIL |
| C5 | 5-state tab | 탭 클릭 시 state별 필터링 | ⬜ PASS / ⬜ FAIL |

**관찰 메모** (사용자 채움):
```
(예: 5-state 도식 우측 정렬 / 어색한 색상 / 빠진 카운트 등)
```

---

## STEP 2 — Transition 시도 (F663 5-state machine)

### 2.1 queue row 선택 → DecisionForm

1. HitlQueueTable 첫 row 클릭 → DecisionForm 열림
2. 현재 state 확인 (예: `REVIEW_QUEUED`)

### 2.2 transition 실행

| Step | 동작 | 기대 결과 | 결과 |
|------|------|----------|------|
| T1 | DecisionForm에서 "transition" 모드 선택 | mode 선택 가능 | ⬜ PASS / ⬜ FAIL |
| T2 | 다음 state 선택 (예: `HUMAN_REVIEWED`) | state machine 룰에 허용된 옵션만 선택 가능 | ⬜ PASS / ⬜ FAIL |
| T3 | 제출 (Submit) | HTTP 200, queue 항목 state 갱신 | ⬜ PASS / ⬜ FAIL |
| T4 | StateDiagram 갱신 | 해당 row state가 도식 위에서 이동 표시 | ⬜ PASS / ⬜ FAIL |
| T5 | 잘못된 transition 시도 (예: REVIEW_QUEUED → FINAL_APPROVED 직행) | 400 또는 UI 차단 | ⬜ PASS / ⬜ FAIL |

**관찰 메모**:
```
(예: T2 옵션이 모든 state 제공해서 룰 위반 가능 / T4 도식 갱신 lag 등)
```

---

## STEP 3 — Audit Drawer (F664)

### 3.1 audit 시각화

1. Queue row의 **audit 아이콘** (또는 row 우측 메뉴) 클릭 → HitlAuditDrawer 열림

| # | 항목 | 기대 결과 | 결과 |
|---|------|----------|------|
| A1 | Drawer 우측에서 슬라이드 | 부드러운 열림 (애니메이션) | ⬜ PASS / ⬜ FAIL |
| A2 | audit_events 타임라인 | STEP 2 transition 이벤트 표시 | ⬜ PASS / ⬜ FAIL |
| A3 | trace_id 표시 | 각 이벤트에 trace_id 확인 | ⬜ PASS / ⬜ FAIL |
| A4 | actor 표시 | "Sinclair Seo" 또는 admin user | ⬜ PASS / ⬜ FAIL |
| A5 | timestamp 정렬 | 시간 역순/순방향 일관 | ⬜ PASS / ⬜ FAIL |

**관찰 메모**:
```
(예: trace_id 누락 / actor 미표시 / event 종류 일부 안 잡힘)
```

---

## STEP 4 — CQ AI Block (F665 AI_AUTHOR_BLOCKLIST)

### 4.1 AI author 차단 검증

**선택 A — Web UI** (CQ register UI가 있다면)
1. CQ register 페이지 진입 (없으면 Selection B)
2. author 필드에 `"ai-claude"` 입력 → questionText/answerText 50자+
3. 제출 → HTTP 400 + "AI-authored CQ rejected" 메시지 확인

**선택 B — DevTools curl** (UI 없으면)

DevTools Network 탭에서 본인 JWT 복사 후:
```bash
curl -X POST https://foundry-x-api.ktds-axbd.workers.dev/api/cq/register \
  -H "Authorization: Bearer <YOUR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "demo-org-001",
    "questionText": "테스트 질문입니다 - 50자 이상 채워야 통과합니다 - 패딩 텍스트 추가 ㄱㄱㄱ",
    "answerText": "테스트 답변입니다 - 50자 이상 채워야 통과합니다 - 패딩 텍스트 추가 ㄴㄴㄴ",
    "author": "ai-claude"
  }'
```

| # | 항목 | 기대 결과 | 결과 |
|---|------|----------|------|
| B1 | author="ai-claude" | HTTP 400 + "AI-authored CQ rejected" | ⬜ PASS / ⬜ FAIL |
| B2 | author="claude" (prefix) | HTTP 400 + "AI-authored CQ rejected" | ⬜ PASS / ⬜ FAIL |
| B3 | author="ChatGPT" (case insensitive) | HTTP 400 | ⬜ PASS / ⬜ FAIL |
| B4 | author="Sinclair Seo" + 정상 길이 | HTTP 201 + `{id: ...}` | ⬜ PASS / ⬜ FAIL |
| B5 | questionText < 50자 | HTTP 400 "CQ too short" | ⬜ PASS / ⬜ FAIL |

**관찰 메모**:
```
(예: B4 정상 등록 시 audit_events "cq.registered" 발행 확인 / DevTools console에서 검증)
```

---

## 검증 종합

### 4 F-item PASS 기준

| F-item | 검증 step | 최소 PASS 기준 |
|--------|----------|--------------|
| **F662** CQ 5축 graph_session hook | STEP 3 audit (cq.evaluated event) | A2~A3 PASS (CQ 평가 audit event 시각화) |
| **F663** HITL 5-state machine | STEP 2 transition | T3+T4 PASS (실 transition + UI 갱신) |
| **F664** HITL Console UI | STEP 1 + STEP 3 | C1+C2+A1+A2 PASS (시각화 정상) |
| **F665** CQ AI block | STEP 4 | B1~B4 PASS (4종 차단 + 1종 통과) |

### 4 F-item 통합 PASS

- ✅ **PASS**: 모든 F-item 기준 충족 → ServerKit Native MVP 운영자 검증 완결
- ⚠️ **PARTIAL**: 1~2 F-item FAIL → follow-up F-item 등록 (SPEC.md §5)
- ❌ **FAIL**: 3+ F-item FAIL → Phase 후속 plan 재검토

### follow-up 후보 (FAIL 발견 시 예시)

- F666 (가칭) HITL Console UI fix — 5-state 도식 갱신 lag / 색상 / 정렬
- F667 (가칭) Audit Drawer trace_id 보강 — actor/event 누락 fix
- F668 (가칭) CQ register UI 신규 — 현재 backend만, Web UI 없음 가능성

---

## 결과 (사용자 채움)

### Dogfood 실행 결과 (실행 후 채움)

- **실행 시각**: ____년 __월 __일 __:__ KST
- **실행 사용자**: Sinclair Seo (admin)
- **Browser**: Chrome / Edge / Firefox / Safari (택1)
- **SSO 로그인**: ✅ / ⚠️ 오류

### 통합 판정

- **F662**: ⬜ PASS / ⬜ PARTIAL / ⬜ FAIL
- **F663**: ⬜ PASS / ⬜ PARTIAL / ⬜ FAIL
- **F664**: ⬜ PASS / ⬜ PARTIAL / ⬜ FAIL
- **F665**: ⬜ PASS / ⬜ PARTIAL / ⬜ FAIL
- **종합**: ⬜ PASS / ⬜ PARTIAL / ⬜ FAIL

### 다음 액션

(사용자가 dogfood 후 결정)

- [ ] follow-up F-item 등록 (필요 시)
- [ ] reports md commit + push
- [ ] MEMORY.md 갱신 (S363 dogfood 결과)
- [ ] SPEC.md system-version dogfood 결과 반영

---

## Appendix — 참조

- F665 dogfood seed: `packages/api/src/db/migrations/0157_dogfood_cq_seed.sql` (CQ 5건)
- HITL Console 라우트: `packages/web/src/routes/hitl-console.tsx`
- AI_AUTHOR_BLOCKLIST: `packages/api/src/core/cq/routes/index.ts:9`
- F582 Dogfood 참고: `docs/04-report/features/f582-koami-dogfood-cmd-sheet.md`
