// Phase 6 — Balance Manager override functions for the new config sections.
import { describe, it, expect } from "vitest";
import { applyExpeditionOverrides, applyBiomeOverrides, sanitizeTuning, applyNpcOverrides, applyStoryOverrides, applyBossOverrides, applyAchievementOverrides, applyDailyRewardOverrides } from "../config/applyOverrides.js";

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

describe("applyNpcOverrides", () => {
  it("patches gift prefs (re-deriving favoriteGift) and bond bands; ignores unknowns", () => {
    const npcData = {
      mira: { id: "mira", displayName: "Mira", loves: ["bread"], likes: ["honey"], favoriteGift: "bread" },
    };
    const bondBands = [
      { lo: 1, hi: 4, name: "Sour", modifier: 0.7 },
      { lo: 5, hi: 6, name: "Warm", modifier: 1.0 },
    ];
    applyNpcOverrides(npcData, bondBands, {
      byId: { mira: { displayName: "Mira the Baker", loves: ["cake", "bread"], likes: ["jam"] }, ghost: { loves: ["x"] } },
      bands: [{ name: "Bitter", modifier: 0.5 }, { modifier: 1.1 }],
    });
    expect(npcData.mira.displayName).toBe("Mira the Baker");
    expect(npcData.mira.loves).toEqual(["cake", "bread"]);
    expect(npcData.mira.likes).toEqual(["jam"]);
    expect(npcData.mira.favoriteGift).toBe("cake");   // re-derived
    expect(npcData.ghost).toBeUndefined();            // unknown id ignored
    expect(bondBands[0]).toMatchObject({ name: "Bitter", modifier: 0.5 });
    expect(bondBands[1]).toMatchObject({ name: "Warm", modifier: 1.1 }); // name untouched
  });
  it("is a no-op on a missing override object", () => {
    const npcData = { mira: { loves: ["bread"], favoriteGift: "bread" } };
    const before = JSON.stringify(npcData);
    applyNpcOverrides(npcData, [], undefined);
    expect(JSON.stringify(npcData)).toBe(before);
  });
});

describe("applyStoryOverrides", () => {
  it("patches title / scene / body / lines / choice labels across both lists", () => {
    const storyBeats = [{ id: "a1", title: "Old", scene: "ruin", body: "old body", choices: [{ id: "x", label: "L1", outcome: { setFlag: "f" } }] }];
    const sideBeats = [{ id: "s1", title: "Side", lines: [{ speaker: "wren", text: "hi" }] }];
    applyStoryOverrides(storyBeats, sideBeats, {
      beats: {
        a1: { title: "New", scene: "dawn", body: "new body", choices: { x: { label: "Pick me" }, ghost: { label: "ignored" } } },
        s1: { lines: [{ speaker: "mira", text: "line one" }, { text: "narration" }, { speaker: "bram", text: "" }] },
        nope: { title: "no such beat" },
      },
    });
    expect(storyBeats[0].title).toBe("New");
    expect(storyBeats[0].scene).toBe("dawn");
    expect(storyBeats[0].body).toBe("new body");
    expect(storyBeats[0].choices[0].label).toBe("Pick me");
    expect(storyBeats[0].choices[0].outcome).toEqual({ setFlag: "f" }); // outcome untouched
    expect(sideBeats[0].lines).toEqual([{ speaker: "mira", text: "line one" }, { speaker: null, text: "narration" }]); // empty-text line dropped
  });
  it("clears body/scene when set to empty; no-op on a missing override", () => {
    const beats = [{ id: "a1", title: "T", scene: "ruin", body: "b" }];
    applyStoryOverrides(beats, [], { beats: { a1: { scene: "", body: "" } } });
    expect(beats[0].scene).toBeUndefined();
    expect(beats[0].body).toBeUndefined();
    const before = JSON.stringify(beats);
    applyStoryOverrides(beats, [], undefined);
    expect(JSON.stringify(beats)).toBe(before);
  });
});

describe("applyBossOverrides", () => {
  it("patches name/season/descriptions/target.amount; modifier untouched", () => {
    const bosses = [{ id: "frostmaw", name: "Frostmaw", season: "winter", target: { resource: "wood_log", amount: 30 }, modifier: { type: "freeze_columns", params: { n: 2 } }, description: "old", modifierDescription: "old mod" }];
    applyBossOverrides(bosses, { frostmaw: { name: "The Frostmaw", season: "spring", targetAmount: 45, description: "new", modifierDescription: "new mod" }, ghost: { name: "x" } });
    expect(bosses[0]).toMatchObject({ name: "The Frostmaw", season: "spring", description: "new", modifierDescription: "new mod" });
    expect(bosses[0].target).toEqual({ resource: "wood_log", amount: 45 });
    expect(bosses[0].modifier).toEqual({ type: "freeze_columns", params: { n: 2 } });
  });
});

describe("applyAchievementOverrides", () => {
  it("patches name/desc/threshold/target/reward.coins; counter untouched", () => {
    const ach = [{ id: "first_steps", name: "First Steps", desc: "old", counter: "chains_committed", threshold: 1, target: 1, reward: { coins: 25 } }];
    applyAchievementOverrides(ach, { first_steps: { name: "Baby Steps", desc: "new", threshold: 2, target: 5, rewardCoins: 50 }, ghost: { name: "x" } });
    expect(ach[0]).toMatchObject({ name: "Baby Steps", desc: "new", threshold: 2, target: 5, counter: "chains_committed" });
    expect(ach[0].reward).toEqual({ coins: 50 });
  });
});

describe("applyDailyRewardOverrides", () => {
  it("patches coins/runes per day (adding runes if absent); leaves tool drops alone", () => {
    const rewards = { 1: { coins: 25 }, 5: { tool: "rare", amount: 1 }, 14: { coins: 300, runes: 1 } };
    applyDailyRewardOverrides(rewards, { 1: { coins: 40, runes: 1 }, 5: { coins: 60 }, 14: { runes: 3 }, 99: { coins: 1 } });
    expect(rewards[1]).toEqual({ coins: 40, runes: 1 });
    expect(rewards[5]).toEqual({ tool: "rare", amount: 1, coins: 60 });
    expect(rewards[14]).toEqual({ coins: 300, runes: 3 });
    expect(rewards[99]).toBeUndefined(); // no such day
    const before = JSON.stringify(rewards);
    applyDailyRewardOverrides(rewards, undefined);
    expect(JSON.stringify(rewards)).toBe(before);
  });
});
