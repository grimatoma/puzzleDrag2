// Feature flags — set to true to enable the feature.
// Fire and rats hazards are gated here so they can be turned on independently.

import { getTuningOverrides } from "./config/balance/init.js";
import { isConceptTilesFlagEnabled } from "./appQueryParams.js";

export const FIRE_HAZARD_ENABLED = false;
export const RATS_HAZARD_ENABLED = true;

/** Dev Panel tuning (`balance.json` → `tuning.fireHazardEnabled`). */
export function isFireHazardEnabled() {
  return getTuningOverrides().fireHazardEnabled === true;
}

// Returns true when dialogs/modals should be suppressed — useful for testing
// pages so that auto-triggered story beats and season modals don't interrupt
// the test flow. Precedence: the global override wins, then the persisted
// localStorage flag, then a build-time default. globalThis.__HEARTH_DISABLE_DIALOGS__
// can force on/off at runtime (e.g. via page.addInitScript in Playwright).
//
// Production builds (the GitHub Pages deploy) default to suppressed so the
// public site doesn't pop story beats, season summaries, and NPC bubbles;
// dev and test (Vite dev server, Vitest, Playwright) default to enabled.
/** Animated pixel-art concept GIFs for seven farm/grass tiles (docs review assets).
 *  Enable with `conceptTiles=1` in the URL — works in `location.search` or the hash
 *  query (`#/board?conceptTiles=1`). Stays on while navigating until `conceptTiles=0`. */
export function isConceptTileIconsEnabled(): boolean {
  return isConceptTilesFlagEnabled();
}

export function isDialogsDisabled() {
  const globalOverride = globalThis.__HEARTH_DISABLE_DIALOGS__;
  if (typeof globalOverride === 'boolean') return globalOverride;

  try {
    const persisted = localStorage.getItem('hearth.disableDialogs');
    if (persisted === '1') return true;
    if (persisted === '0') return false;
  } catch {
    // Ignore storage access failures and fall through to the default.
  }

  return import.meta.env.PROD === true;
}
