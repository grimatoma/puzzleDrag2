// Tabular CSV export over the live game catalogs. The Balance Manager
// already has a JSON dump (ExportTab); CSV is the format designers reach
// for when they want to crunch numbers in a spreadsheet.
//
// Each exporter is a pure function `() → string` (or `(catalog) → string`
// for dependency injection). All values are escape-quoted for RFC-4180
// compliance, and rows are CRLF-terminated so Excel opens them clean.

import { ITEMS, BUILDINGS, RECIPES } from "../constants.js";
import { TYPE_WORKERS } from "../features/workers/data.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";
import { BOSSES } from "../features/bosses/data.js";

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rows(headers, lines) {
  return [headers.map(escapeCsv).join(","), ...lines.map((r) => r.map(escapeCsv).join(","))].join("\r\n");
}

/** Items: one row per ITEMS entry — key core fields a designer audits. */
export function itemsCsv({ items = ITEMS } = {}) {
  const headers = ["id", "kind", "biome", "label", "value", "color", "next", "description"];
  const lines = Object.entries(items || {}).map(([id, item]) => ([
    id, item?.kind || "", item?.biome || "", item?.label || "",
    item?.value ?? "",
    item?.color !== undefined ? "0x" + Number(item.color).toString(16).padStart(6, "0") : "",
    item?.next || "",
    item?.desc || item?.description || "",
  ]));
  return rows(headers, lines);
}

/** Recipes: id, item, station, tier, inputs (joined), coin reward if present. */
export function recipesCsv({ recipes = RECIPES } = {}) {
  const headers = ["id", "item", "station", "tier", "inputs", "coins"];
  const seen = new Set();
  const lines = [];
  for (const [id, recipe] of Object.entries(recipes || {})) {
    if (!recipe || seen.has(id)) continue;
    seen.add(id);
    const inputs = Object.entries(recipe.inputs || {}).map(([k, v]) => `${k}:${v}`).join("; ");
    lines.push([id, recipe.item || "", recipe.station || "", recipe.tier ?? "", inputs, recipe.coins ?? ""]);
  }
  return rows(headers, lines);
}

/** Buildings: id, name, level, biome, summed cost, cost detail. */
export function buildingsCsv({ buildings = BUILDINGS } = {}) {
  const headers = ["id", "name", "level", "biome", "coins", "resourceCost"];
  const list = Array.isArray(buildings) ? buildings : Object.values(buildings || {});
  const lines = list.map((b) => {
    const cost = b?.cost || {};
    const coins = cost.coins ?? 0;
    const others = Object.entries(cost).filter(([k]) => k !== "coins").map(([k, v]) => `${k}:${v}`).join("; ");
    return [b.id, b.name || "", b.lv ?? "", b.biome || "", coins, others];
  });
  return rows(headers, lines);
}

/** Workers: id, name, base / step / mult / max — and totalCost to fill the ramp. */
export function workersCsv({ workers = TYPE_WORKERS } = {}) {
  const headers = ["id", "name", "base", "coinsStep", "coinsMult", "maxCount"];
  const list = Array.isArray(workers) ? workers : Object.values(workers || {});
  const lines = list.map((w) => ([
    w?.id, w?.name || "",
    w?.hireCost?.coins ?? "",
    w?.hireCost?.coinsStep ?? "",
    w?.hireCost?.coinsMult ?? "",
    w?.maxCount ?? "",
  ]));
  return rows(headers, lines);
}

/** Achievements: id, name, counter, threshold, target, coins, hasTool. */
export function achievementsCsv({ achievements = ACHIEVEMENTS } = {}) {
  const headers = ["id", "name", "counter", "threshold", "target", "coins", "tools", "description"];
  const list = Array.isArray(achievements) ? achievements : Object.values(achievements || {});
  const lines = list.map((a) => ([
    a?.id, a?.name || "", a?.counter || "",
    a?.threshold ?? "", a?.target ?? "",
    a?.reward?.coins ?? "",
    a?.reward?.tools ? Object.entries(a.reward.tools).map(([k, v]) => `${k}:${v}`).join("; ") : "",
    a?.desc || "",
  ]));
  return rows(headers, lines);
}

/** Bosses: id, name, season, target resource + amount, modifier type. */
export function bossesCsv({ bosses = BOSSES } = {}) {
  const headers = ["id", "name", "season", "targetResource", "targetAmount", "modifierType"];
  const list = Array.isArray(bosses) ? bosses : Object.values(bosses || {});
  const lines = list.map((b) => ([
    b?.id, b?.name || "", b?.season || "",
    b?.target?.resource || "", b?.target?.amount ?? "",
    b?.modifier?.type || "",
  ]));
  return rows(headers, lines);
}

export const CATALOG_EXPORTS = [
  { id: "items",        label: "Items / resources / tiles", build: itemsCsv },
  { id: "recipes",      label: "Recipes",                    build: recipesCsv },
  { id: "buildings",    label: "Buildings",                  build: buildingsCsv },
  { id: "workers",      label: "Workers",                    build: workersCsv },
  { id: "achievements", label: "Achievements",               build: achievementsCsv },
  { id: "bosses",       label: "Bosses",                     build: bossesCsv },
];
