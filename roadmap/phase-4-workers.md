# Phase 4 — Workers wired

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Workers stop being decorative wallet decorations and start
*changing how the board plays*. After hiring all 3 of Hilda the Farmhand, a chain of 3
hay — which used to drop nothing but raw hay — now spawns a wheat upgrade at the
endpoint. Pip the Forager makes berry tiles cluster more thickly in next season's
pool. Tuck the Lookout drops a steady 30 coins each season-end without the player
lifting a finger. And when wages aren't met, the team doesn't quit — they clock in
but produce nothing until the player can pay the back-pay.

**Why now:** Phase 3 wired coins, market drift, runes, and bombs into a real economy.
Workers slot directly into that economy: wages debit from `state.coins` — the same
coin pool the Market uses — missed wages roll over as debt that auto-clears against
the next order payment, and Tuck's `season_bonus` adds a coin trickle to the same
ledger. Before the economy existed there was nothing for wages to *be*; before workers
exist, the economy has nothing meaningful to spend on past one-shot building
purchases. Phase 4 is the first phase where the player's choices about who works for
them feed back into the puzzle on the board.

**Entry check:** [Phase 3 Sign-off Gate](./phase-3-economy.md#phase-3-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 4.1 — Worker data model (max-effect, not per-hire-as-base)

**What this delivers:** A locked, single-source-of-truth catalog of the 6 farm workers
from GAME_SPEC §12. Each worker stores its **max effect** — the value when every slot
is filled. Per-hire effect is computed as `effect ÷ maxCount`. This rule is the most
fragile design decision in the project; it must be tested explicitly so it can never
silently regress to "per-hire is the base, max is a sum".

**Completion Criteria:**
- [ ] `src/features/apprentices/data.js` exports `WORKERS` array and `WORKER_MAP`
  (replaces the existing `APPRENTICES`; legacy alias re-export stays for one phase)
- [ ] Each entry has: `{ id, name, role, maxCount, effect, hireCost, wage, requirement }`
- [ ] `effect.type` is one of: `threshold_reduce` / `pool_weight` / `bonus_yield` / `season_bonus`
- [ ] All 6 farm workers present: Hilda, Pip, Wila, Tuck, Osric, Dren — wages match
  GAME_SPEC §12 (15/12/20/20/40/25)
- [ ] Hilda's effect is `{ type: "threshold_reduce", key: "hay", from: 6, to: 3 }` with
  `maxCount: 3` (so per-hire reduce = `(6-3)/3 = 1`)
- [ ] State holds `state.workers = { hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0 }, debt: 0 }`
- [ ] Save schema persists `state.workers`; old saves migrate by initialising `hired` to 0s
- [ ] `DEV/RESET_GAME` resets `state.workers` to the initial shape

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { WORKERS, WORKER_MAP } from "./features/apprentices/data.js";
import { initialState } from "./state.js";

assert(WORKERS.length === 6, "exactly 6 farm workers in Phase 4 catalog");
for (const id of ["hilda","pip","wila","tuck","osric","dren"]) {
  assert(WORKER_MAP[id], `WORKER_MAP has ${id}`);
}
for (const w of WORKERS) {
  assert(typeof w.id === "string" && typeof w.name === "string", `${w.id} ids`);
  assert(Number.isInteger(w.maxCount) && w.maxCount >= 1, `${w.id}.maxCount ≥ 1`);
  assert(["threshold_reduce","pool_weight","bonus_yield","season_bonus"]
    .includes(w.effect.type), `${w.id}.effect.type recognised`);
  assert(Number.isInteger(w.hireCost) && Number.isInteger(w.wage), `${w.id} cost/wage`);
}

// LOCKED: max-effect data model. Hilda fully hired moves hay 6 → 3.
const hilda = WORKER_MAP.hilda;
assert(hilda.effect.from === 6 && hilda.effect.to === 3,
       "Hilda full-slot moves hay 6 → 3 (NOT per-hire 6 → 5)");
assert(hilda.maxCount === 3, "Hilda has 3 slots");

// Per-hire = max ÷ maxCount. Walk all 4 hire counts.
const fullDelta = hilda.effect.from - hilda.effect.to;     // 3
const perHire   = fullDelta / hilda.maxCount;              // 1
assert(perHire === 1, "Hilda per-hire = (6-3)/3 = 1");
assert(hilda.effect.from - 1 * perHire === 5, "1 hire  → threshold 5");
assert(hilda.effect.from - 2 * perHire === 4, "2 hires → threshold 4");
assert(hilda.effect.from - 3 * perHire === 3, "3 hires → threshold 3");

// Wages match GAME_SPEC §12 exactly
const wages = { hilda:15, pip:12, wila:20, tuck:20, osric:40, dren:25 };
for (const [id, wage] of Object.entries(wages)) {
  assert(WORKER_MAP[id].wage === wage, `${id} wage ${wage}◉`);
}

// Initial state
const s0 = initialState();
assert(s0.workers && s0.workers.debt === 0, "state.workers exists, debt 0");
for (const id of Object.keys(wages)) {
  assert(s0.workers.hired[id] === 0, `${id} starts at 0 hired`);
}
```
Run — confirm: `WORKERS is not exported from './features/apprentices/data.js'`.

*Gameplay simulation (returning player who hired Hilda last season, opening a fresh save):*
The player loads their save and opens the Workers panel. They see Hilda with the
display "Hilda — Farmhand · 1 of 3". The card description reads "Reduces hay threshold
6 → 3 when fully hired (currently: 6 → 5)." The player thinks: *one Hilda gives me a
third of the way to the full effect; if I hire two more, hay chains of 3 will
upgrade.* That mental model lines up with the data: per-hire = full ÷ 3, and the card
surfaces both numbers.

Designer reflection: *Does the per-hire-vs-fully-hired distinction feel like an
honest progression, or like a bait-and-switch where the first hire under-delivers?
Is the "1 of 3" framing legible enough that a player picking up the game cold
understands hiring two more Hildas is a meaningful decision?*

**Implementation:**
- `src/features/apprentices/data.js` — replace contents with the locked Phase 4 catalog;
  keep an `APPRENTICES` re-export for legacy callers until Phase 6.
  ```js
  export const WORKERS = [
    { id: "hilda", name: "Hilda", role: "Farmhand", maxCount: 3,
      effect: { type: "threshold_reduce", key: "hay", from: 6, to: 3 },
      hireCost: 200, wage: 15, requirement: { building: "granary" } },
    { id: "pip",   name: "Pip",   role: "Forager",  maxCount: 2,
      effect: { type: "pool_weight", key: "berry", amount: 2 },
      hireCost: 150, wage: 12, requirement: { building: "inn" } },
    { id: "wila",  name: "Wila",  role: "Cellarer", maxCount: 2,
      effect: { type: "bonus_yield", key: "jam", amount: 2 },
      hireCost: 300, wage: 20, requirement: { building: "bakery" } },
    { id: "tuck",  name: "Tuck",  role: "Lookout",  maxCount: 1,
      effect: { type: "season_bonus", key: "coins", amount: 30 },
      hireCost: 100, wage: 20, requirement: { building: "inn" } },
    { id: "osric", name: "Osric", role: "Smith",    maxCount: 2,
      effect: { type: "threshold_reduce", key: "ore", from: 6, to: 4 },
      hireCost: 500, wage: 40, requirement: { building: "forge", orLevel: 4 } },
    { id: "dren",  name: "Dren",  role: "Miner",    maxCount: 2,
      effect: { type: "threshold_reduce", key: "stone", from: 8, to: 6 },
      hireCost: 350, wage: 25, requirement: { level: 2 } },
  ];
  export const WORKER_MAP = Object.fromEntries(WORKERS.map((w) => [w.id, w]));
  // Legacy alias; removed in Phase 6 when the apprentices UI is migrated.
  export const APPRENTICES = WORKERS;
  export const APPRENTICE_MAP = WORKER_MAP;
  ```
- `src/state.js:initialState()` — add
  `workers: { hired: { hilda:0, pip:0, wila:0, tuck:0, osric:0, dren:0 }, debt: 0 }`.
- Save schema — `state.workers` is non-volatile, so the existing `persistState` loop
  picks it up automatically. On load, merge into the initial shape so pre-Phase-4
  saves get a fresh `hired: {...}` block.
- `DEV/RESET_GAME` — reset `state.workers` to a fresh clone of the initial shape.

**Manual Verify Walk-through:**
1. `npm run dev`. In console: `console.table((await import("./src/features/apprentices/data.js")).WORKERS)`.
   Confirm 6 rows, every row has `effect`, `maxCount`, `wage`.
2. `gameState.workers` shows `{ hired: { hilda: 0, ... }, debt: 0 }`.
3. Set `gameState.workers.hired.hilda = 2`. Refresh page. Confirm value persists.
4. `DEV/RESET_GAME`. Confirm `gameState.workers` resets to the fresh shape.
5. `runSelfTests()` passes all 4.1 assertions.

---

### 4.2 — `computeWorkerEffects(state)` pure aggregator

**What this delivers:** A single pure function walks `state.workers.hired`, looks up
each worker's max-effect, applies the per-hire formula `(N / maxCount) × fullDelta`,
and returns one aggregated object the rest of the game reads from. No file outside
this function is allowed to compute "what does Hilda do at 2 hires" — every consumer
calls this aggregator.

**Completion Criteria:**
- [ ] `src/features/apprentices/effects.js` exists and exports `computeWorkerEffects(state)`
- [ ] Pure: same input → same output; never mutates `state`
- [ ] Returns the locked shape:
  `{ thresholdReduce: {...}, poolWeight: {...}, bonusYield: {...}, seasonBonus: {...} }`
- [ ] Zero hires across the catalog → every value in the returned object is 0
- [ ] Effects of the same `type + key` from multiple workers stack additively
- [ ] When `state.workers.debt > 0`, the returned aggregate is the *zero* aggregate
  (production paused — see 4.4)
- [ ] Defensive: hired counts beyond `maxCount` are clamped — never over-deliver

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { computeWorkerEffects } from "./features/apprentices/effects.js";
import { WORKER_MAP } from "./features/apprentices/data.js";

const empty = { workers: { hired: { hilda:0, pip:0, wila:0, tuck:0, osric:0, dren:0 }, debt: 0 } };
const r0 = computeWorkerEffects(empty);
assert(r0.thresholdReduce.hay === 0,   "0 Hilda → 0 hay reduce");
assert(r0.poolWeight.berry    === 0,   "0 Pip   → 0 berry weight");
assert(r0.bonusYield.jam      === 0,   "0 Wila  → 0 jam bonus");
assert(r0.seasonBonus.coins   === 0,   "0 Tuck  → 0 coin bonus");

// Per-hire walk on Hilda (max-effect ÷ maxCount)
const withHilda = (n) => ({ workers: { hired: { ...empty.workers.hired, hilda: n }, debt: 0 } });
assert(computeWorkerEffects(withHilda(1)).thresholdReduce.hay === 1, "1 Hilda → 1 (6→5)");
assert(computeWorkerEffects(withHilda(2)).thresholdReduce.hay === 2, "2 Hilda → 2 (6→4)");
assert(computeWorkerEffects(withHilda(3)).thresholdReduce.hay === 3, "3 Hilda → 3 (6→3)");

// Stacking across types
const both = { workers: { hired: { ...empty.workers.hired, hilda: 3, pip: 2 }, debt: 0 } };
const rB = computeWorkerEffects(both);
assert(rB.thresholdReduce.hay === 3, "stacked: Hilda still 3");
assert(rB.poolWeight.berry    === 2, "stacked: Pip still 2");

// Additive same-key extensibility — synthetic worker map
const synthMap = { ...WORKER_MAP, ghost: { id:"ghost", maxCount:2,
  effect: { type:"threshold_reduce", key:"hay", from:4, to:2 } } };
const synthState = { workers: { hired: { hilda: 3, ghost: 2 }, debt: 0 } };
assert(computeWorkerEffects(synthState, synthMap).thresholdReduce.hay === 5,
       "two threshold_reduce on hay stack additively (3 + 2)");

// Debt suppresses ALL effects
const inDebt = { workers: { hired: { ...empty.workers.hired, hilda: 3, tuck: 1 }, debt: 5 } };
const rD = computeWorkerEffects(inDebt);
assert(rD.thresholdReduce.hay === 0, "debt > 0 → hay reduce suppressed");
assert(rD.seasonBonus.coins   === 0, "debt > 0 → coin bonus suppressed");

// Defensive clamp
const over = { workers: { hired: { ...empty.workers.hired, hilda: 99 }, debt: 0 } };
assert(computeWorkerEffects(over).thresholdReduce.hay === 3, "over-hired clamped to full-slot");

// Purity
const before = JSON.stringify(both);
computeWorkerEffects(both);
assert(JSON.stringify(both) === before, "computeWorkerEffects does not mutate");
```
Run — confirm: `Cannot find module './features/apprentices/effects.js'`.

*Gameplay simulation (designer tuning a balance pass mid-Phase 4):*
The designer wants to know whether a hypothetical 7th worker, "Bramble (Brewer)" with
`maxCount: 2` and `effect: { type: "bonus_yield", key: "jam", amount: 4 }`, stacks
with Wila. They wire Bramble into `WORKERS`, hire 1 Wila and 2 Bramble in dev console,
call `computeWorkerEffects(gameState)`, and read `bonusYield.jam`. Expected:
`(1/2)*2 + (2/2)*4 = 5`. The aggregator returns 5. This function is the *only* place
that math lives, and it's testable in 30 seconds without booting the Phaser scene.

Designer reflection: *Does it feel right that a half-hired worker delivers exactly
half the listed effect, with no minimum threshold? Watch a player at 1/3 Hilda — do
they feel they're getting value, or do they feel cheated until they fill the slot?*

**Implementation:**
- New file `src/features/apprentices/effects.js`:
  ```js
  import { WORKER_MAP as DEFAULT_MAP } from "./data.js";

  const ZERO = () => ({ thresholdReduce:{}, poolWeight:{}, bonusYield:{}, seasonBonus:{} });
  const add  = (b, k, n) => { if (n) b[k] = (b[k] ?? 0) + n; };

  export function computeWorkerEffects(state, workerMap = DEFAULT_MAP) {
    const out = ZERO();
    const hired = state?.workers?.hired ?? {};
    const debt  = state?.workers?.debt  ?? 0;
    if (debt > 0) return out; // LOCKED: debt > 0 pauses production

    for (const [id, raw] of Object.entries(hired)) {
      const w = workerMap[id];
      if (!w) continue;
      const count = Math.max(0, Math.min(raw | 0, w.maxCount));
      if (count === 0) continue;

      const e = w.effect;
      const perHireScalar = count / w.maxCount;
      switch (e.type) {
        case "threshold_reduce":
          add(out.thresholdReduce, e.key, (e.from - e.to) * perHireScalar);
          break;
        case "pool_weight":
          add(out.poolWeight, e.key, e.amount * perHireScalar);
          break;
        case "bonus_yield":
          add(out.bonusYield, e.key, e.amount * perHireScalar);
          break;
        case "season_bonus":
          add(out.seasonBonus, e.key, e.amount * perHireScalar);
          break;
        default: break;
      }
    }
    return out;
  }
  ```
- Note: per-hire division can produce non-integer values for some configurations
  (e.g. a hypothetical full-slot +3 with `maxCount: 2` is +1.5/hire). The board side
  rounds on application — Phase 4.3 uses `Math.max(1, ...)` against thresholds and
  `Math.round` against pool weights and bonus yields. Designers should pick `maxCount`
  values that keep per-hire numbers integer where the effect maps to a discrete board
  quantity.

**Manual Verify Walk-through:**
1. Console: `gameState.workers.hired.hilda = 2`, then call `computeWorkerEffects(gameState)`.
   Confirm `thresholdReduce.hay === 2`.
2. Set `hilda = 3, pip = 2, tuck = 1`. Re-call. Confirm `thresholdReduce.hay === 3`,
   `poolWeight.berry === 2`, `seasonBonus.coins === 30`.
3. Set `gameState.workers.debt = 1`. Re-call. Confirm every value is 0.
4. Clear debt. Set `hilda = 99`. Confirm `thresholdReduce.hay === 3` (clamped).
5. `runSelfTests()` passes all 4.2 assertions.

---

### 4.3 — Sync computed effects to Phaser registry

**What this delivers:** The aggregated effect object from 4.2 is pushed to the Phaser
registry on every state change touching `state.workers`. The chain-commit code in
`GameScene.collectPath()` reads `effectiveThresholds[key]` instead of the raw
`UPGRADE_THRESHOLDS[key]` from Phase 1; `fillBoard()` reads `effectivePoolWeights` to
shape the next refill; chain collection reads `bonusYields` to add per-chain extras
to the inventory total. The player sees the difference *on the actual board* — not in
a stat readout.

**Completion Criteria:**
- [ ] `src/GameScene.js` exposes `_syncWorkerEffects()` called on init and after every
  `APP/HIRE`, `APP/FIRE`, `CLOSE_SEASON`, `WORKERS/SET`, `PAY_DEBT`, `DEV/RESET_GAME`
- [ ] Registry keys written: `effectiveThresholds`, `effectivePoolWeights`, `bonusYields`, `seasonBonus`
- [ ] `effectiveThresholds[key] = max(1, UPGRADE_THRESHOLDS[key] - aggregate.thresholdReduce[key])`
- [ ] `upgradeCountForChain(length, key, thresholdMap?)` — Phase 1's helper extended with
  an optional thresholds map, falling back to `UPGRADE_THRESHOLDS`
- [ ] `collectPath()` passes `this.registry.get("effectiveThresholds")` as the third arg
- [ ] `fillBoard()` builds the spawn pool by taking `BIOMES[biome].pool` and pushing
  `Math.round(effectivePoolWeights[key])` extra copies of each affected key
- [ ] Chain collection adds `Math.round(bonusYields[key])` to the inventory delta only
  when the committed chain actually contained that resource
- [ ] Star markers (Phase 1.1) read effective thresholds, not raw, so the star appears
  at the reduced position
- [ ] After hiring 3 Hilda, a chain of exactly 3 hay yields 1 wheat upgrade — the
  horizontal-slice property of this phase

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { computeWorkerEffects } from "./features/apprentices/effects.js";
import { upgradeCountForChain } from "./utils.js";
import { UPGRADE_THRESHOLDS } from "./constants.js";

function effThresholds(agg) {
  const out = {};
  for (const k of Object.keys(UPGRADE_THRESHOLDS)) {
    out[k] = Math.max(1, UPGRADE_THRESHOLDS[k] - (agg.thresholdReduce[k] ?? 0));
  }
  return out;
}

const empty = { workers: { hired: { hilda:0, pip:0, wila:0, tuck:0, osric:0, dren:0 }, debt: 0 } };
const t0 = effThresholds(computeWorkerEffects(empty));
assert(t0.hay === 6,                                "no Hilda → hay 6");
assert(upgradeCountForChain(3, "hay", t0) === 0,    "no Hilda + 3-chain → 0 upgrades");

const fullH = { workers: { hired: { ...empty.workers.hired, hilda: 3 }, debt: 0 } };
const t1 = effThresholds(computeWorkerEffects(fullH));
assert(t1.hay === 3,                                "3 Hilda → hay 3");
assert(upgradeCountForChain(3, "hay", t1) === 1,    "3 Hilda + 3-chain → 1 wheat");
assert(upgradeCountForChain(6, "hay", t1) === 2,    "3 Hilda + 6-chain → 2 wheat");

// Floor: never below 1
const synth = { thresholdReduce: { hay: 99 }, poolWeight:{}, bonusYield:{}, seasonBonus:{} };
assert(effThresholds(synth).hay === 1, "threshold floors at 1");

// Pool weight: full Pip adds 2 berry copies
function buildPool(base, agg) {
  const pool = [...base];
  for (const [k, n] of Object.entries(agg.poolWeight)) {
    for (let i = 0; i < Math.round(n); i++) pool.push(k);
  }
  return pool;
}
const farmBase = ["hay","hay","hay","log","log","wheat","berry","berry","egg"];
const fullPip  = { workers: { hired: { ...empty.workers.hired, pip: 2 }, debt: 0 } };
const pool = buildPool(farmBase, computeWorkerEffects(fullPip));
assert(pool.filter(k => k === "berry").length === 4, "base 2 + Pip 2 = 4 berries");

// Bonus yield
const fullW = { workers: { hired: { ...empty.workers.hired, wila: 2 }, debt: 0 } };
assert(computeWorkerEffects(fullW).bonusYield.jam === 2, "full Wila → +2 jam/chain");

// upgradeCountForChain falls back to base thresholds when no map passed
assert(upgradeCountForChain(6, "hay") === 1, "fallback to UPGRADE_THRESHOLDS");
```
Run — confirm: `upgradeCountForChain` only accepts 2 args, or registry not seeded.

*Gameplay simulation (player on session 5, just hired their 3rd Hilda):*
The player has 12 hay tiles spawning thickly in the early board. With 0 Hilda last
session, the same player would chain 4 hay and get 4 raw hay. This session, with 3
Hilda, they chain 3 hay and the game pops a wheat tile at the endpoint — the first
visible *gameplay* difference workers have ever made. Two turns later they realise
they should be aiming for 6-chains again, because at threshold 3 a chain of 6 now
spawns 2 wheat instead of 1. The threshold reduction didn't make the game easier — it
moved the *interesting* chain length from 6 to 3, and shifted the overchain optimum
from 12 to 6. The board feels reshaped, not weakened.

Designer reflection: *Is the board change legible? Does the player notice the wheat
appearing where it didn't before, or do they need a "Workers active" HUD chip to know
something changed? If they don't notice within 1 session, the wire isn't doing its job.*

**Implementation:**
- `src/utils.js:upgradeCountForChain` — extend signature:
  ```js
  import { UPGRADE_THRESHOLDS } from "./constants.js";
  export function upgradeCountForChain(chainLength, resourceKey, thresholdMap = UPGRADE_THRESHOLDS) {
    const t = thresholdMap[resourceKey];
    if (!t) return 0;
    return Math.floor(chainLength / t);
  }
  ```
- `src/GameScene.js` — add a `_syncWorkerEffects()` method called from scene `init()`
  and after every dispatch whose action.type triggers a worker change:
  ```js
  import { computeWorkerEffects } from "./features/apprentices/effects.js";
  import { UPGRADE_THRESHOLDS } from "./constants.js";

  _syncWorkerEffects() {
    const agg = computeWorkerEffects(this._state());
    const eff = {};
    for (const [k, v] of Object.entries(UPGRADE_THRESHOLDS)) {
      eff[k] = Math.max(1, v - (agg.thresholdReduce[k] ?? 0));
    }
    this.registry.set("effectiveThresholds",  eff);
    this.registry.set("effectivePoolWeights", agg.poolWeight);
    this.registry.set("bonusYields",          agg.bonusYield);
    this.registry.set("seasonBonus",          agg.seasonBonus);
  }
  ```
- `src/GameScene.js:collectPath()` — replace `upgradeCountForChain(length, res.key)` with
  `upgradeCountForChain(length, res.key, this.registry.get("effectiveThresholds"))`.
  After computing per-resource collected counts, apply bonus yield only to keys that
  appeared in the chain:
  ```js
  const bonus = this.registry.get("bonusYields") ?? {};
  for (const [k, n] of Object.entries(bonus)) {
    if (collected[k]) collected[k] += Math.round(n);
  }
  ```
- `src/GameScene.js:fillBoard()` — when picking from the biome pool:
  ```js
  const base  = BIOMES[biomeKey].pool;
  const boost = this.registry.get("effectivePoolWeights") ?? {};
  const pool  = [...base];
  for (const [k, n] of Object.entries(boost)) {
    for (let i = 0; i < Math.round(n); i++) pool.push(k);
  }
  // pick from `pool` as before
  ```
- Star marker code in `redrawPath()` (Phase 1.1) reads from
  `this.registry.get("effectiveThresholds")[key]`, not the raw constant.

**Manual Verify Walk-through:**
1. Console: `gameState.workers.hired.hilda = 3`. Trigger `_syncWorkerEffects()`.
   Confirm `registry.get("effectiveThresholds").hay === 3`.
2. Drag a chain of exactly 3 hay. Confirm a star appears at tile 3 and a wheat tile
   spawns at the endpoint after collapse.
3. Set `hilda = 0`. Drag 3 hay. Confirm no star, no wheat.
4. Set `pip = 2`, force several board fills. Berry count over 50 fills should average
   noticeably higher than baseline.
5. Set `wila = 2`, then chain a jam tile. Confirm `+2 Jam` bonus appears in the
   floater alongside the chain count.
6. Set `osric = 2`. Confirm `effectiveThresholds.ore === 4`. In Mine biome, chain 4
   ore — confirm 1 ingot upgrade.
7. `runSelfTests()` passes all 4.3 assertions.

---

### 4.4 — Wages on `CLOSE_SEASON` + debt rollover (no auto-fire)

**What this delivers:** At every season-end, the game sums each hired worker's wage
and debits `state.coins`. If coins fall short, the shortfall accumulates in
`state.workers.debt`. While `debt > 0`, `computeWorkerEffects` returns the zero
aggregate — production is paused but the workers stay on the books. When the player
later receives coins, debt is auto-paid down *before* coins land in the player's
purse. Once debt clears, the next `CLOSE_SEASON` resumes wage deduction normally and
effects re-apply.

**Completion Criteria:**
- [ ] `CLOSE_SEASON` reducer computes `totalWages = sum(WORKER_MAP[id].wage * count)`
  over all hired worker counts (not the legacy `hiredApprentices` array)
- [ ] If `coins >= totalWages`: deduct full wages, no debt change
- [ ] Otherwise: pay what's possible; remainder added to `state.workers.debt`
- [ ] Workers are NEVER fired automatically — `state.workers.hired` is unchanged on
  missed wages (locked decision)
- [ ] `state.workers.debt > 0` enforces 4.2's debt-suppress rule (zero aggregate)
- [ ] Auto-debt-repayment fires on every coin-credit reducer: `TURN_IN_ORDER`,
  `SELL_RESOURCE`, `LOGIN_TICK`, plus the `season_bonus` payout itself
- [ ] Debt repaid *before* coins land — if order pays 50 and debt is 30, the player
  sees +20 coins and `debt: 0`
- [ ] `season_bonus.coins` from Tuck is credited *after* wages debit (Tuck pays his own
  wage out of the prior balance, not his bonus); also: while debt > 0, no bonus paid
- [ ] Debt capped at `MAX_DEBT = 9999` to avoid degenerate-save overflow
- [ ] Season summary shows "Wages unpaid: -N◉ debt" when debt rises this season; HUD
  shows a "Workers idle — wages owed" indicator while `debt > 0`
- [ ] "Debt cleared!" bubble fires the moment `debt` ticks to 0 from any source

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";
import { computeWorkerEffects } from "./features/apprentices/effects.js";

const base = initialState();

// A: 100 coins, 1 Hilda, wage 15 → 85 coins, 0 debt, still hired
const a0 = { ...base, coins: 100,
  workers: { hired: { ...base.workers.hired, hilda: 1 }, debt: 0 } };
const a1 = rootReducer(a0, { type: "CLOSE_SEASON" });
assert(a1.coins === 85,              "100 - 15 = 85");
assert(a1.workers.debt === 0,        "no debt");
assert(a1.workers.hired.hilda === 1, "worker NOT fired");

// B: 10 coins, same Hilda → 0 coins, 5 debt, still hired
const b0 = { ...base, coins: 10,
  workers: { hired: { ...base.workers.hired, hilda: 1 }, debt: 0 } };
const b1 = rootReducer(b0, { type: "CLOSE_SEASON" });
assert(b1.coins === 0,                "paid what possible");
assert(b1.workers.debt === 5,         "5 coin shortfall");
assert(b1.workers.hired.hilda === 1,  "Hilda stays — locked: no auto-fire");

// C: with debt, effects suppressed
assert(computeWorkerEffects(b1).thresholdReduce.hay === 0,
       "debt > 0 → effects paused");

// D: order auto-pays debt before crediting coins
const d1 = rootReducer(b1, { type: "TURN_IN_ORDER", payload: { reward: 50, orderId: "t" } });
assert(d1.workers.debt === 0, "5 debt cleared by 50-coin order");
assert(d1.coins === 45,       "remainder lands as +45 coins");

// E: effects resume after debt clears
assert(computeWorkerEffects(d1).thresholdReduce.hay === 1, "1 Hilda → reduce 1");

// F: Tuck — 20 coins, wage 20, season_bonus +30 → 30 coins (bonus AFTER wages)
const f0 = { ...base, coins: 20,
  workers: { hired: { ...base.workers.hired, tuck: 1 }, debt: 0 } };
const f1 = rootReducer(f0, { type: "CLOSE_SEASON" });
assert(f1.coins === 30,         "20 - 20 + 30 = 30");
assert(f1.workers.debt === 0,   "Tuck self-funds his wage");

// G: Tuck in debt — bonus suppressed
const g0 = { ...base, coins: 5,
  workers: { hired: { ...base.workers.hired, tuck: 1 }, debt: 0 } };
const g1 = rootReducer(g0, { type: "CLOSE_SEASON" });
assert(g1.coins === 0,          "paid 5 of 20 wage");
assert(g1.workers.debt === 15,  "15 debt incurred");
// season_bonus NOT paid (debt > 0 after wage step)

// H: multi-worker shortfall
const h0 = { ...base, coins: 50,
  workers: { hired: { ...base.workers.hired, hilda: 3, pip: 1 }, debt: 0 } };
const h1 = rootReducer(h0, { type: "CLOSE_SEASON" });
assert(h1.coins === 0,                "50 paid against 57 wages (45+12)");
assert(h1.workers.debt === 7,         "7 coin shortfall");
assert(h1.workers.hired.hilda === 3,  "3 Hilda still on the books");
```
Run — confirm: `wage debit not implemented` or `state.workers.debt is undefined`.

*Gameplay simulation (player blowing all coins on the Forge mid-Act-2):*
The player has 1 Hilda, 1 Wila, and 1 Tuck (wages 15+20+20 = 55). At season-end they
have 30 coins because they just spent 700 on the Forge. The wage tick fires: 30
deducted, +25 debt incurred. Tuck's bonus is suppressed (debt > 0 after wage step).
Net: 0 coins, 25 debt outstanding. Effects pause — Hilda's hay reduction stops,
Wila's jam bonus stops. The next session, the player ships a 75-coin order; auto-pay
hits 25 against debt, the player gets +50 coins, and a "Debt cleared!" bubble pops.
On the next `CLOSE_SEASON`, wages debit normally and effects resume.

Designer reflection: *Does pausing-instead-of-firing feel like a relief (the player
didn't lose progress) or like a soft trap (their workers are silently inert)? Does
the "Workers idle — wages owed" HUD indicator make the problem visible enough that
the player understands why their hay chains stopped upgrading?*

**Implementation:**
- `src/state.js` — `MAX_DEBT = 9999`. Extend the `CLOSE_SEASON` reducer (or the
  apprentices slice handler for it). The wage step replaces the legacy
  `for (const hired of hiredApprentices)` block in `features/apprentices/slice.js`:
  ```js
  // Sum wages from the new state.workers.hired counts
  let coins = state.coins;
  let debt  = state.workers.debt ?? 0;
  let totalWages = 0;
  for (const [id, count] of Object.entries(state.workers.hired)) {
    const w = WORKER_MAP[id];
    if (!w || count <= 0) continue;
    totalWages += w.wage * count;
  }
  if (coins >= totalWages) coins -= totalWages;
  else { debt += (totalWages - coins); coins = 0; }

  // season_bonus AFTER wages, AND only when not in debt
  if (debt === 0) {
    const agg = computeWorkerEffects({ ...state, workers: { ...state.workers, debt: 0 } });
    coins += Math.round(agg.seasonBonus.coins ?? 0);
  }
  return { ...state, coins, workers: { ...state.workers, debt: Math.min(debt, MAX_DEBT) } };
  ```
- New helper in `src/state.js`:
  ```js
  function applyDebtRepayment(state, incomingCoins) {
    const debt = state.workers?.debt ?? 0;
    if (debt <= 0 || incomingCoins <= 0) return { coinsCredit: incomingCoins, newDebt: debt };
    if (incomingCoins >= debt)            return { coinsCredit: incomingCoins - debt, newDebt: 0 };
    return { coinsCredit: 0, newDebt: debt - incomingCoins };
  }
  ```
- Apply `applyDebtRepayment` at the head of every coin-crediting reducer
  (`TURN_IN_ORDER`, `SELL_RESOURCE`, `LOGIN_TICK`, the season-bonus credit itself).
- `src/GameScene.js` — fire a `wages_unpaid` floater when a `CLOSE_SEASON` returns
  with `newDebt > prevDebt`, and a `debt_cleared` bubble whenever `newDebt === 0`
  while `prevDebt > 0`.
- HUD chip — when `state.workers.debt > 0`, show a small red coin icon with `-N` next
  to the season counter. Tooltip: "Wages unpaid — workers are idle."

**Manual Verify Walk-through:**
1. `gameState.coins = 100; gameState.workers.hired.hilda = 1`. Trigger `CLOSE_SEASON`.
   Confirm coins = 85, debt = 0.
2. Set `coins = 10, hilda = 1, debt = 0`. Trigger `CLOSE_SEASON`. Confirm coins = 0,
   debt = 5, `hired.hilda` still 1.
3. Confirm `effectiveThresholds.hay === 6` (debt suppresses Hilda).
4. Force a 50-coin order completion. Confirm `debt = 0`, `coins = 45`. Confirm
   `effectiveThresholds.hay === 5` (1 Hilda re-active).
5. Set `coins = 20, tuck = 1, debt = 0`. Trigger `CLOSE_SEASON`. Confirm coins = 30,
   debt = 0.
6. Set `coins = 5, tuck = 1, debt = 0`. Trigger `CLOSE_SEASON`. Confirm coins = 0,
   debt = 15, no bonus paid. Sell ≥15 coins worth of resource; confirm debt clears
   and "Debt cleared!" bubble shows.
7. `runSelfTests()` passes all 4.4 assertions.

---

### 4.5 — Housing requirement gates hire count

**What this delivers:** Total hires across all workers are bounded by the player's
housing capacity. Each `housing` building grants +1 worker slot; the player has 1
baseline slot from the Hearth. The Workers panel hire button greys out at the cap,
the slot count is shown as a plain number ("3" — never "3/3" per locked decision),
and attempting to hire over the cap is a strict no-op. The player cannot accidentally
over-hire and end up with debt they can't escape.

**Completion Criteria:**
- [ ] `housing` is in `BUILDINGS` (cost from GAME_SPEC §11: 300◉ + 25 plank, lv 2)
- [ ] `housingCapacity(state) === 1 + (state.built.housing ? 1 : 0)` — Phase 4 ships
  with the boolean form to match the existing schema; if a future phase makes housing
  stackable, this becomes a count
- [ ] `totalHired(state) === sum(Object.values(state.workers.hired))`
- [ ] `APP/HIRE` (Phase 4 form: `{ type: "APP/HIRE", payload: { id } }`) validates
  `totalHired < housingCapacity` AND `hired[id] < WORKER_MAP[id].maxCount` AND existing
  hire-cost / requirement checks
- [ ] Over-cap hire returns the same state object (strict no-op — same reference)
- [ ] `APP/FIRE` decrements `hired[id]` (clamped at 0); does not refund coins or wage debt
- [ ] Workers panel header shows "Capacity: N" — the plain cap number, NOT a fraction
- [ ] Each worker row shows the slot count via `workerSlotLabel(worker)` which returns
  `String(worker.maxCount)` (e.g. "3"), never "3/3" (locked decision)
- [ ] Hire button greys out at cap with a tooltip distinguishing "Build Housing" from
  "Worker maxed"
- [ ] Building Housing raises capacity within 1 frame; the panel updates without page reload

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";
import { WORKER_MAP, workerSlotLabel, totalHired, housingCapacity }
  from "./features/apprentices/data.js";

const base = initialState();

// A: 0 housing → cap 1. First hire OK; second hire blocked (no-op, same ref).
const a0 = { ...base, coins: 9999, built: { granary: true, inn: true } };
assert(housingCapacity(a0) === 1, "no housing → capacity 1");

const a1 = rootReducer(a0, { type: "APP/HIRE", payload: { id: "hilda" } });
assert(a1.workers.hired.hilda === 1, "first hire lands");
assert(totalHired(a1) === 1,         "1 total hired");

const a2 = rootReducer(a1, { type: "APP/HIRE", payload: { id: "pip" } });
assert(a2 === a1, "over-cap hire is a strict no-op (same state ref)");

// B: 1 housing → cap 2. Two hires OK; third blocked.
const b0 = { ...a0, built: { ...a0.built, housing: true } };
assert(housingCapacity(b0) === 2, "1 housing → capacity 2");

let b1 = rootReducer(b0, { type: "APP/HIRE", payload: { id: "hilda" } });
b1     = rootReducer(b1, { type: "APP/HIRE", payload: { id: "pip" } });
assert(totalHired(b1) === 2, "two hires fit cap of 2");
const b2 = rootReducer(b1, { type: "APP/HIRE", payload: { id: "tuck" } });
assert(b2 === b1, "third hire over cap is no-op");

// C: maxCount cap — cannot hire 4th Hilda even with synthetic capacity
const c0 = { ...base, coins: 9999,
  built: { granary: true, housing: true, inn: true },
  workers: { hired: { hilda: 3, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0 }, debt: 0 } };
const c1 = rootReducer(c0, { type: "APP/HIRE", payload: { id: "hilda" } });
assert(c1.workers.hired.hilda === 3, "cannot exceed maxCount");

// D: FIRE decrements; no refund
const d0 = { ...c0 };
const d1 = rootReducer(d0, { type: "APP/FIRE", payload: { id: "hilda" } });
assert(d1.workers.hired.hilda === 2, "FIRE decrements");
assert(d1.coins === d0.coins,         "no refund on fire");
assert((d1.workers.debt ?? 0) === 0,  "no debt cleared on fire");

// E: Display rule — slot count is a plain number, not "N/N"
assert(workerSlotLabel(WORKER_MAP.hilda) === "3", "Hilda slot label is '3'");
assert(workerSlotLabel(WORKER_MAP.tuck)  === "1", "Tuck slot label is '1'");
```
Run — confirm: `Action APP/HIRE does not validate housing capacity` or
`workerSlotLabel is not exported`.

*Gameplay simulation (player at level 3, 1 Housing built, planning a hire spree):*
The player opens the Workers panel. Header reads "Capacity: 2". Hilda's row shows
"Hilda — Farmhand · 3 — 200◉" — bare "3" is her max, not a fraction. They tap Hire
on Hilda. They tap Hire again — second Hilda lands. The cap is now full and *every*
worker's Hire button greys out with tooltip "Build Housing for more capacity". They
go to Town, build another Housing (300◉ + 25 plank). Back in the Workers panel,
capacity is now 3, the Hire buttons re-enable, and they hire Pip for berry pool
weight. They never see a confusing "2/2" fraction — the cap is communicated by the
header number and by which buttons are enabled.

Designer reflection: *Does the plain-number display ("3") feel cleaner than the
fraction ("3/3"), or does it lose the "you've maxed this worker" signal? When
Hilda's individual cap is met, is it obvious that her Hire button greying out is
about her, not about housing — or do players blame the housing cap?*

**Implementation:**
- `src/constants.js:BUILDINGS` — append:
  ```js
  { id: "housing", name: "Housing Block",
    desc: "Quarters for hired hands. Each Housing raises your worker capacity by 1.",
    cost: { coins: 300, plank: 25 }, lv: 2,
    x: 1180, y: 380, w: 90, h: 100, color: "#a07a4a" },
  ```
- `src/features/apprentices/data.js` — add helpers:
  ```js
  export function workerSlotLabel(worker) { return String(worker.maxCount); }
  export function totalHired(state) {
    return Object.values(state?.workers?.hired ?? {}).reduce((a, b) => a + (b | 0), 0);
  }
  export function housingCapacity(state) {
    return 1 + (state?.built?.housing ? 1 : 0);
  }
  ```
- `src/features/apprentices/slice.js` — replace `APP/HIRE` and `APP/FIRE` bodies. New
  payload shape is `{ id }`:
  ```js
  if (action.type === "APP/HIRE") {
    const id = action.payload?.id;
    const w  = WORKER_MAP[id];
    if (!w) return state;
    const cur = state.workers.hired[id] ?? 0;
    if (cur >= w.maxCount) return state;                            // per-worker cap
    if (totalHired(state) >= housingCapacity(state)) return state;   // housing cap
    if ((state.coins ?? 0) < w.hireCost) return state;
    if (!checkRequirement(w, state)) return state;
    return { ...state,
      coins: state.coins - w.hireCost,
      workers: { ...state.workers,
        hired: { ...state.workers.hired, [id]: cur + 1 } },
      bubble: { id: Date.now(), npc: "mira",
        text: `${w.name} joins the crew! (${cur + 1} of ${w.maxCount})`, ms: 1800 },
    };
  }
  if (action.type === "APP/FIRE") {
    const id  = action.payload?.id;
    const cur = state.workers.hired[id] ?? 0;
    if (cur <= 0) return state;
    return { ...state,
      workers: { ...state.workers,
        hired: { ...state.workers.hired, [id]: cur - 1 } },
      bubble: { id: Date.now(), npc: "mira",
        text: `Let go a ${WORKER_MAP[id]?.name ?? "worker"}.`, ms: 1500 },
    };
  }
  ```
- `src/features/apprentices/index.jsx` — header `Capacity: {housingCapacity(state)}`
  (NOT `Hired: {n} / {cap}`); per-row label uses `workerSlotLabel(worker)`; Hire
  button `disabled` flag distinguishes which gate triggered the disable, and the
  tooltip varies accordingly. The legacy `hiredApprentices` array is unused going
  forward; UI panels read `state.workers.hired` instead.

**Manual Verify Walk-through:**
1. Fresh save. Workers panel header reads "Capacity: 1". Hilda's row reads
   "Hilda — Farmhand · 3 — 200◉" (plain "3").
2. With 200 coins, hire Hilda. Header still "Capacity: 1" (now full).
3. Try to hire Pip. Button greyed out, tooltip "Build Housing for more capacity".
4. Open Town, build a Housing. Workers panel header now "Capacity: 2" without page
   refresh.
5. Hire Pip. Total = 2.
6. `gameState.workers.hired.hilda = 3`. Try to hire Hilda again. Button greyed,
   tooltip "Hilda's slots are full".
7. Fire one Hilda. `hired.hilda === 2`, no coin refund, no wage debt change.
8. `runSelfTests()` passes all 4.5 assertions.

---

### 4.6 — Generic `Worker` resource (per §18 lock)

**What this delivers:** Honours the §18 LOCKED decision *"Worker unit | From
Housing buildings (1/season) + IAP stub"* that 4.1–4.5 silently dropped in
favour of a coins-only hire cost. A new generic resource `state.workers.pool`
counts unspent Worker units. Each Housing building grants `+1 pool` on
`CLOSE_SEASON`. Hiring any worker now costs `1 pool + coins (existing
hireCost)` — the coin cost stays as-is so 4.1–4.5 economy balance is
unchanged. An IAP stub button in the Workers panel grants +5 pool for
testing (no real billing).

**Completion Criteria:**
- [ ] `state.workers.pool` integer ≥ 0; defaults to **1** on a fresh save
  (the §18 baseline IAP-stub seed so the player can hire one worker
  immediately).
- [ ] `CLOSE_SEASON` reducer credits
  `state.workers.pool += state.built.housing.count` (1 per housing
  building each season; 0 if no housing built).
- [ ] `APP/HIRE` reducer rejects (no-op + floater "Need a Worker.") when
  `state.workers.pool < 1`. On success: deducts 1 pool *and* the existing
  coin `hireCost`, then increments `hired[id]` as before.
- [ ] `APP/FIRE` does NOT refund the pool (consistent with the existing
  no-refund-on-fire rule from 4.5).
- [ ] Workers panel header gains a second number alongside Capacity:
  "Workers: N" (the pool). Plain number per the §18 display rule — no
  fractions.
- [ ] An IAP stub button "Buy 5 Workers (debug)" is visible only when
  `import.meta.env.DEV === true` (not in production builds); clicking
  credits `state.workers.pool += 5`. Real-billing UI is deferred.
- [ ] Migration: v3→v4 step (already present from 4.1) extended to seed
  `state.workers.pool = 1` on any save without it.
- [ ] Save/load round-trips `state.workers.pool` exactly.

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { createInitialState, rootReducer } from "./state.js";

// Fresh save baseline
const s0 = createInitialState();
assert(s0.workers.pool === 1, "fresh save: 1 worker pool (IAP-stub seed)");

// Housing produces +1 per season
const s1 = { ...s0, built: { ...s0.built, housing: { count: 2 } } };
const s2 = rootReducer(s1, { type: "CLOSE_SEASON" });
assert(s2.workers.pool === s1.workers.pool + 2,
       "2 housing → +2 pool per season");

// Hire deducts pool + coins
const s3 = { ...s0, coins: 1000, workers: { ...s0.workers, pool: 1 } };
const s4 = rootReducer(s3, { type: "APP/HIRE", payload: { id: "hilda" } });
assert(s4.workers.pool === 0, "hire deducts 1 pool");
assert(s4.workers.hired.hilda === 1, "hire incremented");
assert(s4.coins < s3.coins, "hire deducts coins (existing rule)");

// Hire blocked when pool empty
const s5 = { ...s3, workers: { ...s3.workers, pool: 0 } };
const s6 = rootReducer(s5, { type: "APP/HIRE", payload: { id: "hilda" } });
assert(s6 === s5, "no hire when pool empty");

// Fire does NOT refund pool
const s7 = rootReducer(s4, { type: "APP/FIRE", payload: { id: "hilda" } });
assert(s7.workers.pool === 0, "fire does not refund pool");
assert(s7.workers.hired.hilda === 0, "fire decrements hired");

// Migration seeds pool=1 on legacy save
import { migrateState } from "./migrations.js";
const legacy = { ...s0, workers: { hired: {}, debt: 0 } };  // no pool field
delete legacy.workers.pool;
const m = migrateState(JSON.parse(JSON.stringify({ ...legacy, version: 3 })));
assert(m.state.workers.pool === 1, "migration seeds pool=1 on legacy save");
```

*Gameplay simulation:* The player opens a fresh save. Workers panel header
reads "Capacity: 1 · Workers: 1". They hire Hilda — pool drops to 0. They
try to hire Pip — button greyed, tooltip "Need a Worker (build Housing
or wait a season)". They build a Housing (300◉ + 25 plank). Capacity ticks
to 2 immediately, but pool stays at 0 — the new worker isn't *granted*
until next season. They play a season. On `CLOSE_SEASON`: floater "+1
Worker (Housing)". Pool → 1. They hire Pip. The two-pace loop —
build Housing now, get the Worker next season — feels like running a
village payroll, not a slot-machine.

Designer reflection: *Does the season-delay between building Housing and
gaining the Worker feel like a meaningful tempo, or like an annoying
tax? Is the IAP stub seed of 1 the right number — enough to hire on day
one, but not enough to skip the housing loop entirely?*

**Implementation:**

- `src/state.js`:
  - `createInitialState()` — `workers: { hired: {}, debt: 0, pool: 1 }`.
  - `CLOSE_SEASON` handler — append
    `pool += state.built.housing?.count ?? 0`.
- `src/features/apprentices/slice.js`:
  - `APP/HIRE` — pre-check `state.workers.pool >= 1`; deduct 1 on success.
- `src/features/apprentices/index.jsx`:
  - Header: "Capacity: N · Workers: M".
  - Hire button tooltip when `pool === 0`: "Need a Worker (build Housing
    or wait a season)".
  - DEV-only "Buy 5 Workers (debug)" button.
- `src/migrations.js` — extend the v3→v4 step to seed
  `state.workers.pool = 1` if missing.

**Manual Verify Walk-through:**
1. Fresh save. Workers panel reads "Capacity: 1 · Workers: 1".
2. Hire Hilda. Header reads "Workers: 0". Hire Pip — button greyed, tooltip
   "Need a Worker".
3. Build a Housing (Town panel). Header `Capacity: 2 · Workers: 0`.
4. End the season. Confirm "+1 Worker (Housing)" floater fires; header now
   "Capacity: 2 · Workers: 1".
5. Hire Pip. Header `Workers: 0`, `gameState.workers.hired.pip === 1`.
6. Fire Hilda. Confirm `hired.hilda === 0`, `pool === 0` (no refund).
7. Click DEV "Buy 5 Workers". Header `Workers: 5`. Confirm button hidden
   in production build (`vite build` and reload).
8. Save → refresh. Confirm pool restored exactly.
9. Force `version = 3` in localStorage on a v3 save without `pool`.
   Reload. Confirm migration seeds `pool = 1`.
10. `runSelfTests()` passes all 4.6 assertions.

---

### 4.7 — Granary inventory cap effect

**What this delivers:** GAME_SPEC §11 lists Granary's effects as "Unlocks hiring
Hilda; increases inventory cap." The first half is wired (Phase 4.1–4.6); the
second half is currently inert (no cap exists). This task introduces a per-resource
soft cap mechanism. Default cap is 200 per resource key (any chain, order purchase,
or tool that would push above 200 rounds down to 200 with a quiet "{resource}
stash full" floater). Building Granary lifts the cap to 500.

**Completion Criteria:**
- [ ] `RESOURCE_CAP_BASE = 200`, `RESOURCE_CAP_GRANARY = 500` exported from `src/constants.js`
- [ ] Pure helper `currentCap(state)` in `src/utils.js` returns `RESOURCE_CAP_GRANARY` when `state.built.granary === true`, else `RESOURCE_CAP_BASE`
- [ ] `CHAIN_COLLECTED` clamps the per-resource gain to `currentCap(state)`; the floater fires "{resource} stash full" exactly once per `CLOSE_SEASON` window per resource (debounced via `state.seasonStats.capFloaters`)
- [ ] Market `BUY` action rejects (no debit) if the post-purchase amount would exceed cap; UI button is disabled with tooltip "{resource} cap reached"
- [ ] Save migration step (Phase 12.2 plumbing): caps apply on load — overstocked resources (legacy saves) clamp down to cap with no floater
- [ ] Cap is a SOFT cap on the 13 farm + mine resources from §10 only — does NOT cap crafted goods, tools, currencies (coins/runes/shovels/influence/bombs)

**Validation Spec — write before code:**

*Tests (red phase) — file `src/__tests__/granary-cap.test.js`:*
```js
import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { currentCap } from "../utils.js";
import { RESOURCE_CAP_BASE, RESOURCE_CAP_GRANARY } from "../constants.js";

describe("Phase 4.7 — Granary inventory cap", () => {
  it("base cap is 200, Granary cap is 500", () => {
    expect(RESOURCE_CAP_BASE).toBe(200);
    expect(RESOURCE_CAP_GRANARY).toBe(500);
  });

  it("currentCap reads built.granary", () => {
    const s = createInitialState();
    expect(currentCap(s)).toBe(200);
    expect(currentCap({ ...s, built: { ...s.built, granary: true } })).toBe(500);
  });

  it("CHAIN_COLLECTED clamps at cap and emits one floater", () => {
    const s0 = { ...createInitialState(),
      inventory: { hay: 198 }, seasonStats: { capFloaters: {} } };
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay: 10 } } });
    expect(s1.inventory.hay).toBe(200);
    expect(s1.seasonStats.capFloaters.hay).toBe(true);
    expect(s1.floaters?.some(f => /hay stash full/.test(f.text))).toBe(true);
  });

  it("repeat overflow same season emits no second floater", () => {
    const s0 = { ...createInitialState(),
      inventory: { hay: 200 }, seasonStats: { capFloaters: { hay: true } } };
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay: 5 } } });
    expect(s1.floaters?.filter(f => /hay stash full/.test(f.text)).length ?? 0)
      .toBe(0);
  });

  it("Market BUY blocks at cap with no debit", () => {
    const s0 = { ...createInitialState(), coins: 1000,
      inventory: { hay: 195 },
      market: { prices: { hay: { buy: 10, sell: 1 } } } };
    const s1 = rootReducer(s0,
      { type: "BUY", payload: { key: "hay", qty: 10 } });
    expect(s1.coins).toBe(1000);
    expect(s1.inventory.hay).toBe(195);
  });

  it("Granary build raises cap, allowing further accumulation", () => {
    const s0 = { ...createInitialState(),
      built: { granary: true }, inventory: { hay: 200 },
      seasonStats: { capFloaters: {} } };
    const s1 = rootReducer(s0,
      { type: "CHAIN_COLLECTED", payload: { gains: { hay: 50 } } });
    expect(s1.inventory.hay).toBe(250);
  });

  it("save migration clamps overstocked legacy state with no floater", () => {
    const legacy = { ...createInitialState(), inventory: { hay: 999 } };
    const migrated = rootReducer(legacy, { type: "MIGRATE/APPLY_CAPS" });
    expect(migrated.inventory.hay).toBe(200);
    expect(migrated.floaters?.length ?? 0).toBe(0);
  });

  it("currencies and tools are not capped", () => {
    const s0 = { ...createInitialState(), coins: 1500, runes: 800,
      tools: { bomb: 250 } };
    const s1 = rootReducer(s0, { type: "MIGRATE/APPLY_CAPS" });
    expect(s1.coins).toBe(1500);
    expect(s1.runes).toBe(800);
    expect(s1.tools.bomb).toBe(250);
  });
});
```
Run — confirm: `currentCap is not a function` and `RESOURCE_CAP_BASE is not exported`.

*Gameplay simulation (player at session 5, hay-rich farmer):* They've been chaining
hay every turn. Inventory chip shows "hay 197/200" — the readout pair appeared as
soon as hay passed 100. Next chain commits 6 hay; the gain clamps at +3, a small
"hay stash full" floater pops, and the chip locks at "200/200". The Market screen
shows the Buy button on hay greyed out with tooltip "hay cap reached". They head to
Town and build Granary (300◉ + 20 plank). The chip immediately rereads "200/500".
A few chains later the chip reads "240/500"; the cap is actively breathing again.

Designer reflection: *Does the soft-clamp-with-quiet-floater feel less punitive
than a hard reject? When the cap actually bites, do players feel "I should build
Granary" or "I should stop chaining hay"? The first reaction is the design intent.*

**Implementation:**
- `src/constants.js` — append:
  ```js
  export const RESOURCE_CAP_BASE = 200;
  export const RESOURCE_CAP_GRANARY = 500;
  export const CAPPED_RESOURCES = ["hay","wheat","grain","flour","log","plank",
    "beam","berry","jam","egg","stone","ore","coal"]; // 13 § 10 keys
  ```
- `src/utils.js` — append:
  ```js
  import { RESOURCE_CAP_BASE, RESOURCE_CAP_GRANARY } from "./constants.js";
  export function currentCap(state) {
    return state?.built?.granary ? RESOURCE_CAP_GRANARY : RESOURCE_CAP_BASE;
  }
  ```
- `src/state.js`:
  - `CHAIN_COLLECTED` — clamp each capped-key gain:
    ```js
    const cap = currentCap(state);
    const cf  = { ...(state.seasonStats?.capFloaters ?? {}) };
    const inv = { ...state.inventory };
    const floaters = [...(state.floaters ?? [])];
    for (const [k, n] of Object.entries(action.payload.gains)) {
      if (!CAPPED_RESOURCES.includes(k)) { inv[k] = (inv[k] ?? 0) + n; continue; }
      const cur = inv[k] ?? 0;
      const next = Math.min(cap, cur + n);
      inv[k] = next;
      if (next === cap && cur + n > cap && !cf[k]) {
        cf[k] = true;
        floaters.push({ text: `${k} stash full`, ms: 1200 });
      }
    }
    return { ...state, inventory: inv, floaters,
      seasonStats: { ...state.seasonStats, capFloaters: cf } };
    ```
  - `BUY` — guard `if ((inv[key] ?? 0) + qty > cap) return state;`.
  - `CLOSE_SEASON` — reset `seasonStats.capFloaters = {}`.
  - `MIGRATE/APPLY_CAPS` — clamp each capped-key value to current cap with no floater.
- `src/ui/Inventory.jsx` — render each capped row as `"{value}/{cap}"`; rows for
  uncapped keys (coins, runes, etc.) keep the bare value.
- `src/migrations.js` — call `MIGRATE/APPLY_CAPS` once during the `migrateSave`
  pipeline (Phase 12.2 plumbing) so legacy overstocked saves clamp on load.

**Manual Verify Walk-through:**
1. Fresh save. Repeat hay chains until inventory reads "hay 200/200". Confirm
   "hay stash full" floater fires on the chain that hits the cap.
2. Chain hay again — confirm clamp holds, no second floater.
3. Open Market. Confirm Buy hay button greyed with tooltip "hay cap reached".
4. Build Granary (300◉ + 20 plank). Confirm Inventory readout updates to
   "200/500" within 1 frame.
5. Chain hay past 200. Confirm gain lands as expected; no floater until 500.
6. Chain to 500. Confirm new "hay stash full" floater fires once, then locks.
7. Console: `gameState.inventory.hay = 999; rootReducer(gameState,
   { type: "MIGRATE/APPLY_CAPS" })`. Confirm hay clamps to 500.
8. `npm test src/__tests__/granary-cap.test.js` passes all 4.7 assertions.

---

## Phase 4 Sign-off Gate

Play 3 multi-season playthroughs from a fresh save covering: a no-debt run (always
pay wages on time), a debt-recovery run (deliberately under-fund wages and let an
order auto-clear the debt), and a max-housing run (build 3+ Housing and hire all 6
workers to their caps). Before moving to Phase 5, confirm all:

- [ ] 4.1–4.6 Completion Criteria all checked
- [ ] 4.7 Completion Criteria all checked
- [ ] **A fresh save honours §18: pool=1 on day one, +1 pool per Housing
  per season, hires deduct 1 pool, fires don't refund** — verified end-to-end
  on the Workers panel
- [ ] **Player feels the difference between 0 hires and 3 hires of Hilda — chains of 3
  hay now upgrade where they previously didn't.** This is the Phase 4 horizontal-slice
  property; if it isn't observably true, the phase is not done.
- [ ] Worker effect data model is locked: every test in 4.1 demonstrating
  `effect ÷ maxCount` math passes, and no implementation file computes per-hire effect
  inline outside `computeWorkerEffects`
- [ ] After hiring 3 Hilda, the registry's `effectiveThresholds.hay === 3` is visible
  in the console
- [ ] After hiring 2 Pip, berry tile spawn count over 50 fills is visibly higher than
  the baseline biome pool
- [ ] After hiring 2 Wila, every chain that contains a jam tile yields 2 extra jam in
  the floater
- [ ] At the season-end of a year with full Tuck, +30 coins lands on top of any other
  earnings — and Tuck pays his own 20 wage from the prior balance, not his bonus
- [ ] Missed wages NEVER fire a worker — `state.workers.hired` counts are unchanged
  after any `CLOSE_SEASON`, regardless of coin balance
- [ ] While `state.workers.debt > 0`, `effectiveThresholds` matches `UPGRADE_THRESHOLDS`
  exactly (production paused) and the HUD shows the "wages owed" indicator
- [ ] Auto-debt-repayment fires on every coin-credit path: orders, market sells, daily
  streak rewards, season bonus
- [ ] Workers panel header shows the cap as a plain number ("Capacity: 3"); no "Hired:
  3 / 3" fractions anywhere in the public UI
- [ ] Hire button greys out at cap with a tooltip distinguishing "Housing full" from
  "Worker maxed"
- [ ] Save/reload preserves: `state.workers.hired` (all 6 keys), `state.workers.debt`,
  registry-synced `effectiveThresholds` re-derived correctly on load
- [ ] `runSelfTests()` passes for all Phase 4 tests
- [ ] Designer gut-check: *After playing one full year with workers active, does the
  Farm board feel like a different game? Are the hires the player makes now the most
  consequential 200-coin decisions in the game — or do they still feel like flavour
  trim that the player ignores in favour of Buildings?*
