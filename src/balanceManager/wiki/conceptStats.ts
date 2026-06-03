/**
 * conceptStats.ts — Derive 1–4 headline stat chips for a concept category page.
 *
 * Pure helper: no React, no DOM, no side-effects.
 * Uses live config via concept.getEntries() entries already passed in, plus
 * the canonical source maps (RECIPES, BUILDINGS) for concept-specific extras.
 * Never throws — returns a safe minimum of [{value, label}] with just the count.
 */

import type { WikiEntry } from "./EntryGrid.jsx";
import { ITEMS, RECIPES, BUILDINGS } from "../../constants.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeadlineStat {
  value: number | string;
  label: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Count distinct station ids across all (deduplicated) recipes. */
function distinctStationCount(): number {
  const seen = new Set<object>();
  const stations = new Set<string>();
  for (const rec of Object.values(RECIPES)) {
    if (!rec || typeof rec !== "object") continue;
    if (seen.has(rec)) continue;
    seen.add(rec);
    const r = rec as Record<string, unknown>;
    if (typeof r.station === "string" && r.station) {
      stations.add(r.station);
    }
  }
  return stations.size;
}

/** Count distinct biomes across tile entries using live ITEMS config. */
function distinctBiomesFromEntries(
  entries: WikiEntry[],
): number {
  const items = ITEMS as Record<string, { biome?: string } | undefined>;
  const biomes = new Set<string>();
  for (const entry of entries) {
    const item = items[entry.key];
    if (!item || !item.biome) continue;
    biomes.add(item.biome);
  }
  return biomes.size;
}

/** Count recipes per building and sum total. */
function totalRecipesAcrossBuildings(): number {
  let total = 0;
  for (const building of BUILDINGS) {
    const seenForBuilding = new Set<object>();
    for (const rec of Object.values(RECIPES)) {
      if (!rec || typeof rec !== "object") continue;
      const r = rec as Record<string, unknown>;
      if (r.station === building.id && !seenForBuilding.has(rec)) {
        seenForBuilding.add(rec);
        total++;
      }
    }
  }
  return total;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return 1–4 headline stats for the given concept category page.
 * Always includes a total entry count as the first stat.
 * Concept-specific extras are appended where obvious from live data.
 *
 * @param conceptId  The concept id (e.g. "tiles", "recipes", "buildings").
 * @param entries    The live entries array from concept.getEntries().
 */
export function conceptHeadlineStats(
  conceptId: string,
  entries: WikiEntry[],
): HeadlineStat[] {
  const count = entries.length;

  // Concept-specific label for the total count
  const countLabel = conceptId === "tiles" ? "species" : "entries";

  const stats: HeadlineStat[] = [{ value: count, label: countLabel }];

  switch (conceptId) {
    case "tiles": {
      const biomes = distinctBiomesFromEntries(entries);
      if (biomes > 0) stats.push({ value: biomes, label: "biomes" });
      break;
    }

    case "recipes": {
      const stations = distinctStationCount();
      if (stations > 0) stats.push({ value: stations, label: "stations" });
      break;
    }

    case "buildings": {
      const totalRecipes = totalRecipesAcrossBuildings();
      if (totalRecipes > 0) stats.push({ value: totalRecipes, label: "recipes" });
      break;
    }

    default:
      break;
  }

  return stats;
}
