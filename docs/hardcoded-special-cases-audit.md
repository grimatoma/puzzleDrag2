# Hardcoded Special-Cases Audit

**Original scope:** Pre-migration inventory for `docs/tool-power-animation-consolidation-plan.md` (PR 0).  
**Last reconciled:** After tool-power consolidation ([PR #634](https://github.com/grimatoma/puzzleDrag2/pull/634), branch `cursor/tool-power-consolidation-3f3e`).

**Method:** Static scan of `state.js`, `GameScene.js`, feature slices, `src/ui/*`, `src/config/*`, `src/state/helpers.js`, plus inverse cases where runtime ignores catalog data.

**Triage key:**
- **Open** — Still hardcoded; worth a follow-up PR.
- **Spin off** — Larger or orthogonal cleanup.
- **Defer** — Needs design or unrelated migration.
- **Resolved** — Addressed by the consolidation (kept for traceability).

---

## Summary (current)

| Area | Open findings | Notes |
|------|---------------|--------|
| Tool runtime (post-consolidation) | 6 | Mostly drift between parallel lists and fill-bias wiring |
| `GameScene.js` | 3 | `playBoardAnimation` ms, fillBoard bias keys, deprecated dim wrapper |
| `src/ui/*` | 4 | `TOOL_CATALOG`, fertilizer UI flag, shuffle shortcut |
| Feature slices | 2 | Portal `CHAIN_COLLECTED`; hazard handler table |
| `helpers.js` / chain / cartography | 8 | Unchanged by tool work — still deferred |
| Textures | 1 | Sickle reuses `axe` iconKey in UI catalog |

**Previously critical mismatches — all resolved in consolidation:**

| Issue | Resolution |
|-------|------------|
| Axe row-clear vs `clear_category(trees)` | Axe is instant `clear_category`; **sickle** owns `clear_row` + row sweep |
| Explosives `area_blast` vs mine-hazard clear | `ITEMS.explosives.power.id` = `explosives` |
| Fertilizer `transform_tiles` vs fill bias | `arm_fill_bias` on USE_TOOL; `fertilizerActive` flag retained for fill |
| Field tools missing from `ITEMS` | `clear` / `basic` / `rare` / `shuffle` / `bomb` added with typed powers |
| `bird_feed` / `sapling` blocked with no handler | Routed through `fill_bias` in `toolPowerRuntime.js` |
| 17 Phase-3 tools silent on animation | Instant powers still reducer-only for some; tap/instant field tools use `applyToolPower` |

---

## Resolved by consolidation (PR #634)

Do not re-open these as PR 1–6 work — they are done unless regression is found.

| Former finding | What shipped |
|----------------|--------------|
| `LEGACY_TOOL_KEYS` / inline `USE_TOOL` chains | Removed; `ITEMS[key].power` → `applyToolPower` |
| `TAP_TARGET_POWER_IDS` in state | Replaced by `isTapTargetPower()` from `toolPowers.js` for arming |
| Per-tool `_applyToolRake/Axe/Bomb/…` | Replaced by `GameScene.applyToolPower` + `tileSelectors` |
| `_rakePending` / `_axePending` / etc. | `toolPendingPower` on registry + React sync |
| Legacy `effect` / `target` on `ITEMS` tools | Stripped; `power` is canonical |
| `MAGIC_TOOL_IDS` skip + portal `USE_TOOL` handlers | Magic tools use core `applyToolPower`; portal `USE_TOOL` no-op |
| Per-tool arm bubbles in state switch | `power.bubble` on tool configs (bomb, rake, sickle, magic_wand, field tools) |
| `scatter_hazard` / `water_pump` / `fill_bias` no-op | Implemented in `toolPowerRuntime.js` |
| `def.effect === "clear_all"` in `farm/tools.js` | Branch removed from `applyToolPending` |
| Rune wildcard arm | `ACTIVATE_RUNE_WILDCARD` sets `toolPendingPower` (`tap_clear_type`, golden tint) |
| `applyToolDim` per tool name (partial) | `applyToolDimForPower` reads `dimStrategy` from catalog |

---

## Open findings

| File:line | Pattern | What's hardcoded | Config that could carry it | Suggested fix | Risk | Triage |
|-----------|---------|------------------|----------------------------|---------------|------|--------|
| `src/features/farm/tools.js:10` | `TAP_TARGET_TOOL_IDS` | Still lists `bomb`, `rake`, **`axe`**, `magic_wand` | `isTapTargetPower(ITEMS[k].power.id)` | Delete set; derive from `ITEMS` / catalog | **Axe is instant** — disarm/refund logic wrong if axe ever arms | **Open** |
| `src/state.js:61–81` | `TAP_TARGET_TOOL_KEYS` | Duplicate of farm set in `disarmAllTools` / `CANCEL_TOOL` | `isTapTargetPower(pendingPower?.id)` | Use `toolPendingPower` + catalog only | Drift vs magnet/sickle/bomb | **Open** |
| `src/state.js:93–98` | `fertilizerActive` disarm | Separate refund path from `toolPendingPower` | Single armed-state on `arm_fill_bias` | Merge disarm into power arm model | Double-refund edge cases | **Open** |
| `src/state.js:562–563` | `ALIAS` map | `scythe→clear`, `seedpack→basic`, etc. | Canonical keys in quests/rewards | Central alias module or migrate callers | Legacy quest payloads | **Open** |
| `src/state/toolPowerRuntime.js:31–66` | `_clearHazardTarget` | Per-hazard `if/else` | Hazard id → patch fn table | Data-driven hazard handlers | New hazards need code edits | **Open** |
| `src/GameScene.js:847–852` | `fillBoard` bias | Hardcoded `["seedling", "tile_grass_hay", "tile_grain_wheat"]` | `fillBiasTarget` / `arm_fill_bias` params on state | Read bias target from reducer state | Ignores `bird_feed`/`sapling` targets | **Open** |
| `src/GameScene.js:1057–1071` | `playBoardAnimation` | Uses `BOARD_ANIMATIONS[name].duration` only | `power.ms` override (tools already declare `ms`) | Pass optional `ms` into `_dur()` | Catalog `anim: "chops"` etc. still no-op names | **Open** |
| `src/GameScene.js:1550–1554` | `applyToolDim` wrapper | Deprecated shim keyed on tool name | Callers use `applyToolDimForPower` only | Remove shim after call-site sweep | Low | **Open** |
| `src/ui/toolRegistry.js:22–110` | `TOOL_CATALOG` | Parallel labels, `armed`, icons vs `ITEMS` + `TOOL_POWERS` | Generate panel rows from `ITEMS` | Single UI source of truth | Triple maintenance (wiki uses ITEMS) | **Spin off** |
| `src/ui/toolRegistry.js:127` | `isTapTargetTool` | Reads `armed === "tap"` from UI catalog | `isTapTargetPower(ITEMS[key].power.id)` | Align with runtime catalog | magnet/sickle correct in ITEMS but easy drift | **Spin off** |
| `src/ui/Tools.jsx:101` | `shuffle` shortcut | Direct `getPhaserScene()?.shuffleBoard()` | `reshuffle_board` via reducer pending only | Remove UI-only path | Possible double-shuffle | **Open** |
| `src/ui/puzzleBoard.jsx:685` | Same shuffle shortcut | Duplicate of `Tools.jsx` | Shared dispatch helper | Deduplicate | Fix twice forever | **Open** |
| `src/ui/Tools.jsx` / `puzzleBoard.jsx` | `fertilizerActive` | Special armed UI alongside `toolPending` | `toolPendingPower` for `arm_fill_bias` | One armed-state signal | UI/state divergence | **Open** |
| `src/config/boardAnimations.js` | Animation registry | Only `sweep`, `popIn`, `goldenFlash` | Alias map for catalog anim names (`chops`, `shimmer`, …) | Register kinds or map to existing kinds | Cosmetic only today | **Open** |
| `src/ui/toolRegistry.js:40` | Sickle `iconKey: "axe"` | Reuses axe art in panel | Dedicated `sickle` texture + registry entry | Add draw fn / icon key | Wiki/panel conflation | **Open** |

### Instant `clear_category` tools — animation gap (not a hardcoding audit row before)

Tools such as `trimmer`, `plough`, `hoe`, etc. mutate the grid in the reducer on `USE_TOOL` with **no** `toolPending` and **no** `GameScene` tween. That is expected for reducer-first powers but differs from field/tap tools. Follow-up: optional scene hook on grid diff or brief pending pulse for catalog `anim`/`ms`.

---

## Spin-offs (unchanged by consolidation)

1. **`TOOL_CATALOG` generation** — Derive panel metadata from `ITEMS` + `isTapTargetPower` + `TOOL_POWERS` defaults.
2. **`makeOrder` data migration** — Crafted pools per biome; resource-only order pools (`CLAUDE.md` conflation).
3. **Chain special registry** — Unify rat / ore / pearl logic in `CHAIN_COLLECTED` vs `COMMIT_CHAIN`.
4. **Achievement category ticks** — Prefix checks vs `CATEGORY_OF`.
5. **Cartography / biome unlock bubbles** — Node `kind` switch; mine/fish gating copy in `state.js`.

## Deferrals (unchanged)

- Tile vs resource conflation (`CAPPED_RESOURCES`, recipes, `LONG_CHAIN_BONUSES`).
- Full texture pipeline dedup.
- `DEFERRED_TOOL_POWERS` (22 entries in `toolPowers.js`).
- `fillBoard` reading `fillBiasTarget` for arbitrary `arm_fill_bias` targets (needs design + tests).

---

## Implementation checklist (plan PRs 0–6)

| PR | Status |
|----|--------|
| PR 0 — this audit | Done (reconciled post-#634) |
| PR 1 — selectors + dispatcher | Done |
| PR 2 — new powers + sickle | Done |
| PR 3 — rake/bomb/wand/rune migration | Done |
| PR 4 — pump/explosives/cat/rifle/hound/fertilizer | Done |
| PR 5 — field tools | Done |
| PR 6 — legacy cleanup | Mostly done; open rows above are the remainder |

---

## Suggested next PRs (from open rows)

| PR theme | Absorb |
|----------|--------|
| **Tap-target drift fix** | Fix `TAP_TARGET_TOOL_IDS` (remove `axe`; add `sickle`, `magnet`, `coal_transmuter`); align `disarmAllTools` with `isTapTargetPower` only |
| **Fill bias wiring** | `fillBoard` reads `fillBiasTarget`; drop hardcoded seed list |
| **Animation polish** | `playBoardAnimation` respects `ms`; optional tweens for instant `clear_category` tools |
| **UI dedup** | Remove shuffle Phaser shortcut; fertilizer armed via `toolPendingPower` |

---

*Reconciled after tool-power consolidation. For pre-migration line references, see git history before PR #634.*
