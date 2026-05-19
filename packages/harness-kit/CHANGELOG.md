# Changelog

All notable changes to `@ktds-axbd/harness-kit` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-19

### Added

- Initial release: AX BD Cloudflare Workers MSA scaffold + harness CLI
- `harness init-monorepo` — 4-package scaffold (api/web/cli/shared) with Cloudflare Workers
- `harness create` — single service scaffold
- Middleware exports:
  - `createAuthMiddleware` — JWT + PBKDF2 authentication
  - `createCorsMiddleware` — CORS configuration
  - `rbac` — Role-Based Access Control
  - `errorHandler` — unified error handling
  - `createStranglerMiddleware` — Strangler Fig pattern for gradual migration
- D1 utilities (`@ktds-axbd/harness-kit/d1`): `getDb`, `runQuery`, `runExec`
- Event Bus (`@ktds-axbd/harness-kit/events`): `D1EventBus`, `NoopEventBus`, `createEvent`
- ESLint plugin (`@ktds-axbd/harness-kit/eslint`): `harnessKitPlugin` with MSA boundary rules
- Scaffold opt-in flags:
  - `--with-bashrc-patch` — bash aliases + sprint automation
  - `--with-tmux-patch` — tmux session management
  - `--with-scripts` — utility scripts (git-orphan-scan, etc.)
  - `--with-claude-hooks` — Claude Code hooks + settings
  - `--with-d1-create` — D1 database auto-creation via Cloudflare API
  - `--with-git-init` — git init + initial commit
- Auto-generated `SETUP.md` with project-specific configuration steps
- Node version consistency CI gate (`verify-node-consistency.yml`)
- 3-way Node version consistency check (`.nvmrc` / `engines.node` / `deploy.yml`)
- 102 vitest tests passing

[Unreleased]: https://github.com/KTDS-AXBD/Foundry-X/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/KTDS-AXBD/Foundry-X/releases/tag/v0.1.0
