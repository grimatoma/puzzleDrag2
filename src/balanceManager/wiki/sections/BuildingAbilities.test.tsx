// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { BuildingAbilities, hasHostAbilities } from "./BuildingAbilities.jsx";
import { getEntity } from "../conceptEntities.js";

afterEach(() => cleanup());

describe("BuildingAbilities", () => {
  it("powder_store has host abilities", () => {
    const entity = getEntity("buildings", "powder_store") as Record<string, unknown>;
    expect(hasHostAbilities("buildings", "powder_store", entity)).toBe(true);
  });

  it("renders rich ability cards with instance params for powder_store", () => {
    const entity = getEntity("buildings", "powder_store") as Record<string, unknown>;
    const { container } = render(
      <BalanceNavProvider focus={null} navigate={() => {}}>
        <BuildingAbilities conceptId="buildings" entityKey="powder_store" entity={entity} />
      </BalanceNavProvider>,
    );
    expect(document.body.textContent).toContain("Building abilities");
    expect(container.querySelector(".wiki-ability-instance")).not.toBeNull();
    expect(document.body.textContent).toMatch(/bomb/i);
  });
});
