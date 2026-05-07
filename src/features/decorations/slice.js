import { DECORATIONS } from "./data.js";

export const initial = {};

/**
 * BUILD_DECORATION reducer.
 * Deducts cost from coins + inventory, increments built.decorations[id],
 * credits influence. Repeatable — same grant on every build.
 * Returns state unchanged if cost unmet.
 */
export function reduce(state, action) {
  if (action.type !== "BUILD_DECORATION") return state;

  const { id } = action.payload ?? {};
  const def = DECORATIONS[id];
  if (!def) return state;

  const { cost, influence } = def;

  // Check coins
  if ((state.coins ?? 0) < (cost.coins ?? 0)) return state;

  // Check resource inventory items
  const inv = state.inventory ?? {};
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    if ((inv[k] ?? 0) < v) return state;
  }

  // Deduct costs
  const newInv = { ...inv };
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    newInv[k] = (newInv[k] ?? 0) - v;
  }

  const prevCount = state.built?.decorations?.[id] ?? 0;

  return {
    ...state,
    coins: state.coins - (cost.coins ?? 0),
    inventory: newInv,
    influence: (state.influence ?? 0) + influence,
    built: {
      ...state.built,
      decorations: {
        ...(state.built?.decorations ?? {}),
        [id]: prevCount + 1,
      },
    },
  };
}
