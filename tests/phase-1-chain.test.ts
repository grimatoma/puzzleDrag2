// Phase 1 — Chain model: per-resource upgrade thresholds.
// Migrated from runSelfTests() 1.1 assertions and upgrade-thresholds.test.js.
import { describe, it, expect } from "vitest";
import { upgradeCountForChain } from "../src/utils.js";

describe("Phase 1 — per-resource upgrade thresholds", () => {
  it("5 hay → no upgrade", () => expect(upgradeCountForChain(5, "tile_grass_grass")).toBe(0));
  it("6 hay → 1 upgrade", () => expect(upgradeCountForChain(6, "tile_grass_grass")).toBe(1));
  it("12 hay → 2 upgrades", () => expect(upgradeCountForChain(12, "tile_grass_grass")).toBe(2));
  it("18 hay → 3 upgrades", () => expect(upgradeCountForChain(18, "tile_grass_grass")).toBe(3));
  // Birds → Eggs chain (catalog §4: 6 birds → 1 eggs).
  it("5 chicken → no upgrade", () => expect(upgradeCountForChain(5, "tile_bird_chicken")).toBe(0));
  it("6 chicken → 1 eggs upgrade", () => expect(upgradeCountForChain(6, "tile_bird_chicken")).toBe(1));
  it("wheat threshold is 5, not 4", () => expect(upgradeCountForChain(4, "tile_grain_wheat")).toBe(0));
  it("5 wheat → 1 upgrade", () => expect(upgradeCountForChain(5, "tile_grain_wheat")).toBe(1));
  it("oak threshold is 6", () => expect(upgradeCountForChain(6, "tile_tree_oak")).toBe(1));
  it("iron ore threshold is 6", () => expect(upgradeCountForChain(6, "tile_mine_iron_ore")).toBe(1));
  it("copper ore threshold is 6", () => expect(upgradeCountForChain(6, "tile_mine_copper_ore")).toBe(1));
});
