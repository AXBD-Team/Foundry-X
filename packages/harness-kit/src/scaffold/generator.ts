import Handlebars from "handlebars";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
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
  const context = {
    projectName: options.projectName,
    githubOrg: options.githubOrg,
    githubOrgLower: options.githubOrg.toLowerCase(),
    githubRepo: options.githubRepo,
    description: options.description,
    cloudflareAccount: options.cloudflareAccount ?? "b6c06059b413892a92f150e5ca496236",
    workerSubdomain: options.workerSubdomain ?? options.projectName,
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

  return createdFiles;
}

async function walkTemplates(
  templateDir: string,
  outputDir: string,
  context: Record<string, string>,
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
      // plain file — copy as-is
      const destPath = path.join(outputDir, entry.name);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      createdFiles.push(destPath);
    }
  }
}
