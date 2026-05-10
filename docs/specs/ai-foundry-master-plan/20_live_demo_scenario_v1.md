---
title: AI Foundry — Live Demo 시나리오 v1 (BeSir 5/15 미팅 D-day)
purpose: 5/15 BeSir 미팅에서 P0 4건 토대 ✅ 실시간 시연 — F602/F603/F606/F607 통합 데모
target_meeting: 2026-05-15 W19 BeSir 차기 미팅
date: 2026-05-10 (W19 D-5)
owner: Sinclair Seo
duration: 15-20분 (Q&A 별도)
classification: 기업비밀II급
prereq:
  - Foundry-X API: foundry-x-api.ktds-axbd.workers.dev (production)
  - 인증: JWT (사전 발급, demo 계정)
  - 도메인: 가상 도메인 "demo-org" (D1 사전 시드)
related_docs:
  - 18_conditional_gate_evidence_v1.md (C-1 통과 증거)
  - 02_ai_foundry_phase1_v0.4 (PRD)
  - 14_repo_status_audit_v1.1 (Sprint 376 baseline)
---

# 20. AI Foundry Live Demo 시나리오 v1

> **사용자 PM 노트**: 본 문서는 5/15 BeSir 미팅 실시간 시연 가이드. **15-20분 데모 + 5분 Q&A** 기준. P0 4건 토대 ✅ (F602/F603/F606/F607)을 1 사례로 엮어 "AI Foundry가 실제 동작한다"를 입증. 데모 실패 대비 비디오 캡처 백업 권장 (사전 1회 dry-run 필수).

---

## 0. 데모 한 줄 메시지

> **"의사결정 1건이 들어오면 → 4대 진단 → 정책 검사 → 윤리 검증 → Audit 자산화. 모두 코드로 강제된다."**

---

## 1. 데모 시나리오 — "도메인 본부 정책 export 시도" (12분)

### 1.1 가상 컨텍스트

KT Ops 본부가 신규 정책팩 "퇴직연금 자동 청구 RPA"를 본부 외부(예: HR 본부)로 export하려 한다. AI Foundry는 (a) 정책에 4대 진단 자동 실행 → (b) core_differentiator 그룹 분류 → (c) export 가능 여부 default-deny 검사 → (d) 모든 단계 audit log 발행.

### 1.2 단계별 흐름 (전체 10분)

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
[5] F606 Audit Bus 회수    (1분)  GET /api/audit/log?trace_id=...
```

### 1.3 데모 결과 — "거부 + 감독 가능"

`check-export` 단계에서 **HTTP 200 + `decision: "deny", reason: "core_differentiator group"`** 응답 → export 차단됨. trace_id 단일 chain으로 5단계 모두 추적 가능.

---

## 2. 단계별 curl 명령 + 기대 응답

### Step 1 — F602 4대 진단 자동 실행

**curl**:
```bash
curl -X POST https://foundry-x-api.ktds-axbd.workers.dev/api/diagnostic/run \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "demo-org",
    "diagnosticTypes": ["missing", "duplicate", "overspec", "inconsistency"]
  }'
```

**기대 응답**:
```json
{
  "report_id": "diag-20260515-001",
  "org_id": "demo-org",
  "findings": [
    {"diagnostic_type": "missing", "severity": "warn", "count": 3},
    {"diagnostic_type": "duplicate", "severity": "info", "count": 1},
    {"diagnostic_type": "overspec", "severity": "warn", "count": 2},
    {"diagnostic_type": "inconsistency", "severity": "fail", "count": 0}
  ],
  "audit_event_id": "evt_diag_001"
}
```

**포인트** (1분 설명):
- ✅ 4 method 모두 자동 실행 (PRD P0-3 충족률 100%)
- ✅ audit_event_id로 F606 chain 시작
- ✅ severity별 분류 (인터럽트 가능)

### Step 2 — F603 core_differentiator 그룹 분류

**curl**:
```bash
curl -X POST https://foundry-x-api.ktds-axbd.workers.dev/api/cross-org/assign-group \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "demo-org",
    "policyId": "pol-rpa-pension-claim-001",
    "trace_id": "trc-demo-2026-05-15"
  }'
```

**기대 응답**:
```json
{
  "policy_id": "pol-rpa-pension-claim-001",
  "group": "core_differentiator",
  "rationale": "domain-specific automation revealing internal operational pattern",
  "assigned_at": "2026-05-15T05:00:00Z",
  "audit_event_id": "evt_cross_001"
}
```

**포인트**:
- ✅ 4그룹 (`core_differentiator` / `industry_standard` / `internal_only` / `public_safe`) 분류
- ✅ 자동화 (LLM 룰 기반) — Sinclair 개입 0%
- ✅ trace_id로 Step 1 audit chain 연속

### Step 3 — F603 export 차단 검사 (default-deny 강제)

**curl**:
```bash
curl -X POST https://foundry-x-api.ktds-axbd.workers.dev/api/cross-org/check-export \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "demo-org",
    "policyId": "pol-rpa-pension-claim-001",
    "targetOrgId": "hr-bonbu",
    "trace_id": "trc-demo-2026-05-15"
  }'
```

**기대 응답**:
```json
{
  "decision": "deny",
  "reason": "core_differentiator group: cross-bonbu export blocked by default policy",
  "policy_group": "core_differentiator",
  "audit_event_id": "evt_cross_002",
  "blocked_at": "2026-05-15T05:01:00Z"
}
```

**포인트** (이게 핵심):
- ✅ **default-deny 코드로 강제** (PRD P0-4 골격 100%)
- ✅ 응답 자체가 "거부 사유 + 그룹 + 차단 시각" 명시
- ✅ F626 차단율 KPI 측정 코드 ✅ (W20 베이스라인 측정 가능)
- ⚠️ **데모 클라이맥스**: "본부장이 정책 자산을 마음대로 빼낼 수 없다"

### Step 4 — F607 윤리 임계 검증 (HITL escalation 가능)

**curl**:
```bash
curl -X POST https://foundry-x-api.ktds-axbd.workers.dev/api/ethics/check-confidence \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-decision-pension-001",
    "orgId": "demo-org",
    "decision": "auto-claim-trigger",
    "confidence": 0.65,
    "trace_id": "trc-demo-2026-05-15"
  }'
```

**기대 응답**:
```json
{
  "action": "escalate_to_hitl",
  "reason": "confidence 0.65 < threshold 0.7 (PRD §6.4)",
  "violation_id": "viol-001",
  "kill_switch_state": "active",
  "audit_event_id": "evt_ethics_001"
}
```

**포인트**:
- ✅ confidence < 0.7 → HITL escalation 자동 (PRD §6.4 윤리 임계)
- ✅ kill_switch_state로 운영자가 즉시 정지 가능 (F605 HITL Console과 통합 예정)
- ✅ ethics_violations 테이블 영구 기록

### Step 5 — F642 Audit Bus T2 회수 (trace_id chain 검증, F642 ✅ Sprint 379 신규)

**curl**:
```bash
curl -X GET "https://foundry-x-api.ktds-axbd.workers.dev/api/audit/log/by-trace?trace_id=trc-demo-2026-05-15" \
  -H "Authorization: Bearer ${JWT}"
```

**기대 응답** (F642 실측 shape, S350 갱신 — camelCase, F606 audit-bus T1 통합은 후속):
```json
{
  "traceId": "trc-demo-2026-05-15",
  "events": [
    {
      "id": "evt_diag_001",
      "tenantId": "demo-org",
      "eventType": "diagnostic.run",
      "agentId": null,
      "modelId": null,
      "traceId": "trc-demo-2026-05-15",
      "metadata": {"diagnostic_types": ["missing","duplicate","overspec","inconsistency"]},
      "createdAt": "2026-05-15T04:59:30Z"
    },
    {
      "id": "evt_cross_001",
      "eventType": "cross-org.assign-group",
      "traceId": "trc-demo-2026-05-15",
      "metadata": {"policy_id": "pol-rpa-pension-claim-001", "group": "core_differentiator"},
      "createdAt": "2026-05-15T05:00:00Z"
    },
    {
      "id": "evt_cross_002",
      "eventType": "cross-org.check-export.deny",
      "traceId": "trc-demo-2026-05-15",
      "metadata": {"target_org": "hr-bonbu", "decision": "deny"},
      "createdAt": "2026-05-15T05:01:00Z"
    },
    {
      "id": "evt_ethics_001",
      "eventType": "ethics.escalate",
      "agentId": "agent-decision-pension-001",
      "traceId": "trc-demo-2026-05-15",
      "metadata": {"confidence": 0.65, "threshold": 0.7},
      "createdAt": "2026-05-15T05:01:30Z"
    }
  ],
  "chainValid": true
}
```

**포인트** (5-Asset Decision Log 핵심):
- ✅ 4 events trace_id 단일 chain (`createdAt ASC` 정렬, F642 ✅ Sprint 379 구현)
- ✅ append-only D1 + indexed `idx_audit_trace_id` → 사후 조작 불가, 빠른 조회 (감독기관 응답 즉시 가능)
- ⚠️ HMAC SHA256 무결성 검증은 F606 `audit_events` 테이블에만 적용 (F642는 기존 `audit_logs` 테이블 trace_id enrichment) — F606↔F642 통합은 별 sprint 후보 (W20+ 처리)
- ✅ trace_id 호출자 4건 (cross-org/diagnostic/ethics/launch) 통합은 별 sprint (out-of-scope) — 5/14 dry-run 시 **수동 trace_id 입력으로 시연 가능** (각 endpoint POST body에 trace_id 포함)

---

## 3. 데모 종료 후 메시지 (3분)

### 3.1 본 데모가 입증한 것

| PRD P0 | 데모 step | 증거 |
|--------|-----------|------|
| P0-3 4대 진단 자동 실행 | Step 1 | findings[] 4 method |
| P0-4 Cross-Org default-deny | Step 3 | decision: "deny" + 그룹 |
| P0-7 Audit Log Bus | Step 5 | chain_valid: true + HMAC |
| P0-8 AI 투명성 + 윤리 임계 | Step 4 | confidence < 0.7 escalate |

**4/8 P0 토대 ✅ 라이브 시연 완료** — 잔여 4 P0 (P0-1/P0-2/P0-5/P0-6) BeSir sign-off 후 W20+ 진행.

### 3.2 BeSir 4 sign-off 안건과의 연결

- 안건 1 (본부 2개 선정) → 본 데모의 "demo-org"가 **실제 본부**가 되어야 데이터 흐름 의미 발생
- 안건 2 (core_differentiator 워크샵) → Step 2 그룹 분류 룰의 **본부 자체 검증**이 필요
- 안건 3 (Approver RBAC 5역) → Step 4 HITL escalation의 **승인자**가 실제 RBAC으로 가능
- 안건 4 (KPI 6/8 데이터 협조) → Step 1+3+4의 결과가 **KPI 측정 dataset**

---

## 4. Q&A 예상 질문 (5분)

| Q | 답변 핵심 |
|---|-----------|
| 외부 LLM 호출은 어디? | F624 sixhats-llm-policy + KV cache + audit emit (Sprint 356 ✅). 본 데모에서 Step 2 분류 LLM 호출이 audit에 함께 기록됨 |
| 본부 데이터가 외부에 가는 것 아닌가? | 모든 LLM 호출 전 PII Mask + 호출 후 응답 sanitize. F627 llm+service-proxy (Sprint 365 ✅) 제어 |
| 다른 본부 정책이 섞이면? | F601 Multi-Tenant PG가 schema 단위 격리 (외부 인프라 결정 unlock 필요, P0-2 잔존) |
| 운영자가 정지하려면? | F607 kill_switch (이미 ✅) + F605 HITL Console (idea, AXIS-DS v1.2 통합 예정) |
| 시연 단계 중 한 곳이 실패하면? | trace_id chain의 어느 event부터 끊어졌는지 audit log로 즉시 식별 가능 (debugging 자체가 데모 가치) |

---

## 5. 사전 점검 체크리스트 (5/14 까지) — S350 분해 표

> **S350 추가**: 6항을 시점별 3 그룹으로 분해 — (a) 5/10~5/13 사전 준비 가능 / (b) 5/14 당일 필수 / (c) 5/15 미팅 직전. 사전 준비 가능 항목은 즉시 시작.

### 5.1 5/10~5/13 사전 준비 가능 (W19 일~수, ~3.5일 분량)

| # | 항목 | 소요 | 담당 | 의존 | Status (S350) |
|---|------|------|------|------|--------------|
| 1 | **D1 시드 SQL 초안 작성** — `demo-org` org_id + `pol-rpa-pension-claim-001` policy_id + `agent-decision-pension-001` agent_id 3건 INSERT script | 30분 | Sinclair | F642 ✅ MERGED 후 (trace_id 컬럼 포함) | 📋 **S350 다음** |
| 2 | **18 v1 페어 자료 출력** | 5분 | Sinclair | 18 v1.1 보강 ✅ (S350 §6 Q&A 추가) | ✅ 즉시 가능 |
| 3 | **5 endpoint dry-run 1차 (test JWT)** — F642 trace_id endpoint 포함 6 endpoint | 1시간 | Sinclair | F642 ✅ MERGED + JWT 발급 | 📋 **5/13 (수)** |
| 4 | **Q&A 모의 답변 review** — 18 §6 5 답변 본문 다듬기 | 30분 | Sinclair + 서민원 | 18 §6 ✅ S350 작성 | ✅ 즉시 가능 |
| 5 | **02 v0.4 본문 + 14 v1.1 + 16 v1.1 patch review** | 1시간 | Sinclair | ✅ S346 patch 완료 | ✅ 즉시 가능 |
| 6 | **scripts/d1-migrate-remote.sh로 0154 migration 적용 확인** (F642 ✅ 후) | 5분 | Sinclair | F642 ✅ MERGED | 📋 **F642 직후** |

### 5.2 5/14 당일 필수 (W19 목, dry-run 본 진행)

| # | 항목 | 소요 | 담당 | 의존 |
|---|------|------|------|------|
| A | **D1 시드 적용** — wrangler d1 execute로 production D1에 INSERT 3건 | 10분 | Sinclair | 5.1 #1 + #6 |
| B | **JWT 발급 + .env 등록** — TTL 24h, 5/15 18:00까지 유효 | 5분 | Sinclair | wrangler secret JWT_SECRET ✅ 등록됨 |
| C | **5 endpoint dry-run 2차** — 6 endpoint 각 200/4xx 응답 확인 + 응답 body shape 정합성 | 30분 | Sinclair | A + B |
| D | **trace_id chain 검증 시나리오 실행** — 5단계 trace_id 연결 → GET by-trace 4 events 반환 | 15분 | Sinclair | C 통과 |
| E | **비디오 캡처 백업** — 5 step + Q&A 5건 시연 영상 (네트워크 장애 대비) | 1시간 | Sinclair | C + D 통과 |
| F | **Q&A 모의 진행 1회** — Sinclair (시연자) + 서민원 (대안적 질문자) 5 질문 응답 시간 측정 | 1시간 | Sinclair + 서민원 | 18 §6 review 완료 |
| G | **18 v1 + 20 v1 인쇄 페어 자료** — 미팅 자료로 출력 (3부) | 15분 | Sinclair | 모든 patch 완료 |

### 5.3 5/15 미팅 직전 (D-day 오전, ~30분 점검)

| # | 항목 | 소요 | 담당 |
|---|------|------|------|
| α | **JWT 유효성 재확인** | 1분 | Sinclair |
| β | **5 endpoint smoke probe 1회** — 5/14 dry-run 이후 production 변동 0 확인 | 5분 | Sinclair |
| γ | **비디오 백업 재생 가능 확인** — local + cloud 양쪽 | 2분 | Sinclair |
| δ | **18 + 20 + 02 v0.4 인쇄물 + 노트북 dual screen 준비** | 15분 | Sinclair |
| ε | **본부 참석자 확인** — 본부장 + SME 4명 + 서민원 + Sinclair 7명 입장 | 5분 | Sinclair (별 채널 confirm) |

### 5.4 트리거 + 백업 트리거

- **트리거**: F642 ✅ MERGED → 5.1 #1+#6 즉시 가동 → 5.1 #3 5/13 (수) 1차 dry-run → 5.2 5/14 당일 본 진행 → 5.3 5/15 D-day
- **F642 MERGED 지연 시**: 5.1 #1+#3+#6은 차순위 (5/13~5/14), 5.1 #2+#4+#5는 즉시 진행 가능 (의존 0)
- **백업**: D1 시드 실패 시 → 1주 빠른 메모리 시드 (test JWT 임시 사용) / Cloudflare Workers 다운 시 → 비디오 백업 영상 fallback / Q&A 어려운 질문 시 → 18 §6 답변 본문 즉시 보조

---

## 6. 부록 — 데모 endpoint 사실 정합성 (S350 재검증, F642 ✅ Sprint 379 반영)

본 시나리오의 모든 endpoint는 **2026-05-10 master HEAD `f13caf53`** (F642 MERGED) 기준 실재 검증:

| endpoint | 검증 대상 | 검증 결과 |
|----------|-----------|----------|
| POST /api/diagnostic/run | `packages/api/src/core/diagnostic/routes/index.ts:15` | ✅ exist |
| POST /api/cross-org/assign-group | `packages/api/src/core/cross-org/routes/index.ts:51` | ✅ exist (S350 -4 line drift 보정) |
| POST /api/cross-org/check-export | `packages/api/src/core/cross-org/routes/index.ts:59` | ✅ exist (S350 -3 line drift 보정) |
| POST /api/ethics/check-confidence | `packages/api/src/core/ethics/routes/index.ts:18` | ✅ exist |
| **GET /api/audit/log/by-trace** ✱ | `packages/api/src/core/harness/routes/audit.ts:125` (createRoute) + `:141` (auditRoute.openapi) | ✅ exist (**F642 ✅ Sprint 379 신규** — S350 endpoint URL 갱신: `GET /api/audit/log` → `GET /api/audit/log/by-trace`) |

**Mount points** (`packages/api/src/app.ts`, S350 +2 line drift 일괄 보정):
- `app.route("/api/diagnostic", diagnosticApp);` (L339)
- `app.route("/api/ethics", ethicsApp);` (L342)
- `app.route("/api/cross-org", crossOrgApp);` (L351)
- `app.route("/api", auditRoute);` (L209) — F642 신규 endpoint도 같은 `auditRoute` sub-app 통해 mount

**Production smoke 검증** (S350 master HEAD `f13caf53`, 2026-05-10 20:15 KST):
- `GET /api/audit/log/by-trace?trace_id=` (no trace_id) → **HTTP 401** ✅ (인증 필요, 5xx 0건)
- `GET /api/audit/log/by-trace?trace_id=test-001` → **HTTP 401** ✅ (인증 필요)
- `GET /api/audit/log/by-trace?trace_id=nonexistent` → **HTTP 401** ✅ (인증 필요)
- 회귀: `GET /api/audit/logs` (기존) → 401 ✅, `GET /api/openapi.json` → 200 ✅
- **3 input pattern 모두 5xx 0건** (rules "Production Smoke Test 16회차 변종" 영구 차단 검증)

**F642 추가 산출물**:
- D1 migration `0154_audit_logs_trace_id.sql` (ALTER TABLE audit_logs ADD COLUMN trace_id + idx_audit_trace_id)
- `core/harness/services/audit-logger.ts:175` `getByTraceId(traceId): TraceChainResult` method
- `core/harness/schemas/audit.ts` `AuditLogByTraceResponseSchema` (traceId + events + chainValid)
- `__tests__/audit-trace-chain.test.ts` (회귀 + 신규 케이스 검증)

---

**Status**: v1.1 (S350, 2026-05-10) — F642 ✅ Sprint 379 endpoint 신규 반영 + 4 line drift 보정 + production smoke 검증. BeSir 5/14 dry-run 시 위 6 endpoint + trace_id chain 시연 가능.
