/**
 * CraftTree.tsx — Crafting dependency tree for the Game Wiki.
 *
 * For a recipe article (or a craftable resource/tool whose item is produced by
 * a recipe), renders the full upstream ingredient tree as a nested, indented
 * list: each node shows its icon + label (+ ×qty for ingredients), with the
 * recipes that produce a craftable ingredient nested beneath it. Raw inputs
 * (no producing recipe) read as leaves and are styled distinctly from
 * craftable nodes.
 *
 * COMPUTE is reused from recipeGraph.ts (traceRecipe / countRawInputs /
 * collectUpstreamRecipes — all pure). Nodes navigate to the matching wiki
 * article via wikiNavTarget when the key/recipe resolves to a known concept.
 *
 * Returns null when the recipe id does not exist.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import { conceptForKey } from "../conceptEntities.js";
import {
  traceRecipe,
  countRawInputs,
  collectUpstreamRecipes,
  type RecipeTreeNode,
  type RecipeTreeIngredient,
} from "../../recipeGraph.js";
import { RECIPES } from "../../../constants.js";

// Producer index (output item id → first producing recipe id), built once at
// module scope from the static RECIPES catalog.
const PRODUCER_BY_ITEM: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [recipeId, recipe] of Object.entries(RECIPES as Record<string, { item?: string }>)) {
    const item = recipe?.item;
    if (typeof item === "string" && !map.has(item)) map.set(item, recipeId);
  }
  return map;
})();

/** Resolve the recipe id that produces `itemId`, or null when not craftable. */
export function recipeIdProducing(itemId: string): string | null {
  return PRODUCER_BY_ITEM.get(itemId) ?? null;
}

/** Cheap precheck for TOC gating — true when the recipe id exists. */
export function hasCraftTree(recipeId: string | null | undefined): boolean {
  return recipeId != null && traceRecipe(recipeId) != null;
}

/** A navigable item label: links to the item's wiki article when resolvable. */
function ItemLink({
  itemKey,
  label,
  iconKey,
  iconSize,
  bold,
}: {
  itemKey: string;
  label: string;
  iconKey: string;
  iconSize: number;
  bold?: boolean;
}) {
  const { navigate } = useBalanceNav();
  const conceptId = conceptForKey(itemKey);
  const content = (
    <>
      <Icon iconKey={iconKey} size={iconSize} style={{ verticalAlign: "middle", marginRight: 6 }} />
      <span style={{ fontWeight: bold ? 700 : 600, color: COLORS.ink }}>{label}</span>
    </>
  );
  if (conceptId == null) {
    return <span style={{ display: "inline-flex", alignItems: "center" }}>{content}</span>;
  }
  return (
    <button
      type="button"
      title={`${conceptId}:${itemKey}`}
      onClick={() => navigate(wikiNavTarget(conceptId, itemKey))}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
      }}
      className="hover:opacity-80"
    >
      {content}
    </button>
  );
}

/** Render the ingredients of a recipe node as nested list rows. */
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
        }}
      >
        <ItemLink itemKey={ingredient.id} label={label} iconKey={ingredient.id} iconSize={18} />
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

/**
 * Render the crafting dependency tree for `recipeId`, or null when the recipe
 * does not exist.
 */
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

      {/* Output root */}
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
        }}
      >
        {tree.output != null ? (
          <ItemLink itemKey={outputKey} label={outputLabel} iconKey={outputKey} iconSize={22} bold />
        ) : (
          <span style={{ fontWeight: 700, color: COLORS.ink }}>{outputLabel}</span>
        )}
        {tree.station ? (
          <span
            className="text-[9px] uppercase tracking-wide"
            style={{
              padding: "1px 6px",
              borderRadius: 6,
              background: COLORS.parchment,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.inkSubtle,
            }}
          >
            {tree.station}
          </span>
        ) : null}
      </div>

      {/* Ingredient tree */}
      <IngredientList ingredients={tree.ingredients} depth={0} />

      {/* Summary */}
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
