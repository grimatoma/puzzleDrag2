// Phase 2c — side-beat infrastructure (Bond-8 arcs / side events) and the
// first one: Mira's Letter.
import { describe, it, expect, beforeEach } from "vitest";
import {
  SIDE_BEATS,
  findBeat,
  evaluateSideBeats,
  beatLines,
  beatChoices,
  beatIsContinueOnly,
  STORY_BEATS,
} from "../story.js";
import { rootReducer, createInitialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("SIDE_BEATS shape", () => {
  it("includes Mira's Letter arc beats", () => {
    const ids = SIDE_BEATS.map((b) => b.id);
    expect(ids).toContain("mira_letter_1");
    expect(ids).toContain("mira_letter_sent");
    expect(ids).toContain("mira_letter_kept");
    expect(ids).toContain("mira_letter_read");
  });
  it("the trigger beat carries a bond_at_least trigger and choices; resolution beats have no trigger", () => {
    const trig = SIDE_BEATS.find((b) => b.id === "mira_letter_1");
    expect(trig.trigger).toEqual({ type: "bond_at_least", npc: "mira", amount: 8 });
    expect(beatChoices(trig).length).toBe(3);
    expect(beatIsContinueOnly(trig)).toBe(false);
    for (const id of ["mira_letter_sent", "mira_letter_kept", "mira_letter_read"]) {
      const b = SIDE_BEATS.find((x) => x.id === id);
      expect(b.trigger).toBeUndefined();
      expect(beatIsContinueOnly(b)).toBe(true);
    }
  });
  it("every side beat has a title and at least one dialogue line", () => {
    for (const b of SIDE_BEATS) {
      expect(b.title, `${b.id} title`).toBeTruthy();
      expect(beatLines(b).length, `${b.id} lines`).toBeGreaterThan(0);
    }
  });
});

describe("findBeat", () => {
  it("finds main beats and side beats", () => {
    expect(findBeat(STORY_BEATS[0].id)).toBe(STORY_BEATS[0]);
    expect(findBeat("mira_letter_1").id).toBe("mira_letter_1");
  });
  it("returns null for an unknown id", () => {
    expect(findBeat("nope")).toBeNull();
  });
});

describe("evaluateSideBeats", () => {
  const mk = (bond, flags = {}) => ({ npcs: { bonds: { mira: bond } }, story: { flags } });
  const ended = { type: "session_ended" };

  it("does not fire when the bond is below the threshold", () => {
    expect(evaluateSideBeats(mk(7.5), ended)).toBeNull();
  });
  it("fires Mira's Letter when bond ≥ 8 on a settle event", () => {
    const r = evaluateSideBeats(mk(8), ended);
    expect(r?.firedBeat?.id).toBe("mira_letter_1");
    expect(r.newFlags.mira_letter_seen).toBe(true);
  });
  it("does not fire on a non-settle event even if the bond is met", () => {
    expect(evaluateSideBeats(mk(9), { type: "building_built", id: "mill" })).toBeNull();
    expect(evaluateSideBeats(mk(9), { type: "resource_total", key: "grass_hay", amount: 99 })).toBeNull();
  });
  it("does not re-fire once mira_letter_seen is set", () => {
    expect(evaluateSideBeats(mk(10, { mira_letter_seen: true }), ended)).toBeNull();
  });
  it("also fires on session_start", () => {
    expect(evaluateSideBeats(mk(8), { type: "session_start" })?.firedBeat?.id).toBe("mira_letter_1");
  });
});

describe("Mira's Letter — end to end through the reducer", () => {
  // Pre-set `intro_seen` so SESSION_START doesn't also fire act1_arrival, and
  // use SESSION_START (no bond decay, unlike CLOSE_SEASON) so the threshold is
  // exact.
  const armed = (bond) => {
    const s = createInitialState();
    return {
      ...s,
      story: { ...s.story, flags: { ...s.story.flags, intro_seen: true } },
      npcs: { ...s.npcs, bonds: { ...s.npcs.bonds, mira: bond } },
    };
  };

  it("SESSION_START with bond 8 queues the arc; picking 'send' queues the sent resolution + bumps the bond", () => {
    let s = rootReducer(armed(8), { type: "SESSION_START" });
    expect(s.story.queuedBeat?.id).toBe("mira_letter_1");
    expect(s.story.flags.mira_letter_seen).toBe(true);

    s = rootReducer(s, { type: "STORY/PICK_CHOICE", payload: { choiceId: "send" } });
    expect(s.story.flags.mira_letter_sent).toBe(true);
    expect(s.story.flags.mira_letter_resolved).toBe(true);
    expect(s.npcs.bonds.mira).toBe(9);
    expect(s.story.queuedBeat?.id).toBe("mira_letter_sent");
    expect(s.story.choiceLog.some((e) => e.beatId === "mira_letter_1" && e.choiceId === "send")).toBe(true);

    s = rootReducer(s, { type: "STORY/PICK_CHOICE", payload: { choiceId: "continue" } });
    expect(s.story.queuedBeat).toBeNull();
  });

  it("picking 'keep' resolves without a bond change and queues the kept resolution", () => {
    let s = rootReducer(armed(8), { type: "SESSION_START" });
    s = rootReducer(s, { type: "STORY/PICK_CHOICE", payload: { choiceId: "keep" } });
    expect(s.story.flags.mira_letter_kept).toBe(true);
    expect(s.npcs.bonds.mira).toBe(8);
    expect(s.story.queuedBeat?.id).toBe("mira_letter_kept");
  });

  it("does not re-fire once resolved", () => {
    let s = rootReducer(armed(8), { type: "SESSION_START" });
    s = rootReducer(s, { type: "STORY/PICK_CHOICE", payload: { choiceId: "read" } });
    s = rootReducer(s, { type: "STORY/PICK_CHOICE", payload: { choiceId: "continue" } }); // dismiss the read resolution
    expect(s.story.queuedBeat).toBeNull();
    // Another session start: mira_letter_seen is already set → nothing re-queues.
    s = rootReducer(s, { type: "SESSION_START" });
    expect(s.story.queuedBeat).toBeNull();
    expect(s.story.flags.mira_letter_seen).toBe(true);
  });
});
