import { describe, it, expect } from "vitest";
import { upgradeCountForChain } from "../utils.js";

describe("1.1 — per-resource upgrade thresholds", () => {
  it("5 hay → no upgrade", () => expect(upgradeCountForChain(5, "grass_hay")).toBe(0));
  it("6 hay → 1 upgrade", () => expect(upgradeCountForChain(6, "grass_hay")).toBe(1));
  it("12 hay → 2 upgrades", () => expect(upgradeCountForChain(12, "grass_hay")).toBe(2));
  it("18 hay → 3 upgrades", () => expect(upgradeCountForChain(18, "grass_hay")).toBe(3));
  it("grain threshold is 4", () => expect(upgradeCountForChain(4, "grain")).toBe(1));
  // Birds → Eggs chain wiring (catalog §4: 6 birds → 1 eggs).
  // Egg was terminal pre-catalog; now it's a chain tile producing the eggs product.
  it("5 egg → no upgrade (below threshold)", () => expect(upgradeCountForChain(5, "bird_egg")).toBe(0));
  it("6 egg → 1 eggs upgrade", () => expect(upgradeCountForChain(6, "bird_egg")).toBe(1));
  it("wheat threshold is 5, not 4", () => expect(upgradeCountForChain(4, "grain_wheat")).toBe(0));
  it("5 wheat → 1 upgrade", () => expect(upgradeCountForChain(5, "grain_wheat")).toBe(1));
});
