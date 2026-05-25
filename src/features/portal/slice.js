import { MAGIC_TOOLS } from "./data.js";
import { locBuilt } from "../../locBuilt.js";

export const initial = {};

/**
 * SUMMON_MAGIC_TOOL reducer.
 * Deducts influence, increments state.tools[id].
 * Requires state.built.portal === true and state.influence >= cost.
 */
export function reduce(state, action) {
  switch (action.type) {
    case "SUMMON_MAGIC_TOOL": {
      const { id } = action.payload ?? {};
      const def = MAGIC_TOOLS.find((t) => t.id === id);
      if (!def) return state;
      // Portal must be built
      if (!locBuilt(state).portal) return state;
      // Sufficient influence
      if ((state.influence ?? 0) < def.influenceCost) return state;
      return {
        ...state,
        influence: state.influence - def.influenceCost,
        tools: {
          ...state.tools,
          [id]: (state.tools?.[id] ?? 0) + 1,
        },
      };
    }

    case "USE_TOOL": {
      // Magic tools route through coreReducer applyToolPower (ITEMS[key].power).
      return state;
    }

    case "CHAIN_COLLECTED": {
      // Decrement magic_fertilizer charges on each chain; clear when exhausted
      const charges = state.magicFertilizerCharges ?? 0;
      if (charges <= 0) return state;
      const newCharges = charges - 1;
      return {
        ...state,
        magicFertilizerCharges: newCharges,
        fertilizerActive: newCharges > 0 ? state.fertilizerActive : false,
      };
    }

    default:
      return state;
  }
}
