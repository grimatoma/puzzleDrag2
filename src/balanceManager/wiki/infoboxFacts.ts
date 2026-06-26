/**
 * infoboxFacts.ts — Per-concept "key facts" selector for the wiki article infobox.
 *
 * Returns a small set (2–4) of the most meaningful facts for a given entity,
 * read directly from the live entity object. All field names are verified against
 * the real source maps (ITEMS, RECIPES, BUILDINGS, ZONES, BOSSES, TYPE_WORKERS,
 * ABILITIES, TOOL_POWERS).
 *
 * Field reference (verified):
 *   tiles     — abilities (powers), biome, category, tier, next, value
 *   resources — kind, biome, value
 *   tools     — kind, desc, power.id (nested)
 *   recipes   — item (output), inputs (ingredients), station, tier
 *   buildings — abilities (powers), unlocked tiles, crafted outputs, lv, cost
 *   zones     — baseTurns, entryCost (object with coins?)
 *   workers   — role, maxCount, hireCost.coins
 *   bosses    — season, target.resource (nested), modifier.type (nested)
 *   abilities — trigger, channel, scope (array)
 *   toolPowers — isTapTarget (boolean), desc
 */

// Pure module — no React/DOM imports.

import { HAZARDS } from "../../features/mine/hazards.js";
import { ITEMS, RECIPES } from "../../constants.js";
import { TILE_TYPES_MAP } from "../../features/tileCollection/data.js";
import { iconLabel } from "../../textures/iconRegistry.js";
import { getAbility } from "../../config/abilities.js";

/** Mine-hazard ids; every other hazard concept entry is a farm hazard. */
const MINE_HAZARD_IDS = new Set(HAZARDS.map((h) => h.id));

type Rec = Record<string, unknown> | null;

/**
 * A "tone" tags a fact by what KIND of key detail it is, so the gallery card
 * can colour-code it (powers vs produced goods vs inputs vs unlocks). Omitted
 * for plain descriptive metadata (level, cost, biome, …), which renders neutral.
 */
export type FactTone = "power" | "craft" | "ingredient" | "unlock";

export interface Fact {
  label: string;
  value: string;
  /** Optional icon key to render alongside the fact value. */
  iconKey?: string;
  /** Optional colour tone for the gallery card chip (see {@link FactTone}). */
  tone?: FactTone;
}

/** Coerce a value to a display string. Objects are JSON-stringified. */
const str = (v: unknown): string => {
  if (v == null) return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// ─── Power / attribute helpers ──────────────────────────────────────────────
//
// Buildings and tiles carry an `abilities` array (`{ id, params }`) plus, for
// buildings, two derived relationships read from the recipe/tile catalogs:
// which recipe outputs they craft (their `station`) and which tiles they
// unlock. These helpers turn those into the short, chip-sized "power" facts
// the gallery cards and article infobox display.

/** Strip a `tile_`/`rec_` prefix and title-case a snake_case key for display. */
const prettify = (key: unknown): string =>
  String(key ?? "")
    .replace(/^(?:tile|rec)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Human display label for an item / resource / tool / currency key. */
const itemLabel = (key: unknown): string => {
  const k = typeof key === "string" ? key : String(key ?? "");
  const fromIcon = iconLabel(k);
  if (fromIcon) return fromIcon;
  const item = (ITEMS as Record<string, { label?: string } | undefined>)[k];
  return item?.label ?? prettify(k);
};

/** Output label of a recipe key, or null when the recipe / item is unknown. */
const recipeOutputLabel = (recipeKey: unknown): string | null => {
  const k = typeof recipeKey === "string" ? recipeKey : "";
  const rec = (RECIPES as Record<string, { item?: string } | undefined>)[k];
  return rec?.item ? itemLabel(rec.item) : null;
};

/** Join up to three labels, alphabetised, with a "+N more" overflow suffix. */
const summariseLabels = (labels: string[]): string | null => {
  const clean = labels.filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (clean.length === 0) return null;
  const MAX = 3;
  return clean.length <= MAX
    ? clean.join(", ")
    : `${clean.slice(0, MAX).join(", ")}, +${clean.length - MAX} more`;
};

/**
 * Simplified "what this building crafts": the distinct recipe outputs whose
 * `station` is this building. Returns null when the building is not a station.
 */
const buildingCraftsValue = (buildingId: string): string | null => {
  const outputs = new Set<string>();
  for (const rec of Object.values(
    RECIPES as Record<string, { station?: string; item?: string } | undefined>,
  )) {
    if (rec && rec.station === buildingId && typeof rec.item === "string") {
      outputs.add(rec.item);
    }
  }
  return summariseLabels([...outputs].map(itemLabel));
};

/** Tiles this building unlocks (e.g. the Kitchen unlocks Broccoli), or null. */
const buildingUnlocksValue = (buildingId: string): string | null => {
  const names: string[] = [];
  for (const tile of Object.values(
    TILE_TYPES_MAP as Record<
      string,
      { displayName?: string; discovery?: { method?: string; buildingId?: string } } | undefined
    >,
  )) {
    if (tile?.discovery?.method === "building" && tile.discovery.buildingId === buildingId) {
      names.push(tile.displayName ?? "");
    }
  }
  return summariseLabels(names);
};

interface AbilityAttachment {
  id?: string;
  params?: Record<string, unknown>;
}

/**
 * Convert one ability attachment (`{ id, params }` as stored on a building or
 * tile) into a short `{ label, value }` fact. Unrecognised shapes return null;
 * unknown-but-cataloged ability ids fall back to the catalog name under a
 * generic "Power" label so nothing renders as raw data.
 */
function abilityPhrase(ability: unknown): { label: string; value: string } | null {
  if (ability == null || typeof ability !== "object") return null;
  const { id, params } = ability as AbilityAttachment;
  const p = (params ?? {}) as Record<string, unknown>;
  const num = (k: string, d = 0): number => (typeof p[k] === "number" ? (p[k] as number) : d);

  switch (id) {
    case "turn_budget_bonus":
      return { label: "Turns", value: `+${num("amount", 1)}/session` };
    case "inventory_cap_bonus":
      return { label: "Storage", value: `+${num("amount")} cap` };
    case "free_moves":
      return { label: "Free moves", value: `+${num("count", 1)}/season` };
    case "free_turn_if_chain":
      return { label: "Free move", value: `chain ${num("minChain", 6)}+` };
    case "coin_bonus_flat":
      return { label: "Coins", value: `+${num("amount")}/chain` };
    case "coin_bonus_per_tile":
      return { label: "Coins", value: `+${num("amount")}/tile` };
    case "pool_weight":
      return { label: "Spawns", value: `+${num("amount", 1)} ${itemLabel(p.target)}` };
    case "season_bonus":
      return { label: "Season", value: `+${num("amount")} ${itemLabel(p.resource ?? "coins")}` };
    case "grant_tool":
      return { label: "Grants", value: `${num("amount", 1)}× ${itemLabel(p.tool)}/season` };
    case "worker_pool_step":
      return { label: "Villagers", value: `+${num("amount", 1)}/season` };
    case "preserve_board":
      return { label: "Preserves", value: `${prettify(p.biome)} layout` };
    case "recipe_input_reduce": {
      const out = recipeOutputLabel(p.recipe);
      const base = `−${num("amount", 1)} ${itemLabel(p.input)}`;
      return { label: "Discount", value: out ? `${base} (${out})` : base };
    }
    case "bonus_yield":
      return { label: "Bonus yield", value: `+${num("amount", 1)} ${itemLabel(p.target)}` };
    case "threshold_reduce_category":
      return { label: "Threshold", value: `−${num("amount", 1)} (${prettify(p.category)})` };
    case "threshold_reduce":
      return { label: "Threshold", value: `−${num("amount", 1)} ${itemLabel(p.target)}` };
    case "chain_redirect_category":
      return { label: "Promotes", value: `${prettify(p.fromCategory)} → ${prettify(p.toCategory)}` };
    case "rune_support_reduce":
      return { label: "Rune", value: `−${num("amount", 1)} support` };
    default: {
      const cat = getAbility(typeof id === "string" ? id : null);
      return cat ? { label: "Power", value: cat.name } : null;
    }
  }
}

/**
 * Build the "power" facts for an entity's `abilities` array. Facts that share a
 * label are folded into one (values joined) so the article infobox — which keys
 * its rows by label — never sees a duplicate key and the card stays compact.
 */
function abilityFacts(abilities: unknown): Fact[] {
  if (!Array.isArray(abilities)) return [];
  const order: string[] = [];
  const byLabel = new Map<string, string[]>();
  for (const ability of abilities) {
    const phrase = abilityPhrase(ability);
    if (phrase == null) continue;
    if (!byLabel.has(phrase.label)) {
      byLabel.set(phrase.label, []);
      order.push(phrase.label);
    }
    byLabel.get(phrase.label)!.push(phrase.value);
  }
  return order.map((label) => ({ label, value: byLabel.get(label)!.join(", "), tone: "power" as const }));
}

/**
 * Return 2–4 key facts for the given concept/entity pair.
 *
 * Never throws. Returns [] when entity is null or concept is unrecognised.
 * Each fact is only included when its source field is present (not null/undefined).
 */
export function infoboxFacts(conceptId: string, key: string, e: Rec): Fact[] {
  if (!e) return [];

  const f: Fact[] = [];

  const add = (label: string, v: unknown, tone?: FactTone): void => {
    if (v !== undefined && v !== null) {
      f.push({ label, value: str(v), ...(tone ? { tone } : {}) });
    }
  };

  switch (conceptId) {
    case "tiles": {
      // Powers ("attributes") lead, then descriptive metadata. "Kind" is
      // intentionally omitted here — every entry on the Tiles page is a tile.
      // Fields: abilities, biome, category/type, tier, next (produced), value
      f.push(...abilityFacts(e["abilities"]));
      add("Biome", e["biome"]);
      add("Category", e["category"]);
      if (e["tier"] != null) {
        add("Tier", e["tier"]);
      }
      if (e["next"] != null) {
        add("Produces", e["next"]);
      }
      add("Value", e["value"]);
      break;
    }

    case "categories": {
      add("Key", key);
      const sub = e["subCategory"];
      if (sub != null) add("Group", sub);
      break;
    }

    case "resources": {
      // Fields: kind, biome, value (coin sell value)
      add("Kind", e["kind"]);
      add("Biome", e["biome"]);
      add("Value", e["value"]);
      break;
    }

    case "tools": {
      // Fields: kind, desc, power (object with id)
      add("Kind", e["kind"]);
      // Extract power.id from the nested power object
      const power = e["power"];
      if (power != null && typeof power === "object") {
        const powerId = (power as Record<string, unknown>)["id"];
        if (powerId != null) add("Power", powerId);
      }
      add("Description", e["desc"]);
      break;
    }

    case "recipes": {
      // Output + a simplified ingredient list lead; station / tier follow.
      // Fields: item (output), inputs (ingredients), station, tier (optional)
      if (e["item"] != null) add("Output", itemLabel(e["item"]), "craft");
      const inputs = e["inputs"];
      if (inputs != null && typeof inputs === "object") {
        const parts = Object.entries(inputs as Record<string, unknown>).map(
          ([k, v]) => `${str(v)} ${itemLabel(k)}`,
        );
        if (parts.length > 0) add("Ingredients", parts.join(", "), "ingredient");
      }
      add("Station", e["station"]);
      if (e["tier"] != null) add("Tier", e["tier"]);
      break;
    }

    case "buildings": {
      // Powers ("attributes") lead — ability effects, then tiles unlocked, then
      // a simplified "Crafts" list for crafting-station buildings — followed by
      // level and cost. Fields: abilities, unlocked tiles, station, lv, cost
      f.push(...abilityFacts(e["abilities"]));
      const unlocks = buildingUnlocksValue(key);
      if (unlocks != null) add("Unlocks", unlocks, "unlock");
      const crafts = buildingCraftsValue(key);
      if (crafts != null) add("Crafts", crafts, "craft");
      add("Level", e["lv"]);
      // Summarise cost as a short string
      const cost = e["cost"];
      if (cost != null && typeof cost === "object") {
        const costEntries = Object.entries(cost as Record<string, number>);
        if (costEntries.length > 0) {
          const summary = costEntries
            .map(([k, v]) => `${v} ${k}`)
            .join(", ");
          add("Cost", summary);
        }
      }
      break;
    }

    case "zones": {
      const boards = e["boards"];
      if (boards != null && typeof boards === "object") {
        const enabled = Object.keys(boards as Record<string, unknown>).filter(Boolean);
        if (enabled.length > 0) add("Boards", enabled.join(", "));
      }
      const entryCost = e["entryCost"];
      if (entryCost != null && typeof entryCost === "object") {
        const coins = (entryCost as Record<string, unknown>)["coins"];
        const coinNum = typeof coins === "number" ? coins : null;
        add("Entry cost", coinNum != null && coinNum > 0 ? `${coinNum} coins` : "Free");
      } else {
        add("Entry cost", "Free");
      }
      // Zone Tier Ladder — surface the settlement-tier rungs for tiered zones.
      const tiers = e["tiers"];
      if (Array.isArray(tiers) && tiers.length > 0) {
        const names = tiers.map((t) => (t as { name?: string })?.name).filter(Boolean);
        const plots = tiers.map((t) => (t as { plots?: number })?.plots).filter((p) => p != null);
        if (names.length > 0) add("Tiers", names.join(" → "));
        if (plots.length > 0) add("Plots by tier", plots.join(" → "));
      }
      break;
    }

    case "workers": {
      // Ability ("attribute") leads — what the worker actually does — then the
      // descriptive metadata. Fields: abilities, role, maxCount, hireCost.coins
      f.push(...abilityFacts(e["abilities"]));
      add("Role", e["role"]);
      add("Max count", e["maxCount"]);
      const hireCost = e["hireCost"];
      if (hireCost != null && typeof hireCost === "object") {
        const coins = (hireCost as Record<string, unknown>)["coins"];
        if (coins != null) add("Hire cost", `${coins} coins`);
      }
      break;
    }

    case "bosses": {
      // Fields: season, target (object with resource), modifier (object with type)
      add("Season", e["season"]);
      const target = e["target"];
      if (target != null && typeof target === "object") {
        const resource = (target as Record<string, unknown>)["resource"];
        const amount = (target as Record<string, unknown>)["amount"];
        if (resource != null) {
          add("Target", amount != null ? `${amount}× ${resource}` : String(resource));
        }
      }
      break;
    }

    case "abilities": {
      // Fields: trigger, channel, scope (array)
      add("Trigger", e["trigger"]);
      add("Channel", e["channel"]);
      const scope = e["scope"];
      if (Array.isArray(scope)) {
        add("Scope", (scope as string[]).join(", "));
      }
      break;
    }

    case "toolPowers": {
      // Fields: isTapTarget (boolean), desc
      const isTapTarget = e["isTapTarget"];
      if (isTapTarget !== undefined && isTapTarget !== null) {
        add("Tap target?", isTapTarget ? "Yes" : "No");
      }
      add("Description", e["desc"]);
      break;
    }

    case "hazards": {
      // Fields: weight (spawn weight, mine only), durationTurns (optional).
      // Biome is derived: mine hazards live in HAZARDS, the rest are farm.
      add("Biome", MINE_HAZARD_IDS.has(key) ? "mine" : "farm");
      add("Spawn weight", e["weight"]);
      if (e["durationTurns"] != null) add("Duration", `${e["durationTurns"]} turns`);
      break;
    }

    case "boardKinds": {
      const tiles = e["tiles"];
      if (Array.isArray(tiles)) add("Tile species", tiles.length);
      const resources = e["resources"];
      if (Array.isArray(resources)) add("Resources", resources.length);
      break;
    }

    case "dailyRewards": {
      // Entity shape: { day, coins?, runes?, tool?, amount?, unlockTile? }
      const coins = e["coins"];
      const runes = e["runes"];
      const tool = e["tool"];
      const amount = e["amount"];
      const unlockTile = e["unlockTile"];
      if (coins != null && Number(coins) > 0) add("Coins", `+${coins}`);
      if (runes != null && Number(runes) > 0) add("Runes", `+${runes}`);
      if (tool != null) {
        const toolLabel = tool === "rare" ? "Rare tool" : tool === "basic" ? "Basic tool" : String(tool);
        add("Tool", amount != null && Number(amount) > 1 ? `${amount}× ${toolLabel}` : toolLabel);
      }
      if (unlockTile != null) add("Unlocks", String(unlockTile).replace(/^tile_/, "").replace(/_/g, " "));
      break;
    }

    case "keepers": {
      // Entity shape: { id, name, title, look: { icon }, appearsAfterBuildings, coexist, driveout }
      add("Title", e["title"]);
      const coexist = e["coexist"] as Record<string, unknown> | undefined;
      if (coexist?.["embers"] != null) add("Coexist", `${coexist["embers"]} Embers`);
      const driveout = e["driveout"] as Record<string, unknown> | undefined;
      if (driveout?.["coreIngots"] != null) add("Drive out", `${driveout["coreIngots"]} Ingots`);
      break;
    }

    case "boons": {
      // Entity shape: { id, name, desc, cost: { embers?, coreIngots? }, effect: { type, params } }
      add("Description", e["desc"]);
      const cost = e["cost"] as Record<string, unknown> | undefined;
      if (cost?.["embers"] != null) add("Cost", `${cost["embers"]} Embers`);
      else if (cost?.["coreIngots"] != null) add("Cost", `${cost["coreIngots"]} Ingots`);
      break;
    }

    default:
      // Unrecognised concept — return empty (no guessing).
      break;
  }

  return f;
}
