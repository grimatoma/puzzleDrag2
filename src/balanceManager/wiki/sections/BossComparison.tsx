/**
 * BossComparison.tsx — "Boss comparison" overview section for the Bosses category page.
 */

import React from "react";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey } from "../refs.js";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { assessAllBosses, BOSS_TIER_LABEL } from "../../bossBalance.js";

const TIER_TONE: Record<string, "success" | "default" | "warning" | "ember"> = {
  gentle: "success",
  steady: "default",
  hard: "warning",
  brutal: "ember",
};

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 10px",
  fontSize: 9,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: COLORS.inkSubtle,
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  color: COLORS.ink,
  verticalAlign: "middle",
};

export function BossComparison() {
  const assessments = assessAllBosses({});
  if (assessments.length === 0) return null;

  return (
    <section id="boss-comparison">
      <div className="wiki-section-heading mb-2">Boss comparison</div>
      <div
        style={{
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
          overflowX: "auto",
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={TH}>Boss</th>
              <th style={TH}>Season</th>
              <th style={TH}>Difficulty</th>
              <th style={TH}>Target</th>
              <th style={TH}>Per turn</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map(({ boss, tier, perTurnTarget }) => {
              const id = String(boss?.id ?? "");
              const name = (typeof boss?.name === "string" ? boss.name : id) || id;
              const season = typeof boss?.season === "string" ? boss.season : "—";
              const resource = String(boss?.target?.resource ?? "");
              const amount = Number(boss?.target?.amount) || 0;
              const resourceLabel = (resource && iconLabel(resource)) || resource;
              const tone = TIER_TONE[tier.id] ?? "default";
              const tierLabel = BOSS_TIER_LABEL[tier.id] ?? tier.label;

              return (
                <tr key={id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={TD}>
                    <ConceptRefForKey entityKey={id} conceptId="bosses" label={name} variant="inline" />
                  </td>
                  <td style={{ ...TD, textTransform: "capitalize" }}>{season}</td>
                  <td style={TD}>
                    <StatusChip tone={tone} size="sm" uppercase title={tier.hint}>
                      {tierLabel}
                    </StatusChip>
                  </td>
                  <td style={TD}>
                    {resource ? (
                      <ConceptRefForKey
                        entityKey={resource}
                        label={resourceLabel}
                        detail={`${amount}×`}
                        variant="inline"
                      />
                    ) : (
                      <span className="wiki-mono">{amount}×</span>
                    )}
                  </td>
                  <td style={TD}>
                    <span className="wiki-mono" style={{ fontWeight: 700 }}>~{perTurnTarget}</span>
                    <span style={{ color: COLORS.inkSubtle }}> {resourceLabel}/turn</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default BossComparison;
