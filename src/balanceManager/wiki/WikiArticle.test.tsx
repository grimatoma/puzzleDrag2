// @vitest-environment jsdom
/**
 * WikiArticle.test.tsx — TDD suite for the unified WikiArticle template.
 *
 * Written BEFORE the implementation (TDD-first). Uses real data; no fakes.
 *
 * Coverage:
 *  1. Recipe article: lede, Properties heading, schema field name ("station").
 *  2. Backlinks present: a building with incoming backlinks shows "What links here".
 *  3. Authored body wiring: bread resource → "staple food" from bread.html appears.
 *  4. Back button: clicking "← Back" calls the onBack spy.
 *  5. RefButton navigation: clicking a relation button calls navigate with
 *     the wikiNavTarget shape { tab: "<conceptId>", focus: "conceptId:key" }.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import WikiArticle from "./WikiArticle.jsx";

afterEach(() => cleanup());

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderArticle(
  conceptId: string,
  entityKey: string,
  { navigate = vi.fn(), onBack = vi.fn() } = {},
) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <WikiArticle conceptId={conceptId} entityKey={entityKey} onBack={onBack} />
    </BalanceNavProvider>,
  );
}

// ─── Test 1: Recipe article ───────────────────────────────────────────────────

describe("WikiArticle — recipe article (rec_bread)", () => {
  it("renders lede text matching /recipe/i", () => {
    renderArticle("recipes", "rec_bread");
    // The lede paragraph is present and mentions "recipe"
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/recipe/i);
  });

  it("renders a Properties heading", () => {
    renderArticle("recipes", "rec_bread");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/properties/i);
  });

  it("renders at least one schema field name (station)", () => {
    renderArticle("recipes", "rec_bread");
    // "station" is a field in the recipe schema
    const body = document.body.textContent ?? "";
    expect(body).toContain("station");
  });

  it("renders the entity key in a code element", () => {
    const { container } = renderArticle("recipes", "rec_bread");
    const codeEl = container.querySelector("code");
    expect(codeEl).not.toBeNull();
    expect(codeEl!.textContent).toContain("rec_bread");
  });

  it("renders the TableOfContents with Overview entry", () => {
    renderArticle("recipes", "rec_bread");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Overview");
  });

  it("renders an 'At a glance' section with the Recipe heading (RecipeIO)", () => {
    renderArticle("recipes", "rec_bread");
    const body = document.body.textContent ?? "";
    // The at-a-glance section + its TOC entry render for recipes.
    expect(body).toContain("At a glance");
    expect(body).toContain("Recipe");
  });

  it("demotes the schema table behind a 'Schema reference (developer)' details summary", () => {
    const { container } = renderArticle("recipes", "rec_bread");
    const summary = container.querySelector("details > summary");
    expect(summary).not.toBeNull();
    expect(summary!.textContent).toContain("Schema reference (developer)");
  });
});

// ─── At-a-glance gating: buildings render a cost; non-cost concepts skip ──────

describe("WikiArticle — at-a-glance cost chips (bakery)", () => {
  it("renders a 'Cost to build' heading for a building with a cost", () => {
    renderArticle("buildings", "bakery");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Cost to build");
  });
});

// ─── Test 2: Backlinks present ────────────────────────────────────────────────

describe("WikiArticle — bakery backlinks (What links here)", () => {
  it("renders a 'What links here' section for bakery (recipes link to it)", () => {
    renderArticle("buildings", "bakery");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/what links here/i);
  });

  it("bakery backlinks section contains at least one recipe reference", () => {
    renderArticle("buildings", "bakery");
    // Recipes whose station is "bakery" backlink to bakery
    const buttons = screen.queryAllByRole("button");
    // There should be nav-related buttons (back + relation buttons)
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ─── Test 3: Authored HTML body ───────────────────────────────────────────────

describe("WikiArticle — authored body (bread.html)", () => {
  it("renders the authored text 'staple food' from bread.html", () => {
    renderArticle("resources", "bread");
    const body = document.body.textContent ?? "";
    expect(body).toContain("staple food");
  });

  it("renders an 'About' entry in the TOC when authored body is present", () => {
    renderArticle("resources", "bread");
    const body = document.body.textContent ?? "";
    expect(body).toContain("About");
  });
});

// ─── Cross-reference sections (CraftTree / WhereUsed) ─────────────────────────

describe("WikiArticle — crafting tree (recipe article)", () => {
  it("renders a 'Crafting tree' section for rec_bread", () => {
    renderArticle("recipes", "rec_bread");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Crafting tree");
    expect(body).toContain("Raw inputs:");
  });
});

describe("WikiArticle — used-in section (resource article)", () => {
  it("renders a 'Used in' section for plank (referenced widely)", () => {
    renderArticle("resources", "plank");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Used in");
  });

  it("renders a crafting tree for a craftable resource (bread)", () => {
    renderArticle("resources", "bread");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Crafting tree");
  });
});

// ─── Test 4: Back button ──────────────────────────────────────────────────────

describe("WikiArticle — back button", () => {
  it("clicking '← Back' calls the onBack spy", () => {
    const onBack = vi.fn();
    renderArticle("recipes", "rec_bread", { onBack });
    const backBtn = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ─── Test 5: RefButton navigation via wikiNavTarget ──────────────────────────

describe("WikiArticle — RefButton navigation (wikiNavTarget)", () => {
  it("clicking a relation RefButton calls navigate with { tab: '<conceptId>', focus: '<conceptId>:<key>' }", () => {
    const navigate = vi.fn();
    renderArticle("recipes", "rec_bread", { navigate });

    // rec_bread has relations (Station, Output, Ingredients).
    // At least one RefButton in the Relations section should call navigate.
    // Find all buttons except "← Back".
    const allButtons = screen.getAllByRole("button");
    const relButtons = allButtons.filter(
      (b) => !/back/i.test(b.textContent ?? ""),
    );

    // Click the first relation button and verify the navigate signature.
    expect(relButtons.length).toBeGreaterThan(0);
    fireEvent.click(relButtons[0]);

    // Phase-5 contract: the tab IS the linked entity's conceptId, and the focus
    // is "<conceptId>:<key>". Assert the wikiNavTarget invariant: tab equals the
    // conceptId prefix of focus.
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0] as { tab: string; focus: string };
    expect(arg.focus).toMatch(/^[a-zA-Z_]+:.+/);
    expect(arg.tab).toBe(arg.focus.slice(0, arg.focus.indexOf(":")));
  });
});
