/**
 * FieldsTable.tsx — Reusable schema field-table components for the Dev Panel Wiki.
 *
 * Extracted from EntityDetail.tsx so that both the per-entity detail panel and
 * the concept-level field reference (ConceptFields.tsx) can share the same
 * rendering logic.
 *
 * READ-ONLY — no editable controls.
 */

import React from "react";
import { ColorField, COLORS } from "../shared.jsx";
import type { FieldDoc } from "../schemaDoc.js";
import { AmountChips } from "./EntityVisual.jsx";
import { formatFieldRefValue } from "./refs.js";

/** Fields whose value, when a flat Record<string, number>, renders as icon+count chips. */
const CHIP_FIELDS = new Set(["cost", "inputs", "entryCost", "hireCost", "outputs"]);

/** True when `value` is a plain object whose every value is a number. */
function isFlatNumberRecord(value: object): value is Record<string, number> {
  if (Array.isArray(value)) return false;
  const entries = Object.values(value);
  return entries.length > 0 && entries.every((v) => typeof v === "number");
}

// ─── Value formatting ─────────────────────────────────────────────────────────

/** Safely serialize a value to JSON, returning "[unserializable]" for circular/non-serializable refs. */
export function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v) ?? "[unserializable]";
  } catch {
    return "[unserializable]";
  }
}

/**
 * Render a live field value as a React node. Handles color fields specially.
 */
export function formatValue(
  fieldName: string,
  value: unknown,
): React.ReactNode {
  if (value === undefined || value === null) {
    return <span style={{ color: COLORS.inkSubtle }} className="italic">—</span>;
  }
  // Color fields: swatch is name-driven (fields "color"/"dark"), not type-driven,
  // and is guarded by typeof value === "number" to avoid false positives.
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
    const ref = formatFieldRefValue(fieldName, value);
    if (ref != null) return ref;
    return <span className="font-mono text-[11px] break-all">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="font-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>[]</span>;
    }
    const ref = formatFieldRefValue(fieldName, value);
    if (ref != null) return ref;
    return (
      <span className="font-mono text-[11px] break-all">
        {value.map((el) => (el !== null && typeof el === "object" ? safeStringify(el) : String(el))).join(", ")}
      </span>
    );
  }
  if (typeof value === "object") {
    if (CHIP_FIELDS.has(fieldName) && isFlatNumberRecord(value)) {
      return <AmountChips amounts={value} variant="chip" />;
    }
    return (
      <span className="font-mono text-[11px] break-all" style={{ color: COLORS.inkSubtle }}>
        {safeStringify(value)}
      </span>
    );
  }
  return <span className="font-mono text-[11px]">{String(value)}</span>;
}

/** Format a default value (from FieldDoc.default) — same rules as formatValue. */
export function formatDefault(fieldName: string, value: unknown): React.ReactNode {
  if (value === undefined) {
    return <span style={{ color: COLORS.inkSubtle }} className="italic">—</span>;
  }
  return formatValue(fieldName, value);
}

// ─── FieldsTable ──────────────────────────────────────────────────────────────

/**
 * Render a field's own row followed by indented sub-rows for any nested-object
 * children (recursive, one extra indent level per depth).
 */
function renderRows(
  f: FieldDoc,
  i: number,
  depth: number,
  entity: Record<string, unknown> | null,
  showValue: boolean,
  keyPath: string = "",
): React.ReactNode[] {
  const liveParent = entity != null ? entity[f.field] : undefined;
  const fieldKey = keyPath ? `${keyPath}.${f.field}` : f.field;
  const rows: React.ReactNode[] = [
    <tr
      key={fieldKey}
      style={{
        background: i % 2 === 0 ? COLORS.parchment : COLORS.parchmentDeep,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <td
        className="py-1.5 px-2 font-mono font-bold whitespace-nowrap align-top"
        style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
      >
        {depth > 0 ? "↳ " : ""}{f.field}
      </td>
      <td className="py-1.5 px-2 font-mono whitespace-nowrap align-top" style={{ color: COLORS.inkSubtle }}>
        {f.children ? "object" : f.type}
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap align-top">
        {f.optional ? (
          <span style={{ color: COLORS.inkSubtle }}>optional</span>
        ) : (
          <span style={{ color: COLORS.ember }} className="font-bold">required</span>
        )}
      </td>
      <td className="py-1.5 px-2 align-top">{formatDefault(f.field, f.default)}</td>
      {showValue && (
        <td className="py-1.5 px-2 align-top">
          {f.children ? <span style={{ color: COLORS.inkSubtle }}>—</span> : formatValue(f.field, liveParent)}
        </td>
      )}
      <td className="py-1.5 px-2 align-top" style={{ color: COLORS.inkSubtle }}>
        {f.description ?? "—"}
      </td>
    </tr>,
  ];
  if (f.children) {
    const childEntity =
      liveParent != null && typeof liveParent === "object"
        ? (liveParent as Record<string, unknown>)
        : null;
    f.children.forEach((c, ci) =>
      rows.push(...renderRows(c, i + ci + 1, depth + 1, childEntity, showValue, fieldKey)),
    );
  }
  return rows;
}

/**
 * Schema field table.
 *
 * - `entity`    — when provided, a live "Value" column is rendered for each field.
 * - `showValue` — default `true`; set to `false` to omit the Value column entirely
 *                 (used by concept-level reference pages that have no single entity).
 */
export function FieldsTable({
  fields,
  entity = null,
  showValue = true,
}: {
  fields: FieldDoc[];
  entity?: Record<string, unknown> | null;
  showValue?: boolean;
}) {
  const columns = showValue
    ? (["Field", "Type", "Req", "Default", "Value", "Description"] as const)
    : (["Field", "Type", "Req", "Default", "Description"] as const);

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-[11px] border-collapse"
        style={{ color: COLORS.ink }}
      >
        <thead>
          <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
            {columns.map((col) => (
              <th
                key={col}
                className="text-left py-1.5 px-2 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap"
                style={{ color: COLORS.inkSubtle }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.flatMap((f, i) => renderRows(f, i, 0, entity, showValue))}
        </tbody>
      </table>
    </div>
  );
}

// ─── KeyValueTable ────────────────────────────────────────────────────────────

/** Shared two-column (Field · Value) table used by AdditionalFieldsSection and LiveConfigFallback. */
export function KeyValueTable({
  heading,
  keys,
  entity,
}: {
  heading: string;
  keys: string[];
  entity: Record<string, unknown>;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        className="text-[10px] font-bold uppercase tracking-wide mb-2"
        style={{ color: COLORS.inkSubtle }}
      >
        {heading}
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
              <td className="py-1.5 px-2 align-top">
                {formatValue(k, entity[k])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── AdditionalFieldsSection ──────────────────────────────────────────────────

export function AdditionalFieldsSection({
  entity,
  schemaFieldNames,
}: {
  entity: Record<string, unknown>;
  schemaFieldNames: Set<string>;
}) {
  const extras = Object.keys(entity).filter((k) => !schemaFieldNames.has(k));
  if (extras.length === 0) return null;

  return (
    <div className="mt-4">
      <KeyValueTable
        heading="Additional fields (not in schema)"
        keys={extras}
        entity={entity}
      />
    </div>
  );
}

// ─── LiveConfigFallback ───────────────────────────────────────────────────────

export function LiveConfigFallback({ entity }: { entity: Record<string, unknown> }) {
  return (
    <KeyValueTable
      heading="Live config (no schema)"
      keys={Object.keys(entity)}
      entity={entity}
    />
  );
}
