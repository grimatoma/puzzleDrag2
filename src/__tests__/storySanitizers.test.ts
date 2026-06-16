// Story-beat / flag sanitizers (src/config/storySanitizers.ts) — the validators
// the /story/ editor uses to whitelist untrusted beat & trigger input.
import { describe, it, expect } from "vitest";
import {
  sanitizeChoiceOutcome, sanitizeChoiceArray, sanitizeBeatTrigger,
  sanitizeBeatOnComplete, sanitizeBeatRepeatCooldown, sanitizeFlagTrigger,
  sanitizeFlagTriggerArray, sanitizeCond,
} from "../config/storySanitizers.js";

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
