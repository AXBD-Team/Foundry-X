# Sprint 394 Report — F660 audit-bus 통합 view + traceId 전파

**날짜**: 2026-05-14  
**Sprint**: 394 | **Branch**: sprint/394 | **PR**: #817 (MERGED)  
**Commits**: Red `1e496785` → Green `06c887d2` → Push → PR #817 → MERGED

---

## 1. 구현 요약

### (a) audit-logger.ts getByTraceId UNION 확장
- `audit_logs` (manual seed) + `audit_events` (F642 라이브 버스) UNION ALL
- `CAST(id AS TEXT)` — audit_logs UUID vs audit_events INTEGER AUTOINCREMENT 정규화
- `datetime(created_at / 1000, 'unixepoch')` — unix_ms → ISO8601 정규화
- `source: "manual" | "live"` 필드 추가
- `AuditLogSchema` + `AuditLog` 인터페이스에 `source?` 필드 반영

### (b) 4 endpoint traceId 전파
- `cross-org-enforcer.service.ts:65` — `assignGroup` input.traceId ?? generateTraceId()
- `cross-org-enforcer.service.ts:119` — `checkExportBlocking` input.traceId ?? generateTraceId()
- `ethics-enforcer.service.ts` — `makeCtx(traceId?)` 함수 시그니처 변경 → `checkConfidence(input.callMeta.traceId)` 전달
- `diagnostic-engine.service.ts:124` — `runAll(traceId?)` param → ctx 우선 사용
- `AssignGroupSchema` + `RunDiagnosticSchema`에 `traceId: z.string().optional()` 추가
- `diagnostic/routes/index.ts` — `parsed.data.traceId` passthrough

### (c) Frontend TraceChainView
- `packages/web/src/components/audit/types.ts` — TraceEvent + TraceChainResult 타입
- `packages/web/src/components/audit/TraceChainView.tsx` — SourceBadge (green=live/blue=manual) + EventRow 타임라인
- `packages/web/src/components/audit/index.ts` — re-export
- `packages/web/src/routes/audit-by-trace.tsx` — useSearchParams traceId + fetchApi + 검색 UI
- `packages/web/src/router.tsx` — `{ path: "audit/by-trace", lazy: import("@/routes/audit-by-trace") }` 등록

---

## 2. Phase Exit 체크리스트 (P-a~P-l 12항)

| 항목 | 체크 | 실측 결과 |
|------|------|----------|
| P-a | ✅ | fs 실측: audit-logger.ts:175 UNION, 4 endpoint generateTraceId 위치, audit-trace-chain.test.ts 5 cases — Plan §3.2 100% 일치 |
| P-b | ✅ | audit-trace-chain-bus.test.ts 3 NEW + audit-trace-chain.test.ts 6 regression = **총 9 PASS** (기존 5→6, logEvent 포함) |
| P-c | ✅ | traceid-propagation.test.ts: 4 endpoint × 2 case = **8/8 PASS** |
| P-d | ✅ | `/audit/by-trace` route + TraceChainView.tsx 신설. `pnpm exec tsc --noEmit -p packages/web/tsconfig.json` PASS |
| P-e | ✅ | `pnpm exec tsc --noEmit` api+web 직접 PASS. `pnpm turbo run typecheck --force`: 19/19 PASS, **Cached: 0** |
| P-f | ✅ | `pnpm turbo run lint --force`: 10/10 PASS, **0 errors**. MSA baseline: `5 violations, all 5 in baseline` (0 새 위반) |
| P-g | ✅ | 전체 회귀: **2456/2458 PASS** (264 files). 0 regression. 기존 audit-trace-chain/cq/cross-org/ethics/diagnostic 전부 PASS |
| P-h | ✅ | `AuditLogSchema` 기존 필드 100% 유지 + `source: z.enum(["manual","live"]).optional()` 추가만. Breaking change 없음 |
| P-i | ✅ | `save-dual-review.sh` → `[save-dual-review] ✅ Sprint 394 리뷰 저장 완료 (verdict=BLOCK)`. hook 48 sprint 연속 INSERT |
| P-j | ✅ | 본 sprint는 e2e 인프라 fix 아님 (F648/F649 별도). e2e baseline 영향 없음 |
| P-k | ✅ | MSA cross-domain 0건 추가. harness ↔ cross-org/ethics/diagnostic 직접 import 없음 (route layer traceId 수신만) |
| P-l | ⏳ | PR MERGED, CI/CD 배포 중. production smoke probe는 배포 완료 후 별도 검증 (5/15 시연 전) |

**자체 평가 Match Rate**: 11/12 즉시 PASS, P-l은 배포 후 확인 대기

---

## 3. Gap Analysis

**Design items**: M1~M8 (수정 8개) + N1~N6 (신규 6개) = 14개  
**구현 완료**: 14/14 = **100%**  
**Bonus** (설계 암묵): `harness/schemas/audit.ts` source 필드 + `router.tsx` route 등록

---

## 4. 테스트 실측

```
Test Files  264 passed | 1 skipped (265)
      Tests  2456 passed | 2 skipped (2458)
   Duration  18.31s

신규:
  ✅ audit-trace-chain-bus.test.ts: 3/3 (UNION chain + source meta)
  ✅ traceid-propagation.test.ts: 8/8 (4 endpoint × prefer/fallback)
  ✅ audit-trace-chain.test.ts: 6/6 (기존 회귀 + logEvent)
```

---

## 5. Typecheck 실측 (S337 turbo cache 우회)

```
pnpm turbo run typecheck --force
  Tasks: 19 successful, 19 total
  Cached: 0 cached, 19 total   ← 캐시 0건 (실 typecheck 증거)
  Time: 29.435s
```

---

## 6. Codex Cross-Review

- **verdict**: BLOCK  
- **degraded**: false  
- **code_issues**: `[]`  
- **divergence_score**: `0.0`  
- **판정**: 🔶 **false positive** — `PRD_PATH` default가 `docs/specs/fx-codex-integration/prd-final.md` (F660 무관 PRD). missing REQs (FX-REQ-587~590)은 codex integration PRD의 자체 요구사항. 실제 코드 품질 이슈 0건.
- **dual_ai_reviews**: ✅ INSERT 완료 (48 sprint streak 유지)

---

## 7. Out-of-scope 준수

| 금지 항목 | 상태 |
|----------|------|
| D1 schema 변경 | ✅ 0건 |
| F642 audit-bus 수정 | ✅ 0건 |
| HITL/KPI 영향 | ✅ 0건 |
| metadata 디코딩 | ✅ 0건 |
| 외부 시스템 통합 | ✅ 0건 |

---

## 8. PR 정보

- **PR**: #817 https://github.com/KTDS-AXBD/Foundry-X/pull/817
- **State**: MERGED
- **Red commit**: `1e496785` (test(harness): F660 red)
- **Green commit**: `06c887d2` (feat: F660 green)

---

## 9. 다음 사이클

- P-l production smoke 검증 (5/15 시연 전 `wrangler tail` 30s + multi-input probe)
- F661 api_p99 schema+agent별 threshold 후속
- BeSir 5/15 미팅 — §5.2 자동 항목 최종 점검
