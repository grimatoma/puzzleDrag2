# Quick Wins — Dormant & Dead Systems

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Four systems in this codebase are fully built (some even unit-tested) but never actually run, plus one asset folder is in a half-generated state that lies about what art exists. None of them is hard to fix individually; the value is in **landing all four in one focused PR** so the audit findings turn into real, observable behaviour instead of dead code.

Why it matters: dead-but-tested code is the worst kind of debt — it passes CI, reads as "done," and silently delivers nothing to the player. A daily-login streak that never fires is a retention feature the game paid for and isn't getting. An NPC reactive line nested in the wrong object is content the writer wrote that no player will ever see. A worker whose effect targets a non-existent category charges the player coins for nothing and contradicts its own tooltip. And half-generated seasonal art makes the asset tree untrustworthy for the next art pass. Each fix is small; together they remove four "looks done, does nothing" landmines.

## Background & current state (VERIFIED)

All four claims in the seed brief were checked against the actual code in this worktree. Most are correct in substance; several specifics (folder names, schema impact, slice-footgun applicability) needed correction and are flagged below.

### (a) Daily streak is DEAD — VERIFIED, with corrections

- **Reducer EXISTS and is correct.** `src/state.ts:1323` `case "LOGIN_TICK":` is a full handler inside `coreReducer`'s switch — first-login → day 1, consecutive day → +1 (capped 30), gap ≥2 → reset to 1, same-day re-open is idempotent (`if (last === today) return state;` at `state.ts:1327`). On success it credits coins/runes/tools/unlockTile and sets `modal: "daily_streak"` + `modalParams: { day, reward }` (`state.ts:1364`).
- **Ladder EXISTS.** `src/constants.ts:1130` `export const DAILY_REWARDS` is the 30-day table (note: day 6 is intentionally absent → falls through to the `{ coins: 25 }` default at `state.ts:1338`). Day 30 = `{ coins: 1000, runes: 3, unlockTile: "tile_cattle_triceratops" }`.
- **Day-key helper EXISTS.** `src/constants.ts:1186` `export function dayKeyForDate(d: Date): string` returns local `YYYY-MM-DD`. (Seed brief's `dayKeyForDate(new Date())` is the correct call.)
- **Action type IS registered.** `"LOGIN_TICK"` is in the action-type list at `src/types/actions.ts:56` and has a payload type in `src/types/actionPayloads.ts`.
- **State field EXISTS and is persisted.** `dailyStreak: { lastClaimedDate: null, currentDay: 0 }` is seeded in `src/state/init.ts:144` and typed at `src/types/state.ts:262`. Persistence (`src/state/persistence.ts:39`) saves the whole state minus `VOLATILE` (`persistence.ts:6` = `modal, bubble, view, viewParams, pendingView, craftingTab`). `dailyStreak` is **not** volatile → already persisted under the current schema.
- **It is UNIT-TESTED.** `src/__tests__/daily-streak.test.ts` exercises every branch of the reducer (10 assertions, all green today).
- **THE GAP — zero production dispatch.** Grepping `LOGIN_TICK` across the repo returns only: `src/types/actions.ts`, `src/types/actionPayloads.ts`, `src/state.ts` (the reducer), and the two test files. **Nothing in `prototype.tsx` or any feature ever dispatches it.** The mount-time effects that *do* exist are `SESSION_START` (`prototype.tsx:460-462`) and the visual-bridge install — no `LOGIN_TICK`. So the streak never advances and the reward modal never appears in normal play.
- **SECOND DEAD LAYER — the modal has no renderer.** Even after wiring the dispatch, `state.modal = "daily_streak"` renders **nothing**. Modals mount via the feature registry in `src/ui.tsx`: `FeatureModals` (rendered at `prototype.tsx:634`) loops `FEATURES` and mounts the one whose exported `modalKey === state.modal` (`ui.tsx:112-117`). There is **no feature exporting `modalKey: "daily_streak"`** (grep for `daily_streak` across `*.tsx` returns zero matches). So today even a manual dispatch would advance the streak silently with no UI. **This is a correction to the seed brief**, which implied wiring the dispatch alone makes "the daily-reward modal show." It does not — a modal component must also be added. `daily_streak` is also **not** in `KNOWN_MODALS` (`src/router.ts:42` = `menu, boss, tutorial, debug, festivals`), but that set only governs URL routing; reducer-driven modals (like the model below) don't need to be in it. We will leave `KNOWN_MODALS` alone.
- **CORRECTION — no SAVE_SCHEMA bump needed.** The seed brief's persistence house-rule is real but does not apply here: `dailyStreak` is already in the persisted shape at the current `SAVE_SCHEMA_VERSION = 45` (`src/constants.ts:207`). We are not changing persisted shape, so **do not** bump the schema (a bump wipes every save — `persistence.ts:23-28`).
- **CORRECTION — slice footgun does NOT apply.** `LOGIN_TICK` is handled in `coreReducer`'s big switch, not in a feature slice, so it does **not** need to be in `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` (`src/state.ts:1590` / `:1639`). `coreReducer` always runs (`rawReducer` at `state.ts:1663` calls it unconditionally). Adding it to those sets would be wrong.

### (b) Tomas reactive line ORPHANED — VERIFIED

- `src/features/npcs/dialog.ts`. The `tomas` entry's `reactive: [...]` array (lines **223-229**, the `tomas_first_order` line) is nested **inside the `winter` seasonal pool object** — the `winter: { ... }` block opens at `dialog.ts:202` and its closing `},` is at `dialog.ts:230`, with `reactive` sitting at lines 223-229, *after* the `Beloved` band and *before* `winter` closes. So `DIALOG_POOLS.tomas.winter.reactive` exists, but `DIALOG_POOLS.tomas.reactive` is `undefined`.
- `pickDialog` only reads reactive lines from the **NPC top level**: `const reactivePool = DIALOG_POOLS?.[npcId]?.reactive;` (`dialog.ts:527`). Because Tomas's array is one level too deep, `pickDialog` never sees it → the `tomas_first_order` line is unreachable.
- Compare the correctly-placed examples: `mira.reactive` (`dialog.ts:33-44`, top level) and `wren.reactive` (`dialog.ts:504-515`, top level, after `winter` closes). The fix is to move Tomas's block to the same position — a sibling of `spring/summer/autumn/winter`, not a child of `winter`.

### (c) Miner worker DEAD — VERIFIED

- `src/features/workers/data.ts:83-94`. The `Miner` ability is `{ id: "threshold_reduce_category", params: { category: "wood", amount: 1 } }` (`data.ts:90`), described as *"Each hired Miner trims one tile off the plank-and-beam chain."* (`data.ts:92`), with hire cost paid in `tile_mine_stone` (`data.ts:87`).
- **No `"wood"` tile category exists.** The canonical category list (from `src/features/tileCollection/data.ts`) is exactly: `bird, cattle, fish, flowers, fruits, grain, grass, herd_animals, mine_coal, mine_gem, mine_gold, mine_iron_ore, mine_stone, mounts, special_dirt, treasure, trees, vegetables`. There is no `wood`, and mining tiles are split per-ore (`mine_stone`, `mine_coal`, …), not a single `mine` bucket. Tree tiles are `trees`.
- **Why it's a no-op:** `threshold_reduce_category` resolves via `ctx.speciesByCategory[category]` in `src/config/abilitiesAggregate.ts:122-126`. For `"wood"` the list is `[]`, so the loop body never runs and the worker contributes nothing to `thresholdReduce`. (Contrast Farmer→`grain` and Lumberjack→`trees`, which work — see their aggregator tests in `tests/phase-4-workers.test.ts:112-131`.)
- **The contradiction:** the player pays an escalating coin + `tile_mine_stone` cost (`data.ts:87`, `nextHireCost`/`nextHireResourceCost` at `data.ts:129`/`:145`) for a worker whose description promises a chain reduction that never lands.
- **NOTE — possible in-flight fix.** A background task (`task_c54455c4`) may already address this. **Before starting (c), confirm it is not already fixed**: `git log --oneline -5 -- src/features/workers/data.ts` and re-read `data.ts:90`. If `category` is no longer `"wood"`, skip (c) (and drop the matching test if already added).

### (d) Orphaned seasonal assets — VERIFIED, with a folder-name correction

- **CORRECTION — folder names.** The seed brief says `public/seasonal-tiles/eggplant` and `.../meadow`. Those paths **do not exist**. Folders are now named by full tile key (a rename captured in MEMORY's seasonal-tile note). The real folders are `public/seasonal-tiles/tile_veg_eggplant/` and `public/seasonal-tiles/tile_grass_meadow/`.
- **The half-generated state is real and these two are unique.** A full survey of all 77 subject folders shows exactly three taxonomies:
  - **Complete (7 files = 4 idles + 3 transitions):** `tile_tree_willow`, `tile_veg_carrot`, `tile_bird_chicken`.
  - **Summer-only (1 file = `idle-summer.png`):** ~71 subjects — the intended baseline (engine renders summer for every season via fallback).
  - **Half-generated ORPHANS (4 files = `idle-summer.png` + the 3 `trans-*.png`, but NO `idle-spring/autumn/winter.png`):** **only** `tile_veg_eggplant` and `tile_grass_meadow`. These are the two the seed brief means.
- **What the engine does with them (so we know the blast radius):** `src/textures/seasonal/seasonalArt.ts` loads only files the manifest reports and falls back per-season to the Summer anchor (`fallbackIdleIndex`, `seasonalArt.ts:138`). The header comment (`seasonalArt.ts:10-15`) documents the incremental model: a missing idle keeps Summer; a present transition plays. So eggplant/meadow will **play a real season-change transition animation and then snap to the summer idle** for spring/autumn/winter — a visibly inconsistent half-state, not a crash. The orphan is a correctness/consistency problem, not a runtime error.
- **The folder scan is dumb-but-safe:** `tools/vite/seasonalSubjects.mjs` simply lists every `*.png` in each folder into `SEASONAL_MANIFEST` (`seasonalSubjects.mjs:21-25`). It does not validate that a subject has a coherent set, so it happily ships the half-state. Whatever we do (complete or strip), the manifest will reflect it after a dev-server restart.
- **Gallery consistency:** the seasonal-tile-system doc gallery is generated from the asset folders via `tools/pixellab/gen_gallery.mjs` + `tools/pixellab/roster.mjs` (see MEMORY's seasonal-tile note and the `seasonal-tile-pipeline` skill, step 7). After changing the folders, the gallery region must be regenerated so the doc and the asset tree agree.

## Scope

**In scope:**
- (a) Dispatch `LOGIN_TICK` once at app mount in `prototype.tsx` using `dayKeyForDate(new Date())`, AND add a `daily_streak` modal feature so the reward is actually shown and dismissable.
- (b) Move Tomas's `reactive` array from inside `winter` to the NPC top level in `src/features/npcs/dialog.ts`.
- (c) Repoint (or remove) the Miner's `threshold_reduce_category` to a real category and reconcile its `description` — **only if the background task hasn't already done it.**
- (d) Resolve the two seasonal orphans (`tile_veg_eggplant`, `tile_grass_meadow`) by **stripping the orphan transition clips** (recommended default) so they match the summer-only baseline, OR completing the 3 missing idles each; then regenerate the gallery so the doc matches.
- New regression tests proving each previously-dead path now fires (one per sub-fix).

**Out of scope / non-goals (keep this tight):**
- No new daily-reward *design* (ladder values, cadence, "claim" button styling) — wire the existing system, do not redesign it.
- No SAVE_SCHEMA bump and no migration work — nothing here changes persisted shape (`dailyStreak` already persists).
- No changes to other workers, other NPCs' dialog, or other seasonal subjects.
- No generation of *new* seasonal art beyond (at most) completing eggplant/meadow's 3 idles each. Generating full season sets for the other 71 summer-only subjects is explicitly a separate effort.
- No touching `KNOWN_MODALS`/`router.ts` (the daily-streak modal is reducer-driven, not URL-routed).
- No e2e/visual golden re-baselining on this host (goldens are not regenerable here and not in CI).

## Implementation plan

Do the fixes in this order. (b) and (c) are pure-data one-liners; (a) is the largest (dispatch + modal component); (d) is asset surgery + gallery regen.

### Step 1 — (b) Tomas reactive line (smallest, lowest risk)

In `src/features/npcs/dialog.ts`, cut the `reactive: [ ... ]` block (lines ~223-229) out of the `winter` object and paste it as a **sibling** of `spring/summer/autumn/winter` inside the `tomas` entry — mirror exactly how `wren.reactive` (`dialog.ts:504-515`) sits after `winter`'s closing `},`. Resulting shape:

```ts
tomas: {
  spring: { ... },
  summer: { ... },
  autumn: { ... },
  winter: {
    Sour: [...], Warm: [...], Liked: [...], Beloved: [...],
  },                         // <- winter now closes cleanly here
  reactive: [
    {
      id: "tomas_first_order",
      text: "Old Tomas: 'The Vale is talking. ...'",
      req: (s) => s.story?.flags?.first_order,
    },
  ],
},
```

Watch the braces: the current `winter` block is missing its own clean close because `reactive` was wedged in before it. After moving, `winter` must end with `},` and `reactive` must be a top-level key of `tomas`.

### Step 2 — (c) Miner category + description (confirm not already fixed first)

Run `git log --oneline -5 -- src/features/workers/data.ts` and re-open `src/features/workers/data.ts:90`. If `category` is still `"wood"`, fix it. Recommended: point at `mine_stone` (matches the hire cost `tile_mine_stone` and Bram's-pickhands flavor) and rewrite the description to match the real chain:

```ts
abilities: [
  { id: "threshold_reduce_category", params: { category: "mine_stone", amount: 1 } },
],
description: "Each hired Miner trims one tile off the stone-mining chain.",
```

Note: categories are per-ore, so one Miner type can only reduce one ore category. `mine_stone` is the right single choice given the cost/flavor. (If product later wants miners to cover all ores, that's a multi-ability or new-category change — out of scope here.) Do **not** add this action to `SLICE_PRIMARY_ACTIONS`; worker effects are computed by the aggregator (`computeAggregatedAbilities`, `aggregate.ts:153`), not gated by a slice-action set.

### Step 3 — (a) Wire LOGIN_TICK + add the daily-streak modal

**3a. Dispatch at mount.** In `prototype.tsx`, alongside the existing `SESSION_START` mount effect (`prototype.tsx:460-462`), add:

```tsx
// Daily login-streak tick — fires once per app mount; the reducer is
// idempotent per local day (state.ts LOGIN_TICK), so re-mounts within the
// same day are no-ops. Uses the local-day key helper from constants.
useEffect(() => {
  dispatch({ type: "LOGIN_TICK", payload: { today: dayKeyForDate(new Date()) } });
}, [dispatch]);
```

Import `dayKeyForDate` from `./src/constants.js` (check existing imports at the top of `prototype.tsx` and add it). No slice registration needed (core-reducer action). Persistence is automatic — `persistState(next)` runs inside the reducer wrapper (`state.ts:1709`), and `dailyStreak` is non-volatile.

**3b. Add the modal feature.** Create `src/features/dailyStreak/index.tsx`, modeled exactly on `src/features/festivals/index.tsx` (the canonical minimal modal feature):

```tsx
import Button from "../../ui/primitives/Button.jsx";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import type { Dispatch, GameState } from "../../types/state";

export const modalKey = "daily_streak";

export default function DailyStreakModal({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  if (state.modal !== "daily_streak") return null;
  const day = (state.modalParams?.day as number) ?? state.dailyStreak?.currentDay ?? 1;
  const reward = (state.modalParams?.reward ?? {}) as { coins?: number; runes?: number; tool?: string; amount?: number; unlockTile?: string };
  const close = () => dispatch({ type: "CLOSE_MODAL" });
  return (
    <ParchmentDialog open onClose={close} size="sm">
      <ParchmentDialog.Title>Daily Reward — Day {day}</ParchmentDialog.Title>
      <ParchmentDialog.Body>
        <p className="text-body text-ink-mid" data-testid="daily-streak-day">You're on a {day}-day streak.</p>
        <ul className="text-body text-ink-mid" data-testid="daily-streak-reward">
          {reward.coins ? <li>+{reward.coins} coins</li> : null}
          {reward.runes ? <li>+{reward.runes} runes</li> : null}
          {reward.tool ? <li>+{reward.amount ?? 1} {reward.tool} tool</li> : null}
          {reward.unlockTile ? <li>Unlocked a new tile!</li> : null}
        </ul>
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="ember" size="md" onClick={close}>Collect</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
```

The feature auto-registers — `src/ui.tsx:95` globs `./features/*/index.{jsx,tsx}` eagerly, and `FeatureModals` mounts it whenever `state.modal === "daily_streak"` (`ui.tsx:112-117`). No manual wiring beyond creating the file. Reuse `ParchmentDialog`/`Button` exactly as festivals does — do not invent new primitives. Dismiss uses the existing `CLOSE_MODAL` action (`state.ts:798`, sets `modal: null`); `modal` is volatile so it won't persist across reload.

### Step 4 — (d) Resolve seasonal orphans + regen gallery

**Default = strip (recommended), faster and zero-art-cost.** Delete the 3 `trans-*.png` files from each orphan so they revert to the summer-only baseline like the other 71:

```
public/seasonal-tiles/tile_veg_eggplant/trans-spring-summer.png
public/seasonal-tiles/tile_veg_eggplant/trans-summer-autumn.png
public/seasonal-tiles/tile_veg_eggplant/trans-autumn-winter.png
public/seasonal-tiles/tile_grass_meadow/trans-spring-summer.png
public/seasonal-tiles/tile_grass_meadow/trans-summer-autumn.png
public/seasonal-tiles/tile_grass_meadow/trans-autumn-winter.png
```

Leave `idle-summer.png` in place (that is the valid baseline). **Alternative = complete:** generate `idle-spring/autumn/winter.png` for each via the `seasonal-tile-pipeline` skill (PixelLab) — only choose this if product wants these two as full subjects now; it's real art work, not a quick win.

**Then regenerate the gallery** so the doc matches reality: run `node tools/pixellab/gen_gallery.mjs` (rewrites the `<!-- AUTOGALLERY -->` region of `docs/seasonal-tile-system/index.html` from the asset folders + `roster.mjs`). See the `seasonal-tile-pipeline` skill step 7. Restart any running worktree dev server so `seasonalSubjects.mjs` rescans the manifest.

### Step 5 — graphify + validation

After code changes, run `graphify update .` (AST-only, no API cost) to keep the graph current. Then run the validation suite in the next section.

## Success criteria

- [ ] **(a) streak advances:** With a clean save, opening the app dispatches `LOGIN_TICK` and `state.dailyStreak.currentDay` becomes `1` (was `0`); opening again the next local day makes it `2`; coins increase by the ladder amount.
- [ ] **(a) modal shows & dismisses:** After mount on a fresh day, `state.modal === "daily_streak"` and a `ParchmentDialog` titled "Daily Reward — Day N" renders with the reward list; clicking "Collect" dispatches `CLOSE_MODAL` and `state.modal` returns to `null`.
- [ ] **(a) idempotent same day:** Re-mounting within the same local day does not re-credit coins and does not re-open the modal (reducer no-ops on `last === today`).
- [ ] **(a) no schema change:** `SAVE_SCHEMA_VERSION` is still `45`; existing saves load without being wiped.
- [ ] **(b) Tomas line reachable:** `DIALOG_POOLS.tomas.reactive` is defined (top level), `DIALOG_POOLS.tomas.winter.reactive` is `undefined`, and `pickDialog("tomas", "winter", 6, rng, stateWithFirstOrderFlag)` can return the `tomas_first_order` text.
- [ ] **(c) Miner effective (or confirmed already fixed):** A hired Miner contributes a non-empty `thresholdReduce` on the chosen category's species (e.g. `tile_mine_stone`), and the `description` no longer references a chain the ability doesn't touch. If `task_c54455c4` already fixed it, this criterion is met by that change and (c) is skipped.
- [ ] **(d) orphans resolved:** `tile_veg_eggplant` and `tile_grass_meadow` each ship either exactly `idle-summer.png` (stripped) or the full 7-file set (completed) — no folder is left with transitions but missing idles.
- [ ] **(d) gallery consistent:** `docs/seasonal-tile-system/index.html` AUTOGALLERY region regenerated; it shows the orphans in their new (consistent) state.
- [ ] **All gating checks pass:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all green.

## Validation — how to verify

### Gating (must pass before PR)

```bash
npm run lint          # ESLint over src/ + prototype.tsx — expect 0 errors
npm run typecheck     # tsc --noEmit — expect 0 errors (the new .tsx must type-check)
npm test              # vitest (node env, fake localStorage, NO canvas) — all suites green
npm run build         # production build to dist/ — must succeed (proves the Vite seasonal
                      #   manifest plugin + new feature glob still resolve)
```

`npm test` is where the regression coverage lives. The Phaser/canvas layer has **zero** unit coverage, so the seasonal *engine* change (none here — we only touch assets) and any canvas behaviour are only reachable via the in-game manual check below.

### New tests to add (one regression per sub-fix — these are the "previously-dead path now fires" proofs)

1. **(a)** Extend `src/__tests__/daily-streak.test.ts` (or a new `prototype-login-tick.test.tsx`):
   - Reducer-level: assert dispatching `LOGIN_TICK` sets `modal === "daily_streak"` and `modalParams.day` matches `currentDay` (proves the modal trigger fires).
   - Component-level (RTL, jsdom): render `<DailyStreakModal>` with `state.modal === "daily_streak"` and `modalParams: { day: 7, reward: { coins: 150, tool: "shuffle" } }`; assert `getByTestId("daily-streak-day")` shows "7" and the reward list renders; click "Collect" and assert a `CLOSE_MODAL` action was dispatched.
2. **(b)** New `src/__tests__/tomas-reactive.test.ts`: import `DIALOG_POOLS`; assert `Array.isArray(DIALOG_POOLS.tomas.reactive)` is `true` and `DIALOG_POOLS.tomas.winter.reactive` is `undefined`; then call `pickDialog("tomas", "winter", 6, () => 0, { story: { flags: { first_order: true } } })` and assert it can return the `tomas_first_order` text (drive the rng so the reactive branch is taken — `pickDialog` picks reactive when `roll < 0.35`; pass `rng = () => 0`).
3. **(c)** Add a Miner case to `tests/phase-4-workers.test.ts` mirroring the Lumberjack test (`tests/phase-4-workers.test.ts:124-131`): `computeWorkerEffects({ workers: { hired: { miner: 10 } } })` and assert `Object.keys(out.thresholdReduce).some(k => k.startsWith("tile_mine_stone"))` is `true` and each such value is `10`. (This test would have **failed** against `category: "wood"` because the keys list would be empty — that's the regression guard.)
4. **(d)** New `src/__tests__/seasonal-orphans.test.ts`: import `{ SEASONAL_MANIFEST } from "virtual:seasonal-subjects"` (resolves under vitest via `seasonalSubjects.mjs`) and assert no subject ships transitions without all four idles. Concretely: for every key, if `manifest[key]` contains any `trans-*.png`, it must also contain all of `idle-spring/summer/autumn/winter.png`. This guards against re-introducing a half-state and verifies eggplant/meadow are resolved.

### Manual in-game check (for the visual/modal path)

Spin a worktree Vite on a spare port (worktree has no `node_modules`, so run the parent binary), base `/puzzleDrag2/`:

```bash
node ../../../node_modules/vite/bin/vite.js --port 5174 --base /puzzleDrag2/
```

Then in the browser console (DOM asserts — `preview_screenshot` HANGS on this host, do not use it):

```js
// Force a clean fresh day and re-tick:
window.__hearthVisual.dispatch({ type: "SETTINGS/RESET_SAVE" });          // or clear hearth.* keys
window.__hearthVisual.dispatch({ type: "LOGIN_TICK", payload: { today: "2026-01-01" } });
window.__hearthVisual.state().dailyStreak;                                  // { lastClaimedDate:"2026-01-01", currentDay:1 }
window.__hearthVisual.state().modal;                                        // "daily_streak"
document.querySelector('[data-testid="daily-streak-day"]')?.textContent;    // "You're on a 1-day streak."
// Click Collect, then:
window.__hearthVisual.state().modal;                                        // null
```

For the seasonal orphans, confirm the manifest after restart:

```js
// In any module context or via a quick node eval of the scan:
// node -e "import('./tools/vite/seasonalSubjects.mjs')..." — or just check the files:
```
```bash
ls public/seasonal-tiles/tile_veg_eggplant public/seasonal-tiles/tile_grass_meadow
# expect: only idle-summer.png each (stripped) OR the full 7-file set (completed)
```

**Gating vs informational:** `lint`/`typecheck`/`test`/`build` + the four new tests are **gating**. The manual in-game check and gallery regen are **informational** (they prove the player-facing/doc result but aren't CI-enforced; e2e + visual are not in CI and visual goldens are not regenerable on this host).

## Double-check / adversarial review

- **(a) "Did I really wire it?"** Grep `LOGIN_TICK` again after the change — it must now appear in `prototype.tsx` (the new effect) in addition to types/reducer/tests. If it's only in the old four files, the dispatch wasn't added.
- **(a) "Does the modal really render?"** Grep `daily_streak` across `*.tsx` — `src/features/dailyStreak/index.tsx` must appear with `export const modalKey = "daily_streak"`. The festivals modal is the proof-of-pattern: if festivals renders and yours doesn't, compare the `modalKey` string and the `state.modal !==` guard character-for-character. A skeptic's first attack: the dispatch fires but nothing shows → that means the feature glob didn't pick up the file (wrong path/extension) or `modalKey` is misspelled.
- **(a) Edge cases:** (i) Returning player loading a save with `dailyStreak.currentDay = 5, lastClaimedDate = yesterday` → mount tick advances to 6, not reset. (ii) Same-day reload → no double credit (idempotent guard). (iii) Day-6 gap in the ladder → falls back to `{coins:25}`, no crash. (iv) StrictMode double-invoke of the effect in dev → second dispatch is same-day → idempotent no-op (safe). Verify (i) and (ii) with the manual console drive above.
- **(a) Rollback safety:** No schema change, so a revert is clean — delete the effect + the feature file; existing saves are untouched. `modal` is volatile so a stuck modal can't persist.
- **(b) Prove the orphan is healed:** Before — `DIALOG_POOLS.tomas.reactive === undefined`. After — it's an array AND `DIALOG_POOLS.tomas.winter.reactive === undefined`. The test asserts both. Skeptic's attack: you moved it but left a stray copy in `winter`, or you broke a brace and `winter` lost a band — `typecheck` + the test catch the first; eyeball the `winter` object has all four bands (`Sour/Warm/Liked/Beloved`) for the second.
- **(c) Prove it's not still dead:** The new aggregator test fails against `"wood"` (empty keys) and passes against `"mine_stone"`. Run it on the pre-fix code first if you want the red→green proof. Also re-read the `description` — a skeptic will note "stone-mining chain" must match `mine_stone`, not say "plank-and-beam" (which described the old, wrong intent). Confirm the background task didn't already change it to a *different* category (then your test must match whatever it chose).
- **(d) Prove no half-states remain:** The `seasonal-orphans.test.ts` invariant (transitions ⇒ all four idles) is the machine proof. Manually `ls` both folders. Confirm the three *complete* subjects (willow/carrot/chicken) still pass the invariant (they have all 4 idles + 3 transitions) so the test isn't accidentally flagging them.
- **Cross-cutting:** Run the **full** `npm test`, not just the new files — confirm you didn't perturb existing dialog tests, worker tests, or the seasonal `seasonalArt.test.ts` (which reads the manifest). The seasonal engine test should be unaffected since we only removed files an orphan shipped.

## Risks & gotchas

- **No SAVE_SCHEMA bump.** Resist the reflex. `dailyStreak` is already persisted at v45. Bumping `SAVE_SCHEMA_VERSION` (`src/constants.ts:207`) wipes every player save (`persistence.ts:23-28`, no migration ladder). Nothing in this project changes persisted shape.
- **Slice footgun is a non-issue here but easy to over-apply.** `LOGIN_TICK` and worker effects are NOT slice-owned, so do **not** touch `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` (`state.ts:1590`/`:1639`). If you find yourself adding `LOGIN_TICK` there, stop — `coreReducer` already handles it unconditionally. (The `check-slice-action` skill exists if you're unsure, but the answer here is "core action, leave the sets alone.")
- **The modal is a second, separate dead layer.** Wiring the dispatch without adding the modal feature gives a silent streak (advances state, shows nothing). Both parts of (a) are required for the success criterion.
- **Brace surgery in dialog.ts.** The orphan exists *because* of a misplaced brace. Moving it is trivial but a slip drops one of Tomas's seasonal bands or breaks the object. `typecheck` + the dialog test are your guardrails; eyeball the result.
- **Folder names are tile keys now, not bare names.** Don't create `public/seasonal-tiles/eggplant/` — the real folders are `tile_veg_eggplant` / `tile_grass_meadow`. The manifest plugin keys by folder name (`seasonalSubjects.mjs:24`), and the engine looks up by tile `res.key`.
- **Restart the dev server after touching seasonal folders.** `SEASONAL_MANIFEST` is scanned at server/build start (`seasonalSubjects.mjs`), not watched. Stale manifest = stale behaviour during manual QA.
- **Regenerate the gallery, don't hand-edit it.** `docs/seasonal-tile-system/index.html`'s gallery is generated. Hand edits get clobbered next regen; run `gen_gallery.mjs`.
- **Confirm (c) isn't double-done.** `task_c54455c4` may have already landed the Miner fix on another branch. Check `git log -- src/features/workers/data.ts` before editing to avoid a merge conflict or a redundant change.
- **This host can't validate visuals.** e2e/visual goldens are not regenerable here and not in CI; rely on unit tests + DOM/`window.__hearthVisual` asserts. `preview_screenshot` hangs.
- **PR hygiene (house rules):** open a NON-draft PR; merge with a **merge commit** (not squash). No fakes/mocks in production code — `vi.mock` only inside test files.

## References

- `src/state.ts` — `LOGIN_TICK` reducer (`:1323`), `CLOSE_MODAL` (`:798`), `SLICE_PRIMARY_ACTIONS` (`:1590`), `ALWAYS_RUN_SLICES` (`:1639`), `rawReducer`/`persistState` wiring (`:1663`, `:1709`).
- `src/constants.ts` — `DAILY_REWARDS` (`:1130`), `dayKeyForDate` (`:1186`), `SAVE_SCHEMA_VERSION = 45` (`:207`).
- `prototype.tsx` — `useReducer` (`:334`), `SESSION_START` mount effect to mirror (`:460`), `FeatureModals` mount point (`:634`), feature import (`:16`).
- `src/ui.tsx` — feature glob + `modalKey` mounting (`:95`, `:106-117`).
- `src/features/festivals/index.tsx` — the canonical minimal `modalKey` modal to model the daily-streak modal on.
- `src/features/npcs/dialog.ts` — Tomas pool (`:135`), orphaned `reactive` (`:223-229`), `pickDialog` top-level reactive read (`:524-543`), correctly-placed `mira.reactive`/`wren.reactive` (`:33`, `:504`).
- `src/features/workers/data.ts` — Miner def (`:83-94`), hire-cost helpers (`:129`, `:145`).
- `src/features/workers/aggregate.ts` — `computeAggregatedAbilities`/`computeWorkerEffects` (`:153`, `:171`).
- `src/config/abilitiesAggregate.ts` — `threshold_reduce_category` resolution via `speciesByCategory` (`:122-126`).
- `src/features/tileCollection/data.ts` — the canonical tile categories (no `wood`).
- `src/textures/seasonal/seasonalArt.ts` — incremental fallback model + `fallbackIdleIndex` (`:10-15`, `:138`).
- `tools/vite/seasonalSubjects.mjs` — `SEASONAL_MANIFEST` folder scan.
- `tools/pixellab/gen_gallery.mjs`, `tools/pixellab/roster.mjs` — gallery regeneration for `docs/seasonal-tile-system/index.html`.
- Existing tests to extend/mirror: `src/__tests__/daily-streak.test.ts`, `tests/phase-4-workers.test.ts`.
- `src/state/persistence.ts` — `VOLATILE` set + version gate (`:6`, `:23`).
- Skills: `check-slice-action` (confirm core-vs-slice ownership), `seasonal-tile-pipeline` (gallery regen / completing idles), `phaser-scene-debug` (only if the modal/canvas interaction misbehaves), `pre-pr-check` (PR body), `test-driven-development`.
- Memory: the seasonal-tile-system note (folder rename to tile keys; summer-anchored fallback; `gen_gallery` AUTOGALLERY region) and `live-game-preview-verify` (worktree Vite on a spare port; `window.__hearthVisual`).
