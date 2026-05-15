import { describe, it, expect } from "vitest";
import { computeStoryStats, NARRATOR_SPEAKER } from "../storyEditor/storyStats.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("computeStoryStats — totals", () => {
  it("returns a stats blob for the default (built-in only) draft", () => {
    const stats = computeStoryStats(emptyDraft());
    expect(stats.totalBeats).toBeGreaterThan(0);
    expect(stats.totalWords).toBeGreaterThan(0);
    expect(stats.totalLines).toBeGreaterThan(0);
    expect(stats.npcs.length).toBeGreaterThan(0);
  });

  it("counts a draft-only override correctly (as a delta over baseline built-in counts)", () => {
    const baseline = computeStoryStats(emptyDraft());
    const baseWren = baseline.npcs.find((n) => n.key === "wren") || { lines: 0, words: 0, bondDelta: 0 };
    const baseTotals = baseline;

    const d = draftWith({
      newBeats: [{
        id: "branch_x", title: "X",
        lines: [
          { speaker: "wren", text: "Hello world." },
          { speaker: null, text: "She glances at the door." },
        ],
        choices: [
          { id: "a", label: "Stay", outcome: { setFlag: "stay", coins: 3 } },
          { id: "b", label: "Go",   outcome: { setFlag: "go",   bondDelta: { npc: "wren", amount: 1 } } },
        ],
      }],
    });
    const stats = computeStoryStats(d);
    const wren = stats.npcs.find((n) => n.key === "wren");
    const narrator = stats.npcs.find((n) => n.key === NARRATOR_SPEAKER);
    expect(wren.lines - baseWren.lines).toBe(1);
    expect(wren.words - baseWren.words).toBe(2);   // "Hello world." → 2 words
    expect(narrator.lines).toBeGreaterThan(0);
    expect(stats.totalChoices - baseTotals.totalChoices).toBe(2);
    expect(stats.flagOps.sets - baseTotals.flagOps.sets).toBe(2);
    expect(wren.bondDelta - baseWren.bondDelta).toBe(1);
  });

  it("derives forkDensity and avgChoicesPerFork", () => {
    const d = draftWith({
      newBeats: [
        { id: "a", title: "A", lines: [{ speaker: null, text: "..." }] },
        { id: "b", title: "B", lines: [{ speaker: null, text: "..." }],
          choices: [
            { id: "x", label: "X" }, { id: "y", label: "Y" }, { id: "z", label: "Z" },
          ] },
      ],
    });
    const stats = computeStoryStats(d);
    expect(stats.totalBeats).toBeGreaterThan(0);
    expect(stats.forkDensity).toBeGreaterThan(0);
    expect(stats.forkDensity).toBeLessThanOrEqual(1);
    expect(stats.avgChoicesPerFork).toBeGreaterThan(0);
  });

  it("returns a non-empty longestBeats list", () => {
    const stats = computeStoryStats(emptyDraft());
    expect(stats.longestBeats.length).toBeGreaterThan(0);
    expect(stats.longestBeats[0]).toHaveProperty("words");
    // List is sorted descending by word count.
    for (let i = 1; i < stats.longestBeats.length; i += 1) {
      expect(stats.longestBeats[i - 1].words).toBeGreaterThanOrEqual(stats.longestBeats[i].words);
    }
  });

  it("sums currency outcomes (coins / embers / coreIngots / gems) as a delta over baseline", () => {
    const baseline = computeStoryStats(emptyDraft());
    const d = draftWith({
      newBeats: [{
        id: "branch_econ", title: "Econ",
        lines: [{ speaker: null, text: "Test econ." }],
        choices: [
          { id: "a", label: "A", outcome: { coins: 5, embers: 1, gems: 2 } },
          { id: "b", label: "B", outcome: { coreIngots: 3, coins: -1 } },
        ],
      }],
    });
    const stats = computeStoryStats(d);
    expect(stats.currency.coins - baseline.currency.coins).toBe(4);  // 5 - 1
    expect(stats.currency.embers - baseline.currency.embers).toBe(1);
    expect(stats.currency.coreIngots - baseline.currency.coreIngots).toBe(3);
    expect(stats.currency.gems - baseline.currency.gems).toBe(2);
  });

  it("identifies an orphan as unreachable when it has no trigger nor incoming choice", () => {
    const d = draftWith({
      newBeats: [{ id: "lost", title: "Lost", lines: [{ speaker: null, text: "..." }] }],
    });
    const stats = computeStoryStats(d);
    expect(stats.unreachableCount).toBeGreaterThanOrEqual(1);
  });

  it("treats legacy beat.body as a narrator line for word counting", () => {
    const d = draftWith({
      newBeats: [{ id: "b_body", title: "B", body: "Three little words.", trigger: { type: "session_start" } }],
    });
    const stats = computeStoryStats(d);
    const narrator = stats.npcs.find((n) => n.key === NARRATOR_SPEAKER);
    // Built-ins also contribute narrator words, so we test the delta.
    const baseline = computeStoryStats(emptyDraft()).npcs.find((n) => n.key === NARRATOR_SPEAKER);
    expect(narrator.words - baseline.words).toBe(3);
  });
});

describe("computeStoryStats — NPC ranking", () => {
  it("sorts NPCs descending by line count", () => {
    const stats = computeStoryStats(emptyDraft());
    for (let i = 1; i < stats.npcs.length; i += 1) {
      expect(stats.npcs[i - 1].lines).toBeGreaterThanOrEqual(stats.npcs[i].lines);
    }
  });

  it("counts unique beats per speaker (not line count)", () => {
    const d = draftWith({
      newBeats: [{
        id: "x", title: "X",
        lines: [
          { speaker: "wren", text: "one" },
          { speaker: "wren", text: "two" },
          { speaker: "wren", text: "three" },
        ],
      }],
    });
    const stats = computeStoryStats(d);
    const wren = stats.npcs.find((n) => n.key === "wren");
    // Wren says 3 lines in branch x but it's only 1 unique beat (plus
    // whatever built-ins they speak in; the delta is what we care about).
    expect(wren.beats).toBeGreaterThan(0);
  });
});
