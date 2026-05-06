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

---

## Phase 2 — Story System & Win Condition

**Goal (player experience):** The game has a beginning, middle, and end. The first
session opens with Wren narrating the player's arrival at the abandoned vale and asking
for 20 hay to light the Hearth. Each major milestone is a story beat with a modal —
not a silent flag flip. The Harvest Festival in Act 3 is the win state. After winning,
the game continues in sandbox mode.

**Why now:** Phase 1 made the chain mechanic feel good. Without a story, that mechanic
is unanchored — the player has no reason to keep playing past session 2. Story beats
give every Phase 3+ system (market, workers, species) a narrative reason to exist.

**Entry check:** Phase 1 Sign-off Gate complete.

---

### 2.1 — Story state slice

**What this delivers:** A single source of truth for story progression. `storyAct`
(1–3), `storyBeat` (string id of the current open beat), and `storyFlags` (object of
booleans). Persisted to `localStorage`. All other story tasks read from this slice.

**Completion Criteria:**
- [ ] `src/story.js` module exists, exports `INITIAL_STORY_STATE`, `STORY_BEATS` array,
  and pure helpers `isBeatComplete(state, beatId)` and `nextPendingBeat(state)`
- [ ] Story state lives at `gameState.story = { act, beat, flags }`
- [ ] State is persisted via existing `localStorage` save path (added to save schema)
- [ ] `DEV/RESET_GAME` clears story state back to `INITIAL_STORY_STATE`
- [ ] All beats in `STORY_BEATS` have `{ id, act, title, body, trigger, onComplete }`
  matching the GAME_SPEC §15 arc

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { INITIAL_STORY_STATE, STORY_BEATS, isBeatComplete, nextPendingBeat } from "./story.js";

assert(INITIAL_STORY_STATE.act === 1, "story starts at act 1");
assert(INITIAL_STORY_STATE.beat === "act1_arrival", "first beat is arrival");
assert(Object.keys(INITIAL_STORY_STATE.flags).length === 0, "no flags set initially");

// Beat list shape
assert(STORY_BEATS.length >= 9, "at least 9 beats across 3 acts");
assert(STORY_BEATS.every(b => b.id && b.act && b.title && b.body && b.trigger),
       "every beat has required fields");
assert(STORY_BEATS.filter(b => b.act === 1).length >= 3, "act 1 has ≥3 beats");
assert(STORY_BEATS.filter(b => b.act === 3).length >= 3, "act 3 has ≥3 beats");

// Helpers
const s = { ...INITIAL_STORY_STATE, flags: { hearth_lit: true } };
assert(isBeatComplete(s, "act1_light_hearth") === true, "completed beat detected");
assert(nextPendingBeat(s).id !== "act1_light_hearth", "next pending skips completed");
```
Run — confirm: `Cannot find module './story.js'`.

*Gameplay simulation (new player, first 60 seconds):*
The new player opens the game for the first time. They expect to be told *who they
are* and *what they're doing here* within 10 seconds. They should not see a generic
"Match 3+ tiles" tutorial — they should see Wren say "The Hearth is cold. Bring me 20
hay and I'll light it." Story state must be ready to drive that opening modal before
any tile is rendered.

Designer reflection: *Does the player understand within 30 seconds why they're
collecting hay specifically, and not just farming for points?*

**Implementation:**
- New file `src/story.js`:
  ```js
  export const INITIAL_STORY_STATE = {
    act: 1,
    beat: "act1_arrival",
    flags: {},
  };

  export const STORY_BEATS = [
    // Act 1
    { id: "act1_arrival",       act: 1, title: "A Cold Hearth",
      body: "Wren: 'The vale was abandoned years ago. Bring me 20 hay — we'll light the Hearth.'",
      trigger: { type: "session_start" }, onComplete: { setFlag: "intro_seen" } },
    { id: "act1_light_hearth",  act: 1, title: "First Light",
      body: "Wren: 'The Hearth is alive again. Mira will be here soon.'",
      trigger: { type: "resource_total", key: "hay", amount: 20 },
      onComplete: { setFlag: "hearth_lit", spawnNPC: "mira" } },
    { id: "act1_first_bread",   act: 1, title: "Bread for the Vale",
      body: "Mira: 'Bake a loaf with me — I'll show you the oven.'",
      trigger: { type: "craft_made", item: "bread", count: 1 },
      onComplete: { setFlag: "first_craft", spawnNPC: "tomas" } },
    { id: "act1_build_mill",    act: 1, title: "The Mill Stands",
      body: "Tomas: 'A mill! Now we won't starve come winter.'",
      trigger: { type: "building_built", id: "mill" },
      onComplete: { setFlag: "mill_built", advanceAct: 2 } },
    // Act 2
    { id: "act2_bram_arrives",  act: 2, title: "The Smith",
      body: "Bram: 'I need a forge. The vale needs iron.'",
      trigger: { type: "act_entered", act: 2 }, onComplete: { spawnNPC: "bram" } },
    { id: "act2_first_hinge",   act: 2, title: "Iron in the Vale",
      body: "Bram: 'A hinge! Small thing — but it begins.'",
      trigger: { type: "craft_made", item: "iron_hinge", count: 1 },
      onComplete: { setFlag: "first_iron" } },
    { id: "act2_frostmaw",      act: 2, title: "Frostmaw Wakes",
      body: "Bram: 'The cold is a creature. Gather 30 logs this season or we burn the rafters.'",
      trigger: { type: "season_entered", season: "winter" },
      onComplete: { setFlag: "frostmaw_active", spawnBoss: "frostmaw" } },
    { id: "act2_liss_arrives",  act: 2, title: "The Healer",
      body: "Sister Liss: 'A child has fever. I need berries.'",
      trigger: { type: "boss_defeated", id: "frostmaw" },
      onComplete: { spawnNPC: "liss", advanceAct: 3 } },
    // Act 3
    { id: "act3_mine_found",    act: 3, title: "The Mine",
      body: "Wren: 'I found a sealed mine. Stone and coal will open it.'",
      trigger: { type: "act_entered", act: 3 },
      onComplete: { setFlag: "mine_revealed" } },
    { id: "act3_mine_opened",   act: 3, title: "Into the Dark",
      body: "Wren: 'The seal is broken. The mine is yours.'",
      trigger: { type: "resource_total_multi", req: { stone: 20, coal: 10 } },
      onComplete: { setFlag: "mine_unlocked", unlockBiome: "mine" } },
    { id: "act3_caravan",       act: 3, title: "The Caravan Post",
      body: "Tomas: 'Far traders are coming. The vale is on the map again.'",
      trigger: { type: "building_built", id: "caravan_post" },
      onComplete: { setFlag: "caravan_open" } },
    { id: "act3_festival",      act: 3, title: "The Harvest Festival",
      body: "Mira: 'Fill the larder — 50 each of hay, wheat, grain, berry, log. The vale will feast.'",
      trigger: { type: "all_buildings_built" },
      onComplete: { setFlag: "festival_announced" } },
    { id: "act3_win",           act: 3, title: "The Vale Lives",
      body: "The festival larder is full. Hearthwood Vale lives again. (Sandbox mode continues.)",
      trigger: { type: "resource_total_multi",
                 req: { hay: 50, wheat: 50, grain: 50, berry: 50, log: 50 } },
      onComplete: { setFlag: "isWon" } },
  ];

  export function isBeatComplete(state, beatId) {
    const beat = STORY_BEATS.find(b => b.id === beatId);
    if (!beat) return false;
    const flagKey = beat.onComplete?.setFlag;
    return flagKey ? !!state.flags[flagKey] : false;
  }

  export function nextPendingBeat(state) {
    return STORY_BEATS.find(b => b.act <= state.act && !isBeatComplete(state, b.id));
  }
  ```
- `src/GameScene.js` — add `gameState.story = { ...INITIAL_STORY_STATE }` in `createInitialState()`.
- Save/load: extend the save schema to include `story`. On load, merge with
  `INITIAL_STORY_STATE` so older saves keep the rest of their state.
- `DEV/RESET_GAME` handler — reset `gameState.story` to a fresh clone of `INITIAL_STORY_STATE`.

**Manual Verify Walk-through:**
1. Open browser console. `window.gameState.story` shows `{act:1, beat:"act1_arrival", flags:{}}`.
2. Set `gameState.story.flags.hearth_lit = true`. Save (refresh page). Confirm flag persists.
3. Run `DEV/RESET_GAME`. Confirm story state resets to act 1, no flags.
4. `runSelfTests()` passes all 2.1 assertions.

---

### 2.2 — Story trigger evaluator

**What this delivers:** A single function that runs after every game event and fires
the next pending beat if its trigger condition is met. The game emits events
(`resource_total`, `craft_made`, `building_built`, `season_entered`, `boss_defeated`,
`act_entered`, `session_start`, `all_buildings_built`); the evaluator matches them.

**Completion Criteria:**
- [ ] `evaluateStoryTriggers(state, event)` exported from `src/story.js`
- [ ] Returns `{ firedBeat, newFlags, sideEffects }` or `null` if nothing fires
- [ ] All 8 trigger `type` values from §2.1 are handled
- [ ] Pure function — does not mutate `state`
- [ ] `GameScene` calls `evaluateStoryTriggers` in: `commitChain()`, `bake()`, `build()`,
  `advanceTurn()`, `defeatBoss()`, `init()` (once with `session_start`)
- [ ] Beats fire in order — never skip a pending beat even if a later trigger is met first

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { INITIAL_STORY_STATE, evaluateStoryTriggers } from "./story.js";

// Wrong event → nothing fires
let r = evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "craft_made", item: "bread" });
assert(r === null, "non-matching event returns null");

// session_start fires the arrival beat
r = evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "session_start" });
assert(r && r.firedBeat.id === "act1_arrival", "session_start fires arrival");
assert(r.newFlags.intro_seen === true, "arrival sets intro_seen");

// resource_total fires the hearth beat after arrival
const afterArrival = { ...INITIAL_STORY_STATE,
  flags: { intro_seen: true }, beat: "act1_light_hearth" };
r = evaluateStoryTriggers(afterArrival, { type: "resource_total", key: "hay", amount: 20 });
assert(r && r.firedBeat.id === "act1_light_hearth", "20 hay fires hearth beat");
assert(r.sideEffects.spawnNPC === "mira", "spawns mira");

// Below threshold does NOT fire
r = evaluateStoryTriggers(afterArrival, { type: "resource_total", key: "hay", amount: 19 });
assert(r === null, "19 hay does not fire");

// Out-of-order: a later beat's trigger fires before earlier beat → ignored
const stillEarly = { ...INITIAL_STORY_STATE, beat: "act1_light_hearth" };
r = evaluateStoryTriggers(stillEarly, { type: "building_built", id: "mill" });
assert(r === null, "later beat does not fire while earlier beat pending");

// Purity
const before = JSON.stringify(INITIAL_STORY_STATE);
evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "session_start" });
assert(JSON.stringify(INITIAL_STORY_STATE) === before, "evaluator does not mutate state");
```
Run — confirm: `evaluateStoryTriggers is not exported from './story.js'`.

*Gameplay simulation (player session 1, turns 1–6):*
Player opens game. Modal: "A Cold Hearth — Wren: bring me 20 hay." They start chaining.
At turn 4, hay total reaches 22. The next chain commit should fire the `act1_light_hearth`
beat — Wren returns, modal opens, Mira spawns. Player must NOT see the bread beat fire
even though they happen to bake bread immediately after — the bread trigger is only
relevant after Mira arrives.

Designer reflection: *Does each beat feel like a reward for an action the player just
took? Does the order of beats match the order of natural play (don't ask for a forge
before the player has any iron)?*

**Implementation:**
- Append to `src/story.js`:
  ```js
  function triggerMatches(beat, event, state, totals) {
    const t = beat.trigger;
    if (t.type !== event.type && !(t.type === "act_entered" && event.type === "act_entered")) {
      return false;
    }
    switch (t.type) {
      case "session_start":     return true;
      case "act_entered":       return event.act === t.act;
      case "season_entered":    return event.season === t.season;
      case "resource_total":    return (totals[t.key] ?? 0) >= t.amount;
      case "resource_total_multi":
        return Object.entries(t.req).every(([k, v]) => (totals[k] ?? 0) >= v);
      case "craft_made":        return event.item === t.item && event.count >= (t.count ?? 1);
      case "building_built":    return event.id === t.id;
      case "boss_defeated":     return event.id === t.id;
      case "all_buildings_built": return event.allBuilt === true;
      default: return false;
    }
  }

  export function evaluateStoryTriggers(state, event, totals = {}) {
    const next = nextPendingBeat(state);
    if (!next) return null;
    if (!triggerMatches(next, event, state, totals)) return null;
    const newFlags = { ...state.flags };
    if (next.onComplete?.setFlag) newFlags[next.onComplete.setFlag] = true;
    return { firedBeat: next, newFlags, sideEffects: next.onComplete ?? {} };
  }
  ```
- `src/GameScene.js` event-emit points (each one calls `evaluateStoryTriggers` and, if
  non-null, calls `applyBeatResult(result)` which sets flags, spawns NPC/boss, advances
  act, and queues the modal for 2.3):
  - `init()` → emit `{ type: "session_start" }` if `!flags.intro_seen`
  - `collectPath()` → after inventory updated, emit `{ type: "resource_total", key, amount }`
    for each resource changed; also emit `resource_total_multi` with the full inventory snapshot
  - `bake()` → emit `{ type: "craft_made", item, count }`
  - `build()` → emit `{ type: "building_built", id }`, then if all buildings built
    also emit `{ type: "all_buildings_built", allBuilt: true }`
  - `advanceTurn()` → on season change, emit `{ type: "season_entered", season }`
  - `defeatBoss()` → emit `{ type: "boss_defeated", id }`
  - `applyBeatResult` with `advanceAct: N` → emit `{ type: "act_entered", act: N }` recursively

**Manual Verify Walk-through:**
1. New session. Console: `gameState.story.flags.intro_seen` is true after init.
2. Play to 20 total hay. Confirm `act1_light_hearth` fires (flag set, Mira added to NPC list).
3. Save inventory `gameState.inventory.hay = 100` via console — confirm only the
   *next* pending beat fires, not all beats whose triggers are now met.
4. Build mill before hearth lit (force via console). Confirm beat does NOT fire.
5. `runSelfTests()` passes all 2.2 assertions.

---

### 2.3 — Story modal UI

**What this delivers:** When a beat fires, a modal opens with the beat title, body
text, the speaking NPC's portrait, and a single "Continue" button. The game pauses
input behind the modal. Modal art uses the existing portrait textures.

**Completion Criteria:**
- [ ] `showStoryModal(beat)` method on `GameScene` queues a modal
- [ ] If a modal is already open, new beats queue and open in order on dismiss
- [ ] Modal blocks tile drag, tool use, and turn advance until dismissed
- [ ] ESC and Continue button both dismiss
- [ ] Modal width 480px, centered, semi-transparent black backdrop covering the canvas
- [ ] First-line speaker name parsed from beat body (e.g. `"Wren: ..."` → portrait = wren)
- [ ] Modals open within 200ms of the triggering event (no jarring delay)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
// Headless logic only — DOM/Phaser objects mocked
const queue = [];
const scene = { _modalQueue: queue, _modalOpen: false,
                showStoryModal(b) { queue.push(b); if (!this._modalOpen) this._modalOpen = true; } };

scene.showStoryModal({ id: "a", title: "A", body: "Wren: hi" });
assert(scene._modalOpen === true, "first modal opens immediately");
assert(queue.length === 1, "first modal queued");

scene.showStoryModal({ id: "b", title: "B", body: "Mira: hi" });
assert(queue.length === 2, "second modal queued behind first");

// Speaker parser
import { parseSpeaker } from "./story.js";
assert(parseSpeaker("Wren: bring me hay") === "wren", "parses Wren");
assert(parseSpeaker("Sister Liss: a child is sick") === "liss", "parses Sister Liss");
assert(parseSpeaker("The festival larder is full.") === null, "no speaker → null");
```
Run — confirm: `parseSpeaker is not exported from './story.js'`.

*Gameplay simulation (player on turn 4 of session 1):*
Player drags a chain of 8 hay; total reaches 22. As the floater animation finishes,
the modal opens within ~200ms with Wren's portrait on the left and "First Light —
Wren: 'The Hearth is alive again. Mira will be here soon.'" The player taps Continue,
the modal closes, and they see Mira's portrait now in the NPC strip. The game does
not advance the turn while the modal is open.

Designer reflection: *Does the modal feel like a story beat or like a popup ad? Is
the portrait large enough to recognize? Is the body text readable in 5 seconds?*

**Implementation:**
- Append to `src/story.js`:
  ```js
  const SPEAKER_MAP = {
    "Wren": "wren", "Mira": "mira", "Old Tomas": "tomas", "Tomas": "tomas",
    "Bram": "bram", "Sister Liss": "liss", "Liss": "liss",
  };
  export function parseSpeaker(body) {
    const m = body.match(/^([A-Z][a-zA-Z ]+?):/);
    return m ? (SPEAKER_MAP[m[1]] ?? null) : null;
  }
  ```
- `src/GameScene.js`:
  - Fields: `this._modalQueue = []`, `this._modalOpen = false`, `this._modalContainer = null`.
  - `showStoryModal(beat)` — push to queue; if `!_modalOpen`, call `_renderModal()`.
  - `_renderModal()` — pull next beat off queue. Build a Phaser container at scene depth
    9999: full-screen rect (`0x000000`, alpha 0.6), 480×320 panel (`0x1f1610`), title text
    (24px gold), body text (16px cream, word-wrapped 420px), portrait sprite (96×96) on
    left, "Continue" button (gold pill) bottom-right. Set `_modalOpen = true`.
  - `_dismissModal()` — destroy container, set `_modalOpen = false`, if queue non-empty
    call `_renderModal()` again.
  - Input gating: in `dragStart`, `useTool`, `endTurn`, etc., early-return if `_modalOpen`.
  - Keyboard: `this.input.keyboard.on("keydown-ESC", () => this._modalOpen && this._dismissModal())`.

**Manual Verify Walk-through:**
1. New session. Modal opens within ~1s of game ready: "A Cold Hearth — Wren: bring me 20 hay."
2. Try to drag a tile while modal open — drag does nothing.
3. Dismiss with ESC. Modal closes. Drag now works.
4. Force two beats simultaneously via console (`evaluateStoryTriggers` twice → push both).
   Confirm modals open one at a time — second opens after dismissing first.
5. Trigger `act1_light_hearth` by chaining hay. Confirm Mira's portrait shows (not Wren's).
6. `runSelfTests()` passes all 2.3 assertions.

---

### 2.4 — NPC arrival from story beats

**What this delivers:** The `spawnNPC` side effect from a beat actually adds the NPC
to the active roster. They get an order slot, a portrait in the NPC strip, and start
giving orders next season. Mira, Tomas, Bram, and Liss arrive via story beats; Wren
is present from session start.

**Completion Criteria:**
- [ ] Roster starts with `["wren"]` only — Mira/Tomas/Bram/Liss are NOT pre-spawned
- [ ] `applyBeatResult({spawnNPC: "mira"})` adds `"mira"` to roster
- [ ] Adding an NPC to roster gives them an order slot at next `assignOrders()` call
- [ ] An NPC already in roster is not duplicated if the beat fires twice (defensive)
- [ ] NPC strip in HUD updates to show new portraits within 1 frame
- [ ] If max active orders (3) is already filled, new NPC waits until a slot opens

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
// Roster shape after fresh init
const fresh = createInitialState();
assert(fresh.npcs.roster.length === 1, "roster starts with 1 NPC");
assert(fresh.npcs.roster[0] === "wren", "wren is the starting NPC");

// applyBeatResult adds NPC
const s1 = applyBeatResult(fresh, { spawnNPC: "mira" });
assert(s1.npcs.roster.includes("mira"), "mira added");
assert(s1.npcs.roster.length === 2, "roster has 2");

// Idempotent
const s2 = applyBeatResult(s1, { spawnNPC: "mira" });
assert(s2.npcs.roster.length === 2, "duplicate spawn ignored");

// Order assignment respects 3-slot cap
const s3 = { ...fresh, npcs: { roster: ["wren","mira","tomas","bram"], orders: [
  {npc:"wren"},{npc:"mira"},{npc:"tomas"}] } };
const s4 = assignOrders(s3);
assert(s4.npcs.orders.length === 3, "still 3 orders");
assert(!s4.npcs.orders.find(o => o.npc === "bram"), "bram waits — no slot open");
```
Run — confirm: `applyBeatResult is not defined` or roster starts with all 5 NPCs.

*Gameplay simulation (session 1 → 2):*
Session 1: Player sees only Wren in the NPC strip. No order slots show portraits of
other NPCs. After hitting 20 hay, Mira appears with a fanfare and her portrait slides
into the strip. Her first order shows up at the start of next season. The player
should *feel* the village growing — not see all 5 portraits greyed out from minute one.

Designer reflection: *Does the village feel like it's being built, or does it feel
like NPCs were always here and just got "unlocked"?*

**Implementation:**
- `src/GameScene.js:createInitialState()`:
  ```js
  npcs: { roster: ["wren"], orders: [], bonds: { wren: 5 } },
  ```
- `applyBeatResult(state, sideEffects)` (new method on scene, or pure helper):
  - If `sideEffects.spawnNPC` and not in roster: push to roster, set bond to 5.
  - If `sideEffects.advanceAct`: set `state.story.act` and recursively emit `act_entered` event.
  - If `sideEffects.unlockBiome`: set `state.unlockedBiomes[id] = true`.
  - If `sideEffects.spawnBoss`: set `state.boss = { id, season: currentSeason, progress: 0 }`.
  - If `sideEffects.setFlag`: set the flag (idempotent).
- `assignOrders()` — iterate roster, fill slots up to 3, skip NPCs already holding a slot.
- HUD redraw — `redrawNpcStrip()` reads `roster` and renders portraits in roster order.
- NPC arrival animation: portrait slides in from right, 300ms ease-out, with a soft
  chime sfx (use existing `playPing()` if no chime asset).

**Manual Verify Walk-through:**
1. New session. NPC strip shows only Wren.
2. Reach 20 hay. Modal fires. Dismiss. Mira's portrait slides in from the right.
3. Advance one season. Mira's first order appears in the orders panel.
4. Console: `applyBeatResult(gameState, {spawnNPC: "mira"})` again — confirm no duplicate.
5. Force-spawn a 4th NPC while 3 orders are active. Confirm new NPC's portrait shows
   but no order yet. Fulfil one order. Next assignment, new NPC gets the freed slot.
6. `runSelfTests()` passes all 2.4 assertions.

---

### 2.5 — Harvest Festival win condition

**What this delivers:** The `act3_win` beat fires when the player has collected 50
each of hay, wheat, grain, berry, and log *after* the festival was announced. A win
modal plays a brief celebration sequence, sets `isWon: true`, and the game continues
in sandbox mode (no progression locked, no further story beats).

**Completion Criteria:**
- [ ] Win beat only checks resources after `flags.festival_announced === true`
- [ ] Win modal is visually distinct (gold border, larger panel 600×400, slow fade-in
  over 800ms, ambient particles)
- [ ] On dismiss: `flags.isWon = true`, sandbox banner appears at top of HUD ("Sandbox Mode")
- [ ] After winning, no further story beats fire (all are completed)
- [ ] Save file persists `isWon` — reloading the won game keeps the banner
- [ ] Larder progress widget visible in HUD once festival announced (5 progress bars)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { evaluateStoryTriggers, INITIAL_STORY_STATE } from "./story.js";

// Pre-announcement: even with 50/50/50/50/50, win does NOT fire
const preAnnounce = { ...INITIAL_STORY_STATE, act: 3, beat: "act3_win", flags: {
  intro_seen: true, hearth_lit: true, first_craft: true, mill_built: true,
  first_iron: true, frostmaw_active: true, mine_revealed: true,
  mine_unlocked: true, caravan_open: true,
  /* festival_announced: false */
} };
const totals = { hay:50, wheat:50, grain:50, berry:50, log:50 };
let r = evaluateStoryTriggers(preAnnounce,
  { type: "resource_total_multi" }, totals);
assert(r === null, "win does not fire before festival announced");

// Post-announcement: same totals → win fires
const postAnnounce = { ...preAnnounce, flags: { ...preAnnounce.flags, festival_announced: true } };
r = evaluateStoryTriggers(postAnnounce,
  { type: "resource_total_multi" }, totals);
assert(r && r.firedBeat.id === "act3_win", "win fires");
assert(r.newFlags.isWon === true, "isWon set");

// 49 of one resource → no win
const short = { ...totals, log: 49 };
r = evaluateStoryTriggers(postAnnounce,
  { type: "resource_total_multi" }, short);
assert(r === null, "49 log does not win");
```
Run — confirm: tests fail because the gating check on `festival_announced` is missing.

*Gameplay simulation (player nearing the end, ~level 12):*
Player has all 8 buildings built. Festival modal fires: "Mira: Fill the larder — 50
each of hay, wheat, grain, berry, log." A 5-bar progress widget appears in the HUD.
Each chain that adds to a larder resource pulses the matching bar. When the last bar
fills, a slow gold fade washes the screen, particles drift, and the win modal opens.
"The Vale Lives." Dismissed → sandbox banner; the game still plays normally, orders
still come, but no new beats fire.

Designer reflection: *Does winning feel earned (the festival was announced ~3 sessions
ago, the bars filled gradually) or like a cliff edge? Does sandbox feel like reward
or like an empty room with the lights off?*

**Implementation:**
- `evaluateStoryTriggers` — for the `act3_win` beat specifically, additionally require
  `state.flags.festival_announced === true` before matching. (Already gated by
  `nextPendingBeat` ordering, but defensive double-check in the trigger handler.)
- `src/GameScene.js`:
  - Larder widget: `_renderLarderHud()` called when `flags.festival_announced`. 5 horizontal
    bars, each labeled with resource icon + `current/50`. Update on inventory change.
  - Win modal: extend `_renderModal()` to detect `beat.id === "act3_win"` and render
    gold-bordered 600×400 panel with particle emitter (Phaser `add.particles`) and
    800ms fade-in tween.
  - Sandbox banner: top of HUD, gold text "Sandbox Mode", visible if `flags.isWon`.
  - Save schema already includes `story` (from 2.1); `isWon` is just a flag.

**Manual Verify Walk-through:**
1. Console: set up state to be 1 hay short of win with festival announced.
   Chain that last hay. Confirm win modal opens with gold border + particles.
2. Confirm `gameState.story.flags.isWon === true` after dismiss.
3. Confirm sandbox banner shows at top of HUD.
4. Refresh the page. Confirm save persists `isWon` and banner still shows.
5. Continue playing — confirm orders still assign, market still works, no new modals.
6. Console: clear `festival_announced`, set inventory to 60 of each. Confirm win does
   NOT fire (gate works in reverse).
7. `runSelfTests()` passes all 2.5 assertions.

---

## Phase 2 Sign-off Gate

Play 3 full playthroughs from a fresh save to win condition (use console acceleration
to skip grind, but follow real beat order). Before moving to Phase 3, confirm all:

- [ ] 2.1–2.5 Completion Criteria all checked
- [ ] First-time player sees the arrival modal within 2 seconds of game ready
- [ ] All 13 beats fire in order in a real playthrough — none skipped, none out of order
- [ ] Each beat that spawns an NPC actually shows that NPC's arrival animation
- [ ] Frostmaw beat fires only when winter starts in act 2 — not act 1's winter
- [ ] Win modal feels celebratory, not abrupt; sandbox banner is clear
- [ ] Save/reload at every act boundary preserves story state correctly
- [ ] `runSelfTests()` passes for all Phase 2 tests
- [ ] Designer gut-check: *After session 1, does the player know who Wren and Mira are
  and why the Hearth matters? After winning, do they feel the vale grew under their care?*

