// @vitest-environment jsdom
/**
 * WhereUsed.test.tsx — TDD suite for the wiki "Used in" cross-reference section.
 *
 * Uses real catalog data (no fakes). Real ids confirmed via
 * buildItemReferenceIndex: `plank` is consumed by recipes AND a building cost
 * AND fed by upgrade chains; `grain` has zero usages.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { WhereUsed, hasWhereUsed } from "./WhereUsed.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";

afterEach(() => cleanup());

function renderWhereUsed(itemId: string, navigate = vi.fn()) {
  const r = render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <WhereUsed itemId={itemId} />
    </BalanceNavProvider>,
  );
  return { ...r, navigate };
}

describe("WhereUsed — referenced item (plank)", () => {
  it("renders the 'Used in' heading and grouped subheadings", () => {
    renderWhereUsed("plank");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Used in");
    // plank has recipe_input, building_cost, and chain_next usages
    expect(body).toContain("Consumed by recipes");
    expect(body).toContain("Costs toward buildings");
  });

  it("renders at least one navigable chip with a label and a ×qty detail", () => {
    renderWhereUsed("plank");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/×\d+/);
  });

  it("clicking a recipe-input chip navigates via wikiNavTarget to a recipes article", () => {
    const { navigate } = renderWhereUsed("plank");
    // Find a button whose title encodes a recipes target.
    const recipeBtn = screen
      .getAllByRole("button")
      .find((b) => (b.getAttribute("title") ?? "").startsWith("recipes:"));
    expect(recipeBtn).toBeDefined();
    fireEvent.click(recipeBtn!);
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0] as { tab: string; focus: string };
    expect(arg.tab).toBe("recipes");
    expect(arg.focus).toMatch(/^recipes:.+/);
    // Matches the wikiNavTarget contract.
    const title = recipeBtn!.getAttribute("title")!;
    const key = title.slice("recipes:".length);
    expect(arg).toEqual(wikiNavTarget("recipes", key));
  });
});

describe("WhereUsed — unreferenced item (grain)", () => {
  it("renders nothing when the item has no usages", () => {
    const { container } = renderWhereUsed("grain");
    expect(hasWhereUsed("grain")).toBe(false);
    expect(container.querySelector("#used-in")).toBeNull();
    expect((container.textContent ?? "").trim()).toBe("");
  });
});

describe("hasWhereUsed precheck", () => {
  it("is true for a referenced item and false for an isolated one", () => {
    expect(hasWhereUsed("plank")).toBe(true);
    expect(hasWhereUsed("grain")).toBe(false);
  });
});
