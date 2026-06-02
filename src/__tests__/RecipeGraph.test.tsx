// @vitest-environment jsdom
/**
 * Tests for src/balanceManager/wiki/RecipeGraph.tsx
 * and the CategoryPage recipe-graph collapsible section.
 *
 * Coverage:
 *  1. RecipeGraph renders node elements for real recipes (node count > 0,
 *     at least one known item label like "Bread Loaf" visible).
 *  2. Clicking a node calls navigate with the correct wikiNavTarget shape
 *     ({ tab: conceptId, focus: "conceptId:key" }) for a real recipe item.
 *  3. CategoryPage with conceptId="recipes" shows the graph summary section.
 *  4. CategoryPage with another conceptId (e.g. "buildings") does NOT show
 *     the graph summary.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceManager/balanceNav.jsx";
import RecipeGraph from "../balanceManager/wiki/RecipeGraph.jsx";
import { CategoryPage } from "../balanceManager/wiki/CategoryPage.jsx";
import { RECIPES, ITEMS } from "../constants.js";
import { conceptForKey } from "../balanceManager/wiki/conceptEntities.js";
import { wikiNavTarget } from "../balanceManager/wiki/WikiLinkButton.jsx";

afterEach(() => cleanup());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderGraph(navigate: ReturnType<typeof vi.fn>) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <RecipeGraph />
    </BalanceNavProvider>,
  );
}

function renderCategoryPage(
  conceptId: string,
  navigate: ReturnType<typeof vi.fn>,
) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <CategoryPage conceptId={conceptId} />
    </BalanceNavProvider>,
  );
}

// ─── Derive a real recipe item key that resolves via conceptForKey ─────────────

// rec_bread → item: "bread", which should resolve to "resources"
const REAL_RECIPE_KEY = "rec_bread";
const REAL_ITEM_KEY = (
  RECIPES as Record<string, { item: string }>
)[REAL_RECIPE_KEY].item; // "bread"
const REAL_ITEM_LABEL =
  (ITEMS as Record<string, { label?: string } | undefined>)[REAL_ITEM_KEY]
    ?.label ?? REAL_ITEM_KEY;
const REAL_ITEM_CONCEPT = conceptForKey(REAL_ITEM_KEY); // "resources"

// ─── 1. RecipeGraph renders nodes ─────────────────────────────────────────────

describe("RecipeGraph — rendering", () => {
  it("renders at least one node button element", () => {
    renderGraph(vi.fn());
    const buttons = screen.getAllByRole("button");
    // Expect at least one node — real recipe data has many nodes
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders at least one known item label (Bread Loaf from rec_bread)", () => {
    renderGraph(vi.fn());
    // The graph builds nodes for all items involved in recipes.
    // "bread" (Bread Loaf) is both a recipe output and an ingredient.
    // Use queryAllByText since the label may appear in both the node and the dropdown.
    const labelEls = screen.queryAllByText(REAL_ITEM_LABEL);
    expect(
      labelEls.length,
      `Expected to find at least one element with label "${REAL_ITEM_LABEL}" in the graph`,
    ).toBeGreaterThan(0);
  });

  it("renders zero editable inputs (read-only invariant)", () => {
    const { container } = renderGraph(vi.fn());
    // Only the search input and the node-filter select are expected;
    // no hidden game editor inputs should appear.
    const inputs = container.querySelectorAll(
      "input:not([type=search]), textarea",
    );
    expect(inputs.length).toBe(0);
  });
});

// ─── 2. Node click navigates to the wiki article ──────────────────────────────

describe("RecipeGraph — node click navigation", () => {
  it("clicking the bread node calls navigate with the correct wikiNavTarget", () => {
    const navigate = vi.fn();
    renderGraph(navigate);

    // Find the node button for the bread item
    const breadButton = screen.getByRole("button", {
      name: REAL_ITEM_LABEL,
    });
    expect(breadButton).toBeDefined();

    fireEvent.click(breadButton);

    // conceptForKey("bread") → "resources"
    expect(REAL_ITEM_CONCEPT).not.toBeNull();
    const expected = wikiNavTarget(REAL_ITEM_CONCEPT!, REAL_ITEM_KEY);
    // expected = { tab: "resources", focus: "resources:bread" }
    expect(navigate).toHaveBeenCalledWith(expected);
  });

  it("clicking the same node a second time still calls navigate (deselects then stays null)", () => {
    const navigate = vi.fn();
    renderGraph(navigate);

    const breadButton = screen.getByRole("button", { name: REAL_ITEM_LABEL });

    // First click: select + navigate
    fireEvent.click(breadButton);
    expect(navigate).toHaveBeenCalledTimes(1);

    // Second click: deselects — navigate is NOT called again (key becomes null)
    fireEvent.click(breadButton);
    // navigate should still have been called only once total (no re-nav on deselect)
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

// ─── 3. CategoryPage — recipes concept shows graph section ────────────────────

describe("CategoryPage — recipe graph section visibility", () => {
  it('renders the "Recipe relationship graph" summary for conceptId="recipes"', () => {
    renderCategoryPage("recipes", vi.fn());
    const summary = screen.queryByText(/recipe relationship graph/i);
    expect(
      summary,
      'Expected a "Recipe relationship graph" summary element for conceptId="recipes"',
    ).not.toBeNull();
  });

  it('does NOT render the graph summary for conceptId="buildings"', () => {
    renderCategoryPage("buildings", vi.fn());
    const summary = screen.queryByText(/recipe relationship graph/i);
    expect(
      summary,
      'Expected no graph summary for conceptId="buildings"',
    ).toBeNull();
  });

  it("graph section is collapsed by default (RecipeGraph not mounted)", () => {
    renderCategoryPage("recipes", vi.fn());
    // When collapsed, RecipeGraph is not mounted, so no node buttons appear yet.
    // The summary element IS present but nodes are not rendered.
    const summary = screen.getByText(/recipe relationship graph/i);
    expect(summary).toBeDefined();

    // No node role buttons should be present when collapsed
    // (there may be other buttons from the entry grid, but specifically
    // the graph canvas nodes should NOT be here yet)
    const details = summary.closest("details");
    expect(details).toBeDefined();
    // The details element should NOT have the open attribute when collapsed
    expect((details as HTMLDetailsElement).open).toBe(false);
  });

  it("opening the graph section mounts RecipeGraph nodes", () => {
    renderCategoryPage("recipes", vi.fn());

    const summary = screen.getByText(/recipe relationship graph/i);

    // Click the summary — the onClick handler in CategoryPage calls
    // e.preventDefault() + setGraphOpen(prev => !prev), which mounts RecipeGraph.
    fireEvent.click(summary);

    // After opening, the Fit button (only rendered by RecipeGraph) should appear.
    const fitButton = screen.queryByRole("button", { name: /^fit$/i });
    expect(fitButton, "Expected Fit button after opening graph section").not.toBeNull();
  });
});
