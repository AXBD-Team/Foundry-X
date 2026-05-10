# Sprint 380 Rules Update Draft

> **대상**: `~/.claude/rules/development-workflow.md`
> **섹션**: "Sprint stale `.sprint-context` / signal F_ITEMS 패턴"
> **적용**: Master post-merge 수동 편집

## 변경 내용

### 섹션 헤더 변경

```diff
-## Sprint stale `.sprint-context` / signal F_ITEMS 패턴 (6회 재현 승격 S269, 2026-05-05)
+## Sprint stale `.sprint-context` / signal F_ITEMS 패턴 (**F643 S380 L1 fix 적용 완료**, 6회 재현 승격 S269, 2026-05-05)
```

### "근본 원인 (미확정)" 섹션 교체

```diff
-- **근본 원인 (미확정 — 후보 3종)**:
-  1. bashrc `sprint()` 함수가 `.sprint-context` 직전 값을 그대로 복사하여 새 signal 생성 (전체 stale)
-  2. SPEC.md에서 F-item 추출 시 직전 Sprint 블록 매칭 (F-item만 stale, SPRINT_NUM은 정상)
-  3. signal+context 두 파일 중 하나만 신규로 갱신, 다른 하나는 캐시 잔존
+- **재현 16회 누적 → F643 S380 L1 fix 적용**: S256~S350 누적 16회 재현. S350+S351 사용자 명시 결정으로 F643 등록. **S380 이후 재발 0 목표** (차기 Sprint 381 시동 시 검증).
+- **확정된 근본 원인 3종 (S351 진단)**:
+  1. **(RC #1 PRIMARY)** bashrc `sprint()` L393-395: `.sprint-context` 읽을 때 `SPRINT_NUM` 검증 없음 → stale sprint 파일 그대로 사용
+  2. **(RC #2 SECONDARY)** awk `$4 ~ s` substring match → "Sprint 3800" 행이 `Sprint 380` 검색에 매칭됨
+  3. **(RC #3 SECONDARY)** signal `[ ! -f ]` 조건: stale signal 잔존 시 검증 없이 skip
+- **L1 fix 내용 (`reports/sprint-380-bashrc-patch.diff` — 수동 적용 필요)**:
+  - Fix A: awk `$4 ~ s` → whitespace trim + `==` exact match
+  - Fix B: `.sprint-context` 읽기 전 `SPRINT_NUM` 일치 검증 + 불일치 시 stderr warn
+  - Fix C: signal 생성 조건을 drift 검출 + force overwrite 로직으로 교체
+  - 회귀 테스트: `scripts/__tests__/test-sprint-fitems.sh` T1~T5 10/10 PASS (S380)
```

### "근본 fix 후보 (deferred)" 섹션 교체

```diff
-- **근본 fix 후보 (deferred, 우선순위 순)**:
-  - **L1 bashrc fix**: `sprint()` 함수 코드 점검 → SPEC.md F-item 추출 패턴 fix (Sprint 블록 헤더 정확 매칭) + signal/context 동시 갱신 보장
-  - **L2 sprint() 진입점 검증 step**: signal 생성 후 `SPRINT_NUM`/`F_ITEMS` 매칭 검증 + 불일치 시 stderr warn 출력
-  - **L3 ax-marketplace `/ax:sprint` skill 사용 강제**: bashrc 우회 금지. skill은 stale 패턴 자체 감지 + 보정 가능
-  - **임시 회피**: 위 표준 보정 절차를 Master 세션 시작 시 자동 수행하도록 session-start Phase 5d 확장 (활성 signal 중 stale F_ITEMS 휴리스틱 감지)
+- **수동 적용 절차 (Master post-merge Sprint 380)**:
+  ```bash
+  cd ~/work/axbd/Foundry-X
+  patch -p0 < reports/sprint-380-bashrc-patch.diff
+  source ~/.bashrc
+  bash scripts/__tests__/test-sprint-fitems.sh   # 10/10 PASS 확인
+  # Sprint 381 시동 후 signal + .sprint-context 양쪽 SPRINT_NUM=381 확인
+  ```
```

### "검증 기준" 섹션 유지 + 보정 절차 단축

```diff
-- **연관 이슈**: S268 cleanup 단계에서 stale `.sprint-context` 잔존이 `git worktree remove --force` 필요 원인 1가지로 관찰. signal/context fix 후 cleanup도 정상화 가능성.
- **검증 기준 (재발 판정)**: 차기 Sprint 시동 시 signal + .sprint-context 양쪽이 신규 SPRINT_NUM + 신규 F_ITEMS로 즉시 정확히 채워지면 fix 완료. 1회라도 보정 필요 시 재발로 카운트.
+- **검증 기준 (재발 판정)**: Sprint 381 시동 시 stale 보정 절차 0회 필요하면 fix 완료. 1회라도 필요 시 재발 카운트 (16회 → 17회).
+- **보정 절차 (patch 미적용 기간 회피책)**:
+  1. `cat /tmp/sprint-signals/<PROJECT>-<N>.signal` — `F_ITEMS=` 줄 확인
+  2. `cat <WT_PATH>/.sprint-context` — `SPRINT_NUM`, `F_ITEMS` 확인
+  3. 불일치 시: `sed -i 's/^F_ITEMS=.*/F_ITEMS=<신규>/' /tmp/sprint-signals/<PROJECT>-<N>.signal`
```
