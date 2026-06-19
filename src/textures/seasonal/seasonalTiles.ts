// Seasonal-tile registry + accessors.
//
// Aggregates per-category seasonal art and exposes season-aware lookups for the
// board baker (`src/textures.ts`) and the Dev Panel gallery (`IconsTab.tsx`).
// This is purely additive — base `ICON_REGISTRY` keys are never removed/renamed.
//
// Two flavours of seasonal art share this registry:
//   • Per-season {draw, anim} — a full redraw + subtle idle loop per season
//     (the grain pilot family, and the showcase tiles below).
//   • Forward season→season TRANSITIONS — a small morph played once when the
//     session crosses a season boundary (Spring→Summer→Autumn→Winter). Only the
//     showcase tiles carry these; the engine self-detects the flip and drives
//     the morph via `seasonalVectorAdvance` (mirrors the baked-art controller).
//
// IMPORTANT (import cycle): `src/textures.ts` imports from here, so this module
// must NOT import `drawTileIcon` back from `textures.ts`. `seasonalTileDraw`
// returns `null` when a key/season has no variant; callers fall back to their
// own base-draw path. Animation fallback uses `iconAnimation` (no cycle).

import type {
  SeasonName,
  SeasonalTileEntry,
  SeasonalTransition,
  SeasonalTransitionSet,
} from "./types.js";
import { SEASON_NAMES } from "./types.js";
import { SEASONAL_TILES as GRAIN } from "./grain.js";
import { SHOWCASE_TILES, SHOWCASE_TRANSITIONS } from "./showcaseTiles.js";
import { VECTOR_PREFER_KEYS } from "./vectorPreferKeys.js";
import { iconAnimation } from "../iconAnimations.js";

const REGISTRY: Record<string, SeasonalTileEntry> = {
  ...GRAIN,
  ...SHOWCASE_TILES,
};

/** Forward season→season morphs, keyed by tile key. Only tiles authored with a
 *  full vector lifecycle (the showcase set) appear here. */
const TRANSITIONS: Record<string, SeasonalTransitionSet> = {
  ...SHOWCASE_TRANSITIONS,
};

export const SEASONAL_TILE_KEYS: ReadonlySet<string> = new Set(Object.keys(REGISTRY));

/** Whether `key` has any seasonal art. */
export function hasSeasonalTile(key: string): boolean {
  return SEASONAL_TILE_KEYS.has(key);
}

/** Whether `key` has a per-frame animation for the given season. */
export function hasSeasonalTileAnim(key: string, season: SeasonName | null): boolean {
  return !!(season && REGISTRY[key]?.[season]?.anim);
}

/** Season-aware static draw, or `null` when no variant exists (caller falls
 *  back to the base icon draw). Returns `null` when `season` is null. */
export function seasonalTileDraw(
  key: string,
  season: SeasonName | null,
): ((ctx: CanvasRenderingContext2D) => void) | null {
  const v = season ? REGISTRY[key]?.[season] : undefined;
  return v ? v.draw : null;
}

/** Season-aware animation: the seasonal variant's anim, else the icon's base
 *  animation (`iconAnimation`), else `null`. */
export function seasonalTileAnim(
  key: string,
  season: SeasonName | null,
): ((ctx: CanvasRenderingContext2D, t: number) => void) | null {
  const v = season ? REGISTRY[key]?.[season] : undefined;
  return v?.anim ?? iconAnimation(key) ?? null;
}

// ─── Forward transitions ──────────────────────────────────────────────────────

/** Whether `key` carries ANY forward season→season transition art. Tiles that
 *  do are driven by the self-detecting `seasonalVectorAdvance` controller and
 *  take VECTOR precedence over a baked PNG anchor (`seasonalTilePrefersVector`). */
export function seasonalTileHasTransitions(key: string): boolean {
  return !!TRANSITIONS[key];
}

/** Whether `key` has the specific forward transition `fromIdx → fromIdx+1`
 *  (0 = Spring→Summer, 1 = Summer→Autumn, 2 = Autumn→Winter). */
export function hasSeasonalTransition(key: string, fromIdx: number): boolean {
  return !!TRANSITIONS[key]?.[fromIdx as 0 | 1 | 2];
}

/** The forward transition draw for `key` (`fromIdx → fromIdx+1`), or `null`.
 *  Call it with progress `p` in 0..1. */
export function seasonalTileTransition(key: string, fromIdx: number): SeasonalTransition | null {
  return TRANSITIONS[key]?.[fromIdx as 0 | 1 | 2] ?? null;
}

/** Tiles authored with a full vector lifecycle (per-season draw+anim AND forward
 *  transitions) render their VECTOR art even when a baked PNG summer-anchor exists
 *  for the same key — so the hand-drawn animation wins over the pixel anchor. */
export function seasonalTilePrefersVector(key: string): boolean {
  return VECTOR_PREFER_KEYS.has(key);
}

// ─── Self-detecting transition controller (mirrors the baked-art driver) ──────
//
// The board's per-frame loop re-bakes a procedural seasonal tile each frame. The
// current season is registry-derived, so a season flip simply changes the season
// passed in. Without help that would HARD-CUT between seasons; this controller
// instead detects the flip and reports a forward transition to play once (over
// `TRANS_SECONDS`) before settling into the new season's idle. State is per tile
// key (every on-board instance of a key shares one baked texture, so they
// transition in lockstep) and advanced off the loop's raw elapsed-seconds clock.

const TRANS_SECONDS = 1.4;

interface VectorState {
  /** The season index we are currently settled on / animating the idle of. */
  settledIdx: number;
  /** When transitioning, the from-season index; else null. */
  fromIdx: number | null;
  /** Raw-clock seconds at which the active transition started. */
  startSec: number;
  /** Raw-clock seconds at which we last SETTLED into `settledIdx` (tile creation,
   *  a transition completing, or a snap). The idle clock is measured from here so
   *  every fresh settle starts the idle at its rest pose — which equals the season
   *  still and the frame the just-finished morph ended on, so the morph→idle
   *  hand-off has no positional jump. */
  settledStartSec: number;
}

const vectorState = new Map<string, VectorState>();

/** Reset all per-key transition state (used by tests for determinism). */
export function resetSeasonalVectorState(): void {
  vectorState.clear();
}

export interface VectorSeasonPlan {
  /** True while a forward transition morph should be drawn. */
  transitioning: boolean;
  /** When transitioning: the from-season index (0..2) of the active morph. */
  fromIdx: number;
  /** When transitioning: morph progress in 0..1. */
  p: number;
  /** The season index to idle on when not transitioning. */
  idleIdx: number;
  /** Seconds since this tile last settled into `idleIdx`. Feed this (not the raw
   *  loop clock) to the idle anim so it starts at rest on every fresh settle. */
  idleSec: number;
}

/**
 * Advance the transition state for tile `key` toward the registry-current
 * `season`, using the loop's raw elapsed `tSec`, and report what to draw.
 *
 * On a single forward step (e.g. Spring→Summer) for which transition art exists,
 * a morph is started and reported until it completes; any other change (a skip,
 * a reset back to Spring at a new run, or a missing transition) snaps instantly.
 */
export function seasonalVectorAdvance(
  key: string,
  season: SeasonName,
  tSec: number,
): VectorSeasonPlan {
  const targetIdx = SEASON_NAMES.indexOf(season);
  let st = vectorState.get(key);
  if (!st) {
    st = { settledIdx: targetIdx, fromIdx: null, startSec: tSec, settledStartSec: tSec };
    vectorState.set(key, st);
  }

  // Begin a forward transition when the season has advanced exactly one step and
  // we have art for it; otherwise snap the settled season to the target.
  if (st.fromIdx === null && targetIdx !== st.settledIdx) {
    if (targetIdx === st.settledIdx + 1 && hasSeasonalTransition(key, st.settledIdx)) {
      st.fromIdx = st.settledIdx;
      st.startSec = tSec;
    } else {
      st.settledIdx = targetIdx;
      st.settledStartSec = tSec;
    }
  }

  if (st.fromIdx !== null) {
    const p = (tSec - st.startSec) / TRANS_SECONDS;
    if (p >= 1) {
      st.settledIdx = st.fromIdx + 1;
      st.fromIdx = null;
      st.settledStartSec = tSec; // idle for the new season starts from rest here
    } else {
      return {
        transitioning: true,
        fromIdx: st.fromIdx,
        p: p < 0 ? 0 : p,
        idleIdx: st.settledIdx,
        idleSec: 0,
      };
    }
  }

  return {
    transitioning: false,
    fromIdx: -1,
    p: 0,
    idleIdx: st.settledIdx,
    idleSec: tSec - st.settledStartSec,
  };
}
