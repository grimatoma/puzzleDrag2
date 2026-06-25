/**
 * BuildingGrants.tsx — "Tools produced" section for building articles.
 *
 * Surfaces the tools a building generates on a timer (grant_tool abilities) and
 * the free tool it provisions through the Town Hall (~every 8h). Complements
 * BuildingRecipes ("Recipes crafted here") so a building page answers both
 * "what can I craft here" and "what does this building hand me over time".
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import { BUILDINGS } from "../../../constants.js";
import { CIVIC_PROVISIONS } from "../../../features/civicEconomy/data.js";
import { ConceptRefForKey, resolveConceptId } from "../refs.js";
import { iconLabel } from "../../../textures/iconRegistry.js";

interface BuildingAbilityLike {
  id?: string;
  params?: Record<string, unknown>;
  trigger?: string;
}
interface BuildingLike {
  id: string;
  abilities?: BuildingAbilityLike[];
}

function cadence(trigger?: string): string {
  switch (trigger) {
    case "season_end":
      return "at the end of each season";
    case "session_end":
      return "after each session";
    default:
      return trigger ? trigger.replace(/_/g, " ") : "periodically";
  }
}

/** Inline entity link when the key resolves to a wiki concept, else a plain label. */
function Ref({ k }: { k: string }) {
  if (resolveConceptId(k) != null) return <ConceptRefForKey entityKey={k} variant="inline" />;
  return <span style={{ fontWeight: 600 }}>{iconLabel(k) ?? k}</span>;
}

export interface BuildingGrant {
  key: string;
  tool: string;
  amount: number;
  cadence: string;
}

/** Tools this building hands the player over time (timed grants + civic provisions). */
export function buildingGrantRows(buildingId: string): BuildingGrant[] {
  const rows: BuildingGrant[] = [];

  const building = (BUILDINGS as readonly unknown[]).find(
    (x): x is BuildingLike =>
      !!x && typeof x === "object" && (x as BuildingLike).id === buildingId,
  );
  for (const ab of building?.abilities ?? []) {
    const tool = ab.params?.tool;
    if (ab.id === "grant_tool" && typeof tool === "string") {
      rows.push({
        key: `grant:${tool}`,
        tool,
        amount: typeof ab.params?.amount === "number" ? ab.params.amount : 1,
        cadence: cadence(ab.trigger),
      });
    }
  }

  const prov = CIVIC_PROVISIONS[buildingId];
  if (prov) {
    rows.push({
      key: `civic:${prov.tool}`,
      tool: prov.tool,
      amount: prov.amount,
      cadence: "via Town Hall provisions (~every 8h)",
    });
  }

  return rows;
}

export function hasBuildingGrants(buildingId: string): boolean {
  return buildingGrantRows(buildingId).length > 0;
}

export interface BuildingGrantsProps {
  buildingId: string;
}

export function BuildingGrants({ buildingId }: BuildingGrantsProps) {
  const rows = buildingGrantRows(buildingId);
  if (rows.length === 0) return null;

  return (
    <section id="building-grants">
      <h2 className="wiki-section-heading mb-2">Tools produced</h2>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {rows.map((g) => (
          <div
            key={g.key}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
          >
            <span className="text-[13px]" style={{ color: COLORS.ink, fontWeight: 700 }}>
              {g.amount} ×
            </span>
            <Ref k={g.tool} />
            <span className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
              {g.cadence}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default BuildingGrants;
