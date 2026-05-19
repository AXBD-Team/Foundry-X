/** 서비스 식별자 (Sprint 179 service-mapping.md 기반) */
export type ServiceId =
  | "foundry-x"
  | "discovery-x"
  | "ai-foundry"
  | "gate-x"
  | "launch-x"
  | "eval-x";

/** Workers 환경 바인딩 (필수 공통) */
export interface HarnessEnv {
  DB: D1Database;
  JWT_SECRET: string;
  CACHE?: KVNamespace;
  [key: string]: unknown;
}

/** harness-kit 설정 */
export interface HarnessConfig {
  serviceName: string;
  serviceId: ServiceId;
  corsOrigins: string[];
  publicPaths?: string[];
  jwtAlgorithm?: string; // default: 'HS256'
}

/** scaffold 옵션 */
export interface ScaffoldOptions {
  name: string; // 서비스명 (kebab-case)
  serviceId: ServiceId;
  accountId?: string; // Cloudflare account ID
  dbName?: string; // D1 database name
  outputDir?: string; // 출력 디렉토리
}

/** F666 monorepo scaffold 옵션 (4-package: api/web/cli/shared) */
export interface MonorepoScaffoldOptions {
  projectName: string; // kebab-case, 예: "proposal-tf-platform"
  githubOrg: string; // GitHub org, 예: "KTDS-AXBD"
  githubRepo: string; // GitHub repo 이름, 예: "proposal-tf-platform"
  description: string; // 프로젝트 설명
  cloudflareAccount?: string; // Cloudflare account ID
  workerSubdomain?: string; // Workers sub-name (default: projectName)
  outputDir?: string; // 출력 디렉토리 (default: cwd/{projectName})
  // F669 Tier 2-B opt-in flags
  withBashrcPatch?: boolean; // M9: ~/.bashrc 13함수 패치 스크립트 생성
  withTmuxPatch?: boolean; // S3: tmux + resurrect 설치 스크립트 생성
  withScripts?: boolean; // M10: scripts/task/ + git-orphan 스크립트 생성
  // F670 Phase 3 opt-in flag
  withClaudeHooks?: boolean; // M7: .claude/settings.json hooks 4종 + hook scripts 생성
  // F673 I-1 D1 auto-create
  withD1Create?: boolean; // wrangler d1 create 자동 실행 후 wrangler.toml inject
  d1DatabaseId?: string; // 수동 ID 주입 (wrangler 호출 없이 직접 inject)
  // F673 I-3 git init
  withGitInit?: boolean; // git init + initial commit 자동
}
