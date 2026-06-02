// @vitest-environment jsdom
/**
 * Integration tests for wiki cross-links in EntityDetail.
 *
 * Coverage:
 *  1. Zone entity: a building link renders and clicking it navigates wiki → buildings.
 *  2. Recipe entity: clicking an ingredient link navigates to the correct concept.
 *  3. No editable controls introduced by the Related section.
 *  4. If groups is empty (concept with no relations), no RelationalFooter renders.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceManager/balanceNav.jsx";
import EntityDetail from "../balanceManager/wiki/EntityDetail.jsx";
import { ZONES } from "../features/zones/data.js";
import { SEASONS } from "../constants.js";
import { getEntity, conceptForKey } from "../balanceManager/wiki/conceptEntities.js";
import { canonicalRecipeEntries } from "../balanceManager/recipeCatalog.js";

afterEach(() => cleanup());

// ─── Resolve real keys ────────────────────────────────────────────────────────

// A zone with buildings that resolve to real building entries
const zoneWithBuildings = Object.entries(ZONES).find(([, z]) => {
  const rec = z as Record<string, unknown>;
  const bldgs = rec.buildings as string[] | undefined;
  return Array.isArray(bldgs) && bldgs.some((b) => getEntity("buildings", b) !== null);
});
const realZoneId = zoneWithBuildings![0];
const realZoneEntity = zoneWithBuildings![1] as Record<string, unknown>;
const firstRealBuilding = (realZoneEntity.buildings as string[]).find(
  (b) => getEntity("buildings", b) !== null,
)!;

// A real recipe with at least one ingredient that resolves
const bakeryRecipe = canonicalRecipeEntries().find(([, r]) => r.station === "bakery");
const [realRecipeId, realRecipeDto] = bakeryRecipe!;
const realIngredient = Object.keys(realRecipeDto.inputs).find(
  (k) => conceptForKey(k) !== null,
)!;
const realIngredientConcept = conceptForKey(realIngredient)!;

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderDetail(
  conceptId: string,
  entityKey: string,
  navigate: ReturnType<typeof vi.fn>,
) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <EntityDetail conceptId={conceptId} entityKey={entityKey} onBack={() => {}} />
    </BalanceNavProvider>,
  );
}

// ─── 1. Zone: building link renders and triggers navigation ───────────────────

describe("Wiki cross-links — zone entity", () => {
  it("renders a building link button for a zone with buildings", () => {
    const navigate = vi.fn();
    renderDetail("zones", realZoneId, navigate);

    // The link renders inside the Related section as a RefButton with title attr
    const buildingLink = screen.queryAllByTitle(`buildings:${firstRealBuilding}`)[0];
    expect(buildingLink, `Expected a link button for buildings:${firstRealBuilding}`).toBeDefined();
  });

  it("clicking a building link calls navigate with wiki tab and buildings focus", () => {
    const navigate = vi.fn();
    renderDetail("zones", realZoneId, navigate);

    const buildingLink = screen.queryAllByTitle(`buildings:${firstRealBuilding}`)[0];
    expect(buildingLink).toBeDefined();

    fireEvent.click(buildingLink!);

    expect(navigate).toHaveBeenCalledWith({
      tab: "wiki",
      focus: `buildings:${firstRealBuilding}`,
    });
  });
});

// ─── 2. Recipe: ingredient link navigates to the correct concept ──────────────

describe("Wiki cross-links — recipe entity", () => {
  it("renders an ingredient link for a real recipe", async () => {
    const navigate = vi.fn();
    renderDetail("recipes", realRecipeId, navigate);

    await waitFor(() => {
      const link = screen.queryAllByTitle(`${realIngredientConcept}:${realIngredient}`)[0];
      expect(link).toBeDefined();
    });
  });

  it("clicking an ingredient link navigates to the correct conceptId:key", async () => {
    const navigate = vi.fn();
    renderDetail("recipes", realRecipeId, navigate);

    await waitFor(() => {
      const link = screen.queryAllByTitle(`${realIngredientConcept}:${realIngredient}`)[0];
      expect(link).toBeDefined();
    });

    const link = screen.queryAllByTitle(`${realIngredientConcept}:${realIngredient}`)[0]!;
    fireEvent.click(link);

    expect(navigate).toHaveBeenCalledWith({
      tab: "wiki",
      focus: `${realIngredientConcept}:${realIngredient}`,
    });
  });
});

// ─── 3. No editable controls ─────────────────────────────────────────────────

describe("Wiki cross-links — read-only invariant", () => {
  it("zone entity with related section renders zero editable controls", () => {
    const navigate = vi.fn();
    const { container } = renderDetail("zones", realZoneId, navigate);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });

  it("recipe entity with related section renders zero editable controls", () => {
    const navigate = vi.fn();
    const { container } = renderDetail("recipes", realRecipeId, navigate);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});

// ─── 4. No Related section when groups is empty ───────────────────────────────

describe("Wiki cross-links — no related section for concepts with no relations", () => {
  it("a concept with no relations (e.g. seasons) renders no Related heading", () => {
    const navigate = vi.fn();
    // seasons are live-config only and don't have relations
    renderDetail("seasons", SEASONS[0].name, navigate);

    // "Related" heading should not appear
    expect(screen.queryByText(/^Related$/i)).toBeNull();
  });
});
