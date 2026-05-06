# Software Design Document — Hearthwood Vale
## Gap Analysis, Phase Roadmap & Task Breakdown

*Generated 2026-05-06. Based on a full audit of the current codebase against GAME_MECHANICS.md (the Puzzle Craft 2 reference) and the merged GDD.*

---

## Executive Summary

The prototype is in **good structural health**: Phaser 3 board, React shell, slice-based state management, save/load, responsive layout, and seven feature areas (crafting, orders, quests, achievements, apprentices, boss encounters, cartography) are all scaffolded. However, significant gaps exist between what is built and what the design calls for. The most critical are:

1. **No third biome (Sea)** — a full environment is absent.
2. **Tools don't interact with the board** — "Scythe" (clear) never removes tiles.
3. **Workers don't affect gameplay** — apprentices are hired but their mechanical effects (threshold reductions, etc.) are never read by GameScene.
4. **Dead-board auto-shuffle is missing** — the game can reach an unwinnable state with no feedback.
5. **No alternative currencies** — Runes, Influence/Crowns, Potions, and Bombs exist in the GDD but nothing in state.
6. **No Market/Shop screen** — buy/sell is completely absent.
7. **No Species system** — the active/inactive tile-pool toggle is the primary board-customization mechanic and doesn't exist.
8. **Turn count mismatch** — MAX_TURNS=8; GDD says 10 per session.
9. **Grid size mismatch** — constants declare 6×7 (42 tiles); GAME_MECHANICS says 6×6 (36 tiles). One of these is wrong.
10. **`memoryPerks` passed to Phaser but never defined in state** — silent data bug.

---

## Current State Inventory

### What Is Fully Implemented
| System | Status | Notes |
|---|---|---|
| Phaser 3 board (drag chain, collapse, fill) | ✅ Complete | Solid, production-quality |
| Farm biome (10 resource types, upgrade chain) | ✅ Complete | |
| Mine biome (10 resource types) | ✅ Complete | |
| Season cycle (Spring/Summer/Autumn/Winter effects) | ✅ Complete | All 4 seasonal modifiers fire correctly |
| Orders system (3 active NPC orders) | ✅ Complete | Including crafted-item orders at level 3+ |
| Crafting system (13 recipes, 3 stations) | ✅ Complete | Gated behind built buildings |
| Building system (8 buildings) | ✅ Complete | Build costs enforced, level gates present |
| XP / Level progression | ✅ Complete | Level-up bubbles, biome unlock at level 2 |
| Save / load (localStorage) | ✅ Complete | Volatile fields excluded |
| Achievements (20 achievements, 8 categories) | ✅ Complete | Tracking + reward delivery |
| Quest system (3 dailies + Almanac tiers) | ✅ Complete | Progress tracked across all relevant actions |
| Tutorial (6-step guided intro) | ✅ Complete | Corner-toast + center-modal steps |
| Apprentices UI (hire panel, requirement gating) | ✅ Complete | |
| Boss encounters (4 bosses) | ✅ Complete | Board modifier (minChain) wired to state |
| Cartography / World map | ✅ Substantial | 678-line UI, node travel, adjacency logic |
| NPC Mood / Bond system | ✅ Complete | Gifting, bond levels, favorite/dislike resources |
| Settings (sfx, music, haptics, accessibility) | ✅ Complete | Persisted separately from game save |
| Audio system | ✅ Scaffolded | Hook + index exist; sound completeness unknown |
| Responsive layout (desktop/mobile/landscape) | ✅ Complete | |

### What Is Partially Implemented
| System | Status | Gap |
|---|---|---|
| Tools | ⚠️ Partial | Tools update inventory only; none actually alter the board. "Scythe" should physically remove tiles; "Reshuffle Horn" calls `shuffleBoard()` correctly but "Seedpack" and "Lockbox" bypass the board entirely. |
| Apprentices (gameplay effect) | ⚠️ Partial | Hired apprentices stored in state but no effect propagated to GameScene (no threshold reduction, no pool changes). |
| Season feedback | ⚠️ Partial | Mechanical modifiers fire; visual season transitions are thin (background color only, no tile-set changes). |
| Boss system | ⚠️ Partial | 4 bosses defined; only `minChain` modifier actually fires from `coreReducer`. Boss resource-tracking (e.g., "collect 30 logs in 5 turns") is tracked in `boss.slice` but no clear "boss victory/defeat" modal is shown. |
| Audio | ⚠️ Sparse | Hook exists and is called; actual sound completeness depends on `audio/index.js` content — needs audit. |

### What Is Missing (Does Not Exist)
| System | Status |
|---|---|
| Sea biome (third environment) | ❌ Missing |
| Dead-board auto-shuffle | ❌ Missing |
| Species system (active/inactive toggle, discovery) | ❌ Missing |
| Market / Shop (buy & sell screen) | ❌ Missing |
| Alternative currencies: Runes, Influence/Crowns, Potions, Bombs | ❌ Missing |
| Magic Portal mechanic | ❌ Missing |
| Mysterious Ore tile (countdown tile in Mine) | ❌ Missing |
| Worker effects wired to board | ❌ Missing |
| Supply chain (Farm food → Mine/Sea supplies) | ❌ Missing |
| Castle system | ❌ Missing |
| End-game / win condition | ❌ Missing |
| `memoryPerks` state field (referenced in prototype but undefined) | ❌ Bug |

---

## Known Data / Logic Bugs

| # | File | Bug |
|---|---|---|
| B1 | `constants.js` | `ROWS=7` → grid is 6×7 (42 tiles). GDD says 6×6. Pick one and unify. |
| B2 | `constants.js` | `MAX_TURNS=8`. GDD says 10 turns per session. |
| B3 | `prototype.jsx:169` | `memoryPerks={state.memoryPerks}` — `memoryPerks` is never declared in `initialState()` or any slice. This silently passes `undefined` to Phaser every re-render. |
| B4 | `state.js:coreReducer` | `collectPath` calculates `gained = pathLength * (pathLength >= 6 ? 2 : 1)`. This "double gain at 6+" rule is embedded in GameScene, not in state — there is a logic split where neither side fully owns the calculation. |
| B5 | `GameScene.js:452` | `gained` doubles for chains ≥ 6 but this isn't reflected in the chain badge text, which shows the raw count. Badge and inventory diverge. |
| B6 | `utils.js:seasonIndexForTurns` | Mapping: turn 0-1 → Spring, 2-3 → Summer, 4-5 → Autumn, 6+ → Winter. With MAX_TURNS=8 this means only 2 turns per "phase," creating very fast season transitions. GDD describes them as full seasonal cycles. |

---

## Phase Roadmap

Phases are ordered by dependency — each builds on the previous. Within a phase, tasks are ordered by impact.

---

## Phase 0 — Foundation Fixes (Pre-requisite for everything)
*These are data bugs and architectural ambiguities that will create merge conflicts if deferred.*

### Task 0.1 — Resolve grid size
**File:** `src/constants.js`
- Decide: 6×6 (GDD) or 6×7 (current). 6×6 is the reference game standard and gives a cleaner layout.
- Change `ROWS` from `7` to `6` if going with 6×6.
- Update `BOARD_Y` and `boardFrame` calculations in `GameScene.js` accordingly.
- **Impact:** All layout math, tile fill loops, and collapse logic use `ROWS`. Change is one constant + verify no hardcoded `7` anywhere.

### Task 0.2 — Fix turn count
**File:** `src/constants.js`
- Change `MAX_TURNS` from `8` to `10` to match GDD.
- Verify `seasonIndexForTurns()` in `utils.js` uses correct breakpoints for a 10-turn session (e.g., turns 1–2: Spring, 3–5: Summer, 6–8: Autumn, 9–10: Winter).
- Update self-tests in `runSelfTests()`.

### Task 0.3 — Fix `memoryPerks` undefined bug
**Files:** `src/state.js`, `prototype.jsx`
- Add `memoryPerks: []` to `initialState()` in `state.js`.
- Alternatively, remove the prop from `PhaserMount` if it's not yet implemented (prefer remove until the feature exists).

### Task 0.4 — Centralize `gained` calculation
**Files:** `src/GameScene.js`, `src/state.js`
- The "double gain at chainLength ≥ 6" rule lives in `GameScene.collectPath()` but the state reducer also uses the `gained` value it receives. This makes the calculation split.
- Move the formula into a shared utility function in `utils.js` (e.g., `resourceGainForChain(len)`), import it in both places.
- Fix chain badge text to use the effective `gained`, not raw path length.

---

## Phase 1 — Core Board Mechanics
*The puzzle board is the game. These gaps directly hurt the play loop.*

### Task 1.1 — Dead-board auto-shuffle
**File:** `src/GameScene.js`
**What:** After any board fill/collapse, check whether at least one valid 3-tile chain exists. If not, auto-shuffle all tiles without consuming a turn, and briefly flash a "Shuffled!" indicator.
**How:**
```js
hasValidChain() {
  // For each tile, DFS check if 3+ same-resource adjacent tiles exist
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = this.grid[r][c];
      if (!tile) continue;
      if (this._dfsChain(r, c, tile.res.key, new Set([`${r},${c}`])) >= 3) return true;
    }
  }
  return false;
}
```
- Call `hasValidChain()` at the end of `fillBoard()` after the fill tween completes (use `delayedCall` to check after animation settles).
- If false: call `shuffleBoard()`, show a toast "No moves — board reshuffled", do NOT increment `turnsUsed`.
- Add a recursion depth limit to the DFS to keep it O(1) per tile in practice.

### Task 1.2 — Scythe (clear) tool actually clears board tiles
**Files:** `src/GameScene.js`, `src/state.js`
**What:** Currently the "clear" tool just adds 5 basic resources to inventory. The actual mechanic should be: select tiles to remove from the board (or auto-remove a set of tiles), collect those resources, then refill.
**How (simplest reasonable version):**
- When `USE_TOOL { key: "clear" }` fires, emit a `tool-activate` event from state to the Phaser scene via the registry or a new event channel.
- In GameScene, on receiving the tool event, randomly select 6-8 tiles, tween them out (scale → 0), collect their resources, then collapse+fill.
- Remove the "adds 5 basic to inventory" shortcut from the state reducer for "clear".
- The state reducer still decrements `tools.clear`.

### Task 1.3 — Seedpack (basic) places tiles on the board
**Files:** `src/GameScene.js`, `src/state.js`
**What:** "Seedpack" should plant 5 extra basic-resource tiles on the board (replacing random tiles), giving the player more match opportunities. Currently it just adds to inventory.
**How:**
- Emit a `tool-seedpack` event with the resource key.
- GameScene swaps 4-5 random non-selected tiles to the basic resource type with a sparkle animation.
- Remove inventory-add shortcut from state reducer.

### Task 1.4 — Lockbox (rare) places rare tiles on the board
**Same pattern as 1.3 but for rare resources.** Swaps 2-3 tiles to the biome's rare resource with a golden flash animation.

### Task 1.5 — Upgrade threshold preview (star placement)
**File:** `src/GameScene.js`
**What:** Currently stars appear at every `UPGRADE_EVERY` (3rd) tile position. The star should appear **only when the chain is long enough to actually produce an upgrade** (i.e., at position 3, 6, 9...) and show a preview of the upgraded resource.
**Current status:** This is correctly implemented for the current `UPGRADE_EVERY=3` rule. This task becomes relevant if/when threshold values become per-resource (Phase 4). For now, verify the star shows the correct `next` resource icon.

### Task 1.6 — Overchain feedback
**File:** `src/GameScene.js`
**What:** When a chain reaches a second multiple of `UPGRADE_EVERY` (e.g., tile 6), show a special "DOUBLE UPGRADE" burst rather than just a second star. This already technically works (two stars render) but lacks distinct visual feedback.
**How:** When `groupCount === 2`, add a brighter, larger burst to the radial flash and change the floatText color.

---

## Phase 2 — Economy & Currency System
*The game currently has only one currency (coins). The GDD specifies 4+.*

### Task 2.1 — Add Runes currency to state
**File:** `src/state.js`, `src/constants.js`
**What:** Add `runes: 0` to `initialState`. Define how runes are earned: from Mysterious Ore tile (Phase 3.1), from chests (boss rewards), from certain quest rewards.
**How:**
- Add `runes` to `initialState`.
- Add `runes` display to HUD (small gem icon, only shown when > 0 or in Mine biome).
- Add `runes` as possible quest reward type.
- Add `DEV/ADD_RUNES` dev action.

### Task 2.2 — Add Influence/Crowns currency to state
**File:** `src/state.js`
**What:** Add `influence: 0` to `initialState`. Influence is earned from decorative buildings and royal quests (both TBD). Spent at the Magic Portal.
**How:** Same pattern as Task 2.1. Crown icon display.

### Task 2.3 — Add Potions and Bombs to state
**What:** `potions: 0`, `bombs: 0` in state. Used for: Potions accelerate species research (Phase 5). Bombs used for certain Mine worker hires. Both are drop/reward currencies, not purchasable.
**How:** Add to `initialState`. Define drop sources in boss rewards and rare chest rewards.

### Task 2.4 — Market / Shop screen
**Files:** New `src/features/market/index.jsx`, `src/features/market/slice.js`
**What:** A full screen where the player can:
- **Sell** resources for coins (at extremely low rates — emergency only)
- **Buy** resources for coins (at extremely high rates — deliberate convenience)
- **Buy** tools for coins
**Sell/buy price table (from GDD):**
```
Hay:        sell 0◉,   buy 40◉
Wheat:      sell 2◉,   buy 60◉
Grain:      sell 4◉,   buy 80◉
Flour:      sell 6◉,   buy 100◉
Log:        sell 2◉,   buy 60◉
Plank:      sell 4◉,   buy 80◉
Beam:       sell 7◉,   buy 110◉
Berry:      sell 3◉,   buy 70◉
Jam:        sell 5◉,   buy 90◉
Egg:        sell 3◉,   buy 70◉
Stone:      sell 1◉,   buy 50◉
Cobble:     sell 3◉,   buy 70◉
Block:      sell 6◉,   buy 100◉
Ore:        sell 3◉,   buy 70◉
Ingot:      sell 6◉,   buy 100◉
Coal:       sell 2◉,   buy 60◉
Coke:       sell 4◉,   buy 80◉
Gem:        sell 7◉,   buy 120◉
CutGem:     sell 14◉,  buy 200◉
Gold:       sell 5◉,   buy 100◉
```
**How:**
- New route `view: "market"` in state.
- UI: tab for Farm resources, tab for Mine resources, tab for Tools.
- Sell button per resource: shows sell price, disabled if 0 stock.
- Buy button per resource: shows buy price, disabled if not enough coins.
- Add "Market" to BottomNav.

### Task 2.5 — Supply chain (Farm food → session supplies)
**Files:** `src/state.js`, `src/constants.js`
**What:** Mine and (future) Sea sessions should have a "supplies" counter separate from turns. Each session costs supplies to enter. Kitchen building converts farm food to supplies.
**How (first pass):**
- Add `supplies: 0` to state.
- Add `kitchen` building to `BUILDINGS` array: converts `{grain: 3}` → `{supplies: 1}` via a craft action.
- Mine session entry requires spending supplies (e.g., 5 supplies per session, or per N turns).
- This is a medium-complexity change that touches the "enter biome" flow in `SWITCH_BIOME`.

---

## Phase 3 — Mine Depth & Mysterious Ore
*The Mine biome has a unique mechanic (countdown tile) that is entirely absent.*

### Task 3.1 — Mysterious Ore tile type
**Files:** `src/constants.js`, `src/textures.js`, `src/GameScene.js`, `src/TileObj.js`
**What:** In the Mine biome, some tiles are "Mysterious Ore" — a countdown tile. When it spawns, it shows a timer (e.g., 3 turns). The player must chain dirt tiles adjacent to it before the timer reaches 0. If successful, they earn 1 Rune. If the timer expires, the tile converts to a regular stone tile.
**How:**
- Add `{ key: "mysterious_ore", label: "Mysterious Ore", ... }` to Mine resources (not in pool — spawns by special logic).
- Add a custom texture in `textures.js`: glowing ore with a number overlay.
- In `GameScene.fillBoard()`, after Mine session starts, occasionally (1 in 20 tiles?) spawn a `mysterious_ore` tile.
- In `TileObj`, add `countdown` property. Each turn, decrement. Show countdown number on tile.
- If a dirt chain is collected and a `mysterious_ore` tile is adjacent to the endpoint, consume the ore and emit a `RUNE_EARNED` action.
- On turn end, decrement all `mysterious_ore` timers; if 0, convert to `stone`.

### Task 3.2 — Mine special hazard tiles
**What:** GDD mentions mine hazards. Based on the reference game, these include tiles that block or penalize chains.
**Types to implement:**
- **Rock Fall**: A tile that appears and, if not chained within N turns, blocks an adjacent column slot for the rest of the session.
- **Gas Pocket**: Chaining this tile costs 2 turns instead of 1.
**How:** Add to Mine pool at low frequency. Handle special effects in `collectPath()` and turn-end logic.

---

## Phase 4 — Sea Biome (Third Environment)
*A complete biome is missing. This is the largest single feature gap.*

### Task 4.1 — Define Sea resource chains
**File:** `src/constants.js`
**What:** Add a `sea` biome to `BIOMES` with its own resources, pool, and upgrade chains.
**Proposed resources (based on GDD reference):**
```js
sea: {
  name: "Sea",
  dirt: 0x1a3a5c,
  dark: 0x0a1e30,
  resources: [
    { key: "fish",      label: "Fish",      color: 0x6ab4d8, dark: 0x1a4a6a, value: 2, next: "salt_fish", glyph: "🐟" },
    { key: "salt_fish", label: "Salt Fish", color: 0x9ad0e8, dark: 0x2a6a8a, value: 4, next: null,       glyph: "🧂" },
    { key: "kelp",      label: "Kelp",      color: 0x3a8a3a, dark: 0x1a4a1a, value: 1, next: "ointment", glyph: "🌿" },
    { key: "ointment",  label: "Ointment",  color: 0x6ab88a, dark: 0x2a5a3a, value: 3, next: null,       glyph: "🧴" },
    { key: "pearl",     label: "Pearl",     color: 0xf0f0f0, dark: 0x8a8a8a, value: 6, next: "necklace", glyph: "⚪" },
    { key: "necklace",  label: "Necklace",  color: 0xfff8e8, dark: 0xb8a050, value: 12, next: null,      glyph: "📿" },
    { key: "driftwood", label: "Driftwood", color: 0xa87850, dark: 0x5a3a18, value: 2, next: "timber",   glyph: "🪵" },
    { key: "timber",    label: "Timber",    color: 0xd4a070, dark: 0x6a4020, value: 5, next: null,       glyph: "🪟" },
    { key: "coral",     label: "Coral",     color: 0xff8870, dark: 0x8a3020, value: 3, next: "reef_stone", glyph: "🪸" },
    { key: "reef_stone",label: "Reef Stone",color: 0xf0b890, dark: 0x8a5030, value: 6, next: null,       glyph: "🗿" },
  ],
  pool: ["fish", "fish", "kelp", "kelp", "driftwood", "coral", "pearl", "fish", "kelp"],
}
```

### Task 4.2 — Sea tile textures
**File:** `src/textures.js`
- Draw custom canvas icons for all 10 sea resources in `drawTileIcon()`.
- Add ambient sway entries in `TileObj.js` `SWAY` table (e.g., kelp sways, pearl gently bobs).

### Task 4.3 — Sea biome unlock condition
**File:** `src/state.js`
- Sea unlocks at a specific level (suggest level 4) or after building a "Dock" building.
- Add check in `SWITCH_BIOME` action: `if (key === "sea" && state.level < 4)` → show bubble.
- Add biome switcher button for "Sea" in HUD / dock.

### Task 4.4 — Sea-specific hazards
**What:** GDD mentions Sea session hazards.
**Types:**
- **Storm tile**: Spawns randomly, blocks an adjacent tile (covers it) for 2 turns.
- **Fog tile**: Tile type is hidden (shows "?" texture) until chained — then reveals its type and can be included in a chain.
**How:** Same pattern as Phase 3 hazards.

### Task 4.5 — Sea NPC orders
**File:** `src/constants.js`
- Add 2-3 Sea-specific NPCs (e.g., a Harbor Master, a Merchant, a Fisherman).
- Add their dialog lines and update `makeOrder()` to handle `biomeKey === "sea"`.

### Task 4.6 — Sea crafting recipes
**File:** `src/constants.js`
- Add 4-6 Sea-specific recipes (e.g., Salted Fish Barrel, Pearl Necklace, Timber Plank, Coral Jewelry).
- Add a `shipyard` or `smokehouse` building as the required station.

---

## Phase 5 — Species System
*The active/inactive tile-pool toggle is the primary board customization mechanic in the reference game. It doesn't exist here.*

### Task 5.1 — Species catalog data model
**File:** `src/constants.js` (or new `src/features/species/data.js`)
**What:** Each harvestable resource is a "species" with:
- `key`: the resource key (already exists)
- `active`: boolean — whether this species appears in the board pool
- `discovered`: boolean — must be discovered before it can be toggled active
- `discoveryMethod`: "chain" | "research" | "challenge" | "buy"
- `unlockRequires`: another species key that must be discovered first (unlock tree)
- `researchCost`: { key: "hay", amount: 50 } — collect N of this resource to research-discover it
- `buyCost`: coins to buy discovery directly
**How:**
```js
export const SPECIES = {
  hay: {
    active: true,
    discovered: true,
    discoveryMethod: "default",
    unlockRequires: null,
  },
  wheat: {
    active: true,
    discovered: false,
    discoveryMethod: "chain",   // discovered by chaining hay to wheat upgrade
    unlockRequires: "hay",
  },
  // ... etc for all resources
}
```

### Task 5.2 — Species state slice
**File:** `src/features/species/slice.js`
**What:**
- `initialState`: active set = default pool from biome, discovered set = starting resources only.
- Actions: `SPECIES/TOGGLE_ACTIVE`, `SPECIES/DISCOVER`, `SPECIES/RESEARCH_PROGRESS`.
- `SPECIES/TOGGLE_ACTIVE`: Mark a discovered species as active/inactive. Update `biome.pool` dynamically.
**How:** Store `activeSpecies: { farm: Set<key>, mine: Set<key>, sea: Set<key> }` and `discoveredSpecies: Set<key>`.

### Task 5.3 — Wire species pool to board
**Files:** `src/GameScene.js`, `src/state.js`
**What:** `randomResource()` in GameScene currently uses `this.biome().pool`. It should use the player's active species set for the current biome instead.
**How:** Read the active species set from the Phaser registry (synced from React state). Rebuild the pool on `SPECIES/TOGGLE_ACTIVE`. If the active set is empty, use default pool as fallback.

### Task 5.4 — Chain discovery mechanic
**File:** `src/state.js`, `src/features/species/slice.js`
**What:** When a chain produces an upgrade (e.g., hay chain produces wheat), the `wheat` species is auto-discovered if not already.
**How:** In `CHAIN_COLLECTED` handler, when `upgrades > 0`, check `res.next`. If `SPECIES[res.next].discovered === false`, dispatch `SPECIES/DISCOVER` for that key.

### Task 5.5 — Research discovery mechanic
**What:** Player can set a species to "research mode" — collecting N of that resource's prerequisite unlocks it.
**How:** `SPECIES/SET_RESEARCH { key }` — marks that species as the current research target. Progress counter increments on each `CHAIN_COLLECTED` when the prerequisite is collected. At target, auto-discover.

### Task 5.6 — Species UI panel
**File:** `src/features/species/index.jsx`
**What:** A full-screen panel (new nav item) showing:
- All species per biome, with lock/discovered/active states
- Active toggle (on/off switch) for each discovered species
- Research progress bar for species being researched
- "Buy Discovery" button for species with buy cost
- Unlock tree visual (faint connections showing which species unlock others)

---

## Phase 6 — Workers Actually Working
*Apprentices are hired but their effects are phantom. This is the biggest "feels complete but isn't" gap.*

### Task 6.1 — Define worker effect data model
**File:** `src/features/apprentices/data.js`
**What:** Every apprentice needs a typed, machine-readable `effect` field:
```js
{
  key: "peasant",
  name: "Peasant",
  effect: { type: "threshold_reduce", resource: "hay", amount: 2 },
  hireCost: 100,
}
```
**Effect types:**
- `threshold_reduce`: reduces the upgrade threshold for a resource (fewer tiles needed)
- `pool_weight`: increases the spawn weight of a resource in the board pool
- `bonus_yield`: adds N extra of a resource per chain of that type
- `turn_savings`: reduces turn cost for chains of a given type (free moves)
- `research_speed`: reduces research cost for a species

### Task 6.2 — Compute effective thresholds
**File:** `src/state.js` or new `src/features/apprentices/effects.js`
**What:** A pure function `computeEffectiveThresholds(hiredApprentices)` that returns a map of `{ resourceKey → upgradeThreshold }`. Base threshold is `UPGRADE_EVERY=3`. Each hired Peasant with `threshold_reduce` for "hay" reduces it by their `amount`.
**How:**
```js
export function computeEffectiveThresholds(hiredApprentices) {
  const thresholds = {};
  for (const { app } of hiredApprentices) {
    const def = APPRENTICE_MAP[app];
    if (def?.effect?.type === "threshold_reduce") {
      const key = def.effect.resource;
      thresholds[key] = Math.max(1, (thresholds[key] ?? UPGRADE_EVERY) - def.effect.amount);
    }
  }
  return thresholds;
}
```

### Task 6.3 — Pass thresholds to GameScene
**Files:** `prototype.jsx`, `src/GameScene.js`
**What:** Compute thresholds in React and pass them to Phaser via registry (same pattern as `biomeKey`, `turnsUsed`).
**How:**
- In `prototype.jsx`, compute `effectiveThresholds = computeEffectiveThresholds(state.hiredApprentices)`.
- Pass as `memoryPerks={effectiveThresholds}` (rename to `workerThresholds`).
- In GameScene, read from registry in `upgradeCountForChain()` — or better, override the upgrade check per resource type.

### Task 6.4 — Apply pool_weight effects
**What:** Apprentices with `pool_weight` effect should modify the biome's effective spawn pool.
**How:** In `randomResource()`, replace the flat pool array with a weighted sample that respects hired worker modifiers. Compute the modified pool from registry data each call.

### Task 6.5 — Apply bonus_yield effects
**What:** In `collectPath()`, after computing `gained`, check if any hired worker gives `bonus_yield` for this resource type and add the bonus.
**How:** Read worker effects from registry in GameScene. Add bonus to the `gained` value before emitting `chain-collected`.

---

## Phase 7 — Magic Portal
*A premium engagement mechanic from the reference game — absent.*

### Task 7.1 — Magic Portal building
**File:** `src/constants.js`
**What:** Add `{ id: "portal", name: "Magic Portal", cost: { coins: 2000, runes: 5 }, desc: "Summon magical tools using Influence." }` to `BUILDINGS`.

### Task 7.2 — Magic Portal UI
**File:** `src/features/portal/index.jsx`
**What:** A modal showing 3-5 "summonable" magic tool options, each costing Influence/Crowns.
**Magic tools (examples from GDD):**
- **Thunderclap**: Clears an entire row of tiles (cost: 10 Influence)
- **Golden Touch**: Next chain of any type yields double (cost: 8 Influence)
- **Time Bubble**: Next 2 turns don't consume days (cost: 15 Influence)
- **Siren's Call**: Transforms all tiles to a single resource type (cost: 20 Influence)
**How:**
- Portal tools are added to `state.tools` on purchase (extend the tools map with new keys).
- Each portal tool needs a handler in `USE_TOOL` and a board effect in GameScene.

---

## Phase 8 — Castle System
*Referenced in GDD as a prestige/meta-progression layer. Not implemented.*

### Task 8.1 — Castle data model
**What:** The Castle is a special building that upgrades through multiple tiers, each unlocking permanent bonuses (e.g., +1 order slot, reduced building costs, bonus starting coins per session).
**Castle tiers:**
| Tier | Name | Cost | Bonus |
|---|---|---|---|
| 1 | Keep | 0 (starting) | None |
| 2 | Manor | 1000◉, 20 beams | +1 order slot |
| 3 | Stronghold | 3000◉, 10 blocks, 5 ingots | Seasonal bonus doubled |
| 4 | Citadel | 8000◉, 20 blocks, 10 ingots, 3 gems | Boss rewards ×2 |

### Task 8.2 — Castle UI in Town View
**File:** `src/ui.jsx` (TownView), or new `src/features/castle/index.jsx`
**What:** The Hearth building (already built by default) becomes the Castle visual. Clicking it opens the Castle upgrade panel.

---

## Phase 9 — End Game & Win Condition
*The game currently has no defined win state or endgame.*

### Task 9.1 — Define win condition
**Decision needed:** Options:
- **Completionist**: Build all buildings, hire all workers, discover all species.
- **Time-limited**: Complete N seasonal cycles.
- **Story**: Complete a final "boss" quest chain.
**Recommendation:** Soft win — show a "Hearthwood Vale is thriving!" celebration screen when all 8 buildings are built, then transition to prestige/sandbox mode.

### Task 9.2 — Prestige / New Game+
**What:** After win condition, player can "reset" for bonus starting resources or a permanent modifier (e.g., +2 starting tools, or a unique species discovered from the start).

---

## Phase 10 — Content Depth & Balance

### Task 10.1 — Expand NPC dialog
**File:** `src/constants.js`
**What:** Each NPC has only 2-3 dialog lines. Expand to 8-10 per NPC. Add mood-conditional lines (bond level 1 vs. bond level 10 show different personality).
**How:** Extend `NPCS[npc].lines` array. In `makeOrder()`, additionally factor in `npcBond` level to select from appropriate mood tier.

### Task 10.2 — Expand tool catalog
**File:** `src/constants.js`
**What:** Current tools: clear, basic, rare, shuffle (4 total). GDD references 50+ tools. Add a second tier of tools:
- **Fertilizer**: +25% yield for next 3 chains (farm)
- **Dynamite**: Clears a 2×2 area of tiles (mine)
- **Compass**: Reveals tile types 2 turns in advance
- **Barrel**: Converts 3 low-tier resources to 1 mid-tier instantly
**How:** Extend `TOOL_DEFS` in `ui.jsx` and add handlers in `coreReducer`.

### Task 10.3 — Expand building system
**File:** `src/constants.js`
**What:** Add:
- `kitchen`: Converts farm food → mine/sea supplies
- `dock`: Unlocks Sea biome (sea equivalent of Mine level gate)
- `library`: Reduces research cost for all species by 20%
- `greenhouse`: +1 Berry, +1 Egg to pool weight permanently
- `portal` (see Phase 7)

### Task 10.4 — Add orders for Mine and Sea
**What:** Mine and Sea NPCs and orders are thin. Mine orders can request crafted items (hinge, lantern, goldring). Sea orders request sea resources.
**How:** Add sea NPC pool to `NPCS`. Extend `makeOrder()` sea path.

### Task 10.5 — Seasonal NPC dialog variation
**What:** NPC dialog should reference the current season.
**How:** In `makeOrder()`, pass `currentSeason` and select from `lines` arrays keyed by season.

### Task 10.6 — Balance pass: XP curve
**File:** `src/state.js`
**What:** `xpForLevel(l) = 50 + l * 80`. At level 1 this requires 130 XP. A 3-chain of hay (value=1, gained=3) yields 3 XP. That's 44 chains to level up. With 8 turns per session this is ~5-6 sessions to level 2 — probably too slow for a mobile game.
**Decision needed:** Target time-to-level-2 should be 1-2 sessions. Adjust formula accordingly.

### Task 10.7 — Balance pass: order rewards
**What:** Order rewards computed as `need * value * 6`. For `hay` (value=1), need=10, reward=60 coins. First building (Hearth) costs 0 coins. Mill costs 200 coins. At 60 coins/order that's 3-4 orders to build Mill — probably reasonable but needs playtesting.

---

## Phase 11 — Polish & Accessibility

### Task 11.1 — Audio completeness audit
**Files:** `src/audio/index.js`, `src/audio/useAudio.js`
**What:** Audit which events trigger sound and which don't. Missing likely:
- Chain start sound
- Chain extend sound (per tile, subtle)
- Upgrade earned sound (distinct "ding")
- Order fulfilled sound
- Level up fanfare
- Season transition
- Building constructed

### Task 11.2 — Haptics
**File:** `src/audio/useAudio.js`
**What:** On mobile, use `navigator.vibrate()` for:
- Chain start: 20ms pulse
- Upgrade earned: 40ms-20ms-40ms pattern
- Order fulfilled: 60ms long
- Gated behind `state.settings.hapticsOn`.

### Task 11.3 — Reduced motion
**What:** When `settings.reducedMotion` is true, disable: tile sway animations (SWAY table), radial flash effects, screen shake (`shakeForChain`), and use instant tile collapses instead of tweens.
**How:** Read `reducedMotion` from registry in GameScene. Skip tween creation or use duration=0.

### Task 11.4 — Color blind mode
**What:** When `settings.colorBlind` is true, add distinct shape indicators to tile backgrounds (not just color) so resources are distinguishable without color.
**How:** In `makeTextures()`, if colorBlind mode is active, stamp a shape glyph (triangle, square, circle, diamond...) overlay on each tile texture.

### Task 11.5 — Tutorial coverage for new mechanics
**File:** `src/features/tutorial/index.jsx`
**What:** The current 6-step tutorial covers: welcome, chain mechanic, upgrade mechanic, orders, town, season. Add steps for:
- Species toggle (when unlocked)
- Mine biome switch
- Tool usage on board

### Task 11.6 — Loading screen
**What:** The current loading state shows "Loading board…" in tiny text. Add a proper loading animation (spinning Hearth icon or tile-bounce animation).

### Task 11.7 — Offline/PWA support
**What:** Add a `manifest.json` and service worker so the game can be installed and played offline.

---

## Phase 12 — Infrastructure & Monetization Hooks

### Task 12.1 — Analytics event stubs
**What:** Define an `analytics.js` module with a no-op `track(event, props)` function. Call it for key events: session start/end, level up, building built, boss defeated, IAP prompt shown. This lets a real analytics backend be wired later with zero game-logic changes.

### Task 12.2 — IAP / Rune pack stubs
**What:** Add a `store/index.jsx` stub for in-app purchase flow. Show a "Get Runes" button in the HUD that opens a modal with packs (stub — no real purchase). This validates the flow and positions for a real store integration.

### Task 12.3 — Cloud save stub
**What:** Add a `save/cloud.js` with `uploadSave(state)` and `downloadSave()` no-ops. Hook `uploadSave` after `persistState()`. Real backend can be dropped in later.

---

## Dependency Graph Summary

```
Phase 0 (Foundation Fixes)
    └─ Phase 1 (Board Mechanics)
        ├─ Phase 2 (Economy)
        │   └─ Phase 3 (Mine Depth)
        │   └─ Phase 7 (Magic Portal)
        ├─ Phase 4 (Sea Biome)  [can start after Phase 1]
        ├─ Phase 5 (Species)    [can start after Phase 1]
        └─ Phase 6 (Workers)    [can start after Phase 1]
            └─ Phase 8 (Castle) [after Phase 6]
                └─ Phase 9 (End Game)
Phase 10 (Content) — parallel after Phase 4
Phase 11 (Polish)  — parallel, any time
Phase 12 (Infra)   — parallel, any time
```

---

## Open Questions (Still Need Research/Decisions)

1. **Grid size**: Commit to 6×6 (GDD) or keep 6×7 (current)? 6×7 gives more board variety but breaks reference-game comparisons.
2. **Threshold model**: Keep "every 3rd tile upgrades anywhere in chain" (current) or switch to "chain must reach threshold length to produce resource at endpoint" (reference game model)? The current model is simpler and already built; the reference model is more strategic. This is the most consequential design decision.
3. **Sea supply cost**: How many supplies does a Mine/Sea session cost to enter? Per turn or per session?
4. **Species unlock tree**: What are the specific unlock dependencies? (e.g., "discover wheat before grain" — this is in the reference game but needs mapping for THIS game's resource tree)
5. **Win condition**: Completionist vs. timed vs. story? See Phase 9.
6. **Prestige system**: After win — reset with bonus, or true sandbox mode?
7. **Influence source**: What buildings generate Influence? Only decorative ones? Or all buildings?
8. **Bomb source**: Where do Bombs drop? Mine sessions? Boss drops only?
9. **Castle starting tier**: Does the Hearth (already built) count as Castle tier 1? Or is Castle a separate building?
10. **Order slots**: Base is 3. Does Castle tier 2 (+1 order slot) make it 4? Is there a cap?
