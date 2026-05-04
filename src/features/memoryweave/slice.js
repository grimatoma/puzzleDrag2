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

  // ── Perk effects on other action types ───────────────────────────────────

  // silvertongue (+5% order reward) — NOTE: reward.coins is not available in
  // TURN_IN_ORDER action payload in the current codebase. Left as visual-only.
  // To wire: in the reducer handling TURN_IN_ORDER, after applying the reward
  // do: if (state.memoryPerks.includes('silvertongue')) state.coins += Math.floor(reward.coins * 0.05)

  // quickfingers, keenedge, fertileworld, richveins, eternalforge — visual-only.
  // These perks are readable from state.memoryPerks in GameScene.js / other systems
  // to apply their mechanical effects without further reducer changes.

  return state;
}
