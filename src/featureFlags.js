// Feature flags — set to true to enable the feature.
// Fire and rats hazards are gated here so they can be turned on independently.

export const FIRE_HAZARD_ENABLED = false;
export const RATS_HAZARD_ENABLED = true;

// Returns true when dialogs/modals should be suppressed — useful for testing
// pages so that auto-triggered story beats and season modals don't interrupt
// the test flow. Set globalThis.__HEARTH_DISABLE_DIALOGS__ = true (e.g. via
// page.addInitScript in Playwright) to activate at runtime without a rebuild.
export function isDialogsDisabled() {
  if (globalThis.__HEARTH_DISABLE_DIALOGS__) return true;
  try {
    return localStorage.getItem('hearth.disableDialogs') === '1';
  } catch {
    return false;
  }
}
