// Phase 6 — Dev Panel override functions for the new config sections.
import { describe, it, expect } from "vitest";
import { applyExpeditionOverrides, applyBiomeOverrides, applyUpgradeThresholdOverrides, sanitizeTuning, applyNpcOverrides, applyStoryOverrides, applyBossOverrides, applyAchievementOverrides, applyDailyRewardOverrides, sanitizeChoiceOutcome, sanitizeChoiceArray, sanitizeBeatTrigger, sanitizeBeatOnComplete, sanitizeBeatRepeatCooldown, applyFlagOverrides, sanitizeFlagTrigger, sanitizeFlagTriggerArray, sanitizeCond } from "../config/applyOverrides.js";
import { withImportMetaDev } from "../testUtils/testState.js";

describe("applyExpeditionOverrides", () => {
  it("merges foodTurns (tune existing keys) and replaces meatFoods wholesale", () => {
    const ft = { bread: 1, apple: 1 };
    const mf = ["cured_meat"];
    applyExpeditionOverrides(ft, mf, { foodTurns: { bread: 5, apple: 3 }, meatFoods: ["ham", "stew"] });
    expect(ft.bread).toBe(5);
    expect(ft.apple).toBe(3);
    expect(mf).toEqual(["ham", "stew"]);
  });

  it("throws in DEV on unknown expedition foodTurns key", () => {
    const ft = { bread: 1 };
    expect(() => applyExpeditionOverrides(ft, [], { foodTurns: { newfood: 3 } }))
      .toThrow(/Unknown balance override target: expedition\.foodTurns\.newfood/);
    expect(ft).toEqual({ bread: 1 });
  });
  it("throws on invalid foodTurns (all-or-nothing)", () => {
    const ft = { bread: 1 };
    expect(() => applyExpeditionOverrides(ft, [], { foodTurns: { bad: -1 } }))
      .toThrow(/Invalid balance overrides \(expedition\)/);
    expect(ft).toEqual({ bread: 1 });
  });

  it("is a no-op when overrides is undefined", () => {
    const ft = { bread: 1 };
    const before = JSON.stringify(ft);
    applyExpeditionOverrides(ft, [], undefined);
    expect(JSON.stringify(ft)).toBe(before);
  });
});

describe("applyBiomeOverrides", () => {
  it("patches a matched biome in place", () => {
    const biomes = {
      farm: [{ id: "prairie", name: "Prairie", look: { icon: "🌾" }, hazards: ["fire", "locusts"], bonus: "grain yield" }],
      mine: [{ id: "mountain", name: "Mountain", look: { icon: "🏔️" }, hazards: ["cave_in", "gas_pocket"], bonus: "iron" }],
    };
    applyBiomeOverrides(biomes, {
      farm: { prairie: { name: "Sunfield", look: { icon: "☀️" }, hazards: ["drought", "locusts"], bonus: "wheat" } },
    });
    expect(biomes.farm[0].name).toBe("Sunfield");
    expect(biomes.farm[0].look.icon).toBe("☀️");
    expect(biomes.farm[0].hazards).toEqual(["drought", "locusts"]);
    expect(biomes.farm[0].bonus).toBe("wheat");
    expect(biomes.mine[0].name).toBe("Mountain"); // untouched
    const before = JSON.stringify(biomes);
    applyBiomeOverrides(biomes, undefined);
    expect(JSON.stringify(biomes)).toBe(before);
  });

  it("skips unknown biome type / id in production builds", () => {
    withImportMetaDev(false, () => {
      const biomes = {
        farm: [{ id: "prairie", name: "Prairie", look: { icon: "🌾" }, hazards: ["fire"], bonus: "grain" }],
      };
      applyBiomeOverrides(biomes, {
        farm: { nope: { name: "x" } },
        harbor: { coastal: { name: "x" } },
      });
      expect(biomes.farm[0].name).toBe("Prairie");
    });
  });
});

describe("applyUpgradeThresholdOverrides", () => {
  it("throws in DEV on unknown threshold keys", () => {
    const target = { flour: 5 };
    expect(() => applyUpgradeThresholdOverrides(target, { not_a_real_resource: 8 }))
      .toThrow(/Unknown balance override target: upgradeThresholds\.not_a_real_resource/);
    expect(target).toEqual({ flour: 5 });
  });
});

describe("sanitizeTuning", () => {
  it("keeps only valid keys, floors integers, allows craftGemSkipCost 0", () => {
    expect(sanitizeTuning({
      craftQueueHours: 6, craftGemSkipCost: 0,
      minExpeditionTurns: 4, foundingBaseCoins: 500, foundingGrowth: 1.6, homeBiome: "marsh",
    })).toEqual({
      craftQueueHours: 6, craftGemSkipCost: 0,
      minExpeditionTurns: 4, foundingBaseCoins: 500, foundingGrowth: 1.6, homeBiome: "marsh",
    });
  });
  it("throws on invalid tuning", () => {
    expect(() => sanitizeTuning({ foundingGrowth: 0, homeBiome: "", craftGemSkipCost: "x" }))
      .toThrow(/Invalid balance overrides \(tuning\)/);
    expect(sanitizeTuning(undefined)).toEqual({});
  });
});

describe("applyNpcOverrides", () => {
  it("patches gift prefs (re-deriving favoriteGift) and bond bands", () => {
    const npcData = {
      mira: { id: "mira", displayName: "Mira", loves: ["bread"], likes: ["honey"], favoriteGift: "bread" },
    };
    const bondBands = [
      { lo: 1, hi: 4, name: "Sour", modifier: 0.7 },
      { lo: 5, hi: 6, name: "Warm", modifier: 1.0 },
    ];
    applyNpcOverrides(npcData, bondBands, {
      byId: { mira: { displayName: "Mira the Baker", loves: ["cake", "bread"], likes: ["jam"] } },
      bands: [{ name: "Bitter", modifier: 0.5 }, { modifier: 1.1 }],
    });
    expect(npcData.mira.displayName).toBe("Mira the Baker");
    expect(npcData.mira.loves).toEqual(["cake", "bread"]);
    expect(npcData.mira.likes).toEqual(["jam"]);
    expect(npcData.mira.favoriteGift).toBe("cake");   // re-derived
    expect(bondBands[0]).toMatchObject({ name: "Bitter", modifier: 0.5 });
    expect(bondBands[1]).toMatchObject({ name: "Warm", modifier: 1.1 }); // name untouched
  });

  it("skips unknown npc ids in production builds", () => {
    withImportMetaDev(false, () => {
      const npcData = { mira: { loves: ["bread"], favoriteGift: "bread" } };
      applyNpcOverrides(npcData, [], { byId: { ghost: { loves: ["x"] } } });
      expect(npcData.ghost).toBeUndefined();
    });
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
        a1: { title: "New", scene: "dawn", body: "new body", choices: { x: { label: "Pick me" } } },
        s1: { lines: [{ speaker: "mira", text: "line one" }, { text: "narration" }, { speaker: "bram", text: "" }] },
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
  it("newBeats append to the side list as draft side beats; dup ids skipped at apply", () => {
    const story = [{ id: "a1", title: "A1" }];
    const side = [{ id: "s1", title: "S1" }];
    applyStoryOverrides(story, side, { newBeats: [
      { id: "branch_a", title: "Branch A", lines: [{ speaker: "wren", text: "hi" }, { text: "" }], choices: [{ id: "go", label: "Go", outcome: { setFlag: "did_a", queueBeat: "branch_b" } }] },
      { id: "branch_b", body: "Wren: 'done.'", trigger: { type: "bond_at_least", npc: "mira", amount: 6 }, onComplete: { setFlag: ["done_b"] } },
      { id: "a1", title: "dup — ignored" },
    ] });
    expect(side).toHaveLength(3);
    expect(side[1]).toEqual({ id: "branch_a", side: true, draft: true, title: "Branch A", lines: [{ speaker: "wren", text: "hi" }], choices: [{ id: "go", label: "Go", outcome: { setFlag: "did_a", queueBeat: "branch_b" } }] });
    expect(side[2]).toEqual({ id: "branch_b", side: true, draft: true, title: "branch_b", body: "Wren: 'done.'", when: { fact: "npc.mira.bond", op: "gte", value: 6 }, onComplete: { setFlag: "done_b" } });
    expect(story).toHaveLength(1); // dup id didn't overwrite the built-in
  });
  it("throws when newBeats contains non-objects", () => {
    expect(() => applyStoryOverrides([], [], { newBeats: [{ id: "x", title: "X" }, "nope"] }))
      .toThrow(/Invalid balance overrides \(story\)/);
  });
  it("a beats[] patch can target a just-created newBeat", () => {
    const side = [];
    applyStoryOverrides([], side, {
      newBeats: [{ id: "draft1", title: "Draft 1" }],
      beats: { draft1: { title: "Renamed", scene: "frost", choices: [{ id: "c1", label: "Pick" }] } },
    });
    expect(side[0]).toMatchObject({ id: "draft1", title: "Renamed", scene: "frost", choices: [{ id: "c1", label: "Pick" }] });
  });
  it("trigger + repeat are sanitised on newBeats and beats[] patches; compiled to when:", () => {
    const story = [{ id: "a1", title: "A" }];
    const side = [];
    applyStoryOverrides(story, side, {
      newBeats: [{ id: "d1", title: "D1", trigger: { type: "building_built", id: "mill" }, repeat: true, repeatCooldown: 3 },
                 { id: "d2", title: "D2", trigger: { type: "flag_set", flag: " mine_unlocked " } }],
      beats: { a1: { trigger: { type: "resource_total", key: "tile_tree_oak", amount: 30 }, repeat: true },
               d1: { repeat: false, repeatCooldown: 0 } },   // turn the repeat back off
    });
    // legacy `trigger:` overrides are compiled to the native `when:` Cond; `beat.trigger` is never written
    expect(story[0].when).toEqual({ fact: "resource.tile_tree_oak.total", op: "gte", value: 30 });
    expect(story[0].trigger).toBeUndefined();
    expect(story[0].repeat).toBe(true);
    const d1 = side.find((b) => b.id === "d1"), d2 = side.find((b) => b.id === "d2");
    expect(d1.when).toEqual({ all: [{ fact: "event.type", op: "eq", value: "building_built" }, { fact: "event.id", op: "eq", value: "mill" }] });
    expect(d1.trigger).toBeUndefined();
    expect(d1.repeat).toBeUndefined();   // newBeat set repeat:true, beats[] patch cleared it
    expect(d1.repeatCooldown).toBeUndefined();
    expect(d2.when).toEqual({ fact: "flag.mine_unlocked" });
    expect(d2.trigger).toBeUndefined();
    // a bad trigger in a patch is ignored (keeps the prior when)
    const prevWhen = story[0].when;
    applyStoryOverrides(story, [], { beats: { a1: { trigger: { type: "no_such" } } } });
    expect(story[0].when).toEqual(prevWhen);
  });
  it("a direct when: Cond override on a beat patch writes beat.when", () => {
    const story = [{ id: "a1", title: "A" }];
    applyStoryOverrides(story, [], {
      beats: { a1: { when: { fact: "flag.hearth_lit" } } },
    });
    expect(story[0].when).toEqual({ fact: "flag.hearth_lit" });
    expect(story[0].trigger).toBeUndefined();
  });
  it("a direct when: Cond on a newBeat writes beat.when; precedence over trigger:", () => {
    const side = [];
    applyStoryOverrides([], side, {
      newBeats: [{ id: "w1", title: "W1",
        when: { fact: "flag.hearth_lit" },
        trigger: { type: "session_start" } }],
    });
    // when: takes precedence over trigger:
    expect(side[0].when).toEqual({ fact: "flag.hearth_lit" });
    expect(side[0].trigger).toBeUndefined();
  });
  it("suppresses built-in side beats without deleting draft side beats", () => {
    const side = [
      { id: "mira_letter_1", title: "Mira", side: true },
      { id: "draft_side", title: "Draft", side: true, draft: true },
    ];
    applyStoryOverrides([], side, { suppressedBeats: ["mira_letter_1", "draft_side"] });
    expect(side).toEqual([{ id: "draft_side", title: "Draft", side: true, draft: true }]);
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
  it("sanitizeBeatTrigger accepts the full trigger vocabulary (alias of sanitizeTrigger)", () => {
    expect(sanitizeBeatTrigger({ type: "bond_at_least", npc: "mira", amount: 7.9 })).toEqual({ type: "bond_at_least", npc: "mira", amount: 7 });
    expect(sanitizeBeatTrigger({ type: "bond_at_least", npc: "mira", amount: 0 })).toBeUndefined();
    expect(sanitizeBeatTrigger({ type: "resource_total", key: "x", amount: 5 })).toEqual({ type: "resource_total", key: "x", amount: 5 });
    expect(sanitizeBeatTrigger({ type: "building_built", id: "mill" })).toEqual({ type: "building_built", id: "mill" });
    expect(sanitizeBeatTrigger({ type: "flag_set", flag: " hearth_lit " })).toEqual({ type: "flag_set", flag: "hearth_lit" });
    expect(sanitizeBeatTrigger({ type: "flag_set" })).toBeUndefined();
    expect(sanitizeBeatTrigger({ type: "season_entered" })).toBeUndefined();
    expect(sanitizeBeatTrigger === sanitizeFlagTrigger).toBe(true);   // same sanitizer
  });
  it("sanitizeBeatOnComplete keeps only setFlag", () => {
    expect(sanitizeBeatOnComplete({ setFlag: ["a"], spawnNPC: "mira" })).toEqual({ setFlag: "a" });
    expect(sanitizeBeatOnComplete({ spawnNPC: "mira" })).toBeUndefined();
  });
  it("sanitizeBeatRepeatCooldown keeps positive whole story-event counts", () => {
    expect(sanitizeBeatRepeatCooldown(2.9)).toBe(2);
    expect(sanitizeBeatRepeatCooldown("4")).toBe(4);
    expect(sanitizeBeatRepeatCooldown(0)).toBeUndefined();
    expect(sanitizeBeatRepeatCooldown(-1)).toBeUndefined();
    expect(sanitizeBeatRepeatCooldown("x")).toBeUndefined();
  });
});

describe("sanitizeCond", () => {
  it("accepts a bare leaf with a known fact", () => {
    expect(sanitizeCond({ fact: "flag.hearth_lit" })).toEqual({ fact: "flag.hearth_lit" });
    expect(sanitizeCond({ fact: "npc.mira.bond", op: "gte", value: 8 })).toEqual({ fact: "npc.mira.bond", op: "gte", value: 8 });
    expect(sanitizeCond({ fact: "event.type", op: "eq", value: "session_start" })).toEqual({ fact: "event.type", op: "eq", value: "session_start" });
  });
  it("rejects a leaf with an unknown fact", () => {
    expect(sanitizeCond({ fact: "not_a_real_fact" })).toBeUndefined();
    expect(sanitizeCond({ fact: "" })).toBeUndefined();
  });
  it("rejects a leaf with an unknown op", () => {
    expect(sanitizeCond({ fact: "flag.hearth_lit", op: "starts_with" })).toBeUndefined();
  });
  it("rejects a leaf with an invalid value type", () => {
    expect(sanitizeCond({ fact: "flag.hearth_lit", value: { nested: "obj" } })).toBeUndefined();
    expect(sanitizeCond({ fact: "flag.hearth_lit", value: ["arr"] })).toBeUndefined();
  });
  it("accepts all / any / not composites with valid children", () => {
    expect(sanitizeCond({ all: [{ fact: "flag.hearth_lit" }, { fact: "npc.mira.bond", op: "gte", value: 5 }] }))
      .toEqual({ all: [{ fact: "flag.hearth_lit" }, { fact: "npc.mira.bond", op: "gte", value: 5 }] });
    expect(sanitizeCond({ any: [{ fact: "flag.hearth_lit" }, { fact: "flag.mine_unlocked" }] }))
      .toEqual({ any: [{ fact: "flag.hearth_lit" }, { fact: "flag.mine_unlocked" }] });
    expect(sanitizeCond({ not: { fact: "flag.hearth_lit" } }))
      .toEqual({ not: { fact: "flag.hearth_lit" } });
  });
  it("drops invalid elements from all / any arrays rather than rejecting the whole node", () => {
    expect(sanitizeCond({ all: [{ fact: "flag.hearth_lit" }, { fact: "bad_fact" }, null] }))
      .toEqual({ all: [{ fact: "flag.hearth_lit" }] });
  });
  it("returns undefined when all children are invalid (empty after filtering)", () => {
    expect(sanitizeCond({ all: [{ fact: "bad_fact" }] })).toBeUndefined();
    expect(sanitizeCond({ any: [] })).toBeUndefined();
  });
  it("returns undefined for an unrecognised / empty shape", () => {
    expect(sanitizeCond(null)).toBeUndefined();
    expect(sanitizeCond("string")).toBeUndefined();
    expect(sanitizeCond({})).toBeUndefined();
    expect(sanitizeCond({ not: { fact: "bad_fact" } })).toBeUndefined();
  });
});

describe("flag-trigger sanitizers", () => {
  it("sanitizeFlagTrigger accepts the full event vocabulary, rejects junk", () => {
    expect(sanitizeFlagTrigger({ type: "session_start" })).toEqual({ type: "session_start" });
    expect(sanitizeFlagTrigger({ type: "all_buildings_built", extra: 1 })).toEqual({ type: "all_buildings_built" });
    expect(sanitizeFlagTrigger({ type: "act_entered", act: "3" })).toEqual({ type: "act_entered", act: 3 });
    expect(sanitizeFlagTrigger({ type: "act_entered", act: 0 })).toBeUndefined();
    expect(sanitizeFlagTrigger({ type: "resource_total", key: " tile_tree_oak ", amount: 30.9 })).toEqual({ type: "resource_total", key: "tile_tree_oak", amount: 30 });
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
  it("patches metadata + replaces triggers", () => {
    const flags = reg();
    applyFlagOverrides(flags, { byId: {
      f1: { label: "Renamed", description: "new", category: "frostmaw", default: true, triggers: [{ type: "building_built", id: "mill" }] },
    } });
    expect(flags[0]).toMatchObject({ id: "f1", label: "Renamed", description: "new", category: "frostmaw", default: true, triggers: [{ type: "building_built", id: "mill" }] });
    expect(flags[1]).toMatchObject({ id: "f2", category: "mira", triggers: [{ type: "session_start" }] });
    expect(flags).toHaveLength(2);
  });
  it("throws on invalid byId patch", () => {
    const flags = reg();
    expect(() => applyFlagOverrides(flags, { byId: { f2: { category: "not-a-cat" } } }))
      .toThrow(/Invalid balance overrides \(flags\)/);
  });
  it("appends new flags from flags.new (dup ids skipped at apply)", () => {
    const flags = reg();
    applyFlagOverrides(flags, { new: [
      { id: "f3", label: "F3", category: "story", triggers: [{ type: "act_entered", act: 2 }] },
      { id: "f1", label: "dup — ignored" },
    ] });
    expect(flags).toHaveLength(3);
    expect(flags[2]).toEqual({ id: "f3", label: "F3", category: "story", default: false, source: "override", triggers: [{ type: "act_entered", act: 2 }] });
  });
  it("throws when flags.new contains invalid entries", () => {
    const flags = reg();
    expect(() => applyFlagOverrides(flags, { new: [{ id: "f3", label: "F3" }, "nope"] }))
      .toThrow(/Invalid balance overrides \(flags\)/);
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
    const bosses = [{ id: "frostmaw", name: "Frostmaw", season: "winter", target: { resource: "tile_tree_oak", amount: 30 }, modifier: { type: "freeze_columns", params: { n: 2 } }, description: "old", modifierDescription: "old mod" }];
    applyBossOverrides(bosses, { frostmaw: { name: "The Frostmaw", season: "spring", targetAmount: 45, description: "new", modifierDescription: "new mod" } });
    expect(bosses[0]).toMatchObject({ name: "The Frostmaw", season: "spring", description: "new", modifierDescription: "new mod" });
    expect(bosses[0].target).toEqual({ resource: "tile_tree_oak", amount: 45 });
    expect(bosses[0].modifier).toEqual({ type: "freeze_columns", params: { n: 2 } });
  });
});

describe("applyAchievementOverrides", () => {
  it("patches name/desc/threshold/target/reward.coins; counter untouched", () => {
    const ach = [{ id: "first_steps", name: "First Steps", desc: "old", counter: "chains_committed", threshold: 1, target: 1, reward: { coins: 25 } }];
    applyAchievementOverrides(ach, { first_steps: { name: "Baby Steps", desc: "new", threshold: 2, target: 5, rewardCoins: 50 } });
    expect(ach[0]).toMatchObject({ name: "Baby Steps", desc: "new", threshold: 2, target: 5, counter: "chains_committed" });
    expect(ach[0].reward).toEqual({ coins: 50 });
  });
});

describe("applyDailyRewardOverrides", () => {
  it("patches coins/runes per day (adding runes if absent); leaves tool drops alone", () => {
    const rewards = { 1: { coins: 25 }, 5: { tool: "rare", amount: 1 }, 14: { coins: 300, runes: 1 } };
    applyDailyRewardOverrides(rewards, { 1: { coins: 40, runes: 1 }, 5: { coins: 60 }, 14: { runes: 3 } });
    expect(rewards[1]).toEqual({ coins: 40, runes: 1 });
    expect(rewards[5]).toEqual({ tool: "rare", amount: 1, coins: 60 });
    expect(rewards[14]).toEqual({ coins: 300, runes: 3 });
    const before = JSON.stringify(rewards);
    applyDailyRewardOverrides(rewards, undefined);
    expect(JSON.stringify(rewards)).toBe(before);
  });
});
