// Story-flag registry + the event→flag trigger evaluator.
import { describe, it, expect } from "vitest";
import {
  STORY_FLAGS, FLAG_CATEGORIES, flagDef, isRegisteredFlag, flagCategory,
  initialFlagState, evaluateFlagTriggers, applyFlagTriggers, applyFlagTriggersWithResult,
} from "../flags.js";
import { applyFlagOverrides } from "../config/applyOverrides.js";
import { conditionMatches } from "../story.js";

describe("STORY_FLAGS registry", () => {
  it("has the progression + arc flags, each with a well-formed entry", () => {
    const ids = new Set(STORY_FLAGS.map((f) => f.id));
    for (const id of ["intro_seen", "hearth_lit", "first_order", "granary_built", "home_keeper_resolved", "quarry_foothold", "frostmaw_active", "mine_unlocked", "festival_announced", "isWon",
      "mira_letter_seen", "mira_letter_sent", "keeper_choice_made", "keeper_path_coexist", "keeper_path_driveout"]) {
      expect(ids.has(id)).toBe(true);
    }
    for (const f of STORY_FLAGS) {
      expect(typeof f.id).toBe("string");
      expect(f.id.length).toBeGreaterThan(0);
      expect(typeof f.label).toBe("string");
      expect(FLAG_CATEGORIES[f.category]).toBeTruthy();
      expect(f.default).toBe(false);          // no current flag starts true
      expect(Array.isArray(f.triggers)).toBe(true);
    }
    // no duplicate ids
    expect(new Set(STORY_FLAGS.map((f) => f.id)).size).toBe(STORY_FLAGS.length);
  });
  it("applyFlagOverrides supports new flags and metadata patches", () => {
    const flags = [{ id: "old_flag", label: "Old", category: "misc", default: false, triggers: [] }];
    applyFlagOverrides(flags, {
      byId: { old_flag: { label: "Renamed", description: "desc", category: "story", default: true, triggers: [{ type: "session_start" }] } },
      new: [{ id: "new_flag", label: "New", description: "new desc", category: "mira", default: true, triggers: [{ type: "flag_set", flag: "old_flag" }] }],
    });
    expect(flags[0]).toMatchObject({ id: "old_flag", label: "Renamed", description: "desc", category: "story", default: true, triggers: [{ type: "session_start" }] });
    expect(flags[1]).toMatchObject({ id: "new_flag", label: "New", description: "new desc", category: "mira", default: true, source: "override", triggers: [{ type: "flag_set", flag: "old_flag" }] });
  });
  it("lookups + category resolution", () => {
    expect(flagDef("hearth_lit")).toMatchObject({ id: "hearth_lit", category: "story" });
    expect(flagDef("nope")).toBeNull();
    expect(isRegisteredFlag("keeper_path_coexist")).toBe(true);
    expect(isRegisteredFlag("_fired_x")).toBe(false);
    expect(flagCategory("frostmaw_active").id).toBe("frostmaw");
    expect(flagCategory("totally_unknown").id).toBe("misc");   // falls back
  });
  it("initialFlagState seeds only default-true flags (currently none)", () => {
    expect(initialFlagState()).toEqual({});
  });
});

describe("evaluateFlagTriggers", () => {
  // Drive a synthetic flag through the engine without mutating the live registry.
  const withFlag = (entry, gameState) => {
    STORY_FLAGS.push(entry);
    try { return evaluateFlagTriggers(gameState, gameState.__event); }
    finally { STORY_FLAGS.pop(); }
  };
  const baseState = (flags = {}, extra = {}) => ({ story: { flags }, inventory: {}, npcs: { bonds: {} }, ...extra });

  it("flips a flag when a trigger condition matches; idempotent once set", () => {
    const def = { id: "test_built_mill", label: "x", category: "misc", default: false, triggers: [{ type: "building_built", id: "mill" }] };
    const gs = baseState();
    expect(withFlag(def, { ...gs, __event: { type: "building_built", id: "mill" } })).toEqual({ changed: { test_built_mill: true } });
    expect(withFlag(def, { ...gs, __event: { type: "building_built", id: "well" } })).toBeNull();   // wrong building
    expect(withFlag(def, { ...baseState({ test_built_mill: true }), __event: { type: "building_built", id: "mill" } })).toBeNull(); // already set
  });
  it("supports resource_total / resource_total_multi / craft_made / act_entered / bond_at_least", () => {
    const cases = [
      [{ triggers: [{ type: "resource_total", key: "wood_log", amount: 30 }] }, baseState({}, { inventory: { wood_log: 30 } }), { type: "resource_total", key: "wood_log", amount: 30 }, true],
      [{ triggers: [{ type: "resource_total", key: "wood_log", amount: 30 }] }, baseState({}, { inventory: { wood_log: 12 } }), { type: "resource_total", key: "wood_log", amount: 12 }, false],
      [{ triggers: [{ type: "resource_total_multi", req: { mine_stone: 20, mine_coal: 10 } }] }, baseState({}, { inventory: { mine_stone: 25, mine_coal: 10 } }), { type: "resource_total_multi" }, true],
      [{ triggers: [{ type: "craft_made", item: "bread", count: 1 }] }, baseState(), { type: "craft_made", item: "bread", count: 1 }, true],
      [{ triggers: [{ type: "act_entered", act: 3 }] }, baseState(), { type: "act_entered", act: 3 }, true],
      [{ triggers: [{ type: "bond_at_least", npc: "mira", amount: 8 }] }, baseState({}, { npcs: { bonds: { mira: 8 } } }), { type: "session_start" }, true],
      [{ triggers: [{ type: "bond_at_least", npc: "mira", amount: 8 }] }, baseState({}, { npcs: { bonds: { mira: 8 } } }), { type: "craft_made", item: "x" }, false], // bond is settle-only
    ];
    cases.forEach(([partial, gs, event, expectFlip], i) => {
      const def = { id: `test_${i}`, label: "x", category: "misc", default: false, ...partial };
      const out = withFlag(def, { ...gs, __event: event });
      if (expectFlip) expect(out).toEqual({ changed: { [`test_${i}`]: true } });
      else expect(out).toBeNull();
    });
  });
  it("the live registry declares no triggers yet → no-op on any event", () => {
    expect(evaluateFlagTriggers({ story: { flags: {} }, inventory: {} }, { type: "session_start" })).toBeNull();
    expect(evaluateFlagTriggers({ story: { flags: {} }, inventory: {} }, { type: "building_built", id: "mill" })).toBeNull();
  });
  it("applyFlagTriggers merges changes into story.flags without mutating", () => {
    const def = { id: "test_apply", label: "x", category: "misc", default: false, triggers: [{ type: "session_start" }] };
    STORY_FLAGS.push(def);
    try {
      const before = { story: { flags: { other: true }, act: 1 }, inventory: {} };
      const after = applyFlagTriggers(before, { type: "session_start" });
      expect(after.story.flags).toEqual({ other: true, test_apply: true });
      expect(before.story.flags).toEqual({ other: true });   // not mutated
      expect(after.story.act).toBe(1);
      // no trigger match → returns the same reference
      expect(applyFlagTriggers(before, { type: "craft_made", item: "x" })).toBe(before);
    } finally { STORY_FLAGS.pop(); }
  });
  it("flag triggers cascade through flag_set in the same dispatch", () => {
    STORY_FLAGS.push(
      { id: "test_parent", label: "parent", category: "misc", default: false, triggers: [{ type: "session_start" }] },
      { id: "test_child", label: "child", category: "misc", default: false, triggers: [{ type: "flag_set", flag: "test_parent" }] },
    );
    try {
      const before = { story: { flags: {} }, inventory: {}, npcs: { bonds: {} } };
      const result = applyFlagTriggersWithResult(before, { type: "session_start" });
      expect(result.changed).toEqual({ test_parent: true, test_child: true });
      expect(result.state.story.flags).toEqual({ test_parent: true, test_child: true });
      expect(before.story.flags).toEqual({});
    } finally { STORY_FLAGS.pop(); STORY_FLAGS.pop(); }
  });
});

describe("conditionMatches (shared trigger matcher)", () => {
  it("matches the story-beat / flag event vocabulary", () => {
    expect(conditionMatches({ type: "session_start" }, { type: "session_start" })).toBe(true);
    expect(conditionMatches({ type: "session_ended" }, { type: "session_ended" })).toBe(true);
    expect(conditionMatches({ type: "act_entered", act: 2 }, { type: "act_entered", act: 2 })).toBe(true);
    expect(conditionMatches({ type: "act_entered", act: 2 }, { type: "act_entered", act: 3 })).toBe(false);
    expect(conditionMatches({ type: "resource_total", key: "k", amount: 5 }, { type: "resource_total", key: "k", amount: 5 }, { k: 7 })).toBe(true);
    expect(conditionMatches({ type: "resource_total", key: "k", amount: 5 }, { type: "resource_total", key: "k", amount: 5 }, { k: 2 })).toBe(false);
    expect(conditionMatches({ type: "resource_total_multi", req: { a: 1, b: 2 } }, { type: "resource_total_multi" }, { a: 3, b: 2 })).toBe(true);
    expect(conditionMatches({ type: "resource_total_multi", req: { a: 1, b: 2 } }, { type: "resource_total_multi" }, { a: 3 })).toBe(false);
    expect(conditionMatches({ type: "craft_made", item: "x", count: 2 }, { type: "craft_made", item: "x", count: 2 })).toBe(true);
    expect(conditionMatches({ type: "craft_made", item: "x", count: 2 }, { type: "craft_made", item: "x", count: 1 })).toBe(false);
    expect(conditionMatches({ type: "craft_made", item: "x" }, { type: "craft_made", item: "x" })).toBe(true);   // count optional
    expect(conditionMatches({ type: "building_built", id: "mill" }, { type: "building_built", id: "mill" })).toBe(true);
    expect(conditionMatches({ type: "boss_defeated", id: "frostmaw" }, { type: "boss_defeated", id: "frostmaw" })).toBe(true);
    expect(conditionMatches({ type: "all_buildings_built" }, { type: "all_buildings_built", allBuilt: true })).toBe(true);
    expect(conditionMatches({ type: "all_buildings_built" }, { type: "all_buildings_built", allBuilt: false })).toBe(false);
    expect(conditionMatches({ type: "building_built", id: "mill" }, { type: "craft_made" })).toBe(false);   // type mismatch
    expect(conditionMatches(null, { type: "session_start" })).toBe(false);
  });
});
