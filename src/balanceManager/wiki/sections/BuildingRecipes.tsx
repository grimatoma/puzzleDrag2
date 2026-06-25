/**
 * BuildingRecipes.tsx — Visual roster of recipes crafted at a building station.
 */

import React from "react";
import { canonicalRecipeEntries } from "../../recipeCatalog.js";
import { RelationRefGrid } from "../ConceptRefCard.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import type { WikiLink } from "../relations.js";

/** Recipe ids whose `station` matches `buildingId`. */
export function recipeLinksForBuilding(buildingId: string): WikiLink[] {
  return canonicalRecipeEntries()
    .filter(([, rec]) => rec.station === buildingId)
    .map(([recId]) => ({
      conceptId: "recipes",
      key: recId,
      label: iconLabel(recId) ?? recId,
    }));
}

export function hasBuildingRecipes(buildingId: string): boolean {
  return recipeLinksForBuilding(buildingId).length > 0;
}

export interface BuildingRecipesProps {
  buildingId: string;
}

export function BuildingRecipes({ buildingId }: BuildingRecipesProps) {
  const links = recipeLinksForBuilding(buildingId);
  if (links.length === 0) return null;

  return (
    <section id="building-recipes">
      <h2 className="wiki-section-heading mb-2">Recipes crafted here</h2>
      <RelationRefGrid links={links} />
    </section>
  );
}

export default BuildingRecipes;
