/**
 * abilityInstanceVisual.tsx — Render per-host ability attachment params on ref cards.
 *
 * When a building/worker attaches an ability with `{ id, params, trigger }`, the
 * wiki passes that context through WikiLink so cards explain *this* instance
 * (e.g. Powder Store → Grant Tool → 2× Bomb at season end).
 */

import React from "react";
import { COLORS } from "../shared.jsx";
import { getEntity } from "./conceptEntities.js";
import { ConceptRefForKey } from "./refs.js";
import { ABILITY_PARAM_TYPES } from "../../config/abilities.js";
import type { WikiLinkContext } from "./relations.js";

interface AbilityParamSchema {
  key: string;
  label?: string;
  type?: string;
}

function humanizeTrigger(trigger: string): string {
  return trigger
    .split("_")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function conceptForParamType(type: string | undefined): string | null {
  switch (type) {
    case ABILITY_PARAM_TYPES.TOOL:
      return "tools";
    case ABILITY_PARAM_TYPES.RESOURCE_KEY:
      return "resources";
    case ABILITY_PARAM_TYPES.RECIPE:
      return "recipes";
    case ABILITY_PARAM_TYPES.CATEGORY:
      return "categories";
    case ABILITY_PARAM_TYPES.HAZARD:
      return "hazards";
    case ABILITY_PARAM_TYPES.BIOME:
      return "boardKinds";
    default:
      return null;
  }
}

function formatParamValue(
  param: AbilityParamSchema,
  value: unknown,
): React.ReactNode {
  if (value === undefined || value === null || value === "") {
    return <span style={{ color: COLORS.inkSubtle }}>—</span>;
  }

  const conceptId = conceptForParamType(param.type);
  if (conceptId != null && typeof value === "string") {
    return (
      <ConceptRefForKey
        entityKey={value}
        conceptId={conceptId}
        fieldName={param.key}
        variant="inline"
      />
    );
  }

  if (typeof value === "number") {
    return <span className="wiki-mono">{String(value)}</span>;
  }

  return <span>{String(value)}</span>;
}

export interface AbilityInstanceBodyProps {
  abilityKey: string;
  context: WikiLinkContext;
}

/** Compact param summary for an ability attachment on a building/worker/tile. */
export function AbilityInstanceBody({ abilityKey, context }: AbilityInstanceBodyProps) {
  const params = context.params;
  if (params == null || Object.keys(params).length === 0) return null;

  const ability = getEntity("abilities", abilityKey) as Record<string, unknown> | null;
  if (ability == null) return null;

  const schema = Array.isArray(ability.params)
    ? (ability.params as AbilityParamSchema[])
    : [];
  const trigger =
    typeof context.trigger === "string" && context.trigger.length > 0
      ? context.trigger
      : typeof ability.trigger === "string"
        ? ability.trigger
        : null;

  const rows = schema
    .map((param) => {
      const value = params[param.key];
      if (value === undefined || value === null || value === "") return null;
      return (
        <div key={param.key} className="wiki-ability-instance__row">
          <span className="wiki-ability-instance__label">{param.label ?? param.key}</span>
          <span className="wiki-ability-instance__value">{formatParamValue(param, value)}</span>
        </div>
      );
    })
    .filter(Boolean);

  if (rows.length === 0 && trigger == null) return null;

  return (
    <div className="wiki-concept-ref-card__body wiki-ability-instance">
      {trigger != null && (
        <div className="wiki-ability-instance__trigger">{humanizeTrigger(trigger)}</div>
      )}
      {rows.length > 0 && <div className="wiki-ability-instance__params">{rows}</div>}
    </div>
  );
}

export default AbilityInstanceBody;
