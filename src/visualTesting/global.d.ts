// Globals installed by the dev/test-only visual testing bridge.
// These are populated by src/visualTesting/bridge.ts and consumed by
// the bridge itself plus state.ts (HEARTH_VISUAL_TESTING flag check).

export {};

/**
 * Minimal shape of the live Phaser GameScene as accessed by visual testing
 * and developer console code. The real scene has many more members; this
 * is just the surface the bridge pokes at.
 */
interface VisualScene {
  grid: Array<Array<{
    row: number;
    col: number;
    res?: { key: string };
    frozen?: boolean;
    rubble?: boolean;
    [k: string]: unknown;
  } | null>>;
  registry: { set(key: string, value: unknown): void; get(key: string): unknown };
  tweens?: { pauseAll?: () => void };
  time?: {
    timeScale: number;
    paused: boolean;
    delayedCall?: (ms: number, cb: () => void) => unknown;
  };
  sys?: { game?: { loop?: { sleep?: () => void } } };
  game?: { canvas?: HTMLCanvasElement };
  events: {
    on(event: string, cb: (...args: unknown[]) => void): void;
    off?: (event: string, cb?: (...args: unknown[]) => void) => void;
  };
  state?: unknown;
  endPath?: () => void;
  startPath: (tile: unknown) => void;
  tryAddToPath: (tile: unknown) => unknown;
  path?: { length: number };
  playBoardAnimation: (name: string, tiles: unknown[], opts?: { tint?: unknown }) => void;
  collapseBoard?: () => void;
  rebuildGridFromState?: (grid: unknown) => void;
  _applyGridFromState?: (grid: unknown) => void;
  refreshSeasonTint?: () => void;
  [extra: string]: unknown;
}

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
    __phaserScene?: VisualScene | null;
  }

  var __HEARTH_VISUAL_TESTING__: boolean | undefined;
  var __HEARTH_DISABLE_DIALOGS__: boolean | undefined;
}
