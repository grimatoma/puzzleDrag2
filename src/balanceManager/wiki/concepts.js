// Concept inventory for the Balance Manager Wiki tab.
//
// This module exports `CONCEPTS`: a list of descriptors that the Wiki tab
// renders one sub-tab per. Each descriptor pulls its entries live from the
// canonical source-of-truth map (ITEMS, HAZARDS, TYPE_WORKERS, BUILDINGS, …).
// Nothing here duplicates names — adding a new tile to constants.js, a new
// hazard to features/mine/hazards.js, etc., automatically appears in the
// Wiki without edits to this file.
//
// Used as an alignment artifact for the upcoming type-discipline refactor:
// every distinct concept in the game shows up exactly once here.

import { ITEMS, BUILDINGS, NPCS, RECIPES, SETTLEMENT_BIOMES, SEASONS } from "../../constants.js";
import { HAZARDS } from "../../features/mine/hazards.js";
import { TYPE_WORKERS } from "../../features/workers/data.js";
import { ZONES, ZONE_CATEGORIES } from "../../features/zones/data.js";
import { CATEGORIES as TILE_CATEGORIES } from "../../features/tileCollection/data.js";
import { ABILITIES } from "../../config/abilities.js";
import { TOOL_POWERS } from "../../config/toolPowers.js";
import { TILE_DISCOVERY_METHODS } from "../../config/tileDiscoveryMethods.js";
import { KNOWN_VIEWS, KNOWN_MODALS } from "../../router.js";
import { BOSSES } from "../../features/bosses/data.js";

function byName(a, b) {
  const an = String(a.name ?? "").toLowerCase();
  const bn = String(b.name ?? "").toLowerCase();
  if (an < bn) return -1;
  if (an > bn) return 1;
  return 0;
}

function itemsOfKind(kind) {
  const out = [];
  for (const [key, item] of Object.entries(ITEMS)) {
    if (item?.kind !== kind) continue;
    out.push({
      key,
      name: item.label ?? key,
      iconKey: key,
      color: item.color,
    });
  }
  out.sort(byName);
  return out;
}

function bossEntries() {
  return BOSSES.map((b) => ({
    key: b.id,
    name: b.name,
    iconKey: `boss_${b.id}`,
  })).sort(byName);
}

function hazardEntries() {
  return HAZARDS.map((h) => ({
    key: h.id,
    name: h.name,
    iconKey: `hazard_${h.id}`,
  })).sort(byName);
}

function workerEntries() {
  return TYPE_WORKERS.map((w) => ({
    key: w.id,
    name: w.name,
    iconKey: w.iconKey,
    color: w.color,
  })).sort(byName);
}

const BUILDING_ICON_KEYS = {
  bakery: "station_bakery",
  forge: "station_forge",
  larder: "station_larder",
  workshop: "station_workshop",
  portal: "ui_portal",
};

function buildingEntries() {
  return BUILDINGS.map((b) => ({
    key: b.id,
    name: b.name,
    iconKey: BUILDING_ICON_KEYS[b.id],
    color: b.color,
  })).sort(byName);
}

function npcEntries() {
  const out = [];
  for (const [id, npc] of Object.entries(NPCS)) {
    out.push({
      key: id,
      name: npc.name ?? id,
      iconKey: `char_${id}`,
      color: npc.color,
    });
  }
  out.sort(byName);
  return out;
}

function recipeEntries() {
  // RECIPES has aliases (recipe.item → same object) and underscore variants.
  // Dedupe by the recipe object identity, then key by the canonical `rec_*`
  // entry where possible.
  const seen = new Set();
  const out = [];
  for (const [key, recipe] of Object.entries(RECIPES)) {
    if (!recipe || typeof recipe !== "object") continue;
    if (seen.has(recipe)) continue;
    seen.add(recipe);
    const itemDef = recipe.item ? ITEMS[recipe.item] : null;
    const iconKey = itemDef ? recipe.item : undefined;
    out.push({
      key,
      name: recipe.name ?? key,
      iconKey,
    });
  }
  out.sort(byName);
  return out;
}

function zoneEntries() {
  return Object.values(ZONES)
    .map((z) => ({
      key: z.id,
      name: z.name ?? z.label ?? z.id,
    }))
    .sort(byName);
}

function settlementBiomeEntries() {
  const out = [];
  for (const list of Object.values(SETTLEMENT_BIOMES)) {
    if (!Array.isArray(list)) continue;
    for (const b of list) {
      out.push({
        key: b.id,
        name: b.name ?? b.id,
      });
    }
  }
  out.sort(byName);
  return out;
}

function categoryEntries() {
  const set = new Set();
  for (const c of ZONE_CATEGORIES) set.add(c);
  for (const c of TILE_CATEGORIES) set.add(c);
  return [...set]
    .map((c) => ({ key: c, name: c }))
    .sort(byName);
}

function abilityEntries() {
  return ABILITIES.map((a) => ({
    key: a.id,
    name: a.name,
    iconKey: a.iconKey,
  })).sort(byName);
}

function toolPowerEntries() {
  return TOOL_POWERS.map((p) => ({
    key: p.id,
    name: p.name,
  })).sort(byName);
}

function tileDiscoveryMethodEntries() {
  return TILE_DISCOVERY_METHODS.map((m) => ({
    key: m.id,
    name: m.name,
  })).sort(byName);
}

function seasonEntries() {
  return SEASONS.map((s) => ({
    key: s.name,
    name: s.name,
    iconKey: s.iconKey,
    color: s.bg,
  })).sort(byName);
}

function viewEntries() {
  return [...KNOWN_VIEWS]
    .map((v) => ({ key: v, name: v }))
    .sort(byName);
}

function modalEntries() {
  return [...KNOWN_MODALS]
    .map((m) => ({ key: m, name: m }))
    .sort(byName);
}

export const CONCEPTS = [
  {
    id: "tiles",
    label: "Tiles",
    blurb: "Board pieces. Each tile is an ITEMS entry with kind: \"tile\".",
    getEntries: () => itemsOfKind("tile"),
  },
  {
    id: "resources",
    label: "Resources",
    blurb: "Inventory amounts produced by chains or recipes (kind: \"resource\").",
    getEntries: () => itemsOfKind("resource"),
  },
  {
    id: "tools",
    label: "Tools",
    blurb: "Single-use items the player spends to trigger a tool power (kind: \"tool\").",
    getEntries: () => itemsOfKind("tool"),
  },
  {
    id: "bosses",
    label: "Boss Types",
    blurb: "Seasonal antagonists — each locks a 10-turn challenge with a unique board modifier.",
    getEntries: bossEntries,
  },
  {
    id: "hazards",
    label: "Hazards",
    blurb: "Board-level threats that spawn in the Mine biome.",
    getEntries: hazardEntries,
  },
  {
    id: "workers",
    label: "Workers",
    blurb: "Type-tier hires that stack per-type effects on chain thresholds and recipes.",
    getEntries: workerEntries,
  },
  {
    id: "buildings",
    label: "Buildings",
    blurb: "Town-level structures the player constructs.",
    getEntries: buildingEntries,
  },
  {
    id: "npcs",
    label: "NPCs",
    blurb: "Townsfolk who issue orders and form bonds with the player.",
    getEntries: npcEntries,
  },
  {
    id: "recipes",
    label: "Recipes",
    blurb: "Crafted goods and tools, with their station + ingredient list.",
    getEntries: recipeEntries,
  },
  {
    id: "zones",
    label: "Zones",
    blurb: "Map nodes — each location is its own zone with its own boards and drops.",
    getEntries: zoneEntries,
  },
  {
    id: "settlementBiomes",
    label: "Settlement Biomes",
    blurb: "Biomes a new settlement can be founded as.",
    getEntries: settlementBiomeEntries,
  },
  {
    id: "categories",
    label: "Categories",
    blurb: "Tile/zone category names used by spawn pools, threshold reductions, and upgrade maps.",
    getEntries: categoryEntries,
  },
  {
    id: "abilities",
    label: "Attributes (Abilities)",
    blurb: "Passive modifiers — always on while their source is present.",
    getEntries: abilityEntries,
  },
  {
    id: "toolPowers",
    label: "Tool Powers",
    blurb: "Catalog of tool powers — active mechanics triggered when the player spends a tool item.",
    getEntries: toolPowerEntries,
  },
  {
    id: "tileDiscoveryMethods",
    label: "Tile Discovery Methods",
    blurb: "How a tile becomes available to the player — default, chain-unlock, research, buy, daily reward.",
    getEntries: tileDiscoveryMethodEntries,
  },
  {
    id: "seasons",
    label: "Seasons",
    blurb: "Spring · Summer · Autumn · Winter — the four-season run cycle.",
    getEntries: seasonEntries,
  },
  {
    id: "views",
    label: "Views",
    blurb: "Routable top-level screens (hash-routed via src/router.js).",
    getEntries: viewEntries,
  },
  {
    id: "modals",
    label: "Modals",
    blurb: "Routable modal surfaces (hash-routed via src/router.js).",
    getEntries: modalEntries,
  },
];
