---
code: FX-DSGN-408
title: F674 ax-harness-kit improvements I-4 + I-5 (Sprint 408)
status: Approved
created: 2026-05-19
author: Sinclair Seo
plan_ref: FX-PLAN-408
---

# Sprint 408 Design — F674 ax-harness-kit I-4 + I-5

## §1 목표

ax-harness-kit에 I-4 `.nvmrc` 3-way consistency 게이트 + I-5 drift check 실행 검증을 추가하고,
Foundry-X 자체 deploy.yml node-version drift를 same-sprint에서 fix (self-dogfood).

## §2 변경 파일 매핑

### 신규 생성

| 파일 | 목적 |
|------|------|
| `packages/harness-kit/src/scaffold/templates/monorepo/scripts/setup/verify-node-consistency.sh.hbs` | I-4: .nvmrc 3-way 일치 검증 스크립트 템플릿 |
| `packages/harness-kit/src/scaffold/templates/monorepo/.github/workflows/node-consistency.yml.hbs` | I-4: Node 버전 CI 게이트 워크플로 템플릿 |
| `packages/harness-kit/__tests__/scaffold/monorepo.test.ts` ← T33~T36 추가 | I-4/I-5 테스트 4건 |
| `reports/sprint-408-dogfood-4th-run.md` | 4th Dogfood 결과 리포트 |
| `reports/velocity/sprint-408.json` | velocity 갱신 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `.github/workflows/deploy.yml` | node-version: 20 → 22 (4곳 self-dogfood) |
| `package.json` | engines.node: ">=22" 추가 (self-dogfood) |

## §3 verify-node-consistency.sh.hbs 설계

**위치**: `templates/monorepo/scripts/setup/verify-node-consistency.sh.hbs`
**Handlebars 사용**: 없음 (jq 미사용, grep 기반)

로직:
1. `.nvmrc` 읽기 → major version 추출
2. `package.json`의 `engines.node` → major version 추출 (grep 기반, jq 의존 없음)
3. `.github/workflows/*.yml`의 `node-version:` 값 → major version 목록 추출
4. 3-way 비교: 불일치 시 `❌` + exit 1, 일치 시 `✅` + exit 0
5. 누락 항목은 `⚠️` 경고 + exit 1

Exit code: 0 = OK, 1 = drift detected

## §4 node-consistency.yml.hbs 설계

**위치**: `templates/monorepo/.github/workflows/node-consistency.yml.hbs`

- `on.push.paths` / `on.pull_request.paths` — `.nvmrc`, `package.json`, `.github/workflows/*.yml` 변경 시만 트리거
- jobs.verify: ubuntu-latest, checkout@v4 + `bash scripts/setup/verify-node-consistency.sh`

## §5 T33~T36 테스트 계약 (TDD Red Target)

| ID | 검증 대상 | 판정 기준 |
|----|----------|----------|
| T33(F674) | verify-node-consistency.sh 생성 + executable | `fs.existsSync` + `(mode & 0o111) !== 0` |
| T34(F674) | node-consistency.yml 생성 + paths trigger 포함 | `existsSync` + `includes('.nvmrc')` |
| T35(F674) | verify-node-consistency.sh 실행 — 정합 시 exit 0 | `spawnSync("bash", [...])` → status=0 |
| T36(F674) | check-harness-drift.sh 실행 — 동일 rules → drift 0 | `spawnSync` → status=0 |

## §6 Foundry-X Self-Dogfood 변경

- `.github/workflows/deploy.yml`: `node-version: 20` → `22` (lines 69, 91, 136, 181)
- `package.json`: root에 `"engines": { "node": ">=22" }` 추가

## §7 Stage 3 Exit 체크리스트

- D1: 신규 파일 2종 모두 Design §2 파일 매핑에 명시 ✅
- D2: verify script의 3-way 비교 계약(grep 기반) 명시 ✅
- D3: deploy.yml 변경 — production CI 영향 영역, 1줄씩 4곳 ✅
- D4: TDD Red phase — T33~T36 목록 명시 ✅
