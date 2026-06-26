/**
 * WorkerComparison.tsx — "Worker comparison" overview section for the Workers category page.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey } from "../refs.js";
import { AmountChips } from "../EntityVisual.jsx";
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

export function WorkerComparison() {
  if (TYPE_WORKERS.length === 0) return null;

  return (
    <section id="worker-comparison">
      <h2 className="wiki-section-heading mb-2">Worker comparison</h2>
      <div
        className="wiki-table-scroll"
        style={{
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
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
              const resourceAmounts = Object.fromEntries(
                Object.entries(resources).filter(([, qty]) => Number(qty) > 0),
              );

              return (
                <tr key={id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={TD}>
                    <ConceptRefForKey entityKey={id} conceptId="workers" label={w.name} variant="inline" />
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
                      <AmountChips amounts={resourceAmounts} />
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
