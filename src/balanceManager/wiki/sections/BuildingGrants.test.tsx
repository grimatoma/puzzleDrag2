// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { BuildingGrants, hasBuildingGrants, buildingGrantRows } from "./BuildingGrants.jsx";

afterEach(() => cleanup());

describe("BuildingGrants", () => {
  it("the Powder Store produces bombs", () => {
    expect(hasBuildingGrants("powder_store")).toBe(true);
    expect(buildingGrantRows("powder_store").some((g) => g.tool === "bomb")).toBe(true);

    render(
      <BalanceNavProvider focus={null} navigate={() => {}}>
        <BuildingGrants buildingId="powder_store" />
      </BalanceNavProvider>,
    );
    expect(document.body.textContent ?? "").toMatch(/tools produced/i);
  });

  it("a building that hands out nothing renders no section", () => {
    expect(hasBuildingGrants("hearth")).toBe(false);
  });
});
