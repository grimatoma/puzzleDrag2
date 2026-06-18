import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import type { Dispatch } from "../../types/state.js";
import type { FiberLevel } from "../../game/fiber/levels.js";
import { setFiberScene } from "../../game/fiber/fiberBridge.js";

interface FiberMovePayload {
  cleared: Partial<Record<string, number>>;
  created?: Partial<Record<string, number>>;
  movesSpent: number;
}

interface FiberCanvasProps {
  level: FiberLevel;
  /** True once the level is over (won/lost) — disables board input. */
  locked: boolean;
  dispatch: Dispatch;
}

/**
 * Mounts a SEPARATE `Phaser.Game` running only `FiberScene` while a Fiber level
 * is active (mirrors how the board canvas mounts in `prototype.tsx`). Phaser is
 * dynamically imported so it stays out of the main bundle until the Fiber view
 * is opened. Keyed on `level.id` by the parent so a new level remounts a fresh
 * board. On unmount the game is destroyed to avoid leaking a WebGL context.
 *
 * Never touches `window.__phaserScene` — the board scene owns that. This sets
 * the distinct `window.__fiberScene` handle (via the scene + fiberBridge).
 */
export default function FiberCanvas({ level, locked, dispatch }: FiberCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const lockedRef = useRef(locked);
  useEffect(() => { lockedRef.current = locked; }, [locked]);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    const host = hostRef.current;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 3);
    const cssW = host.clientWidth || 480;
    const cssH = host.clientHeight || 480;
    let cancelled = false;

    (async () => {
      const [{ default: Phaser }, { FiberScene, FIBER_REG, FIBER_MOVE_EVENT }] = await Promise.all([
        import("phaser"),
        import("../../game/fiber/FiberScene.js"),
      ]);
      if (cancelled || !hostRef.current) return;
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: cssW * dpr,
        height: cssH * dpr,
        parent: host,
        backgroundColor: "#2b2218",
        scene: FiberScene,
        scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER, zoom: 1 / dpr },
        render: { antialias: true, roundPixels: false, pixelArt: false, powerPreference: "high-performance" },
        input: { activePointers: 2, windowEvents: false },
        audio: { noAudio: true },
        callbacks: {
          preBoot: (game) => {
            game.registry.set(FIBER_REG.level, level);
            game.registry.set(FIBER_REG.locked, lockedRef.current);
          },
          postBoot: (game) => {
            const ro = new ResizeObserver(() => {
              const w = host.clientWidth, h = host.clientHeight;
              if (w && h) game.scale.resize(w * dpr, h * dpr);
            });
            ro.observe(host);
            (game as Phaser.Game & { __ro?: ResizeObserver }).__ro = ro;

            const scene = game.scene.scenes[0];
            setFiberScene(scene);
            if (typeof window !== "undefined") {
              (window as unknown as { __fiberScene?: Phaser.Scene }).__fiberScene = scene;
            }
            scene.events.on(FIBER_MOVE_EVENT, (payload: FiberMovePayload) => {
              dispatch({ type: "FIBER/RESOLVE_MOVE", payload });
            });
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      const g = gameRef.current as (Phaser.Game & { __ro?: ResizeObserver }) | null;
      g?.__ro?.disconnect();
      g?.destroy(true);
      gameRef.current = null;
      setFiberScene(null);
      if (typeof window !== "undefined") {
        (window as unknown as { __fiberScene?: Phaser.Scene | null }).__fiberScene = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per level; locked syncs via the effect below
  }, []);

  // Sync the lock flag into the running scene's registry.
  useEffect(() => {
    const g = gameRef.current;
    if (g) g.registry.set("fiber.locked", locked);
  }, [locked]);

  return <div ref={hostRef} className="w-full h-full" data-testid="fiber-canvas-host" />;
}
