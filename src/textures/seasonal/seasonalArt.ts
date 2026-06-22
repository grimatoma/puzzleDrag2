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
// Sheets are packed by reference/tools/pixellab/pack_sheets.py (one row of square frames, no bg);
// source of truth for the art is reference/docs/seasonal-tile-system/. Self-contained: imports
// only the season-name types. Per-subject state is module-level + keyed by tile key
// because every tile of a key shares one canvas texture and animates in lockstep.

import { SEASON_NAMES, type SeasonName } from "./types.js";
import { SEASONAL_MANIFEST } from "virtual:seasonal-subjects";
import { VECTOR_PREFER_KEYS } from "./vectorPreferKeys.js";

const DRAW = 64;        // px the art is blitted at, centered, in the 74px tile (any native frame size)
const IDLE_MS = 130;    // ms per idle frame
const TRANS_MS = 70;    // ms per transition frame

// SEASON_NAMES === ["Spring", "Summer", "Autumn", "Winter"]. Summer is the anchor: the
// first keyframe authored, and the placeholder every other season falls back to.
const SUMMER = 1;
const IDLE_FILES = ["idle-spring.png", "idle-summer.png", "idle-autumn.png", "idle-winter.png"] as const;
const TRANS_FILES = ["trans-spring-summer.png", "trans-summer-autumn.png", "trans-autumn-winter.png"] as const;

/** Every tile key that ships a seasonal-art folder (== public/seasonal-tiles/<dir>/),
 *  discovered at build time. `?? {}` keeps non-Vite tooling happy. */
const FULL_MANIFEST: Record<string, string[]> = (SEASONAL_MANIFEST ?? {}) as Record<string, string[]>;

/** The default baked manifest: every discovered folder EXCEPT the all-vector showcase
 *  keys (their hand-drawn vector art wins by default, so their summer-anchor PNGs are
 *  ignored at runtime — the files stay on disk for an A/B against the pixel route). */
const MANIFEST: Record<string, string[]> = Object.fromEntries(
  Object.entries(FULL_MANIFEST).filter(([key]) => !VECTOR_PREFER_KEYS.has(key)),
);

/** The vector-preferred keys that DO ship a baked PNG folder. Preloaded only when the
 *  pixel-sprite override is on (see {@link setPixelSpriteOverride}) so a player can flip
 *  the whole board from the vector art to the pixel sprites. */
const OVERRIDE_MANIFEST: Record<string, string[]> = Object.fromEntries(
  Object.entries(FULL_MANIFEST).filter(([key]) => VECTOR_PREFER_KEYS.has(key)),
);

/** Every tile key that has a seasonal-art folder (the *intent* set — used by menu icons
 *  to know a baked reference may exist and to kick the load). A key here can still be
 *  inactive if none of its sheets decoded; gate rendering on `seasonalBakedActive()`. */
export const SEASONAL_SUBJECT_KEYS: ReadonlySet<string> = new Set(Object.keys(MANIFEST));

/** Every tile key that ships a seasonal-art folder, INCLUDING the vector-preferred
 *  showcase keys (whose PNGs are otherwise only loaded under the override). Used by the
 *  wiki's "Pixel art" toggle, which can show the baked sprite for any key that has one. */
export const SEASONAL_FOLDER_KEYS: ReadonlySet<string> = new Set(Object.keys(FULL_MANIFEST));

/** Whether `key` has a baked seasonal-art folder on disk (regardless of the vector
 *  preference / override). The wiki uses this to decide if a "Pixel art" sprite exists. */
export function hasSeasonalArtFolder(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(FULL_MANIFEST, key);
}

/** Per-frame timing for the seasonal idle loops / transitions, in ms. Exported so
 *  non-board previews (the wiki tile-detail table) animate at the same cadence. */
export const SEASONAL_IDLE_MS = IDLE_MS;
export const SEASONAL_TRANS_MS = TRANS_MS;

// ─── Pixel-sprite override ────────────────────────────────────────────────────
//
// A Settings toggle that forces EVERY tile (including the all-vector showcase keys)
// to render its baked PixelLab pixel sprite instead of the hand-drawn vector art.
// The flag is persisted in the game settings (`hearth.settings`) so the menu-icon
// path — which has no React wiring — can read it at module load; the React layer
// calls `setPixelSpriteOverride()` to flip it at runtime.

const SETTINGS_STORAGE_KEY = "hearth.settings";

function readPixelOverrideFromStorage(): boolean {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    if (raw) return !!(JSON.parse(raw) as { pixelSpriteOverride?: boolean }).pixelSpriteOverride;
  } catch { /* storage unavailable / corrupt */ }
  return false;
}

let pixelOverride = readPixelOverrideFromStorage();

/** Whether the pixel-sprite override is currently on. */
export function isPixelSpriteOverride(): boolean {
  return pixelOverride;
}

// Fires when the override flips (either direction) so the Phaser scene can re-bake.
const overrideListeners = new Set<() => void>();

/** Subscribe to pixel-sprite-override changes. Returns an unsubscribe. */
export function onPixelSpriteOverrideChange(cb: () => void): () => void {
  overrideListeners.add(cb);
  return () => { overrideListeners.delete(cb); };
}

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
let allLoadKicked = false;

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

/** Load EVERY discovered subject's spritesheets — both the default manifest and the
 *  vector-preferred (override) manifest — regardless of the pixel-sprite override.
 *  The wiki "Pixel art" preview needs the baked sprite for any key that has a folder,
 *  even the showcase tiles whose vector art normally wins. No-ops without fetch. */
export async function preloadAllSeasonalArt(): Promise<void> {
  loadKicked = true;
  allLoadKicked = true;
  if (typeof fetch === "undefined" || typeof createImageBitmap === "undefined") return;
  await loadManifest(MANIFEST);
  await loadManifest(OVERRIDE_MANIFEST);
  loadListeners.forEach((cb) => cb());
}

/** Kick the one-time "load all seasonal folders" preload if nothing has started it. */
export function ensureAllSeasonalArtLoaded(): void {
  if (allLoadKicked) return;
  void preloadAllSeasonalArt();
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

/** Load one manifest's subjects, fetching only the PNGs it says are present (no 404
 *  probing for not-yet-authored seasons). A subject becomes active as soon as ANY idle
 *  decodes — typically the Summer anchor dropped first. */
async function loadManifest(manifest: Record<string, string[]>): Promise<void> {
  await Promise.all(
    Object.entries(manifest).map(async ([key, files]) => {
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
}

/** Load every discovered subject's spritesheets once. The vector-preferred keys are only
 *  fetched when the pixel-sprite override is on. No-ops in environments without fetch /
 *  createImageBitmap (e.g. tests). */
export async function preloadSeasonalArt(): Promise<void> {
  loadKicked = true;
  if (typeof fetch === "undefined" || typeof createImageBitmap === "undefined") return;
  await loadManifest(MANIFEST);
  if (pixelOverride) await loadManifest(OVERRIDE_MANIFEST);
  // Let menu icon canvases that baked before the art arrived re-bake now.
  loadListeners.forEach((cb) => cb());
}

/** Flip the pixel-sprite override at runtime. Turning it ON lazily preloads the
 *  vector-preferred keys' baked PNGs (skipped by the default preload). Notifies menu-icon
 *  canvases (loadListeners) and the Phaser scene (overrideListeners) so they re-bake to
 *  the now-preferred art — in BOTH directions, since turning it off must restore the
 *  vector art for those keys. */
export async function setPixelSpriteOverride(on: boolean): Promise<void> {
  if (pixelOverride === on) return;
  pixelOverride = on;
  if (on && typeof fetch !== "undefined" && typeof createImageBitmap !== "undefined") {
    await loadManifest(OVERRIDE_MANIFEST);
  }
  loadListeners.forEach((cb) => cb());
  overrideListeners.forEach((cb) => cb());
}

/** True once a subject has at least one season decoded — i.e. its baked art HAS loaded.
 *  This is the raw load gate; use {@link seasonalBakedActive} for the render decision
 *  (which also honours the vector preference and the pixel-sprite override). */
export function seasonalArtActive(key: string): boolean {
  return !!states.get(key)?.active;
}

/** Whether `key` should render its BAKED pixel sprite right now: its sheets have decoded
 *  AND it isn't an all-vector showcase key — UNLESS the pixel-sprite override forces the
 *  pixel route for every key. The single render-time gate for "pixel vs vector". */
export function seasonalBakedActive(key: string): boolean {
  if (!states.get(key)?.active) return false;
  if (VECTOR_PREFER_KEYS.has(key)) return pixelOverride;
  return true;
}

/** Whether `key` could render baked art under the current settings — lets menu icons
 *  decide whether to kick the art load and prefer the baked reference (the
 *  vector-preferred keys only qualify while the override is on). */
export function isPotentialBakedSubject(key: string): boolean {
  return SEASONAL_SUBJECT_KEYS.has(key)
    || (pixelOverride && Object.prototype.hasOwnProperty.call(OVERRIDE_MANIFEST, key));
}

/** Every loaded key that should render baked art right now (honours the override).
 *  Used by the scene to know which tiles to re-bake as pixel-sprite frame-banks. */
export function bakedActiveKeys(): string[] {
  const out: string[] = [];
  for (const key of states.keys()) {
    if (seasonalBakedActive(key)) out.push(key);
  }
  return out;
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

/** Clamp a season to its index 0..3, or fall back to `cur` when no season is set. */
function seasonIdx(season: SeasonName | null, cur: number): number {
  return season ? Math.max(0, Math.min(3, SEASON_NAMES.indexOf(season))) : cur;
}

/** Mutable slice of the per-key transition state machine. */
export interface TransState { curIdx: number; mode: "idle" | "trans"; transTo: number; transStart: number; }

/** What to render for a subject this tick, plus the (already-advanced) state. */
export interface SeasonalPlan {
  active: boolean;
  /** Mid-transition: render `transFrame` of the `transFromIdx → +1` clip, in lockstep
   *  across all instances (a season change is global). */
  transitioning: boolean;
  transFromIdx: number;
  transFrame: number;
  /** The settled idle season — what the per-tile idle bank should hold. */
  settledSeasonIdx: number;
  /** Resolved idle clip index after Summer-anchor fallback (cache key for re-bakes). */
  resolvedIdleIdx: number;
  /** Idle frame count for the settled season (1 = static still). */
  idleFrames: number;
}

/**
 * Pure transition state machine: given the current state, the target season `idx`,
 * and the clip facts, return the next state and what to render. `tSec <= 0` snaps to
 * idle (a static bake); an adjacent forward season change with a transition clip plays
 * it once before settling; anything else snaps. Pure + exported for tests.
 */
export function advanceTransition(
  st: TransState,
  idx: number,
  hasTransFrom: (fromIdx: number) => boolean,
  transFrames: (fromIdx: number) => number,
  tSec: number,
): { state: TransState; transitioning: boolean; transFromIdx: number; transFrame: number; settledSeasonIdx: number } {
  const s: TransState = { ...st };
  if (tSec <= 0) {
    s.curIdx = idx; s.mode = "idle";
    return { state: s, transitioning: false, transFromIdx: idx, transFrame: 0, settledSeasonIdx: idx };
  }
  const settled = s.mode === "trans" ? s.transTo : s.curIdx;
  if (idx !== settled) {
    if (s.mode === "idle" && idx === s.curIdx + 1 && hasTransFrom(s.curIdx)) {
      s.mode = "trans"; s.transTo = idx; s.transStart = tSec;
    } else {
      s.curIdx = idx; s.mode = "idle"; // jump / backward / no clip -> snap
    }
  }
  if (s.mode === "trans") {
    const n = transFrames(s.curIdx);
    if (n > 0) {
      const lf = Math.floor(((tSec - s.transStart) * 1000) / TRANS_MS);
      if (lf < n - 1) {
        return { state: s, transitioning: true, transFromIdx: s.curIdx, transFrame: lf, settledSeasonIdx: s.curIdx };
      }
    }
    s.curIdx = s.transTo; s.mode = "idle";
  }
  return { state: s, transitioning: false, transFromIdx: s.curIdx, transFrame: 0, settledSeasonIdx: s.curIdx };
}

/** Advance a subject's transition state machine one tick and report what to render.
 *  Mutates the module state, so call exactly once per key per tick (the per-frame
 *  board loop is the single driver). Inactive subjects return a no-op plan. */
export function seasonalAdvance(key: string, season: SeasonName | null, tSec: number): SeasonalPlan {
  const st = states.get(key);
  if (!st || !st.active) {
    return { active: false, transitioning: false, transFromIdx: 0, transFrame: 0, settledSeasonIdx: 0, resolvedIdleIdx: -1, idleFrames: 0 };
  }
  const idx = seasonIdx(season, st.curIdx);
  const r = advanceTransition(
    { curIdx: st.curIdx, mode: st.mode, transTo: st.transTo, transStart: st.transStart },
    idx,
    (from) => !!st.trans[from],
    (from) => st.trans[from]?.frames ?? 0,
    tSec,
  );
  st.curIdx = r.state.curIdx; st.mode = r.state.mode; st.transTo = r.state.transTo; st.transStart = r.state.transStart;
  const idleClip = resolveIdle(st, r.settledSeasonIdx);
  return {
    active: true,
    transitioning: r.transitioning,
    transFromIdx: r.transFromIdx,
    transFrame: r.transFrame,
    settledSeasonIdx: r.settledSeasonIdx,
    resolvedIdleIdx: fallbackIdleIndex(st.idle.map(Boolean), r.settledSeasonIdx),
    idleFrames: idleClip ? idleClip.frames : 0,
  };
}

/** True while a subject is mid season-transition — instances should render the
 *  lockstep transition frame, not their own idle frame. */
export function seasonalIsTransitioning(key: string): boolean {
  return states.get(key)?.mode === "trans";
}

/** Idle frame count for `key` at `season` (after Summer-anchor fallback): >1 means a
 *  real idle loop, 1 a static still, 0 when nothing decoded. */
export function seasonalIdleFrameCount(key: string, season: SeasonName | null): number {
  const st = states.get(key);
  if (!st || !st.active) return 0;
  const c = resolveIdle(st, seasonIdx(season, st.curIdx));
  return c ? c.frames : 0;
}

/** Frame count of the forward transition clip `fromIdx → fromIdx+1` (0 = Spring→Summer,
 *  1 = Summer→Autumn, 2 = Autumn→Winter), or 0 when that transition has no art. */
export function seasonalTransFrameCount(key: string, fromIdx: number): number {
  const st = states.get(key);
  if (!st || !st.active) return 0;
  return st.trans[fromIdx]?.frames ?? 0;
}

/** The widest idle clip across every decoded season — the frame-bank width a subject
 *  needs so one strip texture survives season changes. */
export function seasonalMaxIdleFrames(key: string): number {
  const st = states.get(key);
  if (!st || !st.active) return 0;
  return st.idle.reduce((m, c) => (c ? Math.max(m, c.frames) : m), 0);
}

/** Draw idle `frame` of the resolved season into an origin-centered context. Pure
 *  (no state mutation) — the caller owns frame selection (per-tile timing). */
export function paintSeasonalIdleFrame(
  ctx: CanvasRenderingContext2D,
  key: string,
  season: SeasonName | null,
  frame: number,
): void {
  const st = states.get(key);
  if (!st || !st.active) return;
  const c = resolveIdle(st, seasonIdx(season, st.curIdx));
  if (c) drawFrame(ctx, c, frame);
}

/** Draw `frame` of the `fromIdx → fromIdx+1` transition clip into an origin-centered
 *  context. Pure — used to bake the lockstep transition frame. */
export function paintSeasonalTransFrame(
  ctx: CanvasRenderingContext2D,
  key: string,
  fromIdx: number,
  frame: number,
): void {
  const st = states.get(key);
  if (!st || !st.active) return;
  const c = st.trans[fromIdx];
  if (c) drawFrame(ctx, c, frame);
}

/** Draw a subject into an origin-centered tile context, advancing its transition
 *  state machine. `tSec <= 0` is a static bake (idle rest frame). Retained for the
 *  static-still bake path and any non-board caller; the board drives multi-frame idle
 *  per-tile via `seasonalAdvance` + `paintSeasonalIdleFrame` instead of this loop. */
export function paintSeasonalArt(
  ctx: CanvasRenderingContext2D,
  key: string,
  season: SeasonName | null,
  tSec: number,
): void {
  const plan = seasonalAdvance(key, season, tSec);
  if (!plan.active) return;
  if (plan.transitioning) {
    paintSeasonalTransFrame(ctx, key, plan.transFromIdx, plan.transFrame);
    return;
  }
  const st = states.get(key)!;
  const c = resolveIdle(st, plan.settledSeasonIdx);
  if (!c) return;
  drawFrame(ctx, c, tSec <= 0 ? 0 : Math.floor((tSec * 1000) / IDLE_MS) % c.frames);
}
