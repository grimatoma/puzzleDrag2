import { describe, it, expect } from "vitest";
import { LONG_CHAIN_BONUSES, longChainBonusFor } from "../features/tileCollection/longChainBonus.js";

describe("longChainBonusFor", () => {
  it("returns null for unknown resource", () => {
    expect(longChainBonusFor("no_such", 99)).toBeNull();
  });

  it("returns null when chain length is below threshold", () => {
    expect(longChainBonusFor("tile_grain_buckwheat", 11)).toBeNull();
  });

  it("returns the bonus shape at threshold", () => {
    const r = longChainBonusFor("tile_grain_buckwheat", 12);
    expect(r).toEqual({ bonusKey: "tile_herd_pig", amount: 1 });
  });

  it("returns the bonus shape above threshold", () => {
    const r = longChainBonusFor("tile_grain_buckwheat", 50);
    expect(r).toEqual({ bonusKey: "tile_herd_pig", amount: 1 });
  });

  it("Eggplant → tile_veg_carrot at chain 12", () => {
    const r = longChainBonusFor("tile_veg_eggplant", 12);
    expect(r.bonusKey).toBe("tile_veg_carrot");
  });

  it("Goose → tile_veg_carrot at chain 12", () => {
    const r = longChainBonusFor("tile_bird_goose", 12);
    expect(r.bonusKey).toBe("tile_veg_carrot");
  });

  it("Willow → tile_veg_carrot at chain 12", () => {
    const r = longChainBonusFor("tile_tree_willow", 12);
    expect(r.bonusKey).toBe("tile_veg_carrot");
  });

  it("Broccoli → tile_flower_pansy at chain 12", () => {
    const r = longChainBonusFor("tile_veg_broccoli", 12);
    expect(r.bonusKey).toBe("tile_flower_pansy");
  });

  it("Warthog → tile_mount_horse at chain 12", () => {
    const r = longChainBonusFor("tile_herd_warthog", 12);
    expect(r.bonusKey).toBe("tile_mount_horse");
  });

  it("LONG_CHAIN_BONUSES is frozen", () => {
    expect(Object.isFrozen(LONG_CHAIN_BONUSES)).toBe(true);
  });
});
