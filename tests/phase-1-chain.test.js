// Phase 1 — Chain model: per-resource upgrade thresholds and resource gain.
// Migrated from runSelfTests() 1.1 assertions and upgrade-thresholds.test.js.
import { describe, it, expect } from "vitest";
import { upgradeCountForChain, resourceGainForChain } from "../src/utils.js";

describe("Phase 1 — per-resource upgrade thresholds", () => {
  it("5 hay → no upgrade", () => expect(upgradeCountForChain(5, "hay")).toBe(0));
  it("6 hay → 1 upgrade", () => expect(upgradeCountForChain(6, "hay")).toBe(1));
  it("12 hay → 2 upgrades", () => expect(upgradeCountForChain(12, "hay")).toBe(2));
  it("18 hay → 3 upgrades", () => expect(upgradeCountForChain(18, "hay")).toBe(3));
  it("grain threshold is 4", () => expect(upgradeCountForChain(4, "grain")).toBe(1));
  it("egg is terminal — no upgrade at 5", () => expect(upgradeCountForChain(5, "egg")).toBe(0));
  it("egg terminal regardless of length (6)", () => expect(upgradeCountForChain(6, "egg")).toBe(0));
  it("wheat threshold is 5, not 4", () => expect(upgradeCountForChain(4, "wheat")).toBe(0));
  it("5 wheat → 1 upgrade", () => expect(upgradeCountForChain(5, "wheat")).toBe(1));
  it("log threshold is 5", () => expect(upgradeCountForChain(5, "log")).toBe(1));
  it("ore threshold is 6", () => expect(upgradeCountForChain(6, "ore")).toBe(1));
});

describe("Phase 1 — resource gain formula", () => {
  it("chain 3 → gain 3", () => expect(resourceGainForChain(3)).toBe(3));
  it("chain 5 → gain 5", () => expect(resourceGainForChain(5)).toBe(5));
  it("chain 6 → double gain (12)", () => expect(resourceGainForChain(6)).toBe(12));
  it("chain 7 → double gain (14)", () => expect(resourceGainForChain(7)).toBe(14));
});
