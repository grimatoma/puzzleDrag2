/**
 * wikilink.test.ts — TDD suite for the wikilink parser + resolver.
 *
 * Written BEFORE the implementation. All tests should fail until
 * wikilink.ts is created.
 */

import { describe, it, expect } from "vitest";
import {
  parseWikiLinks,
  resolveWikiLink,
  focusForLink,
  type TextSegment,
  type LinkSegment,
} from "./wikilink.js";

// ---------------------------------------------------------------------------
// parseWikiLinks
// ---------------------------------------------------------------------------

describe("parseWikiLinks", () => {
  it("splits a mixed string into ordered text and link segments", () => {
    const segs = parseWikiLinks("Bake [[bread]] at [[buildings:bakery|Bakery]].");
    const links = segs.filter((s): s is LinkSegment => s.kind === "link");
    const texts = segs.filter((s): s is TextSegment => s.kind === "text");
    expect(links).toHaveLength(2);
    expect(texts.length).toBeGreaterThanOrEqual(1);
  });

  it("preserves the order: text, link, text, link, text", () => {
    const segs = parseWikiLinks("Bake [[bread]] at [[buildings:bakery|Bakery]].");
    expect(segs[0].kind).toBe("text");
    expect(segs[1].kind).toBe("link");
    expect(segs[2].kind).toBe("text");
    expect(segs[3].kind).toBe("link");
    expect(segs[4].kind).toBe("text");
  });

  it("returns the correct raw and display for a bare link", () => {
    const segs = parseWikiLinks("[[bread]]");
    expect(segs).toHaveLength(1);
    const seg = segs[0] as LinkSegment;
    expect(seg.kind).toBe("link");
    expect(seg.raw).toBe("bread");
    expect(seg.display).toBe("bread");
  });

  it("supports key|Display: display is overridden, raw is the key", () => {
    const segs = parseWikiLinks("[[bread|Tasty]]");
    expect(segs).toHaveLength(1);
    const seg = segs[0] as LinkSegment;
    expect(seg.kind).toBe("link");
    expect(seg.raw).toBe("bread");
    expect(seg.display).toBe("Tasty");
  });

  it("supports conceptId:key format in raw", () => {
    const segs = parseWikiLinks("[[buildings:bakery|Bakery]]");
    expect(segs).toHaveLength(1);
    const seg = segs[0] as LinkSegment;
    expect(seg.kind).toBe("link");
    expect(seg.raw).toBe("buildings:bakery");
    expect(seg.display).toBe("Bakery");
  });

  it("trims whitespace inside [[ key | Display ]]", () => {
    const segs = parseWikiLinks("[[ bread | Tasty Bread ]]");
    expect(segs).toHaveLength(1);
    const seg = segs[0] as LinkSegment;
    expect(seg.kind).toBe("link");
    expect(seg.raw).toBe("bread");
    expect(seg.display).toBe("Tasty Bread");
  });

  it("returns a single text segment for a string with no links", () => {
    const segs = parseWikiLinks("No links here at all.");
    expect(segs).toHaveLength(1);
    expect(segs[0].kind).toBe("text");
    expect((segs[0] as TextSegment).value).toBe("No links here at all.");
  });

  it("returns an empty array for an empty string", () => {
    expect(parseWikiLinks("")).toHaveLength(0);
  });

  it("handles consecutive links without text between them", () => {
    const segs = parseWikiLinks("[[bread]][[buildings:bakery|Bakery]]");
    expect(segs).toHaveLength(2);
    expect(segs[0].kind).toBe("link");
    expect(segs[1].kind).toBe("link");
  });

  it("two consecutive calls return identical results (no lastIndex leakage)", () => {
    const input = "Bake [[bread]] at [[buildings:bakery|Bakery]].";
    const first = parseWikiLinks(input);
    const second = parseWikiLinks(input);
    expect(second).toEqual(first);
  });

  it("is deterministic across three calls", () => {
    const input = "A [[bread]] B [[buildings:bakery|Bakery]] C";
    const r1 = parseWikiLinks(input);
    const r2 = parseWikiLinks(input);
    const r3 = parseWikiLinks(input);
    expect(r2).toEqual(r1);
    expect(r3).toEqual(r1);
  });

  it("trailing text after last link is included as a text segment", () => {
    const segs = parseWikiLinks("See [[bread]] for details.");
    const last = segs[segs.length - 1] as TextSegment;
    expect(last.kind).toBe("text");
    expect(last.value).toBe(" for details.");
  });
});

// ---------------------------------------------------------------------------
// resolveWikiLink
// ---------------------------------------------------------------------------

describe("resolveWikiLink", () => {
  it("resolves a prefixed conceptId:key form — buildings:bakery", () => {
    const result = resolveWikiLink("buildings:bakery");
    expect(result).toEqual({ conceptId: "buildings", entityKey: "bakery" });
  });

  it("resolves a bare resource key — bread", () => {
    // 'bread' exists in ITEMS with kind: "resource"
    const result = resolveWikiLink("bread");
    expect(result).not.toBeNull();
    expect(result!.entityKey).toBe("bread");
    // conceptId must be something (resources or recipes — whichever comes first)
    expect(typeof result!.conceptId).toBe("string");
    expect(result!.conceptId.length).toBeGreaterThan(0);
  });

  it("returns null for a completely unknown key", () => {
    expect(resolveWikiLink("totally_made_up_xyz")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(resolveWikiLink("")).toBeNull();
  });

  it("resolves resources:bread explicitly", () => {
    const result = resolveWikiLink("resources:bread");
    expect(result).toEqual({ conceptId: "resources", entityKey: "bread" });
  });
});

// ---------------------------------------------------------------------------
// focusForLink
// ---------------------------------------------------------------------------

describe("focusForLink", () => {
  it("returns the canonical focus string for a known prefixed link", () => {
    expect(focusForLink("buildings:bakery")).toBe("buildings:bakery");
  });

  it("returns a focus string for a bare known resource key", () => {
    const focus = focusForLink("bread");
    expect(focus).not.toBeNull();
    expect(focus!).toContain("bread");
  });

  it("returns null for an unknown key", () => {
    expect(focusForLink("totally_made_up_xyz")).toBeNull();
  });

  it("returned focus matches resolveWikiLink output", () => {
    const resolved = resolveWikiLink("buildings:bakery");
    const focus = focusForLink("buildings:bakery");
    expect(focus).toBe(`${resolved!.conceptId}:${resolved!.entityKey}`);
  });
});
