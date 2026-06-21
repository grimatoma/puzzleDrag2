// src/config/progression/cumulative.ts
//
// Pure, framework-free projection of the progression spine into an ordered list
// of "points" and, for any point, the CUMULATIVE state of the game at that
// moment — everything unlocked from the start up to and including that point,
// plus the running costs paid to get there.
//
// THE PROBLEM THIS SOLVES. The Dev-Panel timeline shows each milestone in
// isolation. To balance unlock order and cost you need to stand at a point (say
// the Mill) and see the whole accumulated state: every tile/building/recipe
// unlocked so far and the coins/resources spent. This module computes that by
// walking the curated `PROGRESSION_TRIGGERS` spine (ordering + narrative) and
// enriching each point with LIVE data read from `ZONES` and `TILE_TYPES`, so the
// numbers never drift from the game.
//
// No React, no Phaser — safe to import from the `/b/` bundle and to unit-test.

import { PROGRESSION_TRIGGERS } from "./triggers.js";
import type { ProgTrigger, Effect, Cond, ConsequenceKind } from "./types.js";
import { ZONES, tiersForZone } from "../../features/zones/data.js";
import type { ZoneTier } from "../../features/zones/data.js";
import { TILE_TYPES } from "../../features/tileCollection/data.js";

/** The unlock buckets, in the order they should be presented. */
export type Category = ConsequenceKind;

export const CATEGORY_ORDER: Category[] = [
  "zone", "tile", "resource", "building", "recipe", "tool",
  "worker", "effect", "system", "story", "hazard",
];

/** Which "Unlocked → <Category>" bucket an effect belongs to. */
export function effectCategory(e: Effect): Category {
  switch (e.kind) {
    case "unlockZone":     return "zone";
    case "discoverTile":   return "tile";
    case "unlockBuilding": return "building";
    case "unlockRecipe":   return "recipe";
    case "unlockTool":     return "tool";
    case "unlockWorker":   return "worker";
    case "grant":          return "resource";
    case "advanceAct":
    case "showBeat":       return "story";
    case "note":           return e.consequence;
    default:               return "effect";
  }
}

/** A stable identity for an effect, used to de-duplicate across triggers. */
export function effectKey(e: Effect): string {
  switch (e.kind) {
    case "unlockZone":     return `zone:${e.zone}`;
    case "unlockBuilding": return `building:${e.building}`;
    case "discoverTile":   return `tile:${e.tile}`;
    case "unlockRecipe":   return `recipe:${e.recipe}`;
    case "unlockTool":     return `tool:${e.tool}`;
    case "unlockWorker":   return `worker:${e.worker}`;
    case "note":           return `note:${e.consequence}:${e.label}`;
    case "advanceAct":     return `act:${e.to}`;
    case "showBeat":       return `beat:${e.beat}`;
    case "grant":          return `grant:${e.coins ?? 0}:${Object.keys(e.resources ?? {}).sort().join(",")}`;
    default:               return JSON.stringify(e);
  }
}

// ─── Spine ordering ───────────────────────────────────────────────────────────

function milestones(): ProgTrigger[] {
  return PROGRESSION_TRIGGERS.filter((t) => t.milestone);
}

/** Non-milestone triggers that `requires` the given milestone id. */
export function childrenOf(milestoneId: string): ProgTrigger[] {
  return PROGRESSION_TRIGGERS.filter(
    (t) => !t.milestone && (t.requires ?? []).includes(milestoneId),
  );
}

/**
 * The progression spine flattened into an ordered list of "points": each
 * milestone followed immediately by the build/child events that branch off it.
 * Selecting a point means "everything up to and including this point".
 *
 * Milestones keep their authored array order; a child appears under the
 * milestone it requires. Because cross-milestone gates (e.g. Open the Mine
 * requires the Kitchen, a child of Arrive) are expressed via `requires`, the
 * gating prerequisite always lands earlier in this list than the gate.
 */
export function progressionPoints(): ProgTrigger[] {
  const out: ProgTrigger[] = [];
  for (const m of milestones()) {
    out.push(m);
    for (const c of childrenOf(m.id)) out.push(c);
  }
  return out;
}

// ─── Tile-unlock derivation (curated spine ↔ live catalogue) ──────────────────

interface TileDef {
  id: string;
  discovery?: { method?: string; buildingId?: string; zoneId?: string };
}

/** Collect every `fact` string referenced anywhere in a condition tree. */
function condFacts(cond: Cond | undefined): string[] {
  if (!cond) return [];
  if ("fact" in cond) return [cond.fact];
  if ("all" in cond) return cond.all.flatMap(condFacts);
  if ("any" in cond) return cond.any.flatMap(condFacts);
  if ("not" in cond) return condFacts(cond.not);
  return [];
}

/**
 * Tiles the live catalogue says unlock AT this trigger — derived rather than
 * hand-listed so the timeline never drifts from `TILE_TYPES.discovery`:
 *   - a `building.<id>.built` trigger surfaces tiles gated on that building, and
 *   - a zone-founding trigger surfaces tiles gated on that zone.
 */
export function tilesUnlockedAtTrigger(trigger: ProgTrigger): string[] {
  const facts = condFacts(trigger.when);
  const buildingIds = new Set<string>();
  const zoneIds = new Set<string>();
  for (const f of facts) {
    const b = /^building\.(.+)\.built$/.exec(f);
    if (b) buildingIds.add(b[1]);
    const z = /^zone\.(.+)\.founded$/.exec(f);
    if (z) zoneIds.add(z[1]);
  }
  for (const e of trigger.effects) {
    if (e.kind === "unlockZone") zoneIds.add(e.zone);
  }
  const out: string[] = [];
  for (const t of TILE_TYPES as ReadonlyArray<TileDef>) {
    const d = t.discovery;
    if (!d) continue;
    if (d.method === "building" && d.buildingId && buildingIds.has(d.buildingId)) out.push(t.id);
    else if (d.method === "zone" && d.zoneId && zoneIds.has(d.zoneId)) out.push(t.id);
  }
  return out;
}

// ─── Cumulative state ─────────────────────────────────────────────────────────

export interface UnlockBucket {
  category: Category;
  effects: Effect[];
}

export interface ZoneEntryCost {
  zone: string;
  coins: number;
}

export interface ZoneTierLadder {
  zone: string;
  tiers: ZoneTier[];
}

export interface CumulativeState {
  throughId: string;
  label: string;
  pointIndex: number;
  /** Accumulated, de-duplicated unlocks bucketed and ordered by category. */
  unlocked: UnlockBucket[];
  /** Tile ids derived live from building/zone gating, accumulated + deduped. */
  derivedTiles: string[];
  costs: {
    zoneEntry: ZoneEntryCost[];
    runningCoins: number;
    /** Upgrade-cost ladders for every founded zone (reference, not summed). */
    tierLadders: ZoneTierLadder[];
  };
}

/**
 * Compute the cumulative game state at the point identified by `throughId`
 * (a trigger id). Accumulates every effect from the first point up to and
 * including the target, then layers live costs (zone entry coins from `ZONES`,
 * tier-upgrade ladders from `tiersForZone`) and derived tile unlocks on top.
 */
export function cumulativeThrough(throughId: string): CumulativeState | null {
  const points = progressionPoints();
  const idx = points.findIndex((p) => p.id === throughId);
  if (idx < 0) return null;

  const byCategory = new Map<Category, Effect[]>();
  const seenEffect = new Set<string>();
  const zoneEntry: ZoneEntryCost[] = [];
  const seenZone = new Set<string>();
  const tierLadders: ZoneTierLadder[] = [];
  const derivedTiles: string[] = [];
  const seenTile = new Set<string>();
  let runningCoins = 0;

  for (let i = 0; i <= idx; i++) {
    const trigger = points[i];
    for (const e of trigger.effects) {
      const key = effectKey(e);
      if (!seenEffect.has(key)) {
        seenEffect.add(key);
        const cat = effectCategory(e);
        const bucket = byCategory.get(cat);
        if (bucket) bucket.push(e);
        else byCategory.set(cat, [e]);
      }
      if (e.kind === "unlockZone" && !seenZone.has(e.zone)) {
        seenZone.add(e.zone);
        const coins = (ZONES[e.zone]?.entryCost as { coins?: number } | undefined)?.coins ?? 0;
        zoneEntry.push({ zone: e.zone, coins });
        runningCoins += coins;
        const tiers = tiersForZone(e.zone);
        if (tiers.length > 0) tierLadders.push({ zone: e.zone, tiers });
      }
    }
    for (const tileId of tilesUnlockedAtTrigger(trigger)) {
      if (seenTile.has(tileId)) continue;
      seenTile.add(tileId);
      derivedTiles.push(tileId);
    }
  }

  const unlocked: UnlockBucket[] = CATEGORY_ORDER.filter((c) => byCategory.has(c)).map(
    (category) => ({ category, effects: byCategory.get(category) ?? [] }),
  );

  const target = points[idx];
  return {
    throughId,
    label: target.label,
    pointIndex: idx,
    unlocked,
    derivedTiles,
    costs: { zoneEntry, runningCoins, tierLadders },
  };
}
