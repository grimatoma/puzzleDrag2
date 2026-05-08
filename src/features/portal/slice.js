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
      // Magic tool use handler — extends the existing USE_TOOL case.
      // Only handle magic tool ids here; other ids are handled by coreReducer.
      const id = action.payload?.id ?? action.payload?.key ?? action.key;
      if (!id) return state;

      // Hourglass — undo last chain
      if (id === "hourglass") {
        const count = state.tools?.[id] ?? 0;
        if (count <= 0) return state;
        const snap = state.lastChainSnapshot;
        if (!snap) {
          // No snapshot: refund — do not consume
          return state;
        }
        // Restore snapshot
        return {
          ...state,
          tools: { ...state.tools, [id]: count - 1 },
          grid: snap.grid ?? state.grid,
          inventory: snap.inventory ?? state.inventory,
          turnsUsed: snap.turnsUsed ?? state.turnsUsed,
          lastChainSnapshot: null,
        };
      }

      // Magic Seed — +5 turns (extends sessionMaxTurns so turn-end check honors it)
      if (id === "magic_seed") {
        const count = state.tools?.[id] ?? 0;
        if (count <= 0) return state;
        return {
          ...state,
          tools: { ...state.tools, [id]: count - 1 },
          sessionMaxTurns: (state.sessionMaxTurns ?? 10) + 5,
        };
      }

      // Magic Fertilizer — set 3 fill charges
      if (id === "magic_fertilizer") {
        const count = state.tools?.[id] ?? 0;
        if (count <= 0) return state;
        return {
          ...state,
          tools: { ...state.tools, [id]: count - 1 },
          magicFertilizerCharges: 3,
        };
      }

      // Magic Wand — collect every tile of a player-chosen type from the board.
      // Sets toolPending so GameScene can prompt the player to tap a tile type.
      // The tool is consumed immediately; inventory credit happens in GameScene
      // when it resolves the pending wand action.
      if (id === "magic_wand") {
        const count = state.tools?.[id] ?? 0;
        if (count <= 0) return state;
        return {
          ...state,
          tools: { ...state.tools, [id]: count - 1 },
          toolPending: "magic_wand",
        };
      }

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
