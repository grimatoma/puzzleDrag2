import { describe, it, expect } from "vitest";
import { computeBondTimeline, totalAbsoluteBondDelta } from "../storyEditor/bondTimeline.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("computeBondTimeline", () => {
  it("returns one row per NPC referenced by any bondDelta", () => {
    const d = draftWith({
      newBeats: [{
        id: "b1", title: "B", trigger: { type: "session_start" },
        lines: [{ speaker: null, text: "..." }],
        choices: [
          { id: "kind", label: "Kind", outcome: { bondDelta: { npc: "wren", amount: 2 } } },
          { id: "cold", label: "Cold", outcome: { bondDelta: { npc: "bram", amount: -1 } } },
        ],
      }],
    });
    const out = computeBondTimeline(d);
    const wren = out.find((r) => r.npc === "wren");
    const bram = out.find((r) => r.npc === "bram");
    expect(wren).toBeTruthy();
    expect(bram).toBeTruthy();
  });

  it("computes running totals per stop", () => {
    const d = draftWith({
      newBeats: [{
        id: "b1", title: "B1", trigger: { type: "session_start" },
        lines: [{ speaker: null, text: "..." }],
        choices: [
          { id: "a", label: "+3", outcome: { bondDelta: { npc: "wren", amount: 3 } } },
          { id: "b", label: "-1", outcome: { bondDelta: { npc: "wren", amount: -1 } } },
          { id: "c", label: "+2", outcome: { bondDelta: { npc: "wren", amount: 2 } } },
        ],
      }],
    });
    const wren = computeBondTimeline(d).find((r) => r.npc === "wren");
    expect(wren.stops.map((s) => s.running)).toEqual([3, 2, 4]);
    expect(wren.total).toBe(4);
    expect(wren.max).toBe(4);
    expect(wren.min).toBe(0);
  });

  it("orders stops by act (then alphabetical beat id) — Act I before II before III before side", () => {
    const d = draftWith({
      newBeats: [
        { id: "ax_side", title: "side", lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "x", label: "x", outcome: { bondDelta: { npc: "wren", amount: 1 } } }] },
      ],
      beats: {
        // Patch a built-in Act III beat to add a bond-delta choice.
        act3_caravan: { choices: [{ id: "kind", label: "Kind", outcome: { bondDelta: { npc: "wren", amount: 1 } } }] },
        // And a built-in Act I beat.
        act1_keeper_trial: { choices: [{ id: "kind", label: "Kind", outcome: { bondDelta: { npc: "wren", amount: 1 } } }] },
      },
    });
    const wren = computeBondTimeline(d).find((r) => r.npc === "wren");
    const beatOrder = wren.stops.map((s) => s.beatId);
    // act1 < act3 < side draft
    expect(beatOrder.indexOf("act1_keeper_trial")).toBeLessThan(beatOrder.indexOf("act3_caravan"));
    expect(beatOrder.indexOf("act3_caravan")).toBeLessThan(beatOrder.indexOf("ax_side"));
  });

  it("ignores choices without a bondDelta and zero-amount deltas", () => {
    const d = draftWith({
      newBeats: [{
        id: "b1", title: "B", trigger: { type: "session_start" },
        lines: [{ speaker: null, text: "..." }],
        choices: [
          { id: "ok", label: "OK", outcome: {} },
          { id: "zero", label: "Z", outcome: { bondDelta: { npc: "wren", amount: 0 } } },
        ],
      }],
    });
    const wren = computeBondTimeline(d).find((r) => r.npc === "wren");
    expect(wren).toBeUndefined();
  });

  it("returns rows for the default (built-in only) draft without crashing", () => {
    const out = computeBondTimeline(emptyDraft());
    expect(Array.isArray(out)).toBe(true);
  });
});

describe("totalAbsoluteBondDelta", () => {
  it("sums the absolute amounts of every stop across every NPC", () => {
    const baseline = totalAbsoluteBondDelta(computeBondTimeline(emptyDraft()));
    const d = draftWith({
      newBeats: [{
        id: "b1", title: "B", trigger: { type: "session_start" },
        lines: [{ speaker: null, text: "..." }],
        choices: [
          { id: "a", label: "a", outcome: { bondDelta: { npc: "wren", amount: 2 } } },
          { id: "b", label: "b", outcome: { bondDelta: { npc: "bram", amount: -3 } } },
        ],
      }],
    });
    expect(totalAbsoluteBondDelta(computeBondTimeline(d)) - baseline).toBe(5);
  });
});
