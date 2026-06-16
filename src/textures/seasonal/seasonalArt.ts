// Registry-driven baked seasonal tile art.
//
// A subject tile (e.g. the willow tree, the chicken) renders pre-baked PixelLab
// art instead of its procedural icon: a per-season idle micro-loop, and — when the
// in-session season advances — the forward transition clip plays once before the
// new idle resumes. Add a subject by dropping its spritesheets in
// public/seasonal-tiles/<dir>/ and adding one REGISTRY entry; the controller is
// shared (only the art differs — animals/minerals are constant-subject so the same
// idle/transition machinery works).
//
// Source of truth for the art is docs/seasonal-tile-system/; sheets are packed by
// tools/pixellab/pack_sheets.py. Self-contained: imports only the season-name types
// (no cycle back to textures.ts). Per-subject state is module-level + keyed by tile
// key because every tile of a key shares one canvas texture and animates in lockstep.

import { SEASON_NAMES, type SeasonName } from "./types.js";

const DRAW = 64;        // px the art is blitted at, centered, in the 74px tile (any native frame size)
const IDLE_MS = 130;    // ms per idle frame
const TRANS_MS = 70;    // ms per transition frame

/** tile `res.key` -> the public/seasonal-tiles/<dir>/ folder holding its sheets. */
const REGISTRY: Record<string, { dir: string }> = {
  tile_tree_willow: { dir: "willow" },
  tile_bird_chicken: { dir: "chicken" },
};

/** Tiles whose art is fully baked — TileObj skips its angle-sway for these (the
 *  motion is in the frames and the ground pad must not rotate). */
export const BAKED_SEASONAL_KEYS: ReadonlySet<string> = new Set(Object.keys(REGISTRY));

interface Clip {
  bmp: CanvasImageSource;
  frames: number;
  fw: number; // square frame size (native), derived from the sheet height
}
interface State {
  idle: (Clip | null)[]; // by season index 0..3
  trans: (Clip | null)[]; // [i] = season i -> i+1
  loaded: boolean;
  curIdx: number;
  mode: "idle" | "trans";
  transTo: number;
  transStart: number;
}

const states = new Map<string, State>();

// React menu icons (tile collection, ledgers, …) bake their canvas once. They
// want the baked spring "reference" still instead of the procedural icon, but
// the sheets load async — so we expose a one-time load kick + a "loaded"
// subscription those canvases can use to re-bake once the art arrives.
const loadListeners = new Set<() => void>();
let loadKicked = false;

/** Subscribe to "seasonal art finished (pre)loading". Returns an unsubscribe.
 *  Fires once per `preloadSeasonalArt()` completion. */
export function onSeasonalArtLoaded(cb: () => void): () => void {
  loadListeners.add(cb);
  return () => { loadListeners.delete(cb); };
}

/** Kick the one-time preload if nothing has started it yet. Lets menu icon
 *  draws trigger the load on the Phaser-free Dev Panel, where GameScene (which
 *  normally calls `preloadSeasonalArt`) never runs. */
export function ensureSeasonalArtLoaded(): void {
  if (loadKicked) return;
  void preloadSeasonalArt();
}

function baseUrl(dir: string): string {
  const b = import.meta.env.BASE_URL ?? "/";
  return `${b.replace(/\/?$/, "/")}seasonal-tiles/${dir}/`;
}

async function loadSheet(url: string): Promise<Clip | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const bmp = await createImageBitmap(await resp.blob());
    const fw = bmp.height; // sheets are one row of square frames
    return { bmp, fw, frames: Math.max(1, Math.round(bmp.width / fw)) };
  } catch {
    return null;
  }
}

/** Load every registered subject's spritesheets once. The four idle loops are
 *  required (a subject is "loaded" only if they all arrive); transitions are
 *  optional (a missing one just snaps). No-ops in environments without fetch /
 *  createImageBitmap (e.g. tests). */
export async function preloadSeasonalArt(): Promise<void> {
  loadKicked = true;
  if (typeof fetch === "undefined" || typeof createImageBitmap === "undefined") return;
  await Promise.all(
    Object.entries(REGISTRY).map(async ([key, sub]) => {
      if (states.get(key)?.loaded) return;
      const u = baseUrl(sub.dir);
      const [s, su, a, w, t01, t12, t23] = await Promise.all([
        loadSheet(u + "idle-spring.png"),
        loadSheet(u + "idle-summer.png"),
        loadSheet(u + "idle-autumn.png"),
        loadSheet(u + "idle-winter.png"),
        loadSheet(u + "trans-spring-summer.png"),
        loadSheet(u + "trans-summer-autumn.png"),
        loadSheet(u + "trans-autumn-winter.png"),
      ]);
      const idle = [s, su, a, w];
      states.set(key, {
        idle, trans: [t01, t12, t23], loaded: idle.every(Boolean),
        curIdx: 0, mode: "idle", transTo: 0, transStart: 0,
      });
    }),
  );
  // Let menu icon canvases that baked before the art arrived re-bake now.
  loadListeners.forEach((cb) => cb());
}

export function seasonalArtLoaded(key: string): boolean {
  return !!states.get(key)?.loaded;
}

function drawFrame(ctx: CanvasRenderingContext2D, clip: Clip, frame: number): void {
  const f = Math.max(0, Math.min(clip.frames - 1, frame));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(clip.bmp, f * clip.fw, 0, clip.fw, clip.fw, -DRAW / 2, -DRAW / 2, DRAW, DRAW);
}

/** Draw a registered subject's spring "reference" still (the Spring idle rest
 *  frame) into an origin-centered context — the static art menu icons should
 *  show so they match the board. Returns false if the art hasn't loaded yet, so
 *  the caller can fall back to its procedural icon (and kick a load). */
export function paintSeasonalReference(ctx: CanvasRenderingContext2D, key: string): boolean {
  const st = states.get(key);
  if (!st || !st.loaded) return false;
  const spring = st.idle[0]; // SEASON_NAMES[0] === "Spring"
  if (!spring) return false;
  drawFrame(ctx, spring, 0);
  return true;
}

/** Draw a registered subject into an origin-centered tile context. `tSec <= 0` is a
 *  static bake (snap to the season's idle rest frame, no transition); `tSec > 0`
 *  drives the loop and, on an adjacent forward season change, plays that transition
 *  once before settling into the new idle. Season changes are self-detected from the
 *  `season` passed each call. */
export function paintSeasonalArt(
  ctx: CanvasRenderingContext2D,
  key: string,
  season: SeasonName | null,
  tSec: number,
): void {
  const st = states.get(key);
  if (!st || !st.loaded) return;
  const idx = season ? Math.max(0, Math.min(3, SEASON_NAMES.indexOf(season))) : st.curIdx;

  if (tSec <= 0) {
    st.curIdx = idx;
    st.mode = "idle";
    const c = st.idle[idx];
    if (c) drawFrame(ctx, c, 0);
    return;
  }

  const settled = st.mode === "trans" ? st.transTo : st.curIdx;
  if (idx !== settled) {
    if (st.mode === "idle" && idx === st.curIdx + 1 && st.trans[st.curIdx]) {
      st.mode = "trans"; st.transTo = idx; st.transStart = tSec;
    } else {
      st.curIdx = idx; st.mode = "idle"; // jump / backward / no clip -> snap
    }
  }

  if (st.mode === "trans") {
    const c = st.trans[st.curIdx];
    if (c) {
      const lf = Math.floor(((tSec - st.transStart) * 1000) / TRANS_MS);
      if (lf < c.frames - 1) { drawFrame(ctx, c, lf); return; }
    }
    st.curIdx = st.transTo; st.mode = "idle";
  }

  const c = st.idle[st.curIdx];
  if (!c) return;
  drawFrame(ctx, c, Math.floor((tSec * 1000) / IDLE_MS) % c.frames);
}
