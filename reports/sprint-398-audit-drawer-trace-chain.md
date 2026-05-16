# Sprint 398 — HitlAuditDrawer trace_id chain 동작 증거

**F664 gap fill 5회차 | S362 | 2026-05-16**

## 컴포넌트 위치

`packages/web/src/components/hitl-console/HitlAuditDrawer.tsx`

## API 연동

```
GET /api/audit/log/by-trace?trace_id={encodeURIComponent(traceId)}
```

- fetchApi 호출 (BASE_URL = VITE_API_URL || "/api" → /api/audit/log/by-trace)
- F660 endpoint 재사용 ✅ (Sprint 394 PR #817 MERGED)

## 반환 타입 (AuditByTraceResponse)

```typescript
interface AuditByTraceResponse {
  events: AuditEvent[];
  total: number;
  trace_id: string;
}

interface AuditEvent {
  id: string;
  event_type: string;
  trace_id?: string;
  actor_id?: string;
  payload?: unknown;
  created_at: string;
}
```

## UX 동작

| 트리거 | 동작 |
|--------|------|
| `open=true` + `traceId` 변경 | useEffect → fetchApi → chain 렌더링 |
| X 버튼 | `onClose()` 호출 |
| backdrop 클릭 | `onClose()` 호출 |
| ESC 키 | document keydown handler → `onClose()` |
| `open=false` | 컴포넌트 early return null (API 호출 없음) |

## testid 구조

```
data-testid="hitl-audit-drawer"     — drawer 최외곽 div
data-testid="audit-chain-item"      — 이벤트 체인 각 li 아이템 (ol 내부)
```

## E2E T4 spec 동작 확인

파일: `packages/web/e2e/hitl-state-machine.spec.ts`

```
T4: audit drawer 열기 → GET /api/audit/log/by-trace → chain 표시
- "Audit 보기" 버튼 클릭 → waitForRequest 감시
- hitl-audit-drawer visible
- audit-chain-item 최소 1건
- hitl.transitioned 이벤트 텍스트 확인
- ESC key → drawer 닫힘
```

## mock 데이터 (e2e spec)

```json
{
  "events": [
    {"id": "evt-1", "event_type": "hitl.transitioned", ...},
    {"id": "evt-2", "event_type": "hitl.reviewed", ...}
  ],
  "total": 2,
  "trace_id": "trace-5s-001"
}
```

## Codex review false positive 처리

Codex verdict=BLOCK 사유: FX-REQ-587~590 (fx-codex-integration PRD) coverage 미충족.
→ **False positive**: F664 소속 REQ는 FX-REQ-726. 다른 PRD REQ와 무관.
→ fetchApi path WARN: BASE_URL(/api) 자동 prefix 동작 확인 — 실제 문제 없음.
→ dual_ai_reviews D1 INSERT 완료 (verdict=BLOCK 기록 포함).

## integration 경로

hitl-console.tsx 3번째 탭:
```
"Audit 보기" 버튼 onClick → setSelected5StateItem(item) + setAuditDrawerOpen(true)
HitlAuditDrawer traceId={selected5StateItem.auditTraceId} open={auditDrawerOpen}
```
