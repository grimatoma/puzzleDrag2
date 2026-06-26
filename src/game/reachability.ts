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

import { BUILDINGS, RECIPES, RESOURCES, TOOLS, TILES } from "../constants.js";
import { MAP_NODES, MAP_EDGES, type MapNode } from "../features/cartography/data.js";
import { TILE_TYPES } from "../features/tileCollection/data.js";
import { producedResource } from "./producedResource.js";
import { CIVIC_PROVISIONS } from "../features/civicEconomy/data.js";
import { SCOPED_OUT } from "./scopedOut.js";
import { TYPE_WORKER_MAP } from "../features/workers/data.js";
import type { WorkerTypeId } from "../types/catalog/workers.js";

/** Tri-state: a hard yes, a "behind an optional system" (research/buy/daily), or no. */
export type Reachability = "reachable" | "gated" | "unreachable";

interface RecipeView {
  station: string;
  item: string;
  inputs: string[];
}

interface ReachSets {
  zones: Set<string>;
  buildings: Set<string>;
  resources: Set<string>;
  tools: Set<string>;
  tiles: Map<string, Reachability>;
  /** Tile categories with ≥1 reachable tile — the gate for family-targeted workers. */
  tileCategories: Set<string>;
}

// ── Zones (travel-graph reachability) ─────────────────────────────────────────

/**
 * Zones a player can actually reach from home: connected through `MAP_EDGES` AND
 * with any `requiresZoneTier` gate satisfiable (the required zone is itself reachable
 * and can climb to the required tier — `maxTier = tiers.length - 1`). The token-gated
 * endgame zone is never reachable on the normal path. This mirrors the travel BFS in
 * `src/playtest/progression.ts`, but stays structural (no economy): it answers "does a
 * travel path EXIST", which is exactly what makes *unlinking* a zone — pulling its
 * `MAP_EDGES` — drop everything that zone alone unlocked.
 */
function computeReachableZones(): Set<string> {
  const byId = new Map(MAP_NODES.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  for (const [a, b] of MAP_EDGES) {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  }
  const maxTierOf = (id: string): number => {
    const n = byId.get(id);
    return n?.tiers?.length ? n.tiers.length - 1 : -1;
  };
  const reachable = new Set<string>(["home"]); // home is always the start
  const gateOk = (n: MapNode): boolean => {
    if (n.requiresHearthTokens) return false;
    const g = (n as { requiresZoneTier?: { zone: string; tier: number } }).requiresZoneTier;
    return !g || (reachable.has(g.zone) && maxTierOf(g.zone) >= g.tier);
  };
  // Fixpoint: a node's gate may name a zone reached later in the sweep.
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of MAP_NODES) {
      if (reachable.has(n.id) || n.requiresHearthTokens) continue;
      if (!(adj.get(n.id) ?? []).some((nb) => reachable.has(nb))) continue;
      if (!gateOk(n)) continue;
      reachable.add(n.id);
      grew = true;
    }
  }
  return reachable;
}

// ── Buildings ────────────────────────────────────────────────────────────────

/**
 * Structurally reachable buildings: any building unlocked by a REACHABLE zone's ladder
 * (or flat `buildings[]`), with its `requires` prerequisite chain also reachable, minus
 * the SCOPED_OUT manifest. Only reachable zones contribute, so stranding a zone (cutting
 * its `MAP_EDGES`) automatically removes the buildings it alone unlocked.
 */
function computeReachableBuildings(reachableZones: Set<string>): Set<string> {
  const unlocked = new Set<string>();
  for (const node of MAP_NODES) {
    if (!reachableZones.has(node.id)) continue;
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
  for (const id of SCOPED_OUT.buildings) out.delete(id); // manifest residue
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
    if (SCOPED_OUT.tiles.has(id)) { memo.set(id, "unreachable"); return "unreachable"; } // manifest residue
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
 * Resources a REACHABLE board tile produces: per-tile override > family default
 * (`producedResource`) plus the legacy `next` ripening (e.g. Blackberry → jam) — both
 * gated so only tiles that are themselves `reachable` contribute. This is the key to
 * scoping: once a family's tiles are unlinked off `default` (flowers/cattle/mounts/
 * deep-mine/fish), their products (honey/milk/horseshoe/cut_gem/gold_bar/fish goods)
 * stop being board-produced, so recipes that consume them fall out too.
 */
function reachableBoardResources(tiles: Map<string, Reachability>): Set<string> {
  const out = new Set<string>();
  for (const t of TILE_TYPES as ReadonlyArray<{ id: string }>) {
    if (tiles.get(t.id) !== "reachable") continue;
    const res = producedResource({ key: t.id });
    if (res) out.add(res);
  }
  for (const [key, tile] of Object.entries(TILES) as Array<[string, { next?: string | null }]>) {
    if (tiles.get(key) !== "reachable") continue;
    const next = tile?.next;
    if (typeof next === "string" && Object.prototype.hasOwnProperty.call(RESOURCES, next)) out.add(next);
  }
  return out;
}

/**
 * Resources reachable in the configured game: everything a reachable board tile
 * produces (above) plus the fixpoint of recipe outputs whose STATION is a reachable
 * building, whose inputs are all reachable, and which is not in the SCOPED_OUT manifest.
 * (The set may include tool items, since a tool is just a recipe output — callers
 * intersect with TOOLS.)
 */
function computeReachableResources(reachableBuildings: Set<string>, tiles: Map<string, Reachability>): Set<string> {
  const obtainable = reachableBoardResources(tiles);
  obtainable.add("dirt"); // tile_special_dirt yields `dirt` via a custom handler (cf. progression.ts)
  const recipes = distinctRecipes();
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of recipes) {
      if (obtainable.has(r.item)) continue;
      if (SCOPED_OUT.recipes.has(r.item)) continue; // manifest: in-scope station+inputs, deferred
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

/** Tools: reachable recipe outputs, plus tools granted by a reachable building, minus
 *  the SCOPED_OUT manifest (a tool granted by a reachable building yet still deferred). */
function computeReachableTools(reachableBuildings: Set<string>, resources: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const key of Object.keys(TOOLS)) if (resources.has(key)) out.add(key);
  for (const [buildingId, grant] of Object.entries(CIVIC_PROVISIONS)) {
    if (reachableBuildings.has(buildingId)) out.add(grant.tool);
  }
  for (const key of SCOPED_OUT.tools) out.delete(key); // manifest residue
  return out;
}

// ── Memoized singleton (pure function of the config) ──────────────────────────

let CACHE: ReachSets | null = null;
function sets(): ReachSets {
  if (CACHE) return CACHE;
  const zones = computeReachableZones();
  const buildings = computeReachableBuildings(zones);
  const tiles = computeTileReachability(buildings);
  const resources = computeReachableResources(buildings, tiles);
  const tools = computeReachableTools(buildings, resources);
  const tileCategories = new Set<string>();
  for (const t of TILE_TYPES as ReadonlyArray<{ id: string; category?: string }>) {
    if (t.category && tiles.get(t.id) === "reachable") tileCategories.add(t.category);
  }
  CACHE = { zones, buildings, resources, tools, tiles, tileCategories };
  return CACHE;
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

export function isZoneReachable(zoneId: string): boolean {
  return sets().zones.has(zoneId);
}

/**
 * A worker is reachable iff it is not in the SCOPED_OUT manifest AND the family/recipe
 * its ability acts on is reachable. Family-targeted workers (Bee Keeper → flowers,
 * Gem-cutter → mine_gem, …) derive out for free once their tile family is unreachable;
 * the coin / rune / promotion workers, which gate on nothing out of scope, live in the
 * manifest. Coin-only abilities with no tile/recipe target rely on the manifest alone.
 */
export function isWorkerReachable(workerId: string): boolean {
  if (SCOPED_OUT.workers.has(workerId as WorkerTypeId)) return false;
  const w = TYPE_WORKER_MAP[workerId as WorkerTypeId];
  if (!w) return false;
  const s = sets();
  for (const ab of w.abilities ?? []) {
    const p = (ab.params ?? {}) as { category?: string; fromCategory?: string; recipe?: string };
    if (ab.id === "threshold_reduce_category" && p.category) {
      if (!s.tileCategories.has(p.category)) return false;
    } else if (ab.id === "chain_redirect_category" && p.fromCategory) {
      if (!s.tileCategories.has(p.fromCategory)) return false;
    } else if (ab.id === "recipe_input_reduce" && p.recipe) {
      if (!isRecipeReachable(p.recipe)) return false;
    }
  }
  return true;
}

/**
 * A recipe is reachable iff its station building is reachable and every input is
 * reachable. Accepts either the canonical `rec_*` key or an item-alias key.
 */
export function isRecipeReachable(recipeKey: string): boolean {
  const r = (RECIPES as Record<string, { item?: string; station?: string; inputs?: Record<string, number> } | undefined>)[recipeKey];
  if (!r || !r.station || !r.inputs) return false;
  if (r.item && SCOPED_OUT.recipes.has(r.item)) return false; // manifest: in-scope station+inputs, deferred
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
    case "workers": return isWorkerReachable(entityKey) ? "reachable" : "unreachable";
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
  workers: string[];
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
    workers: Object.keys(TYPE_WORKER_MAP).filter((id) => !isWorkerReachable(id)).sort(),
  };
}
