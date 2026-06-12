import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type Phaser from "phaser";
import { TownScene, type TownPlan } from "./town/TownScene.js";
import BuildingIllustration, { BUILDING_KEYS } from "./buildings/index.jsx";

// Pre-render building SVGs to static strings once
const svgMap: Record<string, string> = {};
BUILDING_KEYS.forEach((id) => {
  try {
    svgMap[id] = renderToStaticMarkup(<BuildingIllustration id={id} isBuilt={true} />);
  } catch (e) {
    console.error("Failed to render SVG markup for building", id, e);
  }
});

interface TownPhaserCanvasProps {
  plan: TownPlan;
  builtLots: Set<number>;
  buildingsMap: Record<number, string>;
  pendingBuilding: { id: string; name: string } | null;
  onPlaceBuilding: (lotIndex: number, buildingId: string) => void;
  onClickBuilding: (buildingId: string) => void;
  onClickBoard: (kind: string) => void;
}

type GameWithObserver = Phaser.Game & { __resizeObserver?: ResizeObserver };

export default function TownPhaserCanvas({
  plan,
  builtLots,
  buildingsMap,
  pendingBuilding,
  onPlaceBuilding,
  onClickBuilding,
  onClickBoard,
}: TownPhaserCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameWithObserver | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync state updates to Phaser TownScene
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const scene = game.scene.scenes[0];
    if (scene) {
      scene.events.emit("town.update_built", { builtLots, buildingsMap, pendingBuilding });
    }
  }, [builtLots, buildingsMap, pendingBuilding]);

  // Initial mount: Boot Phaser game
  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined;
    const host = hostRef.current;
    const dpr = Math.min(typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1, 3);
    let cancelled = false;

    (async () => {
      try {
        const { default: Phaser } = await import("phaser");
        if (cancelled || !hostRef.current) return;

        const cssW = host.clientWidth || 1280;
        const cssH = host.clientHeight || 960;

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host,
          width: cssW * dpr,
          height: cssH * dpr,
          backgroundColor: "#5a7f36",
          transparent: false,
          scene: [TownScene],
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            zoom: 1 / dpr,
          },
          render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: false,
            pixelArt: true, // Crucial for pixel art crispness
          },
          input: { activePointers: 2 },
          callbacks: {
            postBoot: (g: Phaser.Game) => {
              const ro = new ResizeObserver(() => {
                const w = host.clientWidth;
                const h = host.clientHeight;
                if (!w || !h) return;
                g.scale.resize(w * dpr, h * dpr);
              });
              ro.observe(host);
              (g as GameWithObserver).__resizeObserver = ro;

              // Bind event listeners to TownScene
              const scene = g.scene.scenes[0] as TownScene;
              if (scene) {
                // Pass pre-boot data
                g.registry.set("hwv.svgMap", svgMap);
                
                scene.scene.restart({
                  plan,
                  builtLots,
                  buildingsMap,
                  pendingBuilding,
                });

                scene.events.on("town.placebuilding", (data: { lotIndex: number; buildingId: string }) => {
                  onPlaceBuilding(data.lotIndex, data.buildingId);
                });

                scene.events.on("town.clickbuilding", (buildingId: string) => {
                  onClickBuilding(buildingId);
                });

                scene.events.on("town.clickboard", (kind: string) => {
                  onClickBoard(kind);
                });
              }
            },
          },
        });

        gameRef.current = game as GameWithObserver;
        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("Failed to boot Phaser TownScene:", err);
      }
    })();

    return () => {
      cancelled = true;
      const game = gameRef.current;
      if (game) {
        game.__resizeObserver?.disconnect();
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, [plan]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#5a7f36]/90 text-white font-bold text-[18px] z-50">
          Loading Pixel Town...
        </div>
      )}
      <div ref={hostRef} className="w-full h-full" />
    </div>
  );
}
