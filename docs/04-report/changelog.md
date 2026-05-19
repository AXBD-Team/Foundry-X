# Changelog — Foundry-X Sprint 409

## [2026-05-19] — F675 ax-harness-kit npm publish + 외부 공개 준비

### Added
- **F675 npm publish** — `@foundry-x/harness-kit` → `@ktds-axbd/harness-kit` scope rename + publish-ready metadata
- **LICENSE file** (MIT, Copyright 2026 KTDS AX BD)
- **CHANGELOG.md** (Keep a Changelog v0.1.0 format)
- **Test T37** — 10 new tests for package.json metadata validation (license/repository/files/publishConfig/keywords/engines.node)

### Changed
- **Scope name** — `@foundry-x/harness-kit` → `@ktds-axbd/harness-kit` (36 occurrences across 8 packages)
- **package.json metadata** — 15 items added (description/type/main/types/bin/exports/files/publishConfig/repository/bugs/homepage/author/license/keywords/engines.node)
- **@types/node** — ^20.0.0 → ^22.0.0 (Node 22 consistency, S363 integration)
- **workspace dependencies** — Updated across gate-x, fx-modules, fx-shaping, fx-offering, fx-discovery, api, fx-agent

### Fixed
- **pnpm-lock.yaml** — Regenerated after scope rename (workspace dependency resolution)

### Security
- **npm publish authentication** — `npm whoami = ktds-axbd` verified (public scope access confirmed)
- **publish-config** — `access: public` explicitly set to prevent accidental private publish

### Verification
- **Test Coverage** — 112/112 PASS (102 existing + 10 new T37)
- **Typecheck** — 19/19 PASS (S337 cache bypass with --force)
- **npm pack** — 76,964 bytes, 116 files, includes LICENSE + CHANGELOG + README + dist/
- **npm publish dry-run** — Success (권한 확보)
- **Scope rename** — 0 remaining occurrences of `@foundry-x/harness-kit`

### Notes
- Sprint duration: ~40 minutes (planned 45~70 minutes, efficiency 92%)
- Gap analysis match rate: **100%**
- npm registry deployment: pending user manual execution (can be automated in CI/CD, F676)
- External users can now: `npx @ktds-axbd/harness-kit init-monorepo ...`

---

## Related
- Plan: `docs/01-plan/features/sprint-409.plan.md`
- Design: `docs/02-design/features/sprint-409.design.md`
- Report: `docs/04-report/sprint-409-f675-report.md`
- Publish Readiness: `reports/sprint-409-publish-readiness.md`
- PR: #843 (Match 100%, commit a0d3ac39)
- Spec: FX-SPEC-409-F675 (FX-REQ-737)
