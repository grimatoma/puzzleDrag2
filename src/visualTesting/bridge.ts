import { BOARD_ANIMATIONS, demoBoardAnimResetMs } from "../config/boardAnimations.js";
import { buildVisualScenario, listVisualScenarios } from "./scenarios.js";

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleFrames(count = 2) {
  for (let i = 0; i < count; i += 1) await nextFrame();
}

function cssEscape(value: any) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function cloneState(state: any) {
  if (typeof structuredClone === "function") return structuredClone(state);
  return JSON.parse(JSON.stringify(state));
}

function clickSelector(selector: any) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Visual click target not found: ${selector}`);
  el.scrollIntoView({ block: "center", inline: "center" });
  el.click();
  return true;
}

function hoverSelector(selector: any) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Visual hover target not found: ${selector}`);
  el.scrollIntoView({ block: "center", inline: "center" });
  for (const type of ["pointerover", "mouseover", "mouseenter"]) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: type !== "mouseenter", cancelable: true, view: window }));
  }
  return true;
}

function findChainTiles(scene: any, key: any, length: any) {
  const grid = scene?.grid ?? [];
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const seen = new Set();
  const path = [];

  function visit(row: any, col: any) {
    if (path.length >= length) return true;
    const id = `${row}:${col}`;
    if (seen.has(id)) return false;
    const tile = grid[row]?.[col];
    if (!tile || tile.res?.key !== key || tile.frozen || tile.rubble) return false;
    seen.add(id);
    path.push(tile);
    if (path.length >= length) return true;
    const dirs = [
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

async function holdChain({ key: any, length: any }) {
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

let demoAnimResetTimer = null;

/**
 * Demo-only: triggers a board animation on tiles selected by `pattern`.
 * Sweep nulls cells and runs collapse like real tools; all kinds reload the
 * scenario when the animation (and collapse, if any) finishes.
 */
function playBoardAnimation({ name: any, tint: any, pattern: any }, api: any) {
  const scene = window.__phaserScene;
  if (!scene?.grid?.length) throw new Error("Phaser scene is not ready for playBoardAnimation");
  const tiles = pickTilesForPattern(scene, pattern);
  if (!tiles.length) return { played: false, tileCount: 0 };

  const isSweep = BOARD_ANIMATIONS[name]?.kind === "fadeOut";
  if (isSweep) {
    tiles.forEach((tile) => {
      if (scene.grid[tile.row]?.[tile.col] === tile) scene.grid[tile.row][tile.col] = null;
    });
    scene.playBoardAnimation(name, tiles, { tint });
    scene.time?.delayedCall?.(240, () => scene.collapseBoard?.());
  } else {
    scene.playBoardAnimation(name, tiles, { tint });
  }

  if (demoAnimResetTimer != null) clearTimeout(demoAnimResetTimer);
  const resetMs = demoBoardAnimResetMs(name, tiles.length);
  demoAnimResetTimer = setTimeout(() => {
    demoAnimResetTimer = null;
    const id = document.documentElement.dataset.visualScenario;
    if (id) api.loadScenario(id).catch((err: any) => console.warn("[hearthVisual] demo reload failed:", err.message));
  }, resetMs);

  return { played: true, tileCount: tiles.length, pattern: pattern ?? "all" };
}

function pickTilesForPattern(scene: any, pattern: any) {
  const rows = scene.grid.length;
  const cols = scene.grid[0]?.length ?? 0;
  const all = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = scene.grid[r]?.[c];
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
      const t = scene.grid[cr]?.[cc];
      return t ? [t] : [];
    }
    case "all":
    default:
      return all;
  }
}

function applyBoardStateToScene(state: any, { rebuildGrid = false } = {}) {
  const scene = window.__phaserScene;
  if (!scene || state?.view !== "board") return false;
  scene.registry.set("biomeKey", state.biomeKey ?? state.biome ?? "farm");
  scene.registry.set("turnsUsed", state.turnsUsed ?? 0);
  scene.registry.set("turnBudget", state.farmRun?.turnBudget ?? null);
  scene.registry.set("activeZone", state.activeZone ?? state.mapCurrent ?? "home");
  scene.registry.set("tileCollectionActive", state.tileCollection?.activeByCategory ?? null);
  scene.registry.set("boss", state.boss ?? null);
  scene.registry.set("toolPending", state.toolPending ?? null);
  scene.registry.set("toolPendingPower", state.toolPendingPower ?? null);
  scene.registry.set("hazardFire", state.hazards?.fire ?? null);
  scene.registry.set("hazardRats", state.hazards?.rats ?? null);
  if (Array.isArray(state.grid)) {
    scene.registry.set("grid", state.grid);
    if (rebuildGrid && typeof scene.rebuildGridFromState === "function") {
      scene.rebuildGridFromState(state.grid);
    } else {
      scene._applyGridFromState?.(state.grid);
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
  const scene = window.__phaserScene;
  scene?.tweens?.pauseAll?.();
  if (scene?.time) {
    scene.time.timeScale = 0;
    scene.time.paused = true;
  }
  scene?.sys?.game?.loop?.sleep?.();
  return true;
}

function installPanel(api: any) {
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

export function installVisualTestingBridge({ getState: any, dispatch: any }) {
  window.__HEARTH_VISUAL_TESTING__ = true;
  let readyResolve;
  const ready = new Promise((resolve) => { readyResolve = resolve; });

  const api = {
    ready,
    list: listVisualScenarios,
    state: () => getState(),
    async dispatch(action: any) {
      dispatch(action);
      await settleFrames();
      return getState();
    },
    async loadScenario(id: any) {
      if (demoAnimResetTimer != null) {
        clearTimeout(demoAnimResetTimer);
        demoAnimResetTimer = null;
      }
      const scenario = buildVisualScenario(id);
      const stateTree = { ...cloneState(scenario.stateTree), _visualScenarioId: id };
      if (scenario.hash) {
        window.history.replaceState(null, "", scenario.hash);
      } else {
        window.history.replaceState(null, "", "#/town");
      }
      window.__hearthVisualScenarioState = stateTree;
      dispatch({ type: "VISUAL/LOAD_STATE", payload: { id, state: stateTree } });
      document.documentElement.dataset.visualScenario = id;
      await settleFrames(4);
      applyBoardStateToScene(stateTree, { rebuildGrid: true });
      await settleFrames(2);
      return {
        id,
        view: getState()?.view,
        modal: getState()?.modal ?? null,
      };
    },
    click: (selector: any) => clickSelector(selector),
    hover: (selector: any) => hoverSelector(selector),
    holdChain,
    playBoardAnimation: (opts: any) => playBoardAnimation(opts, api),
    syncScene: () => applyBoardStateToScene(window.__hearthVisualScenarioState ?? getState()),
    freeze: freezeUi,
    selectorForTestId: (testId: any) => `[data-testid="${cssEscape(testId)}"]`,
  };

  window.__hearthVisual = api;

  function onMessage(event: any) {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "HEARTH_PLAY_ANIMATION") {
      try {
        playBoardAnimation({ name: data.name, tint: data.tint, pattern: data.pattern }, api);
      } catch (err) {
        console.warn("[hearthVisual] playBoardAnimation failed:", err.message);
      }
    } else if (data.type === "HEARTH_RELOAD_SCENARIO") {
      const id = data.scenarioId ?? document.documentElement.dataset.visualScenario;
      if (id) api.loadScenario(id).catch((err) => console.warn("[hearthVisual] reload failed:", err.message));
    }
  }
  window.addEventListener("message", onMessage);

  const params = new URLSearchParams(window.location.search);
  const scenarioId = params.get("visual");
  const shouldShowPanel = params.get("visualPanel") === "1";
  if (shouldShowPanel) installPanel(api);

  (async () => {
    if (scenarioId) await api.loadScenario(scenarioId);
    readyResolve(true);
  })().catch((error) => {
    readyResolve(false);
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
