/** Playwright specs run in Node but typecheck browser globals on `window`. */
export {};

declare global {
  interface Window {
    __phaserScene?: Record<string, any>;
    /** Dev/test bridge — dynamic method names from scenario manifests. */
    __hearthVisual?: Record<string, any>;
    __HEARTH_VISUAL_TESTING__?: boolean;
    __HEARTH_DISABLE_DIALOGS__?: boolean;
  }
}
