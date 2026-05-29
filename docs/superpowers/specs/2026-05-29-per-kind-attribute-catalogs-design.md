# Per-kind attribute (ability) catalogs

**Date:** 2026-05-29
**Status:** Design — approved sections, pending written-spec review

## Problem

Tiles, buildings, and workers all draw their "attributes" from a single
unified catalog, `src/config/abilities.ts` (`ABILITIES`, 19 entries). Each
entry carries a `scope: ("tile" | "building" | "worker")[]` array that decides
which entity kinds may attach it.

The single catalog permits combinations the game doesn't meaningfully honor.
The motivating example: `pool_weight` ("Spawn Boost") is scoped to
`["worker", "tile", "building"]`, but a board *tile* increasing spawn rate is
conceptually muddled — spawn-rate boosts are a town/labor economy lever, not
something an individual tile should carry. Several other scopes are similarly
loose (abilities allowed on a kind that no data uses and that read oddly there).

We want the **configs to be more constrained per kind**, while **reusing the
underlying runtime** (the aggregator is already id-based and kind-agnostic, so
the aggregation path does not need to change).

## Decisions (from brainstorming)

1. **Separate per-kind catalogs** — three independent catalogs
   (`TILE_ATTRIBUTES`, `BUILDING_ATTRIBUTES`, `WORKER_ATTRIBUTES`), not a single
   list with tightened `scope` arrays.
2. **Full per-kind entries** — each catalog defines its own self-contained
   entry for an attribute, even when the same attribute exists in another kind.
   They share only the `channel` id (the runtime hook) and param-type
   constants. This lets a tile's `bonus_yield` carry different param
   ranges/defaults than a building's, and each catalog reads as the complete
   set of attributes for that kind.
3. **Prune all ill-fitting / unused combos** (not just `pool_weight` on tiles).
4. **Per-kind compile-time enums + validators**, and **update Dev Panel
   pickers** so each kind only offers its own catalog.
5. Implementing the Dodo's "auto-collect on any chain" is **out of scope** — it
   was only the illustrative example.

## Architecture

Keep one runtime and one union; add a config layer of three catalogs on top.

- **Runtime, unchanged:** `src/config/abilitiesAggregate.ts`
  (`aggregateAbilities`, `applyAbilityToChannels`, `emptyChannels`,
  `expandAbilitiesToEffects`, `forEachAbilityWithTrigger`). It dispatches on the
  ability `id`, so it is already kind-agnostic. No changes to the aggregation
  semantics.
- **Union, preserved:** `getAbility(id)` and an `ABILITIES` array must keep
  resolving every id for the aggregator and for `getAbility` callers
  (`achievements/slice.ts`, `iconUsage.ts`, `icon-audit.test.ts`).

### File layout

```
src/config/abilities/
  shared.ts      # ABILITY_PARAM_TYPES, TRIGGERS, channel id constants,
                 # AttributeEntry typedef, shared param builders
  tile.ts        # TILE_ATTRIBUTES  — full self-contained entries
  building.ts    # BUILDING_ATTRIBUTES
  worker.ts      # WORKER_ATTRIBUTES
  index.ts       # ABILITIES (union, deduped by id), ABILITY_BY_ID,
                 # getAbility, defaultParamsFor,
                 # attributesForKind(kind), attributeAllowedForKind(id, kind)
```

`src/config/abilities.ts` becomes a re-export shim of `./abilities/index.ts`
so existing import paths keep working during/after the move (or is deleted once
all importers are repointed — decided at implementation time; prefer repointing
importers and deleting the shim to avoid a dangling indirection).

### What replaces `scope`

- The `scope` array is **removed** from entries. Membership *is* which catalog
  an entry lives in.
- `abilitiesForScope(scope)` is reimplemented as `attributesForKind(kind)` — a
  direct lookup returning the matching catalog (no array filtering). A
  back-compat alias `abilitiesForScope` may remain pointing at
  `attributesForKind` to minimize churn in `AbilitiesEditor.tsx`.
- `abilityAllowedInScope(id, scope)` → `attributeAllowedForKind(id, kind)`,
  implemented as "id is present in that kind's catalog".

### Types

`src/types/catalog/abilities.ts` currently exports a single `AbilityId` enum +
`ABILITY_ID_VALUES`. Keep `AbilityId` as the **union** (used by the aggregator
and `getAbility` typing), and add three subset enums following the existing
catalog enum convention (cf. `WorkerTypeId` in `src/types/catalog/workers.ts`):

```ts
export enum TileAttributeId { ... }      // the 5 tile ids
export enum BuildingAttributeId { ... }  // the 12 building ids
export enum WorkerAttributeId { ... }    // the 10 worker ids
export const TILE_ATTRIBUTE_ID_VALUES = Object.values(TileAttributeId);
// ...building/worker value arrays
```

Re-export from `src/types/catalog/index.ts` alongside the existing `AbilityId`.

Runtime validators (in `abilities/index.ts`): `isTileAttribute(id)`,
`isBuildingAttribute(id)`, `isWorkerAttribute(id)` — each a membership check
against the corresponding catalog.

## Per-kind attribute matrix (the pruning)

Final assignment. ✓ = attribute belongs to that kind's catalog.

| Attribute | Tile | Building | Worker | Change from today |
|---|:--:|:--:|:--:|---|
| `bonus_yield` | ✓ | ✓ | ✓ | — |
| `free_moves` | ✓ |   |   | drop from building (unused) |
| `free_turn_if_chain` | ✓ |   |   | — |
| `coin_bonus_flat` | ✓ |   |   | drop from building (unused) |
| `coin_bonus_per_tile` | ✓ |   |   | — |
| `pool_weight` |   | ✓ | ✓ | **drop from tile** (motivating case) |
| `threshold_reduce` |   | ✓ | ✓ | drop from tile (unused) |
| `threshold_reduce_category` |   | ✓ | ✓ | — |
| `season_bonus` |   | ✓ | ✓ | — |
| `recipe_input_reduce` |   | ✓ | ✓ | — |
| `hazard_spawn_reduce` |   | ✓ | ✓ | — |
| `pool_weight_legacy` |   |   | ✓ | — |
| `chain_redirect_category` |   |   | ✓ | — |
| `hazard_coin_multiplier` |   |   | ✓ | — |
| `grant_tool` |   | ✓ |   | — |
| `worker_pool_step` |   | ✓ |   | — |
| `preserve_board` |   | ✓ |   | — |
| `turn_budget_bonus` |   | ✓ |   | — |
| `inventory_cap_bonus` |   | ✓ |   | — |

- **Tile (5):** `bonus_yield`, `free_moves`, `free_turn_if_chain`,
  `coin_bonus_flat`, `coin_bonus_per_tile` — chain/board-time effects only.
- **Building (12):** `threshold_reduce`, `threshold_reduce_category`,
  `pool_weight`, `bonus_yield`, `season_bonus`, `recipe_input_reduce`,
  `hazard_spawn_reduce`, `grant_tool`, `worker_pool_step`, `preserve_board`,
  `turn_budget_bonus`, `inventory_cap_bonus`.
- **Worker (10):** `threshold_reduce`, `threshold_reduce_category`,
  `pool_weight`, `pool_weight_legacy`, `bonus_yield`, `season_bonus`,
  `recipe_input_reduce`, `chain_redirect_category`, `hazard_spawn_reduce`,
  `hazard_coin_multiplier`.

`pool_weight_legacy` keeps its distinct continuous-scaling semantics and stays
worker-only.

## Data migration

The only entity data that references a now-invalid combo is two tiles in
`src/features/tileCollection/data.ts`:

- `tile_grass_meadow`: `pool_weight` (hay, +1) → **`bonus_yield` (`tile_grass_hay`, +1)**
- `tile_grass_spiky`: `pool_weight` (hay, +2) → **`bonus_yield` (`tile_grass_hay`, +2)**

`bonus_yield` is tile-valid and gives a hay-themed, board-appropriate perk
(extra hay when a hay chain is collected), preserving the intent. Update the
tiles' `description` text to match the new effect.

No building (`src/constants.ts` `BUILDINGS`) or worker
(`src/features/workers/data.ts`) data needs to change — all their abilities
remain valid under the new matrix.

If any persisted save or `balance.json` draft references `pool_weight` on a
tile, `applyTileOverrides` / `applyItemOverrides` already skip ids not in the
live maps; with the per-kind validator wired into the override path, a
tile-scoped `pool_weight` override is silently dropped rather than applied.

## Consumer updates

| Consumer | Change |
|---|---|
| `src/balanceManager/AbilitiesEditor.tsx` | `abilitiesForScope(scope)` → `attributesForKind(kind)` (or keep the alias). Picker now offers only that kind's catalog. |
| `src/balanceManager/tabs/AbilitiesReferenceTab.tsx` | Render three labeled sections (Tile / Building / Worker attributes) instead of one list with a `scope` column; drop `scopeLabel`. |
| `src/balanceManager/wiki/concepts.ts` | Point the Attributes concept at the three per-kind catalogs so the Wiki shows constrained sets. |
| `src/balanceManager/iconUsage.ts`, `icon-audit.test.ts` | Continue iterating the `ABILITIES` union — no change beyond import path. |
| `src/config/applyOverrides.ts` | Validate attribute overrides against the per-kind validator at the tile/building/worker write sites so cross-kind attributes are rejected. |
| `src/features/workers/aggregate.ts` | No change — passes `abilities` arrays to the unchanged aggregator. |
| `src/features/achievements/slice.ts` | No change — `getAbility` still resolves every id from the union. |

### `expandAbilitiesToEffects` cleanup (minor)

`expandAbilitiesToEffects` has `pool_weight` and `threshold_reduce` branches
that only made sense when those were tile-valid. They are now dead for tiles.
Leave them in place (harmless, and the function is also reachable for non-tile
expansion) but add a comment noting tiles no longer carry these. Do **not**
remove behavior that any current path depends on without a test proving it
unreachable.

## Tests

- `src/__tests__/abilities-catalog.test.ts`
  - Replace the "every entry's `scope` ⊆ `ABILITY_SCOPES`" assertions with:
    each per-kind catalog contains only its allowed ids; every id in all three
    catalogs resolves via `getAbility`; the union `ABILITIES` is the dedup of
    the three.
  - Assert no tile attribute targets a building/worker-only channel
    (`seasonEndTools`, `seasonEndPoolStep`, `boardPreserveBiomes`,
    `turnBudgetBonus`, `inventoryCapBonus`, `chainRedirect`,
    `hazardCoinMultiplier`).
  - Regression: `attributeAllowedForKind("pool_weight", "tile") === false`,
    `isTileAttribute("pool_weight") === false`,
    `isBuildingAttribute("pool_weight") === true`.
- `src/__tests__/abilities-unit.test.ts`, `abilities-combo.test.ts`,
  `abilities-tile-aggregation.test.ts`, `abilities-achievements.test.ts` —
  unaffected (aggregator unchanged), but re-run to confirm.
- `src/__tests__/ability-picker.test.ts` — update to assert the picker yields
  the per-kind catalog for each kind.
- Add a tile-data test (or extend an existing tileCollection test) asserting
  `tile_grass_meadow` / `tile_grass_spiky` now carry `bonus_yield` on
  `tile_grass_hay`.

## Out of scope

- Dodo "auto-collect on any chain" attribute (no new attributes added).
- Any change to aggregation math, channels, or save schema. (No
  `SAVE_SCHEMA_VERSION` bump: the persisted shape of an `abilities` array does
  not change; only which ids are *valid* per kind, enforced at config/override
  time.)

## Verification

- `npm run typecheck`, `npm run action-types:check` (catalog coverage),
  `npm test`, `npm run lint`.
- UI touched (`AbilitiesEditor`, `AbilitiesReferenceTab`, Wiki): run
  `npm run test:visual`; refresh goldens if the Attributes reference/Wiki
  layout intentionally changes.
