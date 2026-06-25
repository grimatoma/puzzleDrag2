/**
 * WhereUsed.tsx — "Used in" cross-reference section for the Game Wiki.
 */

import React from "react";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { conceptForKey } from "../conceptEntities.js";
import { ConceptRefCard } from "../ConceptRefCard.jsx";
import {
  buildItemReferenceIndex,
  usagesFor,
  groupUsagesByKind,
  type ItemUsage,
} from "../../itemReferences.js";

const REFERENCE_INDEX = buildItemReferenceIndex();

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

interface ChipSpec {
  conceptId: string | null;
  key: string;
  iconKey: string | null;
  label: string;
  detail?: string;
}

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

function UsageRef({ chip }: { chip: ChipSpec }) {
  if (chip.conceptId == null) {
    return (
      <span className="wiki-concept-ref-inline" style={{ cursor: "default", opacity: 0.85 }}>
        <span className="wiki-concept-ref-inline__label">{chip.label}</span>
        {chip.detail != null && (
          <span className="wiki-concept-ref-inline__detail wiki-mono">{chip.detail}</span>
        )}
      </span>
    );
  }

  const useCard =
    chip.conceptId === "recipes" ||
    chip.conceptId === "buildings" ||
    chip.conceptId === "zones";

  return (
    <ConceptRefCard
      conceptId={chip.conceptId}
      entityKey={chip.key}
      label={chip.label}
      detail={chip.detail}
      variant={useCard ? "card" : "inline"}
    />
  );
}

function gridClassForKind(kind: ItemUsage["kind"]): string | undefined {
  return kind === "recipe_input" || kind === "recipe_output" || kind === "building_cost"
    ? "wiki-concept-ref-grid"
    : undefined;
}

export interface WhereUsedProps {
  itemId: string;
}

export function WhereUsed({ itemId }: WhereUsedProps) {
  const usages = usagesFor(itemId, REFERENCE_INDEX);
  if (usages.length === 0) return null;

  const groups = groupUsagesByKind(usages);

  return (
    <section id="used-in">
      <h2 className="wiki-section-heading mb-2">Used in</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {KIND_ORDER.filter((kind) => groups.has(kind)).map((kind) => (
          <div key={kind}>
            <div
              className="text-[9px] font-bold uppercase tracking-wide mb-1"
              style={{ color: COLORS.inkSubtle }}
            >
              {KIND_HEADINGS[kind]}
            </div>
            <div
              className={gridClassForKind(kind)}
              style={
                gridClassForKind(kind) == null
                  ? { display: "flex", flexWrap: "wrap", gap: 6 }
                  : undefined
              }
            >
              {groups.get(kind)!.map((usage, i) => (
                <UsageRef key={`${kind}:${i}`} chip={chipForUsage(usage)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function hasWhereUsed(itemId: string): boolean {
  return usagesFor(itemId, REFERENCE_INDEX).length > 0;
}

export default WhereUsed;
