// M4 — GameState→FactSnapshot projector + declarative-gate coherence.
//
// Proves the Phase-2 bridge: a feature gate written as DATA (a ProgTrigger.when)
// can be evaluated against the real game state — including the resource-prereq
// gates that previously had no declarative form ("unlock after 50 flour").

import { describe, it, expect } from "vitest";
import { createInitialState } from "../../state.js";
import type { GameState } from "../../types/state.js";
import { factsFromGameState } from "./factSnapshot.js";
import { evaluate, factIdsIn } from "./conditions.js";
import { isKnownFact } from "./facts.js";
import { PROGRESSION_TRIGGERS } from "./triggers.js";
import type { Cond } from "./types.js";

function withHomeInventory(items: Record<string, number>): GameState {
  const s = createInitialState();
  s.inventory = { ...s.inventory, home: { ...(s.inventory?.home as Record<string, number> ?? {}), ...items } };
  return s;
}

describe("factsFromGameState — projection", () => {
  it("projects inventory totals, built buildings, founded zones, and scalars", () => {
    const s = withHomeInventory({ flour: 12, eggs: 3 });
    s.built = { ...s.built, home: { ...(s.built?.home ?? {}), granary: true, _plots: { 0: "granary" } } };
    const f = factsFromGameState(s);

    expect(f["resource.flour.total"]).toBe(12);
    expect(f["resource.eggs.total"]).toBe(3);
    expect(f["building.granary.built"]).toBe(true);
    expect(f["building._plots.built"]).toBeUndefined(); // bookkeeping key skipped
    expect(f["zone.home.founded"]).toBe(true);           // home is founded at start
    expect(typeof f["level"]).toBe("number");
  });

  it("sums a resource held across multiple zones", () => {
    const s = createInitialState();
    s.inventory = { ...s.inventory, home: { flour: 20 }, meadow: { flour: 35 } };
    expect(factsFromGameState(s)["resource.flour.total"]).toBe(55);
  });

  it("threads an event into event.* facts", () => {
    const f = factsFromGameState(createInitialState(), { type: "building_built", id: "mill" });
    expect(f["event.type"]).toBe("building_built");
    expect(f["event.id"]).toBe("mill");
    expect(f["event.count"]).toBe(1); // oracle parity default
  });
});

describe("declarative gates — data, evaluated against the projector", () => {
  it("a resource-prerequisite gate ('unlock after 50 flour') flips at exactly 50", () => {
    const gate: Cond = { fact: "resource.flour.total", op: "gte", value: 50 };
    expect(evaluate(gate, factsFromGameState(withHomeInventory({ flour: 49 })))).toBe(false);
    expect(evaluate(gate, factsFromGameState(withHomeInventory({ flour: 50 })))).toBe(true);
  });

  it("a compound gate (build the mill AND hold 6 bread) composes natively", () => {
    const gate: Cond = {
      all: [
        { fact: "building.mill.built" },
        { fact: "resource.bread.total", op: "gte", value: 6 },
      ],
    };
    const s = withHomeInventory({ bread: 6 });
    s.built = { ...s.built, home: { ...(s.built?.home ?? {}), mill: true } };
    expect(evaluate(gate, factsFromGameState(s))).toBe(true);
    expect(evaluate(gate, factsFromGameState(withHomeInventory({ bread: 6 })))).toBe(false); // mill not built
  });
});

describe("coherence — trigger spine ↔ fact vocabulary ↔ projector", () => {
  it("every fact referenced by a progression trigger is a KNOWN fact (no orphans/typos)", () => {
    for (const t of PROGRESSION_TRIGGERS) {
      for (const fact of factIdsIn(t.when)) {
        expect(isKnownFact(fact), `${t.id} references unknown fact "${fact}"`).toBe(true);
      }
    }
  });

  it("a WIRED state trigger fires once the projector reports its fact", () => {
    const granary = PROGRESSION_TRIGGERS.find((t) => t.id === "build_granary")!;
    const bare = createInitialState();
    expect(evaluate(granary.when, factsFromGameState(bare))).toBe(false);
    const built = createInitialState();
    built.built = { ...built.built, home: { ...(built.built?.home ?? {}), granary: true } };
    expect(evaluate(granary.when, factsFromGameState(built))).toBe(true);
  });
});
