/**
 * ToolPowerSpec.tsx — "Specification" section for the Game Wiki (toolPowers concept).
 *
 * For a tool-power article, surfaces the active-effect spec the Infobox can't fit:
 *   - description + an optional caveat note
 *   - a "Tap target?" badge (whether the power needs the player to tap a cell)
 *   - the configurable parameters table (key, type, default)
 *   - the default board animation + timing when the catalog declares one
 *
 * COMPUTE is reused from the static TOOL_POWERS catalog (config/toolPowers.js) via
 * the entity object passed in from getEntity("toolPowers", id). Returns null when
 * the entity has no description and no params (nothing meaningful to show).
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { ConceptRefForKey, resolveConceptId } from "../refs.js";

// ─── Shapes ─────────────────────────────────────────────────────────────────

interface ToolPowerParam {
  key: string;
  label?: string;
  type?: string;
  default?: unknown;
}

interface BoardAnim {
  anim?: string;
  ms?: number;
}

interface ToolPowerLike {
  desc?: string;
  note?: string;
  isTapTarget?: boolean;
  params?: ToolPowerParam[] | readonly ToolPowerParam[];
  defaultBoardAnim?: BoardAnim | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asPower(value: unknown): ToolPowerLike | null {
  return value != null && typeof value === "object" ? (value as ToolPowerLike) : null;
}

function params(power: ToolPowerLike): ToolPowerParam[] {
  return Array.isArray(power.params) ? (power.params as ToolPowerParam[]) : [];
}

/** Cheap precheck for TOC gating — true when there is meaningful spec to show. */
export function hasToolPowerSpec(power: unknown): boolean {
  const p = asPower(power);
  if (p == null) return false;
  return typeof p.desc === "string" || params(p).length > 0;
}

/** Title-case a snake/lower id for display. */
function humanize(id: string): string {
  return id
    .split("_")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function formatDefault(value: unknown): React.ReactNode {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "string" && resolveConceptId(value) != null) {
    return <ConceptRefForKey entityKey={value} variant="inline" />;
  }
  return String(value);
}

// ─── Sub-blocks ─────────────────────────────────────────────────────────────

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        className="text-[9px] font-bold uppercase tracking-wide"
        style={{ color: COLORS.inkSubtle }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

function ParamsTable({ rows }: { rows: ToolPowerParam[] }) {
  return (
    <div className="wiki-table-scroll">
    <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 12 }}>
      <thead>
        <tr>
          {["Parameter", "Type", "Default"].map((h) => (
            <th
              key={h}
              className="text-[9px] font-bold uppercase tracking-wide"
              style={{ textAlign: "left", color: COLORS.inkSubtle, padding: "0 8px 6px 0" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.key}>
            <td style={{ padding: "4px 8px 4px 0", verticalAlign: "top" }}>
              <div style={{ fontWeight: 600, color: COLORS.ink }}>{p.label ?? humanize(p.key)}</div>
              <code className="wiki-mono text-[10px]" style={{ color: COLORS.inkSubtle }}>
                {p.key}
              </code>
            </td>
            <td style={{ padding: "4px 8px 4px 0", verticalAlign: "top" }}>
              {p.type != null ? (
                <code className="wiki-mono text-[11px]" style={{ color: COLORS.ink }}>
                  {p.type}
                </code>
              ) : (
                <span style={{ color: COLORS.inkSubtle }}>—</span>
              )}
            </td>
            <td
              className="wiki-mono text-[11px]"
              style={{ padding: "4px 0", verticalAlign: "top", color: COLORS.ink }}
            >
              {formatDefault(p.default)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface ToolPowerSpecProps {
  power: unknown;
}

/**
 * Render the spec card for a tool power, or null when there is no meaningful spec.
 */
export function ToolPowerSpec({ power }: ToolPowerSpecProps) {
  const p = asPower(power);
  if (p == null || !hasToolPowerSpec(p)) return null;

  const ps = params(p);
  const isTap = p.isTapTarget === true;
  const anim = p.defaultBoardAnim ?? null;
  const hasAnim = anim != null && (typeof anim.anim === "string" || typeof anim.ms === "number");

  return (
    <section id="tool-power-spec">
      <div className="wiki-section-heading mb-2">Specification</div>

      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {typeof p.desc === "string" && p.desc.length > 0 && (
          <p className="text-[13px] leading-relaxed" style={{ color: COLORS.ink, margin: 0 }}>
            {p.desc}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          <Stat label="Tap target?">
            <StatusChip
              tone={isTap ? "info" : "muted"}
              size="sm"
              uppercase
              title={
                isTap
                  ? "The player taps a board cell to aim this power."
                  : "Fires immediately when spent — no aiming."
              }
            >
              {isTap ? "Yes" : "No"}
            </StatusChip>
          </Stat>

          {hasAnim && (
            <Stat label="Board animation">
              {typeof anim?.anim === "string" && (
                <code className="wiki-mono text-[11px]" style={{ color: COLORS.ink }}>
                  {anim.anim}
                </code>
              )}
              {typeof anim?.ms === "number" && (
                <span className="wiki-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>
                  {anim.ms}ms
                </span>
              )}
            </Stat>
          )}
        </div>

        <Stat label="Config options">
          {ps.length > 0 ? (
            <div style={{ width: "100%" }}>
              <ParamsTable rows={ps} />
            </div>
          ) : (
            <span className="text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
              No tunable parameters.
            </span>
          )}
        </Stat>

        {typeof p.note === "string" && p.note.length > 0 && (
          <div
            className="text-[12px] leading-relaxed"
            style={{
              color: COLORS.inkSubtle,
              borderLeft: `3px solid ${COLORS.border}`,
              paddingLeft: 10,
              fontStyle: "italic",
            }}
          >
            {p.note}
          </div>
        )}
      </div>
    </section>
  );
}

export default ToolPowerSpec;
