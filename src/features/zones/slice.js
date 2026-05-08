// Zone slice — state is now derived from the cartography system.
// activeZone mirrors mapCurrent (set on CARTO/TRAVEL in cartography/slice.js).
// ZONE/SELECT and ZONE/UNLOCK are no longer needed; travel via CARTO/TRAVEL.
import { ZONES, ZONE_IDS, DEFAULT_ZONE } from "./data.js";

export const initial = {};

export function reduce(state, action) {
  return state;
}

export { ZONES, ZONE_IDS, DEFAULT_ZONE };
