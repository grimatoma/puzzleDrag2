/**
 * Quest template pool for Phase 7.1.
 * 5 categories × multiple keys/items = ≥12 templates.
 * Each template: { id, category, key?, item?, tool?, minLength?,
 *                  label, targetMin, targetMax, coinBase, coinPerUnit }
 */
export const QUEST_TEMPLATES = [
  // ── collect-resource ────────────────────────────────────────────────────────
  { id: "collect_hay",   category: "collect", key: "grass_hay",   label: "Collect {n} hay",
    targetMin: 20, targetMax: 50, coinBase: 30, coinPerUnit: 1 },
  { id: "collect_wheat", category: "collect", key: "grain_wheat", label: "Collect {n} wheat",
    targetMin: 8,  targetMax: 20, coinBase: 40, coinPerUnit: 2 },
  { id: "collect_log",   category: "collect", key: "wood_log",   label: "Collect {n} logs",
    targetMin: 8,  targetMax: 18, coinBase: 30, coinPerUnit: 2 },
  { id: "collect_berry", category: "collect", key: "berry", label: "Collect {n} berries",
    targetMin: 6,  targetMax: 14, coinBase: 30, coinPerUnit: 3 },
  { id: "collect_grain", category: "collect", key: "grain", label: "Collect {n} grain",
    targetMin: 4,  targetMax: 10, coinBase: 50, coinPerUnit: 4 },
  // ── craft-item ──────────────────────────────────────────────────────────────
  { id: "craft_bread",   category: "craft",   item: "bread",   label: "Bake {n} bread",
    targetMin: 2, targetMax: 5,  coinBase: 50, coinPerUnit: 15 },
  { id: "craft_jam",     category: "craft",   item: "berry_jam",     label: "Cook {n} jam",
    targetMin: 2, targetMax: 4,  coinBase: 50, coinPerUnit: 20 },
  { id: "craft_plank",   category: "craft",   item: "wood_plank",   label: "Mill {n} planks",
    targetMin: 3, targetMax: 8,  coinBase: 40, coinPerUnit: 10 },
  // ── fulfil-orders ───────────────────────────────────────────────────────────
  { id: "orders_any",    category: "order",                    label: "Deliver {n} orders",
    targetMin: 3, targetMax: 6,  coinBase: 60, coinPerUnit: 15 },
  // ── use-tool ────────────────────────────────────────────────────────────────
  { id: "tool_scythe",   category: "tool",    tool: "clear",    label: "Use the Scythe {n} times",
    targetMin: 2, targetMax: 5,  coinBase: 30, coinPerUnit: 10 },
  { id: "tool_seedpack", category: "tool",    tool: "basic",    label: "Use the Seedpack {n} times",
    targetMin: 2, targetMax: 4,  coinBase: 30, coinPerUnit: 15 },
  { id: "tool_lockbox",  category: "tool",    tool: "rare",     label: "Use the Lockbox {n} times",
    targetMin: 1, targetMax: 3,  coinBase: 30, coinPerUnit: 20 },
  // ── chain-length ────────────────────────────────────────────────────────────
  { id: "chain_8",       category: "chain",   minLength: 8,     label: "Make a chain of 8+",
    targetMin: 1, targetMax: 3,  coinBase: 50, coinPerUnit: 25 },
  { id: "chain_12",      category: "chain",   minLength: 12,    label: "Make a chain of 12+",
    targetMin: 1, targetMax: 2,  coinBase: 80, coinPerUnit: 40 },
  // ── fish-biome collect templates ────────────────────────────────────────────
  // Coin bases echo the farm collect-quests; targets sized for the harbor pool.
  { id: "collect_sardine",  category: "collect", key: "fish_sardine",  label: "Collect {n} sardines",
    targetMin: 12, targetMax: 30, coinBase: 35, coinPerUnit: 2 },
  { id: "collect_mackerel", category: "collect", key: "fish_mackerel", label: "Collect {n} mackerel",
    targetMin: 8,  targetMax: 20, coinBase: 40, coinPerUnit: 3 },
  { id: "collect_clam",     category: "collect", key: "fish_clam",     label: "Gather {n} clams",
    targetMin: 6,  targetMax: 14, coinBase: 40, coinPerUnit: 4 },
  { id: "collect_kelp",     category: "collect", key: "fish_kelp",     label: "Cut {n} kelp",
    targetMin: 10, targetMax: 22, coinBase: 30, coinPerUnit: 2 },
  // ── fish-biome craft templates ──────────────────────────────────────────────
  { id: "craft_chowder",    category: "craft",   item: "chowder",      label: "Cook {n} chowder",
    targetMin: 1, targetMax: 3, coinBase: 80, coinPerUnit: 40 },
  { id: "craft_fish_oil",   category: "craft",   item: "fish_oil_bottled", label: "Bottle {n} fish oil",
    targetMin: 2, targetMax: 5, coinBase: 50, coinPerUnit: 25 },
  // ── mine-biome collect templates ────────────────────────────────────────────
  { id: "collect_stone",  category: "collect", key: "mine_stone",  label: "Quarry {n} stone",
    targetMin: 12, targetMax: 30, coinBase: 35, coinPerUnit: 2 },
  { id: "collect_ore",    category: "collect", key: "mine_ore",    label: "Mine {n} ore",
    targetMin: 8,  targetMax: 20, coinBase: 45, coinPerUnit: 3 },
  { id: "collect_coal",   category: "collect", key: "mine_coal",   label: "Haul {n} coal",
    targetMin: 8,  targetMax: 18, coinBase: 40, coinPerUnit: 3 },
  { id: "collect_gem",    category: "collect", key: "mine_gem",    label: "Find {n} gems",
    targetMin: 4,  targetMax: 10, coinBase: 60, coinPerUnit: 6 },
  { id: "collect_dirt",   category: "collect", key: "mine_dirt",   label: "Shovel {n} dirt",
    targetMin: 12, targetMax: 30, coinBase: 25, coinPerUnit: 1 },
  // ── mine-biome craft templates ──────────────────────────────────────────────
  { id: "craft_lantern",  category: "craft",   item: "lantern",    label: "Forge {n} lanterns",
    targetMin: 1, targetMax: 3, coinBase: 50, coinPerUnit: 25 },
  { id: "craft_goldring", category: "craft",   item: "goldring",   label: "Forge {n} gold rings",
    targetMin: 1, targetMax: 2, coinBase: 80, coinPerUnit: 50 },
  { id: "craft_cobblepath", category: "craft", item: "cobblepath", label: "Lay {n} cobble paths",
    targetMin: 1, targetMax: 3, coinBase: 60, coinPerUnit: 30 },
];
