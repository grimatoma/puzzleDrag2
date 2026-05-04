import React, { useEffect, useReducer, useRef } from "react";
import Phaser from "phaser";
import { GameScene } from "./src/GameScene.js";
import { COLS, ROWS, TILE } from "./src/constants.js";
import { runSelfTests } from "./src/utils.js";
import { gameReducer, initialState } from "./src/state.js";
import { Hud, SidePanel, BottomNav, TownView, SeasonModal, NpcBubble } from "./src/ui.jsx";

function PhaserMount({ dispatch, biomeKey, turnsUsed, uiLocked, sceneRef }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    runSelfTests();
    // Phaser canvas internal resolution — the FIT scale mode will then size it down to the host
    const internalW = COLS * TILE + 80;   // 7*74 + 80 = 598
    const internalH = ROWS * TILE + 80;   // 6*74 + 80 = 524
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: internalW,
      height: internalH,
      parent: hostRef.current,
      backgroundColor: "#75b94a",
      scene: GameScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
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
        },
      },
    });
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

  return <div ref={hostRef} className="w-full h-full" />;
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const sceneRef = useRef(null);
  const uiLocked = !!state.modal || state.view !== "board";

  return (
    <div className="min-h-screen w-full bg-[#2a1d0f] text-[#2b2218] grid place-items-center">
      <div className="relative w-full max-w-[1280px] aspect-[16/10] max-[900px]:aspect-[9/16] max-[900px]:max-w-[420px] bg-[#3a2715] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        {/* HUD bar */}
        <Hud state={state} />

        {/* Main area: board + side panel, or town view */}
        <div className="flex-1 min-h-0 relative">
          {/* Board + side panel grid — always mounted to keep Phaser alive, hidden when in town view */}
          <div className={`absolute inset-0 grid grid-cols-[1fr_300px] gap-3 p-3 max-[900px]:grid-cols-1 max-[900px]:grid-rows-[1fr_auto] ${state.view === "town" ? "invisible" : ""}`}>
            {/* Phaser host — takes the rest */}
            <div className="relative min-h-0 min-w-0">
              <div className="absolute inset-0 rounded-xl overflow-hidden bg-[#4a2f18]">
                <PhaserMount
                  dispatch={dispatch}
                  biomeKey={state.biomeKey}
                  turnsUsed={state.turnsUsed}
                  uiLocked={uiLocked}
                  sceneRef={sceneRef}
                />
              </div>
            </div>
            {/* Side panel */}
            <div className="min-h-0 max-[900px]:max-h-[40vh]">
              <SidePanel state={state} dispatch={dispatch} />
            </div>
          </div>

          {/* Town overlay — covers exactly the same area as the board */}
          {state.view === "town" && (
            <div className="absolute inset-0 z-20">
              <TownView state={state} dispatch={dispatch} />
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30">
          <BottomNav view={state.view} onChange={(v) => dispatch({ type: "SET_VIEW", view: v })} />
        </div>

        {/* NPC bubble */}
        <NpcBubble bubble={state.bubble} dispatch={dispatch} />

        {/* Season modal */}
        <SeasonModal state={state} dispatch={dispatch} />
      </div>
    </div>
  );
}
