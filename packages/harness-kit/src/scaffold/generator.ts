import Handlebars from "handlebars";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";
import type { MonorepoScaffoldOptions, ScaffoldOptions } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");
const MONOREPO_TEMPLATES_DIR = path.join(TEMPLATES_DIR, "monorepo");
const OPT_IN_DIR = path.join(TEMPLATES_DIR, "opt-in");

export async function generateScaffold(
  options: ScaffoldOptions,
): Promise<string[]> {
  const outputDir =
    options.outputDir ?? path.join(process.cwd(), options.name);
  const createdFiles: string[] = [];
  const context = {
    name: options.name,
    serviceId: options.serviceId,
    accountId: options.accountId ?? "<YOUR_ACCOUNT_ID>",
    dbName: options.dbName ?? `${options.name}-db`,
    harnessKitVersion: "workspace:*",
  };

  await walkTemplates(TEMPLATES_DIR, outputDir, context, createdFiles);
  return createdFiles;
}

// F666: 4-package monorepo scaffold
export async function generateMonorepoScaffold(
  options: MonorepoScaffoldOptions,
): Promise<string[]> {
  const outputDir =
    options.outputDir ?? path.join(process.cwd(), options.projectName);
  const createdFiles: string[] = [];

  // F673: d1Created/gitInitialized — SETUP.md.hbs 조건 분기용
  let d1Created = false;
  let gitInitialized = false;

  const context: Record<string, unknown> = {
    projectName: options.projectName,
    githubOrg: options.githubOrg,
    githubOrgLower: options.githubOrg.toLowerCase(),
    githubRepo: options.githubRepo,
    description: options.description,
    cloudflareAccount: options.cloudflareAccount ?? "b6c06059b413892a92f150e5ca496236",
    workerSubdomain: options.workerSubdomain ?? options.projectName,
    d1Created: false,
    gitInitialized: false,
  };

  await walkTemplates(MONOREPO_TEMPLATES_DIR, outputDir, context, createdFiles);

  // F669 opt-in flags
  if (options.withBashrcPatch) {
    await walkTemplates(path.join(OPT_IN_DIR, "bashrc-patch"), outputDir, context, createdFiles);
  }
  if (options.withTmuxPatch) {
    await walkTemplates(path.join(OPT_IN_DIR, "tmux-patch"), outputDir, context, createdFiles);
  }
  if (options.withScripts) {
    await walkTemplates(path.join(OPT_IN_DIR, "scripts"), outputDir, context, createdFiles);
  }
  // F670 Phase 3
  if (options.withClaudeHooks) {
    await walkTemplates(path.join(OPT_IN_DIR, "claude-hooks"), outputDir, context, createdFiles);
  }

  // F673 I-1: D1 ID inject (수동 override)
  if (options.d1DatabaseId) {
    injectD1Id(outputDir, options.d1DatabaseId);
  }

  // F673 I-1: wrangler d1 create 자동 실행
  if (options.withD1Create && options.cloudflareAccount && !options.d1DatabaseId) {
    const extractedId = await runD1Create(options.projectName, options.cloudflareAccount, outputDir);
    if (extractedId) {
      d1Created = true;
    }
  }

  // F673 I-2: SETUP.md 재렌더링 (d1Created/gitInitialized 값이 결정된 후)
  if (d1Created || gitInitialized) {
    rewriteSetupMd(outputDir, { ...context, d1Created, gitInitialized });
  }

  // F673 I-3: git init 자동화
  if (options.withGitInit) {
    gitInitialized = await runGitInit(outputDir);
  }

  return createdFiles;
}

function rewriteSetupMd(outputDir: string, ctx: Record<string, unknown>): void {
  const setupMdSrc = path.join(MONOREPO_TEMPLATES_DIR, "SETUP.md.hbs");
  if (!fs.existsSync(setupMdSrc)) return;
  const compiled = Handlebars.compile(fs.readFileSync(setupMdSrc, "utf-8"));
  fs.writeFileSync(path.join(outputDir, "SETUP.md"), compiled(ctx));
}

// F673: D1 ID를 wrangler.toml에 inject (<RUN:...> 및 <SAME_DATABASE_ID_AS_ABOVE> 교체)
function injectD1Id(outputDir: string, id: string): void {
  const wranglerPath = path.join(outputDir, "packages", "api", "wrangler.toml");
  if (!fs.existsSync(wranglerPath)) return;
  let content = fs.readFileSync(wranglerPath, "utf-8");
  content = content.replace(/<RUN:[^>]+>/g, id);
  content = content.replace(/<SAME_DATABASE_ID_AS_ABOVE>/g, id);
  fs.writeFileSync(wranglerPath, content);
}

// F673: wrangler d1 create 실행 + ID 추출 + inject
async function runD1Create(
  projectName: string,
  accountId: string,
  outputDir: string,
): Promise<string | null> {
  const result = await execFileNoThrow(
    "npx",
    ["wrangler", "d1", "create", `${projectName}-db`, "--account-id", accountId],
    { cwd: outputDir },
  );
  if (result.status === "ok") {
    const match = /database_id\s*=\s*"([^"]+)"/.exec(result.stdout);
    if (match?.[1]) {
      injectD1Id(outputDir, match[1]);
      return match[1];
    }
  }
  console.warn(`[harness-kit] wrangler d1 create 실패 — SETUP.md 수동 가이드를 따라주세요.`);
  return null;
}

// F673: git init + add + initial commit
async function runGitInit(outputDir: string): Promise<boolean> {
  if (fs.existsSync(path.join(outputDir, ".git"))) {
    console.warn("[harness-kit] .git 이미 존재 — git init skip");
    return false;
  }
  const init = await execFileNoThrow("git", ["init"], { cwd: outputDir });
  if (init.status === "error") {
    console.warn(`[harness-kit] git init 실패 — 수동으로 진행하세요.`);
    return false;
  }
  await execFileNoThrow("git", ["add", "."], { cwd: outputDir });
  const commit = await execFileNoThrow(
    "git",
    ["commit", "-m", "chore: initial scaffold (harness-kit)"],
    { cwd: outputDir },
  );
  if (commit.status === "error") {
    console.warn(`[harness-kit] git commit 실패 — 수동으로 진행하세요.`);
    return false;
  }
  return true;
}

async function walkTemplates(
  templateDir: string,
  outputDir: string,
  context: Record<string, unknown>,
  createdFiles: string[],
): Promise<void> {
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    if (entry.isDirectory()) {
      const destDir = path.join(outputDir, entry.name);
      fs.mkdirSync(destDir, { recursive: true });
      await walkTemplates(srcPath, destDir, context, createdFiles);
    } else if (entry.name.endsWith(".hbs")) {
      const destName = entry.name.replace(".hbs", "");
      const destPath = path.join(outputDir, destName);
      const templateSrc = fs.readFileSync(srcPath, "utf-8");
      const compiled = Handlebars.compile(templateSrc);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, compiled(context));
      if (destName.endsWith(".sh")) fs.chmodSync(destPath, 0o755);
      createdFiles.push(destPath);
    } else {
      const destPath = path.join(outputDir, entry.name);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      createdFiles.push(destPath);
    }
  }
}
