/**
 * infoboxFacts.ts — Per-concept "key facts" selector for the wiki article infobox.
 *
 * Returns a small set (2–4) of the most meaningful facts for a given entity,
 * read directly from the live entity object. All field names are verified against
 * the real source maps (ITEMS, RECIPES, BUILDINGS, ZONES, BOSSES, TYPE_WORKERS,
 * ABILITIES, TOOL_POWERS).
 *
 * Field reference (verified):
 *   tiles     — kind, biome, value, next
 *   resources — kind, biome, value
 *   tools     — kind, desc, power.id (nested)
 *   recipes   — station, item, tier
 *   buildings — lv, cost (object)
 *   zones     — baseTurns, entryCost (object with coins?)
 *   workers   — role, maxCount, hireCost.coins
 *   bosses    — season, target.resource (nested), modifier.type (nested)
 *   abilities — trigger, channel, scope (array)
 *   toolPowers — isTapTarget (boolean), desc
 */

// Pure module — no React/DOM imports.

import { TILE_TYPES_MAP } from "../../features/tileCollection/data.js";

type Rec = Record<string, unknown> | null;

export interface Fact {
  label: string;
  value: string;
  /** Optional icon key to render alongside the fact value. */
  iconKey?: string;
}

/** Coerce a value to a display string. Objects are JSON-stringified. */
const str = (v: unknown): string => {
  if (v == null) return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/**
 * Return 2–4 key facts for the given concept/entity pair.
 *
 * Never throws. Returns [] when entity is null or concept is unrecognised.
 * Each fact is only included when its source field is present (not null/undefined).
 */
export function infoboxFacts(conceptId: string, key: string, e: Rec): Fact[] {
  if (!e) return [];

  const f: Fact[] = [];

  const add = (label: string, v: unknown): void => {
    if (v !== undefined && v !== null) {
      f.push({ label, value: str(v) });
    }
  };

  switch (conceptId) {
    case "tiles": {
      // Fields: kind, biome, value (tile weight), next (resource produced)
      add("Kind", e["kind"]);
      add("Biome", e["biome"]);
      const tt = (TILE_TYPES_MAP as Record<string, { category?: string }>)[key];
      if (tt?.category) add("Category", tt.category);
      if (e["next"] != null) {
        add("Produces", e["next"]);
      }
      add("Value", e["value"]);
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
      // Fields: station, item (output), tier (optional)
      add("Station", e["station"]);
      add("Output", e["item"]);
      if (e["tier"] != null) add("Tier", e["tier"]);
      break;
    }

    case "buildings": {
      // Fields: lv (level), cost (object), name
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
      // Fields: baseTurns (number), entryCost (object with coins)
      add("Base turns", e["baseTurns"]);
      const entryCost = e["entryCost"];
      if (entryCost != null && typeof entryCost === "object") {
        const coins = (entryCost as Record<string, unknown>)["coins"];
        const coinNum = typeof coins === "number" ? coins : null;
        add("Entry cost", coinNum != null && coinNum > 0 ? `${coinNum} coins` : "Free");
      } else {
        add("Entry cost", "Free");
      }
      break;
    }

    case "workers": {
      // Fields: role, maxCount, hireCost.coins
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
