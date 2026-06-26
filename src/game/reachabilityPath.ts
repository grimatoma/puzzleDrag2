/**
 * reachabilityPath.ts — derive the GRAPH of *how* a catalog entity is reachable.
 *
 * `reachability.ts` answers the yes/no/gated question. This module answers the
 * follow-up "how?" by tracing the SAME unlock relations backward into a small
 * dependency graph rooted at the entity, with leaves at the terminal sources:
 *
 *   recipe   ──crafted at──▶ building ──unlocked at tier──▶ zone ──travel──▶ Home
 *            ──needs──▶ resource/tool (each recursed)
 *   building ──requires──▶ building,  ──unlocked at──▶ zone ──travel──▶ Home
 *   tile     ──discovery──▶ { spawns/upgrade on board | chains-from tile | discovered-at building | Gated system }
 *   resource ──produced by──▶ board tile  |  ──crafted as──▶ recipe
 *   tool     ──crafted as──▶ recipe  |  ──granted by──▶ building
 *   worker   ──needs <family> tile / recipe──▶ … | Catalog
 *
 * Each node carries its OWN reachability (for colouring) so a broken chain is
 * visible: the node where the path dead-ends is `unreachable`, or a synthetic
 * `missing` terminal is attached. Pure and Phaser-free — safe in the main game
 * bundle AND `/b/` (the wiki renders it in a modal off the reachability badge).
 */

import { BUILDINGS, RECIPES, TOOLS, TILES, mineTilePoolForZone } from "../constants.js";
import { MAP_NODES, MAP_EDGES } from "../features/cartography/data.js";
import { TILE_TYPES, CATEGORY_OF } from "../features/tileCollection/data.js";
import { ZONE_TO_TILE_CATEGORIES } from "../features/zones/data.js";
import { ZONE_UPGRADE_TARGET_GOLD } from "../config/schemas/boardInstance.js";
import { producedResource } from "./producedResource.js";
import { CIVIC_PROVISIONS } from "../features/civicEconomy/data.js";
import { TYPE_WORKER_MAP } from "../features/workers/data.js";
import { SCOPED_OUT } from "./scopedOut.js";
import {
  reachabilityOf,
  isRecipeReachable,
  isZoneReachable,
  tileReachability,
  type Reachability,
} from "./reachability.js";
import type { WorkerTypeId } from "../types/catalog/workers.js";

/** Synthetic leaf nodes that terminate a chain (not real catalog entities). */
export type ReachTerminalKind = "home" | "board" | "gated" | "catalog" | "missing";

export interface ReachPathNode {
  /** Unique id within the graph. For catalog entities: `"<conceptId>:<key>"`. */
  id: string;
  /** Fallback label — the renderer prefers the live entity name when `conceptId` is set. */
  label: string;
  /** Sub-label (tier name, quantity, gate system, …). */
  detail?: string;
  /** Set for real catalog entities → the node is a clickable cross-link. */
  conceptId?: string;
  entityKey?: string;
  /** Per-node reachability for colouring (null for zones/terminals we don't gate). */
  reach: Reachability | null;
  /** Set for synthetic source/dead-end leaves. */
  terminal?: ReachTerminalKind;
}

/** Directed edge `from` (the dependent, nearer the root) → `to` (its dependency). */
export interface ReachPathEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ReachPathGraph {
  rootId: string;
  status: Reachability | null;
  nodes: ReachPathNode[];
  edges: ReachPathEdge[];
  /** True when the cap was hit and the graph is incomplete. */
  truncated: boolean;
}

/** Bound the graph so a deep/branchy chain can't explode the modal. */
const MAX_NODES = 80;

const ZONE_BY_ID = new Map(MAP_NODES.map((n) => [n.id, n]));

/** Undirected travel adjacency over the map graph. */
const TRAVEL_ADJ = (() => {
  const adj = new Map<string, string[]>();
  for (const [a, b] of MAP_EDGES) {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  }
  return adj;
})();

/** Shortest travel path home → target over MAP_EDGES, or null if disconnected. */
function travelPath(target: string): string[] | null {
  if (target === "home") return ["home"];
  const prev = new Map<string, string>();
  const seen = new Set<string>(["home"]);
  const queue = ["home"];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of TRAVEL_ADJ.get(cur) ?? []) {
      if (seen.has(nb)) continue;
      seen.add(nb);
      prev.set(nb, cur);
      if (nb === target) {
        const path = [target];
        let p = target;
        while (prev.has(p)) { p = prev.get(p)!; path.unshift(p); }
        return path;
      }
      queue.push(nb);
    }
  }
  return null;
}

const ZONE_CAT_TO_TILE_CATS_PATH = ZONE_TO_TILE_CATEGORIES as Record<string, string[] | undefined>;
const TILE_CAT_LOOKUP_PATH = CATEGORY_OF as Record<string, string | undefined>;

/** Distinct (object-deduped) recipe key whose output item is `key`, preferring a reachable one. */
function recipeProducing(key: string): string | null {
  let fallback: string | null = null;
  const seen = new Set<object>();
  for (const [recKey, r] of Object.entries(RECIPES) as Array<[string, { item?: string } | null]>) {
    if (!r || typeof r !== "object" || seen.has(r)) continue;
    seen.add(r);
    if (r.item !== key) continue;
    if (isRecipeReachable(recKey)) return recKey;
    fallback ??= recKey;
  }
  return fallback;
}

/** A board tile that yields resource `key` (family default / override / legacy ripening), preferring a reachable one. */
function tileProducing(key: string): string | null {
  let fallback: string | null = null;
  for (const t of TILE_TYPES as ReadonlyArray<{ id: string }>) {
    if (producedResource({ key: t.id }) !== key) continue;
    if (tileReachability(t.id) === "reachable") return t.id;
    fallback ??= t.id;
  }
  for (const [tileKey, tile] of Object.entries(TILES) as Array<[string, { next?: string | null }]>) {
    if (tile?.next !== key) continue;
    if (tileReachability(tileKey) === "reachable") return tileKey;
    fallback ??= tileKey;
  }
  return fallback;
}

/** Zone tier (or flat roster) that unlocks `buildingId`, preferring a reachable zone. */
function zoneUnlocking(buildingId: string): { zone: string; tierName: string } | null {
  let fallback: { zone: string; tierName: string } | null = null;
  for (const node of MAP_NODES) {
    let hit: string | null = null;
    if (node.tiers && node.tiers.length) {
      for (const t of node.tiers) {
        if ((t.unlocks as string[]).includes(buildingId)) { hit = t.name; break; }
      }
    } else if ((node.buildings as string[]).includes(buildingId)) {
      hit = "founding";
    }
    if (hit == null) continue;
    const cand = { zone: node.id, tierName: hit };
    if (isZoneReachable(node.id)) return cand;
    fallback ??= cand;
  }
  return fallback;
}

/** A tile of category `cat`, preferring a reachable one. */
function tileOfCategory(cat: string): string | null {
  let fallback: string | null = null;
  for (const t of TILE_TYPES as ReadonlyArray<{ id: string; category?: string }>) {
    if (t.category !== cat) continue;
    if (tileReachability(t.id) === "reachable") return t.id;
    fallback ??= t.id;
  }
  return fallback;
}

type SpawnMechanism =
  | { kind: "natural" }
  | { kind: "upgrade"; sourceZoneCat: string }
  | { kind: "mine" };

/**
 * Determine HOW a tile category appears on any reachable board, for path display.
 * Prefers natural spawn > upgrade target > mine pool (natural is most direct).
 * Returns null only if the category is not board-spawnable on any reachable zone
 * (in which case a "default" tile with that category would be unreachable anyway).
 */
function boardSpawnMechanismForCategory(tileCat: string): SpawnMechanism | null {
  const zoneCatsForTileCat = new Set<string>();
  for (const [zoneCat, tileCats] of Object.entries(ZONE_CAT_TO_TILE_CATS_PATH)) {
    if ((tileCats ?? []).includes(tileCat)) zoneCatsForTileCat.add(zoneCat);
  }
  let upgradeHit: SpawnMechanism | null = null;
  let mineHit: SpawnMechanism | null = null;
  for (const node of MAP_NODES) {
    if (!isZoneReachable(node.id)) continue;
    const boards = node.boards as {
      farm?: { seasonDrops?: Record<string, Record<string, number>>; upgradeMap?: Record<string, string> };
      mine?: object;
    };
    const farm = boards.farm;
    if (farm) {
      for (const row of Object.values(farm.seasonDrops ?? {})) {
        for (const [zoneCat, rate] of Object.entries(row)) {
          if ((rate as number) > 0 && zoneCatsForTileCat.has(zoneCat)) return { kind: "natural" };
        }
      }
      for (const [srcZoneCat, tgtZoneCat] of Object.entries(farm.upgradeMap ?? {})) {
        if (tgtZoneCat !== ZONE_UPGRADE_TARGET_GOLD && zoneCatsForTileCat.has(tgtZoneCat as string)) {
          upgradeHit ??= { kind: "upgrade", sourceZoneCat: srcZoneCat };
        }
      }
    }
    if (boards.mine && !mineHit) {
      for (const tileKey of mineTilePoolForZone(node.id)) {
        if (TILE_CAT_LOOKUP_PATH[tileKey] === tileCat) { mineHit = { kind: "mine" }; break; }
      }
    }
  }
  return upgradeHit ?? mineHit;
}

/**
 * Build the reachability graph for a wiki entity, or null for concepts we don't
 * gate (zones, npcs, bosses, …) — the badge isn't shown there either.
 */
export function reachabilityPath(conceptId: string, entityKey: string): ReachPathGraph | null {
  const status = reachabilityOf(conceptId, entityKey);
  if (status == null) return null;

  const nodes = new Map<string, ReachPathNode>();
  const edges: ReachPathEdge[] = [];
  const edgeKeys = new Set<string>();
  const expanded = new Set<string>();
  let truncated = false;

  const capped = () => {
    if (nodes.size >= MAX_NODES) { truncated = true; return true; }
    return false;
  };

  const addEdge = (from: string, to: string, label?: string) => {
    const k = `${from}>${to}>${label ?? ""}`;
    if (edgeKeys.has(k)) return;
    edgeKeys.add(k);
    edges.push({ from, to, label });
  };

  /** Ensure a real catalog-entity node and return its id (no expansion here). */
  const ensureEntity = (cId: string, key: string, detail?: string): string => {
    const id = `${cId}:${key}`;
    if (!nodes.has(id)) {
      nodes.set(id, { id, label: key, detail, conceptId: cId, entityKey: key, reach: reachabilityOf(cId, key) });
    }
    return id;
  };

  /** Ensure a synthetic terminal/zone node and return its id. */
  const ensureLeaf = (
    id: string,
    label: string,
    terminal: ReachTerminalKind,
    reach: Reachability | null = null,
    detail?: string,
  ): string => {
    if (!nodes.has(id)) nodes.set(id, { id, label, detail, reach, terminal });
    return id;
  };

  const addMissing = (parentId: string, label: string) => {
    const id = `missing:${parentId}`;
    ensureLeaf(id, label, "missing", "unreachable");
    addEdge(parentId, id);
  };

  /** Lay the full travel chain target → … → Home and return target's node id. */
  const linkTravel = (parentId: string, zoneId: string, edgeLabel: string) => {
    const node = ZONE_BY_ID.get(zoneId);
    const zoneNodeId = (zid: string) =>
      ensureLeaf(
        `zone:${zid}`,
        ZONE_BY_ID.get(zid)?.name ?? zid,
        zid === "home" ? "home" : "missing",
        isZoneReachable(zid) ? "reachable" : "unreachable",
      );
    // Re-tag a non-home zone as a normal (neutral) node, not a "missing" leaf.
    const zid = zoneNodeId(zoneId);
    const zn = nodes.get(zid)!;
    if (zoneId !== "home") zn.terminal = undefined;
    addEdge(parentId, zid, edgeLabel);
    if (zoneId === "home" || expanded.has(zid)) return;
    expanded.add(zid);

    const path = travelPath(zoneId);
    if (!path) { addMissing(zid, "No travel route"); return; }
    for (let i = path.length - 1; i > 0; i--) {
      const cur = zoneNodeId(path[i]);
      if (path[i] !== "home") nodes.get(cur)!.terminal = undefined;
      const prev = zoneNodeId(path[i - 1]);
      addEdge(cur, prev, "travel");
    }
    // Surface a cross-zone tier gate as an extra dependency.
    const gate = (node as { requiresZoneTier?: { zone: string; tier: number } } | undefined)?.requiresZoneTier;
    if (gate && !capped()) {
      linkTravel(zid, gate.zone, `needs ${ZONE_BY_ID.get(gate.zone)?.name ?? gate.zone} T${gate.tier}`);
    }
  };

  /** Recursively expand a catalog node's dependencies. */
  const expand = (cId: string, key: string) => {
    const id = `${cId}:${key}`;
    if (expanded.has(id)) return;
    expanded.add(id);
    if (capped()) return;

    switch (cId) {
      case "recipes": {
        const r = (RECIPES as Record<string, { station?: string; inputs?: Record<string, number> } | undefined>)[key];
        if (!r || !r.station) { addMissing(id, "Not a craftable recipe"); break; }
        const stationId = ensureEntity("buildings", r.station);
        addEdge(id, stationId, "crafted at");
        expand("buildings", r.station);
        for (const [ing, qty] of Object.entries(r.inputs ?? {})) {
          if (capped()) break;
          const ingConcept = Object.prototype.hasOwnProperty.call(TOOLS, ing) ? "tools" : "resources";
          const ingId = ensureEntity(ingConcept, ing, `×${qty}`);
          addEdge(id, ingId, `needs ×${qty}`);
          expand(ingConcept, ing);
        }
        break;
      }
      case "buildings": {
        const b = BUILDINGS.find((x) => x.id === key) as { requires?: string } | undefined;
        if (b?.requires) {
          const reqId = ensureEntity("buildings", b.requires);
          addEdge(id, reqId, "requires");
          expand("buildings", b.requires);
        }
        const unlock = zoneUnlocking(key);
        if (unlock) linkTravel(id, unlock.zone, `unlocked at ${unlock.tierName}`);
        else addMissing(id, "No zone unlocks this");
        break;
      }
      case "tiles": {
        const t = (TILE_TYPES as ReadonlyArray<{ id: string; category?: string; discovery?: { method?: string; chainLengthOf?: string; buildingId?: string } }>)
          .find((x) => x.id === key);
        const d = t?.discovery ?? {};
        switch (d.method) {
          case "default": {
            const mechanism = t?.category ? boardSpawnMechanismForCategory(t.category) : null;
            if (mechanism?.kind === "upgrade") {
              addEdge(
                id,
                ensureLeaf(
                  `board:upgrade:${mechanism.sourceZoneCat}`,
                  "Farm board (upgrade result)",
                  "board",
                  "reachable",
                  `upgrade from: ${mechanism.sourceZoneCat} tiles`,
                ),
                "upgrade result on",
              );
            } else if (mechanism?.kind === "mine") {
              addEdge(id, ensureLeaf("board:mine", "Mine board", "board", "reachable"), "found in");
            } else {
              // natural spawn (or unknown — fallback to generic label)
              addEdge(id, ensureLeaf("board:natural", "Farm board (natural spawn)", "board", "reachable"), "spawns on");
            }
            break;
          }
          case "chain":
            if (d.chainLengthOf) {
              const src = ensureEntity("tiles", d.chainLengthOf);
              addEdge(id, src, "chains from");
              expand("tiles", d.chainLengthOf);
            } else addMissing(id, "No chain source");
            break;
          case "building":
            if (d.buildingId) {
              const bId = ensureEntity("buildings", d.buildingId);
              addEdge(id, bId, "discovered at");
              expand("buildings", d.buildingId);
            } else addMissing(id, "No discovery building");
            break;
          case "research":
          case "buy":
          case "daily": {
            const sysLabel = d.method === "research" ? "Research" : d.method === "buy" ? "Shop" : "Daily reward";
            addEdge(id, ensureLeaf(`gated:${d.method}`, sysLabel, "gated", "gated"), "unlocked via");
            break;
          }
          default:
            addMissing(id, "No discovery path");
        }
        break;
      }
      case "resources": {
        const tileKey = tileProducing(key);
        const recKey = recipeProducing(key);
        if (tileKey && (tileReachability(tileKey) === "reachable" || !recKey)) {
          const tId = ensureEntity("tiles", tileKey);
          addEdge(id, tId, "produced by");
          expand("tiles", tileKey);
        } else if (recKey) {
          const rId = ensureEntity("recipes", recKey);
          addEdge(id, rId, "crafted as");
          expand("recipes", recKey);
        } else if (key === "dirt") {
          addEdge(id, ensureLeaf("board", "Default board", "board", "reachable"), "dug from");
        } else {
          addMissing(id, "Nothing produces this");
        }
        break;
      }
      case "tools": {
        const recKey = recipeProducing(key);
        const grants = Object.entries(CIVIC_PROVISIONS).filter(([, g]) => g.tool === key).map(([bId]) => bId);
        if (recKey) {
          const rId = ensureEntity("recipes", recKey);
          addEdge(id, rId, "crafted as");
          expand("recipes", recKey);
        }
        for (const bId of grants) {
          if (capped()) break;
          const nId = ensureEntity("buildings", bId);
          addEdge(id, nId, "granted by");
          expand("buildings", bId);
        }
        if (!recKey && grants.length === 0) addMissing(id, "No recipe or grant");
        break;
      }
      case "workers": {
        const w = TYPE_WORKER_MAP[key as WorkerTypeId] as { abilities?: Array<{ id?: string; params?: Record<string, unknown> }> } | undefined;
        let added = false;
        for (const ab of w?.abilities ?? []) {
          if (capped()) break;
          const p = (ab.params ?? {}) as { category?: string; fromCategory?: string; recipe?: string };
          const cat = ab.id === "threshold_reduce_category" ? p.category
            : ab.id === "chain_redirect_category" ? p.fromCategory : undefined;
          if (cat) {
            const tileKey = tileOfCategory(cat);
            if (tileKey) {
              const tId = ensureEntity("tiles", tileKey, cat);
              addEdge(id, tId, `${cat} tile`);
              expand("tiles", tileKey);
            } else addMissing(id, `No ${cat} tile`);
            added = true;
          } else if (ab.id === "recipe_input_reduce" && p.recipe) {
            const rId = ensureEntity("recipes", p.recipe);
            addEdge(id, rId, "acts on");
            expand("recipes", p.recipe);
            added = true;
          }
        }
        if (SCOPED_OUT.workers.has(key as WorkerTypeId)) addMissing(id, "Scoped out of build");
        else if (!added) addEdge(id, ensureLeaf("catalog", "Catalog", "catalog", "reachable"), "always available");
        break;
      }
      default:
        break;
    }
  };

  const rootId = ensureEntity(conceptId, entityKey);
  expand(conceptId, entityKey);

  return { rootId, status, nodes: [...nodes.values()], edges, truncated };
}
