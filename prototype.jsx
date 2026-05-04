import React, { useEffect, useReducer, useRef, useState } from "react";
import { COLS, ROWS, TILE } from "./src/constants.js";
import { runSelfTests } from "./src/utils.js";
import { gameReducer, initialState } from "./src/state.js";
import { Hud, SidePanel, BottomNav, TownView, SeasonModal, NpcBubble, FeatureModals, FeatureScreens } from "./src/ui.jsx";
import { useAudio } from "./src/audio/useAudio.js";

function PhaserMount({ dispatch, biomeKey, turnsUsed, uiLocked, sceneRef }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    runSelfTests();
    // Initial size — Phaser will resize to match the host once mounted
    const initialW = hostRef.current.clientWidth || COLS * TILE + 80;
    const initialH = hostRef.current.clientHeight || ROWS * TILE + 80;

    (async () => {
      try {
        const [{ default: Phaser }, { GameScene }] = await Promise.all([
          import("phaser"),
          import("./src/GameScene.js"),
        ]);
        if (!hostRef.current) return; // unmounted while loading
        gameRef.current = new Phaser.Game({
          type: Phaser.AUTO,
          width: initialW,
          height: initialH,
          parent: hostRef.current,
          backgroundColor: "#75b94a",
          scene: GameScene,
          scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
          render: { antialias: true, antialiasGL: true, roundPixels: false, powerPreference: "high-performance" },
          input: { activePointers: 3 },
          callbacks: {
            preBoot: (game) => {
              game.registry.set("biomeKey", biomeKey);
              game.registry.set("turnsUsed", turnsUsed);
              game.registry.set("uiLocked", uiLocked);
              game.registry.set("renderResolution", Math.min(window.devicePixelRatio || 1, 3));
            },
            postBoot: (game) => {
              const scene = game.scene.scenes[0];
              sceneRef.current = scene;
              window.__phaserScene = scene; // for tools panel quick-access
              scene.events.on("chain-collected", (payload) => dispatch({ type: "CHAIN_COLLECTED", payload }));
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
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
      window.__phaserScene = null;
    };
  }, []);

  // Sync React state → Phaser registry
  useEffect(() => { gameRef.current?.registry.set("biomeKey", biomeKey); }, [biomeKey]);
  useEffect(() => { gameRef.current?.registry.set("turnsUsed", turnsUsed); }, [turnsUsed]);
  useEffect(() => { gameRef.current?.registry.set("uiLocked", uiLocked); }, [uiLocked]);

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
  const sceneRef = useRef(null);
  const uiLocked = !!state.modal || state.view !== "board";
  useAudio(state);

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

      <div className="relative w-full max-w-[1280px] aspect-[16/10] max-[1024px]:aspect-auto max-[1024px]:w-full max-[1024px]:h-full max-[1024px]:max-w-none bg-[#3a2715] rounded-2xl max-[1024px]:rounded-none overflow-hidden shadow-2xl border border-white/10 flex flex-col" style={{ zIndex: 1 }}>
        {/* HUD bar */}
        <Hud state={state} dispatch={dispatch} />

        {/* Main area: board + side panel, or town view */}
        <div className="flex-1 min-h-0 relative">
          {/* Board + side panel grid — always mounted to keep Phaser alive, hidden when in town view */}
          <div className={`absolute inset-0 grid grid-cols-[1fr_300px] gap-3 p-3 max-[1024px]:grid-cols-1 max-[1024px]:grid-rows-[1fr_auto] max-[1024px]:gap-0 max-[1024px]:p-0 ${state.view === "board" ? "" : "invisible"}`}>
            {/* Phaser host — takes the rest. Phaser draws its own background and frame. */}
            <div className="relative min-h-0 min-w-0 overflow-hidden">
              <PhaserMount
                dispatch={dispatch}
                biomeKey={state.biomeKey}
                turnsUsed={state.turnsUsed}
                uiLocked={uiLocked}
                sceneRef={sceneRef}
              />
            </div>
            {/* Side panel */}
            <div className="min-h-0 max-[1024px]:max-h-[40dvh]">
              <SidePanel state={state} dispatch={dispatch} />
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

        {/* Bottom nav — hidden on board view */}
        {state.view !== "board" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30">
            <BottomNav view={state.view} onChange={(v) => dispatch({ type: "SET_VIEW", view: v })} />
          </div>
        )}

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
