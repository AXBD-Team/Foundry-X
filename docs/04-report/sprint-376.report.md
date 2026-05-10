# Sprint 376 Report — F641 services/ 잔존 4 files MSA 도메인 분산 closure

## 요약

| 항목 | 내용 |
|------|------|
| **Sprint** | 376 |
| **F-item** | F641 (FX-REQ-706, P3) |
| **Match Rate** | **100%** |
| **테스트** | 2399/2401 PASS (2 skipped, 회귀 0) |
| **typecheck** | ✅ 19/19 PASS (cache 0건, turbo --force) |
| **lint** | ✅ MSA baseline 0 violations |
| **패턴** | F627 llm/service-proxy → core/infra/ 패턴 재현 (4파일) |

## 변경 내역

### git mv (4건)

| 원본 | 대상 | 도메인 근거 |
|------|------|------------|
| `services/conflict-detector.ts` | `core/spec/services/` | spec.ts 단일 caller |
| `services/merge-queue.ts` | `core/agent/services/` | agent-orchestrator.ts type-only import |
| `services/pii-masker.ts` | `core/infra/` | cross-cutting concern (F627 패턴) |
| `services/pr-pipeline.ts` | `core/agent/services/` | PR 관리 도메인 |

### Import path 갱신 (13건)

| 파일 | 변경 |
|------|------|
| `core/spec/routes/spec.ts` | `../../../services/` → `../services/` (2 lines) |
| `core/agent/services/agent-orchestrator.ts` | `../../../services/merge-queue.js` → `./merge-queue.js` |
| `middleware/pii-masker.middleware.ts` | `../services/pii-masker.js` → `../core/infra/pii-masker.js` |
| `__tests__/conflict-resolution-integration.test.ts` | → `../core/spec/services/conflict-detector.js` (2 lines) |
| `__tests__/merge-queue.test.ts` | → `../core/agent/services/merge-queue.js` |
| `__tests__/services/auto-rebase.test.ts` | → `../../core/agent/services/merge-queue.js` |
| `__tests__/services/conflict-detector.test.ts` | → `../../core/spec/services/conflict-detector.js` (2 lines) |
| `__tests__/pii-masker.test.ts` | → `../core/infra/pii-masker.js` |
| `__tests__/pr-pipeline.test.ts` | → `../core/agent/services/pr-pipeline.js` |

### 추가 수정

| 파일 | 사유 |
|------|------|
| `core/harness/types.ts` | `AutoRebaseService` contract re-export 추가 (MSA 경계 준수) |
| `core/agent/services/merge-queue.ts` | 내부 imports 깊이 보정 (services/ → core/agent/services/ 3 depth) + harness/types.js contract 참조 |
| `core/agent/services/pr-pipeline.ts` | 내부 imports 깊이 보정 + `_commit` unused var 처리 |
| `core/spec/services/conflict-detector.ts` | 내부 imports: `infra/llm.js` → `infra/types.js` (cross-domain contract 준수) |

## DoD 검증 결과

| # | 항목 | 결과 |
|---|------|------|
| P-a | services/ 루트 4 → 0 files | ✅ `ls services/*.ts` = 0건 |
| P-b | 4 files 신규 위치 존재 | ✅ `core/{spec,agent,infra}/services/` 4건 확인 |
| P-c | OLD path import 0건 | ✅ grep 0건 |
| P-d | typecheck + lint + test PASS | ✅ tsc/eslint/vitest 모두 PASS |
| P-e | MSA baseline 회귀 0 | ✅ `lint-baseline-check.sh` 0 violations |
| P-f | dist orphan 0건 | ✅ `dist/services/` 없음 |
| P-g | Match ≥ 90% | ✅ **100%** |

## 학습

- **Move 후 내부 imports 갱신 필수**: 이동된 파일 자체의 상대경로가 새 위치 기준으로 바뀜 (3 depth 증가 — services/ vs core/domain/services/)
- **MSA cross-domain 경계 신규 노출**: `services/` 루트 파일은 도메인 스코프 밖이라 cross-domain lint 비탐지. `core/` 이동 후 즉시 탐지됨 (merge-queue의 harness 내부 import + conflict-detector의 infra/llm.js)
- **Contract 파일 확장**: `AutoRebaseService`를 `harness/types.ts`에 추가 — F641 closure의 부산물로 MSA 경계 강화
- **41 sprint 연속 성공** (S306~S346): F560 이후 모든 sprint Match ≥ 90% 유지

## 다음 사이클 후보

- routes/proxy.ts 별 closure (서비스 이동 후 route 정리)
- GAP-3 27 stale proposals 정리
- AI Foundry W19 BeSir 5/15 D-5 (Conditional 게이트 카운트다운)
- F600+ AI Foundry P0/P2 PRD 초안
