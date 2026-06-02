/**
 * lede.ts — Deterministic auto-lede generator for the Dev Panel Wiki.
 *
 * Synthesises a one-sentence summary for any wiki entity from its live data
 * (via relationsFor) and its implementation status (via statusForEntity).
 * The function is pure and has no side-effects: same inputs → same output.
 *
 * Pure module: no React, no DOM, no side-effects.
 */

import { relationsFor, type RelationGroup } from "./relations.js";
import { statusForEntity } from "./status.js";
import { getEntity } from "./conceptEntities.js";

// ─── Internal helpers ─────────────────────────────────────────────────────────

type Rec = Record<string, unknown> | null;

/** Best human-readable name for an entity, falling back to its key. */
function nameOf(entity: Rec, key: string): string {
  return String(entity?.label ?? entity?.name ?? entity?.id ?? key);
}

/** Count links in the first group whose title exactly matches `title`. */
function count(groups: RelationGroup[], title: string): number {
  return groups.find((g) => g.title === title)?.links.length ?? 0;
}

/** Label of the first link in the first group whose title exactly matches `title`. */
function labelIn(groups: RelationGroup[], title: string): string | null {
  return groups.find((g) => g.title === title)?.links[0]?.label ?? null;
}

/** Pluralise a count+word pair: "1 recipe" / "2 recipes". */
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Resolve the station (building) name for the first "Crafted by" recipe link.
 *
 * "Crafted by" links point to recipes, not buildings. This helper walks:
 *   recipe key → recipe.station → building entity → building display name.
 * Returns null when any step in the chain fails.
 */
function stationOf(g: RelationGroup[]): string | null {
  const craftedByKey = g.find((x) => x.title === "Crafted by")?.links[0]?.key ?? null;
  if (!craftedByKey) return null;
  const recipe = getEntity("recipes", craftedByKey);
  const station = typeof recipe?.station === "string" ? recipe.station : null;
  if (!station) return null;
  const building = getEntity("buildings", station);
  return building ? String(building.label ?? building.name ?? building.id ?? station) : station;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a one-sentence lede for the entity identified by `conceptId` + `key`.
 *
 * `entity` is the raw live entity object (from `getEntity`). It may be `null`
 * when the entity cannot be resolved; the function still returns a safe string.
 *
 * The returned string always ends with a period and, for non-WIRED entities,
 * is suffixed with ` (STATUS)` before the terminal period — e.g. ` (PARTIAL)`.
 *
 * @pure Deterministic — no randomness, no mutable module state.
 */
export function ledeFor(conceptId: string, key: string, entity: Rec): string {
  const g = relationsFor(conceptId, key, entity);
  const name = nameOf(entity, key);
  let s: string;

  switch (conceptId) {
    case "resources": {
      const station = stationOf(g);
      const u = count(g, "Used in recipes");
      s = `${name} is a resource`;
      if (station) s += ` crafted at the ${station}`;
      if (u > 0) s += `, used in ${plural(u, "recipe")}`;
      s += ".";
      break;
    }

    case "tools": {
      const station = stationOf(g);
      s = `${name} is a tool${station ? ` crafted at the ${station}` : ""}.`;
      break;
    }

    case "tiles": {
      const p = labelIn(g, "Produces");
      s = `${name} is a board tile${p ? ` that produces ${p}` : ""}.`;
      break;
    }

    case "recipes": {
      const st = labelIn(g, "Station");
      const o = labelIn(g, "Output");
      const i = count(g, "Ingredients");
      s = `${name} is a recipe`;
      if (st) s += ` crafted at the ${st}`;
      if (o) s += ` producing ${o}`;
      if (i > 0) s += ` from ${plural(i, "ingredient")}`;
      s += ".";
      break;
    }

    case "buildings": {
      const r = count(g, "Recipes crafted here");
      s = `${name} is a town building${r > 0 ? ` where ${plural(r, "recipe")} are crafted` : ""}.`;
      break;
    }

    case "zones": {
      const b = count(g, "Buildings");
      s = `${name} is a zone${b > 0 ? ` hosting ${plural(b, "building")}` : ""}.`;
      break;
    }

    case "npcs": {
      const lo = count(g, "Loves");
      const li = count(g, "Likes");
      const parts: string[] = [];
      if (lo > 0) parts.push(`loves ${lo} gift${lo === 1 ? "" : "s"}`);
      if (li > 0) parts.push(`likes ${li} gift${li === 1 ? "" : "s"}`);
      s = `${name} is a townsperson`;
      if (parts.length) s += ` who ${parts.join(" and ")}`;
      s += ".";
      break;
    }

    case "workers": {
      const a = count(g, "Abilities");
      s = `${name} is a worker${a > 0 ? ` with ${plural(a, "ability")}` : ""}.`;
      break;
    }

    case "abilities":
      s = `${name} is a passive attribute.`;
      break;

    case "toolPowers":
      s = `${name} is an active tool power.`;
      break;

    case "hazards":
      s = `${name} is a board hazard.`;
      break;

    case "bosses":
      s = `${name} is a seasonal boss.`;
      break;

    case "seasons":
      s = `${name} is a season.`;
      break;

    case "settlementBiomes":
      s = `${name} is a settlement biome.`;
      break;

    case "categories":
      s = `${name} is a category grouping tiles and zones.`;
      break;

    case "tileDiscoveryMethods":
      s = `${name} is a tile-discovery method.`;
      break;

    case "views":
      s = `${name} is a top-level game view.`;
      break;

    case "modals":
      s = `${name} is a modal surface.`;
      break;

    default:
      s = `${name}.`;
  }

  // Append status suffix for non-WIRED entities
  const status = statusForEntity(conceptId, key);
  if (status !== "WIRED") {
    // Insert suffix before the terminal period
    s = s.endsWith(".") ? `${s.slice(0, -1)} (${status}).` : `${s} (${status})`;
  }

  return s;
}
