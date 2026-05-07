import { describe, it, expect, beforeEach } from "vitest";
import { BOND_BANDS, NPC_DATA } from "../features/npcs/data.js";
import { bondBand, bondModifier, gainBond, decayBond, payOrder } from "../features/npcs/bond.js";
import { createInitialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("6.1 — Bond data (BOND_BANDS, NPC_DATA)", () => {
  it("BOND_BANDS has 4 entries", () => {
    expect(BOND_BANDS.length).toBe(4);
  });

  it("NPC_DATA has correct favoriteGift per §14", () => {
    expect(NPC_DATA.mira.favoriteGift).toBe("grain_flour");
    expect(NPC_DATA.tomas.favoriteGift).toBe("berry_jam");
    expect(NPC_DATA.bram.favoriteGift).toBe("mine_ingot");
    expect(NPC_DATA.liss.favoriteGift).toBe("berry_jam");
    expect(NPC_DATA.wren.favoriteGift).toBe("wood_plank");
  });
});

describe("6.1 — createInitialState npcs.bonds", () => {
  it("all 5 NPCs start at bond 5 (Warm, ×1.00)", () => {
    const fresh = createInitialState();
    for (const id of ["wren", "mira", "tomas", "bram", "liss"]) {
      expect(fresh.npcs.bonds[id]).toBe(5);
      expect(bondBand(fresh.npcs.bonds[id]).name).toBe("Warm");
      expect(bondModifier(fresh.npcs.bonds[id])).toBe(1.00);
    }
  });
});

describe("6.1 — bondModifier locked band table (§14)", () => {
  it("bond 1–4 = Sour ×0.70", () => {
    expect(bondModifier(1)).toBe(0.70);
    expect(bondModifier(4)).toBe(0.70);
  });
  it("bond 5–6 = Warm ×1.00", () => {
    expect(bondModifier(5)).toBe(1.00);
    expect(bondModifier(6)).toBe(1.00);
  });
  it("bond 7–8 = Liked ×1.15", () => {
    expect(bondModifier(7)).toBe(1.15);
    expect(bondModifier(8)).toBe(1.15);
  });
  it("bond 9–10 = Beloved ×1.25", () => {
    expect(bondModifier(9)).toBe(1.25);
    expect(bondModifier(10)).toBe(1.25);
  });
});

describe("6.1 — bondBand name routing", () => {
  it("bond 3 → Sour", () => expect(bondBand(3).name).toBe("Sour"));
  it("bond 7 → Liked", () => expect(bondBand(7).name).toBe("Liked"));
  it("bond 10 → Beloved", () => expect(bondBand(10).name).toBe("Beloved"));
});

describe("6.1 — payOrder rounding", () => {
  it("Warm 100 → 100", () => expect(payOrder({ baseReward: 100 }, 5)).toBe(100));
  it("Liked 100 → 115", () => expect(payOrder({ baseReward: 100 }, 7)).toBe(115));
  it("Beloved 100 → 125", () => expect(payOrder({ baseReward: 100 }, 10)).toBe(125));
  it("rounding follows Math.round (117 × 1.25 = 146.25 → 146)", () => {
    expect(payOrder({ baseReward: 117 }, 9)).toBe(Math.round(117 * 1.25));
  });
});

describe("6.1 — gainBond", () => {
  it("delivery +0.3 from 5 → 5.3", () => {
    expect(Math.abs(gainBond(5, 0.3) - 5.3)).toBeLessThan(1e-9);
  });
  it("clamps to 10", () => expect(gainBond(9.9, 0.5)).toBe(10));
  it("clamps to 0", () => expect(gainBond(0.05, -1)).toBe(0));
});

describe("6.1 — decayBond (§14)", () => {
  it("decay 7 → 6.9", () => {
    expect(Math.abs(decayBond(7) - 6.9)).toBeLessThan(1e-9);
  });
  it("decay 5.1 → 5 (floor)", () => {
    expect(Math.abs(decayBond(5.1) - 5)).toBeLessThan(1e-9);
  });
  it("decay does NOT fire at exactly 5", () => expect(decayBond(5)).toBe(5));
  it("decay does NOT fire at 4 (Sour stays Sour)", () => expect(decayBond(4)).toBe(4));
  it("decay does NOT fire at 1", () => expect(decayBond(1)).toBe(1));
});
