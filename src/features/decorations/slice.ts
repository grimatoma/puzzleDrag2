import { DECORATIONS } from "./data.js";
import { locBuilt } from "../../locBuilt.js";
import { inventoryQty, inventoryPut } from "../../types/inventory.js";
import { inventoryZone, zoneInventory } from "../../state/zoneInventory.js";
import type { Action, GameState } from "../../types/state.js";

export const initial = {};

interface DecorationDef {
  id: string;
  name: string;
  cost: Record<string, number>;
  influence: number;
}

/**
 * BUILD_DECORATION reducer.
 * Deducts cost from coins + inventory, increments built.decorations[id],
 * credits influence. Repeatable — same grant on every build.
 * Returns state unchanged if cost unmet.
 */
export function reduce(state: GameState, action: Action): GameState {
  if (action.type !== "BUILD_DECORATION") return state;

  const id = action.payload.id;
  if (!id) return state;
  const decorationsMap = DECORATIONS as Record<string, DecorationDef | undefined>;
  const def = decorationsMap[id];
  if (!def) return state;

  const { cost, influence } = def;

  // Check coins
  if ((state.coins ?? 0) < (cost.coins ?? 0)) return state;

  // Check resource inventory items
  const decorZone = inventoryZone(state);
  const inv = zoneInventory(state, decorZone);
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    if (inventoryQty(inv, k) < (v as number)) return state;
  }

  // Deduct costs
  let newInv = { ...inv };
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    newInv = inventoryPut(newInv, k, inventoryQty(newInv, k) - (v as number));
  }

  const loc = (state.mapCurrent as string | undefined) ?? "home";
  const lb = locBuilt(state) as { decorations?: Record<string, number>; [k: string]: unknown };
  const decorations: Record<string, number> = lb.decorations ?? {};
  const prevCount = decorations[id] ?? 0;

  return {
    ...state,
    coins: state.coins - (cost.coins ?? 0),
    inventory: { ...state.inventory, [decorZone]: newInv },
    influence: (state.influence ?? 0) + influence,
    built: {
      ...state.built,
      [loc]: {
        ...lb,
        decorations: {
          ...decorations,
          [id]: prevCount + 1,
        },
      },
    },
  };
}
