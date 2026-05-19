// F666+F667 TDD — generateMonorepoScaffold() 4-package monorepo scaffold + Cloudflare deploy infra
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
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
});
