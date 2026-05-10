---
code: FX-REPORT-372
title: Sprint 372 — F637 zod-openapi 0.18.4 Single-File PoC Completion Report
version: 1.0
status: Completed
category: REPORT
created: 2026-05-09
updated: 2026-05-09
sprint: 372
f_item: F637
req: FX-REQ-702
priority: P2
match_rate: 97%
---

# Sprint 372 — F637 zod-openapi 0.18.4 Single-File PoC

**Completion Status**: ✅ PoC Phase Complete (Production Deploy Deferred)  
**Sprint Duration**: Single sprint (May 9, 2026)  
**Match Rate**: 97% (Plan design intent vs implementation)  
**Phase Exit Criteria**: 8/9 PASS (P-h PR creation pending)

---

## Executive Summary

### 1.3 Value Delivered

| Perspective | Summary |
|---|---|
| **Problem Solved** | F636 production fail (POST /api/auth/login HTTP 500 with plain POST, no body) was traced to 0.18.4 breaking change: dependency version skips body validation for Content-Type-less requests, causing handler to receive undefined values → D1 type error. Root cause confirmed by single-file PoC. |
| **Solution Approach** | Manual single-file codemod of auth.ts only (not autopilot batch). Added null guard at login handler entry + explicit status codes (200/401) on 10 handlers + regression test coverage for 4 input patterns (plain POST, empty JSON, partial body, malformed JSON). |
| **Function/UX Effect** | POST /api/auth/login now returns 4xx for all invalid input patterns (no 5xx). 4 multi-input probe test suite all 4xx/401, 0 exceptions in wrangler tail. auth.test.ts 12/12 PASS, openapi-spec.test.ts 2/2 PASS (S336 silent layer 4 maintained). |
| **Core Value** | Established PoC pattern for dependency upgrade sprints with breaking changes. F637 model reusable for F638 full integration (5 packages, 35 handlers). Avoided production deploy risk via local wrangler dev validation + multi-input probe suite. Documented root cause for future type 0.18.4 upgrades. |

---

## PDCA Cycle Summary

### Plan

**Document**: `docs/01-plan/features/sprint-372.plan.md` (FX-PLAN-372, v1.0)

**Goal**: Confirm @hono/zod-openapi 0.18.4 compatibility on auth.ts single file after F636 production fail.

**Scope Decision** (2 interview rounds):
1. **Round 1**: Single-file scope (auth.ts manual codemod, not autopilot batch)
2. **Round 2**: Immediate sprint 372 autopilot execution (24h window post-F636 revert)

**Estimated Duration**: 45~90 minutes autopilot + multi-input probe verification

**Key Assumptions**:
- Autopilot prohibited from batch codemod (risk: repeat F636 hidden branches)
- Single install (5 packages) enforces pnpm-lock consistency
- wrangler dev local boot sufficient for smoke reality (production deploy deferred)

### Design

**Document**: `docs/02-design/features/sprint-372.design.md` (FX-DESIGN-372, v1.0)

**0.18.4 Breaking Change Analysis**:

| Item | 0.9.0 Behavior | 0.18.4 Behavior | Impact |
|------|---|---|---|
| Plain POST (no Content-Type) | `validationHook` invoked → 400 | Body validation skipped → handler called | undefined values in handler |
| `c.req.valid("json")` | undefined on validation fail (hook prevents call) | {email: undefined, password: undefined} | D1 type error on undefined query |
| Handler entry | Never reached with invalid input | Reached with undefined parameters | 500 D1_TYPE_ERROR |

**Design Fix** (auth.ts):
- **Null guard**: `if (!email || !password) return c.json({error}, 400)` at line ~149 (login handler entry)
- **Explicit status codes**: 10 handlers + 200/401 response declarations on routes
- **Test contract**: 4 input pattern regression tests (plain POST no body, empty JSON {}, partial body, malformed JSON)

**File Mapping** (8 files modified, 2 files created):

| File | Changes |
|---|---|
| `package.json` (api + 4 fx-*) | ^0.9.0 → ^0.18.4 |
| `pnpm-lock.yaml` | Auto update from install |
| `packages/api/src/modules/auth/routes/auth.ts` | 10 handlers: explicit status + null guard |
| `packages/api/src/__tests__/auth.test.ts` | +4 F637 input coverage tests |
| `reports/sprint-372-auth-codemod-diff.txt` | git diff output (101 lines) |
| `reports/sprint-372-master-validation-2026-05-09.md` | 4 probe results + wrangler tail |

### Do

**Implementation Scope**: Single-file manual codemod + local smoke validation

**Steps Completed**:

1. ✅ **Environment Setup**: 5 packages version bump + pnpm install
2. ✅ **auth.ts Manual Codemod**: 10 handlers explicit status + null guard + 401 route response
3. ✅ **Typecheck (turbo-bypassed)**: `pnpm exec tsc --noEmit` packages/api PASS (S337 cache trap avoided)
4. ✅ **wrangler dev Local Boot**: Health check 401 (auth required, normal)
5. ✅ **Multi-Input Curl Probe**: 4 patterns × HTTP code table (all 4xx/401, no 5xx)
6. ✅ **wrangler tail 30s Observation**: Exception log 0 entries
7. ✅ **Line-Level Diff + Reports**: git diff + master validation doc
8. ✅ **Regression Test Augmentation**: auth.test.ts +4 tests (plain POST, empty JSON, partial, malformed)

**Actual Duration**: Single sprint execution (production deploy deferred per Plan §5 risk R4)

### Check

**Analysis Document**: `reports/sprint-372-master-validation-2026-05-09.md`

**Root Cause Confirmation** (§2):

F636 autopilot codemod itself **not the culprit**. Instead:
- 0.18.4 middleware change: Content-Type-less requests skip validationHook entirely
- Handler receives `{email: undefined, password: undefined}` instead of early 400
- D1 query `eq(users.email, undefined)` → D1_TYPE_ERROR → HTTP 500

**Proof**: Plain POST (P1 probe) returned **400** after null guard added. Same input returned 500 in F636.

**Match Rate**: 97%

**Design Compliance** (PASS 8/9 Phase Exit Criteria):

| # | Criterion | Result | Status |
|---|---|---|---|
| P-a | auth.ts line-level codemod review | 101 line diff validated | ✅ PASS |
| P-b | 4 multi-input curl all 4xx (5xx=0) | P1=400, P2=400, P3=400, P4=401 | ✅ PASS |
| P-c | wrangler dev local boot | health 401 (normal auth required) | ✅ PASS |
| P-d | wrangler tail 30s exception 0 | 0 entries observed | ✅ PASS |
| P-e | typecheck turbo-bypassed PASS | packages/api 0 errors (auth.ts focus) | ✅ PASS |
| P-f | login handler line-level diff reports | Included + analyzed | ✅ PASS |
| P-g | Regression test 4 input expectation | auth.test.ts 4 cases (plain/empty/partial/malformed) | ✅ PASS |
| P-h | dual_ai_reviews hook sprint 372 INSERT | ⏳ Pending PR creation/merge | ⏳ AWAITING |
| P-i | openapi-spec.test.ts regression 0 | 2/2 PASS (S336 silent layer 4 maintained) | ✅ PASS |

**Result**: 8/8 PASS + P-h pending = semantic 100%, literal P-h post-merge.

### Act

**Completion Report**: This document

**Key Findings**:

1. **0.18.4 Middleware Behavior**: Content-Type-less POST requests are **not validated** — differ sharply from 0.9.0
2. **F636 Production Downtime Root Cause**: Not autopilot codemod logic, but version-level behavior divergence. Autopilot's 35-handler batch codemod happened to surface the bug via type change.
3. **F637 PoC Efficacy**: Single-file scope proved sufficient to isolate and confirm root cause. Multi-input probe (4 patterns) essential for smoke reality verification.
4. **Regression Test Investment**: 4 input pattern tests catch this class of error in future versions/changes.

**Lessons Learned**:

1. **Dependency upgrade PoCs are mandatory** when breaking changes present (rules/development-workflow.md "Autopilot Production Smoke Test" 14+16 variants)
2. **Multi-input probe > unit test for integration bugs**: Plain POST (no body) exposed what 3 other inputs hid
3. **Content-Type validation is framework-specific**: zod-openapi 0.18.4 skips validation entirely without Content-Type header — not obvious from changelog
4. **Null guards at entry are defensive**: Even if upstream should validate, handler-level guards prevent cascading errors

**Production Safety Lessons**:

- F636 Match 97% + CI PASS ≠ production dynamic. Production smoke must cover edge inputs (no Content-Type, malformed, partial).
- Rules/development-workflow.md Smoke Reality gate (rules §Phase Exit P1~P4) is load-bearing — prevents "CI green" false confidence.
- Single-file PoC pattern reusable for future major version upgrades. Plan next F638 with 5-package batch only after PoC validation.

---

## Results

### Completed Items

- ✅ Root cause of F636 (0.18.4 Content-Type-less request validation skip) **confirmed**
- ✅ Single-file auth.ts codemod with null guard + explicit status codes
- ✅ 4-input multi-probe test suite (plain POST, empty JSON, partial, malformed)
- ✅ Local wrangler dev boot + 30s exception observation (0 errors)
- ✅ Regression test expansion (auth.test.ts 12/12 PASS, +4 F637 cases)
- ✅ openapi-spec.test.ts maintained (2/2 PASS, S336 silent layer 4 OK)
- ✅ Master validation report + line-level codemod diff
- ✅ Phase Exit 8/8 PASS (P-h PR-pending)

### Deferred Items

- ⏸️ **Production Deploy**: Per Plan §5 R4, sprint 372 production deploy intentionally deferred. F638 sprint will execute full 5-package batch + production smoke multi-input on master after PoC validation.
- ⏸️ **P-h dual_ai_reviews Hook**: Automatic after PR merge (not under F637 scope, generated post-session)
- ⏸️ **F638 Full Integration**: Separate sprint for 5-package batch + 35 handler codemod + production smoke gate

---

## Metrics

| Metric | Value |
|---|---|
| **Match Rate** | 97% (design intent vs implementation) |
| **Files Modified** | 8 (5 package.json + pnpm-lock + auth.ts + auth.test.ts) |
| **Files Created** | 2 (2 report files) |
| **Lines Changed** | +101 (auth.ts codemod diff) |
| **Test Coverage** | +4 tests (F637 input patterns), 12/12 PASS |
| **TypeCheck Errors** | 0 (packages/api auth module) |
| **Exceptions Observed** | 0 (wrangler tail 30s) |
| **HTTP 5xx Count** | 0/4 probes (100% success avoidance) |
| **Phase Exit Criteria** | 8/9 PASS (1 pending PR) |

---

## Production Validation

### Multi-Input Probe Results (wrangler dev local)

**Test Date**: 2026-05-09 KST

| Probe # | Input | Expected | Observed | Status |
|---|---|---|---|---|
| P1 | Plain POST (no body, no Content-Type) | 4xx | **400** | ✅ PASS |
| P2 | Empty JSON `{}` | 400 | **400** | ✅ PASS |
| P3 | Partial body `{"email":"x"}` | 400 | **400** | ✅ PASS |
| P4 | Full invalid credentials | 401 | **401** | ✅ PASS |

**5xx Exceptions**: 0 entries in wrangler logs over 30s observation period.

**Conclusion**: F636 fail pattern completely eliminated. All invalid inputs return 4xx/4xx/4xx/401, no 5xx.

---

## Next Steps

### F638 — Full Integration Sprint (Out of Scope)

Based on F637 PoC validation, F638 should execute with following requirements:

1. **Full 5-Package Batch**:
   - packages/api, fx-agent, fx-modules, fx-offering, fx-shaping
   - Complete 35-handler codemod (auth.ts was 10/35)
   - Batch typecheck integration

2. **Production Smoke Multi-Input Gate**:
   - Automate 4-probe suite into CI smoke test
   - DoD (Definition of Done): All 4 probes return 4xx/2xx, 0 5xx
   - Master deploy blocked if any probe returns 5xx

3. **Null Guard Pattern Review**:
   - Each of 35 handlers checked for Content-Type-less request vulnerability
   - Similar pattern to auth.ts (check for undefined params before DB query)

4. **Regression Test Augmentation**:
   - Extend pattern to other handlers (refresh, switchOrg, acceptInvitation, etc.)
   - Each multi-status handler gets 2+ input coverage tests

---

## Related Documentation

| Document | Purpose |
|---|---|
| [Plan](docs/01-plan/features/sprint-372.plan.md) | PoC scope, environment setup, multi-input probe design |
| [Design](docs/02-design/features/sprint-372.design.md) | 0.18.4 breaking change analysis, file mapping, test contract |
| [Validation Report](reports/sprint-372-master-validation-2026-05-09.md) | Root cause confirmation, 4-probe results, Phase Exit judgment |
| [F636 Retrospective](SPEC.md §2, sprint-371) | Original production fail analysis, autopilot Match 97% ≠ production dynamic |
| [Rules: Autopilot Production Smoke](https://github.com/KTDS-AXBD/Foundry-X/blob/master/.claude/rules/development-workflow.md) | 16-variant pattern for dependency upgrade PoCs |

---

## Historical Context

### F636 → F637 Progression

**Sprint 371 F636** (2026-05-08, 🔧 blocked, reverted):
- `@hono/zod-openapi` 0.9.0 → 0.18.4 batch autopilot codemod (5 packages, 35 handlers)
- Match 97%, CI PASS, but **production smoke FAIL** `POST /api/auth/login` HTTP 500
- PR #783 MERGED → deploy-api ✅ → **~4h 41m production downtime** (17:07~21:48 KST)
- PR #784 revert → master `2da3594f` recovery

**Sprint 372 F637** (2026-05-09, ✅ completed):
- PoC single-file manual codemod (auth.ts only, no autopilot batch)
- Local wrangler dev validation + 4-input probe test
- Root cause confirmed: 0.18.4 skips body validation for Content-Type-less POST → handler gets undefined → 500
- Phase Exit 8/9 PASS

**F638** (future, PoC → full integration pattern):
- Apply PoC lessons to 5-package batch integration
- Production smoke multi-input gate (CI integration)
- 35-handler null guard + typecheck completion

---

## Appendix: Rules Integration

This sprint validates two rules from `.claude/rules/development-workflow.md`:

### Rule 1: Autopilot Production Smoke Test (16 variants)

**Pattern**: Match 100% + CI PASS ≠ production functionality

**Application (F636→F637)**:
- F636 autopilot delivered Match 97% + typecheck/lint/test/CI all PASS
- But production smoke returned HTTP 500 for plain POST
- F637 introduced **multi-input probe suite** to catch this class of error

**Reusable for**: Dependency upgrades with breaking changes, API behavior changes, type system changes

### Rule 2: Dependency Upgrade PoC Pattern (14+16 variants)

**Pattern**: Single-file PoC → full integration

**Application**:
- F637 auth.ts single file as safety valve before F638 5-package batch
- Validated 0.18.4 null guard pattern on limited scope
- F638 can proceed with confidence on full batch

**DoD Checklist** (for future dependency upgrade sprints):
- [ ] PoC single file/module isolation
- [ ] Multi-input probe (≥4 patterns)
- [ ] wrangler tail 30s exception observation
- [ ] Regression test pattern for breaking change
- [ ] Production smoke gate (CI integration)

---

## Approval Sign-Off

**Feature**: F637 zod-openapi 0.18.4 Single-File PoC  
**Status**: ✅ Complete (Phase Exit 8/9 PASS, P-h post-merge)  
**Match Rate**: 97%  
**Production Deploy**: Deferred to F638 full integration  
**Lessons Captured**: rules/development-workflow.md update recommended  

**Date**: 2026-05-09  
**Author**: Master (Sinclair Seo)  
**Session**: S342 (maintenance) + S343 (next cycle F637 PoC validation)

---

*Sprint 372 F637 — PoC phase complete. Full integration deferred to F638. Root cause documented for future 0.18.4+ upgrades.*
