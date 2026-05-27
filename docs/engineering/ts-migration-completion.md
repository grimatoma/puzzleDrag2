# TypeScript migration completion plan

Handoff doc for **Phase 1–2** (Claude Code or Cursor). Phase 0 is tracked here for context; Composer executed Phase 0 on `main` after PR #678 merged.

**Related docs:** `catalog-enums.md`, `typed-tests.md`.

---

## Executive summary

| Question | Answer |
|----------|--------|
| Is JS→TS done? | **Yes for `src/`** — all application code is `.ts`/`.tsx`; `strict` + `noImplicitAny`; `npm run typecheck` passes. |
| What did PR #678 add? | Catalog enums, invariant tests, `Inventory` helpers, `gameStateFields`, ESLint ban on `state as unknown`, `parseInventory` at save boundary. |
| Broad OOP refactor? | **No** — use typed data + reducers + enums, not domain class hierarchies. |
| When is migration “complete”? | After **Phase 1** (below) + CI test TSC scan (Phase 0). Phase 2 can overlap early feature work. |

---

## Phase 0 — Merge gate (done on `main`)

**Owner:** Composer / any agent.

| Step | Status | Action |
|------|--------|--------|
| 0.1 | Done | Merge PR #678 (`feat: catalog enums and typed keys`). |
| 0.2 | CI | On `main`: `npm run lint`, `npm run typecheck`, `npm run action-types:check`, `npm test`, `npm run build`. |
| 0.3 | Done | `tutorial-corner` uses `canvasDiff` on `#/board` (comment at `src/visualTesting/matrix.ts` ~149–150). |
| 0.4 | CI | `node tools/scan-test-tsc.mjs` in CI (exits non-zero if any `src/__tests__/*.test.ts` fails strict tsc in isolation). |

---

## Phase 1 — Drop `GameState` index signature (blocking)

**Owner:** **Claude Code** (recommended) — large mechanical refactor; use `subagent-driven-development`, `verification-before-completion`, `pre-pr-check`.

**Branch:** `cursor/gamestate-drop-index-e9a5` (or `claude/gamestate-drop-index` per your naming).

### Goal

Remove `[key: string]: unknown` (and similar escape hatches) from `GameState` in `src/types/state.ts` so every `state.foo` access is a compile-time check.

### Steps

1. **Read current shape**
   - `src/types/state.ts` — `GameState` interface and index signature (~line 278 pre-change).
   - `src/types/gameStateFields.ts` — slice-owned root fields already extracted post-#678.
   - `src/state/init.ts` — which slices spread into fresh state.

2. **Remove index signature** from `GameState` (and tighten sub-interfaces only where safe).

3. **Fix `tsc` errors mechanically**
   - Missing field → add to `GameState` or `gameStateFields.ts` / slice `initial` type.
   - Typo → fix call site.
   - Truly dynamic JSON (save, balance draft) → `unknown` + guard at boundary; **do not** put back on `GameState`.

4. **Do not reintroduce** `state as unknown as …` — ESLint blocks this in `eslint.config.js` (TS files).

5. **Verification** (required before PR)
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   node tools/scan-test-tsc.mjs
   ```
   Fix any test files that break when compiled in isolation.

### Exit criteria

- No `GameState` index signature.
- `npm run typecheck` clean.
- No new `as unknown` state casts.
- Tests green.

### PR title

`refactor: drop GameState index signature`

---

## Phase 2 — Boundary typing (high value)

**Owner:** Claude Code (2a) or either agent (2b–2d). Can start after Phase 1 or in parallel if touch sets are disjoint.

### 2a — Phaser registry bridge (highest priority in Phase 2)

**Skill:** `phaser-scene-debug`

**Files:**

- `src/GameScene.ts` — `RegistryGrid`, inline registry types (~line 32 area).
- `src/phaserBridge.ts` — registry mirror fields.
- `src/visualTesting/global.d.ts` / bridge if needed.

**Goal:** Typed registry contract for React → Phaser state sync; eliminate `unknown` fields that hide board/state drift.

**Exit:** Registry keys and grid cell shape typed; no silent string keys on bridge without catalog type where applicable.

### 2b — Action payload keys

**Files:**

- `src/types/actionPayloads.ts` — replace `Key | string` with `Key` where possible.
- Sweep hard-coded literals: `src/state.ts` (`CONVERT_TO_SUPPLY`, etc.), `src/features/boss/slice.ts`, other slices.

**Exit:** Payloads use catalog key types; remaining `string` only at parse boundaries with guards.

### 2c — Config map schemas

**Files:**

- `src/features/decorations/data.ts` (or equivalent)
- `src/features/boons/data.ts`
- `src/features/workers/data.ts`

**Goal:** `Record<DecorationId, …>` / `Record<BoonId, …>` / `Record<WorkerTypeId, …>` aligned with `src/types/catalog/`.

### 2d — `ITEMS` compile-time lock

**Files:** `src/constants.ts`

**Goal:** `ITEMS_DATA` satisfies `Record<ItemKey, ItemEntry>` (or equivalent) so missing/extra keys fail at compile time, complementing `catalog-keys-invariants.test.ts`.

---

## Phase 3 — Guardrails (follow-up, not blocking features)

| Step | Action |
|------|--------|
| 3.1 | Replace test `Record<string, any>` with minimal interfaces (`tests/playwright-env.d.ts`, `tests/e2e/helpers.ts`). |
| 3.2 | Widen `npm run typecheck:tests` to full Vitest tree per `typed-tests.md`. |
| 3.3 | Consider `allowJs: false` when no app JS under `src/`. |
| 3.4 | Optional CI “any budget” script on `src/`. |

---

## Out of scope

- Broad OOP / domain class hierarchies.
- Zero `unknown` everywhere (keep at JSON/save/draft edges).
- Codegen for catalog enums (hand-maintained + invariant tests).

---

## Definition of “migration complete”

1. PR #678 on `main`.  
2. Phase 1 merged.  
3. CI runs `typecheck` + `node tools/scan-test-tsc.mjs`.  
4. `@typescript-eslint/no-explicit-any` holds in `src/`.  
5. Board-only keys (`rat`, `lava`, `mysterious_ore`) documented or promoted to `BoardCellKey` union.

---

## PR sequence

| # | PR | Owner |
|---|-----|--------|
| — | #678 merged | — |
| 0 | `chore: CI scan-test-tsc` | Composer |
| 1 | `refactor: drop GameState index signature` | Claude Code |
| 2 | `refactor: type Phaser registry bridge` | Claude Code |
| 3 | `refactor: tighten action payload keys` | Either |
| 4 | `refactor: typed config maps (decorations/boons/workers)` | Either |
| 5 | `chore: type test globals; widen typecheck:tests` | Either |

---

## Commands cheat sheet

```bash
npm run typecheck
npm run typecheck:tests
npm run action-types:check
npm test
npm run lint
npm run build
node tools/scan-test-tsc.mjs
npm test -- src/__tests__/catalog-keys-invariants.test.ts
```

---

## Pointing Claude Code at this work

> Read `docs/engineering/ts-migration-completion.md` and execute **Phase 1** only. Branch `cursor/gamestate-drop-index-e9a5`, follow `subagent-driven-development` and `verification-before-completion`, open a non-draft PR when green.

For Phase 2a:

> Same doc, **Phase 2a** only. Use `phaser-scene-debug` skill. Depends on Phase 1 unless you confirm no `GameState` overlap.
