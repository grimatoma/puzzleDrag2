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
  { id: "tool_scythe",   category: "tool",    tool: "scythe",   label: "Use the Scythe {n} times",
    targetMin: 2, targetMax: 5,  coinBase: 30, coinPerUnit: 10 },
  { id: "tool_seedpack", category: "tool",    tool: "seedpack", label: "Use the Seedpack {n} times",
    targetMin: 2, targetMax: 4,  coinBase: 30, coinPerUnit: 15 },
  { id: "tool_lockbox",  category: "tool",    tool: "lockbox",  label: "Use the Lockbox {n} times",
    targetMin: 1, targetMax: 3,  coinBase: 30, coinPerUnit: 20 },
  // ── chain-length ────────────────────────────────────────────────────────────
  { id: "chain_8",       category: "chain",   minLength: 8,     label: "Make a chain of 8+",
    targetMin: 1, targetMax: 3,  coinBase: 50, coinPerUnit: 25 },
  { id: "chain_12",      category: "chain",   minLength: 12,    label: "Make a chain of 12+",
    targetMin: 1, targetMax: 2,  coinBase: 80, coinPerUnit: 40 },
];
