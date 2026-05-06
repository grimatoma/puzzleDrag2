# Phase 6 — NPC Social

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Every order card now shows the bond multiplier inline
with its reward — `+135◉ ×1.15  · Liked` — so the player can *see* why Mira's bread
order pays more than Bram's hinge order this season. Handing Mira a stack of flour
opens a small "Mira: 'Oh — flour! Thank you.' (+0.5)" floater and pushes her from
Warm to Liked, and her *next* order pays 15% more for the same chain. Each NPC has
a season-flavored line that fires on order delivery, gift acceptance, and arrival —
so the village starts to *talk* instead of silently emitting order cards.

**Why now:** Phase 2 brought Mira, Tomas, Bram, and Liss into the world via story
beats; Phase 3 made coin payouts a real currency that the Market drains and the
Larder fills; Phase 4 wired workers into the chain; Phase 5 made the board pool
discoverable. Without bond visibility and a gift loop, the NPCs are silent order
vending machines — the player has no reason to prefer one NPC's order over another,
and no way to *invest* in a relationship. Phase 6 turns the bond number from a
hidden multiplier into a system the player can read, push, and feel.

**Entry check:** [Phase 5 Sign-off Gate](./phase-5-species.md#phase-5-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 6.1 — Bond modifier visible on every order card

**What this delivers:** Every order card in the orders panel surfaces the speaking
NPC's bond band name and its reward multiplier next to the coin reward, so the
player never has to guess why a 100-hay order pays 125◉ from Liss but 70◉ from
Bram. Format is locked: `+135◉ ×1.15  · Liked` for a Liked NPC, `+200◉ ×1.00  ·
Warm` for a Warm one, `+91◉ ×0.70  · Sour` for Sour. The displayed coin total
already includes the multiplier, and the same multiplier is what `payOrder` debits
from the order template at delivery. Bond is held in `state.npcs.bonds = { wren: 5,
mira: 5, tomas: 5, bram: 5, liss: 5 }` (locked starting value from §18: 5/Warm,
×1.00 — mood is a *bonus layer*, not a tax). Decay is `−0.1 per season` and only
fires when bond > 5; below 5 the floor is Warm.

**Completion Criteria:**
- [ ] `src/features/npcs/data.js` exports `BOND_BANDS` (4-entry array, lo/hi/name/modifier)
  and `NPC_DATA` (id-keyed lookup with `favoriteGift` per §14)
- [ ] `src/features/npcs/bond.js` exports pure helpers `bondBand(bond)`,
  `bondModifier(bond)`, `gainBond(bond, delta)`, `decayBond(bond)`, `payOrder(order, bond)`
- [ ] `bondModifier(b)` returns exactly `0.70 / 1.00 / 1.15 / 1.25` for the 4 bands
- [ ] `state.npcs.bonds` defaults to `5` for all 5 NPCs (`wren, mira, tomas, bram, liss`)
- [ ] Order card renders `+<rewardWithMod>◉ ×<modifier> · <bandName>` next to reward
- [ ] Order delivery debits `Math.round(baseReward * modifier)` and bumps bond by `+0.3`
- [ ] `CLOSE_SEASON` applies `decayBond` to every NPC: `−0.1` only if bond > 5
- [ ] `gainBond` clamps to `[0, 10]`; `decayBond` floors at `5`
- [ ] No `mood` (Sour) tax at session start — fresh state every NPC = bond 5 = ×1.00

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { BOND_BANDS, NPC_DATA } from "./features/npcs/data.js";
import { bondBand, bondModifier, gainBond, decayBond, payOrder }
  from "./features/npcs/bond.js";
import { createInitialState } from "./state.js";

// Locked starting bond (§18): every NPC is Warm at session start
const fresh = createInitialState();
for (const id of ["wren", "mira", "tomas", "bram", "liss"]) {
  assert(fresh.npcs.bonds[id] === 5, `${id} starts at bond 5`);
  assert(bondBand(fresh.npcs.bonds[id]).name === "Warm", `${id} starts Warm`);
  assert(bondModifier(fresh.npcs.bonds[id]) === 1.00, `${id} starts ×1.00`);
}

// Locked band table (§14)
assert(bondModifier(1) === 0.70, "bond 1 = Sour ×0.70");
assert(bondModifier(4) === 0.70, "bond 4 = Sour ×0.70");
assert(bondModifier(5) === 1.00, "bond 5 = Warm ×1.00");
assert(bondModifier(6) === 1.00, "bond 6 = Warm ×1.00");
assert(bondModifier(7) === 1.15, "bond 7 = Liked ×1.15");
assert(bondModifier(8) === 1.15, "bond 8 = Liked ×1.15");
assert(bondModifier(9) === 1.25, "bond 9 = Beloved ×1.25");
assert(bondModifier(10) === 1.25, "bond 10 = Beloved ×1.25");

assert(bondBand(3).name === "Sour",    "bond 3 band name = Sour");
assert(bondBand(7).name === "Liked",   "bond 7 band name = Liked");
assert(bondBand(10).name === "Beloved","bond 10 band name = Beloved");

// payOrder rounds against the modifier
assert(payOrder({ baseReward: 100 }, 5) === 100, "Warm 100 → 100");
assert(payOrder({ baseReward: 100 }, 7) === 115, "Liked 100 → 115");
assert(payOrder({ baseReward: 100 }, 10) === 125, "Beloved 100 → 125");
assert(payOrder({ baseReward: 117 }, 9) === Math.round(117 * 1.25),
       "rounding follows Math.round (146)");

// gainBond — order delivery is +0.3
assert(Math.abs(gainBond(5, 0.3) - 5.3) < 1e-9,  "delivery +0.3 from 5 → 5.3");
// gainBond clamps high
assert(gainBond(9.9, 0.5) === 10, "gainBond clamps to 10");
assert(gainBond(0.05, -1) === 0,  "gainBond clamps to 0");

// Decay rule (§14): −0.1 per season ONLY if bond > 5; below 5 stays put
assert(Math.abs(decayBond(7) - 6.9) < 1e-9, "decay 7 → 6.9");
assert(Math.abs(decayBond(5.1) - 5)  < 1e-9, "decay 5.1 → 5 (floor)");
assert(decayBond(5) === 5,  "decay does NOT fire at 5");
assert(decayBond(4) === 4,  "decay does NOT fire at 4 (floor is Warm)");
assert(decayBond(1) === 1,  "decay does NOT fire at 1 (Sour stays Sour)");

// NPC_DATA carries the §14 favorite-gift table
assert(NPC_DATA.mira.favoriteGift  === "flour", "Mira favorite = flour");
assert(NPC_DATA.tomas.favoriteGift === "jam",   "Tomas favorite = jam");
assert(NPC_DATA.bram.favoriteGift  === "ingot", "Bram favorite = ingot");
assert(NPC_DATA.liss.favoriteGift  === "jam",   "Liss favorite = jam");
assert(NPC_DATA.wren.favoriteGift  === "plank", "Wren favorite = plank");
```
Run — confirm: `Cannot find module './features/npcs/bond.js'`.

*Gameplay simulation (player at level 4, mid-Act-2, all 5 NPCs in roster):*
The player opens the orders panel and sees three cards. Mira asks for 12 wheat,
reward `+150◉ ×1.00  · Warm`. Bram asks for 4 ingot, reward `+200◉ ×1.00  · Warm`.
Liss asks for 6 berry, reward `+125◉ ×1.00  · Warm`. The player chains and delivers
Mira's order. Floater: `+150◉`. Mira's bond becomes 5.3. Next refresh, her next
order still shows `×1.00 · Warm` (5.3 is still in band 5–6). The player delivers
five more Mira orders across two seasons; her bond climbs to 5.0 + 6×0.3 − 0.1
(decay at season close) = 6.7. The next order card now reads `+172◉ ×1.15 · Liked`
— the player *sees* the band step happen because the displayed text changed.

Designer reflection: *Does the band-step jump (×1.00 → ×1.15) feel like a small
celebration the player notices, or like a number that quietly mutated mid-screen?
Is `+135◉ ×1.15  · Liked` parseable in under a second, or is the dot-separator
visual noise?*

**Implementation:**
- New file `src/features/npcs/data.js`:
  ```js
  export const BOND_BANDS = [
    { lo: 1, hi: 4,  name: "Sour",    modifier: 0.70 },
    { lo: 5, hi: 6,  name: "Warm",    modifier: 1.00 },
    { lo: 7, hi: 8,  name: "Liked",   modifier: 1.15 },
    { lo: 9, hi: 10, name: "Beloved", modifier: 1.25 },
  ];

  export const NPC_DATA = {
    mira:  { id: "mira",  displayName: "Mira",       favoriteGift: "flour" },
    tomas: { id: "tomas", displayName: "Old Tomas",  favoriteGift: "jam"   },
    bram:  { id: "bram",  displayName: "Bram",       favoriteGift: "ingot" },
    liss:  { id: "liss",  displayName: "Sister Liss",favoriteGift: "jam"   },
    wren:  { id: "wren",  displayName: "Wren",       favoriteGift: "plank" },
  };

  export const NPC_IDS = ["wren", "mira", "tomas", "bram", "liss"];
  ```
- New file `src/features/npcs/bond.js`:
  ```js
  import { BOND_BANDS } from "./data.js";

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  export function bondBand(bond) {
    const b = clamp(Math.floor(bond), 1, 10);
    return BOND_BANDS.find((band) => b >= band.lo && b <= band.hi);
  }
  export function bondModifier(bond) { return bondBand(bond).modifier; }
  export function gainBond(bond, delta) { return clamp(bond + delta, 0, 10); }
  export function decayBond(bond) {
    if (bond <= 5) return bond;            // Below 5: no decay (§14 floor is Warm)
    return Math.max(5, bond - 0.1);
  }
  export function payOrder(order, bond) {
    return Math.round(order.baseReward * bondModifier(bond));
  }
  ```
- `src/state.js` — `createInitialState()` adds:
  ```js
  npcs: { roster: ["wren"], orders: [], bonds: { wren: 5, mira: 5, tomas: 5, bram: 5, liss: 5 },
          giftCooldown: { wren: 0, mira: 0, tomas: 0, bram: 0, liss: 0 } },
  ```
  (Phase 2 already added `roster` + `bonds`; this consolidates the 5-key default and
  adds the gift cooldown map for 6.2.)
- `src/GameScene.js` — `commitOrder(order)`:
  ```js
  const bond = state.npcs.bonds[order.npc];
  const paid = payOrder(order, bond);
  state.coins += paid;
  state.npcs.bonds[order.npc] = gainBond(bond, 0.3);
  spawnFloater(`+${paid}◉`, "gold", x, y);
  ```
- `src/GameScene.js` — `closeSeason()` appends:
  ```js
  for (const id of NPC_IDS) state.npcs.bonds[id] = decayBond(state.npcs.bonds[id]);
  ```
- `src/ui.jsx` — order card renders the bond chip:
  ```jsx
  <span>+{payOrder(order, bond)}◉ ×{bondModifier(bond).toFixed(2)} · {bondBand(bond).name}</span>
  ```

**Manual Verify Walk-through:**
1. Open a fresh save. Console: `gameState.npcs.bonds` shows `{wren:5, mira:5, tomas:5, bram:5, liss:5}`.
2. Open the orders panel. Every active order card shows `×1.00  · Warm` next to its reward.
3. Set `gameState.npcs.bonds.mira = 8` via console. Confirm Mira's order card now reads
   `×1.15  · Liked` and the displayed coin total has gone up by ~15%.
4. Deliver Mira's order. Floater shows the modified payout. Bond ticks to 8.3 (Liked).
5. Force `CLOSE_SEASON` 3 times. Confirm Mira's bond drops to 8.0 (decay only fires above 5).
   Set `bonds.bram = 4` and force 3 more `CLOSE_SEASON`s — Bram stays at 4 (no decay below 5).
6. `runSelfTests()` passes all 6.1 assertions.

---

### 6.2 — Gift system

**What this delivers:** Each NPC card in the NPC strip exposes a "Give Gift" action.
Tapping it opens a small modal listing every inventory item with `qty > 0`. Picking
an item deducts 1 from inventory and applies a bond change: `+0.5` if it matches
that NPC's `favoriteGift` (per §14: Mira—flour, Tomas—jam, Bram—ingot, Liss—jam,
Wren—plank), `+0.2` otherwise. A floater confirms with the NPC's voice line:
`"Mira: 'Oh — flour! Thank you.' (+0.5)"`. Cooldown is locked to *one gift per NPC
per season* — gifting twice in the same season is a no-op (no inventory deduction,
no bond change, no floater spam) so the player cannot grind bond by emptying the
inventory into one NPC's lap. The cooldown clears on `CLOSE_SEASON`.

**Completion Criteria:**
- [ ] `src/features/npcs/bond.js` exports a pure `applyGift(state, npcId, itemKey)`
  returning `{ ok, newState, delta, isFavorite }` (no mutation)
- [ ] Favorite gift bumps bond by `+0.5`; non-favorite by `+0.2`
- [ ] If `inventory[itemKey] <= 0` → `{ ok: false }`, no state change
- [ ] If `state.npcs.giftCooldown[npcId] === currentSeason` → `{ ok: false }`, no change
- [ ] Successful gift: deducts 1 from inventory *before* bond change, sets cooldown to
  current season, returns `delta = 0.5 | 0.2`
- [ ] `state.npcs.giftCooldown` resets to `0` for every NPC on `CLOSE_SEASON`
- [ ] Bond clamps to `[0, 10]` via the same `gainBond` helper from 6.1
- [ ] NPC strip Give Gift button disabled (greyed out) when cooldown active that season
- [ ] Floater format `"<Name>: '<line>' (+<delta>)"` uses dialog from 6.3 if available,
  else a fallback string in `data.js`

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { applyGift } from "./features/npcs/bond.js";
import { NPC_DATA } from "./features/npcs/data.js";
import { createInitialState } from "./state.js";

// Favorite-gift table is locked (§14)
assert(NPC_DATA.mira.favoriteGift  === "flour", "Mira  → flour");
assert(NPC_DATA.tomas.favoriteGift === "jam",   "Tomas → jam");
assert(NPC_DATA.bram.favoriteGift  === "ingot", "Bram  → ingot");
assert(NPC_DATA.liss.favoriteGift  === "jam",   "Liss  → jam");
assert(NPC_DATA.wren.favoriteGift  === "plank", "Wren  → plank");

// Favorite gift = +0.5
let s = createInitialState();
s.inventory.flour = 3;
s.season = 1;
let r = applyGift(s, "mira", "flour");
assert(r.ok === true,            "favorite gift accepted");
assert(r.isFavorite === true,    "isFavorite=true on flour→Mira");
assert(r.delta === 0.5,          "favorite delta = +0.5");
assert(r.newState.npcs.bonds.mira === 5.5, "Mira bond 5 → 5.5");
assert(r.newState.inventory.flour === 2,   "1 flour debited (3 → 2)");
assert(r.newState.npcs.giftCooldown.mira === 1, "cooldown set to current season");

// Non-favorite = +0.2
s = createInitialState();
s.inventory.hay = 4;
s.season = 1;
r = applyGift(s, "mira", "hay");
assert(r.ok === true,         "non-favorite still accepted");
assert(r.isFavorite === false,"hay is not Mira's favorite");
assert(r.delta === 0.2,       "non-favorite delta = +0.2");
assert(Math.abs(r.newState.npcs.bonds.mira - 5.2) < 1e-9, "Mira 5 → 5.2");

// Cooldown blocks re-gift in same season — no inventory deduction, no bond change
let cooled = r.newState;
const r2 = applyGift(cooled, "mira", "hay");
assert(r2.ok === false,                            "cooldown blocks re-gift");
assert(r2.newState === cooled || r2.newState === undefined,
       "no state mutation on cooldown block");
assert(cooled.inventory.hay === 3,                 "inventory unchanged on block");
assert(Math.abs(cooled.npcs.bonds.mira - 5.2) < 1e-9, "bond unchanged on block");

// Insufficient inventory = no-op, no bond change, no cooldown
s = createInitialState();
s.inventory.flour = 0;
s.season = 1;
r = applyGift(s, "mira", "flour");
assert(r.ok === false,                       "0 flour blocks gift");
assert(s.npcs.bonds.mira === 5,              "bond unchanged");
assert(s.npcs.giftCooldown.mira === 0,       "cooldown not set on failure");

// Bond clamps at 10 even with favorite gift
s = createInitialState();
s.inventory.flour = 1;
s.npcs.bonds.mira = 9.8;
s.season = 1;
r = applyGift(s, "mira", "flour");
assert(r.newState.npcs.bonds.mira === 10, "bond clamps to 10 (was 9.8 + 0.5)");

// Cross-NPC gifts do not interfere — Bram's cooldown is independent of Mira's
s = createInitialState();
s.inventory.ingot = 1;
s.inventory.flour = 1;
s.season = 2;
let r3 = applyGift(s, "mira", "flour");
let r4 = applyGift(r3.newState, "bram", "ingot");
assert(r4.ok === true,                         "Bram gift OK after Mira gift same season");
assert(r4.newState.npcs.bonds.bram === 5.5,    "Bram favorite +0.5");
```
Run — confirm: `applyGift is not exported from './features/npcs/bond.js'`.

*Gameplay simulation (player at level 6, end of summer, inventory has 4 flour):*
The player taps Mira's portrait in the NPC strip. A small modal opens listing every
item with qty > 0: hay 18, wheat 5, flour 4, log 11, plank 2, berry 7. The player
taps `flour`. Inventory drops to 3 flour. Mira's bond goes 5 → 5.5. A floater rises
above her portrait: `Mira: "Oh — flour! Thank you." (+0.5)`. The Give Gift button
greys out — its tooltip now reads "Already given a gift this season". The player
taps Tomas (still un-gifted) and gives him a hay. Tomas: `+0.2`. They try Mira
again — the modal won't open. Next `CLOSE_SEASON` (autumn arrives), the cooldown
clears and both buttons light up again.

Designer reflection: *Does the cooldown feel like a fair limit (one gift per NPC
per season ≈ 5 gifts ÷ 4 seasons of strategic pressure) or like an arbitrary
restriction? Is it discoverable that the season tick is what unlocks the next
gift, or does the player tap and tap and assume the system is broken?*

**Implementation:**
- Append to `src/features/npcs/bond.js`:
  ```js
  import { NPC_DATA } from "./data.js";

  export function applyGift(state, npcId, itemKey) {
    if ((state.inventory[itemKey] ?? 0) <= 0) return { ok: false };
    if (state.npcs.giftCooldown[npcId] === state.season) return { ok: false };
    const isFavorite = NPC_DATA[npcId].favoriteGift === itemKey;
    const delta = isFavorite ? 0.5 : 0.2;
    const newState = {
      ...state,
      inventory: { ...state.inventory, [itemKey]: state.inventory[itemKey] - 1 },
      npcs: {
        ...state.npcs,
        bonds: { ...state.npcs.bonds,
          [npcId]: gainBond(state.npcs.bonds[npcId], delta) },
        giftCooldown: { ...state.npcs.giftCooldown, [npcId]: state.season },
      },
    };
    return { ok: true, newState, delta, isFavorite };
  }
  ```
- `src/ui.jsx` — `<NpcCard>` adds:
  ```jsx
  <button disabled={state.npcs.giftCooldown[npc.id] === state.season}
          onClick={() => openGiftModal(npc.id)}>Give Gift</button>
  ```
  `<GiftModal npcId={...} />` lists `Object.entries(state.inventory).filter(([,v]) => v > 0)`,
  on click dispatches `GIVE_GIFT { npcId, itemKey }`.
- `src/GameScene.js` — `dispatch("GIVE_GIFT")`:
  ```js
  const r = applyGift(state, npcId, itemKey);
  if (!r.ok) return;                       // silent no-op on cooldown / empty
  Object.assign(state, r.newState);
  const phrase = pickDialog(npcId, currentSeason, r.newState.npcs.bonds[npcId], rng);
  spawnFloater(`${phrase} (+${r.delta})`, r.isFavorite ? "gold" : "cream", x, y);
  ```
- `src/GameScene.js` — `closeSeason()` resets:
  ```js
  for (const id of NPC_IDS) state.npcs.giftCooldown[id] = 0;
  ```

**Manual Verify Walk-through:**
1. Fresh save. Console: `gameState.npcs.giftCooldown` shows `{wren:0, mira:0, ...}` (all 0).
2. Set `gameState.inventory.flour = 5`. Tap Mira → Give Gift → flour. Confirm bond
   moves to 5.5, inventory.flour = 4, floater says "(+0.5)".
3. Try to gift Mira again — button is disabled, click does nothing.
4. Tap Bram → Give Gift → flour (not his favorite). Confirm bond 5 → 5.2 (+0.2).
5. Force `CLOSE_SEASON`. Mira's button re-enables. Gift her again — works (+0.5).
6. Empty `gameState.inventory.flour` to 0 via console. Open Mira's gift modal —
   flour is no longer in the list (only items with qty > 0 are listed).
7. `runSelfTests()` passes all 6.2 assertions.

---

### 6.3 — Dialog pools (per NPC × season × bond band)

**What this delivers:** Each NPC has a dialog pool keyed by `(npcId, season, bondBand)`
returning a small array of phrases. When an NPC delivers an order, accepts a gift,
or arrives via a story beat (Phase 2), a small dialog floater pulls one phrase at
random from the matching pool. A Beloved Mira in summer says different things than
a Sour Mira in winter — so the village *changes voice* with the season and the
relationship. `pickDialog(npcId, season, bond, rng)` is a pure function: given the
same `rng` seed, it returns the same phrase, so playthroughs are deterministic and
testable. Build out at least the (5 NPCs × 4 seasons × 4 bands) = **80 cells**, with
at least 3 phrases per cell — placeholders are fine where flavor isn't critical yet.

**Completion Criteria:**
- [ ] `src/features/npcs/dialog.js` exports `DIALOG_POOLS` and `pickDialog(npcId, season, bond, rng)`
- [ ] `DIALOG_POOLS[npcId][season][bandName]` returns an array of 3+ phrase strings
- [ ] Every cell of the (5 × 4 × 4) = 80-cell matrix has at least 1 entry — no `undefined`
- [ ] `pickDialog` is pure: same `(npcId, season, bond, rngSeed)` → same phrase
- [ ] Bond is mapped through `bondBand(bond).name` — bond 5 reads from "Warm",
  bond 8 reads from "Liked"
- [ ] If a cell is missing, `pickDialog` falls back to a generic `"<NPC name>: '...'"`
  string and emits a console warning (not a crash)
- [ ] Order delivery, gift acceptance, and NPC arrival all call `pickDialog`
- [ ] Phrase format starts with `"<NPC display name>: '"` so the speaker is always named

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { DIALOG_POOLS, pickDialog } from "./features/npcs/dialog.js";
import { NPC_DATA, NPC_IDS } from "./features/npcs/data.js";
import { BOND_BANDS } from "./features/npcs/data.js";

const SEASONS = ["spring", "summer", "autumn", "winter"];

// 80-cell coverage: every (npc, season, band) has ≥1 phrase
let cells = 0;
for (const id of NPC_IDS) {
  for (const s of SEASONS) {
    for (const band of BOND_BANDS) {
      const arr = DIALOG_POOLS?.[id]?.[s]?.[band.name];
      assert(Array.isArray(arr) && arr.length >= 1,
             `${id}.${s}.${band.name} has ≥1 phrase`);
      assert(arr.every((p) => typeof p === "string" && p.length > 0),
             `${id}.${s}.${band.name} phrases are non-empty strings`);
      cells++;
    }
  }
}
assert(cells === 80, "exactly 80 (5 × 4 × 4) dialog cells covered");

// Phrases name the speaker
const sample = DIALOG_POOLS.mira.summer.Warm[0];
assert(sample.startsWith("Mira:"), "Mira phrases start with 'Mira:'");
assert(DIALOG_POOLS.liss.winter.Sour[0].startsWith("Sister Liss:"),
       "Liss phrases use her display name");

// Determinism: same rng → same phrase
const rngA = mulberry32(1234);
const rngB = mulberry32(1234);
const a = pickDialog("mira", "summer", 5, rngA);
const b = pickDialog("mira", "summer", 5, rngB);
assert(a === b, "pickDialog is deterministic given equal rng seeds");

// Bond band routing: bond 5 hits Warm pool, bond 8 hits Liked pool
const rngWarm  = mulberry32(99);
const rngLiked = mulberry32(99);
const phraseWarm  = pickDialog("mira", "summer", 5, rngWarm);
const phraseLiked = pickDialog("mira", "summer", 8, rngLiked);
assert(DIALOG_POOLS.mira.summer.Warm.includes(phraseWarm),
       "bond 5 phrase comes from Warm pool");
assert(DIALOG_POOLS.mira.summer.Liked.includes(phraseLiked),
       "bond 8 phrase comes from Liked pool, not Warm");
assert(phraseWarm !== phraseLiked || !DIALOG_POOLS.mira.summer.Warm.includes(phraseLiked),
       "Warm and Liked pools are not aliased");

// Missing cell falls back, does not throw
const fallback = pickDialog("mira", "summer", 5, mulberry32(1), { cell: "missing" });
assert(typeof fallback === "string" && fallback.length > 0,
       "missing cell fallback is a string, not undefined");

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```
Run — confirm: `Cannot find module './features/npcs/dialog.js'`.

*Gameplay simulation (player at level 8, autumn, Mira at bond 7.4):*
Player delivers Mira's wheat order. Floater rises:
`Mira: "The harvest's been kind — I'll set aside a loaf for you." (+135◉)`.
Player gives Mira flour next turn — different floater:
`Mira: "Oh — flour! There'll be honey-rolls by Sunday." (+0.5)`.
Player advances to winter. Mira's autumn pool falls silent; her winter pool
takes over. Now her delivery line reads:
`Mira: "The oven's warm at least. Thank you for the flour."`. The player feels
Mira shift mood with the season — same person, different season-flavored voice.
Two seasons later her bond falls to Warm via decay — her phrases drop *back* into
the more reserved Warm pool, and the difference is audible.

Designer reflection: *Does the same NPC across 4 seasons × 4 bands feel like 16
flavors of one person, or 16 disconnected people? Is 3 phrases per cell enough
variety, or does the player hear the same line on the second delivery and lose
the illusion?*

**Implementation:**
- New file `src/features/npcs/dialog.js`. Structure (pattern shown for one NPC; the
  other 4 follow the same shape, 3 phrases per cell, 80 cells total):
  ```js
  import { bondBand } from "./bond.js";
  import { NPC_DATA } from "./data.js";

  export const DIALOG_POOLS = {
    mira: {
      spring: {
        Sour:    ["Mira: 'The dough won't rise without help.'",
                  "Mira: 'I'll bake when the order's filled, not before.'",
                  "Mira: 'Spring comes slow without flour.'"],
        Warm:    ["Mira: 'The fields are waking. Bread soon.'",
                  "Mira: 'A fair morning for a fair loaf.'",
                  "Mira: 'I'll save you a heel of the rye.'"],
        Liked:   ["Mira: 'The fields are kind to us today.'",
                  "Mira: 'Two more loaves and we'll have enough for the orphanage.'",
                  "Mira: 'Spring's hand on the dough — nothing finer.'"],
        Beloved: ["Mira: 'You've made this whole vale smell of bread.'",
                  "Mira: 'I named the new oven after you. Don't laugh.'",
                  "Mira: 'There's a basket on the sill. It's yours.'"],
      },
      summer: {
        Sour:    ["Mira: 'Hot ovens, cold help.'",
                  "Mira: 'Bring flour or bring shade.'",
                  "Mira: 'Summer wheat won't grind itself.'"],
        Warm:    ["Mira: 'The fields are kind today.'",
                  "Mira: 'Honey-rolls by sundown if you're quick.'",
                  "Mira: 'Good summer. Good bread.'"],
        Liked:   ["Mira: 'The harvest's been kind — I'll set aside a loaf.'",
                  "Mira: 'Two more loaves and we'll feed the orphanage.'",
                  "Mira: 'Summer's flour is the sweetest. Tell no one.'"],
        Beloved: ["Mira: 'You walk in and the dough rises faster, I swear it.'",
                  "Mira: 'There's a pie cooling for you. No, I won't take coin.'",
                  "Mira: 'The whole vale eats well because of you.'"],
      },
      autumn: {
        Sour:    ["Mira: 'Rain on the rye. Rain on my mood.'",
                  "Mira: 'Late harvest, late bread. Don't ask.'",
                  "Mira: 'The grain's damp. I'm damp. Both unhappy.'"],
        Warm:    ["Mira: 'Autumn flour is heavy — good for the long loaves.'",
                  "Mira: 'I'll set aside the seed-loaves for the festival.'",
                  "Mira: 'Cool morning. Good baking.'"],
        Liked:   ["Mira: 'The oven runs all day this season — warm yourself by it.'",
                  "Mira: 'The harvest's been kind. I'll set aside a loaf for you.'",
                  "Mira: 'There'll be honey-rolls by Sunday.'"],
        Beloved: ["Mira: 'You brought us through another harvest. Thank you.'",
                  "Mira: 'The festival larder's filling fast. I'll bake double.'",
                  "Mira: 'Walk with me to the orphanage — they should meet you.'"],
      },
      winter: {
        Sour:    ["Mira: 'The oven's cold. The flour's low. The mood's worse.'",
                  "Mira: 'Don't bother me unless you've brought flour.'",
                  "Mira: 'Frost in the rye-bin. I am not pleased.'"],
        Warm:    ["Mira: 'The oven's warm, at least. Thank you for the flour.'",
                  "Mira: 'Cold work, but the bread keeps folks alive.'",
                  "Mira: 'A loaf for the road — careful, it's hot.'"],
        Liked:   ["Mira: 'Half the vale eats my bread this winter. That's your doing.'",
                  "Mira: 'Stay by the oven a moment — you look frozen.'",
                  "Mira: 'I'll bake through the night if it keeps the children fed.'"],
        Beloved: ["Mira: 'You kept us fed through the dark months.'",
                  "Mira: 'There's a loaf with your name shaped into the crust.'",
                  "Mira: 'The hearth's yours as much as anyone's.'"],
      },
    },
    // tomas, bram, liss, wren — same shape, 4 seasons × 4 bands × 3+ phrases each.
    // Many will start as placeholders ("<Name>: 'placeholder summer warm 1'")
    // and get rewritten in polish; the *coverage* is what 6.3 ships.
    tomas: { /* 12 cells × 3 phrases */ },
    bram:  { /* 12 cells × 3 phrases */ },
    liss:  { /* 12 cells × 3 phrases */ },
    wren:  { /* 12 cells × 3 phrases */ },
  };

  export function pickDialog(npcId, season, bond, rng, opts = {}) {
    const bandName = bondBand(bond).name;
    const pool = DIALOG_POOLS?.[npcId]?.[season]?.[bandName];
    if (!Array.isArray(pool) || pool.length === 0) {
      console.warn(`[dialog] missing ${npcId}.${season}.${bandName} — falling back`);
      const name = NPC_DATA[npcId]?.displayName ?? npcId;
      return `${name}: '...'`;
    }
    const idx = Math.floor((rng?.() ?? Math.random()) * pool.length);
    return pool[idx];
  }
  ```
- `src/GameScene.js` — three call sites for `pickDialog`:
  - `commitOrder()` after `payOrder` floater
  - `dispatch("GIVE_GIFT")` (already wired in 6.2)
  - `applyBeatResult({spawnNPC: id})` — fire an "arrival" line from the current
    `(season, bond)` pool when the NPC's portrait slides in
- `src/utils.js` — expose a seeded `mulberry32` rng for deterministic tests; in
  prod the `rng` arg defaults to `Math.random`.
- `runSelfTests()` integration assertion: deliver a Mira order at bond 8 in summer,
  capture the spawned floater text, assert it appears in `DIALOG_POOLS.mira.summer.Liked`.

**Manual Verify Walk-through:**
1. Fresh save. Force `gameState.npcs.bonds.mira = 5`. Deliver Mira's first order in
   spring. Confirm a floater fires with text starting `"Mira: '"` and matching one
   of `DIALOG_POOLS.mira.spring.Warm`.
2. Set `gameState.npcs.bonds.mira = 8`. Deliver again. Confirm the floater pulls
   from `DIALOG_POOLS.mira.spring.Liked` (different text).
3. Advance to summer. Deliver again at bond 8. Confirm the line is from
   `mira.summer.Liked`, not `mira.spring.Liked`.
4. Console: temporarily delete `DIALOG_POOLS.mira.summer.Sour`. Set bond to 3 and
   deliver. Confirm a fallback string fires and a console warning logs (no crash).
5. Run `pickDialog("mira", "summer", 5, mulberry32(42))` twice in console — same string both times.
6. Give Mira a flour gift — floater uses dialog pool, not the static voice line from
   the old `NPCS` constant.
7. `runSelfTests()` passes all 6.3 assertions.

---

## Phase 6 Sign-off Gate

Play 3 multi-season playthroughs from a fresh save covering: a *gifting* run
(every NPC gifted their favorite every season), a *neglect* run (no gifts, watch
decay carry bonds to ~3 by autumn of year 2), and a *mixed* run (Mira always
favorited, others ignored — confirm Mira hits Beloved while others sit at Warm).
Before moving to Phase 7, confirm all:

- [ ] 6.1–6.3 Completion Criteria all checked
- [ ] **Every order card displays `+<n>◉ ×<mod> · <bandName>` for the speaking NPC**
  — no order card ever shows just `+135◉` with no modifier label, even at Warm
- [ ] After 5 deliveries to Mira in one season (no gifts, no decay yet), her bond
  sits at `5.0 + 5×0.3 = 6.5` and her order cards display `×1.00 · Warm` (band 5–6
  range — the multiplier hasn't stepped to Liked yet at 6.5)
- [ ] After 7 deliveries (bond 7.1) Mira's cards step to `×1.15 · Liked` and the
  multiplier change is *visibly* the cause of higher payouts
- [ ] **Giving Bram an ingot at Warm bumps him to 5.5; giving him a log instead
  bumps him to 5.2** — favorite vs non-favorite difference is observable in one gift
- [ ] **Decay only fires above bond 5** — a neglected NPC sitting at bond 4 stays
  at 4 across 6 seasons; a neglected NPC at bond 8 drops to 7.4 after 6 seasons
- [ ] Order-delivery floater pulls a phrase from the NPC's *current* `(season, band)`
  pool — gift Mira to Liked, deliver, confirm phrase appears in
  `DIALOG_POOLS.mira.<season>.Liked`, not Warm
- [ ] **Gift cooldown resets on `CLOSE_SEASON`** — gift Mira in spring, fail to
  re-gift, season ticks to summer, gift Mira again — succeeds with full +0.5
- [ ] Save/reload preserves: `bonds`, `giftCooldown`, dialog determinism is not
  required across reload (rng is fresh per session)
- [ ] `DEV/RESET_GAME` zeroes bonds back to 5, cooldowns to 0, no stale gift state
- [ ] `runSelfTests()` passes for all Phase 6 tests
- [ ] Designer gut-check: *Does showing the multiplier on every order card make
  bond feel like a system worth managing, or like another number cluttering the UI?*
