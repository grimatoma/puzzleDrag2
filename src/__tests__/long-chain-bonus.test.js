import { describe, it, expect } from "vitest";
import { LONG_CHAIN_BONUSES, longChainBonusFor } from "../features/tileCollection/longChainBonus.js";

describe("longChainBonusFor", () => {
  it("returns null for unknown resource", () => {
    expect(longChainBonusFor("no_such", 99)).toBeNull();
  });

  it("returns null when chain length is below threshold", () => {
    expect(longChainBonusFor("grain_buckwheat", 11)).toBeNull();
  });

  it("returns the bonus shape at threshold", () => {
    const r = longChainBonusFor("grain_buckwheat", 12);
    expect(r).toEqual({ bonusKey: "herd_pig", amount: 1 });
  });

  it("returns the bonus shape above threshold", () => {
    const r = longChainBonusFor("grain_buckwheat", 50);
    expect(r).toEqual({ bonusKey: "herd_pig", amount: 1 });
  });

  it("Eggplant → veg_carrot at chain 12", () => {
    const r = longChainBonusFor("veg_eggplant", 12);
    expect(r.bonusKey).toBe("veg_carrot");
  });

  it("Goose → veg_carrot at chain 12", () => {
    const r = longChainBonusFor("bird_goose", 12);
    expect(r.bonusKey).toBe("veg_carrot");
  });

  it("Willow → veg_carrot at chain 12", () => {
    const r = longChainBonusFor("tree_willow", 12);
    expect(r.bonusKey).toBe("veg_carrot");
  });

  it("Broccoli → flower_pansy at chain 12", () => {
    const r = longChainBonusFor("veg_broccoli", 12);
    expect(r.bonusKey).toBe("flower_pansy");
  });

  it("Warthog → mount_horse at chain 12", () => {
    const r = longChainBonusFor("herd_warthog", 12);
    expect(r.bonusKey).toBe("mount_horse");
  });

  it("LONG_CHAIN_BONUSES is frozen", () => {
    expect(Object.isFrozen(LONG_CHAIN_BONUSES)).toBe(true);
  });
});
