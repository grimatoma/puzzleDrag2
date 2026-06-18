/**
 * derivedFacts.test.ts — Anti-drift guard for live, code-derived wiki facts.
 *
 * `derivedFacts.tsx` lets authored prose inject structured facts from code
 * (`<div data-wiki-tier-ladder="home">`, `<span data-wiki-fact="zone.home.rungCount">`)
 * so tier ladders / plot counts / costs / turn budgets can never drift. This
 * suite keeps that promise honest:
 *
 *   1. Every `data-wiki-fact` key referenced anywhere in content resolves
 *      (no dangling keys — a typo'd or removed key fails CI, not silently
 *      rendering a "?key?" marker in the live wiki).
 *   2. Every `data-wiki-tier-ladder` zone id is a real, tiered zone.
 *   3. The generated rows track ZONES exactly (renderer integrity).
 *   4. The high-drift economy pages (Direction, Balance) do NOT re-introduce a
 *      hand-authored tier/cost table — they MUST use the embed. This is the
 *      reverse-drift guard: it stops a future edit from typing the ladder back
 *      in as prose.
 */

import { describe, it, expect } from "vitest";
import { resolveFact, tierLadderRows } from "./derivedFacts.js";
import { ZONES, tiersForZone } from "../../features/zones/data.js";

// Raw HTML fragments — same glob htmlContent.ts loads from.
const RAW = import.meta.glob("../content/**/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Shorten an absolute glob key to a repo-relative content path for messages. */
function rel(path: string): string {
  return path.replace(/^.*\/content\//, "content/");
}

/** Pull every `attr="value"` occurrence across all content files. */
function collectAttr(attr: string): Array<{ file: string; value: string }> {
  const re = new RegExp(`${attr}="([^"]+)"`, "g");
  const out: Array<{ file: string; value: string }> = [];
  for (const [path, src] of Object.entries(RAW)) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) out.push({ file: rel(path), value: m[1] });
  }
  return out;
}

describe("derived wiki facts can't drift", () => {
  it("loads authored HTML fragments (guard the guard)", () => {
    expect(Object.keys(RAW).length).toBeGreaterThan(0);
  });

  it("every data-wiki-fact key referenced in content resolves from code", () => {
    const refs = collectAttr("data-wiki-fact");
    for (const { file, value } of refs) {
      expect(
        resolveFact(value),
        `${file}: data-wiki-fact="${value}" does not resolve — fix the key or extend resolveFact()`,
      ).not.toBeNull();
    }
  });

  it("every data-wiki-tier-ladder zone id is a real, tiered zone", () => {
    const refs = collectAttr("data-wiki-tier-ladder");
    for (const { file, value } of refs) {
      expect(ZONES[value], `${file}: data-wiki-tier-ladder="${value}" is not a zone`).toBeTruthy();
      expect(
        tiersForZone(value).length,
        `${file}: zone "${value}" has no tier ladder to render`,
      ).toBeGreaterThan(0);
    }
  });

  it("generated ladder rows track ZONES exactly", () => {
    for (const zoneId of Object.keys(ZONES)) {
      const tiers = tiersForZone(zoneId);
      const rows = tierLadderRows(zoneId);
      expect(rows.length).toBe(tiers.length);
      rows.forEach((r, i) => {
        expect(r.name).toBe(tiers[i].name);
        expect(r.plots).toBe(tiers[i].plots);
        expect(r.unlocks).toEqual([...tiers[i].unlocks]);
      });
    }
  });
});

describe("economy pages use the embed, not a hand-typed ladder", () => {
  // The two pages that drifted hardest (the PC2 cost port left them claiming a
  // 3-rung home ladder vs the code's 6-rung Camp→Manor). They must render the
  // ladder live; they must NOT hand-author a Plots/cost column.
  const ECONOMY_PAGES = ["pages/direction", "pages/balance"];

  for (const slug of ECONOMY_PAGES) {
    const entry = Object.entries(RAW).find(([p]) => rel(p) === `content/${slug}.html`);

    it(`${slug}.html exists`, () => {
      expect(entry, `missing ${slug}.html`).toBeTruthy();
    });

    it(`${slug}.html renders the tier ladder via data-wiki-tier-ladder`, () => {
      if (!entry) return;
      expect(
        /data-wiki-tier-ladder=/.test(entry[1]),
        `${slug}.html must render the ladder live via <div data-wiki-tier-ladder="...">`,
      ).toBe(true);
    });

    it(`${slug}.html does not hand-author a tier/cost table`, () => {
      if (!entry) return;
      const src = entry[1];
      // A hand-typed ladder table has a "Plots" or "Upgrade/Tuned cost" column
      // header. The generated table builds those headers in React, never in the
      // content HTML — so finding one here means the ladder was re-typed as prose.
      const offender = /<th[^>]*>\s*(plots|tuned cost|upgrade cost)\s*<\/th>/i.exec(src);
      expect(
        offender,
        `${slug}.html hand-authors a ladder column ("${offender?.[1]}") — use <div data-wiki-tier-ladder="..."> instead`,
      ).toBeNull();
    });
  }
});
