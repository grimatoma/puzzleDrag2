import { useEffect, useReducer, useRef, useState } from "react";
import { COLS, ROWS, TILE, SCENE_EVENTS } from "./src/constants.js";
import { runSelfTests, currentCap } from "./src/utils.js";
import { gameReducer, initialState } from "./src/state.js";
import { Hud } from "./src/ui/Hud.jsx";
import { MobileDock, PortraitToolsBar } from "./src/ui/Tools.jsx";
import { TownView } from "./src/ui/Town.jsx";
import { NpcBubble, StoryModal } from "./src/ui/Modals.jsx";
import { SidePanel, BottomNav, FeatureModals, FeatureScreens } from "./src/ui.jsx";
import { useAudio } from "./src/audio/useAudio.js";
import { useRouter } from "./src/router.js";
import { setPhaserScene } from "./src/phaserBridge.js";
import { FIRE_HAZARD_ENABLED } from "./src/featureFlags.js";
import { useNotifier } from "./src/ui/primitives/Toast.jsx";
import { useA11yBridge } from "./src/a11y.js";

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

function setBoardRuntimeActive(game, active) {
  if (!game || game.__boardRuntimeActive === active) return;
  const scene = game.scene?.getScene?.("GameScene") ?? game.scene?.scenes?.[0];
  if (!scene) return;
  if (active) game.scene.wake("GameScene");
  else game.scene.sleep("GameScene");
  game.__boardRuntimeActive = active;
}

function PhaserMount({ dispatch, biomeKey, turnsUsed, uiLocked, boardActive, sceneRef, toolPending, setChainInfo, workers, tileCollection, gameState, grid }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const notifier = useNotifier();
  const notifierRef = useRef(notifier);
  useEffect(() => { notifierRef.current = notifier; }, [notifier]);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    runSelfTests();
    const host = hostRef.current;
    // Render the canvas at the device pixel ratio so tiles aren't bilinearly
    // upscaled by the browser on retina/mobile screens. The game's internal
    // coordinates are in *device pixels* (canvas backing-store space); CSS
    // sizing is applied separately on the canvas element.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = host.clientWidth || COLS * TILE + 80;
    const cssH = host.clientHeight || ROWS * TILE + 80;

    (async () => {
      try {
        const [{ default: Phaser }, { GameScene }] = await Promise.all([
          import("phaser"),
          import("./src/GameScene.js"),
        ]);
        if (!hostRef.current) return; // unmounted while loading
        gameRef.current = new Phaser.Game({
          type: Phaser.AUTO,
          width: cssW * dpr,
          height: cssH * dpr,
          parent: host,
          backgroundColor: "#75b94a",
          scene: GameScene,
          // zoom = 1/dpr makes canvas.style display at CSS size while the
          // backing store stays at gameSize (cssSize × dpr).
          scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER, zoom: 1 / dpr },
          // pixelArt would otherwise default to true whenever scale.zoom != 1,
          // which forces nearest-neighbor sampling and breaks our crisp tiles.
          render: { antialias: true, antialiasGL: true, roundPixels: false, pixelArt: false, powerPreference: "high-performance" },
          input: { activePointers: 3 },
          callbacks: {
            preBoot: (game) => {
              game.registry.set("biomeKey", biomeKey);
              game.registry.set("turnsUsed", turnsUsed);
              game.registry.set("turnBudget", gameState?.farmRun?.turnBudget ?? null);
              game.registry.set("uiLocked", uiLocked);
              game.registry.set("dpr", dpr);
              game.registry.set("renderResolution", dpr);
              // Set before GameScene.create() so the initial fillBoard uses the
              // player's active tile selections instead of the raw base pool.
              game.registry.set("tileCollectionActive", tileCollection?.activeByCategory ?? null);
              // Phase 2 — seed the session-selected tile categories so the
              // first fillBoard after preBoot honours the player's modal pick.
              game.registry.set("sessionSelectedTiles", gameState?.session?.selectedTiles ?? []);
              // Phase 3 — seed the active zone for the chain-upgrade redirect.
              game.registry.set("activeZone", gameState?.activeZone ?? gameState?.mapCurrent ?? "home");
            },
            postBoot: (game) => {
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

              const scene = game.scene.scenes[0];
              sceneRef.current = scene;
              setPhaserScene(scene);
              if (typeof window !== "undefined") window.__phaserScene = scene;
              scene.events.on(SCENE_EVENTS.CHAIN_COLLECTED, (payload) => dispatch({ type: "CHAIN_COLLECTED", payload }));
              scene.events.on(SCENE_EVENTS.FERTILIZER_CONSUMED, () => dispatch({ type: "FERTILIZER/CONSUMED" }));
              scene.events.on(SCENE_EVENTS.GRID_SYNC, ({ grid: g }) => dispatch({ type: "GRID/SYNC", payload: { grid: g } }));
              scene.events.on(SCENE_EVENTS.CHAIN_UPDATE, (data) => setChainInfo(data));
              scene.events.on(SCENE_EVENTS.CHAIN_FLOAT_TEXT, ({ text }) => {
                notifierRef.current?.toast?.({ text, tone: "moss", duration: 1600 });
              });
              setBoardRuntimeActive(game, boardActive);
              setLoading(false);
            },
          },
        });
      } catch (err) {
        console.error("Failed to load Phaser:", err);
        setLoading(false);
      }
    })();

    return () => {
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
    gameRef.current?.registry.set("sessionSelectedTiles", gameState?.session?.selectedTiles ?? []);
  }, [gameState?.session?.selectedTiles]);
  useEffect(() => {
    gameRef.current?.registry.set("activeZone", gameState?.activeZone ?? gameState?.mapCurrent ?? "home");
  }, [gameState?.activeZone]);
  useEffect(() => { setBoardRuntimeActive(gameRef.current, boardActive); }, [boardActive]);
  useEffect(() => { gameRef.current?.registry.set("biomeKey", biomeKey); }, [biomeKey]);
  useEffect(() => { gameRef.current?.registry.set("turnsUsed", turnsUsed); }, [turnsUsed]);
  // Phase 7.1 — atmospheric in-session season needs the active run's turn
  // budget alongside turnsUsed so GameScene.season() can pick the palette.
  useEffect(() => { gameRef.current?.registry.set("turnBudget", gameState?.farmRun?.turnBudget ?? null); }, [gameState?.farmRun?.turnBudget]);
  useEffect(() => { gameRef.current?.registry.set("uiLocked", uiLocked); }, [uiLocked]);
  useEffect(() => { gameRef.current?.registry.set("toolPending", toolPending ?? null); }, [toolPending]);
  useEffect(() => { gameRef.current?.registry.set("workers", workers ?? null); }, [workers]);
  useEffect(() => { gameRef.current?.registry.set("hapticsOn", gameState?.settings?.hapticsOn ?? true); }, [gameState?.settings?.hapticsOn]);
  useEffect(() => { gameRef.current?.registry.set("tileCollectionActive", tileCollection?.activeByCategory ?? null); }, [tileCollection?.activeByCategory]);
  // Sync grid state → Phaser registry so hazard engines see real tile keys
  useEffect(() => { gameRef.current?.registry.set("grid", grid ?? null); }, [grid]);
  // Sync biomeRestored flag so GameScene.handleBiomeChange can skip randomize when savedField restored
  useEffect(() => { gameRef.current?.registry.set("biomeRestored", gameState?._biomeRestored ?? false); }, [gameState?._biomeRestored]);
  // Sync boss modifier flags so GameScene.fillBoard can apply spawnBias
  useEffect(() => { gameRef.current?.registry.set("boss", gameState?.boss ?? null); }, [gameState?.boss]);
  // Sync fertilizerActive so GameScene.fillBoard can bias seedling-tier resources
  useEffect(() => { gameRef.current?.registry.set("fertilizerActive", gameState?.fertilizerActive ?? false); }, [gameState?.fertilizerActive]);
  // V.3 — Sync inventory and cap so GameScene.collectPath can compute actual gain for float text
  useEffect(() => { gameRef.current?.registry.set("inventory", gameState?.inventory ?? {}); }, [gameState?.inventory]);
  useEffect(() => { gameRef.current?.registry.set("inventoryCap", currentCap(gameState) ?? 200); }, [gameState]);
  // Sync hazards.fire so GameScene.fillBoard can overlay fire tiles on the board
  useEffect(() => { gameRef.current?.registry.set("hazardFire", FIRE_HAZARD_ENABLED ? (gameState?.hazards?.fire ?? null) : null); }, [gameState?.hazards?.fire]);
  // Sync hazards.rats so GameScene can render atmospheric mist
  useEffect(() => { gameRef.current?.registry.set("hazardRats", gameState?.hazards?.rats ?? null); }, [gameState?.hazards?.rats]);
  // Sync magicFertilizerCharges so GameScene.fillBoard can apply the bias for each fill charge
  useEffect(() => { gameRef.current?.registry.set("magicFertilizerCharges", gameState?.magicFertilizerCharges ?? 0); }, [gameState?.magicFertilizerCharges]);

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
  const [chainInfo, setChainInfo] = useState(null);
  const sceneRef = useRef(null);
  const storyModalOpen = !!state.story?.queuedBeat;
  const uiLocked = !!state.modal || state.view !== "board" || storyModalOpen;
  useAudio(state);
  useRouter(state, dispatch);
  useA11yBridge();

  // Fire session_start story beat on first mount
  useEffect(() => {
    dispatch({ type: "SESSION_START" });
  }, [dispatch]);

  useEffect(() => {
    if (state.pendingReload) window.location.reload();
  }, [state.pendingReload]);

  return (
    <div className="h-full w-full bg-[#2a1d0f] text-[#2b2218] grid place-items-center" style={{ position: "relative", overflow: "hidden" }}>
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

      <div className="relative w-full max-w-[1280px] aspect-[5/4] max-h-[100dvh] max-[1024px]:aspect-auto max-[1024px]:max-h-none max-[1024px]:w-full max-[1024px]:h-full max-[1024px]:max-w-none bg-[#3a2715] rounded-2xl max-[1024px]:rounded-none overflow-hidden shadow-2xl border border-white/10 flex flex-col" style={{ zIndex: 1 }}>
        {/* HUD bar */}
        <Hud state={state} dispatch={dispatch} />

        {/* Main area: board + side panel, or town view */}
        <div className="flex-1 min-h-0 relative">
          {/* Board + side panel grid — always mounted to keep Phaser alive, hidden when in town view */}
          <div className={`absolute inset-0 flex flex-col ${state.view === "board" ? "" : "invisible"}`}>
            {/* Chain badge overlay for phone landscape — React handles it since Phaser badge gets clipped */}
            {chainInfo && (
              <div className="hidden max-[1024px]:landscape:block absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div className="bg-[#2b2218]/90 border border-[#ffd248] rounded-full px-3 py-1 text-[#ffd248] font-bold text-[12px] whitespace-nowrap">
                  chain × {chainInfo.count}{chainInfo.upgrades > 0 ? `  +${chainInfo.upgrades}★` : ""}
                  {chainInfo.nextTileProgress && chainInfo.nextTileProgress.threshold > 0 && (
                    <span className="ml-2 text-[10px] text-[#f8e7c6] font-normal">
                      ({chainInfo.nextTileProgress.current}/{chainInfo.nextTileProgress.threshold} {chainInfo.nextTileProgress.targetLabel})
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1 min-h-0 grid grid-cols-[1fr_300px] gap-3 p-3 max-[1024px]:grid-cols-1 max-[1024px]:gap-0 max-[1024px]:p-0">
              {/* Phaser host — takes the rest. Phaser draws its own background and frame. */}
              <div className="relative min-h-0 min-w-0 overflow-hidden">
                <PhaserMount
                  dispatch={dispatch}
                  biomeKey={state.biomeKey}
                  turnsUsed={state.turnsUsed}
                  uiLocked={uiLocked}
                  boardActive={state.view === "board"}
                  sceneRef={sceneRef}
                  toolPending={state.toolPending}
                  setChainInfo={setChainInfo}
                  workers={state.workers}
                  tileCollection={state.tileCollection}
                  gameState={state}
                  grid={state.grid}
                />
              </div>
              {/* Side panel — hidden on mobile, replaced by MobileDock */}
              <div className="min-h-0 max-[1024px]:hidden">
                <SidePanel state={state} dispatch={dispatch} chainInfo={chainInfo} />
              </div>
            </div>
            {/* Portrait phone tools bar — board is width-limited so canvas height can shrink */}
            <div className="hidden portrait:max-[1024px]:block flex-shrink-0">
              <PortraitToolsBar state={state} dispatch={dispatch} />
            </div>
            {/* Mobile dock — only visible on mobile, in board view */}
            <div className="hidden max-[1024px]:block flex-shrink-0">
              <MobileDock state={state} dispatch={dispatch} />
            </div>
          </div>

          {/* Town overlay — covers exactly the same area as the board */}
          {state.view === "town" && (
            <div className="absolute inset-0 z-20">
              <TownView state={state} dispatch={dispatch} />
            </div>
          )}

          {/* Feature full-screen views */}
          <FeatureScreens state={state} dispatch={dispatch} />
        </div>

        {/* Bottom nav — hidden on the main game board */}
        {state.view !== "board" && (
          <BottomNav view={state.view} modal={state.modal} dispatch={dispatch} state={state} />
        )}

        {/* NPC bubble */}
        <NpcBubble bubble={state.bubble} dispatch={dispatch} />

        {/* Run summary now owns the season-end recap (see features/runSummary). */}

        {/* Story modal — highest z-index, blocks all interaction */}
        <StoryModal state={state} dispatch={dispatch} />

        {/* Feature modals */}
        <FeatureModals state={state} dispatch={dispatch} />
      </div>
    </div>
  );
}
