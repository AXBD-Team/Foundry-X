# Sprint 400 Report — F666 ax-harness-kit Tier 1

**Sprint**: 400 | **F-item**: F666 | **Date**: 2026-05-19 | **Status**: ✅ MERGED

---

## 1. Summary

Foundry-X에서 정착한 BD 라이프사이클 자동화 인프라를 신규 프로젝트에 이식하는
`ax-harness-kit Tier 1`의 핵심 구성요소를 완성했어요.

- **Match Rate**: 99% (Design vs Implementation)
- **TDD**: T1~T6 all PASS (67/67 harness-kit tests, 0 regressions)
- **Typecheck**: PASS (tsc --noEmit, S337 turbo cache 우회)

---

## 2. 구현 결과

### 신규 파일 (27개)

| 영역 | 파일 수 | 핵심 파일 |
|------|--------|----------|
| packages/harness-kit/src | 3 | types.ts (MonorepoScaffoldOptions), generator.ts (generateMonorepoScaffold), cli/init-monorepo.ts |
| packages/harness-kit/templates/monorepo | 22 | root 6 + api 5 + web 5 + cli 3 + shared 3 |
| ax-marketplace/skills/init-harness | 4 | SKILL.md + preflight.sh + install.sh + verify.sh |

### 수정 파일 (2개)

| 파일 | 변경 내용 |
|------|----------|
| packages/harness-kit/src/cli/index.ts | initMonorepoCommand 추가 |
| ax-marketplace/CLAUDE.md | 24→25개 스킬, init-harness 등록 |

---

## 3. TDD 결과 (T1~T6)

| 테스트 | 검증 내용 | 결과 |
|--------|----------|------|
| T1 | 4-package 디렉토리 구조 (api/web/cli/shared + root 6 files) | ✅ PASS |
| T2 | projectName 변수 치환 (root package.json + wrangler.toml) | ✅ PASS |
| T3 | githubOrg → lowercase npm 스코프 (@my-org/my-project-api) | ✅ PASS |
| T4 | cloudflareAccount → wrangler.toml account_id | ✅ PASS |
| T5 | 멱등성 — 2회 실행 동일 결과 | ✅ PASS |
| T6 | Foundry-X/ktds-axbd 식별자 0건 | ✅ PASS |

**harness-kit 전체**: 67/67 PASS (기존 61 + 신규 T1~T6 6개)

---

## 4. Gap Analysis (99%)

| 섹션 | Match | 비고 |
|------|-------|------|
| §2 타입 설계 | 100% | 7/7 fields |
| §3 generateMonorepoScaffold() | 100% | +githubOrgLower 합리적 보강 |
| §4 4-package 템플릿 (22 files) | 100% | 22/22 |
| §5 TDD T1~T6 | 100% | 6/6 |
| §6 bash 스크립트 | 83% | verify.sh 멱등성 검증 방식 차이 (T5 unit test로 대체, 기능 동등) |
| §7 SKILL.md | 100% | 3/3 |
| §8 Stage 3 Exit | 100% | D1~D4 |

**가중 평균**: **99%** ✅ (≥90% 충족)

---

## 5. Phase Exit Smoke Reality (P-a~P-h)

| # | 항목 | 결과 |
|---|------|------|
| P-a | preflight 8항 구현 | ✅ (필수 4 + 선택 4, exit 1 + warn 분기) |
| P-b | 변수 치환 후 Foundry-X 식별자 0건 | ✅ T6 PASS 확인 |
| P-c | 멱등성 | ✅ T5 PASS (unit test 직접 검증) |
| P-d | 4-package 구조 | ✅ T1 PASS |
| P-e | typecheck PASS | ✅ (pnpm exec tsc --noEmit, S337 적용) |
| P-f | msa-lint | ✅ (harness-kit 변경 파일 린트 에러 0, api 기존 에러 비영향) |
| P-g | report.md + velocity 생성 | ✅ (이 파일 + sprint-400.json) |
| P-h | sprint streak | ✅ Sprint 400 (64 sprint streak 달성) |

---

## 6. 메타 학습

1. **harness-kit 재활용**: 기존 Handlebars 단일 Workers scaffold → 4-package monorepo scaffold로 확장. `walkTemplates()`에 plain file copy 브랜치 추가로 `.nvmrc`/`.gitignore`/`tsconfig.json` 비`.hbs` 파일도 처리.

2. **githubOrgLower 보강**: npm 패키지명은 소문자 규약. `KTDS-AXBD` → `ktds-axbd` 자동 변환을 context에 미리 계산. T3 테스트 통과의 핵심.

3. **verify.sh vs unit test**: Design은 "verify.sh에서 2차 dry-run diff"를 명세했지만 T5 unit test가 더 정확하게 멱등성을 검증. bash script는 구조 검증, unit test는 내용 검증으로 역할 분리. Design 역동기화 필요.

4. **ax-marketplace 동기화 8곳 준수**: source(ax-marketplace skills) → cache(1.1.0/skills) 수동 cp + CLAUDE.md 양쪽 업데이트.

---

## 7. 의존/후속

| F-item | 의존 | 다음 단계 |
|--------|------|----------|
| F667 | F666 ✅ | Cloudflare 배포 인프라 (wrangler.toml + deploy.yml + d1-migrate-remote.sh) |
| F668 | F666 ✅ | .claude/rules/ 9 파일 변수화 + SPEC.md 템플릿 |
| F669 | F666 ✅ | bashrc + tmux + scripts/task 옵트인 |
