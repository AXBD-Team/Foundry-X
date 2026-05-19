# Sprint 402 Design — F668 ax-harness-kit Tier 2-A

> **Sprint**: 402 | **F-item**: F668 | **REQ**: FX-REQ-730  
> **작성일**: 2026-05-19 | **담당**: Sinclair Seo

---

## §1. 아키텍처 개요

`walkTemplates()` 함수는 이미 `.hbs` 확장자를 Handlebars로 처리하고, plain 파일은 그대로 복사한다.
신규 구현은 **템플릿 파일 추가만** — `generator.ts` 로직 변경 없음.

```
packages/harness-kit/src/scaffold/templates/monorepo/
  .claude/
    rules/
      coding-style.md.hbs      ← 신규 (Handlebars)
      sdd-triangle.md.hbs      ← 신규 (Handlebars)
      git-workflow.md.hbs      ← 신규 (Handlebars)
      tdd-workflow.md.hbs      ← 신규 (Handlebars)
      testing.md.hbs           ← 신규 (Handlebars)
      security.md.hbs          ← 신규 (Handlebars)
      serverkit-cq.md.hbs      ← 신규 (Handlebars)
      process-lifecycle.md     ← 신규 (plain copy)
      task-promotion.md        ← 신규 (plain copy)
  SPEC.md.hbs                  ← 신규 (Handlebars)
```

---

## §2. Handlebars 컨텍스트 변수

`generateMonorepoScaffold()` → `context` 객체:

| 변수 | 예시 | 출처 |
|------|------|------|
| `{{projectName}}` | `my-proj` | `options.projectName` |
| `{{githubOrg}}` | `MY-ORG` | `options.githubOrg` |
| `{{githubOrgLower}}` | `my-org` | `options.githubOrg.toLowerCase()` |
| `{{githubRepo}}` | `my-repo` | `options.githubRepo` |
| `{{description}}` | `My Project` | `options.description` |
| `{{cloudflareAccount}}` | `b6c...` | `options.cloudflareAccount` |
| `{{workerSubdomain}}` | `my-proj` | `options.workerSubdomain ?? projectName` |

---

## §3. 변수 치환 맵

### 3-1. 공통: 제목 치환 (7개 파일)

| 파일 | 원본 | 치환 후 |
|------|------|---------|
| `coding-style.md.hbs` | `# Foundry-X Coding Style` | `# {{projectName}} Coding Style` |
| `sdd-triangle.md.hbs` | `# Foundry-X SDD Triangle` | `# {{projectName}} SDD Triangle` |
| `sdd-triangle.md.hbs` | `— Foundry-X 핵심 철학` | `— {{projectName}} 핵심 철학` |
| `git-workflow.md.hbs` | `# Foundry-X Git Workflow` | `# {{projectName}} Git Workflow` |
| `tdd-workflow.md.hbs` | `# Foundry-X TDD Workflow` | `# {{projectName}} TDD Workflow` |
| `testing.md.hbs` | `# Foundry-X Testing Rules` | `# {{projectName}} Testing Rules` |
| `security.md.hbs` | `# Foundry-X Security Rules` | `# {{projectName}} Security Rules` |
| `serverkit-cq.md.hbs` | `> Foundry-X ServerKit Native MVP` | `> {{projectName}} ServerKit Native MVP` |

### 3-2. security.md.hbs 추가 치환

| 원본 | 치환 후 |
|------|---------|
| `fx.minu.best` | `{{projectName}}.pages.dev` |
| `foundry-x-api` | `{{workerSubdomain}}-api` |

### 3-3. serverkit-cq.md.hbs 추가 치환

| 원본 | 치환 후 |
|------|---------|
| `fx-serverkit-native` | `serverkit-native` |

### 3-4. SPEC.md.hbs

`{{projectName}}`, `{{description}}`, `{{githubOrg}}`, `{{githubRepo}}` 치환.
§1~§10 구조 포함 (Overview, Architecture, Development Commands, Current Phase, Deployment, Skill 사용 가이드, MSA 원칙, Key References, Gotchas, Changelog).

---

## §4. 테스트 계약 (TDD Red Target)

### T11: 9개 rules 파일 존재 확인
```typescript
it("T11: should generate .claude/rules/ with 9 rule files", async () => {
  const rulesDir = path.join(outputDir, ".claude", "rules");
  const EXPECTED_RULES = [
    "coding-style.md", "sdd-triangle.md", "git-workflow.md",
    "tdd-workflow.md", "testing.md", "security.md",
    "serverkit-cq.md", "process-lifecycle.md", "task-promotion.md",
  ];
  for (const f of EXPECTED_RULES) {
    expect(fs.existsSync(path.join(rulesDir, f))).toBe(true);
  }
});
```

### T12: projectName 변수 치환 + 원본 식별자 0건
```typescript
it("T12: should replace {{projectName}} in all hbs rules files", async () => {
  const rulesDir = path.join(outputDir, ".claude", "rules");
  const HBS_FILES = [
    "coding-style.md", "sdd-triangle.md", "git-workflow.md",
    "tdd-workflow.md", "testing.md", "security.md", "serverkit-cq.md",
  ];
  for (const f of HBS_FILES) {
    const content = fs.readFileSync(path.join(rulesDir, f), "utf-8");
    expect(content).not.toContain("Foundry-X");
    expect(content).toContain(projectName);  // "test-proj"
  }
});
```

### T13: security.md workerSubdomain 치환
```typescript
it("T13: should replace workerSubdomain in security.md", async () => {
  const content = fs.readFileSync(path.join(rulesDir, "security.md"), "utf-8");
  expect(content).not.toContain("foundry-x-api");
  expect(content).not.toContain("fx.minu.best");
  expect(content).toContain(`${workerSubdomain}-api`);
});
```

### T14: SPEC.md 생성 + 변수 치환
```typescript
it("T14: should generate SPEC.md with project variables", async () => {
  const specPath = path.join(outputDir, "SPEC.md");
  expect(fs.existsSync(specPath)).toBe(true);
  const content = fs.readFileSync(specPath, "utf-8");
  expect(content).toContain(projectName);
  expect(content).not.toContain("Foundry-X");
  expect(content).not.toContain("foundry-x");
});
```

---

## §5. 파일 매핑 (Worker 파일 매핑)

| 작업 | 파일 | 신규/수정 |
|------|------|----------|
| T11~T14 Red 추가 | `packages/harness-kit/__tests__/scaffold/monorepo.test.ts` | 수정 |
| coding-style.md.hbs | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/coding-style.md.hbs` | 신규 |
| sdd-triangle.md.hbs | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/sdd-triangle.md.hbs` | 신규 |
| git-workflow.md.hbs | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/git-workflow.md.hbs` | 신규 |
| tdd-workflow.md.hbs | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/tdd-workflow.md.hbs` | 신규 |
| testing.md.hbs | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/testing.md.hbs` | 신규 |
| security.md.hbs | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/security.md.hbs` | 신규 |
| serverkit-cq.md.hbs | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/serverkit-cq.md.hbs` | 신규 |
| process-lifecycle.md | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/process-lifecycle.md` | 신규 |
| task-promotion.md | `packages/harness-kit/src/scaffold/templates/monorepo/.claude/rules/task-promotion.md` | 신규 |
| SPEC.md.hbs | `packages/harness-kit/src/scaffold/templates/monorepo/SPEC.md.hbs` | 신규 |

**수정 파일**: 1개 (테스트)  
**신규 파일**: 10개 (템플릿 9 + SPEC.md.hbs 1)  
**총 변경 파일**: 11개 (+ Plan 2 + Design 2 = 15개 포함)

---

## §6. 회귀 방지

- T6 (기존): forbidden patterns `["foundry-x", "Foundry-X", "ktds-axbd"]` — rules 파일 포함 전체 output 스캔
- T11~T14: 신규 커버리지 명시
- `walkTemplates`는 `.claude` 숨김 디렉토리를 `fs.readdirSync`로 정상 탐색 (Node.js 기본 동작)

---

## §7. 검증 명령

```bash
cd packages/harness-kit
pnpm exec vitest run --reporter=verbose
# → T1~T14 ALL PASS

pnpm exec tsc --noEmit
# → typecheck PASS (--force 없이도 OK, 신규 ts 파일 없음)
```
