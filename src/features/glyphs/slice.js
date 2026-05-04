import { BIOMES } from '../../constants.js';
import { pickWeightedGlyph } from './data.js';

const PROC_CHANCE = 0.12;
const LOG_MAX = 5;

export const initial = {
  glyphsDiscovered: {},
  glyphsLog: [],
};

function getBiomeResourceKeys(biome) {
  const def = BIOMES[biome] || BIOMES.farm;
  return def.resources.map(r => r.key);
}

function pickRandom(arr, rand = Math.random) {
  return arr[Math.floor(rand() * arr.length)];
}

function applyGlyphEffect(state, glyph, gained, resourceKey) {
  let next = { ...state };
  const inv = { ...(next.inventory || {}) };

  switch (glyph.id) {
    case 'blessed': {
      // Double the gained amounts in inventory
      for (const [k, amt] of Object.entries(gained || {})) {
        if (typeof amt === 'number') {
          inv[k] = (inv[k] || 0) + amt;
        }
      }
      break;
    }
    case 'cursed': {
      // Remove half of gained from inventory (don't go negative)
      for (const [k, amt] of Object.entries(gained || {})) {
        if (typeof amt === 'number') {
          const remove = Math.floor(amt / 2);
          inv[k] = Math.max(0, (inv[k] || 0) - remove);
        }
      }
      break;
    }
    case 'twin': {
      // Add gained again (same as blessed, tracked separately)
      for (const [k, amt] of Object.entries(gained || {})) {
        if (typeof amt === 'number') {
          inv[k] = (inv[k] || 0) + amt;
        }
      }
      break;
    }
    case 'heavy': {
      inv.stone = (inv.stone || 0) + 1;
      break;
    }
    case 'fertile': {
      inv.hay = (inv.hay || 0) + 2;
      break;
    }
    case 'embered': {
      inv.coal = (inv.coal || 0) + 1;
      break;
    }
    case 'frozen': {
      // No inventory change — visual/mechanical effect only
      break;
    }
    case 'golden': {
      next = { ...next, coins: (next.coins || 0) + 5 };
      break;
    }
    case 'veiled': {
      const biome = next.biome || 'farm';
      const keys = getBiomeResourceKeys(biome);
      const pick = pickRandom(keys);
      inv[pick] = (inv[pick] || 0) + 1;
      break;
    }
    default:
      break;
  }

  return { ...next, inventory: inv };
}

export function reduce(state, action) {
  if (action.type !== 'CHAIN_COLLECTED') return state;

  // 12% chance to proc
  if (Math.random() >= PROC_CHANCE) return state;

  const glyph = pickWeightedGlyph();
  const gained = action.gained || {};
  const resourceKey = action.key || Object.keys(gained)[0] || null;

  let next = applyGlyphEffect(state, glyph, gained, resourceKey);

  // Update discovered count
  const glyphsDiscovered = { ...(next.glyphsDiscovered || {}) };
  glyphsDiscovered[glyph.id] = (glyphsDiscovered[glyph.id] || 0) + 1;

  // Build log entry
  const chainAmt = Object.values(gained).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  const logEntry = {
    id: Date.now(),
    glyphId: glyph.id,
    glyphName: glyph.name,
    glyphIcon: glyph.icon,
    resourceKey,
    chainAmt,
    ts: Date.now(),
  };

  const glyphsLog = [logEntry, ...(next.glyphsLog || [])].slice(0, LOG_MAX);

  // Wren bubble notification
  const bubble = {
    npc: 'wren',
    text: `${glyph.icon} ${glyph.name}!`,
    ms: 1500,
    id: Date.now(),
  };

  return { ...next, glyphsDiscovered, glyphsLog, bubble };
}
