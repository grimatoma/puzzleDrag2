# Phase 0 — Critical Bug Fixes

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal:** The game runs correctly. No silent data corruption, no dead-code mechanics, no
mismatched constants. These fixes are pre-conditions for all feature work.

**Entry check:** Before starting any task in this phase, run `runSelfTests()` in the
browser console and document the current failure count. The goal is zero failures by
Phase 0 Sign-off.

> Every task uses the standard 6-section structure: *What this delivers / Completion
> Criteria / Validation Spec (write before code — red phase) / Implementation / Manual
> Verify Walk-through*. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 0.1 — Grid size: commit to 6×6

**What this delivers:** The board is a square 6×6 grid matching the game spec.

**Completion Criteria:**
- [ ] `ROWS === 6` in `src/constants.js`
- [ ] `runSelfTests()` asserts `ROWS === 6 && COLS === 6`
- [ ] Board renders as a square 6×6 grid with no blank bottom row

**Validation Spec — write before code:**

*Test (red phase) — add to `runSelfTests()` in `src/utils.js`:*
```js
assert(ROWS === 6, "ROWS must be 6");
assert(COLS === 6, "COLS must be 6");
```
Run — confirm failure: `ROWS must be 6`.

*Gameplay simulation:* Open the game as a new player. Count the board rows. A 7-row
board reads as "tall" rather than "square". The square 6×6 is the target feel.

**Implementation:**
- `src/constants.js:7` — change `ROWS` from `7` to `6`.
- Grep `GameScene.js` for hardcoded `7` (there are none beyond the constant, but verify).

**Manual Verify Walk-through:**
1. `npm run dev` → open browser.
2. Count rows on the board. Confirm 6 × 6.
3. Play one chain. Confirm collapse fills correctly (no gap at bottom).

---

### 0.2 — Turn count: MAX_TURNS = 10

**What this delivers:** Seasons run for 10 turns as designed; season transitions fire at
the right moment; apprentice season math no longer always returns 0.

**Completion Criteria:**
- [ ] `MAX_TURNS === 10` in `src/constants.js`
- [ ] `seasonIndexForTurns` returns correct season for turns 0, 3, 6, 9, 10
- [ ] Season modal fires after turn 10, not turn 8
- [ ] Apprentice `season` calculation uses `MAX_TURNS` not the hardcoded `10` literal

**Validation Spec — write before code:**

*Tests (red phase) — `runSelfTests()`:*
```js
assert(MAX_TURNS === 10, "MAX_TURNS must be 10");
assert(seasonIndexForTurns(0)  === 0, "turn 0 → Spring");
assert(seasonIndexForTurns(3)  === 1, "turn 3 → Summer");
assert(seasonIndexForTurns(6)  === 2, "turn 6 → Autumn");
assert(seasonIndexForTurns(9)  === 3, "turn 9 → Winter");
assert(seasonIndexForTurns(10) === 3, "turn 10 → still Winter");
```
Run — confirm failures before touching code.

*Gameplay simulation (new player, first session):* Count the HUD turn dots as you play.
With MAX_TURNS=8, the season ended "too soon" — the player just got going and it
flipped. With 10, test whether you have enough time to feel the season before it ends.
Designer reflection: *Does 10 turns per season feel long enough to build momentum but
short enough to stay tense?*

**Implementation:**
- `src/constants.js:10` — change `MAX_TURNS` from `8` to `10`.
- `src/utils.js:seasonIndexForTurns` — update season breakpoints:
  - turns ≤ 2 → Spring, ≤ 5 → Summer, ≤ 8 → Autumn, else Winter.
- `src/features/apprentices/slice.js:42,74` — replace `/10` divisor with `/ MAX_TURNS`
  (import `MAX_TURNS` from constants).

**Manual Verify Walk-through:**
1. New game. HUD shows 10 turn dots (not 8).
2. Play all 10 turns. Confirm season modal fires on turn 10.
3. Confirm all 4 seasons display in the bar before the modal fires.

---

### 0.3 — Move `seasonsCycled` to core state

**What this delivers:** `seasonsCycled` lives where it belongs; cross-slice dependency
is removed; achievements slice can be deleted or moved without breaking season tracking.

**Completion Criteria:**
- [ ] `seasonsCycled` not present in `src/features/achievements/slice.js:initial`
- [ ] `seasonsCycled: 0` present in `initialState()` in `src/state.js`
- [ ] `CLOSE_SEASON` in `coreReducer` increments `state.seasonsCycled`
- [ ] Achievements slice reads from shared state, not local initial

**Validation Spec — write before code:**

*Tests (red phase):*
```js
// initial state has seasonsCycled in core
const s0 = initialState();
assert("seasonsCycled" in s0, "seasonsCycled must be in core state");
assert(s0.seasonsCycled === 0, "initial seasonsCycled is 0");

// CLOSE_SEASON increments it
const s1 = coreReducer(s0, { type: "CLOSE_SEASON" });
const s2 = coreReducer(s1, { type: "CLOSE_SEASON" });
assert(s2.seasonsCycled === 2, "seasonsCycled increments per CLOSE_SEASON");
```

**Implementation:**
- `src/features/achievements/slice.js:12` — remove `seasonsCycled: 0` from `initial`.
- `src/state.js` — add `seasonsCycled: 0` to `initialState()`.
- `src/state.js:CLOSE_SEASON` case in `coreReducer` — add
  `seasonsCycled: state.seasonsCycled + 1`.
- `src/features/achievements/slice.js` — wherever `state.seasonsCycled` is used,
  confirm it reads from the root state (no local override).

**Manual Verify Walk-through:**
1. Open the game. Open DevTools. `store.getState().seasonsCycled` → `0`.
2. Play through one full year (4 season closes). Assert `seasonsCycled === 4`.

---

### 0.4 — Fix mood `TURN_IN_ORDER` ordering bug

**What this delivers:** Completing an NPC order actually increases that NPC's bond
and applies the mood modifier to the reward. Bond progression is no longer silently
broken.

**Completion Criteria:**
- [ ] `TURN_IN_ORDER` action payload carries `npcKey` and `reward`
- [ ] `state.npcBond[npc]` increases by `0.3` on order completion
- [ ] Coins granted include the NPC's mood multiplier
- [ ] Townsfolk → Mood tab shows a heart increase after order completion

**Validation Spec — write before code:**

*Tests (red phase):*
```js
// bond increases on order turn-in
const s0 = { ...initialState(), npcBond: { mira: 5 } };
const s1 = rootReducer(s0, {
  type: "TURN_IN_ORDER",
  payload: { id: "order1", npcKey: "mira", reward: 100 }
});
assert(s1.npcBond.mira === 5.3, "bond increases by 0.3");

// coins include Warm multiplier (bond 5 = ×1.00)
assert(s1.coins === s0.coins + 100, "Warm mood yields ×1.00 reward");
```
Run — confirm failure: `bond increases by 0.3` (currently fires 0 increase).

*Gameplay simulation:* Fill one order. Open Townsfolk. Count the hearts before and
after. Designer reflection: *Is the +0.3 increment perceptible? Does the heart UI
give me enough feedback to care about bond?*

**Implementation:**

**Context:** `coreReducer` runs first and replaces the order with a new one (new id).
By the time mood's slice runs, `orders.find(o => o.id === id)` returns `undefined`.
The fix is to pass npcKey and reward in the action payload directly.

- `src/state.js` — When building the `TURN_IN_ORDER` action, read the order *before*
  replacing it:
  ```js
  const order = state.orders.find(o => o.id === id);
  return dispatch({ type: "TURN_IN_ORDER",
    payload: { id, npcKey: order.npc, reward: order.reward } });
  ```
- `src/features/mood/slice.js` — read `action.payload.npcKey` and
  `action.payload.reward` directly (no `orders.find` call).

**Manual Verify Walk-through:**
1. Open game. Note hearts on any NPC in Townsfolk.
2. Fulfill their order.
3. Open Townsfolk → Mood tab. Confirm hearts increased.

---

### 0.5 — NPC bond starts at 5 (Warm), not 1 (Sour)

**What this delivers:** New players are not silently taxed 30% on every order reward
for their entire first hour of play.

**Completion Criteria:**
- [ ] All NPC initial bond values are `5` in `src/features/mood/data.js`
- [ ] Bond band for `5` is "Warm" (×1.00 multiplier)
- [ ] Bond at exactly `5` does not decay on `CLOSE_SEASON`
- [ ] Bond above `5` decays toward `5` on `CLOSE_SEASON`

**Validation Spec — write before code:**

*Tests (red phase):*
```js
const s0 = initialState();
for (const npc of ["mira", "tomas", "bram", "liss", "wren"]) {
  assert(s0.npcBond[npc] === 5, `${npc} starts at Warm (5)`);
}

// decay: bond 7 → decays toward 5
let s = { ...s0, npcBond: { mira: 7 } };
for (let i = 0; i < 10; i++) s = rootReducer(s, { type: "CLOSE_SEASON" });
assert(s.npcBond.mira < 7, "bond decays from above 5");
assert(s.npcBond.mira >= 5, "bond doesn't decay below 5");

// no decay: bond exactly 5
let s2 = { ...s0, npcBond: { mira: 5 } };
for (let i = 0; i < 10; i++) s2 = rootReducer(s2, { type: "CLOSE_SEASON" });
assert(s2.npcBond.mira === 5, "bond at 5 stays at 5");
```

*Gameplay simulation (new player):* Open game. Check Townsfolk. All NPCs should read
"Warm" with a ×1.00 modifier on orders. Designer reflection: *Does starting at Warm
feel welcoming? Does it give the player something to aspire toward (Liked, Beloved)
without punishing them for existing?*

**Implementation:**
- `src/features/mood/data.js` — set all `npcBond` initial values to `5`.
- `src/features/mood/slice.js` — confirm band boundaries: Sour 1–4, Warm 5–6,
  Liked 7–8, Beloved 9–10. Remove any `> 5` guard on decay; replace with `> 5`.

**Manual Verify Walk-through:**
1. New game (clear localStorage). Open Townsfolk.
2. All 5 NPCs show "Warm" and ×1.00 on their order cards.
3. Play 5 seasons without gifting. Confirm bonds stay at 5 (no drift below).

---

### 0.6 — Remove `memoryPerks` phantom prop

**What this delivers:** React renders cleanly; no `undefined` prop silently passed to
Phaser every render cycle.

**Completion Criteria:**
- [ ] `memoryPerks` removed from `prototype.jsx:169` and `PhaserMount` signature
- [ ] `initialState()` contains no `memoryPerks` key
- [ ] No console warnings about unrecognized props on mount

**Validation Spec — write before code:**

*Tests (red phase):*
```js
const s = initialState();
assert(!("memoryPerks" in s), "initialState must not contain memoryPerks");
```
Also: add a console.warn spy in a test to assert no prop-type warnings on PhaserMount.

**Implementation:**
- `prototype.jsx:169` — remove `memoryPerks={state.memoryPerks}`.
- `PhaserMount` function signature — remove the `memoryPerks` parameter.
- Grep codebase for any other `memoryPerks` references and remove all.

**Manual Verify Walk-through:**
1. Open DevTools console. Load game. Confirm zero React prop warnings.

---

### 0.7 — Centralise `gained` formula

**What this delivers:** The resource gain formula lives in one place. Phase 1 changes
it in one spot rather than hunting across files.

**Completion Criteria:**
- [ ] `resourceGainForChain(n)` exported from `src/utils.js`
- [ ] Both `src/GameScene.js:collectPath()` and `src/state.js:CHAIN_COLLECTED` import
  and use it (no inline `>= 6 ? 2 : 1` logic)
- [ ] Chain badge shows effective gained value, not raw `path.length`

**Validation Spec — write before code:**

*Tests (red phase):*
```js
assert(resourceGainForChain(3)  === 3,  "chain 3 → gain 3");
assert(resourceGainForChain(5)  === 5,  "chain 5 → gain 5");
assert(resourceGainForChain(6)  === 12, "chain 6 → double gain");
assert(resourceGainForChain(7)  === 14, "chain 7 → double gain");
```
Run — confirm `resourceGainForChain is not defined`.

*Note:* This formula is a placeholder until Phase 1 replaces it with the per-resource
threshold model. Centralising now means Phase 1 only changes one place.

**Implementation:**
- `src/utils.js` — add:
  ```js
  export function resourceGainForChain(chainLength) {
    return chainLength * (chainLength >= 6 ? 2 : 1);
  }
  ```
- `src/GameScene.js:collectPath()` — import and call `resourceGainForChain`.
- `src/state.js:CHAIN_COLLECTED` — same. Remove both inline formulas.
- Fix chain badge text to display `gained` (the computed value), not `path.length`.

**Manual Verify Walk-through:**
1. Chain exactly 6 hay. Confirm the floater shows `+12 Hay`, not `+6 Hay`.
2. Chain 7 hay. Confirm floater shows `+14 Hay`.

---

### 0.8 — Fix `SWITCH_BIOME` duplicate NPC orders

**What this delivers:** Switching biomes always generates 3 orders from 3 different NPCs.

**Completion Criteria:**
- [ ] `SWITCH_BIOME` calls `makeOrder` with `excludeNpcs` threading
- [ ] No two of the 3 orders share the same NPC key
- [ ] Tested over 100 rapid switches (statistical check)

**Validation Spec — write before code:**

*Tests (red phase):*
```js
for (let i = 0; i < 100; i++) {
  const s = rootReducer(baseState, { type: "SWITCH_BIOME", payload: { key: "farm" } });
  const npcs = s.orders.map(o => o.npc);
  const unique = new Set(npcs);
  assert(unique.size === 3, `all 3 orders must have distinct NPCs (iteration ${i})`);
}
```

**Implementation:**
- `src/state.js:305` — replace `state.orders.map(() => makeOrder(key, state.level))` with:
  ```js
  const orders = [];
  for (let i = 0; i < 3; i++) {
    orders.push(makeOrder(key, state.level, orders.map(o => o.npc)));
  }
  ```

**Manual Verify Walk-through:**
1. Switch biomes 10 times rapidly. Confirm all 3 order NPCs are always distinct.

---

### 0.9 — Fix Ember Drake boss (forge-only progress)

**What this delivers:** Drake's challenge only counts actual forge (ingot) crafts, not
all crafts including Bakery bread.

**Completion Criteria:**
- [ ] Drake progress increments only when crafted recipe output is `ingot`
- [ ] Crafting `breadloaf` does NOT increment Drake progress
- [ ] Crafting `hinge` (ingot output) DOES increment Drake progress

**Validation Spec — write before code:**

*Tests (red phase):*
```js
const drakeState = { ...baseState, boss: { id: "ember_drake", progress: 0, goal: 5 } };
const s1 = rootReducer(drakeState, {
  type: "CRAFTING/CRAFT_RECIPE", payload: { key: "breadloaf" }
});
assert(s1.boss.progress === 0, "bread does not count for Drake");

const s2 = rootReducer(drakeState, {
  type: "CRAFTING/CRAFT_RECIPE", payload: { key: "hinge" }
});
assert(s2.boss.progress === 1, "hinge (ingot) counts for Drake");
```

**Implementation:**
- `src/features/boss/slice.js:246` — in `CRAFTING/CRAFT_RECIPE` handler:
  ```js
  const recipe = RECIPES[action.payload.key];
  if (!recipe || recipe.output !== "ingot") return state;
  ```

**Manual Verify Walk-through:**
1. Trigger Ember Drake via dev tools.
2. Craft bread in the Bakery. Confirm Drake progress bar does not move.
3. Craft ingot in the Forge. Confirm progress bar moves.

---

### 0.10 — Fix `DEV/RESET_GAME` to wipe all slice state

**What this delivers:** "Reset game" actually resets everything, including achievements,
boss, and NPC bonds.

**Completion Criteria:**
- [ ] After `DEV/RESET_GAME`, `state.trophies` is empty
- [ ] After reset, `state.coins === 0`
- [ ] After reset, all NPC bonds are back to `5`
- [ ] `settings` (volume, etc.) are preserved

**Validation Spec — write before code:**

*Tests (red phase):*
```js
let s = initialState();
s = { ...s, coins: 999, trophies: ["chain_10"], npcBond: { mira: 9 } };
s = rootReducer(s, { type: "DEV/RESET_GAME" });
assert(s.coins === 0, "coins reset");
assert(s.trophies.length === 0, "trophies reset");
assert(s.npcBond.mira === 5, "bond reset");
```

**Implementation:**
- `src/state.js:CLOSE_SEASON` block (wherever RESET lives) — replace partial reset with:
  ```js
  case "DEV/RESET_GAME": {
    clearSave();
    return { ...initialState(), settings: state.settings };
  }
  ```

**Manual Verify Walk-through:**
1. Play until achievements are earned. Press Reset in dev menu.
2. Confirm achievement count is zero. Confirm coins are zero.

---

### 0.11 — Implement drought and frost weather

**What this delivers:** Weather events actually change how the board plays, not just
display a label that does nothing.

**Completion Criteria:**
- [ ] `drought` reduces wheat and grain spawn probability by ~50%
- [ ] `frost` increases tile-fall animation duration (visual-only, but visible)
- [ ] Dead-code `[GAP]` comments on weather types removed from boss slice

**Validation Spec — write before code:**

*Tests (red phase):*
```js
// Mock registry: weather = "drought"
const counts = { wheat: 0, grain: 0, other: 0 };
for (let i = 0; i < 1000; i++) {
  const key = mockRandomResource("drought");
  if (key === "wheat" || key === "grain") counts[key]++;
  else counts.other++;
}
const affected = counts.wheat + counts.grain;
assert(affected < 200, "drought: wheat+grain appear <20% (baseline ~33%)");
```

*Gameplay simulation (farmer persona):* Trigger drought. Play 3 turns. Notice the
scarcity of grain. Try to fulfil an order that needs flour. Designer reflection:
*Does drought create genuine strategic tension? Is 50% reduction harsh enough to
matter but not so harsh it's frustrating?*

**Implementation:**
- `src/GameScene.js:randomResource()` — read `registry.get("weather")`:
  - `drought`: for each candidate tile, if it's `wheat` or `grain`, skip it with 50%
    probability (re-roll once).
  - `frost`: no spawn change. In `fillBoard()`, if weather is frost, increase fall
    tween `duration` by 120ms per tile.
- `src/features/boss/slice.js` — remove `[GAP]` comments on drought/frost cases.

**Manual Verify Walk-through:**
1. Dev tools → set weather to `drought`. Play 5 turns. Wheat and grain tiles are
   noticeably rare.
2. Set weather to `frost`. Tiles fall visibly more slowly.

---

### 0.12 — Gate dev menu behind `import.meta.env.DEV`

**What this delivers:** Dev buttons (Add Gold, Reset, Fill Storage) are invisible in
the production build.

**Completion Criteria:**
- [ ] Dev buttons wrapped in `{import.meta.env.DEV && <DevButtons />}`
- [ ] `npm run build` output does not contain the string "DEV/ADD_GOLD"

**Validation Spec — write before code:**

*Test (red phase):*
```sh
npm run build && grep -r "DEV/ADD_GOLD" dist/
# Must return no matches after fix
```
Before fix: grep will return matches. Run it and confirm.

**Implementation:**
- Locate the Settings or Menu component that renders dev actions.
- Wrap the entire dev section in `{import.meta.env.DEV && ( ... )}`.

**Manual Verify Walk-through:**
1. `npm run build`. Serve `dist/`. Confirm no dev buttons visible.
2. `npm run dev`. Confirm dev buttons still visible.

---

## Phase 0 Sign-off Gate

Before moving to [Phase 1](./phase-1-chain-mechanic.md), every item below must be checked:

- [ ] `runSelfTests()` in the browser console returns zero failures
- [ ] 0.1–0.12 Completion Criteria all checked
- [ ] Manual Verify Walk-throughs performed for all tasks that list them
- [ ] `npm run build` succeeds with no warnings
- [ ] Fresh game (cleared localStorage): all NPCs show Warm, orders have 3 distinct NPCs, board is 6×6, 10 turn dots visible
- [ ] 3 full sessions played (start → 4 seasons → year end) without observing any of the bugs listed in "Broken / Missing" above
- [ ] No new console errors introduced
