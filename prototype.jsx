import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { responsiveGameSize, renderResolutionForWidth } from "./src/constants.js";
import { runSelfTests } from "./src/utils.js";
import { GameScene } from "./src/GameScene.js";

export default function PuzzleCraftStylePhaserPrototype() {
  const hostRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    runSelfTests();
    if (!hostRef.current || gameRef.current) return;
    const hostWidth = hostRef.current.getBoundingClientRect().width;
    const gameSize = responsiveGameSize(hostWidth);
    const renderResolution = renderResolutionForWidth(hostWidth, gameSize.width);
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: gameSize.width,
      height: gameSize.height,
      resolution: renderResolution,
      parent: hostRef.current,
      backgroundColor: "#75b94a",
      scene: GameScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, antialiasGL: true, roundPixels: false, powerPreference: "high-performance" },
      input: { activePointers: 3 },
      callbacks: {
        preBoot: (game) => {
          game.registry.set("renderResolution", renderResolution);
          game.registry.set("narrowLayout", gameSize.narrow);
        },
      },
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-emerald-950 flex flex-col items-center justify-center p-4 gap-3">
      <div className="w-full max-w-[960px] aspect-[3/2] max-[760px]:max-w-[640px] max-[760px]:aspect-[8/13] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black" ref={hostRef} />
      <div className="max-w-[960px] text-sm text-emerald-50/85 text-center">
        Cute visual season bar: vine track, fill bar, 10 decorative pips, and a changing season badge.
      </div>
    </div>
  );
}
