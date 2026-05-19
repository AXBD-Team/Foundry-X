# Sprint 405 — ax-harness-kit Drift Baseline

**Date**: 2026-05-19  
**Source**: `/home/sinclair/work/worktrees/Foundry-X/sprint-405/.claude/rules`  
**Target**: `/tmp/gate-x-dogfood-405/.claude/rules`  
**Command**: `diff -r .claude/rules /tmp/gate-x-dogfood-405/.claude/rules`

---

## 판정: ✅ 본질적 drift 0건

자연스러운 변수 치환 diff 외 content 손실 / 규칙 누락 없음.

---

## Diff 상세

### 자연스러운 변수 치환 (정상)

| 파일 | 변경 | 유형 |
|------|------|------|
| coding-style.md | `# Foundry-X Coding Style` → `# gate-x Coding Style` | 제목 치환 |
| git-workflow.md | `# Foundry-X Git Workflow` → `# gate-x Git Workflow` | 제목 치환 |
| sdd-triangle.md | `Foundry-X` 2건 → `gate-x` | 제목 + 본문 치환 |
| security.md | `foundry-x-api` → `gate-x-api`, `fx.minu.best` → `gate-x.pages.dev` | URL 치환 |
| serverkit-cq.md | `Foundry-X ServerKit` → `gate-x ServerKit`, 경로 치환, Sinclair 예시 제거 | 범용화 |
| tdd-workflow.md | `# Foundry-X TDD Workflow` → `# gate-x TDD Workflow` | 제목 치환 |
| testing.md | `# Foundry-X Testing Rules` → `# gate-x Testing Rules` | 제목 치환 |

### Foundry-X 전용 파일 (템플릿 미포함 — 정상)

| 파일 | 이유 |
|------|------|
| `sprint-ops.md` | Foundry-X sprint 운영 특화 규칙. 신규 프로젝트에 불필요. **개선 후보: 범용화 검토** |

---

## 미치환 항목 분석

### process-lifecycle.md, task-promotion.md (예외 선언)

Plan §4 (d)에서 "process-lifecycle / task-promotion plain copy는 예외"로 선언.  
두 파일은 범용 개발 워크플로우 규칙이라 Foundry-X 명칭 없이 그대로 적용 가능. ✅

---

## 개선 후보

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| `sprint-ops.md` 범용화 | Sprint WT 운영 규칙은 신규 BD 프로젝트에도 유용. 변수화 후 포함 검토 | P2 |
| `serverkit-cq.md` 개인정보 제거 | "Sinclair Seo" 예시 → 범용 예시로 대체 (이미 처리됨 ✅) | 완료 |

---

## 결론

Foundry-X `.claude/rules` → gate-x 이식 100% 성공.  
변수 치환으로 인한 자연스러운 diff 7건. 본질적 content drift 0건.  
sprint-ops.md 미포함은 의도적 제외 (범용화 F672+ 후보).
