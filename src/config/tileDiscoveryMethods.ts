// Tile Discovery Methods catalog — the single source of truth for every
// way a tile can become "discovered" / available to the player.
//
// Each entry declares:
//   - id     — stable string used by tile data (`discovery.method`)
//   - name   — human-readable name shown in the Dev Panel
//   - desc   — short description of the discovery condition
//   - params — schema for the editor + per-tile arguments (may be empty)
//
// Mirrors src/config/toolPowers.js / src/config/abilities.js. To add a new
// discovery method:
//   1. Add an entry below.
//   2. Wire the runtime — grep for `discovery.method` and handle the new id
//      everywhere it's read. Today that's three files:
//        - src/features/tileCollection/effects.js (chain trigger, status
//          + detail labels)
//        - src/state.js (research accumulator, BUY_TILE reducer)
//        - src/state/helpers.js (initial tile-collection slice)
//   3. The Wiki, Tile Discovery Methods reference tab, and Tiles editor
//      pick it up automatically.

export const TILE_DISCOVERY_PARAM_TYPES = Object.freeze({
  INT: "int",
  // Accepts both tile and resource keys today — PowersTab's source picker
  // iterates BIOMES[*].resources, which contains both kinds. Matches existing
  // behavior; do not introduce a separate "tileKey" type here.
  RESOURCE_KEY: "resourceKey",
});

export const TILE_DISCOVERY_METHODS = Object.freeze([
  {
    id: "default",
    name: "Default",
    desc: "Always available. No unlock condition.",
    params: [],
  },
  {
    id: "chain",
    name: "Chain",
    desc: "Unlocks when the player completes a chain of N of the source resource.",
    params: [
      { key: "chainLengthOf", label: "Source resource", type: "resourceKey" },
      { key: "chainLength",   label: "Required chain length", type: "int", default: 6, min: 1, max: 50 },
    ],
  },
  {
    id: "research",
    name: "Research",
    desc: "Unlocks once cumulative chain progress of the source resource reaches N.",
    params: [
      { key: "researchOf",     label: "Source resource", type: "resourceKey" },
      { key: "researchAmount", label: "Cumulative chain target", type: "int", default: 30, min: 1, max: 500 },
    ],
  },
  {
    id: "buy",
    name: "Buy",
    desc: "Unlocks by spending coins.",
    params: [
      { key: "coinCost", label: "Coin cost", type: "int", default: 100, min: 0, max: 99999 },
    ],
  },
  {
    id: "daily",
    name: "Daily Reward",
    desc: "Granted as a daily login reward on a specific day of the 30-day track.",
    params: [
      { key: "day", label: "Day", type: "int", default: 1, min: 1, max: 30 },
    ],
  },
]);

export const TILE_DISCOVERY_METHOD_BY_ID = Object.freeze(
  Object.fromEntries(TILE_DISCOVERY_METHODS.map((m) => [m.id, m])),
);

export function getTileDiscoveryMethod(id: any) {
  return (TILE_DISCOVERY_METHOD_BY_ID as any)[id] ?? null;
}

export function defaultsForTileDiscoveryMethod(id: any) {
  const m = (TILE_DISCOVERY_METHOD_BY_ID as any)[id];
  if (!m) return {};
  const out: any = {};
  for (const p of (m as any).params) (out as any)[p.key] = (p as any).default ?? "";
  return out;
}
