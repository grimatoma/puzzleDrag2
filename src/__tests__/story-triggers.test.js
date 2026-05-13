import { describe, it, expect } from "vitest";
import {
  INITIAL_STORY_STATE,
  evaluateStoryTriggers,
  parseSpeaker,
} from "../story.js";

// ─── 2.2 — Story trigger evaluator ──────────────────────────────────────────

describe("2.2 — evaluateStoryTriggers: basic matching", () => {
  it("non-matching event returns null", () => {
    const r = evaluateStoryTriggers(INITIAL_STORY_STATE, {
      type: "craft_made",
      item: "bread",
    });
    expect(r).toBeNull();
  });

  it("session_start fires the arrival beat", () => {
    const r = evaluateStoryTriggers(INITIAL_STORY_STATE, {
      type: "session_start",
    });
    expect(r).not.toBeNull();
    expect(r.firedBeat.id).toBe("act1_arrival");
  });

  it("arrival beat sets intro_seen flag", () => {
    const r = evaluateStoryTriggers(INITIAL_STORY_STATE, {
      type: "session_start",
    });
    expect(r.newFlags.intro_seen).toBe(true);
  });
});

describe("2.2 — evaluateStoryTriggers: resource_total", () => {
  const afterArrival = {
    ...INITIAL_STORY_STATE,
    flags: { intro_seen: true, first_harvest: true },
    beat: "act1_light_hearth",
  };

  it("20 hay fires hearth beat", () => {
    const r = evaluateStoryTriggers(afterArrival, {
      type: "resource_total",
      key: "grass_hay",
      amount: 20,
    }, { grass_hay: 20 });
    expect(r).not.toBeNull();
    expect(r.firedBeat.id).toBe("act1_light_hearth");
  });

  it("spawns mira as side effect", () => {
    const r = evaluateStoryTriggers(afterArrival, {
      type: "resource_total",
      key: "grass_hay",
      amount: 20,
    }, { grass_hay: 20 });
    expect(r.sideEffects.spawnNPC).toBe("mira");
  });

  it("19 hay does not fire the hearth beat", () => {
    const r = evaluateStoryTriggers(afterArrival, {
      type: "resource_total",
      key: "grass_hay",
      amount: 19,
    }, { grass_hay: 19 });
    expect(r).toBeNull();
  });
});

describe("2.2 — evaluateStoryTriggers: ordering enforced", () => {
  it("later beat does not fire while earlier beat is pending", () => {
    const stillEarly = { ...INITIAL_STORY_STATE, beat: "act1_light_hearth" };
    const r = evaluateStoryTriggers(stillEarly, {
      type: "building_built",
      id: "mill",
    });
    expect(r).toBeNull();
  });
});

describe("2.2 — evaluateStoryTriggers: purity", () => {
  it("does not mutate input state", () => {
    const before = JSON.stringify(INITIAL_STORY_STATE);
    evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "session_start" });
    expect(JSON.stringify(INITIAL_STORY_STATE)).toBe(before);
  });
});

// ─── 2.3 — parseSpeaker ──────────────────────────────────────────────────────

describe("2.3 — parseSpeaker", () => {
  it("parses Wren", () => {
    expect(parseSpeaker("Wren: bring me hay")).toBe("wren");
  });

  it("parses Mira", () => {
    expect(parseSpeaker("Mira: 'Bake a loaf with me'")).toBe("mira");
  });

  it("parses Sister Liss", () => {
    expect(parseSpeaker("Sister Liss: 'A child has fever.'")).toBe("liss");
  });

  it("returns null for narration without speaker", () => {
    expect(parseSpeaker("The festival larder is full.")).toBeNull();
  });

  it("parses Bram", () => {
    expect(parseSpeaker("Bram: 'I need a forge.'")).toBe("bram");
  });

  it("parses Tomas", () => {
    expect(parseSpeaker("Tomas: 'A mill!'")).toBe("tomas");
  });
});
