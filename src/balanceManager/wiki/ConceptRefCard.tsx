/**
 * ConceptRefCard.tsx — Reusable rich widgets for wiki concept references.
 *
 * Used wherever the wiki links to another entity (relations, backlinks,
 * where-used, building recipe rosters, inline wikilinks). LLMs can still read
 * raw catalog files; players get icon + flow visuals.
 */

import React from "react";
import { COLORS, Pill } from "../shared.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";
import { getEntity } from "./conceptEntities.js";
import { EntityVisual, AmountChips, RecipeIO, entityIconKey } from "./EntityVisual.jsx";
import Icon from "../../ui/Icon.jsx";
import { iconLabel } from "../../textures/iconRegistry.js";
import type { WikiLink } from "./relations.js";

export type ConceptRefVariant = "card" | "inline";

export interface ConceptRefCardProps {
  conceptId: string;
  entityKey: string;
  /** Override display title (defaults to entity label / name / key). */
  label?: string;
  variant?: ConceptRefVariant;
  /** Optional trailing annotation (e.g. "×3" for usage qty). */
  detail?: string;
  className?: string;
}

function displayTitle(
  conceptId: string,
  entityKey: string,
  entity: Record<string, unknown> | null,
  label?: string,
): string {
  if (label != null && label.length > 0) return label;
  if (entity != null) {
    const fromEntity = entity.label ?? entity.name ?? entity.id;
    if (typeof fromEntity === "string" && fromEntity.length > 0) return fromEntity;
  }
  return iconLabel(entityKey) ?? entityKey;
}

/** Concept-specific body under the title row (recipe flow, build cost, …). */
function ConceptRefBody({
  conceptId,
  entity,
}: {
  conceptId: string;
  entity: Record<string, unknown> | null;
}) {
  if (entity == null) return null;

  switch (conceptId) {
    case "recipes":
      return (
        <div className="wiki-concept-ref-card__body">
          <RecipeIO
            recipe={entity as { item: string; station?: string; inputs?: Record<string, number> }}
          />
        </div>
      );
    case "buildings": {
      const cost = entity.cost as Record<string, number> | undefined;
      const chips = <AmountChips amounts={cost} />;
      return chips != null ? <div className="wiki-concept-ref-card__body">{chips}</div> : null;
    }
    case "zones": {
      const entryCost = entity.entryCost as Record<string, number> | undefined;
      const chips = <AmountChips amounts={entryCost} />;
      return chips != null ? <div className="wiki-concept-ref-card__body">{chips}</div> : null;
    }
    case "workers": {
      const hireCost = entity.hireCost as
        | { coins?: number; resources?: Record<string, number> }
        | undefined;
      if (hireCost == null) return null;
      const amounts: Record<string, number> = { ...(hireCost.resources ?? {}) };
      if (typeof hireCost.coins === "number" && hireCost.coins > 0) {
        amounts.coins = hireCost.coins;
      }
      const chips = <AmountChips amounts={amounts} />;
      return chips != null ? <div className="wiki-concept-ref-card__body">{chips}</div> : null;
    }
    default:
      return null;
  }
}

/**
 * Rich navigable reference to a wiki entity. `card` = panel with visual + flow;
 * `inline` = compact chip for dense lists and prose wikilinks.
 */
export function ConceptRefCard({
  conceptId,
  entityKey,
  label,
  variant = "card",
  detail,
  className = "",
}: ConceptRefCardProps) {
  const { navigate } = useBalanceNav();
  const entity = getEntity(conceptId, entityKey) as Record<string, unknown> | null;
  const title = displayTitle(conceptId, entityKey, entity, label);
  const iconKey = entityIconKey(conceptId, entityKey, entity);
  const target = wikiNavTarget(conceptId, entityKey);

  const onActivate = () => navigate(target);

  if (variant === "inline") {
    return (
      <button
        type="button"
        title={`${conceptId}:${entityKey}`}
        onClick={onActivate}
        className={`wiki-concept-ref-inline ${className}`.trim()}
      >
        {iconKey != null && (
          <Icon iconKey={iconKey} size={18} style={{ flexShrink: 0 }} />
        )}
        <span className="wiki-concept-ref-inline__label">{title}</span>
        {detail != null && (
          <span className="wiki-concept-ref-inline__detail wiki-mono">{detail}</span>
        )}
      </button>
    );
  }

  const visualSize = conceptId === "buildings" || conceptId === "zones" ? 72 : 52;
  const entityVisual = (
    <EntityVisual
      conceptId={conceptId}
      entityKey={entityKey}
      entity={entity}
      size={visualSize}
    />
  );

  return (
    <button
      type="button"
      title={`${conceptId}:${entityKey}`}
      onClick={onActivate}
      className={`wiki-concept-ref-card ${className}`.trim()}
    >
      <div className="wiki-concept-ref-card__hero">
        <div className="wiki-concept-ref-card__visual" aria-hidden>
          {entityVisual ?? (
            iconKey != null ? (
              <Icon iconKey={iconKey} size={visualSize} />
            ) : (
              <span className="wiki-concept-ref-card__placeholder" style={{ color: COLORS.inkSubtle }}>
                ?
              </span>
            )
          )}
        </div>
        <div className="wiki-concept-ref-card__meta">
          <div className="wiki-concept-ref-card__title">{title}</div>
          <div className="wiki-concept-ref-card__key wiki-mono">{entityKey}</div>
          <Pill>{conceptId}</Pill>
          {detail != null && (
            <span className="wiki-concept-ref-card__detail wiki-mono">{detail}</span>
          )}
        </div>
      </div>
      <ConceptRefBody conceptId={conceptId} entity={entity} />
    </button>
  );
}

export interface RelationRefGridProps {
  links: WikiLink[];
  className?: string;
}

/**
 * Responsive grid of {@link ConceptRefCard} panels for a relation / backlink group.
 */
export function RelationRefGrid({ links, className = "" }: RelationRefGridProps) {
  if (links.length === 0) return null;

  return (
    <div className={`wiki-concept-ref-grid ${className}`.trim()}>
      {links.map((link) => (
        <ConceptRefCard
          key={`${link.conceptId}:${link.key}`}
          conceptId={link.conceptId}
          entityKey={link.key}
          label={link.label}
          variant="card"
        />
      ))}
    </div>
  );
}

export default ConceptRefCard;
