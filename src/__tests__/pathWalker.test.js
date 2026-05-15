import { describe, it, expect } from "vitest";
import { enumerateStoryPaths, summarisePaths } from "../storyEditor/pathWalker.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("enumerateStoryPaths", () => {
  it("returns no paths when the start beat does not exist", () => {
    const out = enumerateStoryPaths("nope", emptyDraft());
    expect(out.paths).toEqual([]);
    expect(out.truncated).toBe(false);
  });

  it("terminates a no-choices beat with reason 'ends-here'", () => {
    const d = draftWith({
      newBeats: [{ id: "end", title: "End", lines: [{ speaker: null, text: "..." }] }],
    });
    const out = enumerateStoryPaths("end", d);
    expect(out.paths).toHaveLength(1);
    expect(out.paths[0]).toMatchObject({
      beats: ["end"],
      choices: [],
      terminalBeat: "end",
      terminalReason: "ends-here",
    });
  });

  it("walks a linear fork — start → middle → leaf — with correct effect aggregation", () => {
    const d = draftWith({
      newBeats: [
        { id: "start", title: "Start", lines: [{ speaker: null, text: "go?" }],
          choices: [{ id: "yes", label: "Yes", outcome: { coins: 5, setFlag: "started", queueBeat: "middle" } }] },
        { id: "middle", title: "Middle", lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "ok", label: "OK", outcome: { embers: 1, bondDelta: { npc: "wren", amount: 2 }, queueBeat: "end" } }] },
        { id: "end", title: "End", lines: [{ speaker: null, text: "fin" }],
          onComplete: { setFlag: "ended" } },
      ],
    });
    const out = enumerateStoryPaths("start", d);
    expect(out.paths).toHaveLength(1);
    const path = out.paths[0];
    expect(path.beats).toEqual(["start", "middle", "end"]);
    expect(path.choices.map((c) => c.choiceId)).toEqual(["yes", "ok"]);
    expect(path.terminalBeat).toBe("end");
    expect(path.terminalReason).toBe("ends-here");
    expect(path.effects.coins).toBe(5);
    expect(path.effects.embers).toBe(1);
    expect(path.effects.bondDeltas.wren).toBe(2);
    expect(path.effects.flagsSet).toEqual(["ended", "started"].sort());
  });

  it("forks at a branching beat — produces one path per top-level choice", () => {
    const d = draftWith({
      newBeats: [
        { id: "split", title: "Split", lines: [{ speaker: null, text: "..." }],
          choices: [
            { id: "a", label: "A", outcome: { setFlag: "a", queueBeat: "left" } },
            { id: "b", label: "B", outcome: { setFlag: "b", queueBeat: "right" } },
          ] },
        { id: "left", title: "Left", lines: [{ speaker: null, text: "L" }] },
        { id: "right", title: "Right", lines: [{ speaker: null, text: "R" }] },
      ],
    });
    const out = enumerateStoryPaths("split", d);
    expect(out.paths.map((p) => p.terminalBeat).sort()).toEqual(["left", "right"]);
    for (const p of out.paths) {
      expect(p.beats[0]).toBe("split");
      expect(p.choices).toHaveLength(1);
    }
  });

  it("marks a loop terminal when a choice queues a beat already on the path", () => {
    const d = draftWith({
      newBeats: [{
        id: "loop", title: "Loop", lines: [{ speaker: null, text: "again" }],
        choices: [{ id: "again", label: "Again", outcome: { queueBeat: "loop" } }],
      }],
    });
    const out = enumerateStoryPaths("loop", d);
    expect(out.paths.some((p) => p.terminalReason === "loop")).toBe(true);
  });

  it("uses the 'no-target' reason when a choice has no queueBeat", () => {
    const d = draftWith({
      newBeats: [{
        id: "open", title: "Open", lines: [{ speaker: null, text: "?" }],
        choices: [{ id: "blank", label: "Open ending", outcome: { setFlag: "left_open" } }],
      }],
    });
    const out = enumerateStoryPaths("open", d);
    expect(out.paths[0].terminalReason).toBe("no-target");
    expect(out.paths[0].effects.flagsSet).toEqual(["left_open"]);
  });

  it("respects maxPaths and reports truncated=true when exceeded", () => {
    // Build a binary tree with depth 6 = 64 leaves; the maxPaths default
    // is 64, so a slightly deeper tree truncates.
    const beats = [];
    function build(id, depth) {
      if (depth === 8) { beats.push({ id, title: id, lines: [{ speaker: null, text: "end" }] }); return; }
      const left = `${id}_L`, right = `${id}_R`;
      beats.push({
        id, title: id, lines: [{ speaker: null, text: id }],
        choices: [
          { id: "l", label: "L", outcome: { queueBeat: left } },
          { id: "r", label: "R", outcome: { queueBeat: right } },
        ],
      });
      build(left, depth + 1);
      build(right, depth + 1);
    }
    build("root", 0);
    const d = draftWith({ newBeats: beats });
    const out = enumerateStoryPaths("root", d, { maxPaths: 4, maxDepth: 20 });
    expect(out.paths).toHaveLength(4);
    expect(out.truncated).toBe(true);
  });

  it("respects maxDepth and emits a 'depth-cap' terminal", () => {
    const d = draftWith({
      newBeats: [
        { id: "a", title: "A", lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "n", label: "N", outcome: { queueBeat: "b" } }] },
        { id: "b", title: "B", lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "n", label: "N", outcome: { queueBeat: "c" } }] },
        { id: "c", title: "C", lines: [{ speaker: null, text: "..." }] },
      ],
    });
    const out = enumerateStoryPaths("a", d, { maxDepth: 2 });
    // 'a' counts as depth 1; after walking to 'b' we'd be at depth 2 which
    // is the cap. So the choice from 'b' shouldn't fire and we expect a
    // depth-cap terminal at 'b'.
    expect(out.paths.some((p) => p.terminalReason === "depth-cap" && p.terminalBeat === "b")).toBe(true);
  });
});

describe("summarisePaths", () => {
  it("produces a friendly summary", () => {
    expect(summarisePaths({ paths: [], truncated: false })).toMatch(/0 paths/);
    expect(summarisePaths({ paths: [{}], truncated: false })).toMatch(/1 path/);
    expect(summarisePaths({ paths: [{}, {}, {}], truncated: true })).toMatch(/3 paths \(truncated\)/);
  });
});
