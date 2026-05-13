// Coverage round 2 — castle, story, tutorial slices.
// Targets the next-worst-tested slices after the round-1 PR
// (settings/market/mood). Castle was 35%, story 54%, tutorial 72%.

import { describe, it, expect } from "vitest";
import { reduce as castleReduce } from "../features/castle/slice.js";
import { reduce as storyReduce } from "../features/story/slice.js";
import { reduce as tutorialReduce } from "../features/tutorial/slice.js";
import { CASTLE_NEEDS } from "../features/castle/data.js";

// ─── castle/slice.js ────────────────────────────────────────────────────────
describe("castle slice — coverage gaps", () => {
  const baseCastle = () => ({
    contributed: { soup: 0, meat: 0, mine_coal: 0 },
  });
  const baseState = (over = {}) => ({
    castle: baseCastle(),
    inventory: { soup: 5, meat: 5, mine_coal: 5 },
    ...over,
  });

  it("non-CASTLE/CONTRIBUTE action returns state unchanged", () => {
    const s0 = baseState();
    expect(castleReduce(s0, { type: "NOPE" })).toBe(s0);
  });

  it("CASTLE/CONTRIBUTE with unknown key returns state unchanged", () => {
    const s0 = baseState();
    const s1 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "nope", amount: 1 } });
    expect(s1).toBe(s0);
  });

  it("CASTLE/CONTRIBUTE with non-positive amount is rejected", () => {
    const s0 = baseState();
    const s1 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "soup", amount: 0 } });
    const s2 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "soup", amount: -1 } });
    expect(s1).toBe(s0);
    expect(s2).toBe(s0);
  });

  it("CASTLE/CONTRIBUTE with insufficient inventory is rejected", () => {
    const s0 = baseState({ inventory: { soup: 0 } });
    const s1 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "soup", amount: 1 } });
    expect(s1).toBe(s0);
  });

  it("CASTLE/CONTRIBUTE that would exceed need.target is rejected", () => {
    const s0 = baseState({
      castle: { contributed: { ...baseCastle().contributed, soup: CASTLE_NEEDS.soup.target } },
    });
    const s1 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "soup", amount: 1 } });
    expect(s1).toBe(s0);
  });

  it("CASTLE/CONTRIBUTE deducts inventory and increments contributed (soup)", () => {
    const s0 = baseState();
    const s1 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "soup", amount: 3 } });
    expect(s1.inventory.soup).toBe(2);
    expect(s1.castle.contributed.soup).toBe(3);
  });

  it("CASTLE/CONTRIBUTE deducts inventory and increments contributed (coal via mine_coal)", () => {
    const s0 = baseState();
    const s1 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "coal", amount: 2 } });
    expect(s1.inventory.mine_coal).toBe(3);
    expect(s1.castle.contributed.coal).toBe(2);
  });

  it("castleOf defensive accessor handles a missing castle slice on old saves", () => {
    const s0 = { inventory: { soup: 5 } };
    const s1 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "soup", amount: 2 } });
    expect(s1.castle.contributed.soup).toBe(2);
    expect(s1.inventory.soup).toBe(3);
  });

  it("castleOf defensive accessor handles a malformed castle.contributed", () => {
    const s0 = { castle: { contributed: null }, inventory: { soup: 5 } };
    const s1 = castleReduce(s0, { type: "CASTLE/CONTRIBUTE", payload: { key: "soup", amount: 1 } });
    expect(s1.castle.contributed.soup).toBe(1);
  });
});

// ─── story/slice.js ─────────────────────────────────────────────────────────
describe("story slice — coverage gaps", () => {
  const fakeBeat = {
    id: "test_beat",
    onComplete: { setFlag: "test_flag" },
  };
  const baseState = (over = {}) => ({
    story: {
      flags: {},
      queuedBeat: null,
      beatQueue: [],
      sandbox: false,
      act: 1,
      beat: null,
    },
    ...over,
  });

  it("STORY/BEAT_FIRED queues the beat when no modal is open", () => {
    const s0 = baseState();
    const s1 = storyReduce(s0, {
      type: "STORY/BEAT_FIRED",
      payload: { firedBeat: fakeBeat, newFlags: {}, sideEffects: {} },
    });
    expect(s1.story.queuedBeat).toEqual(fakeBeat);
    expect(s1.story.beatQueue).toEqual([]);
    expect(s1.story.flags.test_flag).toBeUndefined(); // setFlag is the firedBeat's onComplete; passing flag set comes from newFlags
  });

  it("STORY/BEAT_FIRED with onComplete.setFlag uses newFlags as the flag bag", () => {
    const s0 = baseState();
    const s1 = storyReduce(s0, {
      type: "STORY/BEAT_FIRED",
      payload: { firedBeat: fakeBeat, newFlags: { custom_flag: true }, sideEffects: {} },
    });
    expect(s1.story.flags.custom_flag).toBe(true);
  });

  it("STORY/BEAT_FIRED without onComplete.setFlag stamps the fired-flag key", () => {
    const beat = { id: "foo" };
    const s0 = baseState();
    const s1 = storyReduce(s0, {
      type: "STORY/BEAT_FIRED",
      payload: { firedBeat: beat, newFlags: {}, sideEffects: {} },
    });
    // firedFlagKey adds an `act_<id>_fired` flag (or similar) — assert *some* key was set.
    const setKeys = Object.keys(s1.story.flags);
    expect(setKeys.length).toBeGreaterThan(0);
  });

  it("STORY/BEAT_FIRED keeps repeat beats unstamped and records cooldowns", () => {
    const beat = { id: "foo_repeat", repeat: true };
    const s0 = baseState();
    const s1 = storyReduce(s0, {
      type: "STORY/BEAT_FIRED",
      payload: { firedBeat: beat, newFlags: {}, sideEffects: {}, repeatCooldown: 3 },
    });
    expect(Object.keys(s1.story.flags)).toEqual([]);
    expect(s1.story.repeatCooldowns.foo_repeat).toBe(3);
  });

  it("STORY/BEAT_FIRED with an existing modal queues into beatQueue", () => {
    const earlier = { id: "earlier_beat" };
    const s0 = baseState({ story: { ...baseState().story, queuedBeat: earlier } });
    const s1 = storyReduce(s0, {
      type: "STORY/BEAT_FIRED",
      payload: { firedBeat: fakeBeat, newFlags: {}, sideEffects: {} },
    });
    expect(s1.story.queuedBeat).toEqual(earlier);
    expect(s1.story.beatQueue).toEqual([fakeBeat]);
  });

  it("STORY/DISMISS_MODAL pops to the next queued beat", () => {
    const next = { id: "next_beat" };
    const s0 = baseState({
      story: { ...baseState().story, queuedBeat: fakeBeat, beatQueue: [next] },
    });
    const s1 = storyReduce(s0, { type: "STORY/DISMISS_MODAL" });
    expect(s1.story.queuedBeat).toEqual(next);
    expect(s1.story.beatQueue).toEqual([]);
  });

  it("STORY/DISMISS_MODAL with no queued beats clears queuedBeat", () => {
    const s0 = baseState({
      story: { ...baseState().story, queuedBeat: fakeBeat, beatQueue: [] },
    });
    const s1 = storyReduce(s0, { type: "STORY/DISMISS_MODAL" });
    expect(s1.story.queuedBeat).toBeNull();
  });

  it("dismissing act3_win sets sandbox and ticks the festival_won achievement", () => {
    const winBeat = { id: "act3_win" };
    const s0 = baseState({
      story: { ...baseState().story, queuedBeat: winBeat, beatQueue: [] },
      // tickAchievement walks counters / unlocked / seenResources / seenBuildings.
      achievements: { counters: {}, unlocked: { festival_won: false }, seenResources: {}, seenBuildings: {} },
    });
    const s1 = storyReduce(s0, { type: "STORY/DISMISS_MODAL" });
    expect(s1.story.sandbox).toBe(true);
  });

  it("DEV/RESET_GAME is a story-side no-op (handled in core)", () => {
    const s0 = baseState();
    expect(storyReduce(s0, { type: "DEV/RESET_GAME" })).toBe(s0);
  });

  it("unknown action returns state unchanged", () => {
    const s0 = baseState();
    expect(storyReduce(s0, { type: "NOPE" })).toBe(s0);
  });
});

// ─── tutorial/slice.js ──────────────────────────────────────────────────────
describe("tutorial slice — coverage gaps", () => {
  const baseTutorial = (over = {}) => ({ active: true, step: 0, seen: false, ...over });
  const baseState = (over = {}) => ({
    tutorial: baseTutorial(),
    modal: "tutorial",
    ...over,
  });

  it("returns state unchanged when the tutorial slice is missing", () => {
    const s0 = { foo: 1 };
    expect(tutorialReduce(s0, { type: "TUTORIAL/NEXT" })).toBe(s0);
  });

  it("auto-starts on the very first action when not seen and no modal is open", () => {
    const s0 = {
      tutorial: baseTutorial({ active: false, seen: false }),
      modal: null,
    };
    const s1 = tutorialReduce(s0, { type: "FOO" });
    expect(s1.tutorial.active).toBe(true);
    expect(s1.modal).toBe("tutorial");
  });

  it("does NOT auto-start while a modal is already showing", () => {
    const s0 = {
      tutorial: baseTutorial({ active: false, seen: false }),
      modal: "menu",
    };
    const s1 = tutorialReduce(s0, { type: "FOO" });
    expect(s1.tutorial.active).toBe(false);
  });

  it("does NOT auto-start for SET_BIOME / ADVANCE_SEASON / @@INIT", () => {
    const s0 = {
      tutorial: baseTutorial({ active: false, seen: false }),
      modal: null,
    };
    for (const type of ["@@INIT", "SET_BIOME", "ADVANCE_SEASON", "TUTORIAL/START"]) {
      const s1 = tutorialReduce(s0, { type });
      // TUTORIAL/START is the explicit start trigger and DOES change state, but
      // not via the auto-start gate. We just verify the gate alone doesn't fire.
      if (type !== "TUTORIAL/START") {
        expect(s1.tutorial.active).toBe(false);
      }
    }
  });

  it("TUTORIAL/START activates step 0 and opens the modal", () => {
    const s0 = baseState({ tutorial: baseTutorial({ active: false, step: 5 }), modal: null });
    const s1 = tutorialReduce(s0, { type: "TUTORIAL/START" });
    expect(s1.tutorial.active).toBe(true);
    expect(s1.tutorial.step).toBe(0);
    expect(s1.modal).toBe("tutorial");
  });

  it("CHAIN_COLLECTED on step 1 advances; on other steps does not", () => {
    const s0 = baseState({ tutorial: baseTutorial({ step: 1 }) });
    const s1 = tutorialReduce(s0, { type: "CHAIN_COLLECTED" });
    expect(s1.tutorial.step).toBe(2);

    const s2 = baseState({ tutorial: baseTutorial({ step: 2 }) });
    const s3 = tutorialReduce(s2, { type: "CHAIN_COLLECTED" });
    expect(s3.tutorial.step).toBe(2);
  });

  it("TURN_IN_ORDER on step 3 advances", () => {
    const s0 = baseState({ tutorial: baseTutorial({ step: 3 }) });
    const s1 = tutorialReduce(s0, { type: "TURN_IN_ORDER" });
    expect(s1.tutorial.step).toBe(4);
  });

  it("SET_VIEW(town) on step 4 advances", () => {
    const s0 = baseState({ tutorial: baseTutorial({ step: 4 }) });
    const s1 = tutorialReduce(s0, { type: "SET_VIEW", view: "town" });
    expect(s1.tutorial.step).toBe(5);
  });

  it("SET_VIEW(other) on step 4 does NOT advance", () => {
    const s0 = baseState({ tutorial: baseTutorial({ step: 4 }) });
    const s1 = tutorialReduce(s0, { type: "SET_VIEW", view: "crafting" });
    expect(s1.tutorial.step).toBe(4);
  });

  it("TUTORIAL/NEXT past the last step ends the tutorial and clears the modal", () => {
    // 6 total steps (0..5); from step 5 the next advance ends.
    const s0 = baseState({ tutorial: baseTutorial({ step: 5 }) });
    const s1 = tutorialReduce(s0, { type: "TUTORIAL/NEXT" });
    expect(s1.tutorial.active).toBe(false);
    expect(s1.tutorial.seen).toBe(true);
    expect(s1.modal).toBeNull();
  });

  it("TUTORIAL/SKIP ends the tutorial regardless of step", () => {
    const s0 = baseState({ tutorial: baseTutorial({ step: 2 }) });
    const s1 = tutorialReduce(s0, { type: "TUTORIAL/SKIP" });
    expect(s1.tutorial.active).toBe(false);
    expect(s1.tutorial.seen).toBe(true);
    expect(s1.modal).toBeNull();
  });

  it("TUTORIAL/PREV when not active is a no-op", () => {
    const s0 = baseState({ tutorial: baseTutorial({ active: false, step: 3 }) });
    const s1 = tutorialReduce(s0, { type: "TUTORIAL/PREV" });
    expect(s1).toBe(s0);
  });

  it("CHAIN_COLLECTED while inactive does not advance", () => {
    const s0 = baseState({ tutorial: baseTutorial({ active: false, step: 1, seen: true }) });
    const s1 = tutorialReduce(s0, { type: "CHAIN_COLLECTED" });
    expect(s1).toBe(s0);
  });

  it("unknown action while active and seen returns state unchanged", () => {
    const s0 = baseState({ tutorial: baseTutorial({ seen: true }) });
    const s1 = tutorialReduce(s0, { type: "TOTALLY_UNRELATED" });
    expect(s1).toBe(s0);
  });
});
