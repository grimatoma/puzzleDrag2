/**
 * BossComparison.tsx — "Boss comparison" overview section for the Bosses
 * category page of the Game Wiki.
 *
 * One row per boss in a side-by-side table:
 *   - Boss (icon boss_<id> + name, clickable → that boss's article)
 *   - Season
 *   - Difficulty (color-coded tier chip — gentle / steady / hard / brutal)
 *   - Target (amount× resource, with a resource icon)
 *   - Per-turn (~perTurnTarget resource/turn — the average pace to clear)
 *
 * COMPUTE is reused from bossBalance.ts (assessAllBosses / BOSS_TIER_LABEL —
 * pure, keyed off the static BOSSES catalog). Returns null when there are no
 * bosses.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { assessAllBosses, BOSS_TIER_LABEL } from "../../bossBalance.js";

/** StatusChip tone per difficulty tier id (matches BossDifficulty.tsx). */
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

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Render the boss comparison table, or null when there are no bosses.
 */
export function BossComparison() {
  const { navigate } = useBalanceNav();
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
                    <button
                      type="button"
                      title={`bosses:${id}`}
                      onClick={() => navigate(wikiNavTarget("bosses", id))}
                      className="hover:opacity-80"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: COLORS.ink,
                        fontWeight: 700,
                      }}
                    >
                      <Icon iconKey={`boss_${id}`} size={22} style={{ verticalAlign: "middle" }} />
                      <span>{name}</span>
                    </button>
                  </td>
                  <td style={{ ...TD, textTransform: "capitalize" }}>{season}</td>
                  <td style={TD}>
                    <StatusChip tone={tone} size="sm" uppercase title={tier.hint}>
                      {tierLabel}
                    </StatusChip>
                  </td>
                  <td style={TD}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span className="wiki-mono" style={{ color: COLORS.inkSubtle }}>{amount}×</span>
                      {resource && (
                        <Icon iconKey={resource} size={18} style={{ verticalAlign: "middle" }} />
                      )}
                      <span style={{ fontWeight: 600 }}>{resourceLabel}</span>
                    </span>
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
