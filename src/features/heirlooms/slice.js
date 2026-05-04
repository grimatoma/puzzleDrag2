import { HEIRLOOM_MAP } from './data.js';

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
    persist(owned, newSlots);
    return { ...state, heirloomSlots: newSlots };
  }

  if (action.type === 'HEIRLOOMS/UNEQUIP') {
    const { slot } = action;
    if (slot < 0 || slot > 2) return state;
    const newSlots = [...slots];
    newSlots[slot] = null;
    persist(owned, newSlots);
    return { ...state, heirloomSlots: newSlots };
  }

  if (action.type === 'TURN_IN_ORDER') {
    if (!isEquipped(slots, 'oldcoin')) return state;
    const reward = action.reward || {};
    const bonus = Math.floor((reward.coins || 0) * 0.1);
    if (bonus <= 0) return state;
    return { ...state, coins: (state.coins || 0) + bonus };
  }

  if (action.type === 'CLOSE_SEASON') {
    let next = { ...state, heirloomSeasonChainsUsed: 0 };
    if (isEquipped(slots, 'seedring')) {
      const inv = { ...(next.inventory || {}) };
      inv.hay = (inv.hay || 0) + 5;
      next = { ...next, inventory: inv };
    }
    return next;
  }

  if (action.type === 'CHAIN_COLLECTED') {
    if (!isEquipped(slots, 'embershard')) return state;
    const used = state.heirloomSeasonChainsUsed || 0;
    if (used !== 0) return state;

    const gained = action.gained || {};
    if (Object.keys(gained).length === 0) return state;

    const inv = { ...(state.inventory || {}) };
    for (const [key, amt] of Object.entries(gained)) {
      if (typeof amt === 'number') {
        inv[key] = (inv[key] || 0) + amt;
      }
    }
    return { ...state, inventory: inv, heirloomSeasonChainsUsed: 1 };
  }

  return state;
}
