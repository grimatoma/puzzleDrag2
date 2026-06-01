# Hardcoded config overrides — open items

**Purpose:** Track remaining places where runtime code overrides, duplicates, or ignores catalog/config data.

**Last reconciled:** 2026-05-28 after the Phase-2 TS migration (#680–#684) and HostState refactor (#686). Earlier passes: [PR #634](https://github.com/grimatoma/puzzleDrag2/pull/634) (tool-power consolidation), [PR #639](https://github.com/grimatoma/puzzleDrag2/pull/639) (config-override remediation).

**Resolved in earlier PRs (not listed below):** `isTapTargetPower` replaces `TAP_TARGET_*` sets; `normalizeHazardId`; rats wired on `CHAIN_COLLECTED`; `fillBiasTarget` on fill; `triggerBoss` → `spawnBoss`; farm `SEASON_POOL_MODS` in `GameScene.fillBoard`; `TOOL_CATALOG` from `ITEMS`; `canEnterBiome`; legacy chain actions removed; HUD XP, dialogs default, granary abilities, quest template dedup, festivals modal, hazard/fire BM toggle, and related §12–§19 fixes. Full work log: `docs/superpowers/plans/2026-05-25-config-override-worklog.md`.

**Resolved since (verified against live `src/` on 2026-05-28):**
- `USE_TOOL` `ALIAS` map — gone (canonical tool keys only).
- Hardcoded `TAP_TARGET` set in `state/init.ts` — gone (uses `isTapTargetPower` only).
- Deprecated `applyToolDim(toolKey)` shim — gone (only `applyToolDimForPower` remains).
- `playBoardAnimation` accepts `ms` parameter — wired through `_dur()` per tool.
- `BOARD_ANIM_ALIASES` (`chops`/`shimmer`/`scatter`/`cage`/`shot`/`bark` → `sweep`) — wired in `config/boardAnimations.ts`.
- `fertilizerActive` parallel armed path — gone in runtime; the legacy save-restore check was removed too (`SAVE_SCHEMA_VERSION` discards mismatched saves anyway).
- `BOSS_META` duplicate display struct — deleted; no callers remained.
- `BiomeEntryModal.tsx` + `Town.tsx` both use `canEnterBiome` for unlock gating.

**Triage:** Only **Open** rows remain. Tile/resource conflation tail is tracked in `CLAUDE.md` and PR-06 of `docs/superpowers/plans/2026-05-25-config-override-execution.md`.

**Resolved (2026-06):** Removed `DEFERRED_TOOL_POWERS` from `src/config/toolPowers.ts`. Unshipped PC2 tools are **not** in `ITEMS` and do not get a placeholder power id — when a tool ships, add a real `TOOL_POWERS` entry + `ITEMS` row + runtime handler. Product backlog notes remain in `docs/progression-plan-v2.html` (design doc only).

---

## Summary

| Area | Open |
|------|------|
| Tools / UI | 0 |
| Board fill | 1 |
| Bosses | 2 |
| Orders | 2 |
| Biomes / zones | 0 |
| Abilities | 1 |
| Navigation | 1 |
| Story / quests | 2 |
| **Total** | **9** |

---

## Tools and board tools UI

_All previously-listed items now resolved — see "Resolved since" note above._

`src/state/toolPowerRuntime.ts` hazard clears use `HAZARD_CLEAR_HANDLERS` + `normalizeHazardId` — extend the table when adding hazards (no longer id-casing drift).

Shuffle dispatches `USE_TOOL` (no direct `getPhaserScene()?.shuffleBoard()` bypass).

---

## Bosses

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/features/bosses/modifiers.ts` `tickModifier` | Heat-tile burn / modifier ticks only run in tests | Wire into live boss turn tick (`boss/slice` or `tickBossTurn`) |
| `src/features/boss/slice.ts` + `GameScene` | Live boss turn uses flat `turnsLeft` decrement; grid `frozen`/`rubble` from `applyModifierToFreshGrid` may not stay in sync with scene registry on spawn | Read `boss.modifier` + `modifierState`; avoid legacy-only `spawnBias` / spawn tile counts |

`triggerBoss` already calls `spawnBoss` (#639). `BOSS_META` deprecated struct deleted (no callers).

---

## Orders

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/state/helpers.ts` (~123) | `CRAFTED_FARM_POOL` / `CRAFTED_MINE_POOL` fixed lists | `RECIPES` filtered by biome/station |
| `src/state/helpers.ts` `makeOrder` | Fish biome uses farm crafted pool | Fish-appropriate crafted list from config |

---

## Biomes and unlock gates

_All previously-listed items now resolved — `BiomeEntryModal.tsx` and `Town.tsx` both route through `canEnterBiome` (verified 2026-05-28)._

---

## Abilities / workers

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/GameScene.ts` `_syncWorkerEffects` vs `src/state.ts` CLOSE_SEASON | Scene recomputes `effectivePoolWeights` each layout; reducer sets `_workerEffects` on season close — two paths | Mirror aggregated snapshot through registry from reducer, or document scene as sole fill authority |

---

## Navigation

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/router.ts` `KNOWN_VIEWS` | Manual set vs feature `viewKey` exports | Auto-collect from `import.meta.glob` or enforce export test on every new view |

(`src/__tests__/router-known-views.test.ts` added in #639 — extend when adding views.)

---

## Story, flags, quests

| File | Issue | Suggested fix |
|------|-------|---------------|
| Story `flagReads.ts` | Drift risk when adding beats | Audit checklist when adding flags |
| `src/features/quests/slice.ts` | Dual almanac XP paths (`awardXp` + legacy `almanacXp` on quest reward) | Single `awardXp` / `state.almanac` path |

---

## Board fill

| File | Issue | Suggested fix |
|------|-------|---------------|
| `src/features/farm/pool.ts` `getEffectivePool` | Duplicates seasonal + worker pool math from `GameScene.fillBoard`. No production callers — only tests import it. | Either delete `getEffectivePool` and adapt the four tests to drive `applySeasonPoolMods` + the worker aggregator directly, or document `getEffectivePool` as the test-facing fixture for those math paths. |

---

## Suggested PR themes (remaining)

| Theme | Rows |
|-------|------|
| **Boss single pipeline** | Live `tickModifier`; scene reads `modifier.type` |
| **Order data** | Crafted pools from `RECIPES`; fish orders |
| **Fill math dedupe** | `getEffectivePool` vs inlined `fillBoard` |
| **Quests slice cleanup** | Drop legacy `almanacXp` path |
| **Single source of effective pool weights** | Scene vs reducer authority |
| **Auto-discover `KNOWN_VIEWS`** | `router.ts` import.meta.glob sweep |
| **Optional backlog (PR-06)** | fish tide config, wolf prey tags, achievement fish pool, portal `MAGIC_TOOLS` dedup — see execution plan § PR-06 |

---

*For resolved tool-power history, see git before PR #634 and Appendix A in git history of this file. Execution plan: `docs/superpowers/plans/2026-05-25-config-override-execution.md`.*
