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

### Step 5 — F606 Audit Bus 회수 (trace_id chain 검증)

**curl**:
```bash
curl -X GET "https://foundry-x-api.ktds-axbd.workers.dev/api/audit/log?trace_id=trc-demo-2026-05-15" \
  -H "Authorization: Bearer ${JWT}"
```

**기대 응답**:
```json
{
  "trace_id": "trc-demo-2026-05-15",
  "events": [
    {"event_id": "evt_diag_001", "type": "diagnostic.run", "ts": "2026-05-15T04:59:30Z", "hmac": "sha256-..."},
    {"event_id": "evt_cross_001", "type": "cross-org.assign-group", "ts": "2026-05-15T05:00:00Z", "hmac": "sha256-..."},
    {"event_id": "evt_cross_002", "type": "cross-org.check-export.deny", "ts": "2026-05-15T05:01:00Z", "hmac": "sha256-..."},
    {"event_id": "evt_ethics_001", "type": "ethics.escalate", "ts": "2026-05-15T05:01:30Z", "hmac": "sha256-..."}
  ],
  "chain_valid": true,
  "hmac_algo": "sha256"
}
```

**포인트** (5-Asset Decision Log 핵심):
- ✅ 4 events trace_id 단일 chain (W3C Trace Context 호환)
- ✅ HMAC SHA256 무결성 검증 → SIEM 발행 가능
- ✅ append-only D1 → 사후 조작 불가 (감독기관 응답 즉시 가능)

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

## 5. 사전 점검 체크리스트 (5/14 까지)

- [ ] D1 시드: `demo-org`, `pol-rpa-pension-claim-001` 1건 사전 등록
- [ ] JWT 발급: BeSir 데모용 1회 토큰 (TTL 24h)
- [ ] 5 endpoint dry-run 1회 (curl 5건 200 응답 확인)
- [ ] 비디오 백업 capture (네트워크 장애 대비)
- [ ] Q&A 5분 모의 진행 (Sinclair + 서민원)
- [ ] 18 v1 Conditional Gate 자료 동시 출력 (페어 자료)

---

## 6. 부록 — 데모 endpoint 사실 정합성 (S346 검증)

본 시나리오의 모든 endpoint는 **2026-05-10 master HEAD `e1e4f9db`** 기준 실재 검증:

| endpoint | 검증 대상 | 검증 결과 |
|----------|-----------|----------|
| POST /api/diagnostic/run | `packages/api/src/core/diagnostic/routes/index.ts:15` | ✅ exist |
| POST /api/cross-org/assign-group | `packages/api/src/core/cross-org/routes/index.ts:55` | ✅ exist |
| POST /api/cross-org/check-export | `packages/api/src/core/cross-org/routes/index.ts:62` | ✅ exist |
| POST /api/ethics/check-confidence | `packages/api/src/core/ethics/routes/index.ts:18` | ✅ exist |
| GET /api/audit/log | `packages/api/src/core/harness/routes/audit.ts` | ✅ exist (audit.route mounted at /api) |

**Mount points** (`packages/api/src/app.ts`):
- `app.route("/api/diagnostic", diagnosticApp);` (L337)
- `app.route("/api/ethics", ethicsApp);` (L340)
- `app.route("/api/cross-org", crossOrgApp);` (L349)
- `app.route("/api", auditRoute);` (L207)

---

**Status**: v1 초안 (S346, 2026-05-10) — BeSir 5/14 dry-run 후 v1.1 보강 예정
