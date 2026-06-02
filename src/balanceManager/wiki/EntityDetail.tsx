/**
 * EntityDetail.tsx — Per-entity detail panel for the Dev Panel Wiki.
 *
 * Shows a "Fields" table driven by the entity's Zod schema (field name, type,
 * optionality, default, live value, description) plus an "Additional fields"
 * section for any runtime keys not covered by the schema.
 *
 * READ-ONLY — no editable controls.
 */

import React from "react";
import { Card, SmallButton, Pill, COLORS } from "../shared.jsx";
import { describeSchema } from "../schemaDoc.js";
import { schemaForConcept } from "./conceptSchemas.js";
import { getEntity } from "./conceptEntities.js";
import { useBalanceNav } from "../balanceNav.jsx";
import { RefButton, RelationalFooter } from "../relational.jsx";
import { relationsFor } from "./relations.js";
import StatusChip from "../../ui/primitives/StatusChip.jsx";
import { statusForEntity, WIKI_STATUS_LEGEND } from "./status.js";
import { FieldsTable, AdditionalFieldsSection, LiveConfigFallback } from "./FieldsTable.jsx";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EntityDetailProps {
  conceptId: string;
  entityKey: string;
  onBack: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EntityDetail({ conceptId, entityKey, onBack }: EntityDetailProps) {
  const { navigate } = useBalanceNav();
  const cs = schemaForConcept(conceptId);
  const entity = getEntity(conceptId, entityKey);
  const groups = React.useMemo(
    () => relationsFor(conceptId, entityKey, entity),
    [conceptId, entityKey, entity],
  );

  // Status chip
  const status = statusForEntity(conceptId, entityKey);
  const statusMeta = WIKI_STATUS_LEGEND[status];

  // Build schema doc — catching in case of unexpected schema shape
  let schemaDoc: ReturnType<typeof describeSchema> | null = null;
  if (cs != null) {
    try {
      schemaDoc = describeSchema(cs.schema);
    } catch {
      schemaDoc = null;
    }
  }

  // Pill content for schema kind
  const pillContent =
    cs == null
      ? "no schema · live config"
      : cs.kind === "definition"
        ? "definition"
        : "override · tunable via balance.json";

  const pillBg = cs == null ? COLORS.parchmentDeep : cs.kind === "definition" ? COLORS.green : COLORS.ember;
  const pillColor = cs == null ? COLORS.inkSubtle : "#fff";

  const schemaFieldNames = new Set(schemaDoc?.fields.map((f) => f.field) ?? []);

  return (
    <Card>
      {/* Header row */}
      <div className="flex items-start gap-2 mb-3 flex-wrap">
        <SmallButton onClick={onBack}>← Back</SmallButton>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-bold text-[13px]" style={{ color: COLORS.ink }}>
            {entity
              ? ((entity.label ?? entity.name ?? entity.id) as string | undefined) ?? entityKey
              : entityKey}
          </span>
          <code
            className="text-[11px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: COLORS.parchmentDeep,
              color: COLORS.inkSubtle,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {entityKey}
          </code>
          <Pill color={pillColor} bg={pillBg}>{pillContent}</Pill>
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
      {/* Status legend — compact one-liner, unobtrusive */}
      <div
        className="text-[9px] mb-3 leading-tight"
        style={{ color: COLORS.inkSubtle }}
        title="Status legend: WIRED = runs in normal play · PARTIAL = partly wired · STUB = present but inert · DOC-ONLY = design only · PLANNED = not yet built"
      >
        Status:{" "}
        {(Object.entries(WIKI_STATUS_LEGEND) as Array<[string, typeof WIKI_STATUS_LEGEND[keyof typeof WIKI_STATUS_LEGEND]]>).map(([s, meta], i, arr) => (
          <span key={s}>
            <strong>{s}</strong> = {meta.description.replace(/\.$/, "")}
            {i < arr.length - 1 ? " · " : ""}
          </span>
        ))}
      </div>

      {/* Schema-driven fields table */}
      {schemaDoc != null && (
        <>
          <div
            className="text-[10px] font-bold uppercase tracking-wide mb-2"
            style={{ color: COLORS.inkSubtle }}
          >
            Schema fields
            {cs?.kind === "override" && (
              <span className="ml-1 normal-case font-normal">
                (override — only tunable fields listed)
              </span>
            )}
          </div>
          <FieldsTable fields={schemaDoc.fields} entity={entity} />

          {/* Additional fields not in schema */}
          {entity != null && (
            <AdditionalFieldsSection entity={entity} schemaFieldNames={schemaFieldNames} />
          )}
        </>
      )}

      {/* No schema — live config fallback */}
      {cs == null && entity != null && <LiveConfigFallback entity={entity} />}

      {/* Nothing at all */}
      {cs == null && entity == null && (
        <div
          className="text-[12px] italic py-4 text-center"
          style={{ color: COLORS.inkSubtle }}
        >
          No data for this entry.
        </div>
      )}

      {/* Cross-links — Related section */}
      {groups.length > 0 && (
        <RelationalFooter standalone title="Related" hint="Derived · click to open">
          {groups.map((group) => (
            <div key={group.title} className="mb-2 last:mb-0">
              <div
                className="text-[9px] font-bold uppercase tracking-wide mb-1"
                style={{ color: COLORS.inkSubtle }}
              >
                {group.title}
              </div>
              <div className="flex flex-wrap gap-1">
                {group.links.map((link) => (
                  <RefButton
                    key={`${link.conceptId}:${link.key}`}
                    title={`${link.conceptId}:${link.key}`}
                    onClick={() =>
                      navigate({ tab: "wiki", focus: `${link.conceptId}:${link.key}` })
                    }
                  >
                    <span className="font-mono text-[10px]">{link.label}</span>
                    {link.label !== link.key && (
                      <span
                        className="font-mono text-[9px] opacity-60 ml-0.5"
                        style={{ color: COLORS.inkSubtle }}
                      >
                        {link.key}
                      </span>
                    )}
                  </RefButton>
                ))}
              </div>
            </div>
          ))}
        </RelationalFooter>
      )}
    </Card>
  );
}
