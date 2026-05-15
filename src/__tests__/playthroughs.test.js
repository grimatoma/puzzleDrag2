import { describe, it, expect } from "vitest";
import {
  simulatePlaythrough, simulateAllPlaythroughs, PLAYTHROUGH_STRATEGIES, strategyLabel,
} from "../storyEditor/playthroughs.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("simulatePlaythrough — strategy selection", () => {
  const d = draftWith({
    newBeats: [{
      id: "fork", title: "Fork", trigger: { type: "session_start" },
      lines: [{ speaker: null, text: "..." }],
      choices: [
        { id: "first", label: "First",
          outcome: { bondDelta: { npc: "wren", amount: 1 }, embers: 1 } },
        { id: "kind", label: "Kind",
          outcome: { bondDelta: { npc: "wren", amount: 5 } } },
        { id: "cruel", label: "Cruel",
          outcome: { bondDelta: { npc: "bram", amount: -8 } } },
        { id: "rich", label: "Rich",
          outcome: { coreIngots: 10 } },
        { id: "flagger", label: "Flag heavy",
          outcome: { setFlag: ["a", "b", "c"], clearFlag: "d" } },
      ],
    }],
  });

  it("first → picks index 0", () => {
    const out = simulatePlaythrough("fork", d, "first");
    expect(out.steps[0].chosen.id).toBe("first");
  });
  it("kindest → picks the choice with the largest positive bondDelta", () => {
    const out = simulatePlaythrough("fork", d, "kindest");
    expect(out.steps[0].chosen.id).toBe("kind");
  });
  it("cruelest → picks the choice with the most negative bondDelta", () => {
    const out = simulatePlaythrough("fork", d, "cruelest");
    expect(out.steps[0].chosen.id).toBe("cruel");
  });
  it("richest → picks the choice with the largest currency reward", () => {
    const out = simulatePlaythrough("fork", d, "richest");
    expect(out.steps[0].chosen.id).toBe("rich");
  });
  it("bargain → picks the choice with the most flag operations", () => {
    const out = simulatePlaythrough("fork", d, "bargain");
    expect(out.steps[0].chosen.id).toBe("flagger");
  });
  it("rejects unknown strategies", () => {
    expect(() => simulatePlaythrough("fork", d, "nope")).toThrow();
  });
});

describe("simulatePlaythrough — termination", () => {
  it("ends with 'ends-here' on a beat with no choices", () => {
    const d = draftWith({
      newBeats: [{ id: "end", title: "End", lines: [{ speaker: null, text: "fin" }],
        trigger: { type: "session_start" } }],
    });
    const out = simulatePlaythrough("end", d, "first");
    expect(out.terminalReason).toBe("ends-here");
    expect(out.steps).toHaveLength(1);
  });

  it("ends with 'no-target' when the chosen choice has no queueBeat", () => {
    const d = draftWith({
      newBeats: [{ id: "open", title: "Open", trigger: { type: "session_start" },
        lines: [{ speaker: null, text: "?" }],
        choices: [{ id: "x", label: "X", outcome: {} }] }],
    });
    expect(simulatePlaythrough("open", d, "first").terminalReason).toBe("no-target");
  });

  it("ends with 'loop' when the chain re-visits a beat", () => {
    const d = draftWith({
      newBeats: [{
        id: "loop", title: "Loop", trigger: { type: "session_start" },
        lines: [{ speaker: null, text: "..." }],
        choices: [{ id: "again", label: "Again", outcome: { queueBeat: "loop" } }],
      }],
    });
    expect(simulatePlaythrough("loop", d, "first").terminalReason).toBe("loop");
  });

  it("ends with 'missing-target' when queueBeat points at an unknown id", () => {
    const d = draftWith({
      newBeats: [{
        id: "send", title: "Send", trigger: { type: "session_start" },
        lines: [{ speaker: null, text: "..." }],
        choices: [{ id: "out", label: "Out", outcome: { queueBeat: "void" } }],
      }],
    });
    expect(simulatePlaythrough("send", d, "first").terminalReason).toBe("missing-target");
  });

  it("respects maxDepth", () => {
    // Linear chain longer than the cap.
    const beats = [];
    for (let i = 0; i < 10; i += 1) {
      beats.push({
        id: `b${i}`, title: `B${i}`, lines: [{ speaker: null, text: "..." }],
        ...(i === 0 ? { trigger: { type: "session_start" } } : {}),
        ...(i < 9 ? { choices: [{ id: "n", label: "N", outcome: { queueBeat: `b${i + 1}` } }] } : {}),
      });
    }
    const out = simulatePlaythrough("b0", draftWith({ newBeats: beats }), "first", { maxDepth: 3 });
    expect(out.terminalReason).toBe("depth-cap");
  });
});

describe("simulatePlaythrough — state aggregation", () => {
  it("accumulates flags + currency + bond across multiple steps", () => {
    const d = draftWith({
      newBeats: [
        { id: "a", title: "A", trigger: { type: "session_start" },
          lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "x", label: "X",
            outcome: { embers: 2, setFlag: "started", bondDelta: { npc: "wren", amount: 1 }, queueBeat: "b" } }] },
        { id: "b", title: "B", lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "y", label: "Y",
            outcome: { embers: 1, setFlag: "midway", bondDelta: { npc: "wren", amount: 2 }, queueBeat: "c" } }] },
        { id: "c", title: "C", lines: [{ speaker: null, text: "..." }],
          onComplete: { setFlag: "done" } },
      ],
    });
    const out = simulatePlaythrough("a", d, "first");
    expect(out.finalState.embers).toBe(3);
    expect(out.finalState.bonds.wren).toBe(3);
    expect(out.finalState.flagsSet).toEqual(["done", "midway", "started"]);
  });
});

describe("simulateAllPlaythroughs", () => {
  it("returns one simulation per known strategy with a friendly label", () => {
    const d = draftWith({
      newBeats: [{ id: "end", title: "End", lines: [{ speaker: null, text: "..." }],
        trigger: { type: "session_start" } }],
    });
    const out = simulateAllPlaythroughs("end", d);
    expect(out).toHaveLength(PLAYTHROUGH_STRATEGIES.length);
    expect(out.every((r) => typeof r.label === "string")).toBe(true);
  });
});

describe("strategyLabel", () => {
  it("returns a human label for known strategies", () => {
    expect(strategyLabel("first")).toBe("First choice");
    expect(strategyLabel("richest")).toBe("Richest path");
  });
  it("falls back to the raw key for unknown strategies", () => {
    expect(strategyLabel("zzz_unknown")).toBe("zzz_unknown");
  });
});
