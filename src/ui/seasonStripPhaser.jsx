/**
 * React wrapper around the Phaser-powered season strip.
 *
 * Lazy-loads Phaser + SeasonStripScene so the strip's heavy graphics
 * library is only fetched when the player opts in. Mounts a Phaser
 * Game instance, syncs state via the registry, and tears down cleanly
 * on unmount.
 *
 * Used by SeasonIndicator in puzzleBoard.jsx when
 * `state.settings.seasonStripPhaser` is on.
 */

import { useEffect, useRef, useState } from "react";

const STRIP_HEIGHT = 52;
const STRIP_MAX_WIDTH = 760;
const STRIP_MIN_WIDTH = 220;

export function SeasonStripPhaser({
  turnsUsed,
  turnBudget,
  turnsRemaining,
  seasonIdx,
  seasonName,
}) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const sceneReadyRef = useRef(false);
  const [loading, setLoading] = useState(true);

  // Initial mount: lazy-load Phaser + scene, instantiate game.
  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined;
    const host = hostRef.current;
    const dpr = Math.min(typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1, 3);
    let cancelled = false;

    (async () => {
      try {
        const [{ default: Phaser }, { SeasonStripScene }] = await Promise.all([
          import("phaser"),
          import("./seasonStripScene.js"),
        ]);
        if (cancelled || !hostRef.current) return;
        const cssW = Math.max(STRIP_MIN_WIDTH, Math.min(STRIP_MAX_WIDTH, host.clientWidth));
        const cssH = STRIP_HEIGHT;
        const game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host,
          width: cssW * dpr,
          height: cssH * dpr,
          backgroundColor: "#2a1810",
          transparent: false,
          scene: SeasonStripScene,
          scale: {
            mode: Phaser.Scale.NONE,
            autoCenter: Phaser.Scale.NO_CENTER,
            zoom: 1 / dpr,
          },
          render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: false,
            pixelArt: false,
            powerPreference: "low-power",
          },
          input: { activePointers: 0, mouse: false, touch: false, keyboard: false },
          callbacks: {
            postBoot: (g) => {
              const scene = g.scene.scenes[0];
              if (!scene) return;
              // Push current props into the registry BEFORE scene create()
              g.registry.set("hwv.turnsUsed", turnsUsed ?? 0);
              g.registry.set("hwv.turnBudget", turnBudget || 1);
              g.registry.set("hwv.turnsRemaining", turnsRemaining ?? 0);
              g.registry.set("hwv.seasonIdx", seasonIdx ?? 0);
              g.registry.set("hwv.seasonName", seasonName ?? "Spring");
              // Pass layout via the scene's init data
              scene.scene.restart({ width: cssW, height: cssH, dpr });
              scene.events.on("create", () => { sceneReadyRef.current = true; });
              const ro = new ResizeObserver(() => {
                const w = host.clientWidth;
                if (!w) return;
                const newW = Math.max(STRIP_MIN_WIDTH, Math.min(STRIP_MAX_WIDTH, w));
                g.scale.resize(newW * dpr, cssH * dpr);
              });
              ro.observe(host);
              g.__resizeObserver = ro;
            },
          },
        });
        gameRef.current = game;
        setLoading(false);
      } catch (err) {
        console.warn("[hwv] Failed to load Phaser season strip:", err);
      }
    })();

    return () => {
      cancelled = true;
      const game = gameRef.current;
      if (game) {
        try { game.__resizeObserver?.disconnect(); } catch { /* ignore */ }
        game.destroy(true);
        gameRef.current = null;
        sceneReadyRef.current = false;
      }
    };
    // The Phaser game is mounted once and synced via the registry on subsequent
    // prop changes — see the second effect below. The initial registry values
    // are written here using the first render's props, which is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync prop changes into the registry so the scene can react.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    game.registry.set("hwv.turnsUsed", turnsUsed ?? 0);
    game.registry.set("hwv.turnBudget", turnBudget || 1);
    game.registry.set("hwv.turnsRemaining", turnsRemaining ?? 0);
    game.registry.set("hwv.seasonIdx", seasonIdx ?? 0);
    game.registry.set("hwv.seasonName", seasonName ?? "Spring");
  }, [turnsUsed, turnBudget, turnsRemaining, seasonIdx, seasonName]);

  return (
    <div
      role="status"
      aria-label={`${seasonName} — ${turnsRemaining ?? 0} turn${(turnsRemaining ?? 0) === 1 ? "" : "s"} left`}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: STRIP_MAX_WIDTH,
        minWidth: STRIP_MIN_WIDTH,
        height: STRIP_HEIGHT,
        borderRadius: 8,
        overflow: "hidden",
        border: "1.5px solid #3a2412",
        boxShadow: "0 1px 0 rgba(0,0,0,0.25) inset",
        background: "#2a1810",
      }}
    >
      {/* Hidden numeral mirror so the existing data-testid="turns-left"
          contract still holds for tests, even though the visible numeral
          is rendered inside the Phaser canvas. */}
      <span
        data-testid="turns-left"
        style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}
        aria-hidden="true"
      >
        {turnsRemaining ?? 0}
      </span>
      <div
        ref={hostRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      {loading && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#caa97a",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.5px",
        }}>
          Loading…
        </div>
      )}
    </div>
  );
}
