// Phase 2c — side-beat infrastructure (Bond-8 arcs / side events) and the
// first one: Mira's Letter.
import { describe, it, expect, beforeEach } from "vitest";
import {
  SIDE_BEATS,
  findBeat,
  evaluateSideBeats,
  conditionMatches,
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

describe("editor-authored side beats — event triggers, flag_set, repeat", () => {
  // Push synthetic beats onto the live SIDE_BEATS list, exercise, then pop.
  const withSideBeats = (beats, fn) => {
    SIDE_BEATS.push(...beats);
    try { return fn(); } finally { SIDE_BEATS.length -= beats.length; }
  };
  const gs = (extra = {}) => ({ story: { flags: {} }, inventory: {}, npcs: { bonds: {} }, ...extra });

  it("fires a side beat on a discrete event trigger (building_built), then doesn't re-fire", () => {
    withSideBeats([{ id: "_t_built_mill", title: "T", lines: [{ text: "hi" }], trigger: { type: "building_built", id: "mill" } }], () => {
      const r = evaluateSideBeats(gs(), { type: "building_built", id: "mill" });
      expect(r?.firedBeat?.id).toBe("_t_built_mill");
      // wrong building → no fire
      expect(evaluateSideBeats(gs(), { type: "building_built", id: "well" })).toBeNull();
      // already fired (its _fired_ marker is set) → no re-fire
      expect(evaluateSideBeats(gs({ story: { flags: { _fired__t_built_mill: true } } }), { type: "building_built", id: "mill" })).toBeNull();
    });
  });

  it("a flag_set trigger fires on the next event once the flag is true", () => {
    withSideBeats([{ id: "_t_after_flag", title: "T", lines: [{ text: "hi" }], trigger: { type: "flag_set", flag: "mine_unlocked" } }], () => {
      expect(evaluateSideBeats(gs(), { type: "craft_made", item: "x" })).toBeNull();           // flag not set
      const r = evaluateSideBeats(gs({ story: { flags: { mine_unlocked: true } } }), { type: "craft_made", item: "x" });
      expect(r?.firedBeat?.id).toBe("_t_after_flag");
    });
  });

  it("a repeat beat re-fires (no permanent fired marker) and yields to fresh one-shot beats", () => {
    withSideBeats([
      { id: "_t_repeat", title: "R", lines: [{ text: "again" }], repeat: true, trigger: { type: "craft_made", item: "bread" } },
      { id: "_t_once", title: "O", lines: [{ text: "once" }], trigger: { type: "craft_made", item: "bread" } },
    ], () => {
      // fresh one-shot beat wins this event…
      let r = evaluateSideBeats(gs(), { type: "craft_made", item: "bread" });
      expect(r?.firedBeat?.id).toBe("_t_once");
      expect(r.newFlags._fired__t_once).toBe(true);
      // …next craft, the one-shot is spent, so the repeat beat fires — and sets no marker.
      r = evaluateSideBeats(gs({ story: { flags: { _fired__t_once: true } } }), { type: "craft_made", item: "bread" });
      expect(r?.firedBeat?.id).toBe("_t_repeat");
      expect(r.newFlags._fired__t_repeat).toBeUndefined();
      // and it fires again the next time.
      expect(evaluateSideBeats(gs({ story: { flags: { _fired__t_once: true } } }), { type: "craft_made", item: "bread" })?.firedBeat?.id).toBe("_t_repeat");
    });
  });

  it("a repeat beat on a perpetual predicate (flag_set) only re-fires at settle moments", () => {
    withSideBeats([{ id: "_t_repeat_flag", title: "RF", lines: [{ text: "x" }], repeat: true, trigger: { type: "flag_set", flag: "festival_announced" } }], () => {
      const set = gs({ story: { flags: { festival_announced: true } } });
      expect(evaluateSideBeats(set, { type: "craft_made", item: "x" })).toBeNull();          // not a settle event
      expect(evaluateSideBeats(set, { type: "session_start" })?.firedBeat?.id).toBe("_t_repeat_flag");
      expect(evaluateSideBeats(set, { type: "session_ended" })?.firedBeat?.id).toBe("_t_repeat_flag");
    });
  });

  it("a repeat beat with cooldown waits for the cooldown to expire", () => {
    withSideBeats([{ id: "_t_repeat_cd", title: "CD", lines: [{ text: "x" }], repeat: true, repeatCooldown: 2, trigger: { type: "craft_made", item: "bread" } }], () => {
      const r = evaluateSideBeats(gs(), { type: "craft_made", item: "bread" });
      expect(r?.firedBeat?.id).toBe("_t_repeat_cd");
      expect(r.repeatCooldown).toBe(2);
      expect(evaluateSideBeats(gs({ story: { flags: {}, repeatCooldowns: { _t_repeat_cd: 1 } } }), { type: "craft_made", item: "bread" })).toBeNull();
      expect(evaluateSideBeats(gs({ story: { flags: {}, repeatCooldowns: { _t_repeat_cd: 0 } } }), { type: "craft_made", item: "bread" })?.firedBeat?.id).toBe("_t_repeat_cd");
    });
  });
});

describe("conditionMatches — flag_set / flag_cleared (state conditions)", () => {
  it("flag_set holds on any event once the flag is true", () => {
    expect(conditionMatches({ type: "flag_set", flag: "F" }, { type: "craft_made", item: "x" }, {}, { F: true })).toBe(true);
    expect(conditionMatches({ type: "flag_set", flag: "F" }, { type: "session_start" }, {}, { F: false })).toBe(false);
    expect(conditionMatches({ type: "flag_set", flag: "F" }, { type: "session_start" }, {}, {})).toBe(false);
  });
  it("flag_cleared holds while the flag is absent/false", () => {
    expect(conditionMatches({ type: "flag_cleared", flag: "F" }, { type: "craft_made" }, {}, {})).toBe(true);
    expect(conditionMatches({ type: "flag_cleared", flag: "F" }, { type: "craft_made" }, {}, { F: true })).toBe(false);
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
