/**
 * ConceptRefCard.tsx — Reusable rich widgets for wiki concept references.
 *
 * Used wherever the wiki links to another entity (relations, backlinks,
 * where-used, building recipe rosters, inline wikilinks). LLMs can still read
 * raw catalog files; players get icon + flow visuals.
 */

import React from "react";
import { COLORS } from "../shared.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";
import { conceptForKey, getEntity } from "./conceptEntities.js";
import { EntityVisual, RecipeIO, entityIconKey } from "./EntityVisual.jsx";
import Icon from "../../ui/Icon.jsx";
import { iconLabel } from "../../textures/iconRegistry.js";
import type { WikiLink, WikiLinkContext } from "./relations.js";
import { AbilityInstanceBody } from "./abilityInstanceVisual.jsx";

export type ConceptRefVariant = "card" | "inline";
export type ConceptRefLayout = "auto" | "compact" | "rich";

export interface ConceptRefCardProps {
  conceptId: string;
  entityKey: string;
  /** Override display title (defaults to entity label / name / key). */
  label?: string;
  variant?: ConceptRefVariant;
  /** Card density — `auto` picks compact for items, rich for buildings/zones/… */
  layout?: ConceptRefLayout;
  /** Optional trailing annotation (e.g. "×3" for usage qty). */
  detail?: string;
  /** When false, skip recipe I/O body. Buildings/zones never show a body regardless. */
  showBody?: boolean;
  /** Host-specific params (ability attachments on buildings/workers). */
  context?: WikiLinkContext;
  className?: string;
}

/** Item-like concepts render as a tight icon + title tile. */
const COMPACT_CONCEPTS = new Set([
  "resources",
  "tiles",
  "tools",
  "categories",
  "seasons",
  "npcs",
  "bosses",
  "hazards",
  "boardKinds",
  "achievements",
  "abilities",
  "toolPowers",
]);

function resolveLayout(
  conceptId: string,
  layout: ConceptRefLayout,
  context?: WikiLinkContext,
): "compact" | "rich" {
  if (layout === "compact") return "compact";
  if (layout === "rich") return "rich";
  if (conceptId === "abilities" && hasInstanceContext(context)) return "rich";
  return COMPACT_CONCEPTS.has(conceptId) ? "compact" : "rich";
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

function hasInstanceContext(context: WikiLinkContext | undefined): boolean {
  return context?.params != null && Object.keys(context.params).length > 0;
}

function shouldShowConceptBody(
  conceptId: string,
  context: WikiLinkContext | undefined,
): boolean {
  if (conceptId === "recipes") return true;
  if (conceptId === "abilities" && hasInstanceContext(context)) return true;
  return false;
}

/** Concept-specific body: recipe I/O or per-host ability params. */
function ConceptRefBody({
  conceptId,
  entityKey,
  entity,
  context,
}: {
  conceptId: string;
  entityKey: string;
  entity: Record<string, unknown> | null;
  context?: WikiLinkContext;
}) {
  if (conceptId === "recipes" && entity != null) {
    return (
      <div className="wiki-concept-ref-card__body">
        <RecipeIO
          recipe={entity as { item: string; station?: string; inputs?: Record<string, number> }}
        />
      </div>
    );
  }
  if (conceptId === "abilities" && context != null) {
    return <AbilityInstanceBody abilityKey={entityKey} context={context} />;
  }
  return null;
}

function FlowArrow() {
  return (
    <div className="wiki-recipe-relation-flow__arrow" aria-hidden="true">
      <svg width="38" height="18" viewBox="0 0 38 18" fill="none">
        <path
          d="M2 9h28m0 0l-7-7m7 7l-7 7"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
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
  layout = "auto",
  detail,
  showBody = true,
  context,
  className = "",
}: ConceptRefCardProps) {
  const { navigate } = useBalanceNav();
  const entity = getEntity(conceptId, entityKey) as Record<string, unknown> | null;
  const title = displayTitle(conceptId, entityKey, entity, label);
  const iconKey = entityIconKey(conceptId, entityKey, entity);
  const target = wikiNavTarget(conceptId, entityKey);
  const cardLayout = resolveLayout(conceptId, layout, context);

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

  if (cardLayout === "compact") {
    const iconSize = 44;
    return (
      <button
        type="button"
        title={`${conceptId}:${entityKey}`}
        onClick={onActivate}
        className={`wiki-concept-ref-card wiki-concept-ref-card--compact ${className}`.trim()}
      >
        <div className="wiki-concept-ref-card__visual wiki-concept-ref-card__visual--compact" aria-hidden>
          {iconKey != null ? (
            <Icon iconKey={iconKey} size={iconSize} />
          ) : (
            <span className="wiki-concept-ref-card__placeholder" style={{ color: COLORS.inkSubtle }}>
              ?
            </span>
          )}
        </div>
        <div className="wiki-concept-ref-card__title wiki-concept-ref-card__title--compact">{title}</div>
        {detail != null && (
          <span className="wiki-concept-ref-card__detail wiki-mono">{detail}</span>
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
  const body =
    showBody && shouldShowConceptBody(conceptId, context) ? (
      <ConceptRefBody
        conceptId={conceptId}
        entityKey={entityKey}
        entity={entity}
        context={context}
      />
    ) : null;

  return (
    <button
      type="button"
      title={`${conceptId}:${entityKey}`}
      onClick={onActivate}
      className={`wiki-concept-ref-card wiki-concept-ref-card--rich${
        conceptId === "buildings" ? " wiki-concept-ref-card--building" : ""
      } ${className}`.trim()}
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
          {detail != null && (
            <span className="wiki-concept-ref-card__detail wiki-mono">{detail}</span>
          )}
        </div>
      </div>
      {body}
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
          context={link.context}
          variant="card"
          layout="auto"
        />
      ))}
    </div>
  );
}

export interface RecipeRelationsFlowProps {
  recipe: Record<string, unknown>;
}

/** True when a recipe entity has enough data for the horizontal flow panel. */
export function hasRecipeRelationFlow(recipe: Record<string, unknown> | null | undefined): boolean {
  if (recipe == null) return false;
  const hasStation = typeof recipe.station === "string" && recipe.station.length > 0;
  const hasOutput = typeof recipe.item === "string" && recipe.item.length > 0;
  const inputs =
    recipe.inputs != null && typeof recipe.inputs === "object" && !Array.isArray(recipe.inputs)
      ? (recipe.inputs as Record<string, unknown>)
      : {};
  const hasInputs = Object.keys(inputs).length > 0;
  return hasStation || hasOutput || hasInputs;
}

/**
 * Bespoke Related panel for recipe articles: ingredients → station → output
 * with directional arrows instead of three stacked card grids.
 */
export function RecipeRelationsFlow({ recipe }: RecipeRelationsFlowProps) {
  const station = typeof recipe.station === "string" ? recipe.station : null;
  const outputKey = typeof recipe.item === "string" ? recipe.item : null;
  const inputs =
    recipe.inputs != null && typeof recipe.inputs === "object" && !Array.isArray(recipe.inputs)
      ? (recipe.inputs as Record<string, number>)
      : {};
  const inputEntries = Object.entries(inputs).filter(([, qty]) => Number(qty) > 0);

  return (
    <div className="wiki-recipe-relation-flow" role="group" aria-label="Recipe crafting flow">
      {inputEntries.length > 0 && (
        <>
          <div className="wiki-recipe-relation-flow__lane">
            <span className="wiki-recipe-relation-flow__lane-label">Ingredients</span>
            <div className="wiki-recipe-relation-flow__cluster">
              {inputEntries.map(([key, qty]) => (
                <ConceptRefCard
                  key={key}
                  conceptId={conceptForKey(key) ?? "resources"}
                  entityKey={key}
                  layout="compact"
                  detail={`×${qty}`}
                />
              ))}
            </div>
          </div>
          <FlowArrow />
        </>
      )}

      {station != null && (
        <>
          <div className="wiki-recipe-relation-flow__lane">
            <span className="wiki-recipe-relation-flow__lane-label">At</span>
            <ConceptRefCard
              conceptId="buildings"
              entityKey={station}
              layout="rich"
              showBody={false}
            />
          </div>
          <FlowArrow />
        </>
      )}

      {outputKey != null && (
        <div className="wiki-recipe-relation-flow__lane">
          <span className="wiki-recipe-relation-flow__lane-label">Makes</span>
          <ConceptRefCard
            conceptId={conceptForKey(outputKey) ?? "resources"}
            entityKey={outputKey}
            layout="compact"
          />
        </div>
      )}
    </div>
  );
}

export default ConceptRefCard;
