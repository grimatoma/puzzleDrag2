// Feature flags — set to true to enable the feature.
// Fire and rats hazards are gated here so they can be turned on independently.

export const FIRE_HAZARD_ENABLED = false;
export const RATS_HAZARD_ENABLED = true;

// Returns true when dialogs/modals should be suppressed — useful for testing
// pages so that auto-triggered story beats and season modals don't interrupt
// the test flow. globalThis.__HEARTH_DISABLE_DIALOGS__ can force on/off at
// runtime (e.g. via page.addInitScript in Playwright).
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

  return true;
}
