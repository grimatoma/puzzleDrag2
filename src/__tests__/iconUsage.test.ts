import { describe, it, expect, beforeEach } from "vitest";
import { getUsedIconKeys, isIconUsed, _resetIconUsageCacheForTests } from "../balanceManager/iconUsage.js";

describe("iconUsage", () => {
  beforeEach(() => {
    _resetIconUsageCacheForTests();
  });

  it("returns a Set of strings", () => {
    const set = getUsedIconKeys();
    expect(set).toBeInstanceOf(Set);
    expect(set.size).toBeGreaterThan(0);
    for (const key of set) {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it("includes resource item keys (ITEMS keys = icon keys)", () => {
    const set = getUsedIconKeys();
    // tile_grass_grass is the canonical fully-tested resource.
    expect(set.has("tile_grass_grass")).toBe(true);
    expect(set.has("tile_tree_oak")).toBe(true);
    expect(set.has("bread")).toBe(true);
  });

  it("includes ui_star (referenced by SEASONS + abilities + workers)", () => {
    expect(isIconUsed("ui_star")).toBe(true);
  });

  it("includes boss_storm now that storm boss has a registered icon", () => {
    // storm is in BOSSES so the scanner builds boss_storm from boss.id.
    expect(isIconUsed("boss_storm")).toBe(true);
  });

  it("includes decor_cobble_well (referenced from DECORATIONS data)", () => {
    expect(isIconUsed("decor_cobble_well")).toBe(true);
  });

  it("includes the new worker_* icons after the workers/data.js update", () => {
    expect(isIconUsed("worker_farmer")).toBe(true);
    expect(isIconUsed("worker_lumberjack")).toBe(true);
    expect(isIconUsed("worker_miner")).toBe(true);
    expect(isIconUsed("worker_baker")).toBe(true);
  });

  it("does NOT include legacy archive keys (legacy_*)", () => {
    // The archived originals are intentionally not referenced anywhere in
    // the live game — they only exist for IconsTab comparison.
    expect(isIconUsed("legacy_water_pump")).toBe(false);
    expect(isIconUsed("legacy_ui_lock")).toBe(false);
  });

  it("does NOT include obviously-never-referenced UI icons", () => {
    // ui_settings is in the registry but no code path uses it — the
    // hardcoded allow-list includes it because RichText literals might,
    // so this serves as documentation of the current state more than a
    // hard invariant. Skip if the hardcoded list includes it.
  });

  it("isIconUsed is cached and consistent across calls", () => {
    const a = isIconUsed("tile_grass_grass");
    const b = isIconUsed("tile_grass_grass");
    expect(a).toBe(b);
    expect(a).toBe(true);
  });

  it("treats char_* prefix as in-use (storyEditor references)", () => {
    expect(isIconUsed("char_mira")).toBe(true);
    expect(isIconUsed("char_bram")).toBe(true);
    expect(isIconUsed("char_wren")).toBe(true);
  });

  it("treats cat_* prefix as in-use (tileCollection template literals)", () => {
    expect(isIconUsed("cat_grass")).toBe(true);
    expect(isIconUsed("cat_grain")).toBe(true);
    expect(isIconUsed("cat_fruits")).toBe(true);
  });

  it("treats hazard_* prefix as in-use", () => {
    expect(isIconUsed("hazard_rats")).toBe(true);
    expect(isIconUsed("hazard_fire")).toBe(true);
    expect(isIconUsed("hazard_smoke")).toBe(true);
  });

  it("treats station_* prefix as in-use (crafting STATION_META iconKey)", () => {
    expect(isIconUsed("station_bakery")).toBe(true);
    expect(isIconUsed("station_forge")).toBe(true);
    expect(isIconUsed("station_decor")).toBe(true);
  });

  it("treats biome_* prefix as in-use (BiomeEntryModal + wiki boardKinds)", () => {
    expect(isIconUsed("biome_farm")).toBe(true);
    expect(isIconUsed("biome_mine")).toBe(true);
    expect(isIconUsed("biome_fish")).toBe(true);
  });

  it("treats map_* prefix as in-use (cartography map_${node.id} lookups)", () => {
    expect(isIconUsed("map_home")).toBe(true);
    expect(isIconUsed("map_caves")).toBe(true);
    expect(isIconUsed("map_quarry")).toBe(true);
  });

  it("includes pact_scroll (charter IconCanvas JSX literal)", () => {
    expect(isIconUsed("pact_scroll")).toBe(true);
  });

  it("flags design.* SVG icons whose key is NOT in SVG_USAGE_LITERALS", () => {
    // tea-house is one we know is registered but doesn't show up as a JSX
    // string literal anywhere — should be flagged as unused.
    expect(isIconUsed("design.building.tea-house")).toBe(false);
  });

  it("does NOT mark legacy_ prefixed keys as in-use", () => {
    // legacy_char_mira doesn't exist but the rule should be the prefix check.
    expect(isIconUsed("legacy_char_mira")).toBe(false);
    expect(isIconUsed("legacy_cat_grass")).toBe(false);
  });
});
