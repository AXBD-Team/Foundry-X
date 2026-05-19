import { Command } from "commander";
import { generateMonorepoScaffold } from "../scaffold/generator.js";

export const initMonorepoCommand = new Command("init-monorepo")
  .argument("<project-name>", "프로젝트명 (kebab-case)")
  .argument("<github-org>", "GitHub org (예: KTDS-AXBD)")
  .argument("<github-repo>", "GitHub repo 이름")
  .argument("<description>", "프로젝트 설명")
  .option("--cf-account <id>", "Cloudflare Account ID")
  .option("--worker-subdomain <name>", "Workers sub-name (기본: project-name)")
  .option("-o, --output <dir>", "출력 디렉토리")
  .action(
    async (
      projectName: string,
      githubOrg: string,
      githubRepo: string,
      description: string,
      opts,
    ) => {
      console.log(`Creating monorepo scaffold: ${projectName}...`);
      const files = await generateMonorepoScaffold({
        projectName,
        githubOrg,
        githubRepo,
        description,
        cloudflareAccount: opts.cfAccount,
        workerSubdomain: opts.workerSubdomain,
        outputDir: opts.output,
      });
      console.log(`Created ${files.length} files:`);
      files.forEach((f) => console.log(`  ${f}`));
    },
  );
