// Phase 1 — dialogue + choice schema: beatLines / beatChoices /
// stripSpeakerPrefix / applyChoiceOutcome, plus the STORY/PICK_CHOICE reducer.
import { describe, it, expect } from "vitest";
import {
  beatLines,
  beatChoices,
  beatIsContinueOnly,
  stripSpeakerPrefix,
  applyChoiceOutcome,
  STORY_BEATS,
} from "../story.js";
import { reduce as storyReduce } from "../features/story/slice.js";

describe("stripSpeakerPrefix", () => {
  it("removes a recognised speaker prefix and wrapping quotes", () => {
    expect(stripSpeakerPrefix("Wren: 'bring me hay'")).toBe("bring me hay");
    expect(stripSpeakerPrefix("Sister Liss: 'a child has fever.'")).toBe("a child has fever.");
  });
  it("leaves narration untouched", () => {
    expect(stripSpeakerPrefix("The larder is full.")).toBe("The larder is full.");
  });
  it("does not strip an unrecognised 'word:' prefix", () => {
    expect(stripSpeakerPrefix("Note: this stays")).toBe("Note: this stays");
  });
});

describe("beatLines", () => {
  it("projects a legacy body string into one clean line with a parsed speaker", () => {
    const lines = beatLines({ body: "Mira: 'Bake a loaf with me.'" });
    expect(lines).toEqual([{ speaker: "mira", text: "Bake a loaf with me." }]);
  });
  it("returns authored lines verbatim (with null speakers preserved)", () => {
    const beat = { lines: [{ speaker: null, text: "It is quiet." }, { speaker: "wren", text: "Too quiet." }] };
    expect(beatLines(beat)).toEqual([
      { speaker: null, text: "It is quiet." },
      { speaker: "wren", text: "Too quiet." },
    ]);
  });
  it("returns [] for a beat with neither lines nor body", () => {
    expect(beatLines({})).toEqual([]);
  });
  it("the migrated act1_arrival is a multi-line dialogue", () => {
    const arrival = STORY_BEATS.find((b) => b.id === "act1_arrival");
    const lines = beatLines(arrival);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.some((l) => l.speaker === "wren")).toBe(true);
  });
});

describe("beatChoices / beatIsContinueOnly", () => {
  it("a beat with no authored choices gets the implicit Continue choice", () => {
    const cs = beatChoices({ body: "x" });
    expect(cs).toEqual([{ id: "continue", label: "Continue", outcome: null }]);
    expect(beatIsContinueOnly({ body: "x" })).toBe(true);
  });
  it("authored choices are normalised (id/label/outcome)", () => {
    const cs = beatChoices({ choices: [{ id: "yes", label: "Help them" }, { label: "Turn away" }] });
    expect(cs[0]).toEqual({ id: "yes", label: "Help them", outcome: null });
    expect(cs[1].id).toBe("choice_1");
    expect(beatIsContinueOnly({ choices: [{ id: "yes", label: "y" }] })).toBe(false);
  });
});

describe("applyChoiceOutcome", () => {
  const base = () => ({
    coins: 100,
    inventory: { berry: 3 },
    npcs: { bonds: { wren: 5 } },
    story: { flags: {}, queuedBeat: null, beatQueue: [] },
  });

  it("is a no-op for a falsy outcome", () => {
    const s = base();
    expect(applyChoiceOutcome(s, null)).toBe(s);
  });
  it("sets and clears flags (string or array)", () => {
    const s = applyChoiceOutcome(base(), { setFlag: ["a", "b"], clearFlag: "c" });
    expect(s.story.flags).toEqual({ a: true, b: true, c: false });
  });
  it("applies a bond delta, clamped to 0..10", () => {
    expect(applyChoiceOutcome(base(), { bondDelta: { npc: "wren", amount: 3 } }).npcs.bonds.wren).toBe(8);
    expect(applyChoiceOutcome(base(), { bondDelta: { npc: "wren", amount: 99 } }).npcs.bonds.wren).toBe(10);
    expect(applyChoiceOutcome(base(), { bondDelta: { npc: "wren", amount: -99 } }).npcs.bonds.wren).toBe(0);
  });
  it("adds resources / coins, clamped at ≥ 0", () => {
    const s = applyChoiceOutcome(base(), { resources: { berry: -10, log: 4 }, coins: -1000 });
    expect(s.inventory.berry).toBe(0);
    expect(s.inventory.log).toBe(4);
    expect(s.coins).toBe(0);
  });
  it("queues a real beat by id", () => {
    const realId = STORY_BEATS[1].id;
    const s = applyChoiceOutcome(base(), { queueBeat: realId });
    expect(s.story.queuedBeat?.id).toBe(realId);
  });
  it("ignores an unknown queueBeat id", () => {
    const s = applyChoiceOutcome(base(), { queueBeat: "nope_not_a_beat" });
    expect(s.story.queuedBeat).toBeNull();
  });
});

describe("STORY/PICK_CHOICE reducer", () => {
  const choiceBeat = {
    id: "test_choice",
    act: 1,
    title: "A Fork",
    lines: [{ speaker: "wren", text: "Help them, or not?" }],
    choices: [
      { id: "help", label: "Help them", outcome: { setFlag: "helped", bondDelta: { npc: "wren", amount: 1 } } },
      { id: "refuse", label: "Turn away", outcome: { setFlag: "refused" } },
    ],
  };
  const baseState = () => ({
    coins: 0,
    inventory: {},
    npcs: { bonds: { wren: 5 } },
    story: { flags: {}, queuedBeat: choiceBeat, beatQueue: [], choiceLog: [], sandbox: false },
  });

  it("records the pick, applies the outcome, and dismisses the modal", () => {
    const s1 = storyReduce(baseState(), { type: "STORY/PICK_CHOICE", payload: { choiceId: "help" } });
    expect(s1.story.flags.helped).toBe(true);
    expect(s1.story.flags.refused).toBeUndefined();
    expect(s1.npcs.bonds.wren).toBe(6);
    expect(s1.story.queuedBeat).toBeNull();
    expect(s1.story.choiceLog).toHaveLength(1);
    expect(s1.story.choiceLog[0]).toMatchObject({ beatId: "test_choice", choiceId: "help" });
  });

  it("the other branch records 'refuse' and its outcome", () => {
    const s1 = storyReduce(baseState(), { type: "STORY/PICK_CHOICE", payload: { choiceId: "refuse" } });
    expect(s1.story.flags.refused).toBe(true);
    expect(s1.story.flags.helped).toBeUndefined();
    expect(s1.story.choiceLog[0].choiceId).toBe("refuse");
  });

  it("an unknown choiceId is a no-op", () => {
    const s = baseState();
    expect(storyReduce(s, { type: "STORY/PICK_CHOICE", payload: { choiceId: "nope" } })).toBe(s);
  });

  it("STORY/DISMISS_MODAL refuses to close a multi-choice beat", () => {
    const s = baseState();
    expect(storyReduce(s, { type: "STORY/DISMISS_MODAL" })).toBe(s);
  });

  it("STORY/DISMISS_MODAL closes a continue-only beat and logs the implicit pick", () => {
    const s = { ...baseState(), story: { ...baseState().story, queuedBeat: { id: "plain", body: "Wren: 'hi'" } } };
    const s1 = storyReduce(s, { type: "STORY/DISMISS_MODAL" });
    expect(s1.story.queuedBeat).toBeNull();
    expect(s1.story.choiceLog[0]).toMatchObject({ beatId: "plain", choiceId: "continue" });
  });
});
