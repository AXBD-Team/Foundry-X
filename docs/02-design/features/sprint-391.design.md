---
code: FX-DSGN-391
title: F656 — e2e.yml Vite deps cache + pre-warm 설계
sprint: 391
date: 2026-05-12
status: DONE
---

# Sprint 391 Design — F656

## 1. 문제 분석

### Race Condition 메커니즘

```
CI shard runner 시작
  └─ pnpm install          (node_modules 구성, .vite/ 없음)
  └─ pnpm dev 시작         (Vite dev server 기동)
       └─ 첫 요청(Playwright navigate)
            └─ Vite lazy transform 시작
                 ├─ react, react-dom, zustand, ... 동시 번들링
                 ├─ CPU burst ~10~20초
                 └─ 테스트 timeout 발생 ← HERE
```

### .vite/deps/ 역할

Vite dev server는 node_modules 내 dependencies를 `packages/web/node_modules/.vite/deps/` 에 사전 번들링(pre-bundling)한다:
- `.vite/deps/react.js`, `.vite/deps/zustand.js`, ...
- `_metadata.json`: 번들링 완료 여부 + hash

이 폴더가 **존재하면** dev server는 re-bundling SKIP → 첫 요청 즉시 응답.
**없으면** 첫 요청 시 모든 deps를 동시에 번들링 → burst.

## 2. 해결 설계

### Step A: actions/cache 복원 (pnpm install 이후)

```yaml
- name: Restore Vite dependency pre-bundle cache
  id: vite-deps-cache
  uses: actions/cache@v4
  with:
    path: packages/web/node_modules/.vite
    key: vite-deps-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml', 'packages/web/vite.config.ts') }}
    restore-keys: |
      vite-deps-${{ runner.os }}-
```

**위치**: `pnpm install` 직후, `Build shared-contracts` 이전.
**이유**: pnpm install은 `.vite/` 폴더를 건드리지 않으므로 install 후 restore 안전.

**cache key 설계**:
- `pnpm-lock.yaml`: 어떤 deps가 설치되는지 결정 → dep 변경 시 무효화 필수
- `vite.config.ts`: optimizeDeps 설정 변경 시 무효화
- src 파일 hash 제외: `.vite/deps/`는 source transform cache가 아니라 deps pre-bundle cache

**restore-keys fallback**:
- partial match: 같은 OS의 이전 cache → 일부 deps만 stale해도 대부분 재사용 가능

### Step B: cache miss 시 vite optimize (Playwright install 이후)

```yaml
- name: Pre-warm Vite dependency optimization
  if: steps.vite-deps-cache.outputs.cache-hit != 'true'
  run: pnpm -F @foundry-x/web exec vite optimize
```

**위치**: `Install Playwright Chromium` 직후, `Run E2E tests` 이전.
**이유**: 
- cache miss 시에만 실행 (cache hit 시 skip → 4 shard 추가 시간 0)
- `vite optimize`: Vite CLI 내장 명령, `vite.config.ts`의 `optimizeDeps` 설정 기반으로 사전 번들링
- 완료 후 `.vite/deps/` 생성 → GitHub Actions가 job 완료 후 자동 cache 저장

### 4 shard parallel 동작

matrix 전략 (shardIndex: 1~4)이므로 각 shard는 **독립 runner**에서 실행:
- 모두 동일 cache key → 첫 push 이후 cache hit
- cache hit: 0초 pre-warm (이미 `.vite/deps/` 존재)
- cache miss (최초 또는 dep 변경): 1개 shard만 먼저 warm → 다른 3개는 parallel이라 동시 miss → 4개 모두 pre-warm

## 3. 파일 매핑 (§5)

| 파일 | 변경 | 내용 |
|------|------|------|
| `.github/workflows/e2e.yml` | **수정** | Step A + Step B 2개 step 추가 |

다른 모든 파일 변경 **금지**.

## 4. 검증 계획

### 로컬 검증 (P-a, P-d)
```bash
# typecheck (Vite cache 무관)
cd /home/sinclair/work/worktrees/Foundry-X/sprint-391
pnpm typecheck 2>&1 | tail -5

# e2e.yml YAML 문법 확인
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e.yml'))" && echo "YAML OK"
```

### CI 검증 (P-f, P-g)
- PR push → 4 shard 모두 GREEN
- master merge → 동일 SHA 2회 push run 모두 PASS
