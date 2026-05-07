# Phase 9 — Mine Biome

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Wren leads the player through the now-unsealed mine
entrance. The board dims, the palette goes cool grey, and a different pool fills
the grid: stone, ore, coal, and dirt with the occasional gem glitter. Once per
mine session a Mysterious Ore tile pulses on the board with a 5-turn countdown —
chain it together with at least 2 dirt tiles and the cavern coughs up a Rune.
Cave-ins lock a row behind rubble until 3 stones clear them; gas vents glow for
3 turns and steal the next turn if ignored. A Canary helper halves vent spawns,
a Geologist tilts the pool toward ore and gems — both honour the Phase 4
max-effect model.

**Why now:** Phase 2's `act3_mine_opened` story beat already sets the narrative
gate; Phase 3.2 wired the supplies-for-entry economy and Phase 3.3 wired the
2-rune premium path. Without Phase 9 the Mine button opens an empty board with
a placeholder pool and no reason to keep pulling the lever. This is the second
biome — Farm and Mine in parallel — and the Sea biome stays deferred per the
locked Farm → Mine → Sea priority. Phase 9 is what turns "I unlocked the mine"
into "I want to spend a session in the mine instead of the farm tonight."

**Entry check:** [Phase 8 Sign-off Gate](./phase-8-boss-weather.md#phase-8-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 9.1 — Stone / cobble / ore / coal / ingot resource chain

**What this delivers:** Switching the active biome to `mine` swaps the board's
spawn pool from the Farm pool (hay/log/wheat/berry/egg) to the Mine pool
(stone/ore/coal/dirt + rare gem). All five Mine base resources roll their own
upgrade thresholds against the Phase 1 `UPGRADE_THRESHOLDS` table; the same
shared `state.inventory` collects from both biomes — there is no separate
Farm-vs-Mine inventory pool. Switching back to Farm restores the Farm pool
without touching collected resources.

**Completion Criteria:**
- [ ] `MINE_TILE_POOL` exported from `src/constants.js` with the literal array
  `["stone","stone","stone","ore","ore","coal","dirt","dirt","gem"]`
  (9 entries, mirrors `FARM_TILE_POOL` shape from Phase 1)
- [ ] `BIOMES.mine` extended with `tilePool: MINE_TILE_POOL`, `dirtColor`,
  `palette: { bg, accent, dim }` for the cool-grey cavern look
- [ ] `state.biome` field exists, defaults to `"farm"`, persisted in save
- [ ] `SET_BIOME { id: "mine" | "farm" }` action — replaces the active board
  pool *and* triggers a full board refill on the next `OPEN_SEASON`
- [ ] `UPGRADE_THRESHOLDS` (Phase 1 table) honoured for all 5 mine base
  resources: stone=8, cobble=6, ore=6, coal=7, gem=5; ingot is terminal
  (`UPGRADE_THRESHOLDS.ingot` undefined / not present, so chain commits never
  upgrade past it); gold is terminal too
- [ ] Chain commits in mine biome write to the same `state.inventory` keys
  Farm chains use — no `state.inventory.mine.*` sub-bag, no doubled keys
- [ ] Switching biome at season boundary (only) — guard rejects `SET_BIOME`
  mid-season (return state unchanged + show "Wait for the season to end" floater)
- [ ] `src/textures.js` registers procedural icons for `tile.stone`,
  `tile.ore`, `tile.coal`, `tile.dirt`, `tile.gem` at the standard 74×74
- [ ] HUD biome indicator (top-right of canvas): pickaxe glyph + "Mine" label
  while `state.biome === "mine"`, sickle glyph + "Farm" otherwise

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { BIOMES, MINE_TILE_POOL, UPGRADE_THRESHOLDS } from "./constants.js";
import { createInitialState, reduce } from "./state.js";
import { upgradeCountForChain } from "./utils.js";

// Pool shape locked exactly
assert(Array.isArray(MINE_TILE_POOL) && MINE_TILE_POOL.length === 9,
       "MINE_TILE_POOL is a 9-entry array");
const baseSet = new Set(MINE_TILE_POOL);
assert(["stone","ore","coal","dirt","gem"].every(k => baseSet.has(k)),
       "MINE_TILE_POOL contains exactly the 5 mine base resources");
assert(MINE_TILE_POOL.filter(k => k === "stone").length === 3, "stone weighted ×3");
assert(MINE_TILE_POOL.filter(k => k === "dirt").length  === 2, "dirt weighted ×2");
assert(MINE_TILE_POOL.filter(k => k === "gem").length   === 1, "gem weighted ×1 (rare)");

// BIOMES wiring
assert(BIOMES.mine && BIOMES.mine.tilePool === MINE_TILE_POOL,
       "BIOMES.mine.tilePool === MINE_TILE_POOL");
assert(BIOMES.farm && BIOMES.farm.tilePool && BIOMES.farm.tilePool !== MINE_TILE_POOL,
       "Farm pool is distinct from Mine pool");

// Threshold table (locked from Phase 1 / GAME_SPEC §4)
assert(UPGRADE_THRESHOLDS.stone  === 8, "stone → cobble at 8");
assert(UPGRADE_THRESHOLDS.cobble === 6, "cobble → block at 6");
assert(UPGRADE_THRESHOLDS.ore    === 6, "ore → ingot at 6");
assert(UPGRADE_THRESHOLDS.coal   === 7, "coal → coke at 7");
assert(UPGRADE_THRESHOLDS.gem    === 5, "gem → cutgem at 5");
assert(UPGRADE_THRESHOLDS.ingot  === undefined, "ingot is terminal — no threshold");
assert(UPGRADE_THRESHOLDS.gold   === undefined, "gold is terminal — no threshold");

// Default biome + SET_BIOME swaps active pool
let s = createInitialState();
assert(s.biome === "farm", "default biome is farm");
s = reduce(s, { type: "ADVANCE_SEASON" });    // close season → at boundary
s = reduce(s, { type: "SET_BIOME", id: "mine" });
assert(s.biome === "mine", "SET_BIOME flips state.biome");

// Mid-season SET_BIOME is rejected (state unchanged)
let mid = createInitialState();
mid.turnsUsed = 4;
const before = JSON.stringify(mid);
const after  = reduce(mid, { type: "SET_BIOME", id: "mine" });
assert(JSON.stringify(after) === before, "mid-season SET_BIOME is no-op");

// Shared inventory — chain commits in mine biome write to top-level keys
let g = createInitialState();
g.biome = "mine";
g.inventory.stone = 0;
g = reduce(g, { type: "COMMIT_CHAIN", chain: Array(8).fill({ key: "stone" }) });
assert(g.inventory.stone === 7, "8-stone chain → 7 stone + 1 cobble (threshold 8)");
assert(g.inventory.cobble === 1, "8-stone chain produces 1 cobble (shared inv)");
assert(g.inventory.mine === undefined, "no separate mine inventory bag");

// upgradeCountForChain honours the mine thresholds without code changes
assert(upgradeCountForChain(8,  "stone") === 1, "8 stone = 1 cobble");
assert(upgradeCountForChain(16, "stone") === 2, "16 stone = 2 cobble");
assert(upgradeCountForChain(6,  "ore")   === 1, "6 ore = 1 ingot");
assert(upgradeCountForChain(7,  "coal")  === 1, "7 coal = 1 coke");
assert(upgradeCountForChain(5,  "gem")   === 1, "5 gem = 1 cutgem");
```
Run — confirm: `MINE_TILE_POOL is not exported from './constants.js'`.

*Gameplay simulation (player at level 8, having spent 3 supplies to enter the mine for the first time):*
The player taps "Enter Mine" on the Town nav. The season modal closes; the
canvas cross-fades from the warm green Farm palette to a cool grey cavern
palette in ~400ms. The board fills: 6 stone tiles, 4 ore, 3 coal, 4 dirt, and
1 lone gem twinkling in the bottom-left. The pickaxe icon now sits where the
sickle was. The player drags an 8-stone chain — the floater pops `+7 stone +1
cobble` at the chain endpoint (8 ÷ 8 threshold = 1 cobble upgrade). They drag
6 ore — `+5 ore +1 ingot`. End of season modal: "+22 stone, +5 ore, +3 coal, +1
cobble, +1 ingot, +1 dirt." The Forge recipe panel back in town now shows hinge
craftable for the first time this session.

Designer reflection: *Does the mine board read as a different game from the
farm — or just a reskinned palette? Are the icons distinguishable enough at a
glance that I can plan a chain without squinting at three shades of grey?*

**Implementation:**
- `src/constants.js` — extract Farm pool to a named constant, add Mine pool,
  extend `BIOMES`:
  ```js
  export const FARM_TILE_POOL = ["hay","hay","hay","log","log","wheat","berry","berry","egg"];
  export const MINE_TILE_POOL = ["stone","stone","stone","ore","ore","coal","dirt","dirt","gem"];

  export const BIOMES = {
    farm: { name: "Farm", tilePool: FARM_TILE_POOL,
            dirtColor: 0x6d4a2f,
            palette: { bg: 0x7dbd48, accent: 0x5daa35, dim: 0x3e2a1a } },
    mine: { name: "Mine", tilePool: MINE_TILE_POOL,
            dirtColor: 0x3e3a36,
            palette: { bg: 0x2a2c30, accent: 0x6a7280, dim: 0x121316 } },
  };
  ```
- `src/state.js` — `createInitialState()` adds `biome: "farm"`. Reducer handles
  `SET_BIOME`: rejects if `state.turnsUsed > 0` (mid-season); else returns
  `{ ...state, biome: action.id, _needsRefill: true }`.
- `src/GameScene.js`:
  - `OPEN_SEASON` — read `BIOMES[state.biome].tilePool` for `fillBoard()`.
  - `applyBiomePalette(biomeId)` — tween canvas background, dirt-tint, and
    HUD biome glyph over 400ms.
  - `tryShowFloater("Wait for the season to end")` on rejected mid-season switch.
- `src/textures.js` — register `tile.stone`, `tile.ore`, `tile.coal`,
  `tile.dirt`, `tile.gem` (procedural Canvas 2D — no external assets).

**Manual Verify Walk-through:**
1. New game. `gameState.biome === "farm"`. Confirm Farm pool fills the board.
2. Force `gameState.story.flags.mine_unlocked = true`. End the season.
3. Tap "Enter Mine" on the Town nav. Confirm canvas fades to grey palette and
   board refills with stone/ore/coal/dirt/gem within ~500ms.
4. Drag an 8-stone chain. Confirm floater shows `+7 stone +1 cobble` and
   `gameState.inventory.cobble === 1`.
5. Drag a 6-ore chain. Confirm `gameState.inventory.ingot === 1`.
6. Mid-season: try `dispatch({type:"SET_BIOME", id:"farm"})` via console.
   Confirm state unchanged + floater "Wait for the season to end."
7. End the season. Switch back to Farm. Confirm `gameState.inventory.cobble`
   and `.stone` survive the switch (shared bag).
8. Save → refresh. Confirm `gameState.biome === "farm"` is restored.
9. `runSelfTests()` passes all 9.1 assertions.

---

### 9.2 — Mysterious Ore unlock (countdown + dirt-adjacent chain → 1 Rune)

**What this delivers:** Once per mine session, a single Mysterious Ore tile
spawns somewhere on the board (only on the Mine biome) carrying a 5-turn
countdown. Each `advanceTurn()` ticks the countdown down by 1. To capture it,
the player must chain it as part of a chain that contains the Mysterious Ore
tile + at least 2 Dirt tiles (the dirt does not have to be orthogonally
adjacent to the ore — the chain itself proves adjacency, since chains are
4-connected by Phase 1 rules). Success = +1 Rune, special burst VFX, tile
collapses normally. Failure (countdown hits 0 before chain) = degrades to
ordinary Dirt with a "The ore went dormant." floater. Only one Mysterious
Ore can be active at a time.

**Completion Criteria:**
- [ ] `state.mysteriousOre` shape: `{ row, col, turnsRemaining } | null`
- [ ] On `OPEN_SEASON` with `state.biome === "mine"` and
  `state.mysteriousOre === null`: 100% spawn (locked at 1-per-session)
- [ ] Spawn location is a valid grid cell, never overlapping another special
  tile (rubble, gas vent, hazard) — re-rolls until clear
- [ ] `turnsRemaining` initialises to 5
- [ ] `advanceTurn()` decrements `state.mysteriousOre.turnsRemaining` by 1
- [ ] `commitChain()` detects a chain containing the Mysterious Ore + ≥ 2 dirt:
  awards `+1 rune` (`state.runes += 1`), clears `state.mysteriousOre`,
  plays burst VFX, no inventory contribution from the ore tile itself
- [ ] Chaining the Mysterious Ore alone, or with 0 or 1 dirt tiles in the
  chain, is a *no-match* — chain is rejected with a "Need 2 dirt" floater
  (countdown does NOT tick on a rejected chain)
- [ ] `turnsRemaining` reaches 0 with no successful capture: tile degrades to
  a normal Dirt tile in place; `state.mysteriousOre = null`; floater "The ore
  went dormant."; **no rune awarded**
- [ ] Only one active at a time — second `OPEN_SEASON` while one is on the
  board is a no-op (no second spawn)
- [ ] Switching biome to Farm clears `state.mysteriousOre` (it cannot live on
  the Farm board); next mine session re-rolls a new one
- [ ] Save/load round-trips `state.mysteriousOre` exactly
- [ ] `src/textures.js` adds `tile.mysterious_ore` (74×74, faint purple-violet
  pulse — distinguishable from gem and ore at a glance)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { createInitialState, reduce } from "./state.js";
import { spawnMysteriousOre, tickMysteriousOre, isMysteriousChainValid }
  from "./features/mine/mysterious_ore.js";

// Spawn shape — within grid bounds, turnsRemaining = 5
let s = createInitialState();
s.biome = "mine";
const rng = (() => { let i = 0; const seq = [0.4, 0.2]; return () => seq[i++ % 2]; })();
s = spawnMysteriousOre(s, rng);
assert(s.mysteriousOre && Number.isInteger(s.mysteriousOre.row),
       "mysteriousOre row is integer");
assert(s.mysteriousOre.row >= 0 && s.mysteriousOre.row < s.grid.length,
       "row in grid bounds");
assert(s.mysteriousOre.col >= 0 && s.mysteriousOre.col < s.grid[0].length,
       "col in grid bounds");
assert(s.mysteriousOre.turnsRemaining === 5, "5-turn countdown locked on spawn");

// Second spawn while one active = no-op
const before = JSON.stringify(s.mysteriousOre);
s = spawnMysteriousOre(s, rng);
assert(JSON.stringify(s.mysteriousOre) === before, "second spawn is no-op");

// Tick decrements
let t = tickMysteriousOre(s);
assert(t.mysteriousOre.turnsRemaining === 4, "tick: 5 → 4");
for (let i = 0; i < 3; i++) t = tickMysteriousOre(t);
assert(t.mysteriousOre.turnsRemaining === 1, "tick: 4 → 1");

// Tick at 1 with no capture → degrades to dirt, NO rune
const expired = tickMysteriousOre(t);
assert(expired.mysteriousOre === null, "expired ore cleared");
assert((expired.runes ?? 0) === (t.runes ?? 0), "no rune on expiry");
assert(expired.grid[t.mysteriousOre.row][t.mysteriousOre.col].key === "dirt",
       "expired tile becomes dirt");

// Chain validation — needs ore + ≥ 2 dirt to count
const ore = { key: "mysterious_ore", row: 2, col: 3 };
const d1  = { key: "dirt", row: 2, col: 4 };
const d2  = { key: "dirt", row: 2, col: 5 };
const stone = { key: "stone", row: 2, col: 6 };
assert(isMysteriousChainValid([ore]) === false, "ore alone fails");
assert(isMysteriousChainValid([ore, d1]) === false, "ore + 1 dirt fails");
assert(isMysteriousChainValid([ore, d1, d2]) === true, "ore + 2 dirt passes");
assert(isMysteriousChainValid([ore, d1, d2, stone]) === true,
       "ore + 2 dirt + extra still passes");
assert(isMysteriousChainValid([d1, d2, stone]) === false, "no ore in chain → false");

// COMMIT_CHAIN with valid mysterious chain → +1 rune, ore cleared
let c = createInitialState();
c.biome = "mine"; c.runes = 0;
c.mysteriousOre = { row: 2, col: 3, turnsRemaining: 3 };
c = reduce(c, { type: "COMMIT_CHAIN", chain: [ore, d1, d2] });
assert(c.runes === 1, "valid mysterious capture awards exactly 1 rune");
assert(c.mysteriousOre === null, "ore cleared after capture");

// Reject chain (ore + 1 dirt) does NOT tick countdown
let r = createInitialState();
r.biome = "mine";
r.mysteriousOre = { row: 2, col: 3, turnsRemaining: 4 };
r = reduce(r, { type: "COMMIT_CHAIN", chain: [ore, d1], rejected: true });
assert(r.mysteriousOre.turnsRemaining === 4, "rejected chain does not tick");

// Save/load round-trip
const json = JSON.stringify(s.mysteriousOre);
assert(JSON.stringify(JSON.parse(json)) === json, "mysteriousOre serialises");
```
Run — confirm: `Cannot find module './features/mine/mysterious_ore.js'`.

*Gameplay simulation (player on turn 3 of a Mine session, second-ever mine visit):*
The player opens the mine for the second time. The board fills, and a single
violet-pulsing tile sits at row 2, column 3 — the Mysterious Ore. A small
"⏱ 5" badge floats above it. They scan: there are 4 dirt tiles on the board
and the ore is in the second row. They drag a chain that picks up the ore,
slides through one dirt at column 4, and a second dirt at column 5 — chain
length 3. The chain commits with a brief violet burst and a chime. Floater:
`+1 Rune.` The HUD rune counter ticks `0 → 1`. They smile — that's a rune
toward the next premium mine entry. Two seasons later they ignore the next
ore deliberately to test it; turn 5 lands, the violet pulse fades to brown,
floater: "The ore went dormant." The tile is now plain dirt, and a new
Mysterious Ore will spawn next mine session.

Designer reflection: *Does 5 turns + needing 2 dirt feel like a real puzzle —
"can I route a chain through enough dirt before the timer expires?" — or does
it always end up either trivially capturable (lots of dirt nearby) or
impossible (ore stranded among stone)? Should the spawn weight `dirt ×2` be
bumped to `×3` so capture is reliably attainable?*

**Implementation:**
- New file `src/features/mine/mysterious_ore.js`:
  ```js
  export const MYSTERIOUS_ORE_TURNS = 5;
  export const REQUIRED_DIRT_IN_CHAIN = 2;

  export function spawnMysteriousOre(state, rng = Math.random) {
    if (state.biome !== "mine" || state.mysteriousOre) return state;
    const rows = state.grid.length, cols = state.grid[0].length;
    const blocked = (r, c) => {
      const t = state.grid[r][c];
      return t.rubble || t.gas || t.frozen || t.hidden;
    };
    let r, c, tries = 0;
    do {
      r = Math.floor(rng() * rows);
      c = Math.floor(rng() * cols);
    } while (blocked(r, c) && ++tries < 32);
    const grid = state.grid.map((row, ri) =>
      row.map((tile, ci) =>
        ri === r && ci === c ? { ...tile, key: "mysterious_ore" } : tile));
    return { ...state, grid,
      mysteriousOre: { row: r, col: c, turnsRemaining: MYSTERIOUS_ORE_TURNS } };
  }

  export function tickMysteriousOre(state) {
    if (!state.mysteriousOre) return state;
    const next = state.mysteriousOre.turnsRemaining - 1;
    if (next > 0) {
      return { ...state,
        mysteriousOre: { ...state.mysteriousOre, turnsRemaining: next } };
    }
    // Expire — degrade to dirt
    const { row, col } = state.mysteriousOre;
    const grid = state.grid.map((r, ri) =>
      r.map((t, ci) => ri === row && ci === col ? { ...t, key: "dirt" } : t));
    return { ...state, grid, mysteriousOre: null };
  }

  export function isMysteriousChainValid(chain) {
    const hasOre  = chain.some(t => t.key === "mysterious_ore");
    const dirtCnt = chain.filter(t => t.key === "dirt").length;
    return hasOre && dirtCnt >= REQUIRED_DIRT_IN_CHAIN;
  }
  ```
- `src/state.js` — `createInitialState()` adds `mysteriousOre: null, runes: 0`.
  Reducer `SET_BIOME` to "farm" clears `mysteriousOre`.
- `src/GameScene.js`:
  - `openSeason()` — if `state.biome === "mine"` and `!state.mysteriousOre`,
    `state = spawnMysteriousOre(state, rng)`.
  - `commitChain(chain)` — if `chain.some(t => t.key === "mysterious_ore")`:
    if `isMysteriousChainValid(chain)` → `state.runes += 1`,
    `state.mysteriousOre = null`, play violet burst VFX (Phaser particle
    emitter at the ore's tile centre, 600ms); else reject the chain with
    "Need 2 dirt" floater (do NOT tick the countdown, do NOT advance turn).
  - `advanceTurn()` — `state = tickMysteriousOre(state)`. On expiry,
    show "The ore went dormant." floater at the ore's last position.
- `src/textures.js` — register `tile.mysterious_ore`: 74×74 with a
  violet inner pulse + dark grey rim. Pulse animation handled by
  `TileObj.js` looping a 600ms tween while the tile is on the board.

**Manual Verify Walk-through:**
1. Force `gameState.biome = "mine"; openSeason()`. Confirm a single
   `mysterious_ore` tile appears with a violet pulse + "⏱ 5" badge.
2. Try to chain the ore alone. Confirm chain rejected, floater "Need 2 dirt."
   Confirm `gameState.mysteriousOre.turnsRemaining` still 5.
3. Drag a chain: ore + 2 dirt. Confirm violet burst, `gameState.runes === 1`,
   `gameState.mysteriousOre === null`.
4. Reset. New mine session. Advance 5 turns *without* capturing.
   Confirm tile becomes `key: "dirt"`, floater "The ore went dormant.",
   no rune awarded.
5. Open another mine session. Confirm exactly one new ore spawns.
6. Mid-mine-session, force `SET_BIOME farm` at season boundary. Confirm
   `gameState.mysteriousOre === null`. Switch back next season → new ore.
7. Save → refresh mid-countdown. Confirm `turnsRemaining` and `row`/`col`
   exactly preserved.
8. `runSelfTests()` passes all 9.2 assertions.

---

### 9.3 — Hazards (cave-in, gas vent)

**What this delivers:** The Mine biome is *risky* in a way the Farm is not.
Each `fillBoard()` call (on Mine biome, no boss active) rolls a 5% chance of
spawning one hazard, capped at 1 active at a time. Cave-in chooses a random
row, marks all 6 cells as rubble (unselectable, dark grey crackled overlay),
and clears only when the player chains 3+ stone tiles in a row orthogonally
adjacent to the rubble row. Gas vent picks a 2×2 region, applies a yellow-green
glow, and starts a 3-turn countdown; if any tile in the 2×2 is included in a
chain before the timer expires the vent is vented and clears, otherwise on
turn 0 the player loses the next turn (`turnsUsed += 1` with no chain) and a
"You cough through it." floater fires. Hazards spawn ONLY in the Mine biome
and are mutually exclusive with bosses.

**Completion Criteria:**
- [ ] `src/features/mine/hazards.js` exports `HAZARDS` array, shape
  `{ id, weight, durationTurns?, spawn(grid, rng) }` and pure helpers
  `rollHazard(state, rng)`, `tickHazards(state)`, `tileBlockedByHazard(tile)`,
  `clearCaveIn(state, chain)`
- [ ] `HAZARDS` contains exactly two entries: `cave_in` and `gas_vent`,
  weights 50/50 within the hazard pool
- [ ] `state.hazards` shape: `{ caveIn: {row} | null, gasVent: {row, col, turnsRemaining} | null }`
- [ ] Spawn rate: `rollHazard` returns a hazard with 5% probability *per
  fillBoard*, but only if `state.biome === "mine" && !state.boss && hazardsActive(state) === 0`
- [ ] Hazards never spawn in Farm biome (assertion-tested explicitly)
- [ ] `tileBlockedByHazard(tile)` returns `true` for `tile.rubble === true`;
  gas tiles remain *chainable* (chaining is the counter)
- [ ] Cave-in: `clearCaveIn(state, chain)` clears the rubble row when chain
  has ≥ 3 stone tiles AND at least one chain tile is in row `caveIn.row ± 1`
  AND in any column — clearing refills the row on next collapse
- [ ] Cave-in not cleared by season end → row stays as rubble for the rest of
  that mine session (visual: rubble persists, no resources collected from it)
- [ ] Gas vent `turnsRemaining` ticks once per turn via `tickHazards`
- [ ] Gas vent at 0 with no chain into the 2×2 → `turnsUsed += 1` (the
  "lost turn"), `state.hazards.gasVent = null`, floater "You cough through it."
- [ ] Gas vent vented (chain tile lands in the 2×2) → `state.hazards.gasVent = null`
  on commit, no lost turn, no floater
- [ ] Phase 4 worker effect `gas_vent_rate -50%` (Canary, full-hire) reduces
  the per-fillBoard hazard roll from 5% → 2.5% *for gas_vent only*
  (cave-in spawn rate untouched)
- [ ] Save/load round-trips `state.hazards` exactly
- [ ] `src/textures.js` adds `hazard.rubble` (dark grey crackled, 74×74),
  `hazard.gas_overlay` (yellow-green 50% alpha, 148×148 covering 2×2)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { HAZARDS, rollHazard, tickHazards, tileBlockedByHazard, clearCaveIn }
  from "./features/mine/hazards.js";
import { createInitialState, reduce } from "./state.js";
import { computeWorkerEffects } from "./features/apprentices/aggregate.js";

// Hazard catalog
assert(HAZARDS.length === 2, "exactly 2 hazards: cave_in, gas_vent");
const ids = HAZARDS.map(h => h.id);
assert(ids.includes("cave_in") && ids.includes("gas_vent"), "both hazards present");

// Farm biome NEVER spawns hazards
let farm = createInitialState(); farm.biome = "farm";
for (let i = 0; i < 1000; i++) {
  const r = rollHazard(farm, Math.random);
  assert(r === null, "farm biome never rolls a hazard");
}

// Mine biome rolls hazard at ~5% — call 1000× with deterministic rng
let mine = createInitialState(); mine.biome = "mine"; mine.boss = null;
mine.hazards = { caveIn: null, gasVent: null };
let hits = 0;
for (let i = 0; i < 1000; i++) {
  const seedRng = (() => { const x = (i * 9301 + 49297) % 233280 / 233280;
                           let n = 0; return () => n++ === 0 ? x : 0.5; })();
  if (rollHazard(mine, seedRng)) hits++;
}
assert(hits >= 30 && hits <= 80, `hazard rate ~5% across 1000 rolls (got ${hits})`);

// Hazard cap — never spawn while one is active
mine.hazards = { caveIn: { row: 3 }, gasVent: null };
assert(rollHazard(mine, () => 0.01) === null, "cap: no spawn while caveIn active");

// Tile blocking
assert(tileBlockedByHazard({ rubble: true })  === true,  "rubble blocks");
assert(tileBlockedByHazard({ gas: true })     === false, "gas does NOT block (chain is counter)");
assert(tileBlockedByHazard({ rubble: false }) === false, "clean tile not blocked");

// Cave-in clears with 3+ stone in adjacent row
const stoneTile = (r, c) => ({ key: "stone", row: r, col: c });
let s = createInitialState(); s.biome = "mine";
s.hazards = { caveIn: { row: 3 }, gasVent: null };
const goodChain = [stoneTile(2,1), stoneTile(2,2), stoneTile(2,3)];
const cleared = clearCaveIn(s, goodChain);
assert(cleared.hazards.caveIn === null, "3 stone in row 2 clears caveIn at row 3");

// Insufficient stone OR not adjacent → no clear
const tooFew = clearCaveIn(s, [stoneTile(2,1), stoneTile(2,2)]);
assert(tooFew.hazards.caveIn !== null, "2 stone does not clear");
const wrongRow = clearCaveIn(s, [stoneTile(0,1), stoneTile(0,2), stoneTile(0,3)]);
assert(wrongRow.hazards.caveIn !== null, "row 0 chain does not clear caveIn at row 3");

// Gas vent ticks down with turnsUsed
let g = createInitialState(); g.biome = "mine";
g.hazards = { caveIn: null, gasVent: { row: 2, col: 3, turnsRemaining: 3 } };
let g2 = tickHazards(g);
assert(g2.hazards.gasVent.turnsRemaining === 2, "gas tick 3 → 2");
g2 = tickHazards(g2); g2 = tickHazards(g2);
assert(g2.hazards.gasVent === null, "gas cleared at 0");
assert(g2.turnsUsed === g.turnsUsed + 1, "expired gas vent costs 1 turn");

// Canary worker reduces gas vent spawn rate by 50% (full hire)
let cs = createInitialState(); cs.biome = "mine";
cs.workers = { hired: { canary: 2 }, debt: 0 };
const eff = computeWorkerEffects(cs);
assert(eff.hazardSpawnReduce.gas_vent === 0.5,
       "2 canaries (max) reduce gas_vent rate by 50%");
const csOne = { ...cs, workers: { ...cs.workers, hired: { canary: 1 } } };
assert(computeWorkerEffects(csOne).hazardSpawnReduce.gas_vent === 0.25,
       "1 canary = 25% reduction (max ÷ maxCount)");

// Save/load round-trip
const json = JSON.stringify({ caveIn: { row: 4 },
                              gasVent: { row: 1, col: 2, turnsRemaining: 2 } });
assert(JSON.stringify(JSON.parse(json)) === json, "hazards round-trip");
```
Run — confirm: `Cannot find module './features/mine/hazards.js'`.

*Gameplay simulation (player at level 9, third mine session, no canary yet):*
The player has played two clean mine sessions. On session 3, turn 4, the
fillBoard rolls a 5% hit and a cave-in slams down on row 4 — a dark grey
crackled overlay paints the whole row, and a tiny shake animation rolls
across the canvas. The player tries to drag through row 4 — chain refuses,
tiles dim. They re-route: chain 4 stone in row 3, the chain commits, and the
rubble row crumbles with a dust-puff VFX. Row 4 refills on collapse. Two
turns later, a gas vent flares at rows 2-3 / cols 4-5 with a yellow-green
glow and a "⏱ 3" badge. They're greedy — chain a juicy ore route on the far
side of the board, ignoring the vent. Three turns pass, the badge ticks
3 → 2 → 1 → 0, the vent flashes red, floater "You cough through it.",
`turnsUsed` jumps from 7 to 8 with no chain. Lesson learnt. Next session
they hire a Canary and the vents notably back off.

Designer reflection: *Does losing a row to a permanent cave-in (failed clear)
feel like a "fair lesson" or like punishment for a 5% RNG event the player
couldn't see coming? Should cave-ins always announce themselves a turn
before they land — a "tremor" warning glyph — to give the player agency?*

**Implementation:**
- New file `src/features/mine/hazards.js`:
  ```js
  export const HAZARD_BASE_RATE = 0.05;

  export const HAZARDS = [
    { id: "cave_in", weight: 50,
      spawn(grid, rng) {
        const row = Math.floor(rng() * grid.length);
        return { caveIn: { row } };
      } },
    { id: "gas_vent", weight: 50, durationTurns: 3,
      spawn(grid, rng) {
        const row = Math.floor(rng() * (grid.length - 1));
        const col = Math.floor(rng() * (grid[0].length - 1));
        return { gasVent: { row, col, turnsRemaining: 3 } };
      } },
  ];

  function hazardsActive(state) {
    const h = state.hazards ?? {};
    return (h.caveIn ? 1 : 0) + (h.gasVent ? 1 : 0);
  }

  export function rollHazard(state, rng = Math.random) {
    if (state.biome !== "mine") return null;
    if (state.boss) return null;
    if (hazardsActive(state) > 0) return null;
    let rate = HAZARD_BASE_RATE;
    const reduce = state._workerEffects?.hazardSpawnReduce ?? {};
    // Apply per-hazard reduction by rolling type first, then re-checking.
    if (rng() >= rate) return null;
    const total = HAZARDS.reduce((a, h) => a + h.weight, 0);
    let r = rng() * total, picked = HAZARDS[0];
    for (const h of HAZARDS) { r -= h.weight; if (r <= 0) { picked = h; break; } }
    if (picked.id === "gas_vent" && reduce.gas_vent) {
      if (rng() < reduce.gas_vent) return null; // suppressed by canary
    }
    return { id: picked.id, ...picked.spawn(state.grid, rng) };
  }

  export function tileBlockedByHazard(tile) {
    return !!(tile && tile.rubble);
  }

  export function tickHazards(state) {
    if (!state.hazards?.gasVent) return state;
    const v = state.hazards.gasVent;
    if (v.turnsRemaining > 1) {
      return { ...state,
        hazards: { ...state.hazards,
          gasVent: { ...v, turnsRemaining: v.turnsRemaining - 1 } } };
    }
    return { ...state,
      hazards: { ...state.hazards, gasVent: null },
      turnsUsed: (state.turnsUsed ?? 0) + 1,
      _hazardFloater: "You cough through it." };
  }

  export function clearCaveIn(state, chain) {
    if (!state.hazards?.caveIn) return state;
    const targetRow = state.hazards.caveIn.row;
    const stoneCount = chain.filter(t => t.key === "stone").length;
    const nearRow = chain.some(t => Math.abs(t.row - targetRow) === 1);
    if (stoneCount < 3 || !nearRow) return state;
    return { ...state, hazards: { ...state.hazards, caveIn: null } };
  }
  ```
- `src/state.js` — `createInitialState()` adds
  `hazards: { caveIn: null, gasVent: null }`.
- `src/features/apprentices/aggregate.js` — extend the aggregator output to
  include `hazardSpawnReduce: { gas_vent: number }` (computed from the
  Canary `hazardSpawnReduce` effect — see 9.4).
- `src/GameScene.js`:
  - `fillBoard()` — `const haz = rollHazard(state, rng); if (haz) applyHazardToGrid(grid, haz);`
  - `tryAddToChain(tile)` — early-return if `tileBlockedByHazard(tile)`.
  - `commitChain(chain)` — `state = clearCaveIn(state, chain)`; if any chain
    tile is inside the gas vent 2×2, clear `state.hazards.gasVent`.
  - `advanceTurn()` — `state = tickHazards(state)`; if `_hazardFloater` is set,
    show it and clear the field.
  - `closeSeason()` — leave un-cleared cave-in rubble in place for the rest
    of the mine session (only fully clears on `SET_BIOME` or new mine session).

**Manual Verify Walk-through:**
1. Force `gameState.biome = "mine"; gameState.hazards.caveIn = { row: 3 }`.
   Confirm row 3 paints with the rubble overlay and tiles refuse selection.
2. Drag a 4-stone chain in row 2. Confirm rubble row clears, dust VFX,
   row 3 refills on collapse.
3. Force `gameState.hazards.gasVent = { row: 1, col: 2, turnsRemaining: 3 }`.
   Confirm yellow-green glow on the 2×2 at (1,2)–(2,3) with a "⏱ 3" badge.
4. Advance 1 turn without chaining the vent. Badge reads "⏱ 2". Advance 2
   more. Confirm `turnsUsed += 1` extra and floater "You cough through it."
5. Re-spawn the vent. Chain a tile inside the 2×2. Confirm vent clears with
   no lost turn.
6. Confirm hazards never spawn while `gameState.boss` is non-null.
7. Force `gameState.biome = "farm"`. Run `fillBoard()` 100×. Confirm
   `gameState.hazards.caveIn` and `.gasVent` stay null.
8. Hire 2 canaries. Run 1000 mine fillBoards via console. Confirm gas-vent
   spawn count is roughly half what it was in the no-canary baseline run.
9. Save → refresh mid-vent. Confirm `turnsRemaining` and position survive.
10. `runSelfTests()` passes all 9.3 assertions.

---

### 9.4 — Mine workers (canary, geologist) — deferred catalog from Phase 4

**What this delivers:** The Phase 4 `WORKERS` array gets two new mine-only
entries — `canary` (hazard-suppression) and `geologist` (pool-weight tilt
toward ore + gem). Both honour the **locked Phase 4 max-effect model**: the
listed `effect` is what you get at *full hire*, and per-hire is computed as
`effect ÷ maxCount`. The Phase 4 aggregator picks them up unchanged via the
existing `computeWorkerEffects(state)` pipeline; the Phase 4.5 housing cap
gates total hires across Farm and Mine workers (no separate Mine housing).

**Completion Criteria:**
- [ ] `WORKERS` array in `src/features/apprentices/data.js` extended by 2 entries
- [ ] Canary entry: `{ id: "canary", name: "Canary", role: "Hazard Spotter",
  maxCount: 2, effect: { hazardSpawnReduce: { gas_vent: 0.5 } },
  hireCost: { worker: 1, coke: 4, bread: 6 }, wage: 18,
  requirement: { biomeUnlocked: "mine" } }`
- [ ] Geologist entry: `{ id: "geologist", name: "Geologist", role: "Surveyor",
  maxCount: 2, effect: { poolWeight: { ore: 1, gem: 1 } },
  hireCost: { worker: 1, ingot: 6, bread: 6 }, wage: 30,
  requirement: { biomeUnlocked: "mine" } }`
- [ ] All 6 required Phase 4 fields present on each entry: `id, name, role,
  maxCount, effect, hireCost, wage` (+ `requirement` from Phase 4.6)
- [ ] Each new worker has a portrait registered in `src/textures.js` and a
  hire-card row in the Apprentices panel under a "Mine" tab
- [ ] Canary effect math: 2 hires (max) → `hazardSpawnReduce.gas_vent = 0.5`;
  1 hire → `0.25` (max ÷ maxCount = 0.5 ÷ 2 = 0.25)
- [ ] Geologist effect math: per-hire = `1 ÷ 2 = 0.5` per resource. Phase 4's
  rule is **floor to integer for pool_weight** (pool weights are integer
  spawn-bag counts). 2 hires → `ore +1, gem +1`. 1 hire → `ore +0, gem +0`
  (floored). Document this floor explicitly in code + tests.
- [ ] `computeWorkerEffects(state)` aggregates these effects into the same
  three registry channels Phase 4 emits: `effectiveThresholds`,
  `effectivePoolWeights`, `bonusYields` — plus the new `hazardSpawnReduce`
  channel from 9.3
- [ ] Phase 4.5 housing cap applies — `totalHired = sum(state.workers.hired)`
  cannot exceed `1 + state.buildings.housing.count`; hiring a canary while
  at cap returns "Build housing first." floater
- [ ] Wages debit on `CLOSE_SEASON` against the same coin pool — canary 18◉,
  geologist 30◉ — adding to `state.workers.debt` if underfunded
- [ ] Canary + Geologist are listed only when `state.story.flags.mine_unlocked === true`
- [ ] Save/load preserves canary + geologist hire counts

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { WORKERS, WORKER_MAP } from "./features/apprentices/data.js";
import { computeWorkerEffects } from "./features/apprentices/aggregate.js";
import { createInitialState } from "./state.js";

// Both new entries exist with all 6 required fields + requirement
for (const id of ["canary", "geologist"]) {
  const w = WORKER_MAP[id];
  assert(w, `${id} registered in WORKERS`);
  for (const k of ["id", "name", "role", "maxCount", "effect", "hireCost", "wage"]) {
    assert(w[k] !== undefined, `${id}.${k} present`);
  }
  assert(w.requirement?.biomeUnlocked === "mine",
         `${id} requires mine biome unlocked`);
}

// Canary shape + max-effect locked
const can = WORKER_MAP.canary;
assert(can.maxCount === 2, "canary maxCount = 2");
assert(can.effect.hazardSpawnReduce.gas_vent === 0.5,
       "canary full effect = -50% gas vent (locked at the max-hire value)");
assert(can.wage === 18, "canary wage = 18◉");
assert(can.hireCost.coke === 4 && can.hireCost.bread === 6,
       "canary cost: 1 worker + 4 coke + 6 bread");

// Geologist shape
const geo = WORKER_MAP.geologist;
assert(geo.maxCount === 2, "geologist maxCount = 2");
assert(geo.effect.poolWeight.ore === 1 && geo.effect.poolWeight.gem === 1,
       "geologist full effect = ore+1, gem+1");
assert(geo.wage === 30, "geologist wage = 30◉");
assert(geo.hireCost.ingot === 6 && geo.hireCost.bread === 6,
       "geologist cost: 1 worker + 6 ingot + 6 bread");

// Per-hire = max ÷ maxCount (locked Phase 4 rule)
// Canary: continuous (rate reductions stack as decimals)
let s = createInitialState();
s.workers = { hired: { canary: 0 }, debt: 0 };
assert((computeWorkerEffects(s).hazardSpawnReduce?.gas_vent ?? 0) === 0,
       "0 canary = 0 reduction");
s.workers.hired.canary = 1;
assert(computeWorkerEffects(s).hazardSpawnReduce.gas_vent === 0.25,
       "1 canary = -25% (0.5 ÷ 2)");
s.workers.hired.canary = 2;
assert(computeWorkerEffects(s).hazardSpawnReduce.gas_vent === 0.5,
       "2 canary = -50% (full)");

// Geologist: integer floor on pool_weight (locked Phase 4 rule for integer fields)
s = createInitialState();
s.workers = { hired: { geologist: 1 }, debt: 0 };
const e1 = computeWorkerEffects(s);
assert((e1.effectivePoolWeights?.ore ?? 0) === 0,
       "1 geologist floors to +0 ore (0.5 → 0 by integer floor)");
s.workers.hired.geologist = 2;
const e2 = computeWorkerEffects(s);
assert(e2.effectivePoolWeights.ore === 1 && e2.effectivePoolWeights.gem === 1,
       "2 geologist (max) = ore +1, gem +1");

// Defensive: hires beyond maxCount clamped (Phase 4 locked behaviour)
s.workers.hired.canary = 5;
assert(computeWorkerEffects(s).hazardSpawnReduce.gas_vent === 0.5,
       "5 canary clamps to 2 (maxCount), still -50% — never -125%");

// Housing cap shared across farm + mine
let h = createInitialState();
h.buildings = { ...h.buildings, housing: { count: 1 } };
h.workers = { hired: { hilda: 1, canary: 1 }, debt: 0 };
const total = Object.values(h.workers.hired).reduce((a, n) => a + n, 0);
const cap = 1 + (h.buildings.housing.count ?? 0);
assert(total <= cap, "2 hires within (1 + 1 housing) cap = 2");
// One more should reject in the hire reducer (tested via reduce() — see Phase 4.5)

// Aggregator wires hazardSpawnReduce + poolWeight unchanged
s = createInitialState();
s.workers = { hired: { canary: 2, geologist: 2, hilda: 0 }, debt: 0 };
const merged = computeWorkerEffects(s);
assert(merged.hazardSpawnReduce.gas_vent === 0.5,
       "merged: canary effect intact");
assert(merged.effectivePoolWeights.ore === 1
    && merged.effectivePoolWeights.gem === 1,
       "merged: geologist pool tilt intact");
```
Run — confirm: `WORKER_MAP.canary is undefined`.

*Gameplay simulation (player at level 10, third mine-heavy session, 1 housing built):*
The player has built one Housing extension (cap = 2 hires). They've been
cursing the gas vents — three sessions in a row a vent stole the next turn.
They open the Apprentices panel; the new "Mine" tab shows two greyed cards
during their first session, but unlocks the moment `mine_unlocked` flips.
Today: Canary card lit up. Cost: 1 Worker + 4 Coke + 6 Bread. They have
exactly that. Hire — Canary's portrait slides in. Two sessions later they
hire a Geologist (1 Worker + 6 Ingot + 6 Bread). Now: gas-vent rate visibly
halved (one vent in a 6-mine-session stretch instead of three), and the
spawn pool has a noticeable ore-and-gem tilt — `+1` ore tile and `+1` gem
tile pop in the spawn bag. Wages on close-season: `18 + 30 = 48◉` debited.
A new floater on the season summary: "Workers paid: 48◉." If they had only
38◉ in the pot, the modal would read "Workers paid: 38◉ (10 in debt)."

Designer reflection: *Does the 2-canary-cap feel right — is the 50% hazard
suppression a meaningful but not trivialising payoff for 36 wage per
season? Should the geologist's `+1` to two pool slots feel more like "the
mine is finding richer veins" or just like a nudge that vanishes into
noise? Does shared housing across biomes cause friction (player wants 3
Hildas AND 2 canaries but housing only buys 4 slots total)?*

**Implementation:**
- `src/features/apprentices/data.js` — append to `WORKERS`:
  ```js
  // Phase 9 — Mine workers. Locked rule: max-effect model from Phase 4.
  // Per-hire = effect ÷ maxCount. Pool-weight effects floor to integer.
  { id: "canary", name: "Canary", role: "Hazard Spotter", maxCount: 2,
    effect: { hazardSpawnReduce: { gas_vent: 0.5 } },
    hireCost: { worker: 1, coke: 4, bread: 6 },
    wage: 18,
    requirement: { biomeUnlocked: "mine" } },
  { id: "geologist", name: "Geologist", role: "Surveyor", maxCount: 2,
    effect: { poolWeight: { ore: 1, gem: 1 } },
    hireCost: { worker: 1, ingot: 6, bread: 6 },
    wage: 30,
    requirement: { biomeUnlocked: "mine" } },
  ```
- `src/features/apprentices/aggregate.js` — extend the existing aggregator:
  ```js
  // Phase 4 max-effect model: per-hire = max ÷ maxCount, hires clamped to maxCount.
  // hazardSpawnReduce: continuous decimal — sum, then clamp at 1.0.
  // poolWeight: integer field — floor per-hire contribution before adding.
  for (const w of WORKERS) {
    const hired = Math.min(state.workers.hired[w.id] ?? 0, w.maxCount);
    if (!hired) continue;
    if (w.effect.hazardSpawnReduce) {
      for (const [k, v] of Object.entries(w.effect.hazardSpawnReduce)) {
        const perHire = v / w.maxCount;
        out.hazardSpawnReduce[k] = Math.min(1.0,
          (out.hazardSpawnReduce[k] ?? 0) + perHire * hired);
      }
    }
    if (w.effect.poolWeight) {
      for (const [k, v] of Object.entries(w.effect.poolWeight)) {
        const perHire = v / w.maxCount;
        out.effectivePoolWeights[k] =
          (out.effectivePoolWeights[k] ?? 0) + Math.floor(perHire * hired);
      }
    }
  }
  ```
- `src/GameScene.js`:
  - Apprentices panel — render a "Mine" tab when `state.story.flags.mine_unlocked`.
    Greyed cards otherwise (matches the Phase 4.6 requirement-gating pattern).
  - `closeSeason()` wage debit unchanged — the existing Phase 4 wage loop
    iterates `WORKERS` so canary/geologist are picked up automatically.
  - `tryHire(workerId)` — existing housing-cap check from Phase 4.5
    continues to compare `Object.values(hired).sum()` against
    `1 + housing.count`. No change needed; canary/geologist count toward
    the same cap.
- `src/textures.js` — register `portrait.canary` (small yellow bird, 96×96)
  and `portrait.geologist` (bearded surveyor with hat, 96×96).

**Manual Verify Walk-through:**
1. New game. Apprentices panel — confirm no "Mine" tab while
   `gameState.story.flags.mine_unlocked` is falsy.
2. Force `gameState.story.flags.mine_unlocked = true`. Re-open panel — Mine
   tab visible with Canary + Geologist cards.
3. Hire 1 Canary. Confirm `gameState.workers.hired.canary === 1` and
   `computeWorkerEffects(state).hazardSpawnReduce.gas_vent === 0.25`.
4. Hire a 2nd Canary. Confirm reduction goes to `0.5`.
5. Hire 1 Geologist. Confirm `effectivePoolWeights.ore === 0` (floor of 0.5).
6. Hire 2nd Geologist. Confirm `ore === 1, gem === 1`.
7. Close season with 0 coins. Confirm `gameState.workers.debt === 48` (18+30).
8. Force housing cap = 2 with 2 Hildas already hired. Try to hire a Canary.
   Confirm rejection floater "Build housing first."
9. Save → refresh. Confirm canary + geologist hire counts and wages persist.
10. `runSelfTests()` passes all 9.4 assertions.

---

### 9.5 — Lava hazard + Water Pump tool counter

**What this delivers:** The §7 Lava hazard the spec promised. On Mine biome,
when the hazard roll lands on `lava` (replacing the cave-in / gas-vent coin
flip with a 3-way roll: 40 cave_in / 40 gas_vent / 20 lava), one cell is
seeded with a glowing red lava tile. Each turn, lava spreads to one random
orthogonally-adjacent cell — destroying any resource that was in that cell
*before* spawn (no inventory credit). The counter is the **Water Pump**, a
new Workshop-craftable tool that converts every lava tile on the board to
rubble in one tap (no turn cost).

**Completion Criteria:**
- [ ] `HAZARDS` (from 9.3) extended with a third entry `lava`; pool weights
  update to `cave_in: 40`, `gas_vent: 40`, `lava: 20`. Per-fillBoard 5%
  hazard roll unchanged; one active hazard cap unchanged.
- [ ] `state.hazards.lava` shape:
  `{ cells: [{row, col}, ...], turnsToSpread } | null`. `turnsToSpread`
  resets to 1 each turn; on tick = 0 the hazard spreads to a random
  orthogonally-adjacent free cell.
- [ ] Spread destroys whatever was in the target cell (no resource credit).
  When no adjacent free cells exist, lava stops spreading (still active,
  still blocks chains).
- [ ] `tileBlockedByHazard(tile)` returns `true` for any lava cell.
- [ ] New tool `water_pump` registered in the Workshop catalog:
  `{ inputs: { plank: 1, stone: 1 }, station: "workshop" }`.
  `USE_TOOL water_pump` clears every lava cell from
  `state.hazards.lava.cells` (sets to empty array; if empty, sets
  `state.hazards.lava = null`), converts each cleared cell to a rubble
  cell that joins the cave-in clear rule, and respects the locked
  no-turn-cost contract.
- [ ] Lava NEVER spawns in Farm; never spawns when a boss is active;
  never co-spawns with cave-in or gas vent (single-active cap unchanged).
- [ ] Phase 4 worker effect `hazardSpawnReduce.lava` honours the canary
  pattern but is NOT auto-granted by Canary (Canary stays gas-only).
  No worker reduces lava in Phase 9; spec extension reserved for Phase 10+.
- [ ] `src/textures.js` registers `hazard.lava` (pulsing red-orange,
  74×74) and `tool.water_pump` (48×48).
- [ ] Save/load round-trips `state.hazards.lava` exactly (cell list,
  turnsToSpread).

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { HAZARDS, rollHazard, tickHazards }
  from "./features/mine/hazards.js";
import { createInitialState, rootReducer } from "./state.js";

// Catalog
assert(HAZARDS.length === 3, "exactly 3 hazards now: cave_in, gas_vent, lava");
const lava = HAZARDS.find(h => h.id === "lava");
assert(lava && lava.weight === 20, "lava weight = 20");

// Lava spawns only in Mine
const farmState = { ...createInitialState(), biome: "farm" };
const r = rollHazard(farmState, () => 0.01);
assert(r === null, "no hazard spawn in Farm even at lowest roll");

// Spread tick
const s0 = { ...createInitialState(), biome: "mine",
             hazards: { caveIn: null, gasVent: null,
                        lava: { cells: [{row: 2, col: 2}], turnsToSpread: 1 } } };
const s1 = tickHazards(s0, () => 0.0);  // deterministic spread
assert(s1.hazards.lava.cells.length === 2, "lava spreads to 1 new cell");

// Water Pump clears lava
const s2 = { ...s1, tools: { water_pump: 1 } };
const s3 = rootReducer(s2, { type: "USE_TOOL", payload: { id: "water_pump" } });
assert(s3.hazards.lava === null, "water pump clears lava entirely");
assert(s3.tools.water_pump === 0, "water pump consumed");
assert(s3.turnsUsed === s2.turnsUsed, "no turn cost");

// Lava cell blocks chain
import { tileBlockedByHazard } from "./features/mine/hazards.js";
assert(tileBlockedByHazard({ lava: true }) === true, "lava cell blocked");
```

*Gameplay simulation (mid-Mine session, no Water Pump yet):* The player
opens a mine session. On turn 3 the board ripples and a single red glowing
tile appears at row 2 col 4 — the floater reads "Lava bubbles up". Turn 4:
the lava expands to col 5, eating a coal tile that was sitting there (no
inventory credit, just gone). Turn 5: it spreads again. The player
realises the chain they were planning across that row is now impossible.
They tap Workshop in town next session, craft a Water Pump (1 plank +
1 stone), come back, tap the pump on a fresh lava field — every lava cell
flashes white and converts to rubble. Now they need a 3-stone chain
adjacent to clear the rubble. Two-step puzzle, two tools deep.

Designer reflection: *Does losing a coal tile to lava feel like a real
sting that teaches the player "deal with it now," or does it feel
arbitrary? Does the Water Pump → rubble conversion (instead of full clear)
feel like a fair trade or like a slap?*

**Implementation:**

- `src/features/mine/hazards.js` — extend `HAZARDS`; add `spreadLava`
  helper; update `tickHazards` and `tileBlockedByHazard`.
- `src/features/tools/data.js` — register `water_pump`.
- `src/features/tools/use.js` — `USE_TOOL water_pump` handler.
- `src/state.js` — `createInitialState()` adds
  `state.hazards.lava: null`.
- `src/textures.js` — register `hazard.lava` (subtle 4-frame pulse) and
  `tool.water_pump`.

**Manual Verify Walk-through:**
1. Force `gameState.hazards.lava = { cells: [{row:2,col:2}], turnsToSpread: 1 }`
   in a mine session. Confirm red glow at (2,2), chains routed through it
   refuse with a "blocked by lava" floater.
2. Take 1 turn. Confirm lava cell count = 2, the new cell is orthogonally
   adjacent to (2,2).
3. Take another turn. Confirm cell count = 3 (or stops if surrounded).
4. Craft Water Pump in Workshop (1 plank + 1 stone). Confirm
   `gameState.tools.water_pump === 1`.
5. Tap Water Pump on the board. Confirm all lava cells convert to rubble,
   `state.hazards.lava === null`, `turnsUsed` unchanged.
6. Save → refresh mid-spread. Confirm `cells` array and `turnsToSpread`
   restored exactly.
7. Switch to Farm biome. Force a hazard roll. Confirm no hazard spawns
   (Farm-blocked, as before).
8. `runSelfTests()` passes all 9.5 assertions.

---

### 9.6 — Moles hazard + Explosives tool counter

**What this delivers:** The §7 Moles hazard. Adds a fourth hazard entry
(weight 15 — pulled from cave-in's 40 down to 25 to keep total at 100).
A Mole appears on a single cell with a small dirt mound icon and a
3-turn timer. Each turn, the Mole consumes one orthogonally-adjacent
non-rubble tile (resource is lost, no credit). At timer = 0, the Mole
moves to a random adjacent cell and the timer resets. Counter is the
**Explosives** tool — Workshop-craftable, removes every Mole on the board
plus converts any rubble cell to an empty cell ready for refill.

**Completion Criteria:**
- [ ] `HAZARDS` extended with `mole`; pool weights updated to
  `cave_in: 25`, `gas_vent: 40`, `lava: 20`, `mole: 15`.
- [ ] `state.hazards.mole` shape:
  `{ row, col, turnsRemaining } | null`. Each `tickHazards` call
  decrements `turnsRemaining`; consumes one adjacent tile per tick.
- [ ] On `turnsRemaining === 0`, the mole hops to a random adjacent
  free cell (re-rolling if no free cells; if fully boxed, stays put
  and the timer re-arms at 3).
- [ ] Mole-consumed tiles are flagged `consumed: true` and refill on
  the next collapse pass (no inventory credit).
- [ ] New tool `explosives` registered in the Workshop catalog:
  `{ inputs: { hay: 1, dirt: 1 }, station: "workshop" }`.
  `USE_TOOL explosives` clears `state.hazards.mole = null` AND clears
  `state.hazards.caveIn = null` (rubble row freed); respects
  no-turn-cost contract.
- [ ] Mole NEVER spawns in Farm; never spawns when a boss is active;
  honours single-active hazard cap.
- [ ] `src/textures.js` registers `hazard.mole` (small brown mound,
  74×74) and `tool.explosives` (48×48).
- [ ] Save/load round-trips `state.hazards.mole`.

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { HAZARDS, tickHazards }
  from "./features/mine/hazards.js";
import { createInitialState, rootReducer } from "./state.js";

// Catalog
assert(HAZARDS.length === 4, "4 hazards: cave_in, gas_vent, lava, mole");
assert(HAZARDS.find(h => h.id === "mole").weight === 15, "mole weight = 15");

// Tile consumption per tick
const s0 = { ...createInitialState(), biome: "mine",
             hazards: { caveIn: null, gasVent: null, lava: null,
                        mole: { row: 1, col: 1, turnsRemaining: 3 } } };
const s1 = tickHazards(s0, () => 0.0);
assert(s1.hazards.mole.turnsRemaining === 2, "timer decrements");
// One adjacent tile flagged consumed (deterministic via rng=0)
const consumedCells = s1.grid.flat().filter(t => t.consumed).length;
assert(consumedCells === 1, "exactly 1 adjacent tile consumed per tick");

// Hop on timer-zero
const s2 = { ...s0, hazards: { ...s0.hazards,
             mole: { row: 1, col: 1, turnsRemaining: 0 } } };
const s3 = tickHazards(s2, () => 0.5);
assert(s3.hazards.mole.row !== 1 || s3.hazards.mole.col !== 1,
       "mole hops on timer expiry");
assert(s3.hazards.mole.turnsRemaining === 3, "timer re-arms");

// Explosives clears mole + cave-in
const s4 = { ...s0, tools: { explosives: 1 },
             hazards: { ...s0.hazards, caveIn: { row: 4 } } };
const s5 = rootReducer(s4, { type: "USE_TOOL", payload: { id: "explosives" } });
assert(s5.hazards.mole === null, "explosives clears mole");
assert(s5.hazards.caveIn === null, "explosives also clears cave-in");
assert(s5.tools.explosives === 0, "explosives consumed");
assert(s5.turnsUsed === s4.turnsUsed, "no turn cost");
```

*Gameplay simulation (mine session, mid-game):* The player commits a chain
and a brown dirt-mound tile appears with a "3" badge. Turn after, a coal
tile next to it has vanished — the floater reads "A mole stole your
coal!". The player has no Explosives crafted. Two more turns: the mole
eats two more tiles. They tab to the Workshop, craft Explosives (1 hay
+ 1 dirt), come back, tap it. A small puff animation; mole gone, board
clean. Next session they craft two extras to keep on hand.

Designer reflection: *Are 3-turn moles a tense puzzle or just an
attrition tax? Should Explosives also collect rubble *as* resources, or
is "convert to empty" the right cost?*

**Implementation:**

- `src/features/mine/hazards.js` — extend `HAZARDS`; add `consumeAdjacent`
  and `hopMole` helpers; thread into `tickHazards`.
- `src/features/tools/data.js` — register `explosives`.
- `src/features/tools/use.js` — `USE_TOOL explosives` handler.
- `src/state.js` — `createInitialState()` adds `state.hazards.mole: null`.
- `src/textures.js` — register `hazard.mole` and `tool.explosives`.

**Manual Verify Walk-through:**
1. Force `gameState.hazards.mole = { row: 2, col: 3, turnsRemaining: 3 }`.
   Confirm dirt-mound tile rendered at (2,3) with timer "3".
2. Take 1 turn. Confirm timer "2", an adjacent tile is flagged consumed
   and re-fills on next collapse with no inventory credit.
3. Two more turns. Mole hops to a new adjacent cell, timer re-arms to "3".
4. Craft Explosives (1 hay + 1 dirt). Tap on board. Confirm mole + any
   active rubble cleared, `gameState.turnsUsed` unchanged.
5. Save → refresh mid-mole-active. Confirm row/col/timer restored exactly.
6. Switch to Farm biome. Force hazard roll repeatedly — confirm no mole
   ever spawns (Farm-blocked).
7. `runSelfTests()` passes all 9.6 assertions.

---

## Phase 9 Sign-off Gate

Play 3 mine-focused playthroughs from a fresh save covering: a *first-entry*
session (act3_mine_opened just fired, no workers), a *hazard-stress* session
(force 6 hazard rolls in a row via console, observe behaviour), and a
*long-mine* session (hire both mine workers, run 4 mine sessions back-to-back
to observe wage burn and gem-tilt). Before moving to Phase 10, confirm all:

- [ ] 9.1 Completion Criteria all checked
- [ ] 9.2 Completion Criteria all checked
- [ ] 9.3 Completion Criteria all checked
- [ ] 9.4 Completion Criteria all checked
- [ ] 9.5 Completion Criteria all checked (lava + Water Pump)
- [ ] 9.6 Completion Criteria all checked (mole + Explosives)
- [ ] **All 4 spec hazards (cave-in, gas vent, lava, mole) can spawn in Mine
  and never in Farm** — verified by 1000-roll harness in both biomes
- [ ] **Water Pump converts every lava cell to rubble in one tap with no
  turn cost; Explosives clears mole + any active cave-in in one tap with
  no turn cost** — both tools honour the locked tool contract
- [ ] **After the `act3_mine_opened` story beat fires, the player can switch
  to the Mine biome via the Town nav at season boundary and see a stone /
  ore / coal / dirt board with the cool-grey palette** — verified on a fresh
  save through the real Phase 2 + Phase 3 entry path
- [ ] **A Mysterious Ore on the board with a 5-turn countdown — chained with
  ≥ 2 dirt tiles — yields exactly 1 Rune** in `state.runes`; expiring at 0
  with no chain leaves runes unchanged and degrades the tile to plain Dirt
- [ ] **A cave-in row blocks tile chains in those positions; clearing it
  requires chaining 3+ stone tiles in an orthogonally adjacent row** — a
  3-stone chain in row 0 does NOT clear a row-3 cave-in; a 3-stone chain
  in row 2 or row 4 does
- [ ] **Hiring 2 Canary halves the gas-vent spawn rate vs. a fresh save with
  no canary** — over a 1000-fillBoard sample, no-canary mine sessions
  show ~25 vents and 2-canary sessions show ~12-13 (within sample noise)
- [ ] **Mine workers obey the same Phase 4.5 housing cap as farm workers
  (1 + housing built)** — the hire reducer rejects the 5th hire across the
  union of farm + mine worker counts with the "Build housing first." floater
- [ ] **Hazards never spawn in Farm biome and never spawn while a boss is
  active** — verified by 1000-roll harness in both biome states
- [ ] Save / reload at every mid-mine moment (mid-countdown, rubble row
  unresolved, gas vent ticking) restores `state.mysteriousOre`,
  `state.hazards`, and `state.biome` exactly
- [ ] `runSelfTests()` passes for all Phase 9 tests

*Designer gut-check: Does the Mine feel like a different game from the Farm —
darker, riskier, more rewarding — or just a reskinned board with the same
chain math under cooler textures? When you sit down for a session, do you
choose Farm vs. Mine because the pace is different, or because the inventory
shopping list says so?*
