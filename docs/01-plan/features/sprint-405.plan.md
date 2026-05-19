---
code: FX-PLAN-405
title: F671 ax-harness-kit gate-x Dogfood (Sprint 405)
status: Planned
created: 2026-05-19
author: Sinclair Seo
---

# Sprint 405 — F671 ax-harness-kit gate-x Dogfood

## §1 목적

S364에서 5 sprint 연속(F666~F670)으로 완결한 **ax-harness-kit Phase 1~3** (PRD-final 5 F-item 100%)을 **실 BD MSA 서비스 scaffold**로 검증한다. `harness init-monorepo gate-x` 1회 실행 → 결과 산출물 100% 검증 + 결함/개선점 수집 → 차기 F-item 후보(F672+) 권고.

## §2 배경

- S364 (2026-05-19) 단일 세션 5 sprint 연속 완결: F666(init-harness + 골격) / F667(Cloudflare 배포) / F668(rules 변수화) / F669(bashrc/tmux/scripts opt-in) / F670(.claude/settings.json hooks opt-in)
- **모든 sprint Match 100%** + 자체 vitest PASS, 그러나 **외부 프로젝트 실 적용 Dogfood 0회** — Phase 검증 누락(rules/development-workflow.md "Autopilot Production Smoke Test" 15회+ 변종 학습 동일)
- 사전 측정 (S365, 2026-05-19): `init-monorepo` CLI 옵션 = 4종 (`--cf-account`, `--worker-subdomain`, `-o/--output`, `--with-bashrc-patch`, `--with-tmux-patch`, `--with-scripts`) — **`--with-claude-hooks` CLI 플래그 부재** (generator `withClaudeHooks` 옵션은 존재) → **F670 wiring 누락 발견** (즉시 fix 또는 follow-up F-item)

## §3 사전 측정 (fs 실측, S283 패턴 30회차)

| 항목 | 값 |
|------|-----|
| 다음 F번호 | F671 |
| 다음 FX-REQ | FX-REQ-733 |
| 다음 Sprint | 405 |
| 다음 D1 migration | 0158 (사용 안 함 — Dogfood scope 외) |
| harness-kit dist 빌드 | ✅ `packages/harness-kit/dist/cli/index.js` (May 18 09:10) |
| init-monorepo CLI 플래그 | 4종 (--with-claude-hooks 누락) |
| generateMonorepoScaffold 옵션 | 7종 (withClaudeHooks 포함) |
| Output target | `/tmp/gate-x-dogfood-405` (scratch, 검증 후 폐기) |
| CF 검증 범위 | dry-run만 (`npx wrangler deploy --dry-run`) |

## §4 범위

### (a) harness-kit 빌드 + 사전 검증

```bash
cd packages/harness-kit
pnpm build  # tsc + copy templates
pnpm test   # 84 tests PASS 기대 (S364 baseline)
```

### (b) gate-x scaffold 생성

```bash
node packages/harness-kit/dist/cli/index.js init-monorepo \
  gate-x \
  KTDS-AXBD \
  gate-x \
  "Gate-X validation service (Dogfood)" \
  --output /tmp/gate-x-dogfood-405 \
  --with-bashrc-patch \
  --with-tmux-patch \
  --with-scripts
```

> ⚠️ `--with-claude-hooks` 미구현 발견 시: (1) wiring fix를 본 sprint 내 즉시 패치 (1 line 추가 + 1 옵션 등록) **또는** (2) F672 follow-up 등록 — autopilot 판단

### (c) Phase 1 (Tier 1) 검증

- 출력 파일 카운트 ≥ 25개 (4-package 골격 + .claude/ + .github/workflows)
- 핵심 파일: `package.json` / `pnpm-workspace.yaml` / `turbo.json` / `tsconfig.base.json` / `wrangler.toml` / `.claude/rules/{coding-style,sdd-triangle,git-workflow,tdd-workflow,testing,security,serverkit-cq}.md` (7) / `packages/{api,web,cli,shared}/package.json` (4)
- `pnpm install` 성공 + warning 분류

### (d) Phase 2 Tier 2-A 검증 (rules 변수화)

- 7개 .claude/rules 파일 내 `{{projectName}}` → `gate-x` 치환 확인
- `Foundry-X` 잔존 grep = 0건 (단 process-lifecycle / task-promotion plain copy는 예외)
- security.md: `{{workerSubdomain}}-api.{account}.workers.dev` + `{{projectName}}.pages.dev` 치환

### (e) Phase 2 Tier 2-B 검증 (옵트인 3 플래그)

- `scripts/patch-bashrc.sh` 존재 + 13 함수 patch logic 포함
- `scripts/patch-tmux.sh` 존재 + tpm + tmux-resurrect + tmux-continuum 설치 logic
- `scripts/task/` 디렉토리 + `task-daemon.sh` + `sprint-merge-monitor.sh` + `git-orphan-{scan,clean}.sh` 4종 복사

### (f) Phase 3 검증 (.claude/settings.json hooks)

> ⚠️ CLI 플래그 누락 발견 시 위 (b)에서 처리. 만약 generator만 직접 호출하여 우회한다면 별도 검증.

- `.claude/settings.json` 존재 시 PreToolUse + PostToolUse + SessionStart + UserPromptSubmit 4 hook 등록 확인
- hook 경로가 `gate-x` 기준으로 치환되었는지 (Foundry-X 흔적 0)

### (g) 빌드 + 검증 시퀀스

```bash
cd /tmp/gate-x-dogfood-405
pnpm install
pnpm typecheck      # 19/19 PASS 기대
pnpm lint           # 0 errors
pnpm test           # 0 fails
pnpm build          # turbo build 성공
npx wrangler deploy --dry-run  # CF 배포 정합성 (account_id 필요 시 dummy)
```

### (h) Foundry-X drift monitor 실 실행

```bash
diff -r /home/sinclair/work/axbd/Foundry-X/.claude/rules /tmp/gate-x-dogfood-405/.claude/rules | head -50
```

- 변수화로 인한 자연스러운 diff (projectName, workerSubdomain) 외 **본질적 drift**(missing rule, content drift) 0건 검증
- 결과를 `reports/sprint-405-drift-baseline.md`에 첨부

### (i) 결함/개선점 수집

`reports/sprint-405-harness-dogfood-findings.md` (필수 산출물):
- Phase 1~3 각각 PASS/PARTIAL/FAIL 판정
- 발견된 wiring 결함 (예: `--with-claude-hooks` CLI 누락)
- 개선 후보 (자동 secret 등록 / D1 binding 자동화 / 기본 Worker route 자동 생성 등)
- 차기 F-item 권고 (F672~ 후보 명시)

### (j) follow-up F-item 등록 (필요 시)

- Master direct commit (docs-only)로 SPEC §5에 F672+ 가칭 row 추가 (📋(idea) 상태)
- 본 sprint scope 내 fix 가능한 1~2 line 결함은 즉시 처리하고 report에 명시

## §5 Phase Exit — Smoke Reality (P-a~P-l 12항)

| # | 항목 | PASS 기준 |
|---|------|----------|
| P-a | harness-kit build + test PASS | `pnpm build && pnpm test` exit 0 |
| P-b | init-monorepo 명령 정상 종료 | exit 0 + "Created N files" 출력 |
| P-c | 출력 파일 ≥ 25개 | `find /tmp/gate-x-dogfood-405 -type f -not -path "*/node_modules/*" \| wc -l` ≥ 25 |
| P-d | 변수 치환 100% | `grep -rn "{{[^}]*}}" /tmp/gate-x-dogfood-405 --exclude-dir=node_modules` = 0 (남은 placeholder 0) |
| P-e | Foundry-X 잔존 grep 0건 | `.claude/rules/*.md` (process-lifecycle/task-promotion 제외) + src/ 코드 부분 |
| P-f | `pnpm install` 성공 | exit 0, peer dep warning 분류 reports 첨부 |
| P-g | `pnpm typecheck` PASS | exit 0 (turbo cache 우회 `--force`) |
| P-h | `pnpm lint` 0 errors | exit 0 |
| P-i | `pnpm test` 0 fails | exit 0 |
| P-j | `pnpm build` 성공 | exit 0, dist/ 산출물 존재 |
| P-k | `wrangler deploy --dry-run` PASS | "Total Upload" + bundle size 출력 |
| P-l | reports/sprint-405-harness-dogfood-findings.md + drift-baseline.md 신규 생성 (S360 hallucination 회피) | `ls reports/sprint-405-*` ≥ 2 |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| `--with-claude-hooks` CLI 누락 | (1) 본 sprint 내 즉시 wiring fix 또는 (2) F672 follow-up. 결정 reports 명시 |
| pnpm install peer warning 폭주 | warnings 분류 → 본질적 dependency 결함은 F672 권고 |
| typecheck `turbo cache` 함정 (S337 19회차) | `pnpm exec tsc --noEmit` direct 호출로 cache 우회 |
| Foundry-X drift baseline 0 기대 vs 실측 차이 | drift는 자연스러운 변수 치환 외 0건 — 본질적 drift 발견 시 F672+ 권고 |
| wrangler deploy --dry-run fail | CF account_id placeholder 시 dummy 사용 (`--cf-account 00000000-0000-0000-0000-000000000000`) |
| /tmp 자동 정리 (재부팅) | 검증 완료 후 reports 본문에 모든 결과 첨부 (외부 dir 의존 0) |

## §7 Out-of-scope (명시 차단)

- ❌ 실 Cloudflare 배포 (account_id + secrets 미사용, dry-run만)
- ❌ Foundry-X 본체 rules 수정 (drift monitor는 read-only)
- ❌ ServerKit Native MVP (F662~F665) 변경 — 별 트랙
- ❌ MEMORY.md 압축 작업 (별 trace, 차기 사이클)
- ❌ velocity stale rules 승격 (별 trace, 차기 사이클)
- ❌ 신규 D1 migration (Dogfood scope 외)

## §8 S360 hallucination 회피 강제 (학습 5회차)

- ✅ reports/sprint-405-harness-dogfood-findings.md **신규 실파일 생성 의무화**
- ✅ reports/sprint-405-drift-baseline.md **신규 실파일 생성 의무화**
- ✅ velocity sprint-405.json **f_items=F671 정확 + duration_minutes 실측 + autopilot stale "F670" 답습 차단 prompt 명시**
- ✅ design/sprint-405.design.md + report/sprint-405.report.md 둘 다 자동 생성
- ✅ Phase Exit P-l "reports/sprint-405-*.md ls 결과 ≥ 2 신규" 강제 검증

## §9 예상 시간

~45~90분 autopilot (build + scaffold + 8 검증 + reports + Dogfood 1회). gap fill 아닌 신규 신규 작업이라 12~15분 ultra-fast 어려움.

## §10 관련 문서

- ax-harness-kit PRD-final: `docs/specs/ax-harness-kit/prd-final.md`
- S364 5 sprint 산출물: `docs/01-plan/features/sprint-{400~404}.plan.md`
- harness-kit README: `packages/harness-kit/README.md`
- rules: `.claude/rules/sprint-ops.md` (Master Monitor 필수), `tdd-workflow.md`
