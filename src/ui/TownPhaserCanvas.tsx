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

const savedCameraStates: Record<string, { scrollX: number; scrollY: number; zoom: number }> = {};

interface TownPhaserCanvasProps {
  zoneId: string;
  plan: TownPlan;
  builtLots: Set<number>;
  buildingsMap: Record<number, string>;
  pendingBuilding: { id: string; name: string } | null;
  /**
   * True only while the town view is actually on screen. The Phaser game is
   * booted lazily the first time this is true and then kept alive — when the
   * view is hidden we pause the scene instead of destroying it, so returning
   * to town is instant rather than a full cold reboot.
   */
  active?: boolean;
  /**
   * Background pre-warm: boot the Phaser engine and bake all of the town's
   * textures *before* the player first navigates here, even while the view is
   * still hidden (`active` false). Set once the main board is up so the first
   * real town visit is instant instead of showing a 1–2 s blank while the
   * engine cold-boots and bakes. Has no effect once the game is already booted.
   */
  warm?: boolean;
  /** Fired once the town's Phaser engine has booted (or failed to) — drives the
   *  initial loading screen dismissal when the game opens straight into town. */
  onReady?: () => void;
  onPlaceBuilding: (lotIndex: number, buildingId: string) => void;
  onClickBuilding: (buildingId: string) => void;
  onClickBoard: (kind: string) => void;
}

type GameWithObserver = Phaser.Game & { __resizeObserver?: ResizeObserver };

export default function TownPhaserCanvas({
  zoneId,
  plan,
  builtLots,
  buildingsMap,
  pendingBuilding,
  active = true,
  warm = false,
  onReady,
  onPlaceBuilding,
  onClickBuilding,
  onClickBoard,
}: TownPhaserCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameWithObserver | null>(null);
  const dprRef = useRef(Math.min(typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1, 3));
  const [loading, setLoading] = useState(true);
  // Flips true once the Phaser game has booted. Lets the pause/resume effect
  // re-run after an async (and possibly hidden, pre-warm) boot completes.
  const [booted, setBooted] = useState(false);
  // onReady must fire exactly once (the boot effect runs once); read it through
  // a ref and latch so a later prop change can't re-trigger it.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; });
  const readyFiredRef = useRef(false);
  const fireReady = () => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    onReadyRef.current?.();
  };

  // The scene's event listeners are bound once at postBoot, so they would
  // otherwise capture the first render's prop closures forever (e.g. a
  // `pendingBuilding` that was still null at mount, silently swallowing every
  // placement). Keep the latest callbacks in refs and call through them.
  const onPlaceBuildingRef = useRef(onPlaceBuilding);
  const onClickBuildingRef = useRef(onClickBuilding);
  const onClickBoardRef = useRef(onClickBoard);
  useEffect(() => {
    onPlaceBuildingRef.current = onPlaceBuilding;
    onClickBuildingRef.current = onClickBuilding;
    onClickBoardRef.current = onClickBoard;
  });

  // Boot is async, so the latest plan/zone/state must be readable from the
  // async closure and from the per-zone scene restarts below.
  const planRef = useRef(plan);
  const zoneIdRef = useRef(zoneId);
  const builtLotsRef = useRef(builtLots);
  const buildingsMapRef = useRef(buildingsMap);
  const pendingBuildingRef = useRef(pendingBuilding);
  useEffect(() => {
    planRef.current = plan;
    zoneIdRef.current = zoneId;
    builtLotsRef.current = builtLots;
    buildingsMapRef.current = buildingsMap;
    pendingBuildingRef.current = pendingBuilding;
  });

  const saveCamera = (zid: string) => {
    const game = gameRef.current;
    const scene = game?.scene.scenes[0];
    if (scene && scene.cameras && scene.cameras.main) {
      const cam = scene.cameras.main;
      savedCameraStates[zid] = { scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom };
    }
  };

  // Sync state updates to Phaser TownScene
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const scene = game.scene.scenes[0];
    if (scene) {
      scene.events.emit("town.update_built", { builtLots, buildingsMap, pendingBuilding });
    }
  }, [builtLots, buildingsMap, pendingBuilding]);

  // Boot Phaser the first time the town view is shown — or earlier, while still
  // hidden, when `warm` is set (background pre-warm after the board is up).
  // Guarded on gameRef so it only ever runs once; subsequent show/hide toggles
  // are handled by the pause/resume effect below. When warming while hidden the
  // host has no measured size, so the boot falls back to a default canvas size
  // (see cssW/cssH below) and the pause/resume effect resizes to the real host
  // on first show.
  useEffect(() => {
    if ((!active && !warm) || gameRef.current || !hostRef.current) return undefined;
    const host = hostRef.current;
    const dpr = dprRef.current;
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
          // Scale.NONE (not FIT) — the canvas backing store is exactly
          // width×height and displayed at CSS size via zoom 1/dpr, so it always
          // fills the host with NO letterboxing. FIT would instead lock the
          // game's internal aspect ratio at boot and centre-letterbox it inside
          // the parent; when the host is measured during a transient layout on
          // initial load (a too-short height), that baked-in wide aspect ratio
          // letterboxes the map into a thin horizontal band — the "squished map"
          // bug. TownScene already cover-zooms its camera (see coverZoom /
          // restCamera) to fill any viewport shape, so FIT's aspect preservation
          // is redundant and harmful. Mirrors the main board's PhaserMount.
          scale: {
            mode: Phaser.Scale.NONE,
            autoCenter: Phaser.Scale.NO_CENTER,
            zoom: 1 / dpr,
          },
          render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: false,
            pixelArt: true, // Crucial for pixel art crispness
          },
          // windowEvents: false stops Phaser from processing pointer events it
          // sees on the *window* rather than the canvas. Without it, a tap on a
          // React overlay rendered above the town canvas (the inventory/quests
          // screens, build picker, or any modal) still gets routed into the
          // TownScene's input pipeline and can fire a board's pointerup —
          // popping the Start Farming / biome-entry modal while another menu is
          // open on top of the map. Mirrors the main game board (see PhaserMount).
          input: { activePointers: 2, windowEvents: false },
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
                // Debug handle, mirroring the board's window.__phaserScene — lets
                // QA/dev inspect the town scene (e.g. its ambient smokeColumns).
                if (typeof window !== "undefined") window.__townScene = scene;
                // Pass pre-boot data
                g.registry.set("hwv.svgMap", svgMap);

                scene.scene.restart({
                  plan: planRef.current,
                  zoneId: zoneIdRef.current,
                  builtLots: builtLotsRef.current,
                  buildingsMap: buildingsMapRef.current,
                  pendingBuilding: pendingBuildingRef.current,
                  initialCameraState: savedCameraStates[zoneIdRef.current],
                });

                scene.events.on("town.placebuilding", (data: { lotIndex: number; buildingId: string }) => {
                  onPlaceBuildingRef.current(data.lotIndex, data.buildingId);
                });

                scene.events.on("town.clickbuilding", (buildingId: string) => {
                  onClickBuildingRef.current(buildingId);
                });

                scene.events.on("town.clickboard", (kind: string) => {
                  onClickBoardRef.current(kind);
                });
              }
            },
          },
        });

        gameRef.current = game as GameWithObserver;
        if (!cancelled) setLoading(false);
        // Signal the pause/resume effect to (re)evaluate now that the game
        // exists. Matters for a background pre-warm: the engine booted while
        // hidden (active false), and the pause/resume effect already ran at
        // mount before the game existed, so the scene would otherwise keep
        // rendering offscreen. Re-running it now pauses the hidden scene; the
        // same effect wakes it on first show.
        if (!cancelled) setBooted(true);
        fireReady();
      } catch (err) {
        console.error("Failed to boot Phaser TownScene:", err);
        fireReady();
      }
    })();

    // Note: no destroy here. Tearing the game down belongs to the unmount-only
    // effect below — hiding the view must NOT throw away the loaded game.
    return () => {
      cancelled = true;
    };
  }, [active, warm]);

  // When the settlement changes (different zone, or a tier upgrade rebuilds the
  // plan), restart the existing scene in place rather than rebuilding the whole
  // game. The dep array fires this only on a real plan/zone change; on the
  // initial mount the game isn't booted yet so it no-ops and boot does the work.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return; // not booted yet — boot picks up the current plan
    const scene = game.scene.scenes[0] as TownScene | undefined;
    if (!scene) return;
    // Persist the outgoing settlement's camera (tracked on the scene itself)
    // before swapping it out, so returning to it — or restarting the same zone
    // for a tier upgrade — restores the player's pan/zoom.
    if (scene.zoneId) saveCamera(scene.zoneId);
    scene.scene.restart({
      plan,
      zoneId,
      builtLots,
      buildingsMap,
      pendingBuilding,
      initialCameraState: savedCameraStates[zoneId],
    });
    // builtLots/buildingsMap/pendingBuilding are forwarded as restart seed data
    // but must not themselves trigger a restart — the sync effect handles those.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, zoneId]);

  // Pause the scene while hidden (no wasted update/render work), and resume +
  // resize to the host when shown again so a DPR/layout change while hidden is
  // picked up.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const scene = game.scene.scenes[0];
    if (active) {
      const host = hostRef.current;
      if (host && host.clientWidth && host.clientHeight) {
        game.scale.resize(host.clientWidth * dprRef.current, host.clientHeight * dprRef.current);
      }
      game.loop.wake?.();
      scene?.scene.resume();
    } else {
      scene?.scene.pause();
      game.loop.sleep?.();
    }
  }, [active, booted]);

  // Unmount-only teardown: this is the single place the game is destroyed.
  useEffect(() => {
    return () => {
      const game = gameRef.current;
      if (game) {
        saveCamera(zoneIdRef.current);
        if (typeof window !== "undefined") window.__townScene = null;
        game.__resizeObserver?.disconnect();
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {loading && active && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#5a7f36]/90 text-white font-bold text-[18px] z-50">
          Loading Pixel Town...
        </div>
      )}
      <div ref={hostRef} className="w-full h-full" />
    </div>
  );
}
