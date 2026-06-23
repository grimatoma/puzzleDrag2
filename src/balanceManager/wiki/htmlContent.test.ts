/**
 * htmlContent.test.ts — TDD suite for the HTML content loader.
 *
 * Written BEFORE the implementation. All tests should fail until
 * htmlContent.ts and the seed content files are created.
 *
 * Coverage:
 *  1. bodyFor("resources","bread") matches /staple food/i
 *  2. bodyFor("resources","no_such_key") === null
 *  3. pageFor("overview") matches /Welcome/
 *  4. listPages() contains "overview"
 *
 * Phase 4c additions:
 *  5. Category _index.html files load for tiles, resources, buildings, npcs, zones, hazards
 *  6. Entity body files load for flour, block, supplies, iron_bar, mill, kitchen, forge, axe, meadow, quarry
 *  7. [[wikilinks]] in those files resolve to known entities (no broken links)
 */

import { describe, it, expect } from "vitest";
import { bodyFor, pageFor, listPages } from "./htmlContent.js";
import { resolveWikiLink } from "./wikilink.js";

describe("bodyFor", () => {
  it('returns the authored HTML for resources/bread (matches /staple food/i)', () => {
    const result = bodyFor("resources", "bread");
    expect(result).not.toBeNull();
    expect(result).toMatch(/staple food/i);
  });

  it('returns null for a key that does not exist', () => {
    expect(bodyFor("resources", "no_such_key")).toBeNull();
  });

  it('returns null for a concept that does not exist', () => {
    expect(bodyFor("__no_concept__", "bread")).toBeNull();
  });
});

describe("pageFor", () => {
  it('returns the authored HTML for pages/overview (matches /Welcome/)', () => {
    const result = pageFor("overview");
    expect(result).not.toBeNull();
    expect(result).toMatch(/Welcome/);
  });

  it('returns null for a slug that does not exist', () => {
    expect(pageFor("no_such_page")).toBeNull();
  });
});

describe("listPages", () => {
  it('contains "overview"', () => {
    expect(listPages()).toContain("overview");
  });

  it('returns a sorted array of strings', () => {
    const pages = listPages();
    expect(Array.isArray(pages)).toBe(true);
    const sorted = [...pages].sort();
    expect(pages).toEqual(sorted);
  });

  it('does not include the "pages/" prefix in returned slugs', () => {
    const pages = listPages();
    for (const p of pages) {
      expect(p).not.toMatch(/^pages\//);
    }
  });
});

// ── Phase 4c: category intros and entity bodies ───────────────────────────────

/** Extract all [[wikilink]] raw targets from an HTML string. */
function extractWikiLinks(html: string): string[] {
  const re = /\[\[([^\]]+)\]\]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const inner = m[1];
    const pipe = inner.indexOf("|");
    out.push((pipe === -1 ? inner : inner.slice(0, pipe)).trim());
  }
  return out;
}

describe("Phase 4c category _index files", () => {
  const concepts = ["tiles", "resources", "buildings", "npcs", "zones", "hazards"] as const;

  for (const concept of concepts) {
    it(`bodyFor("${concept}", "_index") loads and is non-empty`, () => {
      const html = bodyFor(concept, "_index");
      expect(html, `Missing _index for ${concept}`).not.toBeNull();
      expect(html!.length).toBeGreaterThan(0);
    });

    it(`bodyFor("${concept}", "_index") has no broken [[wikilinks]]`, () => {
      const html = bodyFor(concept, "_index");
      if (!html) return;
      const links = extractWikiLinks(html);
      for (const raw of links) {
        const resolved = resolveWikiLink(raw);
        expect(resolved, `Broken wikilink [[${raw}]] in ${concept}/_index`).not.toBeNull();
      }
    });
  }
});

describe("Phase 4c entity body files", () => {
  const entries: Array<[string, string]> = [
    ["resources", "flour"],
    ["resources", "block"],
    ["resources", "supplies"],
    ["resources", "iron_bar"],
    ["buildings", "mill"],
    ["buildings", "kitchen"],
    ["buildings", "forge"],
    ["tools", "axe"],
    ["zones", "meadow"],
    ["zones", "quarry"],
    ["zones", "orchard"],
    ["zones", "crossroads"],
    ["zones", "caves"],
    ["zones", "fairground"],
    ["zones", "forge"],
    ["zones", "pit"],
    ["zones", "harbor"],
    ["zones", "oldcapital"],
  ];

  for (const [concept, key] of entries) {
    it(`bodyFor("${concept}", "${key}") loads and is non-empty`, () => {
      const html = bodyFor(concept, key);
      expect(html, `Missing body for ${concept}/${key}`).not.toBeNull();
      expect(html!.length).toBeGreaterThan(0);
    });

    it(`bodyFor("${concept}", "${key}") has no broken [[wikilinks]]`, () => {
      const html = bodyFor(concept, key);
      if (!html) return;
      const links = extractWikiLinks(html);
      for (const raw of links) {
        const resolved = resolveWikiLink(raw);
        expect(resolved, `Broken wikilink [[${raw}]] in ${concept}/${key}`).not.toBeNull();
      }
    });
  }
});

// ── Authored narrative pages (locked direction + parked) ──────────────────────
// `timeline`/`progression` render via the ProgressionPage React component, not
// authored HTML fragments, so they are intentionally excluded here. `overview`
// and `zones` have their own blocks.

describe("Authored narrative pages", () => {
  const authoredSlugs = ["direction", "balance", "future", "story"];
  for (const slug of authoredSlugs) {
    it(`pageFor("${slug}") is non-null and non-empty`, () => {
      const html = pageFor(slug);
      expect(html, `Missing page ${slug}`).not.toBeNull();
      expect(html!.length).toBeGreaterThan(0);
    });

    it(`pageFor("${slug}") has no broken [[wikilinks]]`, () => {
      const html = pageFor(slug);
      if (!html) return;
      const links = extractWikiLinks(html);
      for (const raw of links) {
        const resolved = resolveWikiLink(raw);
        expect(resolved, `Broken wikilink [[${raw}]] in pages/${slug}`).not.toBeNull();
      }
    });
  }

  it("the retired pages are gone", () => {
    expect(pageFor("zone-flow")).toBeNull();
    expect(pageFor("decisions")).toBeNull();
    expect(pageFor("progression")).toBeNull();
  });
});

// ── Zones (first-pass progression design) page ────────────────────────────────

describe("Zones page", () => {
  it('pageFor("zones") is non-null and non-empty', () => {
    const html = pageFor("zones");
    expect(html).not.toBeNull();
    expect(html!.length).toBeGreaterThan(0);
  });

  it('pageFor("zones") has no broken [[wikilinks]]', () => {
    const html = pageFor("zones");
    if (!html) return;
    const links = extractWikiLinks(html);
    for (const raw of links) {
      const resolved = resolveWikiLink(raw);
      expect(resolved, `Broken wikilink [[${raw}]] in pages/zones`).not.toBeNull();
    }
  });
});
