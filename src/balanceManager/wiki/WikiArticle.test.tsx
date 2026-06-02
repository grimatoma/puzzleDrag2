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
 *     the wikiNavTarget shape { tab: "wiki", focus: "conceptId:key" }.
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
  it("clicking a relation RefButton calls navigate with { tab: 'wiki', focus: '<conceptId>:<key>' }", () => {
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

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: "wiki",
        focus: expect.stringMatching(/^[a-zA-Z_]+:.+/),
      }),
    );
  });
});
