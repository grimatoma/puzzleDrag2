/**
 * WhereUsed.tsx — "Used in" cross-reference section for the Game Wiki.
 *
 * For a resource / tile / tool article, lists every place the item id is
 * referenced — recipe inputs/outputs, building costs, upgrade-chain feeders,
 * and story rewards — grouped by kind and rendered as clickable icon+label
 * chips that navigate to the referenced entity's wiki article.
 *
 * COMPUTE is reused from itemReferences.ts (the pure cross-reference index).
 * We roll our OWN chip rows rather than reuse relational.tsx's WhereUsedLinks:
 * that helper navigates via the Dev Panel nav shape ({ tab, focus } with a
 * bare focus id), whereas the wiki needs wikiNavTarget's "conceptId:key" focus
 * so the article shell can resolve the specific entity page.
 *
 * Returns null when the item has no usages (caller may also pre-check).
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
  buildItemReferenceIndex,
  usagesFor,
  groupUsagesByKind,
  type ItemUsage,
} from "../../itemReferences.js";

// The reference index is pure with static catalog inputs — build it once at
// module scope rather than per render.
const REFERENCE_INDEX = buildItemReferenceIndex();

/** Human-readable section title per usage kind, in display order. */
const KIND_ORDER: ItemUsage["kind"][] = [
  "recipe_input",
  "recipe_output",
  "building_cost",
  "chain_next",
  "story_outcome",
];

const KIND_HEADINGS: Record<ItemUsage["kind"], string> = {
  recipe_input: "Consumed by recipes",
  recipe_output: "Produced by recipes",
  building_cost: "Costs toward buildings",
  chain_next: "Upgrades from",
  story_outcome: "Awarded by story",
};

/** A single usage rendered as a navigable chip: target concept + key + label. */
interface ChipSpec {
  /** Wiki concept id to navigate to (may be null when not a wiki article). */
  conceptId: string | null;
  /** Entity key within that concept (used for nav + as a fallback label). */
  key: string;
  /** Icon key to render, or null for no icon. */
  iconKey: string | null;
  /** Display label. */
  label: string;
  /** Optional trailing detail (e.g. "×3"). */
  detail?: string;
}

/** Translate one ItemUsage into a chip spec for its group. */
function chipForUsage(usage: ItemUsage): ChipSpec {
  switch (usage.kind) {
    case "recipe_input":
      return {
        conceptId: "recipes",
        key: usage.recipeId,
        iconKey: null,
        label: iconLabel(usage.recipeId) ?? usage.recipeId,
        detail: `×${usage.qty}`,
      };
    case "recipe_output":
      return {
        conceptId: "recipes",
        key: usage.recipeId,
        iconKey: null,
        label: iconLabel(usage.recipeId) ?? usage.recipeId,
      };
    case "building_cost":
      return {
        conceptId: "buildings",
        key: usage.buildingId,
        iconKey: null,
        label: iconLabel(usage.buildingId) ?? usage.buildingId,
        detail: `×${usage.qty}`,
      };
    case "chain_next":
      return {
        conceptId: conceptForKey(usage.fromId),
        key: usage.fromId,
        iconKey: usage.fromId,
        label: iconLabel(usage.fromId) ?? usage.fromId,
      };
    case "story_outcome": {
      const id = usage.beatId ?? usage.choiceId ?? "story";
      const sign = usage.qty > 0 ? "+" : "";
      return {
        conceptId: null,
        key: id,
        iconKey: null,
        label: iconLabel(id) ?? id,
        detail: `${sign}${usage.qty}`,
      };
    }
  }
}

function UsageChip({ chip }: { chip: ChipSpec }) {
  const { navigate } = useBalanceNav();
  const inner = (
    <>
      {chip.iconKey != null && (
        <Icon iconKey={chip.iconKey} size={18} style={{ marginRight: 4, verticalAlign: "middle" }} />
      )}
      <span style={{ fontWeight: 600 }}>{chip.label}</span>
      {chip.detail != null && (
        <span className="wiki-mono" style={{ color: COLORS.inkSubtle, marginLeft: 4 }}>
          {chip.detail}
        </span>
      )}
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 8,
    fontSize: 11,
    background: COLORS.parchmentDeep,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.ink,
  };

  if (chip.conceptId == null) {
    // Not a navigable wiki article — render an inert chip.
    return <span style={baseStyle}>{inner}</span>;
  }

  const target = wikiNavTarget(chip.conceptId, chip.key);
  return (
    <button
      type="button"
      title={`${chip.conceptId}:${chip.key}`}
      onClick={() => navigate(target)}
      style={{ ...baseStyle, cursor: "pointer", transition: "opacity 120ms ease" }}
      className="hover:opacity-80"
    >
      {inner}
    </button>
  );
}

export interface WhereUsedProps {
  itemId: string;
}

/**
 * Render grouped "where is this item used" chips for `itemId`, or null when the
 * item is not referenced anywhere.
 */
export function WhereUsed({ itemId }: WhereUsedProps) {
  const usages = usagesFor(itemId, REFERENCE_INDEX);
  if (usages.length === 0) return null;

  const groups = groupUsagesByKind(usages);

  return (
    <section id="used-in">
      <div className="wiki-section-heading mb-2">Used in</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {KIND_ORDER.filter((kind) => groups.has(kind)).map((kind) => (
          <div key={kind}>
            <div
              className="text-[9px] font-bold uppercase tracking-wide mb-1"
              style={{ color: COLORS.inkSubtle }}
            >
              {KIND_HEADINGS[kind]}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {groups.get(kind)!.map((usage, i) => (
                <UsageChip key={`${kind}:${i}`} chip={chipForUsage(usage)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Cheap precheck for TOC gating — true when the item has any usages. */
export function hasWhereUsed(itemId: string): boolean {
  return usagesFor(itemId, REFERENCE_INDEX).length > 0;
}

export default WhereUsed;
