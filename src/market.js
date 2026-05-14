import { MARKET_PRICES } from "./constants.js";

export const MARKET_EVENTS = [
  { id: "wood_shortage", label: "Wood Shortage", desc: "Timber supplies are low. Logs and Planks are worth double!", mults: { wood_log: 2, wood_plank: 2 } },
  { id: "bumper_crop",   label: "Bumper Crop",   desc: "The fields are overflowing. Hay and Wheat prices have crashed.", mults: { grass_hay: 0.5, grain_wheat: 0.5 } },
  { id: "iron_rush",     label: "Iron Rush",     desc: "The King's army is buying iron. Ingot prices are soaring!", mults: { mine_iron: 2.5 } },
  { id: "gem_fever",     label: "Gem Fever",     desc: "A rich merchant is in town. Gems are trading at a premium.", mults: { mine_gem: 1.8 } },
];

// Deterministic 32-bit hash → [0, 1)
function rand(seed, season, salt) {
  let x = (seed ^ (season * 73856093) ^ (salt * 19349663)) >>> 0;
  x = (x ^ (x >>> 16)) * 0x85ebca6b >>> 0;
  x = (x ^ (x >>> 13)) * 0xc2b2ae35 >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function pickMarketEvent(seed, season) {
  // 40% chance of an event each season
  const roll = rand(seed, season, 999);
  if (roll > 0.40) return null;
  const idx = Math.floor(rand(seed, season, 888) * MARKET_EVENTS.length);
  return MARKET_EVENTS[idx];
}

export function driftPrices(seed, season, event = null) {
  const out = {};
  let salt = 0;
  for (const [k, base] of Object.entries(MARKET_PRICES)) {
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

export function applyTrade(state, action) {
  const { key, qty } = action.payload;
  const p = state.market.prices[key];
  if (!p) return state;
  if (action.type === "BUY_RESOURCE") {
    const cost = p.buy * qty;
    if (state.coins < cost) return state;
    return {
      ...state,
      coins: state.coins - cost,
      inventory: { ...state.inventory, [key]: (state.inventory[key] ?? 0) + qty },
    };
  }
  if (action.type === "SELL_RESOURCE") {
    const owned = state.inventory[key] ?? 0;
    if (owned < qty) return state;
    return {
      ...state,
      coins: state.coins + p.sell * qty,
      inventory: { ...state.inventory, [key]: owned - qty },
    };
  }
  return state;
}

// Pure board helper: returns all [col, row] positions in a 3×3 area centred at (cx, cy),
// clamped to the board dimensions (cols×rows). Used by Phaser Bomb tool.
export function bombFootprint(cx, cy, cols, rows) {
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < cols && y >= 0 && y < rows) out.push([x, y]);
    }
  }
  return out;
}
