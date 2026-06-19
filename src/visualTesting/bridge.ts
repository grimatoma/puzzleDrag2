import { BOARD_ANIMATIONS, demoBoardAnimResetMs } from "../config/boardAnimations.js";
import type { TileObj } from "../TileObj.js";
import type { Dispatch, FarmRun } from "../types/state.js";
import { setRegistry, type GameRegistryContract } from "../types/phaserRegistry.js";
import { buildVisualScenario, listVisualScenarios } from "./scenarios.js";

function nextFrame(): Promise<void> {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleFrames(count = 2): Promise<void> {
  for (let i = 0; i < count; i += 1) await nextFrame();
}

function cssEscape(value: unknown): string {
  if (window.CSS?.escape) return window.CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}

function cloneState<T>(state: T): T {
  if (typeof structuredClone === "function") return structuredClone(state);
  return JSON.parse(JSON.stringify(state));
}

function clickSelector(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Visual click target not found: ${selector}`);
  el.scrollIntoView({ block: "center", inline: "center" });
  (el as HTMLElement).click();
  return true;
}

function hoverSelector(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Visual hover target not found: ${selector}`);
  el.scrollIntoView({ block: "center", inline: "center" });
  for (const type of ["pointerover", "mouseover", "mouseenter"]) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: type !== "mouseenter", cancelable: true, view: window }));
  }
  return true;
}

function findChainTiles(scene: NonNullable<Window["__phaserScene"]>, key: string, length: number): TileObj[] {
  const grid = scene?.grid ?? [];
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const seen = new Set<string>();
  const path: TileObj[] = [];

  function visit(row: number, col: number): boolean {
    if (path.length >= length) return true;
    const id = `${row}:${col}`;
    if (seen.has(id)) return false;
    const tile = grid[row]?.[col];
    if (!tile || tile.res?.key !== key || tile.frozen || tile.rubble) return false;
    seen.add(id);
    path.push(tile);
    if (path.length >= length) return true;
    const dirs: Array<[number, number]> = [
      [0, 1],
      [1, 0],
      [1, 1],
      [0, -1],
      [-1, 0],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visit(nr, nc)) return true;
    }
    path.pop();
    seen.delete(id);
    return false;
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      seen.clear();
      path.length = 0;
      if (visit(row, col)) return [...path];
    }
  }
  return [];
}

async function holdChain({ key, length }: { key: string; length: number }): Promise<unknown> {
  const scene = window.__phaserScene;
  if (!scene?.grid?.length) throw new Error("Phaser scene is not ready for visual holdChain");
  let tiles = findChainTiles(scene, key, length);
  if (tiles.length < length) {
    applyBoardStateToScene(window.__hearthVisualScenarioState ?? window.__hearthVisual?.state?.());
    await settleFrames(2);
    tiles = findChainTiles(scene, key, length);
  }
  if (tiles.length < length) {
    throw new Error(`Could not find ${length}-tile visual chain for ${key}; found ${tiles.length}`);
  }
  scene.endPath?.();
  scene.startPath(tiles[0]);
  for (const tile of tiles.slice(1)) scene.tryAddToPath(tile);
  await settleFrames(3);
  return {
    key,
    requestedLength: length,
    actualLength: scene.path?.length ?? tiles.length,
    cells: tiles.map((tile) => ({ row: tile.row, col: tile.col })),
  };
}

let demoAnimResetTimer: ReturnType<typeof setTimeout> | null = null;

type VisualScene = NonNullable<Window["__phaserScene"]>;

interface VisualStateLike {
  view?: string;
  biomeKey?: string;
  biome?: string;
  turnsUsed?: number;
  farmRun?: FarmRun | null;
  activeZone?: string;
  mapCurrent?: string;
  tileCollection?: { activeByCategory?: unknown };
  boss?: unknown;
  toolPending?: unknown;
  toolPendingPower?: unknown;
  hazards?: { fire?: unknown; rats?: unknown };
  grid?: unknown;
  modal?: unknown;
}

/**
 * Demo-only: triggers a board animation on tiles selected by `pattern`.
 * Sweep nulls cells and runs collapse like real tools; all kinds reload the
 * scenario when the animation (and collapse, if any) finishes.
 */
function playBoardAnimation(
  { name, tint, pattern }: { name: string; tint?: unknown; pattern?: string },
  api: { loadScenario: (id: string) => Promise<unknown> },
): { played: boolean; tileCount: number; pattern?: string } {
  const scene = window.__phaserScene;
  if (!scene?.grid?.length) throw new Error("Phaser scene is not ready for playBoardAnimation");
  const tiles = pickTilesForPattern(scene, pattern);
  if (!tiles.length) return { played: false, tileCount: 0 };

  const animEntry = (BOARD_ANIMATIONS as Record<string, { kind?: string } | undefined>)[name];
  const isSweep = animEntry?.kind === "fadeOut";
  if (isSweep) {
    tiles.forEach((tile) => {
      if (scene.grid[tile.row]?.[tile.col] === tile) scene.grid[tile.row][tile.col] = null;
    });
    const tintNum = typeof tint === "number" ? tint : undefined;
    scene.playBoardAnimation(name, tiles, { tint: tintNum });
    scene.time?.delayedCall?.(240, () => scene.collapseBoard?.());
  } else {
    const tintNum = typeof tint === "number" ? tint : undefined;
    scene.playBoardAnimation(name, tiles, { tint: tintNum });
  }

  if (demoAnimResetTimer != null) clearTimeout(demoAnimResetTimer);
  const resetMs = demoBoardAnimResetMs(name, tiles.length);
  demoAnimResetTimer = setTimeout(() => {
    demoAnimResetTimer = null;
    const id = document.documentElement.dataset.visualScenario;
    if (id) api.loadScenario(id).catch((err: unknown) => console.warn("[hearthVisual] demo reload failed:", (err as Error)?.message));
  }, resetMs);

  return { played: true, tileCount: tiles.length, pattern: pattern ?? "all" };
}

function pickTilesForPattern(scene: VisualScene, pattern: string | undefined): TileObj[] {
  const grid = scene.grid;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const all: TileObj[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = grid[r]?.[c];
      if (tile) all.push(tile);
    }
  }
  switch (pattern) {
    case "row": {
      const mid = Math.floor(rows / 2);
      return all.filter((t) => t.row === mid);
    }
    case "bomb3x3": {
      const cr = Math.floor(rows / 2);
      const cc = Math.floor(cols / 2);
      return all.filter((t) => Math.abs(t.row - cr) <= 1 && Math.abs(t.col - cc) <= 1);
    }
    case "random6": {
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 6);
    }
    case "centerSingle": {
      const cr = Math.floor(rows / 2);
      const cc = Math.floor(cols / 2);
      const t = grid[cr]?.[cc];
      return t ? [t] : [];
    }
    case "all":
    default:
      return all;
  }
}

function applyBoardStateToScene(state: unknown, { rebuildGrid = false } = {}): boolean {
  const scene = window.__phaserScene;
  const s = (state ?? {}) as VisualStateLike;
  if (!scene || s.view !== "board") return false;
  // Visual scenarios are dev-only fixtures; the field types on VisualStateLike
  // are intentionally loose, so the registry typing here is a best-effort cast.
  setRegistry(scene.registry, "biomeKey", s.biomeKey ?? s.biome ?? "farm");
  setRegistry(scene.registry, "turnsUsed", s.turnsUsed ?? 0);
  setRegistry(scene.registry, "turnBudget", s.farmRun?.turnBudget ?? null);
  setRegistry(scene.registry, "activeZone", s.activeZone ?? s.mapCurrent ?? "home");
  setRegistry(scene.registry, "tileCollectionActive", (s.tileCollection?.activeByCategory ?? null) as GameRegistryContract["tileCollectionActive"]);
  setRegistry(scene.registry, "boss", (s.boss ?? null) as GameRegistryContract["boss"]);
  setRegistry(scene.registry, "toolPending", (s.toolPending ?? null) as GameRegistryContract["toolPending"]);
  setRegistry(scene.registry, "toolPendingPower", (s.toolPendingPower ?? null) as GameRegistryContract["toolPendingPower"]);
  setRegistry(scene.registry, "hazardFire", (s.hazards?.fire ?? null) as GameRegistryContract["hazardFire"]);
  setRegistry(scene.registry, "hazardRats", (s.hazards?.rats ?? null) as GameRegistryContract["hazardRats"]);
  if (Array.isArray(s.grid)) {
    setRegistry(scene.registry, "grid", s.grid as GameRegistryContract["grid"]);
    if (rebuildGrid && typeof scene.rebuildGridFromState === "function") {
      scene.rebuildGridFromState(s.grid as Parameters<typeof scene.rebuildGridFromState>[0]);
    } else {
      scene._applyGridFromState?.(s.grid as Parameters<typeof scene._applyGridFromState>[0]);
    }
  }
  scene.refreshSeasonTint?.();
  return true;
}

function freezeUi() {
  applyBoardStateToScene(window.__hearthVisualScenarioState ?? window.__hearthVisual?.state?.());
  document.documentElement.dataset.visualTest = "true";
  if (!document.getElementById("hearth-visual-freeze")) {
    const style = document.createElement("style");
    style.id = "hearth-visual-freeze";
    style.textContent = `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0.001s !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `;
    document.head.append(style);
  }
  // Snap any in-flight CSS animations to their END keyframe. The stylesheet above only shortens
  // FUTURE animation durations; it does not advance an animation already running. Modals injected
  // via scenario state (story beats, boss, toast, market news) animate opacity 0→1 through
  // `storyDialogIn` / `fadein`, and the running animation sits pinned at currentTime 0 (opacity 0)
  // under the harness — so without finishing it the overlay captures invisible (a "plain town"
  // golden). finish() holds the end keyframe so the overlay is fully visible. Infinite animations
  // can't be finished and throw — ignore those (the duration override already settles them).
  try {
    for (const anim of document.getAnimations()) {
      try { anim.finish(); } catch { /* infinite / fill-less animation — leave it */ }
    }
  } catch { /* getAnimations unsupported */ }
  const scene = window.__phaserScene;
  scene?.tweens?.pauseAll?.();
  if (scene?.time) {
    scene.time.timeScale = 0;
    scene.time.paused = true;
  }
  scene?.sys?.game?.loop?.sleep?.();
  return true;
}

function installPanel(api: { list: () => Array<{ id: string }>; loadScenario: (id: string) => unknown }): void {
  if (document.getElementById("hearth-visual-panel")) return;
  const panel = document.createElement("div");
  panel.id = "hearth-visual-panel";
  panel.style.cssText = [
    "position:fixed",
    "right:12px",
    "bottom:12px",
    "z-index:2147483647",
    "display:flex",
    "gap:6px",
    "align-items:center",
    "padding:8px",
    "background:rgba(20,16,12,0.88)",
    "border:1px solid rgba(255,255,255,0.22)",
    "border-radius:8px",
    "box-shadow:0 8px 24px rgba(0,0,0,0.25)",
  ].join(";");
  const select = document.createElement("select");
  select.style.cssText = "max-width:300px;font:12px system-ui;padding:4px;";
  for (const scenario of api.list()) {
    const option = document.createElement("option");
    option.value = scenario.id;
    option.textContent = scenario.id;
    select.append(option);
  }
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Load";
  button.style.cssText = "font:12px system-ui;padding:4px 8px;";
  button.addEventListener("click", () => api.loadScenario(select.value));
  panel.append(select, button);
  document.body.append(panel);
}

export function installVisualTestingBridge({ getState, dispatch }: {
  getState: () => VisualStateLike | undefined;
  dispatch: Dispatch;
}): () => void {
  window.__HEARTH_VISUAL_TESTING__ = true;
  let readyResolve: ((value: boolean) => void) | undefined;
  const ready = new Promise<boolean>((resolve) => { readyResolve = resolve; });

  const api = {
    ready,
    list: listVisualScenarios,
    state: () => getState(),
    async dispatch(action: Parameters<Dispatch>[0]) {
      dispatch(action);
      await settleFrames();
      return getState();
    },
    async loadScenario(id: string) {
      if (demoAnimResetTimer != null) {
        clearTimeout(demoAnimResetTimer);
        demoAnimResetTimer = null;
      }
      const scenario = buildVisualScenario(id);
      const stateTree = { ...cloneState(scenario.stateTree as Record<string, unknown>), _visualScenarioId: id };
      if (scenario.hash) {
        window.history.replaceState(null, "", scenario.hash);
      } else {
        window.history.replaceState(null, "", "#/town");
      }
      window.__hearthVisualScenarioState = stateTree;
      dispatch({
        type: "VISUAL/LOAD_STATE",
        payload: { state: stateTree as unknown as import("../types/state.js").GameState },
      });
      document.documentElement.dataset.visualScenario = id;
      await settleFrames(4);
      applyBoardStateToScene(stateTree, { rebuildGrid: true });
      await settleFrames(2);
      const after = getState();
      return {
        id,
        view: after?.view,
        modal: after?.modal ?? null,
      };
    },
    click: (selector: string) => clickSelector(selector),
    hover: (selector: string) => hoverSelector(selector),
    // Drive entry into a town board (farm/mine/fish). The board-entry tiles are
    // Phaser canvas objects with no DOM affordance, so the harness can't click
    // them via a selector; this fires the same handler a real tap would.
    enterBoard: (args: { kind?: string } = {}) => {
      const enter = window.__hearthTownEnterBoard;
      if (typeof enter !== "function") return false;
      enter(args.kind ?? "farm");
      return true;
    },
    holdChain,
    playBoardAnimation: (opts: { name: string; tint?: unknown; pattern?: string }) => playBoardAnimation(opts, api),
    syncScene: () => applyBoardStateToScene(window.__hearthVisualScenarioState ?? getState()),
    freeze: freezeUi,
    selectorForTestId: (testId: string) => `[data-testid="${cssEscape(testId)}"]`,
  };

  // Cast: structural shape matches VisualBridgeApi, but TS doesn't infer that
  // through the freshly declared object literal.
  window.__hearthVisual = api as unknown as NonNullable<Window["__hearthVisual"]>;

  function onMessage(event: MessageEvent): void {
    const data = event.data as { type?: string; name?: string; tint?: unknown; pattern?: string; scenarioId?: string } | null;
    if (!data || typeof data !== "object") return;
    if (data.type === "HEARTH_PLAY_ANIMATION" && data.name) {
      try {
        playBoardAnimation({ name: data.name, tint: data.tint, pattern: data.pattern }, api);
      } catch (err) {
        console.warn("[hearthVisual] playBoardAnimation failed:", (err as Error)?.message);
      }
    } else if (data.type === "HEARTH_RELOAD_SCENARIO") {
      const id = data.scenarioId ?? document.documentElement.dataset.visualScenario;
      if (id) api.loadScenario(id).catch((err: unknown) => console.warn("[hearthVisual] reload failed:", (err as Error)?.message));
    }
  }
  window.addEventListener("message", onMessage);

  const params = new URLSearchParams(window.location.search);
  const scenarioId = params.get("visual");
  const shouldShowPanel = params.get("visualPanel") === "1";
  if (shouldShowPanel) installPanel(api);

  (async () => {
    if (scenarioId) await api.loadScenario(scenarioId);
    readyResolve?.(true);
  })().catch((error) => {
    readyResolve?.(false);
    setTimeout(() => { throw error; }, 0);
  });

  return () => {
    if (demoAnimResetTimer != null) clearTimeout(demoAnimResetTimer);
    window.removeEventListener("message", onMessage);
    delete window.__hearthVisual;
    delete window.__hearthVisualScenarioState;
    const panel = document.getElementById("hearth-visual-panel");
    panel?.remove();
  };
}
