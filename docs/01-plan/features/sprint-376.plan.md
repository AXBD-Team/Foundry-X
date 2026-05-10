# Sprint 376 Plan — F641 services/ 잔존 4 files MSA 도메인 분산 closure

## Overview

| 항목 | 내용 |
|------|------|
| **Sprint** | 376 |
| **F-item** | F641 |
| **REQ** | FX-REQ-706 |
| **우선순위** | P3 |
| **예상 시간** | ~30~45분 |
| **패턴** | F627 llm/service-proxy → core/infra/ 패턴 재현 (4파일) |

## 목표

services/ 루트 잔존 4 files를 각 도메인으로 분산하여 Phase 47 MSA closure 완결.
S344(F627) 완결 후 남은 마지막 4 files를 정리한다.

## 도메인 배치 (사전 측정 기반)

| 파일 | 사용처 | 대상 도메인 | 근거 |
|------|--------|------------|------|
| `services/conflict-detector.ts` | `core/spec/routes/spec.ts` (2 imports) | `core/spec/services/` | 단일 도메인 명확 |
| `services/merge-queue.ts` | `core/agent/services/agent-orchestrator.ts` (type-only) | `core/agent/services/` | 단일 도메인 명확 |
| `services/pii-masker.ts` | `middleware/pii-masker.middleware.ts` | `core/infra/` | cross-cutting infra (F627 service-proxy/llm 패턴 재현) |
| `services/pr-pipeline.ts` | `__tests__/pr-pipeline.test.ts` only | `core/agent/services/` | PR 관리 도메인 추정, dead code 가능성 autopilot 평가 |

## 구현 범위

### 핵심 변경
- (a) `git mv` 4건 — 각 파일을 도메인 폴더로 이동
- (b) import path 갱신 9건 — 5 source caller + 4 test caller
- (c) dist orphan 정리 — `tsc`가 자동 제거 안 하는 dist 산출물 수동 확인

### 선택적 변경
- test files git mv (`__tests__/` flat 유지 vs `core/{domain}/__tests__/` 이전) — autopilot fs 판단

## DoD (완료 기준)

| # | 항목 |
|---|------|
| P-a | `services/` 루트 4 → 0 files |
| P-b | 4 files 신규 위치 존재 |
| P-c | 5 caller OLD path import 0건 |
| P-d | typecheck + lint + test 회귀 0 |
| P-e | MSA cross-domain-import baseline 회귀 0 |
| P-f | dist orphan 0건 |
| P-g | Match ≥ 90% |

## 위험

1. **pr-pipeline 실 routing 0건** — dead code 가능성, autopilot 평가 후 git mv 또는 git rm 결정
2. **pii-masker middleware 경로** — middleware/에서 상위 core/infra/ 참조 (상대경로 `../core/infra/pii-masker.js`)
