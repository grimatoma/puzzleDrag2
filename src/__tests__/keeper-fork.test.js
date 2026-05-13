// Phase 3b — the Frostmaw hearth-keeper: Coexist / Drive Out fork after a
// Frostmaw victory, feeding the Embers / Core Ingots meta-currencies.
import { describe, it, expect, beforeEach } from "vitest";
import { SIDE_BEATS, beatChoices, beatIsContinueOnly, beatScene } from "../story.js";
import { rootReducer, createInitialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("keeper beats — shape", () => {
  it("frostmaw_keeper carries the frost scene and the two-way choice", () => {
    const b = SIDE_BEATS.find((x) => x.id === "frostmaw_keeper");
    expect(b).toBeDefined();
    expect(beatScene(b)?.label).toBe("The frozen wood");
    const cs = beatChoices(b);
    expect(cs.map((c) => c.id).sort()).toEqual(["coexist", "drive_out"]);
    expect(beatIsContinueOnly(b)).toBe(false);
  });
  it("the coexist choice grants Embers + the coexist flags + queues its resolution", () => {
    const b = SIDE_BEATS.find((x) => x.id === "frostmaw_keeper");
    const c = beatChoices(b).find((x) => x.id === "coexist");
    expect(c.outcome.embers).toBeGreaterThan(0);
    expect(c.outcome.setFlag).toContain("keeper_choice_made");
    expect(c.outcome.setFlag).toContain("keeper_path_coexist");
    expect(c.outcome.queueBeat).toBe("frostmaw_keeper_coexist");
  });
  it("the drive_out choice grants Core Ingots + the driveout flags + queues its resolution", () => {
    const b = SIDE_BEATS.find((x) => x.id === "frostmaw_keeper");
    const c = beatChoices(b).find((x) => x.id === "drive_out");
    expect(c.outcome.coreIngots).toBeGreaterThan(0);
    expect(c.outcome.setFlag).toContain("keeper_choice_made");
    expect(c.outcome.setFlag).toContain("keeper_path_driveout");
    expect(c.outcome.queueBeat).toBe("frostmaw_keeper_driveout");
  });
  it("both resolution beats are continue-only and exist", () => {
    for (const id of ["frostmaw_keeper_coexist", "frostmaw_keeper_driveout"]) {
      const b = SIDE_BEATS.find((x) => x.id === id);
      expect(b, id).toBeDefined();
      expect(beatIsContinueOnly(b)).toBe(true);
    }
  });
});

describe("legacy Frostmaw boss no longer drives keeper rewards", () => {
  const withFrostmawActive = (over = {}) => {
    const s = createInitialState();
    return {
      ...s,
      boss: { key: "frostmaw", resource: "wood_log", targetCount: 30, progress: 30, turnsLeft: 5 },
      modal: "boss",
      ...over,
    };
  };

  it("first Frostmaw win pays boss rewards without queueing the keeper choice modal", () => {
    const s = rootReducer(withFrostmawActive(), { type: "BOSS/RESOLVE", won: true });
    expect(s.boss).toBeNull();
    expect(s.story.queuedBeat).toBeNull();
    expect(s.story.flags.keeper_choice_made).toBeUndefined();
    expect(s.embers).toBe(0);
    expect(s.coreIngots).toBe(0);
  });

  it("later Frostmaw wins do not top up keeper currencies", () => {
    const s = rootReducer(
      withFrostmawActive({ story: { ...createInitialState().story, flags: { keeper_choice_made: true, keeper_path_coexist: true } }, embers: 5 }),
      { type: "BOSS/RESOLVE", won: true },
    );
    expect(s.embers).toBe(5);
    expect(s.coreIngots).toBe(0);
    expect(s.story.queuedBeat).toBeNull();
  });

  it("winning a NON-Frostmaw boss does not touch the keeper machinery", () => {
    const s = rootReducer(
      { ...createInitialState(), boss: { key: "storm", resource: "fish_fillet", targetCount: 6, progress: 6, turnsLeft: 5 }, modal: "boss" },
      { type: "BOSS/RESOLVE", won: true },
    );
    expect(s.story.queuedBeat).toBeNull();
    expect(s.embers).toBe(0);
    expect(s.coreIngots).toBe(0);
    expect(s.story.flags.keeper_choice_made).toBeUndefined();
  });
});
