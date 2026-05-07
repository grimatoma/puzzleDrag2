import { MARKET_PRICES } from "./constants.js";

// Deterministic 32-bit hash → [0, 1)
function rand(seed, season, salt) {
  let x = (seed ^ (season * 73856093) ^ (salt * 19349663)) >>> 0;
  x = (x ^ (x >>> 16)) * 0x85ebca6b >>> 0;
  x = (x ^ (x >>> 13)) * 0xc2b2ae35 >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function driftPrices(seed, season) {
  const out = {};
  let salt = 0;
  for (const [k, base] of Object.entries(MARKET_PRICES)) {
    const buyMul  = 0.85 + rand(seed, season, salt++) * 0.30; // [0.85, 1.15)
    const sellMul = 0.85 + rand(seed, season, salt++) * 0.30;
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
