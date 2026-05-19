# ax-harness-kit PRD

**버전**: v2
<!-- CHANGED: 버전 업데이트 (v1 → v2), AI 검토 반영 -->
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

<!-- CHANGED: ChatGPT 피드백 반영 - 문제-해결책-성공기준 논리 보완, 동등성 정의 구체화 -->
**문제-해결책-성공기준 논리 강조**
- **문제**: Foundry-X의 자동화 인프라를 신규 프로젝트마다 수동 이식 시 반복 비용(며칠~수십 시간)이 발생하고, 일부 구성은 Foundry-X-specific 하드코딩으로 인해 단순 복사 불가, 실질적인 운영 효율성 저하.
- **해결책**: ax-marketplace plugin으로 일괄 설치 및 변수화 자동화, 핵심 9영역 자동 템플릿화, 환경 별 idempotency 및 롤백/복구를 내장한 install 스크립트 제공.
- **성공기준**: ① 5분 이내 install로 신규 프로젝트 시동, ② Foundry-X와 **동일한 autopilot Sprint cycle**(PR merge, smoke PASS, 자동 배포 모두 포함) 즉시 가동, ③ 하드코딩 식별자 0건 잔존(grep 검증), ④ 멱등성(2차 실행시 변경 0), ⑤ 실제 임박 프로젝트 1건에 적용 및 첫 Sprint 완결.

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

<!-- CHANGED: ChatGPT 피드백 반영 - Foundry-X-specific 변수화 범위 명확화 -->
- **Foundry-X-specific 명칭 및 변수화 범위**:  
  - 조직명(ktds-axbd), 팀명(AX BD팀), 프로젝트명(Foundry-X), 경로명, Cloudflare 계정/서브도메인, GitHub 조직/리포 등 **모든 외부 식별자 및 환경 의존 정보**는 변수화 대상.
  - 단, SPEC.md 내 업무/프로세스 이름, 내부 정책 등은 필요 최소한으로 변수화(운영상 일관성 우선).

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

<!-- CHANGED: ChatGPT 피드백 반영 - 동등성 정의 명확화, smoke PASS 기준 구체화 -->
- **Foundry-X 동등성 정의**:  
  - 신규 프로젝트에서 autopilot Sprint cycle이 PR 생성→자동 테스트(smoke test: 기본 빌드, 의존성 설치, 최소 서비스 기동, Cloudflare Workers 기본 응답 확인, D1 마이그레이션 적용까지 포함)→PR merge→자동 배포→smoke PASS까지 **동일하게 동작**해야 함.

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

<!-- CHANGED: ChatGPT/DeepSeek 피드백 반영 - 과중 범위, MVP 최소화 확정 -->
- **최소 MVP 범위**:  
  - Must Have 중에서도 M1~M5까지만 **최소 MVP 범위**로 설정 가능.  
  - M6~M10, Should Have(S1~S5)는 **후속 라운드**로 분리 가능하며, 일정/인력 고려시 1주 MVP 내에서는 최소화 필요.

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

<!-- CHANGED: ChatGPT 피드백 반영 - smoke PASS 구체화, 동등성/성공조건 명확화 -->
- **smoke PASS 세부 기준**:  
  - 신규 프로젝트에서 설치 직후 첫 PR 생성 시, 자동 빌드/테스트가 성공하고, Cloudflare Workers 기본 경로(예: /healthz)에서 200 응답, D1 DB 마이그레이션 스크립트가 정상 적용되어야 함.

### 5.2 MVP 최소 기준

- [ ] `/ax:init-harness <project-name> <github-org/repo> "<description>"` 호출 시 9 영역 모두 적용
- [ ] 임박 프로젝트 1건 시동 후 첫 Sprint autopilot cycle 완결 (PR merge + smoke PASS)
- [ ] install 시간 ≤ 5분 + dry-run 모드 제공
- [ ] idempotent 재실행 안전 (markers + 백업 검증)
- [ ] Foundry-X-specific 식별자 변수화 + 잔존 0건 (grep 검증)

<!-- CHANGED: ChatGPT 피드백 반영 - 최소 MVP 기준/범위 명확화 -->
- **MVP 필수 항목**:  
  - M1~M5(핵심 자동화, 템플릿화, 배포/환경설정, 변수화)  
  - M6~M10 및 Should Have(S1~S5)는 MVP 범위 외(Out-of-MVP)로 인정 가능

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

<!-- CHANGED: ChatGPT 피드백 반영 - 비기능 상세화(rollback, 멱등성, 환경 차이 등) -->

---

## 6. 제약 조건

### 6.1 일정

- 목표 완료일: **W20 (2026-05-25) 내 MVP 완성** + 임박 프로젝트 시동
- 마일스톤:
  - M1 (5/20): SPEC §5 F-item 등록 + Sprint 시동
  - M2 (5/22): Core M1~M5 구현 + 1차 Dogfood
  - M3 (5/24): Core M6~M10 + S1 검증 Sprint
  - M4 (5/25): MVP 완결 + retrospective

<!-- CHANGED: ChatGPT 피드백 반영 - 일정/범위 과중성, 인력 1명, 과소평가 리스크 명시 -->
- **일정 리스크**:  
  - 단일 인력(1명) 투입, 병행 업무(F-item) 존재, bashrc/tmux 패치 및 외부 API 자동화 등 난이도 고려시 **1주 내 전체(Must+Should) 구현은 현실적으로 과중**.
  - 실제 MVP는 M5까지로 축소, 나머지는 후속 라운드로 명확히 분리 필요.

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

<!-- CHANGED: ChatGPT/DeepSeek 피드백 반영 - Foundry-X-specific 변수화 범위 명확화, MVP 범위 명확화 추가 -->

---

## 8. 추가 섹션: 테스트/검증 계획

<!-- CHANGED: ChatGPT 피드백 반영 - 테스트/검증 계획 신설 -->
### 8.1 테스트 전략

- **사전 환경 체크**: git, pnpm, wrangler, gh CLI, bash, Node 22 등 필요 의존성 사전 검사. 미충족 시 즉시 오류 및 가이드 출력.
- **Dry-run**: `install.sh --dry-run` 실행 시 실제 변경 없이 전체 diff/적용 예정 항목 stdout 출력.
- **실행 환경 다양성**: WSL2 + real Linux + (가능하다면) Mac에서 smoke test.
- **idempotency 검증**: 동일 파라미터로 2회 실행 후 변경사항 diff 비교, 0건 확인.
- **자동화 인프라 smoke test**:  
  - install 직후 PR 생성→GitHub Actions 빌드/배포→Cloudflare Workers /healthz 200 응답→D1 DB 마이그레이션까지 전 과정 자동화.
- **Rollback/복구 테스트**:  
  - install 중 의도적 오류(예: Cloudflare 인증 실패, bashrc 권한 없음, 디스크 풀 등) 삽입, 자동 롤백/backup 복원 동작 검증.
- **변수화 검증**:  
  - grep으로 ktds-axbd/AX BD팀/Foundry-X 등 식별자 검색, 0건일 때 PASS.

### 8.2 검증 담당자/시기

- **담당자**: Sinclair Seo
- **일정**: 각 마일스톤 M2/M3 완료 후 자동화 smoke test & idempotency test 실시  
- **결과 기록**: install.log, retrospective 문서, PR 리뷰 코멘트 등

---

## 9. 추가 섹션: 에러 핸들링/로깅/알림

<!-- CHANGED: ChatGPT 피드백 반영 - 에러핸들링, 로깅, 알림 상세화 -->
### 9.1 에러 핸들링

- **설치 중단/실패 시**:  
  - 변경 파일/디렉토리 모두 .bak.{timestamp} 백업 후, 실패 시 자동 복구(backup 복원)  
  - 외부 API 실패(Cloudflare, GitHub 등)는 단계별로 명확한 에러 메시지 및 재시도 안내
  - 권한/환경 변수/디스크 등 시스템 오류는 즉시 stderr 출력 및 종료
  - 롤백 불가(backup 복원 실패) 시 명확한 경고 및 수동 복구 가이드 안내

### 9.2 로깅

- **설치 로그**:  
  - 모든 주요 단계별 stdout/stderr 로그 install.log 파일에 저장
  - 에러 발생 시 에러 코드, 메시지, 원인, 복구 방법 install.log에 기록
  - --dry-run 시에도 로그 파일 저장

### 9.3 알림

- **사용자 알림**:  
  - 주요 단계(시작, 완료, 오류, 롤백 등)는 터미널 즉시 안내
  - 필요시 Slack, 이메일 등 외부 알림은 Out-of-Scope(내부 사용 한정)

---

## 10. 추가 섹션: 버전 관리/Upgrade 정책

<!-- CHANGED: ChatGPT 피드백 반영 - 버전 관리/Upgrade 정책 추가 -->
### 10.1 신규 프로젝트 전용

- 최초 install 및 bootstrap만 지원, 기존 프로젝트 업그레이드는 Out-of-Scope
- 추후 템플릿/도구 버전업 필요시, 신규 프로젝트에만 적용

### 10.2 템플릿/도구 버전업 시나리오

- ax-marketplace plugin 및 템플릿 업데이트 시, 기존 프로젝트에는 별도 안내/마이그레이션 없음
- 변동/업데이트 내역은 CHANGELOG.md 및 install.log에 기록  
- 향후 upgrade 지원 필요시 별도 F-item으로 분리

---

## 11. 추가 섹션: 환경 차이/외부 의존성/멱등성 리스크

<!-- CHANGED: ChatGPT/DeepSeek 피드백 반영 - 환경 차이, 외부 API, 멱등성 등 리스크 상세화 -->
### 11.1 환경 차이

- WSL2, Native Linux, Mac 등 OS별 bashrc/tmux 경로, 권한, 환경 변수 차이로 install 실패/멱등성 이슈 가능
- install.sh 내 OS 감지 및 경로/backup 정책 분기 처리 필요

### 11.2 외부 의존성 실패

- Cloudflare API, GitHub API rate limit, 인증/권한 등 외부 실패에 따라 install 중단 우려  
- wrangler/gh CLI 인증 미충족 시 사전 에러/가이드 출력  
- 자동화 과정에서 외부 서비스 장애, 네트워크 불안정 등 발생 시 재시도/중단/rollback 명확화

### 11.3 멱등성 실패 요인

- 변수 치환/템플릿화 누락, 의도치 않은 중복 라인 추가, 파일 잠금 등으로 2회 실행 시 변경 발생할 수 있음  
- 모든 패치/복사/치환은 marker 주입, diff 검사, backup/restore로 멱등성 보장

---

## 12. 추가 섹션: 리스크 요약

<!-- CHANGED: ChatGPT/DeepSeek 피드백 반영 - 리스크 요약 신설 -->
### 12.1 실행 가능성/일정

- 1인 투입, 1주 내 Must+Should 전부 구현은 현실적으로 과중.  
- Cloudflare/GitHub 외부 의존성, bashrc/tmux 환경 차이, rollback 자동화 등 각 단계별 오류 가능성 높음

### 12.2 기술/운영 리스크

- bashrc/tmux 자동 패치시 시스템 환경 깨질 수 있음(backup/복구 필수)
- wrangler/gh 인증/권한 미비, API rate limit 등 외부 실패 시 install 중단/지연
- 변수화/템플릿화 누락 시 동등성/보안 결함 발생
- 멱등성 실패(2회 실행 시 diff 발생) 가능성 상존

### 12.3 테스트/검증 리스크

- smoke PASS 기준 불명확/누락, rollback 검증 미흡시 실제 프로젝트 장애 가능
- Cross-WSL/다중 환경 테스트 미흡시 일부 사용자 환경에서 install 실패 우려

---

## 13. Out-of-scope

<!-- CHANGED: Out-of-scope 명시적 추가 (AI 피드백 반영) -->
- Public 오픈소스 출간, 마케팅, 커뮤니티 관리
- Non-Foundry-X 기술스택 지원
- 팀원 온보딩/교육 문서, 멀티유저 운영
- 기존 프로젝트 업그레이드/마이그레이션
- Slack/email 등 외부 알림 연동
- 템플릿/도구 upgrade 자동화(추후 별도 F-item)

---

## 14. 참고/AI 리뷰 사유

<!-- CHANGED: AI 검토 사유/근거 요약 추가 -->
- 본 PRD는 requirements-interview 스킬 및 3-AI(Claude, ChatGPT, DeepSeek) 합의 조건에 따라, 논리적 완결성, 테스트/검증, rollback/멱등성, 변수화/보안, 외부 의존성/환경 차이 등 실무 위험요소를 명시적으로 구조화함.

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*