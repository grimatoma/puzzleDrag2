/**
 * WorkerComparison.tsx — "Worker comparison" overview section for the Workers
 * category page of the Game Wiki.
 *
 * One row per type-worker in a side-by-side table:
 *   - Worker (icon + name, clickable → that worker's article)
 *   - Role
 *   - Max (maxCount the player can hire)
 *   - Base hire cost (coins + any resource chips)
 *   - Cost step (the linear coins ramp per hire, when present)
 *
 * COMPUTE is reused from the static TYPE_WORKERS catalog
 * (features/workers/data.js). Returns null when there are no workers.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import { TYPE_WORKERS } from "../../../features/workers/data.js";

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
 * Render the worker comparison table, or null when there are no workers.
 */
export function WorkerComparison() {
  const { navigate } = useBalanceNav();

  if (TYPE_WORKERS.length === 0) return null;

  return (
    <section id="worker-comparison">
      <div className="wiki-section-heading mb-2">Worker comparison</div>

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
              <th style={TH}>Worker</th>
              <th style={TH}>Role</th>
              <th style={TH}>Max</th>
              <th style={TH}>Base hire cost</th>
              <th style={TH}>Cost step</th>
            </tr>
          </thead>
          <tbody>
            {TYPE_WORKERS.map((w) => {
              const id = String(w.id);
              const coins = Number(w.hireCost?.coins) || 0;
              const step = Number(w.hireCost?.coinsStep) || 0;
              const resources = w.hireCost?.resources ?? {};
              const resourceEntries = Object.entries(resources).filter(
                ([, qty]) => Number(qty) > 0,
              );

              return (
                <tr key={id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={TD}>
                    <button
                      type="button"
                      title={`workers:${id}`}
                      onClick={() => navigate(wikiNavTarget("workers", id))}
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
                      <Icon iconKey={w.look?.iconKey} size={22} style={{ verticalAlign: "middle" }} />
                      <span>{w.name}</span>
                    </button>
                  </td>
                  <td style={TD}>{w.role}</td>
                  <td style={TD}>
                    <span className="wiki-mono" style={{ fontWeight: 700 }}>{w.maxCount}</span>
                  </td>
                  <td style={TD}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Icon iconKey="coins" size={18} style={{ verticalAlign: "middle" }} />
                        <span className="wiki-mono" style={{ fontWeight: 700 }}>{coins}</span>
                      </span>
                      {resourceEntries.map(([key, qty]) => (
                        <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon iconKey={key} size={16} style={{ verticalAlign: "middle" }} title={iconLabel(key) || key} />
                          <span className="wiki-mono" style={{ color: COLORS.inkSubtle }}>×{qty}</span>
                        </span>
                      ))}
                    </span>
                  </td>
                  <td style={TD}>
                    {step > 0 ? (
                      <span>
                        <span className="wiki-mono" style={{ fontWeight: 700 }}>+{step}</span>
                        <span style={{ color: COLORS.inkSubtle }}> / hire</span>
                      </span>
                    ) : (
                      <span style={{ color: COLORS.inkSubtle }}>—</span>
                    )}
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

export default WorkerComparison;
