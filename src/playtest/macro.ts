// Macro policies for the campaign auto-player — the BETWEEN-run decisions.
//
// The per-chain board policy (policy.ts) is the lowest-leverage decision. What
// actually paces progression is the macro layer: what you BUILD, what you CRAFT,
// who you HIRE, and WHEN you tier up. Until M2b the campaign hardcoded a single
// naive macro (greedy TIER_UP only), which is exactly why a farm-only home
// campaign stalls at tier 0 — it never builds the Bakery or crafts the `bread`
// the Hamlet rung needs, even though both are reachable on the home board.
//
// A MacroPolicy takes the post-run persistent state and returns it advanced by
// real reducer actions (BUILD / CRAFTING/CRAFT_RECIPE / TIER_UP — no fakes). Two
// ship here, the floor↔ceiling ends of the bracket the optimizer (M3) must keep
// balance acceptable across:
//   • floorMacro   — the original greedy tier-up; models a player who never
//                    builds or crafts. (Default → the existing campaign snapshot
//                    is unchanged.)
//   • climbMacro   — builds the crafting stations the next rung needs, crafts its
//                    crafted goods, then tiers up, to a fixpoint. Clears the
//                    documented home tier-0 `bread` stall.
//
// Pure given the reducer: no RNG, fixed iteration order → fully deterministic.

import { rootReducer } from "../state.js";
import { RECIPES } from "../constants.js";
import {
  settlementTier,
  maxTier,
  currentTierDef,
  unlockedBuildings,
} from "../features/zones/data.js";
import { canPayForRecipe } from "../features/crafting/slice.js";
import { locBuilt } from "../locBuilt.js";
import { zoneInventory } from "../state/zoneInventory.js";
import { inventoryQty } from "../types/inventory.js";
import { WorkerTypeId } from "../types/catalogKeys.js";
import type { GameState } from "../types/state.js";
import type { Action } from "../types/actionPayloads.js";

/** Repeatable House building id — grants Villagers (the hiring currency). */
const HOUSING_ID = "housing";
/** Farm-relevant hires the ceiling pursues: threshold-reducers + the bread Baker. */
const FARM_HIRES: string[] = [
  WorkerTypeId.Baker, WorkerTypeId.Farmer, WorkerTypeId.Peasant,
  WorkerTypeId.Poultryman, WorkerTypeId.Lumberjack, WorkerTypeId.VegetablePicker,
];

/** Advance the persistent campaign state by the between-run macro decisions. */
export type MacroPolicy = (state: GameState, zoneId: string) => GameState;

/** Tier up `zoneId` as many rungs as the bankroll + inventory currently allow. */
function tierUpWhileAffordable(state: GameState, zoneId: string): GameState {
  let s = state;
  while (settlementTier(s, zoneId) < maxTier(zoneId)) {
    const before = settlementTier(s, zoneId);
    const next = rootReducer(s, { type: "TIER_UP", payload: { zoneId } } as Action);
    if (settlementTier(next, zoneId) === before) break; // unaffordable → done
    s = next;
  }
  return s;
}

/**
 * Floor macro: greedy tier-up only (the original applySpendPolicy). Models a
 * player who never builds or crafts. Returns the same state reference when no
 * rung is affordable.
 */
export const floorMacro: MacroPolicy = (state, zoneId) => tierUpWhileAffordable(state, zoneId);

/** Canonical recipe id that outputs `resource`, or null if it isn't crafted. */
function recipeForOutput(resource: string): string | null {
  for (const [recId, rec] of Object.entries(RECIPES as Record<string, { item?: string }>)) {
    if (rec.item === resource) return recId;
  }
  return null;
}

/**
 * Ceiling macro: each pass, (1) build the crafting STATIONS the next rung's
 * crafted goods require (when unlocked + affordable), (2) craft those goods up to
 * the rung's need, (3) tier up while affordable — repeating until a full pass
 * changes nothing (fixpoint). Targeted on the next rung's needs so resources
 * aren't squandered on irrelevant buildings.
 */
export const climbMacro: MacroPolicy = (state, zoneId) => {
  let s = state;
  const MAX_PASSES = 64;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const before = s;

    const nextDef = currentTierDef(zoneId, settlementTier(s, zoneId) + 1);
    const needs = (nextDef?.upgradeCost?.resources ?? {}) as Record<string, number>;

    // 1) Build the stations needed to craft the next rung's crafted goods.
    const unlocked = new Set<string>(unlockedBuildings(zoneId, settlementTier(s, zoneId)));
    for (const res of Object.keys(needs)) {
      const recId = recipeForOutput(res);
      if (!recId) continue; // farm/chain-produced — the board policy supplies it
      const station = (RECIPES as Record<string, { station: string }>)[recId].station;
      if ((locBuilt(s) as Record<string, boolean>)[station]) continue;
      if (!unlocked.has(station)) continue;
      const next = rootReducer(s, { type: "BUILD", payload: { id: station } } as Action);
      if ((locBuilt(next) as Record<string, boolean>)[station]) s = next; // took only if it built
    }

    // 2) Craft each needed crafted good up to the rung's requirement.
    for (const [res, need] of Object.entries(needs)) {
      const recId = recipeForOutput(res);
      if (!recId) continue;
      let guard = 0;
      while (guard++ < 256) {
        if (inventoryQty(zoneInventory(s, zoneId), res) >= need) break;
        if (!canPayForRecipe(s, recId)) break;
        const next = rootReducer(s, { type: "CRAFTING/CRAFT_RECIPE", payload: { key: recId } } as Action);
        if (next === s) break;
        s = next;
      }
    }

    // 3) Tier up while affordable.
    s = tierUpWhileAffordable(s, zoneId);

    // 4) Lift future yields: once Housing is unlocked (Hamlet+), build a House for
    // Villagers, then hire the farm threshold-reducers + bread Baker. Each dispatch
    // is gated by the reducer (cap / coins / villagers / resources); we keep a
    // change only when it actually took.
    if (new Set<string>(unlockedBuildings(zoneId, settlementTier(s, zoneId))).has(HOUSING_ID)) {
      const built = rootReducer(s, { type: "BUILD", payload: { id: HOUSING_ID } } as Action);
      if ((built.villagers ?? 0) > (s.villagers ?? 0)) s = built; // a House actually raised Villagers
      for (const id of FARM_HIRES) {
        let guard = 0;
        while (guard++ < 16) {
          const next = rootReducer(s, { type: "WORKERS/HIRE", payload: { id } } as Action);
          if (next === s) break; // hire rejected (cap / coins / villagers / resources)
          s = next;
        }
      }
    }

    if (s === before) break; // fixpoint — nothing changed this pass
  }
  return s;
};

/** Registry of named macro policies, for CLI `--macro <name>` selection. */
export const MACROS: Record<string, MacroPolicy> = {
  floor: floorMacro,
  climb: climbMacro,
};
