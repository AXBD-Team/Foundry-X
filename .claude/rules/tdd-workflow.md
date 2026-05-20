# Foundry-X TDD Workflow

> Red-Green-Commit: Anthropic 권장 TDD 사이클
> 이 파일이 TDD 규칙의 SSOT — testing.md, sdd-triangle.md는 참조만

## 적용 범위

| 등급 | 대상 | TDD 적용 |
|------|------|---------|
| **필수** | 새 F-item 서비스 로직 (api) | Red→Green 풀 사이클 |
| **권장** | 새 E2E 시나리오, CLI UI 컴포넌트, Web 컴포넌트 | 가능하면 Red 먼저 |
| **선택** | 리팩토링, 버그픽스 | 회귀 테스트만 |
| **면제** | shared 타입, D1 migration, meta-only, docs, P0 Hotfix, 1-line 버그픽스 | 해당 없음 |

## Red Phase (테스트만 작성)

### 원칙
- F-item의 REQ 명세에서 **입력/출력**을 추출하여 테스트 작성
- 구현 파일은 빈 export(stub)만 허용 — 로직 zero
- `describe` 블록에 F-item 번호 주석 필수
- Claude에게 지시할 때: **"TDD Red phase — 테스트만 작성하고 구현은 하지 마"**

### 실패 확인 필수
- `vitest run <파일> --reporter=verbose` 로 FAIL 확인
- 만약 PASS라면 assertion이 무의미 — 재검토
- Claude에게: **"구현은 하지 말고 테스트만 실행해서 실패하는지 확인해"**

### Red 커밋 규칙
- 메시지: `test(scope): F### red — describe what's tested`
- 이 커밋이 "테스트 계약" — 이후 Green에서 이 계약을 충족시킴

## Green Phase (구현 작성)

### 원칙
- **테스트 파일 수정 금지** — 실패하면 구현 쪽을 고침
- 최소한의 구현으로 테스트 통과 (과잉 구현 금지)
- Claude에게: **"이 테스트를 통과시키는 코드를 작성해. 테스트는 수정하지 마"**

### 과적합 검증 (선택)
- Green 통과 후 서브에이전트로 검증:
  **"이 테스트가 구현에 과적합되어 있지 않은지 검증해. edge case, 음수 케이스, 경계값 부족한 부분 알려줘"**
- 부족하면 새 Red 사이클 추가

### Green 커밋 규칙
- 메시지: `feat(scope): F### green — describe implementation`

## Refactor Phase (선택)
- Green 통과 후 코드 정리. 테스트 여전히 PASS 유지
- 커밋: `refactor(scope): F### — describe cleanup`

## E2E Red Phase 특칙

- Playwright `page.route()` mock 설정은 "테스트 인프라"로 간주하여 Red Phase에서 허용
- "구현 zero"의 범위 = React 컴포넌트/라우트 파일이 존재하면 안 됨 (mock은 예외)
- E2E 실행: `cd packages/web && pnpm e2e --grep '<pattern>'`

## 예외 정책

| 상황 | 적용 | 근거 |
|------|------|------|
| P0 Hotfix (프로덕션 장애) | 면제 | 즉시 대응 우선. 회귀 테스트만 사후 추가 |
| Legacy 대규모 리팩토링 | 선택 | 기존 코드 Red 작성 비효율. 회귀 테스트 대체 |
| 1-line 버그픽스 | 면제 | 오버헤드 > 이득. 회귀 테스트 1건만 |

## Git Workflow 연동
- Red + Green 커밋은 같은 feature 브랜치
- PR은 squash merge → 최종 1커밋이지만 브랜치 내 이력은 Red→Green 순서 유지
- meta-only 규칙 불변: .claude/rules, docs 등은 master 직접 push

## Autopilot Red/Green Commit 분리 정착 (S370 첫 사례, 2026-05-20)

> 본 섹션은 Red 커밋 + Green 커밋 분리가 autopilot에 의해 실제 모범적으로 적용된 첫 정착 사례를 명문화한다. **이전까지는 autopilot이 squash로 1 commit으로 합치는 경향**이 있었으며, S370 Sprint 410 F676에서 처음으로 Red/Green 분리가 명확히 관찰됨.

### S370 정착 사례 (Sprint 410 F676, PR #845 MERGED Match 100%)

| Phase | Commit | 내용 |
|-------|--------|------|
| Red | `af695dd0` | `__tests__/middleware/*.test.ts` 4 파일 신규 (28 test) — multi-tenant + rate-limit + request-logger + trace-id middleware 인터페이스 계약 정의 |
| Green | `3b9fcd69` | 4 middleware 구현 (`src/middleware/*.ts`) — Red 28 test 통과 + harness-kit vitest 112→140 PASS |

**관찰 가치**:
1. **테스트 계약 가시화** — Red commit이 "이 4 middleware는 이런 API와 동작을 가질 것"이라는 계약을 단일 commit으로 명시
2. **회귀 추적 용이성** — 향후 middleware 동작 회귀 시 `git show af695dd0`로 원본 계약 확인 가능
3. **PR squash 후에도 commit history 보존** — feature 브랜치 내 Red→Green 순서가 squash 전까지 유지

### Autopilot 지시 표준 prompt

신규 sprint 시 autopilot에게 다음 패턴으로 지시:

```
이 sprint는 TDD 풀 사이클 적용 대상 (F-item 서비스 로직).

표준 절차:
1. Red Phase: 테스트 파일만 작성 → 별도 commit `test(scope): F### red — ...`
   - 구현 파일은 빈 export(stub)만 허용
   - vitest --run으로 FAIL 확인 후 commit
2. Green Phase: 구현 작성 → 별도 commit `feat(scope): F### green — ...`
   - 테스트 파일 수정 금지
   - Red 테스트 통과 확인 후 commit
3. (선택) Refactor Phase: 별도 commit `refactor(scope): F### — ...`

Red/Green 커밋 분리 의무화 — single commit으로 합치지 말 것.
PR squash merge 시 자동으로 1 commit으로 합쳐지므로, 브랜치 내 이력은 분리 유지가 안전.
```

### 적용 범위 (Red/Green 분리 의무화 등급)

| 등급 | 대상 | Red/Green 분리 |
|------|------|---------------|
| **필수** | 새 F-item 서비스 로직 (api/core/*/services) | Red + Green 별 commit 필수 |
| **필수** | 새 middleware/utility 함수 (외부 공개 라이브러리 포함) | Red + Green 별 commit 필수 |
| **권장** | 새 E2E 시나리오 | Red commit (page.route mock 포함) + Green commit (React 컴포넌트 구현) |
| **선택** | CLI UI 컴포넌트 | 가능하면 Red 먼저 |
| **면제** | 1-line 버그픽스, P0 Hotfix | 회귀 테스트만 (분리 불필요) |

### 검증 기준

차기 5+ Sprint 연속 Red/Green commit 분리 유지 → lifecycle 정착 확증.
1회라도 single commit으로 합쳐진 케이스 발견 시:
- autopilot prompt 강화 (위 표준 prompt 본문에 포함)
- PR review 단계에서 commit history 점검 (`git log --oneline <feature-branch>` 확인)

### Anti-pattern

- ❌ Red + Green을 single commit으로 합침 (테스트 계약 가시성 손실, 회귀 추적 곤란)
- ❌ Red commit에 stub 구현 포함 (테스트 PASS로 시작되어 계약 무의미)
- ❌ Green commit에서 테스트 파일 수정 (계약 위반 → 새 Red 사이클로 분리)
- ❌ Refactor commit에 동작 변경 포함 (refactor는 동작 보존 cleanup만)

### 연관 패턴

- 본 파일 `## Red Phase` + `## Green Phase` + `## Git Workflow 연동` (TDD 규칙 SSOT)
- `~/.claude/rules/development-workflow.md` `## Autopilot Immediate Fix Loop` (autopilot self-improvement 정착화 사례 — 본 패턴은 TDD 부문 정착)
- `.claude/rules/testing.md` "TDD 사이클 (Red-Green-Commit)" 섹션 (참조만, 본 파일이 SSOT)
