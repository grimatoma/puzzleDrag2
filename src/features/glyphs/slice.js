import { BIOMES } from '../../constants.js';
import { resourceByKey } from '../../state.js';
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

function applyGlyphEffect(state, glyph, payload) {
  const upgrades = payload.upgrades || 0;
  const key = payload.key;

  let next = { ...state };
  const inv = { ...(next.inventory || {}) };

  switch (glyph.id) {
    case 'blessed': {
      // Double the gained amounts in inventory
      if (key && typeof payload.gained === 'number') {
        inv[key] = (inv[key] || 0) + payload.gained;
      }
      break;
    }
    case 'cursed': {
      // Remove half of gained from inventory (don't go negative) + -10 coins
      if (key && typeof payload.gained === 'number') {
        const remove = Math.floor(payload.gained / 2);
        inv[key] = Math.max(0, (inv[key] || 0) - remove);
      }
      next = { ...next, coins: Math.max(0, (next.coins || 0) - 10) };
      break;
    }
    case 'twin': {
      // Add gained again (same as blessed, tracked separately)
      if (key && typeof payload.gained === 'number') {
        inv[key] = (inv[key] || 0) + payload.gained;
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
      // "Skips upgrades this chain" — retroactively undo the upgrades:
      // remove the upgrade-tier resource that shouldn't have been added,
      // and refund the base resource instead.
      if (upgrades > 0 && key) {
        const res = resourceByKey(key);
        if (res && res.next) {
          // Remove up to `upgrades` of the next-tier resource (clamped at 0)
          inv[res.next] = Math.max(0, (inv[res.next] || 0) - upgrades);
          // Refund as base resource
          inv[key] = (inv[key] || 0) + upgrades;
        }
      }
      break;
    }
    case 'golden': {
      next = { ...next, coins: (next.coins || 0) + 5 };
      break;
    }
    case 'veiled': {
      const biome = next.biomeKey || next.biome || 'farm';
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
  const payload = action.payload || {};
  const gained = payload.gained || 0;
  const resourceKey = payload.key || null;

  let next = applyGlyphEffect(state, glyph, payload);

  // Update discovered count
  const glyphsDiscovered = { ...(next.glyphsDiscovered || {}) };
  glyphsDiscovered[glyph.id] = (glyphsDiscovered[glyph.id] || 0) + 1;

  // Build log entry
  const logEntry = {
    id: Date.now(),
    glyphId: glyph.id,
    glyphName: glyph.name,
    glyphIcon: glyph.icon,
    resourceKey,
    chainAmt: typeof gained === 'number' ? gained : 0,
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
