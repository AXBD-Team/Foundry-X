---
code: FX-PLAN-394
title: Sprint 394 — F660 audit-bus 통합 view + traceId 전파 (a)+(b)+(c) full scope
version: 1.0
status: Active
category: PLAN
sprint: 394
feature: F660
req: FX-REQ-722
priority: P3
session: S360
date: 2026-05-14
related:
  - SPEC.md §5 F660
  - docs/specs/aif-besir-w19/23_kpi_dashboard_one_page_v1.3.md §9 (audit-bus 분리 설계 명세)
  - packages/api/src/core/harness/services/audit-logger.ts:175 getByTraceId
  - packages/api/src/core/cross-org/services/cross-org-enforcer.service.ts:65/119
  - packages/api/src/core/ethics/services/ethics-enforcer.service.ts:15
  - packages/api/src/core/diagnostic/services/diagnostic-engine.service.ts:124
  - packages/api/src/__tests__/audit-trace-chain.test.ts (5 existing cases)
---

# Sprint 394 — F660 audit-bus 통합 view + traceId 전파 (full scope)

## 1. Sprint 컨텍스트

**위상**: BeSir 5/15 D-day D-1 진행. F659 docs-only 종결(S359, `1d13ce64` 23 v1.3 §9 patch) 후속 진정 fix sprint. 본 sprint는 시연 영향 0이지만 audit-bus 분리 설계(audit_logs=manual/seed, audit_events=F642 audit-bus 라이브)의 통합 조회 + traceId 라이브 전파 + chain visualization 3종을 통합 구현.

**S359 F659 docs-only 종결 시점 측정 결과** (이미 SPEC F660 본문 + 23 v1.3 §9에 기록):
- `audit-logger.ts:175 getByTraceId`는 `audit_logs` 단일 테이블 SELECT (audit_events 미통합) — 라이브 emit chain 통합 조회 불가
- cross-org-enforcer.service.ts:65/119 + ethics-enforcer.service.ts:15 + diagnostic-engine.service.ts:124가 `generateTraceId()` 새 trace_id 자동 생성 — 요청 body traceId 미수용 → 외부 발신 trace chain 단절

**의존성**: 독립 (다른 F-item 의존 없음). audit_logs/audit_events D1 table은 모두 production live (Sprint 351 F606 + S358+ 시드 적용 완료).

**연속 streak**: 57 sprint 연속 성공 (S306~S357, F560~F621). 본 sprint = 58 sprint streak 도전.

**5/15 시연 영향**: 0 — 시연 자체엔 F659 docs 명세화 + 23 v1.3 §9 분리 설계 멘트로 충분. 본 sprint 완료/미완료 무관 시연 진행 가능. **단 회귀 위험 中**(4 endpoint typecheck + 회귀 테스트 필수)이므로 PR Match Rate ≥ 90% + e2e GREEN 확정 후에만 merge.

---

## 2. 목표 (SCOPE LOCKED)

### 2.1 In-Scope (3 part)

**(a) audit-logger.getByTraceId cross-table UNION + source 메타** — `core/harness/services/audit-logger.ts:175`
- 현재: `audit_logs` 단일 테이블 SELECT (5 existing test cases 기반)
- 변경: `audit_logs ∪ audit_events` UNION 쿼리, 응답 각 row에 `source: "manual" | "live"` 메타 추가
- TraceChainResult 타입 확장: `events: AuditLogRecord[]` → `events: (AuditLogRecord & { source: "manual" | "live" })[]`
- 정렬: `created_at ASC` 통합 정렬 유지 (UNION 후 ORDER BY)
- 빈 결과 fallback: 양쪽 테이블 모두 0 row면 `{ events: [], chainValid: false }` 반환 (기존 동작 호환)
- 회귀 위험: **낮음** (read-only, 응답 shape 추가만)

**(b) 4 endpoint body.traceId 수용 + audit-bus emit context 전파**
- cross-org-enforcer.service.ts:65 + :119 — 2 분기 모두 `body.traceId ?? generateTraceId()` 패턴 적용
- ethics-enforcer.service.ts:15 (`emitContext()` helper) — 인자로 optional traceId 받아 prefer
- diagnostic-engine.service.ts:124 — 동일 패턴
- 4 endpoint route layer (cross-org/ethics/diagnostic 각 routes/index.ts)가 body에서 traceId 추출 후 서비스 호출에 전달
- 회귀 위험: **中** (4 endpoint 호출 시 body.traceId 없으면 기존 동작 100% 유지, 있으면 prefer)

**(c) frontend chain visualization** — `packages/web/`
- 신규 라우트: `/audit/by-trace?traceId=...` 또는 `/audit/chain/:traceId`
- 신규 컴포넌트: `components/audit/TraceChainView.tsx` — events를 시간순 vertical timeline, source(manual/live) 색상 구분, eventType + agentId + tenantId 노출
- API endpoint 재사용: 기존 `GET /api/audit/by-trace?trace_id=...` (audit.ts:145), 응답에 source 메타 포함된 events 처리
- 회귀 위험: **낮음** (신규 라우트, 기존 web 컴포넌트 영향 0)

### 2.2 Out of Scope (명시적 제외)

- audit_logs/audit_events D1 schema 변경 (기존 schema 유지, UNION만)
- F642 audit-bus 자체 변경 (audit-bus 자체는 이미 라이브 emit 중)
- HITL Console 영향 변경 (F605 baseline 유지)
- KPI 대시보드 영향 변경 (F604/F621 baseline 유지)
- 외부 시스템(Decode-X 등) trace_id 통합 (Decode-X Phase 2-E unlock 시 별도 sprint)
- audit_events SELECT에서 `metadata` 디코딩 (현재 JSON.parse 적용 여부는 F606/S337 baseline 유지)

---

## 3. 사전 측정 (fs 실측, Plan 작성 의무화 26회차)

### 3.1 audit-logger.ts:175 getByTraceId 현재 구조
- 파일: `packages/api/src/core/harness/services/audit-logger.ts` (S358+ S359 SPEC F660 본문 정확 위치)
- 메서드: `async getByTraceId(traceId: string): Promise<TraceChainResult>`
- 현재 SELECT 대상: `audit_logs` 단일 (F165, audit_events 미통합)
- 기존 test: `__tests__/audit-trace-chain.test.ts` 5 cases (line 61/72/78/100, 모두 audit_logs only)

### 3.2 4 endpoint generateTraceId 호출 사이트
| Endpoint | 파일 | Line | 패턴 |
|----------|------|------|------|
| cross-org enforce (T1) | `core/cross-org/services/cross-org-enforcer.service.ts` | 65 | `const ctx = { traceId: generateTraceId(), ... }` |
| cross-org enforce (T2) | `core/cross-org/services/cross-org-enforcer.service.ts` | 119 | `const ctx = { traceId: generateTraceId(), ... }` |
| ethics enforce | `core/ethics/services/ethics-enforcer.service.ts` | 15 (`emitContext()`) | `return { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true }` |
| diagnostic engine | `core/diagnostic/services/diagnostic-engine.service.ts` | 124 | `const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true }` |

### 3.3 4 endpoint route layer
- cross-org: `core/cross-org/routes/index.ts` → POST `/api/cross-org/enforce` (또는 동일 경로 신규 확인 필요)
- ethics: `core/ethics/routes/index.ts:18` ethicsApp.post("/check-confidence", ...)
- diagnostic: `core/diagnostic/routes/index.ts` (정확 path는 autopilot fs 측정)

### 3.4 frontend audit visualization 현재 상태
- `packages/web/src/` 내 audit 관련 컴포넌트: 미존재 (S359 F659 docs 종결 시 확인) — 신규 신설 필요

### 3.5 audit_events 테이블 schema (S358+ 시드 확인)
- `audit_events` 테이블: `org_id, agent_id, event_type, severity, trace_id, payload (JSON), created_at` 등 (S358+ 시드 5 events INSERT 시 확인된 구조)
- `audit_logs` 테이블: `id, tenant_id, event_type, agent_id, model_id, prompt_hash, input_classification, output_type, approved_by, approved_at, trace_id, metadata`
- UNION 시 column projection 통일: `(id, trace_id, event_type, agent_id, tenant_id/org_id, created_at, metadata/payload, source)`

---

## 4. 파일 매핑

### 4.1 수정 (Modify)

| # | 파일 | 변경 |
|---|------|------|
| M1 | `packages/api/src/core/harness/services/audit-logger.ts:175~end` | `getByTraceId` cross-table UNION + `source` 메타 추가 |
| M2 | `packages/api/src/core/harness/services/audit-logger.ts` (TraceChainResult type) | `events` 타입 확장 — `source: "manual"\|"live"` 필드 |
| M3 | `packages/api/src/core/cross-org/services/cross-org-enforcer.service.ts:65` | `body.traceId ?? generateTraceId()` 패턴 |
| M4 | `packages/api/src/core/cross-org/services/cross-org-enforcer.service.ts:119` | 동일 패턴 |
| M5 | `packages/api/src/core/cross-org/services/cross-org-enforcer.service.ts` (method signature) | optional `traceId?: string` 인자 추가 |
| M6 | `packages/api/src/core/ethics/services/ethics-enforcer.service.ts:15` | `emitContext(traceId?)` 인자 수용 |
| M7 | `packages/api/src/core/diagnostic/services/diagnostic-engine.service.ts:124` | 동일 패턴 |
| M8 | `packages/api/src/core/cross-org/routes/index.ts` | POST handler에서 body.traceId 추출 후 서비스 호출 전달 |
| M9 | `packages/api/src/core/ethics/routes/index.ts:18` | 동일 |
| M10 | `packages/api/src/core/diagnostic/routes/index.ts` | 동일 |

### 4.2 신규 (New)

| # | 파일 | 목적 |
|---|------|------|
| N1 | `packages/api/src/__tests__/audit-trace-chain-bus.test.ts` | (a) cross-table UNION 통합 test (3 case + source 검증) |
| N2 | `packages/api/src/__tests__/traceid-propagation.test.ts` | (b) 4 endpoint × 2 case = 8 propagation test |
| N3 | `packages/web/src/routes/audit-by-trace.tsx` | (c) 라우트 (path `/audit/by-trace`) |
| N4 | `packages/web/src/components/audit/TraceChainView.tsx` | (c) timeline 컴포넌트 |
| N5 | `packages/web/src/components/audit/types.ts` | (c) TraceEvent type (api와 동기) |
| N6 | `packages/web/src/components/audit/index.ts` | (c) re-export |

### 4.3 D1 migration
- **없음** — 기존 `audit_logs` + `audit_events` 테이블 그대로 활용. UNION 쿼리만.

---

## 5. TDD Red Phase 설계 (Anthropic Red-Green-Commit)

### 5.1 (a) audit-trace-chain-bus.test.ts (신규)

**테스트 계약** (3 cases + 기존 5 case 회귀 유지):
1. `getByTraceId — audit_logs + audit_events UNION 시 통합 chain 반환` (manual 2 + live 3 = 5 events 정렬)
2. `getByTraceId — source 메타 정확 부여` (각 row에 manual or live)
3. `getByTraceId — audit_events만 있을 때 chain 정상 반환` (manual 0 + live 2 = 2 events)
4. 기존 5 case 모두 유지 (manual only) — UNION이 빈 audit_events 결과를 잘 처리하는지 회귀

### 5.2 (b) traceid-propagation.test.ts (신규)

**테스트 계약** (4 endpoint × 2 case = 8):
1~2. cross-org-enforcer T1 — body.traceId 있으면 prefer / 없으면 generateTraceId fallback
3~4. cross-org-enforcer T2 (동일 2 case)
5~6. ethics-enforcer emitContext — 인자 있으면 prefer / 없으면 fallback
7~8. diagnostic-engine — 동일 2 case

### 5.3 (c) frontend E2E (선택)
- `packages/web/e2e/audit-by-trace.spec.ts` — `/audit/by-trace?traceId=test-001` 페이지 진입 시 mock chain 2 events visible
- 단, F648/F649 e2e 인프라 부채 진단 결과 반영 후 fail 가능성 → Plan은 등록만, autopilot이 skip 결정 가능

---

## 6. 위험 + 대응

| # | 위험 | 발생 가능성 | 대응 |
|---|------|------------|------|
| R1 | 4 endpoint propagation 변경이 기존 호출자 break | 中 | optional 인자 (`traceId?`) 추가 → 기존 호출 100% 호환. test 8/8 회귀 검증 |
| R2 | audit_events 시드 deployment 환경 차이로 UNION 빈 결과 | 低 | S358+ D1 시드 적용 완료 (events=5 확증). 빈 결과여도 빈 배열 반환 fallback |
| R3 | TraceChainResult 타입 확장이 다른 caller break | 中 | `source` 필드 추가만 (기존 필드 제거 없음) → 기존 caller 무영향. audit.ts:145 route layer는 typeof 검사 없음 |
| R4 | turbo cache 함정 (S337 패턴, type 변경) | 中 | `pnpm exec tsc --noEmit` 직접 + `pnpm turbo run typecheck --force` cache 0건 검증 |
| R5 | frontend 신규 라우트가 web build 실패 | 低 | 신규 라우트만 추가, 기존 라우트 영향 0. e2e 회귀 0 |
| R6 | 5/15 시연 영향 — production deploy 후 audit endpoint 회귀 | 中 | rules "Production Smoke Test" 16회차 변종 회피: multi-input smoke probe (POST `/api/audit/by-trace` body 있음/없음/잘못) + `wrangler tail` 30s 관찰 |
| R7 | dual_ai_reviews hook 정상 동작 (48 sprint 연속) | 低 | PR 생성 후 hook 자동 트리거 확인. 미동작 시 수동 INSERT |

---

## 7. Phase Exit 체크리스트 (Smoke Reality 12항, P-a~P-l)

| # | 항목 | 판정 기준 |
|---|------|----------|
| P-a | 사전 측정 fs 실측 결과 정확 (4 endpoint generateTraceId 위치 + audit-logger.ts:175 + audit-trace-chain.test.ts 5 cases) | 본 Plan §3.2 표와 100% 일치 |
| P-b | (a) audit-trace-chain-bus.test.ts 신규 3 cases + 기존 5 cases 회귀 모두 PASS (총 8 PASS) | vitest 결과 reports 첨부 |
| P-c | (b) traceid-propagation.test.ts 4 endpoint × 2 case = 8 PASS | vitest 결과 reports 첨부 |
| P-d | (c) frontend 라우트 `/audit/by-trace` + TraceChainView 컴포넌트 신설 + web typecheck PASS | dist 파일 생성 확인 |
| P-e | `pnpm exec tsc --noEmit` packages/api + packages/web 직접 PASS (S337 turbo cache 우회) | cache 0건 결과 reports |
| P-f | `pnpm turbo run lint --force` MSA baseline 회귀 0 | eslint cross-domain 0건 추가 |
| P-g | 기존 회귀 0건 — audit-trace-chain.test.ts 5 + cq + cross-org + ethics + diagnostic + harness | 회귀 reports 첨부 |
| P-h | API endpoint 동작 회귀 0 — GET `/api/audit/by-trace` 응답 schema는 기존 필드 100% 유지 + `source` 필드만 추가 | response shape diff reports |
| P-i | dual_ai_reviews sprint 394 자동 INSERT ≥ 1건 (hook 48 sprint 연속) | D1 query verdict 확인 |
| P-j | e2e 회귀 0 — F648/F649 진단 결과 직접 영향 X (본 sprint는 e2e 인프라 fix 아님) | shard 1/2/3/4 PASS 또는 사전 baseline 유지 |
| P-k | cross-domain import 0건 추가 — audit-logger(harness) ↔ cross-org/ethics/diagnostic 각각 직접 import 0 (route layer에서만 body.traceId 추출 → 도메인 경계 유지) | eslint no-cross-domain-import 통과 |
| P-l | 5/15 시연 영향 0 — production deploy 후 multi-input smoke probe (POST /api/audit/by-trace 3 input pattern) HTTP 200/400 일관 + `wrangler tail` 30s runtime exception 0 | smoke reports 첨부 |

---

## 8. 회귀 테스트 계획

### 8.1 회귀 대상 (전수 측정 8 영역)

1. `audit-trace-chain.test.ts` 5 cases — manual only 회귀
2. `cross-org-*.test.ts` — body.traceId 미전달 시 기존 동작 100% 동일
3. `ethics-*.test.ts` — 동일
4. `diagnostic-engine.test.ts` — 동일
5. `multi-evidence-audit-bus.test.ts` — F619 baseline 회귀 0
6. `audit-bus.test.ts` (F606 baseline)
7. `cq-evaluator.test.ts` — emitContext 변경 영향 0 (cq는 변경 안 함, cross-org/ethics/diagnostic만 변경)
8. `kpi-dashboard.test.ts` (F621 baseline)

### 8.2 회귀 측정 명령
```bash
cd packages/api && pnpm exec vitest run --reporter=verbose 2>&1 | tee reports/sprint-394-regression.log
cd packages/web && pnpm exec vitest run --reporter=verbose 2>&1 | tee reports/sprint-394-web-regression.log
```

### 8.3 turbo cache 우회 (S337 함정 회피 4회차)
```bash
pnpm turbo run typecheck --force 2>&1 | tee reports/sprint-394-typecheck-force.log
pnpm exec tsc --noEmit -p packages/api/tsconfig.json
pnpm exec tsc --noEmit -p packages/web/tsconfig.json
```

---

## 9. 의존 + 일정

### 9.1 의존성
- F606 ✅ Audit Log Bus (Sprint 351 + S337 hardening)
- F642 ✅ audit_events 라이브 emit baseline (audit-bus 자체)
- F659 ✅ 23 v1.3 §9 audit-bus 분리 설계 명세화 (`1d13ce64`)
- D1 시드 적용 ✅ (S358+ events=5)
- 4 endpoint generateTraceId 위치 확정 ✅ (본 Plan §3.2)

### 9.2 시간 예상
- (a) audit-logger UNION 구현 + test: ~30~40분
- (b) 4 endpoint propagation + test: ~40~50분
- (c) frontend 라우트 + 컴포넌트 + types: ~30~40분
- 회귀 검증 + typecheck cache 우회: ~10분
- Plan → Design → TDD Red → Green → Gap → Report → PR autopilot 전체: **~2h~2.5h**

### 9.3 시동 타이밍
- D-1 진행, 5/15 시연 영향 0 — 본 sprint Merge가 5/15 전이든 후든 시연 자체 무관
- 단 Match Rate < 90% 또는 e2e 회귀 발생 시 D+1로 미루기 가능

---

## 10. autopilot 지침 (참고)

### SCOPE LOCKED prompt 패턴 (autopilot 주입 시)
```
F660 (a)+(b)+(c) full scope. In-scope §2.1만 진행. Out-of-scope §2.2 명시 차단 — D1 schema 변경 / F642 audit-bus 자체 변경 / HITL/KPI 영향 / 외부 시스템 통합 / metadata 디코딩 별 변경 일절 금지.

Plan §3.2 4 endpoint 위치 ÷ §4.1 수정 파일 10건 ÷ §4.2 신규 파일 6건 정확 적용.

Phase Exit P-a~P-l 12항 모두 self-evaluation 후 결과 reports/sprint-394-*.md 본문 작성. autopilot의 reports hallucination 14회차 변종 회피 (실파일 ls + 본문 첨부 검증).

S337 turbo cache 함정 회피 — pnpm exec tsc 직접 + --force 검증 필수.

rules "Production Smoke Test" 16회차 변종 회피 — multi-input probe + wrangler tail 30s.
```

### Mulling 단계 명시
- Phase 1 Plan 검증 (본 문서)
- Phase 2 Design 작성 (`docs/02-design/features/sprint-394.design.md`)
- Phase 3 TDD Red (8 new tests + 5 existing 회귀)
- Phase 4 TDD Green (구현)
- Phase 5 Verify (typecheck cache 우회 + lint + test 회귀)
- Phase 6 Gap Analysis (Match Rate ≥ 90%)
- Phase 7 Report 작성
- Phase 8 PR 생성 + dual_ai_reviews 자동
- Phase 9 CI green + auto-merge

---

## 11. 메타 학습 (rules 정착 참조)

- rules `development-workflow.md` "Production Smoke Test" 16회차 변종 회피 (multi-input probe)
- rules `development-workflow.md` "Turbo Cache 함정" 4회차 회피 (`--force` + 직접 tsc)
- rules `development-workflow.md` "Worker Secret Store" — 본 sprint 범위 외 (secret 변경 없음)
- rules `agent-team-patterns.md` "범위 관리 3-Layer" — Plan §2.2 Out of scope 명시 (autopilot 오해 차단)
- rules `interaction-patterns.md` 25회차 패턴 — Plan 사전 측정 fs 실측 의무화 본 sprint도 정확 적용 (S280/S282 사례 이후 연속)

---

## 12. 다음 사이클 후보 (Sprint 394 완결 후, out-of-scope)

- **F661** api_p99 schema + agent별 threshold (P3, 시연 영향 0)
- **F649** e2e 인프라 fix (F648 진단 H5 → playwright webServer API server step 추가)
- **F600** 5-Layer 통합 (F601 PG unlock 후)
- **5/15 BeSir D-day 진행** (시연)
- **F644 P-i** master push e2e workflow GREEN 검증 (F649 fix 후 자연 동반)
