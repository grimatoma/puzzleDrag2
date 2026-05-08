import { useEffect, useReducer, useRef, useState } from "react";
import { COLS, ROWS, TILE, SCENE_EVENTS } from "./src/constants.js";
import { runSelfTests, currentCap } from "./src/utils.js";
import { gameReducer, initialState } from "./src/state.js";
import { Hud } from "./src/ui/Hud.jsx";
import { MobileDock, PortraitToolsBar, ArmedToolBanner } from "./src/ui/Tools.jsx";
import { TownView } from "./src/ui/Town.jsx";
import { SeasonModal, NpcBubble, StoryModal } from "./src/ui/Modals.jsx";
import { SidePanel, BottomNav, FeatureModals, FeatureScreens } from "./src/ui.jsx";
import { useAudio } from "./src/audio/useAudio.js";
import { setPhaserScene } from "./src/phaserBridge.js";
import { announce, getQueue, flushAnnouncements, formatChainAnnouncement, formatModalAnnouncement, formatQuestAnnouncement } from "./src/a11y.js";
import { handleKeyboard } from "./src/features/a11y/keyboard.js";
import { FIRE_HAZARD_ENABLED } from "./src/featureFlags.js";

function PhaserMount({ dispatch, biomeKey, turnsUsed, seasonsCycled, uiLocked, sceneRef, weather, toolPending, setChainInfo, workers, palette, reducedMotion, tileCollection, gameState, grid }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  // Keep a ref to the latest game state for keyboard handler (avoids stale closure)
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  // Keyboard chain state (chain array, separate from Phaser's drag chain)
  const kbChainRef = useRef([]);

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
              game.registry.set("seasonsCycled", seasonsCycled);
              game.registry.set("uiLocked", uiLocked);
              game.registry.set("dpr", dpr);
              game.registry.set("renderResolution", dpr);
              // Set before GameScene.create() so the initial fillBoard uses the
              // player's active tile selections instead of the raw base pool.
              game.registry.set("tileCollectionActive", tileCollection?.activeByCategory ?? null);
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
  useEffect(() => { gameRef.current?.registry.set("biomeKey", biomeKey); }, [biomeKey]);
  useEffect(() => { gameRef.current?.registry.set("turnsUsed", turnsUsed); }, [turnsUsed]);
  useEffect(() => { gameRef.current?.registry.set("seasonsCycled", seasonsCycled); }, [seasonsCycled]);
  useEffect(() => { gameRef.current?.registry.set("uiLocked", uiLocked); }, [uiLocked]);
  useEffect(() => { gameRef.current?.registry.set("weather", weather); }, [weather]);
  useEffect(() => { gameRef.current?.registry.set("toolPending", toolPending ?? null); }, [toolPending]);
  useEffect(() => { gameRef.current?.registry.set("workers", workers ?? null); }, [workers]);
  useEffect(() => { gameRef.current?.registry.set("palette", palette ?? "default"); }, [palette]);
  useEffect(() => { gameRef.current?.registry.set("reducedMotion", reducedMotion ?? null); }, [reducedMotion]);
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
  // Sync magicFertilizerCharges so GameScene.fillBoard can apply the bias for each fill charge
  useEffect(() => { gameRef.current?.registry.set("magicFertilizerCharges", gameState?.magicFertilizerCharges ?? 0); }, [gameState?.magicFertilizerCharges]);

  // Keyboard chain construction — Tab focuses board, arrows move cursor, Space adds tile, Enter commits, Esc cancels
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const handler = (e) => {
      const HANDLED_KEYS = ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter", "Escape"];
      if (!HANDLED_KEYS.includes(e.key)) return;
      const s = gameStateRef.current;
      if (!s) return;
      const cur = s.settings?.keyboardCursor ?? { row: 0, col: 0, active: false };
      // Only intercept arrows/space/enter/esc when cursor is active (Tab always handled)
      if (e.key !== "Tab" && !cur.active) return;
      e.preventDefault();
      // Build minimal state for handleKeyboard
      const kbState = { settings: s.settings, grid: s.grid ?? [], chain: kbChainRef.current };
      const next = handleKeyboard(kbState, { key: e.key });
      // Update keyboard chain ref
      kbChainRef.current = next.chain ?? [];
      // Dispatch cursor changes — shallow compare the three known fields,
      // not JSON.stringify (which serialised on every keydown).
      const nc = next.settings?.keyboardCursor;
      const pc = s.settings?.keyboardCursor;
      if (nc && (!pc || nc.row !== pc.row || nc.col !== pc.col || nc.active !== pc.active)) {
        dispatch({ type: "SET_CURSOR", cursor: nc });
      }
      // Enter commits chain → dispatch CHAIN_COLLECTED if chain was non-empty
      if (e.key === "Enter" && kbState.chain.length > 0) {
        const inv = next.inventory ?? {};
        const prevInv = s.inventory ?? {};
        // Find what changed and emit as CHAIN_COLLECTED
        const key = kbState.chain[0]?.key;
        if (key) {
          const gained = (inv[key] ?? 0) - (prevInv[key] ?? 0);
          if (gained > 0) {
            dispatch({ type: "CHAIN_COLLECTED", payload: { key, gained, upgrades: 0, chainLength: kbState.chain.length, value: 1 } });
          }
        }
        kbChainRef.current = [];
      }
      // Escape clears local chain (no dispatch needed beyond cursor)
      if (e.key === "Escape") {
        kbChainRef.current = [];
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [dispatch]); // intentional: handler uses ref for current state, dispatch is stable

  // Render keyboard cursor overlay when active
  const cursor = gameState?.settings?.keyboardCursor;
  const cursorActive = cursor?.active;

  return (
    <div ref={hostRef} tabIndex={0} className="w-full h-full relative outline-none focus-visible:outline-2 focus-visible:outline-[#ffd248]">
      {loading && (
        <div className="absolute inset-0 grid place-items-center text-[#f8e7c6] text-[12px]">Loading board…</div>
      )}
      {cursorActive && cursor && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            pointerEvents: "none",
            left: `calc(${(cursor.col / 6) * 100}% + 4px)`,
            top: `calc(${(cursor.row / 6) * 100}% + 4px)`,
            width: `calc(${100 / 6}% - 8px)`,
            height: `calc(${100 / 6}% - 8px)`,
            border: "3px solid #ffd248",
            borderRadius: "12px",
            boxShadow: "0 0 0 3px rgba(255,210,72,.35)",
            zIndex: 30,
          }}
        />
      )}
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

// Screen-reader aria-live region (visually hidden)
const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const [chainInfo, setChainInfo] = useState(null);
  const sceneRef = useRef(null);
  const ariaLiveRef = useRef(null);
  const storyModalOpen = !!state.story?.queuedBeat;
  const uiLocked = !!state.modal || state.view !== "board" || storyModalOpen;
  useAudio(state);

  // Drain the announce() queue into the aria-live region
  useEffect(() => {
    const id = setInterval(() => {
      const q = getQueue();
      const next = q.urgent[0] ?? q.polite[0];
      if (!next || !ariaLiveRef.current) return;
      ariaLiveRef.current.textContent = next.text;
      flushAnnouncements();
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Announce chain commits
  useEffect(() => {
    const prevChain = state.chain;
    // We only announce after CHAIN_COLLECTED by watching inventory changes via
    // a wrapper dispatch below.
    void prevChain;
  }, [state.chain]);

  // Wrapped dispatch: intercept announcement-worthy actions
  const dispatchWithA11y = (action) => {
    dispatch(action);
    switch (action.type) {
      case "CHAIN_COLLECTED": {
        const { key, gained, upgrades } = action.payload ?? {};
        if (key) {
          const upgList = upgrades > 0 ? [{ key: "upgraded tile", count: upgrades }] : [];
          announce(formatChainAnnouncement({ key, collected: gained, upgrades: upgList }));
        }
        break;
      }
      case "CLOSE_SEASON":
        announce("Season complete. Returning to town.", "assertive");
        break;
      case "QUESTS/CLAIM_QUEST":
        if (action.quest) announce(formatQuestAnnouncement(action.quest), "assertive");
        break;
      case "STORY/DISMISS_MODAL":
        // Beat was just dismissed — nothing extra to announce
        break;
    }
  };

  // Announce story beat on appearance
  const prevBeatRef = useRef(null);
  useEffect(() => {
    const beat = state.story?.queuedBeat;
    if (beat && beat !== prevBeatRef.current) {
      announce(formatModalAnnouncement(beat), "assertive");
    }
    prevBeatRef.current = beat ?? null;
  }, [state.story?.queuedBeat]);

  // Fire session_start story beat on first mount
  useEffect(() => {
    dispatch({ type: "SESSION_START" });
  }, [dispatch]);

  useEffect(() => {
    if (state.pendingReload) window.location.reload();
  }, [state.pendingReload]);

  return (
    <div className="h-full w-full bg-[#2a1d0f] text-[#2b2218] grid place-items-center" style={{ position: "relative", overflow: "hidden" }}>
      {/* Screen-reader live region — visually hidden */}
      <div
        ref={ariaLiveRef}
        aria-live="polite"
        role="status"
        aria-atomic="true"
        style={SR_ONLY_STYLE}
      />
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
        <Hud state={state} dispatch={dispatchWithA11y} />

        {/* Main area: board + side panel, or town view */}
        <div className="flex-1 min-h-0 relative">
          {/* Board + side panel grid — always mounted to keep Phaser alive, hidden when in town view */}
          <div className={`absolute inset-0 flex flex-col ${state.view === "board" ? "" : "invisible"}`}>
            {/* Chain badge overlay for phone landscape — React handles it since Phaser badge gets clipped */}
            {chainInfo && (
              <div className="hidden max-[1024px]:landscape:block absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div className="bg-[#2b2218]/90 border border-[#ffd248] rounded-full px-3 py-1 text-[#ffd248] font-bold text-[12px] whitespace-nowrap">
                  chain × {chainInfo.count}{chainInfo.upgrades > 0 ? `  +${chainInfo.upgrades}★` : ""}
                </div>
              </div>
            )}
            <div className="flex-1 min-h-0 grid grid-cols-[1fr_300px] gap-3 p-3 max-[1024px]:grid-cols-1 max-[1024px]:gap-0 max-[1024px]:p-0">
              {/* Phaser host — takes the rest. Phaser draws its own background and frame. */}
              <div className="relative min-h-0 min-w-0 overflow-hidden">
                <ArmedToolBanner state={state} dispatch={dispatchWithA11y} />
                <PhaserMount
                  dispatch={dispatchWithA11y}
                  biomeKey={state.biomeKey}
                  turnsUsed={state.turnsUsed}
                  seasonsCycled={state.seasonsCycled}
                  uiLocked={uiLocked}
                  sceneRef={sceneRef}
                  weather={state.weather}
                  toolPending={state.toolPending}
                  setChainInfo={setChainInfo}
                  workers={state.workers}
                  palette={state.settings?.palette}
                  reducedMotion={state.settings?.reducedMotion}
                  tileCollection={state.tileCollection}
                  gameState={state}
                  grid={state.grid}
                />
              </div>
              {/* Side panel — hidden on mobile, replaced by MobileDock */}
              <div className="min-h-0 max-[1024px]:hidden">
                <SidePanel state={state} dispatch={dispatchWithA11y} chainInfo={chainInfo} />
              </div>
            </div>
            {/* Portrait phone tools bar — board is width-limited so canvas height can shrink */}
            <div className="hidden portrait:max-[1024px]:block flex-shrink-0">
              <PortraitToolsBar state={state} dispatch={dispatchWithA11y} />
            </div>
            {/* Mobile dock — only visible on mobile, in board view */}
            <div className="hidden max-[1024px]:block flex-shrink-0">
              <MobileDock state={state} dispatch={dispatchWithA11y} />
            </div>
          </div>

          {/* Town overlay — covers exactly the same area as the board */}
          {state.view === "town" && (
            <div className="absolute inset-0 z-20">
              <TownView state={state} dispatch={dispatchWithA11y} />
            </div>
          )}

          {/* Feature full-screen views */}
          <FeatureScreens state={state} dispatch={dispatchWithA11y} />
        </div>

        {/* Bottom nav — full-width bar at the bottom of every view */}
        <BottomNav view={state.view} modal={state.modal} dispatch={dispatchWithA11y} state={state} />

        {/* NPC bubble */}
        <NpcBubble bubble={state.bubble} dispatch={dispatchWithA11y} />

        {/* Season modal */}
        <SeasonModal state={state} dispatch={dispatchWithA11y} />

        {/* Story modal — highest z-index, blocks all interaction */}
        <StoryModal state={state} dispatch={dispatchWithA11y} />

        {/* Feature modals */}
        <FeatureModals state={state} dispatch={dispatchWithA11y} />
      </div>
    </div>
  );
}
