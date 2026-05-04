import { MAP_NODES } from '../cartography/data.js';

const STORAGE_KEY = 'hearth.heirlooms.v1';

function persist(owned, slots) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ owned, slots }));
  } catch (_) {}
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

const persisted = loadPersisted();

export const initial = {
  heirloomsOwned: persisted?.owned ?? ['oldcoin', 'seedring'],
  heirloomSlots: persisted?.slots ?? [null, null, null],
  heirloomSeasonChainsUsed: 0,
};

function isEquipped(slots, id) {
  return slots.indexOf(id) !== -1;
}

export function reduce(state, action) {
  const slots = state.heirloomSlots || [null, null, null];
  const owned = state.heirloomsOwned || [];

  // ── HEIRLOOMS/EQUIP ────────────────────────────────────────────────────────
  if (action.type === 'HEIRLOOMS/EQUIP') {
    const { id, slot } = action;
    if (!owned.includes(id)) return state;
    if (slot < 0 || slot > 2) return state;

    const newSlots = [...slots];
    const existingSlot = newSlots.indexOf(id);
    if (existingSlot !== -1) {
      newSlots[existingSlot] = newSlots[slot];
    }
    newSlots[slot] = id;

    // cartographer: reveal 2 extra undiscovered map nodes on equip
    let next = { ...state, heirloomSlots: newSlots };
    if (id === 'cartographer' && Array.isArray(state.mapDiscovered)) {
      const allIds = MAP_NODES.map(n => n.id);
      const undiscovered = allIds.filter(nid => !state.mapDiscovered.includes(nid));
      const toAdd = undiscovered.slice(0, 2);
      if (toAdd.length > 0) {
        next = { ...next, mapDiscovered: [...state.mapDiscovered, ...toAdd] };
      }
    }

    persist(owned, newSlots);
    return next;
  }

  // ── HEIRLOOMS/UNEQUIP ─────────────────────────────────────────────────────
  if (action.type === 'HEIRLOOMS/UNEQUIP') {
    const { slot } = action;
    if (slot < 0 || slot > 2) return state;
    const newSlots = [...slots];
    newSlots[slot] = null;
    persist(owned, newSlots);
    return { ...state, heirloomSlots: newSlots };
  }

  // ── TURN_IN_ORDER ─────────────────────────────────────────────────────────
  // oldcoin: orders pay +10% coins (bonus on top of main reducer's reward)
  if (action.type === 'TURN_IN_ORDER') {
    if (!isEquipped(slots, 'oldcoin')) return state;
    const reward = action.reward || {};
    const bonus = Math.floor((reward.coins || 0) * 0.1);
    if (bonus <= 0) return state;
    return { ...state, coins: (state.coins || 0) + bonus };
  }

  // ── CLOSE_SEASON ──────────────────────────────────────────────────────────
  if (action.type === 'CLOSE_SEASON') {
    let next = { ...state, heirloomSeasonChainsUsed: 0 };
    // seedring: every season starts with +5 hay
    if (isEquipped(slots, 'seedring')) {
      const inv = { ...(next.inventory || {}) };
      inv.hay = (inv.hay || 0) + 5;
      next = { ...next, inventory: inv };
    }
    return next;
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────
  // stoneheart: buildings cost 5% less (refund 5% after main reducer deducts full price)
  if (action.type === 'BUILD') {
    if (!isEquipped(slots, 'stoneheart')) return state;
    const b = action.building;
    if (!b || !b.cost) return state;
    const refund = Math.ceil((b.cost.coins || 0) * 0.05);
    if (refund <= 0) return state;
    return { ...state, coins: (state.coins || 0) + refund };
  }

  // ── USE_TOOL ──────────────────────────────────────────────────────────────
  // windsong: Reshuffle Horn refunds 1 turn
  if (action.type === 'USE_TOOL') {
    if (!isEquipped(slots, 'windsong')) return state;
    if (action.key !== 'shuffle') return state;
    return { ...state, turnsUsed: Math.max(0, (state.turnsUsed || 0) - 1) };
  }

  // ── CHAIN_COLLECTED ───────────────────────────────────────────────────────
  if (action.type === 'CHAIN_COLLECTED') {
    const { key, gained, upgrades, chainLength } = action.payload || {};
    let next = { ...state };

    // embershard: first chain of every season is doubled (add gained again)
    // Mark season chain used regardless of embershard equip (needed to gate first-chain bonus)
    const wasFirstChain = (state.heirloomSeasonChainsUsed || 0) === 0;
    next = { ...next, heirloomSeasonChainsUsed: (next.heirloomSeasonChainsUsed || 0) + 1 };

    if (isEquipped(slots, 'embershard') && wasFirstChain) {
      const inv = { ...(next.inventory || {}) };
      if (typeof gained === 'number' && key) {
        inv[key] = (inv[key] || 0) + gained;
      }
      next = { ...next, inventory: inv };
    }

    // harvestmoon: +1 extra of the chain's base resource
    if (isEquipped(slots, 'harvestmoon') && key) {
      const inv = { ...(next.inventory || {}) };
      inv[key] = (inv[key] || 0) + 1;
      next = { ...next, inventory: inv };
    }

    // forgemark: mine biome gives +1 ingot and +1 cobble per chain
    if (isEquipped(slots, 'forgemark') && (state.biomeKey || next.biomeKey) === 'mine') {
      const inv = { ...(next.inventory || {}) };
      inv.ingot = (inv.ingot || 0) + 1;
      inv.cobble = (inv.cobble || 0) + 1;
      next = { ...next, inventory: inv };
    }

    // lumberknot: 20% chance to grant +1 log (soft equivalent to 20% more frequent spawn)
    if (isEquipped(slots, 'lumberknot') && Math.random() < 0.2) {
      const inv = { ...(next.inventory || {}) };
      inv.log = (inv.log || 0) + 1;
      next = { ...next, inventory: inv };
    }

    // tinder: chains of 6+ give +2 XP
    if (isEquipped(slots, 'tinder') && (chainLength || 0) >= 6) {
      next = { ...next, xp: (next.xp || 0) + 2 };
    }

    // chimes: NPC bubbles linger 50% longer — extend any bubble set by the main reducer
    if (isEquipped(slots, 'chimes') && next.bubble && next.bubble.ms) {
      const prevBubble = state.bubble;
      if (!prevBubble || prevBubble.id !== next.bubble.id) {
        next = { ...next, bubble: { ...next.bubble, ms: Math.floor(next.bubble.ms * 1.5) } };
      }
    }

    // palecrown: building level cap discount — requires ui.jsx edits to take effect.
    // TownView should read state.heirloomSlots and check for 'palecrown' to lower L8 → L7.
    // No pure-reducer change is sufficient without UI edits (out of scope here).

    return next;
  }

  // ── POP_NPC / other bubble-setting actions ─────────────────────────────────
  // chimes: extend bubbles set outside of CHAIN_COLLECTED
  if (isEquipped(slots, 'chimes') && action.type === 'POP_NPC') {
    // By the time this slice runs, the main reducer has returned for POP_NPC via the
    // named case — this branch only fires if POP_NPC hits default: (it won't currently).
    // Kept for correctness when state.js routes all actions through slices.
    if (state.bubble && state.bubble.ms) {
      return { ...state, bubble: { ...state.bubble, ms: Math.floor(state.bubble.ms * 1.5) } };
    }
  }

  return state;
}
