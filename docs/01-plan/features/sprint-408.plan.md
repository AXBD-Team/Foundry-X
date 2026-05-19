---
code: FX-PLAN-408
title: F674 ax-harness-kit improvements I-4 + I-5 (Sprint 408)
status: Planned
created: 2026-05-19
author: Sinclair Seo
---

# Sprint 408 — F674 ax-harness-kit improvements (I-4 .nvmrc CI gate + I-5 drift check 실행 검증)

## §1 목적

S365 F671 gate-x Dogfood 권고 improvement 2건 (I-4 `.nvmrc` 정합성 CI 게이트 + I-5 harness drift check 실행 검증)을 ax-harness-kit에 통합 + **Foundry-X 자체 self-dogfood로 즉시 가치 입증** — 본 sprint에서 Foundry-X `deploy.yml node-version: 20` stale drift를 같은 sprint에서 fix.

## §2 배경 + 결정적 발견 (Self-Dogfood Value)

S367 (F673 완결) 후 F674 사전 측정 단계에서 **Foundry-X 자체 .nvmrc 3-way drift 발견**:

| 위치 | 값 | 정합성 |
|------|-----|--------|
| `.nvmrc` | `22` | ✅ baseline |
| `package.json engines.node` | (없음) | ⚠️ 누락 |
| `.github/workflows/deploy.yml setup-node@v4 node-version` | `20` | ❌ **drift** |

S363 (2026-05-18)에 Node 22로 정합화했지만 `deploy.yml`의 `node-version: 20`이 stale로 남아있음. **I-4의 가치를 즉시 입증**하는 PoC — 본 sprint에서 같은 CI 게이트로 즉시 잡힘.

I-5 `check-harness-drift.sh.hbs`는 이미 S367 (F671 Dogfood claude-hooks 옵트인)에 포함됨 — **실 실행 검증 필요** (test에서 호출 + integration test로 sample drift detection).

## §3 사전 측정 (fs 실측, S283 패턴 33회차)

| 항목 | 값 |
|------|-----|
| 다음 F번호 | F674 |
| 다음 FX-REQ | FX-REQ-736 |
| 다음 Sprint | 408 |
| Foundry-X `.nvmrc` | 22 |
| Foundry-X `package.json engines.node` | 없음 (누락) |
| Foundry-X `deploy.yml node-version` | **20** (drift) |
| harness-kit baseline tests | 98 (S367 후) |
| `check-harness-drift.sh.hbs` | ✅ 이미 존재 (opt-in/claude-hooks/scripts/setup/) |
| 신규 추가 파일 | `scripts/setup/verify-node-consistency.sh.hbs` + `.github/workflows/node-consistency.yml.hbs` |

## §4 범위

### (a) I-4: .nvmrc 3-way consistency 검증 스크립트

**신규 파일**: `packages/harness-kit/src/scaffold/templates/monorepo/scripts/setup/verify-node-consistency.sh.hbs`

```bash
#!/bin/bash
# Node version 3-way consistency check
# 검증: .nvmrc == package.json engines.node == .github/workflows/*.yml setup-node@v4 node-version
# Exit 0: consistent / Exit 1: drift detected

set -e
NVMRC=$(cat .nvmrc 2>/dev/null | tr -d '\n')
ENGINES=$(jq -r '.engines.node // ""' package.json 2>/dev/null | grep -oE '[0-9]+' | head -1)
WORKFLOW_NODE=$(grep -hE 'node-version:\s*[0-9]+' .github/workflows/*.yml 2>/dev/null | grep -oE '[0-9]+' | sort -u | head -3 | tr '\n' ',')

# 비교 로직 (Node major version 단위)
EXIT=0
[ -z "$NVMRC" ] && { echo "⚠️ .nvmrc 누락"; EXIT=1; }
[ -z "$ENGINES" ] && { echo "⚠️ package.json engines.node 누락"; EXIT=1; }
[ -z "$WORKFLOW_NODE" ] && { echo "⚠️ .github/workflows/*.yml node-version 누락"; EXIT=1; }

if [ -n "$NVMRC" ] && [ -n "$ENGINES" ] && [ "$NVMRC" != "$ENGINES" ]; then
  echo "❌ .nvmrc=$NVMRC != engines.node=$ENGINES"
  EXIT=1
fi

if [ -n "$NVMRC" ] && [ -n "$WORKFLOW_NODE" ] && ! echo "$WORKFLOW_NODE" | grep -q "$NVMRC"; then
  echo "❌ .nvmrc=$NVMRC != workflow node-version=$WORKFLOW_NODE"
  EXIT=1
fi

[ "$EXIT" = "0" ] && echo "✅ Node version 3-way 정합성 OK (v$NVMRC)"
exit $EXIT
```

### (b) I-4: GitHub Actions CI 워크플로 게이트

**신규 파일**: `packages/harness-kit/src/scaffold/templates/monorepo/.github/workflows/node-consistency.yml.hbs`

```yaml
name: Node Version Consistency
on:
  push:
    paths:
      - '.nvmrc'
      - 'package.json'
      - '.github/workflows/*.yml'
  pull_request:
    paths:
      - '.nvmrc'
      - 'package.json'
      - '.github/workflows/*.yml'

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/setup/verify-node-consistency.sh
```

### (c) I-4 generator 통합 — 기본 활성

`packages/harness-kit/src/scaffold/generator.ts`:
- `verify-node-consistency.sh.hbs`와 `node-consistency.yml.hbs`를 기본 scaffold에 포함 (opt-in 아님)
- root `package.json.hbs`에 `engines.node: ">=22"` 명시 확인 (이미 있음, 검증만)

### (d) I-5: drift check 실행 검증 (integration test)

**신규 test 파일**: `packages/harness-kit/__tests__/scaffold/drift-check.test.ts`

```typescript
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execFileNoThrow } from "../../src/utils/execFileNoThrow";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("check-harness-drift.sh integration", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "drift-test-"));
    // scaffold gate-x with --with-claude-hooks
    // run check-harness-drift.sh against Foundry-X .claude/rules (no drift expected)
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("T33: check-harness-drift.sh exits 0 when rules match reference", async () => {
    // ...
  });

  it("T34: check-harness-drift.sh detects intentional drift (modified rule)", async () => {
    // intentionally modify .claude/rules/coding-style.md → expect exit ≥ 1
  });

  it("T35: check-harness-drift.sh handles missing reference dir gracefully", async () => {
    // pass non-existent path → expect error message + exit 1
  });
});
```

### (e) Foundry-X 자체 drift fix (Self-Dogfood 즉시 적용)

본 sprint 같은 PR에 Foundry-X `deploy.yml` `node-version: 20` → `22` 변경 + `package.json` `engines.node: ">=22"` 추가 = 3-way 정합 회복.

> ⚠️ deploy.yml은 production 영향 가능 — autopilot은 1줄 변경 정확히 적용 + smoke test 회귀 검증.

### (f) 회귀 test (vitest, harness-kit)

신규 test T33~T36 (4건):
- T33: `verify-node-consistency.sh` 생성 + executable + 3-way 일치 시 exit 0
- T34: `verify-node-consistency.sh` drift 감지 (mock package.json engines.node 변경) → exit 1
- T35: `node-consistency.yml` workflow 파일 생성 + paths trigger 정확
- T36: `check-harness-drift.sh` integration (gate-x scaffold + Foundry-X reference, drift 0 PASS)

기존 98 + 4 신규 = **102 tests**.

### (g) Dogfood 재검증 (gate-x scaffold 4th run)

```bash
rm -rf /tmp/gate-x-dogfood-408
node packages/harness-kit/dist/cli/index.js init-monorepo gate-x KTDS-AXBD gate-x \
  "Gate-X validation service" \
  --output /tmp/gate-x-dogfood-408 \
  --with-bashrc-patch --with-tmux-patch --with-scripts --with-claude-hooks \
  --d1-database-id "00000000-0000-0000-0000-000000000000" \
  --with-git-init \
  --cf-account b6c06059b413892a92f150e5ca496236

cd /tmp/gate-x-dogfood-408
# I-4 검증
bash scripts/setup/verify-node-consistency.sh  # exit 0 기대
# I-5 검증
bash scripts/setup/check-harness-drift.sh ~/work/axbd/Foundry-X/.claude/rules  # drift 0 기대 (자연 치환 외)
ls .github/workflows/node-consistency.yml  # 존재 확인
```

### (h) reports 생성

`reports/sprint-408-dogfood-4th-run.md`:
- 4th Dogfood 결과 + I-4 verify-node-consistency.sh + I-5 check-harness-drift.sh 실 실행 출력
- Foundry-X 자체 drift fix 결과 (deploy.yml 20→22 + engines.node 추가)
- 남은 improvement: 없음 (모든 권고 fix 완결)

## §5 Phase Exit — Smoke Reality (P-a~P-j 10항)

| # | 항목 | PASS 기준 |
|---|------|----------|
| P-a | I-4 `verify-node-consistency.sh.hbs` 신규 생성 + executable bit | `ls -l templates/.../verify-node-consistency.sh.hbs` |
| P-b | I-4 `node-consistency.yml.hbs` workflow 생성 + paths trigger | grep paths |
| P-c | I-4 Foundry-X 자체 3-way 정합 회복 (deploy.yml node-version: 22 + engines.node 추가) | `bash scripts/setup/verify-node-consistency.sh || true` exit 0 |
| P-d | I-5 `check-harness-drift.sh` 실 실행 PASS (gate-x scaffold 4th-run + Foundry-X reference) | manual run + exit 0 |
| P-e | I-5 integration test T33~T35 신규 (3건) | grep new test ids |
| P-f | harness-kit vitest 102/102 PASS (98 + 4 신규 T33~T36) | `pnpm -F @foundry-x/harness-kit test` |
| P-g | gate-x 4th-run verify-node-consistency.sh + node-consistency.yml 존재 | `ls /tmp/gate-x-dogfood-408/{scripts/setup/verify-node-consistency.sh,.github/workflows/node-consistency.yml}` |
| P-h | scaffold file count 59→61+ (verify-node + workflow +2) | autopilot 판단 |
| P-i | reports/sprint-408-dogfood-4th-run.md 신규 생성 | `ls reports/sprint-408-*.md` ≥ 1 |
| P-j | dual_ai_reviews D1 INSERT sprint 408 ≥ 1건 (hook 52 sprint streak 기대) | manual check |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| `jq` 미설치 환경에서 `verify-node-consistency.sh` fail | jq 사용 회피 (grep 기반 fallback) 또는 setup-node action이 jq 보장 |
| Foundry-X deploy.yml 변경이 production deploy fail 유발 | autopilot은 1줄 변경만 (node-version 20→22) + smoke test 회귀 확증 (S337 cache 우회) |
| check-harness-drift.sh integration test가 외부 fs (~/work/axbd/Foundry-X) 의존 | mock fs 또는 tmp dir에 reference rule 복사 후 검증 |
| `node-consistency.yml`이 existing CI 워크플로와 충돌 | paths filter 명확 (`.nvmrc`, `package.json`, `.github/workflows/*.yml`만) |

## §7 Out-of-scope

- ❌ pnpm version consistency (별 F-item)
- ❌ TypeScript version consistency
- ❌ ax-harness-kit npm publish (별 트랙)
- ❌ MEMORY.md 압축 / velocity rules 명문화 (별 트랙)

## §8 S360 hallucination 회피 강제 (학습 8회차)

- ✅ reports/sprint-408-dogfood-4th-run.md **신규 실파일 생성 의무화**
- ✅ velocity sprint-408.json **f_items=F674 정확** (velocity stale 답습 패턴 9회차 차단 시도)
- ✅ design + report 둘 다 자동 생성
- ✅ Phase Exit P-i "reports/sprint-408-*.md ≥ 1 신규" 강제 검증

## §9 예상 시간

~30~50분 autopilot (2 improvements + 4 신규 test + Foundry-X self-fix + Dogfood 4th run).

## §10 관련 문서

- S365 F671 findings: `reports/sprint-405-harness-dogfood-findings.md` (개선 후보 §I-4/I-5)
- S367 F673 fix: `reports/sprint-407-dogfood-3rd-run.md`
- ax-harness-kit PRD-final: `docs/specs/ax-harness-kit/prd-final.md`
- 기존 `check-harness-drift.sh.hbs`: `packages/harness-kit/src/scaffold/templates/opt-in/claude-hooks/scripts/setup/`
