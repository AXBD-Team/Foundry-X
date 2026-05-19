# ax-harness-kit PRD (Final)

**버전**: prd-final
**날짜**: 2026-05-19 (S364)
**작성자**: Sinclair Seo (via /ax:req-interview, Claude Code Opus 4.7)
**상태**: ✅ 착수 준비 완료 — 정성 판단 + R2 조건 4 반영 (Ambiguity 0.155, Brownfield Ready)

---

## 0. 검토 이력 (자체 메타)

| 라운드 | 점수 | 판정 | 일자 | 핵심 |
|--------|-----|------|------|------|
| 초안 v1 | - | - | 2026-05-19 | 5 파트 + 4 보완 인터뷰 |
| R1 | 79/100 | 3-AI Conditional | 2026-05-19 | 변수화 모호 + 일정 과중 + rollback 미흡 |
| v2 (자동 반영) | - | - | 2026-05-19 | 17 CHANGED + 6 신규 섹션 |
| R2 | 59/100 (-20점 발산) | 3-AI Conditional 일관 수렴 | 2026-05-19 | MVP M1~M5 축소 + 옵트인 + 3단계 설치 + 변수화 사전 grep |
| **Final** | Ambiguity **0.155** (≤0.2 Ready) | ✅ 정성 판단 착수 | 2026-05-19 | R2 조건 4 반영 + 변수화 grep 사전 데이터 포함 |

> R2 발산은 PRD 길이 증가(236→393줄)에 의한 검토 대상 확대 효과. 3-AI Conditional 조건은 R1↔R2 일관 수렴(MVP 축소 / 옵트인 / 3단계 / grep 사전)으로, **품질 저하가 아닌 조건의 선명화**. S361 PRD final 패턴 (75→72 발산 후 정성 판단) 재적용.

---

## 1. 요약 (Executive Summary)

**한 줄 정의**
> Foundry-X에서 정착한 BD 라이프사이클 자동화 인프라(ax-marketplace + bashrc + scripts/* + .claude/rules/ + Cloudflare 배포 골격)를 신규 프로젝트에 **3단계 install 명령**(preflight → install → verify)으로 Tier 1 안전 이식, Tier 2(bashrc/tmux 옵트인) 확장 이식하는 ax-marketplace 신규 plugin.

**배경**
> Foundry-X에서 ~59 sprint 연속 성공(S306~S360, F560~F665)을 통해 정착시킨 autopilot Sprint Cycle + Governance 규칙 + SDD Triangle 인프라를 보유하고 있으나, 신규 프로젝트마다 이를 재구축하면 누적 며칠~수십 시간 비용 발생. 본 세션 사전 grep 측정 결과 ktds-axbd 식별자 잔존이 **149 파일**, ~/.bashrc 의존 함수가 **13개**, .claude/rules/ 9 파일 중 **7개에 Foundry-X 식별자** 포함되어 단순 복사 불가.

**목표**
> `/ax:init-harness <project-name>` 호출로 신규 프로젝트가 Foundry-X와 동등한 자동화 인프라를 ≤ 5분 안에 가동(Tier 1) + 임박 프로젝트 1건이 W20(5/19~5/25) 내 시동 + W22(6/1) 내 첫 Sprint autopilot cycle PR merge + smoke PASS.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- Foundry-X 자동화 인프라 9 영역 분산 보존 (ax-marketplace / bashrc / scripts/* / .claude/rules/ / .claude/settings.json hooks / SPEC.md / Cloudflare deploy / pnpm monorepo / tmux 3.6a)
- 신규 프로젝트 시동 시 9 영역 수동 복사·수정 비용 ~며칠 단위
- **Foundry-X-specific 하드코딩 grep 측정 (본 세션 사전 분석)**:
  - `ktds-axbd`: 149 파일 (.toml/.yml/.json/.sh/.ts 등 전반)
  - `Foundry-X` / `foundry-x`: package.json + .github/workflows 다수
  - `.claude/rules/` 9 파일 중 7개 (coding-style, sdd-triangle, git-workflow, tdd-workflow, testing, security, serverkit-cq)에 Foundry-X 식별자
- ~/.bashrc 의존 함수 13개: wtsplit, _cc_billing_guard, _cc_remove_api_key, ccs, ccw, _sprint_ensure_monitor, sprint, sprint-review, sprint-pr, sprint-done, ccw-sprint, ccw-auto, sprints
- ax-config repo + S293 install-tmux-hooks.sh는 부분만 다룸 (Cloudflare 배포 인프라 + scripts/task/ + SPEC.md 템플릿 미포함)

### 2.2 목표 상태 (To-Be)

`/ax:init-harness <project-name>` 1회 호출 + 3-step 안전 절차:
1. **Preflight** (검증): git, pnpm, wrangler, gh CLI, bash, Node 22 사전 점검 + Cloudflare/GitHub 인증 상태 + 디스크 여유분 확인. 실패 시 즉시 가이드.
2. **Install** (실행): Tier 1 자동 + Tier 2 옵트인 적용. 모든 변경 `.bak.{timestamp}` 백업. 변수 치환 + 신규 디렉토리 골격 + GitHub Repo 등록(선택).
3. **Verify** (검증): grep으로 Foundry-X 식별자 잔존 0건 확인 + 임의 smoke probe(/healthz 200) + idempotency 2회 실행 diff 0건 확증.

### 2.3 시급성

- **W20 (5/19~5/25)** 내 임박 신규 프로젝트 1건 시동 필요
- ax-harness-kit MVP는 Tier 1 (M1~M5) 한정으로 W20 내 완성, Tier 2 (M6~M10)은 Phase 2로 W21~W22 분리

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair Seo | Master Claude Code 사용자, Foundry-X 워크플로우 압축 익숙 | 1회 install로 신규 프로젝트 즉시 시동, autopilot Cycle 동등 동작, Foundry-X-specific 식별자 변수화로 멀티 프로젝트 운영 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| KTDS-AXBD GitHub Org | ax-marketplace 호스팅 + 신규 Repo 호스팅 | 높음 |
| Cloudflare ktds-axbd 계정 | Workers/Pages/D1 sub-name 분리 | 높음 |
| ax-marketplace 사용자 (Sinclair 1차) | init-harness 스킬 진입점 | 높음 |
| AX BD팀 7명 | 추후 활용 가능성 (이번 MVP 범위 외) | 낮음 (Out-of-scope) |

### 3.3 사용 환경

- 기기: WSL2 (Ubuntu-24.04) + Windows Terminal + tmux 3.6a (S213 build)
- 네트워크: 인터넷 (GitHub + Cloudflare API)
- 기술 수준: Claude Code 고급 사용자
- 의존 도구: bash + git + pnpm + Node 22 + wrangler CLI + gh CLI

---

## 4. 기능 범위

### 4.1 Tier 1 — MVP Must Have (M1~M5, P0, W20 완성)

> R2 권고 #1 반영: 단일 인력 W20 1주 일정에 맞추어 **Tier 1 = 안전한 파일 복사 + Cloudflare 배포 + SPEC 템플릿** 범위로 공식 축소.

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M1 | ax-marketplace `init-harness` 스킬 신설 | `/ax:init-harness <project-name> <github-org/repo> "<description>"` 진입점. 5 파라미터(추가: cloudflare-account, project-domain). preflight + install + verify 3단계 진행. | P0 |
| M2 | 3단계 install 스크립트 (`preflight.sh + install.sh + verify.sh`) | DeepSeek R2 권고 #4 반영. 단일 install.sh 분리. 각 단계 idempotent. 모든 변경 `.bak.{timestamp}` 백업. | P0 |
| M3 | 변수 치환 시스템 (4 카테고리) | `${PROJECT_NAME}`, `${GITHUB_ORG}`, `${GITHUB_REPO}`, `${PROJECT_DESCRIPTION}`, `${CLOUDFLARE_ACCOUNT}`, `${WORKER_SUBDOMAIN}` 일괄 치환. 변수 사전 grep으로 149 파일 미리 식별 (4-카테고리: 조직명/경로/시드/콘텐츠). | P0 |
| M4 | pnpm monorepo 4-package 골격 | api (Hono+CF Workers) / web (React+Vite) / cli (Commander+Ink) / shared. package.json + tsconfig + turbo.json + .nvmrc 22 + .gitignore | P0 |
| M5 | Cloudflare 배포 인프라 템플릿 | `wrangler.toml` (account_id = ktds-axbd 하드코딩, sub-name 분리) + `.github/workflows/deploy.yml` (D1 migration + Workers deploy + smoke test) + `scripts/d1-migrate-remote.sh` | P0 |

### 4.2 Tier 2 — Should Have (M6~M10, P1, W21~W22 Phase 2 분리)

> R2 권고 #1+#2 반영: 시스템 환경에 영향 큰 작업(bashrc, scripts/task, .claude/settings hooks 등)을 **옵트인 + 별 Sprint로 분리**. 일정/안전성/검토 양상 ↑.

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M6 | `.claude/rules/` 9 파일 복사 + 변수화 | 7/9 변수화 필요 (coding-style + sdd-triangle + git-workflow + tdd-workflow + testing + security + serverkit-cq). process-lifecycle.md + task-promotion.md는 변수화 0 (그대로 복사). | P1 |
| M7 | `.claude/settings.json` hooks 4종 (옵트인) | PreToolUse + PostToolUse + SessionStart + UserPromptSubmit. `--with-claude-hooks` 명시적 플래그. 신규 프로젝트 경로 + secret 재구성. | P1 |
| M8 | SPEC.md §1~§10 템플릿 | 빈 F-item(F001~) / REQ(REQ-001~) 시작점. 신규 프로젝트가 첫 F-item 등록부터 즉시 진행 가능. | P1 |
| M9 | bashrc 패치 (옵트인) | `--with-bashrc-patch` 플래그. 13 함수(wtsplit/ccs/ccw/sprint 5종/_cc 3종/...) markers 패턴 (`# ax-harness BEGIN/END`) + 백업 + AX_TARGET_HOME 감지 (S293 패턴 재활용). 미옵트시 source line 안내만 출력. | P1 |
| M10 | scripts/task/ + scripts/git-orphan-*.sh 복사 (옵트인) | `--with-scripts` 플래그. task-daemon.sh + sprint-merge-monitor.sh + git-orphan-scan/clean.sh. Foundry-X-specific 환경변수 제거. | P1 |

### 4.3 Should Have (Tier 1 보조, P1)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| S1 | Dogfood Sprint 1건 검증 | 임박 프로젝트에 install 후 첫 Sprint autopilot cycle (PR merge + smoke PASS) 수행 + retrospective | P1 |
| S2 | Dry-run 모드 (`--dry-run`) | 모든 변경 사항 미리 보기 (stdout + 가짜 install.log) | P1 |
| S3 | tmux conf + resurrect 플러그인 (옵트인) | `--with-tmux-patch`. S293 install-tmux-hooks.sh 흡수. | P1 |
| S4 | GitHub Repo 자동 생성 (gh CLI) | `gh repo create $ORG/$REPO --private --description "$DESCRIPTION"` 자동. 기존 Repo 있으면 skip. retry mechanism (R2 DeepSeek 권고 #5). | P1 |
| S5 | Cloudflare wrangler login 가이드 + 검증 | Preflight 단계에 통합. 미인증 시 가이드 출력 후 중단. | P1 |

### 4.4 제외 범위 (Out of Scope)

| 항목 | 사유 |
|------|------|
| Public release 공개 출간 (MIT/Apache, 마케팅, 커뮤니티) | 본인 내부용 한정 |
| Non-Foundry-X 스택 분기 (Node 서버 / Next.js / Vercel / 외부 BaaS) | Foundry-X 동일 스택 전제 |
| 팀원 온보딩 문서 | Sinclair 본인 우선, AX BD팀 7명 확대는 차후 |
| Backwards-compat (기존 프로젝트 in-place upgrade) | 신규 프로젝트만 대상 |
| Slack/email 외부 알림 연동 | 내부 사용 한정, 터미널 안내만 |
| 멀티 클라우드 / 하이브리드 환경 (AWS/Azure/GCP) | Cloudflare 종속 의도적 |
| 멀티유저 운영 + 세분화된 권한 관리 | 본인 단일 사용자 운영 |
| 템플릿 drift 자동화 (Foundry-X ↔ ax-harness-kit 자동 동기화) | 수동 점검만, 자동화는 별 F-item으로 분리 |

### 4.5 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| KTDS-AXBD/ax-marketplace | git push (PR + 1.2.0 minor 버전업) | 필수 |
| Cloudflare ktds-axbd 계정 | wrangler CLI + secret put (sub-name) | 필수 |
| GitHub 신규 Org/Repo | gh CLI repo create + secret 등록 (CLOUDFLARE_API_TOKEN 등) | 필수 |
| ~/.bashrc | install.sh --with-bashrc-patch 옵트인 패치 | 옵트인 (Tier 2) |
| ~/.tmux.conf | install.sh --with-tmux-patch 옵트인 패치 | 옵트인 (S3) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 신규 프로젝트 시동 시간 | ~며칠 (수동) | ≤ 5분 (install) + ≤ 7일 (첫 Sprint 완결) | install timestamp + Sprint MERGED timestamp |
| Install 명령 실행 시간 (preflight+install+verify) | N/A | ≤ 5분 | `time /ax:init-harness ...` |
| Idempotent 재실행 안전성 | N/A | 100% (2회 실행 시 변경 0) | `diff` 2회차 vs 1회차 |
| Foundry-X 수준 autopilot Sprint cycle 완결 | 0건 | ≥ 1건 (PR merge + smoke PASS) | GitHub PR API + Cloudflare wrangler tail |
| Foundry-X-specific 하드코딩 잔존 | 149 파일 (사전 측정) | 0건 (verify 단계 grep) | `grep -r "ktds-axbd\|Foundry-X" --include="*.toml" --include="*.yml" ...` |
| Preflight 사전 점검 항목 | N/A | git+pnpm+wrangler+gh+bash+Node 22+CF auth+GH auth = 8개 PASS | preflight.sh 출력 |
| Smoke PASS 구체 기준 | "200 응답" 모호 | (1) `/healthz` 200 + (2) GitHub Actions deploy.yml green + (3) D1 migration applied + (4) `wrangler tail` 30s runtime error 0 | 4-축 다단계 검증 |

### 5.2 MVP 최소 기준 (Tier 1 한정)

- [ ] `/ax:init-harness <project-name> <github-org/repo> "<description>"` 호출 시 M1~M5 자동 적용
- [ ] Preflight 단계가 환경 미충족 즉시 명확 가이드 출력
- [ ] Install 시간 ≤ 5분 + dry-run 모드 제공
- [ ] Verify 단계가 grep + smoke probe + idempotency 2회 diff 0건 확증
- [ ] Foundry-X-specific 식별자 변수화 + 잔존 0건 (Tier 1 범위 파일에서)
- [ ] 임박 프로젝트 1건 시동 후 첫 Sprint autopilot cycle 완결 (PR merge + smoke 4-축 PASS)

### 5.3 실패/중단 조건

- W20 종료 시점(5/25)에도 임박 프로젝트 Tier 1 시동 못 함 → 매뉴얼 셋업 + ax-harness-kit 일정 재산정
- Install 후 Verify 단계 grep 결과 5건 이상 잔존 → 변수화 부족, 추가 라운드 필요
- Verify 단계 idempotency diff > 0 → 멱등성 미충족, 보완 필요

### 5.4 비기능 요구사항

| # | 요구사항 | 검증 방법 |
|---|---------|----------|
| NFR1 | **멱등성**: 2회 이상 실행 시 변경 0건 | `verify.sh` 2차 diff |
| NFR2 | **백업**: 모든 ~/.bashrc, ~/.tmux.conf 등 수정 시 `.bak.{timestamp}` | `ls -la ~/.bashrc.bak.*` |
| NFR3 | **Dry-run**: `--dry-run` 옵션 | stdout 비교 |
| NFR4 | **Error rollback**: install 중 실패 시 자동 복구 (부분 적용 상태 → 백업 복원) | 의도적 오류 삽입 테스트 |
| NFR5 | **Cross-WSL 호환**: AX_TARGET_HOME 자동 감지 (real HOME vs .claude-work) | WSL2 + Linux Native 2 환경 smoke |
| NFR6 | **Secret 보호**: install 중 secret 평문 0 (wrangler secret put 경로만 안내) | install.log grep |
| NFR7 | **옵트인**: bashrc/tmux/scripts/hooks 4종 모두 명시적 플래그 필요 | M6/M7/M9/M10/S3 각각 |

---

## 6. 제약 조건

### 6.1 일정

- 목표 완료일: **W20 (2026-05-25) Tier 1 MVP** + **W21~W22 Tier 2 확장 (Phase 2)**
- 마일스톤:
  - M1 (5/20): SPEC §5 F-item 등록 (Tier 1 / Tier 2) + Sprint 시동
  - M2 (5/22): Tier 1 M1~M3 (init-harness 스킬 + 3단계 스크립트 + 변수 치환)
  - M3 (5/24): Tier 1 M4~M5 (monorepo 골격 + Cloudflare 배포) + 1차 Dogfood
  - M4 (5/25): Tier 1 MVP 완결 + retrospective
  - M5 (5/26~5/29): Tier 2 M6 (.claude/rules) + M8 (SPEC 템플릿) (Phase 2-A)
  - M6 (5/30~6/1): Tier 2 M7 (claude hooks) + M9 (bashrc) + M10 (scripts) (Phase 2-B)

### 6.2 기술 스택 (Foundry-X 동일)

- **프론트엔드**: React 18 + Vite 8 + React Router 7 + Zustand
- **백엔드**: Hono + Cloudflare Workers + D1
- **CLI**: Commander + Ink 5 + TypeScript
- **인프라**: Cloudflare Pages + Workers + D1 (ktds-axbd 계정, sub-name 분리)
- **모노리포**: pnpm workspace + Turborepo
- **언어**: TypeScript strict mode, Node 22 (`.nvmrc` 22)
- **기존 시스템 의존**:
  - Foundry-X repo (원본 코드 추출 소스, drift 수동 모니터)
  - ax-marketplace repo (target 호스팅, 1.2.0 minor 버전업)
  - ax-config repo (S293 install-tmux-hooks.sh 패턴 재활용)
  - tmux 3.6a (S213 build + S307 패턴)

### 6.3 인력/예산

- **투입 가능 인원**: 1명 (Sinclair Seo, AI Foundry W19+ F-item과 동시 진행 가능)
- **예산 규모**: Cloudflare ktds-axbd 계정 sub-name 추가 비용 = 0원 (기존 무료 tier)
- **추가 외부 비용**: 0원

### 6.4 컴플라이언스

- **KT DS 내부 정책**: ktds.axbd@gmail.com 계정 자산 보존(자산명 ktds-axbd, Foundry-X 등 코드 식별자 유지, Phase 0 정책 동일)
- **보안 요구사항**: secret 평문 저장 금지(.dev.vars 0644+gitignore), wrangler secret put 경로 강제
- **외부 규제**: 본인 내부용이라 GDPR/개인정보보호법 적용 0

---

## 7. R2 조건 반영 항목 (정성 판단 근거)

R2에서 3-AI Conditional 일관 수렴 4개 조건을 prd-final에 직접 반영:

| # | R2 조건 | 본 PRD 반영 위치 |
|---|---------|-----------------|
| 1 | MVP M1~M5로 공식 축소, M6~M10 Phase 2 분리 | §4.1 Tier 1 / §4.2 Tier 2 / §6.1 마일스톤 M2~M4 (Tier 1) + M5~M6 (Phase 2) |
| 2 | bashrc/tmux 자동 패치 옵트인 | §4.2 M9/M7 + §4.3 S3 모두 `--with-*-patch` 명시적 플래그 / NFR7 |
| 3 | 설치 프로세스 preflight→install→verify 3단계 재설계 | §2.2 To-Be 3-step + §4.1 M2 (3 스크립트 분리) + §5.1 KPI "Preflight 8 항목" |
| 4 | Foundry-X 변수화 grep 사전 분석 | §2.1 As-Is (149 ktds-axbd 등 수치) + §4.1 M3 (4-카테고리 분류) + §5.1 KPI "Foundry-X 잔존 0건" |

### 추가 R2 권고 반영

| R2 권고 | 본 PRD 반영 |
|---------|-----------|
| DeepSeek 외부 API fallback / retry | §4.3 S4 retry mechanism + §6.2 외부 의존 명시 |
| ChatGPT 템플릿 drift 방지 | §4.4 Out-of-scope에 "자동화" 명시(수동만), §6.2 "Foundry-X repo drift 수동 모니터" |
| Gemini 임박 프로젝트 확정 | §7 오픈 이슈 #1 미해소 (M1 5/20 마감) |
| ChatGPT 멀티 환경 테스트 | NFR5 "WSL2 + Linux Native 2 환경 smoke" |
| ChatGPT 보안 UX 강화 | NFR6 + Preflight에 wrangler/gh 인증 사전 점검 |

---

## 8. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | ~~임박 프로젝트의 이름/도메인 명확화 (현재 TBD, 가칭 'project-X')~~ → **확정: '제안TF 지원 플랫폼'** (S364, 2026-05-19). 영문 GitHub repo 이름은 Sprint 400 시동 시 확정 (후보: `proposal-tf-platform`) | Sinclair Seo | ✅ M1 충족 (S364) |
| 2 | Foundry-X-specific 식별자 4-카테고리 분류 정착 (조직명/경로/시드/콘텐츠) | 구현 단계 M2 | M2 (5/22) |
| 3 | bashrc 패치 markers 패턴 vs source line만 (S293 install-tmux-hooks.sh 참조) | 구현 단계 Phase 2-B | M6 (6/1) |
| 4 | D1 migration 시작 번호 정책 (0001부터 vs Foundry-X 그대로) | 구현 단계 M3 | M3 (5/24) |
| 5 | scripts/task/ 의 SPEC.md 의존 제거 또는 신규 프로젝트 SPEC.md 자동 인식 | 구현 단계 Phase 2-B | M6 (6/1) |
| 6 | Foundry-X drift 수동 모니터 주기 (월 1회 / Sprint 종료 시) | Sinclair Seo | M5 (5/29) |
| 7 | ax-marketplace 1.2.0 release tag 정책 (init-harness 추가만 vs 누적) | Sinclair Seo | M1 (5/20) |

---

## 9. 충분도 종합 판정

### 9.1 Scorecard (R2 자동 채점)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 R2 충분도 스코어카드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
항목 1: 가중 이슈 밀도      [  0 / 20 ]  (발산 - PRD 길이 +157줄 효과)
항목 2: Ready 판정 비율     [ 15 / 30 ]  3-AI 모두 Conditional (조건 일관 수렴)
항목 3: 핵심 요소 커버리지  [ 24 / 30 ]
항목 4: 다관점 반영 여부    [ 20 / 20 ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총점: 59/100 (자동 채점 발산)
```

### 9.2 Ambiguity Score (Brownfield 가중치, prd-final 기준)

| Dimension | Clarity | Weight | Score |
|-----------|:-------:|:------:|:-----:|
| Goal      | 0.85    | 0.35   | 0.2975 |
| Constraint| 0.85    | 0.25   | 0.2125 |
| Success   | 0.80    | 0.25   | 0.2000 |
| Context   | 0.90    | 0.15   | 0.1350 |
| **Total** |         |        | **0.845** |

**Ambiguity = 1 − 0.845 = 0.155 → ≤ 0.2 ✅ Ready**

### 9.3 통합 판정 매트릭스 (Phase 4-C)

| 지표 | 결과 | 판정 |
|------|------|------|
| R2 Scorecard | 59/100 | ❌ 미달 (자동 발산) |
| Ambiguity Score | 0.155 | ✅ Ready |
| 3-AI Conditional 조건 수렴 | 4핵심 일관 (MVP 축소 / 옵트인 / 3단계 / grep 사전) | ✅ 선명 |
| R2 조건 4 반영 | 본 prd-final §7 직접 반영 | ✅ 완결 |
| 사용자 정성 판단 | "정성 판단 → prd-final" (S364) | ✅ 착수 |

**최종 판정**: ⚠️ → ✅ (R2 발산은 PRD 길이 증가 효과로 해석, Ambiguity 0.155 Ready + 3-AI 조건 일관 수렴 + 사용자 정성 판단 동시 충족)

> **메타 학습**: S361 (75→72 발산 후 정성 판단) 패턴 본 세션 재적용. 발산 패턴이 PRD 품질 저하가 아닌 검토 대상 확대임을 정량(Ambiguity 0.155)과 정성(3-AI 조건 일관) 두 축으로 입증. ouroboros 패턴 + 정성 판단 우선 원칙 정착화.

---

## 10. 다음 단계 (Phase 6)

### 10.1 SPEC §5 F-item 등록 후보

ax-harness-kit MVP는 Tier 1 + Tier 2로 분리되어 F-item을 4~5개로 등록 권고:

| F-item | 제목 | Tier | Sprint | 마일스톤 |
|--------|------|------|--------|----------|
| F666 | ax-harness-kit Tier 1 — 3단계 스킬 + 변수 치환 + 4-package 골격 (FX-REQ-728) | Tier 1 | Sprint 400 | M2 |
| F667 | ax-harness-kit Tier 1 — Cloudflare 배포 + Dogfood 1건 (FX-REQ-729) | Tier 1 | Sprint 401 | M3+M4 |
| F668 | ax-harness-kit Tier 2-A — .claude/rules 변수화 + SPEC.md 템플릿 (FX-REQ-730) | Tier 2 | Sprint 402 | M5 |
| F669 | ax-harness-kit Tier 2-B — bashrc + tmux + scripts 옵트인 (FX-REQ-731) | Tier 2 | Sprint 403 | M6 |
| F670 | ax-harness-kit Phase 3 — claude hooks 4종 + Foundry-X drift 수동 점검 (FX-REQ-732) | Tier 2 | Sprint 403~404 | M6 |

> 5 F-item 분리 권고는 Tier별 + 마일스톤별 분리 원칙. autopilot 단일 Sprint 부담 ≤ 30분 유지.

### 10.2 Sprint 시동 트리거

다음 세션에서 사용자가:
1. SPEC §5 F666~F670 등록 (master 직접 commit, meta-only)
2. `/ax:sprint 400` 시동 또는 deferred 결정

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다. Phase 5 정리 후 archive/로 v1, v2, review/round-1, review/round-2 이동.*
