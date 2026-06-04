// src/__tests__/progression-bridge2b.test.ts
// TDD tests for the four new helpers added in Task 1 of the Phase-2b migration:
//   1. buildFactSnapshot extended with bonds (4th arg)
//   2. isFlagOnlyCond
//   3. isStateCond
//   4. condToTrigger (inverse of beatTriggerToCond, with round-trip coverage)
import { describe, it, expect } from "vitest";
import {
  beatTriggerToCond,
  buildFactSnapshot,
  isFlagOnlyCond,
  isStateCond,
  condToTrigger,
} from "../config/progression/storyBridge.js";
import type { BeatTrigger } from "../story.js";

// ─── 1. buildFactSnapshot — bonds (4th arg) ──────────────────────────────────

describe("buildFactSnapshot — bonds (4th param)", () => {
  it("adds npc.<id>.bond facts for each bond entry", () => {
    const snap = buildFactSnapshot(null, {}, {}, { elara: 3, merric: 7 });
    expect(snap["npc.elara.bond"]).toBe(3);
    expect(snap["npc.merric.bond"]).toBe(7);
  });

  it("defaults bonds to {} — 3-arg callers still work", () => {
    const snap = buildFactSnapshot(null, { flour: 2 }, { intro_seen: true });
    expect(snap["resource.flour.total"]).toBe(2);
    expect(snap["flag.intro_seen"]).toBe(true);
    // no bond keys bleed in
    expect(Object.keys(snap).filter((k) => k.startsWith("npc."))).toHaveLength(0);
  });

  it("bonds coexist alongside totals, flags, and event fields", () => {
    const snap = buildFactSnapshot(
      { type: "building_built", id: "granary" },
      { flour: 5 },
      { intro_seen: true },
      { elara: 10 },
    );
    expect(snap["event.type"]).toBe("building_built");
    expect(snap["resource.flour.total"]).toBe(5);
    expect(snap["flag.intro_seen"]).toBe(true);
    expect(snap["npc.elara.bond"]).toBe(10);
  });

  it("passes 0 bond values through", () => {
    const snap = buildFactSnapshot(null, {}, {}, { merric: 0 });
    expect(snap["npc.merric.bond"]).toBe(0);
  });
});

// ─── 2. isFlagOnlyCond ───────────────────────────────────────────────────────

describe("isFlagOnlyCond", () => {
  it("returns true for a single flag leaf", () => {
    expect(isFlagOnlyCond({ fact: "flag.intro_seen" })).toBe(true);
  });

  it("returns true for not-wrapped flag leaf", () => {
    expect(isFlagOnlyCond({ not: { fact: "flag.intro_seen" } })).toBe(true);
  });

  it("returns true for all-of-flags", () => {
    expect(isFlagOnlyCond({
      all: [{ fact: "flag.a" }, { fact: "flag.b" }],
    })).toBe(true);
  });

  it("returns true for any-of-flags", () => {
    expect(isFlagOnlyCond({
      any: [{ fact: "flag.x" }, { fact: "flag.y" }],
    })).toBe(true);
  });

  it("returns false for a non-flag leaf", () => {
    expect(isFlagOnlyCond({ fact: "level", op: "gte", value: 2 })).toBe(false);
  });

  it("returns false for mixed flag and non-flag", () => {
    expect(isFlagOnlyCond({
      all: [{ fact: "flag.a" }, { fact: "resource.flour.total", op: "gte", value: 1 }],
    })).toBe(false);
  });

  it("returns false for event-only fact", () => {
    expect(isFlagOnlyCond({ fact: "event.type", op: "eq", value: "session_start" })).toBe(false);
  });

  it("returns false for cond with no facts (empty all)", () => {
    expect(isFlagOnlyCond({ all: [] })).toBe(false);
  });

  it("returns false for __never__ sentinel", () => {
    expect(isFlagOnlyCond({ fact: "__never__" })).toBe(false);
  });
});

// ─── 3. isStateCond ──────────────────────────────────────────────────────────

describe("isStateCond", () => {
  it("returns true for a pure resource-total leaf (no event refs)", () => {
    expect(isStateCond({ fact: "resource.supplies.total", op: "gte", value: 3 })).toBe(true);
  });

  it("returns true for a flag leaf", () => {
    expect(isStateCond({ fact: "flag.intro_seen" })).toBe(true);
  });

  it("returns true for a npc bond leaf", () => {
    expect(isStateCond({ fact: "npc.elara.bond", op: "gte", value: 5 })).toBe(true);
  });

  it("returns true for all-of-resources (no event.* anywhere)", () => {
    expect(isStateCond({
      all: [
        { fact: "resource.flour.total", op: "gte", value: 5 },
        { fact: "flag.hearth_lit" },
      ],
    })).toBe(true);
  });

  it("returns false for event.type eq leaf", () => {
    expect(isStateCond({ fact: "event.type", op: "eq", value: "session_start" })).toBe(false);
  });

  it("returns false for an all-cond that includes an event fact", () => {
    expect(isStateCond({
      all: [
        { fact: "event.type", op: "eq", value: "craft_made" },
        { fact: "event.item", op: "eq", value: "bread" },
      ],
    })).toBe(false);
  });

  it("returns false for a not-wrapped event fact", () => {
    expect(isStateCond({ not: { fact: "event.id", op: "eq", value: "granary" } })).toBe(false);
  });

  it("returns true for an empty all (no event refs → vacuously state-only)", () => {
    // factIdsIn({all:[]}) = [] → no event. refs → isStateCond true
    expect(isStateCond({ all: [] })).toBe(true);
  });

  it("returns true for __never__ (no event refs)", () => {
    expect(isStateCond({ fact: "__never__" })).toBe(true);
  });
});

// ─── 4. condToTrigger — round-trip table ─────────────────────────────────────
//
// For every BeatTrigger type supported by beatTriggerToCond, we assert that
//   condToTrigger(beatTriggerToCond(t)) deep-equals t.
// For trigger types that beatTriggerToCond maps to __never__ (no real cond),
// we assert condToTrigger returns null.

describe("condToTrigger — round-trip", () => {
  function roundTrip(t: BeatTrigger) {
    return condToTrigger(beatTriggerToCond(t));
  }

  it("resource_total round-trips", () => {
    const t: BeatTrigger = { type: "resource_total", key: "flour", amount: 10 };
    expect(roundTrip(t)).toEqual(t);
  });

  it("resource_total_multi round-trips", () => {
    const t: BeatTrigger = {
      type: "resource_total_multi",
      req: { flour: 5, supplies: 3 },
    };
    expect(roundTrip(t)).toEqual(t);
  });

  it("resource_total_multi with empty req round-trips", () => {
    const t: BeatTrigger = { type: "resource_total_multi", req: {} };
    expect(roundTrip(t)).toEqual(t);
  });

  it("resource_total_multi without req key round-trips", () => {
    // beatTriggerToCond defaults req to {} when absent
    const t: BeatTrigger = { type: "resource_total_multi" };
    // The cond produced is {all:[]}, which round-trips back as resource_total_multi with req:{}
    // Normalise: t missing req → condToTrigger should return {type, req:{}}
    const result = roundTrip(t);
    expect(result).toEqual({ type: "resource_total_multi", req: {} });
  });

  it("flag_set round-trips", () => {
    const t: BeatTrigger = { type: "flag_set", flag: "intro_seen" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("flag_cleared round-trips", () => {
    const t: BeatTrigger = { type: "flag_cleared", flag: "intro_seen" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("session_start round-trips", () => {
    const t: BeatTrigger = { type: "session_start" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("session_ended round-trips", () => {
    const t: BeatTrigger = { type: "session_ended" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("act_entered round-trips", () => {
    const t: BeatTrigger = { type: "act_entered", act: 2 };
    expect(roundTrip(t)).toEqual(t);
  });

  it("craft_made round-trips (with explicit count)", () => {
    const t: BeatTrigger = { type: "craft_made", item: "iron_hinge", count: 2 };
    expect(roundTrip(t)).toEqual(t);
  });

  it("craft_made round-trips (count defaults to 1 and is preserved)", () => {
    // beatTriggerToCond fills in count:1 when absent; condToTrigger must return count:1
    const t: BeatTrigger = { type: "craft_made", item: "bread" };
    const result = roundTrip(t);
    expect(result).toEqual({ type: "craft_made", item: "bread", count: 1 });
  });

  it("building_built round-trips", () => {
    const t: BeatTrigger = { type: "building_built", id: "granary" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("order_fulfilled round-trips (with explicit count)", () => {
    const t: BeatTrigger = { type: "order_fulfilled", count: 3 };
    expect(roundTrip(t)).toEqual(t);
  });

  it("order_fulfilled round-trips (count defaults to 1 and is preserved)", () => {
    const t: BeatTrigger = { type: "order_fulfilled" };
    const result = roundTrip(t);
    expect(result).toEqual({ type: "order_fulfilled", count: 1 });
  });

  it("keeper_confronted round-trips (no zoneId/path)", () => {
    const t: BeatTrigger = { type: "keeper_confronted" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("keeper_confronted round-trips (with zoneId)", () => {
    const t: BeatTrigger = { type: "keeper_confronted", zoneId: "home" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("keeper_confronted round-trips (with path)", () => {
    const t: BeatTrigger = { type: "keeper_confronted", path: "coexist" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("keeper_confronted round-trips (with zoneId and path)", () => {
    const t: BeatTrigger = {
      type: "keeper_confronted",
      zoneId: "home",
      path: "coexist",
    };
    expect(roundTrip(t)).toEqual(t);
  });

  it("boss_defeated round-trips", () => {
    const t: BeatTrigger = { type: "boss_defeated", id: "frostmaw" };
    expect(roundTrip(t)).toEqual(t);
  });

  it("all_buildings_built round-trips", () => {
    const t: BeatTrigger = { type: "all_buildings_built" };
    expect(roundTrip(t)).toEqual(t);
  });

  // Default/sentinel case: unknown types map to __never__, condToTrigger → null
  it("returns null for __never__ (unknown trigger types)", () => {
    expect(condToTrigger({ fact: "__never__" })).toBeNull();
  });
});

// ─── condToTrigger — null cases ───────────────────────────────────────────────

describe("condToTrigger — returns null for unrecognised shapes", () => {
  it("returns null for a hand-authored composite cond", () => {
    expect(
      condToTrigger({
        all: [
          { fact: "flag.intro_seen" },
          { fact: "resource.flour.total", op: "gte", value: 5 },
        ],
      }),
    ).toBeNull();
  });

  it("returns null for a bare resource total leaf (not an all)", () => {
    // resource_total must be a leaf — but a raw leaf is only resource_total
    // when it follows the exact pattern; a random leaf is returned as resource_total
    // only if it matches that pattern. A leaf with a non-resource prefix → null.
    expect(condToTrigger({ fact: "npc.elara.bond", op: "gte", value: 5 })).toBeNull();
  });

  it("returns null for a not-wrapped non-flag cond", () => {
    expect(condToTrigger({ not: { fact: "resource.flour.total", op: "gte", value: 1 } })).toBeNull();
  });

  it("returns null for an any cond (not emitted by beatTriggerToCond)", () => {
    expect(condToTrigger({ any: [{ fact: "flag.a" }, { fact: "flag.b" }] })).toBeNull();
  });
});
