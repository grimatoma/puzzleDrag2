import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { COLS, ROWS, TILE, SCENE_EVENTS, SEASONS, dayKeyForDate } from "./src/constants.js";
import { runSelfTests, currentCap } from "./src/utils.js";
import { gameReducer, initialState } from "./src/state.js";
import type Phaser from "phaser";
import type { GameScene } from "./src/GameScene.js";
import type { GameState, Grid, Action as GameAction, ChainCollectedPayload } from "./src/types/state.js";
import type { ChainInfo, RuntimeTool } from "./src/ui/puzzleBoard.jsx";
import { Hud, TideChip } from "./src/ui/Hud.jsx";
import { TownView } from "./src/ui/Town.jsx";
import { warmMapScene } from "./src/features/cartography/PhaserMap.jsx";
import { NpcBubble, StoryModal } from "./src/ui/Modals.jsx";
import LevelUpCinematic from "./src/ui/LevelUpCinematic.jsx";
import BossCinematic from "./src/ui/BossCinematic.jsx";
import RewardChipsLayer from "./src/ui/RewardChipsLayer.jsx";
import { useViewDirection } from "./src/ui/primitives/useViewDirection.js";
import { BottomNav, FeatureModals, FeatureScreens } from "./src/ui.jsx";
import { useAudio } from "./src/audio/useAudio.js";
import { useRouter } from "./src/router.js";
import { setPhaserScene } from "./src/phaserBridge.js";
import { setRegistry, type FireHazardPayload } from "./src/types/phaserRegistry.js";
import type { ToolKey } from "./src/types/catalogKeys.js";
import { emitBurst } from "./src/ui/rewardEvents.js";
import { FIRE_HAZARD_ENABLED } from "./src/featureFlags.js";
import { useNotifier } from "./src/ui/primitives/Toast.jsx";
import { useA11yBridge } from "./src/a11y.js";
import { useCapToasts } from "./src/ui/useCapToasts.jsx";
import { seasonIndexInSession } from "./src/features/zones/data.js";
import { zoneInventory } from "./src/state/zoneInventory.js";
import { dismissBootSplash } from "./src/bootSplash.js";
import {
  BoardFrame,
  BoardLayout,
  PuzzleActionPanel,
  PuzzleHotbar,
  PuzzleToolGrid,
  PuzzleToolModal,
  SeasonIndicator,
  usePinnedTools,
  useMaxFitPins,
  useToolDrag,
  DragGhost,
} from "./src/ui/puzzleBoard.jsx";
import { TOOL_BY_KEY, isTapTargetTool } from "./src/ui/toolRegistry.js";

// The shared window augmentation lives in src/visualTesting/global.d.ts so
// every module agrees on the shape of __phaserScene and friends.

/** Phaser.Game instance with board sleep/wake bookkeeping from prototype. */
interface HearthPhaserGame extends Phaser.Game {
  __boardRuntimeActive?: boolean;
  __resizeObserver?: ResizeObserver;
}

/** Canvas-local coords for REWARD_BURST → RewardChipsLayer. */
interface RewardBurstPayload {
  canvasX: number;
  canvasY: number;
  canvasW: number;
  canvasH: number;
  coins: number;
}

function BoardSkeleton() {
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      role="status"
      aria-label="Loading board"
    >
      <div
        className="grid gap-[6px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: COLS * ROWS }, (_, i) => (
          <div
            key={i}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-iron-deep/30 animate-pulse"
            style={{ animationDelay: `${(i % COLS) * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function setBoardRuntimeActive(game: HearthPhaserGame | null, active: boolean): void {
  if (!game || game.__boardRuntimeActive === active) return;
  const scene = game.scene?.getScene?.("GameScene") ?? game.scene?.scenes?.[0];
  if (!scene) return;
  if (active) game.scene.wake("GameScene");
  else game.scene.sleep("GameScene");
  game.__boardRuntimeActive = active;
}

interface PhaserMountProps {
  dispatch: React.Dispatch<GameAction>;
  biomeKey: GameState["biomeKey"];
  turnsUsed: GameState["turnsUsed"];
  uiLocked: boolean;
  boardActive: boolean;
  sceneRef: React.MutableRefObject<GameScene | null>;
  toolPending: GameState["toolPending"];
  toolPendingPower: GameState["toolPendingPower"];
  setChainInfo: (info: ChainInfo | null) => void;
  workers: GameState["workers"];
  tileCollection: GameState["tileCollection"];
  gameState: GameState;
  grid: Grid;
  /** Fired once the board's Phaser engine has booted (the heavy load is done). */
  onReady?: () => void;
}

function PhaserMount({ dispatch, biomeKey, turnsUsed, uiLocked, boardActive, sceneRef, toolPending, toolPendingPower, setChainInfo, workers, tileCollection, gameState, grid, onReady }: PhaserMountProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HearthPhaserGame | null>(null);
  const [loading, setLoading] = useState(true);
  const notifier = useNotifier();
  const notifierRef = useRef(notifier);
  useEffect(() => { notifierRef.current = notifier; }, [notifier]);
  // Keep a ref so postBoot (a stale closure) can read the *current* boardActive
  // rather than the value captured at mount — which is always false because view
  // starts as "town" and the router hasn't fired yet when Phaser initialises.
  const boardActiveRef = useRef(boardActive);
  useEffect(() => { boardActiveRef.current = boardActive; }, [boardActive]);
  // postBoot is a stale closure (the mount effect runs once); read onReady
  // through a ref so we always call the latest callback.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    // Dev-only smoke check. Its invariants assume a pristine state, but
    // createInitialState() restores from localStorage — so on a returning
    // player's save (e.g. an active farm run) it logs a misleading
    // console.assert. Gate to dev so production consoles stay clean.
    if (import.meta.env.DEV) runSelfTests();
    const host = hostRef.current;
    // Render the canvas at the device pixel ratio so tiles aren't bilinearly
    // upscaled by the browser on retina/mobile screens. The game's internal
    // coordinates are in *device pixels* (canvas backing-store space); CSS
    // sizing is applied separately on the canvas element.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = host.clientWidth || COLS * TILE + 80;
    const cssH = host.clientHeight || ROWS * TILE + 80;

    // Guards the async-boot race: if the component unmounts while phaser is
    // still dynamically importing, the cleanup below runs while gameRef is null,
    // then the game is created afterward and never destroyed. `cancelled` lets
    // the boot bail (or tear the game back down) so no orphaned WebGL context
    // leaks.
    let cancelled = false;
    (async () => {
      try {
        const [{ default: Phaser }, { GameScene }] = await Promise.all([
          import("phaser"),
          import("./src/GameScene.js"),
        ]);
        if (cancelled || !hostRef.current) return; // unmounted/cancelled while loading
        gameRef.current = new Phaser.Game({
          type: Phaser.AUTO,
          width: cssW * dpr,
          height: cssH * dpr,
          parent: host,
          backgroundColor: "#e9dfc6",
          scene: GameScene,
          // zoom = 1/dpr makes canvas.style display at CSS size while the
          // backing store stays at gameSize (cssSize × dpr).
          scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER, zoom: 1 / dpr },
          // pixelArt would otherwise default to true whenever scale.zoom != 1,
          // which forces nearest-neighbor sampling and breaks our crisp tiles.
          render: { antialias: true, antialiasGL: true, roundPixels: false, pixelArt: false, powerPreference: "high-performance" },
          // windowEvents: false stops Phaser from processing mousedown / touchstart
          // it sees on the *window* — without it, a tap on a React overlay above the
          // canvas (the tool dropdown's click-blocker, modals, etc.) still gets
          // routed into the scene's input pipeline and starts a chain on whichever
          // tile sits under the touch. GameScene already adds document-level
          // pointerup/touchend listeners to end the path, so we don't need Phaser's
          // POINTER_UP_OUTSIDE fallback.
          input: { activePointers: 3, windowEvents: false },
          // Disable Phaser's WebAudioSoundManager — we use our own Web Audio
          // implementation in src/audio/. Without this, Phaser creates an
          // AudioContext at boot (before user gesture), triggering the browser's
          // "AudioContext was not allowed to start" warning.
          audio: { noAudio: true },
          callbacks: {
            preBoot: (game: HearthPhaserGame) => {
              setRegistry(game.registry, "biomeKey", biomeKey);
              setRegistry(game.registry, "turnsUsed", turnsUsed);
              setRegistry(game.registry, "turnBudget", gameState?.farmRun?.turnBudget ?? null);
              setRegistry(game.registry, "uiLocked", uiLocked);
              setRegistry(game.registry, "dpr", dpr);
              setRegistry(game.registry, "renderResolution", dpr);
              // Set before GameScene.create() so the initial fillBoard uses the
              // player's active tile selections instead of the raw base pool.
              setRegistry(game.registry, "tileCollectionActive", tileCollection?.activeByCategory ?? null);
              // Phase 2 — seed the session-selected tile categories so the
              // first fillBoard after preBoot honours the player's modal pick.
              setRegistry(game.registry, "sessionSelectedTiles", (gameState?.session?.selectedTiles ?? []) as readonly string[]);
              // Phase 3 — seed the active zone for the chain-upgrade redirect.
              setRegistry(game.registry, "activeZone", gameState?.activeZone ?? gameState?.mapCurrent ?? "home");
              // Seed the board-regen nonce so the first React sync below sets
              // the same value (no changedata event) — a save-restore mount
              // must NOT trigger a regenerate over the restored board.
              setRegistry(game.registry, "newBoardNonce", gameState?._boardNonce ?? 0);
              // Reload restoration: pass the saved board grid so GameScene can
              // apply it over the initial random fill when continuing a session.
              if ((gameState?.farmRun?.turnsRemaining ?? 0) > 0) {
                setRegistry(game.registry, "boardRestoreGrid", gameState.grid ?? null);
              }
            },
            postBoot: (game: HearthPhaserGame) => {
              // Track host CSS-size changes and resize the game's backing
              // store to match cssSize × dpr; ScaleManager.zoom keeps the
              // canvas displayed at cssSize.
              const ro = new ResizeObserver(() => {
                const w = host.clientWidth;
                const h = host.clientHeight;
                if (!w || !h) return;
                game.scale.resize(w * dpr, h * dpr);
              });
              ro.observe(host);
              game.__resizeObserver = ro;

              const scene = game.scene.scenes[0] as GameScene;
              sceneRef.current = scene;
              setPhaserScene(scene);
              if (typeof window !== "undefined") window.__phaserScene = scene;
              scene.events.on(SCENE_EVENTS.CHAIN_COLLECTED, (payload: ChainCollectedPayload) =>
                dispatch({ type: "CHAIN_COLLECTED", payload }),
              );
              scene.events.on(SCENE_EVENTS.FERTILIZER_CONSUMED, () => dispatch({ type: "FERTILIZER/CONSUMED" }));
              scene.events.on(SCENE_EVENTS.GRID_SYNC, ({ grid: g }: { grid: Grid }) => dispatch({ type: "GRID/SYNC", payload: { grid: g } }));
              scene.events.on(SCENE_EVENTS.CHAIN_UPDATE, (data: ChainInfo | null) => setChainInfo(data));
              scene.events.on(SCENE_EVENTS.CHAIN_FLOAT_TEXT, ({ text }: { text: string }) => {
                const t = notifierRef.current?.toast as ((opts: { text: string; tone?: string; duration?: number }) => void) | undefined;
                t?.({ text, tone: "moss", duration: 1600 });
              });
              scene.events.on(SCENE_EVENTS.TOOL_FIRED, ({ key, row, col }: { key: string; row: number; col: number }) =>
                dispatch({ type: "TOOL_FIRED", key: key as ToolKey, row, col }),
              );
              scene.events.on(SCENE_EVENTS.CARE_PACKAGE_OPENED, () => dispatch({ type: "CIVIC/OPEN_CARE_PACKAGE" }));
              scene.events.on(SCENE_EVENTS.REWARD_BURST, (data: RewardBurstPayload) => {
                const canvas = scene?.game?.canvas;
                if (!canvas || !data.coins) return;
                const rect = canvas.getBoundingClientRect();
                const w = data.canvasW || rect.width || 1;
                const h = data.canvasH || rect.height || 1;
                const pageX = rect.left + (data.canvasX / w) * rect.width;
                const pageY = rect.top + (data.canvasY / h) * rect.height;
                emitBurst({ pageX, pageY, coins: data.coins });
              });
              setBoardRuntimeActive(game, boardActiveRef.current);
              setLoading(false);
              onReadyRef.current?.();
            },
          },
        });
        // Unmounted during the synchronous-construct → boot window: tear it down.
        if (cancelled) {
          gameRef.current?.__resizeObserver?.disconnect();
          gameRef.current?.destroy(true);
          gameRef.current = null;
        }
      } catch (err) {
        console.error("Failed to load Phaser:", err);
        setLoading(false);
        onReadyRef.current?.();
      }
    })();

    return () => {
      cancelled = true;
      gameRef.current?.__resizeObserver?.disconnect();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
      setPhaserScene(null);
      if (typeof window !== "undefined") window.__phaserScene = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: Phaser game initialises once on mount; registry syncs handled by separate effects below

  // Sync React state → Phaser registry
  // Phase 2/3 — must precede the biomeKey sync so handleBiomeChange's first
  // fillBoard / chain-update call sees the up-to-date player tile selection
  // and active zone.
  useEffect(() => {
    setRegistry(gameRef.current?.registry, "sessionSelectedTiles", (gameState?.session?.selectedTiles ?? []) as readonly string[]);
  }, [gameState?.session?.selectedTiles]);
  useEffect(() => {
    setRegistry(gameRef.current?.registry, "activeZone", gameState?.activeZone ?? gameState?.mapCurrent ?? "home");
  }, [gameState?.activeZone, gameState?.mapCurrent]);
  useEffect(() => { setBoardRuntimeActive(gameRef.current, boardActive); }, [boardActive]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "biomeKey", biomeKey); }, [biomeKey]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "turnsUsed", turnsUsed); }, [turnsUsed]);
  // Phase 7.1 — atmospheric in-session season needs the active run's turn
  // budget alongside turnsUsed so GameScene.season() can pick the palette.
  useEffect(() => { setRegistry(gameRef.current?.registry, "turnBudget", gameState?.farmRun?.turnBudget ?? null); }, [gameState?.farmRun?.turnBudget]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "uiLocked", uiLocked); }, [uiLocked]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "toolPending", toolPending ?? null); }, [toolPending]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "toolPendingPower", toolPendingPower ?? null); }, [toolPendingPower]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "workers", workers ?? null); }, [workers]);
  const settingsHapticsOn = (gameState as GameState & { settings?: { hapticsOn?: boolean } }).settings?.hapticsOn;
  useEffect(() => {
    setRegistry(gameRef.current?.registry, "hapticsOn", settingsHapticsOn ?? true);
  }, [settingsHapticsOn]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "tileCollectionActive", tileCollection?.activeByCategory ?? null); }, [tileCollection?.activeByCategory]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "tileCollectionDiscovered", tileCollection?.discovered ?? null); }, [tileCollection?.discovered]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "built", gameState?.built ?? null); }, [gameState?.built]);
  useEffect(() => { setRegistry(gameRef.current?.registry, "fillBiasTarget", gameState?.fillBiasTarget ?? null); }, [gameState?.fillBiasTarget]);
  useEffect(() => {
    sceneRef.current?._syncWorkerEffects();
  }, [sceneRef, workers, gameState?.built, gameState?.activeZone, gameState?.mapCurrent, tileCollection?.activeByCategory, tileCollection?.discovered]);
  // Sync grid state → Phaser registry so hazard engines see real tile keys
  useEffect(() => { setRegistry(gameRef.current?.registry, "grid", grid ?? null); }, [grid]);
  // Sync biomeRestored flag so GameScene.handleBiomeChange can skip randomize when savedField restored
  useEffect(() => { setRegistry(gameRef.current?.registry, "biomeRestored", gameState?._biomeRestored ?? false); }, [gameState?._biomeRestored]);
  // Civic economy: flag whether a care-package crate should seed on the next
  // board. Placed BEFORE the newBoardNonce sync so that when a Town Hall claim
  // bumps the nonce, this flag is already up-to-date when regenerateBoard runs.
  useEffect(() => {
    const pending = gameState?.civicEconomy?.pendingProvisions ?? {};
    setRegistry(gameRef.current?.registry, "carePackagePending", Object.keys(pending).length > 0);
  }, [gameState?.civicEconomy?.pendingProvisions]);
  // Sync the board-regen nonce. Placed after the biomeKey / activeZone /
  // sessionSelectedTiles / tileCollection effects so the scene's regenerate
  // (fired synchronously when this value changes) sees an up-to-date pool.
  useEffect(() => { setRegistry(gameRef.current?.registry, "newBoardNonce", gameState?._boardNonce ?? 0); }, [gameState?._boardNonce]);
  // Sync boss modifier flags so GameScene.fillBoard can apply spawnBias
  useEffect(() => { setRegistry(gameRef.current?.registry, "boss", gameState?.boss ?? null); }, [gameState?.boss]);
  // V.3 — Sync inventory and cap so GameScene.collectPath can compute actual gain for float text
  useEffect(() => { setRegistry(gameRef.current?.registry, "inventory", gameState?.inventory ?? {}); }, [gameState?.inventory]);
  // `currentCap` only reads built buildings, the active location, hired workers,
  // and the discovered/active tile selection (via computeAggregatedAbilities +
  // locBuilt). Depending on the whole `gameState` re-ran this heavy aggregation
  // on every dispatch (e.g. each chain tile mid-drag); narrow to its real inputs.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: deps are currentCap's real inputs, not the whole gameState
  useEffect(() => { setRegistry(gameRef.current?.registry, "inventoryCap", currentCap(gameState) ?? 200); }, [gameState?.built, gameState?.mapCurrent, workers, tileCollection?.discovered, tileCollection?.activeByCategory]);
  // Sync hazards.fire so GameScene.fillBoard can overlay fire tiles on the board
  useEffect(() => {
    const fire = FIRE_HAZARD_ENABLED ? (gameState?.hazards?.fire as FireHazardPayload | null | undefined) ?? null : null;
    setRegistry(gameRef.current?.registry, "hazardFire", fire);
  }, [gameState?.hazards?.fire]);
  // Sync hazards.rats so GameScene can render atmospheric mist
  useEffect(() => { setRegistry(gameRef.current?.registry, "hazardRats", gameState?.hazards?.rats ?? null); }, [gameState?.hazards?.rats]);
  // Sync magicFertilizerCharges so GameScene.fillBoard can apply the bias for each fill charge
  useEffect(() => { setRegistry(gameRef.current?.registry, "magicFertilizerCharges", gameState?.magicFertilizerCharges ?? 0); }, [gameState?.magicFertilizerCharges]);

  return (
    <div ref={hostRef} className="w-full h-full relative">
      {loading && <BoardSkeleton />}
    </div>
  );
}

const DUST_MOTES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 6.7) % 90}%`,
  delay: `${(i * 0.57) % 8}s`,
  duration: `${7 + (i * 0.41) % 4}s`,
  size: `${3 + (i * 0.29) % 4}px`,
  opacity: 0.18 + (i * 0.031) % 0.22,
}));

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const viewDirection = useViewDirection(state.view);
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [inspectedTool, setInspectedTool] = useState<RuntimeTool | null>(null);
  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [inventorySearchOpen, setInventorySearchOpen] = useState(false);
  // Stable identity so React.memo'd children (Hud) aren't re-rendered by an
  // inline arrow changing every render (e.g. on chainInfo-only updates mid-drag).
  const handleInventorySearchToggle = useCallback(() => setInventorySearchOpen((o) => !o), []);
  // Once the player has opened the town, keep its (expensive) Phaser canvas
  // mounted — hidden behind CSS — so returning to it is instant instead of a
  // full cold reboot. See TownPhaserCanvas's lazy boot / pause-resume handling.
  const [townEverOpened, setTownEverOpened] = useState(false);
  if (state.view === "town" && !townEverOpened) setTownEverOpened(true);
  // Background pre-warm: once the board is up and the player is idle, mount the
  // town (hidden) and warm the map engine so their *first* visit is instant
  // instead of a 1–2 s cold-boot blank. See the boardReady effect below.
  const [warmExtras, setWarmExtras] = useState(false);
  const keepTownMounted = state.view === "town" || townEverOpened || warmExtras;
  const [pins, pinActions] = usePinnedTools();
  const hotbarRef = useRef<HTMLDivElement>(null);
  const maxFitPins = useMaxFitPins(hotbarRef);
  const { drag, beginDrag } = useToolDrag({ pins, pinActions, maxFitPins });
  const sceneRef = useRef<GameScene | null>(null);
  const stateRef = useRef(state);
  // Initial loading screen — dismiss it (index.html → src/bootSplash) once the
  // Phaser engine behind the *initial* view has fully booted. The board engine
  // is always mounted so boardReady is a universal "engine up" signal; if we
  // boot straight into town, also wait for the town canvas's first paint.
  const [boardReady, setBoardReady] = useState(false);
  const [townReady, setTownReady] = useState(false);
  const startedInTownRef = useRef(state.view === "town");
  useEffect(() => {
    if (boardReady && (!startedInTownRef.current || townReady)) dismissBootSplash();
  }, [boardReady, townReady]);
  // Background pre-warm of the town & map engines. Each is a separate Phaser
  // instance that cold-boots and bakes all of its own textures on first visit —
  // the source of the 1–2 s blank when first entering town or the map. Once the
  // board is up, wait for the browser to go idle (so we don't compete with the
  // board's own first paint / the player's first interactions), then mount the
  // town hidden+warm and warm the map into its offscreen stash. Both are
  // one-shot and guarded internally, so this only ever pays the cost once.
  useEffect(() => {
    if (!boardReady || warmExtras) return undefined;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const w = (typeof window !== "undefined" ? window : undefined) as IdleWindow | undefined;
    let idleHandle: number | undefined;
    let timerHandle: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      setWarmExtras(true);
      void warmMapScene();
    };
    if (w?.requestIdleCallback) {
      idleHandle = w.requestIdleCallback(run, { timeout: 4000 });
    } else {
      timerHandle = setTimeout(run, 1200);
    }
    return () => {
      if (idleHandle !== undefined) w?.cancelIdleCallback?.(idleHandle);
      if (timerHandle !== undefined) clearTimeout(timerHandle);
    };
  }, [boardReady, warmExtras]);
  const storyModalOpen = !!state.story?.queuedBeat;
  const armedTool = state.toolPending ? state.tools ? { key: state.toolPending, count: state.tools[state.toolPending] ?? 0 } : null : null;
  const armedTapTarget = !!state.toolPending && isTapTargetTool(state.toolPending);
  const turnBudgetRaw = state.farmRun?.turnBudget;
  const turnBudget = typeof turnBudgetRaw === "number" ? turnBudgetRaw : 0;
  const seasonIdx = seasonIndexInSession(state.turnsUsed ?? 0, turnBudget || 1);
  const turnsUsed = state.turnsUsed ?? 0;
  const turnsRemaining = state.farmRun?.turnsRemaining ?? Math.max(0, turnBudget - turnsUsed);
  const season = SEASONS[seasonIdx];
  const showTide = state.biomeKey === "fish";
  const inspectedKey = inspectedTool?.key ?? state.toolPending ?? null;
  const dragTool = drag ? TOOL_BY_KEY[drag.key] : null;
  const dragToolWithCount = dragTool
    ? {
        ...dragTool,
        count: (() => {
          if (!drag?.key) return 0;
          const n = state.tools?.[drag.key];
          return typeof n === "number" ? n : 0;
        })(),
        armed: state.toolPending === drag?.key,
      }
    : null;
  // currentCap runs heavy aggregation (computeAggregatedAbilities + locBuilt);
  // memoize on its real inputs (built buildings, active location, workers,
  // discovered/active tile selection) so it doesn't re-run on every App render
  // (e.g. each chainInfo update mid-drag). Mirrors the registry-sync effect deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: deps are currentCap's real inputs, not whole state
  const cap = useMemo(() => currentCap(state) ?? 200, [state.built, state.mapCurrent, state.workers, state.tileCollection?.discovered, state.tileCollection?.activeByCategory]);
  const infoPanelEl = (
    <PuzzleActionPanel
      chainInfo={chainInfo}
      inspectedTool={inspectedTool}
      armedTool={armedTool}
      fillBiasArmed={!!(state.fillBiasTarget || (state.magicFertilizerCharges ?? 0) > 0)}
      inventory={zoneInventory(state)}
      biomeKey={state.biomeKey}
      cap={cap}
      dispatch={dispatch}
      onCloseInspect={() => setInspectedTool(null)}
    />
  );
  // Board top-chrome (leave button + season strip + tide) relocated out of the
  // shared HUD band so the board area can claim the full viewport height. In
  // landscape it sits atop the left rail; in portrait it spans the top.
  const boardRailHead = (
    <div className="flex items-center gap-2" data-testid="board-railhead">
      <button
        onClick={() => dispatch({ type: "OPEN_MODAL", modal: "leaveBoard" })}
        className="w-8 h-8 rounded-lg bg-paper-soft border-2 border-iron flex items-center justify-center text-ink-mid font-bold text-large flex-shrink-0 leading-none"
        data-testid="menu-btn"
        aria-label="Leave board"
        title="Leave board"
      >←</button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <SeasonIndicator
          turnsUsed={turnsUsed}
          turnBudget={turnBudget || 1}
          turnsRemaining={turnsRemaining}
          seasonIdx={seasonIdx}
          seasonName={season.name}
        />
        {showTide && (
          <TideChip fish={state.fish as React.ComponentProps<typeof TideChip>["fish"]} />
        )}
      </div>
    </div>
  );
  const uiLocked = !!state.modal || state.view !== "board" || storyModalOpen;
  useAudio(state);
  useCapToasts(state);
  useRouter(state, dispatch);
  useA11yBridge();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // When a chain drag ends (chainInfo goes null) and no tool is armed, reset the
  // inspected tool so the panel returns to the idle resources view by default.
  useEffect(() => {
    if (!chainInfo && !state.toolPending) {
      setTimeout(() => setInspectedTool(null), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only react to chain end, not every toolPending change
  }, [chainInfo]);

  // When an armed tool fires (or is cancelled) — toolPending goes from set →
  // null — drop the inspected tool too so the info card swaps from
  // "Tool ready" back to the resources stockpile.
  const prevToolPendingRef = useRef(state.toolPending);
  useEffect(() => {
    const wasArmed = prevToolPendingRef.current != null;
    prevToolPendingRef.current = state.toolPending;
    if (wasArmed && !state.toolPending && !chainInfo) {
      setInspectedTool(null);
    }
  }, [state.toolPending, chainInfo]);

  useEffect(() => {
    // While the project is in active development we deploy as effectively dev
    // (the visual bridge powers the Dev Panel's Animations Demo iframe,
    // and other dev tools rely on it). Re-add the env gate when prod deploys
    // should exclude the bridge.
    let cleanup: (() => void) | undefined;
    let active = true;
    import("./src/visualTesting/bridge.js").then(({ installVisualTestingBridge }) => {
      if (!active) return;
      cleanup = installVisualTestingBridge({
        getState: () => stateRef.current,
        dispatch,
      });
    });
    return () => {
      active = false;
      cleanup?.();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!import.meta.env.DEV && import.meta.env.MODE !== "test") return undefined;
    let cleanup: (() => void) | undefined;
    let active = true;
    import("./src/ui/primitives/truncationDetector.js").then(({ startTruncationDetector }) => {
      if (!active) return;
      cleanup = startTruncationDetector();
    });
    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  // Fire session_start story beat on first mount
  useEffect(() => {
    dispatch({ type: "SESSION_START" });
  }, [dispatch]);

  // Daily login-streak tick — fires once per app mount; the reducer is
  // idempotent per local day (state.ts LOGIN_TICK), so re-mounts (incl.
  // StrictMode's double-invoke) within the same day are no-ops. Uses the
  // local-day key helper from constants.
  useEffect(() => {
    dispatch({ type: "LOGIN_TICK", payload: { today: dayKeyForDate(new Date()) } });
  }, [dispatch]);

  useEffect(() => {
    if (state.view !== "inventory") {
      setTimeout(() => setInventorySearchOpen(false), 0);
    }
  }, [state.view]);

  useEffect(() => {
    if (state.pendingReload) window.location.reload();
  }, [state.pendingReload]);

  return (
    <div data-visual-root="app" className="h-full w-full bg-[#e9dfc6] text-[#2b2218] grid place-items-center" style={{ position: "relative", overflow: "hidden" }}>
      {/* Ambient dust motes — behind all chrome */}
      {DUST_MOTES.map((m) => (
        <div
          key={m.id}
          style={{
            position: "absolute",
            left: m.left,
            bottom: 0,
            width: m.size,
            height: m.size,
            borderRadius: "50%",
            background: "#f6efe0",
            opacity: m.opacity,
            pointerEvents: "none",
            animation: `dustfloat ${m.duration} ${m.delay} infinite ease-in-out`,
            zIndex: 0,
          }}
        />
      ))}

      <div
        data-testid="app-shell"
        className="hl-app-shell relative w-full max-w-[1280px] aspect-[5/4] max-h-[100dvh] max-[1024px]:aspect-auto max-[1024px]:max-h-none max-[1024px]:w-full max-[1024px]:h-full max-[1024px]:max-w-none bg-[#f4ecd6] rounded-2xl max-[1024px]:rounded-none overflow-hidden shadow-2xl border border-[#c9b993] flex flex-col"
        style={{ zIndex: 1 }}
      >
        {/* HUD bar — hidden on the board so the puzzle claims the full
            height; the board's leave button + season strip live in the
            BoardLayout rail head instead. */}
        {state.view !== "board" && (
          <Hud
            state={state}
            dispatch={dispatch}
            inventorySearchOpen={inventorySearchOpen}
            onInventorySearchToggle={handleInventorySearchToggle}
          />
        )}

        {/* Main area: board + side panel, or town view */}
        <div className="flex-1 min-h-0 relative">
          {/* Board layout — single Phaser mount, CSS-grid template-areas
              reshape the surrounding chrome between portrait (vertical
              stack) and landscape ≥500px (status + tools-grid on left,
              board on right). Always mounted to keep Phaser alive; hidden
              when in town view. */}
          <div className={`absolute inset-0 ${state.view === "board" ? "" : "invisible"}`}>
            <BoardLayout
              // Gate on the board view: the board host stays mounted (hidden)
              // on other views, so rendering the rail head only when active
              // keeps a single menu-btn / season strip in the DOM at a time.
              railHead={state.view === "board" ? boardRailHead : null}
              hotbar={
                // zIndex elevates the hotbar (and its absolute-positioned
                // dropdown / backdrop children) above the board area so the
                // dropdown's click-blocker actually intercepts touches.
                <div ref={hotbarRef} className="relative" style={{ zIndex: 50 }}>
                  <PuzzleHotbar
                    state={state}
                    dispatch={dispatch}
                    onInspectChange={setInspectedTool}
                    inspectedKey={inspectedKey}
                    pins={pins}
                    onOpenModal={() => setToolModalOpen((o) => !o)}
                    modalOpen={toolModalOpen}
                    maxFitPins={maxFitPins}
                    dragKey={drag?.key ?? null}
                    dragFromHotbar={drag?.fromHotbar ?? null}
                    onBeginDrag={beginDrag}
                  />
                  {/* Tools dropdown — anchored to the hotbar so it floats
                      over the board area without covering the hotbar or HUD. */}
                  {state.view === "board" && (
                    <PuzzleToolModal
                      open={toolModalOpen}
                      onClose={() => setToolModalOpen(false)}
                      state={state}
                      dispatch={dispatch}
                      pins={pins}
                      inspectedTool={inspectedTool}
                      onInspectChange={setInspectedTool}
                      dragKey={drag?.key ?? null}
                      dragFromHotbar={drag?.fromHotbar ?? null}
                      onBeginDrag={beginDrag}
                    />
                  )}
                </div>
              }
              statusPanel={infoPanelEl}
              toolsGrid={
                <PuzzleToolGrid
                  state={state}
                  dispatch={dispatch}
                  onInspectChange={setInspectedTool}
                  inspectedKey={inspectedKey}
                />
              }
              board={
                <BoardFrame seasonIdx={seasonIdx} armed={armedTapTarget}>
                  <PhaserMount
                    dispatch={dispatch}
                    biomeKey={state.biomeKey}
                    turnsUsed={state.turnsUsed}
                    uiLocked={uiLocked}
                    boardActive={state.view === "board"}
                    sceneRef={sceneRef}
                    toolPending={state.toolPending}
                    toolPendingPower={state.toolPendingPower}
                    setChainInfo={setChainInfo}
                    workers={state.workers}
                    tileCollection={state.tileCollection}
                    gameState={state}
                    grid={state.grid}
                    onReady={() => setBoardReady(true)}
                  />
                </BoardFrame>
              }
            />
          </div>

          {/* Town overlay — covers exactly the same area as the board. Kept
              mounted (hidden) after first open so the Phaser town doesn't have
              to cold-boot on every visit. */}
          {keepTownMounted && (
            <div
              className={`absolute inset-0 z-20 ${state.view === "town" ? "view-enter-down" : "hidden"}`}
              aria-hidden={state.view !== "town"}
            >
              <TownView state={state} dispatch={dispatch} active={state.view === "town"} warm={warmExtras} onReady={() => setTownReady(true)} />
            </div>
          )}

          {/* Feature full-screen views */}
          <FeatureScreens
            state={state}
            dispatch={dispatch}
            inventorySearchOpen={inventorySearchOpen}
            onInventorySearchToggle={handleInventorySearchToggle}
            viewDirection={viewDirection}
          />
        </div>

        {/* Bottom nav — hidden on the main game board */}
        {state.view !== "board" && (
          <BottomNav view={state.view} dispatch={dispatch} state={state} />
        )}

        {/* NPC bubble */}
        <NpcBubble bubble={state.bubble} dispatch={dispatch} />

        {/* Level-up cinematic — fires when state.level increases. */}
        <LevelUpCinematic state={state} />

        {/* Boss encounter pre-roll — vignette + ember flash + camera
            shake just as the boss modal slides up. */}
        <BossCinematic state={state} />

        {/* Reward chips — fly from chain center on the canvas to the HUD
            coin pill when a chain collects. Hooked via scene event +
            module event bus in src/ui/rewardEvents.js. */}
        <RewardChipsLayer />

        {/* Run summary now owns the season-end recap (see features/runSummary). */}

        {/* Story modal — highest z-index, blocks all interaction */}
        <StoryModal state={state} dispatch={dispatch} />

        {/* Feature modals */}
        <FeatureModals state={state} dispatch={dispatch} />

        {/* Drag ghost — floats above everything while a hotbar drag is
            in-flight so the player can see the tool moving with their finger. */}
        <DragGhost drag={drag} tool={dragToolWithCount} />
      </div>
    </div>
  );
}
