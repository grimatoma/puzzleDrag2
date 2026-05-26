// Globals installed by the dev/test-only visual testing bridge.
// These are populated by src/visualTesting/bridge.ts and consumed by
// the bridge itself plus state.ts (HEARTH_VISUAL_TESTING flag check).

import type { GameScene } from "../GameScene.js";

export {};

interface VisualBridgeApi {
  ready: Promise<boolean>;
  list: () => Array<{ id: string; [k: string]: unknown }>;
  state: () => unknown;
  dispatch: (action: { type: string; [k: string]: unknown }) => Promise<unknown>;
  loadScenario: (id: string) => Promise<{ id: string; view?: string; modal?: unknown }>;
  click: (selector: string) => boolean;
  hover: (selector: string) => boolean;
  holdChain: (opts: { key: string; length: number }) => Promise<unknown>;
  playBoardAnimation: (opts: { name: string; tint?: unknown; pattern?: string }) => unknown;
  syncScene: () => boolean;
  freeze: () => boolean;
  selectorForTestId: (testId: string) => string;
}

declare global {
  interface Window {
    __HEARTH_VISUAL_TESTING__?: boolean;
    __HEARTH_DISABLE_DIALOGS__?: boolean;
    __hearthVisual?: VisualBridgeApi;
    __hearthVisualScenarioState?: unknown;
    __phaserScene?: GameScene | null;
  }

  var __HEARTH_VISUAL_TESTING__: boolean | undefined;
  var __HEARTH_DISABLE_DIALOGS__: boolean | undefined;
}
