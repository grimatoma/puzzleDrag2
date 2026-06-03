/**
 * AbilitySpec.tsx — "Specification" section for the Game Wiki (abilities concept).
 *
 * For an ability article, surfaces the technical spec the Infobox can't fit:
 *   - left column: human description + the configurable parameters table
 *     (param key, type, default, label) so players see what an attachment tunes
 *   - right column: trigger / channel / scope badges (when the ability fires,
 *     which aggregator bucket it feeds, and which entity kinds may attach it)
 *
 * COMPUTE is reused from the static ABILITIES catalog (config/abilities.js) via
 * the entity object passed in from getEntity("abilities", id). Returns null when
 * the entity has neither params nor any trigger/scope/channel metadata.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import { COLORS, Pill } from "../../shared.jsx";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { ConceptRefForKey, resolveConceptId } from "../refs.js";

// ─── Shapes ─────────────────────────────────────────────────────────────────

interface AbilityParam {
  key: string;
  label?: string;
  type?: string;
  default?: unknown;
}

interface AbilityLike {
  desc?: string;
  trigger?: string;
  channel?: string;
  scope?: string[] | readonly string[];
  params?: AbilityParam[] | readonly AbilityParam[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asAbility(value: unknown): AbilityLike | null {
  return value != null && typeof value === "object" ? (value as AbilityLike) : null;
}

function params(ability: AbilityLike): AbilityParam[] {
  return Array.isArray(ability.params) ? (ability.params as AbilityParam[]) : [];
}

function scopes(ability: AbilityLike): string[] {
  return Array.isArray(ability.scope) ? (ability.scope as string[]) : [];
}

/** Cheap precheck for TOC gating — true when there is meaningful spec to show. */
export function hasAbilitySpec(ability: unknown): boolean {
  const a = asAbility(ability);
  if (a == null) return false;
  return (
    params(a).length > 0 ||
    scopes(a).length > 0 ||
    typeof a.trigger === "string" ||
    typeof a.channel === "string" ||
    typeof a.desc === "string"
  );
}

/** Title-case a snake/lower id for display (e.g. "on_chain_collect" → "On Chain Collect"). */
function humanize(id: string): string {
  return id
    .split("_")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Format a param default for display, distinguishing "" / undefined from real values. */
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

function ParamsTable({ rows }: { rows: AbilityParam[] }) {
  return (
    <div className="wiki-table-scroll">
    <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 12 }}>
      <thead>
        <tr>
          {["Parameter", "Type", "Default"].map((h) => (
            <th
              key={h}
              className="text-[9px] font-bold uppercase tracking-wide"
              style={{
                textAlign: "left",
                color: COLORS.inkSubtle,
                padding: "0 8px 6px 0",
              }}
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

export interface AbilitySpecProps {
  ability: unknown;
}

/**
 * Render the spec card for an ability, or null when there is no meaningful spec.
 */
export function AbilitySpec({ ability }: AbilitySpecProps) {
  const a = asAbility(ability);
  if (a == null || !hasAbilitySpec(a)) return null;

  const ps = params(a);
  const sc = scopes(a);

  return (
    <section id="ability-spec">
      <div className="wiki-section-heading mb-2">Specification</div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* LEFT: description + config options */}
        <div
          style={{
            flex: "2 1 280px",
            minWidth: 240,
            padding: "12px 14px",
            borderRadius: 10,
            background: COLORS.parchmentDeep,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {typeof a.desc === "string" && a.desc.length > 0 && (
            <p className="text-[13px] leading-relaxed" style={{ color: COLORS.ink, margin: 0 }}>
              {a.desc}
            </p>
          )}

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
        </div>

        {/* RIGHT: technical badges */}
        <div
          style={{
            flex: "1 1 180px",
            minWidth: 160,
            padding: "12px 14px",
            borderRadius: 10,
            background: COLORS.parchmentDeep,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {typeof a.trigger === "string" && (
            <Stat label="Trigger">
              <StatusChip tone="info" size="sm" uppercase title={`Fires: ${a.trigger}`}>
                {humanize(a.trigger)}
              </StatusChip>
            </Stat>
          )}

          {typeof a.channel === "string" && (
            <Stat label="Channel">
              <code className="wiki-mono text-[11px]" style={{ color: COLORS.ink }}>
                {a.channel}
              </code>
            </Stat>
          )}

          {sc.length > 0 && (
            <Stat label="Attaches to">
              {sc.map((s) => (
                <Pill key={s}>{humanize(s)}</Pill>
              ))}
            </Stat>
          )}
        </div>
      </div>
    </section>
  );
}

export default AbilitySpec;
