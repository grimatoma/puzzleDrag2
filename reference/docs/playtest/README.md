# AI Playtest & Auto-Balance Harness

A headless auto-player that plays full game runs **without Phaser** by driving
the pure game logic + the React reducer directly in Node, then reports balance
metrics and emits a machine-readable constant-edit change-list.

See the implementation brief (archived — shipped): [`docs/archive/projects/05-ai-playtest-balance-harness.md`](../archive/projects/05-ai-playtest-balance-harness.md).

## Run it

```bash
npm run playtest -- --zones home --runs 10 --seed 1 --out reference/docs/playtest
# flags: --zones <csv>  --runs <n>  --seed <n>  --policy greedy
#        --rows <n>  --cols <n>  --out <dir>  --no-write
#        --campaign      sequential progression PACING (runs-to-milestone + tier stall)
#        --progression   code-derived STRUCTURE (reachability + per-zone oracle + softlock)
#        --accept        (with --progression) promote the current spine to the baseline
```

Three modes:

- **default** — per-run economy + the family-value spread audit (above).
- **`--campaign`** — one persistent state, runs carried forward, measuring how many
  runs it takes to afford each milestone + where the tier ladder stalls (by actually
  playing). Writes `campaign-report.md` / `campaign-metrics.json`.
- **`--progression`** — no runs played. Derives the progression spine straight from
  the constants (`MAP_NODES`/`BUILDINGS`/`RECIPES`): fresh-save zone reachability, a
  **per-zone siloed** affordability oracle, and **softlock detection** (a circular /
  unreachable gate). Writes `progression.json` / `progression-report.md` and refreshes
  the inlined `SPINE` + `DIFF` data blocks in `reference/docs/balance/progression-timeline.html`
  (the interactive [progression map](../balance/progression-timeline.html)). The structural
  guard is the progression-shape snapshot in the harness test — a constant edit that
  re-gates a zone or re-opens the softlock breaks it intentionally.

  **Cross-run diff.** Every `--progression` run also diffs the fresh spine against the
  committed **baseline** `reference/docs/balance/progression.baseline.json` (the last
  *reviewed* state — tracked, not git-ignored) and reports **what moved** since then,
  classified by severity (a created/cleared softlock or a reachability flip is critical;
  a gate/wall move is major; a cost tweak is minor). The report and dashboard mark changed
  facts as **outdated** (struck-through old value → new), so during a tuning loop you see
  exactly what a constant change did to the journey. Writes `progression-diff.json` /
  `progression-diff.md`. Once the changes are reviewed, **`--progression --accept`** promotes
  the current spine to the baseline (the snapshot-test model: see the diff, then accept).
  The diff logic is unit-tested in the harness test.

This writes four (git-ignored) artifacts into this folder:

| File | What |
|---|---|
| `report.md` | Human report: per-zone economy + the family-value spread table + proposed edits. |
| `metrics.json` | Machine-readable metrics summary (deterministic for a given seed). |
| `change-list.md` | Cost-matrix-compatible balance change request (paste into a fresh session or the `/b/#/costMatrix` workflow). |
| `change-list.json` | Just the `{ "ITEMS.<key>.value": <new> }` patch. |

The outputs are **git-ignored** because they regenerate from constants. The
committed, drift-guarded record of the metrics is the snapshot in
[`src/__tests__/playtest-harness.test.ts`](../../src/__tests__/playtest-harness.test.ts) —
changing a balance constant (e.g. `ITEMS.pie.value`) makes that snapshot fail,
which is how balance drift is caught in CI-able unit tests.

## How it works (no fakes)

The harness drives the **real** reducer (`rootReducer`/`createInitialState`
from `src/state.ts`) through the genuine economy code path:

```
FARM/ENTER  →  CHAIN_COLLECTED × turnBudget  →  CLOSE_SEASON
```

Every coin and resource number is read from real state **after** the reducer
runs — the harness never re-implements the coin or income math. Each run
executes under a seeded `Math.random` override (including `createInitialState`,
which seeds save/market RNG), so runs are byte-reproducible even with farm
hazards active.

Source lives in [`src/playtest/`](../../src/playtest/) (importable, typechecked,
linted, unit-tested) with thin CLI glue in
[`tools/playtest/cli.mjs`](../../tools/playtest/cli.mjs) (loads the TS through
Vite's SSR pipeline — the same compiler the app build uses).

## What v1 found (the deferred-economy audit, made measurable)

The **family-value spread** — realized value-per-tile = `ITEMS[resource].value /
TILES_PER_RESOURCE[tile]` — surfaces the long-deferred imbalance: `pearls`
realizes **160/tile** (value 800 ÷ 5) and `jade` the same, versus a `pie` at
**≈12.9/tile** and commodity floors like `eggs`/`plank`/`hay` near **1/tile** —
a **~192× spread**. The emitted change-list proposes compressing the premium
outliers (`pearls`, `jade`, `honey`, `horseshoe`, `cocoa`, `ink`, `cut_gem`)
toward a `3× median` ceiling. These are **proposals for a human to evaluate**,
not auto-applied — applying them is the existing manual cost-matrix workflow.

## Scope (v1)

- Drives the **farm** board (FARM/ENTER, `FARM_TILE_POOL`) for any farm-board
  zone; `home` works out of the box. Mine/fish biomes are a deferred follow-up.
- Greedy policy (longest available chain). The policy is pluggable
  (`src/playtest/policy.ts`) for future max-coin / target-a-family strategies.
- No cross-collect, fertilizer, or on-board upgrades modeled in v1 (deferred).
- Board collapse is a documented approximation of the scene's gravity/refill.
- **Additive only**: no game logic, constants, action types, or persisted
  state changed; `SAVE_SCHEMA_VERSION` untouched.
