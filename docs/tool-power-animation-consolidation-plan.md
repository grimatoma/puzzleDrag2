# Tool / Power / Animation Consolidation — Implementation Plan

> **Status:** Approved plan. Multi-PR implementation. Respect the "PR freeze on create" rule in `CLAUDE.md` — each numbered PR below is its own branch, opened only after all its changes are committed locally.

## Context

The "tool powers" overhaul (Phase 2 + Phase 3) added a data-driven catalog at `src/config/toolPowers.js` with 13 power ids, each declaring `params` and `defaultBoardAnim`. 17 new tools route entirely through it. **But the consolidation is only ~70% done**, and the seams are now user-visible:

1. **Axe is misaligned across three sources of truth.** `src/constants.js:378` says axe = `clear_category(trees)`, the wiki text says "fells all oak tiles", but `src/GameScene.js:1262` (`_applyToolAxe`) actually clears the *row* of the tapped tile with an orange row-sweep animation. The animation has no matching power in the catalog.
2. **17 new Phase-3 tools have no visual feedback** when fired — their reducer mutates state but no GameScene animation runs, because every existing animation lives inside a per-tool `_applyTool*` method keyed on tool name.
3. **24 hard-coded `if (key === "...")` branches** still live in `state.js` (water_pump, explosives, cat, rifle, hound, fertilizer disarm, bubble text per tool, shuffle/clear/basic/rare arming) and `GameScene.js` (`_applyToolRake/Axe/Bomb`, `_applyRuneWildcard`, `_applyMagicWand`, `_applyToolClear/Basic/Rare`, `_rake/axe/bombPending` flag flow, `applyToolDim` strategies). Every one is expressible as `power.id` + params.

User decisions (captured during planning):

- **Axe stays tree-clearing** (semantic fit with wood). Introduce a **new tool** (`sickle`) for the row-clear animation so it has a home.
- **Separate powers per shape** (not one `clear_shape` with a `shape` param). Adds catalog entries but each is self-documenting and the runtime handler stays simple.
- **Full consolidation.** No special-casing of anything already expressible as config. Hard-coded branches become power entries with appropriate params.

Outcome: every tool's behavior, animation, and bubble text is data-driven from `ITEMS[key].power` + `TOOL_POWERS[id]`. `GameScene` exposes one generic power dispatcher. Legacy `effect`/`target` fields and per-tool `_applyTool*` methods are deleted.

## Target architecture

```
ITEMS[key].power = { id, params, anim?, ms?, tint?, bubble? }
                         │
                         ▼
TOOL_POWERS[id] = { id, name, desc, params[], defaultBoardAnim, isTapTarget }
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
applyToolPower(state, key, power)   GameScene.applyToolPower(power, tapTile?)
    (state.js — game logic)              (GameScene — visual)
        │                                 │
        ▼                                 ▼
   tileSelectors[id](grid,           playBoardAnimation(anim, tiles, { tint, ms })
       params, tap) → tiles[]
```

A single registry of **tile selectors** (one per `power.id`) is shared between the reducer (to know which cells to mutate) and the scene (to know which sprites to animate). Selectors describe *which* tiles a power touches; animations describe *how* the removal renders. This is the missing abstraction.

## New powers (add to `src/config/toolPowers.js`)

| `id` | `isTapTarget` | Params | Selector | Replaces / unblocks |
|---|---|---|---|---|
| `clear_row` | yes | `{ rowSpan?: 1 }` | row(s) of tapped tile | Re-homes axe row animation; backs new `sickle` tool |
| `clear_column` | yes | `{ colSpan?: 1 }` | column(s) of tapped tile | Symmetry with row |
| `clear_cross` | yes | `{ }` | row ∪ column of tapped tile | "Plus" shape — natural design slot |
| `clear_component` | yes | `{ matchKey?: true }` | 4-connected flood from tap, same key | Rake (`_applyToolRake`) |
| `clear_random_n` | no | `{ count: 6 }` | N random non-selected tiles | Scythe (`_applyToolClear`) |
| `transform_random_n` | no | `{ count, to: tileKey \| "biome_base" \| "biome_rare" }` | N random tiles → key (biome-relative supported) | Seedpack (`_applyToolBasic`), Lockbox (`_applyToolRare`) |
| `reshuffle_board` | no | `{ }` | none (board-level effect) | `shuffle` tool |
| `arm_fill_bias` | no | `{ target, turns?: 1 }` | none; sets a flag with auto-clear | Fertilizer (legacy `fill_bias` branch + the "DONE_WITH_CONCERNS" comment) |

Already covered, no new power needed:
- `tap_clear_type` covers both **magic_wand** and **rune_wildcard** (same logic, different tint). Rune_wildcard becomes a per-tool tint override (`power.tint: 0xffd248`).
- `area_blast(radius: 1)` covers **bomb**'s 3×3.

## New tool: `sickle` (`src/constants.js`)

```js
sickle: {
  kind: "tool", label: "Sickle",
  power: { id: "clear_row", params: {}, tint: 0xff9900, anim: "sweep", ms: 220 },
  desc: "Sweeps a single row in one stroke. Tap any tile to harvest that row.",
},
// + rec_sickle in RECIPES (workshop, plank+iron_bar, ~3 MIN)
```

The orange row-sweep animation that previously lived inside `_applyToolAxe` is exactly what `sickle` plays now. Axe keeps its `clear_category(trees)` data; it loses its legacy `effect/target` + dedicated GameScene method and now plays the sweep animation across all oak tiles (the same animation 17 other tools currently miss).

## Critical files

- **`src/config/toolPowers.js`** — add 8 new entries above; add `isTapTarget: true` to each tap-target id (replaces the parallel `TAP_TARGET_POWER_IDS` set in state.js).
- **`src/config/tileSelectors.js`** *(new)* — one selector function per power id, importable by both state.js and GameScene.js. Each: `(grid, params, tapTile?) → Tile[]`. Pure — no Phaser/React imports.
- **`src/state.js`** — collapse `applyToolPower` switch (lines 188–328) so it delegates to `tileSelectors[id]` for grid mutation; move water_pump, explosives, cat, rifle, hound, fertilizer disarm, bubble text, shuffle/clear/basic/rare arming OUT of the `USE_TOOL` reducer (lines 850–1015) and INTO power handlers. Delete `LEGACY_TOOL_KEYS`, `TAP_TARGET_TOOL_KEYS`, `TAP_TARGET_POWER_IDS` (replaced by `isTapTarget` on the power def). Bubble text becomes `power.bubble` on the tool config.
- **`src/GameScene.js`** — replace `_applyToolRake/Axe/Bomb/Magic_Wand/RuneWildcard/Clear/Basic/Rare` and `_applyToolDim` with one method `applyToolPower(power, tapTile?)` that calls `tileSelectors[power.id]`, plays `power.anim ?? defaultBoardAnim.anim` with `power.tint`, nulls cells, emits `CHAIN_COLLECTED` for clear-style powers, schedules `collapseBoard()`. Replace `_rake/axe/bombPending` flags with the existing `toolPendingPower` field.
- **`src/constants.js`** — remove `effect`, `target`, `anim`, `ms` legacy fields from every tool that has a `power` (move `anim/ms/tint` into `power` if they were per-tool overrides). The fertilizer "DONE_WITH_CONCERNS" comment goes away when fertilizer migrates to `arm_fill_bias`.
- **`src/features/farm/tools.js`** — delete the `def.effect === "clear_all"` legacy branch (line ~65).
- **`src/ui/Tools.jsx`** + **`src/ui/toolRegistry.js`** — drop any per-tool conditionals; render label, icon, armed-state, and disable rules from the power definition.
- **`src/__tests__/toolPowersCatalog.test.js`** + **`toolPowersRuntime.test.js`** — extend with one case per new power; assert every `ITEMS[key].power.id` exists in `TOOL_POWERS`; assert no migrated tool still has `effect`/`target`.
- **`src/__tests__/tileSelectors.test.js`** *(new)* — golden tests per selector: given a fixed grid + tap, the returned tile set is exactly the expected coordinates. One place to test "shape of effect".
- **`src/visualTesting/matrix.js`** — add scenarios for each new shape power (sickle row, cross, component flood, random-N) so visual goldens cover them.

## Migration order (one PR per step)

Each step is its own PR. Don't push a follow-up commit to a branch with an open PR (CLAUDE.md "PR freeze" rule).

0. **PR 0 — codebase-wide hardcoding audit (research, no code changes).** Before any migration, produce `docs/hardcoded-special-cases-audit.md`. The point: the tool/animation consolidation revealed a recurring pattern — behavior keyed on a specific identifier (tool name, hazard key, biome name, etc.) when an existing catalog could carry it as data. Find every other instance of that pattern so PR 1–6 can absorb adjacent cleanups instead of leaving them for a second pass.

   **Scope to scan:**
   - `src/state.js` — `if (key === "...")`, `switch (action.type)` arms keyed on a single string the catalog already knows about, `ALWAYS_RUN_SLICES` / `SLICE_PRIMARY_ACTIONS` entries that exist only because a slice is hardcoded.
   - `src/GameScene.js` — per-key conditionals on tiles, hazards, biomes, seasons, animations.
   - `src/features/*/slice.js` — per-key reducer branches that should be parameterized by the slice's own data file.
   - `src/ui/*` — per-tool/per-biome/per-season label, icon, color tables hardcoded inline instead of read from `src/constants.js`, `src/config/*`, or the slice's `data.js`.
   - `src/textures/categories/*` — tile/icon registration keyed on names the catalog already enumerates.
   - `src/state/helpers.js` `makeOrder` (CLAUDE.md flags it as a tile/resource conflation site) and the other in-flight migrations listed under "Known conflation" in CLAUDE.md.
   - Animation registry (`src/config/boardAnimations.js`) — patterns hardcoded in GameScene per tool/effect.
   - **The inverse case** ("code overriding a config"): tool/item/biome metadata in `ITEMS`, `BIOMES`, `UPGRADE_THRESHOLDS`, `MINE_ENTRY_TIERS`, `DAILY_REWARDS`, abilities, tool powers — find every place where a runtime branch ignores the config value and uses a hardcoded fallback or constant instead.

   **Report format** (one row per finding):

   | File:line | Pattern | What's hardcoded | Existing config that could carry it | Suggested fix | Risk |
   |---|---|---|---|---|---|

   **Triage in the report:**
   - **Absorb into PR 1–6** — adjacent to tool-powers work, ride along.
   - **Spin off as its own PR** — large enough to warrant a focused branch; list as a follow-up.
   - **Defer** — needs design discussion or depends on a tile-family / data shape not yet built. Note the blocker.

   Use the `Explore` subagent type (per the CLAUDE.md plan workflow) to parallelize the scan across the directories above. Output is a markdown file only — no source edits. Subsequent PRs reference its findings.

1. **PR 1 — selector registry + dispatcher (no behavior change).** Add `src/config/tileSelectors.js`, add `GameScene.applyToolPower`. Existing per-tool methods stay. Tests assert selectors return identical sets to legacy methods on representative grids.
2. **PR 2 — new powers + sickle tool.** Add `clear_row/column/cross/component/random_n`, `transform_random_n`, `reshuffle_board`, `arm_fill_bias` to the catalog. Add `sickle` to ITEMS + workshop recipe. Visual scenario for sickle. Refresh visual goldens (new scenarios only).
3. **PR 3 — migrate axe, rake, bomb, magic_wand, rune_wildcard.** Route through new dispatcher; delete `_applyToolRake/Axe/Bomb/Magic_Wand/RuneWildcard` and pending flags. Visual goldens expected unchanged (visual parity is the contract); any diff is a regression.
4. **PR 4 — migrate water_pump, explosives, cat, rifle, hound, fertilizer.** Delete the inline `if (key === ...)` chains in `USE_TOOL`; route through power handlers. Move bubble text to power config.
5. **PR 5 — migrate shuffle / clear / basic / rare.** Delete `_applyToolClear/Basic/Rare`; these ride `clear_random_n` / `transform_random_n` / `reshuffle_board`.
6. **PR 6 — final cleanup.** Delete `effect`/`target`/`anim`/`ms` fields from `ITEMS`, delete `LEGACY_TOOL_KEYS`, delete `def.effect === "clear_all"` branch in `farm/tools.js`, delete `applyToolDim` strategies (replace with one rule reading the selector). Update wiki copy. Final visual golden run — this PR is where the 17 silent Phase-3 tools start showing animations; expect intentional diffs. **Fold in any audit findings tagged "absorb into PR 1–6" that weren't already taken by PRs 1–5.**

## Verification (each PR)

- `npm run lint` — no warnings.
- `npm test` — full unit + integration suite; selector tests + catalog tests must all pass.
- `npm run test:visual` — every diff must be intentional. PRs 3–5 expect zero diffs (parity is the contract); PR 2 expects new scenarios only; PR 6 expects deliberate new animations on Phase-3 tools.
- Manual: `npm run dev`, open `/puzzleDrag2/?visualPanel=1`, step through each tool's scenario and confirm:
  - Tap-target tools arm (cursor/bubble) then fire on tap.
  - Animation tint + shape match the design intent (sickle row = orange row sweep, bomb = red 3×3, rake = green flood, magic_wand = purple type-sweep, rune_wildcard = golden type-sweep, new Phase-3 tools = the default per their power).
  - Collapse + refill timing identical to legacy.
  - `localStorage.removeItem("hearth.save.v1")` then craft each tool and use it once end-to-end.
- Dev Panel Wiki (`/puzzleDrag2/b/` → Wiki → Tool Powers) should iterate the new powers automatically — no manual registration.

## Out of scope (explicitly deferred)

- The 22 `DEFERRED_TOOL_POWERS` in `toolPowers.js` (chest pipeline, mine silver/diamond/gas/water families, sea-board tools, force-chain primitive). They stay deferred — this overhaul doesn't unblock them.
- The tile-vs-resource invariant cleanup tracked for "PR 4" in `CLAUDE.md` (`CAPPED_RESOURCES`, `BIOMES[*].resources`, `LONG_CHAIN_BONUSES`). Adjacent area but orthogonal concern.
