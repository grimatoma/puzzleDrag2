/**
 * EconomyRollup.tsx — "Town economy" overview section for the Buildings
 * category page of the Game Wiki.
 *
 * Surfaces the kingdom-wide cost of founding a *full town*:
 *   - a row of currency metric cards (coins / runes / embers / core ingots /
 *     gems) summed across every BUILDINGS[*].cost
 *   - a per-resource roll-up: one labelled horizontal bar per resource the
 *     town requires, width ∝ qty / maxQty, annotated with how many buildings
 *     consume it.
 *
 * COMPUTE is reused from buildingCosts.ts (analyseBuildingCosts — pure, keyed
 * off the static BUILDINGS + ITEMS catalogs). Returns null when there is no
 * cost data at all.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { analyseBuildingCosts } from "../../buildingCosts.js";
import { ConceptRefForKey } from "../refs.js";

// ─── Currency metric cards ────────────────────────────────────────────────────

interface CurrencyMeta {
  key: string;
  icon: string;
  label: string;
}

// Order + presentation for the kingdom-wide currency totals.
const CURRENCIES: CurrencyMeta[] = [
  { key: "coins", icon: "coins", label: "Coins" },
  { key: "runes", icon: "runes", label: "Runes" },
  { key: "embers", icon: "embers", label: "Embers" },
  { key: "coreIngots", icon: "coreIngots", label: "Core Ingots" },
  { key: "gems", icon: "gems", label: "Gems" },
];

/** Compact thousands formatting (1,250) so big coin totals stay readable. */
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function MetricCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "10px 14px",
        borderRadius: 10,
        minWidth: 96,
        background: COLORS.parchment,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon iconKey={icon} size={18} style={{ verticalAlign: "middle" }} />
        <span
          className="text-[9px] font-bold uppercase tracking-wide"
          style={{ color: COLORS.inkSubtle }}
        >
          {label}
        </span>
      </div>
      <span className="wiki-mono" style={{ fontSize: 20, fontWeight: 800, color: COLORS.ink }}>
        {fmt(value)}
      </span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Render the kingdom-wide economy roll-up for the Buildings concept, or null
 * when no cost data is available.
 */
export function EconomyRollup() {
  const { perResource, totals } = analyseBuildingCosts({});

  const currencyCards = CURRENCIES.filter((c) => (totals[c.key] || 0) > 0);

  if (currencyCards.length === 0 && perResource.length === 0) return null;

  const maxQty = perResource.reduce((m, r) => (r.qty > m ? r.qty : m), 0);

  return (
    <section id="economy-rollup">
      <div className="wiki-section-heading mb-2">Town economy</div>

      <p className="text-[11px] italic m-0 mb-2" style={{ color: COLORS.inkSubtle }}>
        Everything it costs to found a complete town — summed across every building.
      </p>

      {/* Currency metric cards */}
      {currencyCards.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: perResource.length > 0 ? 14 : 0 }}>
          {currencyCards.map((c) => (
            <MetricCard key={c.key} icon={c.icon} label={c.label} value={totals[c.key]} />
          ))}
        </div>
      )}

      {/* Per-resource roll-up bars */}
      {perResource.length > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: COLORS.parchmentDeep,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            className="text-[9px] font-bold uppercase tracking-wide mb-2"
            style={{ color: COLORS.inkSubtle }}
          >
            Resources required
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {perResource.map((r) => {
              const label = (r.key && iconLabel(r.key)) || r.label || r.key;
              const pct = maxQty > 0 ? Math.max(4, Math.round((r.qty / maxQty) * 100)) : 4;
              const usedByN = r.usedBy.length;
              return (
                <div key={r.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: COLORS.ink,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <ConceptRefForKey entityKey={r.key} label={label} variant="inline" />
                    </span>
                    <span className="wiki-mono" style={{ fontWeight: 700 }}>{fmt(r.qty)}</span>
                    <span style={{ color: COLORS.inkSubtle, fontSize: 11, whiteSpace: "nowrap" }}>
                      used by {usedByN} building{usedByN === 1 ? "" : "s"}
                    </span>
                  </div>
                  {/* Bar track */}
                  <div
                    aria-hidden
                    style={{
                      height: 8,
                      borderRadius: 5,
                      background: COLORS.parchment,
                      border: `1px solid ${COLORS.border}`,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 5,
                        background: `linear-gradient(90deg, ${COLORS.ember}, ${COLORS.emberDeep})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default EconomyRollup;
