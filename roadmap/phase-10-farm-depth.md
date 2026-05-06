# Phase 10 — Farm Depth

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Farm sessions get richer mid-late game. Three
new Workshop tools add tactical depth — Rake clears every hay tile in one tap,
Axe levels every log, Fertilizer turns the next refill into all grain. Each
season subtly retunes the tile pool — spring spawns more berries, autumn
more logs, winter freezes the hay out — so the rhythm of a year stops feeling
identical. And rats now creep onto abundance-stocked Farm boards, eating
plants until the player chains 3+ of them to clear them.

**Why now:** Phase 9 added the Mine; Phase 10 brings the Farm back to parity.
Farm-first is the locked priority order, so polishing the Farm before deepening
the Mine matches the stated rule. Without these additions the Farm reaches
"fine" but never "delightful" — every season looks the same, the Workshop has
only three Phase 1 tools, the Forge has only two metalwork recipes, and §6's
Rats hazard exists only on paper. Phase 10 closes those four gaps in one slice.

**Entry check:** [Phase 9 Sign-off Gate](./phase-9-mine.md#phase-9-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 10.1 — Priority Farm tools (Rake, Axe, Fertilizer)

**What this delivers:** Three new Workshop-craftable tools, each honouring the
**locked Phase 1 tool contract** (no turn cost, animates on the board, never
bypasses the chain pipeline). Rake sweeps a 300ms arc and collects every hay
tile. Axe staggers chop bursts on each log tile and collects them. Fertilizer
flips a single-fill flag — the next collapse refill spawns all grain. Picked
from §5 with intent: hay-clearer, log-clearer, fill-bias. Cat is acknowledged
but deferred — Phase 10.4 ships the chain-3-rats counter as the in-this-phase
rat removal path.

**Completion Criteria:**
- [ ] `state.tools.rake`, `.axe`, `.fertilizer` exist on `createInitialState()`,
  default `0`, integer
- [ ] `RECIPES.tools` registers all three at the Workshop with the locked
  inputs: `rake: { plank: 1 }`, `axe: { stone: 1 }`, `fertilizer: { hay: 1, dirt: 1 }`
  (§5 says "1 Wood" for Rake — impl uses `plank` because §6 names the
  wood-tier resource "log" and the upgrade "plank"; documented in code)
- [ ] `CRAFT_TOOL { id }` — Workshop guard, input deduction, `tools[id] += 1`;
  rejects with "Not enough resources" / "Need a Workshop" floater on failure
- [ ] `USE_TOOL { key }` — for rake/axe: decrement counter, set
  `state._toolPending = key`. For fertilizer: decrement, set
  `state.fertilizerActive = true`. **Locked: never increments `state.turnsUsed`**
- [ ] `applyToolPending(state)` (pure) — rake collects every `hay` tile into
  inventory, axe every `log`, leaving cells empty for collapse
- [ ] `fillBoard()` — if `state.fertilizerActive`, every spawned tile is grain;
  flag clears after the fill
- [ ] All three tools skip hazard-locked tiles (rubble, gas, rats)
- [ ] Workshop UI renders three craft buttons, greyed when inputs insufficient
- [ ] Tools share the Phase 1 tool tray (one-tap-to-arm, tap-board-to-fire)
- [ ] `src/textures.js` registers `tool.rake`, `tool.axe`, `tool.fertilizer`
  (64×64 procedural)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { createInitialState, reduce } from "./state.js";
import { RECIPES } from "./constants.js";
import { applyToolPending } from "./features/farm/tools.js";

// Recipes registered with locked inputs
assert(RECIPES.tools, "RECIPES.tools table exists");
assert(RECIPES.tools.rake.inputs.plank === 1, "rake costs 1 plank");
assert(RECIPES.tools.axe.inputs.stone === 1, "axe costs 1 stone");
assert(RECIPES.tools.fertilizer.inputs.hay === 1
    && RECIPES.tools.fertilizer.inputs.dirt === 1,
       "fertilizer costs 1 hay + 1 dirt");
assert(RECIPES.tools.rake.station === "workshop", "rake crafted at workshop");

// Initial state — counters present and zero
let s = createInitialState();
assert(s.tools.rake === 0, "rake starts at 0");
assert(s.tools.axe === 0, "axe starts at 0");
assert(s.tools.fertilizer === 0, "fertilizer starts at 0");

// CRAFT_TOOL deducts inputs, requires workshop
s.buildings = { ...s.buildings, workshop: { built: true } };
s.inventory.plank = 2;
s = reduce(s, { type: "CRAFT_TOOL", id: "rake" });
assert(s.tools.rake === 1, "craft rake → tools.rake = 1");
assert(s.inventory.plank === 1, "rake debited 1 plank");

// Without workshop or without inputs: no-op
let nw = createInitialState(); nw.inventory.plank = 5;
const beforeNW = JSON.stringify(nw);
assert(JSON.stringify(reduce(nw, { type: "CRAFT_TOOL", id: "rake" })) === beforeNW,
       "no workshop = no craft");
let poor = createInitialState();
poor.buildings = { ...poor.buildings, workshop: { built: true } };
assert(reduce(poor, { type: "CRAFT_TOOL", id: "rake" }).tools.rake === 0,
       "no plank = no rake");

// USE_TOOL — locked Phase 1 contract: no turn cost
let u = createInitialState();
u.tools.rake = 1; u.tools.fertilizer = 1; u.turnsUsed = 4;
u = reduce(u, { type: "USE_TOOL", key: "rake" });
assert(u.tools.rake === 0 && u._toolPending === "rake", "rake armed");
assert(u.turnsUsed === 4, "rake does NOT consume a turn");
u = reduce(u, { type: "USE_TOOL", key: "fertilizer" });
assert(u.fertilizerActive === true && u.tools.fertilizer === 0, "fertilizer flag set");
assert(u.turnsUsed === 4, "fertilizer does NOT consume a turn");

// applyToolPending — rake collects every hay tile, axe every log
let r1 = createInitialState();
r1.grid = [[{key:"hay"},{key:"log"},{key:"hay"}],
           [{key:"hay"},{key:"berry"},{key:"wheat"}]];
r1.inventory.hay = 0; r1._toolPending = "rake";
r1 = applyToolPending(r1);
assert(r1.inventory.hay === 3, "rake collected 3 hay");
assert(r1.grid.flat().every(t => t.key !== "hay"), "no hay remains");
assert(r1._toolPending === null, "pending cleared");

let a1 = createInitialState();
a1.grid = [[{key:"log"},{key:"hay"}],[{key:"log"},{key:"log"}]];
a1.inventory.log = 0; a1._toolPending = "axe";
a1 = applyToolPending(a1);
assert(a1.inventory.log === 3, "axe collected 3 log");

// Tools skip hazard-locked tiles (Phase 9 rubble)
let h = createInitialState();
h.grid = [[{key:"hay", rubble:true},{key:"hay"}]];
h.inventory.hay = 0; h._toolPending = "rake";
h = applyToolPending(h);
assert(h.inventory.hay === 1, "rake skipped rubble-locked hay");
```
Run — confirm: `Cannot find module './features/farm/tools.js'`.

*Gameplay simulation (player at level 6, mid-Farm session, 4 turns left):*
Player just hit the plank threshold (3 plank). They tap the Workshop card on
the Town nav. Three new craft buttons appear under the Phase 1 ones; only Rake
is tappable today (no stone, no dirt). They craft Rake — chime, plank ticks
3 → 2, Rake icon slides into the tool tray with a "1" badge. Back on the
board: five hay tiles, two berries, three logs, two wheat. They tap Rake to
arm, then tap any board cell. A 300ms sweep arc paints across; all five hay
tiles burst into golden floaters into inventory; cells empty and cascade. The
HUD turn counter has not moved — they've "free chained" five hay.

Designer reflection: *Does an instant-clear tool feel like a celebratory power
move, or does it feel like it skips the puzzle? Does Fertilizer's "next fill
is all grain" feel like setup-and-payoff (visible on the next collapse) or
like an invisible flag that fades from memory by the time it triggers?*

**Implementation:**
- `src/constants.js` — extend `RECIPES.tools`:
  ```js
  // Phase 10 — locked Phase 1 tool contract: no turn cost, board anim.
  // §5 lists "1 Wood" for Rake; impl uses `plank` because the §6 wood chain
  // names the base tile "log" and the first upgrade "plank" — plank is what
  // the player can actually hold at workshop-build time.
  RECIPES.tools = {
    rake:       { name: "Rake",       station: "workshop", inputs: { plank: 1 },
                  effect: "clear_all", target: "hay",   anim: "sweep",   ms: 300 },
    axe:        { name: "Axe",        station: "workshop", inputs: { stone: 1 },
                  effect: "clear_all", target: "log",   anim: "chops",   ms: 200 },
    fertilizer: { name: "Fertilizer", station: "workshop", inputs: { hay: 1, dirt: 1 },
                  effect: "fill_bias", target: "grain", anim: "shimmer", ms: 600 },
  };
  ```
- New file `src/features/farm/tools.js`:
  ```js
  // Phase 10 farm tools — pure logic. Animation lives in GameScene.
  // Locked rule: tools NEVER tick state.turnsUsed.
  export function applyToolPending(state) {
    const id = state._toolPending;
    if (!id) return state;
    if (id === "rake") return clearKey(state, "hay");
    if (id === "axe")  return clearKey(state, "log");
    return { ...state, _toolPending: null };
  }
  function clearKey(state, key) {
    let collected = 0;
    const grid = state.grid.map(row => row.map(t => {
      if (t.key === key && !t.rubble && !t.gas && !t.frozen) {
        collected += 1;
        return { ...t, key: null, _emptied: true };
      }
      return t;
    }));
    const inventory = { ...state.inventory,
      [key]: (state.inventory[key] ?? 0) + collected };
    return { ...state, grid, inventory, _toolPending: null };
  }
  ```
- `src/state.js` — `createInitialState()` adds `tools.rake/axe/fertilizer = 0`,
  `_toolPending: null`, `fertilizerActive: false`. Reducer `CRAFT_TOOL`:
  workshop guard + input deduction + `tools[id] += 1`. Reducer `USE_TOOL`:
  rake/axe → decrement, set `_toolPending`; fertilizer → decrement, set
  `fertilizerActive`. **Never touches `turnsUsed`**.
- `src/GameScene.js` — Workshop panel renders three craft buttons reading
  `RECIPES.tools`, greyed when workshop unbuilt or inputs insufficient. Tool
  tray reuses the Phase 1 component. `onToolUseTap(id)` dispatches `USE_TOOL`;
  on next board tap play the anim (rake: 300ms sweep; axe: per-log 200ms chop,
  60ms stagger) and call `applyToolPending(state)` before collapse. In
  `fillBoard()`, if `fertilizerActive`, override pool to `["grain"]`; clear
  flag after fill.
- `src/textures.js` — register `tool.rake`, `tool.axe`, `tool.fertilizer`
  (64×64 procedural).

**Manual Verify Walk-through:**
1. Force `workshop.built = true`; set `inventory.plank/stone/hay/dirt = 5`.
2. Open Workshop. Confirm three craft buttons render and are all tappable.
3. Craft Rake. Confirm `tools.rake === 1`, `plank: 5 → 4`, badge "1" in tray.
4. Tap Rake to arm, tap the board. Confirm 300ms sweep, all hay tiles vanish,
   `inventory.hay` jumps by the cleared count.
5. Confirm `turnsUsed` did **not** change.
6. Craft and use Axe. Confirm all log tiles collected; `turnsUsed` unchanged.
7. Craft and use Fertilizer. Confirm `fertilizerActive === true`. Trigger a
   refill via a chain; confirm new tiles are all grain, flag back to `false`.
8. Try to craft Rake with 0 plank. Confirm "Not enough resources." floater.
9. Without the Workshop built, confirm crafting is rejected.
10. `runSelfTests()` passes all 10.1 assertions.

---

### 10.2 — Tile pool tuning per season

**What this delivers:** A per-season layer on top of the §6 base Farm tile
pool so a spring board *looks* different from an autumn board, without
touching the four locked §6 season effects. Spring +1 berry, Summer +1 wheat
(pairing with the orders 2× modifier), Autumn +2 log, Winter +1 stone / −1
hay (frosted ground). Layers cleanly on top of Phase 4 worker `pool_weight`
and Phase 5 active-species filter. A new pure helper `getEffectivePool(state)`
is the single source of truth that `fillBoard()` consumes.

**Completion Criteria:**
- [ ] `SEASON_POOL_MODS` exported from `src/constants.js`:
  `{ Spring: { berry: +1 }, Summer: { wheat: +1 }, Autumn: { log: +2 },
     Winter: { stone: +1, hay: -1 } }`
- [ ] `getEffectivePool(state)` exported from `src/features/farm/pool.js` —
  pure, returns a flat array of length ≥ 9
- [ ] Layering order: base §6 pool → species filter (Phase 5) → worker
  `pool_weight` (Phase 4) → season modifier (Phase 10.2), additive
- [ ] Negative modifiers clamp at `1` per resource (winter never removes hay
  entirely)
- [ ] **Locked**: §6 season EFFECTS (harvest +20%, summer 2× coin, autumn 2×
  upgrades, winter min-chain-5) are NOT touched — separate constants
- [ ] **Locked**: Farm-only. Mine biome calls return mine pool unmodified
- [ ] `fillBoard()` consumes `getEffectivePool(state)` instead of reading
  `BIOMES[state.biome].pool` directly
- [ ] Phase 4 worker effects stack additively with the season modifier
- [ ] Save/load preserves `state.season`; the modifier derives from it

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { SEASON_POOL_MODS, BIOMES } from "./constants.js";
import { getEffectivePool } from "./features/farm/pool.js";
import { createInitialState } from "./state.js";

// Mod table shape — locked
assert(SEASON_POOL_MODS.Spring.berry === +1, "spring berry +1");
assert(SEASON_POOL_MODS.Summer.wheat === +1, "summer wheat +1");
assert(SEASON_POOL_MODS.Autumn.log   === +2, "autumn log +2");
assert(SEASON_POOL_MODS.Winter.stone === +1, "winter stone +1");
assert(SEASON_POOL_MODS.Winter.hay   === -1, "winter hay -1");

const base = BIOMES.farm.pool;
const cnt = (arr, k) => arr.filter(x => x === k).length;
const farmAt = (season) => {
  const s = createInitialState(); s.biome = "farm"; s.season = season;
  return getEffectivePool(s);
};

assert(cnt(farmAt("Spring"), "berry") === cnt(base, "berry") + 1, "spring +1 berry");
assert(cnt(farmAt("Spring"), "hay")   === cnt(base, "hay"),       "spring hay unchanged");
assert(cnt(farmAt("Summer"), "wheat") === cnt(base, "wheat") + 1, "summer +1 wheat");
assert(cnt(farmAt("Autumn"), "log")   === cnt(base, "log")   + 2, "autumn +2 log");
assert(cnt(farmAt("Winter"), "stone") === cnt(base, "stone") + 1, "winter +1 stone");
assert(cnt(farmAt("Winter"), "hay")   === Math.max(1, cnt(base, "hay") - 1),
       "winter -1 hay, clamped at min 1");
assert(farmAt("Winter").length >= 9, "pool never collapses below 9 entries");

// Worker pool_weight stacks additively (Phase 4 layering)
let w = createInitialState();
w.biome = "farm"; w.season = "Autumn";
w._workerEffects = { effectivePoolWeights: { log: 1 } };
assert(cnt(getEffectivePool(w), "log") === cnt(base, "log") + 2 + 1,
       "autumn (+2) + worker (+1) = base+3 log");

// Mine biome ignores farm season mods entirely
let m = createInitialState(); m.biome = "mine"; m.season = "Spring";
const minePool = getEffectivePool(m);
const baseMine = BIOMES.mine.pool;
assert(cnt(minePool, "berry") === cnt(baseMine, "berry"),
       "mine pool ignores farm season mod");

// Locked: season EFFECTS untouched
import { SEASON_EFFECTS } from "./constants.js";
assert(SEASON_EFFECTS.Winter.minChain === 5,         "winter min-chain locked at 5");
assert(SEASON_EFFECTS.Spring.harvestBonus === 0.20,  "spring +20% locked");
assert(SEASON_EFFECTS.Summer.orderMult === 2,        "summer 2× orders locked");
assert(SEASON_EFFECTS.Autumn.upgradeMult === 2,      "autumn 2× upgrades locked");
```
Run — confirm: `Cannot find module './features/farm/pool.js'` (or
`SEASON_POOL_MODS is not exported from './constants.js'`).

*Gameplay simulation (returning player, year 2 spring → year 2 winter):*
Year 2 spring opens; the board fills with three berry tiles in the bottom rows
where year 1 spring usually had two — Liss's berry orders are easier. Summer
rolls in with extra wheat (paired with the orders 2× modifier, a coin spike).
Autumn: noticeably brown, logs where hay used to be. Winter: grey-cold, fewer
hay in the spawn bag, more stone showing through — but every chain still has
to be 5+ long (the §6 effect doesn't move). The year reads as four distinct
boards, not one board with four tints.

Designer reflection: *Are these +1 / +2 nudges actually visible to a human eye,
or do they vanish into spawn noise on a 7×6 grid? Should autumn's log boost
be +3 to make "autumn = wood season" a genuine trade-off? Does winter hay −1
punish under-invested players, or correctly nudge them toward grain?*

**Implementation:**
- `src/constants.js` — append:
  ```js
  // Phase 10 — per-season tile-pool modifiers, additive on BIOMES.farm.pool.
  // Locked: ONLY spawn weights, NOT the §6 season EFFECTS table below.
  export const SEASON_POOL_MODS = {
    Spring: { berry: +1 },
    Summer: { wheat: +1 },
    Autumn: { log:   +2 },
    Winter: { stone: +1, hay: -1 },
  };
  // Locked from Phase 0/1 — re-exported for clarity. Do NOT redesign here.
  export const SEASON_EFFECTS = {
    Spring: { harvestBonus: 0.20 }, Summer: { orderMult: 2 },
    Autumn: { upgradeMult: 2 },     Winter: { minChain: 5 },
  };
  ```
- New file `src/features/farm/pool.js`:
  ```js
  import { BIOMES, SEASON_POOL_MODS } from "../../constants.js";

  export function getEffectivePool(state) {
    const biome = BIOMES[state.biome] ?? BIOMES.farm;
    let bag = [...biome.pool];
    // Phase 5 — drop tiles whose species is inactive
    if (state.species?.activeFilter) {
      bag = bag.filter(k => state.species.activeFilter(k) !== false);
    }
    // Phase 4 — worker pool_weight adds
    const adds = state._workerEffects?.effectivePoolWeights ?? {};
    for (const [k, n] of Object.entries(adds))
      for (let i = 0; i < n; i++) bag.push(k);
    // Phase 10 — farm-only season layer
    if (state.biome === "farm") {
      const mod = SEASON_POOL_MODS[state.season] ?? {};
      for (const [k, d] of Object.entries(mod)) {
        if (d > 0) for (let i = 0; i < d; i++) bag.push(k);
        else if (d < 0) {
          let rm = -d;
          while (rm > 0 && bag.filter(x => x === k).length > 1) {
            bag.splice(bag.lastIndexOf(k), 1); rm -= 1;
          }
        }
      }
    }
    while (bag.length < 9) bag.push(biome.pool[bag.length % biome.pool.length]);
    return bag;
  }
  ```
- `src/GameScene.js` — replace direct `BIOMES[biome].pool` reads in
  `fillBoard()` with `getEffectivePool(state)`.

**Manual Verify Walk-through:**
1. New game in spring. Run `getEffectivePool(gameState)`. Confirm `berry`
   count is +1 over `BIOMES.farm.pool`.
2. Force `season = "Autumn"`, `fillBoard()`. Logs should be visibly more
   common than spring.
3. Force `season = "Winter"`. Run 10× `fillBoard()`; average hay per fill
   should be visibly lower than spring/summer.
4. Hire 2 Geologists, force `biome = "mine"`. Confirm ore +1, gem +1 over
   base mine pool, and the Farm season mod does NOT apply.
5. Push hay weight to extreme negative; confirm pool never drops below 1 hay.
6. Winter chain of 4 hay still fails the §6 min-chain-5 rule (pool changed,
   chain rule unchanged).
7. `runSelfTests()` passes all 10.2 assertions.

---

### 10.3 — Late-game crafting recipes

**What this delivers:** Four §11-locked Forge recipes — Iron Frame, Stonework,
Gem Crown, Gold Ring — wire into the existing Phase 1/3 crafting pipeline.
Each takes the §11 inputs literally, produces a single named output unit, and
is sellable via Phase 3 Market at the standard 10%-of-coin-value sell rate.
Available the moment the Forge (level 8 building) is built. Phase 7 quest
templates can already reference crafted items by `inventoryKey`, so a "Craft
1 Iron Frame" daily quest becomes mechanically possible without further wiring.

**Completion Criteria:**
- [ ] All four §11 forge recipes registered with the locked inputs/values:
  `iron_frame` (beam×2 + ingot×1 → 275◉), `stonework` (block×2 + coke×1 → 300◉),
  `gem_crown` (cutgem×1 + gold×2 → 325◉), `gold_ring` (gold×1 + ingot×2 → 225◉)
- [ ] `CRAFT { recipe }` for each deducts inputs, requires Forge built,
  increments the matching `state.inventory.<id>` by 1
- [ ] Insufficient inputs / missing Forge → no-op + "Not enough resources."
  floater; state unchanged
- [ ] Pre-existing forge recipes (cobble_path / hinge / lantern) unchanged
- [ ] Phase 3 Market sell list includes all 4 at 10% sell rate, half-up:
  Iron Frame 28◉, Stonework 30◉, Gem Crown 33◉, Gold Ring 23◉
- [ ] `SELL_ITEM` debits 1 unit, credits sell price, fires the Phase 3 floater
- [ ] `src/textures.js` registers `item.iron_frame`, `item.stonework`,
  `item.gem_crown`, `item.gold_ring` (64×64)
- [ ] Forge UI lists all four under a "Late-game" sub-section, ordered by
  output value ascending (Gold Ring, Iron Frame, Stonework, Gem Crown)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { RECIPES } from "./constants.js";
import { createInitialState, reduce } from "./state.js";
import { sellPriceFor } from "./features/market/pricing.js";

// All four §11 recipes registered with the right inputs/output values
function recipe(id) { return RECIPES.forge?.[id] ?? RECIPES[id]; }

const ironFrame = recipe("iron_frame") ?? recipe("ironframe");
assert(ironFrame.inputs.beam === 2 && ironFrame.inputs.ingot === 1, "iron_frame: 2 beam + 1 ingot");
assert(ironFrame.coins === 275, "iron_frame value 275◉");
assert(recipe("stonework").inputs.block === 2 && recipe("stonework").inputs.coke === 1,
       "stonework: 2 block + 1 coke");
const gc = recipe("gem_crown") ?? recipe("gemcrown");
assert(gc.inputs.cutgem === 1 && gc.inputs.gold === 2, "gem_crown: 1 cutgem + 2 gold");
const gr = recipe("gold_ring") ?? recipe("goldring");
assert(gr.inputs.gold === 1 && gr.inputs.ingot === 2, "gold_ring: 1 gold + 2 ingot");

// CRAFT iron_frame deducts inputs, increments output
let s = createInitialState();
s.buildings = { ...s.buildings, forge: { built: true } };
s.inventory.beam = 3; s.inventory.ingot = 3;
s = reduce(s, { type: "CRAFT", recipe: "iron_frame" });
assert(s.inventory.beam === 1 && s.inventory.ingot === 2, "iron_frame debited correctly");
assert((s.inventory.iron_frame ?? 0) === 1, "iron_frame +1");

// Insufficient inputs and missing forge both no-op
let p = createInitialState();
p.buildings = { ...p.buildings, forge: { built: true } };
p.inventory.beam = 1; p.inventory.ingot = 1;
const beforeP = JSON.stringify(p);
assert(JSON.stringify(reduce(p, { type: "CRAFT", recipe: "iron_frame" })) === beforeP,
       "insufficient inputs = no-op");
let nf = createInitialState(); nf.inventory.beam = 5; nf.inventory.ingot = 5;
assert((reduce(nf, { type: "CRAFT", recipe: "iron_frame" }).inventory.iron_frame ?? 0) === 0,
       "no forge = no craft");

// Sell prices: 10% of listed coin value, half-up rounded
assert(sellPriceFor("iron_frame") === 28, "iron_frame sells for 28◉ (~10% of 275)");
assert(sellPriceFor("stonework")  === 30, "stonework sells for 30◉ (~10% of 300)");
assert(sellPriceFor("gem_crown")  === 33, "gem_crown sells for 33◉ (~10% of 325)");
assert(sellPriceFor("gold_ring")  === 23, "gold_ring sells for 23◉ (~10% of 225)");

// Sell debits inventory, credits coins
let m = createInitialState();
m.inventory.iron_frame = 2; m.coins = 100;
m = reduce(m, { type: "SELL_ITEM", id: "iron_frame", qty: 1 });
assert(m.inventory.iron_frame === 1 && m.coins === 128, "sold 1 iron_frame for 28◉");
```
Run — confirm: tests fail because `sellPriceFor` is not exported / forge
recipes are not all wired through the reducer.

*Gameplay simulation (player at level 11, post-Forge, mid-act-3):*
Forge built two sessions ago, ingots and beams stockpiled chasing the
iron_hinge recipe. Today the Forge UI shows a new "Late-game" sub-header:
Gold Ring (225◉), Iron Frame (275◉), Stonework (300◉), Gem Crown (325◉). With
2 beam + 1 ingot they tap Iron Frame — forge animation, +1 iron_frame. Market
now lists it at 28◉. They sell 1, coins +28. The Mine → Forge → Market loop
now has four endgame outputs to chase, and Phase 7 quests can target them
("Craft 1 Stonework: 60◉ + 25 XP").

Designer reflection: *Are the §11 recipe inputs (especially Gem Crown's 1
cutgem at threshold 5 + 2 gold) reachable by a player not power-grinding the
Mine? Should the sell rate be 15% to make "craft to sell" a real strategy
alongside "craft for quest reward"? Do these recipes give Bram story-flavored
things to demand, or are they purely transactional?*

**Implementation:**
- `src/constants.js` — confirm the four recipes (already present per the
  existing `RECIPES` map). Normalise IDs to snake_case (`iron_frame` not
  `ironframe`) for consistency with §11; if changing keys, add an alias map
  so save-files referring to `ironframe` still work:
  ```js
  export const RECIPE_ID_ALIASES = {
    ironframe: "iron_frame",
    gemcrown:  "gem_crown",
    goldring:  "gold_ring",
  };
  ```
- `src/state.js` — `CRAFT` reducer (Phase 1) iterates `RECIPES` for input
  deduction; confirm the four late-game recipes are picked up. Forge-built
  guard reuses the existing station check.
- New file `src/features/market/pricing.js`:
  ```js
  // Phase 3 sell rate convention — 10% of listed coin value, half-up.
  import { RECIPES } from "../../constants.js";
  export const SELL_RATE = 0.10;
  export function sellPriceFor(itemId) {
    const r = RECIPES[itemId] ?? RECIPES.forge?.[itemId];
    return r ? Math.round(r.coins * SELL_RATE) : 0;
  }
  ```
- `src/GameScene.js` — Forge UI: after the existing Hinge / Lantern / Cobble
  Path rows, add a "Late-game" divider with the four new rows by output value
  asc. Market sell list adds the four item IDs; sell-price column reads
  `sellPriceFor()`. `SELL_ITEM` reducer (Phase 3) already handles arbitrary
  keys — just list the four in the Market sellables array.
- `src/textures.js` — register `item.iron_frame` (rivet-cornered iron square),
  `item.stonework` (mortared block), `item.gem_crown` (5-point crown with
  blue cabochon), `item.gold_ring` (gold band) — 64×64.

**Manual Verify Walk-through:**
1. Force `forge.built = true`; set `beam/ingot/block/coke/cutgem/gold = 5` each.
2. Open Forge UI. Confirm the four new rows render under "Late-game" in
   ascending output-value order (Gold Ring → Iron Frame → Stonework → Gem Crown).
3. Tap Iron Frame. Confirm `iron_frame === 1`, `beam === 3`, `ingot === 4`.
4. Tap Stonework, Gem Crown, Gold Ring in turn; confirm each debits inputs
   and adds the item.
5. Open Market. Confirm all 4 in the sell list at 28◉ / 30◉ / 33◉ / 23◉.
   Sell one Iron Frame; confirm coins +28, `iron_frame -1`.
6. Drain beam to 0; try to craft Iron Frame. Confirm "Not enough resources."
7. Without Forge built, confirm crafting any of the 4 is rejected.
8. `runSelfTests()` passes all 10.3 assertions.

---

### 10.4 — Rat hazard

**What this delivers:** The §6 Rats hazard goes from spec to code. On the
Farm board, when the pantry is *abundant* (`hay > 50 AND wheat > 50`), each
`fillBoard` rolls 10% (cap 4 active) to spawn a Rat tile. Rats don't
collapse normally — they sit in place. Each `advanceTurn` makes each rat
eat one orthogonally adjacent plant tile (hay/wheat/grain/berry); the tile
empties and refills next collapse. To clear: chain 3+ rat tiles together
for +5◉ per rat cleared (no resource yield). Chains of 1 or 2 rats are
no-match. Rats spawn only on Farm. The §6 Cat tool counter is deferred —
Phase 10 ships the chain-3-rats counter, matching §6's "chain 3+ to remove."

**Completion Criteria:**
- [ ] `state.hazards.rats` array on `createInitialState()`, defaults `[]`,
  entry shape `{ row, col, age: 0 }`. Extends Phase 9's hazards bag without
  collision (caveIn / gasVent untouched).
- [ ] `RAT_SPAWN_THRESHOLDS = { hay: 50, wheat: 50, perFillRate: 0.10,
  maxActive: 4 }` in `src/constants.js`
- [ ] `rollRatSpawn(state, rng)` — pure. Returns `{ row, col, age: 0 }` only
  if biome `farm` AND `inventory.hay > 50` AND `inventory.wheat > 50` AND
  `rats.length < maxActive` AND `rng() < 0.10`. Picks a random non-special,
  non-rat cell. Returns `null` otherwise.
- [ ] `tickRats(state)` — for each rat, eat one orthogonally adjacent plant
  tile (`hay/wheat/grain/berry`) by emptying it; age every rat by +1
  regardless of whether it ate
- [ ] `commitChain` — pure rat chain of ≥3 clears those rats and pays
  `+5◉ × ratsCleared` with "Pest cleared" floater; **no inventory yield**
- [ ] 1- or 2-rat chains and mixed (rat+plant) chains both reject with
  "Need 3 rats" floater; ages and counts do NOT tick on a rejected chain
- [ ] Rats NEVER spawn in Mine biome (1000-roll assertion)
- [ ] `state.hazards.rats` round-trips save/load exactly
- [ ] `src/textures.js` registers `tile.rat` (74×74, dark grey body, pink
  ears, idle whisker twitch)
- [ ] All board-wide tools (Phase 1 + Phase 10.1) explicitly skip rat tiles
- [ ] §6 Cat tool counter explicitly deferred; chain-3-rats is the locked
  Phase 10 removal path (commented in `rats.js`)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { createInitialState, reduce } from "./state.js";
import { RAT_SPAWN_THRESHOLDS } from "./constants.js";
import { rollRatSpawn, tickRats } from "./features/farm/rats.js";

// Threshold table locked
assert(RAT_SPAWN_THRESHOLDS.hay === 50, "rat spawn requires >50 hay");
assert(RAT_SPAWN_THRESHOLDS.wheat === 50, "rat spawn requires >50 wheat");
assert(RAT_SPAWN_THRESHOLDS.perFillRate === 0.10, "10% per fillBoard");
assert(RAT_SPAWN_THRESHOLDS.maxActive === 4, "max 4 active rats");

// No rat spawn on Mine biome — even with abundance
let mine = createInitialState();
mine.biome = "mine";
mine.inventory = { hay: 99, wheat: 99 };
mine.hazards = { caveIn: null, gasVent: null, rats: [] };
for (let i = 0; i < 1000; i++) {
  assert(rollRatSpawn(mine, () => 0.001) === null,
         "mine biome NEVER spawns rats");
}

// Threshold gate — hay must be strictly > 50
let lean = createInitialState();
lean.biome = "farm";
lean.inventory = { hay: 50, wheat: 51 };
lean.hazards = { rats: [] };
assert(rollRatSpawn(lean, () => 0.01) === null, "hay = 50 (not >50) does not spawn");
lean.inventory.hay = 51;
const r = rollRatSpawn(lean, () => 0.01);
assert(r && Number.isInteger(r.row) && r.age === 0, "abundance → spawn");

// Cap at 4 active rats
let full = createInitialState();
full.biome = "farm"; full.inventory = { hay: 99, wheat: 99 };
full.hazards = { rats: Array.from({length:4}, (_,i) => ({row:0, col:i, age:0})) };
assert(rollRatSpawn(full, () => 0.001) === null, "4 rats = cap, no spawn");

// tickRats — eats one adjacent plant; ages always tick
let tk = createInitialState();
tk.biome = "farm";
tk.grid = [
  [{ key: "hay" }, { key: "rat" }, { key: "wheat" }],
  [{ key: "berry" }, { key: "log" }, { key: "stone" }],
];
tk.hazards = { rats: [{ row: 0, col: 1, age: 0 }] };
tk = tickRats(tk);
const eaten = tk.grid.flat().filter(t => t.key === null || t._eaten).length;
assert(eaten === 1, "rat ate exactly one adjacent plant");
assert(tk.hazards.rats[0].age === 1, "rat age incremented");

// Rat with no adjacent plant — age still ticks, no eat
let starve = createInitialState();
starve.biome = "farm";
starve.grid = [[{ key: "stone" }, { key: "rat" }, { key: "stone" }]];
starve.hazards = { rats: [{ row: 0, col: 1, age: 2 }] };
const after = tickRats(starve);
assert(after.hazards.rats[0].age === 3, "starving rat ages anyway");
assert(after.grid.flat().every(t => t.key !== null), "no tile eaten");

// COMMIT_CHAIN: 3 rat tiles clear and pay +15◉; rats yield no inventory
let c = createInitialState();
c.biome = "farm"; c.coins = 0;
c.hazards = { rats: [{row:1,col:1,age:1},{row:1,col:2,age:1},{row:1,col:3,age:1}] };
const rc = c.hazards.rats.map(r => ({ key: "rat", row: r.row, col: r.col }));
c = reduce(c, { type: "COMMIT_CHAIN", chain: rc });
assert(c.hazards.rats.length === 0, "3 rats cleared");
assert(c.coins === 15, "chain 3 rats = +15◉");
assert((c.inventory.rat ?? 0) === 0, "rats yield no inventory");

// 2 rats and mixed chains both reject (state unchanged)
let two = createInitialState();
two.biome = "farm"; two.coins = 0;
two.hazards = { rats: [{row:1,col:1,age:1},{row:1,col:2,age:1}] };
const before2 = JSON.stringify(two.hazards.rats);
two = reduce(two, { type: "COMMIT_CHAIN",
  chain: [{key:"rat",row:1,col:1},{key:"rat",row:1,col:2}] });
assert(JSON.stringify(two.hazards.rats) === before2, "2-rat chain leaves rats");
assert(two.coins === 0, "rejected chain pays nothing");

let mix = createInitialState(); mix.biome = "farm";
mix.hazards = { rats: [{row:0,col:0,age:0},{row:0,col:1,age:0},{row:0,col:2,age:0}] };
const beforeMix = JSON.stringify(mix.hazards.rats);
mix = reduce(mix, { type: "COMMIT_CHAIN", chain: [
  {key:"rat",row:0,col:0},{key:"rat",row:0,col:1},{key:"hay",row:0,col:2}] });
assert(JSON.stringify(mix.hazards.rats) === beforeMix, "mixed chain rejected");

// Save/load round-trip
const json = JSON.stringify([{ row: 2, col: 3, age: 4 }]);
assert(JSON.stringify(JSON.parse(json)) === json, "rats round-trip");
```
Run — confirm: `Cannot find module './features/farm/rats.js'`.

*Gameplay simulation (player at level 9, year 2 autumn, hay/wheat hoarder):*
Hoarded `hay: 84, wheat: 67` across two years. Mid-session, autumn, turn 4:
a dark squeak-tile fades in at row 3 col 2. Floater: "A rat!" They ignore it.
Turn 5: `tickRats` fires; the rat eats the adjacent hay; floater "A rat ate
your hay." Turn 6: a second rat spawns at row 3 col 4. Turn 7: both rats eat
— wheat gone, berry gone. Turn 8: a third rat at row 5 col 3. They engage —
chain all three rats (spread across the board). "Pest cleared! +15◉." Two
seasons later hay drops below 50 and rats stop spawning. Hoarding has a cost.

Designer reflection: *Does the abundance gate (hay > 50 AND wheat > 50) feel
like fair narrative ("rats follow the grain"), or like punishment for playing
well? Should rat-spawning be visible in the HUD ("⚠ Pantry attracts rats") so
abundance feels like a tradeoff, not a surprise tax? Does the chain-3 counter
feel like a legible puzzle, or a chore?*

**Implementation:**
- `src/constants.js` — append `RAT_SPAWN_THRESHOLDS = { hay: 50, wheat: 50,
  perFillRate: 0.10, maxActive: 4 }` and `RAT_CLEAR_REWARD_PER = 5`.
- New file `src/features/farm/rats.js` — pure logic. §6 Cat tool + Ratcatcher
  worker counters deferred; Phase 10's locked counter is chain 3+ rat tiles.
  Three exports:
  ```js
  import { RAT_SPAWN_THRESHOLDS } from "../../constants.js";
  const PLANT_KEYS = new Set(["hay", "wheat", "grain", "berry"]);

  export function rollRatSpawn(state, rng = Math.random) {
    if (state.biome !== "farm") return null;
    const inv = state.inventory ?? {};
    if ((inv.hay ?? 0)   <= RAT_SPAWN_THRESHOLDS.hay)   return null;
    if ((inv.wheat ?? 0) <= RAT_SPAWN_THRESHOLDS.wheat) return null;
    const rats = state.hazards?.rats ?? [];
    if (rats.length >= RAT_SPAWN_THRESHOLDS.maxActive) return null;
    if (rng() >= RAT_SPAWN_THRESHOLDS.perFillRate)     return null;
    const rows = state.grid.length, cols = state.grid[0].length;
    let row, col, tries = 0;
    do {
      row = Math.floor(rng() * rows); col = Math.floor(rng() * cols);
      const t = state.grid[row][col];
      if (!t.rubble && !t.gas && !t.frozen
          && !rats.some(r => r.row === row && r.col === col)) break;
    } while (++tries < 32);
    return { row, col, age: 0 };
  }

  export function tickRats(state) {
    if (!state.hazards?.rats?.length) return state;
    const grid = state.grid.map(r => r.map(t => ({ ...t })));
    const rats = state.hazards.rats.map(rat => {
      const adj = [[rat.row-1,rat.col],[rat.row+1,rat.col],
                   [rat.row,rat.col-1],[rat.row,rat.col+1]]
        .filter(([r,c]) => r>=0 && r<grid.length && c>=0 && c<grid[0].length
                       && PLANT_KEYS.has(grid[r][c].key));
      if (adj.length) {
        const [r,c] = adj[0]; // deterministic — first adjacent
        grid[r][c] = { ...grid[r][c], key: null, _eaten: true };
      }
      return { ...rat, age: rat.age + 1 };
    });
    return { ...state, grid, hazards: { ...state.hazards, rats } };
  }

  export function tryClearRatChain(state, chain) {
    if (chain.length < 3 || !chain.every(t => t.key === "rat")) return null;
    const rats = (state.hazards?.rats ?? [])
      .filter(r => !chain.some(c => c.row === r.row && c.col === r.col));
    return { hazards: { ...state.hazards, rats },
             coins: (state.coins ?? 0) + chain.length * 5,
             _ratFloater: `Pest cleared! +${chain.length * 5}◉` };
  }
  ```
- `src/state.js` — `createInitialState()` extends Phase 9 hazards bag with
  `rats: []`.
- `src/GameScene.js`:
  - `fillBoard()` — after Phase 9 hazard roll, call `rollRatSpawn`; on hit,
    push to `state.hazards.rats` and paint the cell `key: "rat"`.
  - `commitChain(chain)` — before the standard pipeline, try
    `tryClearRatChain`. If non-null, apply patch and skip normal chain
    handling. Any rat tile in a non-valid chain → reject with "Need 3 rats"
    floater (no turn tick).
  - `advanceTurn()` — `state = tickRats(state)`; floater per rat that ate.
  - Board-wide tool handlers gain an explicit `tile.key !== "rat"` guard.
- `src/textures.js` — register `tile.rat` (74×74, dark-grey body, pink ears,
  black dot eyes, idle whisker tween).

**Manual Verify Walk-through:**
1. Force `biome = "farm"; inventory.hay = 80; inventory.wheat = 80; hazards.rats = []`.
2. Run `fillBoard()` 30×. Confirm rats spawn ~3 times (10% rate), max 4 active.
3. Place a rat at row 3 col 2 with hay at row 3 col 1. Call `advanceTurn()`.
   Confirm the hay tile is empty and the rat's age incremented.
4. Force a chain of 3 rat tiles in a row. Confirm `hazards.rats === []`,
   `coins += 15`, floater "Pest cleared! +15◉".
5. Drag a 2-rat chain → rejected with "Need 3 rats", rats stay in place.
6. Drag a mixed chain (2 rats + 1 hay) → rejected.
7. Force `biome = "mine"; hay = 99; wheat = 99`. Run `fillBoard()` 1000×.
   Confirm `hazards.rats.length === 0` for the entire run.
8. Drop hay to 49. Run `fillBoard()` 100×. Confirm no new rat spawns.
9. Save → refresh mid-infestation. Confirm `hazards.rats` restored exactly.
10. Use Rake on a board with rats + hay. Confirm only hay collected; rats stay.
11. `runSelfTests()` passes all 10.4 assertions.

---

## Phase 10 Sign-off Gate

Play 3 Farm-focused playthroughs from a fresh save: a *crafting-heavy* session
(build Workshop, craft and use all three new tools across one year), a
*seasons-comparison* session (one full year, confirm spring/autumn/winter feel
different), and an *abundance-stress* session (force hay + wheat above 50 and
survive the rat infestation). Before moving to Phase 11, confirm all:

- [ ] 10.1 Completion Criteria all checked
- [ ] 10.2 Completion Criteria all checked
- [ ] 10.3 Completion Criteria all checked
- [ ] 10.4 Completion Criteria all checked
- [ ] **Crafting Rake at the Workshop with 1 plank gives a usable Rake; Rake
  clears every hay tile on the board with no turn cost** — verified by
  watching `gameState.turnsUsed` before and after the tool fires
- [ ] **Spring board visibly has more berry tiles than winter board** — in a
  20-sample side-by-side `fillBoard` test, spring shows ≥+1 berry weight and
  ≥−1 hay weight vs winter
- [ ] **Forging an Iron Frame and selling it via Phase 3 Market debits 2 beam
  + 1 ingot and credits coins at the listed sell rate** — start beam:5 ingot:5
  coins:0; after craft + sell: beam:3 ingot:4 coins:28
- [ ] **A rat that spawns at row 3 and is left for 2 turns has eaten 2
  adjacent plant tiles** — verified by spawn → 2 ticks → count
- [ ] **Chaining 3 rats clears them and pays +15◉; chaining 2 leaves them in
  place** — both success and rejection paths show the right floater
- [ ] **Phase 1 / 9 systems untouched**: Scythe / Seedpack / Lockbox unchanged;
  mine biome still spawns Phase 9 hazards; §6 season EFFECTS (harvest +20%,
  summer 2× coin, autumn 2× upgrades, winter min-chain-5) unchanged
- [ ] **Locked tool contract upheld**: `turnsUsed` does NOT increment for any
  of Rake / Axe / Fertilizer use — verified with before/after logging
- [ ] Save / reload at every Phase 10 mid-state (mid-craft, mid-rat-tick,
  mid-fertilizer-active, mid-season-mod) restores `state.tools`,
  `state.fertilizerActive`, `state.hazards.rats`, and `state.season` exactly
- [ ] `runSelfTests()` passes for all Phase 10 tests

*Designer gut-check: Does the Farm now feel meaningfully different to play in
spring vs autumn vs winter, or does each season feel like the same board with
a different tint? When a player hoarding 80 hay sees their first rat, do they
read it as "ah, abundance has consequences" or as "the game is punishing me"?
Do the three new tools feel like real strategic choices — Rake when hay-heavy,
Axe when logs clog the path, Fertilizer when grain is the bottleneck — or do
they blur into "another Phase 1-style instant clear"?*
