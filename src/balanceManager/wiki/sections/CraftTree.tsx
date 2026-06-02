/**
 * CraftTree.tsx — Crafting dependency tree for the Game Wiki.
 */

import React from "react";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey } from "../refs.js";
import {
  traceRecipe,
  countRawInputs,
  collectUpstreamRecipes,
  type RecipeTreeNode,
  type RecipeTreeIngredient,
} from "../../recipeGraph.js";
import { RECIPES } from "../../../constants.js";

const PRODUCER_BY_ITEM: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [recipeId, recipe] of Object.entries(RECIPES as Record<string, { item?: string }>)) {
    const item = recipe?.item;
    if (typeof item === "string" && !map.has(item)) map.set(item, recipeId);
  }
  return map;
})();

export function recipeIdProducing(itemId: string): string | null {
  return PRODUCER_BY_ITEM.get(itemId) ?? null;
}

export function hasCraftTree(recipeId: string | null | undefined): boolean {
  return recipeId != null && traceRecipe(recipeId) != null;
}

function IngredientList({ ingredients, depth }: { ingredients: RecipeTreeIngredient[]; depth: number }) {
  if (ingredients.length === 0) return null;
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        paddingLeft: depth === 0 ? 0 : 18,
        borderLeft: depth === 0 ? "none" : `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {ingredients.map((ing, i) => (
        <IngredientRow key={`${ing.id}:${i}`} ingredient={ing} depth={depth} />
      ))}
    </ul>
  );
}

function IngredientRow({ ingredient, depth }: { ingredient: RecipeTreeIngredient; depth: number }) {
  const label = ingredient.label || (iconLabel(ingredient.id) ?? ingredient.id);
  const source = ingredient.sources[0] ?? null;
  return (
    <li>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          flexWrap: "wrap",
        }}
      >
        <ConceptRefForKey entityKey={ingredient.id} label={label} variant="inline" />
        <span className="wiki-mono" style={{ color: COLORS.inkSubtle }}>×{ingredient.qty}</span>
        {ingredient.raw ? (
          <span
            className="text-[9px] uppercase tracking-wide"
            style={{
              marginLeft: 4,
              padding: "1px 6px",
              borderRadius: 6,
              background: COLORS.parchmentDeep,
              color: COLORS.inkSubtle,
            }}
          >
            raw
          </span>
        ) : null}
        {ingredient.truncated ? (
          <span className="text-[9px] italic" style={{ marginLeft: 4, color: COLORS.inkSubtle }}>
            …deeper
          </span>
        ) : null}
      </div>
      {source != null && source.cyclical ? (
        <div className="text-[10px] italic" style={{ paddingLeft: 18, color: COLORS.inkSubtle }}>
          ↻ cyclical dependency
        </div>
      ) : source != null ? (
        <div style={{ marginTop: 4 }}>
          <IngredientList ingredients={source.ingredients} depth={depth + 1} />
        </div>
      ) : null}
    </li>
  );
}

export interface CraftTreeProps {
  recipeId: string;
}

export function CraftTree({ recipeId }: CraftTreeProps) {
  const tree: RecipeTreeNode | null = traceRecipe(recipeId);
  if (tree == null) return null;

  const rawCount = countRawInputs(tree);
  const upstreamCount = collectUpstreamRecipes(tree).length;
  const outputKey = tree.output ?? recipeId;
  const outputLabel = iconLabel(outputKey) ?? outputKey;

  return (
    <section id="crafting-tree">
      <div className="wiki-section-heading mb-2">Crafting tree</div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
          marginBottom: 8,
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {tree.output != null ? (
          <ConceptRefForKey entityKey={outputKey} label={outputLabel} variant="inline" />
        ) : (
          <span style={{ fontWeight: 700, color: COLORS.ink }}>{outputLabel}</span>
        )}
        {tree.station ? (
          <ConceptRefForKey
            entityKey={tree.station}
            fieldName="station"
            conceptId="buildings"
            variant="inline"
          />
        ) : null}
      </div>

      <IngredientList ingredients={tree.ingredients} depth={0} />

      <div
        className="text-[10px] mt-3"
        style={{ color: COLORS.inkSubtle, display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <span>Raw inputs: <strong style={{ color: COLORS.ink }}>{rawCount}</strong></span>
        {upstreamCount > 0 && (
          <span>Upstream recipes: <strong style={{ color: COLORS.ink }}>{upstreamCount}</strong></span>
        )}
      </div>
    </section>
  );
}

export default CraftTree;
