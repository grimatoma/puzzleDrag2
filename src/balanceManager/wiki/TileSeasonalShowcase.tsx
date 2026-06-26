/**
 * TileSeasonalShowcase.tsx — Per-tile seasonal lifecycle table for the wiki.
 *
 * Shown on a tile's detail article: every idle animation (one per season) and
 * every forward season→season transition, laid out as a table of animated
 * previews. Two representations are supported and toggled via IconVariantToggle:
 *   - "canvas": the hand-drawn VECTOR seasonal art (per-season idle + morphs)
 *     from seasonalTiles.ts.
 *   - "pixel": the baked PixelLab PNG sheets (idle loops + transition strips)
 *     from seasonalArt.ts.
 *
 * Tiles with no seasonal art at all (the "non-puzzle" tiles) render nothing — the
 * caller still shows the general icon in the infobox.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../shared.jsx";
import { ICON_DESIGN_BOX } from "../../textures/paintIcon.js";
import { iconAnimationTicker } from "../iconAnimationTicker.js";
import { SEASON_NAMES, type SeasonName } from "../../textures/seasonal/types.js";
import {
  hasSeasonalTile,
  seasonalTileAnim,
  seasonalTileDraw,
  seasonalTileHasTransitions,
  seasonalTileTransition,
} from "../../textures/seasonal/seasonalTiles.js";
import {
  hasSeasonalArtFolder,
  seasonalArtActive,
  seasonalIdleFrameCount,
  seasonalGestureFrameCount,
  seasonalHasGesture,
  seasonalTransFrameCount,
  paintSeasonalIdleFrame,
  paintSeasonalGestureFrame,
  paintSeasonalTransFrame,
  ensureAllSeasonalArtLoaded,
  onSeasonalArtLoaded,
  SEASONAL_IDLE_MS,
  SEASONAL_TRANS_MS,
} from "../../textures/seasonal/seasonalArt.js";
import { IconVariantToggle, type TileIconVariant } from "./IconVariantToggle.jsx";

const CELL = 64;

/** Forward transition labels, keyed by from-season index. */
const TRANSITIONS: { from: number; label: string }[] = [
  { from: 0, label: "Spring → Summer" },
  { from: 1, label: "Summer → Autumn" },
  { from: 2, label: "Autumn → Winter" },
];

type Paint = (ctx: CanvasRenderingContext2D, t: number) => void;

/** A single animated preview cell. Re-subscribes to the shared ticker whenever
 *  its paint closure changes (keyed off the primitive inputs by the caller). */
function AnimCell({ paint, label }: { paint: Paint | null; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const tickerId = useRef(Symbol("wiki-seasonal-cell"));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    canvas.width = CELL * dpr;
    canvas.height = CELL * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    if (!paint) return;
    const id = tickerId.current;
    const draw = (t: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.clearRect(0, 0, CELL, CELL);
      ctx.save();
      ctx.translate(CELL / 2, CELL / 2);
      const s = CELL / ICON_DESIGN_BOX;
      ctx.scale(s, s);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      try {
        paint(ctx, t);
      } catch {
        /* skip broken draw in preview */
      }
      ctx.restore();
    };
    iconAnimationTicker.subscribe(id, draw);
    return () => iconAnimationTicker.unsubscribe(id);
  }, [paint]);

  if (!paint) {
    return (
      <span
        aria-label={`${label}: no art`}
        style={{ color: COLORS.inkSubtle, fontSize: 18, lineHeight: 1 }}
      >
        —
      </span>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label={label}
      style={{
        width: CELL,
        height: CELL,
        display: "block",
        borderRadius: 6,
        background: COLORS.parchment,
        imageRendering: "pixelated",
      }}
    />
  );
}

/** Loop a forward 0→1 morph with a brief hold at the end before restarting. */
function morphProgress(t: number, rampSec: number, holdSec: number): number {
  const period = rampSec + holdSec;
  const e = t % period;
  return Math.min(1, e / rampSec);
}

/** Build the idle-animation paint for one season, or null when there's no art. */
function idlePaint(tileKey: string, variant: TileIconVariant, season: SeasonName): Paint | null {
  if (variant === "pixel") {
    const frames = seasonalIdleFrameCount(tileKey, season);
    if (frames <= 0) return null;
    return (ctx, t) => {
      const frame = frames > 1 ? Math.floor((t * 1000) / SEASONAL_IDLE_MS) % frames : 0;
      paintSeasonalIdleFrame(ctx, tileKey, season, frame);
    };
  }
  // canvas / vector
  const anim = seasonalTileAnim(tileKey, season);
  if (anim) return (ctx, t) => anim(ctx, t);
  const draw = seasonalTileDraw(tileKey, season);
  if (draw) return (ctx) => draw(ctx);
  return null;
}

/** Build the static key-frame paint for one season (rest pose / poster still). */
function keyFramePaint(tileKey: string, variant: TileIconVariant, season: SeasonName): Paint | null {
  if (variant === "pixel") {
    const frames = seasonalIdleFrameCount(tileKey, season);
    if (frames <= 0) return null;
    return (ctx) => paintSeasonalIdleFrame(ctx, tileKey, season, 0);
  }
  const draw = seasonalTileDraw(tileKey, season);
  if (draw) return (ctx) => draw(ctx);
  return null;
}

/** Build the rare-idle (gesture) paint for one season.
 *  Only pixel tiles have a separate gesture clip; vector art embeds it in the idle anim. */
function gesturePaint(tileKey: string, variant: TileIconVariant, season: SeasonName): Paint | null {
  if (variant !== "pixel") return null;
  const frames = seasonalGestureFrameCount(tileKey, season);
  if (frames <= 0) return null;
  const cycleMs = frames * SEASONAL_IDLE_MS + 600;
  return (ctx, t) => {
    const e = (t * 1000) % cycleMs;
    const frame = Math.min(frames - 1, Math.floor(e / SEASONAL_IDLE_MS));
    paintSeasonalGestureFrame(ctx, tileKey, season, frame);
  };
}

/** Build the transition paint for one forward step, or null when there's no art. */
function transPaint(tileKey: string, variant: TileIconVariant, fromIdx: number): Paint | null {
  if (variant === "pixel") {
    const frames = seasonalTransFrameCount(tileKey, fromIdx);
    if (frames <= 0) return null;
    const cycleMs = frames * SEASONAL_TRANS_MS + 600; // play then hold before looping
    return (ctx, t) => {
      const e = (t * 1000) % cycleMs;
      const frame = Math.min(frames - 1, Math.floor(e / SEASONAL_TRANS_MS));
      paintSeasonalTransFrame(ctx, tileKey, fromIdx, frame);
    };
  }
  // canvas / vector
  const tr = seasonalTileTransition(tileKey, fromIdx);
  if (!tr) return null;
  return (ctx, t) => tr(ctx, morphProgress(t, 1.4, 0.6));
}

const TH: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: COLORS.inkSubtle,
  textAlign: "center",
  borderBottom: `1px solid ${COLORS.border}`,
};

const TD: React.CSSProperties = {
  padding: 8,
  textAlign: "center",
  verticalAlign: "middle",
};

const ROW_LABEL: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
  color: COLORS.ink,
  textAlign: "left",
  whiteSpace: "nowrap",
};

export function TileSeasonalShowcase({ tileKey }: { tileKey: string }) {
  const vectorAvailable = hasSeasonalTile(tileKey) || seasonalTileHasTransitions(tileKey);
  const pixelFolder = hasSeasonalArtFolder(tileKey);

  // All hooks run unconditionally (before any early return) to satisfy the Rules
  // of Hooks. Kick the pixel-art load (covers the vector-preferred showcase tiles
  // too) and re-render once it resolves so frame counts / paints become available.
  const [, setLoadTick] = useState(0);
  const [variant, setVariant] = useState<TileIconVariant>(
    vectorAvailable ? "canvas" : "pixel",
  );
  useEffect(() => {
    if (!pixelFolder) return;
    ensureAllSeasonalArtLoaded();
    const off = onSeasonalArtLoaded(() => setLoadTick((n) => n + 1));
    return off;
  }, [pixelFolder]);

  const pixelAvailable = pixelFolder && seasonalArtActive(tileKey);

  // Nothing seasonal at all → render nothing (non-puzzle tile).
  if (!vectorAvailable && !pixelFolder) return null;

  const variants: TileIconVariant[] = [];
  if (vectorAvailable) variants.push("canvas");
  if (pixelFolder) variants.push("pixel");

  // Keep the selection valid as availability resolves.
  const effective: TileIconVariant =
    variant === "pixel" && !pixelFolder ? "canvas" : variant === "canvas" && !vectorAvailable ? "pixel" : variant;

  const pixelPending = effective === "pixel" && pixelFolder && !pixelAvailable;

  return (
    <section id="seasonal-art">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <h2 className="wiki-section-heading">Idle Animations &amp; Transitions</h2>
        {variants.length > 1 && <IconVariantToggle value={effective} onChange={setVariant} />}
      </div>

      {pixelPending ? (
        <div className="text-[12px] italic py-4 text-center" style={{ color: COLORS.inkSubtle }}>
          Loading pixel art…
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: "left" }} />
                {SEASON_NAMES.map((s) => (
                  <th key={s} style={TH}>
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Key frames — static seasonal stills (rest pose / poster frame) */}
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={ROW_LABEL}>Key frame</td>
                {SEASON_NAMES.map((season) => (
                  <td key={season} style={TD}>
                    <AnimCell
                      paint={keyFramePaint(tileKey, effective, season)}
                      label={`${season} key frame`}
                    />
                  </td>
                ))}
              </tr>
              {/* Idle loops — one per season */}
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={ROW_LABEL}>Idle</td>
                {SEASON_NAMES.map((season) => (
                  <td key={season} style={TD}>
                    <AnimCell
                      paint={idlePaint(tileKey, effective, season)}
                      label={`${season} idle`}
                    />
                  </td>
                ))}
              </tr>
              {/* Rare idle (gesture) — pixel-art only, shown when a gesture clip exists */}
              {effective === "pixel" && pixelAvailable && seasonalHasGesture(tileKey) && (
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={ROW_LABEL}>Rare idle</td>
                  {SEASON_NAMES.map((season) => (
                    <td key={season} style={TD}>
                      <AnimCell
                        paint={gesturePaint(tileKey, effective, season)}
                        label={`${season} rare idle`}
                      />
                    </td>
                  ))}
                </tr>
              )}
              {/* Forward transitions */}
              <tr>
                <td style={ROW_LABEL}>Transition</td>
                {TRANSITIONS.map((tr) => (
                  <td key={tr.from} style={TD} title={tr.label}>
                    <AnimCell
                      paint={transPaint(tileKey, effective, tr.from)}
                      label={tr.label}
                    />
                    <div
                      style={{ fontSize: 9, color: COLORS.inkSubtle, marginTop: 2 }}
                      aria-hidden
                    >
                      {SEASON_NAMES[tr.from].slice(0, 3)}→{SEASON_NAMES[tr.from + 1].slice(0, 3)}
                    </div>
                  </td>
                ))}
                {/* Winter has no forward transition (a run ends at Winter). */}
                <td style={TD} aria-hidden>
                  <span style={{ color: COLORS.inkSubtle, fontSize: 18 }}>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default TileSeasonalShowcase;
