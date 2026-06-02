// @vitest-environment jsdom
/**
 * CraftTree.test.tsx — TDD suite for the wiki crafting-dependency tree.
 *
 * Uses real catalog data. `rec_hound` is a confirmed multi-level recipe whose
 * tree includes `bread` (produced by `rec_bread`) feeding into flour/eggs, so
 * it exercises nested expansion and the upstream-recipe summary. `rec_bread`
 * is a flatter two-input recipe (flour + eggs, both raw).
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { CraftTree, hasCraftTree, recipeIdProducing } from "./CraftTree.jsx";

afterEach(() => cleanup());

function renderTree(recipeId: string, navigate = vi.fn()) {
  const r = render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <CraftTree recipeId={recipeId} />
    </BalanceNavProvider>,
  );
  return { ...r, navigate };
}

describe("CraftTree — multi-level recipe (rec_hound)", () => {
  it("renders the heading and nested ingredient labels", () => {
    renderTree("rec_hound");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Crafting tree");
    // Direct ingredient `bread` and its nested ingredient `flour` both render.
    expect(body).toMatch(/bread/i);
    expect(body).toMatch(/flour/i);
  });

  it("renders a 'Raw inputs' summary and an 'Upstream recipes' count", () => {
    renderTree("rec_hound");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Raw inputs:");
    expect(body).toContain("Upstream recipes:");
  });

  it("renders navigable ingredient chips that navigate via wikiNavTarget", () => {
    const { navigate } = renderTree("rec_hound");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0] as { tab: string; focus: string };
    expect(arg.focus).toMatch(/^[a-zA-Z_]+:.+/);
    expect(arg.tab).toBe(arg.focus.slice(0, arg.focus.indexOf(":")));
  });
});

describe("CraftTree — flat recipe (rec_bread)", () => {
  it("renders flour and eggs as raw ingredients", () => {
    renderTree("rec_bread");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/flour/i);
    expect(body).toMatch(/raw/i);
  });
});

describe("CraftTree — unknown recipe", () => {
  it("renders nothing for a recipe id that does not exist", () => {
    const { container } = renderTree("rec_does_not_exist");
    expect(hasCraftTree("rec_does_not_exist")).toBe(false);
    expect(container.querySelector("#crafting-tree")).toBeNull();
    expect((container.textContent ?? "").trim()).toBe("");
  });
});

describe("recipeIdProducing", () => {
  it("resolves the producing recipe for a craftable item", () => {
    expect(recipeIdProducing("bread")).not.toBeNull();
  });
  it("returns null for a raw item", () => {
    expect(recipeIdProducing("grain")).toBeNull();
  });
});
