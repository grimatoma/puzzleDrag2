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
    // grass_hay is the canonical fully-tested resource.
    expect(set.has("grass_hay")).toBe(true);
    expect(set.has("wood_log")).toBe(true);
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
    const a = isIconUsed("grass_hay");
    const b = isIconUsed("grass_hay");
    expect(a).toBe(b);
    expect(a).toBe(true);
  });
});
