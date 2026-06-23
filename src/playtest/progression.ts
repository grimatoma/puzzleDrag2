// The progression spine — a CODE-DERIVED model of the player's journey.
//
// The campaign harness (campaign.ts) answers "how many runs to afford the next
// thing?" by actually PLAYING. This module answers a different question, purely
// from the data: "given a fresh save, what can the player REACH, what can they
// PRODUCE, and where does the progression spine WALL OFF?" — the structural
// shape of the journey, independent of luck or policy.
//
// It is the alignment artifact's backbone: the interactive progression-timeline
// dashboard (reference/docs/balance/progression-timeline.html) renders exactly
// this object, so the picture the designer signs off on is the one the code
// actually encodes — it cannot drift from a hand-maintained diagram.
//
// Everything is derived from the real constants:
//   • zones / travel graph / gates — MAP_NODES, MAP_EDGES (cartography/data.ts)
//   • settlement ladders            — MapNode.tiers[].upgradeCost / .unlocks
//   • buildings (cost + unlock)     — BUILDINGS (constants.ts)
//   • recipes (station + inputs)    — RECIPES (constants.ts)
//   • board outputs                 — FARM/MINE/FISH_TILE_POOL + tileFamilyResource
//
// The oracle models the two rules that actually gate progression:
//   1. TRAVEL/FOUNDING is gated globally by `requiresZoneTier` (one zone's tier
//      unlocks another zone). BFS over the travel graph respects those gates.
//   2. A tier-up spends the target zone's OWN siloed inventory (zoneInventory),
//      so a zone can only climb its ladder on resources IT can produce — its own
//      board plus goods craftable at stations IT can build. Resources from other
//      zones can't be spent here. So affordability is computed PER ZONE, by KIND
//      (we assume farm output is effectively unbounded, so only the *kind* of a
//      cost resource matters for "can this rung ever be paid?", not the amount).

import {
  MAP_NODES,
  MAP_EDGES,
  type MapNode,
  type ZoneTier,
} from "../features/cartography/data.js";
import {
  BUILDINGS,
  RECIPES,
  FARM_TILE_POOL,
  MINE_TILE_POOL,
  FISH_TILE_POOL,
  tileFamilyResource,
} from "../constants.js";

// ── Derived lookups ─────────────────────────────────────────────────────────

const NODE_BY_ID = new Map<string, MapNode>(MAP_NODES.map((n) => [n.id, n]));

const BUILDING_BY_ID = new Map<string, { id: string; name: string; cost: Record<string, number> }>(
  BUILDINGS.map((b) => [b.id, { id: b.id, name: b.name, cost: b.cost as unknown as Record<string, number> }]),
);

/** Resource KINDS a tile pool yields (family default; custom-output tiles absent). */
function poolResources(pool: readonly string[]): string[] {
  const out = new Set<string>();
  for (const k of pool) {
    const r = tileFamilyResource(k);
    if (r) out.add(r);
  }
  return [...out].sort();
}

// `tile_special_dirt` has a custom handler (TILES_WITH_CUSTOM_OUTPUT) so the
// family map returns null for it, but it yields the `dirt` resource used by mine
// tier costs — add it explicitly so the mine board's output set is complete.
const FARM_OUT = new Set(poolResources(FARM_TILE_POOL));
const MINE_OUT = new Set([...poolResources(MINE_TILE_POOL), "dirt"]);
const FISH_OUT = new Set(poolResources(FISH_TILE_POOL));

export interface RecipeView {
  item: string;
  station: string;
  tier: number;
  inputs: string[];
}

/** Canonical recipe list (deduped past RECIPES' item-keyed aliases). */
const RECIPE_LIST: RecipeView[] = (() => {
  const seen = new Set<string>();
  const out: RecipeView[] = [];
  for (const rec of Object.values(RECIPES as Record<string, unknown>)) {
    if (!rec || typeof rec !== "object") continue;
    const r = rec as { item?: string; station?: string; inputs?: Record<string, number>; tier?: number };
    if (!r.item || !r.station || !r.inputs) continue;
    if (seen.has(r.item)) continue;
    seen.add(r.item);
    out.push({ item: r.item, station: r.station, tier: r.tier ?? 0, inputs: Object.keys(r.inputs) });
  }
  return out;
})();
const RECIPE_BY_ITEM = new Map<string, RecipeView>(RECIPE_LIST.map((r) => [r.item, r]));

/** Resource kinds in a building's cost (coins excluded — they're abundant). */
function buildingCostKinds(buildingId: string): string[] {
  const b = BUILDING_BY_ID.get(buildingId);
  if (!b) return [];
  return Object.keys(b.cost).filter((k) => k !== "coins");
}

/** Board-output kinds for a zone (siloed: only THIS zone's boards). */
function zoneBoardOutputs(node: MapNode): Set<string> {
  const out = new Set<string>();
  const b = node.boards as Record<string, unknown>;
  if (b.farm) for (const r of FARM_OUT) out.add(r);
  if (b.mine) for (const r of MINE_OUT) out.add(r);
  if (b.fish) for (const r of FISH_OUT) out.add(r);
  return out;
}

/** Buildings unlocked at a zone by `tier` (cumulative union of rungs ≤ tier). */
function unlockedBuildings(node: MapNode, tier: number): Set<string> {
  const out = new Set<string>();
  if (node.tiers && node.tiers.length) {
    for (let t = 0; t <= tier && t < node.tiers.length; t++) {
      for (const bid of node.tiers[t].unlocks) out.add(bid as string);
    }
  } else {
    for (const bid of node.buildings) out.add(bid as string);
  }
  return out;
}

// ── Per-zone siloed production (what THIS zone can stock) ────────────────────

/**
 * The set of resource KINDS a zone can put into its own inventory at `tier`:
 * its board outputs, plus any recipe output whose station is buildable HERE
 * (unlocked at this tier and its build cost satisfiable from this set) and whose
 * inputs are all already producible HERE. Computed to a fixpoint.
 */
function zoneProducible(node: MapNode, tier: number): Set<string> {
  const prod = new Set<string>(zoneBoardOutputs(node));
  const unlocked = unlockedBuildings(node, tier);
  let grew = true;
  while (grew) {
    grew = false;
    for (const rec of RECIPE_LIST) {
      if (prod.has(rec.item)) continue;
      if (!unlocked.has(rec.station)) continue; // station not unlocked at this zone/tier
      if (!buildingCostKinds(rec.station).every((k) => prod.has(k))) continue; // can't build the station
      if (!rec.inputs.every((k) => prod.has(k))) continue; // can't afford the recipe
      prod.add(rec.item);
      grew = true;
    }
  }
  return prod;
}

export interface ZoneWall {
  /** Highest tier this zone can reach on its own siloed production. */
  reachedTier: number;
  reachedName: string;
  /** The rung it cannot pay for. */
  toTier: number;
  toName: string;
  /** Cost resource kinds it cannot produce, each with a why-unobtainable note. */
  missing: Array<{ key: string; reason: string }>;
}

/** Why a missing cost resource is unobtainable in this zone (the lock explainer). */
function explainMissing(node: MapNode, key: string, producible: Set<string>): string {
  const rec = RECIPE_BY_ITEM.get(key);
  if (rec) {
    const stationName = BUILDING_BY_ID.get(rec.station)?.name ?? rec.station;
    const unlockedAnywhere = node.tiers
      ? node.tiers.some((t) => (t.unlocks as string[]).includes(rec.station))
      : (node.buildings as string[]).includes(rec.station);
    const stationCostMissing = buildingCostKinds(rec.station).filter((k) => !producible.has(k));
    const bits: string[] = [`crafted at the ${stationName}`];
    if (!unlockedAnywhere) bits.push(`which this settlement never unlocks`);
    if (stationCostMissing.length) bits.push(`whose own build cost needs ${stationCostMissing.join(", ")} (also unobtainable here)`);
    const inputMissing = rec.inputs.filter((k) => !producible.has(k));
    if (inputMissing.length) bits.push(`and the recipe needs ${inputMissing.join(", ")}`);
    return bits.join(", ");
  }
  if (MINE_OUT.has(key)) return `a mined good — only a mine board yields it, and every mine zone is gated behind the quarry`;
  if (FISH_OUT.has(key)) return `a fished good — only a fish board yields it, and every fish zone is gated behind the quarry`;
  return `no source reachable from this settlement's board or stations`;
}

/** Climb a zone's own ladder as far as its siloed production allows. */
function climbZone(node: MapNode): { reachedTier: number; wall: ZoneWall | null } {
  if (!node.tiers || node.tiers.length <= 1) return { reachedTier: 0, wall: null };
  let tier = 0;
  for (;;) {
    if (tier + 1 >= node.tiers.length) return { reachedTier: tier, wall: null };
    const next: ZoneTier = node.tiers[tier + 1];
    const producible = zoneProducible(node, tier);
    const costKinds = Object.keys(next.upgradeCost?.resources ?? {});
    const missingKinds = costKinds.filter((k) => !producible.has(k));
    if (missingKinds.length === 0) {
      tier++;
      continue;
    }
    return {
      reachedTier: tier,
      wall: {
        reachedTier: tier,
        reachedName: node.tiers[tier].name,
        toTier: tier + 1,
        toName: next.name,
        missing: missingKinds.map((k) => ({ key: k, reason: explainMissing(node, k, producible) })),
      },
    };
  }
}

// ── Global travel reachability (gated by other zones' tiers) ─────────────────

function buildAdjacency(): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  };
  for (const [a, b] of MAP_EDGES) {
    link(a, b);
    link(b, a);
  }
  return adj;
}
const ADJ = buildAdjacency();

/** BFS from home over the travel graph; a node is enterable iff its gate passes. */
function reachableZones(ownedTiers: Map<string, number>): Set<string> {
  const gateOk = (node: MapNode): boolean => {
    if (node.requiresHearthTokens) return false; // endgame token gate — not modeled here
    const g = node.requiresZoneTier;
    if (g) {
      const owned = ownedTiers.get(g.zone);
      if (owned == null || owned < g.tier) return false;
    }
    return true;
  };
  const seen = new Set<string>(["home"]);
  const queue: string[] = ["home"];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of ADJ.get(cur) ?? []) {
      if (seen.has(nb)) continue;
      const node = NODE_BY_ID.get(nb);
      if (!node || !gateOk(node)) continue; // can't enter (or pass through) a gated zone
      seen.add(nb);
      queue.push(nb);
    }
  }
  return seen;
}

// ── The fresh-save oracle ────────────────────────────────────────────────────

export interface ZoneSpine {
  id: string;
  name: string;
  kind: string;
  icon: string;
  /** Map position (0–100 board coords, mirrors the in-game cartography layout). */
  x: number;
  y: number;
  region: string;
  entryCoins: number;
  boardKinds: string[]; // farm | mine | fish (empty = no board)
  gate: { zone: string; tier: number } | null;
  requiresHearthTokens: boolean;
  tiers: Array<{ id: string; name: string; plots: number; upgradeCost: Record<string, number>; unlocks: string[] }>;
  /** Reachable from a fresh save (home tier 0, nothing else founded)? */
  reachableFromFreshSave: boolean;
  /** Highest tier reachable on this zone's own siloed production. */
  maxSelfTier: number;
  wall: ZoneWall | null;
}

export interface ProgressionOracle {
  freshSaveReachable: string[];
  /** Zones the player can travel to AND that have a playable board, fresh-save. */
  freshSavePlayableBoards: string[];
  /** Resource kinds a fresh-save player can ever stock at HOME. */
  homeProducible: string[];
  walls: Array<{ zone: string; wall: ZoneWall }>;
  softlock: {
    isLocked: boolean;
    stuckZone: string;
    stuckTier: number;
    stuckTierName: string;
    blockedRung: string;
    primaryMissing: string[];
    summary: string;
  } | null;
  /** The market lists mine goods as buyable, but the buy UI is gated — note it. */
  marketEscape: { exists: boolean; note: string };
}

export interface ProgressionSpine {
  game: "puzzleDrag2";
  generatedFrom: string;
  resourceFamilies: { farm: string[]; mine: string[]; fish: string[] };
  recipes: RecipeView[];
  zones: ZoneSpine[];
  edges: Array<[string, string]>;
  oracle: ProgressionOracle;
}

/**
 * Derive the whole spine from the constants. Pure; no I/O, no RNG, no reducer —
 * a fixpoint over the data. Deterministic for a given codebase state.
 */
export function buildProgressionSpine(): ProgressionSpine {
  // Each tiered zone's max self-tier is fixed by its own board+stations (siloed),
  // independent of the global graph. Compute once.
  const selfClimb = new Map<string, { reachedTier: number; wall: ZoneWall | null }>();
  for (const node of MAP_NODES) {
    selfClimb.set(node.id, climbZone(node));
  }

  // Reachability fixpoint: home is always reachable; a tiered zone, once
  // reachable, contributes its max self-tier to the gate set, which may unlock
  // further zones. Iterate to a fixpoint.
  const ownedTiers = new Map<string, number>();
  ownedTiers.set("home", selfClimb.get("home")!.reachedTier);
  let reachable = reachableZones(ownedTiers);
  for (let guard = 0; guard < MAP_NODES.length + 2; guard++) {
    let changed = false;
    for (const z of reachable) {
      const node = NODE_BY_ID.get(z)!;
      if (node.tiers?.length) {
        const t = selfClimb.get(z)!.reachedTier;
        if (ownedTiers.get(z) !== t) {
          ownedTiers.set(z, t);
          changed = true;
        }
      }
    }
    const next = reachableZones(ownedTiers);
    if (next.size !== reachable.size) changed = true;
    reachable = next;
    if (!changed) break;
  }

  const zones: ZoneSpine[] = MAP_NODES.map((node) => {
    const boardKinds = Object.keys(node.boards as Record<string, unknown>);
    const climb = selfClimb.get(node.id)!;
    return {
      id: node.id,
      name: node.name,
      kind: node.kind as string,
      icon: node.icon,
      x: node.x,
      y: node.y,
      region: node.region as string,
      entryCoins: (node.entryCost as { coins?: number }).coins ?? 0,
      boardKinds,
      gate: node.requiresZoneTier ?? null,
      requiresHearthTokens: !!node.requiresHearthTokens,
      tiers: (node.tiers ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        plots: t.plots,
        upgradeCost: { ...(t.upgradeCost?.resources ?? {}) },
        unlocks: (t.unlocks as string[]).slice(),
      })),
      reachableFromFreshSave: reachable.has(node.id),
      maxSelfTier: climb.reachedTier,
      wall: climb.wall,
    };
  });

  const playable = [...reachable].filter((z) => {
    const node = NODE_BY_ID.get(z)!;
    return Object.keys(node.boards as Record<string, unknown>).length > 0;
  });

  const homeNode = NODE_BY_ID.get("home")!;
  const homeProducible = [...zoneProducible(homeNode, selfClimb.get("home")!.reachedTier)].sort();

  // Walls only for zones a fresh-save player can actually reach + found.
  const walls = zones
    .filter((z) => z.reachableFromFreshSave && z.wall)
    .map((z) => ({ zone: z.id, wall: z.wall! }));

  // Softlock = home cannot reach the top of its own ladder (it is the spine).
  const homeZone = zones.find((z) => z.id === "home")!;
  const homeMax = homeZone.tiers.length ? homeZone.tiers.length - 1 : 0;
  let softlock: ProgressionOracle["softlock"] = null;
  if (homeZone.wall && homeZone.maxSelfTier < homeMax) {
    const w = homeZone.wall;
    softlock = {
      isLocked: true,
      stuckZone: "home",
      stuckTier: w.reachedTier,
      stuckTierName: w.reachedName,
      blockedRung: w.toName,
      primaryMissing: w.missing.map((m) => m.key),
      summary:
        `A fresh save can reach only ${playable.length} playable board(s) ` +
        `(${playable.join(", ")}) — all farm. Home, the progression spine, ` +
        `cannot climb past ${w.reachedName} (tier ${w.reachedTier}): the ${w.toName} ` +
        `rung needs ${w.missing.map((m) => m.key).join(", ")}, which home can neither ` +
        `produce nor craft. Every mine/fish zone that could supply those goods is ` +
        `gated behind the quarry (home tier 3), and the home ladder itself demands ` +
        `mine goods from tier 2 on — a circular lock with no first step.`,
    };
  }

  const oracle: ProgressionOracle = {
    freshSaveReachable: [...reachable].sort(),
    freshSavePlayableBoards: playable.sort(),
    homeProducible,
    walls,
    softlock,
    marketEscape: {
      exists: false,
      note:
        "MARKET_PRICES lists block/iron_bar/coke/bread as buyable and BUY_RESOURCE " +
        "does not itself check the caravan post, but the buy UI is shown only once " +
        "caravan_post is built (Inventory.tsx) — and caravan_post costs block+iron_bar. " +
        "So the market is a latent escape valve that is itself mine-gated. Opening it " +
        "(an early buyable starter good, or ungating the buy UI) is the cheapest lever.",
    },
  };

  return {
    game: "puzzleDrag2",
    generatedFrom:
      "MAP_NODES + MAP_EDGES (src/features/cartography/data.ts), BUILDINGS + RECIPES + " +
      "tile pools (src/constants.ts). Derived by src/playtest/progression.ts; no hand-authored numbers.",
    resourceFamilies: {
      farm: [...FARM_OUT].sort(),
      mine: [...MINE_OUT].sort(),
      fish: [...FISH_OUT].sort(),
    },
    recipes: RECIPE_LIST,
    zones,
    edges: MAP_EDGES.map(([a, b]) => [a, b] as [string, string]),
    oracle,
  };
}

// ── Human report (CLI) ───────────────────────────────────────────────────────

export function renderProgressionReport(spine: ProgressionSpine): string {
  const L: string[] = [];
  L.push(`# puzzleDrag2 — progression spine (code-derived)`);
  L.push("");
  L.push(`_Derived from: ${spine.generatedFrom}_`);
  L.push("");

  L.push("## Fresh-save reachability");
  L.push("");
  L.push(`From a fresh save (home at tier 0, nothing else founded), the player can travel to:`);
  L.push("");
  L.push(spine.oracle.freshSaveReachable.map((z) => `\`${z}\``).join(", "));
  L.push("");
  L.push(`Of those, **${spine.oracle.freshSavePlayableBoards.length}** have a playable board: ` +
    spine.oracle.freshSavePlayableBoards.map((z) => `\`${z}\``).join(", ") + ".");
  L.push("");

  L.push("## Zone gates");
  L.push("");
  L.push("| Zone | Kind | Entry | Board | Gate | Reach (fresh) | Max self-tier |");
  L.push("|---|---|---|---|---|---|---|");
  for (const z of spine.zones) {
    const gate = z.requiresHearthTokens ? "3 Hearth-Tokens" : z.gate ? `${z.gate.zone} ≥ t${z.gate.tier}` : "—";
    const board = z.boardKinds.length ? z.boardKinds.join("/") : "—";
    const max = z.tiers.length ? `${z.maxSelfTier}/${z.tiers.length - 1}` : "—";
    L.push(`| ${z.name} | ${z.kind} | ${z.entryCoins}c | ${board} | ${gate} | ${z.reachableFromFreshSave ? "✓" : "✗"} | ${max} |`);
  }
  L.push("");

  if (spine.oracle.softlock) {
    const s = spine.oracle.softlock;
    L.push(`## ⛔ Softlock — home stuck at ${s.stuckTierName} (tier ${s.stuckTier})`);
    L.push("");
    L.push(s.summary);
    L.push("");
  }

  if (spine.oracle.walls.length) {
    L.push("## Progression walls (per reachable zone)");
    L.push("");
    for (const { zone, wall } of spine.oracle.walls) {
      L.push(`### ${zone}: ${wall.reachedName} → ${wall.toName} (blocked)`);
      L.push("");
      for (const m of wall.missing) L.push(`- **${m.key}** — ${m.reason}`);
      L.push("");
    }
  }

  L.push("## Home production envelope");
  L.push("");
  L.push(`A fresh-save home can ever stock these resource kinds: ` +
    (spine.oracle.homeProducible.length ? spine.oracle.homeProducible.map((r) => `\`${r}\``).join(", ") : "_none beyond the empty start_") + ".");
  L.push("");
  L.push(`> Market note: ${spine.oracle.marketEscape.note}`);
  L.push("");
  return L.join("\n");
}

// ── Cross-run diff — detect what changed vs the last reviewed baseline ────────
//
// `--progression` re-derives the spine every run; this diffs the fresh spine
// against the committed BASELINE (reference/docs/balance/progression.baseline.json
// — the last state a human signed off on) so a balance pass can SEE what moved:
// did the softlock clear, did a zone become reachable, did a tier cost change. The
// report and dashboard then mark changed facts so stale claims read as outdated.
// `--progression --accept` promotes the current spine to the baseline once the
// changes have been reviewed (the snapshot-test model: review, then accept).

export type ChangeSeverity = "critical" | "major" | "minor" | "structural";

export interface SpineChange {
  severity: ChangeSeverity;
  category: string;
  /** Stable key identifying the fact (e.g. `zone:home.tier:hamlet.cost`). */
  path: string;
  /** Human identity of the fact (e.g. "Hearthwood Vale → Hamlet cost"). */
  name: string;
  kind: "added" | "removed" | "changed";
  before: string | null;
  after: string | null;
}

export interface ProgressionDiff {
  hasBaseline: boolean;
  unchanged: boolean;
  counts: Record<ChangeSeverity, number>;
  changes: SpineChange[];
  headline: string;
}

interface Fact { value: string; severity: ChangeSeverity; category: string; name: string; }

/** Flatten a spine to comparable, balance-relevant facts keyed by a stable path. */
function spineFacts(spine: ProgressionSpine): Map<string, Fact> {
  const f = new Map<string, Fact>();
  const put = (path: string, value: string | number | boolean, severity: ChangeSeverity, category: string, name: string) =>
    f.set(path, { value: String(value), severity, category, name });

  const sl = spine.oracle.softlock;
  put("oracle.softlock", sl ? `${sl.stuckZone}@${sl.stuckTierName} — ${sl.blockedRung} needs ${sl.primaryMissing.join("+")}` : "none",
    "critical", "softlock", "Softlock");

  for (const z of spine.zones) {
    // Reachability is the highest-signal balance fact: what content is actually
    // attainable. A fix that opens the spine flips several of these at once.
    put(`zone:${z.id}.reachable`, z.reachableFromFreshSave ? "reachable" : "locked", "critical", "reachability", `${z.name} (fresh-save reach)`);
    put(`zone:${z.id}.gate`, z.requiresHearthTokens ? "hearth-tokens" : z.gate ? `${z.gate.zone} ≥ t${z.gate.tier}` : "none", "major", "gate", `${z.name} gate`);
    put(`zone:${z.id}.wall`, z.wall ? `${z.wall.reachedName}→${z.wall.toName} needs ${z.wall.missing.map((m) => m.key).join("+")}` : "none", "major", "wall", `${z.name} wall`);
    if (z.tiers.length) {
      put(`zone:${z.id}.maxSelfTier`, `${z.maxSelfTier}/${z.tiers.length - 1}`, "major", "self-tier", `${z.name} reachable self-tier`);
    }
    put(`zone:${z.id}.entry`, `${z.entryCoins}c`, "minor", "entry-cost", `${z.name} entry cost`);
    for (const t of z.tiers) {
      const cost = Object.entries(t.upgradeCost).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(", ") || "free";
      put(`zone:${z.id}.tier:${t.id}.cost`, cost, "minor", "tier-cost", `${z.name} → ${t.name} cost`);
    }
  }
  for (const r of spine.recipes) {
    put(`recipe:${r.item}`, `${r.station}/t${r.tier}/${[...r.inputs].sort().join("+")}`, "minor", "recipe", `Recipe: ${r.item}`);
  }
  return f;
}

const SEVERITY_ORDER: Record<ChangeSeverity, number> = { critical: 0, major: 1, minor: 2, structural: 3 };

/** Diff the current spine against a baseline (the last reviewed state). Pure. */
export function diffSpines(baseline: ProgressionSpine | null, current: ProgressionSpine): ProgressionDiff {
  const counts: Record<ChangeSeverity, number> = { critical: 0, major: 0, minor: 0, structural: 0 };
  if (!baseline) {
    return {
      hasBaseline: false, unchanged: true, counts, changes: [],
      headline: "No baseline yet — establishing one now. Future runs will diff against it.",
    };
  }
  const base = spineFacts(baseline);
  const cur = spineFacts(current);
  const changes: SpineChange[] = [];
  for (const key of new Set([...base.keys(), ...cur.keys()])) {
    const b = base.get(key);
    const c = cur.get(key);
    if (b && c) {
      if (b.value !== c.value) {
        changes.push({ severity: c.severity, category: c.category, path: key, name: c.name, kind: "changed", before: b.value, after: c.value });
        counts[c.severity]++;
      }
    } else if (c) {
      // A fact present now but not in the baseline — a new zone/tier/recipe.
      changes.push({ severity: "structural", category: c.category, path: key, name: c.name, kind: "added", before: null, after: c.value });
      counts.structural++;
    } else if (b) {
      changes.push({ severity: "structural", category: b.category, path: key, name: b.name, kind: "removed", before: b.value, after: null });
      counts.structural++;
    }
  }
  changes.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.path.localeCompare(b.path));
  const unchanged = changes.length === 0;
  const headline = unchanged
    ? "Spine unchanged since the last reviewed baseline."
    : `${changes.length} change(s) since last review — ${counts.critical} critical, ${counts.major} major, ${counts.minor} minor` +
      (counts.structural ? `, ${counts.structural} structural` : "") + ".";
  return { hasBaseline: true, unchanged, counts, changes, headline };
}

/** Markdown for the diff section (appended to the progression report). */
export function renderProgressionDiff(diff: ProgressionDiff): string {
  const L: string[] = [];
  L.push("## Changes since last review");
  L.push("");
  if (!diff.hasBaseline) { L.push(`_${diff.headline}_`); L.push(""); return L.join("\n"); }
  L.push((diff.unchanged ? "✓ " : "⚠ ") + diff.headline);
  L.push("");
  if (diff.unchanged) return L.join("\n");
  L.push("Facts that moved vs the committed baseline. Anything below is **outdated** in the prior" +
    " report. Once reviewed, run `npm run playtest -- --progression --accept` to make this the new" +
    " baseline (clears the flags).");
  L.push("");
  L.push("| Severity | What | Before | After |");
  L.push("|---|---|---|---|");
  for (const c of diff.changes) {
    const what = c.kind === "added" ? `NEW · ${c.name}` : c.kind === "removed" ? `REMOVED · ${c.name}` : c.name;
    L.push(`| ${c.severity} | ${what} | ${c.before ?? "—"} | ${c.after ?? "—"} |`);
  }
  L.push("");
  return L.join("\n");
}
