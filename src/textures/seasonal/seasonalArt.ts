// Zero-config, incremental seasonal tile art.
//
// A puzzle tile renders pre-baked PixelLab PNG art instead of its procedural vector
// icon by dropping a folder named after the tile key into public/seasonal-tiles/ —
// e.g. public/seasonal-tiles/tile_tree_willow/. NO code change: the `seasonalSubjects()`
// Vite plugin discovers every such folder and feeds the manifest in via the
// `virtual:seasonal-subjects` module. The controller is shared across all subjects
// (only the art differs).
//
// Incremental rollout (add art in phases):
//   • Drop just idle-summer.png and the tile is fully baked — that one frame stands in
//     for EVERY season and during transitions, completely replacing the old vector art.
//   • Add idle-<season>.png / trans-<from>-<to>.png later and they swap in automatically;
//     any season still missing keeps falling back to the Summer anchor (then to whatever
//     frame is present). A missing transition just snaps.
//
// Sheets are packed by tools/pixellab/pack_sheets.py (one row of square frames, no bg);
// source of truth for the art is docs/seasonal-tile-system/. Self-contained: imports
// only the season-name types. Per-subject state is module-level + keyed by tile key
// because every tile of a key shares one canvas texture and animates in lockstep.

import { SEASON_NAMES, type SeasonName } from "./types.js";
import { SEASONAL_MANIFEST } from "virtual:seasonal-subjects";

const DRAW = 64;        // px the art is blitted at, centered, in the 74px tile (any native frame size)
const IDLE_MS = 130;    // ms per idle frame
const TRANS_MS = 70;    // ms per transition frame

// SEASON_NAMES === ["Spring", "Summer", "Autumn", "Winter"]. Summer is the anchor: the
// first keyframe authored, and the placeholder every other season falls back to.
const SUMMER = 1;
const IDLE_FILES = ["idle-spring.png", "idle-summer.png", "idle-autumn.png", "idle-winter.png"] as const;
const TRANS_FILES = ["trans-spring-summer.png", "trans-summer-autumn.png", "trans-autumn-winter.png"] as const;

/** tile key (== public/seasonal-tiles/<dir>/ folder name) -> the PNG filenames it ships,
 *  discovered at build time. `?? {}` keeps non-Vite tooling happy. */
const MANIFEST: Record<string, string[]> = SEASONAL_MANIFEST ?? {};

/** Every tile key that has a seasonal-art folder (the *intent* set — used by menu icons
 *  to know a baked reference may exist and to kick the load). A key here can still be
 *  inactive if none of its sheets decoded; gate rendering on `seasonalArtActive()`. */
export const SEASONAL_SUBJECT_KEYS: ReadonlySet<string> = new Set(Object.keys(MANIFEST));

interface Clip {
  bmp: CanvasImageSource;
  frames: number;
  fw: number; // square frame size (native), derived from the sheet height
}
interface State {
  idle: (Clip | null)[]; // by season index 0..3
  trans: (Clip | null)[]; // [i] = season i -> i+1
  active: boolean; // ≥1 idle decoded — the tile renders baked art (summer-anchored)
  curIdx: number;
  mode: "idle" | "trans";
  transTo: number;
  transStart: number;
}

const states = new Map<string, State>();

// React menu icons (tile collection, ledgers, …) bake their canvas once. They
// want the baked reference still instead of the procedural icon, but the sheets
// load async — so we expose a one-time load kick + a "loaded" subscription those
// canvases can use to re-bake once the art arrives.
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

/** Load every discovered subject's spritesheets once, fetching only the PNGs the
 *  manifest says are present (no 404 probing for not-yet-authored seasons). A subject
 *  becomes active as soon as ANY idle decodes — typically the Summer anchor dropped
 *  first. No-ops in environments without fetch / createImageBitmap (e.g. tests). */
export async function preloadSeasonalArt(): Promise<void> {
  loadKicked = true;
  if (typeof fetch === "undefined" || typeof createImageBitmap === "undefined") return;
  await Promise.all(
    Object.entries(MANIFEST).map(async ([key, files]) => {
      if (states.get(key)?.active) return;
      const present = new Set(files);
      const u = baseUrl(key);
      const load = (f: string): Promise<Clip | null> =>
        present.has(f) ? loadSheet(u + f) : Promise.resolve(null);
      const [idle, trans] = await Promise.all([
        Promise.all(IDLE_FILES.map(load)),
        Promise.all(TRANS_FILES.map(load)),
      ]);
      states.set(key, {
        idle, trans, active: idle.some(Boolean),
        curIdx: 0, mode: "idle", transTo: 0, transStart: 0,
      });
    }),
  );
  // Let menu icon canvases that baked before the art arrived re-bake now.
  loadListeners.forEach((cb) => cb());
}

/** True once a subject has at least one season decoded — i.e. its baked art should
 *  fully replace the procedural icon (and the sprite-angle sway). */
export function seasonalArtActive(key: string): boolean {
  return !!states.get(key)?.active;
}

/** The idle-clip index to draw for season `idx` given which seasons decoded: the exact
 *  season if present, else the Summer anchor, else the first available, else -1. This is
 *  the incremental placeholder rule — a Summer-only drop renders Summer for every season.
 *  Pure + exported for tests. */
export function fallbackIdleIndex(present: readonly boolean[], idx: number): number {
  if (present[idx]) return idx;
  if (present[SUMMER]) return SUMMER;
  return present.findIndex(Boolean);
}

function resolveIdle(st: State, idx: number): Clip | null {
  const i = fallbackIdleIndex(st.idle.map(Boolean), idx);
  return i >= 0 ? st.idle[i] : null;
}

function drawFrame(ctx: CanvasRenderingContext2D, clip: Clip, frame: number): void {
  const f = Math.max(0, Math.min(clip.frames - 1, frame));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(clip.bmp, f * clip.fw, 0, clip.fw, clip.fw, -DRAW / 2, -DRAW / 2, DRAW, DRAW);
}

/** Draw a subject's "reference" still (Spring rest frame if present, else the Summer
 *  anchor / first available) into an origin-centered context — the static art menu
 *  icons should show so they match the board. Returns false if the art hasn't loaded
 *  yet, so the caller can fall back to its procedural icon (and kick a load). */
export function paintSeasonalReference(ctx: CanvasRenderingContext2D, key: string): boolean {
  const st = states.get(key);
  if (!st || !st.active) return false;
  const ref = resolveIdle(st, 0); // SEASON_NAMES[0] === "Spring"
  if (!ref) return false;
  drawFrame(ctx, ref, 0);
  return true;
}

/** Draw a subject into an origin-centered tile context. `tSec <= 0` is a static bake
 *  (snap to the season's idle rest frame, no transition); `tSec > 0` drives the loop
 *  and, on an adjacent forward season change, plays that transition once before settling
 *  into the new idle. Missing seasons fall back to the Summer anchor; a missing
 *  transition snaps. Season changes are self-detected from the `season` passed each call. */
export function paintSeasonalArt(
  ctx: CanvasRenderingContext2D,
  key: string,
  season: SeasonName | null,
  tSec: number,
): void {
  const st = states.get(key);
  if (!st || !st.active) return;
  const idx = season ? Math.max(0, Math.min(3, SEASON_NAMES.indexOf(season))) : st.curIdx;

  if (tSec <= 0) {
    st.curIdx = idx;
    st.mode = "idle";
    const c = resolveIdle(st, idx);
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

  const c = resolveIdle(st, st.curIdx);
  if (!c) return;
  drawFrame(ctx, c, Math.floor((tSec * 1000) / IDLE_MS) % c.frames);
}
