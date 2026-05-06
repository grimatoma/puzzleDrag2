# Development Roadmap — Hearthwood Vale

*Last updated 2026-05-06. For game design and mechanics, see GAME_SPEC.md.*

---

## Philosophy

**Horizontal slices, not vertical.** Each phase must produce a fully playable, testable
game before the next phase begins. No environment is added until the previous one is
polished and high-value. Farm → Mine → Sea.

**TDD workflow per task:**
1. Write a failing test that describes the correct behaviour (red)
2. Implement until the test passes (green)
3. Play through the feature manually as a game designer/tester and ask: *does this feel right?*

**Manual verification is not optional.** After every phase, the whole game must be
launched in the browser and played for at least 5 sessions before the phase is closed.

---

## Current State (as of this roadmap)

**Working:**
- Phaser 3 board renders and accepts drag-chain input
- Board collapses and refills after each chain
- Chain is collected; resources go to inventory
- React shell: HUD, side panel, bottom nav, season modal
- Save/load via localStorage
- NPC orders system (3 active orders)
- Crafting (Bakery, Larder, Forge recipes)
- Town building screen
- Apprentices UI (hire/fire — but effects are inert)
- Achievements, quests, almanac (scaffolded)
- Audio (synthesized)
- Boss system (Frostmaw works; others are broken)

**Broken / Missing:**
- Chain upgrade model is `every 3rd tile` — wrong; must be per-resource threshold
- Tools (Scythe, Seedpack, Lockbox) add inventory directly, bypass the board
- Workers are hired but have no effect on gameplay
- Dead boards can softlock (no auto-shuffle)
- NPC mood starts at Sour (×0.70 tax) instead of Warm
- `TURN_IN_ORDER` mood bonus never fires (ordering bug)
- `MAX_TURNS` = 8 (should be 10); `seasonsCycled` lives in achievements slice not core
- Drought and frost weather do nothing
- Boss window is 5 seasons (should be 1); reward is flat ±200◉
- Ember Drake counts any craft as a forge event
- No story system, no win condition

---

## Phase 0 — Critical Bug Fixes

**Goal:** The game runs correctly. No silent data corruption, no dead-code mechanics, no
mismatched constants. These must be fixed before any feature work.

Each fix is small and targeted. All are in existing files.

---

### 0.1 — Grid size: commit to 6×6

**File:** `src/constants.js:7`

Change `ROWS` from 7 to 6. Audit `src/GameScene.js` layout math (board origin, frame
drawing) for any hardcoded 7 — there are none beyond the ROWS constant.

**Test:** `runSelfTests()` — add assertion `ROWS === 6 && COLS === 6`.

**Manual verify:** Board displays as a square 6×6 grid, no missing row at bottom.

---

### 0.2 — Turn count: MAX_TURNS = 10

**File:** `src/constants.js:10`

Change `MAX_TURNS` from `8` to `10`.

**File:** `src/utils.js` — update `seasonIndexForTurns`:

```js
export function seasonIndexForTurns(turnsUsed) {
  if (turnsUsed <= 2)  return 0; // Spring
  if (turnsUsed <= 5)  return 1; // Summer
  if (turnsUsed <= 8)  return 2; // Autumn
  return 3;                       // Winter
}
```

**File:** `src/features/apprentices/slice.js:42,74` — fix `/10` divisor (was always 0 since
`turnsUsed` never reached 10 with `MAX_TURNS=8`):

```js
const season = Math.floor((state.turnsUsed || 0) / MAX_TURNS);
```

**Test:** Assert `seasonIndexForTurns(0)===0`, `(3)===1`, `(6)===2`, `(9)===3`, `(10)===3`.

**Manual verify:** HUD season bar changes through all 4 seasons over 10 turns. Season
modal fires after turn 10, not turn 8.

---

### 0.3 — Move `seasonsCycled` to core state

**File:** `src/features/achievements/slice.js:12` — remove `seasonsCycled: 0` from
`initial`.

**File:** `src/state.js` — add `seasonsCycled: 0` to `initialState()`. In
`CLOSE_SEASON` case, increment `seasonsCycled` in `coreReducer` (it currently reads
this value from state but it lives in the achievements slice — a cross-slice dependency
that breaks if achievements slice is ever moved).

**File:** `src/features/achievements/slice.js` — read `state.seasonsCycled` from the
shared state rather than declaring it locally.

**Test:** Dispatch `CLOSE_SEASON` 4 times. Assert `state.seasonsCycled === 4` in core
state (not only in achievements).

---

### 0.4 — Fix mood `TURN_IN_ORDER` ordering bug

**Context:** `src/features/mood/slice.js` handles `TURN_IN_ORDER` to grant bond and
coins. But `coreReducer` runs first and replaces the order with a new one (new id).
By the time mood's slice runs, `state.orders.find(o => o.id === id)` finds nothing.
The bond bump and mood modifier on order reward are both dead.

**Fix:** Pass `npcKey` and `reward` directly in the `TURN_IN_ORDER` action payload
(from the caller in `coreReducer`), so the mood slice doesn't need to find the order:

In `src/state.js`, when dispatching / building the `TURN_IN_ORDER` action:
```js
// Before replacing the order, capture what the mood slice needs:
{ type: "TURN_IN_ORDER", payload: { id, npcKey: order.npc, reward: order.reward } }
```

In `src/features/mood/slice.js` — read `action.payload.npcKey` and
`action.payload.reward` directly.

**Test:** Dispatch `TURN_IN_ORDER` with a known npc. Assert `state.npcBond[npc]`
increased by 0.3. Assert coins were adjusted by the mood modifier.

**Manual verify:** Fill an order. Open Townsfolk → Mood tab. Hearts on that NPC should
visibly increase.

---

### 0.5 — NPC bond starts at 5 (Warm), not 1 (Sour)

**File:** `src/features/mood/data.js` — change initial bond value from `1` to `5`.

**File:** `src/features/mood/slice.js` — change `initialBond` constant and confirm
bands: Sour (1–4, ×0.70), Warm (5–6, ×1.00), Liked (7–8, ×1.15), Beloved (9–10, ×1.25).
Remove the `> 5` guard on decay so decay only applies above 5.

**Why:** Starting at bond 1 applies a silent 30% tax on every order for the player's
entire first hour of play before they can give any favorite gift. This is a design flaw,
not a feature.

**Test:** `initialState()` → assert all NPC bonds are 5. Dispatch `CLOSE_SEASON` 10
times → assert bond above 5 has decayed toward 5; bond at 5 unchanged.

**Manual verify:** Start a new game. Open Townsfolk. All NPCs show "Warm" mood, order
rewards show ×1.00 modifier.

---

### 0.6 — Remove `memoryPerks` phantom prop

**File:** `prototype.jsx:169`

Remove `memoryPerks={state.memoryPerks}` from `<PhaserMount>` and its parameter from
the `PhaserMount` function signature. `state.memoryPerks` is never declared in
`initialState` — this silently passes `undefined` to Phaser every render.

**Test:** `initialState()` must not contain `memoryPerks`. PhaserMount renders without
console warnings.

---

### 0.7 — Centralise `gained` formula

**File:** `src/utils.js` — add:
```js
export function resourceGainForChain(chainLength) {
  return chainLength * (chainLength >= 6 ? 2 : 1);
}
```

**File:** `src/GameScene.js:collectPath()` and `src/state.js:CHAIN_COLLECTED` — both
must import and use `resourceGainForChain`. Remove the inline `>= 6 ? 2 : 1` logic
from both. Fix chain badge to show effective gained value, not raw `path.length`.

**Note:** This formula is a placeholder until Phase 1 replaces it with the per-resource
threshold model. The centralisation here means Phase 1 only needs to change one place.

**Test:** `resourceGainForChain(3) === 3`, `(6) === 12`, `(7) === 14`.

---

### 0.8 — Fix `SWITCH_BIOME` duplicate NPC orders

**File:** `src/state.js:305`

`state.orders.map(() => makeOrder(key, state.level))` passes no `excludeNpcs`, so all
3 orders can go to the same NPC. Fix to thread exclusions the same way `initialState`
does:

```js
const orders = [];
for (let i = 0; i < 3; i++) {
  orders.push(makeOrder(key, state.level, orders.map(o => o.npc)));
}
```

**Test:** Dispatch `SWITCH_BIOME` 100 times. Assert no result has duplicate NPC keys
across the 3 order slots.

---

### 0.9 — Fix Ember Drake boss

**File:** `src/features/boss/slice.js:246`

The `CRAFTING/CRAFT_RECIPE` handler increments Drake's progress for *any* crafted
recipe. Fix to only count recipes whose output is `ingot`:

```js
case "CRAFTING/CRAFT_RECIPE": {
  if (!state.boss || state.boss.id !== "ember_drake") return state;
  const recipe = RECIPES[action.payload.key];
  if (!recipe || recipe.output !== "ingot") return state;
  ...
}
```

**Test:** Dispatch `CRAFT_RECIPE` with `breadloaf`. Assert Drake progress unchanged.
Dispatch with `hinge` (ingot output). Assert progress increments.

---

### 0.10 — Fix `DEV/RESET_GAME` to wipe all slice state

**File:** `src/state.js:377–398`

The reset action resets coins/inventory but leaves trophies, boss, weather, hiredAppren-
tices, npcBond, etc. The player still has all achievements after "resetting".

Fix: call `initialState()` in full and return it (preserve only settings if desired):

```js
case "DEV/RESET_GAME": {
  clearSave();
  return { ...initialState(), settings: state.settings };
}
```

**Test:** Start game, earn achievements, dispatch RESET. Assert `state.trophies` is
empty and `state.coins === 0`.

---

### 0.11 — Implement drought and frost weather

**File:** `src/GameScene.js:randomResource()`

Currently `drought` and `frost` are rolled, shown in the UI, and do nothing. Read
`registry.get("weather")` and apply:

- `drought`: filter out `wheat` and `grain` with 50% probability per tile spawn
- `frost`: visual-only (tile fall animation uses longer duration) — implement the duration
  change in `fillBoard()`

**File:** `src/features/boss/slice.js` — remove dead-code `[GAP]` comments on these
weather types once implemented.

**Test:** Mock registry weather = "drought". Assert `randomResource()` returns wheat/grain
less than 30% of the time over 1000 calls (baseline ~33%).

**Manual verify:** Trigger drought via dev tools. Play a session. Wheat and grain tiles
are visibly rare.

---

### 0.12 — Gate dev menu behind `import.meta.env.DEV`

**File:** wherever the Settings/Menu modal renders dev actions (`DEV/ADD_GOLD`,
`DEV/FILL_STORAGE`, `DEV/RESET_GAME`).

Wrap the entire dev section:
```jsx
{import.meta.env.DEV && (
  <DevButtons dispatch={dispatch} />
)}
```

**Test:** Production build (`npm run build`) — assert dev buttons are absent from the
bundle output.

---

## Phase 1 — Chain Mechanic Overhaul + Board Tools

**Goal (player experience):** Long chains feel powerful and worth planning. A chain of
6 hay is meaningfully better than 2 chains of 3. Players learn to route chains to the
endpoint to chain the spawned upgrade. The board never softlocks. Tools visibly
manipulate tiles.

---

### 1.1 — Per-resource threshold model

**This is the single most impactful change in the entire project.**

Remove `UPGRADE_EVERY` from `src/constants.js`. Add:

```js
export const UPGRADE_THRESHOLDS = {
  hay: 6, wheat: 5, grain: 4,
  log: 5, plank: 4,
  berry: 7,
  stone: 8, cobble: 6,
  ore: 6, coal: 7, gem: 5,
};
```

Replace `upgradeCountForChain(n)` in `src/utils.js` with:
```js
export function upgradeCountForChain(chainLength, resourceKey) {
  const t = UPGRADE_THRESHOLDS[resourceKey];
  if (!t) return 0;
  return Math.floor(chainLength / t);
}
```

**`src/GameScene.js:collectPath()`** — pass `res.key` to `upgradeCountForChain`. On
upgrade, spawn `upgradeCount` tiles of `res.next` at the endpoint position during the
next `fillBoard()` cycle. Store as `pendingUpgrades` array processed inside `fillBoard`.

**`src/GameScene.js:redrawPath()`** — star marker positions change from
`i % UPGRADE_EVERY === 0` to `(i + 1) % threshold === 0`. Star visuals must
escalate:
- 1× threshold: small gold star, ±10° sway, 950ms loop
- 2× threshold: larger star, ±15° sway, 600ms loop, glow halo
- 3× threshold: largest star, ±20° sway, 400ms loop, orange-white pulsing burst,
  micro-shake queued for commit

Floater text format: `+6 Hay  ★×1` or `+12 Hay  ★×2`.

**Tests:**
- `upgradeCountForChain(5, "hay") === 0`
- `upgradeCountForChain(6, "hay") === 1`
- `upgradeCountForChain(12, "hay") === 2`
- `upgradeCountForChain(18, "hay") === 3`
- `upgradeCountForChain(4, "grain") === 1`
- `upgradeCountForChain(5, "egg") === 0` (terminal)
- `upgradeCountForChain(6, "egg") === 0` (terminal)

**Manual verify (game designer test):**
1. Start a session. Chain exactly 6 hay tiles. Confirm: 6 hay collected + 1 wheat spawns
   at endpoint. No upgrade for chain of 5.
2. Route a chain of 12 hay. Confirm 2 wheat spawn. Immediately chain both wheat.
3. Chain 3 hay — no star, no upgrade. Chain 6 — 1st star appears at tile 6. Chain 9 —
   no 2nd star (9 < 12 = 2×6). Chain 12 — 2nd star, larger, glowing.
4. Ask: *Does building to the threshold feel deliberate and satisfying? Does the star
   give me the right information at the right time?*

---

### 1.2 — Dead-board auto-shuffle

**File:** `src/GameScene.js`

After every `fillBoard()` completes, run a connectivity check: DFS from every tile,
tracking whether any resource type reaches a cluster of ≥3 adjacent matching tiles.

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
  if (visited.has(k) || r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
  if (!this.grid[r][c] || this.grid[r][c].res.key !== key) return 0;
  visited.add(k);
  let n = 1;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      if (dr || dc) n += this._countReachable(r + dr, c + dc, key, visited);
  return n;
}
```

If `!hasValidChain()`, call `shuffleBoard()` and show a "No moves — reshuffled" floater.
Do NOT emit `CHAIN_COLLECTED` or increment `turnsUsed`.

**Tests:**
- Build a 6×6 grid where every tile is isolated from same-type neighbours. Assert
  `hasValidChain() === false`.
- Build a grid with a 3-cluster of hay. Assert `hasValidChain() === true`.

**Manual verify:** Fill the board by hand via dev tools with alternating resources
(hay/log/berry/egg in a checkerboard pattern). Confirm auto-shuffle fires and a
"reshuffled" floater appears. Confirm turn counter did not increment.

---

### 1.3 — Scythe (clear) removes board tiles

**File:** `src/state.js` — `USE_TOOL { key: "clear" }` sets `toolPending: "clear"` and
decrements `tools.clear`. Does NOT add to inventory.

**File:** `src/GameScene.js` — listen for `registry.changedata-toolPending`.
On `"clear"`:
1. Select 6 random non-selected tiles.
2. Tween each: `scale → 0, alpha → 0, rotation ± random(0.3)`, 200ms, staggered 20ms.
3. For each removed tile, collect its resource: emit a `chain-collected` event (or
   batch into a single event with the collected resources).
4. Null out `grid[r][c]` for each tile.
5. Call `collapseBoard()` then `fillBoard()`.
6. Clear `toolPending` in registry.

**Tests:**
- Dispatch `USE_TOOL { key: "clear" }`. Assert `state.tools.clear` decremented.
  Assert `state.toolPending === "clear"`.
- Mock a Phaser scene. Call the tool handler. Assert 6 grid cells are nulled.
  Assert `collapseBoard` was called.

**Manual verify:** Use Scythe. Watch 6 tiles animate out and the board collapse into
them. Confirm inventory received those resources. Confirm turn counter did not change.

---

### 1.4 — Seedpack places tiles on board

Same event-channel pattern as 1.3. On `toolPending: "basic"`:
1. Pick 5 random non-selected tiles.
2. Replace each with the biome's base resource (first in pool: `hay` for farm).
3. Animate: green sparkle burst, scale 0 → 1, 180ms Back.Out.
4. Clear `toolPending`.

Does NOT add inventory. The tiles are on the board; the player must chain them.

**Test:** Use Seedpack. Assert 5 random tiles are now `hay`. Assert inventory unchanged.

**Manual verify:** Use Seedpack. 5 tiles visibly transform to hay with a green flash.
Chain them immediately for a guaranteed yield.

---

### 1.5 — Lockbox places rare tiles on board

Same pattern. On `toolPending: "rare"`:
1. Pick 3 random non-selected tiles.
2. Replace each with the biome's rare resource (`berry` for farm, `gem` for mine).
3. Animate: golden flash, scale 0 → 1.1 → 1.0, 200ms.

**Test:** Use Lockbox in farm biome. Assert 3 tiles are now `berry`. Use in mine biome.
Assert 3 tiles are now `gem`.

**Manual verify:** Use Lockbox. Golden flash on 3 tiles. Chain them for rare resources.

---

### Phase 1 End-to-End Verification

Play 10 full sessions (one full year). Confirm:
- [ ] Every upgrade spawns at the endpoint, not scattered
- [ ] Stars appear at exactly the threshold position and escalate correctly
- [ ] No session ever deadlocks (auto-shuffle fires before player notices)
- [ ] All 3 tools visibly change the board, never just add inventory silently
- [ ] Chain badge shows the effective resource gain, not raw tile count
- [ ] The upgrade floater shows `★×K` correctly

---

## Phase 2 — Story System

**Goal (player experience):** The player has a reason to play beyond survival. NPCs
arrive and feel like they live in the vale. There is a clear path to the win condition.
Each story beat delivers a moment of narrative satisfaction.

---

### 2.1 — Story state slice

**File:** `src/features/story/slice.js`

```js
export const initial = {
  storyAct: 1,
  storyBeat: 0,
  storyFlags: {},
  completedBeats: [],
};
```

Actions:
- `STORY/SET_FLAG { key, value }`: set an arbitrary flag, e.g. `{ hearthLit: true }`
- `STORY/ADVANCE_BEAT`: move to next beat within current act
- `STORY/ADVANCE_ACT`: move to next act, reset beat to 0
- `STORY/COMPLETE_BEAT { beatId }`: mark a beat as done

---

### 2.2 — Story triggers wired into core actions

**File:** `src/features/story/slice.js` — handle the following actions and check flags:

| Trigger Action | Flag Check | Story Event |
|---|---|---|
| `CHAIN_COLLECTED` (hay ≥ 20 accumulated) | `!hearthLit` | Set `hearthLit`, show Hearth modal |
| `BUILD { id: "bakery" }` | `!miraArrived` | Advance beat, show Mira arrival modal |
| `CRAFTING/CRAFT_RECIPE` (any bread) | `!firstCraft` | Set `firstCraft`, NPC bubble from Mira |
| `TURN_IN_ORDER` (jam to Tomas once) | `!tomasJam` | Set `tomasJam`, Tomas arrival beat |
| `BUILD { id: "mill" }` | `!millBuilt` | Set `millBuilt`, Act 1 milestone modal |
| `BUILD { id: "forge" }` | `!forgBuilt` | Bram arrival beat |
| Boss Frostmaw defeated | `!frostmawDone` | Advance to Act 2 late section |
| `BUILD { id: "inn" }` | `!innBuilt` | Inn milestone, Pip+Tuck available |
| All 8 buildings built | `!allBuilt` | Act 3 milestone, Festival announced |
| Festival larder filled (50 each of 5 resources) | `!won` | Win condition, credits |

---

### 2.3 — Story modal UI

**File:** `src/features/story/index.jsx`

Full-screen modal (uses existing `ModalShell`). Content:
- NPC portrait (large, named) — reuse existing NPC portrait system
- Story text: 2–4 sentences, narrative voice, serif-style font
- Optional "Next objective" line (e.g. "Next: Build the Mill")
- Continue button → dispatches `STORY/ADVANCE_BEAT` and closes modal

Each story beat has a data entry:
```js
{
  id: "hearth_lit",
  npc: "wren",
  text: "The hearth still has embers. Gather more hay and we can light it properly.",
  objective: "Collect 20 Hay",
}
```

All story beat text is defined in `src/features/story/beats.js`.

---

### 2.4 — NPC arrival system

When a story beat triggers an NPC arrival, the NPC becomes visible in:
- Townsfolk modal (Mood tab, Apprentices tab, Orders tab)
- NPC speech bubbles
- Order generation (`makeOrder` pulls from arrived NPCs only)

Add `arrivedNpcs: ["wren"]` to initial story state (Wren is present from the start).
Story beats push new NPCs into this array. Order generation and Townsfolk modal filter
by `arrivedNpcs`.

**Test:** Initial state has only Wren in arrived NPCs. After `hearthLit` flag set, Mira
is added. `makeOrder()` only generates orders for arrived NPCs.

---

### 2.5 — Harvest Festival win condition

**File:** `src/features/story/slice.js`

Track a running total for the 5 festival resources (hay, wheat, grain, berry, log)
separately from inventory (they must be freshly collected, not spent):

```js
festivalProgress: { hay: 0, wheat: 0, grain: 0, berry: 0, log: 0 }
```

In `CHAIN_COLLECTED`, if the festival is announced (`allBuilt === true`), increment the
corresponding counter. When all 5 reach 50:
- Dispatch `STORY/SET_FLAG { won: true }`
- Open full-screen celebration: confetti particle burst (canvas particles), NPC parade
  (all 5 NPCs walk across the screen), then credits text
- Set `state.isWon = true` — sandbox mode continues

**Tests:**
- Fill festival progress to 49 hay. Assert `won` not set.
- Add 1 more hay. Assert `won === true`.
- Assert `isWon` in top-level state.

**Manual verify (Act 1 full playthrough):**
1. Start new game. Play until 20 hay collected. Confirm Hearth story modal fires.
2. Build Bakery. Confirm Mira arrival modal.
3. Craft Bread Loaf. Confirm Mira speech bubble.
4. Build Mill. Confirm Act 1 milestone.
5. Ask: *Do the NPC arrivals feel earned? Is the pacing right? Does the story give me
   a reason to keep playing?*

---

## Phase 3 — Economy: Market + Supply Chain

**Goal (player experience):** Resources have a clear monetary value. The player can sell
surplus in an emergency (at a steep discount) and buy specific resources when stuck.
The Mine has a cost to enter, making farm resources feed mine progression.

---

### 3.1 — Market screen (full implementation)

**File:** `src/features/market/index.jsx` (new feature, auto-discovered)

Two tabs: Farm / Mine. Each tab shows every resource in that biome.

Per resource row:
- Resource icon + name
- Current stock count
- Sell button: disabled if stock = 0 or sell price = 0 (hay sell = 0). Shows `+N◉`.
- Buy button: disabled if not enough coins. Shows `N◉ each`.
- Sell price shown in muted text to signal it's a poor deal vs. buy price.

All prices from `MARKET_PRICES` constant (defined in `src/constants.js` — see GAME_SPEC.md
for full table).

**State actions:**
- `MARKET/SELL { key, qty }`: remove `qty` of resource, add `qty × sell_price` coins
- `MARKET/BUY { key }`: remove `buy_price` coins, add 1 of resource

Caravan Post building must be built before Market nav item is accessible.

**Tests:**
- Dispatch `MARKET/SELL { key: "wheat", qty: 3 }`. Assert wheat decremented by 3 and
  coins increased by `3 × 2 = 6`.
- Dispatch `MARKET/BUY { key: "grain" }` with insufficient coins. Assert state
  unchanged.
- Assert Market nav item absent when `!built.caravan_post`.

**Manual verify:** Build Caravan Post. Open Market. Sell 10 wheat — confirm coins rise
by exactly 20◉. Buy 1 grain — confirm 80◉ deducted. Try to buy with 0 coins — confirm
button disabled.

---

### 3.2 — Supply chain (Kitchen + Mine entry)

**File:** `src/constants.js` — add Kitchen building definition.
**File:** `src/state.js` — add `supplies: 0` to `initialState`.

In `CLOSE_SEASON` / Kitchen conversion action:
- `KITCHEN/CONVERT`: costs 3 grain, produces 1 supply

Mine entry (biome switch to "mine"):
- If `supplies < 3` and `!built.kitchen`: show bubble "You need supplies to enter the Mine. Build a Kitchen first." Block the switch.
- If Kitchen built but `supplies < 3`: show bubble "Convert grain into supplies in the Kitchen first."
- Deduct 3 supplies on entry.

**Tests:**
- Dispatch `KITCHEN/CONVERT` with 3 grain. Assert `grain - 3`, `supplies + 1`.
- Dispatch `SWITCH_BIOME { key: "mine" }` with `supplies = 2`. Assert biome does not
  switch. Assert bubble set.
- Dispatch with `supplies = 3`. Assert biome switches. Assert `supplies = 0`.

**Manual verify:** Build Kitchen. Enter Mine without supplies — confirm blocked with
helpful message. Convert grain to supplies. Enter Mine — confirm deduction.

---

### 3.3 — Runes currency

**File:** `src/state.js` — add `runes: 0` to `initialState`.

HUD shows rune count only when `runes > 0` or current biome is mine (small red gem
icon next to coins). Actions: `EARN_RUNE { amount }`, `SPEND_RUNE { amount }`. Dev
action: `DEV/ADD_RUNES { amount }`.

Sources for runes (wired as each Phase introduces them):
- Boss victory rewards (Phase 8)
- Mysterious Ore tile (Phase 9)
- Occasional quest rewards

**Test:** Dispatch `EARN_RUNE { amount: 3 }`. Assert `state.runes === 3`.
`SPEND_RUNE { amount: 5 }` with `runes = 3` — assert no-op (can't go negative).

---

### 3.4 — Bombs from Powder Store

**File:** `src/constants.js` — add Powder Store building.
**File:** `src/state.js` — add `bombs: 0` to `initialState`.

In `CLOSE_SEASON` reducer: if `built.powder_store`, add 2 bombs to state.

**Test:** Dispatch `CLOSE_SEASON` with `built.powder_store = true`. Assert `bombs + 2`.

---

### 3.5 — Daily login streak

**File:** `src/features/streak/slice.js`

State: `{ streak: 0, lastLoginDate: null, streakRewardsClaimed: [] }`

On app boot, `initialState()` checks `lastLoginDate` against today (date-only, UTC):
- Same day: no-op
- Yesterday: increment streak, grant reward, update date
- Older / null: reset streak to 1, grant day-1 reward, update date

Reward schedule (from GAME_SPEC.md). Grants are applied via `STREAK/CLAIM_REWARD`
dispatched immediately after the check. Show a "Daily Reward" toast modal.

**Tests:**
- Simulate `lastLoginDate = yesterday`. Assert streak increments and reward dispatched.
- Simulate `lastLoginDate = 3 days ago`. Assert streak resets to 1 and day-1 reward.
- Simulate same day. Assert no change.
- Simulate 7 consecutive days. Assert day-7 reward (150◉ + Reshuffle Horn).

**Manual verify:** Manually set `lastLoginDate` in localStorage to yesterday. Refresh.
Confirm streak modal appears with the correct reward.

---

## Phase 4 — Workers Wired to the Board

**Goal (player experience):** Hiring a worker immediately changes how the puzzle plays.
Hiring Hilda makes hay chains shorter. The player can feel the difference in a session.
Wages are fair — the resource yield covers the cost with reasonable play.

---

### 4.1 — Redesign worker data model

**File:** `src/features/apprentices/data.js`

Every apprentice entry must have a typed `effect` field. Remove the `produces` model
entirely. The effect's value represents the **maximum** (all slots filled). The
per-hire effect = `maxEffect ÷ maxCount`.

```js
{
  id: "hilda",
  name: "Hilda",
  role: "Farmhand",
  hireCost: 200,
  wage: 15,
  requirement: { building: "granary" },
  maxCount: 3,
  effect: { type: "threshold_reduce", resource: "hay", maxReduction: 3 },
}
```

Full catalog of 6 Farm workers — see GAME_SPEC.md §12. All 6 must be fully defined
with correct effect types, maxCounts, hireCosts, and wages.

**New effect types:**
- `threshold_reduce`: `{ resource, maxReduction }` — reduces chain threshold
- `pool_weight`: `{ resource, weight }` — increases spawn probability
- `bonus_yield`: `{ resource, maxBonus }` — extra collected units per chain
- `season_bonus`: `{ resource, amount }` — passive per-season inventory addition

Display max slot as a plain number (e.g. `"3"`, not `"3/3"`).

---

### 4.2 — `computeWorkerEffects()` function

**File:** `src/features/apprentices/effects.js` (new file)

Full implementation that handles all 4 effect types:

```js
import { UPGRADE_THRESHOLDS } from "../../constants.js";
import { APPRENTICE_MAP } from "./data.js";

export function computeWorkerEffects(hiredApprentices) {
  const thresholds = { ...UPGRADE_THRESHOLDS };
  const poolWeights = {};
  const bonusYield = {};
  const seasonBonus = {};

  for (const { id, count } of hiredApprentices) {
    const def = APPRENTICE_MAP[id];
    if (!def?.effect) continue;
    const { type, resource } = def.effect;

    if (type === "threshold_reduce") {
      const perHire = def.effect.maxReduction / def.maxCount;
      thresholds[resource] = Math.max(1, thresholds[resource] - Math.round(perHire * count));
    }
    if (type === "pool_weight") {
      poolWeights[resource] = (poolWeights[resource] || 0) + def.effect.weight * count;
    }
    if (type === "bonus_yield") {
      const perHire = def.effect.maxBonus / def.maxCount;
      bonusYield[resource] = (bonusYield[resource] || 0) + Math.round(perHire * count);
    }
    if (type === "season_bonus") {
      seasonBonus[resource] = (seasonBonus[resource] || 0) + def.effect.amount * count;
    }
  }

  return { thresholds, poolWeights, bonusYield, seasonBonus };
}
```

**Tests (exhaustive):**
- 0 Hilda hired → `thresholds.hay === 6`
- 1 Hilda hired → `thresholds.hay === 5` (6 − round(3/3 × 1) = 5)
- 3 Hilda hired → `thresholds.hay === 3`
- 1 Pip hired → `poolWeights.berry === 2`
- 2 Wila hired → `bonusYield.jam === 2` (maxBonus 2, maxCount 2, count 2 → 2)
- 1 Tuck hired → `seasonBonus.coins === 30`
- Mixed hires → all effects computed correctly simultaneously

---

### 4.3 — Sync worker effects to Phaser registry

**File:** `prototype.jsx`

```jsx
import { computeWorkerEffects } from "./src/features/apprentices/effects.js";

const workerEffects = useMemo(
  () => computeWorkerEffects(state.hiredApprentices || []),
  [state.hiredApprentices]
);
```

Pass `workerEffects` to `PhaserMount` as a prop. Sync to registry via `useEffect`.

**File:** `src/GameScene.js` — apply in three places:
1. `upgradeCountForChain()`: use `registry.get("workerEffects")?.thresholds?.[key]` with
   fallback to `UPGRADE_THRESHOLDS[key]`
2. `randomResource()`: apply `poolWeights` to weighted pool selection
3. `collectPath()`: add `bonusYield[res.key] || 0` to `gained` before emitting

---

### 4.4 — Worker wages with debt rollover

**File:** `src/features/apprentices/slice.js`

In `CLOSE_SEASON`: for each hired worker, deduct their seasonal wage. If `coins < wage`,
do NOT fire the worker — instead set `workerDebt[id] = workerDebt[id] + wage` and
produce nothing this season. Debt clears next season when coins are sufficient.

Remove the existing auto-fire logic entirely.

**File:** Apprentice UI — show a "In debt" indicator on workers whose debt > 0.

**Tests:**
- Hire Hilda (wage 15◉). Close season with 20◉. Assert coins = 5, no debt.
- Close season with 10◉. Assert `workerDebt.hilda === 15`, Hilda effect still active
  in data but `producedNothing = true` this season.
- Next season with 30◉. Assert debt clears, coins = 15, normal production.

**Manual verify:** Hire all workers, let coins drop to near zero, close a season.
Workers remain hired. No auto-fire surprise. Debt indicator shows.

---

### 4.5 — Housing building produces workers

**File:** `src/constants.js` — add Housing building.
**File:** `src/state.js` — add `workers: 0` to `initialState`.

In `CLOSE_SEASON`: if `built.housing`, add 1 to `state.workers`.

HUD: show worker count (person icon) next to coins, visible only when `workers > 0` or
on the Townsfolk tab.

Worker unit is consumed when hiring any worker: `workers - 1` on `APPRENTICES/HIRE`.
If `workers === 0`, hire button disabled with message "Need a Worker unit — build Housing."

**Test:** Dispatch `CLOSE_SEASON` ×5 with `built.housing`. Assert `workers === 5`.
Hire Hilda. Assert `workers === 4`.

---

### Phase 4 End-to-End Verification

1. Start new game. Build Granary. Hire Hilda (1/3).
2. Play a session. Chain hay. Confirm threshold is 5 (not 6) — star appears 1 tile
   earlier than before.
3. Hire a second Hilda (2/3). Replay. Confirm threshold is 4.
4. Hire Tuck. Close a season. Confirm +30◉ passive income.
5. Let coins run dry. Close a season with workers hired. Confirm no auto-fire.
6. Ask: *Does hiring workers feel like a meaningful upgrade? Is the threshold change
   noticeable in play? Does the economy balance feel fair?*

---

## Phase 5 — Species System (Farm First)

**Goal (player experience):** Discovering a new species feels like an achievement. The
player actively manages which species are on the board, making strategic choices about
what tile types appear. Free moves from Turkey chains feel like a gift.

---

### 5.1 — Species data model (Farm)

**File:** `src/features/species/data.js`

Full catalog for all current Farm resources. Each entry:
```js
{
  key: "wheat",
  label: "Wheat",
  category: "grain",
  discovered: false,
  discoveryMethod: "chain",   // "chain" | "research" | "buy" | "default"
  unlockRequires: "hay",
  buyCost: 150,
  researchResource: null,
  researchCost: null,
  freeMovesPerChain: 0,
  flavorText: "Ground fine enough, it feeds the whole vale.",
}
```

All species from GAME_SPEC.md §13 must be defined. Default-discovered species
(hay, log, berry, egg) have `discovered: true`.

---

### 5.2 — Species state slice

**File:** `src/features/species/slice.js`

Full state:
```js
{
  discovered: { hay: true, log: true, berry: true, egg: true },
  active: { hay: true, log: true, berry: true, egg: true },
  research: null,         // key currently being researched
  researchProgress: {},   // { wheat: 12 } — cumulative
}
```

All actions:
- `SPECIES/TOGGLE_ACTIVE { key }`: enforce 1 active per category; deactivate previous
- `SPECIES/DISCOVER { key }`: mark discovered; clear if was in research
- `SPECIES/START_RESEARCH { key }`: set active research target
- `SPECIES/TICK_RESEARCH { key, amount }`: increment progress; auto-discover on completion
- `SPECIES/BUY_DISCOVERY { key }`: pay `buyCost` coins, mark discovered immediately

---

### 5.3 — 1-active-per-category enforcement

In `SPECIES/TOGGLE_ACTIVE`:
- Find the category of `key` from `FARM_SPECIES[key].category`.
- Deactivate all other species in that category.
- Toggle the target key.

**Test:** Active set: `{ hay: true, log: true }`. Toggle meadow_grass (same category
as hay). Assert `hay: false, meadow_grass: true, log: true`.

---

### 5.4 — Chain discovery auto-trigger

**File:** `src/state.js` or `src/features/species/slice.js`

In `CHAIN_COLLECTED`, when an upgrade fires (`upgradeCount > 0`) and `res.next` exists
and is not yet discovered:
- Mark `discovered[res.next] = true`
- Show NPC bubble: "New species discovered: Wheat!" with Wren as speaker
- If the discovered species requires research to become active, show a "Now researching"
  indicator

**Test:** Chain 6 hay (upgrade fires). Assert `discovered.wheat === true`. Assert bubble
set with Wren NPC and wheat mention.

---

### 5.5 — Research accumulation (global across sessions)

In `CHAIN_COLLECTED`: if `species.research` is set and the chained resource matches the
research target's `researchResource`, increment `researchProgress[key]`. When progress
reaches `researchCost`, auto-dispatch `SPECIES/DISCOVER { key }`.

**Test:** Research target = grain, researchResource = wheat, cost = 30. Chain wheat 10
times (10 tiles). Assert `researchProgress.grain === 10`. Chain 20 more. Assert
`discovered.grain === true`.

---

### 5.6 — Active species wired to board pool

**File:** `prototype.jsx` — pass `state.species.active` to Phaser registry.

**File:** `src/GameScene.js:randomResource()`

```js
randomResource() {
  const active = this.registry.get("speciesActive") || {};
  const pool = this.biome().pool.filter(key => active[key] !== false);
  const effectivePool = pool.length >= 1 ? pool : this.biome().pool;
  // Apply pool weight bonuses from worker effects
  const weights = this.registry.get("workerEffects")?.poolWeights || {};
  const weighted = effectivePool.flatMap(key => {
    const extra = weights[key] || 0;
    return Array(1 + extra).fill(key);
  });
  const key = weighted[Math.floor(Math.random() * weighted.length)];
  return this.biome().resources.find(r => r.key === key);
}
```

**Test:** Active = `{ hay: true, log: false, berry: true, egg: true }`. Run
`randomResource()` 1000 times. Assert log never appears.

---

### 5.7 — Free moves mechanic

**File:** `src/state.js`

Add `freeMoves: 0` to `initialState`.

In `CHAIN_COLLECTED`: if the chained resource key is in the free-move species set
(`turkey`, `clover`, `melon`), instead of incrementing `turnsUsed`, add the species'
free move count to `state.freeMoves`. The next `freeMoves` chains will not cost turns:

```js
// When committing a chain:
if (state.freeMoves > 0) {
  return { ...state, freeMoves: state.freeMoves - 1 };  // don't increment turnsUsed
} else {
  return { ...state, turnsUsed: state.turnsUsed + 1 };
}
```

Turkey chain grants `+2 freeMoves`. The turn counter freezes for 2 moves.

**Tests:**
- Chain Turkey (active, freeMovesPerChain: 2). Assert `state.freeMoves === 2`,
  `turnsUsed` unchanged.
- Chain anything else. Assert `freeMoves === 1`, `turnsUsed` unchanged.
- Chain anything else again. Assert `freeMoves === 0`, `turnsUsed += 1`.

**Manual verify:** Activate Turkey. Find and chain Turkey tiles. Confirm the turn
counter (HUD dots) does not advance for 2 chains after the Turkey chain. Ask: *Does
the free move feel like a reward? Is the 2-turn window long enough to matter?*

---

### 5.8 — Species UI panel

**File:** `src/features/species/index.jsx`

Full-screen panel accessible from Bottom Nav ("Species" or "Fields"):
- Biome tabs (Farm; Mine tab locked until Phase 9)
- Category sections with header (Grass, Grain, Wood, Berry, Bird)
- Per species card:
  - Tile illustration (same size as board tile, 74px)
  - Name and flavor text
  - Active toggle switch (disabled if not discovered)
  - If discovered and inactive: shows free moves if applicable
  - If not discovered:
    - If `discoveryMethod === "chain"`: "Discover via long chains of [parent]"
    - If `discoveryMethod === "research"`: progress bar `N/cost [parent]`, Start Research
      button
    - If `discoveryMethod === "buy"`: "Discover now: N◉" button
  - Faint connecting lines between species in unlock order

**Tests:**
- Render panel with `discovered.wheat = false`. Assert wheat tile shows locked state.
- Dispatch `SPECIES/DISCOVER { key: "wheat" }`. Assert wheat shows active toggle.
- Toggle wheat active. Assert hay (same category) shows as inactive.

**Manual verify:** Open Species panel. Locked species show greyed illustration. Research
progress bar updates in real time as you play. Toggle a species — confirm it appears
on the board in the next session.

---

## Phase 6 — NPC & Social Layer (Full)

**Goal (player experience):** NPCs feel like characters, not order machines. The player
wants to keep their mood up because the bonus is visible and meaningful — not to avoid
a penalty.

---

### 6.1 — Bond modifier visible on order cards

**File:** `src/ui.jsx` — `CompactOrders` component

Each order card must show the mood modifier next to the reward:
- `+135◉ ×1.00` (Warm)
- `+135◉ ×1.25` (Beloved, in gold)
- `+94◉ ×0.70` (Sour, in muted red — should rarely be seen since bond starts at 5)

**Test:** Render order card with `bond = 9` (Liked). Assert `×1.15` modifier displayed.

---

### 6.2 — Gift system fully implemented

Full implementation of gift-giving in Townsfolk modal:
- Gift picker shows all current inventory items
- Favorite gift badge (gold star) and disliked gift badge (red X) on items
- Gifting costs 1 of the item; grants bond delta per gift type (+0.5 favorite, +0.2 other)
- Audio: `npcBubble` SFX + NPC bubble showing reaction
- Cannot gift if inventory empty for that item

**Tests:**
- Gift Mira flour (her favorite). Assert `bond.mira += 0.5`. Assert flour inventory -1.
- Gift Mira hay (not favorite, not disliked). Assert `bond.mira += 0.2`.
- Gift with 0 flour in inventory. Assert no-op.

---

### 6.3 — NPC dialog pools

Each NPC has 3 dialog pools: cold (bond 1–4), warm (bond 5–6), close (bond 7–10).
Pools contain 8–10 lines each for: order request, order fulfilled, gift received (favored),
gift received (other).

**File:** `src/features/mood/dialog.js`

Used in: order card flavor text, NPC speech bubbles, gift reaction bubbles.

**Test:** `getDialog("mira", "order_fulfilled", bond=9)` returns a string from the
"close" pool.

---

## Phase 7 — Quests, Almanac & Achievements

**Goal (player experience):** There is always something to work toward besides the main
story. Short-term (quests), medium-term (almanac), and long-term (achievements) loops
all pay rewards that feel meaningful.

---

### 7.1 — Daily quests (full system)

Generate 6 quests per season reset. Quests target: resource collection, chain lengths,
orders fulfilled, buildings built, crafting counts. Each quest has a coin reward and
almanac XP reward.

Quest generation must not produce impossible quests (e.g., "Collect 10 flour" before
the Mill is built). Filter against `built` state.

**Test:** Generate quests with `built = {}` (no buildings). Assert no quest requires
a crafted item. Generate with `built.bakery = true`. Assert bread quests can appear.

**Manual verify:** Claim all 6 quests in one season. Confirm XP bar advances. Confirm
almanac tier is reachable at the documented pace.

---

### 7.2 — Almanac (5 tiers, structural reward at Tier 3)

Compress from 10 flat tiers to 5 tiers with increasing XP gates and one structural
reward at Tier 3 (permanent extra starting tool or +1 daily quest slot):

| Tier | XP Required | Reward |
|---|---|---|
| 1 | 150 | 100◉ + 1 Seedpack |
| 2 | 400 | 2 Shuffle Horns + 150◉ |
| 3 | 800 | **+1 permanent daily quest slot** (structural) |
| 4 | 1,400 | 1 Lockbox + 250◉ |
| 5 | 2,200 | Rare tool + 500◉ |

**Tests:**
- Accumulate 800 XP. Assert Tier 3 claimable.
- Claim Tier 3. Assert `state.extraQuestSlots === 1` (or whichever structural reward).

---

### 7.3 — Achievements with correct counting

Audit all 23 achievements against their trigger actions. Common issues:
- "Collect 100 hay" must count across all sessions (lifetime total, not single session)
- "Build 5 buildings" must not count the pre-built Hearth as a player action
- "Complete a chain of 8+" must count by chain length, not tiles collected

Each achievement type has a corresponding counter in state. Bubble fires once on
completion. Reward is auto-claimed via the auto-claim pattern (no extra click needed).

**Test:** Collect 99 hay lifetime. Assert achievement not triggered. Collect 1 more.
Assert achievement triggered and reward applied.

---

## Phase 8 — Boss Events & Weather (Full)

**Goal (player experience):** The year-end boss is a genuine event. The board feels
different during the boss challenge. Victory is satisfying. Weather changes how you play
for 1–3 turns.

---

### 8.1 — Boss board modifiers (all 4 bosses)

Every boss must have a `boardModifier` that changes how the puzzle plays during its
1-season window. Modifiers are set in registry and read by GameScene.

| Boss | Modifier |
|---|---|
| Frostmaw | `minChain: 5` (already implemented — keep as-is) |
| Quagmire | Extra hay/log tiles respawn at 2× frequency in `randomResource()` |
| Ember Drake | "Heat tiles" appear — random tiles become heat-damaged (orange tint); chaining them produces half resources but counts toward Drake goal |
| Old Stoneface | "Rubble tiles" block 3 random cells; cleared after being chained once |

**Tests:**
- Quagmire active: run `randomResource()` 1000 times. Assert hay + log appear > 60%.
- Old Stoneface: 3 tiles must be rubble type on board fill.

**Manual verify:** Trigger each boss via dev tools. Play 3 turns. Confirm the board
modification is visible and changes how you play. Ask: *Is the boss pressure real?
Does the modifier make the challenge harder in a fun way?*

---

### 8.2 — Boss reward scales by year

**File:** `src/features/boss/slice.js`

Replace flat `+200◉` with `200 × yearNumber`:

```js
const reward = 200 * (state.seasonsCycled / 4 + 1);
```

Also add one non-coin reward (a tool or rune) per boss victory. Define reward tables
per boss in `BOSS_META`.

**Test:** Win Frostmaw in year 1. Assert `+200◉`. Win in year 3. Assert `+600◉`.

---

### 8.3 — 1-season boss window

**File:** `src/features/boss/slice.js`

Boss `turnsLeft` counts down board turns, not seasons. Boss starts at `turnsLeft = 10`
(one full season). Decrement in `CHAIN_COLLECTED`, not `CLOSE_SEASON`.

Update boss panel to display "10 turns left" (board turns), not "5 seasons left".

**Test:** Dispatch `CHAIN_COLLECTED` 10 times with boss active. Assert boss resolves
as defeat (if goal not met) on the 10th dispatch.

---

## Phase 9 — Mine Biome (Full)

*Only begin this phase once Farm (Phases 0–8) is fully playable, polished, and
feels complete as a standalone experience.*

**Goal (player experience):** Mine feels like a different puzzle experience from Farm.
The resource chain serves a different role (building materials, runes) and the hazards
create a different kind of tension.

---

### 9.1 — Full Mine resource chain wired to board

All 5 Mine resource chains (stone→cobble→block, ore→ingot, coal→coke, gem→cutgem,
gold) must spawn on the board and be collectable. Mine pool: `[stone, stone, ore, ore,
coal, coal, gem, gold]`. All thresholds from GAME_SPEC.md §4.

---

### 9.2 — Mysterious Ore countdown tile

A special tile type (not in the pool — spawns by logic). Appears overlaid on a Dirt
tile with a countdown timer (4 turns). Must be chained with adjacent Dirt tiles before
the timer expires. Success = 1 Rune earned. Failure = degrades to ordinary Dirt. Timer
decrements in `CHAIN_COLLECTED`.

---

### 9.3 — Mine hazards (all 3)

Full implementations:
- **Lava**: Spreads to adjacent tiles each turn; chain lava tiles to contain; Water Pump
  tool extinguishes (changes lava → rubble).
- **Exploding Gas**: 3 connected clouds trigger explosion; neutralise individual clouds
  by chaining; Flint tool converts gas → rubble.
- **Moles**: Consume tiles around them; Explosives tool removes them.

---

### 9.4 — Mine workers wired

Apply Mine worker effects (Digger, Excavator, Stone Miner, etc.) using the same
`computeWorkerEffects()` system from Phase 4. All 6 Mine workers from GAME_SPEC.md
must be defined in apprentices data.

---

## Phase 10 — Content Depth (Farm Expansion)

*Only after Mine is at Phase 9 level. Expand Farm's variety before adding Sea.*

- Full Farm tool catalog (all 18 tools from REFERENCE_CATALOG.md)
- All Farm workers from REFERENCE_CATALOG.md that apply to implemented resources
- Farm hazards (Rats, Fire, Wolves) with their counter tools/workers
- More species unlock tree entries (extend beyond 5 base species)
- Pool draft mechanic: each season, present 3 cards "pick a pool tilt" (e.g., "Wheaten
  Spring": wheat 2× weight)

---

## Phase 11 — Polish + Accessibility

- Audio completeness audit: chain start, chain extend, upgrade earned, order fulfilled,
  level up, season transition, building constructed, boss defeated
- Haptics (`navigator.vibrate`) gated by `settings.hapticsOn`
- Reduced motion: skip SWAY, skip shakeForChain, skip radial flash, collapse uses
  `duration: 0`
- Color blind mode: stamp unique shape glyph on each tile texture family
- Tutorial updates for species toggle, Mine entry, tool placement
- PWA manifest + service worker for install-to-homescreen and offline play

---

## Phase 12 — Infrastructure + Monetization Hooks

- Analytics stubs (`src/analytics.js`) with calls at: session_start, session_end,
  level_up, building_built, boss_defeated, iap_prompt_shown, daily_login
- IAP stub: "Get Workers" button in store modal (no real purchase; stubs the flow)
- Cloud save stub: `uploadSave` / `downloadSave` no-ops hooked into `persistState`
- ESLint + Prettier config (no `react-hooks/exhaustive-deps` violations in existing code)
- Vitest unit test suite for all reducer functions (covers A3, A5, A11, A17 regression
  prevention)

---

## Dependency Graph

```
Phase 0  (bugs)
    ↓
Phase 1  (chain model + tools)     ← board must be correct before anything else
    ↓
Phase 2  (story)                   ← needs correct board + actions
    ↓
Phase 3  (economy)                 ← needs story NPCs for context
    ↓
Phase 4  (workers)                 ← needs threshold model (Phase 1)
    ↓
Phase 5  (species)                 ← needs pool/threshold system (Phases 1+4)
    ↓
Phase 6  (NPCs/social)             ← needs story arrivals (Phase 2)
    ↓
Phase 7  (quests/almanac)          ← needs orders + chain events
    ↓
Phase 8  (bosses/weather)          ← needs season system (Phase 0)
    ↓
Phase 9  (Mine)                    ← Farm must be polished first
    ↓
Phase 10 (Farm expansion)          ← add variety after Mine validates the loop
    ↓
Phases 11+12 (polish/infra)        ← last
```

Sea biome: not on the roadmap yet. Only schedule it after Phase 10 is complete and
the game is demonstrably high-value with Farm + Mine alone.
