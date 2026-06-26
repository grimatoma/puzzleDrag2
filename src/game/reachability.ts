/**
 * reachability.ts — derived "can the player reach this?" for every catalog entity.
 *
 * THE PROBLEM THIS SOLVES. A building / recipe / tool / tile / resource should only
 * be surfaced to the player (and counted as "in the game") if there is an actual
 * UNLOCK PATH to it in the data. We do NOT hand-maintain an `isInGame` flag — that
 * drifts. Instead we DERIVE reachability from the relations the config already
 * encodes:
 *
 *   recipe ──station──▶ building ──tier.unlocks──▶ zone
 *   tile   ──discovery──▶ {default | chain→tile | building→building}
 *   resource ──produced by──▶ reachable tile  OR  reachable recipe output
 *   tool   ──▶ reachable recipe output  OR  granted by a reachable building
 *
 * STRUCTURAL, not economic. This asks "does an unlock path EXIST", deliberately
 * ignoring affordability and the current progression softlock — those are a balance
 * question answered by `src/playtest/progression.ts` (which bakes in the siloed
 * economy and would, today, report most of the game as unreachable behind the known
 * softlock). Reachability here is the SCOPE question: content scoped out of the
 * early zones (recipe not authored, building never unlocked) simply has no path and
 * falls out as unreachable, with no flag to maintain.
 *
 * Pure and Phaser-free — safe to import from the main game bundle AND `/b/`.
 *
 * NOTE: "reachable" is a DIFFERENT axis from the wiki's hand-maintained status
 * (WIRED/STUB/PLANNED in balanceManager/wiki/status.ts). Reachable = the player can
 * get to it; status = the feature is behaviourally wired. A building can be
 * reachable-by-unlock yet stubbed, or wired yet unreachable. Keep them separate.
 */

import { BUILDINGS, RECIPES, RESOURCES, TOOLS } from "../constants.js";
import { MAP_NODES } from "../features/cartography/data.js";
import { TILE_TYPES } from "../features/tileCollection/data.js";
import { boardProducedResources } from "./obtainable.js";
import { CIVIC_PROVISIONS } from "../features/civicEconomy/data.js";

/** Tri-state: a hard yes, a "behind an optional system" (research/buy/daily), or no. */
export type Reachability = "reachable" | "gated" | "unreachable";

interface RecipeView {
  station: string;
  item: string;
  inputs: string[];
}

interface ReachSets {
  buildings: Set<string>;
  resources: Set<string>;
  tools: Set<string>;
  tiles: Map<string, Reachability>;
}

// ── Buildings ────────────────────────────────────────────────────────────────

/**
 * Structurally reachable buildings: any building some zone's ladder (or flat
 * `buildings[]`) unlocks, with its `requires` prerequisite chain also reachable.
 * The endgame token-gated zone is skipped (it is outside the normal journey).
 */
function computeReachableBuildings(): Set<string> {
  const unlocked = new Set<string>();
  for (const node of MAP_NODES) {
    if (node.requiresHearthTokens) continue; // endgame gate — not part of the normal path
    if (node.tiers && node.tiers.length) {
      for (const t of node.tiers) for (const b of t.unlocks) unlocked.add(b as string);
    } else {
      for (const b of node.buildings) unlocked.add(b as string);
    }
  }
  const requiresOf = new Map<string, string | undefined>(
    BUILDINGS.map((b) => [b.id, (b as { requires?: string }).requires]),
  );
  const reachable = (id: string, seen: Set<string>): boolean => {
    if (!unlocked.has(id)) return false;
    const req = requiresOf.get(id);
    if (!req) return true;
    if (seen.has(id)) return false; // cycle guard
    seen.add(id);
    return reachable(req, seen);
  };
  const out = new Set<string>();
  for (const id of unlocked) if (reachable(id, new Set())) out.add(id);
  return out;
}

// ── Tiles (discovery) ─────────────────────────────────────────────────────────

/**
 * Per-tile reachability from its `discovery` method:
 *   default            → reachable
 *   chain(chainLengthOf)→ reachable iff the source tile is reachable
 *   building(buildingId)→ reachable iff that building is reachable
 *   research|buy|daily  → gated (behind an optional system we don't gate display on)
 */
function computeTileReachability(reachableBuildings: Set<string>): Map<string, Reachability> {
  const byId = new Map(TILE_TYPES.map((t) => [t.id, t]));
  const memo = new Map<string, Reachability>();
  const resolve = (id: string, seen: Set<string>): Reachability => {
    const cached = memo.get(id);
    if (cached) return cached;
    const t = byId.get(id) as { discovery?: { method?: string; chainLengthOf?: string; buildingId?: string } } | undefined;
    if (!t) return "unreachable";
    if (seen.has(id)) return "unreachable"; // cycle guard
    seen.add(id);
    const d = t.discovery ?? {};
    let r: Reachability;
    switch (d.method) {
      case "default": r = "reachable"; break;
      case "chain": r = d.chainLengthOf ? resolve(d.chainLengthOf, seen) : "unreachable"; break;
      case "building": r = d.buildingId && reachableBuildings.has(d.buildingId) ? "reachable" : "unreachable"; break;
      case "research":
      case "buy":
      case "daily": r = "gated"; break;
      default: r = "unreachable";
    }
    memo.set(id, r);
    return r;
  };
  for (const t of TILE_TYPES) resolve(t.id, new Set());
  return memo;
}

// ── Resources + tools (station-gated production fixpoint) ─────────────────────

/** Distinct recipe views (RECIPES keys alias onto shared objects). */
function distinctRecipes(): RecipeView[] {
  const seen = new Set<object>();
  const out: RecipeView[] = [];
  for (const r of Object.values(RECIPES) as Array<{ item?: string; station?: string; inputs?: Record<string, number> }>) {
    if (!r || typeof r !== "object" || seen.has(r)) continue;
    seen.add(r);
    if (!r.item || !r.station || !r.inputs) continue;
    out.push({ station: r.station, item: r.item, inputs: Object.keys(r.inputs) });
  }
  return out;
}

/**
 * Resources reachable in the configured game: everything the board produces
 * (reusing obtainable.ts's board logic — per-tile override > family default, plus
 * the legacy `next` ripening) plus the fixpoint of recipe outputs whose STATION is
 * a reachable building AND whose inputs are all reachable. (The set may include tool
 * items, since a tool is just a recipe output — callers intersect with TOOLS.)
 *
 * Board production is NOT gated by tile-discovery reachability: the base family
 * resources all come from `default` tiles, and the few that come only via buy/
 * research/daily tiles are also produced by a default tile — gating there only
 * caused false orphans. Tile reachability is tracked separately for the tile badge.
 */
function computeReachableResources(reachableBuildings: Set<string>): Set<string> {
  const obtainable = new Set<string>(boardProducedResources());
  obtainable.add("dirt"); // tile_special_dirt yields `dirt` via a custom handler (cf. progression.ts)
  const recipes = distinctRecipes();
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of recipes) {
      if (obtainable.has(r.item)) continue;
      if (!reachableBuildings.has(r.station)) continue;
      if (!r.inputs.every((k) => obtainable.has(k))) continue;
      obtainable.add(r.item);
      grew = true;
    }
  }
  // Alias-aware: RESOURCES maps alias spellings (gem_crown/gemcrown) onto one object
  // and a recipe references only one of them; treat every key on a reachable object
  // as reachable so an alias is never a false orphan (mirrors obtainable.ts).
  const reachableObjects = new Set<object>();
  for (const [k, def] of Object.entries(RESOURCES)) if (obtainable.has(k)) reachableObjects.add(def as object);
  for (const [k, def] of Object.entries(RESOURCES)) if (reachableObjects.has(def as object)) obtainable.add(k);
  return obtainable;
}

/** Tools: reachable recipe outputs, plus tools granted by a reachable building. */
function computeReachableTools(reachableBuildings: Set<string>, resources: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const key of Object.keys(TOOLS)) if (resources.has(key)) out.add(key);
  for (const [buildingId, grant] of Object.entries(CIVIC_PROVISIONS)) {
    if (reachableBuildings.has(buildingId)) out.add(grant.tool);
  }
  return out;
}

// ── Memoized singleton (pure function of the config) ──────────────────────────

let CACHE: ReachSets | null = null;
function sets(): ReachSets {
  if (CACHE) return CACHE;
  const buildings = computeReachableBuildings();
  const tiles = computeTileReachability(buildings);
  const resources = computeReachableResources(buildings);
  const tools = computeReachableTools(buildings, resources);
  CACHE = { buildings, resources, tools, tiles };
  return CACHE;
}

/** Test-only: drop the memoized result (e.g. after mutating config in a test). */
export function _resetReachabilityCache(): void {
  CACHE = null;
}

// ── Per-entity predicates (the public API the consumers use) ──────────────────

export function isBuildingReachable(id: string): boolean {
  return sets().buildings.has(id);
}

export function isResourceReachable(key: string): boolean {
  return sets().resources.has(key);
}

export function isToolReachable(key: string): boolean {
  return sets().tools.has(key);
}

export function tileReachability(tileId: string): Reachability {
  return sets().tiles.get(tileId) ?? "unreachable";
}

export function isTileReachable(tileId: string): boolean {
  return tileReachability(tileId) === "reachable";
}

/**
 * A recipe is reachable iff its station building is reachable and every input is
 * reachable. Accepts either the canonical `rec_*` key or an item-alias key.
 */
export function isRecipeReachable(recipeKey: string): boolean {
  const r = (RECIPES as Record<string, { station?: string; inputs?: Record<string, number> } | undefined>)[recipeKey];
  if (!r || !r.station || !r.inputs) return false;
  const s = sets();
  if (!s.buildings.has(r.station)) return false;
  return Object.keys(r.inputs).every((k) => s.resources.has(k));
}

/**
 * Tri-state reachability for a wiki entity, dispatched by its concept id. Tiles
 * carry the "gated" middle state; everything else is reachable/unreachable.
 * Returns null for concepts we don't gate (caller shows no reachability badge).
 */
export function reachabilityOf(conceptId: string, entityKey: string): Reachability | null {
  switch (conceptId) {
    case "buildings": return isBuildingReachable(entityKey) ? "reachable" : "unreachable";
    case "recipes": return isRecipeReachable(entityKey) ? "reachable" : "unreachable";
    case "resources": return isResourceReachable(entityKey) ? "reachable" : "unreachable";
    case "tools": return isToolReachable(entityKey) ? "reachable" : "unreachable";
    case "tiles": return tileReachability(entityKey);
    default: return null;
  }
}

// ── Orphan report (the CI guard / Dev-Panel surfacing) ────────────────────────

export interface UnreachableReport {
  buildings: string[];
  recipes: string[];
  tools: string[];
  resources: string[];
  tiles: string[]; // hard-unreachable only (gated tiles are expected, excluded)
}

/**
 * Everything DEFINED in the catalog that has no reachable path. A non-empty list
 * is dead weight or a scoped-out leftover; the guard test surfaces it. `gated`
 * tiles (research/buy/daily) are intentionally excluded — they are reachable via
 * those systems, just not on the default board.
 */
export function findUnreachable(): UnreachableReport {
  const s = sets();
  const distinctRecipeKeys = (() => {
    const seen = new Set<object>();
    const keys: string[] = [];
    for (const [key, r] of Object.entries(RECIPES) as Array<[string, { item?: string; station?: string; inputs?: unknown } | null]>) {
      if (!r || typeof r !== "object" || seen.has(r)) continue;
      seen.add(r);
      if (!r.item || !r.station || !r.inputs) continue; // skip non-recipe / group keys
      keys.push(key);
    }
    return keys;
  })();
  return {
    buildings: BUILDINGS.map((b) => b.id).filter((id) => !s.buildings.has(id)).sort(),
    recipes: distinctRecipeKeys.filter((k) => !isRecipeReachable(k)).sort(),
    tools: Object.keys(TOOLS).filter((k) => !s.tools.has(k)).sort(),
    resources: Object.keys(RESOURCES).filter((k) => !s.resources.has(k)).sort(),
    tiles: (TILE_TYPES as ReadonlyArray<{ id: string }>)
      .map((t) => t.id)
      .filter((id) => s.tiles.get(id) === "unreachable")
      .sort(),
  };
}
