# Software Design Document — Hearthwood Vale
## Gap Analysis, Phase Roadmap & Task Breakdown

*Updated 2026-05-06 incorporating design decisions from Q&A review and priority reorder.*

---

## Design Decisions Locked

| Topic | Decision |
|---|---|
| **Win condition** | Story-based narrative arc; see Phase 2 |
| **Chain upgrade model** | Chain must reach per-resource threshold length (endpoint model); see Phase 1.1 |
| **Development priority** | Farm → Story → Economy → Workers → Species → Mine (later) → Sea (much later) |
| **Stars (★)** | Dropped entirely for now — do not implement |
| **HUD modifier (+0% / +16%)** | Omit — do not implement |
| **Overchaining** | No cap; upgrades spawn at every threshold multiple; full spec in Phase 1 |
| **Free move trigger** | Chaining the species (not just having it active) grants free moves |
| **Active species limit** | Only 1 species per category active at session start |
| **Magic Portal** | Player choice (not random draw) |
| **Field state saving** | Yes — Silos/Barns preserve tile layout between sessions |
| **Realm tier** | Based on number of towns/zones owned in the world map |
| **Daily login streak** | Present; escalating rewards |
| **XP scaling** | Linear for now; balance later |
| **Worker resource** | Comes from Housing buildings; also available as IAP |
| **Worker effect display** | Show max count only (e.g. "5", not "5/5") |
| **Worker effects** | Max effect = fully-hired roster; starting effect = max ÷ max_count per worker |
| **Barrels** | Skip for now |
| **Architect / Archaeologist** | Omit for now |
| **Potions** | TBD — keep as placeholder, no UI yet |
| **Bombs** | Come from buildings with a production timer |
| **Envelope icon** | Skip for now |
| **Swamp tiles** | TBD |
| **Sandbanks** | TBD |
| **Sea ship navigation** | Hold off |
| **Castle contribution system** | TBD |

---

## Executive Summary

The prototype has a solid Phaser 3 board, React shell, slice-based state, save/load, and several feature scaffolds. The most critical gaps blocking a playable vertical slice are:

1. **Chain upgrade model is wrong** — current "every 3rd tile" model must change to per-resource threshold-at-endpoint.
2. **Dead-board auto-shuffle is missing** — game can softlock.
3. **Tools don't touch the board** — Scythe, Seedpack, Lockbox bypass Phaser entirely.
4. **Workers are hired but do nothing** — no effects reach GameScene.
5. **No story system** — no narrative arc or win path.
6. **Three data bugs** — `memoryPerks` undefined, `gained` split, `MAX_TURNS` wrong.
7. **No overchaining visual spec** — stars are misplaced and feedback is thin.

---

## Known Bugs (Fix Before Anything Else)

| # | File | Bug |
|---|---|---|
| B1 | `constants.js` | `ROWS=7` — grid is 6×7. Decide 6×6 or 6×7 and commit. |
| B2 | `constants.js` | `MAX_TURNS=8` — GDD says 10 turns per session. |
| B3 | `prototype.jsx:169` | `memoryPerks={state.memoryPerks}` — never declared in `initialState`. Silently passes `undefined` to Phaser every render. Remove the prop until the worker-threshold feature is built. |
| B4 | `GameScene.js` + `state.js` | `gained` doubled for chains ≥6 in GameScene but the state reducer trusts the value it receives. Neither owns the formula. Move to `utils.js` as `resourceGainForChain(len)`. |
| B5 | `GameScene.js:452` | Chain badge shows raw `path.length`, not effective `gained`. Badge and inventory diverge on ≥6 chains. |
| B6 | `utils.js` | `seasonIndexForTurns` breakpoints assume 8-turn sessions. Recalculate for 10-turn sessions. |

---

## Phase Roadmap

```
Phase 0  — Bug fixes (blocking)
Phase 1  — Chain mechanic overhaul + board tools (core feel)
Phase 2  — Story system (win path)
Phase 3  — Economy: Market + Supply chain
Phase 4  — Workers wired to board
Phase 5  — Species system (Farm species only first)
Phase 6  — Mine biome depth (lower priority)
Phase 7  — Sea biome (much later)
Phase 8  — Magic Portal + Castle
Phase 9  — Content depth + balance
Phase 10 — Polish + accessibility
Phase 11 — Infrastructure + monetization hooks
```

Phases 6, 7 are explicitly deferred. Focus is Phases 0–5.

---

## Phase 0 — Bug Fixes

### Task 0.1 — Grid size
**File:** `src/constants.js`
Commit to 6×6. Change `ROWS` from 7 to 6. Verify no hardcoded 7 anywhere in GameScene layout math.

### Task 0.2 — Turn count
**File:** `src/constants.js`
Change `MAX_TURNS` from 8 to 10. Update `seasonIndexForTurns()` breakpoints:
```js
// 10-turn session → 2-3 turns per phase
export function seasonIndexForTurns(turnsUsed) {
  if (turnsUsed <= 2)  return 0; // Spring
  if (turnsUsed <= 5)  return 1; // Summer
  if (turnsUsed <= 8)  return 2; // Autumn
  return 3;                       // Winter
}
```
Update self-tests in `runSelfTests()`.

### Task 0.3 — Remove `memoryPerks` phantom prop
**File:** `prototype.jsx`
Delete the `memoryPerks={state.memoryPerks}` prop from `<PhaserMount>` and its parameter in the component signature. Re-add properly in Phase 4.

### Task 0.4 — Centralize `gained` formula
**File:** `src/utils.js`, `src/GameScene.js`
Add to `utils.js`:
```js
export function resourceGainForChain(chainLength) {
  return chainLength * (chainLength >= 6 ? 2 : 1);
}
```
Import in both `GameScene.collectPath()` and `state.js:CHAIN_COLLECTED`. Fix chain badge text to use effective gained value.

---

## Phase 1 — Chain Mechanic Overhaul + Board Tools

### 1.1 — Per-resource threshold model (replaces UPGRADE_EVERY)

**This is the single most impactful design change.**

#### How it works

Each resource has a **threshold** — the minimum chain length required to produce one upgraded resource. Reaching a multiple of the threshold produces one upgrade per multiple.

```
Hay threshold = 6
  Chain 3 hay   →  collect 3 hay, no upgrade
  Chain 6 hay   →  collect 6 hay + 1 wheat spawns at chain endpoint
  Chain 12 hay  →  collect 12 hay + 2 wheat spawn at endpoint
  Chain 18 hay  →  collect 18 hay + 3 wheat spawn at endpoint
```

The upgrade spawns **at the last tile of the chain** (the endpoint), not at every 3rd tile.

#### Threshold table for this game

| Resource (tile) | Base Threshold | Upgrades To |
|---|---|---|
| Hay | 6 | Wheat |
| Wheat | 5 | Grain |
| Grain | 4 | Flour |
| Log | 5 | Plank |
| Plank | 4 | Beam |
| Berry | 7 | Jam |
| Stone | 8 | Cobble |
| Cobble | 6 | Block |
| Ore | 6 | Ingot |
| Coal | 7 | Coke |
| Gem | 5 | CutGem |

Resources without an upgrade (Egg, Flour, Beam, Jam, Block, Ingot, Coke, CutGem, Gold) never trigger upgrades — they are collected as-is regardless of chain length.

#### Overchaining — full specification

Overchaining is the core skill expression mechanic.

- **Star markers**: During chain selection, a star (★) appears at the tile at position T, 2T, 3T... (where T = threshold for that resource). The star shows the upgraded resource icon next to it.
- **Visual escalation**:
  - 1st star (1×T): gold ★, small, subtle sway animation
  - 2nd star (2×T): gold ★★, larger, faster sway, brighter glow halo
  - 3rd star (3×T): gold ★★★, largest, pulsing orange-white burst, screen micro-shake queued
- **Upgrade spawning**: On chain commit, `upgradeCount = Math.floor(chainLength / threshold)` upgrades of the next-tier resource are placed into `pendingUpgrades` and appear on the board during the next fill cycle.
- **No artificial cap**: Upgrades are limited only by available same-type tiles on the board.
- **Floater text**: Shows `+N Hay  ★×K` where K is the upgrade count.
- **Special case — adjacent routing**: Skilled players route chains so the endpoint tile is adjacent to higher-tier tiles, enabling them to immediately continue a chain into the just-spawned upgrade. The game should not auto-collect spawned upgrades.

#### Implementation changes

**`src/constants.js`**: Remove `UPGRADE_EVERY`. Add per-resource thresholds:
```js
export const UPGRADE_THRESHOLDS = {
  hay: 6, wheat: 5, grain: 4,
  log: 5, plank: 4,
  berry: 7,
  stone: 8, cobble: 6,
  ore: 6, coal: 7, gem: 5,
};
```

**`src/utils.js`**: Replace `upgradeCountForChain(n)` with:
```js
export function upgradeCountForChain(chainLength, resourceKey) {
  const t = UPGRADE_THRESHOLDS[resourceKey];
  if (!t) return 0;
  return Math.floor(chainLength / t);
}
```

**`src/GameScene.js:collectPath()`**: Pass `res.key` to `upgradeCountForChain`. Star markers in `redrawPath()` must use `UPGRADE_THRESHOLDS[res.key]` instead of `UPGRADE_EVERY`.

**`src/GameScene.js:redrawPath()`**: Star positions change from `i % UPGRADE_EVERY === 0` to `(i + 1) % threshold === 0`. Visual escalation (size, sway speed, glow) must vary by which multiple (1st, 2nd, 3rd+).

### 1.2 — Dead-board auto-shuffle

**File:** `src/GameScene.js`

After any board fill completes, check whether at least one valid 3-tile chain exists. If not, auto-shuffle without consuming a turn.

```js
hasValidChain() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = this.grid[r][c];
      if (!tile) continue;
      if (this._countReachable(r, c, tile.res.key, new Set()) >= 3) return true;
    }
  }
  return false;
}

_countReachable(r, c, key, visited) {
  const k = `${r},${c}`;
  if (visited.has(k)) return 0;
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
  if (!this.grid[r][c] || this.grid[r][c].res.key !== key) return 0;
  visited.add(k);
  let count = 1;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      if (dr !== 0 || dc !== 0)
        count += this._countReachable(r + dr, c + dc, key, visited);
  return count;
}
```

Call `hasValidChain()` inside `fillBoard()` after the tween delay:
```js
this.time.delayedCall(230, () => {
  if (!this.hasValidChain()) {
    this.shuffleBoard();
    this.floatText("No moves — reshuffled", cx, cy, 0xaacfff);
    // do NOT emit CHAIN_COLLECTED or increment turnsUsed
  }
});
```

### 1.3 — Scythe (clear) actually removes board tiles

**Files:** `src/GameScene.js`, `src/state.js`

**State reducer**: When `USE_TOOL { key: "clear" }` fires, set a `toolPending: "clear"` flag in state and decrement `tools.clear`. Do NOT add inventory.

**GameScene**: Listen for `toolPending` registry change. On "clear":
1. Pick 6 random non-selected tiles.
2. For each: tween `scale → 0, alpha → 0` over 200ms, null out `grid[r][c]`.
3. Collect their resources (emit `chain-collected`-style events per tile or batch).
4. Call `collapseBoard()` after all removals.
5. Clear `toolPending` registry key.

### 1.4 — Seedpack places tiles on board

**Same event-channel pattern.** On `toolPending: "basic"`:
1. Pick 5 random non-selected tiles.
2. Swap each to the biome's first (basic) resource with a green sparkle burst.
3. Clear `toolPending`.

No inventory addition — the tiles are on the board, the player still needs to chain them.

### 1.5 — Lockbox places rare tiles on board

Same pattern. On `toolPending: "rare"`:
1. Pick 3 random non-selected tiles.
2. Swap each to the biome's rare resource (last in resources array) with a golden flash.

---

## Phase 2 — Story System

### Story Arc Overview

Hearthwood Vale was once a thriving settlement but fell into ruin. The player is its new caretaker, restoring it through farming, crafting, and earning the trust of its people.

#### Act 1 — First Light (Level 1–3)
- The Hearth is cold. Wren the Scout finds you at the abandoned vale.
- Task: Collect 20 Hay and light the Hearth (already built, but "dead").
- Beat: Mira the Baker arrives when the Hearth is lit. The first NPC relationship begins.
- Task: Bake the first bread (craft Bread Loaf in Bakery). Mira teaches you about orders.
- Beat: Old Tomas arrives to tend the bees. He asks for Jam.
- Milestone: Build the Mill. The vale is no longer starving.

#### Act 2 — Roots (Level 4–8)
- Bram the Smith arrives. He needs a Forge to work.
- Task: Build the Forge. Craft your first Iron Hinge.
- Beat: A harsh winter hits. Bram warns about the Frostmaw (boss intro).
- Task: Survive the Winter boss event (collect 30 logs in 5 turns).
- Milestone: Build the Inn. Pip and Tuck can be hired. The vale has lodgings.
- Sister Liss arrives and sets up a physician's corner. She needs berries for medicine.
- Beat: Liss heals a sick child in the vale using your berries.

#### Act 3 — Seasons (Level 9–15)
- Wren discovers the Mine entrance on a scouting trip (Mine biome unlocked narratively).
- Task: Gather enough Stone and Coal to open the Mine properly.
- Beat: The Caravan Post opens. Far-off markets become accessible.
- Milestone: Complete all 8 buildings.
- Beat: An annual Harvest Festival is announced. The whole town gathers.
- Final boss: The Harvest Festival requires 50 of each core resource. Fill the festival larder.
- **Win**: The Festival fires. The vale is restored. Credits roll → sandbox mode continues.

### Task 2.1 — Story state slice

**File:** `src/features/story/slice.js`

```js
export const initial = {
  storyAct: 1,
  storyBeat: 0,  // which beat within the act
  storyFlags: {},  // e.g. { hearthLit: true, miraArrived: true }
  completedBeats: [],
};
```

Actions:
- `STORY/ADVANCE_BEAT`: move to next beat, trigger NPC arrival or modal
- `STORY/SET_FLAG { key, value }`: set an arbitrary story flag
- Beat triggers check in `CHAIN_COLLECTED`, `BUILD`, `CRAFTING/CRAFT_RECIPE`, `TURN_IN_ORDER`

### Task 2.2 — Story event triggers

**File:** `src/state.js` (coreReducer) + `src/features/story/slice.js`

Beat triggers (examples):
- `hay >= 20 && !storyFlags.hearthLit` → dispatch `STORY/SET_FLAG { hearthLit: true }`, show story modal
- `built.bakery && !storyFlags.miraArrived` → dispatch `STORY/ADVANCE_BEAT`, show Mira arrival modal
- `totalCrafted >= 1 && !storyFlags.firstCraft` → story NPC bubble

### Task 2.3 — Story modal UI

**File:** `src/features/story/index.jsx`

Full-screen story beat modal with:
- NPC portrait (large, styled)
- Story text (2-4 sentences, narrative voice)
- Continue button → closes and dispatches `STORY/ADVANCE_BEAT`
- Optional objective preview ("Next: Build the Mill")

### Task 2.4 — Act transition screen

Between acts, show a seasonal illustration (drawn via canvas, no external assets) with the act title and a brief summary of what was accomplished.

### Task 2.5 — Harvest Festival win event

When all 8 buildings are built:
1. Show a "The Vale is Ready for the Harvest Festival!" story beat.
2. Display a special goal: collect 50 each of Hay, Wheat, Grain, Berry, Log.
3. On completion: full-screen celebration animation (confetti via canvas particles), credits NPC parade, then return to sandbox mode with `isWon: true` flag.

---

## Phase 3 — Economy: Market + Supply Chain

### Task 3.1 — Market screen

**Files:** `src/features/market/index.jsx`, new `src/constants.js` additions

Add `MARKET_PRICES` to constants:
```js
export const MARKET_PRICES = {
  hay:     { sell: 0,   buy: 40  },
  wheat:   { sell: 2,   buy: 60  },
  grain:   { sell: 4,   buy: 80  },
  flour:   { sell: 6,   buy: 100 },
  log:     { sell: 2,   buy: 60  },
  plank:   { sell: 4,   buy: 80  },
  beam:    { sell: 7,   buy: 110 },
  berry:   { sell: 3,   buy: 70  },
  jam:     { sell: 5,   buy: 90  },
  egg:     { sell: 3,   buy: 70  },
  stone:   { sell: 1,   buy: 50  },
  cobble:  { sell: 3,   buy: 70  },
  block:   { sell: 6,   buy: 100 },
  ore:     { sell: 3,   buy: 70  },
  ingot:   { sell: 6,   buy: 100 },
  coal:    { sell: 2,   buy: 60  },
  coke:    { sell: 4,   buy: 80  },
  gem:     { sell: 7,   buy: 120 },
  cutgem:  { sell: 14,  buy: 200 },
  gold:    { sell: 5,   buy: 100 },
};
```

Market UI: two tabs (Farm / Mine). Per resource row: icon, name, stock count, [SELL N◉] button (disabled if stock 0 or sell price 0), [BUY 1 for N◉] button (disabled if not enough coins). Warn player that sell prices are emergency rates.

State actions: `MARKET/SELL { key, qty }`, `MARKET/BUY { key }`.

### Task 3.2 — Supply chain

**Files:** `src/state.js`, `src/constants.js`

Add `supplies: 0` to `initialState`.

Add Kitchen building:
```js
{ id: "kitchen", name: "Kitchen", desc: "Converts grain into supplies for Mine expeditions.", cost: { coins: 400, plank: 20 }, lv: 3 }
```

Add `KITCHEN/CONVERT` action: `{ grain: -3, supplies: +1 }`. UI: a convert button in the TownView building panel for the Kitchen, showing current grain stock and supplies.

Mine entry (SWITCH_BIOME to "mine"): deduct 3 supplies. If supplies < 3, show bubble and block entry. Player must convert more grain first.

### Task 3.3 — Runes currency

Add `runes: 0` to `initialState`. Sources:
- Mysterious Ore tile (Phase 6)
- Boss victory rewards
- Quest rewards (occasional)

HUD: Show runes only when > 0 or in Mine biome. Small red gem icon.
State actions: `EARN_RUNE { amount }`, `SPEND_RUNE { amount }`.
Dev action: `DEV/ADD_RUNES`.

### Task 3.4 — Bombs from buildings

Bombs are a resource produced by certain buildings on a timer.

Add `bombs: 0` to state. Add to `BUILDINGS`:
```js
{ id: "powder_store", name: "Powder Store", desc: "Produces Bombs over time. Needed for Mine worker hires.", cost: { coins: 600, stone: 30, ingot: 5 }, lv: 5 }
```

Each season end, if `built.powder_store`, add 2 bombs to state (in `CLOSE_SEASON` reducer).

### Task 3.5 — Daily login streak

**File:** `src/features/streak/slice.js`

State: `{ streak: 0, lastLoginDate: null, streakRewardsClaimed: [] }`

On app boot, compare `lastLoginDate` to today:
- Same day: do nothing
- Yesterday: increment streak, grant reward, update date
- Older: reset streak to 1, grant day-1 reward, update date

Reward schedule:
| Day | Reward |
|---|---|
| 1 | 25 coins |
| 2 | 50 coins |
| 3 | 1 Seedpack tool |
| 4 | 75 coins |
| 5 | 1 Lockbox tool |
| 7 | 150 coins + 1 Reshuffle Horn |
| 14 | 300 coins + 1 Rune |
| 30 | 1000 coins + 3 Runes |

Show a "Daily Reward" toast/modal on login when reward is available.

---

## Phase 4 — Workers Wired to the Board

The current apprentices use a `produces` model (passive inventory injection per season). This must change to a **threshold reduction** model that feeds into GameScene.

### Task 4.1 — Redefine worker data model

**File:** `src/features/apprentices/data.js`

Every apprentice gets a typed `effect` field. The effect's value is the **maximum** (fully-hired) effect. Per-worker effect = max_effect ÷ max_count.

```js
{
  id: "hilda",
  name: "Hilda",
  role: "Farmhand",
  icon: "🧑‍🌾",
  color: "#4f8c3a",
  hireCost: 200,
  requirement: { building: "granary" },
  maxCount: 3,
  effect: { type: "threshold_reduce", resource: "hay", maxReduction: 3 },
  // Base hay threshold = 6. With 3 Hildas: 6 - 3 = 3.
  // Per Hilda: -1 per worker.
}
```

**Effect types:**
- `threshold_reduce`: `{ resource, maxReduction }` — reduces chain threshold for that resource
- `pool_weight`: `{ resource, weight }` — increases spawn probability of a resource in the board pool
- `bonus_yield`: `{ resource, maxBonus }` — adds extra collected units per chain of that type
- `turn_free`: grants free turn (doesn't consume session turn) when chaining specified resource
- `season_bonus`: passive per-season inventory bonus (replaces old `produces` model)

**Max display**: show `maxCount` as a plain number (e.g., "3"), not "3/3".

**Farm apprentice effects (proposed):**

| Apprentice | Max | Effect |
|---|---|---|
| Hilda (Farmhand) | 3 | `threshold_reduce` hay −3 (6→3) |
| Pip (Forager) | 2 | `pool_weight` berry +2 |
| Wila (Cellarer) | 2 | `bonus_yield` jam +2 |
| Tuck (Lookout) | 1 | `season_bonus` coins +30/season |
| Osric (Smith) | 2 | `threshold_reduce` ore −2 (6→4) |
| Dren (Miner) | 2 | `threshold_reduce` stone −2 (8→6) |

### Task 4.2 — Compute effective thresholds

**File:** `src/features/apprentices/effects.js` (new)

```js
import { UPGRADE_THRESHOLDS } from "../../constants.js";
import { APPRENTICE_MAP } from "./data.js";

export function computeWorkerEffects(hiredApprentices) {
  const thresholds = { ...UPGRADE_THRESHOLDS };
  const poolWeights = {};
  const bonusYield = {};

  for (const { app, count } of hiredApprentices) {
    const def = APPRENTICE_MAP[app];
    if (!def?.effect) continue;
    const { type, resource } = def.effect;
    const perWorker = def.effect.maxReduction
      ? def.effect.maxReduction / def.maxCount
      : def.effect.maxBonus / def.maxCount;

    if (type === "threshold_reduce" && resource) {
      thresholds[resource] = Math.max(1, thresholds[resource] - Math.round(perWorker * count));
    }
    if (type === "pool_weight" && resource) {
      poolWeights[resource] = (poolWeights[resource] || 0) + def.effect.weight * count;
    }
    if (type === "bonus_yield" && resource) {
      bonusYield[resource] = (bonusYield[resource] || 0) + Math.round(perWorker * count);
    }
  }

  return { thresholds, poolWeights, bonusYield };
}
```

### Task 4.3 — Sync effects to Phaser registry

**File:** `prototype.jsx`

```jsx
import { computeWorkerEffects } from "./src/features/apprentices/effects.js";

// Inside App:
const workerEffects = useMemo(
  () => computeWorkerEffects(state.hiredApprentices || []),
  [state.hiredApprentices]
);

// Pass to PhaserMount:
<PhaserMount workerEffects={workerEffects} ... />

// In PhaserMount useEffect:
useEffect(() => {
  gameRef.current?.registry.set("workerEffects", workerEffects);
}, [workerEffects]);
```

**File:** `src/GameScene.js`

Read effects from registry in:
- `upgradeCountForChain()`: use `this.registry.get("workerEffects")?.thresholds?.[key] ?? UPGRADE_THRESHOLDS[key]`
- `randomResource()`: apply `poolWeights` to weighted-random selection
- `collectPath()`: add `bonusYield[res.key]` to `gained` before emitting `chain-collected`

### Task 4.4 — Worker resource ("1 Worker") from Housing

The generic "1 Worker" hire cost comes from Housing buildings that generate Workers over time.

Add to `BUILDINGS`:
```js
{ id: "housing", name: "Housing Block", desc: "Provides Workers — needed to hire staff.", cost: { coins: 300, plank: 25 }, lv: 2 }
```

Add `workers: 0` to `initialState`. In `CLOSE_SEASON`: if `built.housing`, add 1 worker per season. Show worker count in HUD near coins (small person icon).

IAP stub: add "Buy Workers" to the store stub (Phase 11). Workers = premium hiring resource; players without IAP earn via Housing over time.

### Task 4.5 — Free move mechanic

Certain species, when chained, grant extra turns that don't decrement the session counter.

**Free move species** (Farm):
| Species | Free Moves |
|---|---|
| Turkey | +2 |
| Clover | +2 |
| Melon (rare) | +5 |

Implementation: Add `freeMoveTiles: Set<string>` to constants (keys that grant free moves). In `CHAIN_COLLECTED`, if `key` is in the free move set, add `freeMoves` to state instead of decrementing turns:
```js
// Instead of: turnsUsed + 1
// Do: turnsUsed + Math.max(0, 1 - freeMoves)
// and track remaining freeMoves separately
```

---

## Phase 5 — Species System (Farm First)

### Task 5.1 — Species data model

**File:** `src/features/species/data.js`

```js
export const FARM_SPECIES = {
  // Category: Grass
  hay: {
    category: "grass",
    discovered: true,
    active: true,
    discoveryMethod: "default",
    unlockRequires: null,
    buyCost: null,
    researchCost: null,
    freeMovesPerChain: 0,
  },
  // Category: Grain
  wheat: {
    category: "grain",
    discovered: false,
    active: false,
    discoveryMethod: "chain",     // auto-discovered on first hay→wheat upgrade
    unlockRequires: "hay",
    buyCost: 150,
    researchCost: null,
    freeMovesPerChain: 0,
  },
  grain: {
    category: "grain",
    discovered: false,
    active: false,
    discoveryMethod: "research",
    unlockRequires: "wheat",
    buyCost: 300,
    researchCost: { key: "wheat", amount: 30 },
    freeMovesPerChain: 0,
  },
  // ... etc
};
```

### Task 5.2 — Species state slice

**File:** `src/features/species/slice.js`

```js
export const initial = {
  speciesDiscovered: { hay: true, log: true, berry: true, egg: true, stone: true, ore: true, coal: true, gem: true, gold: true },
  speciesActive: { hay: true, log: true, berry: true, egg: true },
  speciesResearch: null,        // key currently being researched
  speciesResearchProgress: {},  // { key: currentCount }
};
```

Actions:
- `SPECIES/TOGGLE_ACTIVE { key }`: only 1 active per category; swapping deactivates the previous
- `SPECIES/DISCOVER { key }`: mark discovered; if previously set for research, clear it
- `SPECIES/RESEARCH_TICK { key, amount }`: increment research progress; if >= cost, auto-discover

### Task 5.3 — Category enforcement (1 active per category)

In `SPECIES/TOGGLE_ACTIVE`:
```js
const category = FARM_SPECIES[key]?.category;
// Deactivate all others in the same category first
const newActive = { ...state.speciesActive };
Object.keys(newActive).forEach(k => {
  if (FARM_SPECIES[k]?.category === category) newActive[k] = false;
});
newActive[key] = !state.speciesActive[key];
return { ...state, speciesActive: newActive };
```

### Task 5.4 — Chain discovery auto-trigger

**File:** `src/state.js`

In `CHAIN_COLLECTED`, when `upgrades > 0` and `res.next` exists:
```js
if (upgrades > 0 && res?.next && !state.speciesDiscovered?.[res.next]) {
  newSpeciesDiscovered = { ...state.speciesDiscovered, [res.next]: true };
  bubble = { npc: "wren", text: `New species discovered: ${res.next}!`, ms: 2400 };
}
```

### Task 5.5 — Wire active species to board pool

**File:** `prototype.jsx`, `src/GameScene.js`

Pass `state.speciesActive` to Phaser registry. In `GameScene.randomResource()`:
```js
randomResource() {
  const active = this.registry.get("speciesActive") || {};
  const pool = this.biome().pool.filter(key => active[key] !== false);
  const effectivePool = pool.length ? pool : this.biome().pool;
  return this.biome().resources.find(r => r.key === effectivePool[Math.floor(Math.random() * effectivePool.length)]);
}
```

### Task 5.6 — Species UI panel

**File:** `src/features/species/index.jsx`

Full-screen panel (new nav item "Species" or "Fields"):
- Biome tabs (Farm / Mine when unlocked)
- Category sections (Grass, Grain, Trees...)
- Per species: illustration tile preview, name, discovered/locked state
- Toggle switch (active/inactive) — grayed out if not discovered
- If not discovered: "Research (N/50 Wheat)" progress bar, "Buy Discovery (200◉)" button
- Unlock tree: faint connecting lines between species in unlock order

---

## Phase 6 — Mine Biome Depth (Lower Priority)

Defer until Farm (Phases 0–5) is playable and polished.

### Task 6.1 — Mysterious Ore countdown tile

Add `mysterious_ore` tile type to Mine resources (spawns by logic, not in pool). Shows countdown number overlay. Must chain adjacent dirt tiles before timer hits 0 → earn 1 Rune.

### Task 6.2 — Mine hazards

- **Lava**: Spreads each turn; chain lava tiles to contain, Water Pump tool to extinguish.
- **Exploding Gas**: 3 connected clouds → explosion; tap individual clouds to neutralize.
- **Moles**: removed by Explosives tool.

### Task 6.3 — Mine workers wired

Apply mine worker effects (Digger, Excavator, Stone Miner, etc.) using the same Phase 4 effects system.

---

## Phase 7 — Sea Biome (Much Later)

Full Sea biome deferred. Ship navigation mechanic on hold. Sandbanks and sea hazard details TBD.

When the time comes, Sea will need:
- Full resource chain (10 sea resources with textures)
- Sea-specific hazards (sharks, icebergs, storms, whirlpools)
- Ship movement mechanic (TBD design)
- Sea workers (15 defined in GDD)
- Sea-specific tools
- 3 new NPCs
- Sea crafting recipes + new building (Shipyard or Smokehouse)

---

## Phase 8 — Magic Portal + Castle

### Task 8.1 — Magic Portal building + UI

Building: `{ id: "portal", name: "Magic Portal", cost: { coins: 2000, runes: 5 } }`

Portal modal: shows 4 magic tools available for purchase with Influence. Player chooses one. Tools added to `state.tools`. Each portal tool needs a board effect in GameScene.

**Priority portal tools (implement first):**
| Tool | Effect | Influence Cost |
|---|---|---|
| Magic Wand | Collect all tiles of chosen type | 15 |
| Hourglass | Undo last move (restore previous grid state) | 12 |
| Fertilizer | All refill tiles are grain for 1 turn | 8 |
| Magic Seed | Session lasts 5 extra turns | 20 |

### Task 8.2 — Castle system

Castle is a tiered upgrade to the Hearth. Unlocks permanent bonuses.

| Tier | Name | Cost | Bonus |
|---|---|---|---|
| 1 | Keep | Starting state | — |
| 2 | Manor | 1000◉, 20 beams | +1 order slot (4 total) |
| 3 | Stronghold | 3000◉, 10 blocks, 5 ingots | Seasonal bonus doubled |
| 4 | Citadel | 8000◉, 20 blocks, 10 ingots, 3 gems | Boss victory rewards ×2 |

Castle "Needs" (contribution system): TBD — skip the contribution mechanic for now, just implement the upgrade tiers.

---

## Phase 9 — Content Depth + Balance

### Task 9.1 — Expand NPC dialog (8–10 lines each + mood-conditional)

Each NPC needs lines for bond levels 1–3 (cold), 4–6 (warm), 7–10 (close friend). In `makeOrder()`, select from the appropriate bond tier.

### Task 9.2 — Expand tool catalog (Farm tools first)

Priority farm tools to add:
| Tool | Effect | Craft Cost |
|---|---|---|
| Rake | Collect all hay tiles | 1 Wood |
| Axe | Collect all log tiles | 1 Stone |
| Scythe (real) | Collect all grain tiles | 1 Stone |
| Bird Cage | Collect all egg tiles | 1 Hay |
| Cat | Remove all hazard-rat tiles | 2 Stone |

Store tools in a `craftableTools` object in constants. Workshop building enables crafting tools. Add `WORKSHOP/CRAFT_TOOL` action.

### Task 9.3 — Realm tier (based on zones owned)

Realm tier label in HUD or profile:
| Zones Visited | Title |
|---|---|
| 1 | Peasant |
| 3 | Freeholder |
| 5 | Fief |
| 8 | Village |
| 12 | Manor |
| 18 | Town |
| 25 | Kingdom |

Read from `mapVisited.length` in cartography state.

### Task 9.4 — Linear XP curve

Replace `xpForLevel(l) = 50 + l * 80` with:
```js
export const XP_PER_LEVEL = 150;
export const xpForLevel = () => XP_PER_LEVEL; // same for every level
```
Rebalance XP gains if needed during playtesting. Target: level 2 in approximately 1 session (8–10 chains of 5+).

### Task 9.5 — Field state saving

When player exits a puzzle session mid-session, save the current board layout:
- Serialize `grid` as a 2D array of resource keys
- Store as `savedBoardState` in state (persisted to localStorage)
- On next session start, restore from `savedBoardState` if biome matches
- Silos (Farm) and Barns (Farm) buildings enable this feature; without them, board is always fresh

---

## Phase 10 — Polish + Accessibility

### Task 10.1 — Audio completeness audit

Check `src/audio/index.js` for missing events:
- Chain start, chain extend (subtle per-tile), upgrade earned, order fulfilled
- Level up fanfare, season transition, building constructed, boss defeated

### Task 10.2 — Haptics

Use `navigator.vibrate()` gated by `settings.hapticsOn`:
- Chain start: 20ms
- Upgrade earned: 40-20-40ms
- Order fulfilled: 60ms

### Task 10.3 — Reduced motion

When `settings.reducedMotion`:
- Skip SWAY ambient tile animations
- Skip screen shake (`shakeForChain` → no-op)
- Skip radial flash and ring bursts
- Collapse/fill use `duration: 0`

### Task 10.4 — Color blind mode

When `settings.colorBlind`, stamp a unique shape glyph on each tile texture: △ circle ■ ◇ ⬡ etc. per resource family, so resources are distinguishable without color.

### Task 10.5 — Tutorial updates

Add tutorial steps for:
- Species toggle (shown when first species is discovered)
- Mine entry (shown when mine unlocks)
- Tool placement (shown when first tool is used)

### Task 10.6 — PWA / offline support

Add `manifest.json` + service worker for install-to-homescreen and offline play.

---

## Phase 11 — Infrastructure + Monetization Hooks

### Task 11.1 — Analytics stubs

`src/analytics.js`:
```js
export function track(event, props = {}) {
  if (import.meta.env.DEV) console.log('[analytics]', event, props);
}
```
Call for: `session_start`, `session_end`, `level_up`, `building_built`, `boss_defeated`, `iap_prompt_shown`, `daily_login`.

### Task 11.2 — IAP / Workers purchase stub

`src/features/store/index.jsx`: "Get Workers" button in HUD that opens a modal with packages (stub — no real purchase). Workers = premium resource; organic source is Housing buildings over time.

### Task 11.3 — Cloud save stub

`src/save/cloud.js`:
```js
export async function uploadSave(state) { /* no-op */ }
export async function downloadSave()   { return null; }
```
Hook `uploadSave` after `persistState()` in `gameReducer`.

---

## Remaining Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Potions — exact source building | TBD |
| 2 | Swamp tile behavior + spread rules | TBD |
| 3 | Sandbanks — Sea tile details | Deferred with Sea |
| 4 | Castle contribution system ("Castle Needs: N") | TBD |
| 5 | Free move cap — can a chain grant more than 5 free moves if multiple free-move species are active? | No cap per design; test in playtest |
| 6 | Species research — is research global or per-session? | Global (accumulates across all sessions) |
| 7 | Boss victory reward pool — exact rewards? | Define during Phase 9 balance pass |
