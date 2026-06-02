/**
 * BoonCard.tsx — "Boon" section for the Game Wiki.
 *
 * For a boon article, surfaces the per-settlement perk's price + payoff:
 *   - Cost as currency chips (Embers and/or Core Ingots).
 *   - Effect: the humanized effect type + its multiplier rendered as a
 *     percentage (e.g. "+15%") with the raw "×1.15" as a title.
 *   - `desc` as flavor text.
 *
 * COMPUTE is reused from the static boon catalog (features/boons/data.ts) — the
 * same source of truth the in-game boon shop uses.
 *
 * Returns null when there is no boon. Export `hasBoonCard` for TOC gating.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";

// ─── Shapes ─────────────────────────────────────────────────────────────────

interface BoonCost {
  embers?: number;
  coreIngots?: number;
}

interface BoonEffect {
  type?: string;
  params?: { mult?: number };
}

interface BoonLike {
  desc?: string;
  cost?: BoonCost | null;
  effect?: BoonEffect | null;
}

// ─── Currency-chip config ─────────────────────────────────────────────────────

const CURRENCY_META: Record<string, { icon: string; label: string }> = {
  embers: { icon: "cur_embers", label: "Embers" },
  coreIngots: { icon: "cur_core_ingot", label: "Core Ingots" },
};

// ─── Gating ───────────────────────────────────────────────────────────────────

/** Cheap precheck for TOC gating — true when the boon exists. */
export function hasBoonCard(boon: BoonLike | null | undefined): boolean {
  return boon != null;
}

/** Humanize a snake_case effect type (e.g. "coin_gain_mult" → "Coin gain"). */
function humanizeEffect(type: string): string {
  const words = type
    .replace(/_mult$/, "")
    .split("_")
    .filter(Boolean);
  if (words.length === 0) return type;
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Render a multiplier as a signed percentage (1.15 → "+15%", 0.9 → "−10%"). */
function pctFromMult(mult: number): string {
  const delta = Math.round((mult - 1) * 100);
  if (delta === 0) return "±0%";
  return delta > 0 ? `+${delta}%` : `−${Math.abs(delta)}%`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface BoonCardProps {
  boon: BoonLike;
}

/** Render a boon's cost + effect, or null when there is no boon. */
export function BoonCard({ boon }: BoonCardProps) {
  if (!hasBoonCard(boon)) return null;

  const cost = boon.cost ?? {};
  const costEntries = Object.entries(cost).filter(([, v]) => Boolean(v)) as Array<
    [string, number]
  >;

  const effectType = typeof boon.effect?.type === "string" ? boon.effect.type : null;
  const mult = Number(boon.effect?.params?.mult);
  const hasMult = Number.isFinite(mult) && mult > 0;

  return (
    <section id="boon">
      <div className="wiki-section-heading mb-2">Boon</div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 18,
          padding: "12px 14px",
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {/* Cost */}
        {costEntries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div
              className="text-[9px] font-bold uppercase tracking-wide"
              style={{ color: COLORS.inkSubtle }}
            >
              Cost
            </div>
            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
              {costEntries.map(([key, amount]) => {
                const meta = CURRENCY_META[key] ?? { icon: key, label: key };
                return (
                  <span
                    key={key}
                    className="hl-cost-tag"
                    title={`${amount} ${meta.label}`}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon iconKey={meta.icon} size={20} />
                      <span style={{ fontWeight: 700 }}>{amount}</span>
                      <span style={{ color: COLORS.inkSubtle }}>{meta.label}</span>
                    </span>
                  </span>
                );
              })}
            </span>
          </div>
        )}

        {/* Effect */}
        {effectType != null && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div
              className="text-[9px] font-bold uppercase tracking-wide"
              style={{ color: COLORS.inkSubtle }}
            >
              Effect
            </div>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <span style={{ fontWeight: 600, color: COLORS.ink }}>
                {humanizeEffect(effectType)}
              </span>
              {hasMult && (
                <span
                  className="wiki-mono"
                  title={`×${mult}`}
                  style={{ fontWeight: 700, color: COLORS.greenDeep }}
                >
                  {pctFromMult(mult)}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Flavor */}
      {boon.desc != null && boon.desc.length > 0 && (
        <p
          className="text-[12px] italic mt-2"
          style={{ color: COLORS.inkSubtle, margin: "8px 0 0" }}
        >
          {boon.desc}
        </p>
      )}
    </section>
  );
}

export default BoonCard;
