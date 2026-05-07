import { STORAGE_KEYS, PALETTES } from "./constants.js";

export const INITIAL_SETTINGS = {
  palette: "default",
  reducedMotion: null, // null = follow OS; true/false = user override
  keyboardCursor: { row: 0, col: 0, active: false },
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? { ...INITIAL_SETTINGS, ...JSON.parse(raw) } : { ...INITIAL_SETTINGS };
  } catch { return { ...INITIAL_SETTINGS }; }
}

export function saveSettings(s) {
  try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

export function settingsReduce(state, action) {
  switch (action.type) {
    case "SET_PALETTE":        return { ...state, palette: action.id };
    case "SET_REDUCED_MOTION": return { ...state, reducedMotion: action.value };
    case "SET_CURSOR":         return { ...state, keyboardCursor: { ...action.cursor } };
    default: return state;
  }
}

export function getTileColor(state, key) {
  const id = state?.settings?.palette ?? "default";
  return PALETTES[id]?.tiles?.[key] ?? PALETTES.default.tiles[key];
}

export function getSeasonColor(state, seasonName) {
  const id = state?.settings?.palette ?? "default";
  return PALETTES[id]?.seasons?.[seasonName] ?? PALETTES.default.seasons[seasonName];
}
