// Phase 2a — meta-currency containers (Embers / Core Ingots / gems / Heirlooms)
// and the applyChoiceOutcome wiring that grants them.
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { applyChoiceOutcome } from "../story.js";

describe("fresh state — meta-currency containers", () => {
  it("seeds embers / coreIngots / gems at 0", () => {
    const s = createInitialState();
    expect(s.embers).toBe(0);
    expect(s.coreIngots).toBe(0);
    expect(s.gems).toBe(0);
  });
  it("seeds the heirlooms map with the three token kinds at 0", () => {
    expect(createInitialState().heirlooms).toEqual({ heirloomSeed: 0, pactIron: 0, tidesingerPearl: 0 });
  });
});

describe("applyChoiceOutcome — meta-currency grants", () => {
  const base = () => ({ coins: 10, inventory: {}, story: { flags: {} }, embers: 0, coreIngots: 0, gems: 0, heirlooms: {} });

  it("grants embers / coreIngots / gems, clamped at ≥ 0", () => {
    const s = applyChoiceOutcome(base(), { embers: 5, coreIngots: 3, gems: 2 });
    expect(s.embers).toBe(5);
    expect(s.coreIngots).toBe(3);
    expect(s.gems).toBe(2);
    expect(applyChoiceOutcome({ ...base(), embers: 1 }, { embers: -10 }).embers).toBe(0);
  });

  it("grants heirloom tokens by key, clamped at ≥ 0", () => {
    const s = applyChoiceOutcome(base(), { heirlooms: { heirloomSeed: 1, pactIron: 2 } });
    expect(s.heirlooms).toEqual({ heirloomSeed: 1, pactIron: 2 });
    expect(applyChoiceOutcome({ ...base(), heirlooms: { pactIron: 1 } }, { heirlooms: { pactIron: -5 } }).heirlooms.pactIron).toBe(0);
  });

  it("ignores non-finite amounts", () => {
    const s = applyChoiceOutcome(base(), { embers: "lots", gems: null });
    expect(s.embers).toBe(0);
    expect(s.gems).toBe(0);
  });

  it("composes with the other outcome keys", () => {
    const s = applyChoiceOutcome(base(), { setFlag: "f", coins: 5, embers: 2 });
    expect(s.story.flags.f).toBe(true);
    expect(s.coins).toBe(15);
    expect(s.embers).toBe(2);
  });
});

describe("STORY/PICK_CHOICE with a meta-currency outcome", () => {
  it("a choice that grants embers updates state through the reducer", () => {
    const choiceBeat = {
      id: "test_embers",
      lines: [{ speaker: "wren", text: "Take this." }],
      choices: [{ id: "take", label: "Take it", outcome: { embers: 4 } }],
    };
    let s = { ...createInitialState(), story: { ...createInitialState().story, queuedBeat: choiceBeat } };
    s = rootReducer(s, { type: "STORY/PICK_CHOICE", payload: { choiceId: "take" } });
    expect(s.embers).toBe(4);
    expect(s.story.queuedBeat).toBeNull();
  });
});
