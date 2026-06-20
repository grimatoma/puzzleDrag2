# Save Migration Ladder

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Today, any change to the persisted save shape is a **destructive event**: bumping `SAVE_SCHEMA_VERSION` wipes every existing player's save. We want to replace "discard on mismatch" with an **ordered ladder of pure `version → version+1` transform functions** that upgrade an old save in place, so an existing player who reloads after a shipped change keeps their progress instead of starting over.

This is a foundational safety net. It **unblocks** the docs that touch persisted shape (the layout/balance/feature work the team currently defers precisely *because* shipping it would nuke saves). Once the ladder exists, "this changes the save → bump the version → wipe everyone" becomes "this changes the save → bump the version, add one migrator, add a fixture → everyone upgrades cleanly." It costs ~one small function per future bump and buys forward-compatible persistence forever.

## Background & current state (VERIFIED)

I opened the real files. The seed brief is essentially correct; the corrections/additions below are important for a clean implementation.

### The version gate (SHIPPED — destructive)

- `src/constants.ts:207` — `export const SAVE_SCHEMA_VERSION = 45;` (seed brief's "45" is correct). The comment on `:205-206` literally says *"Forward migrations are not maintained — bump this whenever persisted state changes shape and existing saves will be discarded."*
- `src/state/persistence.ts:15-32` — `loadSavedState()`. The version gate is at **`:23-29`** (seed brief said "~L23-29" — exact). On mismatch it `console.warn`s, **removes the save** (`localStorage.removeItem(SAVE_KEY)` at `:27`), and returns `null`. So the wipe happens *here*, eagerly, the moment a stale save is read.
- The save key is `STORAGE_KEYS.save` (`persistence.ts:5`).
- `persistStateNow` (`persistence.ts:34-45`) writes the whole `GameState` minus `VOLATILE` keys (`modal, bubble, view, viewParams, pendingView, craftingTab` — `:6`) and re-parses `inventory` through `parseZoneInventories`.

### There is a SECOND, redundant version gate (IMPORTANT — seed brief omitted this)

- `src/state/init.ts:182-277` — `initialState()` is the real hydration entry point. It builds `createFreshState()` then calls `loadSavedState()` (`:184`) and **re-checks** `raw && raw.version === SAVE_SCHEMA_VERSION` at **`:185`**. Only inside that `if` does it run `mergeLoadedState(raw)` (`:189`) and spread the saved fields over fresh (`:252-274`). If the version check fails it falls through to `return fresh;` (`:276`).
- **Consequence:** even if you only fix `loadSavedState`, the `:185` check would re-reject a migrated-but-version-still-old object. The ladder must produce a save whose `version === SAVE_SCHEMA_VERSION` (i.e. bump the `version` field as the last migrator runs) **before** it reaches `:185`. The cleanest insertion point is *inside `loadSavedState`* (or a new helper it calls) so both gates see an upgraded object. See plan.

### There is already ad-hoc, version-AGNOSTIC backward-compat (reuse the pattern, don't duplicate)

- `src/state/helpers.ts:126-152` — `mergeLoadedState()` already silently migrates **shape** drift: `savedRec.tileCollection ?? savedRec.species` (legacy `species` key, `:130`), deletes the legacy `species` key (`:144`), and re-parses `inventory`/`resourceProgress` (`:145-150`). It is idempotent and **never reads `version`**. This is field-level defensive merging, *not* a version ladder — keep it, and let the version ladder run *before* it.
- `src/state/init.ts:200-216, 218-250` — more ad-hoc compat: `tileCollection ?? species` fallback again, fire-hazard stripping when the feature flag is off, tool re-arm refunds. These are forward-safe field defaults, orthogonal to the version ladder.

### A confusingly-named runtime "migration" exists — NOT what we're building (call this out)

- `src/__tests__/granary-cap.test.ts:61-71` dispatches `{ type: "MIGRATE/APPLY_CAPS" }` through `rootReducer`. That is a **runtime one-shot reducer action** that clamps overstocked inventory at play time — it is *not* version-keyed and *not* part of save loading. Do not extend it; do not confuse the new ladder with it.

### Existing persistence tests (what already passes — must stay green)

- `src/__tests__/persistence.test.ts` (138 lines). Notably `:34-43` asserts the **current** destructive behaviour: a `version: -1` save returns `null` *and* is removed from storage. **This test encodes the old contract and will need updating** — unknown/forward versions should still be rejected, but a *known older* version must now upgrade. Decide explicitly (see plan): keep "truly unknown version → discard" but change "known old version → migrate."
- `src/__tests__/species-5.2.test.ts:58-75` already tests `mergeLoadedState` field migration + idempotency. Good template for migrator tests.
- No `src/__tests__/fixtures/` dir exists yet. `src/testUtils/` has `inventory.ts` + `testState.ts` (`mergeTestState`, `createFreshState`). Fixtures of real old-shape saves are net-new.

### Schema-bump history (informational)

`git log` shows the .ts files were bulk-converted from .js in one commit, so the `42→43→44→45` bump history isn't individually traceable via `-S` on `constants.ts`. The seed brief's "42→43→44→45 already bumped" is consistent with memory notes (SAVE_SCHEMA 43→44 for zone-tier-ladder, 44→45 for PC2 cost port). We are **not** retroactively writing migrators for 42/43/44 — those saves are already wiped in the wild. The ladder starts being useful from the **next** bump (45→46). See "Out of scope."

## Scope

**In scope:**
- A version-ladder module: an ordered registry mapping `fromVersion → migrator(save) → save'`, applied forward in sequence when `loaded.version < SAVE_SCHEMA_VERSION`.
- A forward-only apply loop with defensive handling of: missing `version`, version **higher** than current (forward/unknown — do not run anything, treat as unrecognized), version **equal** (no-op pass-through), version with a **gap** (a missing rung in the ladder → fail safe = discard, never silently half-migrate).
- Wiring the ladder into `loadSavedState` so **both** version gates (`persistence.ts:23` and `init.ts:185`) see an upgraded object.
- Seed the ladder with **one real migrator** as a worked example. Since 45 is current and nothing ships above it yet, add a **no-op identity migrator slot** + the infrastructure, and (if doc 12/13/14 hasn't landed) a documented `migrate_45_to_46` *stub* that the next shape change fills in. The infra + tests are the deliverable; the first *real* transform lands with the first real shape change.
- Test fixtures: real old-shape save JSON under `src/__tests__/fixtures/saves/` that must migrate cleanly to current.
- Tests: round-trip, each migrator, "v45 (current) save loads unchanged", forward-version rejection, gap rejection.

**Out of scope / non-goals:**
- Retroactive migrators for versions 42/43/44 (those saves are already gone; no value).
- Changing what fields are persisted, or any actual game-shape change — this brief delivers the *mechanism*; docs 12/13/14 deliver shape changes that *use* it.
- Cloud/remote save sync, multi-device merge, or save export/import UI.
- Touching the runtime `MIGRATE/APPLY_CAPS` reducer action.
- Adding a new dispatched **reducer action** — the ladder runs at *load* time inside `loadSavedState`/`initialState`, not through the reducer, so the `SLICE_PRIMARY_ACTIONS` footgun does **not** apply here (noted again under Gotchas).

## Implementation plan

Ordered, concrete. New file + edits to two existing files + tests.

### 1. New module: `src/state/saveMigrations.ts`

A pure, side-effect-free ladder. No `localStorage`, no `console` (let the caller log), no Phaser.

```ts
import { SAVE_SCHEMA_VERSION } from "../constants.js";
import type { SavedState } from "./persistence.js";

/** A pure transform that upgrades a save from `from` to `from + 1`. Must not mutate input. */
export type SaveMigrator = (save: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered ladder. Key = the version the save is AT before the migrator runs.
 * MIGRATIONS[n] upgrades a v(n) save to v(n+1). Add one entry per SAVE_SCHEMA_VERSION bump.
 * The migrator MUST set `version` to n+1 on its output.
 */
export const MIGRATIONS: Record<number, SaveMigrator> = {
  // EXAMPLE (fill in with the first real shape change; see doc 12/13/14):
  // 45: (save) => ({ ...save, version: 46, /* transform here */ }),
};

export type MigrateResult =
  | { ok: true; save: Record<string, unknown> }
  | { ok: false; reason: "no-version" | "forward-version" | "missing-migrator" };

/**
 * Forward-only apply loop. Returns the upgraded save (version === SAVE_SCHEMA_VERSION)
 * or a typed failure the caller can log + discard on.
 */
export function migrateSave(raw: Record<string, unknown>): MigrateResult {
  const v = raw.version;
  if (typeof v !== "number") return { ok: false, reason: "no-version" };
  if (v > SAVE_SCHEMA_VERSION) return { ok: false, reason: "forward-version" };
  let cur = raw;
  let ver = v;
  while (ver < SAVE_SCHEMA_VERSION) {
    const step = MIGRATIONS[ver];
    if (!step) return { ok: false, reason: "missing-migrator" };
    cur = step(cur);
    if (cur.version !== ver + 1) {
      // Defensive: a migrator that forgets to bump `version` would infinite-loop.
      cur = { ...cur, version: ver + 1 };
    }
    ver += 1;
  }
  return { ok: true, save: cur };
}
```

Design notes baked into the code:
- **Forward-only:** no down-migration. A save from a *newer* build (`v > current`) is rejected as `forward-version`, never run through anything.
- **Gap = fail safe:** if rung `n` is missing while `n < current`, return `missing-migrator` → caller discards. Never half-migrate.
- **Identity for current:** `v === SAVE_SCHEMA_VERSION` skips the loop entirely → returns the save untouched. This is the "v45 loads unchanged" guarantee.
- **`version`-bump enforcement:** the loop hard-guards against a migrator that forgets to set `version`, so a buggy migrator can't infinite-loop.

### 2. Wire into `src/state/persistence.ts` (`loadSavedState`, `:15-32`)

Replace the hard version-equality gate (`:23-29`) with a migrate-then-validate gate:

```ts
import { migrateSave } from "./saveMigrations.js"; // new import

// ...inside loadSavedState, after the `typeof parsed !== "object"` guard:
if (parsed.version !== SAVE_SCHEMA_VERSION) {
  const result = migrateSave(parsed as Record<string, unknown>);
  if (!result.ok) {
    console.warn(
      `[hearth] discarding save: cannot migrate version ${parsed.version} ` +
      `to ${SAVE_SCHEMA_VERSION} (${result.reason}); starting fresh`
    );
    try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
    return null;
  }
  return result.save as SavedState; // upgraded; version === SAVE_SCHEMA_VERSION
}
return parsed as SavedState;
```

This keeps the **discard-on-failure** safety (corrupt / forward / un-laddered saves still wipe, exactly as today) while **upgrading laddered saves**. Because the returned object now has `version === SAVE_SCHEMA_VERSION`, the redundant gate at `init.ts:185` passes naturally — **no change needed in `init.ts`** (verify this in testing; do not edit `init.ts` unless the test proves otherwise).

### 3. Persist the upgraded version

`migrateSave` only upgrades the in-memory object. The upgraded save isn't written back to disk until the next `persistState`/`persistStateNow` (which happens on the first state change or on `pagehide`/`beforeunload`, `persistence.ts:69-78`). That's acceptable (the in-memory state is correct; the migration re-runs harmlessly on the next load until something persists). If you want eager rewrite, call `persistStateNow` after a successful migrate — **but** `persistStateNow` takes a full `GameState`, and at `loadSavedState` time we only have the loose `SavedState`. **Recommendation: do NOT eagerly rewrite from `loadSavedState`** (shape mismatch risk). Let the normal persist cycle rewrite it. Document this in a code comment.

### 4. SAVE_SCHEMA_VERSION bump policy (the new contract)

Update the comment at `constants.ts:205-206` to the new policy:

```ts
// Save schema version. When persisted state changes shape: (1) bump this,
// (2) add a MIGRATIONS[oldVersion] entry in src/state/saveMigrations.ts that
// upgrades old → new (and sets `version`), (3) add a fixture save under
// src/__tests__/fixtures/saves/ and a migrator test. Saves with no migrator
// path (gaps, forward versions, corrupt) are still discarded.
```

**Do NOT bump `SAVE_SCHEMA_VERSION` in this brief.** This brief ships the *mechanism* at the current version 45. The first real bump happens in whichever shape-changing doc lands next (12/13/14), which will add `MIGRATIONS[45]`.

### 5. Fixtures + tests (see Validation for exact assertions)

- `src/__tests__/fixtures/saves/v45-current.json` — a real current-shape save (snapshot of `createFreshState()` + a couple of mutations, serialized via `persistStateNow` then read back) for the "loads unchanged" test.
- When the first real migrator lands, add `src/__tests__/fixtures/saves/v45-pre-bump.json` (a v45 save) and assert it migrates to the new version's shape.
- New test file `src/__tests__/save-migrations.test.ts`.

### Slice-registration footgun (does it apply here?)

**No** — and that's worth stating so a fresh session doesn't waste time. The slice footgun (`SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` in `src/state.ts`) only affects **dispatched reducer actions**. The migration ladder runs at **load time** inside `loadSavedState` → `initialState`, *before* any reducer dispatch. There is no new action type, so there is nothing to register. (If a future migrator needs runtime behaviour via an action, *that* would need registration + the `check-slice-action` skill — but the ladder itself does not.)

## Success criteria

- [ ] `src/state/saveMigrations.ts` exists, exports `migrateSave`, `MIGRATIONS`, `SaveMigrator`, `MigrateResult`, is pure (no `localStorage`/`console`/Phaser imports).
- [ ] `migrateSave` on a `version === SAVE_SCHEMA_VERSION` object returns `{ ok: true, save }` with the object **deep-equal unchanged** (identity migration).
- [ ] `migrateSave` on `version > SAVE_SCHEMA_VERSION` returns `{ ok: false, reason: "forward-version" }` and runs no migrator.
- [ ] `migrateSave` on a version with a missing rung (`< current`, no `MIGRATIONS` entry) returns `{ ok: false, reason: "missing-migrator" }`.
- [ ] `migrateSave` on an object with no numeric `version` returns `{ ok: false, reason: "no-version" }`.
- [ ] `loadSavedState` returns an upgraded save (version bumped to current) for any save reachable via the ladder; returns `null` **and removes the save** for forward/gap/corrupt cases.
- [ ] A real current-version (`v45`) fixture loads through `loadSavedState` → `initialState` and produces a `GameState` deep-equal (modulo VOLATILE + the documented load-time resets in `init.ts:252-274`) to the same save loaded today (no regression).
- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass.
- [ ] The updated `persistence.test.ts` no longer asserts the old "known-old-version → discard" behaviour for a *laddered* version, but still asserts discard for forward/corrupt/no-version.
- [ ] No new dispatched action type was introduced (grep confirms no edit to `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES`).
- [ ] `SAVE_SCHEMA_VERSION` is **still 45** (this brief does not bump it).

## Validation — how to verify

**Commands (all gating):**
```bash
npm run typecheck      # tsc --noEmit; must be clean
npm run lint           # ESLint over src/ + prototype.tsx; must be clean
npm test               # vitest, node env, fake localStorage, NO canvas
npm run build          # production build must succeed
```
After code changes: `graphify update .` (AST-only, no API cost).

**New unit tests — `src/__tests__/save-migrations.test.ts`** (assert each):
- `migrateSave identity`: feed `{ version: 45, ...anything }` → `{ ok: true }`, output **deep-equal** input (use `expect(result.save).toEqual(input)`).
- `migrateSave rejects forward version`: `{ version: 999 }` → `{ ok: false, reason: "forward-version" }`.
- `migrateSave rejects missing rung`: temporarily clear/spy `MIGRATIONS` so a `< current` version has no entry → `{ ok: false, reason: "missing-migrator" }`. (Or test against a fixture version below current with a deliberately empty ladder.)
- `migrateSave rejects no version`: `{}` → `{ ok: false, reason: "no-version" }`.
- `migrateSave runs the ladder in order` (once a real migrator exists): seed `MIGRATIONS` with two test rungs `n→n+1→n+2`, feed `{version:n}`, assert both ran in sequence and final `version === current`.
- `migrator that forgets to bump version still terminates`: a test migrator returning the same version is force-corrected by the loop (assert no hang, version advances).

**Updated `src/__tests__/persistence.test.ts`:**
- Keep `:23-32` (null when empty; valid passes through).
- Change the `:34-43` test (currently `version: -1` → null + removed). `-1` is below current with no migrator → still `null` + removed (reason `missing-migrator`) — assertion text changes from `"discarding save: schema version"` to `"cannot migrate version"`.
- Add: a fixture-backed test that a **laddered** old version (once one exists) returns a non-null upgraded save with `version === SAVE_SCHEMA_VERSION` and is **not** removed from storage.
- Keep prototype-pollution + corrupt-JSON + getItem-throws tests untouched.

**Manual in-game check (informational, not gating):**
This change is pure data/load logic with **no canvas/visual surface**, so `test:visual`/`test:e2e` are not required to be re-baselined for it (and visual goldens are not regenerable on this Windows host anyway). To sanity-check live in a worktree Vite (base `/puzzleDrag2/`, run parent binary `node ../../../node_modules/vite/bin/vite.js`):
1. In the page console, write a deliberately old save: `localStorage.setItem(<STORAGE_KEYS.save>, JSON.stringify({...realSave, version: <one-below-current-with-a-migrator>}))`, reload.
2. Confirm via `window.__hearthVisual.state` (or `window.__hearthVisual.freeze`) that progress (coins, inventory, settlements.home.tier) survived rather than reset to `createFreshState` defaults (coins 150, inventory `{home:{supplies:0}}`).
3. Confirm `localStorage` still has a save (not wiped). Assert via DOM/`getComputedStyle` if a visible HUD value is involved. `preview_screenshot` **hangs on this host** — do not use it.

**Gating vs informational:** `typecheck`/`lint`/`test`/`build` are **gating**. The in-game check and `test:e2e`/`test:visual` are **informational** for this data-only change.

## Double-check / adversarial review

**"Did I really wire it?" (prove the previously-never-fired path now fires):**
- Before the change, a `version != current` save was *always* discarded (`persistence.test.ts:34-43` proves it). After the change, add a fixture at a laddered version and assert `loadSavedState` returns a **non-null** object with `version === SAVE_SCHEMA_VERSION` *and* `localStorage` still contains the save. If that test passes, the previously-dead migration path is now live. This is the single most important assertion — it proves the dormant "upgrade instead of wipe" path activated.
- Grep the diff: confirm `migrateSave` is actually called from `loadSavedState` and not just defined. A dead module would pass typecheck but never run. (`grep -n migrateSave src/state/persistence.ts`.)
- Confirm the redundant gate at `init.ts:185` is satisfied: write a test that loads an old-but-laddered save through `initialState()` (not just `loadSavedState`) and asserts the hydrated `GameState` carries the upgraded data — this proves the migrated object survives *both* gates, not just the first.

**Edge cases a skeptic will attack:**
- **Migrator mutates input:** if a migrator mutates instead of returning a fresh object, the `toEqual(input)` identity test or a frozen-input test will catch it. Add `Object.freeze` to the fixture in one test to force purity.
- **Version field is a string `"45"`:** `typeof v !== "number"` → `no-version` discard. Confirm real saves persist `version` as a number (they do — `createFreshState` sets `version: SAVE_SCHEMA_VERSION`, a number).
- **`version` missing entirely** (very old / hand-edited save): `no-version` → discard. Safe.
- **Future-version save** (player downgraded the app): `forward-version` → discard, never run a migrator backward. Safe (a forward save run through old migrators would corrupt).
- **Partial ladder** (someone bumps `SAVE_SCHEMA_VERSION` but forgets the `MIGRATIONS` entry): `missing-migrator` → discard, *not* a silent half-upgrade. Add a meta-test (informational) that asserts `MIGRATIONS` has a contiguous rung for every version from `min(keys)` to `SAVE_SCHEMA_VERSION - 1` so a forgotten rung is caught in CI rather than wiping players.

**Rollback safety:** the change is additive + localized (one new file, one edited gate). If it misbehaves, revert `persistence.ts` to the equality gate and delete `saveMigrations.ts` — behaviour returns exactly to today's "discard on mismatch." No persisted-shape change means no save corruption risk from the rollback itself. Because we do **not** eagerly rewrite migrated saves to disk (step 3), a rollback won't leave half-written upgraded saves on disk.

## Risks & gotchas

- **Two version gates, not one.** Fixing only `loadSavedState` is insufficient if you don't make it return a version-bumped object, because `init.ts:185` re-checks `=== SAVE_SCHEMA_VERSION`. Verified: returning an upgraded object satisfies both, so `init.ts` needs no edit — but *prove* it with an `initialState()`-level test, don't assume.
- **`mergeLoadedState` is version-agnostic and runs AFTER the ladder.** It does field-level compat (`species`→`tileCollection`, inventory parsing). Don't move version logic into it; keep concerns separate. The ladder normalizes by *version*; `mergeLoadedState` normalizes by *field presence*. Both should remain idempotent.
- **Don't confuse with `MIGRATE/APPLY_CAPS`** (`granary-cap.test.ts`) — that's a runtime reducer action, unrelated to save versioning. Leave it alone.
- **The existing `persistence.test.ts:34-43` encodes the OLD contract** (mismatch → wipe) and *will fail* after the change unless updated. That's expected — update it deliberately to the new contract (forward/gap/corrupt still wipe; laddered old version upgrades).
- **No canvas coverage.** vitest runs in node with fake localStorage and **no canvas** — perfect for this pure-data change. But it means the only automated proof is unit tests; there's no e2e gate. Make the unit tests airtight.
- **Visual goldens are NOT regenerable on this Windows host** and this change shouldn't touch them anyway — do not run/trust a local `test:visual` regen for this work.
- **Persisting the upgrade:** the migrated save isn't rewritten to disk until the next persist cycle. Acceptable, but if a player loads and immediately closes without any state change, the on-disk save stays at the old version and re-migrates next time. Harmless (idempotent), but note it so it isn't mistaken for a bug.
- **This unblocks docs 12/13/14** — when they change persisted shape, they MUST: bump `SAVE_SCHEMA_VERSION`, add `MIGRATIONS[45]` (or whatever the prior version is), add a fixture, add a migrator test. Reference this brief from those docs.

## References

- `src/state/persistence.ts` — `loadSavedState` version gate (`:23-29`), `persistStateNow`, `VOLATILE`, `SavedState` type. **Primary edit target.**
- `src/state/init.ts` — `initialState` (`:182-277`) the hydration entry; the **second** version gate at `:185`; `createFreshState` (`:52-180`) defines the canonical fresh shape and sets `version` (`:65`).
- `src/state/helpers.ts:104-152` — `defaultTileCollectionSlice` + `mergeLoadedState` (existing field-level, version-agnostic compat to keep separate from the ladder).
- `src/constants.ts:205-207` — `SAVE_SCHEMA_VERSION = 45` + the policy comment to update.
- `src/state.ts:55-62, 1717` — re-exports `loadSavedState`/`initialState` (= `createInitialState`); confirms public surface.
- `src/__tests__/persistence.test.ts` — existing tests; `:34-43` encodes the old destructive contract that must change.
- `src/__tests__/species-5.2.test.ts:58-75` — template for "old save migrates + idempotency" tests.
- `src/__tests__/granary-cap.test.ts:61-71` — the unrelated runtime `MIGRATE/APPLY_CAPS` action (do NOT extend).
- `src/testUtils/testState.ts` — `mergeTestState`, `createFreshState`, `unsafeGameState` for building fixture/test states.
- `.claude/skills/check-slice-action` — only relevant *if* a future migrator adds a runtime action (the ladder itself adds none).
- CLAUDE.md — house rules (note: it says `.js/.jsx`; the real files are `.ts/.tsx` — trust the code).
- Memory: `economy-balance-pass-2026-06-13`, `zone-tier-ladder-2026-06-13`, `pc2-cost-port-2026-06-17` — context on the 43→44→45 bumps that wiped saves and why this ladder matters.
