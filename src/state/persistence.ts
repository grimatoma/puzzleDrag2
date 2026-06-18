import { STORAGE_KEYS, SAVE_SCHEMA_VERSION } from "../constants.js";
import { parseZoneInventories } from "../types/inventory.js";
import { migrateSave } from "./saveMigrations.js";
import type { GameState } from "../types/state.js";

const SAVE_KEY = STORAGE_KEYS.save;
const VOLATILE = new Set(["modal", "bubble", "view", "viewParams", "pendingView", "craftingTab"]);

/**
 * Loose record returned from JSON parse. Callers should narrow as needed —
 * the save boundary is intrinsically untyped since older versions may be
 * present on disk (the reducer guards via SAVE_SCHEMA_VERSION).
 */
export type SavedState = Record<string, unknown> & { version?: number };

export function loadSavedState(): SavedState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw, (k, v) =>
      (k === "__proto__" || k === "constructor" || k === "prototype") ? undefined : v
    );
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== SAVE_SCHEMA_VERSION) {
      // Try the migration ladder before giving up. A laddered older version is
      // upgraded in place (so both this gate and the redundant one in init.ts
      // see version === current); forward/gap/corrupt saves still wipe exactly
      // as before. The upgraded object isn't rewritten to disk here — the
      // normal persist cycle (first state change / pagehide) does that, and the
      // migration re-runs harmlessly until then.
      const result = migrateSave(parsed as Record<string, unknown>);
      if (!result.ok) {
        console.warn(
          `[hearth] discarding save: cannot migrate version ${parsed.version} ` +
          `to ${SAVE_SCHEMA_VERSION} (${result.reason}); starting fresh`
        );
        try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
        return null;
      }
      return result.save as SavedState; // upgraded; version === SAVE_SCHEMA_VERSION
    }
    return parsed as SavedState;
  } catch (e) { console.warn("[hearth] save data corrupt, starting fresh:", e); return null; }
}

export function persistStateNow(state: GameState): void {
  try {
    const out: Record<string, unknown> = {};
    // Iterate the GameState entries directly; Object.entries handles the
    // string-indexed view without casting reducer state through `unknown`.
    for (const [k, v] of Object.entries(state)) if (!VOLATILE.has(k)) out[k] = v;
    if (out.inventory != null) {
      out.inventory = parseZoneInventories(out.inventory);
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(out));
  } catch { /* storage unavailable (private browsing / quota) */ }
}

let _pendingPersist: GameState | null = null;
let _persistScheduled = false;
let _unloadHooked = false;

function _flushPersist() {
  _persistScheduled = false;
  if (_pendingPersist === null) return;
  const s = _pendingPersist;
  _pendingPersist = null;
  persistStateNow(s);
}

export function persistState(state: GameState): void {
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

export function flushPersistState(): void {
  if (_pendingPersist) persistStateNow(_pendingPersist);
  _pendingPersist = null;
  _persistScheduled = false;
}

export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
