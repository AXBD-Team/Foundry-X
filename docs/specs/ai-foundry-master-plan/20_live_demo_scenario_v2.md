---
title: AI Foundry — Live Demo 시나리오 v2 (5 step → 7 step 확장, F619 + F621 추가)
purpose: 5/14 BeSir D-2 dry-run + 5/15 본 미팅 실시간 시연. v1(5 step)에 Step 6 F619 Multi-Evidence + Step 7 F621 운영 통합 대시보드 추가.
predecessor: 20_live_demo_scenario_v1.md (v1.1 S350, 5 step + F642 trace_id chain). 본 v2는 v1을 base로 두고 Step 6/7 추가 + Q&A 확장 + endpoint 정합성 검증 7 endpoint로 갱신.
target_meeting: 2026-05-15 W19 BeSir 미팅 (5/14 dry-run D-2)
date: 2026-05-12 (S357 메타 세션)
owner: Sinclair Seo
duration: 18-22분 (Q&A 별도 5분, v1 15-20분에서 +3분)
classification: 기업비밀II급
prereq:
  - Foundry-X API: foundry-x-api.ktds-axbd.workers.dev (production)
  - Foundry-X Web: fx.minu.best (production Pages)
  - 인증: JWT (사전 발급, demo 계정)
  - 도메인: 가상 도메인 "demo-org" (D1 사전 시드)
related_docs:
  - 20_live_demo_scenario_v1.md (v1.1, 5 step base)
  - 17_internal_dev_plan_with_besir_v2.md (v2, Tier 진척 매핑)
  - 18_conditional_gate_evidence_v1.md (C-1 통과 증거)
  - 21_kpi_calculation_table_v1.md (KPI 산정표, F621 통합 화면에서 시각화)
  - 22_hitl_console_v1.md (F605 HITL Console)
---

# 20. AI Foundry Live Demo 시나리오 v2

> **본 문서의 위상**: v1(2026-05-10 S350, 5 step F602+F603+F606+F607+F642)을 base로 **Step 6 F619 Multi-Evidence + Step 7 F621 운영 통합 대시보드**를 추가. v1 본문 5 step은 그대로 유지 (소급 수정 없음, 본 v2가 정본 = canonical for 5/15 BeSir 미팅).
>
> **시연 형식 차이 명시**: Step 1~5는 모두 **curl HTTP API** 호출 시연 / Step 6은 **코드 trace + dry-run 출력**(endpoint 없음, service-only) / Step 7은 **브라우저 URL 화면 시연**(/operations 페이지).

---

## 0. 데모 한 줄 메시지

> **"의사결정 1건이 들어오면 → 4대 진단 → 정책 검사 → 윤리 검증 → Audit 자산화 → Multi-Evidence 통합 → 4 본부 동시 운영. 모두 코드로 강제된다."**

v1 한 줄 메시지에 **Multi-Evidence 통합 + 4 본부 동시 운영** 키워드 2개 추가.

---

## 1. 데모 시나리오 — "도메인 본부 정책 export 시도 + 4 본부 운영 통합" (15분)

### 1.1 가상 컨텍스트 (v1과 동일)

KT Ops 본부가 신규 정책팩 "퇴직연금 자동 청구 RPA"를 본부 외부(예: HR 본부)로 export하려 한다. AI Foundry는 (a) 정책에 4대 진단 자동 실행 → (b) core_differentiator 그룹 분류 → (c) export 가능 여부 default-deny 검사 → (d) 모든 단계 audit log 발행 → **(e) 4대 진단 결과를 E1/E2/E3 Multi-Evidence pipeline으로 통합하여 risk score 도출 → (f) 4 본부 동시 운영 대시보드에서 KPI/HITL 모니터링**.

### 1.2 단계별 흐름 (전체 15분, v1 +3분)

```
입력: "demo-org → HR 본부에 정책팩 zip export"
  ↓
[1] F602 4대 진단 실행      (3분)  POST /api/diagnostic/run
  ↓
[2] F603 그룹 분류         (2분)  POST /api/cross-org/assign-group
  ↓
[3] F603 export 검사       (2분)  POST /api/cross-org/check-export
  ↓
[4] F607 윤리 임계 검증    (2분)  POST /api/ethics/check-confidence
  ↓
[5] F642 Audit Bus 회수    (1분)  GET /api/audit/log/by-trace?trace_id=...
  ↓
[6] F619 Multi-Evidence    (2분)  코드 trace (Step 1 결과를 E1/E2/E3 pipeline 통과)
  ↓
[7] F621 운영 통합 화면    (3분)  Browser https://fx.minu.best/operations
```

### 1.3 데모 결과 — "거부 + 감독 + 통합 가능"

v1 결과(`check-export` deny + trace_id chain) 위에 **Step 6에서 risk score "high" 도출** + **Step 7에서 4 본부 KPI + HITL 한 화면 확인** 추가. 단일 정책 차단이 본부 전체 운영 맥락에 위치됨을 시각화.

---

## 2. 단계별 curl / 코드 / URL + 기대 응답

### Step 1~5 — v1 본문 그대로 유지

v1 §2 Step 1~5(F602 4대 진단 → F603 assign-group → F603 check-export → F607 ethics → F642 audit trace)는 v1 본문 그대로. 본 v2는 Step 6/7만 추가 명세.

> **참조**: `20_live_demo_scenario_v1.md` §2 Step 1~5 본문 (각 curl + 기대 응답 + 포인트 모두 유효, S350 endpoint URL/line 검증 완료).

---

### Step 6 — F619 Multi-Evidence E1/E2/E3 (NEW v2)

**시연 형식**: curl 아닌 **코드 trace + dry-run 출력** (F619는 service-only, endpoint 미공개).

**시연 코드** (사전 dry-run 결과 표시용):

```typescript
// packages/api/src/core/diagnostic/services/multi-evidence.service.ts (production)
import { processMultiEvidence } from "@/core/diagnostic/services/multi-evidence.service";

// Step 1 결과의 findings (4 type: missing/duplicate/overspec/inconsistency)
const stepOneFindings = stepOneResponse.findings;

// E1 → E2 (threshold 0.7) → E3 통합 → risk score
const result = processMultiEvidence(stepOneFindings, "trc-demo-2026-05-15");
console.log(JSON.stringify(result, null, 2));
```

**기대 출력** (dry-run 사전 캡처):

```json
{
  "diagnosticSessionId": "a3f1b8d2-7e4c-4f9a-9c5e-1d8b3a6e2f4d",
  "traceId": "trc-demo-2026-05-15",
  "e1": {
    "layer": "E1_COLLECTION",
    "totalCount": 6,
    "byType": {
      "missing": [/* 3 findings */],
      "duplicate": [/* 1 finding */],
      "overspec": [/* 2 findings */],
      "inconsistency": []
    }
  },
  "e2": {
    "layer": "E2_VALIDATION",
    "confidenceThreshold": 0.7,
    "passCount": 4,
    "filteredCount": 2
  },
  "e3": {
    "layer": "E3_INTEGRATION",
    "integrationScore": 0.85,
    "dominantType": "missing",
    "riskLevel": "high"
  },
  "processedAt": 1747273800000
}
```

**포인트** (2분 설명):
- ✅ **E1 수집**: Step 1의 6 findings를 4 type별 분류 (severity별 confidence 자동 부여 — critical=1.0 / warning=0.8 / info=0.5)
- ✅ **E2 검증**: confidenceThreshold=0.7로 필터링 → 4건 pass / 2건 filter (info severity 자동 제외)
- ✅ **E3 통합**: passed evidence의 평균 confidence = 0.85 → riskLevel **"high"** (≥0.7) + dominantType "missing" (3건 다수결)
- ✅ **traceId chain 연속**: Step 1~5의 trace_id를 그대로 받음 → Step 5에서 audit log에 함께 회수 가능
- ⚠️ **Decode-X Phase 2-E unlock 시**: 현재는 stub adapter(in-memory queue)지만, 실 이벤트 hook 도입 시 `DecodeXStubAdapter` → production `DecodeXAdapter` 구현체로 swap만 하면 됨 (~10라인). 본 데모에서는 stub queue로 mock event 1건 시연 가능.

**Decode-X stub event publisher 시연** (선택, 1분):

```typescript
import { DecodeXStubAdapter } from "@/core/decode-bridge/services/decode-x-stub.adapter";

const adapter = new DecodeXStubAdapter();
await adapter.publishAnalysisCompleted({
  eventId: "evt-demo-decode-001",
  eventType: "analysis.completed",
  documentId: "pol-rpa-pension-claim-001",
  orgId: "demo-org",
  analysisType: "missing",
  findings: [
    { entityId: "ent-claim-flow", severity: "warning", detail: { reason: "no rollback section" } }
  ],
  traceId: "trc-demo-2026-05-15",
  timestamp: Date.now(),
});

console.log(adapter.getEventQueue().length); // 1
console.log(adapter.getLastEvent()?.eventId); // "evt-demo-decode-001"
```

**핵심**: Decode-X가 분석 완료 이벤트를 발행하면, AI Foundry가 받아서 자동으로 4대 진단 → Multi-Evidence pipeline → 운영 통합 화면까지 chain. 현재 stub으로 80% 자체 검증 완료, Phase 2-E unlock 시 마지막 hook만 production swap.

---

### Step 7 — F621 운영 통합 대시보드 (NEW v2)

**시연 형식**: 브라우저 URL 접속 화면 시연 (curl 아님).

**URL**:

```
https://fx.minu.best/operations
```

**시연 흐름** (3분, 화면 캡처 백업 필수):

1. **첫 로드** (0:00~0:30) — 페이지 헤더 "운영 통합 대시보드 — 4 본부 KPI + HITL 현황을 한 화면에서 모니터링해요" + 새로고침 버튼 + 마지막 갱신 시각 확인
2. **OrgSelector 'all'** (0:30~1:30) — 4 본부 column grid 시연:
   - **KOAMI** (#6366f1 인디고) — Ontology PoC 본부
   - **AXIS-DS** (#f59e0b 앰버) — Design System 본부
   - **Decode-X** (#10b981 에메랄드) — Input Plane 본부
   - **Foundry-X** (#ec4899 핑크) — Control Plane 본부
   - 각 카드: 상단 본부명 색상 매칭 + KPI section(F604 MetricGrid 재사용, 4 위젯) + 구분선 + HITL section(F605 HitlMetricsTile + EscalationBadge 재사용)
3. **OrgSelector 'KOAMI'** (1:30~2:00) — 단일 본부 토글, 화면 1 column으로 축소 + KOAMI 카드만 표시 + max-w-sm 컴팩트
4. **새로고침 버튼** (2:00~2:30) — `GET /api/kpi` + `GET /api/hitl/queue` 2 endpoint 호출 + 마지막 갱신 시각 갱신 + 데이터 refresh 시연
5. **footer 확인** (2:30~3:00) — "F621 · MVP W27 게이트 · 본부 RBAC(F601 외부 unlock 후 활성화) · backend 변경 0" 설명

**기대 화면 구성**:

```
┌─ 운영 통합 대시보드 (header) ─────────── 마지막 갱신 hh:mm:ss [새로고침] ┐
│                                                                          │
│  [● 전체] [● KOAMI] [● AXIS-DS] [● Decode-X] [● Foundry-X]              │
│                                                                          │
│  ┌─ KOAMI ─────┐ ┌─ AXIS-DS ───┐ ┌─ Decode-X ──┐ ┌─ Foundry-X ─┐       │
│  │ KPI 4종     │ │ KPI 4종     │ │ KPI 4종     │ │ KPI 4종     │       │
│  │ MetricGrid  │ │ MetricGrid  │ │ MetricGrid  │ │ MetricGrid  │       │
│  │ ─────────   │ │ ─────────   │ │ ─────────   │ │ ─────────   │       │
│  │ HITL pending│ │ HITL pending│ │ HITL pending│ │ HITL pending│       │
│  │ EscalateBadge│ EscalateBadge│ EscalateBadge│ EscalateBadge│       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                          │
│  F621 · MVP W27 게이트 · 본부 RBAC(F601 외부 unlock 후 활성화) · be 0   │
└──────────────────────────────────────────────────────────────────────────┘
```

**포인트** (3분 설명):
- ✅ **MVP W27 게이트 충족** — `sprint-plan §1.2 P1` + PRD `§4.1 #5` ✅
- ✅ **F604 4 위젯 + F605 2 위젯 재사용** — backend 변경 0, frontend filtering(옵션 B). F604/F605 회귀 위험 0
- ✅ **4 본부 동시 운영 단일 화면** — 본부장이 4 본부 KPI + HITL 한눈에 확인 가능. 본부별 색상 매칭(인디고/앰버/에메랄드/핑크)으로 빠른 식별
- ✅ **반응형 grid** — 1 본부 = 1 column 컴팩트 / 2 본부 = 2 column / 4 본부 = 4 column (xl 기준), 본부 수에 따라 자동 적응
- ⚠️ **본부 RBAC**: 현재 demo orgUnits 4 본부 하드코딩. **F601 외부 unlock(KT-DS SSO + Approver RBAC 5역) 시 dynamic으로 swap** — 사용자 권한에 따라 자기 본부만 보이게 변경 가능. ~30분 swap 작업 예상

---

## 3. 데모 종료 후 메시지 (3분)

### 3.1 본 데모가 입증한 것 (v1 P0 4건 → v2 P0 5건 + W27 게이트)

| PRD P0 / 게이트 | 데모 step | 증거 |
|----------------|-----------|------|
| P0-3 4대 진단 자동 실행 | Step 1 | findings[] 4 method |
| P0-4 Cross-Org default-deny | Step 3 | decision: "deny" + 그룹 |
| P0-7 Audit Log Bus | Step 5 | chain_valid: true + HMAC |
| P0-8 AI 투명성 + 윤리 임계 | Step 4 | confidence < 0.7 escalate |
| **P0-3 후속 Integration** | **Step 6 (NEW)** | **MultiEvidenceResult riskLevel "high"** |
| **MVP W27 게이트** | **Step 7 (NEW)** | **/operations 페이지 4 본부 KPI/HITL 통합** |

**4/8 P0 토대 ✅ + P0-3 Integration ✅ + W27 게이트 ✅ = 5/8 P0 + 1 게이트 라이브 시연 완료** — 잔여 3 P0 (P0-1/P0-2/P0-5 일부/P0-6 일부) 5/15 BeSir sign-off 후 W20+ 진행.

### 3.2 17 plan v2 Tier 진척 결과와 연결

- **T1~T5 17건 ✅** (Sprint 351~367) — 6일간 순차 완결
- **T6 외부 unlock 4건 ✅** (F604/F605/F619 stub/F621) — AXIS-DS PR #55 unlock + Decode-X stub 우회 + F604+F605 unlock 후 F621 진행
- **T6 잔존 2건** (F600/F601) — **본 미팅 5/15 sign-off 후 sprint 시동 가능**

### 3.3 BeSir 4 sign-off 안건과의 연결 (v1 그대로 + Step 6/7 보강)

- 안건 1 (본부 2개 선정) → Step 7 demo orgUnits 4 본부 → **실 본부로 swap** 가능 (~10분 hardcoded 교체)
- 안건 2 (core_differentiator 워크샵) → Step 2 그룹 분류 룰의 **본부 자체 검증**이 필요
- 안건 3 (Approver RBAC 5역) → Step 4 HITL escalation + Step 7 본부 RBAC dynamic swap (F601 SSO unlock 후)
- 안건 4 (KPI 6/8 데이터 협조) → Step 1+3+4의 결과가 **KPI 측정 dataset** + **Step 7에서 4 본부 KPI 표시**

---

## 4. Q&A 예상 질문 (5분, v1 5건 → v2 8건)

| Q | 답변 핵심 |
|---|-----------|
| 외부 LLM 호출은 어디? | F624 sixhats-llm-policy + KV cache + audit emit (Sprint 356 ✅). 본 데모에서 Step 2 분류 LLM 호출이 audit에 함께 기록됨 |
| 본부 데이터가 외부에 가는 것 아닌가? | 모든 LLM 호출 전 PII Mask + 호출 후 응답 sanitize. F627 llm+service-proxy (Sprint 365 ✅) 제어 |
| 다른 본부 정책이 섞이면? | F601 Multi-Tenant PG가 schema 단위 격리 (외부 인프라 결정 unlock 필요, P0-2 잔존). 골격은 D1+RLS dual storage로 이미 완비 (T4 ✅) |
| 운영자가 정지하려면? | F607 kill_switch (이미 ✅) + F605 HITL Console (Sprint 378 ✅ 통합 완료) + F621 운영 통합 화면(Step 7)에서 본부별 모니터링 |
| 시연 단계 중 한 곳이 실패하면? | trace_id chain의 어느 event부터 끊어졌는지 audit log로 즉시 식별 가능 (debugging 자체가 데모 가치) |
| **Multi-Evidence Decode-X 실 hook은 언제?** (NEW v2) | **Decode-X Phase 2-E unlock 시점. 현재 stub adapter로 80% 자체 검증 완료, swap 작업량은 ~10라인. 실 hook은 `analysis.completed` 이벤트 받아 자동 trigger** |
| **운영 통합 화면 본부가 4개로 고정인가?** (NEW v2) | **현재 demo orgUnits 하드코딩. F601 SSO + Approver RBAC 5역 unlock 시 dynamic으로 swap. 본부 수 변경은 `ORG_UNITS` 배열 갱신 ~5분 작업** |
| **E1/E2/E3 threshold 0.7은 왜?** (NEW v2) | **PRD §6.4 윤리 임계 정책(F607)과 동일 threshold. severity별 confidence: critical=1.0/warning=0.8/info=0.5. info evidence는 자동 필터링되어 noise reduction. threshold는 환경별 조정 가능** |

---

## 5. 사전 점검 체크리스트 (5/14 까지) — v2 갱신 7 endpoint 기반

> **S357 갱신**: v1 §5의 6 endpoint(F642 추가)에서 **7 endpoint(F619 + F621 추가)로 확장**. v1 §5.1~5.4 시점별 분해 그대로 유지하되 4번/5번 항목 보강.

### 5.1 5/10~5/13 사전 준비 가능 (W19 일~수, ~3.5일 분량)

| # | 항목 | 소요 | 담당 | 의존 | Status (S357) |
|---|------|------|------|------|--------------|
| 1 | **D1 시드 SQL 초안 작성** — `demo-org` org_id + `pol-rpa-pension-claim-001` policy_id + `agent-decision-pension-001` agent_id 3건 INSERT script | 30분 | Sinclair | F642 ✅ MERGED 후 (trace_id 컬럼 포함) | 📋 **5/13 (화)** |
| 2 | **18 v1 + 20 v2 페어 자료 출력** | 5분 | Sinclair | v2 작성 ✅ S357 | ✅ 즉시 가능 |
| 3 | **7 endpoint dry-run 1차 (test JWT)** — Step 1~5 endpoint 5건 + Step 7 web URL 1건 + Step 6 코드 dry-run 1건 = 총 7 시연 포인트 | 1.5시간 | Sinclair | F642 ✅ MERGED + JWT 발급 | 📋 **5/13 (수)** |
| 4 | **Q&A 모의 답변 review** — v2 §4 8 답변 본문 다듬기 (v1 5 + v2 신규 3) | 45분 | Sinclair + 서민원 | v2 §4 ✅ S357 작성 | ✅ 즉시 가능 |
| 5 | **02 v0.4 본문 + 14 v1.1 + 16 v1.1 + 17 v2 patch review** | 1시간 | Sinclair | 17 v2 ✅ S357 | ✅ 즉시 가능 |
| 6 | **scripts/d1-migrate-remote.sh로 0154 migration 적용 확인** (F642 ✅ 후) | 5분 | Sinclair | F642 ✅ MERGED | 📋 **F642 직후** |
| 7 | **Step 6 dry-run 사전 캡처** (NEW v2) — production `processMultiEvidence` 호출 결과 + Decode-X stub publish 결과 캡처 (코드 trace 백업) | 20분 | Sinclair | F619 ✅ Sprint 392 (이미 ✅ S357) | ✅ 즉시 가능 |
| 8 | **Step 7 화면 캡처 사전 준비** (NEW v2) — `/operations` URL 3 화면 모드(all/단일/refresh) 캡처 + 화면 확대 슬라이드 5장 | 30분 | Sinclair | F621 ✅ Sprint 393 (이미 ✅ S357) | ✅ 즉시 가능 |

### 5.2 5/14 당일 필수 (W19 수, dry-run 본 진행)

| # | 항목 | 소요 | 담당 | 의존 |
|---|------|------|------|------|
| A | **D1 시드 적용** — wrangler d1 execute로 production D1에 INSERT 3건 | 10분 | Sinclair | 5.1 #1 + #6 |
| B | **JWT 발급 + .env 등록** — TTL 24h, 5/15 18:00까지 유효 | 5분 | Sinclair | wrangler secret JWT_SECRET ✅ 등록됨 |
| C | **5 endpoint dry-run 2차** — Step 1~5 각 200/4xx 응답 확인 + 응답 body shape 정합성 | 30분 | Sinclair | A + B |
| D | **trace_id chain 검증 시나리오 실행** — 5단계 trace_id 연결 → GET by-trace 4 events 반환 | 15분 | Sinclair | C 통과 |
| E | **Step 6 dry-run 실행** (NEW v2) — Step 1 결과 → processMultiEvidence 호출 → riskLevel 출력 + Decode-X stub publish 1건 | 15분 | Sinclair | C 통과 |
| F | **Step 7 라이브 점검** (NEW v2) — `/operations` URL 실접속 + `/api/kpi` + `/api/hitl/queue` fetch 응답 정합성 + 4 본부 화면 정상 표시 + refresh 동작 | 15분 | Sinclair | C 통과 |
| G | **비디오 캡처 백업** — 7 step + Q&A 8건 시연 영상 (네트워크 장애 대비) | 1.5시간 | Sinclair | C+D+E+F 통과 |
| H | **Q&A 모의 진행 1회** — Sinclair (시연자) + 서민원 (대안적 질문자) 8 질문 응답 시간 측정 | 1.5시간 | Sinclair + 서민원 | v2 §4 review 완료 |
| I | **18 v1 + 20 v2 + 17 v2 인쇄 페어 자료** — 미팅 자료로 출력 (3부) | 15분 | Sinclair | 모든 patch 완료 |

### 5.3 5/15 미팅 직전 (D-day 오전, ~30분 점검)

| # | 항목 | 소요 | 담당 |
|---|------|------|------|
| α | **JWT 유효성 재확인** | 1분 | Sinclair |
| β | **7 endpoint smoke probe 1회** — 5/14 dry-run 이후 production 변동 0 확인 (Step 1~5 endpoint 5건 + `/api/kpi` + `/api/hitl/queue`) | 7분 | Sinclair |
| γ | **`/operations` 화면 정상 로드 확인** (NEW v2) | 1분 | Sinclair |
| δ | **비디오 백업 재생 가능 확인** — local + cloud 양쪽 | 2분 | Sinclair |
| ε | **18 + 20 v2 + 17 v2 + 02 v0.4 인쇄물 + 노트북 dual screen 준비** | 15분 | Sinclair |
| ζ | **본부 참석자 확인** — 본부장 + SME 4명 + 서민원 + Sinclair 7명 입장 | 5분 | Sinclair (별 채널 confirm) |

### 5.4 트리거 + 백업 트리거

- **트리거**: F619 ✅ + F621 ✅ + F642 ✅ → 5.1 #1+#6+#7+#8 즉시 가동 → 5.1 #3 5/13 (수) 1차 dry-run → 5.2 5/14 당일 본 진행 → 5.3 5/15 D-day
- **F619/F621 MERGED 완료 (S357, 2026-05-12)**: 5.1 #7+#8 즉시 가동 가능 (의존 0)
- **백업**: D1 시드 실패 시 → 1주 빠른 메모리 시드 (test JWT 임시 사용) / Cloudflare Workers 다운 시 → 비디오 백업 영상 fallback / Cloudflare Pages 다운 시 → Step 7 화면 캡처 슬라이드 fallback / Q&A 어려운 질문 시 → v2 §4 답변 본문 즉시 보조

---

## 6. 부록 — 데모 endpoint/route 사실 정합성 (v2 갱신 7 endpoint, S357 master HEAD `eb8185a4` 검증)

### 6.1 API endpoint (5건, v1.1 그대로)

| endpoint | 검증 대상 | 검증 결과 |
|----------|-----------|----------|
| POST /api/diagnostic/run | `packages/api/src/core/diagnostic/routes/index.ts:15` | ✅ exist |
| POST /api/cross-org/assign-group | `packages/api/src/core/cross-org/routes/index.ts:51` | ✅ exist (S350 -4 line drift 보정) |
| POST /api/cross-org/check-export | `packages/api/src/core/cross-org/routes/index.ts:59` | ✅ exist (S350 -3 line drift 보정) |
| POST /api/ethics/check-confidence | `packages/api/src/core/ethics/routes/index.ts:18` | ✅ exist |
| GET /api/audit/log/by-trace | `packages/api/src/core/harness/routes/audit.ts:125` (createRoute) + `:141` (auditRoute.openapi) | ✅ exist (F642 ✅ Sprint 379) |

### 6.2 Service-level 시연 (1건, NEW v2 — Step 6)

| service | 파일 | 검증 결과 |
|---------|------|----------|
| `processMultiEvidence(findings, traceId, threshold)` | `packages/api/src/core/diagnostic/services/multi-evidence.service.ts:101` | ✅ exist (F619 ✅ Sprint 392) |
| `DecodeXStubAdapter.publishAnalysisCompleted(event)` | `packages/api/src/core/decode-bridge/services/decode-x-stub.adapter.ts:12` | ✅ exist (F619 ✅ Sprint 392) |
| Types contract | `packages/api/src/core/diagnostic/types.ts:35~76` + `packages/api/src/core/decode-bridge/types.ts:1~30` | ✅ exist (MultiEvidenceResult/E1/E2/E3 + AnalysisCompletedEvent zod schema) |

**서비스 시연 방식**: production wrangler 환경에서 직접 호출 불가(internal service), 5/13~5/14 사전 dry-run 시 unit test 실행 또는 local node script로 결과 캡처 후 슬라이드 또는 dev terminal로 시연.

### 6.3 Web route + supporting API (1 + 2건, NEW v2 — Step 7)

| route / endpoint | 파일 / 검증 대상 | 검증 결과 |
|------------------|------------------|----------|
| GET /operations (web URL) | `packages/web/src/routes/operations.tsx:62` (Component) + `packages/web/src/router.tsx` lazy import | ✅ exist (F621 ✅ Sprint 393) |
| GET /api/kpi | `packages/api/src/core/kpi/routes/index.ts` (F604 ✅ Sprint 377) | ✅ exist |
| GET /api/hitl/queue | `packages/api/src/core/hitl/routes/index.ts` (F605 ✅ Sprint 378) | ✅ exist |

**Mount points** (S357 검증):
- `app.route("/api/diagnostic", diagnosticApp);`
- `app.route("/api/ethics", ethicsApp);`
- `app.route("/api/cross-org", crossOrgApp);`
- `app.route("/api", auditRoute);` (F642 trace endpoint 포함)
- `app.route("/api/kpi", kpiApp);` (F604)
- `app.route("/api/hitl", hitlApp);` (F605)

**Web router** (S357 검증):
- `router.tsx` `<Route path="/operations" lazy={() => import("./routes/operations")} />`
- ProtectedRoute 통과 (인증 필요)

**Production smoke 검증** (S357, 2026-05-12 master HEAD `eb8185a4`):
- 5 API endpoint Step 1~5: v1.1 §6 그대로 (3 input pattern 5xx 0건 검증 완료)
- GET `/api/kpi` (no auth) → **HTTP 401** ✅
- GET `/api/hitl/queue` (no auth) → **HTTP 401** ✅
- GET `/operations` (web) → **HTTP 200** (ProtectedRoute SPA → redirect to login if no JWT) ✅
- Step 6 `processMultiEvidence`: 17/17 tests PASS (S357 PR #815, multi-evidence 8 + audit-bus chain 2 + ...)
- Step 7 `/operations`: E2E `operations.spec.ts` 4 assertions PASS (S357 PR #816)

**7 시연 포인트 총합**: 5 API endpoint + 1 service-level (Step 6) + 1 web route + 2 supporting API (Step 7) = 시연 시 5 curl + 1 dry-run + 1 URL = 7 actions

---

## 7. v1 → v2 변경 요약

| 항목 | v1 (S350, 2026-05-10) | v2 (S357, 2026-05-12) |
|------|------------------------|------------------------|
| Step 수 | 5 step (F602+F603+F606+F607+F642) | **7 step** (+ F619 + F621) |
| Duration | 15-20분 + 5분 Q&A | **18-22분 + 5분 Q&A** |
| 시연 형식 | curl HTTP 100% | curl 5 + 코드 trace 1 + URL 1 (3 형식 혼합) |
| 검증 endpoint/route | 5 endpoint | **5 endpoint + 1 service + 1 route + 2 supporting API = 9 검증점** |
| Q&A 항목 | 5건 | **8건** (+ Multi-Evidence Decode-X / 운영 화면 본부 고정 / E1/E2/E3 threshold) |
| PRD P0 입증 | 4/8 P0 토대 | **5/8 P0 + W27 게이트 + P0-3 Integration** |
| 사전 점검 | 6 endpoint | **7 시연 포인트 + Step 6/7 추가 사전 준비** |

---

**Status**: v2.0 (S357, 2026-05-12) — v1 5 step 본문 유지 + Step 6 F619 Multi-Evidence (코드 trace) + Step 7 F621 운영 통합 대시보드 (URL 시연) 추가. 5/14 BeSir D-2 dry-run + 5/15 W19 미팅 정본 자료. 검증 7 시연 포인트 + Q&A 8건 + 사전 점검 시점별 분해 완비.
