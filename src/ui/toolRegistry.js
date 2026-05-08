/**
 * Player-facing tool catalog for the on-board Tools panel.
 * Maps every tool key in state.tools to a UI definition.
 *
 * Categories:
 *   - "field"    starter tools the player begins each session with.
 *   - "workshop" crafted at the workshop bench (WORKSHOP_RECIPES).
 *   - "magic"    summoned at the portal (features/portal/data.js).
 *
 * Tool effects on the board come from the USE_TOOL reducer in state.js
 * and the corresponding GameScene tap handlers; this module is purely
 * the UI catalog.
 */

// `armed: "tap"` means using the tool only sets state.toolPending and
// the player must then tap a tile on the board for the tool to resolve.
// `armed: "instant"` means the tool resolves immediately.
// `armed: "passive"` means it sets a flag that resolves on a later event.
//
// `iconKey` references a key in the canvas iconRegistry (src/textures/...).
// `icon` is an emoji fallback for tools whose registry icon is missing.
export const TOOL_CATALOG = [
  // ── Field (starter) ──────────────────────────────────────────────────────
  { key: "clear",    category: "field",    iconKey: "player_clear",   name: "Scythe",         armed: "instant",
    desc: "Clears six random tiles and harvests their basic resources." },
  { key: "basic",    category: "field",    iconKey: "player_basic",   name: "Seedpack",       armed: "instant",
    desc: "Plants five fresh basic-resource tiles in random spots on the board." },
  { key: "rare",     category: "field",    iconKey: "player_rare",    name: "Lockbox",        armed: "instant",
    desc: "Drops three rare-resource tiles onto the board." },
  { key: "shuffle",  category: "field",    iconKey: "player_shuffle", name: "Reshuffle Horn", armed: "instant",
    desc: "Reshuffles every tile on the board for a fresh layout." },
  { key: "bomb",     category: "field",    iconKey: "dynamite",       name: "Bomb",           armed: "tap",
    desc: "Tap a tile — destroys a 3×3 area around it." },

  // ── Workshop (crafted) ──────────────────────────────────────────────────
  { key: "rake",        category: "workshop", iconKey: "rake",          name: "Rake",         armed: "tap",
    desc: "Tap a hay tile — sweeps every connected hay tile and collects them." },
  { key: "axe",         category: "workshop", iconKey: "axe",           name: "Axe",          armed: "tap",
    desc: "Tap a tile — fells the entire row, harvesting every tile in it." },
  { key: "fertilizer",  category: "workshop", iconKey: "fertilizer",    name: "Fertilizer",   armed: "passive",
    desc: "Biases the next board fill toward grain tiles." },
  { key: "cat",         category: "workshop", iconKey: "cat",           name: "Cat",          armed: "instant",
    desc: "Dispatches a mouser to clear every rat hazard from the farm." },
  { key: "bird_cage",   category: "workshop", iconKey: "bird_cage",     name: "Bird Cage",    armed: "instant",
    desc: "Sweeps every egg tile from the board into your inventory." },
  { key: "scythe_full", category: "workshop", iconKey: "scythe",        name: "Scythe (full)", armed: "instant",
    desc: "Harvests every grain tile on the board in one swing." },
  { key: "rifle",       category: "workshop", iconKey: "rifle",         name: "Rifle",        armed: "instant",
    desc: "Drives off all active wolves immediately." },
  { key: "hound",       category: "workshop", iconKey: "hound",         name: "Hound",        armed: "instant",
    desc: "Scares the wolves for five turns so you can clear their target tiles." },
  { key: "water_pump",  category: "workshop", iconKey: "shovel",        name: "Water Pump",   armed: "instant",
    desc: "Floods all lava cells, converting them to stone rubble." },
  { key: "explosives",  category: "workshop", iconKey: "dynamite",      name: "Explosives",   armed: "instant",
    desc: "Clears every cave-in and mole hazard from the mine." },

  // ── Magic Portal ────────────────────────────────────────────────────────
  { key: "magic_wand",       category: "magic", iconKey: "wand",      name: "Magic Wand",       armed: "tap",
    desc: "Tap a tile type — sweeps every tile of that type from the board." },
  { key: "hourglass",        category: "magic", iconKey: "hourglass", name: "Hourglass",        armed: "instant",
    desc: "Restores the board, inventory, and turns to the moment before your last chain." },
  { key: "magic_seed",       category: "magic", iconKey: "potion",    name: "Magic Seed",       armed: "instant",
    desc: "Adds five turns to the current session." },
  { key: "magic_fertilizer", category: "magic", iconKey: "scroll",    name: "Magic Fertilizer", armed: "passive",
    desc: "The next three board fills spawn grain in every cell." },
];

export const TOOL_BY_KEY = Object.fromEntries(TOOL_CATALOG.map((t) => [t.key, t]));

export const TOOL_CATEGORIES = [
  { key: "field",    label: "Field"    },
  { key: "workshop", label: "Workshop" },
  { key: "magic",    label: "Portal"   },
];

/**
 * Picks the on-canvas event name for a tool. Tools whose `armed === "tap"`
 * leave the board waiting for the player to point at a target — the UI uses
 * this to show an "armed" banner over the board.
 */
export function isTapTargetTool(key) {
  return TOOL_BY_KEY[key]?.armed === "tap";
}

/**
 * Build the visible tool list for the panel.
 * Always shows a tool if owned (count > 0). Field tools are always listed,
 * so players see what they can earn even when their stock is empty.
 */
export function visibleTools(toolsState = {}) {
  return TOOL_CATALOG.filter((t) => {
    const count = toolsState[t.key] || 0;
    if (count > 0) return true;
    return t.category === "field";
  });
}
