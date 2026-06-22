# Self-Describing Slices (kill the SLICE_PRIMARY_ACTIONS footgun)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Eliminate the repo's #1 documented footgun. The reducer pipeline in `src/state.ts` only runs a feature slice for an action if that action's `type` string has been hand-copied into one of two module-level `Set`s — `SLICE_PRIMARY_ACTIONS` and `ALWAYS_RUN_SLICES`. Forget to copy it, and the slice silently no-ops: the dispatch fires, the slice file has a `case` for it, and nothing happens. This is so easy to hit that the team built an entire `.claude/skills/check-slice-action` skill purely to compensate, and the skill itself records the bug shipping at least twice (`STORY/DISMISS_MODAL`; the `magic_seed`/`magic_fertilizer` `USE_TOOL` variants).

We fix this by inverting the source of truth: each slice **declares** the action types it owns (and whether it must always run), and `state.ts` **derives** the two `Set`s from those declarations at module load. The wiring becomes impossible to forget because adding a `case` and adding a declaration live in the same file. This is a behavior-preserving refactor of the reducer hub (`rawReducer`/`coreReducer`), which is a top-5 god node in the graph — so it must be surgical and leaned hard against the existing vitest suite.

## Background & current state (VERIFIED)

All references below were opened and confirmed in this worktree (line numbers as of writing — re-grep before editing, they drift).

**The pipeline** — `src/state.ts`:
- `slices` array (`state.ts:64`) — the 17 slice modules the pipeline folds over, in order:
  `crafting, quests, achievements, tutorial, settings, boss, cartography, storySlice, decorations, portal, market, castle, fish, zones, workers, boons, runSummary`.
  Each is imported as a namespace module (`import * as boss from "./features/boss/slice.js"`, `state.ts:24-46`).
- `rawReducer(state, action)` (`state.ts:1653-1671`) is the hub:
  ```ts
  const afterCore = coreReducer(state, action);
  const needSlices = afterCore !== state
    || SLICE_PRIMARY_ACTIONS.has(action.type)
    || shouldAlwaysRunSlices(state, action);
  if (!needSlices) return state;
  const afterSlices = slices.reduce((s, slice) => slice.reduce(s, action), afterCore);
  return afterSlices === state ? state : afterSlices;
  ```
  The footgun is the `needSlices` guard: if `coreReducer` returns the **same reference** (no `case` for the action → `default: return state`) AND the type is in neither `Set`, slices are skipped entirely.
- `coreReducer(state, action)` (`state.ts:225`) — the giant canonical reducer.

**The two hand-maintained tables** (the thing we are killing):
- `SLICE_PRIMARY_ACTIONS = new Set([...])` — `state.ts:1590-1634`. **32 entries** today (verified by count). These are actions owned *exclusively* by slices (coreReducer has no `case`).
- `ALWAYS_RUN_SLICES = new Set([...])` — `state.ts:1639-1642`. 2 entries: `"CRAFTING/CRAFT_RECIPE"`, `"USE_TOOL"`. These are core+slice actions where core sometimes returns same-state (e.g. no story beat fired) but slices must still run.
- `shouldAlwaysRunSlices(state, action)` (`state.ts:1644-1651`) — wraps `ALWAYS_RUN_SLICES.has(...)` but adds a **stateful guard for `CRAFTING/CRAFT_RECIPE`**: it only returns true when `crafting.canPayForRecipe(state, craftKey)` is truthy. This is NOT a flat membership test and MUST be preserved verbatim (see Risks).

**The exact current `SLICE_PRIMARY_ACTIONS` membership** (verified by opening each slice; quote style varies — settings/tutorial/cartography use single quotes, so a `"..."`-only grep misses them):

| Action | Owning slice(s) (has a `case`) |
|---|---|
| `WORKERS/HIRE`, `WORKERS/FIRE` | `workers` |
| `BUILD_DECORATION` | `decorations` |
| `SUMMON_MAGIC_TOOL` | `portal` |
| `MARKET/SELL` | `market` |
| `QUESTS/CLAIM_QUEST`, `QUESTS/CLAIM_ALMANAC`, `QUESTS/PROGRESS_QUEST` | `quests` |
| `BOSS/TRIGGER`, `BOSS/RESOLVE`, `BOSS/REJECT`, `BOSS/MINIMIZE`, `BOSS/EXPAND`, `BOSS/CLOSE` | `boss` (note: `BOSS/RESOLVE` is *also* listened to by `achievements`, but `boss` is the primary owner) |
| `CARTO/TRAVEL` | **`cartography` AND `zones`** (two slices both `case` it — derived set must UNION) |
| `STORY/DISMISS_MODAL`, `STORY/PICK_CHOICE` | `story` |
| `SETTINGS/SET_TAB`, `SETTINGS/OPEN_DEBUG`, `SETTINGS/LEAVE_BOARD`, `SETTINGS/TOGGLE`, `SETTINGS/RESET_SAVE`, `SETTINGS/SHOW_TUTORIAL` | `settings` |
| `TUTORIAL/START`, `TUTORIAL/NEXT`, `TUTORIAL/PREV`, `TUTORIAL/SKIP` | `tutorial` |
| `CASTLE/CONTRIBUTE` | `castle` |
| `FISH/FORCE_TIDE_FLIP` | `fish` |
| `BOON/PURCHASE` | `boons` |
| `RUN_SUMMARY/OPEN`, `RUN_SUMMARY/CLOSE` | `runSummary` |

**The subtle correctness pin (most important fact in this doc):** membership in `SLICE_PRIMARY_ACTIONS` is **NOT** "every action any slice has a `case` for." Many actions are handled by slices yet are deliberately absent because `coreReducer` mutates state for them (so `afterCore !== state` already fires slices). Examples: `CHAIN_COLLECTED` is `case`d by `achievements`, `boss`, AND `runSummary` but is NOT in the set; `CLOSE_SEASON`, `STORY/BEAT_FIRED`, `END_TURN`, `FARM/ENTER`, `EXPEDITION/DEPART`, `DEV/RESET_GAME` are slice-handled but absent. **Therefore the per-slice `primaryActions` declaration must list only the actions for which that slice is the *primary owner* (coreReducer has no mutating handler), exactly reproducing today's hand set — not "everything I `case`."** The transitional equality test (below) is what guarantees we got this list right.

**The slice module contract today** — every module in the `slices` array already exports `reduce(state, action)` and `initial` (an object spread into the fresh state in `src/state/init.ts:165-176`). Adding `primaryActions`/`alwaysRun` exports is a natural, additive extension of an existing convention — it does not change the module shape that `init.ts` or `slices.reduce` depend on.

**Persistence:** `SAVE_SCHEMA_VERSION = 45` (`src/constants.ts:207`). This refactor touches **only reducer dispatch routing** — no persisted state field is added, removed, or reshaped. **No schema bump. No save wipe.** (Bumping would wipe every save: `src/state/persistence.ts` is version-gated with no migration ladder — see doc 08.) If you find yourself editing `constants.ts` version, you've gone off-plan.

**The skill we retire:** `.claude/skills/check-slice-action/SKILL.md` — its whole "Procedure" is "did you remember to add it to the right `Set`?" Once the `Set`s are derived, the answer is structurally "yes if you declared it in your slice," and the skill's manual cross-check is obsolete.

**Seed-brief corrections:** The seed's line range "~L1590-1671" is right for the region but conflates the two tables + pipeline; precise spans are `SLICE_PRIMARY_ACTIONS` 1590-1634, `ALWAYS_RUN_SLICES` 1639-1642, `rawReducer` 1653-1671. The seed says files are `.js` — they are `.ts`/`.tsx` (CLAUDE.md drift; imports use `.js` specifiers but the files on disk are `.ts`). The seed's "two Sets" is accurate but understates that `ALWAYS_RUN_SLICES` is wrapped by a *stateful* `shouldAlwaysRunSlices` guard that cannot be flattened into a plain derived set.

## Scope

**In scope:**
- Add a small typed declaration export to each slice module that is a primary owner of, or an always-run participant in, an action: `export const primaryActions: readonly string[]` and/or `export const alwaysRun: readonly string[]`.
- In `src/state.ts`, derive `SLICE_PRIMARY_ACTIONS` and `ALWAYS_RUN_SLICES` by unioning those declarations across the `slices` array at module load.
- Add a **transitional** unit test asserting the derived `Set`s exactly equal the current hand-maintained literal `Set`s (snapshot the literals into the test before deleting them).
- Remove the hand-maintained literal `Set`s once the test is green.
- Preserve `shouldAlwaysRunSlices`'s stateful `CRAFTING/CRAFT_RECIPE` `canPayForRecipe` guard exactly.
- Update `.claude/skills/check-slice-action/SKILL.md` to reflect the new model (retire or rewrite to "declare in your slice's `primaryActions`").
- Run `graphify update .` after code changes.

**Out of scope / non-goals:**
- Any behavior change to any reducer, any slice's `case` logic, or the order slices run in.
- Changing the `slices` array membership or the `import * as` module style.
- Touching `coreReducer` logic, persisted state shape, or `SAVE_SCHEMA_VERSION`.
- A generic "action registry" / typed-action framework. We only move two `Set`s' source of truth; do not gold-plate.
- Auto-deriving primary-vs-always from `coreReducer` introspection (impossible to do statically — `coreReducer` is one giant switch; do not attempt).
- Adding new actions or wiring new features.

## Implementation plan

Work TDD-ish and lean on the full suite (`npm test`) after every step. The whole point is to prove byte-for-byte behavior preservation.

### Step 0 — Snapshot the truth (do this first, before touching anything)
Copy the *exact* current contents of both literal `Set`s out of `src/state.ts` into a scratch fixture you'll use in the transitional test. This is your golden. Re-derive nothing yet.

### Step 1 — Add declarations to each owning slice
For every slice that is a primary owner, add an exported constant. Keep it next to `reduce` so the `case` and the declaration are co-located (that co-location is the whole anti-footgun). Example for `src/features/boss/slice.ts`:

```ts
// Actions this slice OWNS (coreReducer has no mutating handler for them, so the
// pipeline only runs slices for these if they are registered). Adding a `case`
// below without listing it here = the silent-no-op footgun. Keep in sync.
export const primaryActions = [
  "BOSS/TRIGGER", "BOSS/RESOLVE", "BOSS/REJECT",
  "BOSS/MINIMIZE", "BOSS/EXPAND", "BOSS/CLOSE",
] as const;
```

Per-slice `primaryActions` to add (mirrors the verified table above — list ONLY owned actions, not every `case`):
- `workers`: `WORKERS/HIRE`, `WORKERS/FIRE`
- `decorations`: `BUILD_DECORATION`
- `portal`: `SUMMON_MAGIC_TOOL`  (and `alwaysRun: ["USE_TOOL"]` — see Step 2)
- `market`: `MARKET/SELL`
- `quests`: `QUESTS/CLAIM_QUEST`, `QUESTS/CLAIM_ALMANAC`, `QUESTS/PROGRESS_QUEST`
- `boss`: the six `BOSS/*` above
- `cartography`: `CARTO/TRAVEL`
- `zones`: `CARTO/TRAVEL`  (intentional duplicate — `zones` also `case`s it; the union dedups)
- `story`: `STORY/DISMISS_MODAL`, `STORY/PICK_CHOICE`
- `settings`: `SETTINGS/SET_TAB`, `SETTINGS/OPEN_DEBUG`, `SETTINGS/LEAVE_BOARD`, `SETTINGS/TOGGLE`, `SETTINGS/RESET_SAVE`, `SETTINGS/SHOW_TUTORIAL`
- `tutorial`: `TUTORIAL/START`, `TUTORIAL/NEXT`, `TUTORIAL/PREV`, `TUTORIAL/SKIP`
- `castle`: `CASTLE/CONTRIBUTE`
- `fish`: `FISH/FORCE_TIDE_FLIP`
- `boons`: `BOON/PURCHASE`
- `runSummary`: `RUN_SUMMARY/OPEN`, `RUN_SUMMARY/CLOSE`

Slices with **no** `primaryActions` (purely cross-cutting / core-mutates-first): `crafting` (but see Step 2 for its `alwaysRun`), `achievements`. Leave their declaration unset (treated as `[]`). Do **not** add `CHAIN_COLLECTED`, `CLOSE_SEASON`, etc. anywhere — they are deliberately absent.

### Step 2 — Add `alwaysRun` declarations
`ALWAYS_RUN_SLICES` = `{ "CRAFTING/CRAFT_RECIPE", "USE_TOOL" }`.
- `crafting`: `export const alwaysRun = ["CRAFTING/CRAFT_RECIPE"] as const;`
- `portal`: `export const alwaysRun = ["USE_TOOL"] as const;`

`USE_TOOL`'s magic-tool variants are handled in `portal/slice.ts` (verified). `CRAFTING/CRAFT_RECIPE`'s core-vs-slice deferral is owned by `crafting`. Declare each on the slice that needs the always-run.

### Step 3 — Derive the Sets in `src/state.ts`
Replace the two literal `Set`s with derivations from the `slices` array. The `import * as X` namespace objects can carry optional `primaryActions` / `alwaysRun`. Type the module shape loosely so older slices without the field don't error:

```ts
type SliceModule = {
  reduce: (s: GameState, a: Action) => GameState;
  primaryActions?: readonly string[];
  alwaysRun?: readonly string[];
};

const SLICE_PRIMARY_ACTIONS = new Set<string>(
  (slices as SliceModule[]).flatMap((s) => s.primaryActions ?? []),
);
const ALWAYS_RUN_SLICES = new Set<string>(
  (slices as SliceModule[]).flatMap((s) => s.alwaysRun ?? []),
);
```

Keep `shouldAlwaysRunSlices` (`state.ts:1644-1651`) EXACTLY as-is — it reads the derived `ALWAYS_RUN_SLICES` for the non-craft path and keeps the stateful `crafting.canPayForRecipe` branch for `CRAFTING/CRAFT_RECIPE`. The derived set membership for `CRAFTING/CRAFT_RECIPE` is irrelevant to that branch (the `if` short-circuits before `.has`), but include it in the derivation anyway so the equality test passes — its presence is harmless because the `if` handles it first.

`rawReducer` is untouched: it already references the two `Set` names. The derivation just changes how they're built.

### Step 4 — Transitional equality test (RED → GREEN before deleting literals)
Add `src/__tests__/slice-action-registry.test.ts` (see Validation). It pins the derived `Set`s against the Step-0 golden literals. Run it WHILE both the literals and the derivation exist (temporarily rename one, or assert derived == hardcoded-golden-array). Only once it is green do you delete the literal arrays.

### Step 5 — Retire / rewrite the skill
Update `.claude/skills/check-slice-action/SKILL.md`: either delete it, or rewrite the Procedure to "add the action to your slice's exported `primaryActions` (or `alwaysRun`) array next to its `case`; the `Set`s derive automatically; run `npm test`." Keep the historical "shipped twice" note as motivation. Also fix its stale `src/state.js`/`slice.js` paths to `.ts`.

### Step 6 — `graphify update .` and validate (next section).

**Footgun callout (meta):** this refactor *removes* the slice-registration footgun for future authors. But while editing `state.ts` you are touching a god node — do not let the derivation accidentally change set membership (the equality test guards this). No `SAVE_SCHEMA_VERSION` bump (Step plan changes zero persisted shape). The `check-slice-action` skill (per house rules) is the right tool to sanity-check any single action during this work.

## Success criteria

- [ ] Each primary-owner slice in the `slices` array exports a `primaryActions` (and/or `alwaysRun`) array co-located with its `reduce`.
- [ ] `SLICE_PRIMARY_ACTIONS` and `ALWAYS_RUN_SLICES` in `src/state.ts` are DERIVED from the slice declarations (no hand-maintained literal action lists remain in `state.ts`).
- [ ] The derived `SLICE_PRIMARY_ACTIONS` set equals the 32-entry golden snapshot exactly (same members, no more, no fewer).
- [ ] The derived `ALWAYS_RUN_SLICES` set equals `{ "CRAFTING/CRAFT_RECIPE", "USE_TOOL" }` exactly.
- [ ] `shouldAlwaysRunSlices` still applies the stateful `crafting.canPayForRecipe` guard for `CRAFTING/CRAFT_RECIPE` (verified by an unpayable-recipe test still passing).
- [ ] New test `src/__tests__/slice-action-registry.test.ts` exists and passes, asserting derived == golden for both sets.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass with zero new failures.
- [ ] `SAVE_SCHEMA_VERSION` is unchanged (still `45`).
- [ ] `.claude/skills/check-slice-action/SKILL.md` is updated/retired to reflect derived sets.
- [ ] `graphify update .` has been run after the code changes.

## Validation — how to verify

**Gating commands** (must pass — run in this order):
```bash
npm run typecheck   # loose SliceModule typing must not error; namespace imports OK
npm run lint        # ESLint over src/ + prototype.tsx
npm test            # vitest, node env, fake localStorage, NO canvas — the workhorse
npm run build       # production bundle
```
"Pass" = zero new failures vs `main`. `npm test` is the load-bearing one: the existing reducer suite (`src/__tests__/reducers.test.ts`, `run-summary-slice.test.ts`, `fish-tide.test.ts`, `audit-boss.test.ts`, `daily-streak.test.ts`, `bombs.test.ts`, `farm-*.test.ts`, plus the coverage rounds) already drives the slice pipeline end-to-end for the bulk of these actions. If any slice's action stops reaching its slice, those go red.

**NEW test — `src/__tests__/slice-action-registry.test.ts`** (gating). It asserts:
1. `derivedPrimary` (import `{ SLICE_PRIMARY_ACTIONS }` — re-export it from `state.ts` if not already exported; export is test-only and harmless) deep-equals the golden 32-entry array as a `Set`. Use the Step-0 snapshot literally inlined in the test so the test is the immutable contract.
2. `derivedAlways` equals `new Set(["CRAFTING/CRAFT_RECIPE", "USE_TOOL"])`.
3. **No-stray-declaration guard:** every string in any slice's `primaryActions` is a non-empty string and (optional but recommended) appears as a `case` substring nowhere is over-engineered — keep this assertion to "primaryActions ⊆ golden" so an accidental extra declaration fails loudly.
4. **Round-trip dispatch smoke:** for a representative pure-slice action that previously needed registration (`BOON/PURCHASE`, `RUN_SUMMARY/OPEN`, `CARTO/TRAVEL`, `FISH/FORCE_TIDE_FLIP`), dispatch through `rootReducer` (`= rawReducer`, exported `state.ts:1716`) on a fresh `createInitialState()` and assert the resulting state reflects the slice's effect (e.g. `RUN_SUMMARY/OPEN` → `state.runSummary.open === true`). This proves the derived set actually routes, not just matches a literal.

**Informational (not gating, not regenerable on this host):**
- `npm run test:e2e` (Playwright) and `npm run test:visual` — this is a pure reducer-routing change with no canvas/DOM surface, so visual goldens are irrelevant; do NOT regen them here (DOM drifts 3-5%, Phaser WebGL ~38% off-host; re-baseline only on a canonical host). e2e is informational confidence only.

**Manual in-game check** (optional, since change is non-visual): start a worktree Vite on a spare port (worktree has no `node_modules`):
```bash
node ../../../node_modules/vite/bin/vite.js --port 5199 --base /puzzleDrag2/
```
Then in devtools drive the reducer via `window.__hearthVisual.dispatch({type:"BOON/PURCHASE", ...})` and read `window.__hearthVisual.state()` to confirm the boon registered — i.e. the pure-slice action still routes after the refactor. `preview_screenshot` HANGS on this host — assert via the live `state()` accessor, not screenshots. (`:5173` serves MAIN, not this worktree.)

## Double-check / adversarial review

**Did I really wire it? (prove the derived set ≡ old set):**
- The transitional test is the proof. Build it RED first: derive the set, but temporarily assert against a deliberately-wrong golden (drop one entry) and watch it fail; then restore the true golden and watch it pass. This proves the assertion has teeth.
- Independently: `console.log([...SLICE_PRIMARY_ACTIONS].sort())` from a throwaway test and diff against `git show main:src/state.ts` lines 1590-1634 by hand. They must match member-for-member (32 entries).

**What a skeptic attacks:**
- *"You dropped `CARTO/TRAVEL` because two slices both declared it."* — The `flatMap` + `Set` unions and dedups; declaring it on both `cartography` and `zones` yields one set entry. The equality test catches a miss either way.
- *"You added `CHAIN_COLLECTED` because achievements `case`s it."* — Don't. It's deliberately absent (coreReducer mutates for it). The "primaryActions ⊆ golden" assertion fails loudly if you over-declare.
- *"The `CRAFTING/CRAFT_RECIPE` payability guard regressed."* — Keep `shouldAlwaysRunSlices` byte-identical. Verify with a test that dispatches `CRAFTING/CRAFT_RECIPE` on a state that cannot afford the recipe and asserts no craft side-effect ran (this behavior is why it's NOT a flat membership test). The existing crafting/coverage tests likely already cover this — confirm they stay green.
- *"Module-load ordering / circular import."* — `slices` is already defined at module top (`state.ts:64`) and the derivations run right after; the slice modules are already imported at the top of `state.ts`, so reading `s.primaryActions` at module-eval time is safe (the constants are eagerly exported `const`s, not lazy). If a slice's `primaryActions` were defined *after* its `reduce` but the module is fully evaluated on import, it's still available — confirm by running `npm test` (any TDZ/undefined would throw at import).

**Edge cases:**
- A slice with `primaryActions` but no matching `case` (dead declaration) → harmless to routing, but flag it; the equality test would fail if it pushed the set past golden.
- A slice that gains a NEW action later: author adds the `case` + one line to `primaryActions`. The footgun is gone *only if they touch the same file* — which they now do. (This is the win; call it out in the skill rewrite.)

**Rollback safety:** Pure-logic, single-commit-revertable. No persisted shape change → no save migration risk → reverting cannot strand a save. If anything regresses, `git revert` the commit; saves are untouched because `SAVE_SCHEMA_VERSION` never moved.

**Prove the previously-dead-path-now-fires angle is N/A here:** this is behavior-PRESERVING (the sets are identical), not a dormant-system revival. The "fires now" proof is the round-trip dispatch smoke test confirming the SAME actions still route post-refactor.

## Risks & gotchas

- **The set is NOT "every action a slice handles."** The single biggest way to break this is to derive membership from "does the slice have a `case`." `CHAIN_COLLECTED`, `CLOSE_SEASON`, `STORY/BEAT_FIRED`, `END_TURN`, `FARM/ENTER`, `EXPEDITION/DEPART`, `DEV/RESET_GAME` are slice-handled yet correctly absent (coreReducer mutates first). Declare ONLY primary-owned actions. The equality test is the safety net.
- **`shouldAlwaysRunSlices` is stateful for crafting** (`state.ts:1644-1651`). Do not flatten it into the derived set. Its `crafting.canPayForRecipe(state, craftKey)` gate is real game logic (an unaffordable craft must not run slices). Leave the function intact; only its `ALWAYS_RUN_SLICES.has(...)` line reads the derived set.
- **Quote-style grep trap.** settings/tutorial/cartography use single quotes for action types; a `grep "\"ACTION\""` (double-quote) MISSES them and you'll wrongly conclude an action is unhandled. Use quote-agnostic grep (it cost time during research — verified `CARTO/TRAVEL`, `SETTINGS/*`, `TUTORIAL/*` are all handled).
- **`CARTO/TRAVEL` is dual-owned** (cartography + zones). Both must declare; union dedups.
- **Touching a god node.** `state.ts` (`coreReducer`/`rawReducer`) is a top-5 graph node. Keep the diff to: the derivation block + (test-only) a `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` re-export if needed. Do not refactor anything adjacent.
- **No `SAVE_SCHEMA_VERSION` bump** (`constants.ts:207`, currently `45`). If you touch it you've changed persisted shape — you haven't; back it out. A bump wipes all saves (`src/state/persistence.ts`, no migration; doc 08).
- **TypeScript `import * as` shape.** The namespace objects may not be statically typed to include `primaryActions`. Use the loose `SliceModule` cast (Step 3) rather than declaring the field on every module's type, to keep the diff small and avoid 17 type edits.
- **Visual goldens are not regenerable here** and this change has no visual surface — do not run/trust a local `test:visual` regen.
- **CLAUDE.md says `.js`/`.jsx`** — that's doc drift; the files are `.ts`/`.tsx` (imports keep `.js` specifiers). Edit the `.ts` files.

## References

- `src/state.ts` — `slices` array (`:64`), `coreReducer` (`:225`), `SLICE_PRIMARY_ACTIONS` (`:1590-1634`), `ALWAYS_RUN_SLICES` (`:1639-1642`), `shouldAlwaysRunSlices` (`:1644-1651`), `rawReducer` (`:1653-1671`), `rootReducer`/`createInitialState` exports (`:1716-1717`).
- `src/features/*/slice.ts` — the 17 owning slices; each already exports `reduce` + `initial`. Read `boss`, `settings`, `tutorial`, `cartography`, `runSummary`, `boons` first (representative of the patterns).
- `src/state/init.ts` (`:165-176`) — how `initial` exports are aggregated (the precedent for adding new slice exports).
- `src/constants.ts` (`:207`) — `SAVE_SCHEMA_VERSION = 45` (do NOT bump).
- `src/state/persistence.ts` — version-gated, no migration (why a bump wipes saves).
- `.claude/skills/check-slice-action/SKILL.md` — the skill to retire/rewrite; documents the two prior shipped bugs.
- `src/__tests__/reducers.test.ts`, `run-summary-slice.test.ts`, `fish-tide.test.ts`, `audit-boss.test.ts` — existing pipeline coverage to lean on.
- House rules: vitest is node-env with fake localStorage and NO canvas; the Phaser layer has zero unit coverage; visual goldens not regenerable on Windows dev host; merge with merge commits, non-draft PRs.
- Related project docs: `docs/projects/08-*` (save-migration ladder) — depend on it only IF you ever need a schema change (you don't here).
