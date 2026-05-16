import { describe, it, expect } from "vitest";
import { renderDraftChangelog } from "../balanceManager/changelogExport.js";

describe("renderDraftChangelog", () => {
  it("opens with a title block + per-totals summary line", () => {
    const md = renderDraftChangelog({ version: 1 }, { version: 1, recipes: { bread: { coins: 10 } } });
    expect(md.startsWith("# Balance changelog")).toBe(true);
    expect(md).toMatch(/\d+ added · \d+ modified · \d+ removed/);
  });

  it("emits the no-changes fallback when the draft matches baseline", () => {
    const md = renderDraftChangelog({ a: 1 }, { a: 1 });
    expect(md).toMatch(/no changes/i);
  });

  it("produces a section per modified top-level catalog", () => {
    const md = renderDraftChangelog(
      { recipes: { bread: { coins: 10 } }, buildings: { granary: { coins: 50 } } },
      { recipes: { bread: { coins: 12 } }, buildings: {} },
    );
    expect(md).toMatch(/### recipes/);
    expect(md).toMatch(/### buildings/);
    expect(md).toMatch(/bread/);
    expect(md).toMatch(/granary/);
  });

  it("renders bullet glyphs for added / modified / removed entries", () => {
    const md = renderDraftChangelog(
      { recipes: { gone: { coins: 1 } } },
      { recipes: { newbie: { coins: 2 } } },
    );
    expect(md).toMatch(/\*\*\+\*\* `newbie`/);
    expect(md).toMatch(/\*\*−\*\* `gone`/);
  });

  it("captions value changes with before → after using inline code spans", () => {
    const md = renderDraftChangelog(
      { recipes: { bread: { coins: 10 } } },
      { recipes: { bread: { coins: 25 } } },
    );
    // Section heading "recipes" + a "before → after" line for bread.
    expect(md).toMatch(/`bread`: `\{coins\}` → `\{coins\}`/);
  });

  it("calls non-structural top-level fields the 'Top-level fields' section", () => {
    const md = renderDraftChangelog({ version: 1 }, { version: 2 });
    expect(md).toMatch(/### Top-level fields/);
    expect(md).toMatch(/`version`: `1` → `2`/);
  });
});
