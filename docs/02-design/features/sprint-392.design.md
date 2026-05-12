---
code: FX-DSGN-392
title: Sprint 392 — F619 Multi-Evidence E1/E2/E3 + Decode-X Stub Adapter Design
version: 1.0
status: Active
category: DESIGN
sprint: 392
feature: F619
req: FX-REQ-684
session: S357
date: 2026-05-12
related:
  - docs/01-plan/features/sprint-392.plan.md
  - docs/02-design/features/sprint-357.design.md
---

# Sprint 392 — F619 Design

## 1. 목표

F602 4대 진단(Missing/Duplicate/Overspec/Inconsistency) 결과를 3단계 Evidence Layer(E1/E2/E3)로
통합하는 순수 함수 알고리즘 + Decode-X Phase 2-E 이벤트 수신을 위한 stub adapter 구현.

## 2. 아키텍처

```
[Decode-X stub]                  [Diagnostic Domain]
publishAnalysisCompleted(event)  DiagnosticEngine.runAll() → DiagnosticFindings[]
        │                                   │
        ▼                                   ▼
  mock event queue              processMultiEvidence()
  (in-memory)                          │
        │                    E1: collectEvidence()
        └──────────────────► E2: validateEvidence()  (threshold 0.7)
                             E3: integrateEvidence()
                                   │
                             MultiEvidenceResult
                             {diagnosticSessionId, traceId, e1, e2, e3}
```

## 3. 타입 계약 (Types Contract)

### decode-bridge/types.ts — 신규 export

| 심볼 | 종류 | 설명 |
|------|------|------|
| `EvidenceLayer` | const enum-like | E1/E2/E3 레이어 식별자 |
| `AnalysisCompletedEvent` | Zod infer | Decode-X Phase 2-E 이벤트 shape |
| `AnalysisCompletedEventSchema` | Zod Schema | 런타임 유효성 검사 |
| `DecodeXAdapter` | interface | production swap 인터페이스 |

### diagnostic/types.ts — 신규 export

| 심볼 | 종류 | 설명 |
|------|------|------|
| `EVIDENCE_CONFIDENCE_THRESHOLD` | const (0.7) | E2 필터 임계값 |
| `E1CollectionResult` | interface | E1 레이어 결과 |
| `ValidatedEvidence` | interface | E2 validation 단위 |
| `E2ValidationResult` | interface | E2 레이어 결과 |
| `E3IntegrationResult` | interface | E3 레이어 결과 |
| `MultiEvidenceResult` | interface | 전체 파이프라인 결과 |

## 4. TDD Red Target

### multi-evidence.test.ts (diagnostic)
- T1: 4 진단 결과 → E1 byType 분류 정확
- T2: severity=info(0.5) → E2 threshold 0.7 필터, severity=critical(1.0) → PASS
- T3: E3 integration score = passed items 평균 confidence
- T4: processMultiEvidence full pipeline → diagnosticSessionId 생성 + 3 layer 존재

### decode-x-stub.test.ts (decode-bridge)
- T1: publishAnalysisCompleted → getEventQueue()에 event 추가
- T2: clearEventQueue() → 빈 배열
- T3: 유효하지 않은 event → zod schema 오류 (parseEventSafe false)

### multi-evidence-audit-bus.test.ts (diagnostic)
- T1: traceId가 MultiEvidenceResult에 전파됨 (F606 chain 보존 검증)

## 5. 파일 매핑

| 파일 | 역할 | 의존성 |
|------|------|--------|
| `core/decode-bridge/types.ts` | 수정: EvidenceLayer + AnalysisCompletedEvent + DecodeXAdapter | zod |
| `core/diagnostic/types.ts` | 수정: MultiEvidenceResult + E1/E2/E3 결과 타입 | decode-bridge/types.ts (contract) |
| `core/diagnostic/services/multi-evidence.service.ts` | 신설: E1/E2/E3 순수 함수 | diagnostic/types.ts only |
| `core/decode-bridge/services/decode-x-stub.adapter.ts` | 신설: mock event publisher | decode-bridge/types.ts only |
| `core/diagnostic/__tests__/multi-evidence.test.ts` | 신설: 알고리즘 테스트 | multi-evidence.service.ts |
| `core/decode-bridge/__tests__/decode-x-stub.test.ts` | 신설: stub adapter 테스트 | decode-x-stub.adapter.ts |
| `core/diagnostic/__tests__/multi-evidence-audit-bus.test.ts` | 신설: trace_id 전파 검증 | multi-evidence.service.ts |

## 6. Cross-domain Import 규칙

```typescript
// ✅ 허용: diagnostic → decode-bridge types.ts contract import
import type { EvidenceLayer } from "../../decode-bridge/types.js";

// ❌ 금지: diagnostic → decode-bridge internal import
import { DecodeXStubAdapter } from "../../decode-bridge/services/decode-x-stub.adapter.js";

// ✅ 허용: multi-evidence-audit-bus.test.ts 에서 stub adapter 직접 import
// (테스트 파일은 같은 도메인에 있지만, 통합 테스트에서 decode-bridge 서비스 사용)
// 단, 이 경우 테스트 파일을 decode-bridge/__tests__/ 에 배치하거나
// diagnostic/__tests__/ 에서 직접 mock으로 대체
```

**audit-bus 통합 테스트**: trace_id는 서비스 인자(`traceId: string`)로 전달.
`AuditBus` 인스턴스가 없어도 traceId string만 전파 검증 가능 → mock 불필요.

## 7. Severity → Confidence 매핑

| Severity | Confidence Score | E2 통과 (threshold=0.7) |
|----------|-----------------|------------------------|
| `critical` | 1.0 | ✅ PASS |
| `warning` | 0.8 | ✅ PASS |
| `info` | 0.5 | ❌ FILTERED |

## 8. Risk Level 계산 (E3)

| Integration Score | Risk Level |
|------------------|-----------|
| ≥ 0.9 | `critical` |
| ≥ 0.7 | `high` |
| ≥ 0.4 | `medium` |
| < 0.4 | `low` |
