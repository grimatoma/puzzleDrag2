// Catalog audit — cross-cuts every key catalog and surfaces gaps,
// broken references, and missing descriptions. Helpful as a pre-ship
// checklist for designers: "what would be broken if I cut this?".
//
// Categories of findings:
//
//   - missingDescription  : ITEMS / BUILDINGS / BOSSES without prose
//   - brokenRecipeOutput  : RECIPES.item points at a missing ITEMS entry
//   - brokenRecipeInput   : RECIPES.inputs[k] points at a missing ITEMS entry
//   - brokenBuildingCost  : BUILDINGS.cost[k] points at a missing resource key
//                            (anything other than coins / runes / embers …)
//   - bossTargetMissing   : BOSSES.target.resource is unknown
//   - achievementMissing  : ACHIEVEMENTS.reward.tools[k] points at a missing item
//   - zoneBuildingMissing : ZONES.buildings[i] points at a missing BUILDINGS entry
//
// Each finding is `{ category, owner, detail, message }`. Pure module;
// catalogs are dependency-injected so the suite drives synthetic data.

import { ITEMS, BUILDINGS, RECIPES } from "../constants.js";
import { BOSSES } from "../features/bosses/data.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";
import { ZONES } from "../features/zones/data.js";

const CURRENCY_KEYS = new Set(["coins", "runes", "embers", "coreIngots", "gems"]);

const FINDING_LABEL = Object.freeze({
  missingDescription:  "Missing description",
  brokenRecipeOutput:  "Recipe output ID is unknown",
  brokenRecipeInput:   "Recipe input ID is unknown",
  brokenBuildingCost:  "Building cost key isn't a known item or currency",
  bossTargetMissing:   "Boss target resource doesn't exist",
  achievementMissing:  "Achievement tool reward doesn't exist as an item",
  zoneBuildingMissing: "Zone references a missing building",
});

export const AUDIT_CATEGORIES = Object.keys(FINDING_LABEL);
export const AUDIT_LABEL = FINDING_LABEL;

const isString = (v) => typeof v === "string" && v.trim().length > 0;

export function runCatalogAudit({
  items = ITEMS, buildings = BUILDINGS, recipes = RECIPES,
  bosses = BOSSES, achievements = ACHIEVEMENTS, zones = ZONES,
} = {}) {
  const itemIds = new Set(Object.keys(items || {}));
  const buildingIds = new Set();
  for (const b of Array.isArray(buildings) ? buildings : Object.values(buildings || {})) {
    if (b && typeof b.id === "string") buildingIds.add(b.id);
  }

  const findings = [];
  const push = (category, owner, detail, message) => findings.push({ category, owner, detail, message });

  for (const [id, item] of Object.entries(items || {})) {
    if (!isString(item?.desc) && !isString(item?.description)) {
      push("missingDescription", id, "items", `Item "${item?.label || id}" has no desc/description.`);
    }
  }
  for (const b of Array.isArray(buildings) ? buildings : Object.values(buildings || {})) {
    if (!b || !b.id) continue;
    if (!isString(b.desc)) {
      push("missingDescription", b.id, "buildings", `Building "${b.name || b.id}" has no desc text.`);
    }
    for (const [key, qty] of Object.entries(b.cost || {})) {
      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (CURRENCY_KEYS.has(key)) continue;
      if (!itemIds.has(key)) {
        push("brokenBuildingCost", b.id, key, `Building "${b.name || b.id}" cost references unknown item/currency "${key}".`);
      }
    }
  }
  for (const [recipeId, recipe] of Object.entries(recipes || {})) {
    if (!recipe) continue;
    if (recipe.item && !itemIds.has(recipe.item)) {
      push("brokenRecipeOutput", recipeId, recipe.item, `Recipe "${recipeId}" outputs unknown item "${recipe.item}".`);
    }
    for (const inp of Object.keys(recipe.inputs || {})) {
      if (!itemIds.has(inp)) {
        push("brokenRecipeInput", recipeId, inp, `Recipe "${recipeId}" requires unknown item "${inp}".`);
      }
    }
  }
  for (const b of Array.isArray(bosses) ? bosses : Object.values(bosses || {})) {
    if (!b || !b.target?.resource) continue;
    if (!itemIds.has(b.target.resource)) {
      push("bossTargetMissing", b.id, b.target.resource, `Boss "${b.name || b.id}" targets unknown resource "${b.target.resource}".`);
    }
    if (!isString(b.description)) {
      push("missingDescription", b.id, "bosses", `Boss "${b.name || b.id}" has no description.`);
    }
  }
  for (const a of Array.isArray(achievements) ? achievements : Object.values(achievements || {})) {
    if (!a?.reward?.tools) continue;
    for (const toolId of Object.keys(a.reward.tools)) {
      if (!itemIds.has(toolId)) {
        push("achievementMissing", a.id, toolId, `Achievement "${a.name || a.id}" rewards unknown tool "${toolId}".`);
      }
    }
  }
  for (const z of Array.isArray(zones) ? zones : Object.values(zones || {})) {
    if (!z || !Array.isArray(z.buildings)) continue;
    for (const bId of z.buildings) {
      if (!buildingIds.has(bId)) {
        push("zoneBuildingMissing", z.id, bId, `Zone "${z.name || z.id}" lists missing building "${bId}".`);
      }
    }
  }
  return findings;
}

/** Group findings by category for the audit panel render. */
export function groupFindings(findings) {
  const map = new Map();
  for (const f of findings || []) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category).push(f);
  }
  const out = [];
  for (const cat of AUDIT_CATEGORIES) {
    const list = map.get(cat) || [];
    list.sort((a, b) => a.owner.localeCompare(b.owner));
    out.push({ category: cat, label: FINDING_LABEL[cat], items: list });
  }
  return out;
}

export function totalFindings(findings) {
  return Array.isArray(findings) ? findings.length : 0;
}
