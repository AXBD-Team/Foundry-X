---
code: FX-PLAN-392
title: Sprint 392 — F619 Decode-X stub adapter (4대 진단 Integration 80% 자체)
version: 1.0
status: Active
category: PLAN
sprint: 392
feature: F619
req: FX-REQ-684
priority: P3
session: S357
date: 2026-05-12
related:
  - docs/specs/ai-foundry-master-plan/17_internal_dev_plan_with_besir_v1.md
  - SPEC.md §5 F619
  - docs/02-design/features/sprint-357.design.md (F602 PoC baseline)
---

# Sprint 392 — F619 Decode-X stub adapter + Multi-Evidence E1/E2/E3 통합

## 1. Sprint 컨텍스트

**위상**: 5/14 BeSir D-2 dry-run 시동 sprint. W19 BeSir 미팅(5/15 D-3) 사전 준비.

**선행 ✅**:
- F602 4대 진단 PoC (Sprint 357 ✅, Missing/Duplicate/Overspec/Inconsistency 4 알고리즘)
- F606 Audit Log Bus (Sprint 351 ✅ + S337 hardening PR #766, trace_id chain + HMAC)
- Tier 1~5 17건 완결 (Sprint 351~367 ✅)

**본 sprint = F619 80% 자체 부분만**:
17 plan §2 line 55 정확 인용 — "Multi-Evidence E1/E2/E3 통합 알고리즘 + Decode-X stub adapter + mock event PoC | **80% 자체** — 알고리즘 + stub 코드 자체, 실 이벤트 hook(20%)만 외부 | **T4~T5 ✅ 내부 (mock 기반) / T6 실 이벤트 hook(외부)**".

17 plan §3 Tier 4 Sprint 368 (S336 신규 승격) 패턴: "실 이벤트 시점에 stub만 swap" — 본 sprint는 stub adapter + mock PoC, Decode-X Phase 2-E unlock 시 stub만 production adapter로 교체.

**연속 성공 streak**: 55 sprint 연속 (S306~S356, F560~F656). 본 sprint = 56 sprint streak 도전.

## 2. 목표 (SCOPE LOCKED)

### in-scope (4 항목)

1. **Multi-Evidence E1/E2/E3 통합 알고리즘** — `core/diagnostic/services/multi-evidence.service.ts` 신설
   - **E1 (Evidence Collection)**: F602 4 진단 결과(Missing/Duplicate/Overspec/Inconsistency) 수집
   - **E2 (Evidence Validation)**: 각 진단 결과의 신뢰도 점수(0~1) + 임계값(0.7) 필터
   - **E3 (Evidence Integration)**: 통합 점수 산정 + diagnostic_session_id 생성 + audit-bus trace_id 전파
   - Pure function 설계(외부 의존 0) + types contract export

2. **Decode-X stub adapter** — `core/decode-bridge/services/decode-x-stub.adapter.ts` 신설
   - `AnalysisCompletedEvent` schema (zod) — Decode-X Phase 2-E의 `analysis.completed` 이벤트 모방
   - `DecodeXAdapter` interface (production 구현 시 stub만 교체)
   - In-memory event publisher (`publishAnalysisCompleted(event)` → mock queue → E1 트리거)
   - **외부 의존 0** — 실 Decode-X API 호출 없음, mock event만

3. **mock event PoC test** — `core/diagnostic/__tests__/multi-evidence.test.ts` + `core/decode-bridge/__tests__/decode-x-stub.test.ts`
   - 4 진단 결과 fixture → E1/E2/E3 변환 검증 (각 evidence layer 분리 + 통합 점수)
   - stub adapter publishAnalysisCompleted → E1 trigger → multi-evidence service 호출 → diagnostic_session_id 생성
   - F606 audit-bus 통합 — trace_id chain 보존 검증 (test 1건)

4. **types contract export** — `core/decode-bridge/types.ts` + `core/diagnostic/types.ts` 갱신
   - `AnalysisCompletedEvent` + `DecodeXAdapter` + `MultiEvidenceResult` + `EvidenceLayer` (E1/E2/E3 enum)
   - MSA 룰: cross-domain import는 types.ts contract만 허용 (diagnostic ↔ decode-bridge 양쪽 types만)

### out-of-scope (5 항목, 다음 사이클)

- **F619 실 이벤트 hook (20%)**: Decode-X Phase 2-E unlock 시 stub만 production adapter로 swap. 별 sprint.
- **F600 5-Layer 통합**: 외부 4 repo orchestration (Decode-X/Discovery-X/AXIS-DS/ax-plugin), 외부 의존.
- **F601 Multi-Tenant PG + SSO**: PG 인프라 결정 + KT DS SSO 외부 의존.
- **F621 KPI 통합 화면**: F604+F605 ✅ unlock됐으나 별 sprint (운영 화면 시각화).
- **F625 CQ 5축 운영 검증**: F582 ✅ baseline, 별 sprint.

### DoD (Definition of Done)

- `pnpm typecheck` + `pnpm lint` PASS (turbo 캐시 우회 1회 — rules/development-workflow.md "Turbo Cache 함정" 회피)
- 신규 test 3건 이상 PASS (multi-evidence 알고리즘 1+ / stub adapter 1+ / audit-bus 통합 1)
- ESLint `foundry-x-api/no-cross-domain-import` 통과 (diagnostic ↔ decode-bridge types contract 만 허용)
- PR + auto-merge (CI 4 shard GREEN)
- master push CI 4 shard GREEN (F644 패턴 회피 — 환경 의존 0)

## 3. 변경 파일

### 신설 (5 파일)

| 파일 | 용도 |
|------|------|
| `packages/api/src/core/diagnostic/services/multi-evidence.service.ts` | E1/E2/E3 통합 알고리즘 (4 진단 → 3 evidence layer) |
| `packages/api/src/core/decode-bridge/services/decode-x-stub.adapter.ts` | Mock event publisher + DecodeXAdapter interface |
| `packages/api/src/core/diagnostic/__tests__/multi-evidence.test.ts` | E1/E2/E3 변환 알고리즘 contract test |
| `packages/api/src/core/decode-bridge/__tests__/decode-x-stub.test.ts` | Stub adapter mock event PoC test |
| (선택) `packages/api/src/core/diagnostic/__tests__/multi-evidence-audit-bus.test.ts` | F606 audit-bus trace_id 전파 검증 |

### 수정 (2 파일)

| 파일 | 변경 |
|------|------|
| `packages/api/src/core/decode-bridge/types.ts` | `AnalysisCompletedEvent` + `DecodeXAdapter` + `EvidenceLayer` (E1/E2/E3) export |
| `packages/api/src/core/diagnostic/types.ts` | `MultiEvidenceResult` + `EvidenceScoreThreshold` export |

### 변경 없음 (회귀 0)

- `app.ts` — route 등록 없음 (본 sprint는 service + adapter만, route는 F619 실 hook sprint에서)
- D1 migration — mock event는 in-memory, F606 audit_events는 이미 있음
- `core/discovery/`, `core/agent/`, 기타 도메인 — 0 수정

## 4. Phase Exit (Smoke Reality 11항)

| # | 항목 | 판정 |
|---|------|------|
| P-a | `multi-evidence.service.ts` 신설 + 4 진단 → E1/E2/E3 매핑 알고리즘 | 파일 존재 + algorithm 함수 export |
| P-b | `decode-x-stub.adapter.ts` 신설 + `AnalysisCompletedEvent` contract | 파일 존재 + zod schema export |
| P-c | `decode-bridge/types.ts` re-export contract | `AnalysisCompletedEvent` + `DecodeXAdapter` + `EvidenceLayer` 4 type export |
| P-d | mock event publisher 동작 | `publishAnalysisCompleted(event)` test PASS |
| P-e | 4 진단 → E1/E2/E3 변환 검증 | algorithm test 2건 이상 PASS (E1 collection + E3 integration score) |
| P-f | F606 audit-bus trace_id 전파 | audit_events row 1건 INSERT + trace_id chain 검증 (선택, 가능 시) |
| P-g | typecheck + lint PASS | `pnpm typecheck` + `pnpm lint` 0 errors (turbo cache 우회 1회) |
| P-h | cross-domain import 0건 | ESLint `foundry-x-api/no-cross-domain-import` 통과 (types contract만 import) |
| P-i | dual_ai_reviews sprint 392 자동 INSERT ≥ 1건 | hook 56 sprint 연속 (S306~S357) |
| P-j | Match ≥ 90% (semantic 100% 목표) | gap analysis report |
| P-k | 회귀 0 | F614/F627 baseline + Tier 1~5 17건 회귀 0 (test suite 통과) |

## 5. 위험 + PR FAIL 대응

| 위험 | 대응 |
|------|------|
| cross-domain import 위반 (diagnostic → decode-bridge 내부 import) | types.ts contract만 사용, ESLint 검증 |
| F602 진단 결과 shape 불일치 | F602 PoC types를 그대로 import (`@/core/diagnostic/types.js`) |
| F606 audit-bus 통합 시 trace_id propagation 누락 | middleware 활용 (`hono c.var` traceId 전파) 또는 service 인자로 직접 전달 |
| mock event publisher가 in-memory state leak | test isolation (`beforeEach` reset) + 단일 instance 패턴 회피 |
| turbo cache 함정 (typecheck PASS but CI fail) | autopilot이 `pnpm exec tsc --noEmit` 직접 실행으로 cache 우회 1회 |
| master push CI 회귀 (F644 패턴) | 본 sprint는 backend only 변경 → e2e shard 1 race 미관여, 환경 의존 0 |

## 6. 예상 시간

**~25~40분 autopilot** (17 plan §3 추정 25분 + 11항 Phase Exit + audit-bus 통합 test 1건 보강 + master push CI 대기 5~10분).

## 7. BeSir 미팅 시연 가치

- Foundry-X **자체 BD 파이프라인 + 4대 진단 + Multi-Evidence 통합 알고리즘 완비** 입증
- Decode-X 외부 연동 **stub interface 정의 완료** → 실 Phase 2-E unlock 즉시 swap 가능
- "BeSir 흡수 5건(F628~F632) + 4대 진단 PoC + Integration 80% 자체 완비" — 외부 의존 게이트 대기 없이 진행 패턴 실증
- 5/15 BeSir 미팅에 "내부 진행 17건 ✅ + F619 stub 추가 = 18건" 보고

## 8. 다음 사이클 후보 (out of scope)

- **F619 실 이벤트 hook**: Decode-X Phase 2-E unlock 시 stub adapter → production swap (별 sprint)
- **F621 KPI 통합 화면**: F604+F605 ✅ unlock됨, MVP W27 게이트 (별 sprint)
- **F625 CQ 5축 운영 검증**: F582 ✅ baseline, F632 CQ 룰 통합 (별 sprint)
- **F600 5-Layer 통합 PoC**: 외부 4 repo orchestration 골격 (외부 의존 분리 후)
- **MEMORY.md 압축**: 46KB → ~10KB, archive/sessions-313-356.md 분할 (본 sprint와 병행 별 task)
- **5/15 BeSir 미팅 자료 정리**: 17 plan v2 업데이트 + unlock 요청 4건 명세

---

**SCOPE LOCKED 확인용 키워드**:
- Multi-Evidence E1/E2/E3 통합 알고리즘 (`core/diagnostic/services/multi-evidence.service.ts`)
- Decode-X stub adapter (`core/decode-bridge/services/decode-x-stub.adapter.ts`)
- mock event PoC (in-memory event publisher + test)
- types contract export (양쪽 types.ts re-export)
- 신설 5 file + 수정 2 file (총 7 file)
- in-scope 4 + out-of-scope 5
- Phase Exit P-a~P-k 11항
- 예상 ~25~40분 autopilot
- 5/14 BeSir D-2 buffer 1.5일+
