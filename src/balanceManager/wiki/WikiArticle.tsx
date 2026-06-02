/**
 * WikiArticle.tsx — Unified Wikipedia-style article template for the Dev Panel Wiki.
 *
 * Composes the modules built in earlier tasks into a full article layout:
 *   - Title row: back button, breadcrumb, entity name, key code, status chip
 *   - Two-column layout: main content column + right-rail Infobox
 *   - Left column: TableOfContents, lede paragraph, authored HTML body,
 *     Properties field table, forward Relations, What links here (backlinks)
 *
 * READ-ONLY — no editable controls.
 *
 * Navigation via wikiNavTarget so Phase 5 can swap routing in one place.
 *
 * TODO (Phase 5): Add a "Browse all <concept>" section once per-concept
 * category routing lands. Relations + backlinks already provide cross-links
 * in the interim.
 */

import React from "react";
import { Card, SmallButton, COLORS } from "../shared.jsx";
import { describeSchema } from "../schemaDoc.js";
import { schemaForConcept } from "./conceptSchemas.js";
import { getEntity } from "./conceptEntities.js";
import { useBalanceNav } from "../balanceNav.jsx";
import { RefButton, RelationalFooter } from "../relational.jsx";
import { relationsFor } from "./relations.js";
import { backlinksFor } from "./backlinks.js";
import { ledeFor } from "./lede.js";
import { bodyFor } from "./htmlContent.js";
import HtmlBody from "./HtmlBody.jsx";
import { Infobox } from "./Infobox.jsx";
import { TableOfContents } from "./TableOfContents.jsx";
import type { TocItem } from "./TableOfContents.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";
import StatusChip from "../../ui/primitives/StatusChip.jsx";
import { statusForEntity, WIKI_STATUS_LEGEND } from "./status.js";
import { FieldsTable, AdditionalFieldsSection, LiveConfigFallback } from "./FieldsTable.jsx";
import Icon from "../../ui/Icon.jsx";

// ─── Icon helper ─────────────────────────────────────────────────────────────

/**
 * Return the icon key for a cross-link target, or null if the concept has no
 * per-entity icons (recipes, buildings, zones, workers, etc. do not).
 *
 * Only concepts where every entity has a 1-to-1 icon (item id → icon key)
 * are included. Boss icons follow the "boss_<key>" convention.
 */
function iconKeyForLink(conceptId: string, key: string): string | null {
  if (conceptId === "tiles" || conceptId === "resources" || conceptId === "tools") return key;
  if (conceptId === "bosses") return `boss_${key}`;
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WikiArticleProps {
  conceptId: string;
  entityKey: string;
  onBack: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WikiArticle({ conceptId, entityKey, onBack }: WikiArticleProps) {
  const { navigate } = useBalanceNav();

  // Entity + schema
  const entity = getEntity(conceptId, entityKey);
  const cs = schemaForConcept(conceptId);

  // Build schema doc — catching in case of unexpected schema shape
  let schemaDoc: ReturnType<typeof describeSchema> | null = null;
  if (cs != null) {
    try {
      schemaDoc = describeSchema(cs.schema);
    } catch {
      schemaDoc = null;
    }
  }

  // Status chip
  const status = statusForEntity(conceptId, entityKey);
  const statusMeta = WIKI_STATUS_LEGEND[status];

  // Title for the entity
  const title = entity
    ? (String((entity as Record<string, unknown>).label ?? (entity as Record<string, unknown>).name ?? (entity as Record<string, unknown>).id ?? entityKey))
    : entityKey;

  // Authored HTML body (optional)
  const body = bodyFor(conceptId, entityKey);

  // Relations (forward) — no useMemo: this project runs the React Compiler
  // (eslint-plugin-react-compiler / react-hooks/preserve-manual-memoization),
  // which flags manual useMemo calls it cannot verify as safe. The compiler
  // handles memoization automatically; adding useMemo here produces a lint error.
  const rels = relationsFor(conceptId, entityKey, entity);

  // Backlinks (what links here) — same reason as above.
  const back = backlinksFor(conceptId, entityKey);

  // Schema field names for AdditionalFieldsSection
  const schemaFieldNames = new Set(schemaDoc?.fields.map((f) => f.field) ?? []);

  // Build TOC items — only sections that actually render
  const tocItems: TocItem[] = [
    { id: "overview", label: "Overview" },
    ...(body != null ? [{ id: "about", label: "About" }] : []),
    { id: "properties", label: "Properties" },
    ...(rels.length > 0 ? [{ id: "relations", label: "Related" }] : []),
    ...(back.length > 0 ? [{ id: "backlinks", label: "What links here" }] : []),
  ];

  return (
    <Card>
      {/* Header row */}
      <div className="flex items-start gap-2 mb-3 flex-wrap">
        <SmallButton onClick={onBack}>← Back</SmallButton>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Breadcrumb */}
          <span
            className="wiki-breadcrumb"
          >
            {conceptId}
          </span>
          <span style={{ color: COLORS.inkSubtle }}>›</span>
          {/* Entity title — display serif, big */}
          <span className="wiki-title" style={{ fontSize: "clamp(18px, 2.5vw, 26px)" }}>
            {title}
          </span>
          {/* Entity key — mono */}
          <code
            className="wiki-mono text-[11px] px-1.5 py-0.5 rounded"
            style={{
              background: COLORS.parchmentDeep,
              color: COLORS.inkSubtle,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {entityKey}
          </code>
          {/* Status chip */}
          <StatusChip
            tone={statusMeta.tone}
            size="xs"
            uppercase
            mono
            title={statusMeta.description}
            aria-label={`Status: ${statusMeta.label}`}
          >
            {statusMeta.label}
          </StatusChip>
        </div>
      </div>

      {/* Two-column layout: main content + right-rail Infobox */}
      <div className="flex gap-4 items-start min-w-0">
        {/* LEFT: main content column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 wiki-reveal-stagger">
          {/* Table of contents */}
          <TableOfContents items={tocItems} />

          {/* Lede paragraph */}
          <p
            id="overview"
            className="text-[13px] leading-relaxed"
            style={{ color: COLORS.ink, margin: 0 }}
          >
            {ledeFor(conceptId, entityKey, entity)}
          </p>

          {/* Authored HTML body (optional) */}
          {body != null && (
            <section id="about">
              <HtmlBody source={body} />
            </section>
          )}

          {/* Properties section — always rendered */}
          <section id="properties">
            <div
              className="wiki-section-heading mb-2"
            >
              Properties
            </div>

            {schemaDoc != null && (
              <>
                <FieldsTable fields={schemaDoc.fields} entity={entity} />
                {entity != null && (
                  <AdditionalFieldsSection
                    entity={entity}
                    schemaFieldNames={schemaFieldNames}
                  />
                )}
              </>
            )}

            {schemaDoc == null && entity != null && (
              <LiveConfigFallback entity={entity} />
            )}

            {schemaDoc == null && entity == null && (
              <div
                className="text-[12px] italic py-4 text-center"
                style={{ color: COLORS.inkSubtle }}
              >
                No data for this entry.
              </div>
            )}
          </section>

          {/* Forward relations */}
          {rels.length > 0 && (
            <section id="relations">
              <RelationalFooter standalone title="Related" hint="Derived · click to open">
                {rels.map((group) => (
                  <div key={group.title} className="mb-2 last:mb-0">
                    <div
                      className="text-[9px] font-bold uppercase tracking-wide mb-1"
                      style={{ color: COLORS.inkSubtle }}
                    >
                      {group.title}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {group.links.map((link) => {
                        const ik = iconKeyForLink(link.conceptId, link.key);
                        return (
                          <RefButton
                            key={`${link.conceptId}:${link.key}`}
                            title={`${link.conceptId}:${link.key}`}
                            onClick={() => navigate(wikiNavTarget(link.conceptId, link.key))}
                          >
                            {ik != null && (
                              <Icon iconKey={ik} size={14} style={{ marginRight: 3, verticalAlign: "middle" }} />
                            )}
                            <span className="wiki-mono text-[10px]">{link.label}</span>
                            {link.label !== link.key && (
                              <span
                                className="wiki-mono text-[9px] opacity-60 ml-0.5"
                                style={{ color: COLORS.inkSubtle }}
                              >
                                {link.key}
                              </span>
                            )}
                          </RefButton>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </RelationalFooter>
            </section>
          )}

          {/* Backlinks — what links here */}
          {back.length > 0 && (
            <section id="backlinks">
              <RelationalFooter standalone title="What links here" hint="Referenced by">
                {back.map((group) => (
                  <div key={group.title} className="mb-2 last:mb-0">
                    <div
                      className="text-[9px] font-bold uppercase tracking-wide mb-1"
                      style={{ color: COLORS.inkSubtle }}
                    >
                      {group.title}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {group.links.map((link) => {
                        const ik = iconKeyForLink(link.conceptId, link.key);
                        return (
                          <RefButton
                            key={`${link.conceptId}:${link.key}`}
                            title={`${link.conceptId}:${link.key}`}
                            onClick={() => navigate(wikiNavTarget(link.conceptId, link.key))}
                          >
                            {ik != null && (
                              <Icon iconKey={ik} size={14} style={{ marginRight: 3, verticalAlign: "middle" }} />
                            )}
                            <span className="wiki-mono text-[10px]">{link.label}</span>
                            {link.label !== link.key && (
                              <span
                                className="wiki-mono text-[9px] opacity-60 ml-0.5"
                                style={{ color: COLORS.inkSubtle }}
                              >
                                {link.key}
                              </span>
                            )}
                          </RefButton>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </RelationalFooter>
            </section>
          )}
        </div>

        {/* RIGHT: Infobox rail */}
        <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />
      </div>
    </Card>
  );
}
