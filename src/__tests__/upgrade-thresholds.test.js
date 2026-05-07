import { describe, it, expect } from "vitest";
import { upgradeCountForChain } from "../utils.js";

describe("1.1 — per-resource upgrade thresholds", () => {
  it("5 hay → no upgrade", () => expect(upgradeCountForChain(5, "hay")).toBe(0));
  it("6 hay → 1 upgrade", () => expect(upgradeCountForChain(6, "hay")).toBe(1));
  it("12 hay → 2 upgrades", () => expect(upgradeCountForChain(12, "hay")).toBe(2));
  it("18 hay → 3 upgrades", () => expect(upgradeCountForChain(18, "hay")).toBe(3));
  it("grain threshold is 4", () => expect(upgradeCountForChain(4, "grain")).toBe(1));
  it("egg is terminal — no upgrade", () => expect(upgradeCountForChain(5, "egg")).toBe(0));
  it("egg terminal regardless of length", () => expect(upgradeCountForChain(6, "egg")).toBe(0));
  it("wheat threshold is 5, not 4", () => expect(upgradeCountForChain(4, "wheat")).toBe(0));
  it("5 wheat → 1 upgrade", () => expect(upgradeCountForChain(5, "wheat")).toBe(1));
});
