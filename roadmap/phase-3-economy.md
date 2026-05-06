# Phase 3 — Economy

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Coins stop being a single-purpose number and become a
real economy. The Caravan Post opens a Market with prices that drift each season — a
buy is sometimes a steal, sometimes a tax. The Kitchen turns surplus grain into
supplies, which feeds into Wren's Mine entrance. Mysterious Ore and bosses pay out
runes. The Powder Store hands the player two Bombs each season — a tactical 3×3
clear that feels devastating to use. And every day the player comes back, a small
gift is waiting.

**Why now:** Phase 2 wired the story arc; the player now reaches Act 3 with a
Caravan Post in the world, a Mine waiting to be opened, and a Magic Portal looming
on the horizon. Without an economy, those buildings are decorative — the player has
no reason to engage with the Caravan, no path through grain to Mine entry, and no
currency to ever spend on the Portal. Phase 3 makes the buildings *do something*.

**Entry check:** [Phase 2 Sign-off Gate](./phase-2-story.md#phase-2-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 3.1 — Market with daily price drift

**What this delivers:** Building the Caravan Post unlocks a Market screen. Each
resource has a buy price and a sell price (sell ≈ 5–10% of buy — emergency rates,
never optimal). On every season open, every price drifts ±15% from its base value
using a deterministic seed so save/load returns the same prices. The Market screen
shows the current price, an arrow indicating drift direction vs. last season, a
quantity stepper, and Buy/Sell buttons that validate against coins/inventory.

**Completion Criteria:**
- [ ] `MARKET_PRICES` constant in `src/constants.js` covers all 20 sellable resources from GAME_SPEC §10
- [ ] `src/market.js` module exports `driftPrices(seed, season)` and `applyTrade(state, action)`
- [ ] Drift is bounded: every price stays within ±15% of base across 1000 simulated seasons
- [ ] Drift is deterministic: same `(seed, season)` produces identical prices
- [ ] State holds `state.market = { seed, season, prices, prevPrices }` persisted in the save schema
- [ ] `BUY_RESOURCE` reducer case validates coins ≥ totalCost; otherwise no-op
- [ ] `SELL_RESOURCE` reducer case validates inventory ≥ qty; otherwise no-op
- [ ] Market screen reachable only after `state.built.caravan === true`
- [ ] Each row shows ▲ / ▼ / — drift arrow vs. `prevPrices`
- [ ] Quantity stepper clamps between 1 and inventory/coin-affordable max

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { MARKET_PRICES } from "./constants.js";
import { driftPrices, applyTrade } from "./market.js";

// Coverage: every farm + mine resource that can be bought has an entry
for (const k of ["hay","wheat","grain","flour","log","plank","beam","berry","jam","egg",
                 "stone","cobble","block","ore","ingot","coal","coke","gem","cutgem","gold"]) {
  assert(MARKET_PRICES[k], `MARKET_PRICES has ${k}`);
  assert(MARKET_PRICES[k].buy > MARKET_PRICES[k].sell * 5,
         `${k} sell is emergency rate (< buy/5)`);
}

// Drift bounds — sample 1000 seasons
const seed = 12345;
for (let s = 0; s < 1000; s++) {
  const p = driftPrices(seed, s);
  for (const k of Object.keys(MARKET_PRICES)) {
    const base = MARKET_PRICES[k].buy;
    assert(p[k].buy >= Math.floor(base * 0.85), `${k} buy ≥ -15% at season ${s}`);
    assert(p[k].buy <= Math.ceil(base * 1.15),  `${k} buy ≤ +15% at season ${s}`);
  }
}

// Determinism — same seed + season → same prices
const a = driftPrices(7, 4);
const b = driftPrices(7, 4);
assert(JSON.stringify(a) === JSON.stringify(b), "drift is deterministic");

// BUY validates coins
const broke = { coins: 10, inventory: {}, market: { prices: { hay: { buy: 40, sell: 0 } } } };
const r1 = applyTrade(broke, { type: "BUY_RESOURCE", payload: { key: "hay", qty: 1 } });
assert(r1 === broke, "insufficient coins → no-op (returns same state)");

// BUY succeeds when coins suffice
const flush = { coins: 100, inventory: {}, market: { prices: { hay: { buy: 40, sell: 0 } } } };
const r2 = applyTrade(flush, { type: "BUY_RESOURCE", payload: { key: "hay", qty: 2 } });
assert(r2.coins === 20, "coins debited 2×40");
assert(r2.inventory.hay === 2, "hay credited");

// SELL validates inventory
const empty = { coins: 0, inventory: { hay: 1 }, market: { prices: { hay: { buy: 40, sell: 0 } } } };
const r3 = applyTrade(empty, { type: "SELL_RESOURCE", payload: { key: "hay", qty: 5 } });
assert(r3 === empty, "selling more than owned → no-op");
```
Run — confirm: `Cannot find module './market.js'`.

*Gameplay simulation (mid-game player at start of session 6 — Caravan just unlocked):*
The player has 280 coins and 47 grain. They open the new Market button. Grain shows
buy 76◉ (▼ from 80◉ last season), sell 4◉ (no change). They want flour but the order
needs flour×3. Buying 3 flour at the drifted price would cost ~285◉; they only have
280. The Buy button greys out at qty=3 and accepts qty=2. They buy 2 flour, return
to the orders panel, and finish a partial chain to bake the third loaf. The drift
made flour just unaffordable enough to force a gameplay choice.

Designer reflection: *Does the ▲/▼ arrow on each row create the feeling of a living
market that's worth checking each season — or does it just look like noise the
player ignores?*

**Implementation:**
- `src/constants.js` — append:
  ```js
  export const MARKET_PRICES = {
    hay:    { buy: 40,  sell: 0  },
    wheat:  { buy: 60,  sell: 2  },
    grain:  { buy: 80,  sell: 4  },
    flour:  { buy: 100, sell: 6  },
    log:    { buy: 60,  sell: 2  },
    plank:  { buy: 80,  sell: 4  },
    beam:   { buy: 110, sell: 7  },
    berry:  { buy: 70,  sell: 3  },
    jam:    { buy: 90,  sell: 5  },
    egg:    { buy: 70,  sell: 3  },
    stone:  { buy: 50,  sell: 1  },
    cobble: { buy: 70,  sell: 3  },
    block:  { buy: 100, sell: 6  },
    ore:    { buy: 70,  sell: 3  },
    ingot:  { buy: 100, sell: 6  },
    coal:   { buy: 60,  sell: 2  },
    coke:   { buy: 80,  sell: 4  },
    gem:    { buy: 120, sell: 7  },
    cutgem: { buy: 200, sell: 14 },
    gold:   { buy: 100, sell: 5  },
  };
  ```
- New file `src/market.js`:
  ```js
  import { MARKET_PRICES } from "./constants.js";

  // Tiny deterministic 32-bit hash → [0, 1)
  function rand(seed, season, salt) {
    let x = (seed ^ (season * 73856093) ^ (salt * 19349663)) >>> 0;
    x = (x ^ (x >>> 16)) * 0x85ebca6b >>> 0;
    x = (x ^ (x >>> 13)) * 0xc2b2ae35 >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  export function driftPrices(seed, season) {
    const out = {};
    let salt = 0;
    for (const [k, base] of Object.entries(MARKET_PRICES)) {
      const buyMul  = 0.85 + rand(seed, season, salt++) * 0.30; // [0.85, 1.15)
      const sellMul = 0.85 + rand(seed, season, salt++) * 0.30;
      out[k] = {
        buy:  Math.max(1, Math.round(base.buy  * buyMul)),
        sell: Math.max(0, Math.round(base.sell * sellMul)),
      };
    }
    return out;
  }

  export function applyTrade(state, action) {
    const { key, qty } = action.payload;
    const p = state.market.prices[key];
    if (!p) return state;
    if (action.type === "BUY_RESOURCE") {
      const cost = p.buy * qty;
      if (state.coins < cost) return state;
      return { ...state,
        coins: state.coins - cost,
        inventory: { ...state.inventory, [key]: (state.inventory[key] ?? 0) + qty } };
    }
    if (action.type === "SELL_RESOURCE") {
      const owned = state.inventory[key] ?? 0;
      if (owned < qty) return state;
      return { ...state,
        coins: state.coins + p.sell * qty,
        inventory: { ...state.inventory, [key]: owned - qty } };
    }
    return state;
  }
  ```
- `src/state.js` — in `initialState()` add
  `market: { seed: Math.floor(Math.random()*1e9), season: 0, prices: driftPrices(seed,0), prevPrices: null }`.
  In the `CLOSE_SEASON` handler, set
  `prevPrices: state.market.prices, season: state.market.season + 1, prices: driftPrices(state.market.seed, state.market.season + 1)`.
  Add reducer cases `"BUY_RESOURCE"` and `"SELL_RESOURCE"` that delegate to `applyTrade`.
- `src/ui.jsx` — new `<MarketPanel />` shown only when `state.built.caravan`:
  rows from `MARKET_PRICES` keys, each row has icon, label, current buy/sell,
  ▲/▼/— arrow comparing `state.market.prices[k].buy` to `state.market.prevPrices?.[k]?.buy`,
  qty stepper (clamped by `Math.floor(state.coins / price.buy)` for buy, `inventory[k]` for sell),
  Buy and Sell buttons that dispatch `BUY_RESOURCE` / `SELL_RESOURCE`.

**Manual Verify Walk-through:**
1. Build the Caravan Post via dev cheat. Confirm a "Market" button appears in the bottom nav.
2. Open Market. Note the buy price for hay. Refresh the page. Confirm the same buy price (deterministic).
3. Close one season. Reopen Market. Note prices changed and an ▲ or ▼ arrow appears next to each row.
4. With 0 coins, try to buy 1 hay. Button is disabled. Coin total is unchanged.
5. With 200 coins, buy 3 hay. Confirm coins debited at the displayed price; inventory updated.
6. Try to sell 99 of a resource you own 1 of. Button disabled. Sell exactly 1; confirm sell price applied.
7. `runSelfTests()` passes all 3.1 assertions.

---

### 3.2 — Supply chain (grain → supplies → Mine entry)

**What this delivers:** The Kitchen building (already in §11 of GAME_SPEC) gains a
real function. A new `supplies` inventory item is added — not a board tile, never
spawns from chains. The Kitchen panel offers a converter: 3 grain → 1 supply, no
turn cost. The Mine entry (gated by the `act3_mine_opened` story beat from Phase 2)
costs 3 supplies to enter standard. This closes the loop: Farm produces grain, the
Kitchen turns surplus into supplies, supplies open the Mine.

**Completion Criteria:**
- [ ] `supplies` is a valid inventory key (no `MARKET_PRICES` entry — it's not tradable)
- [ ] `state.inventory.supplies` initialised to 0
- [ ] `CONVERT_TO_SUPPLY` reducer case: 3 grain → 1 supply; rejects if `grain < 3`
- [ ] Kitchen panel shows the converter only when `state.built.kitchen === true`
- [ ] Slider/stepper limits `qty` to `Math.floor(grain / 3)`
- [ ] `ENTER_MINE` reducer case: requires `supplies >= 3` and `state.story.flags.mine_unlocked`; deducts 3 supplies; sets `biomeKey: "mine"`
- [ ] Insufficient supplies surfaces a "Need 3 supplies" toast — no biome switch
- [ ] Supplies persist across sessions via the existing save schema

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";

const s0 = initialState();
assert(s0.inventory.supplies === 0, "supplies start at 0");

// Convert: 3 grain → 1 supply
let s1 = { ...s0, inventory: { ...s0.inventory, grain: 9 } };
s1 = rootReducer(s1, { type: "CONVERT_TO_SUPPLY", payload: { qty: 2 } });
assert(s1.inventory.grain === 3,  "grain debited 2×3");
assert(s1.inventory.supplies === 2, "supplies credited 2");

// Convert with insufficient grain → no-op
const poor = { ...s0, inventory: { grain: 2, supplies: 0 } };
const same = rootReducer(poor, { type: "CONVERT_TO_SUPPLY", payload: { qty: 1 } });
assert(same.inventory.grain === 2,    "grain unchanged on no-op");
assert(same.inventory.supplies === 0, "supplies unchanged on no-op");

// Mine entry blocked without unlock
const noUnlock = { ...s0, inventory: { supplies: 5 },
  story: { flags: {} }, biomeKey: "farm" };
const blocked = rootReducer(noUnlock, { type: "ENTER_MINE", payload: { mode: "standard" } });
assert(blocked.biomeKey === "farm", "mine locked → biome unchanged");

// Mine entry blocked without supplies
const noSupply = { ...s0, inventory: { supplies: 2 },
  story: { flags: { mine_unlocked: true } }, biomeKey: "farm" };
const blocked2 = rootReducer(noSupply, { type: "ENTER_MINE", payload: { mode: "standard" } });
assert(blocked2.biomeKey === "farm", "<3 supplies → biome unchanged");

// Successful entry
const ready = { ...s0, inventory: { supplies: 4 },
  story: { flags: { mine_unlocked: true } }, biomeKey: "farm" };
const entered = rootReducer(ready, { type: "ENTER_MINE", payload: { mode: "standard" } });
assert(entered.biomeKey === "mine",          "biome switched to mine");
assert(entered.inventory.supplies === 1,     "3 supplies consumed");
```
Run — confirm: `Action type CONVERT_TO_SUPPLY not handled`.

*Gameplay simulation (player at the act3_mine_opened beat, session 9):* The player
has 47 grain stockpiled, 0 supplies, and Wren's "the seal is broken" modal just
dismissed. They tap the Mine entrance and see "Need 3 supplies — visit the Kitchen."
They open Kitchen, drag the slider to 3 (max is 15: floor(47/3) = 15), tap Convert.
Inventory now shows 38 grain, 3 supplies. They re-tap the Mine entrance — the biome
switches and the first Mine board renders. The player feels they *earned* the trip
down rather than being handed a button.

Designer reflection: *Is 3 grain → 1 supply the right ratio? Does saving up feel
like an honest tax on the Farm year, or does it feel like grinding? Watch the
player's first Mine entry and check whether they hesitate (good — it's a decision)
or sigh (bad — it's a chore).*

**Implementation:**
- `src/state.js:initialState()` — extend the inventory init: `inventory: { supplies: 0 }`.
- `src/state.js` — new reducer cases:
  ```js
  case "CONVERT_TO_SUPPLY": {
    const qty = Math.max(1, action.payload.qty | 0);
    const cost = qty * 3;
    if ((state.inventory.grain ?? 0) < cost) return state;
    return { ...state, inventory: {
      ...state.inventory,
      grain: state.inventory.grain - cost,
      supplies: (state.inventory.supplies ?? 0) + qty,
    } };
  }
  case "ENTER_MINE": {
    if (!state.story?.flags?.mine_unlocked) return state;
    const mode = action.payload?.mode ?? "standard";
    if (mode === "standard") {
      if ((state.inventory.supplies ?? 0) < 3) return state;
      return { ...state,
        biomeKey: "mine",
        inventory: { ...state.inventory, supplies: state.inventory.supplies - 3 } };
    }
    return state; // other modes (premium, paid) handled in 3.3
  }
  ```
- `src/ui.jsx` — `<KitchenPanel />` rendered when `state.built.kitchen`.
  Slider input bound to a local `qty` state, max = `Math.floor(grain / 3)`.
  Convert button dispatches `{ type: "CONVERT_TO_SUPPLY", payload: { qty } }`.
  Display "X grain → Y supplies" preview line.
- `src/ui.jsx` — when biome map is shown, the Mine tile button reads
  `state.story.flags.mine_unlocked ? supplies >= 3 ? "Enter (3 supplies)" : "Need 3 supplies" : "Sealed"`.
- `src/textures.js` — register a `iconSupplies` texture (small canvas-drawn crate)
  for the inventory chip.

**Manual Verify Walk-through:**
1. Force-unlock the mine via console (`gameState.story.flags.mine_unlocked = true`). Tap Mine entry. Confirm "Need 3 supplies".
2. Build the Kitchen. Open it. Confirm a converter slider is visible.
3. With 2 grain, attempt to convert 1. Button is disabled (max=0).
4. Set grain to 9 via dev cheat. Convert qty=2. Confirm grain → 3, supplies → 2.
5. Convert another 1. Confirm supplies → 3.
6. Tap Mine entry. Biome switches to mine. Supplies → 0.
7. `runSelfTests()` passes all 3.2 assertions.

---

### 3.3 — Runes (currency + board-modifier consumables)

**What this delivers:** Runes are introduced as the game's secondary currency
(GAME_SPEC §3). They are earned slowly: 1 rune per Mysterious Ore solved, 1 rune per
boss defeated, 1 rune from select quest rewards. They are spent on premium Mine
entry (skip the supply tax for 2 runes), the Magic Portal building's initial cost
(5 runes), and a *separate* count of board-modifier consumables — activating one
"wildcard rune" from the inventory spawns 3 wildcard tiles on the next chain. The
hooks for `state.runes` are designed so Phase 4 workers and Phase 8 boss rewards can
both feed into the same ledger without a refactor.

**Completion Criteria:**
- [ ] `state.runes = 0` and `state.runeStash = 0` (consumables) in `initialState()`
- [ ] `GRANT_RUNES` reducer case adds to `state.runes`, with a `source` payload field for analytics
- [ ] Solving Mysterious Ore dispatches `GRANT_RUNES { amount: 1, source: "mysterious_ore" }`
- [ ] Defeating any boss dispatches `GRANT_RUNES { amount: 1, source: "boss" }`
- [ ] `ENTER_MINE` with `mode: "premium"` requires `runes >= 2`, deducts 2, no supplies needed
- [ ] Magic Portal `BUILD` requires `runes >= 5` (in addition to coin cost)
- [ ] `ACTIVATE_RUNE_WILDCARD` reducer case: requires `runeStash >= 1`, decrements stash, sets `state.toolPending = "rune_wildcard"`
- [ ] Phaser handler for `toolPending: "rune_wildcard"` replaces 3 random non-selected tiles with a wildcard sprite that matches any neighbour during chain validation
- [ ] Wildcard tiles do NOT consume a session turn to deploy; they DO consume a turn when the resulting chain commits

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";

const s0 = initialState();
assert(s0.runes === 0,      "runes start at 0");
assert(s0.runeStash === 0,  "runeStash starts at 0");

// Grant runes
const s1 = rootReducer(s0, { type: "GRANT_RUNES", payload: { amount: 1, source: "mysterious_ore" } });
assert(s1.runes === 1, "1 rune granted from Mysterious Ore");

const s2 = rootReducer(s1, { type: "GRANT_RUNES", payload: { amount: 1, source: "boss" } });
assert(s2.runes === 2, "2 runes total after boss");

// Premium mine entry consumes 2 runes, no supplies
const ready = { ...s0, runes: 3, inventory: { supplies: 0 },
  story: { flags: { mine_unlocked: true } }, biomeKey: "farm" };
const entered = rootReducer(ready, { type: "ENTER_MINE", payload: { mode: "premium" } });
assert(entered.biomeKey === "mine",   "premium entry switched biome");
assert(entered.runes === 1,           "2 runes consumed");
assert(entered.inventory.supplies === 0, "no supplies consumed on premium");

// Premium blocked without 2 runes
const broke = { ...ready, runes: 1 };
const blocked = rootReducer(broke, { type: "ENTER_MINE", payload: { mode: "premium" } });
assert(blocked.biomeKey === "farm", "1 rune insufficient for premium");

// Magic Portal build requires 5 runes
const tryPortal = { ...s0, coins: 5000, runes: 4, built: {} };
const noBuild = rootReducer(tryPortal, { type: "BUILD", payload: { id: "portal" } });
assert(!noBuild.built.portal, "portal blocked without 5 runes");

const okPortal = rootReducer({ ...tryPortal, runes: 5 }, { type: "BUILD", payload: { id: "portal" } });
assert(okPortal.built.portal === true, "portal built with 5 runes");
assert(okPortal.runes === 0, "5 runes consumed");

// Wildcard activation
const stash = { ...s0, runeStash: 2, toolPending: null };
const r3 = rootReducer(stash, { type: "ACTIVATE_RUNE_WILDCARD" });
assert(r3.runeStash === 1,                    "stash decremented");
assert(r3.toolPending === "rune_wildcard",    "tool flagged for Phaser");
```
Run — confirm: `Action type GRANT_RUNES not handled`.

*Gameplay simulation (player turn 7 of session 4 — Mysterious Ore + boss in same year):*
The player solves a Mysterious Ore (the countdown was 6 turns; they chained 4 dirt
tiles around it on turn 5). A floater reads "+1 Rune" with a tiny gold spiral icon.
The HUD rune chip ticks from 0 → 1. Two seasons later, Frostmaw is defeated; another
+1 floater. Now `runes = 2`. They open Mine entry, pick "Premium (2 runes)" — supplies
panel greys out, runes spend, biome switches. Later in act 3 they save a third rune
and click "Activate Wildcard" from the inventory. The Phaser board sparkles, 3
wildcard tiles flash in. They route a 7-tile chain through 2 of them and pull off
their first 14-hay overchain. *Note: rune market price drift will later be modulated
by Tuck's `season_bonus` effect — Phase 4.*

Designer reflection: *Are runes rare enough that earning one feels special, but
common enough that the player gets to spend at least one before the end of Act 2?
Does the wildcard tile feel like a magic moment or like a cheat code?*

**Implementation:**
- `src/state.js:initialState()` — add `runes: 0, runeStash: 0`.
- `src/state.js` — new reducer cases:
  ```js
  case "GRANT_RUNES": {
    const amt = Math.max(0, action.payload?.amount | 0);
    return { ...state, runes: state.runes + amt };
  }
  case "ACTIVATE_RUNE_WILDCARD": {
    if ((state.runeStash ?? 0) < 1) return state;
    return { ...state,
      runeStash: state.runeStash - 1,
      toolPending: "rune_wildcard" };
  }
  ```
- Extend the existing `ENTER_MINE` case from 3.2 with the premium branch:
  ```js
  if (mode === "premium") {
    if ((state.runes ?? 0) < 2) return state;
    return { ...state, biomeKey: "mine", runes: state.runes - 2 };
  }
  ```
- Extend `BUILD` to gate `portal` on `state.runes >= 5`, and on success deduct 5 runes alongside the coin cost.
- `src/GameScene.js` — when the Mysterious Ore countdown resolves successfully, dispatch
  `GRANT_RUNES { amount: 1, source: "mysterious_ore" }`. When `defeatBoss()` resolves,
  dispatch `GRANT_RUNES { amount: 1, source: "boss" }`.
- `src/GameScene.js` — Phaser handler for `registry.changedata-toolPending === "rune_wildcard"`:
  pick 3 random non-selected tiles, swap their sprite to a `iconWildcard` texture, mark
  them `wildcard: true`. Chain validation accepts a wildcard tile as matching any
  resource adjacent to it. Clear `toolPending` after placement.
- `src/textures.js` — register `iconRune` (small spiral) and `iconWildcard` (rainbow shimmer).
- `src/features/quests/slice.js` — for the existing quest reward shape, accept
  `{ runes: 1 }` and dispatch `GRANT_RUNES` on claim (for select quest templates only).

**Manual Verify Walk-through:**
1. Console: dispatch `GRANT_RUNES { amount: 1, source: "test" }`. HUD rune chip shows 1.
2. Force-spawn a Mysterious Ore, solve it. Confirm +1 floater and rune chip ticks up.
3. Defeat Frostmaw via the Phase 2 boss flow. Confirm +1 rune.
4. With 2 runes, open Mine entry. Confirm "Premium (2 runes)" option works and supplies are not consumed.
5. With 4 runes, attempt to build Magic Portal. Confirm blocked with "Need 5 runes" tooltip.
6. With 5 runes and the coin cost, build Portal. Confirm runes → 0 and building visible.
7. Console: `gameState.runeStash = 1`. Click "Activate Wildcard" in inventory. Confirm 3 shimmering tiles appear without consuming a turn. Chain through them; confirm chain commits and consumes 1 turn.
8. `runSelfTests()` passes all 3.3 assertions.

---

### 3.4 — Bombs + Powder Store (3×3 board clear tool)

**What this delivers:** The Powder Store building (cost: 600◉ + 30 stone + 5 ingot,
unlocks at level 5) becomes buildable. Each season-end (`CLOSE_SEASON`) it grants
+2 Bombs to inventory. Bombs are a tactical board tool with the same handling
contract as the Phase 1 tools (Scythe / Seedpack / Lockbox): tapping a Bomb tool,
then tapping a board tile, animates an explosion centered on that tile, clears the
3×3 area around it, credits all 9 tiles' resources to inventory, collapses the
board, and does NOT consume a session turn. At edges the explosion clears fewer
tiles (whatever fits the board).

**Completion Criteria:**
- [ ] `powder_store` entry added to `BUILDINGS` array in `src/constants.js` with cost { coins: 600, stone: 30, ingot: 5 }, lv: 5
- [ ] `state.tools.bomb = 0` initialised
- [ ] `CLOSE_SEASON` reducer adds 2 to `state.tools.bomb` if `state.built.powder_store === true`
- [ ] `USE_TOOL { key: "bomb" }` decrements `state.tools.bomb`, sets `toolPending: "bomb"`, does NOT consume a turn
- [ ] Phaser handler for `toolPending: "bomb"` waits for a tap-on-tile; on tap, explosion VFX (radial flash + screen shake) plays at that tile, the 3×3 around it clears
- [ ] All 9 (or fewer at edges) tiles' resources are credited via the same code path as `CHAIN_COLLECTED`
- [ ] Edge case: bomb at corner clears 4 tiles; bomb at edge clears 6
- [ ] Tool count never goes negative; bomb button is disabled when count = 0

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";

const s0 = initialState();
assert(s0.tools.bomb === 0, "bombs start at 0");

// CLOSE_SEASON without Powder Store → no bomb
const noStore = { ...s0, built: {} };
const after1 = rootReducer(noStore, { type: "CLOSE_SEASON" });
assert(after1.tools.bomb === 0, "no Powder Store → no bomb");

// CLOSE_SEASON with Powder Store → +2 bombs
const withStore = { ...s0, built: { powder_store: true } };
const after2 = rootReducer(withStore, { type: "CLOSE_SEASON" });
assert(after2.tools.bomb === 2, "Powder Store grants 2 bombs/season");

// Two season-ends in a row → +4 bombs
const after3 = rootReducer(after2, { type: "CLOSE_SEASON" });
assert(after3.tools.bomb === 4, "bombs accumulate across seasons");

// USE_TOOL bomb decrements and arms the board
const armed = { ...s0, tools: { ...s0.tools, bomb: 3 }, turnsUsed: 4 };
const r1 = rootReducer(armed, { type: "USE_TOOL", payload: { key: "bomb" } });
assert(r1.tools.bomb === 2,           "bomb decremented");
assert(r1.toolPending === "bomb",      "toolPending armed");
assert(r1.turnsUsed === 4,             "turn NOT consumed");

// USE_TOOL with 0 bombs → no-op
const empty = { ...s0, tools: { ...s0.tools, bomb: 0 } };
const r2 = rootReducer(empty, { type: "USE_TOOL", payload: { key: "bomb" } });
assert(r2.toolPending !== "bomb",      "no-op when 0 bombs");

// Bomb footprint helper (pure utility — Phaser side)
import { bombFootprint } from "./market.js"; // re-using the new module for pure helpers
assert(bombFootprint(2, 2, 6, 6).length === 9, "centre bomb hits 9 tiles");
assert(bombFootprint(0, 0, 6, 6).length === 4, "corner bomb hits 4 tiles");
assert(bombFootprint(0, 3, 6, 6).length === 6, "edge bomb hits 6 tiles");
```
Run — confirm: `tools.bomb is undefined` and `bombFootprint is not exported`.

*Gameplay simulation (player on turn 9 of a Mine session, year 2):* The player has
1 turn left and 3 high-value gem tiles clustered in the corner of the board, but no
chain path reaches all of them. They have 1 Bomb from the Powder Store granted at
last season's end. They tap Bomb, then tap the centre of the gem cluster. A bright
radial flash, screen micro-shakes, and the 3×3 (only 6 tiles since they're at an
edge) clear simultaneously — including all 3 gems plus 3 nearby ore. Inventory
shows "+3 Gem +3 Ore" floater. Turn counter is still on 9. They use that turn for
one more chain and finish the session richer than they could have without the Bomb.

Designer reflection: *Does using a Bomb feel like cracking open a treasure chest, or
like wasting a precious resource? Does 2/season feel generous or stingy at the rate
the player builds Powder Store (around level 5, mid-Act-2)?*

**Implementation:**
- `src/constants.js:BUILDINGS` — append:
  ```js
  { id: "powder_store", name: "Powder Store",
    desc: "Stockpiles black powder. Produces 2 Bombs at the end of every season.",
    cost: { coins: 600, stone: 30, ingot: 5 }, lv: 5,
    x: 1080, y: 380, w: 90, h: 100, color: "#3a2a1a" },
  ```
- `src/state.js:initialState()` — add `bomb: 0` to the `tools` object.
- `src/state.js:CLOSE_SEASON` — at the end of the reducer, if `state.built.powder_store`
  set `tools: { ...state.tools, bomb: state.tools.bomb + 2 }`.
- `src/state.js:USE_TOOL` — branch on `payload.key === "bomb"`: decrement `tools.bomb`,
  set `toolPending: "bomb"`. Reuse the Phase 1 contract: no turn consumed.
- `src/market.js` — add a pure helper (it's the right module — coordinate math, not
  trade logic, but it's the smallest new file we own):
  ```js
  export function bombFootprint(cx, cy, cols, rows) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && x < cols && y >= 0 && y < rows) out.push([x, y]);
      }
    return out;
  }
  ```
  *(Alternative: put it in `src/utils.js` next to `clamp`. Either is fine — pick one
  and stay consistent.)*
- `src/GameScene.js` — `toolPending: "bomb"`:
  1. Set a one-shot tap listener on the board.
  2. On tap at `(c, r)`: compute `bombFootprint(c, r, COLS, ROWS)`.
  3. For each `(x, y)` in footprint: read the tile resource, push to a collected map,
     null out `grid[y][x]`.
  4. Animate: radial flash sprite (160ms, scale 0 → 2.4, alpha 1 → 0), 8 spark
     particles per tile, screen shake (`this.cameras.main.shake(180, 0.008)`).
  5. Dispatch the collected resources via the same path as `CHAIN_COLLECTED` (so order
     progress, achievements, and quests all credit normally).
  6. `collapseBoard()` → `fillBoard()`. Clear `toolPending`.
- `src/textures.js` — register `iconBomb` (round black bomb with fuse) and `bombFlash` (radial gradient).
- `src/ui.jsx` — bomb tool button in the tool tray, count badge, disabled when count = 0.

**Manual Verify Walk-through:**
1. Force-build Powder Store (`gameState.built.powder_store = true`). Wait until end of season — `CLOSE_SEASON` modal dismisses. Confirm `gameState.tools.bomb === 2`.
2. Close another season. Confirm bombs = 4.
3. Click Bomb tool. The tool tray button highlights; cursor changes to crosshair.
4. Tap a tile in the centre of the board. Confirm: radial flash, screen shake, 9 tiles clear, inventory shows the resources, turn counter unchanged.
5. Tap a corner tile with another Bomb. Confirm only 4 tiles clear (no out-of-bounds artefacts).
6. Use a bomb until count = 0. Confirm tool button is greyed out.
7. `runSelfTests()` passes all 3.4 assertions.

---

### 3.5 — Daily login streak

**What this delivers:** The game tracks a daily login streak per save. On scene
init, if today's calendar date is later than the last claim, the streak advances
(or resets to day 1 if more than 1 day was missed). A streak modal opens with a
visual ladder of 7 days, today highlighted, and the day's reward auto-credited.
Day 30 is the long-term goal: 1000◉ + 3 runes. The reward ladder matches GAME_SPEC
§16 exactly. Same-day re-opens never re-grant.

**Completion Criteria:**
- [ ] `state.dailyStreak = { lastClaimedDate: null, currentDay: 0 }` in `initialState()`
- [ ] `LOGIN_TICK` reducer case (called once on init) advances `currentDay` if `today > lastClaimedDate`
- [ ] Same-day re-open returns the same state (idempotent)
- [ ] Gap of 1 day → `currentDay + 1`
- [ ] Gap of ≥ 2 days → resets to `currentDay = 1`
- [ ] Reward ladder from GAME_SPEC §16 exactly (day 30 = 1000◉ + 3 runes; day 14 = 300◉ + 1 rune; etc.)
- [ ] Reward auto-credited on `LOGIN_TICK` (not on modal dismiss)
- [ ] Modal shows the 7-day strip with the next milestone highlighted
- [ ] Date math uses local YYYY-MM-DD (not UTC, not timestamp diff)
- [ ] Persists via existing save schema

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";
import { dayKeyForDate, DAILY_REWARDS } from "./constants.js";

// Reward ladder shape — GAME_SPEC §16 LOCKED
assert(DAILY_REWARDS[1].coins  === 25,                       "day 1 = 25◉");
assert(DAILY_REWARDS[2].coins  === 50,                       "day 2 = 50◉");
assert(DAILY_REWARDS[3].tool   === "basic",                  "day 3 = Seedpack");
assert(DAILY_REWARDS[4].coins  === 75,                       "day 4 = 75◉");
assert(DAILY_REWARDS[5].tool   === "rare",                   "day 5 = Lockbox");
assert(DAILY_REWARDS[7].coins  === 150 && DAILY_REWARDS[7].tool === "shuffle",
       "day 7 = 150◉ + Reshuffle Horn");
assert(DAILY_REWARDS[14].coins === 300 && DAILY_REWARDS[14].runes === 1,
       "day 14 = 300◉ + 1 rune");
assert(DAILY_REWARDS[30].coins === 1000 && DAILY_REWARDS[30].runes === 3,
       "day 30 = 1000◉ + 3 runes");

const s0 = initialState();
assert(s0.dailyStreak.currentDay === 0, "streak day starts at 0");

// First open: today=2026-01-01 → day 1
const today = "2026-01-01";
const s1 = rootReducer(s0, { type: "LOGIN_TICK", payload: { today } });
assert(s1.dailyStreak.currentDay === 1, "first login = day 1");
assert(s1.dailyStreak.lastClaimedDate === today, "date stamped");
assert(s1.coins === s0.coins + 25, "day 1 coins credited");

// Same-day re-open: idempotent
const s2 = rootReducer(s1, { type: "LOGIN_TICK", payload: { today } });
assert(s2.coins === s1.coins, "same day → no re-grant");
assert(s2.dailyStreak.currentDay === 1, "still day 1");

// Next day: advance
const s3 = rootReducer(s1, { type: "LOGIN_TICK", payload: { today: "2026-01-02" } });
assert(s3.dailyStreak.currentDay === 2, "day +1 → day 2");
assert(s3.coins === s1.coins + 50, "day 2 = +50 coins");

// Gap of 2: reset
const s4 = rootReducer(s1, { type: "LOGIN_TICK", payload: { today: "2026-01-04" } });
assert(s4.dailyStreak.currentDay === 1, "gap of 2 days → reset to 1");

// Day 30 milestone
const at29 = { ...s0, dailyStreak: { lastClaimedDate: "2026-01-29", currentDay: 29 } };
const at30 = rootReducer(at29, { type: "LOGIN_TICK", payload: { today: "2026-01-30" } });
assert(at30.dailyStreak.currentDay === 30, "day 30 reached");
assert(at30.coins === at29.coins + 1000,   "day 30 grants 1000 coins");
assert(at30.runes === at29.runes + 3,      "day 30 grants 3 runes");

// Pure date helper
assert(dayKeyForDate(new Date("2026-05-06T03:30:00")) === "2026-05-06",
       "dayKey is local YYYY-MM-DD");
```
Run — confirm: `DAILY_REWARDS is not defined`.

*Gameplay simulation (returning player, day 7 streak):* The player closes the game
on Tuesday after their day 6 claim (small coin reward, no fanfare). They open again
on Wednesday morning. Within ~400ms of game ready, a streak modal slides down: a
7-day ladder, days 1–6 ticked, day 7 glowing with "+150◉ +1 Reshuffle Horn". The
coin chip and tool tray both pulse as the rewards drop in. The player taps Continue
and notices the streak strip in the HUD now reads "Day 7 — come back tomorrow". On
Thursday they open and see the ladder reset to "Day 8" (continuing past 7), no
reset, because the cycle isn't 7 days — it's 30 with checkpoints at 7, 14, 30. If
they had instead skipped to Saturday, the modal would show "Streak broken — Day 1
again", the day-1 reward credited fresh.

Designer reflection: *Does day 7 feel like a real reward worth coming back for, or
like a participation trophy? Does the "streak broken" modal sting just enough to
encourage daily play without feeling punitive?*

**Implementation:**
- `src/constants.js` — append the locked reward ladder:
  ```js
  export const DAILY_REWARDS = {
    1:  { coins: 25 },
    2:  { coins: 50 },
    3:  { tool: "basic", amount: 1 },
    4:  { coins: 75 },
    5:  { tool: "rare", amount: 1 },
    6:  { coins: 50 },
    7:  { coins: 150, tool: "shuffle", amount: 1 },
    8:  { coins: 60 }, 9:  { coins: 70 }, 10: { coins: 80 },
    11: { coins: 90 }, 12: { coins: 100 }, 13: { coins: 120 },
    14: { coins: 300, runes: 1 },
    15: { coins: 100 }, 16: { coins: 110 }, 17: { coins: 120 },
    18: { coins: 130 }, 19: { coins: 140 }, 20: { coins: 160 },
    21: { coins: 180 }, 22: { coins: 200 }, 23: { coins: 220 },
    24: { coins: 240 }, 25: { coins: 260 }, 26: { coins: 280 },
    27: { coins: 300 }, 28: { coins: 350 }, 29: { coins: 400 },
    30: { coins: 1000, runes: 3 },
  };

  export function dayKeyForDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  ```
- `src/state.js:initialState()` — add `dailyStreak: { lastClaimedDate: null, currentDay: 0 }`.
- `src/state.js` — new reducer case:
  ```js
  case "LOGIN_TICK": {
    const today = action.payload.today;
    const last  = state.dailyStreak.lastClaimedDate;
    if (last === today) return state; // idempotent
    let nextDay;
    if (!last) nextDay = 1;
    else {
      const d1 = new Date(last + "T00:00:00");
      const d2 = new Date(today + "T00:00:00");
      const diff = Math.round((d2 - d1) / 86400000);
      nextDay = diff === 1 ? Math.min(state.dailyStreak.currentDay + 1, 30) : 1;
    }
    const reward = DAILY_REWARDS[nextDay] ?? { coins: 25 };
    let next = { ...state,
      dailyStreak: { lastClaimedDate: today, currentDay: nextDay },
      coins: state.coins + (reward.coins ?? 0),
      runes: state.runes + (reward.runes ?? 0) };
    if (reward.tool) {
      const cur = state.tools[reward.tool] ?? 0;
      next = { ...next, tools: { ...state.tools, [reward.tool]: cur + (reward.amount ?? 1) } };
    }
    return { ...next, modal: { type: "daily_streak", day: nextDay, reward } };
  }
  ```
- `src/GameScene.js:init()` — once, after state is loaded:
  `dispatch({ type: "LOGIN_TICK", payload: { today: dayKeyForDate(new Date()) } })`.
- `src/ui.jsx` — `<DailyStreakModal />` shown when `state.modal?.type === "daily_streak"`.
  Render a 7-cell horizontal strip showing days `(currentDay - 3)` through
  `(currentDay + 3)`, today highlighted gold, milestone days (7, 14, 30) marked with
  a chest icon. Continue button dispatches `CLOSE_MODAL`.
- `src/textures.js` — register `iconStreakChest` (small wooden chest), reused for milestone days.

**Manual Verify Walk-through:**
1. Clear localStorage. Open game. Modal opens within 1s with day 1 highlighted, +25◉ visible. Confirm coins +25.
2. Refresh the page (same calendar day). Confirm no modal opens, coins unchanged.
3. Console: `gameState.dailyStreak.lastClaimedDate = "2026-05-05"` (yesterday). Refresh. Confirm modal opens with day 2 reward (+50◉).
4. Console: set `lastClaimedDate` to a date 5 days ago. Refresh. Confirm streak resets to day 1.
5. Console: set `currentDay = 6, lastClaimedDate = yesterday`. Refresh. Confirm day 7 modal: +150◉ + 1 Reshuffle Horn (`tools.shuffle` increments).
6. Console: set `currentDay = 13, lastClaimedDate = yesterday`. Refresh. Confirm day 14: +300◉ + 1 rune.
7. Console: set `currentDay = 29, lastClaimedDate = yesterday`. Refresh. Confirm day 30: +1000◉ + 3 runes.
8. `runSelfTests()` passes all 3.5 assertions.

---

## Phase 3 Sign-off Gate

Play 2 full multi-day playthroughs (or simulate via console date manipulation): one
that takes the supply path to the Mine and never spends a rune; one that earns 4+
runes from Mysterious Ore + bosses and uses premium entry plus a wildcard rune.
Before moving to Phase 4, confirm all:

- [ ] 3.1–3.5 Completion Criteria all checked
- [ ] Caravan Post unlocks the Market screen — Market is invisible until then
- [ ] Buy/sell prices drift each season and the ▲/▼ arrow accurately reflects the change
- [ ] Buying with insufficient coins is a no-op (button disabled, no silent debit)
- [ ] Kitchen converter reliably produces supplies; Mine standard entry costs 3 supplies and consumes them
- [ ] Mine premium entry consumes 2 runes and bypasses supplies entirely
- [ ] Magic Portal cannot be built without 5 runes — the build button greys out cleanly
- [ ] Wildcard rune places 3 wildcard tiles, does NOT consume a turn on placement, DOES consume a turn when the resulting chain commits
- [ ] Powder Store grants exactly 2 Bombs per `CLOSE_SEASON`, never accidentally on biome switch or load
- [ ] Bomb tool clears the correct 3×3 footprint (4 at corner, 6 at edge, 9 at centre) with explosion VFX
- [ ] Bomb resources credit through the same path as a normal chain (orders, achievements, quests all tick)
- [ ] Daily streak modal opens within 1s of game ready on a new calendar day; never on same-day re-open
- [ ] Day 30 reward grants exactly 1000◉ + 3 runes
- [ ] Save/reload preserves: market seed, supplies count, runes total, runeStash, bomb count, dailyStreak.lastClaimedDate
- [ ] `runSelfTests()` passes for all Phase 3 tests
- [ ] Designer gut-check: *Does the economy feel alive — do prices, supplies, runes, bombs, and the daily reward each pull the player back tomorrow for a different reason? Or does it feel like five disconnected dashboards bolted onto a farming game?*
