/**
 * refs.ts — Canonical wiki cross-reference widgets.
 *
 * Import from here (not ad-hoc chips/buttons) whenever an article, table, or
 * section links to another catalog entity.
 */

import React from "react";
import { COLORS } from "../shared.jsx";
import { conceptForKey, getEntity } from "./conceptEntities.js";
import {
  ConceptRefCard,
  RelationRefGrid,
  type ConceptRefVariant,
} from "./ConceptRefCard.jsx";
import type { WikiLink } from "./relations.js";

export { ConceptRefCard, RelationRefGrid } from "./ConceptRefCard.jsx";
export type { ConceptRefVariant, ConceptRefCardProps } from "./ConceptRefCard.jsx";
export { wikiNavTarget } from "./WikiLinkButton.jsx";

/** Schema / config field name → concept id when the value is an entity key. */
const FIELD_CONCEPT_HINTS: Record<string, string> = {
  station: "buildings",
  buildingId: "buildings",
  chainLengthOf: "tiles",
  researchOf: "resources",
  resource: "resources",
  item: "resources",
  zoneId: "zones",
  unlockTile: "tiles",
  favoriteGift: "resources",
  next: "resources",
  season: "seasons",
};

/** Array fields whose string elements share one concept. */
const ARRAY_FIELD_CONCEPT: Record<string, string> = {
  buildings: "buildings",
  abilities: "abilities",
  loves: "resources",
  likes: "resources",
  tiles: "tiles",
};

export function resolveConceptId(
  entityKey: string,
  options?: { fieldName?: string; conceptHint?: string | null },
): string | null {
  const hint = options?.conceptHint;
  if (hint && getEntity(hint, entityKey) != null) return hint;

  const fieldHint = options?.fieldName ? FIELD_CONCEPT_HINTS[options.fieldName] : undefined;
  if (fieldHint && getEntity(fieldHint, entityKey) != null) return fieldHint;

  return conceptForKey(entityKey);
}

export interface ConceptRefForKeyProps {
  entityKey: string;
  conceptId?: string | null;
  fieldName?: string;
  label?: string;
  variant?: ConceptRefVariant;
  detail?: string;
  className?: string;
}

/**
 * Resolve `entityKey` to a wiki concept and render the standard ref widget, or
 * plain mono text when unresolvable.
 */
export function ConceptRefForKey({
  entityKey,
  conceptId: conceptHint,
  fieldName,
  label,
  variant = "inline",
  detail,
  className,
}: ConceptRefForKeyProps) {
  const conceptId = resolveConceptId(entityKey, { fieldName, conceptHint });
  if (conceptId == null) {
    return (
      <span className="wiki-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>
        {label ?? entityKey}
        {detail != null ? ` ${detail}` : ""}
      </span>
    );
  }
  return (
    <ConceptRefCard
      conceptId={conceptId}
      entityKey={entityKey}
      label={label}
      variant={variant}
      detail={detail}
      className={className}
    />
  );
}

export function entityKeysToWikiLinks(
  entityKeys: string[],
  options?: { conceptId?: string; labelFor?: (key: string) => string },
): WikiLink[] {
  const out: WikiLink[] = [];
  for (const key of entityKeys) {
    const conceptId = resolveConceptId(key, { conceptHint: options?.conceptId });
    if (conceptId == null) continue;
    const entity = getEntity(conceptId, key) as Record<string, unknown> | null;
    const label =
      options?.labelFor?.(key) ??
      String(entity?.label ?? entity?.name ?? entity?.id ?? key);
    out.push({ conceptId, key, label });
  }
  return out;
}

export interface ConceptRefListProps {
  entityKeys: string[];
  conceptId?: string;
  variant?: ConceptRefVariant;
  labelFor?: (key: string) => string;
}

/** Render many entity refs — inline chips or a card grid. */
export function ConceptRefList({
  entityKeys,
  conceptId,
  variant = "inline",
  labelFor,
}: ConceptRefListProps) {
  if (entityKeys.length === 0) return null;

  if (variant === "card") {
    return <RelationRefGrid links={entityKeysToWikiLinks(entityKeys, { conceptId, labelFor })} />;
  }

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {entityKeys.map((key, i) => (
        <ConceptRefForKey
          key={`${key}:${i}`}
          entityKey={key}
          conceptId={conceptId}
          label={labelFor?.(key)}
          variant="inline"
        />
      ))}
    </span>
  );
}

/**
 * When `value` is a catalog id (or string array of ids), render wiki ref widget(s).
 * Returns null when the value should fall through to generic formatting.
 */
export function formatFieldRefValue(
  fieldName: string,
  value: unknown,
  options?: { variant?: ConceptRefVariant },
): React.ReactNode | null {
  const variant = options?.variant ?? "inline";

  if (typeof value === "string" && value.length > 0) {
    const conceptId = resolveConceptId(value, { fieldName });
    if (conceptId != null) {
      return <ConceptRefForKey entityKey={value} conceptId={conceptId} variant={variant} />;
    }
    return null;
  }

  if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string")) {
    const hint = ARRAY_FIELD_CONCEPT[fieldName];
    return (
      <ConceptRefList
        entityKeys={value as string[]}
        conceptId={hint}
        variant={variant === "card" ? "card" : "inline"}
      />
    );
  }

  return null;
}
