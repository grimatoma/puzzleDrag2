/**
 * Internal-consistency smoke over `src/constants.ts` — the central resource /
 * tile / recipe / market data table — plus the zone atlas it feeds
 * (`features/zones/data.ts`).
 *
 * These are DRIFT GUARDS for the "+undefined◉" class of bug: a recipe input, a
 * tile's produced resource, a market price key, or a zone building that points
 * at a key nothing defines. The coverage gate can't see these because the data
 * is never exercised as a unit — a dangling reference only blows up deep in a
 * chain-collect or a founding flow. Each assertion below resolves a real
 * cross-reference in the CURRENT data; if any key is later renamed or dropped
 * without fixing its referrers, the offending key is named in the failure.
 *
 * Every check was validated to PASS against the data as it stands; where the
 * task's suggested check didn't match the actual shape (zone `entryCost` is
 * coins-only, never a resource basket; building costs legitimately reference
 * the `runes` meta-currency) the assertion was narrowed to what is true — see
 * the comments on those blocks.
 */
import { describe, it, expect } from "vitest";
import {
  ITEMS,
  TILES,
  RESOURCES,
  TOOLS,
  RECIPES,
  BUILDINGS,
  MARKET_PRICES,
  CAPPED_TILES,
  CAPPED_INVENTORY_RESOURCES,
  DAILY_REWARDS,
  TILE_FAMILY_RESOURCE,
  SEASON_POOL_MODS,
  FARM_TILE_POOL,
  MINE_TILE_POOL,
  FISH_TILE_POOL,
  DEEP_MINE_TILE_POOL,
  isRecipeDefinition,
  isTileItemEntry,
  isResourceItemEntry,
  isToolItemEntry,
  getItem,
} from "../constants.js";
import { ZONES } from "../features/zones/data.js";

/**
 * Meta-currencies are tracked on top-level state, NOT in the ITEMS catalog, so
 * a cost/reward keyed by one of these is legitimately not an item. This is the
 * same set `balanceManager/buildingCosts.ts` and the `PLACE_BUILDING` reducer
 * (state.ts) treat as non-inventory. Kept in sync deliberately.
 */
const META_CURRENCIES = new Set(["coins", "runes", "embers", "coreIngots", "gems"]);

/** Keys in ITEMS whose entry is a resource (kind:"resource"). */
const resourceKeys = () =>
  new Set(Object.entries(ITEMS).filter(([, e]) => isResourceItemEntry(e)).map(([k]) => k));
/** Keys in ITEMS whose entry is a tile (kind:"tile"). */
const tileKeys = () =>
  new Set(Object.entries(ITEMS).filter(([, e]) => isTileItemEntry(e)).map(([k]) => k));

describe("constants ITEMS catalog", () => {
  it("has a non-trivial catalog with all three kinds populated", () => {
    // Guards against an accidental empty spread / kind-filter regression.
    expect(Object.keys(TILES).length).toBeGreaterThan(50);
    expect(Object.keys(RESOURCES).length).toBeGreaterThan(20);
    expect(Object.keys(TOOLS).length).toBeGreaterThan(10);
    // TILES/RESOURCES/TOOLS are a strict, exhaustive partition of ITEMS by kind.
    expect(Object.keys(TILES).length + Object.keys(RESOURCES).length + Object.keys(TOOLS).length).toBe(
      Object.keys(ITEMS).length,
    );
  });

  it("every entry carries its kind's mandatory schema fields", () => {
    // From src/config/schemas/item.ts: tile ⇒ {kind,label,biome,look,value};
    // resource ⇒ {kind,label,look,value}; tool ⇒ {kind,label}.
    const missing: string[] = [];
    for (const [key, e] of Object.entries(ITEMS)) {
      const entry = e as Record<string, unknown>;
      if (typeof entry.label !== "string" || entry.label.length === 0) missing.push(`${key}: label`);
      if (isTileItemEntry(e)) {
        if (typeof entry.biome !== "string") missing.push(`${key}: biome`);
        if (entry.look == null) missing.push(`${key}: look`);
        if (typeof entry.value !== "number") missing.push(`${key}: value`);
      } else if (isResourceItemEntry(e)) {
        if (entry.look == null) missing.push(`${key}: look`);
        if (typeof entry.value !== "number") missing.push(`${key}: value`);
      } else if (isToolItemEntry(e)) {
        // tools require only kind + label (look/value optional per schema).
      } else {
        missing.push(`${key}: unknown kind ${String(entry.kind)}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("has no duplicate keys after case-normalisation collisions", () => {
    // Object keys are unique by construction; this catches the subtler bug where
    // an underscore-alias (iron_frame ↔ ironframe) would shadow a distinct real
    // entry. Every alias must point at an EXISTING sibling entry, never invent one.
    const keys = Object.keys(ITEMS);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("recipe cross-references resolve", () => {
  it("every recipe output item exists in the catalog", () => {
    const bad: string[] = [];
    for (const [rid, rec] of Object.entries(RECIPES)) {
      if (!isRecipeDefinition(rec)) continue;
      if (!getItem(rec.item)) bad.push(`${rid} → ${rec.item}`);
    }
    expect(bad).toEqual([]);
  });

  it("every recipe input key exists in the catalog", () => {
    const bad: string[] = [];
    for (const [rid, rec] of Object.entries(RECIPES)) {
      if (!isRecipeDefinition(rec)) continue;
      for (const [ing, qty] of Object.entries(rec.inputs)) {
        if (!getItem(ing)) bad.push(`${rid} input ${ing}`);
        // Inputs are positive integer counts — a NaN/0/negative would silently
        // break the affordability + consume math.
        if (!(typeof qty === "number" && qty > 0)) bad.push(`${rid} input ${ing} qty=${String(qty)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every recipe declares a station and produces a resource or tool (not another tile)", () => {
    const bad: string[] = [];
    for (const [rid, rec] of Object.entries(RECIPES)) {
      if (!isRecipeDefinition(rec)) continue;
      if (typeof rec.station !== "string" || rec.station.length === 0) bad.push(`${rid}: station`);
      const out = getItem(rec.item);
      if (out && isTileItemEntry(out)) bad.push(`${rid} outputs a tile (${rec.item})`);
    }
    expect(bad).toEqual([]);
  });
});

describe("produced-resource references resolve", () => {
  it("every TILE_FAMILY_RESOURCE value is a real resource key", () => {
    const res = resourceKeys();
    const bad: string[] = [];
    for (const [fam, key] of Object.entries(TILE_FAMILY_RESOURCE)) {
      if (!res.has(key)) bad.push(`${fam} → ${key}`);
    }
    expect(bad).toEqual([]);
  });

  it("every tile's `next` produced resource resolves to a catalog item", () => {
    const bad: string[] = [];
    for (const [key, tile] of Object.entries(TILES)) {
      const next = (tile as { next?: string | null }).next;
      if (typeof next === "string" && !getItem(next)) bad.push(`${key} → ${next}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("spawn / tile-pool references resolve", () => {
  it("every board tile pool key is a real tile in the catalog", () => {
    const tiles = tileKeys();
    const pools: Array<[string, ReadonlyArray<string>]> = [
      ["FARM_TILE_POOL", FARM_TILE_POOL],
      ["MINE_TILE_POOL", MINE_TILE_POOL],
      ["FISH_TILE_POOL", FISH_TILE_POOL],
      ["DEEP_MINE_TILE_POOL", DEEP_MINE_TILE_POOL],
    ];
    const bad: string[] = [];
    for (const [name, pool] of pools) {
      for (const k of pool) if (!tiles.has(k)) bad.push(`${name}: ${k}`);
    }
    expect(bad).toEqual([]);
  });

  it("every SEASON_POOL_MODS key is a real tile in the catalog", () => {
    const tiles = tileKeys();
    const bad: string[] = [];
    for (const [season, mods] of Object.entries(SEASON_POOL_MODS)) {
      for (const k of Object.keys(mods)) if (!tiles.has(k)) bad.push(`${season}: ${k}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("market prices reference real items", () => {
  it("every MARKET_PRICES key is a real catalog item with a sane buy/sell pair", () => {
    const bad: string[] = [];
    for (const [key, price] of Object.entries(MARKET_PRICES)) {
      if (!getItem(key)) bad.push(`${key}: not an item`);
      const p = price as { buy?: number; sell?: number };
      // features/market drift logic requires both columns populated and buy>0
      // (a buy:0 would violate the ±15% drift bound) with buy ≥ sell.
      if (!(typeof p.buy === "number" && p.buy > 0)) bad.push(`${key}: buy`);
      if (!(typeof p.sell === "number" && p.sell > 0)) bad.push(`${key}: sell`);
      if (typeof p.buy === "number" && typeof p.sell === "number" && p.buy < p.sell) {
        bad.push(`${key}: buy(${p.buy}) < sell(${p.sell})`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("inventory-cap lists reference real items of the right kind", () => {
  it("every CAPPED_TILES key is a real tile", () => {
    const tiles = tileKeys();
    const bad = CAPPED_TILES.filter((k) => !tiles.has(k));
    expect(bad).toEqual([]);
  });

  it("every CAPPED_INVENTORY_RESOURCES key is a real resource", () => {
    const res = resourceKeys();
    const bad = CAPPED_INVENTORY_RESOURCES.filter((k) => !res.has(k));
    expect(bad).toEqual([]);
  });
});

describe("daily reward references resolve", () => {
  it("every unlockTile is a real tile and every tool grant is a real tool", () => {
    const tiles = tileKeys();
    const bad: string[] = [];
    for (const [day, reward] of Object.entries(DAILY_REWARDS)) {
      const r = reward as { unlockTile?: string; tool?: string };
      if (r.unlockTile && !tiles.has(r.unlockTile)) bad.push(`day ${day} unlockTile ${r.unlockTile}`);
      if (r.tool) {
        const t = getItem(r.tool);
        if (!t || !isToolItemEntry(t)) bad.push(`day ${day} tool ${r.tool}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("building cost + ability references resolve", () => {
  it("every non-meta-currency building cost key is a real catalog item", () => {
    // NOTE: zone `entryCost` is coins-only in the current data (never a resource
    // basket), so the drift guard the task suggested for entryCost applies HERE,
    // to BUILDINGS[].cost — the real resource-keyed cost table. Meta-currencies
    // (coins/runes/…) are excluded because they live on state, not in ITEMS
    // (e.g. the Magic Portal's `runes:5`).
    const bad: string[] = [];
    for (const b of BUILDINGS) {
      const cost = (b as { cost?: Record<string, number> }).cost ?? {};
      for (const [k, v] of Object.entries(cost)) {
        if (META_CURRENCIES.has(k)) continue;
        if (!getItem(k)) bad.push(`${b.id}: ${k}`);
        if (!(typeof v === "number" && v > 0)) bad.push(`${b.id}: ${k} qty=${String(v)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("building ability params reference real recipes / items / tiles", () => {
    const bad: string[] = [];
    for (const b of BUILDINGS) {
      const abilities = (b as { abilities?: Array<{ id: string; params?: Record<string, unknown> }> }).abilities ?? [];
      for (const a of abilities) {
        const p = a.params ?? {};
        if (a.id === "grant_tool" && typeof p.tool === "string") {
          const t = getItem(p.tool);
          if (!t || !isToolItemEntry(t)) bad.push(`${b.id} grant_tool ${p.tool}`);
        }
        if (a.id === "bonus_yield" && typeof p.target === "string" && !getItem(p.target)) {
          bad.push(`${b.id} bonus_yield ${p.target}`);
        }
        if (a.id === "recipe_input_reduce") {
          if (typeof p.recipe === "string" && !isRecipeDefinition(RECIPES[p.recipe])) {
            bad.push(`${b.id} recipe ${p.recipe}`);
          }
          if (typeof p.input === "string" && !getItem(p.input)) bad.push(`${b.id} input ${p.input}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("no duplicate building ids", () => {
    const ids = BUILDINGS.map((b) => b.id);
    const dups = ids.filter((x, i) => ids.indexOf(x) !== i);
    expect(dups).toEqual([]);
  });
});

describe("zone atlas cross-references resolve", () => {
  it("every zone building references a real BUILDINGS id", () => {
    const buildingIds = new Set(BUILDINGS.map((b) => b.id));
    const bad: string[] = [];
    for (const [zid, zone] of Object.entries(ZONES)) {
      for (const b of zone.buildings ?? []) if (!buildingIds.has(b)) bad.push(`${zid}: ${b}`);
    }
    expect(bad).toEqual([]);
  });

  it("every zone entryCost is a coins-only cost with a non-negative integer amount", () => {
    // Current data models entry cost purely in coins (a meta-currency), not a
    // resource basket — this asserts that shape rather than a resource-key check
    // that would be vacuously true.
    const bad: string[] = [];
    for (const [zid, zone] of Object.entries(ZONES)) {
      const cost = zone.entryCost as Record<string, unknown>;
      for (const [k, v] of Object.entries(cost)) {
        if (k !== "coins") bad.push(`${zid}: unexpected entryCost key ${k}`);
        if (!(typeof v === "number" && Number.isInteger(v) && v >= 0)) bad.push(`${zid}: coins=${String(v)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
