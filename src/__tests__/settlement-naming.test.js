// Phase 1b — settlement naming: SET_SETTLEMENT_NAME, displayZoneName, and the
// act1_arrival opening's name prompt.
import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { displayZoneName } from "../features/zones/data.js";
import { STORY_BEATS } from "../story.js";

describe("SET_SETTLEMENT_NAME", () => {
  it("fresh state has an empty home zone name", () => {
    expect(createInitialState().zoneNames).toEqual({ home: "" });
  });

  it("sets the named zone", () => {
    const s = rootReducer(createInitialState(), { type: "SET_SETTLEMENT_NAME", payload: { zoneId: "home", name: "Brackenfell" } });
    expect(s.zoneNames.home).toBe("Brackenfell");
  });

  it("trims whitespace and caps the length at 24 chars", () => {
    const s = rootReducer(createInitialState(), { type: "SET_SETTLEMENT_NAME", payload: { zoneId: "home", name: "   " + "x".repeat(40) + "   " } });
    expect(s.zoneNames.home).toBe("x".repeat(24));
  });

  it("an empty/blank name clears back to unnamed", () => {
    let s = rootReducer(createInitialState(), { type: "SET_SETTLEMENT_NAME", payload: { zoneId: "home", name: "Whatever" } });
    s = rootReducer(s, { type: "SET_SETTLEMENT_NAME", payload: { zoneId: "home", name: "   " } });
    expect(s.zoneNames.home).toBe("");
  });

  it("defaults zoneId to the current map when omitted", () => {
    const s0 = { ...createInitialState(), mapCurrent: "home" };
    const s = rootReducer(s0, { type: "SET_SETTLEMENT_NAME", payload: { name: "Hollowmere" } });
    expect(s.zoneNames.home).toBe("Hollowmere");
  });
});

describe("displayZoneName", () => {
  it("returns the player-chosen name when set", () => {
    const s = { mapCurrent: "home", zoneNames: { home: "Brackenfell" } };
    expect(displayZoneName(s, "home")).toBe("Brackenfell");
  });
  it("falls back to the static map-node name when unnamed", () => {
    const s = { mapCurrent: "home", zoneNames: { home: "" } };
    // The static home name (currently "Hearthwood Vale" via MAP_NODES).
    expect(typeof displayZoneName(s, "home")).toBe("string");
    expect(displayZoneName(s, "home").length).toBeGreaterThan(0);
    expect(displayZoneName(s, "home")).not.toBe("");
  });
  it("uses state.mapCurrent when no zoneId is passed", () => {
    const s = { mapCurrent: "home", zoneNames: { home: "Hollowmere" } };
    expect(displayZoneName(s)).toBe("Hollowmere");
  });
  it("falls back to the id for an unknown zone", () => {
    expect(displayZoneName({ zoneNames: {} }, "nowhere")).toBe("nowhere");
  });
});

describe("act1_arrival opening prompt", () => {
  it("carries a name_settlement prompt targeting the home zone", () => {
    const arrival = STORY_BEATS.find((b) => b.id === "act1_arrival");
    expect(arrival.prompt).toBeDefined();
    expect(arrival.prompt.kind).toBe("name_settlement");
    expect(arrival.prompt.zoneId).toBe("home");
    expect(typeof arrival.prompt.buttonLabel).toBe("string");
  });
});

describe("naming flow through the story modal dispatches", () => {
  // Mirrors what the StoryModal does on submit: SET_SETTLEMENT_NAME then
  // STORY/PICK_CHOICE { choiceId: "continue", value }.
  it("sets the zone name, records the value in the choice log, and dismisses", () => {
    let s = createInitialState();
    // Force the opening modal open.
    s = rootReducer(s, { type: "SESSION_START" });
    expect(s.story.queuedBeat?.id).toBe("act1_arrival");
    s = rootReducer(s, { type: "SET_SETTLEMENT_NAME", payload: { zoneId: "home", name: "Brackenfell" } });
    s = rootReducer(s, { type: "STORY/PICK_CHOICE", payload: { choiceId: "continue", value: "Brackenfell" } });
    expect(s.zoneNames.home).toBe("Brackenfell");
    expect(s.story.queuedBeat).toBeNull();
    const last = s.story.choiceLog[s.story.choiceLog.length - 1];
    expect(last).toMatchObject({ beatId: "act1_arrival", choiceId: "continue", value: "Brackenfell" });
  });
});
