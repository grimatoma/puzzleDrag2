// @vitest-environment jsdom
/**
 * ConceptRefCard.test.tsx — Rich wiki reference widgets.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import { ConceptRefCard, RelationRefGrid } from "./ConceptRefCard.jsx";
import { getEntity } from "./conceptEntities.js";
import { wikiNavTarget } from "./WikiLinkButton.jsx";

afterEach(() => cleanup());

function renderCard(
  props: React.ComponentProps<typeof ConceptRefCard>,
  navigate = vi.fn(),
) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <ConceptRefCard {...props} />
    </BalanceNavProvider>,
  );
}

describe("ConceptRefCard — recipe (card)", () => {
  it("renders RecipeIO inputs and output for rec_bread", () => {
    renderCard({ conceptId: "recipes", entityKey: "rec_bread", variant: "card" });
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/flour/i);
    expect(body).toMatch(/bread/i);
  });

  it("navigates with wikiNavTarget on click", () => {
    const navigate = vi.fn();
    renderCard({ conceptId: "recipes", entityKey: "rec_bread", variant: "card" }, navigate);
    fireEvent.click(screen.getByRole("button"));
    expect(navigate).toHaveBeenCalledWith(wikiNavTarget("recipes", "rec_bread"));
  });
});

describe("ConceptRefCard — building (card)", () => {
  it("renders building card with cost chips for bakery", () => {
    const { container } = renderCard({ conceptId: "buildings", entityKey: "bakery", variant: "card" });
    expect(getEntity("buildings", "bakery")).not.toBeNull();
    expect(container.querySelector(".wiki-concept-ref-card")).not.toBeNull();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/bakery/i);
    expect(body).toContain("coins");
  });
});

describe("ConceptRefCard — resource (inline)", () => {
  it("renders icon and label for flour inline variant", () => {
    renderCard({ conceptId: "resources", entityKey: "flour", variant: "inline" });
    expect(screen.getByRole("button")).toBeTruthy();
    expect(document.body.textContent).toMatch(/flour/i);
  });
});

describe("RelationRefGrid", () => {
  it("renders a grid of concept ref cards for recipe links", () => {
    render(
      <BalanceNavProvider focus={null} navigate={vi.fn()}>
        <RelationRefGrid
          links={[
            { conceptId: "recipes", key: "rec_bread", label: "Bread recipe" },
            { conceptId: "recipes", key: "rec_honeyroll", label: "Honey roll" },
          ]}
        />
      </BalanceNavProvider>,
    );
    expect(document.querySelectorAll(".wiki-concept-ref-card").length).toBe(2);
  });
});
