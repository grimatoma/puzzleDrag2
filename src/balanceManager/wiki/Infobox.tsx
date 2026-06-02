/**
 * Infobox.tsx — Right-rail summary card for wiki entity articles.
 *
 * Shows:
 *  - A visual preview: either a live-game GameScreenEmbed (when the concept/key
 *    has a mapped visual scenario) or a procedural icon fallback.
 *  - An implementation-status chip.
 *  - A compact two-column facts table sourced from infoboxFacts().
 *
 * READ-ONLY — no interactive controls.
 */

import React from "react";
import { COLORS } from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";
import StatusChip from "../../ui/primitives/StatusChip.jsx";
import { GameScreenEmbed } from "./GameScreenEmbed.jsx";
import { infoboxFacts } from "./infoboxFacts.js";
import { scenarioForEntity } from "./conceptVisual.js";
import { statusForEntity, WIKI_STATUS_LEGEND } from "./status.js";

export function Infobox({
  conceptId,
  entityKey,
  entity,
  iconKey,
}: {
  conceptId: string;
  entityKey: string;
  entity: Record<string, unknown> | null;
  iconKey?: string;
}) {
  const scenario = scenarioForEntity(conceptId, entityKey);
  const status = statusForEntity(conceptId, entityKey);
  const meta = WIKI_STATUS_LEGEND[status];
  const facts = infoboxFacts(conceptId, entityKey, entity);

  return (
    <aside
      style={{
        width: 260,
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
      {/* Visual block */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        {scenario != null ? (
          <GameScreenEmbed scenarioId={scenario} height={220} />
        ) : (
          <Icon iconKey={iconKey ?? entityKey} size={96} />
        )}
      </div>

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
