# Phase 1 — Chain Mechanic Overhaul + Board Tools

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Long chains feel powerful and worth planning. A chain of
6 hay is meaningfully better than 2 chains of 3. Players learn to route chains to the
endpoint. The board never softlocks. Tools visibly change the board.

**Entry check:** [Phase 0 Sign-off Gate](./phase-0-bug-fixes.md#phase-0-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 1.1 — Per-resource threshold model

**What this delivers:** Each resource has its own upgrade threshold. A chain of 6 hay
produces 1 wheat. This is the single highest-impact change in the project.

**Completion Criteria:**
- [ ] `UPGRADE_EVERY` constant removed from `src/constants.js`
- [ ] `UPGRADE_THRESHOLDS` object exported from `src/constants.js` with all 11 entries
- [ ] `upgradeCountForChain(length, resourceKey)` signature updated in `src/utils.js`
- [ ] Upgrade tiles spawn at the chain endpoint position during `fillBoard()`
- [ ] Star markers on the chain path appear at exact threshold multiples
- [ ] Stars escalate visually for 2× and 3× threshold chains
- [ ] Floater text format: `+6 Hay  ★×1` or `+12 Hay  ★×2`

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
// Basic threshold math
assert(upgradeCountForChain(5,  "hay")   === 0, "5 hay → no upgrade");
assert(upgradeCountForChain(6,  "hay")   === 1, "6 hay → 1 upgrade");
assert(upgradeCountForChain(12, "hay")   === 2, "12 hay → 2 upgrades");
assert(upgradeCountForChain(18, "hay")   === 3, "18 hay → 3 upgrades");
assert(upgradeCountForChain(4,  "grain") === 1, "grain threshold is 4");
assert(upgradeCountForChain(5,  "egg")   === 0, "egg is terminal — no upgrade");
assert(upgradeCountForChain(6,  "egg")   === 0, "egg terminal regardless of length");
assert(upgradeCountForChain(4,  "wheat") === 0, "wheat threshold is 5, not 4");
assert(upgradeCountForChain(5,  "wheat") === 1, "5 wheat → 1 upgrade");
```
Run — confirm: `upgradeCountForChain is not defined` or signature mismatch.

*Gameplay simulation (experienced player, turn 4):*
You have 9 hay tiles within reach. You could take two short chains of ~4, or route a
single chain of 9. With the old model (every 3rd), two chains of 4 gave 2 upgrades.
With the new model (threshold 6), one chain of 9 gives 1 upgrade, two of 4 give none.
Test scenario: Route the 9-chain. Confirm 1 wheat spawns at the endpoint. Then try
two 4-chains and confirm zero wheat spawns.

Designer reflection: *Does knowing the threshold change how you plan the chain? Is
the cost (routing a longer path) worth the reward (spawning a wheat)? Does the star
marker appear at the right moment to communicate the upgrade is coming?*

**Implementation:**
- `src/constants.js` — remove `UPGRADE_EVERY`. Add:
  ```js
  export const UPGRADE_THRESHOLDS = {
    hay: 6, wheat: 5, grain: 4,
    log: 5, plank: 4,
    berry: 7,
    stone: 8, cobble: 6,
    ore: 6, coal: 7, gem: 5,
  };
  ```
- `src/utils.js:upgradeCountForChain` — replace implementation:
  ```js
  export function upgradeCountForChain(chainLength, resourceKey) {
    const t = UPGRADE_THRESHOLDS[resourceKey];
    if (!t) return 0;          // terminal or unknown resource
    return Math.floor(chainLength / t);
  }
  ```
- `src/GameScene.js:collectPath()` — pass `res.key` to `upgradeCountForChain`. Store
  upgrade results as `pendingUpgrades` array processed in `fillBoard()` — spawn upgrade
  tiles at endpoint position before the rest of the fill.
- `src/GameScene.js:redrawPath()` — star marker at `(i + 1) % threshold === 0`:
  - 1× threshold: small gold star, ±10° sway, 950ms loop
  - 2× threshold: larger star, ±15° sway, 600ms loop, glow halo
  - 3× threshold: largest star, ±20° sway, 400ms loop, orange-white burst, screen shake
    queued for commit

**Manual Verify Walk-through:**
1. New session. Chain exactly 5 hay. Confirm no star, no upgrade spawned.
2. Chain exactly 6 hay. Confirm 1 small gold star appears at tile 6, and 1 wheat tile
   spawns at the endpoint after collapse.
3. Route a 12-hay chain. Confirm 2 wheat spawn, and the 2nd star is larger/glowing.
4. Route an 18-hay chain. Confirm 3 wheat, screen shakes on commit, 3rd star is the
   largest and pulses orange-white.
5. Chain 5 grain. Confirm 1 upgrade (threshold = 4, so 5 ÷ 4 = 1).

---

### 1.2 — Dead-board auto-shuffle

**What this delivers:** The game never softlocks. If no valid chain of 3+ exists,
the board reshuffles automatically without costing a turn.

**Completion Criteria:**
- [ ] `hasValidChain()` correctly identifies a dead board
- [ ] Dead board triggers `shuffleBoard()` after `fillBoard()`
- [ ] A "No moves — reshuffled" floater appears
- [ ] Turn counter does NOT increment on a shuffle

**Validation Spec — write before code:**

*Tests (red phase):*
```js
// Dead board: checkerboard pattern — no two same-type tiles touch
const deadGrid = buildCheckerboard(["hay", "log", "berry", "egg"]);
assert(hasValidChain(deadGrid) === false, "checkerboard has no valid chain");

// Live board: 3 hay tiles in a row
const liveGrid = buildGridWithCluster("hay", 3);
assert(hasValidChain(liveGrid) === true, "3-cluster is a valid chain");
```

*Gameplay simulation (stuck player):* Using dev tools, manually fill the board with a
perfect checkerboard of 4 alternating resource types. Click any tile. Confirm the
game auto-shuffles without asking the player to do anything, and the turn counter
stays the same. Designer reflection: *Does the auto-shuffle feel seamless or jarring?
Should there be a brief pause before the shuffle to let the player see the board
state?*

**Implementation:**
- `src/GameScene.js` — add `hasValidChain()` and `_countReachable()` DFS helper.
  Call `hasValidChain()` at the end of `fillBoard()`. On false, call `shuffleBoard()`
  and emit a "No moves — reshuffled" floater. Do not emit `CHAIN_COLLECTED` or
  increment `turnsUsed`.

**Manual Verify Walk-through:**
1. Dev tools: call `scene.debugFillCheckerboard()` (add a dev helper for this).
2. Confirm floater appears within 500ms.
3. Confirm turn counter stays on the same number.
4. Confirm new board has at least one playable chain.

---

### 1.3 — Scythe: clear 6 tiles from the board

**What this delivers:** Using the Scythe tool removes 6 board tiles with animation,
collapses the board, and credits those resources to inventory — without costing a turn.

**Completion Criteria:**
- [ ] `USE_TOOL { key: "clear" }` decrements `state.tools.clear` and sets `toolPending: "clear"` in state
- [ ] Phaser removes 6 random tiles with a scale+alpha tween (200ms, 20ms stagger)
- [ ] Resources from those tiles go to inventory
- [ ] Board collapses then fills
- [ ] Turn counter does NOT increment
- [ ] Tool does NOT silently add resources without a board animation

**Validation Spec — write before code:**

*Tests (red phase):*
```js
const s0 = { ...initialState(), tools: { clear: 2 } };
const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { key: "clear" } });
assert(s1.tools.clear === 1, "tool count decremented");
assert(s1.toolPending === "clear", "toolPending set");
assert(s1.turnsUsed === s0.turnsUsed, "turn not consumed");
```

*Gameplay simulation (resource-scarce player):* You have 2 hay and need 4 for an
order. Use the Scythe. Watch 6 tiles dissolve and the board collapse. Some of the
removed tiles should be hay. Confirm the resource gain in inventory. Designer
reflection: *Does the animation communicate "these tiles were harvested"? Is 6 tiles
the right number — enough to matter, not so many the board feels destroyed?*

**Implementation:**
- `src/state.js:USE_TOOL` — set `toolPending: action.payload.key`, decrement tool
  count. No inventory change here — Phaser does the collection.
- `src/GameScene.js` — listen on `registry.changedata-toolPending`. On `"clear"`:
  1. Select 6 random non-selected tiles.
  2. Tween: `scale → 0, alpha → 0, rotation ± rand(0.3)`, 200ms, 20ms stagger.
  3. Batch collected resources into a single `CHAIN_COLLECTED`-equivalent event (or
     emit individual `resource-gained` events).
  4. Null out `grid[r][c]` for each tile.
  5. `collapseBoard()` → `fillBoard()`.
  6. Clear `toolPending` in registry.

**Manual Verify Walk-through:**
1. Use Scythe. Watch 6 tiles animate out (scale to 0, slight rotation).
2. Board collapses visibly.
3. Inventory shows the collected resources.
4. Turn counter unchanged.

---

### 1.4 — Seedpack: place 5 base-resource tiles on board

**What this delivers:** Seedpack replaces 5 random tiles with the biome's base
resource (hay in Farm), giving the player guaranteed chain material — but they must
chain them to collect.

**Completion Criteria:**
- [ ] `USE_TOOL { key: "basic" }` sets `toolPending: "basic"` and decrements tool count
- [ ] 5 random non-selected tiles become `hay` (Farm) or `stone` (Mine)
- [ ] Green sparkle burst animation on each replaced tile (180ms, Back.Out)
- [ ] Inventory unchanged after tool use
- [ ] Turn counter does NOT increment

**Validation Spec — write before code:**

*Tests (red phase):*
```js
// State side
const s0 = { ...initialState(), tools: { basic: 1 } };
const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { key: "basic" } });
assert(s1.tools.basic === 0, "basic tool decremented");
assert(s1.toolPending === "basic", "toolPending set");

// Phaser side (mock grid with 10 diverse tiles)
// After handler runs: 5 tiles are "hay", inventory unchanged
const pre = sumInventory(mockGrid);
applyBasicTool(mockGrid, "hay");
assert(countTile(mockGrid, "hay") >= 5, "at least 5 hay tiles");
assert(sumInventory(mockGrid) === pre, "inventory unchanged");
```

*Gameplay simulation:* Use Seedpack on a board where hay is scarce. Watch 5 tiles
transform with a green flash. Chain them immediately. Designer reflection: *Does
the green flash clearly communicate "these tiles are new"? Does needing to chain
them (vs. getting them directly) feel active and engaging?*

**Implementation:**
- `src/GameScene.js` — `toolPending: "basic"` handler:
  1. Pick 5 random non-selected tiles.
  2. Replace `grid[r][c].res` with the biome's base resource.
  3. Animate: green sparkle burst, scale `0 → 1`, Back.Out, 180ms.
  4. Clear `toolPending`.

**Manual Verify Walk-through:**
1. Use Seedpack. 5 tiles flash green and become hay.
2. Inventory count unchanged before and after tool use.
3. Chain the new hay tiles. Confirm they collect normally.

---

### 1.5 — Lockbox: place 3 rare-resource tiles on board

**What this delivers:** Lockbox places 3 rare tiles (berry in Farm, gem in Mine) for
a high-value chain opportunity — golden flash, board placement only.

**Completion Criteria:**
- [ ] `USE_TOOL { key: "rare" }` sets `toolPending: "rare"` and decrements tool count
- [ ] 3 random non-selected tiles become `berry` (Farm) or `gem` (Mine)
- [ ] Golden flash animation (scale `0 → 1.1 → 1.0`, 200ms)
- [ ] Inventory unchanged
- [ ] Turn counter does NOT increment

**Validation Spec — write before code:**

*Tests (red phase):*
```js
// Farm biome
const s0 = { ...initialState(), biome: "farm", tools: { rare: 1 } };
const s1 = rootReducer(s0, { type: "USE_TOOL", payload: { key: "rare" } });
assert(s1.toolPending === "rare", "toolPending set");

// Phaser side (farm biome): 3 tiles become berry
applyRareTool(mockGrid, "farm");
assert(countTile(mockGrid, "berry") >= 3, "3 berry tiles placed");

// Mine biome: 3 tiles become gem
applyRareTool(mockGrid, "mine");
assert(countTile(mockGrid, "gem") >= 3, "3 gem tiles placed");
```

**Implementation:**
- Same pattern as 1.4. `toolPending: "rare"` handler:
  1. 3 random non-selected tiles → biome rare resource (`berry` / `gem`).
  2. Animate: golden flash, scale `0 → 1.1 → 1.0`, 200ms.
  3. Clear `toolPending`.

**Manual Verify Walk-through:**
1. Farm biome. Use Lockbox. 3 tiles flash gold and become berry.
2. Mine biome. Use Lockbox. 3 tiles become gem.
3. Chain the tiles. Confirm rare resource collected.

---

## Phase 1 Sign-off Gate

Play 10 full sessions (one full year each). Before moving to [Phase 2](./phase-2-story.md), confirm all:

- [ ] 1.1–1.5 Completion Criteria all checked
- [ ] Every upgrade spawns at the endpoint, not at a random position
- [ ] Stars appear at exactly the threshold position and escalate correctly for 2× and 3×
- [ ] No session ever deadlocks — auto-shuffle fires before any player action is blocked
- [ ] All 3 tools visibly change the board; none silently add inventory
- [ ] Chain badge shows effective resource gain, not raw tile count
- [ ] Floater text shows `★×K` for upgrade multiplier
- [ ] `runSelfTests()` passes for all Phase 1 tests
- [ ] Designer gut-check: *Does building to a threshold feel deliberate and satisfying?
  Is the reward (spawning an upgraded tile at the endpoint) legible and exciting?*
