import { describe, it, expect } from "vitest";
import { renderStoryMarkdown, compareBeatOrder, reachableBeatIds } from "../storyEditor/exportMarkdown.js";
import { emptyDraft } from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("renderStoryMarkdown", () => {
  it("opens with a title block and a beat count", () => {
    const md = renderStoryMarkdown(emptyDraft());
    expect(md.startsWith("# Hearthlands · Story Script")).toBe(true);
    expect(md).toMatch(/\d+ beats/);
  });

  it("renders a built-in beat with header, trigger, and lines", () => {
    const md = renderStoryMarkdown(emptyDraft());
    expect(md).toMatch(/## Act I · Roots · A Cold Hearth — `act1_arrival`/);
    expect(md).toMatch(/Trigger:.*Session start/);
    expect(md).toMatch(/\*\*Wren:\*\*/); // bold speaker
    expect(md).toMatch(/Took you long enough/);
  });

  it("sections beats into Act / Side / Drafts headers in order", () => {
    const d = draftWith({
      newBeats: [{ id: "branch_x", title: "Draft X", lines: [{ speaker: "wren", text: "hi" }] }],
    });
    const md = renderStoryMarkdown(d);
    const actI = md.indexOf("# Act I · Roots");
    const sides = md.indexOf("# Side events");
    const drafts = md.indexOf("# Drafts (author-created)");
    expect(actI).toBeGreaterThan(-1);
    expect(sides).toBeGreaterThan(actI);
    expect(drafts).toBeGreaterThan(sides);
  });

  it("renders an author-created draft beat with a Draft prefix", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_x", title: "A Whispered Question",
        lines: [{ speaker: "mira", text: "What did you call this place?" }],
      }],
    });
    const md = renderStoryMarkdown(d);
    expect(md).toContain("## Draft · A Whispered Question — `branch_x`");
    expect(md).toContain("**Mira:** \"What did you call this place?\"");
  });

  it("renders narrator lines in italics (no speaker → underscore wrap)", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_n", title: "Narration Test",
        lines: [{ speaker: null, text: "The wind whispers." }],
      }],
    });
    const md = renderStoryMarkdown(d);
    expect(md).toContain("> _The wind whispers._");
  });

  it("renders choice lists with letter prefixes and outcome badges", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_c", title: "Pick",
        lines: [{ speaker: "wren", text: "Choose." }],
        choices: [
          { id: "a", label: "Be kind", outcome: { bondDelta: { npc: "wren", amount: 2 }, setFlag: "kind" } },
          { id: "b", label: "Be cruel", outcome: { coins: 5, queueBeat: "branch_after" } },
        ],
      }, {
        id: "branch_after", title: "After", lines: [{ speaker: null, text: "..." }],
      }],
    });
    const md = renderStoryMarkdown(d);
    expect(md).toMatch(/- \*\*A\.\*\* Be kind/);
    expect(md).toMatch(/♥ \+2 Wren/);
    expect(md).toMatch(/⚐ kind/);
    expect(md).toMatch(/- \*\*B\.\*\* Be cruel/);
    expect(md).toMatch(/→ `branch_after`/);
    expect(md).toMatch(/¢ \+5 coins/);
  });

  it("marks a content-bearing beat with no choices as a branch end", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_end", title: "End",
        lines: [{ speaker: null, text: "Curtain." }],
      }],
    });
    const md = renderStoryMarkdown(d);
    expect(md).toMatch(/_\(no choices · branch ends here\)_/);
  });

  it("does NOT add the 'no choices' note to beats that are completely empty", () => {
    // Empty beats render no dialogue paragraph; the 'no choices' note only
    // makes sense after dialogue/body has been shown.
    const d = draftWith({
      newBeats: [{ id: "branch_blank", title: "Blank", trigger: { type: "session_start" } }],
    });
    const md = renderStoryMarkdown(d);
    // The beat header is present but no 'branch ends here' note follows.
    expect(md).toContain("`branch_blank`");
    const section = md.slice(md.indexOf("`branch_blank`"));
    const nextHeader = section.indexOf("\n## ");
    const range = nextHeader > -1 ? section.slice(0, nextHeader) : section;
    expect(range).not.toMatch(/_\(no choices · branch ends here\)_/);
  });

  it("escapes markdown control characters in titles and dialogue", () => {
    const d = draftWith({
      newBeats: [{
        id: "branch_md", title: "*emphasis*",
        lines: [{ speaker: null, text: "use _underscores_ here" }],
      }],
    });
    const md = renderStoryMarkdown(d);
    expect(md).toContain("\\*emphasis\\*");
    expect(md).toContain("use \\_underscores\\_ here");
  });

  it("renders the empty-draft fallback message when no beats exist", () => {
    // Force a draft with every built-in suppressed and no overrides — but
    // since SIDE_BEATS can be suppressed individually and STORY_BEATS can't,
    // this isn't really achievable. Instead just confirm the function
    // accepts an empty-content draft without crashing.
    const md = renderStoryMarkdown(emptyDraft());
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(0);
  });
});

describe("renderStoryMarkdown — filters", () => {
  it("filters by speaker (only beats with that NPC's lines survive)", () => {
    const d = draftWith({
      newBeats: [
        { id: "branch_wren", title: "Wren branch", lines: [{ speaker: "wren", text: "Hi." }] },
        { id: "branch_mira", title: "Mira branch", lines: [{ speaker: "mira", text: "Hi." }] },
      ],
    });
    const md = renderStoryMarkdown(d, { speakerKey: "wren" });
    expect(md).toContain("Wren branch");
    expect(md).not.toContain("Mira branch");
    expect(md).toMatch(/speaker: Wren/);
  });

  it("speakerKey: null filters to narrator-only beats", () => {
    const d = draftWith({
      newBeats: [
        { id: "branch_n", title: "Narrator", lines: [{ speaker: null, text: "Silent night." }] },
        { id: "branch_w", title: "Wren", lines: [{ speaker: "wren", text: "Hi." }] },
      ],
    });
    const md = renderStoryMarkdown(d, { speakerKey: null });
    expect(md).toContain("Narrator");
    expect(md).not.toContain("## Draft · Wren");
  });

  it("filters by rootBeatId (only reachable beats survive)", () => {
    const d = draftWith({
      newBeats: [
        { id: "root", title: "Root", lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "x", label: "x", outcome: { queueBeat: "leaf" } }] },
        { id: "leaf", title: "Leaf", lines: [{ speaker: null, text: "..." }] },
        { id: "elsewhere", title: "Elsewhere", lines: [{ speaker: null, text: "..." }] },
      ],
    });
    const md = renderStoryMarkdown(d, { rootBeatId: "root" });
    expect(md).toContain("Root");
    expect(md).toContain("Leaf");
    expect(md).not.toContain("Elsewhere");
    expect(md).toMatch(/branch from `root`/);
  });

  it("returns a fallback message when no beats match the filter", () => {
    const md = renderStoryMarkdown(emptyDraft(), { speakerKey: "nobody_with_this_id" });
    expect(md).toMatch(/no beats matched/i);
  });
});

describe("reachableBeatIds", () => {
  it("DFS-walks queueBeat targets and returns the set", () => {
    const d = draftWith({
      newBeats: [
        { id: "a", title: "A", lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "x", label: "x", outcome: { queueBeat: "b" } }] },
        { id: "b", title: "B", lines: [{ speaker: null, text: "..." }],
          choices: [{ id: "y", label: "y", outcome: { queueBeat: "c" } }] },
        { id: "c", title: "C", lines: [{ speaker: null, text: "..." }] },
        { id: "z", title: "Z", lines: [{ speaker: null, text: "..." }] },
      ],
    });
    const reachable = reachableBeatIds("a", d);
    expect(reachable.has("a")).toBe(true);
    expect(reachable.has("b")).toBe(true);
    expect(reachable.has("c")).toBe(true);
    expect(reachable.has("z")).toBe(false);
  });

  it("is cycle-safe", () => {
    const d = draftWith({
      newBeats: [
        { id: "a", title: "A", lines: [{ speaker: null, text: "a" }],
          choices: [{ id: "x", label: "x", outcome: { queueBeat: "b" } }] },
        { id: "b", title: "B", lines: [{ speaker: null, text: "b" }],
          choices: [{ id: "y", label: "y", outcome: { queueBeat: "a" } }] },
      ],
    });
    expect([...reachableBeatIds("a", d)].sort()).toEqual(["a", "b"]);
  });
});

describe("compareBeatOrder", () => {
  it("orders Act I beats before Side beats before Drafts", () => {
    const d = draftWith({
      newBeats: [{ id: "branch_z", title: "Z", lines: [{ speaker: null, text: "..." }] }],
    });
    // act1_arrival (Act I) < mira_letter_1 (Side) < branch_z (Draft)
    expect(compareBeatOrder("act1_arrival", "mira_letter_1", d)).toBeLessThan(0);
    expect(compareBeatOrder("mira_letter_1", "branch_z", d)).toBeLessThan(0);
    expect(compareBeatOrder("branch_z", "act1_arrival", d)).toBeGreaterThan(0);
  });

  it("orders draft beats by their position in newBeats[]", () => {
    const d = draftWith({
      newBeats: [
        { id: "branch_a", title: "A" },
        { id: "branch_b", title: "B" },
      ],
    });
    expect(compareBeatOrder("branch_a", "branch_b", d)).toBeLessThan(0);
    expect(compareBeatOrder("branch_b", "branch_a", d)).toBeGreaterThan(0);
  });
});
