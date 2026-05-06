import { useEffect, useReducer, useRef, useState } from "react";
import { COLS, ROWS, TILE } from "./src/constants.js";
import { runSelfTests } from "./src/utils.js";
import { gameReducer, initialState } from "./src/state.js";
import { Hud, SidePanel, MobileDock, PortraitToolsBar, BottomNav, TownView, SeasonModal, NpcBubble, FeatureModals, FeatureScreens } from "./src/ui.jsx";
import { useAudio } from "./src/audio/useAudio.js";
import { setPhaserScene } from "./src/phaserBridge.js";

function PhaserMount({ dispatch, biomeKey, turnsUsed, seasonsCycled, uiLocked, sceneRef, memoryPerks, setChainInfo }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const [loading, setLoading] = useState(true);

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
              scene.events.on("chain-collected", (payload) => dispatch({ type: "CHAIN_COLLECTED", payload }));
              scene.events.on("chain-update", (data) => setChainInfo(data));
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
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: Phaser game initialises once on mount; registry syncs handled by separate effects below

  // Sync React state → Phaser registry
  useEffect(() => { gameRef.current?.registry.set("biomeKey", biomeKey); }, [biomeKey]);
  useEffect(() => { gameRef.current?.registry.set("turnsUsed", turnsUsed); }, [turnsUsed]);
  useEffect(() => { gameRef.current?.registry.set("seasonsCycled", seasonsCycled); }, [seasonsCycled]);
  useEffect(() => { gameRef.current?.registry.set("uiLocked", uiLocked); }, [uiLocked]);
  useEffect(() => { gameRef.current?.registry.set("memoryPerks", memoryPerks || []); }, [memoryPerks]);

  return (
    <div ref={hostRef} className="w-full h-full">
      {loading && (
        <div className="absolute inset-0 grid place-items-center text-[#f8e7c6] text-[12px]">Loading board…</div>
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

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const [chainInfo, setChainInfo] = useState(null);
  const sceneRef = useRef(null);
  const uiLocked = !!state.modal || state.view !== "board";
  useAudio(state);

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
                  seasonsCycled={state.seasonsCycled}
                  uiLocked={uiLocked}
                  sceneRef={sceneRef}
                  memoryPerks={state.memoryPerks}
                  setChainInfo={setChainInfo}
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

        {/* Bottom nav — full-width bar at the bottom of every view */}
        <BottomNav view={state.view} modal={state.modal} dispatch={dispatch} />

        {/* NPC bubble */}
        <NpcBubble bubble={state.bubble} dispatch={dispatch} />

        {/* Season modal */}
        <SeasonModal state={state} dispatch={dispatch} />

        {/* Feature modals */}
        <FeatureModals state={state} dispatch={dispatch} />
      </div>
    </div>
  );
}
