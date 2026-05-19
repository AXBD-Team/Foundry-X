# Sprint 402 Report — F668 ax-harness-kit Tier 2-A

> **Sprint**: 402 | **F-item**: F668 | **Match Rate**: 100% | **Status**: ✅ DONE  
> **날짜**: 2026-05-19 | **담당**: Sinclair Seo

---

## §1. 요약

`packages/harness-kit` monorepo scaffold 템플릿에 `.claude/rules/` 9개 파일과 `SPEC.md.hbs`를 추가했다.

- **7개 `.hbs` 템플릿**: Foundry-X 고유 식별자 → Handlebars 변수 치환
- **2개 plain copy**: `process-lifecycle.md`, `task-promotion.md` (Foundry-X 식별자 없음 확인)
- **SPEC.md.hbs**: §1~§10 구조의 프로젝트 명세 템플릿

---

## §2. 구현 내역

| 파일 | 처리 | 변수 |
|------|------|------|
| `coding-style.md.hbs` | Handlebars | `{{projectName}}` |
| `sdd-triangle.md.hbs` | Handlebars | `{{projectName}}` × 2 |
| `git-workflow.md.hbs` | Handlebars | `{{projectName}}` |
| `tdd-workflow.md.hbs` | Handlebars | `{{projectName}}` |
| `testing.md.hbs` | Handlebars | `{{projectName}}` |
| `security.md.hbs` | Handlebars | `{{projectName}}`, `{{workerSubdomain}}-api`, `{{projectName}}.pages.dev` |
| `serverkit-cq.md.hbs` | Handlebars | `{{projectName}}`, `fx-serverkit-native` → `serverkit-native` |
| `process-lifecycle.md` | plain copy | — |
| `task-promotion.md` | plain copy | — |
| `SPEC.md.hbs` | Handlebars | `{{projectName}}`, `{{description}}`, `{{githubOrg}}`, `{{githubRepo}}`, `{{workerSubdomain}}` |

---

## §3. 테스트 결과

| 테스트 | 결과 |
|--------|------|
| T1~T10 (F666/F667 기존) | ✅ PASS (회귀 없음) |
| T11: `.claude/rules/` 9개 파일 존재 | ✅ PASS |
| T12: projectName 치환 + "Foundry-X" 0건 | ✅ PASS |
| T13: security.md workerSubdomain + pages.dev 치환 | ✅ PASS |
| T14: SPEC.md 생성 + 변수 치환 | ✅ PASS |
| **총계** | **75/75 PASS** |

---

## §4. Gap Analysis

| 항목 | Design | 구현 | 일치 |
|------|--------|------|------|
| `.hbs` 파일 7개 | ✅ | ✅ | ✅ |
| plain copy 2개 | ✅ | ✅ | ✅ |
| SPEC.md.hbs | ✅ | ✅ | ✅ |
| T11~T14 Red→Green | ✅ | ✅ | ✅ |

**Match Rate: 100%**

---

## §5. DoD 체크리스트

- [x] P-a: T11~T14 TDD Red FAIL 커밋 (`56e2b853`)
- [x] P-b: T11~T14 TDD Green PASS (75/75)
- [x] P-c: T1~T10 회귀 없음
- [x] P-d: T6 forbidden patterns 0건 (생성된 rules 파일에 "Foundry-X", "foundry-x", "ktds-axbd" 없음)
- [x] P-e: SPEC.md.hbs §1~§10 구조 포함
- [x] P-f: typecheck PASS (--force, 0 cached)
- [x] P-g: msa-lint — 신규 .ts 파일 없음, 기존 PASS 유지
- [x] P-h: Gap Match Rate 100%
- [x] P-i: Sprint Report + velocity.json 생성

---

## §6. 메타 학습

1. **`walkTemplates` 숨김 디렉토리 처리**: Node.js `fs.readdirSync`는 `.claude` 같은 dot-directory를 기본 포함 → 별도 설정 없이 템플릿 탐색 가능
2. **Handlebars 복합 표현식**: `{{workerSubdomain}}-api` 처럼 변수와 리터럴 결합이 추가 helper 없이 동작
3. **plain copy 검증**: `process-lifecycle.md`, `task-promotion.md`는 grep으로 Foundry-X 식별자 0건 확인 후 plain copy 결정 (템플릿 오버엔지니어링 방지)

---

## §7. 커밋 이력

| 커밋 | 설명 |
|------|------|
| `56e2b853` | test(harness-kit): F668 red — T11~T14 추가 |
| `1f74b55c` | feat(harness-kit): F668 green — .claude/rules 9 files + SPEC.md.hbs |
