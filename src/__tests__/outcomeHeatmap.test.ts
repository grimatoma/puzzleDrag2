import { describe, it, expect } from "vitest";
import { computeOutcomeHeatmap, OUTCOME_BUCKETS } from "../storyEditor/outcomeHeatmap.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("computeOutcomeHeatmap", () => {
  it("returns a structure with all five buckets defined", () => {
    const out = computeOutcomeHeatmap(emptyDraft());
    expect(out.buckets).toEqual(["act1", "act2", "act3", "side", "draft"]);
    for (const key of ["coins", "embers", "coreIngots", "gems", "setFlags", "clearFlags"]) {
      expect(out.counts[key]).toBeDefined();
      for (const bucket of OUTCOME_BUCKETS) {
        expect(out.counts[key][bucket]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("sums currency outcomes into the correct bucket (built-in act 1 choice)", () => {
    // Note: the override sanitizer only passes embers / coreIngots / gems /
    // bondDelta / setFlag / clearFlag / queueBeat through — `coins` is
    // supported by the runtime but not editable through balance.json.
    const baseline = computeOutcomeHeatmap(emptyDraft());
    const d = draftWith({
      beats: {
        act1_keeper_trial: {
          choices: [{ id: "x", label: "X", outcome: { embers: 3, gems: 2 } }],
        },
      },
    });
    const out = computeOutcomeHeatmap(d);
    expect(out.counts.embers.act1 - baseline.counts.embers.act1).toBe(3);
    expect(out.counts.gems.act1 - baseline.counts.gems.act1).toBe(2);
  });

  it("counts setFlag / clearFlag entries (single value + array forms)", () => {
    const baseline = computeOutcomeHeatmap(emptyDraft());
    const d = draftWith({
      beats: {
        act1_keeper_trial: {
          choices: [
            { id: "a", label: "A", outcome: { setFlag: ["x", "y"] } },
            { id: "b", label: "B", outcome: { setFlag: "z", clearFlag: ["m", "n"] } },
          ],
        },
      },
    });
    const out = computeOutcomeHeatmap(d);
    expect(out.counts.setFlags.act1 - baseline.counts.setFlags.act1).toBe(3);
    expect(out.counts.clearFlags.act1 - baseline.counts.clearFlags.act1).toBe(2);
  });

  it("records per-NPC bond deltas keyed by speaker", () => {
    const d = draftWith({
      beats: {
        act1_keeper_trial: {
          choices: [{ id: "a", label: "A", outcome: { bondDelta: { npc: "wren", amount: 2 } } }],
        },
      },
    });
    const out = computeOutcomeHeatmap(d);
    expect(out.bondPerNpc.wren.act1).toBeGreaterThanOrEqual(2);
  });

  it("counts total choices per bucket", () => {
    const baseline = computeOutcomeHeatmap(emptyDraft());
    const d = draftWith({
      beats: {
        act1_keeper_trial: {
          choices: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
        },
      },
    });
    const out = computeOutcomeHeatmap(d);
    expect(out.choiceCounts.act1 - baseline.choiceCounts.act1).toBe(2);
  });

  it("totals add up across every bucket", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_x", title: "X",
        lines: [{ speaker: null, text: "..." }],
        choices: [{ id: "go", label: "Go", outcome: { embers: 10 } }],
      }],
    });
    const out = computeOutcomeHeatmap(d);
    const sum = Object.values(out.counts.embers).reduce((s, v) => s + v, 0);
    expect(out.totals.embers).toBe(sum);
  });
});
