// Phase 6 — Balance Manager override functions for the new config sections.
import { describe, it, expect } from "vitest";
import { applyExpeditionOverrides, applyBiomeOverrides, sanitizeTuning } from "../config/applyOverrides.js";

describe("applyExpeditionOverrides", () => {
  it("merges foodTurns (tune + add) and replaces meatFoods wholesale", () => {
    const ft = { bread: 1, apple: 1 };
    const mf = ["cured_meat"];
    applyExpeditionOverrides(ft, mf, { foodTurns: { bread: 5, newfood: 3 }, meatFoods: ["ham", "stew"] });
    expect(ft.bread).toBe(5);
    expect(ft.apple).toBe(1);     // untouched
    expect(ft.newfood).toBe(3);   // added
    expect(mf).toEqual(["ham", "stew"]);
  });
  it("rejects bad values and a missing override object", () => {
    const ft = { bread: 1 };
    applyExpeditionOverrides(ft, [], { foodTurns: { bad: -1, "": 2, frac: 2.7 } });
    expect(ft.bad).toBeUndefined();
    expect(ft[""]).toBeUndefined();
    expect(ft.frac).toBe(2);      // floored
    const before = JSON.stringify(ft);
    applyExpeditionOverrides(ft, [], undefined);
    expect(JSON.stringify(ft)).toBe(before);
  });
});

describe("applyBiomeOverrides", () => {
  it("patches a matched biome in place; ignores unknown type / biome", () => {
    const biomes = {
      farm: [{ id: "prairie", name: "Prairie", icon: "🌾", hazards: ["fire", "locusts"], bonus: "grain yield" }],
      mine: [{ id: "mountain", name: "Mountain", icon: "🏔️", hazards: ["cave_in", "gas_pocket"], bonus: "iron" }],
    };
    applyBiomeOverrides(biomes, {
      farm: { prairie: { name: "Sunfield", icon: "☀️", hazards: ["drought", "locusts"], bonus: "wheat" }, nope: { name: "x" } },
      harbor: { coastal: { name: "x" } }, // no harbor list → ignored
    });
    expect(biomes.farm[0].name).toBe("Sunfield");
    expect(biomes.farm[0].icon).toBe("☀️");
    expect(biomes.farm[0].hazards).toEqual(["drought", "locusts"]);
    expect(biomes.farm[0].bonus).toBe("wheat");
    expect(biomes.mine[0].name).toBe("Mountain"); // untouched
    const before = JSON.stringify(biomes);
    applyBiomeOverrides(biomes, undefined);
    expect(JSON.stringify(biomes)).toBe(before);
  });
});

describe("sanitizeTuning", () => {
  it("keeps only valid keys, floors integers, allows craftGemSkipCost 0", () => {
    expect(sanitizeTuning({
      maxTurns: 14, auditBossCooldownDays: 5.9, craftQueueHours: 6, craftGemSkipCost: 0,
      minExpeditionTurns: 4, foundingBaseCoins: 500, foundingGrowth: 1.6, homeBiome: "marsh",
    })).toEqual({
      maxTurns: 14, auditBossCooldownDays: 5, craftQueueHours: 6, craftGemSkipCost: 0,
      minExpeditionTurns: 4, foundingBaseCoins: 500, foundingGrowth: 1.6, homeBiome: "marsh",
    });
  });
  it("drops invalid values and a non-object input", () => {
    expect(sanitizeTuning({ maxTurns: 0, auditBossCooldownDays: -1, foundingGrowth: 0, homeBiome: "", craftGemSkipCost: "x" })).toEqual({});
    expect(sanitizeTuning(undefined)).toEqual({});
    expect(sanitizeTuning("nope")).toEqual({});
  });
});
