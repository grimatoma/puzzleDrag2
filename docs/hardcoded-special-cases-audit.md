# Hardcoded Special-Cases Audit (PR 0)

**Scope:** Pre-migration inventory for `docs/tool-power-animation-consolidation-plan.md`.  
**Method:** Static scan of `state.js`, `GameScene.js`, feature slices, `src/ui/*`, `src/textures/categories/*`, `src/state/helpers.js` (`makeOrder`), and `src/config/boardAnimations.js`, plus inverse cases where runtime code overrides catalog data.

**Triage key:**
- **PR 1–6** — Ride the tool/power/animation consolidation plan.
- **Spin off** — Worth a focused follow-up PR; orthogonal or large.
- **Defer** — Needs design, data model, or unrelated migration first.

## Summary

| Area | Findings | Primary triage |
|------|----------|----------------|
| `state.js` USE_TOOL / power runtime | 22 | PR 3–6 |
| `GameScene.js` tool + animation | 14 | PR 1–6 |
| `boardAnimations.js` | 3 | PR 1, PR 6 |
| `src/ui/*` tool panel | 8 | PR 4–6, Spin off |
| Feature slices (tool-adjacent) | 5 | PR 4, Spin off |
| `helpers.js` `makeOrder` | 4 | Spin off, Defer |
| Textures / icons | 4 | Defer, PR 6 |
| Biome / hazard / chain (non-tool) | 8 | Spin off, Defer |

**Highest-risk mismatches (config says X, runtime does Y):**
1. **Axe** — `ITEMS.axe.power` = `clear_category(trees)`; `GameScene._applyToolAxe` clears a **row** (plan: sickle gets row; axe keeps trees).
2. **Explosives** — `ITEMS.explosives.power` = `area_blast`; legacy `USE_TOOL` clears **mole + cave-in hazards** only.
3. **Fertilizer** — `power` = `transform_tiles`; runtime still uses **`fertilizerActive` fill bias** in `GameScene.fillBoard`.
4. **Field tools** (`clear`/`basic`/`rare`/`shuffle`) — No `ITEMS` entries; behavior lives only in legacy `USE_TOOL` + `GameScene._applyTool*`.
5. **`bird_feed` / `sapling`** — Listed in `LEGACY_TOOL_KEYS` (blocks auto-lookup) but **no** legacy handler and **no** `applyToolPower` case for `fill_bias`.

## Findings

| File:line | Pattern | What's hardcoded | Existing config that could carry it | Suggested fix | Risk | Triage |
|-----------|---------|------------------|-------------------------------------|---------------|------|--------|
| `src/state.js:66–76` | Parallel `Set`s | `TAP_TARGET_TOOL_KEYS` and `TAP_TARGET_POWER_IDS` | `TOOL_POWERS[id].isTapTarget` | Single `isTapTarget` on catalog | Drift vs magnet/coal_transmuter | **PR 1** |
| `src/state.js:101–107` | Denylist `Set` | `LEGACY_TOOL_KEYS` | N/A after migration | Delete in PR 6 | New tools stay silent on animation | **PR 6** |
| `src/state.js:129–130` | `pending === "rune_wildcard"` | Rune refund on disarm | `tap_clear_type` + stash metadata | Typed power arm | Save-load edge cases | **PR 3** |
| `src/state.js:139–144` | `fertilizerActive` in `disarmAllTools` | Separate disarm + refund | `arm_fill_bias` state | Fold into generic disarm | Double-refund | **PR 4** |
| `src/state.js:183–186` | `TAP_TARGET_POWER_IDS.has(id)` | Tap-target arming | `isTapTarget` on catalog | Replace set | Missing ids → instant powers | **PR 1** |
| `src/state.js:290–316` | `if/else` on hazard string | `clear_hazard` per-hazard branches | Handler table keyed by hazard id | One handler map | New hazards need reducer edits | **PR 4** |
| `src/state.js:323–327` | `default: return state` | `scatter_hazard`, `water_pump`, `fill_bias` not in switch | `TOOL_POWERS` entries | Add cases | **bird_feed/sapling** no-op | **PR 4** |
| `src/state.js:839–840` | Inline `ALIAS` map | scythe→clear, etc. | Canonical `ITEMS` keys | Centralize aliases | Quest payloads using PC2 names | **PR 5** |
| `src/state.js:852–853` | `MAGIC_TOOL_IDS` skip | Portal tools bypass core | `applyToolPower` | Route magic through core | Double-consume | **Spin off** |
| `src/state.js:858–863` | `key === "fertilizer" && fertilizerActive` | Toggle-off disarm | `arm_fill_bias` | Power-level arm/disarm | Old saves with flag | **PR 4** |
| `src/state.js:872–873` | `!LEGACY_TOOL_KEYS.has(key)` | Blocks auto-lookup | N/A (temporary) | Remove guard per migration | Phase-3 tools lack animations | **PR 6** |
| `src/state.js:879–887` | Per-tool bubble strings | bomb/rake/axe arm copy | `power.bubble` on `ITEMS` | Move to tool config | Copy drift vs wiki | **PR 4** |
| `src/state.js:890–920` | shuffle/clear/basic/rare | Instant field tools inline | `reshuffle_board`, `clear_random_n`, `transform_random_n` | `ITEMS` + powers | Invisible to catalog tests | **PR 5** |
| `src/state.js:923–939` | `water_pump` inline | Lava grid rewrite | `water_pump` power handler | Delete block | No GameScene animation | **PR 4** |
| `src/state.js:942–947` | `explosives` inline | mole + caveIn only | Fix power id (not `area_blast`) | `clear_mine_obstructions` | Wrong behavior if auto-routed | **PR 4** |
| `src/state.js:950–957` | rake/axe/fertilizer arms | Legacy arm paths | `isTapTarget` + bubbles | Unified arm | Inconsistent UX | **PR 3–4** |
| `src/state.js:960–1007` | cat/rifle/hound inline | Hazard clears inline | `clear_hazard` / `scatter_hazard` | Delete blocks | Duplicate with `clear_hazard` | **PR 4** |
| `src/GameScene.js:220–261` | `changedata-toolPending` chain | Per-tool branches | `applyToolPower` + `toolPendingPower` | One listener | 17 tools silent | **PR 3** |
| `src/GameScene.js:1132–1330` | `_applyTool*` methods | Per-tool animation | `tileSelectors` + dispatcher | Delete methods | Parity contract on migrate | **PR 3–5** |
| `src/GameScene.js:1653–1693` | `applyToolDim(toolKey)` | Dim per tool name | `dimStrategy` on power | Config-driven dim | New tap tools wrong dim | **PR 6** |
| `src/GameScene.js:857–867` | `fillBoard` fertilizer | Hardcoded seed list | `arm_fill_bias` target | Read from power state | Magic fertilizer shares list | **PR 4** |
| `src/config/boardAnimations.js` | Animation registry | Only sweep/popIn/goldenFlash | Per-power `anim` names | Register or alias anims | Catalog anim names no-op | **PR 6** |
| `src/ui/toolRegistry.js` | `TOOL_CATALOG` | Parallel UI catalog | `ITEMS` + `TOOL_POWERS` | Generate from `ITEMS` | Triple source of truth | **Spin off** |
| `src/constants.js:377–396` | Legacy `effect`/`target` | Duplicates `power` | `power` only | Strip in PR 6 | Dev Panel reads `effect` | **PR 6** |
| `src/constants.js:396` | explosives `area_blast` | Semantic mismatch | Mine-hazard clear power | Fix catalog | Wiki wrong | **PR 4** |
| N/A | Missing `ITEMS` for field tools | clear/basic/rare/shuffle/bomb | Add `ITEMS` rows | Catalog coverage | **PR 5** |

## PR 1–6 absorption checklist

| PR | Absorb these audit IDs |
|----|------------------------|
| **PR 1** | Selector registry; `isTapTarget`; collapse timing from `boardAnimations.js` |
| **PR 2** | `sickle` + `clear_row`; axe/wiki alignment |
| **PR 3** | `GameScene._applyTool*`; pending flags; rune wildcard power arm |
| **PR 4** | water_pump, explosives fix, cat/rifle/hound, fertilizer/`arm_fill_bias`, bubbles, `fill_bias`/`scatter_hazard` |
| **PR 5** | Field tools → `ITEMS` + powers; delete `_applyToolClear/Basic/Rare`; UI shuffle shortcut |
| **PR 6** | Delete `LEGACY_TOOL_KEYS`, legacy fields, `applyToolDim` strategies, anim registry gaps |

## Spin-offs (post consolidation)

1. Portal magic tools — collapse `portal/slice.js` `USE_TOOL` branches.
2. UI catalog generation from `ITEMS`.
3. `makeOrder` data migration.
4. Chain special registry (rat/ore/pearl).
5. Achievement category ticks from `CATEGORY_OF`.

## Deferrals

- Tile vs resource conflation (`makeOrder`, `CAPPED_RESOURCES`, recipes).
- Cartography node kinds, biome unlock bubbles.
- Full texture pipeline dedup.
- `DEFERRED_TOOL_POWERS` (22 entries).

*Generated for PR 0 (research only).*
