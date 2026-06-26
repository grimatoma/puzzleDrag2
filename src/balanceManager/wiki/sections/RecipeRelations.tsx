/**
 * RecipeRelations.tsx — Horizontal crafting-flow panel for recipe articles.
 *
 * Lives in the article body; the Related footer uses plain text links instead.
 */

import React from "react";
import { RecipeRelationsFlow, hasRecipeRelationFlow } from "../ConceptRefCard.jsx";

export { hasRecipeRelationFlow };

export interface RecipeRelationsProps {
  recipe: Record<string, unknown>;
}

export function RecipeRelations({ recipe }: RecipeRelationsProps) {
  if (!hasRecipeRelationFlow(recipe)) return null;

  return (
    <section id="recipe-relations">
      <h2 className="wiki-section-heading mb-2">Crafting flow</h2>
      <RecipeRelationsFlow recipe={recipe} />
    </section>
  );
}

export default RecipeRelations;
