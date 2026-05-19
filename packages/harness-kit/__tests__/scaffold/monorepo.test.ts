// F666+F667+F668+F669+F674 TDD — generateMonorepoScaffold() 4-package monorepo scaffold + opt-in flags
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { generateMonorepoScaffold } from "../../src/scaffold/generator.js";

describe("generateMonorepoScaffold", () => {
  const tmpDirs: string[] = [];

  function createTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "monorepo-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  // T1: 4-package 디렉토리 구조 생성
  it("T1: should create 4-package directory structure", async () => {
    const outputDir = path.join(createTmpDir(), "test-project");
    await generateMonorepoScaffold({
      projectName: "test-project",
      githubOrg: "TEST-ORG",
      githubRepo: "test-project",
      description: "Test Project",
      outputDir,
    });

    // root 파일
    expect(fs.existsSync(path.join(outputDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "turbo.json"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, ".nvmrc"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "pnpm-workspace.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "tsconfig.base.json"))).toBe(true);

    // 4-package 존재
    expect(fs.existsSync(path.join(outputDir, "packages", "api"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "packages", "web"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "packages", "cli"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "packages", "shared"))).toBe(true);

    // api 핵심 파일
    expect(fs.existsSync(path.join(outputDir, "packages", "api", "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "packages", "api", "wrangler.toml"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "packages", "api", "src", "index.ts"))).toBe(true);
  });

  // T2: PROJECT_NAME 변수 치환
  it("T2: should substitute projectName", async () => {
    const outputDir = path.join(createTmpDir(), "proposal-tf-platform");
    await generateMonorepoScaffold({
      projectName: "proposal-tf-platform",
      githubOrg: "KTDS-AXBD",
      githubRepo: "proposal-tf-platform",
      description: "제안TF 지원 플랫폼",
      outputDir,
    });

    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(outputDir, "package.json"), "utf-8")
    );
    expect(rootPkg.name).toBe("proposal-tf-platform");

    const wrangler = fs.readFileSync(
      path.join(outputDir, "packages", "api", "wrangler.toml"),
      "utf-8"
    );
    expect(wrangler).toContain('name = "proposal-tf-platform-api"');
  });

  // T3: GITHUB_ORG 변수 치환
  it("T3: should substitute githubOrg in package names", async () => {
    const outputDir = path.join(createTmpDir(), "my-project");
    await generateMonorepoScaffold({
      projectName: "my-project",
      githubOrg: "MY-ORG",
      githubRepo: "my-project",
      description: "My Project",
      outputDir,
    });

    const apiPkg = JSON.parse(
      fs.readFileSync(path.join(outputDir, "packages", "api", "package.json"), "utf-8")
    );
    expect(apiPkg.name).toBe("@my-org/my-project-api");

    const webPkg = JSON.parse(
      fs.readFileSync(path.join(outputDir, "packages", "web", "package.json"), "utf-8")
    );
    expect(webPkg.name).toBe("@my-org/my-project-web");
  });

  // T4: CLOUDFLARE_ACCOUNT 변수 치환
  it("T4: should substitute cloudflareAccount in wrangler.toml", async () => {
    const outputDir = path.join(createTmpDir(), "cf-project");
    await generateMonorepoScaffold({
      projectName: "cf-project",
      githubOrg: "TEST-ORG",
      githubRepo: "cf-project",
      description: "CF Project",
      cloudflareAccount: "abc123def456",
      outputDir,
    });

    const wrangler = fs.readFileSync(
      path.join(outputDir, "packages", "api", "wrangler.toml"),
      "utf-8"
    );
    expect(wrangler).toContain('account_id = "abc123def456"');
  });

  // T5: 멱등성 — 2회 실행 동일 결과
  it("T5: should be idempotent — 2nd run produces same output", async () => {
    const outputDir = path.join(createTmpDir(), "idempotent-project");
    const opts = {
      projectName: "idempotent-project",
      githubOrg: "TEST-ORG",
      githubRepo: "idempotent-project",
      description: "Idempotent Test",
      cloudflareAccount: "idem-account",
      outputDir,
    };

    await generateMonorepoScaffold(opts);
    const wrangler1 = fs.readFileSync(
      path.join(outputDir, "packages", "api", "wrangler.toml"),
      "utf-8"
    );

    await generateMonorepoScaffold(opts);
    const wrangler2 = fs.readFileSync(
      path.join(outputDir, "packages", "api", "wrangler.toml"),
      "utf-8"
    );

    expect(wrangler1).toBe(wrangler2);
  });

  // T6: Foundry-X 식별자 0건
  it("T6: should not contain Foundry-X or ktds-axbd identifiers", async () => {
    const outputDir = path.join(createTmpDir(), "clean-project");
    await generateMonorepoScaffold({
      projectName: "clean-project",
      githubOrg: "CLEAN-ORG",
      githubRepo: "clean-project",
      description: "Clean Project",
      cloudflareAccount: "clean-account",
      outputDir,
    });

    const forbiddenPatterns = ["foundry-x", "Foundry-X", "ktds-axbd"];

    function checkDir(dir: string): string[] {
      const violations: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          violations.push(...checkDir(fullPath));
        } else {
          const content = fs.readFileSync(fullPath, "utf-8");
          for (const pattern of forbiddenPatterns) {
            if (content.includes(pattern)) {
              violations.push(`${fullPath}: contains "${pattern}"`);
            }
          }
        }
      }
      return violations;
    }

    const violations = checkDir(outputDir);
    expect(violations).toEqual([]);
  });

  // T7: F667 — wrangler.toml [env.dev] + [env.production] sub-name 분리
  it("T7: should include [env.dev] and [env.production] sub-name sections in wrangler.toml", async () => {
    const outputDir = path.join(createTmpDir(), "proj-x");
    await generateMonorepoScaffold({
      projectName: "proj-x",
      githubOrg: "TEST-ORG",
      githubRepo: "proj-x",
      description: "Proj X",
      cloudflareAccount: "abc123",
      outputDir,
    });

    const wrangler = fs.readFileSync(
      path.join(outputDir, "packages", "api", "wrangler.toml"),
      "utf-8"
    );
    expect(wrangler).toContain('[env.dev]');
    expect(wrangler).toContain('name = "proj-x-api-dev"');
    expect(wrangler).toContain('[env.production]');
    expect(wrangler).toContain('name = "proj-x-api-production"');
  });

  // T8: F667 — .github/workflows/deploy.yml 생성 + D1 migration step
  it("T8: should generate .github/workflows/deploy.yml with D1 migration step", async () => {
    const outputDir = path.join(createTmpDir(), "proj-x");
    await generateMonorepoScaffold({
      projectName: "proj-x",
      githubOrg: "TEST-ORG",
      githubRepo: "proj-x",
      description: "Proj X",
      outputDir,
    });

    const deployYml = path.join(outputDir, ".github", "workflows", "deploy.yml");
    expect(fs.existsSync(deployYml)).toBe(true);

    const content = fs.readFileSync(deployYml, "utf-8");
    expect(content).toContain("d1 migrations apply");
    expect(content).toContain("proj-x-db");
    expect(content).toContain("node-version: 22");
  });

  // T9: F667 — deploy.yml smoke-test job 존재
  it("T9: should generate deploy.yml with smoke-test job", async () => {
    const outputDir = path.join(createTmpDir(), "proj-y");
    await generateMonorepoScaffold({
      projectName: "proj-y",
      githubOrg: "TEST-ORG",
      githubRepo: "proj-y",
      description: "Proj Y",
      outputDir,
    });

    const content = fs.readFileSync(
      path.join(outputDir, ".github", "workflows", "deploy.yml"),
      "utf-8"
    );
    expect(content).toContain("smoke-test:");
  });

  // T10: F667 — scripts/d1-migrate-remote.sh 생성 + 프로젝트 변수 치환
  it("T10: should generate scripts/d1-migrate-remote.sh with project variables", async () => {
    const outputDir = path.join(createTmpDir(), "proj-z");
    await generateMonorepoScaffold({
      projectName: "proj-z",
      githubOrg: "TEST-ORG",
      githubRepo: "proj-z",
      description: "Proj Z",
      cloudflareAccount: "test-account-id",
      outputDir,
    });

    const migrateScript = path.join(outputDir, "scripts", "d1-migrate-remote.sh");
    expect(fs.existsSync(migrateScript)).toBe(true);

    const content = fs.readFileSync(migrateScript, "utf-8");
    expect(content).toContain("proj-z");
    expect(content).toContain("test-account-id");
  });

  // T11: F668 — .claude/rules/ 9개 파일 생성 확인
  it("T11: should generate .claude/rules/ directory with 9 rule files", async () => {
    const outputDir = path.join(createTmpDir(), "rules-test");
    await generateMonorepoScaffold({
      projectName: "rules-test",
      githubOrg: "TEST-ORG",
      githubRepo: "rules-test",
      description: "Rules Test",
      outputDir,
    });

    const rulesDir = path.join(outputDir, ".claude", "rules");
    expect(fs.existsSync(rulesDir)).toBe(true);

    const EXPECTED_RULES = [
      "coding-style.md",
      "sdd-triangle.md",
      "git-workflow.md",
      "tdd-workflow.md",
      "testing.md",
      "security.md",
      "serverkit-cq.md",
      "process-lifecycle.md",
      "task-promotion.md",
    ];
    for (const f of EXPECTED_RULES) {
      expect(fs.existsSync(path.join(rulesDir, f))).toBe(true);
    }
  });

  // T12: F668 — Handlebars .hbs 파일에서 projectName 치환, "Foundry-X" 0건
  it("T12: should replace projectName in hbs rules files and remove Foundry-X identifiers", async () => {
    const projectName = "my-new-proj";
    const outputDir = path.join(createTmpDir(), projectName);
    await generateMonorepoScaffold({
      projectName,
      githubOrg: "MY-ORG",
      githubRepo: "my-new-proj",
      description: "My New Project",
      outputDir,
    });

    const rulesDir = path.join(outputDir, ".claude", "rules");
    const HBS_FILES = [
      "coding-style.md",
      "sdd-triangle.md",
      "git-workflow.md",
      "tdd-workflow.md",
      "testing.md",
      "security.md",
      "serverkit-cq.md",
    ];
    for (const f of HBS_FILES) {
      const content = fs.readFileSync(path.join(rulesDir, f), "utf-8");
      expect(content, `${f} should not contain 'Foundry-X'`).not.toContain("Foundry-X");
      expect(content, `${f} should contain projectName`).toContain(projectName);
    }
  });

  // T13: F668 — security.md workerSubdomain + pages.dev 치환
  it("T13: should replace workerSubdomain and pages URL in security.md", async () => {
    const projectName = "sec-proj";
    const workerSubdomain = "sec-worker";
    const outputDir = path.join(createTmpDir(), projectName);
    await generateMonorepoScaffold({
      projectName,
      githubOrg: "TEST-ORG",
      githubRepo: projectName,
      description: "Sec Proj",
      workerSubdomain,
      outputDir,
    });

    const content = fs.readFileSync(
      path.join(outputDir, ".claude", "rules", "security.md"),
      "utf-8"
    );
    expect(content).not.toContain("foundry-x-api");
    expect(content).not.toContain("fx.minu.best");
    expect(content).toContain(`${workerSubdomain}-api`);
    expect(content).toContain(`${projectName}.pages.dev`);
  });

  // T14: F668 — SPEC.md.hbs → SPEC.md 생성 + projectName 치환
  it("T14: should generate SPEC.md with project variables and no Foundry-X identifiers", async () => {
    const projectName = "spec-proj";
    const outputDir = path.join(createTmpDir(), projectName);
    await generateMonorepoScaffold({
      projectName,
      githubOrg: "SPEC-ORG",
      githubRepo: "spec-proj",
      description: "Spec Project",
      outputDir,
    });

    const specPath = path.join(outputDir, "SPEC.md");
    expect(fs.existsSync(specPath)).toBe(true);

    const content = fs.readFileSync(specPath, "utf-8");
    expect(content).toContain(projectName);
    expect(content).not.toContain("Foundry-X");
    expect(content).not.toContain("foundry-x");
    expect(content).not.toContain("ktds-axbd");
  });

  // T15: F669 — withBashrcPatch:true → scripts/setup/patch-bashrc.sh 생성
  it("T15: should generate patch-bashrc.sh when withBashrcPatch is true", async () => {
    const outputDir = path.join(createTmpDir(), "bashrc-proj");
    await generateMonorepoScaffold({
      projectName: "bashrc-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "bashrc-proj",
      description: "Bashrc Test",
      withBashrcPatch: true,
      outputDir,
    });
    expect(fs.existsSync(path.join(outputDir, "scripts", "setup", "patch-bashrc.sh"))).toBe(true);
  });

  // T16: F669 — patch-bashrc.sh에 ax-harness markers + 13 함수명 포함
  it("T16: should include ax-harness markers and all 13 function names in patch-bashrc.sh", async () => {
    const outputDir = path.join(createTmpDir(), "bashrc-fns");
    await generateMonorepoScaffold({
      projectName: "bashrc-fns",
      githubOrg: "TEST-ORG",
      githubRepo: "bashrc-fns",
      description: "Bashrc Functions",
      withBashrcPatch: true,
      outputDir,
    });
    const content = fs.readFileSync(
      path.join(outputDir, "scripts", "setup", "patch-bashrc.sh"),
      "utf-8"
    );
    expect(content).toContain("# ax-harness BEGIN");
    expect(content).toContain("# ax-harness END");
    const expectedFunctions = [
      "wtsplit", "_cc_billing_guard", "_cc_remove_api_key",
      "ccs", "ccw", "_sprint_ensure_monitor",
      "sprint()", "sprint-review", "sprint-pr", "sprint-done",
      "ccw-sprint", "ccw-auto", "sprints",
    ];
    for (const fn of expectedFunctions) {
      expect(content, `patch-bashrc.sh should contain '${fn}'`).toContain(fn);
    }
  });

  // T17: F669 — patch-bashrc.sh에 AX_TARGET_HOME 감지 패턴 포함
  it("T17: should include AX_TARGET_HOME detection in patch-bashrc.sh", async () => {
    const outputDir = path.join(createTmpDir(), "bashrc-env");
    await generateMonorepoScaffold({
      projectName: "bashrc-env",
      githubOrg: "TEST-ORG",
      githubRepo: "bashrc-env",
      description: "Bashrc Env",
      withBashrcPatch: true,
      outputDir,
    });
    const content = fs.readFileSync(
      path.join(outputDir, "scripts", "setup", "patch-bashrc.sh"),
      "utf-8"
    );
    expect(content).toContain("AX_TARGET_HOME");
    expect(content).toContain("getent passwd");
  });

  // T18: F669 — withTmuxPatch:true → scripts/setup/patch-tmux.sh 생성
  it("T18: should generate patch-tmux.sh when withTmuxPatch is true", async () => {
    const outputDir = path.join(createTmpDir(), "tmux-proj");
    await generateMonorepoScaffold({
      projectName: "tmux-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "tmux-proj",
      description: "Tmux Test",
      withTmuxPatch: true,
      outputDir,
    });
    expect(fs.existsSync(path.join(outputDir, "scripts", "setup", "patch-tmux.sh"))).toBe(true);
  });

  // T19: F669 — withScripts:true → scripts/task/ 필수 파일 생성
  it("T19: should generate scripts/task/ with required files when withScripts is true", async () => {
    const outputDir = path.join(createTmpDir(), "scripts-proj");
    await generateMonorepoScaffold({
      projectName: "scripts-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "scripts-proj",
      description: "Scripts Test",
      withScripts: true,
      outputDir,
    });
    const taskDir = path.join(outputDir, "scripts", "task");
    expect(fs.existsSync(path.join(taskDir, "task-daemon.sh"))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, "lib.sh"))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, "sprint-merge-monitor.sh"))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, "git-orphan-scan.sh"))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, "git-orphan-clean.sh"))).toBe(true);
  });

  // T20: F669 — task-daemon.sh에 'KTDS-AXBD/Foundry-X' literal 없음
  it("T20: task-daemon.sh should not contain KTDS-AXBD/Foundry-X literals", async () => {
    const outputDir = path.join(createTmpDir(), "no-fx-proj");
    await generateMonorepoScaffold({
      projectName: "no-fx-proj",
      githubOrg: "MY-ORG",
      githubRepo: "my-project",
      description: "No FX Test",
      withScripts: true,
      outputDir,
    });
    const content = fs.readFileSync(
      path.join(outputDir, "scripts", "task", "task-daemon.sh"),
      "utf-8"
    );
    expect(content).not.toContain("KTDS-AXBD/Foundry-X");
    expect(content).toContain("MY-ORG/my-project");
  });

  // T21: F669 — lib.sh에 '~/.foundry-x' literal 없음
  it("T21: lib.sh should not contain ~/.foundry-x literal in FX_HOME", async () => {
    const outputDir = path.join(createTmpDir(), "no-fxhome-proj");
    await generateMonorepoScaffold({
      projectName: "no-fxhome-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "no-fxhome-proj",
      description: "No FX Home Test",
      withScripts: true,
      outputDir,
    });
    const content = fs.readFileSync(
      path.join(outputDir, "scripts", "task", "lib.sh"),
      "utf-8"
    );
    expect(content).not.toContain("~/.foundry-x");
    expect(content).toContain("no-fxhome-proj");
  });

  // T22: F669 — 플래그 없으면 opt-in 파일 미생성
  it("T22: should not generate opt-in files when no flags are set", async () => {
    const outputDir = path.join(createTmpDir(), "no-flags-proj");
    await generateMonorepoScaffold({
      projectName: "no-flags-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "no-flags-proj",
      description: "No Flags Test",
      outputDir,
    });
    expect(fs.existsSync(path.join(outputDir, "scripts", "setup", "patch-bashrc.sh"))).toBe(false);
    expect(fs.existsSync(path.join(outputDir, "scripts", "setup", "patch-tmux.sh"))).toBe(false);
    expect(fs.existsSync(path.join(outputDir, "scripts", "task", "task-daemon.sh"))).toBe(false);
  });

  // T24: F670 — withClaudeHooks:true → .claude/settings.json 생성
  it("T24: should generate .claude/settings.json when withClaudeHooks is true", async () => {
    const outputDir = path.join(createTmpDir(), "hooks-proj");
    await generateMonorepoScaffold({
      projectName: "hooks-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "hooks-proj",
      description: "Hooks Test",
      withClaudeHooks: true,
      outputDir,
    });
    expect(fs.existsSync(path.join(outputDir, ".claude", "settings.json"))).toBe(true);
  });

  // T25: F670 — settings.json에 4 hook 타입 모두 포함
  it("T25: should include all 4 hook types in settings.json", async () => {
    const outputDir = path.join(createTmpDir(), "hooks-types-proj");
    await generateMonorepoScaffold({
      projectName: "hooks-types-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "hooks-types-proj",
      description: "Hooks Types Test",
      withClaudeHooks: true,
      outputDir,
    });
    const settings = JSON.parse(
      fs.readFileSync(path.join(outputDir, ".claude", "settings.json"), "utf-8")
    );
    expect(settings.hooks).toBeDefined();
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.UserPromptSubmit).toBeDefined();
  });

  // T26: F670 — settings.json hook commands에 $CLAUDE_PROJECT_DIR 사용 (hardcoded path 없음)
  it("T26: should use $CLAUDE_PROJECT_DIR in hook commands, not hardcoded paths", async () => {
    const outputDir = path.join(createTmpDir(), "hooks-path-proj");
    await generateMonorepoScaffold({
      projectName: "hooks-path-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "hooks-path-proj",
      description: "Hooks Path Test",
      withClaudeHooks: true,
      outputDir,
    });
    const content = fs.readFileSync(
      path.join(outputDir, ".claude", "settings.json"),
      "utf-8"
    );
    expect(content).toContain("$CLAUDE_PROJECT_DIR");
    expect(content).not.toContain("/home/sinclair");
    expect(content).not.toContain("foundry-x");
    expect(content).not.toContain("Foundry-X");
  });

  // T27: F670 — withClaudeHooks 없으면 .claude/settings.json 미생성
  it("T27: should not generate .claude/settings.json when withClaudeHooks is not set", async () => {
    const outputDir = path.join(createTmpDir(), "no-hooks-proj");
    await generateMonorepoScaffold({
      projectName: "no-hooks-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "no-hooks-proj",
      description: "No Hooks Test",
      outputDir,
    });
    expect(fs.existsSync(path.join(outputDir, ".claude", "settings.json"))).toBe(false);
  });

  // T28: F670 — withClaudeHooks:true → .claude/hooks/ 스크립트 + heartbeat + drift check 생성
  it("T28: should generate .claude/hooks/ scripts and heartbeat when withClaudeHooks is true", async () => {
    const outputDir = path.join(createTmpDir(), "hooks-scripts-proj");
    await generateMonorepoScaffold({
      projectName: "hooks-scripts-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "hooks-scripts-proj",
      description: "Hooks Scripts Test",
      withClaudeHooks: true,
      outputDir,
    });
    const hooksDir = path.join(outputDir, ".claude", "hooks");
    expect(fs.existsSync(path.join(hooksDir, "pre-bash-guard.sh"))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, "post-edit-format.sh"))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, "post-edit-typecheck.sh"))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, "post-edit-test-warn.sh"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "scripts", "task", "heartbeat-hook.sh"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "scripts", "setup", "check-harness-drift.sh"))).toBe(true);
  });

  // T23: F669 — patch-bashrc.sh 실행 권한(0o755)
  it("T23: patch-bashrc.sh should be executable (chmod 755)", async () => {
    const outputDir = path.join(createTmpDir(), "chmod-proj");
    await generateMonorepoScaffold({
      projectName: "chmod-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "chmod-proj",
      description: "Chmod Test",
      withBashrcPatch: true,
      outputDir,
    });
    const scriptPath = path.join(outputDir, "scripts", "setup", "patch-bashrc.sh");
    const stat = fs.statSync(scriptPath);
    expect(stat.mode & 0o755).toBe(0o755);
  });

  // T24: F672 D-1 — root package.json에 pnpm.overrides.esbuild 존재
  it("T24: root package.json should have pnpm.overrides.esbuild (D-1 fix)", async () => {
    const outputDir = path.join(createTmpDir(), "esbuild-proj");
    await generateMonorepoScaffold({
      projectName: "esbuild-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "esbuild-proj",
      description: "EsBuild Test",
      outputDir,
    });
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(outputDir, "package.json"), "utf-8")
    );
    expect(rootPkg.pnpm).toBeDefined();
    expect(rootPkg.pnpm.overrides).toBeDefined();
    expect(rootPkg.pnpm.overrides.esbuild).toBeDefined();
  });

  // T25: F672 D-2 — cli/web/api package.json에 eslint devDep 존재
  it("T25: cli/web/api package.json should have eslint devDependencies (D-2 fix)", async () => {
    const outputDir = path.join(createTmpDir(), "eslint-proj");
    await generateMonorepoScaffold({
      projectName: "eslint-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "eslint-proj",
      description: "ESLint Test",
      outputDir,
    });
    for (const pkg of ["cli", "web", "api"]) {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(outputDir, "packages", pkg, "package.json"), "utf-8")
      );
      expect(pkgJson.devDependencies["eslint"], `${pkg} should have eslint`).toBeDefined();
      expect(pkgJson.devDependencies["@typescript-eslint/eslint-plugin"], `${pkg} should have @typescript-eslint/eslint-plugin`).toBeDefined();
      expect(pkgJson.devDependencies["@typescript-eslint/parser"], `${pkg} should have @typescript-eslint/parser`).toBeDefined();
    }
  });

  // T26: F672 D-3 — api src/__tests__/app.test.ts 파일 출력 존재
  it("T26: api should output src/__tests__/app.test.ts (D-3 fix)", async () => {
    const outputDir = path.join(createTmpDir(), "test-api-proj");
    await generateMonorepoScaffold({
      projectName: "test-api-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "test-api-proj",
      description: "API Test Fix",
      outputDir,
    });
    const testFile = path.join(outputDir, "packages", "api", "src", "__tests__", "app.test.ts");
    expect(fs.existsSync(testFile)).toBe(true);
  });

  // T27: F672 D-3 — app.test.ts 내용에 projectName 치환 및 smoke test 포함
  it("T27: app.test.ts should contain projectName and smoke test assertion", async () => {
    const outputDir = path.join(createTmpDir(), "smoke-proj");
    await generateMonorepoScaffold({
      projectName: "smoke-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "smoke-proj",
      description: "Smoke Test Project",
      outputDir,
    });
    const testContent = fs.readFileSync(
      path.join(outputDir, "packages", "api", "src", "__tests__", "app.test.ts"),
      "utf-8"
    );
    expect(testContent).toContain("smoke-proj");
    expect(testContent).toContain("/health");
    expect(testContent).toContain("toBeLessThan(500)");
    expect(testContent).toContain('import { app }');
  });

  // T28(F673): --d1-database-id 시 wrangler.toml의 <RUN: placeholder 0건
  it("T28(F673): should replace <RUN: placeholder with d1DatabaseId in wrangler.toml", async () => {
    const outputDir = path.join(createTmpDir(), "d1-id-proj");
    await generateMonorepoScaffold({
      projectName: "d1-id-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "d1-id-proj",
      description: "D1 ID Test",
      d1DatabaseId: "test-db-uuid-1234",
      outputDir,
    });

    const wrangler = fs.readFileSync(
      path.join(outputDir, "packages", "api", "wrangler.toml"),
      "utf-8"
    );
    expect(wrangler).not.toContain("<RUN:");
    expect(wrangler).not.toContain("<SAME_DATABASE_ID_AS_ABOVE>");
  });

  // T29(F673): --d1-database-id ID 값이 wrangler.toml에 inject됨
  it("T29(F673): should inject d1DatabaseId into wrangler.toml database_id fields", async () => {
    const outputDir = path.join(createTmpDir(), "d1-inject-proj");
    await generateMonorepoScaffold({
      projectName: "d1-inject-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "d1-inject-proj",
      description: "D1 Inject Test",
      d1DatabaseId: "my-unique-db-id-5678",
      outputDir,
    });

    const wrangler = fs.readFileSync(
      path.join(outputDir, "packages", "api", "wrangler.toml"),
      "utf-8"
    );
    const matches = (wrangler.match(/my-unique-db-id-5678/g) ?? []).length;
    expect(matches).toBeGreaterThanOrEqual(3);
  });

  // T30(F673): SETUP.md 생성 + d1Created=false 시 수동 안내 텍스트 포함
  it("T30(F673): should generate SETUP.md with manual d1 guide when d1Created is false", async () => {
    const outputDir = path.join(createTmpDir(), "setup-md-proj");
    await generateMonorepoScaffold({
      projectName: "setup-md-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "setup-md-proj",
      description: "Setup MD Test",
      outputDir,
    });

    const setupMd = path.join(outputDir, "SETUP.md");
    expect(fs.existsSync(setupMd)).toBe(true);

    const content = fs.readFileSync(setupMd, "utf-8");
    // 5 섹션 이상
    const sections = (content.match(/^## /gm) ?? []).length;
    expect(sections).toBeGreaterThanOrEqual(5);
    // d1Created=false이므로 수동 안내 포함
    expect(content).toContain("wrangler d1 create");
  });

  // T31(F673): --with-git-init 시 .git 디렉토리 생성
  it("T31(F673): should create .git directory when withGitInit is true", async () => {
    const outputDir = path.join(createTmpDir(), "git-init-proj");
    await generateMonorepoScaffold({
      projectName: "git-init-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "git-init-proj",
      description: "Git Init Test",
      withGitInit: true,
      outputDir,
    });

    expect(fs.existsSync(path.join(outputDir, ".git"))).toBe(true);
  });

  // T32(F673): scaffold 반환 file list에 SETUP.md 포함
  it("T32(F673): should include SETUP.md in returned file list", async () => {
    const outputDir = path.join(createTmpDir(), "filelist-proj");
    const files = await generateMonorepoScaffold({
      projectName: "filelist-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "filelist-proj",
      description: "File List Test",
      outputDir,
    });

    expect(files.some((f) => f.endsWith("SETUP.md"))).toBe(true);
  });

  // T33(F674): verify-node-consistency.sh 생성 + executable
  it("T33(F674): should generate scripts/setup/verify-node-consistency.sh and make it executable", async () => {
    const outputDir = path.join(createTmpDir(), "node-check-proj");
    await generateMonorepoScaffold({
      projectName: "node-check-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "node-check-proj",
      description: "Node Check Test",
      outputDir,
    });

    const scriptPath = path.join(outputDir, "scripts", "setup", "verify-node-consistency.sh");
    expect(fs.existsSync(scriptPath)).toBe(true);

    const mode = fs.statSync(scriptPath).mode;
    expect(mode & 0o111).not.toBe(0);
  });

  // T34(F674): node-consistency.yml 생성 + paths trigger 포함
  it("T34(F674): should generate .github/workflows/node-consistency.yml with .nvmrc path trigger", async () => {
    const outputDir = path.join(createTmpDir(), "workflow-proj");
    await generateMonorepoScaffold({
      projectName: "workflow-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "workflow-proj",
      description: "Workflow Test",
      outputDir,
    });

    const workflowPath = path.join(outputDir, ".github", "workflows", "node-consistency.yml");
    expect(fs.existsSync(workflowPath)).toBe(true);

    const content = fs.readFileSync(workflowPath, "utf-8");
    expect(content).toContain(".nvmrc");
    expect(content).toContain("paths:");
    expect(content).toContain("verify-node-consistency.sh");
  });

  // T35(F674): verify-node-consistency.sh 실행 — .nvmrc/package.json/workflow 3-way 정합 시 exit 0
  it("T35(F674): verify-node-consistency.sh exits 0 when .nvmrc/package.json/workflow are consistent", async () => {
    const outputDir = path.join(createTmpDir(), "consistency-proj");
    await generateMonorepoScaffold({
      projectName: "consistency-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "consistency-proj",
      description: "Consistency Test",
      outputDir,
    });

    // Update generated package.json to include engines.node matching .nvmrc (22)
    const pkgPath = path.join(outputDir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    // package.json.hbs already includes engines.node ">=22", verify it's there
    // If not, add it
    if (!pkg.engines?.node) {
      pkg.engines = { node: ">=22" };
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }

    const scriptPath = path.join(outputDir, "scripts", "setup", "verify-node-consistency.sh");
    const result = spawnSync("bash", [scriptPath], { cwd: outputDir, encoding: "utf-8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("✅");
  });

  // T36(F674): check-harness-drift.sh 실행 — 동일 rules 사용 시 drift 0
  it("T36(F674): check-harness-drift.sh exits 0 when project rules match reference", async () => {
    const outputDir = path.join(createTmpDir(), "drift-proj");
    await generateMonorepoScaffold({
      projectName: "drift-proj",
      githubOrg: "TEST-ORG",
      githubRepo: "drift-proj",
      description: "Drift Check Test",
      withClaudeHooks: true,
      outputDir,
    });

    const driftScript = path.join(outputDir, "scripts", "setup", "check-harness-drift.sh");
    expect(fs.existsSync(driftScript)).toBe(true);

    // Use generated .claude/rules as both project AND reference (copy to temp ref dir)
    const projectRulesDir = path.join(outputDir, ".claude", "rules");
    const refDir = path.join(createTmpDir(), "reference-rules");
    fs.mkdirSync(refDir, { recursive: true });
    for (const f of fs.readdirSync(projectRulesDir)) {
      fs.copyFileSync(path.join(projectRulesDir, f), path.join(refDir, f));
    }

    // git init required (check-harness-drift.sh uses `git rev-parse --show-toplevel`)
    spawnSync("git", ["init"], { cwd: outputDir });

    const result = spawnSync("bash", [driftScript, refDir], { cwd: outputDir, encoding: "utf-8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No drift detected");
  });
});
