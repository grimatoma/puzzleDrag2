/**
 * staleContent.test.ts — Anti-drift guard for authored wiki content.
 *
 * The wiki's catalog is generated live from code and cannot drift, but the
 * hand-authored HTML under src/balanceManager/content/ can keep referencing a
 * system long after it was removed or renamed (e.g. a deleted config file, a
 * folder that no longer exists). htmlContent.test.ts already guards that every
 * fragment loads and its [[wikilinks]] resolve — this guards the prose itself.
 *
 * It scans every authored fragment for tokens that name a retired system and
 * fails if one reappears. When you remove or rename a system, add its old name
 * here in the SAME change; when a name on this list becomes legitimate again,
 * remove it here in the same change.
 */

import { describe, it, expect } from "vitest";

// Raw HTML fragments — same glob htmlContent.ts loads from.
const RAW = import.meta.glob("../content/**/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Tokens that name a removed/renamed system. Keep each `why` actionable. */
const FORBIDDEN: Array<{ token: RegExp; why: string }> = [
  {
    token: /balance\.json/,
    why: "balance.json and its override pipeline were removed; tuning is baked into literal consts. Point readers at the Dev Panel or src/config/schemas/ instead.",
  },
  {
    token: /docs\/engineering\//,
    why: "docs/engineering/ does not exist. Point code-knowledge references at CLAUDE.md or src/.",
  },
];

/** Shorten an absolute glob key to a repo-relative content path for messages. */
function rel(path: string): string {
  return path.replace(/^.*\/content\//, "content/");
}

describe("authored wiki content references no removed systems", () => {
  // Guard the guard: a broken glob (0 files) must not silently pass everything.
  it("loads authored HTML fragments", () => {
    expect(Object.keys(RAW).length).toBeGreaterThan(0);
  });

  for (const [path, src] of Object.entries(RAW)) {
    for (const { token, why } of FORBIDDEN) {
      it(`${rel(path)} does not mention /${token.source}/`, () => {
        expect(
          token.test(src),
          `${rel(path)} references a removed system (/${token.source}/): ${why}`,
        ).toBe(false);
      });
    }
  }
});
