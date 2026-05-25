# Hardcoded config overrides — open items

**Purpose:** Track remaining places where runtime code overrides, duplicates, or ignores catalog/config data.

**Last reconciled:** 2026-05-25 after [PR #639](https://github.com/grimatoma/puzzleDrag2/pull/639) (config-override remediation). Earlier tool-power consolidation: [PR #634](https://github.com/grimatoma/puzzleDrag2/pull/634).

**Resolved in #639 (not listed below):** `isTapTargetPower` replaces `TAP_TARGET_*` sets; `normalizeHazardId`; rats wired on `CHAIN_COLLECTED`; `fillBiasTarget` on fill; `triggerBoss` → `spawnBoss`; farm `SEASON_POOL_MODS` in `GameScene.fillBoard`; `TOOL_CATALOG` from `ITEMS`; `canEnterBiome`; legacy chain actions removed; HUD XP, dialogs default, granary abilities, quest template dedup, festivals modal, hazard/fire BM toggle, and related §12–§19 fixes. Full work log: `docs/superpowers/plans/2026-05-25-config-override-worklog.md`.

**Triage:** Only **Open** rows remain. Deferred migration work (tile/resource conflation, `DEFERRED_TOOL_POWERS`) is tracked in `CLAUDE.md` and PR-06 of `docs/superpowers/plans/2026-05-25-config-override-execution.md`.

---

## Summary

| Area | Open |
|------|------|
| Tools / UI | 6 |
| Board fill | 1 |
| Bosses | 3 |
| Orders | 2 |
| Biomes / zones | 3 |
| Abilities | 1 |
| Navigation | 1 |
| Story / quests | 3 |
| Animations | 2 |
| **Total** | **22** |

---

## Tools and board tools UI

| File | Issue | Config source of truth | Suggested fix |
|------|-------|------------------------|---------------|
| `src/state.js` (~573) | `USE_TOOL` `ALIAS` map (`scythe→clear`, `seedpack→basic`, …) | Canonical tool keys in `ITEMS` | Migrate callers; drop alias at dispatch |
| `src/state.js`, `src/ui/Tools.jsx`, `src/ui/puzzleBoard.jsx` | Parallel `fertilizerActive` + refund path vs `toolPendingPower` / `fillBiasTarget` | `arm_fill_bias` on `ITEMS.fertilizer.power` | Single armed signal; one disarm/refund path |
| `src/state/init.js` (~221) | Hardcoded `TAP_TARGET` set for save hydration | `isTapTargetPower(ITEMS[k].power.id)` | Derive from `ITEMS` like `disarmAllTools` |
| `src/GameScene.js` (~1585) | Deprecated `applyToolDim(toolKey)` shim | `applyToolDimForPower` only | Remove after call-site sweep |
| `src/GameScene.js` `playBoardAnimation` | Uses `BOARD_ANIMATIONS[name].duration` only | `ITEMS[].power.ms` per tool | Pass optional `ms` into `_dur()` for named anims |
| `src/config/boardAnimations.js` | Registry has `sweep` / `popIn` / `goldenFlash` only | Catalog anim ids (`chops`, `shimmer`, `scatter`, …) | Register or alias map |

`src/state/toolPowerRuntime.js` hazard clears use `HAZARD_CLEAR_HANDLERS` + `normalizeHazardId` — extend the table when adding hazards (no longer id-casing drift).

Shuffle dispatches `USE_TOOL` (no direct `getPhaserScene()?.shuffleBoard()` bypass).

---

## Board fill

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/features/farm/pool.js` `getEffectivePool` | Duplicates seasonal + worker pool math now split between `GameScene.fillBoard` (inline `SEASON_POOL_MODS`) and registry `effectivePoolWeights` | Call one helper from fill, or delete `getEffectivePool` if scene path is canonical |

---

## Bosses

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/features/boss/slice.js` `BOSS_META` | Duplicates `BOSSES` targets/resources; adds UI-only emoji/flavor/legacy flags (`spawnFireTiles`, `spawnRubbleTiles`) | Derive display fields from `BOSSES`; keep thin UI overlay only |
| `src/features/bosses/modifiers.js` `tickModifier` | Heat-tile burn / modifier ticks only in tests | Wire into live boss turn tick (`boss/slice` or `tickBossTurn`) |
| `src/features/boss/slice.js` + `GameScene` | Live boss turn uses flat `turnsLeft` decrement; grid `frozen`/`rubble` from `applyModifierToFreshGrid` may not stay in sync with scene registry on spawn | Read `boss.modifier` + `modifierState`; avoid legacy-only `spawnBias` / spawn tile counts |

`triggerBoss` already calls `spawnBoss` (#639).

---

## Orders

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/state/helpers.js` (~123) | `CRAFTED_FARM_POOL` / `CRAFTED_MINE_POOL` fixed lists | `RECIPES` filtered by biome/station |
| `src/state/helpers.js` `makeOrder` | Fish biome uses farm crafted pool | Fish-appropriate crafted list from config |

---

## Biomes and unlock gates

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/features/zones/BiomeEntryModal.jsx` (~18) | `unlockLevel` literals (mine 2, fish 3) | `canEnterBiome` or zone/biome config |
| `src/ui/Town.jsx` (~370) | Locks mine at `level < 2` only | `canEnterBiome(state, b.kind)` for mine and fish |
| `src/state/biomeAccess.js` vs Town | Helper exists; Town cards ignore fish L3 / harbor / zone gates | Single gate for modal, reducer, and town cards |

`SWITCH_BIOME` already uses `canEnterBiome` (#639).

---

## Abilities / workers

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/GameScene.js` `_syncWorkerEffects` vs `src/state.js` CLOSE_SEASON | Scene recomputes `effectivePoolWeights` each layout; reducer sets `_workerEffects` on season close — two paths | Mirror aggregated snapshot through registry from reducer, or document scene as sole fill authority |

---

## Navigation

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/router.js` `KNOWN_VIEWS` | Manual set vs feature `viewKey` exports | Auto-collect from `import.meta.glob` or enforce export test on every new view |

(`src/__tests__/router-known-views.test.js` added in #639 — extend when adding views.)

---

## Story, flags, quests

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/ui/Town.jsx` | Biome cards not using `canEnterBiome` | Same as biome gates above |
| Story `flagReads.js` | Drift risk when adding beats | Audit checklist when adding flags |
| `src/features/quests/slice.js` | Dual almanac XP paths (`awardXp` + legacy `almanacXp` on quest reward) | Single `awardXp` / `state.almanac` path |

---

## Suggested PR themes (remaining)

| Theme | Rows |
|-------|------|
| **Tool armed-state cleanup** | `fertilizerActive`, save-hydration `TAP_TARGET`, `ALIAS`, anim `ms` + alias map |
| **Boss single pipeline** | Drop `BOSS_META` duplication; live `tickModifier`; scene reads `modifier.type` |
| **Biome gates** | `canEnterBiome` everywhere (Town + modal) |
| **Order data** | Crafted pools from `RECIPES`; fish orders |
| **Fill math dedupe** | `getEffectivePool` vs inlined `fillBoard` |
| **Optional backlog (PR-06)** | `DEFERRED_TOOL_POWERS`, fish tide config, wolf prey tags, achievement fish pool, portal `MAGIC_TOOLS` dedup — see execution plan § PR-06 |

---

*For resolved tool-power history, see git before PR #634 and Appendix A in git history of this file. Execution plan: `docs/superpowers/plans/2026-05-25-config-override-execution.md`.*
