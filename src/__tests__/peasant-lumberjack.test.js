import { describe, it, expect } from "vitest";
import { createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Peasant + Lumberjack workers", () => {
  it("registers peasant and lumberjack", () => {
    expect(APPRENTICES.find((a) => a.id === "peasant")).toBeDefined();
    expect(APPRENTICES.find((a) => a.id === "lumberjack")).toBeDefined();
  });

  it("Peasant bonus_yield on grass_hay (max 3)", () => {
    const w = APPRENTICES.find((a) => a.id === "peasant");
    expect(w.effect).toEqual({ type: "bonus_yield", key: "grass_hay", amount: 1 });
    expect(w.maxCount).toBe(3);
  });

  it("Lumberjack bonus_yield on tree_oak (max 2)", () => {
    const w = APPRENTICES.find((a) => a.id === "lumberjack");
    expect(w.effect).toEqual({ type: "bonus_yield", key: "tree_oak", amount: 1 });
    expect(w.maxCount).toBe(2);
  });

  it("max-hire Peasant: bonusYield.grass_hay = 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { peasant: 3 }, debt: 0, pool: 3 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.grass_hay).toBe(1);
  });

  it("max-hire Lumberjack: bonusYield.tree_oak = 1", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { lumberjack: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.bonusYield.tree_oak).toBe(1);
  });

  it("Peasant has a granary requirement (mirrors Hilda)", () => {
    const w = APPRENTICES.find((a) => a.id === "peasant");
    expect(w.requirement?.building).toBe("granary");
  });

  it("Lumberjack has inn-or-level-4 requirement", () => {
    const w = APPRENTICES.find((a) => a.id === "lumberjack");
    expect(w.requirement?.building).toBe("inn");
    expect(w.requirement?.orLevel).toBe(4);
  });
});
