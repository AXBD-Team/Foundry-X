# Sprint 402 Plan — F668 ax-harness-kit Tier 2-A

> **Sprint**: 402 | **F-item**: F668 | **REQ**: FX-REQ-730 | **Priority**: P1  
> **작성일**: 2026-05-19 | **담당**: Sinclair Seo

---

## §1. 목표

`packages/harness-kit`의 monorepo scaffold 템플릿에 `.claude/rules/` 9개 파일과 `SPEC.md` 템플릿을 추가한다.

- **Foundry-X 고유 식별자**(프로젝트명, 서브도메인 등)를 Handlebars 변수로 치환
- 7개 파일 → `.hbs` 템플릿, 2개 파일 → plain copy
- `SPEC.md.hbs` — §1~§10 구조의 SPEC 템플릿

---

## §2. 범위 (In-scope)

| # | 파일 | 처리 방식 | 주요 변수 치환 |
|---|------|----------|--------------|
| 1 | `coding-style.md.hbs` | Handlebars | `Foundry-X` → `{{projectName}}` (제목) |
| 2 | `sdd-triangle.md.hbs` | Handlebars | `Foundry-X` × 2 → `{{projectName}}` |
| 3 | `git-workflow.md.hbs` | Handlebars | `Foundry-X` → `{{projectName}}` (제목) |
| 4 | `tdd-workflow.md.hbs` | Handlebars | `Foundry-X` → `{{projectName}}` (제목) |
| 5 | `testing.md.hbs` | Handlebars | `Foundry-X` → `{{projectName}}` (제목) |
| 6 | `security.md.hbs` | Handlebars | `Foundry-X` → `{{projectName}}`, `foundry-x-api` → `{{workerSubdomain}}-api`, `fx.minu.best` → `{{projectName}}.pages.dev` |
| 7 | `serverkit-cq.md.hbs` | Handlebars | `Foundry-X` → `{{projectName}}`, `fx-serverkit-native` → `serverkit-native` |
| 8 | `process-lifecycle.md` | Plain copy | (없음) |
| 9 | `task-promotion.md` | Plain copy | (없음) |
| 10 | `SPEC.md.hbs` | Handlebars | `{{projectName}}`, `{{description}}`, `{{githubOrg}}`, `{{githubRepo}}` |

### Out-of-scope
- 기존 T1~T10 테스트 변경 없음
- `generator.ts` 로직 변경 없음 (`walkTemplates` 이미 `.hbs` 처리 완비)
- `.claude/rules/` 이외 다른 rules 파일 (global `~/.claude/rules/`)
- sprint-ops.md, sdd-triangle.md 이외 다른 rules 파일 추가

---

## §3. 사전 측정 (fs 실측)

```bash
# 템플릿 디렉토리 현황
ls packages/harness-kit/src/scaffold/templates/monorepo/
# → package.json.hbs, packages/, pnpm-workspace.yaml, scripts/, tsconfig.base.json, turbo.json.hbs
# → .claude/ 디렉토리 없음 → 신규 생성 필요

# 기존 테스트 T1~T10 확인
# → __tests__/scaffold/monorepo.test.ts 존재, T10까지 완료
# → T11~T14 신규 추가 필요

# process-lifecycle.md, task-promotion.md — Foundry-X 식별자 없음 확인
grep -n "Foundry-X\|foundry-x\|ktds-axbd" .claude/rules/process-lifecycle.md | wc -l  # → 0
grep -n "Foundry-X\|foundry-x\|ktds-axbd" .claude/rules/task-promotion.md | wc -l     # → 0
```

---

## §4. TDD 계획 (Red Phase 설계)

### T11: .claude/rules/ 9개 파일 생성 확인
```typescript
it("T11: should generate .claude/rules/ directory with 9 rule files", async () => {
  // 9개 파일 존재 확인
});
```

### T12: Handlebars 변수 치환 검증 (projectName)
```typescript
it("T12: should replace projectName in rules files", async () => {
  // coding-style.md, git-workflow.md, tdd-workflow.md 등 projectName 치환 확인
  // "Foundry-X" 잔존 0건 확인
});
```

### T13: security.md workerSubdomain 치환 검증
```typescript
it("T13: should replace workerSubdomain in security.md", async () => {
  // "foundry-x-api" 잔존 0건, "{{workerSubdomain}}-api" 치환 확인
});
```

### T14: SPEC.md.hbs → SPEC.md 생성 + 변수 치환
```typescript
it("T14: should generate SPEC.md with project metadata", async () => {
  // SPEC.md 존재 + projectName, githubOrg 치환 확인
});
```

---

## §5. 구현 계획

### Phase A: TDD Red (T11~T14 추가)
- `packages/harness-kit/__tests__/scaffold/monorepo.test.ts`에 T11~T14 추가
- `vitest run` → FAIL 확인

### Phase B: TDD Green (템플릿 생성)
- `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/` 디렉토리 생성
- 7개 `.hbs` 파일 작성 (변수 치환 포함)
- 2개 plain copy 파일 작성
- `SPEC.md.hbs` 작성

### Phase C: 검증
- `vitest run` → T1~T14 ALL PASS
- T6 forbidden patterns 검증 (rules 파일도 커버)

---

## §6. DoD (완료 기준)

- [ ] P-a: T11~T14 TDD Red FAIL 커밋 존재
- [ ] P-b: T11~T14 TDD Green PASS
- [ ] P-c: T1~T10 회귀 없음 (전체 테스트 PASS)
- [ ] P-d: T6 forbidden patterns 검증 — `coding-style.md` 등 생성 파일에 "Foundry-X", "foundry-x", "ktds-axbd" 0건
- [ ] P-e: SPEC.md.hbs 생성 + §1~§10 구조 포함
- [ ] P-f: `typecheck` PASS (--force, S337 룰)
- [ ] P-g: msa-lint PASS (CI 통과 기준)
- [ ] P-h: Gap Match Rate ≥ 90%
- [ ] P-i: Sprint Report + velocity.json 생성

---

## §7. 연관 F-item

- **F667**: Sprint 401 — ax-harness-kit Tier 1 (Cloudflare 배포 인프라 + Dogfood), baseline 제공
- **F668**: 본 sprint — Tier 2-A .claude/rules 변수화
