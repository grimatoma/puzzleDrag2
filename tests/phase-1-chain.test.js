// Phase 1 — Chain model: per-resource upgrade thresholds and resource gain.
// Migrated from runSelfTests() 1.1 assertions and upgrade-thresholds.test.js.
import { describe, it, expect } from "vitest";
import { upgradeCountForChain, resourceGainForChain } from "../src/utils.js";

describe("Phase 1 — per-resource upgrade thresholds", () => {
  it("5 hay → no upgrade", () => expect(upgradeCountForChain(5, "grass_hay")).toBe(0));
  it("6 hay → 1 upgrade", () => expect(upgradeCountForChain(6, "grass_hay")).toBe(1));
  it("12 hay → 2 upgrades", () => expect(upgradeCountForChain(12, "grass_hay")).toBe(2));
  it("18 hay → 3 upgrades", () => expect(upgradeCountForChain(18, "grass_hay")).toBe(3));
  it("grain threshold is 4", () => expect(upgradeCountForChain(4, "grain")).toBe(1));
  // Birds → Eggs chain (catalog §4: 6 birds → 1 eggs).
  it("5 egg → no upgrade", () => expect(upgradeCountForChain(5, "bird_egg")).toBe(0));
  it("6 egg → 1 eggs upgrade", () => expect(upgradeCountForChain(6, "bird_egg")).toBe(1));
  it("wheat threshold is 5, not 4", () => expect(upgradeCountForChain(4, "grain_wheat")).toBe(0));
  it("5 wheat → 1 upgrade", () => expect(upgradeCountForChain(5, "grain_wheat")).toBe(1));
  it("log threshold is 5", () => expect(upgradeCountForChain(5, "wood_log")).toBe(1));
  it("ore threshold is 6", () => expect(upgradeCountForChain(6, "ore")).toBe(1));
});

describe("Phase 1 — resource gain formula", () => {
  it("chain 3 → gain 3", () => expect(resourceGainForChain(3)).toBe(3));
  it("chain 5 → gain 5", () => expect(resourceGainForChain(5)).toBe(5));
  it("chain 6 → double gain (12)", () => expect(resourceGainForChain(6)).toBe(12));
  it("chain 7 → double gain (14)", () => expect(resourceGainForChain(7)).toBe(14));
});
