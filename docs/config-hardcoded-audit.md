# Config / Hardcoded Overrides Audit Report

**Date:** 2026-05-25

This report details an in-depth audit of the codebase to identify places where config data is overridden, duplicated, or hardcoded, as well as areas where a config concept is missing but should exist.

## 1. Tools and Board Tools UI

| Area | What | Why | Suggested Fix |
|---|---|---|---|
| `src/state.js` | The `USE_TOOL` action payload contains an `ALIAS` map (`scythe→clear`, `seedpack→basic`, `lockbox→rare`, `reshuffle→shuffle`). | Historically alias names were sent instead of standard tool keys. | Migrate callers to dispatch canonical tool keys defined in `ITEMS` and drop the alias map at dispatch. |
| `src/state.js`, `src/ui/Tools.jsx`, `src/ui/puzzleBoard.jsx` | `fertilizerActive` is implemented as a parallel path to `toolPendingPower` / `fillBiasTarget` / `toolPending` | Fertilizer usage logic was hardcoded instead of leveraging the universal `toolPending` structure. | Unify the armed signal. Define `arm_fill_bias` or similar power structure on `ITEMS.fertilizer.power` and use a single disarm/refund path. |
| `src/state/init.js`, `src/state.js` | Hardcoded `TAP_TARGET` logic logic for save hydration. | The list of tool keys that require a tap target was manually maintained instead of inspecting config. | Replace manual logic using `isTapTargetPower(ITEMS[k].power.id)`. Derive from `ITEMS` instead of maintaining arbitrary lists. |
| `src/GameScene.js` | `applyToolDim(toolKey)` is deprecated but still present. | Kept for external callers/shims during the tool-power migration. | Verify all callers have migrated to `applyToolDimForPower` and remove the shim. |
| `src/GameScene.js`, `src/config/boardAnimations.js` | Board animation triggers use `BOARD_ANIMATIONS[name].duration` directly without allowing individual items to specify overrides.  Furthermore, `config/boardAnimations.js` hardcodes `sweep`, `popIn`, `goldenFlash` rather than loading from catalog anim ids. | Limits the flexibility for tools to run slightly faster/slower without creating entirely new animation definitions. | Pass an optional `ms` parameter (from `ITEMS[].power.ms`) into the animation duration builder. Register catalog anim ids or maintain an explicit alias map. |

## 2. Board Fill Logic

| Area | What | Why | Suggested Fix |
|---|---|---|---|
| `src/features/farm/pool.js`, `src/GameScene.js` | `getEffectivePool` duplicates seasonal/worker pool math that is now split in `GameScene.fillBoard` (which directly uses `SEASON_POOL_MODS`). | Migration drifted, causing duplicate logic. The scene fills the board using its own inline math, while tests/helpers might use `getEffectivePool`. | Call one helper from `fillBoard`, or delete `getEffectivePool` if `GameScene` is meant to be the canonical source. |

## 3. Bosses

| Area | What | Why | Suggested Fix |
|---|---|---|---|
| `src/features/boss/slice.js` | `BOSS_META` config exists, duplicating `BOSSES` config from `features/bosses/data.js` (targets, resources). | Legacy UI metadata structure that hasn't fully merged with canonical config `BOSSES`. | Derive display fields entirely from `BOSSES` and keep only a thin UI overlay in slice if necessary. |
| `src/features/bosses/modifiers.js` | `tickModifier` (if it exists) / modifier effects like heat-tile burn are ticking mostly in tests. | The integration of modifier state ticks into live gameplay loop was incomplete. | Wire modifier ticks into the live boss turn tick (in `boss/slice.js` or `tickBossTurn`). |
| `src/features/boss/slice.js`, `src/GameScene.js` | Boss modifier syncing logic (grid `frozen`/`rubble` from `applyModifierToFreshGrid`) might not stay in sync with the scene registry on spawn. Also, relies on legacy `spawnBias`/spawn tile counts. | A dual representation of the board state vs logical state. | Read `boss.modifier` and `modifierState` accurately, avoid legacy-only logic. |

## 4. Orders

| Area | What | Why | Suggested Fix |
|---|---|---|---|
| `src/state/helpers.js` | `CRAFTED_FARM_POOL` and `CRAFTED_MINE_POOL` are hardcoded lists. | Fast paths created during development before a robust recipe registry. | Filter `RECIPES` by biome/station to construct these pools dynamically. |
| `src/state/helpers.js` | The `makeOrder` function creates orders for the fish biome using the farm crafted pool. | Fish orders were added quickly without a unique crafted pool. | Implement a fish-appropriate crafted list derived dynamically from the config. |

## 5. Biomes and Unlock Gates

| Area | What | Why | Suggested Fix |
|---|---|---|---|
| `src/features/zones/BiomeEntryModal.jsx` | Uses literal values for unlock requirements (`mine === 2`, `fish === 3`). | Quick implementation of UI rather than relying on canonical state logic. | Use `canEnterBiome` or properties from zone/biome config. |
| `src/ui/Town.jsx` | Explicitly locks the mine if `level < 2` but ignores fish requirements. | Did not adopt `canEnterBiome` helper when it was introduced. | Use `canEnterBiome(state, b.kind)` to unify access checks for all biomes. |

## 6. Abilities / Workers

| Area | What | Why | Suggested Fix |
|---|---|---|---|
| `src/GameScene.js`, `src/state.js` | `_syncWorkerEffects` in `GameScene` recomputes `effectivePoolWeights` each layout, while the reducer computes and sets `_workerEffects` on season close. | Two different authorities trying to manage the same data derived from workers. | Mirror the aggregated snapshot through the registry from the reducer to establish a single source of truth, or document the scene as the sole authority. |

## 7. Navigation / Router

| Area | What | Why | Suggested Fix |
|---|---|---|---|
| `src/router.js` | `KNOWN_VIEWS` and `KNOWN_MODALS` use hardcoded `Set` structures instead of exporting `viewKey` metadata dynamically. | Hardcoded mapping created manually. | Consider auto-collecting from `import.meta.glob` or rely on the router known views test to enforce consistency. |

## 8. Story, Flags, Quests

| Area | What | Why | Suggested Fix |
|---|---|---|---|
| `src/flagReads.js` | Tracks which flags are read by code outside the story system. | Prevent drift/breakage if story flags are renamed. | Add a required check/audit mechanism when adding flags. |
| `src/features/quests/slice.js` | Features dual almanac XP paths (canonical `awardXp` vs legacy `almanacXp` on the quest reward). | Legacy almanac support wasn't completely removed in favor of the unified path. | Standardize strictly to a single `awardXp` / `state.almanac` mechanism. |
