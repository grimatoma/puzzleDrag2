// Globals installed by the dev/test-only visual testing bridge.
// These are populated by src/visualTesting/bridge.ts and consumed by
// the bridge itself plus state.ts (HEARTH_VISUAL_TESTING flag check).

export {};

declare global {
  interface Window {
    __HEARTH_VISUAL_TESTING__?: boolean;
    __HEARTH_DISABLE_DIALOGS__?: boolean;
    __hearthVisual?: unknown;
    __hearthVisualScenarioState?: unknown;
    __phaserScene?: unknown;
  }

  var __HEARTH_VISUAL_TESTING__: boolean | undefined;
  var __HEARTH_DISABLE_DIALOGS__: boolean | undefined;
}
