// Tool Powers catalog — the single source of truth for every active effect
// that a tool item can trigger when the player spends it.
//
// Each entry declares:
//   - id     — stable string used by items data (matches the `effect` field on tool items)
//   - name   — human-readable name shown in the Dev Panel
//   - desc   — short description of the effect
//   - params           — schema for the editor + runtime arguments (may be empty)
//   - note             — optional caveat surfaced in the Wiki (e.g. extras vs PC2)
//   - defaultBoardAnim — suggested anim + ms when a tool uses this power (tools may override in ITEMS)
//
// Per-tool anim/ms on constants.js (Inventory tab) override these defaults.
//
// Contrast with Attributes (src/config/abilities.js) which are *passive* modifiers
// always active while their source is present. Tool Powers are *active* — the player
// deliberately spends the tool item to trigger the effect.

export const TOOL_POWER_PARAM_TYPES = Object.freeze({
  HAZARD: "hazard",
  RESOURCE_KEY: "resourceKey",
  TILE_KEY: "tileKey",
  TILE_CATEGORY: "tileCategory",
  NUMBER: "number",
});

export const TOOL_POWERS = Object.freeze([
  {
    id: "clear_all",
    name: "Clear Tiles of Type",
    desc: "Sweeps every board tile of the chosen type into inventory. Set target to * to clear all tile types.",
    params: [{ key: "target", label: "Tile type", type: "tileKey" }],
    isTapTarget: false,
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 300 }),
  },
  {
    id: "clear_category",
    name: "Clear Category",
    desc: "Sweep all tiles whose family matches the target category. Accepts a single category or an array.",
    params: [{ key: "target", label: "Target category", type: "tileCategory" }],
    isTapTarget: false,
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 300 }),
  },
  {
    id: "clear_row",
    name: "Clear Row",
    desc: "Tap-target: clear every tile in the row(s) containing the tapped cell.",
    params: [{ key: "rowSpan", label: "Row span", type: "number", default: 1 }],
    isTapTarget: true,
    dimStrategy: "none",
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 220 }),
  },
  {
    id: "clear_column",
    name: "Clear Column",
    desc: "Tap-target: clear every tile in the column(s) containing the tapped cell.",
    params: [{ key: "colSpan", label: "Column span", type: "number", default: 1 }],
    isTapTarget: true,
    dimStrategy: "none",
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 220 }),
  },
  {
    id: "clear_cross",
    name: "Clear Cross",
    desc: "Tap-target: clear the row and column through the tapped cell (plus shape).",
    params: [],
    isTapTarget: true,
    dimStrategy: "none",
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 220 }),
  },
  {
    id: "clear_component",
    name: "Clear Connected Component",
    desc: "Tap-target: 4-connected flood of tiles matching the tapped cell's key.",
    params: [{ key: "matchKey", label: "Match tapped key", type: "number", default: 1 }],
    isTapTarget: true,
    dimStrategy: "flood_neighbor",
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 220 }),
  },
  {
    id: "clear_random_n",
    name: "Clear Random Tiles",
    desc: "Remove N random non-selected tiles from the board.",
    params: [{ key: "count", label: "Tile count", type: "number", default: 6 }],
    isTapTarget: false,
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 240 }),
  },
  {
    id: "transform_random_n",
    name: "Transform Random Tiles",
    desc: "Replace N random tiles with a target key (supports biome_base / biome_rare).",
    params: [
      { key: "count", label: "Tile count", type: "number", default: 5 },
      { key: "to", label: "To tile", type: "tileKey" },
    ],
    isTapTarget: false,
    defaultBoardAnim: Object.freeze({ anim: "popIn", ms: 220 }),
  },
  {
    id: "reshuffle_board",
    name: "Reshuffle Board",
    desc: "Shuffle every tile on the board for a fresh layout.",
    params: [],
    isTapTarget: false,
    defaultBoardAnim: Object.freeze({ anim: "shimmer", ms: 200 }),
  },
  {
    id: "arm_fill_bias",
    name: "Arm Fill Bias",
    desc: "Biases the next board fill toward the target tile key for N fills.",
    params: [
      { key: "target", label: "Target Tile", type: "tileKey" },
      { key: "turns", label: "Fills biased", type: "number", default: 1 },
    ],
    isTapTarget: false,
    dimStrategy: "none",
    defaultBoardAnim: Object.freeze({ anim: "shimmer", ms: 600 }),
  },
  {
    id: "fill_bias",
    name: "Fill Bias",
    desc: "Biases the next board fill toward the target resource.",
    params: [{ key: "target", label: "Target Tile", type: "tileKey" }],
    isTapTarget: false,
    note: "Extra (vs PC2). Biases the NEXT board fill toward target. PC2 equivalents (Sapling, Bird Feed) mutate existing tiles — see transform_tiles.",
    defaultBoardAnim: Object.freeze({ anim: "shimmer", ms: 600 }),
  },
  {
    id: "transform_tiles",
    name: "Transform Tiles",
    desc: "Mutate every existing board tile matching `from` into `to`.",
    params: [
      { key: "from", label: "From", type: "tileCategory" },
      { key: "to", label: "To tile", type: "tileKey" },
    ],
    isTapTarget: false,
    defaultBoardAnim: Object.freeze({ anim: "shimmer", ms: 400 }),
  },
  {
    id: "transform_adjacent",
    name: "Transform Adjacent",
    desc: "Tap-target: mutate matching tiles within `radius` of the tapped cell.",
    params: [
      { key: "from", label: "From", type: "tileCategory" },
      { key: "to", label: "To tile", type: "tileKey" },
      { key: "radius", label: "Radius", type: "number", default: 1 },
    ],
    isTapTarget: true,
    dimStrategy: "none",
    defaultBoardAnim: Object.freeze({ anim: "shimmer", ms: 320 }),
  },
  {
    id: "area_blast",
    name: "Area Blast",
    desc: "Tap-target: clear every tile within `radius` of the tapped cell.",
    params: [{ key: "radius", label: "Radius", type: "number", default: 1 }],
    isTapTarget: true,
    dimStrategy: "none",
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 300 }),
  },
  {
    id: "tap_clear_type",
    name: "Tap Clear Type",
    desc: "Tap-target: sweep every tile whose key matches the tapped cell.",
    params: [],
    isTapTarget: true,
    dimStrategy: "type_multi",
    note: "Backs Magic Wand and Rune Wildcard.",
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 300 }),
  },
  {
    id: "undo_move",
    name: "Undo Move",
    desc: "Restore the board snapshot from before the last chain collection.",
    params: [],
    isTapTarget: false,
    note: "Backs Hourglass.",
  },
  {
    id: "restore_turns",
    name: "Restore Turns",
    desc: "Add N turns to the current session budget.",
    params: [{ key: "amount", label: "Turns added", type: "number", default: 5 }],
    isTapTarget: false,
    note: "Backs Magic Seed (this repo's existing turn-restore semantic; PC2's 'grow crops' Magic Seed is deferred — see DEFERRED_TOOL_POWERS).",
  },
  {
    id: "reveal_tiles",
    name: "Reveal Tiles",
    desc: "Flip matching hidden cells to revealed. No visual effect until hidden tiles are spawned (deferred).",
    params: [{ key: "target", label: "Target category", type: "tileCategory" }],
    isTapTarget: false,
    note: "Backs Miner's Hat; no-op until hidden-tile spawn ships.",
  },
  {
    id: "clear_hazard",
    name: "Clear Hazard",
    desc: "Clears all active instances of a hazard from the board.",
    params: [{ key: "target", label: "Hazard", type: "hazard" }],
    isTapTarget: false,
    defaultBoardAnim: Object.freeze({ anim: "scatter", ms: 200 }),
  },
  {
    id: "scatter_hazard",
    name: "Scatter Hazard",
    desc: "Scares a hazard away for 5 turns.",
    params: [{ key: "target", label: "Hazard", type: "hazard" }],
    isTapTarget: false,
    note: "Extra (vs PC2). Timed scare (5 turns). PC2 'Hound' is a straight clearer; we keep both scatter (hound) and clear (rifle/terrier).",
    defaultBoardAnim: Object.freeze({ anim: "bark", ms: 400 }),
  },
  {
    id: "water_pump",
    name: "Water Pump",
    desc: "Converts every lava cell on the mine board to stone rubble.",
    params: [],
    isTapTarget: false,
    note: "Extra (vs PC2). Converts lava to rubble — Wiki should render as 'Lava Damper'. PC2 Water Pump collects water tiles; that semantic is deferred (no water tile family).",
  },
  {
    id: "explosives",
    name: "Explosives",
    desc: "Clears mole + cave-in hazards from the mine.",
    params: [],
    isTapTarget: false,
    defaultBoardAnim: Object.freeze({ anim: "sweep", ms: 300 }),
  },
]);

const TOOL_POWER_BY_ID = Object.freeze(
  Object.fromEntries(TOOL_POWERS.map((p) => [p.id, p])),
);

type ToolPowerEntry = (typeof TOOL_POWERS)[number];

export function getToolPower(id: string): ToolPowerEntry | null {
  return (TOOL_POWER_BY_ID as Record<string, ToolPowerEntry | undefined>)[id] ?? null;
}

export function isTapTargetPower(powerId: string): boolean {
  return !!(TOOL_POWER_BY_ID as Record<string, ToolPowerEntry | undefined>)[powerId]?.isTapTarget;
}

export function dimStrategyForPower(powerId: string): string {
  const entry = (TOOL_POWER_BY_ID as Record<string, ToolPowerEntry | undefined>)[powerId];
  return (entry && "dimStrategy" in entry ? (entry.dimStrategy as string | undefined) : undefined) ?? "none";
}

/** Default board anim/ms for a power id, or null when the power has no board tween. */
export function defaultBoardAnimForPower(powerId: string): { anim: string; ms: number } | null {
  const entry = (TOOL_POWER_BY_ID as Record<string, ToolPowerEntry | undefined>)[powerId];
  return (entry?.defaultBoardAnim as { anim: string; ms: number } | undefined) ?? null;
}

/** Default param object for a tool power id (includes anim/ms when the catalog defines them). */
export function defaultsForToolPower(powerId: string): Record<string, unknown> {
  const p = TOOL_POWER_BY_ID[powerId];
  if (!p) return {};
  const out: Record<string, unknown> = {};
  const boardAnim = p.defaultBoardAnim;
  if (boardAnim) {
    if (boardAnim.anim) out.anim = boardAnim.anim;
    if (boardAnim.ms != null) out.ms = boardAnim.ms;
  }
  const params = p.params as ReadonlyArray<{ key: string; type: string; default?: unknown }>;
  for (const param of params) {
    if (param.default !== undefined) {
      out[param.key] = param.default;
    } else if (param.type === "tileCategory") {
      // "no category picked" is semantically distinct from "" — ItemsTab
      // treats null as the unset sentinel for category dropdowns.
      out[param.key] = null;
    } else if (param.type === "number") {
      out[param.key] = 0;
    } else {
      // tileKey, resourceKey, hazard — preserve the pre-overhaul "" default so
      // ItemsTab's cleanup pass (which strips falsy/empty targets) still works.
      out[param.key] = "";
    }
  }
  return out;
}

// Puzzle Craft 2 tools we did NOT wire in this overhaul, plus the reason and
// the dependency that unblocks each. The Balance Manager Wiki renders this
// list so designers can see exactly what's missing without grepping docs.
//
// Each entry: { id, pc2Name, intendedPower, blocker, dependsOn }.
export const DEFERRED_TOOL_POWERS = Object.freeze([
  // General / treasure — the chest pipeline doesn't exist yet.
  {
    id: "spawn_chest",
    pc2Name: "Maps (Common→Mythic)",
    intendedPower: "spawn_chest / rarity",
    blocker: "No chest tile family — spawning a chest with no open action is dead weight.",
    dependsOn: "chest tile family + open action",
  },
  {
    id: "open_chest",
    pc2Name: "Keys (Common→Mythic)",
    intendedPower: "open_chest / rarity",
    blocker: "No chest tile family to open.",
    dependsOn: "chest tile family + reward table",
  },
  {
    id: "reveal_chest",
    pc2Name: "Spyglasses (Common→Mythic)",
    intendedPower: "reveal_chest",
    blocker: "Sea-board specific; needs chest system AND sea hazards.",
    dependsOn: "chest system + sea hazards",
  },

  // Mine — silver / diamond / gas / water tile families don't exist.
  {
    id: "silver_pick",
    pc2Name: "Silver Pick",
    intendedPower: "clear_category / silver",
    blocker: "No tile_mine_silver_* family in TILE_FAMILY_RESOURCE.",
    dependsOn: "new mine tile family",
  },
  {
    id: "diamond_hammer",
    pc2Name: "Diamond Hammer",
    intendedPower: "clear_category / diamond",
    blocker: "No tile_mine_diamond_* family. We have `gem` (gem ≠ diamond — different progression slot).",
    dependsOn: "new mine tile family or `gem` rename",
  },
  {
    id: "lamp_flint",
    pc2Name: "Lamp / Flint",
    intendedPower: "clear_category / gas",
    blocker: "No tile_mine_gas_* family. Gas exists only as a hazard, not a tile.",
    dependsOn: "gas tile family",
  },
  {
    id: "water_pump_pc2",
    pc2Name: "Water Pump (PC2 semantic)",
    intendedPower: "clear_category / water",
    blocker: "No tile_mine_water_* family. Our existing `water_pump` is repurposed as 'Lava Damper' (lava→rubble).",
    dependsOn: "water tile family",
  },
  {
    id: "silver_transmuter",
    pc2Name: "Silver Transmuter",
    intendedPower: "transform_adjacent / stone+ore → silver",
    blocker: "Blocked on silver tile (same as Silver Pick).",
    dependsOn: "silver tile family",
  },
  {
    id: "coal_detector",
    pc2Name: "Coal Detector",
    intendedPower: "reveal_tiles / coal",
    blocker: "Power primitive ships, but no-op until hidden tiles spawn.",
    dependsOn: "hidden-tile spawn path",
  },
  {
    id: "silver_detector",
    pc2Name: "Silver Detector",
    intendedPower: "reveal_tiles / silver",
    blocker: "Hidden-tile spawn path + silver tile family.",
    dependsOn: "hidden-tile spawn + silver tile",
  },

  // Sea board — sea is mid-iteration; most sea tools are blocked on
  // missing tile families / hazards / a ship-movement model.
  {
    id: "fishing_net",
    pc2Name: "Fishing Net",
    intendedPower: "clear_category / fish",
    blocker: "Could ship now; deferred to keep this PR focused. Fish board is mid-iteration (tide+pearl just landed).",
    dependsOn: "follow-up sea pass",
  },
  {
    id: "squid_trap",
    pc2Name: "Squid Trap",
    intendedPower: "clear_category / squid",
    blocker: "No squid tile family in BIOMES.fish.",
    dependsOn: "tile_squid_*",
  },
  {
    id: "harpoon",
    pc2Name: "Harpoon",
    intendedPower: "clear_category / whale",
    blocker: "No whale tile family.",
    dependsOn: "tile_whale_*",
  },
  {
    id: "seagull",
    pc2Name: "Seagull",
    intendedPower: "clear_hazard / fog",
    blocker: "No fog hazard on fish board (only metadata, no runtime).",
    dependsOn: "fog hazard system",
  },
  {
    id: "barometer",
    pc2Name: "Barometer",
    intendedPower: "clear_hazard / storm",
    blocker: "No storm hazard on fish board.",
    dependsOn: "storm hazard system",
  },
  {
    id: "sea_navigation_tools",
    pc2Name: "Oar / Compass / Anchor / Buoy / Steering Wheel / Globe / Gold Sextant",
    intendedPower: "navigation",
    blocker: "No ship-movement model on the sea board.",
    dependsOn: "ship navigation system",
  },

  // Portal — Magic Flute / Rose-colored Glass / Stone Mirror force chains;
  // Magic Seed's PC2 "grow crops" semantic is parked behind our existing
  // `restore_turns` Magic Seed.
  {
    id: "magic_flute_force_chain",
    pc2Name: "Magic Flute / Rose-colored Glass / Stone Mirror",
    intendedPower: "force_chain",
    blocker: "No force-chain primitive in the chain engine — every chain today is player-driven. Needs new primitive + animation work.",
    dependsOn: "force_chain primitive + animator",
  },
  {
    id: "magic_seed_pc2_grow",
    pc2Name: "Magic Seed (PC2 grow-crops)",
    intendedPower: "transform_tiles / grass → grain",
    blocker: "Repo's existing `magic_seed` already occupies the id with `restore_turns / 5`. Splitting requires a new id and a UX decision.",
    dependsOn: "naming + UX call from designer",
  },
  // Mine — Iron Ration as a TOOL (restore turns on expedition) collides with
  // the existing `iron_ration` RESOURCE key. PC2's iron ration is a one-shot
  // "+5 turns" item; this repo already ships `magic_seed` (restore_turns /
  // 5) so the mechanic is covered, but a dedicated mid-tier non-magic Iron
  // Ration tool is still missing.
  {
    id: "iron_ration",
    pc2Name: "Iron Ration",
    intendedPower: "restore_turns / 5",
    blocker: "Key conflict — `iron_ration` already exists in ITEMS as kind:'resource' (calorie-dense expedition food). Adding kind:'tool' under the same key would violate the tile/resource/tool namespace invariant.",
    dependsOn: "key namespace migration (e.g. ship as `iron_ration_tool`) + procedural icon + workshop recipe",
  },
]);
