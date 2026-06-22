# Economy: Unify the Price Model + Retire the Orphan Market

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

puzzleDrag2 has **three overlapping price sources** that disagree, and **two market
sell implementations** — one live, one orphaned. The same crafted item can pay out
**~10× more or less** depending on which sell button the UI happens to render for it.
This makes balance impossible to reason about and leaves dead code that future work
will trip over.

This project collapses pricing to **one source of truth**, routes **all selling
through the single live market reducer (`applyTrade`)**, and **deletes the orphaned
caravan path** (`features/market/slice.ts` + `features/market/pricing.ts`). It also
sets up the *mechanism* for a value rebalance against a constant cost-per-chain-tile —
but the actual rebalanced **numbers come from doc 05's harness, not hand-tuning here**.
Net effect: a player selling a Pie always gets the same, explainable price, and the
codebase has one pricing function instead of three.

## Background & current state (VERIFIED)

I opened every file below and corrected the seed brief where it drifted. **The seed
brief's headline claim is subtly wrong and the correction matters** — read this section
carefully before touching code.

### The three price sources (all real, all in use)

1. **`MARKET_PRICES`** — `src/constants.ts:1035` (ends `:1085`). A `{ key: { buy, sell } }`
   table. Drives the **live** market.
2. **`ITEMS[key].value`** — `src/constants.ts` (per-item, e.g. `pie` at `:406`,
   `pearls` at `:509`, `jade` at `:514`). Used for chain-coin payouts elsewhere and as
   the base for `sellPriceFor`.
3. **`sellPriceFor(itemId)`** — `src/features/market/pricing.ts:17`. Returns
   `Math.round(item.value * 0.10)` (`SELL_RATE = 0.10`, `pricing.ts:9`). Guards on
   `!item.value` and `item.sellable === false`.

**Seed-brief correction (important):** the brief says "the audit found Pie=90 vs
Pearls=800 / Jade=800 for the SAME chain." Those numbers (90 / 800 / 800) are the
`MARKET_PRICES.sell` **and** `ITEMS.value` figures — which for terminal products **agree
with each other** (e.g. `pie`: `MARKET_PRICES.sell = 90` at `:1060`, `ITEMS.pie.value =
90` at `:406`). They are **not** what `sellPriceFor` returns. `sellPriceFor("pie")` =
`round(90 * 0.10)` = **9**. So the real disagreement is **between source #3 and sources
#1/#2**, an order-of-magnitude gap, *not* between Pie and Pearls. The cross-family
imbalance (Pie 90 vs Pearls 800 for a comparable chain) is a separate, real problem and
is the subject of the rebalance step — but the *price-model* bug is the 10× fork
described next.

### The 10× fork: which sell path fires depends on UI classification

The live Inventory UI (`src/ui/Inventory.tsx`) splits everything the player owns into
`kind: "resource"` vs `kind: "item"`:

- **Resources** = keys present in `BIOMES[biomeKey].resources` (`Inventory.tsx:496`).
- **Items** = everything else in `ITEMS` that isn't a tile/tool (`Inventory.tsx:497-505`).

The two kinds get **different prices and different sell actions** for the *same coin*:

| Kind | Price shown | Sell action dispatched | Reducer | Effective price |
|---|---|---|---|---|
| `resource` | `state.market.prices[key].sell` (live drift) | `SELL_RESOURCE` (`Inventory.tsx:303`) | `applyTrade` (`market.ts:64`, via `state.ts:1073`) | `MARKET_PRICES.sell` ±15% |
| `item` | `sellPriceFor(key)` = 10% of value (`Inventory.tsx:663`) | `SELL_ITEM` (`Inventory.tsx:305`) | core `SELL_ITEM` (`state.ts:1251`, calls `_sellPriceFor`) | `round(value * 0.10)` |

So if `pie` is listed in `BIOMES.farm.resources` it sells for **~90** (live market); if it
falls through to "item" it sells for **~9** (`sellPriceFor`). **Same item, 10× swing,
purely from data classification.** That is the price-model bug to kill.

- `MARKET/SELL` is registered in `SLICE_PRIMARY_ACTIONS` (`state.ts:1596`) and the
  market slice IS in the `slices` array (`state.ts:64`) — so the slice *would* run.

### The two market implementations

- **LIVE — `src/market.ts`:** `applyTrade(state, action)` (`market.ts:64`) handles
  `BUY_RESOURCE` / `SELL_RESOURCE`, dispatched from `Inventory.tsx:303/308/373/378`.
  Prices come from `state.market.prices`, seeded at init by
  `driftPrices(marketSeed, 0)` (`src/state/init.ts:133`) and re-rolled every
  `CLOSE_SEASON` (`state.ts:950-1007`) with ±15% drift (`market.ts:38-62`) and a 40%
  chance of one of 4 `MARKET_EVENTS` (`market.ts:13-34`). Gated in the UI by
  `marketBuilt = !!locBuilt(state).caravan_post` (`Inventory.tsx:510`).

- **ORPHANED — `src/features/market/slice.ts`:** `MARKET/SELL` reducer
  (`slice.ts:15`). Deducts inventory, credits `sellPriceFor(resource) * qty`, gated on
  `locBuilt(state).caravan_post` (`slice.ts:23`). **VERIFIED DEAD:** `MARKET/SELL` is
  dispatched **nowhere** outside test files — `grep` for `dispatch({ type: "MARKET/SELL"`
  and for `MARKET/SELL` under `src/ui/` both return **zero matches**. Its only callers
  are `src/__tests__/coverage-gaps.test.ts` and the type registries
  (`types/actions.ts:57`, `types/actionPayloads.ts:259`, `state.ts:1596`).

  **Seed-brief correction:** the brief calls this a "fixed-10% caravan-post path." It is
  fixed-10% (via `sellPriceFor`) *and* it gates on `caravan_post` — but so does the live
  market UI. There is **only one building gate (`caravan_post`)**, shared by both paths;
  the orphan is not a *separate* building, just a *separate unreachable reducer*.

### `pricing.ts` is shared, not purely orphaned

`sellPriceFor` is imported in **two live places**, not just the dead slice:
- `state.ts:4` as `_sellPriceFor`, used by the **live** `SELL_ITEM` reducer
  (`state.ts:1259`) and re-exported (`state.ts:1719`).
- `Inventory.tsx:11`, used to compute the item-row sell price and the "sellable" filter
  (`Inventory.tsx:623, 663`).

So you **cannot just delete `pricing.ts`** — you must first migrate the `SELL_ITEM` /
item-row price source onto the unified model, *then* the file can go.

### Persistence shape

`src/state/persistence.ts` saves **the whole state** (everything except `VOLATILE`,
`persistence.ts:6`) — so `state.market` (`{ seed, season, prices, prevPrices, event? }`,
type `MarketState` at `types/state.ts:158`) **is persisted**. `SAVE_SCHEMA_VERSION = 45`
(`constants.ts:207`), version-gated with **no migration** (`persistence.ts:23-29` discards
+ wipes mismatched saves). **If you change the shape of `state.market` or
`state.inventory`, you must bump the version (wipes saves) or depend on doc 08's
migration ladder.** The plan below is deliberately shape-preserving to avoid this.

## Scope

**In scope:**
- Make the **item sell path** (`SELL_ITEM` + Inventory item rows) read from the **same
  price source** as the resource path, so there is one `sell` number per key.
- Route **all** selling through `applyTrade` (or have `SELL_ITEM` defer to the same price
  table), eliminating the 10%-vs-market fork.
- **Delete** the orphaned `MARKET/SELL` reducer (`features/market/slice.ts`) and remove
  it from `SLICE_PRIMARY_ACTIONS`, the `slices` array, and the action-type registries.
- **Delete `features/market/pricing.ts`** once `sellPriceFor` has no live callers.
- Define **one source of truth** for prices: `MARKET_PRICES` (with `sell` as the canonical
  base, `buy` for buying). Reconcile `ITEMS[].value` so chain-coin payouts and market
  sells agree, or document the single intended relationship.
- Wire up the *mechanism* to rebalance terminal `MARKET_PRICES.sell` (and matching
  `ITEMS.value`) against a constant cost-per-chain-tile so families are comparable.

**Out of scope / non-goals (keep this tight):**
- **Computing the rebalanced numbers by hand.** All new `sell`/`value` figures come from
  **doc 05's harness** — this doc only changes the wiring + lands whatever numbers the
  harness emits. Do not eyeball values.
- Adding a new building or a separate "caravan" UI. The orphan is deleted, not revived.
- Changing the drift algorithm, market events, or seasonal re-roll cadence
  (`market.ts:38-62`, `MARKET_EVENTS`).
- Changing the `caravan_post` gate, its cost, or its unlock level (`constants.ts:820`).
- Moving tiles out of inventory (the `BUY_RESOURCE` "transitional" cap note at
  `state.ts:1063` is a different project).
- Any change to `state.market` *shape* — keep `{ seed, season, prices, prevPrices }` so no
  SAVE_SCHEMA bump is needed (see Risks).

## Implementation plan

Ordered. Touch the named symbols only.

### 1. Decide the single price relationship (data design, no code yet)

Pick ONE rule and write it as a comment at the top of `MARKET_PRICES`
(`constants.ts:1035`):

> Canonical: `MARKET_PRICES[key].sell` is the base sell price. `ITEMS[key].value` MUST
> equal `MARKET_PRICES[key].sell` for any sellable key. `buy` ≈ 10× `sell` (existing
> convention; the market test at `market.test.ts:17` already asserts `buy > sell*5`).

This makes `sellPriceFor`'s "10% of value" **obsolete** — the live market `sell` already
*is* the intended price. (Today `MARKET_PRICES.sell == ITEMS.value` for terminal products
like pie/pearls/jade, so this rule mostly *documents* current reality and removes the
rogue 10% multiplier.)

### 2. Migrate the item sell price source onto the unified model

In `Inventory.tsx`, the item-row price (`:663`) and the sellable filter (`:623`)
currently call `sellPriceFor(key)`. Change both to read from the same place resources do —
`prices[key]?.sell ?? 0` (where `prices = state.market.prices`, `Inventory.tsx:511`).
Resources already do exactly this (`:649`). After this, **every row** — resource or item —
shows the live market sell price.

Caveat to check first: `MARKET_PRICES` must contain a `sell` entry for **every sellable
item key**, not just resources. Audit with the test in step "Validation" below; add any
missing terminal keys to `MARKET_PRICES`. (Terminal products pie/honey/meat/milk/etc. are
already present, `:1060-1084`.)

### 3. Unify the sell *action* dispatch

Two clean options — prefer **(A)** (smaller blast radius, keeps `SELL_ITEM` as the
public item-sell action but re-sourced):

**(A) Keep `SELL_ITEM`, repoint its price to the market table.**
In `state.ts:1251` `SELL_ITEM`, replace `const price = _sellPriceFor(itemId);`
(`state.ts:1259`) with a market lookup:
```ts
const price = state.market?.prices?.[itemId]?.sell ?? 0;
if (price <= 0) return state;            // unsellable / unpriced → no-op
```
Drop the `_sellPriceFor` import (`state.ts:4`) and its re-export (`state.ts:1719`) **only
after** confirming no other live importer (grep `from "./state"` / `sellPriceFor`).

**(B) Collapse `SELL_ITEM` into `SELL_RESOURCE`.** Make `Inventory.tsx`'s `sell()`
(`:301-307`, `:371-377`) always dispatch `SELL_RESOURCE`, and let `applyTrade` handle both
resources and items (it already only needs `state.market.prices[key]`). Then `SELL_ITEM`
can be deleted entirely. Bigger change; only do this if you also want to retire the
`SELL_ITEM` action.

Either way the **single live price** is `state.market.prices[key].sell`.

### 4. Delete the orphaned caravan path

Once nothing live calls `sellPriceFor`:
- Delete `src/features/market/slice.ts` and `src/features/market/pricing.ts`.
- Remove `market` from the `slices` array (`state.ts:64`). **Footgun:** `market` is the
  slice that owned `MARKET/SELL`; after removal, also remove `"MARKET/SELL"` from
  `SLICE_PRIMARY_ACTIONS` (`state.ts:1596`) or the dead type lingers as a phantom
  primary action.
- Remove `"MARKET/SELL"` from `types/actions.ts:57`, its payload from
  `types/actionPayloads.ts:259`, and the entry in `__tests__/actionTypes.test.ts:11`.
- Delete the `MARKET/SELL` tests in `__tests__/coverage-gaps.test.ts:89-153` (they assert
  a now-deleted reducer).

**`check-slice-action` footgun reminder:** you are *removing* an action and a slice. After
removal, run the `check-slice-action` skill (or grep) to confirm `MARKET/SELL` is gone from
**all** of: `SLICE_PRIMARY_ACTIONS`, `ALWAYS_RUN_SLICES`, the `slices` array, and the type
registries. A half-removal (type kept, slice gone) silently no-ops — which is fine for a
dead action, but leaves confusing dead surface.

### 5. Reconcile `ITEMS.value` ↔ `MARKET_PRICES.sell` and land the rebalance

Per the rule from step 1, for every sellable key `ITEMS[key].value` should equal
`MARKET_PRICES[key].sell`. Most terminal products already match; audit & fix mismatches
(see the new test in Validation).

Then apply the **family rebalance numbers from doc 05's harness** (constant
cost-per-chain-tile) to `MARKET_PRICES.sell` **and** the matching `ITEMS.value` in lockstep.
**Do not invent numbers here.** This step is "paste the harness output into both tables,
keeping them equal." The harness is the authority for *what* the numbers are; this doc is
the authority for *where they go and that the two tables stay in sync*.

### 6. Run `graphify update .`

After code changes, run `graphify update .` to keep the knowledge graph current.

## Success criteria

- [ ] Selling a given key pays the **same** coins whether the UI classifies it as
      `resource` or `item` (no 10× fork). Verifiable by dispatching `SELL_ITEM` and
      `SELL_RESOURCE` for the same priced key and asserting equal `coins` delta.
- [ ] `sellPriceFor` and `SELL_RATE` have **zero live importers** — grep returns only
      deleted-test hits, then nothing.
- [ ] `src/features/market/slice.ts` and `src/features/market/pricing.ts` are **deleted**.
- [ ] `MARKET/SELL` appears in **no** production file: not in `slices`,
      `SLICE_PRIMARY_ACTIONS`, `ALWAYS_RUN_SLICES`, `types/actions.ts`, or
      `types/actionPayloads.ts`.
- [ ] Every sellable key has a `MARKET_PRICES[key].sell` entry; no item row in the
      Inventory UI shows a price computed from a 10% multiplier.
- [ ] For every sellable key, `ITEMS[key].value === MARKET_PRICES[key].sell` (asserted by a
      new test).
- [ ] Rebalanced terminal `sell`/`value` numbers from doc 05's harness are in place and the
      two tables agree.
- [ ] `SAVE_SCHEMA_VERSION` is **unchanged** (45) — the persisted `state.market` /
      `state.inventory` shapes are untouched. (If shape *must* change, the checklist item
      flips: bump version per doc 08 and say so.)
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

**Gating commands (must pass before PR):**
```bash
npm run lint
npm run typecheck
npm test
npm run build
```
`npm test` runs in node env with fake localStorage and **no canvas** — pure reducer/data
logic, which is exactly what this change is. Pass = green, including the new tests below.

**New / changed unit tests (add these):**

1. `src/__tests__/market.test.ts` — extend:
   - **"resource and item sell paths agree"**: build a state with
     `market.prices.pie = { buy, sell }`, inventory `{ pie: 1 }`. Dispatch
     `SELL_RESOURCE {key:"pie",qty:1}` and (separately) `SELL_ITEM {id:"pie",qty:1}`;
     assert both produce the **same** `coins` delta (= `sell`). This is the regression
     guard against the 10× fork.
   - **"sellable items are priced by the market table"**: for a sample of terminal items
     (pie, honey, pearls, jade, gold_bar), assert `MARKET_PRICES[k].sell > 0`.

2. **New** `src/__tests__/price-model.test.ts`:
   - **"every sellable ITEM has a MARKET_PRICES.sell"**: iterate `ITEMS`; for each entry
     with `value > 0 && sellable !== false`, assert `MARKET_PRICES[key]?.sell != null`.
     (This catches an item that would otherwise fall to a 0 / undefined price after the
     migration.)
   - **"ITEMS.value equals MARKET_PRICES.sell for sellable keys"**: the lockstep
     invariant from step 5.

3. Delete the obsolete `MARKET/SELL` block in
   `src/__tests__/coverage-gaps.test.ts:89-153` and the `actionTypes.test.ts:11` entry.

**Manual in-game check (this host):**
- The change is React/reducer, not canvas — assert via DOM, not screenshots
  (`preview_screenshot` HANGS here).
- Spin a worktree Vite on a spare port with base `/puzzleDrag2/`
  (`node ../../../node_modules/vite/bin/vite.js --port <spare>`), open the game, build the
  `caravan_post` (or grant it), open Inventory, expand a terminal product that previously
  rendered as an "item" (e.g. a crafted Pie), and confirm the **Sell +N◉** label now shows
  the market `sell` (~90), not 9. Drive state via
  `window.__hearthVisual.dispatch/state/freeze`; read the rendered button via
  `getComputedStyle`/`textContent`.
- e2e/visual are **not in CI** and visual goldens are **not regenerable on this Windows
  host** — treat any local `test:visual` run as **informational only**. There is no canvas
  art change here, so visual goldens should not move; if they do, it's host drift, not this
  PR.

**Informational (not gating):** `npm run test:e2e`, `npm run test:visual`.

## Double-check / adversarial review

**Prove the dead path is really dead AND the live path now does its job:**
- Before deletion: `grep -rn "MARKET/SELL" src` should show ONLY type registries +
  coverage-gaps test. After deletion: **zero** in `src/` except (briefly) removed tests.
- After step 3: dispatch `SELL_ITEM` for a key whose `sellPriceFor` *used* to be 10% of
  value and assert the new payout equals `MARKET_PRICES[key].sell` (~10× the old). If it
  still pays the old 10%, you edited the wrong line — confirm `state.ts:1259` no longer
  calls `_sellPriceFor`.

**"Did I really wire it" checks:**
- `grep -rn "sellPriceFor\|SELL_RATE" src` must return **nothing** before you delete
  `pricing.ts`. If `state.ts:1719` still re-exports it, an external importer may break —
  follow that thread.
- Confirm `market` removed from the `slices` array doesn't break another slice-owned
  action. `MARKET/SELL` was the slice's *only* action (`slice.ts:16`), so the slice is
  safe to drop — verify by reading `slice.ts` (it has no other `if (action.type === ...)`).

**Edge cases a skeptic will attack:**
- An item with `value > 0` but **no** `MARKET_PRICES` entry → after migration it sells for
  0 (no-op) instead of 10%-of-value. The new `price-model.test.ts` catches this; fix by
  adding the key to `MARKET_PRICES`.
- `sellable: false` items — `sellPriceFor` honored this (`pricing.ts:19`). The market table
  has no `sellable` concept, so an explicitly-unsellable item with a `MARKET_PRICES` entry
  would become sellable. Audit: ensure no `sellable:false` key has a `MARKET_PRICES` row
  (the new test can assert this too).
- `applyTrade` reads `state.market.prices[key]` and no-ops if absent (`market.ts:69`) — so
  the live path is already safe against missing keys; the failure mode is "can't sell," not
  "crash."
- Drift: market `sell` is ±15% live, but `ITEMS.value` (used for chain-coin payouts in
  `state.ts`) is **static**. Decide whether item sells should drift (they will, via the live
  table) — this is a deliberate consequence of unification; note it in the PR.

**Rollback safety:** the change is additive-then-subtractive in data/wiring with **no
SAVE_SCHEMA bump**, so saves survive a revert. If a payout regression ships, reverting the
`SELL_ITEM` price line (step 3) restores old behavior without touching saves.

## Risks & gotchas

- **SAVE_SCHEMA / persistence (`persistence.ts:23`):** keep `state.market` shape
  `{ seed, season, prices, prevPrices }` (`types/state.ts:158`) and `state.inventory`
  shape unchanged. Any shape change wipes **every** save (no migration today) — defer to
  doc 08's ladder and bump `SAVE_SCHEMA_VERSION` (`constants.ts:207`) explicitly if
  unavoidable. This plan is shape-preserving on purpose.
- **Slice-registration footgun (`state.ts:1590` / `1639`):** removing `MARKET/SELL`
  requires editing `SLICE_PRIMARY_ACTIONS` **and** the `slices` array **and** the type
  registries. Run the `check-slice-action` skill after. Conversely, if you keep `SELL_ITEM`
  (option A), it routes through `coreReducer` (`state.ts:1251`) and is **not** slice-primary
  — leave it out of those sets.
- **`sellPriceFor` is dual-use:** it backs the LIVE `SELL_ITEM` *and* the dead
  `MARKET/SELL`. Migrate `SELL_ITEM` first, then delete — deleting `pricing.ts` first breaks
  the build.
- **Don't hand-tune numbers:** the rebalance figures are doc 05's output. This doc only
  guarantees `ITEMS.value === MARKET_PRICES.sell` and that the values land in both tables.
- **The Pie-vs-Pearls "imbalance" is real but separate** from the price-model fork. Fix the
  fork (wiring) here; the family rebalance (numbers) is gated on the harness. Don't conflate.
- **Balance wiki / Dev Panel:** `MARKET_PRICES` is referenced in
  `src/balanceManager/content/pages/balance.html`. If you rename or restructure the table,
  check that the `/b/` wiki page still resolves (informational, not gating).
- **e2e/visual not in CI; goldens not regenerable here** — don't trust a local visual regen;
  re-baseline only on a canonical host. No art changes expected from this PR.

## References

- `src/constants.ts` — `MARKET_PRICES` (`:1035-1085`), `ITEMS[].value`
  (pie `:406`, pearls `:509`, jade `:514`, flour `:389`, plank `:390`),
  `SAVE_SCHEMA_VERSION` (`:207`), `caravan_post` building (`:820`),
  `UPGRADE_THRESHOLDS`/`TILES_PER_RESOURCE` (`:209`, `:255`).
- `src/market.ts` — `applyTrade` (`:64`), `driftPrices` (`:38`), `MARKET_EVENTS` (`:13`),
  `pickMarketEvent` (`:28`).
- `src/features/market/slice.ts` — orphaned `MARKET/SELL` reducer (DELETE).
- `src/features/market/pricing.ts` — `sellPriceFor`, `SELL_RATE` (DELETE after migration).
- `src/ui/Inventory.tsx` — live sell wiring: `SELL_RESOURCE`/`BUY_RESOURCE` (`:303/308`),
  `SELL_ITEM` (`:305/375`), price sourcing (`:649/663`), `marketBuilt` (`:510`),
  `prices` (`:511`), sellable filter (`:623`), `kind` split (`:496-505`).
- `src/state.ts` — `SELL_ITEM` reducer (`:1251`), `BUY/SELL_RESOURCE` → `applyTrade`
  (`:1061-1075`), `slices` array (`:64`), `SLICE_PRIMARY_ACTIONS` (`:1590`),
  `_sellPriceFor` import/re-export (`:4`, `:1719`), market re-roll in `CLOSE_SEASON`
  (`:950-1007`).
- `src/state/init.ts:133` — initial `state.market` seed.
- `src/state/persistence.ts` — whole-state save + version gate.
- `src/types/state.ts:158` — `MarketState` shape.
- Types: `src/types/actions.ts:57`, `src/types/actionPayloads.ts:259`.
- Tests: `src/__tests__/market.test.ts`, `src/__tests__/coverage-gaps.test.ts:89-153`,
  `src/__tests__/actionTypes.test.ts:11`, `src/__tests__/farm-10.3.test.ts` (SELL_ITEM).
- Sibling project docs (same series): **doc 05** (balance/value rebalance harness — source
  of the rebalanced numbers) and **doc 08** (save-migration ladder — required if any
  persisted shape changes). Read both before touching values or `state.market` shape.
- Skills: `check-slice-action` (mandatory after removing `MARKET/SELL`), `coverage-gaps`,
  `phaser-scene-debug` (only if a canvas mismatch shows up, unlikely here),
  `pre-pr-check` (PR body), `dev-server` (worktree Vite for the manual check).
- House rules: `CLAUDE.md` (note: it says `.js/.jsx` — DOC DRIFT; the files are
  `.ts/.tsx`, trust the code).
