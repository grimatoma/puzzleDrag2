import { STORAGE_KEYS } from "../../constants.js";
const STORAGE_KEY = STORAGE_KEYS.settings;

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn("[hearth] settings data corrupt, using defaults:", e); }
  return null;
}

/**
 * Side-effect: persist the settings sub-state to its own localStorage key.
 * Called from state.runActionEffects after the reducer has run, so the
 * reducer itself stays pure.
 */
export function persistSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* storage unavailable */ }
}

/** Side-effect: clear every hearth.* localStorage key (used by SETTINGS/RESET_SAVE). */
export function clearAllHearthStorage() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("hearth."));
    for (const k of keys) localStorage.removeItem(k);
  } catch { /* storage unavailable */ }
}

/** Side-effect: clear the tutorial-seen flag so the tutorial replays. */
export function clearTutorialSeen() {
  try { localStorage.removeItem(STORAGE_KEYS.tutorialSeen); } catch { /* storage unavailable */ }
}

const DEFAULT_SETTINGS = {
  sfxOn: true,
  musicOn: true,
  hapticsOn: true,
};

export const initial = {
  settings: { ...DEFAULT_SETTINGS, ...(loadSettings() || {}) },
  settingsTab: 'main',
  settingsDebugOpen: false,
};

// Reducer is pure: any localStorage writes/clears triggered by these actions
// happen in state.runActionEffects after this returns.
export function reduce(state, action) {
  switch (action.type) {
    case 'SETTINGS/TOGGLE': {
      const settings = {
        ...state.settings,
        [action.key]: !state.settings[action.key],
      };
      return { ...state, settings };
    }

    case 'SETTINGS/SET_TAB':
      return { ...state, settingsTab: action.tab };

    case 'SETTINGS/OPEN_DEBUG':
      return { ...state, modal: 'menu', settingsTab: 'about', settingsDebugOpen: true };

    case 'SETTINGS/RESET_SAVE': {
      // Set flag; prototype.jsx's useEffect performs the actual reload, and
      // runActionEffects clears the hearth.* localStorage keys.
      return { ...state, pendingReload: true };
    }

    case 'SETTINGS/LEAVE_BOARD': {
      return {
        ...state,
        modal: null,
        view: 'town',
        viewParams: {},
        turnsUsed: 0,
        pendingView: null,
        seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
        bubble: { id: Date.now(), npc: 'wren', text: 'Back in the vale. Your board progress was not saved.', ms: 2400 },
      };
    }

    case 'SETTINGS/SHOW_TUTORIAL': {
      // The persisted tutorial-seen flag is cleared by runActionEffects.
      const next = { ...state, modal: 'tutorial' };
      if (state.tutorial) {
        next.tutorial = { ...state.tutorial, active: true, step: 0, seen: false };
      }
      return next;
    }

    default:
      return state;
  }
}
