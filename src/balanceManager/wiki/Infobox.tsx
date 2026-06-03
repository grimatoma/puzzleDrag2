/**
 * Infobox.tsx — Right-rail summary card for wiki entity articles.
 *
 * Shows:
 *  - A visual preview: the entity's real asset (procedural icon, building SVG,
 *    or zone map icon) via <EntityVisual>. Never a game iframe; renders no
 *    visual block when the entity has no asset.
 *  - An implementation-status chip.
 *  - A compact two-column facts table sourced from infoboxFacts().
 *
 * READ-ONLY — no interactive controls.
 */

import React from "react";
import { COLORS } from "../shared.jsx";
import StatusChip from "../../ui/primitives/StatusChip.jsx";
import { EntityVisual, entityIconKey } from "./EntityVisual.jsx";
import { CANONICAL_BUILDING_KEYS } from "../../ui/buildings/index.jsx";
import { infoboxFacts } from "./infoboxFacts.js";
import { statusForEntity, WIKI_STATUS_LEGEND } from "./status.js";

export function Infobox({
  conceptId,
  entityKey,
  entity,
}: {
  conceptId: string;
  entityKey: string;
  entity: Record<string, unknown> | null;
}) {
  const status = statusForEntity(conceptId, entityKey);
  const meta = WIKI_STATUS_LEGEND[status];
  const facts = infoboxFacts(conceptId, entityKey, entity);
  // EntityVisual returns null when there is no asset; gate the centering
  // wrapper on the same conditions so we never render an empty padded box.
  const hasVisual =
    (conceptId === "buildings" && CANONICAL_BUILDING_KEYS.includes(entityKey)) ||
    conceptId === "zones" ||
    entityIconKey(conceptId, entityKey, entity) != null;

  return (
    <aside
      style={{
        width: 190,
        flexShrink: 0,
        background: COLORS.parchmentDeep,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Visual block — the entity's real asset, or nothing. Never an iframe. */}
      {hasVisual && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <EntityVisual conceptId={conceptId} entityKey={entityKey} entity={entity} size={96} />
        </div>
      )}

      {/* Status chip */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <StatusChip
          tone={meta.tone}
          size="xs"
          uppercase
          mono
          title={meta.description}
        >
          {meta.label}
        </StatusChip>
      </div>

      {/* Facts table */}
      {facts.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11,
          }}
        >
          <tbody>
            {facts.map((fact, i) => (
              <tr
                key={fact.label}
                style={{
                  borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                }}
              >
                <td
                  style={{
                    padding: "4px 6px 4px 0",
                    fontWeight: 700,
                    color: COLORS.inkSubtle,
                    whiteSpace: "nowrap",
                    verticalAlign: "top",
                  }}
                >
                  {fact.label}
                </td>
                <td
                  style={{
                    padding: "4px 0 4px 6px",
                    fontFamily: "monospace",
                    color: COLORS.ink,
                    wordBreak: "break-word",
                    verticalAlign: "top",
                  }}
                >
                  {fact.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  );
}
