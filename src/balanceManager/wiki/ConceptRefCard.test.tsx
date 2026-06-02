// @vitest-environment jsdom
/**
 * ConceptRefCard.test.tsx — Rich wiki reference widgets.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import {
  ConceptRefCard,
  RelationRefGrid,
  RecipeRelationsFlow,
} from "./ConceptRefCard.jsx";
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
  it("renders building illustration and name without cost chips", () => {
    const { container } = renderCard({ conceptId: "buildings", entityKey: "chapel", variant: "card" });
    expect(getEntity("buildings", "chapel")).not.toBeNull();
    expect(container.querySelector(".wiki-concept-ref-card--building")).not.toBeNull();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/chapel/i);
    expect(container.querySelector(".wiki-concept-ref-card__body")).toBeNull();
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

describe("ConceptRefCard — compact resource card", () => {
  it("does not render entity key or concept pill for flour", () => {
    const { container } = renderCard({
      conceptId: "resources",
      entityKey: "flour",
      variant: "card",
      layout: "compact",
    });
    expect(container.querySelector(".wiki-concept-ref-card--compact")).not.toBeNull();
    expect(container.querySelector(".wiki-concept-ref-card__key")).toBeNull();
    expect(container.textContent).not.toMatch(/resources/i);
  });
});

describe("RecipeRelationsFlow", () => {
  it("renders a horizontal flow with arrows for rec_harvestpie", () => {
    const entity = getEntity("recipes", "rec_harvestpie") as Record<string, unknown>;
    if (entity == null) return;
    render(
      <BalanceNavProvider focus={null} navigate={vi.fn()}>
        <RecipeRelationsFlow recipe={entity} />
      </BalanceNavProvider>,
    );
    expect(document.querySelector(".wiki-recipe-relation-flow")).not.toBeNull();
    expect(document.querySelectorAll(".wiki-recipe-relation-flow__arrow").length).toBeGreaterThan(0);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/flour|Flour/i);
    expect(body).toMatch(/bakery|Bakery/i);
  });
});


describe("ConceptRefCard — ability with host context", () => {
  it("renders instance params for grant_tool on powder_store", () => {
    const { container } = renderCard({
      conceptId: "abilities",
      entityKey: "grant_tool",
      variant: "card",
      context: { params: { tool: "bomb", amount: 2 }, trigger: "season_end" },
    });
    expect(container.querySelector(".wiki-ability-instance")).not.toBeNull();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/season end/i);
    expect(body).toMatch(/bomb/i);
    expect(body).toContain("2");
  });
});
