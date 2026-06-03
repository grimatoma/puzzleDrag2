// src/__tests__/progression-engine.test.ts
import { describe, it, expect } from "vitest";
import { evaluate, describeCond, factIdsIn } from "../config/progression/conditions.js";
import type { Cond, FactSnapshot } from "../config/progression/types.js";

const snap: FactSnapshot = {
  "level": 2,
  "flag.mine_unlocked": true,
  "resource.supplies.total": 3,
  "building.pit_props.built": false,
};

describe("evaluate", () => {
  it("truthy leaf (default op) reads fact set-ness", () => {
    expect(evaluate({ fact: "flag.mine_unlocked" }, snap)).toBe(true);
    expect(evaluate({ fact: "building.pit_props.built" }, snap)).toBe(false);
    expect(evaluate({ fact: "flag.absent" }, snap)).toBe(false);
  });
  it("comparison ops", () => {
    expect(evaluate({ fact: "level", op: "gte", value: 2 }, snap)).toBe(true);
    expect(evaluate({ fact: "level", op: "gt", value: 2 }, snap)).toBe(false);
    expect(evaluate({ fact: "resource.supplies.total", op: "lt", value: 5 }, snap)).toBe(true);
    expect(evaluate({ fact: "level", op: "eq", value: 2 }, snap)).toBe(true);
    expect(evaluate({ fact: "level", op: "ne", value: 3 }, snap)).toBe(true);
  });
  it("all / any / not", () => {
    const when: Cond = { all: [
      { fact: "resource.supplies.total", op: "gte", value: 3 },
      { any: [ { fact: "building.pit_props.built" }, { fact: "level", op: "gte", value: 2 } ] },
    ]};
    expect(evaluate(when, snap)).toBe(true);
    expect(evaluate({ not: { fact: "flag.mine_unlocked" } }, snap)).toBe(false);
  });
  it("missing fact compares as not-satisfied (no throw)", () => {
    expect(evaluate({ fact: "resource.ghost.total", op: "gte", value: 1 }, snap)).toBe(false);
  });
});

describe("factIdsIn", () => {
  it("collects every fact id referenced in a tree", () => {
    const when: Cond = { all: [ { fact: "a" }, { any: [ { fact: "b" }, { not: { fact: "c" } } ] } ] };
    expect(factIdsIn(when).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("describeCond", () => {
  it("renders a human-readable summary", () => {
    expect(describeCond({ fact: "level", op: "gte", value: 2 })).toBe("level ≥ 2");
    expect(describeCond({ all: [ { fact: "a" }, { fact: "b" } ] })).toBe("(a AND b)");
    expect(describeCond({ not: { fact: "x" } })).toBe("NOT x");
  });
});

import { isKnownFact, FACT_FAMILIES } from "../config/progression/facts.js";

describe("isKnownFact", () => {
  it("accepts parameterised families", () => {
    expect(isKnownFact("resource.bread.total")).toBe(true);
    expect(isKnownFact("building.granary.built")).toBe(true);
    expect(isKnownFact("flag.met_keeper")).toBe(true);
    expect(isKnownFact("zone.quarry.founded")).toBe(true);
    expect(isKnownFact("level")).toBe(true);
    expect(isKnownFact("npc.bram.bond")).toBe(true);
  });
  it("rejects unknown facts", () => {
    expect(isKnownFact("totally.made.up")).toBe(false);
    expect(isKnownFact("resource.bread")).toBe(false); // missing .total
  });
  it("FACT_FAMILIES is non-empty", () => {
    expect(FACT_FAMILIES.length).toBeGreaterThan(5);
  });
});
