const STORAGE_KEY = 'hearth.settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
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
      setTimeout(() => window.location.reload(), 400);
      return state;
    }

    case 'SETTINGS/RESTART_RUN': {
      return {
        ...state,
        modal: null,
        bubble: { id: Date.now(), npc: 'wren', text: 'Restart not yet wired — coming soon.', ms: 1800 },
      };
    }

    case 'SETTINGS/EASTER_EGG':
      return {
        ...state,
        bubble: { id: Date.now(), npc: 'mira', text: 'You found the secret hearth ♥', ms: 2000 },
      };

    case 'SETTINGS/SHOW_TUTORIAL': {
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
