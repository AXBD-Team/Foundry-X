# Sprint 376 Design — F641 services/ 잔존 4 files MSA 도메인 분산 closure

## §1 목적

services/ 루트 직속 잔존 4 파일을 각 MSA 도메인으로 이전하여 Phase 47 closure 완결.
- F627 패턴 재현: git mv + import path 갱신 + dist orphan 정리

## §2 아키텍처 결정

| 결정 | 내용 |
|------|------|
| pii-masker 도메인 | `core/infra/` — cross-cutting concern (service-proxy/llm 패턴 동일) |
| pr-pipeline 도메인 | `core/agent/services/` — PR 관리 도메인 추정, dead code면 git rm |
| test file 위치 | `__tests__/` flat 유지 (패턴 일관성, 이전 불필요) |
| types.ts re-export | 불필요 — 기존 callers가 직접 import하므로 contract 파일 생성 생략 |

## §3 영향도

### conflict-detector.ts

**현재 위치**: `packages/api/src/services/conflict-detector.ts`
**이동 위치**: `packages/api/src/core/spec/services/conflict-detector.ts`

**import 갱신**:
| 파일 | 현재 | 변경 후 |
|------|------|---------|
| `core/spec/routes/spec.ts:12` | `../../../services/conflict-detector.js` | `../services/conflict-detector.js` |
| `core/spec/routes/spec.ts:20` | `../../../services/conflict-detector.js` | `../services/conflict-detector.js` |
| `__tests__/services/conflict-detector.test.ts:2,3` | `../../services/conflict-detector.js` | `../../core/spec/services/conflict-detector.js` |
| `__tests__/conflict-resolution-integration.test.ts:2,3` | `../services/conflict-detector.js` | `../core/spec/services/conflict-detector.js` |

### merge-queue.ts

**현재 위치**: `packages/api/src/services/merge-queue.ts`
**이동 위치**: `packages/api/src/core/agent/services/merge-queue.ts`

**import 갱신**:
| 파일 | 현재 | 변경 후 |
|------|------|---------|
| `core/agent/services/agent-orchestrator.ts:9` | `../../../services/merge-queue.js` | `./merge-queue.js` |
| `__tests__/merge-queue.test.ts:2` | `../services/merge-queue.js` | `../core/agent/services/merge-queue.js` |
| `__tests__/services/auto-rebase.test.ts:4` | `../../services/merge-queue.js` | `../../core/agent/services/merge-queue.js` |

### pii-masker.ts

**현재 위치**: `packages/api/src/services/pii-masker.ts`
**이동 위치**: `packages/api/src/core/infra/pii-masker.ts`

**import 갱신**:
| 파일 | 현재 | 변경 후 |
|------|------|---------|
| `middleware/pii-masker.middleware.ts:7` | `../services/pii-masker.js` | `../core/infra/pii-masker.js` |
| `__tests__/pii-masker.test.ts:2` | `../services/pii-masker.js` | `../core/infra/pii-masker.js` |

### pr-pipeline.ts

**현재 위치**: `packages/api/src/services/pr-pipeline.ts`
**이동 위치**: `packages/api/src/core/agent/services/pr-pipeline.ts` (routing 0건이므로 dead code 가능성 평가)

**import 갱신**:
| 파일 | 현재 | 변경 후 |
|------|------|---------|
| `__tests__/pr-pipeline.test.ts:2` | `../services/pr-pipeline.js` | `../core/agent/services/pr-pipeline.js` |

## §4 테스트 전략

- TDD 면제 (meta/infra 이동, 기존 테스트 파일 path 갱신만)
- typecheck + lint + test `--force` cache 우회 실행 (S337 Turbo Cache 함정 회피)

## §5 파일 매핑

### 변경 파일 목록

| 번호 | 파일 | 변경 유형 |
|------|------|----------|
| 1 | `packages/api/src/services/conflict-detector.ts` | git mv → core/spec/services/ |
| 2 | `packages/api/src/services/merge-queue.ts` | git mv → core/agent/services/ |
| 3 | `packages/api/src/services/pii-masker.ts` | git mv → core/infra/ |
| 4 | `packages/api/src/services/pr-pipeline.ts` | git mv → core/agent/services/ |
| 5 | `packages/api/src/core/spec/routes/spec.ts` | import path 갱신 (2 lines) |
| 6 | `packages/api/src/core/agent/services/agent-orchestrator.ts` | import path 갱신 (1 line) |
| 7 | `packages/api/src/middleware/pii-masker.middleware.ts` | import path 갱신 (1 line) |
| 8 | `packages/api/src/__tests__/services/conflict-detector.test.ts` | import path 갱신 (2 lines) |
| 9 | `packages/api/src/__tests__/conflict-resolution-integration.test.ts` | import path 갱신 (2 lines) |
| 10 | `packages/api/src/__tests__/merge-queue.test.ts` | import path 갱신 (1 line) |
| 11 | `packages/api/src/__tests__/services/auto-rebase.test.ts` | import path 갱신 (1 line) |
| 12 | `packages/api/src/__tests__/pii-masker.test.ts` | import path 갱신 (1 line) |
| 13 | `packages/api/src/__tests__/pr-pipeline.test.ts` | import path 갱신 (1 line) |
| + | dist orphan 정리 (선택) | 수동 rm |

**예상 변경 파일**: 12~13개

## §6 DoD

P-a services/ 루트 0 files · P-b 4 신규 위치 존재 · P-c OLD import 0건 · P-d typecheck+lint+test PASS · P-e MSA baseline 회귀 0 · P-f dist orphan 0 · P-g Match ≥ 90%
