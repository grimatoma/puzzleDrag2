import { MARKET_PRICES } from "./constants.js";
import { inventoryPut, inventoryQty } from "./types/inventory.js";
import { zoneInventory } from "./state/zoneInventory.js";
import type { GameState, Action } from "./types/state.js";

export interface MarketEvent {
  id: string;
  label: string;
  desc: string;
  mults: Record<string, number>;
}

export const MARKET_EVENTS: MarketEvent[] = [
  { id: "wood_shortage", label: "Wood Shortage", desc: "Timber supplies are low. Logs and Planks are worth double!", mults: { tile_tree_oak: 2, plank: 2 } },
  { id: "bumper_crop",   label: "Bumper Crop",   desc: "The fields are overflowing. Hay and Wheat prices have crashed.", mults: { tile_grass_grass: 0.5, tile_grain_wheat: 0.5 } },
  { id: "iron_rush",     label: "Iron Rush",     desc: "The King's army is buying iron. Ingot prices are soaring!", mults: { tile_mine_iron_ore: 2.5 } },
  { id: "gem_fever",     label: "Gem Fever",     desc: "A rich merchant is in town. Gems are trading at a premium.", mults: { tile_mine_gem: 1.8 } },
];

// Deterministic 32-bit hash → [0, 1)
function rand(seed: number, season: number, salt: number): number {
  let x = (seed ^ (season * 73856093) ^ (salt * 19349663)) >>> 0;
  x = (x ^ (x >>> 16)) * 0x85ebca6b >>> 0;
  x = (x ^ (x >>> 13)) * 0xc2b2ae35 >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function pickMarketEvent(seed: number, season: number): MarketEvent | null {
  // 40% chance of an event each season
  const roll = rand(seed, season, 999);
  if (roll > 0.40) return null;
  const idx = Math.floor(rand(seed, season, 888) * MARKET_EVENTS.length);
  return MARKET_EVENTS[idx];
}

export interface MarketPrice { buy: number; sell: number }

export function driftPrices(
  seed: number,
  season: number,
  event: MarketEvent | null = null,
): Record<string, MarketPrice> {
  const out: Record<string, MarketPrice> = {};
  let salt = 0;
  const prices = MARKET_PRICES as Record<string, MarketPrice>;
  for (const [k, base] of Object.entries(prices)) {
    let buyMul  = 0.85 + rand(seed, season, salt++) * 0.30; // [0.85, 1.15)
    let sellMul = 0.85 + rand(seed, season, salt++) * 0.30;

    // Apply economic event multipliers
    if (event && event.mults && event.mults[k]) {
      buyMul *= event.mults[k];
      sellMul *= event.mults[k];
    }

    out[k] = {
      buy:  Math.max(1, Math.round(base.buy  * buyMul)),
      sell: Math.max(0, Math.round(base.sell * sellMul)),
    };
  }
  return out;
}

export function applyTrade(state: GameState, action: Action): GameState {
  if (action.type !== "BUY_RESOURCE" && action.type !== "SELL_RESOURCE") return state;
  const payload = action.payload;
  const { key, qty } = payload;
  const p = state.market.prices[key];
  if (!p) return state;
  const tradeZone = (state.mapCurrent as string | undefined) ?? "home";
  const tradeInv = zoneInventory(state, tradeZone);
  if (action.type === "BUY_RESOURCE") {
    const cost = p.buy * qty;
    if (state.coins < cost) return state;
    const nextInv = inventoryPut({ ...tradeInv }, key, inventoryQty(tradeInv, key) + qty);
    return {
      ...state,
      coins: state.coins - cost,
      inventory: { ...state.inventory, [tradeZone]: nextInv },
    };
  }
  if (action.type === "SELL_RESOURCE") {
    const owned = inventoryQty(tradeInv, key);
    if (owned < qty) return state;
    const nextInv = inventoryPut({ ...tradeInv }, key, owned - qty);
    return {
      ...state,
      coins: state.coins + p.sell * qty,
      inventory: { ...state.inventory, [tradeZone]: nextInv },
    };
  }
  return state;
}

// Pure board helper: returns all [col, row] positions in a 3×3 area centred at (cx, cy),
// clamped to the board dimensions (cols×rows). Used by Phaser Bomb tool.
export function bombFootprint(cx: number, cy: number, cols: number, rows: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < cols && y >= 0 && y < rows) out.push([x, y]);
    }
  }
  return out;
}
