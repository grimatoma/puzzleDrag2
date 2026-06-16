// Willow seasonal art controller.
//
// The willow tile (`tile_tree_willow`) renders pre-baked PixelLab art instead of
// the procedural `drawWillow`: a per-season idle micro-loop, and — when the
// in-session season advances — the forward transition clip plays once before the
// new idle resumes. Source of truth for the art is
// docs/seasonal-tile-system/; the game-ready spritesheets live in
// public/seasonal-tiles/willow/ (one transparent 128px-per-frame strip per clip).
//
// Self-contained: imports only season-name types (no cycle back to textures.ts).
// State is module-level because every willow tile shares one canvas texture and
// therefore animates in lockstep — there is nothing per-instance to track.

import { SEASON_NAMES, type SeasonName } from "./types.js";

const FRAME = 128;       // native px per frame in the source strips
const DRAW = 64;         // px the willow is blitted at, centered, in the 74px tile
const IDLE_MS = 130;     // ms per idle frame (~7.5fps gentle loop)
const TRANS_MS = 70;     // ms per transition frame (~14fps)

/** The board tiles whose art is fully baked (so TileObj skips its angle-sway —
 *  the motion is inside the frames, and the ground pad must not rotate). */
export const BAKED_SEASONAL_KEYS: ReadonlySet<string> = new Set(["tile_tree_willow"]);

interface Clip {
  bmp: CanvasImageSource;
  frames: number;
}

const idle: (Clip | null)[] = [null, null, null, null]; // by season index 0..3
const trans: (Clip | null)[] = [null, null, null];      // [i] = season i -> i+1
let loaded = false;

// Shared playback state.
let curIdx = 0;                         // season the willow is currently resting in
let mode: "idle" | "trans" = "idle";
let transTo = 0;                        // target season index while transitioning
let transStart = 0;                     // tSec at which the active transition began

function baseUrl(): string {
  const b = import.meta.env.BASE_URL ?? "/";
  return `${b.replace(/\/?$/, "/")}seasonal-tiles/willow/`;
}

async function loadSheet(name: string): Promise<Clip | null> {
  try {
    const resp = await fetch(baseUrl() + name);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const bmp = await createImageBitmap(blob);
    return { bmp, frames: Math.max(1, Math.round(bmp.width / FRAME)) };
  } catch {
    return null;
  }
}

/** Load all willow spritesheets once. Resolves true when the four idle loops are
 *  present (transitions are optional — a missing one just snaps). No-ops and
 *  returns false in environments without fetch/createImageBitmap (e.g. tests). */
export async function preloadWillowArt(): Promise<boolean> {
  if (loaded) return true;
  if (typeof fetch === "undefined" || typeof createImageBitmap === "undefined") return false;
  const [s, su, a, w, t01, t12, t23] = await Promise.all([
    loadSheet("idle-spring.png"),
    loadSheet("idle-summer.png"),
    loadSheet("idle-autumn.png"),
    loadSheet("idle-winter.png"),
    loadSheet("trans-spring-summer.png"),
    loadSheet("trans-summer-autumn.png"),
    loadSheet("trans-autumn-winter.png"),
  ]);
  idle[0] = s; idle[1] = su; idle[2] = a; idle[3] = w;
  trans[0] = t01; trans[1] = t12; trans[2] = t23;
  loaded = idle.every(Boolean);
  return loaded;
}

export function willowLoaded(): boolean {
  return loaded;
}

function drawFrame(ctx: CanvasRenderingContext2D, clip: Clip, frame: number): void {
  const f = Math.max(0, Math.min(clip.frames - 1, frame));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(clip.bmp, f * FRAME, 0, FRAME, FRAME, -DRAW / 2, -DRAW / 2, DRAW, DRAW);
}

/** Draw the willow into an origin-centered tile context.
 *
 *  `tSec` is the elapsed-seconds animation clock. A non-positive `tSec` means a
 *  static bake (initial/resize/reduced-motion or an explicit snap): the willow
 *  jumps straight to `season`'s idle rest frame with no transition. A positive
 *  `tSec` drives the loop and, on an adjacent forward season change, plays that
 *  transition once before settling into the new idle. */
export function paintWillow(
  ctx: CanvasRenderingContext2D,
  season: SeasonName | null,
  tSec: number,
): void {
  if (!loaded) return;
  const idx = season ? Math.max(0, Math.min(3, SEASON_NAMES.indexOf(season))) : curIdx;

  if (tSec <= 0) {
    curIdx = idx;
    mode = "idle";
    const c = idle[idx];
    if (c) drawFrame(ctx, c, 0);
    return;
  }

  const settled = mode === "trans" ? transTo : curIdx;
  if (idx !== settled) {
    if (mode === "idle" && idx === curIdx + 1 && trans[curIdx]) {
      mode = "trans";
      transTo = idx;
      transStart = tSec;
    } else {
      // jump, backward, or no clip (e.g. winter -> next-run spring) -> snap
      curIdx = idx;
      mode = "idle";
    }
  }

  if (mode === "trans") {
    const c = trans[curIdx];
    if (c) {
      const lf = Math.floor(((tSec - transStart) * 1000) / TRANS_MS);
      if (lf < c.frames - 1) {
        drawFrame(ctx, c, lf);
        return;
      }
    }
    curIdx = transTo;
    mode = "idle";
  }

  const c = idle[curIdx];
  if (!c) return;
  drawFrame(ctx, c, Math.floor((tSec * 1000) / IDLE_MS) % c.frames);
}
