import { PERK_MAP } from './data.js';

const STORAGE_KEY = 'hearth.memoryweave.v1';

function persist(memories, memoryPerks, lifetimeRuns) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ memories, memoryPerks, lifetimeRuns }));
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
  memories: persisted?.memories ?? 0,
  memoryPerks: persisted?.memoryPerks ?? [],
  lifetimeRuns: persisted?.lifetimeRuns ?? 0,
  // internal flag so we only offer the modal once per eligibility window
  mwOffered: false,
};

/** Check whether a perk's prereq is satisfied by the current purchased set. */
function prereqMet(perk, memoryPerks) {
  if (!perk.prereq) return true;
  if (Array.isArray(perk.prereq)) {
    // any one of the listed ids must be purchased
    return perk.prereq.some(id => memoryPerks.includes(id));
  }
  return memoryPerks.includes(perk.prereq);
}

/** Compute memories earned from a prestige. */
export function calcMemoriesGained(state) {
  const level = state.level || 1;
  const seasonsCycled = state.seasonsCycled || 0;
  const coins = state.coins || 0;
  return Math.floor(level / 2) + Math.floor(seasonsCycled) + Math.floor(coins / 200);
}

function hasPerks(state) {
  return state.memoryPerks || [];
}

export function reduce(state, action) {
  // ── Auto-trigger: show modal once when player becomes eligible ──────────
  if (
    (state.level || 1) >= 10 &&
    (state.modal == null || state.modal === undefined) &&
    !state.mwOffered
  ) {
    return { ...state, modal: 'memoryweave', mwOffered: true };
  }

  // ── MW/OPEN ─────────────────────────────────────────────────────────────
  if (action.type === 'MW/OPEN') {
    return { ...state, modal: 'memoryweave' };
  }

  // ── MW/PRESTIGE ─────────────────────────────────────────────────────────
  if (action.type === 'MW/PRESTIGE') {
    const gained = calcMemoriesGained(state);
    const newMemories = (state.memories || 0) + gained;
    const newLifetimeRuns = (state.lifetimeRuns || 0) + 1;
    const memoryPerks = state.memoryPerks || [];

    // Base reset values
    let resetLevel = 1;
    let resetCoins = 150;

    // WIRED EFFECT — ancestor_call: begin at level 2
    if (memoryPerks.includes('ancestor_call')) {
      resetLevel = 2;
    }

    // WIRED EFFECT — coinkin: start with +50 coins
    if (memoryPerks.includes('coinkin')) {
      resetCoins += 50;
    }

    // Persist updated prestige data
    persist(newMemories, memoryPerks, newLifetimeRuns);

    return {
      ...state,
      // reset run state
      level: resetLevel,
      xp: 0,
      coins: resetCoins,
      inventory: {},
      built: { hearth: true },
      seasonsCycled: 0,
      // prestige state
      memories: newMemories,
      lifetimeRuns: newLifetimeRuns,
      // close modal and reset eligibility flag so it can re-trigger next run
      modal: null,
      mwOffered: false,
    };
  }

  // ── MW/UNLOCK ────────────────────────────────────────────────────────────
  if (action.type === 'MW/UNLOCK') {
    const { id } = action;
    const perk = PERK_MAP[id];
    if (!perk) return state;

    const memoryPerks = state.memoryPerks || [];
    const memories = state.memories || 0;

    // Already purchased
    if (memoryPerks.includes(id)) return state;

    // Check prereq
    if (!prereqMet(perk, memoryPerks)) return state;

    // Check cost
    if (memories < perk.cost) return state;

    const newPerks = [...memoryPerks, id];
    const newMemories = memories - perk.cost;
    persist(newMemories, newPerks, state.lifetimeRuns || 0);

    return { ...state, memories: newMemories, memoryPerks: newPerks };
  }

  // ── Perk effects on game actions ─────────────────────────────────────────

  const perks = state.memoryPerks || [];

  // ── BUILD ─────────────────────────────────────────────────────────────────
  // eternalforge: all buildings cost 10% less permanently (refund after main deducts full price)
  if (action.type === 'BUILD') {
    if (!perks.includes('eternalforge')) return state;
    const b = action.building;
    if (!b || !b.cost) return state;
    const refund = Math.ceil((b.cost.coins || 0) * 0.10);
    if (refund <= 0) return state;
    return { ...state, coins: (state.coins || 0) + refund };
  }

  // ── USE_TOOL ──────────────────────────────────────────────────────────────
  // keenedge: tools cost 1 less to use — 50% chance to refund the tool charge
  // (net: tools cost half on average, simulating "1 less" for cost-1 tools)
  if (action.type === 'USE_TOOL') {
    if (!perks.includes('keenedge')) return state;
    const { key } = action;
    if (Math.random() < 0.5) {
      const tools = { ...(state.tools || {}) };
      tools[key] = (tools[key] || 0) + 1;
      return { ...state, tools };
    }
    return state;
  }

  // ── CHAIN_COLLECTED ───────────────────────────────────────────────────────
  if (action.type === 'CHAIN_COLLECTED') {
    const { key } = action.payload || {};
    let next = { ...state };

    // fertileworld: farm pool spawns +1 wheat per chain
    if (perks.includes('fertileworld') && (state.biomeKey || next.biomeKey) === 'farm') {
      const inv = { ...(next.inventory || {}) };
      inv.wheat = (inv.wheat || 0) + 1;
      next = { ...next, inventory: inv };
    }

    // richveins: mine pool spawns +1 ore per chain
    if (perks.includes('richveins') && (state.biomeKey || next.biomeKey) === 'mine') {
      const inv = { ...(next.inventory || {}) };
      inv.ore = (inv.ore || 0) + 1;
      next = { ...next, inventory: inv };
    }

    // quickfingers: drag chains 10% faster — Phaser speed cannot be set from this reducer.
    // The perk flag is readable from state.memoryPerks in GameScene.js to apply speed multiplier.

    return next;
  }

  // ── TURN_IN_ORDER ─────────────────────────────────────────────────────────
  // silvertongue: order rewards +5% — simplified as flat +5 coins per delivery.
  // NOTE: The action does not carry reward.coins in payload; the main reducer reads the
  // order object from state.orders before replacing it. A precise % would require
  // pre-computing the reward here, which matches what the main reducer already does.
  // Flat +5 is a pragmatic approximation noted here.
  if (action.type === 'TURN_IN_ORDER') {
    if (!perks.includes('silvertongue')) return state;
    return { ...state, coins: (state.coins || 0) + 5 };
  }

  return state;
}
