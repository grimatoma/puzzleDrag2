import { describe, it, expect, afterEach } from "vitest";
import { applyStoryOverrides } from "../state/applyStoryOverrides.js";
import {
  STORY_BEATS,
  SIDE_BEATS,
  setStoryOverrides,
  evaluateSideBeats,
  type Beat,
} from "../story.js";

const MAIN = STORY_BEATS as Beat[];
const SIDE = SIDE_BEATS as Beat[];

// Reset the module-level effective arrays after any test that injects overrides.
afterEach(() => setStoryOverrides(null));

describe("applyStoryOverrides — empty override is a deep, identity-stable no-op", () => {
  it("returns arrays deep-equal to the built-ins for null and {}", () => {
    expect(applyStoryOverrides(MAIN, null, "main")).toEqual(STORY_BEATS);
    expect(applyStoryOverrides(MAIN, {}, "main")).toEqual(STORY_BEATS);
    expect(applyStoryOverrides(SIDE, null, "side")).toEqual(SIDE_BEATS);
    expect(applyStoryOverrides(SIDE, {}, "side")).toEqual(SIDE_BEATS);
  });

  it("preserves object identity for every unpatched beat (23 total)", () => {
    const main = applyStoryOverrides(MAIN, {}, "main");
    const side = applyStoryOverrides(SIDE, {}, "side");
    expect(main).toHaveLength(15);
    expect(side).toHaveLength(8);
    main.forEach((b, i) => expect(b).toBe(STORY_BEATS[i]));
    side.forEach((b, i) => expect(b).toBe(SIDE_BEATS[i]));
  });
});

describe("applyStoryOverrides — beats[id] patches", () => {
  it("patches title/scene/body/lines/choices/onComplete while untouched fields survive", () => {
    const out = applyStoryOverrides(MAIN, {
      beats: {
        act1_arrival: {
          title: "Renamed",
          scene: "",                                   // "" clears the built-in scene
          body: "A plain body line.",
          lines: [{ speaker: "wren", text: "Edited." }],
          choices: [{ id: "go", label: "Onward", outcome: { setFlag: "went" } }],
          onComplete: { setFlag: "patched_flag" },
          repeat: true,
          repeatCooldown: 4,
        },
      },
    }, "main");
    const beat = out.find((b) => b.id === "act1_arrival")!;
    expect(beat.title).toBe("Renamed");
    expect(beat.scene).toBeUndefined();
    expect(beat.body).toBe("A plain body line.");
    expect(beat.lines).toEqual([{ speaker: "wren", text: "Edited." }]);
    expect(beat.choices).toEqual([{ id: "go", label: "Onward", outcome: { setFlag: "went" } }]);
    expect(beat.onComplete).toEqual({ setFlag: "patched_flag" });
    expect(beat.repeat).toBe(true);
    expect(beat.repeatCooldown).toBe(4);
    // Untouched fields survive.
    expect(beat.act).toBe(1);
    expect(beat.when).toEqual({ fact: "event.type", op: "eq", value: "session_start" });
    // The built-in is not mutated.
    expect((STORY_BEATS.find((b) => b.id === "act1_arrival")! as Beat).title).toBe("A Cold Hearth");
  });

  it("overrides when: via sanitizeCond and drops a legacy trigger", () => {
    const out = applyStoryOverrides(MAIN, {
      beats: {
        act1_first_harvest: {
          trigger: { type: "session_start" },          // legacy field present…
          when: { fact: "resource.tile_grass_grass.total", op: "gte", value: 99 }, // …native wins
        },
      },
    }, "main");
    const beat = out.find((b) => b.id === "act1_first_harvest")!;
    expect(beat.when).toEqual({ fact: "resource.tile_grass_grass.total", op: "gte", value: 99 });
    expect(beat.trigger).toBeUndefined();
  });

  it("drops an invalid when: without throwing", () => {
    let out: Beat[] = [];
    expect(() => {
      out = applyStoryOverrides(MAIN, {
        beats: { act1_first_harvest: { when: { fact: "not.a.real.fact" } } },
      }, "main");
    }).not.toThrow();
    const beat = out.find((b) => b.id === "act1_first_harvest")!;
    // An invalid override clears the field (mirrors editor effectiveBeat); the
    // contract is "no throw", not "keep the bad value".
    expect(beat.when).toBeUndefined();
  });
});

describe("applyStoryOverrides — suppressedBeats", () => {
  it("removes a built-in side beat from the effective array", () => {
    const out = applyStoryOverrides(SIDE, { suppressedBeats: ["mira_letter_1"] }, "side");
    expect(out.some((b) => b.id === "mira_letter_1")).toBe(false);
    expect(out.some((b) => b.id === "tutorial_beat_4")).toBe(true);   // others intact
  });
});

describe("applyStoryOverrides — newBeats routing", () => {
  const story = {
    newBeats: [
      { id: "nb_main", act: 2, title: "Main extra", lines: [{ speaker: null, text: "m" }], when: { fact: "event.type", op: "eq", value: "act_entered" } },
      { id: "nb_side", title: "Side extra", lines: [{ speaker: null, text: "s" }], when: { fact: "event.type", op: "eq", value: "session_start" } },
    ],
  };

  it("routes a newBeat WITH a numeric act → main bucket, WITHOUT → side bucket", () => {
    const main = applyStoryOverrides(MAIN, story, "main");
    const side = applyStoryOverrides(SIDE, story, "side");
    expect(main.some((b) => b.id === "nb_main")).toBe(true);
    expect(main.some((b) => b.id === "nb_side")).toBe(false);
    expect(side.some((b) => b.id === "nb_side")).toBe(true);
    expect(side.some((b) => b.id === "nb_main")).toBe(false);
    // Built-ins still come first, in order; newBeats are appended.
    expect(main.slice(0, 15).map((b) => b.id)).toEqual(STORY_BEATS.map((b) => b.id));
  });

  it("an author-created side newBeat fires through evaluateSideBeats", () => {
    setStoryOverrides(story);
    const r = evaluateSideBeats({ story: { flags: {} } }, { type: "session_start" });
    expect(r?.firedBeat.id).toBe("nb_side");
  });
});

describe("applyStoryOverrides — newBeat shadows a built-in of the same id", () => {
  it("the newBeat replaces the built-in (newBeats win)", () => {
    const out = applyStoryOverrides(SIDE, {
      newBeats: [{ id: "tutorial_beat_4", title: "Shadowed", lines: [{ speaker: null, text: "x" }] }],
    }, "side");
    const matches = out.filter((b) => b.id === "tutorial_beat_4");
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toBe("Shadowed");
  });
});
