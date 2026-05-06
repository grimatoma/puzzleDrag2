import { STORAGE_KEYS } from "../../constants.js";
const STORAGE_KEY = STORAGE_KEYS.settings;

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn("[hearth] settings data corrupt, using defaults:", e); }
  return null;
}

function persistSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {}
}

const DEFAULT_SETTINGS = {
  sfxOn: true,
  musicOn: true,
  hapticsOn: true,
  reducedMotion: false,
  colorBlind: false,
};

export const initial = {
  settings: { ...DEFAULT_SETTINGS, ...(loadSettings() || {}) },
  settingsTab: 'main',
};

export function reduce(state, action) {
  switch (action.type) {
    case 'SETTINGS/TOGGLE': {
      const settings = {
        ...state.settings,
        [action.key]: !state.settings[action.key],
      };
      persistSettings(settings);
      return { ...state, settings };
    }

    case 'SETTINGS/SET_TAB':
      return { ...state, settingsTab: action.tab };

    case 'SETTINGS/RESET_SAVE': {
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('hearth.'));
        keys.forEach((k) => localStorage.removeItem(k));
      } catch (_) {}
      // Set flag; prototype.jsx's useEffect performs the actual reload
      return { ...state, pendingReload: true };
    }

    case 'SETTINGS/LEAVE_BOARD': {
      return {
        ...state,
        modal: null,
        view: 'town',
        turnsUsed: 0,
        pendingView: null,
        seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
        bubble: { id: Date.now(), npc: 'wren', text: 'Back in the vale. Your board progress was not saved.', ms: 2400 },
      };
    }

    case 'SETTINGS/EASTER_EGG':
      return {
        ...state,
        bubble: { id: Date.now(), npc: 'mira', text: 'You found the secret hearth ♥', ms: 2000 },
      };

    case 'SETTINGS/SHOW_TUTORIAL': {
      // Clear the persisted seen flag so the tutorial actually re-runs after reload
      try { localStorage.removeItem(STORAGE_KEYS.tutorialSeen); } catch (_) {}
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
