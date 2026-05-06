# Development Roadmap — Hearthwood Vale

*Last updated 2026-05-06. For game design and mechanics, see GAME_SPEC.md.*

---

## How to use this document

Every task follows this structure, in order:

1. **What this delivers** — player-facing one-liner.
2. **Completion Criteria** — binary checklist written *before* any code is touched. If any item is unchecked, the task is not done.
3. **Validation Spec (write before code — red phase)** — exact test cases to write first and watch fail. Includes unit tests and a gameplay simulation script (persona, steps, designer reflection).
4. **Implementation** — file references and approach to make the tests green.
5. **Manual Verify Walk-through** — ordered browser steps. You must perform them; typing tests alone is not enough.
6. **Phase Sign-off Gate** at the end of each phase — all conditions must hold before the next phase starts.

**TDD red-green rule:** Write the test file, run it, confirm the failure is the *expected* failure (not a compile error). Only then write implementation code.

**Horizontal slice rule:** Each phase must produce a fully playable, fun-to-open game. Do not start a new phase until the current one is genuinely enjoyable.

**Farm → Mine → Sea:** Do not add Mine until Farm is polished. Do not schedule Sea until Mine is polished.

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
- Boss system (Frostmaw works; others broken)

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
mismatched constants. These fixes are pre-conditions for all feature work.

**Entry check:** Before starting any task in this phase, run `runSelfTests()` in the
browser console and document the current failure count. The goal is zero failures by
Phase 0 Sign-off.

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

Before moving to Phase 1, every item below must be checked:

- [ ] `runSelfTests()` in the browser console returns zero failures
- [ ] 0.1–0.12 Completion Criteria all checked
- [ ] Manual Verify Walk-throughs performed for all tasks that list them
- [ ] `npm run build` succeeds with no warnings
- [ ] Fresh game (cleared localStorage): all NPCs show Warm, orders have 3 distinct NPCs, board is 6×6, 10 turn dots visible
- [ ] 3 full sessions played (start → 4 seasons → year end) without observing any of the bugs listed in "Broken / Missing" above
- [ ] No new console errors introduced

---

## Phase 1 — Chain Mechanic Overhaul + Board Tools

**Goal (player experience):** Long chains feel powerful and worth planning. A chain of
6 hay is meaningfully better than 2 chains of 3. Players learn to route chains to the
endpoint. The board never softlocks. Tools visibly change the board.

**Entry check:** Phase 0 Sign-off Gate complete.

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

Play 10 full sessions (one full year each). Before moving to Phase 2, confirm all:

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

