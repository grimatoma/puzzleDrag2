# AI Playtest & Auto-Balance Harness

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Build a **headless auto-player** that plays full game runs **without Phaser** by driving the pure game logic + the React reducer directly in Node, then reports balance metrics and emits a machine-readable constant-edit change-list. The reducer already runs in Vitest's `node` environment with a fake `localStorage` and no canvas (see `src/__tests__/setup.ts`), so the entire economy — chain → resource progress → coins, tier/founding costs, market, orders — is reachable without booting a scene. This is the moonshot that pays for itself: it turns every economy change currently deferred to "playtest" into a measurable, regression-guarded number.

Why it matters: the economy is full of values that nobody has actually played against — e.g. the audit-flagged **family-value spread** where a `pie` is worth **90** and `pearls` **800** (both verified in `src/constants.ts`, see below) yet are reached by similar-length chains. A deterministic harness lets us simulate N seeded runs per zone, measure coins/turn and yields, compare to PC2 income targets and the tier-cost run-budgets, and snapshot the result so balance drift is caught in CI-able unit tests. It directly unblocks the deferred economy work (docs 04 and 13).

## Background & current state (VERIFIED)

I opened every key file. Findings, with corrections to the seed brief flagged inline.

### The chain → coins pipeline is pure and node-reachable
- `src/game/chain.ts` exports `hasValidChain(grid)` (8-directional DFS, `>= 3` to be valid) and `computeBakeScale()`. It imports only `TILE` from constants — **no Phaser**. This is genuinely reusable, as the brief claims.
- `src/game/producedResource.ts` exports `producedResource(tile)` — per-tile override (`TILE_TYPES_MAP[key].effects.producesResource`) > family default (`tileFamilyResource`) > null; returns null for `TILES_WITH_CUSTOM_OUTPUT`. Also exports `buildChainUpdatePayload()`. Pure, no `window`.
- The reducer entry points are `createInitialState` (alias of `initialState`) and `rootReducer` (alias of `rawReducer`), both re-exported from `src/state.ts` (lines 1715–1717). Tests already use exactly these (`tests/phase-3-economy.test.ts:5` → `import { createInitialState, rootReducer } from "../src/state.js"`).

### CHAIN_COLLECTED is the economic heart — and its coin math is NOT what "family value" implies
This is the single most important correction. In `coreReducer` (`src/state.ts`, `case "CHAIN_COLLECTED"`, lines 238–523):
- Payload shape dispatched by the scene (`src/GameScene.ts:1896`): `{ key, gained, upgrades, chainLength, value, chain, resourceKey, crossCollected }`.
  - `gained = this.path.length` (chain length; `GameScene.ts:1805`).
  - `value = res.value` is the **board TILE's** `value`, NOT the produced resource's value (`GameScene.ts:1789`, `:1896`). Verified tile values in `src/constants.ts`: `tile_fruit_apple` value **1** (line 421), `tile_fish_oyster` value **3** (line 497), `tile_grass_grass` value **1** (line 384), `tile_mine_gold` value **5** (line 470).
  - `resourceKey = producedResource(res)` — the resource the chain accrues progress toward.
- Coin formula (`state.ts:401`): `baseCoinsGain = Math.max(1, Math.floor(gained * (value ?? 1))) + coinHookBonus`, then optionally scaled by the `coin_gain_mult` boon. So **per-chain coins ≈ chainLength × tileValue** — e.g. a 7-apple chain pays `7 × 1 = 7` coins, a 5-oyster chain pays `5 × 3 = 15` coins.
- Resource income (`state.ts:352–364`): chain length accrues into `resourceProgress[zone][resourceKey]`; every `TILES_PER_RESOURCE[key]` accumulated tiles rolls **one** unit of the produced resource into the (capped) zone inventory. `TILES_PER_RESOURCE` is seeded `{ ...UPGRADE_THRESHOLDS }` (`constants.ts:255`) — apple = 7, oyster = 5.
- **Correction to the "Pie 90 vs Pearls 800" framing:** those numbers are the *produced-resource* `value` fields (`pie: value 90` at `constants.ts:406`; `pearls: value 800` at `constants.ts:509`) — both VERIFIED. But that value does **not** flow into chain coins. It is realized only when the player **sells** the resource (`SELL_ITEM` / `SELL_RESOURCE` → `applyTrade` / `_sellPriceFor`) or fills an **order** (`TURN_IN_ORDER`). So the harness must measure the spread along the *resource-value-per-chain* and *coins-if-sold* axes, not raw chain coins. To reach an oyster→pearls unit a player chains `5 × oyster_threshold`... wait: pearls roll up at `TILES_PER_RESOURCE.tile_fish_oyster = 5` oysters → 1 pearls (value 800); a pie rolls up at 7 apples → 1 pie (value 90). That ~9× value gap for a comparable tile-spend is exactly the imbalance to surface.
- `crossCollected` (`state.ts:376–390`) is keyed by **tile key**, credits partners through the same threshold path. The harness can omit it for a first pass (greedy single-chain) and add it later.

### Turn budget, zones, tiers (VERIFIED, with corrections)
- `turnBudgetForZone(state, zoneId, opts)` is real (`src/features/zones/data.ts:192`): `max(1, floor((baseTurns + additive + bonusTurns) * multiplier))`, `multiplier = useFertilizer ? 2 : 1`, `baseTurns` from `zoneBaseTurns` (default 10). The harness sets the run length from this.
- A farm run is started by `FARM/ENTER` (`state.ts:1094`) which sets `farmRun = { zoneId, turnBudget, turnsRemaining, ... }`. Each non-free chain decrements `turnsRemaining` via `boardTurnPatch` (`state.ts:147`); when it hits 0, `ended` flips and `modal` becomes `"season"`. **`CLOSE_SEASON`** (`state.ts:950`) ends the run (adds `SEASON_END_BONUS_COINS`, resets `turnsUsed`, rerolls quests/market). The harness's run loop = `FARM/ENTER` → repeat `CHAIN_COLLECTED` until `farmRun.turnsRemaining === 0` → `CLOSE_SEASON`.
- **Correction to MEMORY/seed-brief tier names:** the home ladder in `src/features/cartography/data.ts` (the source `MAP_NODES[].tiers`, surfaced via `ZONES[].tiers`) is now **7 rungs**: Camp(3 plots) → Settlement(6) → Village(9) → Town(12) → City(16) → Manor(20) → … The older "Hamlet6/Village12/City20" naming is stale. Each rung's `upgradeCost` is **resources-only** (e.g. `town.upgradeCost.resources = { soup: 8, milk: 1, coke: 10, silver_bar: 10, cocoa: 2, ink: 2 }`) with **no `coins`** field today (`TIER_UP` reads `upCost.coins ?? 0` and `upCost.resources ?? {}`, `state.ts:760–763`). The harness's "tier-cost run-budget" metric must therefore be measured in *resource units accrued per run*, then converted, not in coins.
- `TIER_UP` (`state.ts:749`) deducts coins (0 today) + zone-inventory resources and bumps `tier`. `FOUND_SETTLEMENT` (`state.ts:712`) deducts `settlementFoundingCost(state).coins` (base 300 × 1.7^k, `zones/data.ts:404`).

### The cost-matrix change-list workflow is real and is the output contract
- `src/balanceManager/wiki/costExport.ts` is the exact format to emit. `buildCostReport(overrides, extraColumns)` returns `{ matrices, changes, count, markdown, json }`.
  - `renderMarkdown` produces a doc titled **`# puzzleDrag2 — balance change request`** with `## <matrix label>` groups and `- **Name** · Col (\`dotted.path\`): from → to` lines, plus a `### Machine-readable patch` ```json block of `{ "<dotted path>": <new value> }`.
  - Edit paths are dotted into `src/constants.ts`: buildings → `BUILDINGS[*].cost.*`, tools → `RECIPES[*].inputs.*`, resources → `ITEMS[*].value` & `RECIPES[*].inputs.*` (see `costMatrix.ts` `exportLabel`s at lines 320/366/432, and `editPath` plumbing). The Dev Panel page is `/b/#/costMatrix` (`wikiNav.ts:111`, rendered by `CostMatrixPage.tsx` which calls `buildCostReport`).
- **The harness should emit a change-list whose JSON keys are these same dotted paths** so a human/LLM can paste it into a fresh session (or the cost-matrix view recognizes it). This is the interop point with the existing workflow.

### Persistence / save-schema (VERIFIED)
- `src/state/persistence.ts` `loadSavedState()` hard-discards any save whose `version !== SAVE_SCHEMA_VERSION` (`= 45`, `constants.ts:207`). There is **no migration**. The harness is read-only against game logic and **adds no persisted state**, so it does **not** bump `SAVE_SCHEMA_VERSION` and does **not** depend on the save-migration ladder (doc 08). Call this out so nobody "helpfully" persists harness output into the save.
- `gameReducer` (the wrapper, `state.ts:1696`) calls `persistState` as a side effect. The harness MUST call **`rootReducer`** (= `rawReducer`, pure, no persist/side-effects), exactly like the tests do, to stay deterministic and side-effect-free.

### Tooling home
- `tools/` is the right home (matches `tools/build-docs.mjs`, `tools/list-action-types.mjs`, etc.). Scripts there are `.mjs` run via `node tools/<name>.mjs`. New work: `tools/playtest/`.

### Determinism caveat (IMPORTANT, not in the brief)
`CHAIN_COLLECTED` calls **`Math.random()` directly** for hazard/rat/ore/pearl spawns (e.g. `state.ts:496`, `:504`, `:516`) when the biome is farm/mine/fish and a hazard is allowed. For deterministic runs the harness must either (a) drive zones/biomes with **no dangers** (so `rollFarmHazard`/`rollHazard` early-out — `settlementHazards` returns `[]`), or (b) monkeypatch `Math.random` with a seeded PRNG for the duration of a run. Plan uses (b) as the default and (a) as a sanity cross-check. The harness builds its own boards (it never needs the scene's RNG), so the only nondeterminism inside the reducer is these spawn rolls.

## Scope

In scope:
- A pure run-simulator (`tools/playtest/`) that:
  - builds a synthetic board for a zone's tile pool (seeded), finds chains with `hasValidChain` + a chain enumerator, applies a **policy** (greedy = longest available chain), and dispatches `FARM/ENTER` → `CHAIN_COLLECTED` (synthesized payloads matching `GameScene.ts:1896`) → `CLOSE_SEASON` through `rootReducer`.
  - runs N seeded runs per zone with a seeded PRNG (default-overrides `Math.random` for the run).
  - measures per-run + aggregate metrics: coins/turn, coins/run, resource units produced per family, run length, and the **family-value spread** (resource value realized per tile spent).
- A reporter that writes (1) a human Markdown/JSON report under `docs/playtest/` (gitignored intermediates, committed summary), and (2) a **cost-matrix-compatible change-list** (`# puzzleDrag2 — balance change request` + dotted-path JSON patch) reusing `src/balanceManager/wiki/costExport.ts` helpers (`renderMarkdown`/`renderJsonPatch`) where possible.
- PC2-target comparison: a small declarative `targets` table (coins/run band, tier-up "runs to afford" band) the report diffs against.
- Deterministic-seed snapshot regression: a Vitest test that runs a fixed seed set and asserts the metrics JSON matches a committed snapshot (catches balance drift).

Out of scope / non-goals (keep tight):
- No Phaser, no canvas, no DOM, no e2e for the simulator itself (only the snapshot is a unit test).
- No changes to game logic / reducers / constants in this project. The harness only *reads* the catalog and *proposes* edits — applying them is the existing manual cost-matrix workflow.
- No new persisted state, no `SAVE_SCHEMA_VERSION` bump, no new reducer actions (so the SLICE_PRIMARY_ACTIONS footgun does not apply — see Risks).
- No tool/boon/worker policy modeling beyond plain greedy chains in v1 (cross-collect, fertilizer, upgrades-on-board are stretch goals, explicitly deferred).
- No auto-apply of edits to `src/constants.ts`.
- No UI in `/b/` for this (a later project could surface the report in the Dev Panel; not now).

## Implementation plan

Ordered. All new code lives under `tools/playtest/` as ESM `.mjs`/`.ts` (Vitest can import `.ts`; the runnable CLI is `.mjs` invoked by `node`). Keep it dependency-free (use the project's own modules).

### 1. Board builder + chain enumerator — `tools/playtest/board.mjs`
- `makeBoard(poolKeys, rng, rows=6, cols=6)` → a `grid` of `{ res: { key } }` cells, sampling from a tile pool (`FARM_TILE_POOL` / `MINE_TILE_POOL` / `FISH_TILE_POOL` from `src/constants.ts`). Cells carry the full tile def (`getItem(key)`) so `res.value` is present.
- `enumerateChains(grid)` → all maximal same-key connected components of size ≥ 3 (reuse the 8-dir DFS shape from `chain.ts`; you can import `hasValidChain` to gate, but you need the component members, so write a sibling `collectComponents`). Return `[{ key, cells: [{row,col}], length }]`.
- `applyCollapse(grid, cells, rng, pool)` → null the collected cells, gravity/refill from the pool (simple top-fill is fine for v1; document that it's an approximation of the scene's collapse). Determinism comes from `rng`.

### 2. Policy — `tools/playtest/policy.mjs`
- `greedyLongest(chains)` → pick the longest valid chain (ties broken by highest `tileValue`, then stable order). Export the policy as a pluggable function so future policies (max-coin, max-resource-value, target-a-family) drop in.

### 3. Payload synthesis — `tools/playtest/payload.mjs`
- Given a chosen chain + the grid, build the **exact** `CHAIN_COLLECTED` payload the scene emits (`GameScene.ts:1896`):
  ```js
  const res = getItem(chain.key);              // board tile def → res.value
  const resourceKey = producedResource({ key: chain.key });
  payload = {
    key: chain.key,
    gained: chain.length,                       // = path.length
    upgrades: upgradeCountForChain(chain.length, chain.key, UPGRADE_THRESHOLDS), // src/utils.ts
    chainLength: chain.length,
    value: res.value,                           // TILE value, not resource value
    chain: chain.cells.map(c => ({ key: chain.key, row: c.row, col: c.col })),
    resourceKey,
    // crossCollected omitted in v1
  };
  ```
- Reuse `upgradeCountForChain` from `src/utils.ts` (already used by the scene at `GameScene.ts:1804`) so upgrade accounting matches the game.

### 4. Run loop — `tools/playtest/run.mjs`
- `simulateRun({ zoneId, seed })`:
  1. Seed a PRNG (small xorshift/mulberry32 inline — no deps). Save `Math.random`, override with the PRNG for the run, restore in a `finally`.
  2. `let s = createInitialState();` then make the zone playable: it must be **founded** and have **coins** and a **farm board**. `home` is auto-founded (`isSettlementFounded` returns true for `home`). For non-home zones, set `s.settlements[zoneId] = { founded: true, biome: <first>, tier: 0 }` directly on the state object (the harness owns the start state; this is test-style setup, not a dispatched action). Give `s.coins` enough to pay `entryCost`.
  3. `s = rootReducer(s, { type: "FARM/ENTER", payload: { selectedTiles: [], useFertilizer: false } })`. Read `s.farmRun.turnBudget`.
  4. Loop while `s.farmRun && s.farmRun.turnsRemaining > 0`: build/refresh board, enumerate chains, if none → break (record a "no-move" stall), else apply policy, synth payload, `s = rootReducer(s, { type: "CHAIN_COLLECTED", payload })`, collapse the board for the next iteration.
  5. When the run ends, `s = rootReducer(s, { type: "CLOSE_SEASON" })`.
  6. Return `{ zoneId, seed, turnsPlayed, coinsEarned, resourceUnits: {key: n}, chainsPlayed, ... }` derived by diffing start vs end state (`coins`, `inventory[zoneId]`, `seasonStats`). NOTE: `seasonStats.coins` is reset by `CLOSE_SEASON`, so snapshot it **before** closing.
- `simulateZone({ zoneId, seeds: [...] })` → aggregate (mean/median/min/max coins/turn, per-family resource yield).

### 5. Metrics + spread analysis — `tools/playtest/metrics.mjs`
- Compute coins/turn (= coinsEarned / turnsPlayed), coins/run, resource units per family.
- **Family-value spread:** for each produced resource reached during the run, compute `realizedValuePerTile = ITEMS[resourceKey].value / TILES_PER_RESOURCE[tileKey]` (e.g. pearls: `800/5 = 160`/tile-spent; pie: `90/7 ≈ 12.9`/tile-spent). Report the ratio of max/min across families — this is the audit metric. Flag outliers beyond a configurable band (e.g. > 3×).
- Compare against a declarative PC2 `targets` table (a literal in `tools/playtest/targets.mjs`): target coins/run band per zone tier, target "runs to afford a tier-up" band. Diff actual vs band → suggested constant deltas.

### 6. Change-list emitter — `tools/playtest/emitChangeList.mjs`
- Translate suggested deltas into `CostChange[]`-shaped records and feed `renderMarkdown` / `renderJsonPatch` from `src/balanceManager/wiki/costExport.ts` so the output is byte-compatible with the Dev Panel workflow (title `# puzzleDrag2 — balance change request`, dotted paths `ITEMS.<key>.value`, `BUILDINGS.<id>.cost.<res>`, `RECIPES.<id>.inputs.<res>`).
  - Confirm the exact dotted-path string `costMatrix.ts` produces for each matrix (read `editPath` construction) and mirror it so a pasted patch lands on the right field.
- Write to `docs/playtest/change-list.md` + `.json`.

### 7. CLI entry — `tools/playtest/cli.mjs`
- `node tools/playtest/cli.mjs --zones home,meadow --runs 20 --seed 1234 --out docs/playtest` → runs everything, writes report + change-list. Add an npm script `"playtest": "node tools/playtest/cli.mjs"`.

### 8. Snapshot regression test — `src/__tests__/playtest-harness.test.ts` (or `tools/playtest/__tests__/`)
- Imports the simulator, runs a **fixed** zone+seed set, asserts the metrics object deep-equals a committed snapshot (`toMatchInlineSnapshot` or a checked-in JSON). This is the drift guard. Lives where Vitest's `include` picks it up (`src/**/*.test.ts` or `tests/**/*.test.ts`).

### Cross-cutting touch points / footguns
- **SLICE_PRIMARY_ACTIONS footgun: N/A but verify.** This project adds **no new action types**, so the `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` registration footgun (`state.ts:1590`/`:1639`) does not apply. If a future iteration adds a `DEV/SIMULATE`-style action, it MUST be registered there or it silently no-ops — run the `check-slice-action` skill then.
- **No SAVE_SCHEMA bump.** The harness adds no persisted shape. Do not touch `SAVE_SCHEMA_VERSION`.
- **Determinism:** override `Math.random` per run (step 4.1). Cross-check with a no-dangers zone where the reducer makes no RNG calls.
- **Side-effect-free:** call `rootReducer`/`rawReducer`, never `gameReducer` (which persists).
- After adding files, run `graphify update .`.

## Success criteria

- [ ] `node tools/playtest/cli.mjs --zones home --runs 10 --seed 1` completes with no Phaser/canvas/DOM import and prints aggregate coins/turn, coins/run, and per-family resource yields.
- [ ] Re-running the same command with the same `--seed` produces **byte-identical** metrics output (determinism proven).
- [ ] The run loop actually advances turns: `turnsPlayed` equals the zone's `turnBudgetForZone` for `home` (default base 10 + any additive), and the run ends via `CLOSE_SEASON` (not by stalling), for at least the `home` zone.
- [ ] Coins recorded per run match the reducer's `floor(chainLength × tileValue)` summed over chains (spot-checkable by hand for a 1-chain forced run).
- [ ] The family-value spread metric reproduces the audit finding: `pearls` realized-value-per-tile (≈160) vs `pie` (≈12.9) is reported with the ratio flagged as an outlier.
- [ ] The emitted change-list is titled `# puzzleDrag2 — balance change request`, has a ```json patch whose keys are dotted `src/constants.ts` paths (e.g. `ITEMS.pie.value`), and is accepted/parsed by the existing cost-matrix paste path semantics.
- [ ] `npm test` passes including the new snapshot regression test; deliberately changing a balance constant (e.g. `ITEMS.pie.value`) makes the snapshot test **fail** (drift is caught).
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` all pass.
- [ ] No new persisted state; `SAVE_SCHEMA_VERSION` unchanged at 45; no new action types added to the reducer.

## Validation — how to verify

Gating commands (must pass before PR):
- `npm run lint` — clean over `src/` (+ `prototype.tsx`). If harness `.ts` lives under `src/__tests__`, it is linted; `.mjs` under `tools/` is not linted by the current `lint` script (scoped to `src/` + `prototype.tsx`) — keep CLI logic in `.mjs`, testable logic importable.
- `npm run typecheck` — `tsc --noEmit`. Any `.ts` harness module must typecheck against `GameState`/`Action` from `src/types/state`.
- `npm test` — Vitest (node env, fake localStorage, no canvas). Pass = all green incl. the new snapshot test.
- `npm run build` — production build still succeeds (ensures nothing imported a node-only API into a shipped module path).

Informational commands:
- `node tools/playtest/cli.mjs --zones home,meadow,quarry --runs 50 --seed 7 --out docs/playtest` — generate the full report. Eyeball the coins/turn and the change-list.

New tests to add:
- `src/__tests__/playtest-harness.test.ts`:
  - `"deterministic: same seed → same metrics"` — runs `simulateRun({zoneId:'home', seed:1})` twice, asserts deep-equal.
  - `"home run consumes its full turn budget"` — asserts `turnsPlayed === turnBudgetForZone(initial, 'home')` and the final state had `farmRun` reach `turnsRemaining 0` then `CLOSE_SEASON` applied (e.g. `s.farmRun === null`, `s.view === 'town'`).
  - `"coins match floor(len*tileValue)"` — a forced single-chain run (stub the board to one known chain) asserts coins delta equals `Math.max(1, floor(len*value))`.
  - `"family-value spread is reported"` — asserts the metrics expose `realizedValuePerTile` for `pearls` and `pie` with the expected ~160 / ~12.9 and an outlier flag.
  - `"metrics snapshot"` — `expect(metrics).toMatchSnapshot()` (or inline) over a fixed seed set — the drift guard.
- (Optional) `tools/playtest/__tests__/board.test.ts` — `enumerateChains` finds the right components on a hand-built grid; `collectComponents` matches `hasValidChain`'s validity verdict.

Manual in-game check: **N/A** — this is a non-visual, non-canvas tool. There is no Phaser surface to inspect (`window.__phaserScene` is irrelevant here; `preview_screenshot` hangs on this host anyway). Validation is entirely via Node CLI output + Vitest.

Which are gating: `lint`, `typecheck`, `test`, `build` are gating. The CLI report run is informational (its *output* is the deliverable, but it is not a pass/fail gate; the snapshot test is the gate that protects it).

## Double-check / adversarial review

Prove it actually plays the real economy (not a parallel fake):
- **"Did I really wire the reducer?"** Assert the harness imports `rootReducer`/`createInitialState` from `src/state.js` (not a local copy) and that a forced chain produces the **exact** coin delta the reducer computes. If you reimplemented the coin math in the harness, you've built a fake — the coin number must come from reading `state.coins` after `rootReducer`, never from harness arithmetic.
- **Payload fidelity:** diff your synthesized `CHAIN_COLLECTED` payload field-by-field against `GameScene.ts:1896`. A missing `resourceKey` means **zero resource income** (the `if (resourceKey)` guard at `state.ts:353`); a wrong `value` skews every coin number. Add a test that a payload missing `resourceKey` yields no inventory change (matching the reducer) so the contract is pinned.
- **Run actually ends the right way:** confirm `turnsPlayed` is bounded by `turnBudget` and that the loop terminates via `farmRun.turnsRemaining === 0`, not by board stall, on `home`. A stall on `home` (which has a rich pool) signals a broken board builder/enumerator.

Edge cases a skeptic will attack:
- **Nondeterminism leak:** if any run touches a danger biome and you forgot to override `Math.random`, two same-seed runs diverge. Test: run twice, assert equal; also run a no-dangers zone and assert it makes zero `Math.random` calls (spy on `Math.random`).
- **`CLOSE_SEASON` resets `seasonStats`:** if you read `seasonStats.coins` *after* close you get 0. Snapshot metrics before `CLOSE_SEASON`. Add a test that catches this (assert coins > 0 for a multi-chain run).
- **Capped resources / floaters:** `addCappedResourceMut` clamps to `currentCap(state)` and emits floaters. The harness should grant a high cap or account for cap loss, else yields under-report. Verify by comparing resourceUnits to chains×(1/threshold) when below cap.
- **Free moves:** `tileCollection.freeMoves` makes a chain consume no turn (`boardTurnPatch`). Fresh state has 0, but if a tile grants them mid-run the turn count drifts — assert `turnsPlayed` accounting includes `lastBoardActionConsumedFreeMove`.

Rollback safety: the entire project is **additive** (new files under `tools/playtest/` + one test). It touches **no game code, no constants, no persisted shape**. Rollback = delete the new files + the npm script line. There is zero risk to the shipping game; the harness only reads.

Dormant-path note: this is not a dormant-system fix — it is net-new tooling. The "prove the path now fires" obligation maps to: prove the harness drives the **real** `CHAIN_COLLECTED`/`FARM/ENTER`/`CLOSE_SEASON` code paths (assert state mutated by the genuine reducer), not a stub.

## Risks & gotchas

- **`value` is the tile value, not the resource value.** The biggest trap. Coins = `chainLength × tileValue`; resource *worth* (pie 90 / pearls 800) is realized only on sell/order. Modeling coins off resource value would be wrong. (Verified `state.ts:401`, `GameScene.ts:1896`, `constants.ts:421/497/406/509`.)
- **Direct `Math.random()` in CHAIN_COLLECTED** for hazard/rat/ore/pearl spawns breaks determinism unless overridden or unless the zone has no dangers (`settlementHazards` → `[]`). (`state.ts:496/504/516`.)
- **Call `rootReducer`, not `gameReducer`.** `gameReducer` persists + runs `runActionEffects` (`state.ts:1696–1713`); `rootReducer`/`rawReducer` is pure. Tests use `rootReducer`; match that.
- **Tier costs are resources-only, no coins today**, and the home ladder is 7 named rungs (Camp→Settlement→Village→Town→City→Manor→…) — NOT the stale "Hamlet/Village/City". Measure tier-up affordability in resource units per run. (`cartography/data.ts:252–283`, `state.ts:760`.)
- **Founding requires prior completion + tier gates** (`FOUND_SETTLEMENT`, `state.ts:712`); rather than dispatch it, the harness should construct a founded start state directly for non-home zones (test-style setup) to avoid threading the whole progression.
- **Board collapse is an approximation.** The scene's gravity/refill differs from a naive top-fill. Document this; it affects which chains are available next, hence yields. For v1, accept the approximation and note it; a future pass can mirror the scene's collapse if metrics prove sensitive to it.
- **Snapshot brittleness:** the drift-guard snapshot must be *intended* to change when constants change (that's the point) — but it will also change if you change the board builder or policy. Keep board/policy stable; bump the snapshot deliberately with a note when you do.
- **Lint scope:** `npm run lint` only covers `src/` + `prototype.tsx`. `tools/**/*.mjs` is not linted, so put the testable, type-checked logic in importable `.ts` modules (covered by `typecheck`) and keep `.mjs` CLI glue thin.
- **`createFreshState` vs `createInitialState`:** use `createInitialState` (= `initialState`) as the tests do; `createFreshState` may differ in story/npc seeding.

## References

- `src/state.ts` — `coreReducer` `CHAIN_COLLECTED` (238–523), `FARM/ENTER` (1094), `CLOSE_SEASON` (950), `TIER_UP` (749), `FOUND_SETTLEMENT` (712), `boardTurnPatch` (147), `SLICE_PRIMARY_ACTIONS` (1590), `rawReducer`/`rootReducer`/`gameReducer` (1653–1717).
- `src/game/chain.ts` — `hasValidChain`, 8-dir DFS shape to reuse.
- `src/game/producedResource.ts` — `producedResource`, `buildChainUpdatePayload`.
- `src/GameScene.ts` — `collectPath` (1787) + the canonical `CHAIN_COLLECTED` emit (1896): the payload contract to mirror.
- `src/constants.ts` — `SAVE_SCHEMA_VERSION` (207), `UPGRADE_THRESHOLDS` (209), `TILES_PER_RESOURCE` (255), `FARM/MINE/FISH_TILE_POOL` (269/283/287), `ITEMS` (601; `pie` 406, `pearls` 509, tile values 384/421/470/497), `BUILDINGS` (782), `RECIPES` (927), `MARKET_PRICES` (1035), `TILE_FAMILY_RESOURCE` (300).
- `src/features/zones/data.ts` — `turnBudgetForZone` (192), `zoneBaseTurns` (166), tier helpers (`settlementTier`, `currentTierDef`, `maxTier`), founding cost (404).
- `src/features/cartography/data.ts` — `MAP_NODES[].tiers` (the real tier ladder + `upgradeCost`), `ZoneTier` type (52–59).
- `src/balanceManager/wiki/costExport.ts` — `buildCostReport`, `renderMarkdown`, `renderJsonPatch`, `CostChange` (the output format).
- `src/balanceManager/wiki/costMatrix.ts` — `editPath`/`exportLabel` (dotted-path construction for buildings/tools/resources); `wikiNav.ts:111` (`/b/#/costMatrix` route); `CostMatrixPage.tsx` (uses `buildCostReport`).
- `src/state/persistence.ts` — version-gated load/discard (no migration); why the harness must not persist.
- `src/__tests__/setup.ts` — the fake-`localStorage` setup proving reducers run in node.
- `tests/phase-3-economy.test.ts` — example of importing `createInitialState`/`rootReducer` and driving actions (the harness's test pattern).
- `src/utils.ts` — `upgradeCountForChain`, `currentCap` (cap math the harness must respect).
- `.claude/skills/check-slice-action` — run if a future iteration ever adds a new action type.
- Related deferred work: docs `04-*` and `13-*` (economy changes this harness unblocks), doc `08-*` (save-migration ladder — NOT a dependency, since no schema bump).
- CLAUDE.md note: file extensions in CLAUDE.md say `.js/.jsx` but the real files are `.ts/.tsx` — trust the code (this brief uses real `.ts` paths; imports resolve via `.js` specifiers per the project's TS/ESM convention, e.g. `from "../src/state.js"`).
