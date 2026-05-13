// Phase 6 — Balance Manager override functions for the new config sections.
import { describe, it, expect } from "vitest";
import { applyExpeditionOverrides, applyBiomeOverrides, sanitizeTuning, applyNpcOverrides, applyStoryOverrides, applyBossOverrides, applyAchievementOverrides, applyDailyRewardOverrides, sanitizeChoiceOutcome, sanitizeChoiceArray, sanitizeBeatTrigger, sanitizeBeatOnComplete, applyFlagOverrides, sanitizeFlagTrigger, sanitizeFlagTriggerArray } from "../config/applyOverrides.js";

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
  it("array-form choices replace the list wholesale, with whitelisted outcomes", () => {
    const beats = [{ id: "a1", title: "T", choices: [{ id: "x", label: "old", outcome: { setFlag: "f" } }] }];
    applyStoryOverrides(beats, [], { beats: { a1: { choices: [
      { id: "x", label: "kept", outcome: { setFlag: ["a", "b"], bondDelta: { npc: "mira", amount: 0.5 }, embers: 3, evil: "drop me" } },
      { id: "", label: "auto-id", outcome: { queueBeat: "  res1  " } },
      { label: "no-id", outcome: { coreIngots: 0 } }, // 0 currency dropped → empty outcome → no outcome key
    ] } } });
    expect(beats[0].choices).toEqual([
      { id: "x", label: "kept", outcome: { setFlag: ["a", "b"], bondDelta: { npc: "mira", amount: 0.5 }, embers: 3 } },
      { id: "choice_2", label: "auto-id", outcome: { queueBeat: "res1" } },
      { id: "choice_3", label: "no-id" },
    ]);
  });
  it("an empty choices array clears the fork", () => {
    const beats = [{ id: "a1", title: "T", choices: [{ id: "x", label: "y" }] }];
    applyStoryOverrides(beats, [], { beats: { a1: { choices: [] } } });
    expect(beats[0].choices).toBeUndefined();
  });
  it("newBeats append to the side list as draft side beats; dup / blank ids skipped", () => {
    const story = [{ id: "a1", title: "A1" }];
    const side = [{ id: "s1", title: "S1" }];
    applyStoryOverrides(story, side, { newBeats: [
      { id: "branch_a", title: "Branch A", lines: [{ speaker: "wren", text: "hi" }, { text: "" }], choices: [{ id: "go", label: "Go", outcome: { setFlag: "did_a", queueBeat: "branch_b" } }] },
      { id: "branch_b", body: "Wren: 'done.'", trigger: { type: "bond_at_least", npc: "mira", amount: 6 }, onComplete: { setFlag: ["done_b"] } },
      { id: "a1", title: "dup — ignored" },
      { id: "  ", title: "blank — ignored" },
      "not an object",
    ] });
    expect(side).toHaveLength(3);
    expect(side[1]).toEqual({ id: "branch_a", side: true, draft: true, title: "Branch A", lines: [{ speaker: "wren", text: "hi" }], choices: [{ id: "go", label: "Go", outcome: { setFlag: "did_a", queueBeat: "branch_b" } }] });
    expect(side[2]).toEqual({ id: "branch_b", side: true, draft: true, title: "branch_b", body: "Wren: 'done.'", trigger: { type: "bond_at_least", npc: "mira", amount: 6 }, onComplete: { setFlag: "done_b" } });
    expect(story).toHaveLength(1); // dup id didn't overwrite the built-in
  });
  it("a beats[] patch can target a just-created newBeat", () => {
    const side = [];
    applyStoryOverrides([], side, {
      newBeats: [{ id: "draft1", title: "Draft 1" }],
      beats: { draft1: { title: "Renamed", scene: "frost", choices: [{ id: "c1", label: "Pick" }] } },
    });
    expect(side[0]).toMatchObject({ id: "draft1", title: "Renamed", scene: "frost", choices: [{ id: "c1", label: "Pick" }] });
  });
});

describe("story-beat sanitizers", () => {
  it("sanitizeChoiceOutcome whitelists keys and drops zeros / blanks", () => {
    expect(sanitizeChoiceOutcome({ setFlag: " a ", clearFlag: ["", "  "], bondDelta: { npc: "wren", amount: 0 }, embers: 0, coreIngots: 4.7, gems: -2, queueBeat: " b ", junk: 1 }))
      .toEqual({ setFlag: "a", coreIngots: 4, gems: -2, queueBeat: "b" });
    expect(sanitizeChoiceOutcome({ embers: 0 })).toBeUndefined();
    expect(sanitizeChoiceOutcome(null)).toBeUndefined();
    expect(sanitizeChoiceOutcome({ setFlag: ["x", "y", "x"] })).toEqual({ setFlag: ["x", "y"] });
  });
  it("sanitizeChoiceArray auto-ids, dedups, and defaults the label", () => {
    expect(sanitizeChoiceArray([{ label: "A" }, { id: "go" }, { id: "go", label: "again" }, "nope", null]))
      .toEqual([{ id: "choice_1", label: "A" }, { id: "go", label: "Continue" }, { id: "go_3", label: "again" }]);
    expect(sanitizeChoiceArray("x")).toBeNull();
  });
  it("sanitizeBeatTrigger only accepts a positive bond_at_least", () => {
    expect(sanitizeBeatTrigger({ type: "bond_at_least", npc: "mira", amount: 7.9 })).toEqual({ type: "bond_at_least", npc: "mira", amount: 7 });
    expect(sanitizeBeatTrigger({ type: "bond_at_least", npc: "mira", amount: 0 })).toBeUndefined();
    expect(sanitizeBeatTrigger({ type: "resource_total", key: "x", amount: 5 })).toBeUndefined();
  });
  it("sanitizeBeatOnComplete keeps only setFlag", () => {
    expect(sanitizeBeatOnComplete({ setFlag: ["a"], spawnNPC: "mira" })).toEqual({ setFlag: "a" });
    expect(sanitizeBeatOnComplete({ spawnNPC: "mira" })).toBeUndefined();
  });
});

describe("flag-trigger sanitizers", () => {
  it("sanitizeFlagTrigger accepts the full event vocabulary, rejects junk", () => {
    expect(sanitizeFlagTrigger({ type: "session_start" })).toEqual({ type: "session_start" });
    expect(sanitizeFlagTrigger({ type: "all_buildings_built", extra: 1 })).toEqual({ type: "all_buildings_built" });
    expect(sanitizeFlagTrigger({ type: "act_entered", act: "3" })).toEqual({ type: "act_entered", act: 3 });
    expect(sanitizeFlagTrigger({ type: "act_entered", act: 0 })).toBeUndefined();
    expect(sanitizeFlagTrigger({ type: "resource_total", key: " wood_log ", amount: 30.9 })).toEqual({ type: "resource_total", key: "wood_log", amount: 30 });
    expect(sanitizeFlagTrigger({ type: "resource_total", key: "", amount: 5 })).toBeUndefined();
    expect(sanitizeFlagTrigger({ type: "resource_total_multi", req: { a: 2, b: 0, "": 3 } })).toEqual({ type: "resource_total_multi", req: { a: 2 } });
    expect(sanitizeFlagTrigger({ type: "resource_total_multi", req: { b: 0 } })).toBeUndefined();
    expect(sanitizeFlagTrigger({ type: "craft_made", item: "bread" })).toEqual({ type: "craft_made", item: "bread" });
    expect(sanitizeFlagTrigger({ type: "craft_made", item: "bread", count: 3 })).toEqual({ type: "craft_made", item: "bread", count: 3 });
    expect(sanitizeFlagTrigger({ type: "building_built", id: "mill" })).toEqual({ type: "building_built", id: "mill" });
    expect(sanitizeFlagTrigger({ type: "boss_defeated", id: "frostmaw" })).toEqual({ type: "boss_defeated", id: "frostmaw" });
    expect(sanitizeFlagTrigger({ type: "bond_at_least", npc: "mira", amount: 8 })).toEqual({ type: "bond_at_least", npc: "mira", amount: 8 });
    expect(sanitizeFlagTrigger({ type: "bond_at_least", npc: "mira" })).toBeUndefined();
    expect(sanitizeFlagTrigger({ type: "season_entered", season: "winter" })).toBeUndefined();
    expect(sanitizeFlagTrigger(null)).toBeUndefined();
  });
  it("sanitizeFlagTriggerArray drops bad entries", () => {
    expect(sanitizeFlagTriggerArray([{ type: "session_start" }, { type: "junk" }, null, { type: "building_built", id: "mill" }]))
      .toEqual([{ type: "session_start" }, { type: "building_built", id: "mill" }]);
    expect(sanitizeFlagTriggerArray("nope")).toBeUndefined();
  });
});

describe("applyFlagOverrides", () => {
  const reg = () => [
    { id: "f1", label: "F1", description: "d1", category: "story", default: false, source: "beat:x", triggers: [] },
    { id: "f2", label: "F2", category: "mira", default: false, source: "choice:y", triggers: [{ type: "session_start" }] },
  ];
  it("patches metadata + replaces triggers; ignores unknown ids / bad category", () => {
    const flags = reg();
    applyFlagOverrides(flags, { byId: {
      f1: { label: "Renamed", description: "new", category: "frostmaw", default: true, triggers: [{ type: "building_built", id: "mill" }, { type: "junk" }] },
      f2: { category: "not-a-cat", triggers: "not-an-array" },
      ghost: { label: "ignored" },
    } });
    expect(flags[0]).toMatchObject({ id: "f1", label: "Renamed", description: "new", category: "frostmaw", default: true, triggers: [{ type: "building_built", id: "mill" }] });
    expect(flags[1]).toMatchObject({ id: "f2", category: "mira", triggers: [{ type: "session_start" }] }); // unchanged
    expect(flags).toHaveLength(2);
  });
  it("appends new flags from flags.new (dup / blank ids skipped)", () => {
    const flags = reg();
    applyFlagOverrides(flags, { new: [
      { id: "f3", label: "F3", category: "story", triggers: [{ type: "act_entered", act: 2 }] },
      { id: "f1", label: "dup — ignored" },
      { id: "  ", label: "blank — ignored" },
      "nope",
    ] });
    expect(flags).toHaveLength(3);
    expect(flags[2]).toEqual({ id: "f3", label: "F3", category: "story", default: false, source: "override", triggers: [{ type: "act_entered", act: 2 }] });
  });
  it("no-op on a non-array registry or falsy overrides", () => {
    const flags = reg(); const before = JSON.stringify(flags);
    applyFlagOverrides(flags, undefined);
    applyFlagOverrides(null, { byId: { f1: { label: "x" } } });
    expect(JSON.stringify(flags)).toBe(before);
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
