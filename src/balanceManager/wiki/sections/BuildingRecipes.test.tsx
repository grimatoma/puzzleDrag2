// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { BuildingRecipes, hasBuildingRecipes, recipeLinksForBuilding } from "./BuildingRecipes.jsx";

afterEach(() => cleanup());

describe("BuildingRecipes", () => {
  it("lists bakery station recipes with visual cards", () => {
    expect(hasBuildingRecipes("bakery")).toBe(true);
    expect(recipeLinksForBuilding("bakery").length).toBeGreaterThanOrEqual(3);

    const { container } = render(
      <BalanceNavProvider focus={null} navigate={() => {}}>
        <BuildingRecipes buildingId="bakery" />
      </BalanceNavProvider>,
    );
    expect(container.querySelectorAll(".wiki-concept-ref-card").length).toBeGreaterThanOrEqual(3);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/flour/i);
    expect(body).toMatch(/bread/i);
  });
});
