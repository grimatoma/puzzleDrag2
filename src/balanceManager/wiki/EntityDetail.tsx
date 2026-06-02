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
import { Card, SmallButton, Pill, ColorField, COLORS } from "../shared.jsx";
import { describeSchema } from "../schemaDoc.js";
import type { FieldDoc } from "../schemaDoc.js";
import { schemaForConcept } from "./conceptSchemas.js";
import { getEntity } from "./conceptEntities.js";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EntityDetailProps {
  conceptId: string;
  entityKey: string;
  onBack: () => void;
}

// ─── Value formatting ─────────────────────────────────────────────────────────

/**
 * Render a live field value as a React node. Handles color fields specially.
 */
function formatValue(
  fieldName: string,
  value: unknown,
): React.ReactNode {
  if (value === undefined || value === null) {
    return <span style={{ color: COLORS.inkSubtle }} className="italic">—</span>;
  }
  // Color fields: numeric color values get a swatch
  if ((fieldName === "color" || fieldName === "dark") && typeof value === "number") {
    return <ColorField value={value} />;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className="font-mono text-[11px]"
        style={{ color: value ? COLORS.green : COLORS.inkSubtle }}
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return <span className="font-mono text-[11px]">{String(value)}</span>;
  }
  if (typeof value === "string") {
    return <span className="font-mono text-[11px] break-all">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="font-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>[]</span>;
    }
    return (
      <span className="font-mono text-[11px] break-all">
        {value.map(String).join(", ")}
      </span>
    );
  }
  if (typeof value === "object") {
    return (
      <span className="font-mono text-[11px] break-all" style={{ color: COLORS.inkSubtle }}>
        {JSON.stringify(value)}
      </span>
    );
  }
  return <span className="font-mono text-[11px]">{String(value)}</span>;
}

/** Format a default value (from FieldDoc.default) — same rules as formatValue. */
function formatDefault(fieldName: string, value: unknown): React.ReactNode {
  if (value === undefined) {
    return <span style={{ color: COLORS.inkSubtle }} className="italic">—</span>;
  }
  return formatValue(fieldName, value);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldsTableProps {
  fields: FieldDoc[];
  entity: Record<string, unknown> | null;
}

function FieldsTable({ fields, entity }: FieldsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-[11px] border-collapse"
        style={{ color: COLORS.ink }}
      >
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
            {(["Field", "Type", "Req", "Default", "Value", "Description"] as const).map(
              (col) => (
                <th
                  key={col}
                  className="text-left py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap"
                  style={{ color: COLORS.inkSubtle }}
                >
                  {col}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => {
            const liveVal = entity != null ? entity[f.field] : undefined;
            return (
              <tr
                key={f.field}
                style={{
                  background: i % 2 === 0 ? COLORS.parchment : COLORS.parchmentDeep,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                {/* Field */}
                <td className="py-1.5 px-2 font-mono font-bold whitespace-nowrap align-top">
                  {f.field}
                </td>
                {/* Type */}
                <td
                  className="py-1.5 px-2 font-mono whitespace-nowrap align-top"
                  style={{ color: COLORS.inkSubtle }}
                >
                  {f.type}
                </td>
                {/* Req */}
                <td className="py-1.5 px-2 whitespace-nowrap align-top">
                  {f.optional ? (
                    <span style={{ color: COLORS.inkSubtle }}>optional</span>
                  ) : (
                    <span style={{ color: COLORS.ember }} className="font-bold">required</span>
                  )}
                </td>
                {/* Default */}
                <td className="py-1.5 px-2 align-top">
                  {formatDefault(f.field, f.default)}
                </td>
                {/* Value */}
                <td className="py-1.5 px-2 align-top max-w-[200px]">
                  {formatValue(f.field, liveVal)}
                </td>
                {/* Description */}
                <td
                  className="py-1.5 px-2 align-top"
                  style={{ color: COLORS.inkSubtle }}
                >
                  {f.description ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface AdditionalFieldsProps {
  entity: Record<string, unknown>;
  schemaFieldNames: Set<string>;
}

function AdditionalFieldsSection({ entity, schemaFieldNames }: AdditionalFieldsProps) {
  const extras = Object.keys(entity).filter((k) => !schemaFieldNames.has(k));
  if (extras.length === 0) return null;

  return (
    <div className="mt-4">
      <div
        className="text-[10px] font-bold uppercase tracking-wide mb-2"
        style={{ color: COLORS.inkSubtle }}
      >
        Additional fields (not in schema)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse" style={{ color: COLORS.ink }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
              <th
                className="text-left py-1 px-2 font-bold text-[10px] uppercase tracking-wide"
                style={{ color: COLORS.inkSubtle }}
              >
                Field
              </th>
              <th
                className="text-left py-1 px-2 font-bold text-[10px] uppercase tracking-wide"
                style={{ color: COLORS.inkSubtle }}
              >
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {extras.map((k, i) => (
              <tr
                key={k}
                style={{
                  background: i % 2 === 0 ? COLORS.parchment : COLORS.parchmentDeep,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <td className="py-1.5 px-2 font-mono font-bold whitespace-nowrap align-top">
                  {k}
                </td>
                <td className="py-1.5 px-2 align-top max-w-[300px]">
                  {formatValue(k, entity[k])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface LiveConfigFallbackProps {
  entity: Record<string, unknown>;
}

function LiveConfigFallback({ entity }: LiveConfigFallbackProps) {
  const keys = Object.keys(entity);
  return (
    <div className="overflow-x-auto">
      <div
        className="text-[10px] font-bold uppercase tracking-wide mb-2"
        style={{ color: COLORS.inkSubtle }}
      >
        Live config (no schema)
      </div>
      <table className="w-full text-[11px] border-collapse" style={{ color: COLORS.ink }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
            <th
              className="text-left py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide"
              style={{ color: COLORS.inkSubtle }}
            >
              Field
            </th>
            <th
              className="text-left py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide"
              style={{ color: COLORS.inkSubtle }}
            >
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k, i) => (
            <tr
              key={k}
              style={{
                background: i % 2 === 0 ? COLORS.parchment : COLORS.parchmentDeep,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <td className="py-1.5 px-2 font-mono font-bold whitespace-nowrap align-top">
                {k}
              </td>
              <td className="py-1.5 px-2 align-top max-w-[300px]">
                {formatValue(k, entity[k])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EntityDetail({ conceptId, entityKey, onBack }: EntityDetailProps) {
  const cs = schemaForConcept(conceptId);
  const entity = getEntity(conceptId, entityKey);

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
        </div>
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
    </Card>
  );
}
