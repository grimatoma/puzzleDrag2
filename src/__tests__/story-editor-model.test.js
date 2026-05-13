// Story Tree Editor — pure model (beat merge + canvas graph + collapse filter).
import { describe, it, expect } from "vitest";
import {
  effectiveBeat, effectiveChoices, allBeatIds, findIncomingChoice, isDraftBeat,
  deriveGraph, visibleSubset, collapsibleIds, cloneDraft, emptyDraft,
} from "../storyEditor/shared.jsx";

const draftWith = (story) => ({ ...emptyDraft(), story });

describe("effectiveBeat", () => {
  it("layers a beats[] override onto a built-in beat", () => {
    const d = draftWith({ beats: { act1_arrival: { title: "Renamed", scene: "" } } });
    const b = effectiveBeat("act1_arrival", d);
    expect(b.title).toBe("Renamed");
    expect(b.scene).toBeUndefined();        // "" clears the built-in "ruin"
    expect(b.act).toBe(1);                  // untouched fields survive
  });
  it("resolves an author-created draft beat from newBeats", () => {
    const d = draftWith({ newBeats: [{ id: "branch_x", title: "Branch X", lines: [{ speaker: "wren", text: "hey" }] }] });
    expect(isDraftBeat(d, "branch_x")).toBe(true);
    expect(effectiveBeat("branch_x", d)).toMatchObject({ id: "branch_x", title: "Branch X" });
    expect(effectiveBeat("nope", d)).toBeNull();
  });
  it("array-form choices replace, object-form patches labels", () => {
    const arr = draftWith({ beats: { mira_letter_1: { choices: [{ id: "send", label: "New send", outcome: { queueBeat: "mira_letter_sent" } }] } } });
    expect(effectiveChoices("mira_letter_1", arr)).toEqual([{ id: "send", label: "New send", outcome: { queueBeat: "mira_letter_sent" } }]);
    const obj = draftWith({ beats: { mira_letter_1: { choices: { send: { label: "Just relabelled" } } } } });
    const cs = effectiveChoices("mira_letter_1", obj);
    expect(cs.find((c) => c.id === "send").label).toBe("Just relabelled");
    expect(cs.find((c) => c.id === "keep").label).toBe("Keep it. There's no hurry."); // others intact
  });
  it("allBeatIds includes built-ins + drafts; findIncomingChoice walks effective data", () => {
    const d = draftWith({
      newBeats: [{ id: "res_new", title: "Res New" }],
      beats: { act1_first_bread: { choices: [{ id: "c1", label: "go", outcome: { queueBeat: "res_new" } }] } },
    });
    expect(allBeatIds(d)).toContain("res_new");
    const inc = findIncomingChoice("res_new", d);
    expect(inc).toMatchObject({ parentId: "act1_first_bread", choice: { id: "c1" } });
    expect(findIncomingChoice("mira_letter_sent", emptyDraft())).toMatchObject({ parentId: "mira_letter_1", choice: { id: "send" } });
  });
});

describe("deriveGraph", () => {
  it("renders the canonical layout + a drafts lane, with derived choice edges", () => {
    const d = draftWith({ newBeats: [{ id: "branch_a", title: "Branch A" }] });
    const g = deriveGraph(d);
    expect(g.nodes.find((n) => n.id === "act1_arrival")).toBeTruthy();
    const dn = g.nodes.find((n) => n.id === "branch_a");
    expect(dn).toMatchObject({ draft: true, expanded: true });
    expect(dn.y).toBeGreaterThan(1000);    // sits in the drafts lane
    // mira fork's choice edges come from the data, not the layout table
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "mira_letter_1", to: "mira_letter_sent", kind: "choice" }));
    // a trigger edge stays a trigger edge
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "act1_arrival", to: "act1_light_hearth", kind: "trigger" }));
  });
  it("re-points a choice edge when queueBeat changes; adds an edge into a new draft beat", () => {
    const d = draftWith({
      newBeats: [{ id: "branch_a", title: "A" }],
      beats: { act1_first_bread: { choices: [{ id: "c1", label: "x", outcome: { queueBeat: "branch_a" } }] } },
    });
    const g = deriveGraph(d);
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "act1_first_bread", to: "branch_a", kind: "choice", choice: "c1" }));
  });
});

describe("visibleSubset / collapse", () => {
  const g = deriveGraph(emptyDraft());
  it("collapsing mira_letter_1 hides only its resolution branches", () => {
    const collapsed = new Set(["mira_letter_1"]);
    const v = visibleSubset(g.nodes, g.edges, collapsed);
    const ids = new Set(v.nodes.map((n) => n.id));
    expect(ids.has("mira_letter_1")).toBe(true);          // the fork itself stays
    expect(ids.has("mira_letter_sent")).toBe(false);      // its branches go
    expect(ids.has("mira_letter_kept")).toBe(false);
    expect(ids.has("act3_win")).toBe(true);               // the main chain is untouched
    expect(v.hiddenCounts.mira_letter_1).toBe(3);
    expect(v.edges.some((e) => e.from === "mira_letter_1")).toBe(false); // outgoing choice edges hidden
  });
  it("collapsing act2_bram_arrives folds the Mira subplot but keeps the spine", () => {
    const v = visibleSubset(g.nodes, g.edges, new Set(["act2_bram_arrives"]));
    const ids = new Set(v.nodes.map((n) => n.id));
    expect(ids.has("act2_first_hinge")).toBe(true);   // trigger edge → spine continues
    expect(ids.has("mira_letter_1")).toBe(false);     // side edge folded away
    expect(ids.has("mira_letter_sent")).toBe(false);
  });
  it("no collapse → identity; collapsibleIds picks fork / side-hint sources", () => {
    const v = visibleSubset(g.nodes, g.edges, new Set());
    expect(v.nodes).toBe(g.nodes);
    const cs = collapsibleIds(g.edges);
    expect(cs.has("mira_letter_1")).toBe(true);
    expect(cs.has("frostmaw_keeper")).toBe(true);
    expect(cs.has("act2_bram_arrives")).toBe(true);   // source of a side hint edge
    expect(cs.has("act1_light_hearth")).toBe(false);  // only a plain trigger edge out
  });
});

describe("cloneDraft", () => {
  it("deep-copies known sections and leaves originals untouched", () => {
    const src = { version: 2, story: { beats: { a: { title: "T" } }, newBeats: [{ id: "x" }] }, junk: 1 };
    const c = cloneDraft(src);
    c.story.beats.a.title = "changed";
    c.story.newBeats[0].id = "y";
    expect(src.story.beats.a.title).toBe("T");
    expect(src.story.newBeats[0].id).toBe("x");
    expect(c.version).toBe(2);
    expect(c.junk).toBeUndefined();   // unknown keys dropped
    expect(cloneDraft(null)).toEqual(emptyDraft());
  });
});
