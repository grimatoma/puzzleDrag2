import { describe, it, expect } from "vitest";
import { parseInventory, parseZoneInventories } from "../types/inventory.js";

// Regression guard for the load-time sanitization fix: a corrupt or manually
// edited save must never load a negative (or non-finite) inventory count, which
// would corrupt crafting affordability and cap checks. We assert per-key with
// the SAME valid key at both signs so the test can't pass for the wrong reason
// (e.g. because an unknown key was dropped).
describe("parseInventory — clamps loaded counts", () => {
  it("keeps a valid positive count", () => {
    expect(parseInventory({ flour: 5 }).flour).toBe(5);
  });

  it("drops a negative count for an otherwise-valid key", () => {
    expect("flour" in parseInventory({ flour: -5 })).toBe(false);
  });

  it("drops zero, NaN, and Infinity counts", () => {
    expect("flour" in parseInventory({ flour: 0 })).toBe(false);
    expect("flour" in parseInventory({ flour: Number.NaN })).toBe(false);
    expect("flour" in parseInventory({ flour: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it("ignores keys that are not inventory keys", () => {
    const inv = parseInventory({ not_a_real_key: 5, flour: 2 });
    expect(inv.flour).toBe(2);
    expect("not_a_real_key" in inv).toBe(false);
  });

  it("clamps within per-zone buckets too", () => {
    const map = parseZoneInventories({ home: { flour: 4, plank: -10 } });
    expect(map.home.flour).toBe(4);
    expect("plank" in map.home).toBe(false);
  });
});
