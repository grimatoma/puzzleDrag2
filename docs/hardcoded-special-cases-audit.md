# Hardcoded config overrides audit (post-migration)

**Purpose:** After tool-power consolidation ([PR #634](https://github.com/grimatoma/puzzleDrag2/pull/634)), inventory every place where **runtime code overrides, duplicates, or ignores catalog/config data** — not only tools.

**Scope:** Static review of `src/state.js`, `src/GameScene.js`, feature slices, `src/ui/*`, `src/config/*`, `src/state/helpers.js`, balance-manager editors, and inverse cases (config exists but live path never reads it).

**Triage key:**

| Label | Meaning |
|-------|---------|
| **Open** | Still hardcoded; worth a follow-up PR |
| **Spin off** | Larger cleanup; own PR theme |
| **Defer** | Blocked on design or tile/resource migration |
| **Resolved** | Fixed by tool-power consolidation (traceability only) |

---

## Summary

| System | Open | Spin off | Defer | Notes |
|--------|------|----------|-------|-------|
| Tools (remainder) | 9 | 2 | 1 | Parallel UI lists, fill bias, animation ms |
| Board fill / pools | 3 | 0 | 0 | Season mods dead on live fill path |
| Hazards | 4 | 1 | 0 | ID casing; rats spawn/tick unwired |
| Bosses | 4 | 1 | 0 | Dual pipeline: canonical vs `BOSS_META` |
| Orders | 2 | 1 | 0 | Hardcoded crafted pools; fish omitted |
| Biomes / zones | 3 | 0 | 0 | Unlock level duplicated; Town omits fish lock |
| Abilities / workers | 1 | 0 | 0 | Reducer mirrors scene aggregation |
| Chain specials | 2 | 1 | 0 | Duplicated in `CHAIN_COLLECTED` + `COMMIT_CHAIN` |
| UI / navigation | 5 | 1 | 0 | `TOOL_CATALOG`, shuffle shortcut, armed drift |
| Textures | 1 | 0 | 0 | Sickle reuses axe icon in panel |
| Tile vs resource | 0 | 0 | 5+ | Tracked in `CLAUDE.md`; do not add new conflations |

**Tool consolidation status:** PRs 0–6 from `docs/tool-power-animation-consolidation-plan.md` are **complete**. Remaining tool rows below are post-consolidation drift, not plan backlog.

---

## 1. Tools (post-consolidation remainder)

Runtime path is canonical: `ITEMS[key].power` → `applyToolPower` / `isTapTargetPower`. Problems are **parallel lists** and **scene-only behavior** that never read power params.

| File:line | Pattern | Hardcoded | Config source of truth | Suggested fix | Risk | Triage |
|-----------|---------|-----------|------------------------|---------------|------|--------|
| `src/features/farm/tools.js:10` | `TAP_TARGET_TOOL_IDS` | `bomb`, `rake`, **`axe`**, `magic_wand` | `isTapTargetPower(ITEMS[k].power.id)` | Delete set; derive from `ITEMS` | **Axe is instant** — wrong disarm/refund if axe arms | **Open** |
| `src/state.js:61–81` | `TAP_TARGET_TOOL_KEYS` | Duplicate of farm set in `disarmAllTools` / `CANCEL_TOOL` | `toolPendingPower` + `isTapTargetPower` | Drop set when `pendingPower` present | Drift vs sickle/magnet | **Open** |
| `src/state.js:93–98` | `fertilizerActive` disarm | Separate refund path from `toolPendingPower` | `arm_fill_bias` arm model | Single armed signal | Double-refund edges | **Open** |
| `src/state.js:562–563` | `ALIAS` map | `scythe→clear`, `seedpack→basic`, … | Canonical tool keys in quests/rewards | Central alias module or migrate callers | Legacy payloads | **Open** |
| `src/state/toolPowerRuntime.js:31–63` | `_clearHazardTarget` | Per-target `if/else` | Hazard id → handler table keyed like `state.hazards` | Data-driven clears | New hazards need code edits | **Open** |
| `src/GameScene.js:847–852` | `fillBoard` bias | `["seedling", "tile_grass_hay", "tile_grain_wheat"]` | `fillBiasTarget` from `arm_fill_bias` | Read `fillBiasTarget` / registry mirror | Ignores bird_feed/sapling targets | **Open** |
| `src/GameScene.js:1057–1071` | `playBoardAnimation` | Uses `BOARD_ANIMATIONS[name].duration` only | `power.ms` on tool config | Optional `ms` in `_dur()` | Catalog `anim` names still no-op | **Open** |
| `src/GameScene.js:1550–1554` | `applyToolDim` | Deprecated name-based shim | `applyToolDimForPower` only | Remove after call-site sweep | Low | **Open** |
| `src/ui/Tools.jsx:101`, `puzzleBoard.jsx:685` | Shuffle shortcut | `getPhaserScene()?.shuffleBoard()` | `reshuffle_board` via reducer | One dispatch path | Bypasses charge/spend rules | **Open** |
| `src/ui/Tools.jsx` / `puzzleBoard.jsx` | `fertilizerActive` UI | Parallel to `toolPending` | `toolPendingPower` for `arm_fill_bias` | One armed banner signal | UI/state divergence | **Open** |
| `src/ui/toolRegistry.js:22–110` | `TOOL_CATALOG` | Labels, `armed`, icons vs `ITEMS` | Generate from `ITEMS` + powers | Single UI source | Triple maintenance | **Spin off** |
| `src/ui/toolRegistry.js:127–128` | `isTapTargetTool` | `armed === "tap"` in UI catalog | `isTapTargetPower(ITEMS[key].power.id)` | Align with runtime | Easy drift | **Spin off** |
| `src/ui/toolRegistry.js:40` | Sickle `iconKey: "axe"` | Panel art | Dedicated `sickle` texture | Add draw + registry | Wiki/panel conflation | **Open** |
| `src/config/boardAnimations.js` | Animation registry | Only `sweep`, `popIn`, `goldenFlash` | Map catalog anim aliases (`chops`, …) | Register or alias | Cosmetic | **Open** |
| Instant `clear_category` tools | No scene tween | Reducer-only grid mutation | Optional scene hook on diff | Document or add pulse | Expected today | **Defer** |

### Hazard target ID mismatch (tools)

| Source | Example ids |
|--------|-------------|
| `state.hazards` keys / `toolPowerRuntime._clearHazardTarget` | `caveIn`, `gasVent`, `rats`, `wolves` |
| `balanceManager/shared.jsx` `hazardOptions()` | `cave_in`, `gas_vent`, `rats`, `fire` |
| `features/mine/hazards.js` catalog `id` | `cave_in`, `gas_vent`, `lava`, `mole` |

Designers picking `cave_in` in Dev Panel / tool params will not clear `hazards.caveIn`. **Open** — normalize on one casing at the config boundary.

---

## 2. Board fill and spawn pools

Live fill path: `GameScene.fillBoard` → `activePool()` (biome pool + tile-collection substitution) → worker `effectivePoolWeights` → session category filter → boss `spawnBias` → fertilizer hardcoded list.

| File:line | Pattern | Hardcoded | Config ignored | Suggested fix | Triage |
|-----------|---------|-----------|----------------|---------------|--------|
| `src/GameScene.js:673–686` | `activePool()` | Uses `BIOMES[*].pool` only | `SEASON_POOL_MODS` + `getEffectivePool()` | Push seasonal weights into registry from reducer, or call `getEffectivePool` in bridge | **Open** |
| `src/constants.js:855+` | `SEASON_POOL_MODS` | Locked seasonal deltas | Only referenced in tests + `farm/pool.js` | Wire into fill or mark deprecated in Wiki | **Open** |
| `src/features/farm/pool.js:22` | `getEffectivePool` | Full seasonal + worker pool math | Never imported by `GameScene` / `prototype` | Bridge field or delete if superseded | **Open** |

Boss **spawn bias** on live path (`registry.boss.spawnBias`) only partially overlaps canonical `BOSSES[].modifier` (see §4).

---

## 3. Hazards

| File:line | Pattern | Issue | Triage |
|-----------|---------|-------|--------|
| `src/state.js:428–451` | Farm/mine hazard tick+spawn on `CHAIN_COLLECTED` | Fire, wolves, mine hazards **wired** | — |
| `src/features/farm/rats.js` | `rollRatSpawn`, `tickRats` | **Not imported** by `state.js` or `GameScene` — rats never spawn/tick in production | **Open** |
| `src/state.js:261–262`, `1179–1181` | Rat **chain** clear | Works if `rat` tiles exist (tests/scenarios only) | **Open** (spawn gap) |
| `src/features/farm/hazards.js:54` | `allowedHazards` includes `"rats"` | `rollFarmHazard` never returns rat spawns | **Open** |
| `prototype.jsx:239–242` | Registry `hazardFire` / `hazardRats` | Only fire + rats synced; wolves/mine hazards scene-only via grid | **Defer** (document split) |
| `src/balanceManager/wiki/concepts.js` | Wiki from `HAZARDS` | Correct for mine; farm rats meta in `FARM_HAZARD_META` separate | **Spin off** unify hazard registry |

---

## 4. Bosses

Two pipelines:

1. **Canonical (tested, mostly unused live):** `features/bosses/data.js` (`BOSSES`, `spawnBoss`, `tickBossTurn`, `modifiers.js` `applyModifierToFreshGrid` / `tickModifier`).
2. **Live UI/run:** `features/boss/slice.js` `BOSS_META` + `triggerBoss` — copies `spawnBias`, `spawnFireTiles`, `minChain`, etc. as flat boss fields.

| File:line | Pattern | Issue | Triage |
|-----------|---------|-------|--------|
| `src/features/boss/slice.js:8–76` | `BOSS_META` | Duplicates target/resource/text from `BOSSES`; adds UI-only emoji/flavor | **Open** |
| `src/features/boss/slice.js:97–125` | `triggerBoss` | Does **not** call `spawnBoss` — no `modifierState` from canonical modifiers | **Open** |
| `src/features/bosses/data.js:90+` | `spawnBoss` / `tickBossTurn` | No imports from `state.js` or boss slice | **Open** |
| `src/GameScene.js:832–840` | `boss.spawnBias` | Quagmire-style bias works | Partial |
| `src/GameScene.js:1237` | `tile.frozen` / `rubble` | Frostmaw freeze / stoneface rubble need grid flags from modifier init | **Open** if bosses spawn without grid patch |
| `src/features/bosses/modifiers.js:69` | `tickModifier` | Only used in tests — heat-tile burn not on live boss tick | **Open** |
| `src/features/bosses/data.js` vs `BOSS_META` | `storm` target | Both use `fish_fillet` + `minChain: 4` | OK — still two sources |

**Spin off:** Single boss spawn path — `triggerBoss` → `spawnBoss(state, id, year, rng)` and store `modifier` + `modifierState` on `state.boss`; GameScene reads modifier type, not legacy flags.

---

## 5. Orders and economy

| File:line | Pattern | Hardcoded | Config alternative | Triage |
|-----------|---------|-----------|-------------------|--------|
| `src/state/helpers.js:123–124` | `CRAFTED_FARM_POOL` / `CRAFTED_MINE_POOL` | Fixed recipe keys | `RECIPES` filtered by biome/tier | **Open** |
| `src/state/helpers.js:145` | `makeOrder` crafted branch | Fish biome uses **farm** crafted pool | `BIOMES.fish` crafted list | **Open** |
| `src/constants.js:489–500` | `resourceOrderPool` | Built from biome tiles (resource keys) | Correct for resources; tile conflation elsewhere | **Defer** per `CLAUDE.md` |

---

## 6. Biomes, zones, unlock gates

| File:line | Pattern | Hardcoded | Triage |
|-----------|---------|-----------|--------|
| `src/features/zones/BiomeEntryModal.jsx:18` | `unlockLevel` | mine=2, fish=3 | **Open** |
| `src/state.js:589` | `SWITCH_BIOME` | mine blocked if `level < 2` only | **Open** (fish not gated here) |
| `src/ui/Town.jsx:370` | Biome card lock | **mine only** `level < 2` | **Open** — fish harbor shows unlocked at L1 |
| `src/townLayout.js:67` | Building positions | Fixed pixel layout | **Defer** (art/layout) |

Settlement hazard allowlists come from `settlementHazards()` (config-driven) — good pattern; extend to rats once spawn exists.

---

## 7. Abilities and workers

| File:line | Pattern | Notes | Triage |
|-----------|---------|-------|--------|
| `src/GameScene.js:311–322` | `computeWorkerEffects({ workers })` | Scene recomputes pool weights each layout | **Open** — reducer sets `_workerEffects` on season close (`state.js:818`) but fill reads scene merge |
| `src/config/abilities.js` | `effectivePoolWeights` channel | Documented; works when mirrored to registry | OK if bridge unified |

---

## 8. Chain specials (`state.js`)

Logic duplicated across **`CHAIN_COLLECTED`** (payload from GameScene) and **`COMMIT_CHAIN`** (legacy path):

| Special | Locations | Triage |
|---------|-----------|--------|
| Rat chain clear | `state.js:261–262`, `1179–1181` | **Spin off** registry |
| Mysterious ore | `278–283`, `1199–1209`, tick `420–422` | **Open** keep one path |
| Pearl capture | `287–294`, fish tick `424–426` | **Open** |
| Fire extinguish / deadly pests | `382–396`, farm tools | **Open** |

---

## 9. UI catalogs and navigation

| File:line | Pattern | Issue | Triage |
|-----------|---------|-------|--------|
| `src/ui/toolRegistry.js` | Entire `TOOL_CATALOG` | Stale `armed`/`desc` vs `ITEMS.power` (e.g. axe instant, fertilizer passive) | **Spin off** |
| `src/ui/toolRegistry.js:10–12` | File comment | Still says effects in `state.js` inline | **Open** update comment |
| `src/router.js:25–44` | `KNOWN_VIEWS` | Manual set vs `features/*/index.jsx` `viewKey` exports | **Open** — drift if feature added without router |
| `src/ui.jsx:47–51` | `BottomNav` | Subset of views (no portal/orders/bosses/…) | **Defer** (intentional HUD) |

Views exported but not in bottom nav: `portal`, `orders`, `bosses`, `decorations`, `charter`, `boons`, `recipeWiki`, `chronicle`, `tileCollection`, `achievements` — reachable via town/map/deep links.

---

## 10. Textures and icons

| File:line | Pattern | Triage |
|-----------|---------|--------|
| `src/textures/iconRegistry.js:43–62` | `aliasIconKeys` (underscore ↔ camel) | **Defer** — working shim |
| `src/ui/toolRegistry.js:40` | sickle → `axe` iconKey | **Open** |
| `src/balanceManager/iconUsage.js` | Scans `TOOL_CATALOG.iconKey` | Misses ITEMS-only tools until catalog generated | **Spin off** with §9 |

---

## 11. Deferred / migration-tracked (not tool PRs)

- **Tile vs resource conflation** — `CAPPED_RESOURCES`, recipes with `tile_*` inputs, `LONG_CHAIN_BONUSES`, `makeOrder` tile pools (`CLAUDE.md`).
- **`DEFERRED_TOOL_POWERS`** — 22 entries in `src/config/toolPowers.js` (PC2 semantics).
- **Achievement category ticks** — prefix rules in `achievements/slice.js:67–76` vs shared `CATEGORY_OF`.
- **Cartography node `kind` switches** — map rendering hardcodes colors by kind.

---

## Appendix A — Resolved by tool-power consolidation

Do not re-open as PR 1–6 work.

| Former issue | Resolution |
|--------------|------------|
| `LEGACY_TOOL_KEYS` / inline `USE_TOOL` switch | `applyToolPower` + `toolPowerRuntime.js` |
| Per-tool `_applyToolRake/Axe/Bomb/…` | `GameScene.applyToolPower` + `tileSelectors.js` |
| `_rakePending` / `_axePending` / … | `toolPendingPower` on registry |
| `MAGIC_TOOL_IDS` portal handlers | Portal `USE_TOOL` no-op; core path |
| `def.effect === "clear_all"` in farm tools | Removed |
| Axe vs sickle row clear | Axe = `clear_category(trees)`; sickle = `clear_row` |
| Explosives area vs mine clear | `explosives` power id |
| Field tools missing from `ITEMS` | `clear` / `basic` / `rare` / `shuffle` / `bomb` typed |

---

## Suggested follow-up PR themes

| Theme | Absorbs rows |
|-------|----------------|
| **Config boundary hygiene** | Hazard id casing; `TAP_TARGET_*` removal; `fillBiasTarget` in `fillBoard` |
| **Live hazard completeness** | Wire `rollRatSpawn` / `tickRats` on chain close or remove dead code |
| **Boss pipeline merge** | `triggerBoss` → `spawnBoss`; GameScene reads `modifier.type` |
| **Pool truth** | Seasonal mods → registry; or deprecate `getEffectivePool` |
| **UI catalog generation** | `TOOL_CATALOG` from `ITEMS`; fix shuffle/fertilizer armed UX |
| **Order data** | Crafted pools from `RECIPES`; fish crafted orders |

---

*Post-migration audit. For pre-consolidation history, see git before PR #634.*
