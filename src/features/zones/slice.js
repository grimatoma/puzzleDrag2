import { ZONES, ZONE_IDS, DEFAULT_ZONE } from "./data.js";

export const initial = {
  activeZone: DEFAULT_ZONE,
  unlockedZones: [DEFAULT_ZONE],
};

export function reduce(state, action) {
  switch (action.type) {
    case "ZONE/SELECT": {
      const id = action.payload?.id;
      if (!id || !ZONES[id]) return state;
      const unlocked = state.unlockedZones ?? [DEFAULT_ZONE];
      if (!unlocked.includes(id)) return state;
      if (state.activeZone === id) return state;
      return { ...state, activeZone: id };
    }
    case "ZONE/UNLOCK": {
      const id = action.payload?.id;
      if (!id || !ZONES[id]) return state;
      const unlocked = state.unlockedZones ?? [DEFAULT_ZONE];
      if (unlocked.includes(id)) return state;
      return { ...state, unlockedZones: [...unlocked, id] };
    }
    default:
      return state;
  }
}

export { ZONES, ZONE_IDS, DEFAULT_ZONE };
