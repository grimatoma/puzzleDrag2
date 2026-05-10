import { STORAGE_KEYS } from "../constants.js";

const SAVE_KEY = STORAGE_KEYS.save;
const VOLATILE = new Set(["modal", "bubble", "view", "viewParams", "pendingView", "craftingTab"]);

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) { console.warn("[hearth] save data corrupt, starting fresh:", e); return null; }
}

export function persistStateNow(state) {
  try {
    const out = {};
    for (const k of Object.keys(state)) if (!VOLATILE.has(k)) out[k] = state[k];
    localStorage.setItem(SAVE_KEY, JSON.stringify(out));
  } catch { /* storage unavailable (private browsing / quota) */ }
}

let _pendingPersist = null;
let _persistScheduled = false;
let _unloadHooked = false;

function _flushPersist() {
  _persistScheduled = false;
  if (_pendingPersist === null) return;
  const s = _pendingPersist;
  _pendingPersist = null;
  persistStateNow(s);
}

export function persistState(state) {
  _pendingPersist = state;
  if (!_persistScheduled) {
    _persistScheduled = true;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(_flushPersist);
    } else {
      queueMicrotask(_flushPersist);
    }
  }
  if (!_unloadHooked && typeof window !== "undefined") {
    _unloadHooked = true;
    const flushOnExit = () => {
      if (_pendingPersist) persistStateNow(_pendingPersist);
      _pendingPersist = null;
      _persistScheduled = false;
    };
    window.addEventListener("pagehide", flushOnExit);
    window.addEventListener("beforeunload", flushOnExit);
  }
}

export function flushPersistState() {
  if (_pendingPersist) persistStateNow(_pendingPersist);
  _pendingPersist = null;
  _persistScheduled = false;
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
