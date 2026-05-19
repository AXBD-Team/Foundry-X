# ax-harness-kit PRD

**버전**: v1
**날짜**: 2026-05-19
**작성자**: Sinclair Seo (via /ax:req-interview, Claude Code Opus 4.7)
**상태**: 🔄 R1 검토 대기

---

## 1. 요약 (Executive Summary)

**한 줄 정의**
> Foundry-X에서 정착한 BD 라이프사이클 자동화 인프라(ax-marketplace + bashrc + scripts/* + .claude/rules/ + Cloudflare 배포 골격)를 **1회 install 명령**으로 신규 프로젝트에 풀세트 이식하는 ax-marketplace plugin.

**배경**
> Foundry-X에서 ~59 sprint 연속 성공(S306~S360, F560~F665)을 통해 정착시킨 autopilot Sprint Cycle + Governance 규칙 + SDD Triangle 인프라를 보유하고 있으나, 신규 프로젝트마다 이를 재구축하면 누적 며칠~수십 시간 비용 발생. ax-config repo + tmux hooks(S293) 패턴은 일부만 공유, 풀세트 이식 메커니즘 부재.

**목표**
> `/ax:init-harness <project-name>` 1회 호출로 신규 프로젝트가 Foundry-X와 동등한 자동화 인프라를 가동하며, 임박한 신규 프로젝트 1건이 W20(5/19~5/25) 내 시동 + 첫 Sprint autopilot cycle PR merge + smoke PASS 완결.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- Foundry-X 자동화 인프라 9 영역 분산 보존
  - ax-marketplace (24 skills, GitHub repo)
  - ~/.bashrc 함수 (sprint, wtsplit, ccs/ccw, monitor, billing-guard)
  - scripts/task/, scripts/git-orphan-*.sh (Foundry-X repo 내)
  - .claude/rules/ 9 파일 (Foundry-X repo 내)
  - .claude/settings.json hooks 4종 (Foundry-X 내)
  - SPEC.md 템플릿 + 거버넌스 (Foundry-X 고유)
  - Cloudflare deploy.yml + wrangler.toml + d1-migrate-remote.sh (Foundry-X 내)
  - pnpm monorepo 4-package 골격 (api/web/cli/shared)
- 신규 프로젝트 시동 시 위 9 영역을 수동 복사·수정 필요 (~며칠 단위 셋업 비용)
- 일부는 Foundry-X-specific 하드코딩 (ktds-axbd, AX BD팀, Foundry-X 명칭 등) → 단순 복사 불가
- ax-config repo는 ~/.claude/ 일부만 다룸 (Cloudflare 인프라/scripts 포함 안 함)
- S293 install-tmux-hooks.sh 패턴은 idempotent 배포 모범 사례지만 적용 범위 제한적

### 2.2 목표 상태 (To-Be)

- ax-marketplace 안 신규 plugin (또는 1.2.0 버전업) `init-harness` 스킬 호출
- 사용자가 3 파라미터만 입력 (project-name, github-org/repo, description)
- 자동화:
  1. 신규 디렉토리 골격 생성 (pnpm monorepo 4-package)
  2. .claude/rules/ 9 파일 복사 + Foundry-X-specific 식별자 변수화
  3. .claude/settings.json hooks 4종 생성 + path/secret 재구성
  4. SPEC.md 템플릿 (§1~§10) 빈 F-item/REQ 시작점 생성
  5. Cloudflare 배포 인프라 (deploy.yml + wrangler.toml + d1-migrate-remote.sh) 템플릿화 후 채움
  6. ~/.bashrc 패치 (markers + 백업 + AX_TARGET_HOME 감지, S293 패턴 재활용)
  7. scripts/task/, scripts/git-orphan-*.sh 복사
  8. 초기 git commit + master push + GitHub Repo 등록 (선택)
- 결과: ≤ 5분 install + 7일 내 1 Sprint autopilot cycle 완결

### 2.3 시급성

- **W20 (5/19~5/25)** 내 임박 신규 프로젝트 시동 필요
- 매뉴얼 셋업 시 며칠 소요 → ax-harness-kit 없이 진행 시 W21 이상으로 지연 위험
- Foundry-X autopilot 사이클(~10~20분/sprint)을 신규 프로젝트에서 즉시 가동 가능한 구조 확보 시 ROI 즉시 회수

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair Seo | Master Claude Code 사용자, Foundry-X 워크플로우 압축 익숙 | 1회 install로 신규 프로젝트 즉시 시동, autopilot Cycle 동등 동작, Foundry-X-specific 식별자 변수화로 멀티 프로젝트 운영 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| KTDS-AXBD GitHub Org | ax-marketplace 호스팅 + 신규 Repo 호스팅 | 높음 (PR 승인 + Repo 생성) |
| Cloudflare ktds-axbd 계정 | Workers/Pages/D1 호스팅, sub-name 분리 | 높음 (account_id 공유 + secret namespace) |
| ax-marketplace 사용자 (Sinclair 1차) | init-harness 스킬 진입점 | 높음 (사용 시 즉시 영향) |
| AX BD팀 7명 | 추후 활용 가능성 (이번 MVP 범위 외) | 낮음 (Out-of-scope) |

### 3.3 사용 환경

- 기기: WSL2 (Ubuntu-24.04) + Windows Terminal + tmux 3.6a
- 네트워크: 인터넷 (GitHub + Cloudflare API 호출 필요)
- 기술 수준: 개발자 (Sinclair Seo, Claude Code 고급 사용자)
- 의존 도구: bash + git + pnpm + Claude Code + wrangler CLI + gh CLI

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M1 | ax-marketplace `init-harness` 스킬 신설 | `/ax:init-harness <project-name> <github-org/repo> "<description>"` 진입점. 5 파라미터(추가: cloudflare-account, project-domain) 후속 인터뷰 또는 CLI 인자 | P0 |
| M2 | Install 스크립트 (`install.sh`) | 신규 프로젝트 디렉토리에 파일 복사 + 변수 치환 + bashrc 패치 + 초기 git commit. idempotent 재실행 안전 (markers + 백업) | P0 |
| M3 | 변수 치환 시스템 | `${PROJECT_NAME}`, `${GITHUB_ORG}`, `${GITHUB_REPO}`, `${PROJECT_DESCRIPTION}`, `${CLOUDFLARE_ACCOUNT}` 등 토큰 일괄 치환 | P0 |
| M4 | pnpm monorepo 4-package 골격 | api (Hono+CF Workers) / web (React+Vite) / cli (Commander+Ink) / shared (types) 초기 파일 + package.json + tsconfig + turbo.json | P0 |
| M5 | Cloudflare 배포 인프라 템플릿 | `wrangler.toml` (account_id + sub-name) + `.github/workflows/deploy.yml` + `scripts/d1-migrate-remote.sh` | P0 |
| M6 | `.claude/rules/` 9 파일 복사 + 변수화 | sdd-triangle, tdd-workflow, sprint-ops, git-workflow, security, testing, coding-style, process-lifecycle, task-promotion. Foundry-X-specific 명칭 제거 | P0 |
| M7 | `.claude/settings.json` hooks 4종 | PreToolUse + PostToolUse + SessionStart + UserPromptSubmit. 신규 프로젝트 경로 + secret 재구성 | P0 |
| M8 | SPEC.md §1~§10 템플릿 | 빈 F-item/REQ 시작점 (F001~/REQ-001~). 신규 프로젝트가 첫 F-item 등록부터 즉시 진행 가능 | P0 |
| M9 | bashrc 패치 (S293 패턴) | install-bashrc.sh가 ~/.bashrc 말미에 `source ~/.claude/scripts/ax-harness.bashrc` 자동 주입. AX_TARGET_HOME 감지 + idempotent | P0 |
| M10 | scripts/task/ + scripts/git-orphan-*.sh 복사 | task-daemon.sh + sprint-merge-monitor.sh + git-orphan-scan/clean.sh. Foundry-X-specific 환경변수 제거 | P0 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| S1 | Dogfood Sprint 1건 검증 | 임박 프로젝트에 install 후 첫 Sprint autopilot cycle (PR merge + smoke PASS) 수행 + retrospective 기록 | P1 |
| S2 | Install 로그 + dry-run 모드 | `--dry-run` 옵션으로 변경 사항 미리 보기. 실 install 시에는 모든 변경 사항 stdout + `install.log` 저장 | P1 |
| S3 | tmux conf + resurrect 플러그인 설정 자동 적용 | S293 install-tmux-hooks.sh 흡수. tpm + tmux-resurrect + tmux-continuum 자동 install | P1 |
| S4 | GitHub Repo 자동 생성 (gh CLI) | `gh repo create $ORG/$REPO --private --description "$DESCRIPTION"` 자동 수행. 기존 Repo 있으면 skip | P1 |
| S5 | Cloudflare wrangler login 가이드 + 검증 | 신규 환경에서 wrangler 인증 상태 확인 + 미인증 시 가이드 메시지 | P1 |

### 4.3 제외 범위 (Out of Scope)

- **Public release 공개 출간** (MIT/Apache 라이선스, 마케팅, GitHub Star count, 커뮤니티 관리) — 본인 내부용 한정
- **Non-Foundry-X 스택 분기** (Node 서버 / Next.js / Vercel / 외부 BaaS) — Foundry-X 동일 스택 전제, 다른 스택 적용은 별 트랙
- **팀원 온보딩 문서** — Sinclair Seo 본인 사용 우선, AX BD팀 7명 확대는 차후
- **Backwards-compat** — 신규 프로젝트만 대상, 기존 프로젝트 in-place upgrade 안 함

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| KTDS-AXBD/ax-marketplace | git push (PR + 1.2.0 버전업 또는 1.1.x patch) | 필수 |
| Cloudflare ktds-axbd 계정 | wrangler CLI + secret put (sub-name으로 분리) | 필수 |
| GitHub 신규 Org/Repo | gh CLI repo create + secret 등록 (CLOUDFLARE_API_TOKEN 등) | 필수 |
| ~/.bashrc | install.sh 패치 (markers + 백업) | 필수 |
| ~/.tmux.conf | install.sh 패치 (S293 패턴 재활용) | 선택 (S3) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 신규 프로젝트 시동 시간 | ~며칠 (수동) | ≤ 5분 (install) + ≤ 7일 (첫 Sprint 완결) | install 시작~종료 timestamp + Sprint MERGED timestamp |
| Install 명령 실행 시간 | N/A | ≤ 5분 | `time /ax:init-harness ...` |
| 변경 사항 idempotent 재실행 안전성 | N/A | 100% (2회 실행 시 변경 0) | `diff` 2회차 vs 1회차 |
| Foundry-X 수준 autopilot Sprint cycle 완결 | 0건 | ≥ 1건 (PR merge + smoke PASS) | GitHub PR API + Cloudflare wrangler tail |
| Foundry-X-specific 하드코딩 잔존 | 알 수 없음 | 0건 | grep으로 ktds-axbd/AX BD팀/Foundry-X 명칭 검색 |

### 5.2 MVP 최소 기준

- [ ] `/ax:init-harness <project-name> <github-org/repo> "<description>"` 호출 시 9 영역 모두 적용
- [ ] 임박 프로젝트 1건 시동 후 첫 Sprint autopilot cycle 완결 (PR merge + smoke PASS)
- [ ] install 시간 ≤ 5분 + dry-run 모드 제공
- [ ] idempotent 재실행 안전 (markers + 백업 검증)
- [ ] Foundry-X-specific 식별자 변수화 + 잔존 0건 (grep 검증)

### 5.3 실패/중단 조건

- W20 종료 시점(5/25)에도 임박 프로젝트 시동 못 함 → 우회 전략(매뉴얼 셋업) 선택 + ax-harness-kit 일정 재산정
- Install 후 첫 Sprint autopilot 실행 실패 → Foundry-X 환경 종속성 미해소 → 원인 추적 + Phase 4-B Ambiguity 재산정
- Foundry-X-specific 하드코딩 grep 결과 5건 이상 잔존 → 변수화 부족, 추가 라운드 필요

### 5.4 비기능 요구사항

- **멱등성(Idempotency)**: install.sh 2회 이상 실행 시 변경 0건
- **Backup**: 모든 ~/.bashrc, ~/.tmux.conf 등 파일 수정 시 `.bak.{timestamp}` 백업
- **Dry-run**: `--dry-run` 옵션 제공
- **Error rollback**: install 중 실패 시 부분 적용 상태 자동 복구
- **Cross-WSL 호환**: AX_TARGET_HOME 자동 감지 (real HOME vs .claude-work HOME 분리)
- **Secret 보호**: install 중 secret 평문 노출 0 (wrangler secret put 경로 안내만)

---

## 6. 제약 조건

### 6.1 일정

- 목표 완료일: **W20 (2026-05-25) 내 MVP 완성** + 임박 프로젝트 시동
- 마일스톤:
  - M1 (5/20): SPEC §5 F-item 등록 + Sprint 시동
  - M2 (5/22): Core M1~M5 구현 + 1차 Dogfood
  - M3 (5/24): Core M6~M10 + S1 검증 Sprint
  - M4 (5/25): MVP 완결 + retrospective

### 6.2 기술 스택

- **프론트엔드**: React 18 + Vite 8 + React Router 7 + Zustand (Foundry-X 동일)
- **백엔드**: Hono + Cloudflare Workers + D1 (Foundry-X 동일)
- **CLI**: Commander + Ink 5 + TypeScript (Foundry-X 동일)
- **인프라**: Cloudflare Pages + Workers + D1 (ktds-axbd 계정, sub-name 분리)
- **모노리포**: pnpm workspace + Turborepo (Foundry-X 동일)
- **언어**: TypeScript strict mode, Node 22 (`.nvmrc` 22, S363 정합화)
- **기존 시스템 의존**:
  - Foundry-X repo (원본 코드 추출 소스)
  - ax-marketplace repo (target 호스팅)
  - ax-config repo (S293 install-tmux-hooks.sh 패턴 재활용)
  - tmux 3.6a (S213 build + S307 패턴)

### 6.3 인력/예산

- **투입 가능 인원**: 1명 (Sinclair Seo, AI Foundry W19+ F-item과 동시 진행 가능)
- **예산 규모**: Cloudflare ktds-axbd 계정 sub-name 추가 비용 = 0원 (기존 무료 tier)
- **추가 외부 비용**: 0원 (Anthropic API + GitHub Free Plan 기존 사용 중)

### 6.4 컴플라이언스

- **KT DS 내부 정책**: ktds.axbd@gmail.com 계정 자산 보존(자산명 ktds-axbd, Foundry-X 등 코드 식별자 유지 필요, Phase 0 정책 동일)
- **보안 요구사항**: secret 평문 저장 금지(.dev.vars 0644+gitignore), wrangler secret put 경로 강제
- **외부 규제**: 본인 내부용이라 GDPR/개인정보보호법 적용 0

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | 임박 프로젝트의 이름/도메인 명확화 (현재 TBD, 가칭 'project-X') | Sinclair Seo | M1 (5/20) |
| 2 | ax-marketplace 버전 정책: 1.2.0 minor vs 1.1.x patch | Sinclair Seo | M1 (5/20) |
| 3 | Foundry-X-specific 식별자 변수화 범위 (CLAUDE.md "AX BD팀" 등 명시는 어디까지 변수화하는가) | 구현 단계에서 | M2 (5/22) |
| 4 | bashrc 패치 멱등성 보장 (markers 패턴 - `# ax-harness BEGIN` ~ `# ax-harness END` 또는 source line만) | 구현 단계에서 | M2 (5/22) |
| 5 | D1 migration 시작 번호: 0001부터 vs Foundry-X 0144 등 그대로 | 구현 단계에서 | M2 (5/22) |
| 6 | scripts/task/ 패키지가 Foundry-X 모노리포 SPEC.md 의존 → 신규 프로젝트에서도 동일 동작 보장 방식 | 구현 단계에서 | M3 (5/24) |
| 7 | 임박 프로젝트가 결정되면 ax-harness-kit Dogfood로 시동할 것인가 | Sinclair Seo | M1 (5/20) |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 (v1) | 2026-05-19 | 5 파트 + 4 보완 인터뷰 기반 초안 작성 | - |
| R1 | (예정) | 3-AI 검토 후 반영 | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
