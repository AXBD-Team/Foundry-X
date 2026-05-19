# ax-harness-kit — 인터뷰 원문 기록

**일시**: 2026-05-19 (S364)
**진행자**: Claude Code (Opus 4.7) via /ax:req-interview
**응답자**: Sinclair Seo

---

## 0. 사전 분기 인터뷰 (Track 명확화)

사용자 요청: "현재까지 구성된 Harness를 다른 프로젝트에서 활용하고 싶음"

### Q1. Harness 범위
- ✅ ax skills 전체
- ✅ bashrc 함수 + 스크립트
- ✅ Sprint WT + Autopilot 사이클
- ✅ Governance 규칙 + 템플릿

→ **4 영역 풀세트 이식 확정**

### Q2. 이식 대상
- ✅ 범용 템플릿 (특정 프로젝트 X)

### Q3. 메커니즘
- ✅ ax-marketplace 플러그인 확장

### Q4. 진행 강도
- ✅ Full /ax:req-interview Phase 1~6

---

## 1. 코드네임

→ **ax-harness-kit** 확정 (ax-marketplace 컨벤션 일치)

---

## 2. Part 1: 왜 (목적/문제)

### 핵심 질문
> "이 Harness 이식 키트를 지금 만드는 근본 동기/시급성은 무엇인가요?"

### 응답
- ✅ **특정 신규 프로젝트 임박** (이번 주간 적용 필요)

### 도출
- 동기: 곧 시작할 신규 프로젝트가 1건 이상 대기 중
- 시급성: 이번 주 적용 필요 (W20)
- 비교: ax-config 단순 재배포 수준이 아닌, Foundry-X 수준 전체 자동화 인프라 즉시 가동

---

## 3. Part 2: 누구를 위해 (사용자/이해관계자)

### 핵심 질문
> "이걸 누가 사용하거나 영향을 받게 되나요?"

### 응답
- ✅ **Sinclair Seo 본인** (1차 타깃, 단일 사용자)

### 도출
- 주 사용자: Master Claude Code 사용자 (Sinclair Seo)
- 워크플로우: Foundry-X와 동일 (sprint WT autopilot, signal monitor, ax skills)
- 컴플라이언스 부담: 0 (본인 내부용)

---

## 4. Part 3: 무엇 (범위/기능)

### 핵심 질문
> "Core MVP 범위는 어떻게 잡을까요?"

### 응답
- ✅ **Tier 3: Foundry-X 특화 수준 전체 이식** (vendor-locked, 아키텍처 자체 강제)

### 도출 (포함 범위)
- ax-marketplace 전체 (24 skills + init-harness 신규 추가)
- bashrc 설정 (sprint, wtsplit, ccs/ccw, monitor 함수)
- scripts/task/ (task-daemon.sh + task-* 시리즈)
- scripts/git-orphan-*.sh
- .claude/rules/ 9 파일 전체
- .claude/settings.json hooks 4종
- Cloudflare 배포 (deploy.yml + wrangler.toml + d1-migrate-remote.sh + pnpm monorepo 4-package 골격)
- SPEC.md §1~§10 템플릿

---

## 5. Part 4: 어떻게 판단할 것인가 (성공 기준)

### 핵심 질문
> "'ax-harness-kit이 성공했다'는 어떤 최소 촭제로 판단할까요?"

### 응답
- ✅ **신규 프로젝트 1건 1주일 내 안정 시동** + **Foundry-X 수준 1건 명령 완결 (PR merge + smoke PASS)**

### 도출
- 정량 지표: 1건 임박 프로젝트 시동 시간 ≤ 7일
- 품질 지표: 1건 Sprint autopilot 완결 (PR merge + smoke PASS)
- 비교 기준: Foundry-X autopilot 평균 사이클 시간 (~10~20분 수준)

---

## 6. Part 5: 제약과 리소스 (현실 조건)

### Part 5-a: 임박 프로젝트 성격/스택
- ✅ **Foundry-X 동일 스택** (Cloudflare Workers + D1 + Pages + pnpm monorepo + Hono + React + Vite + TS)

### Part 5-b: 일정
- ✅ **이번 주간 (W20, 5/19~5/25)** MVP 완성

### Part 5-c: 외부 의존
- ✅ ax-marketplace plugin 추가 (KTDS-AXBD/ax-marketplace PR)
- ✅ Cloudflare 계정 공유 또는 보고 (ktds-axbd 계정 재사용)
- ✅ GitHub 신규 Org/Repo 생성 (신규 프로젝트 리포)

### Part 5-d: Out-of-scope
- ✅ Public release 공개 출간 (MIT/Apache 라이선스, 마케팅, 커뮤니티 관리)
- ✅ Non-Foundry-X 스택 분기 (Node 서버 등)

---

## 7. 보완 인터뷰

### 보완 1: 임박 프로젝트 이름/도메인
- ✅ **TBD - 아직 이름 미정** (PRD에 가칭 'project-X' 명시)

### 보완 2: ax-harness-kit 저장 위치
- ✅ **ax-marketplace 안 새 plugin 추가** (init-harness 스킬, 1.1.0 → 1.2.0)

### 보완 3: Cloudflare 전략
- ✅ **기존 ktds-axbd 계정 재사용** (sub-name 분리: {project}-api.ktds-axbd.workers.dev)

### 보완 4: Install 최소 파라미터
- ✅ GitHub org/repo 이름
- ✅ Project description/도메인 설명

---

## 8. 인터뷰 종료 확인

사용자 응답: "정확 - PRD v1 작성 진행 (Recommended)" — 인터뷰 내용 정확 확인 + PRD v1 작성 승인

---

## 9. 인터뷰 메타데이터

- 진행 시간: ~10분 (사전 분기 1회 + Part 1~4 batch + Part 5 batch + 보완 batch + 요약 확인 = 5회 AskUserQuestion)
- 인터뷰 트리 준수: ✅ (한 번에 묶음 4 질문 patterns, interaction-patterns.md 준수)
- SCOPE LOCKED: ✅ (Tier 3 풀세트, 단일 사용자, W20 일정, CF 동일 스택, 4 Out-of-scope)
- 사전 컨텍스트 활용: ✅ (S363 ServerKit Native MVP Dogfood 직후, Foundry-X 자체 무경험 0, Phase 47 진행 중)
