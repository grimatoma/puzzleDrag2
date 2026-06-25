/**
 * AchievementCard.tsx — "Achievement" section for the Game Wiki.
 *
 * For an achievement article, surfaces the unlock requirement + payoff:
 *   - Requirement: the achievement `desc` + a "{threshold}/{target} {counter}"
 *     progress read.
 *   - Reward: coins / xp as currency chips, plus any tool grants
 *     (reward.tools — a Record<toolKey, qty>) rendered via AmountChips so the
 *     tools resolve to their baked item icons.
 *   - Trigger badge when present.
 *
 * COMPUTE is reused from the static ACHIEVEMENTS catalog
 * (features/achievements/data.ts) — the same source of truth the in-game
 * achievement ticker uses.
 *
 * Returns null when there is no achievement. Export `hasAchievementCard` for
 * TOC gating.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import DesignIcon from "../../../ui/primitives/Icon.jsx";
import { COLORS } from "../../shared.jsx";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { AmountChips } from "../EntityVisual.jsx";

// ─── Shapes ─────────────────────────────────────────────────────────────────

interface AchievementReward {
  coins?: number;
  xp?: number;
  tools?: Record<string, number> | null;
}

interface AchievementLike {
  desc?: string;
  counter?: string;
  threshold?: number;
  target?: number;
  reward?: AchievementReward | null;
  trigger?: string;
}

// ─── Gating ───────────────────────────────────────────────────────────────────

/** Cheap precheck for TOC gating — true when the achievement exists. */
export function hasAchievementCard(achievement: AchievementLike | null | undefined): boolean {
  return achievement != null;
}

/** Humanize a snake_case counter (e.g. "chains_committed" → "chains committed"). */
function humanizeCounter(counter: string): string {
  return counter.split("_").filter(Boolean).join(" ");
}

// ─── A small labelled stat block (matches BossDifficulty / TileUnlock). ────────

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div
        className="text-[9px] font-bold uppercase tracking-wide"
        style={{ color: COLORS.inkSubtle }}
      >
        {label}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 13, color: COLORS.ink }}
      >
        {children}
      </div>
    </div>
  );
}

/** A currency chip rendered with the design SVG currency icon. */
function CurrencyChip({ icon, amount, label }: { icon: string; amount: number; label: string }) {
  return (
    <span className="hl-cost-tag" title={`${amount} ${label}`}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <DesignIcon iconKey={icon} size={20} title="" />
        <span style={{ fontWeight: 700 }}>{amount}</span>
        <span style={{ color: COLORS.inkSubtle }}>{label}</span>
      </span>
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface AchievementCardProps {
  achievement: AchievementLike;
}

/** Render an achievement's requirement + reward, or null when absent. */
export function AchievementCard({ achievement }: AchievementCardProps) {
  if (!hasAchievementCard(achievement)) return null;

  const desc = typeof achievement.desc === "string" ? achievement.desc : null;
  const counter = typeof achievement.counter === "string" ? achievement.counter : null;
  const threshold =
    typeof achievement.threshold === "number" ? achievement.threshold : null;
  const target = typeof achievement.target === "number" ? achievement.target : null;

  const reward = achievement.reward ?? null;
  const coins = Number(reward?.coins) || 0;
  const xp = Number(reward?.xp) || 0;
  const tools = reward?.tools ?? null;
  const hasReward = coins > 0 || xp > 0 || (tools != null && Object.keys(tools).length > 0);

  const trigger =
    typeof achievement.trigger === "string" && achievement.trigger.length > 0
      ? achievement.trigger
      : null;

  return (
    <section id="achievement">
      <h2 className="wiki-section-heading mb-2">Achievement</h2>

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
        <Stat label="Requirement">
          <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            {desc != null && <span style={{ fontWeight: 600 }}>{desc}</span>}
            {threshold != null && target != null && counter != null && (
              <span className="wiki-mono" style={{ color: COLORS.inkSubtle }}>
                {threshold}/{target} {humanizeCounter(counter)}
              </span>
            )}
          </span>
        </Stat>

        {hasReward && (
          <Stat label="Reward">
            {coins > 0 && <CurrencyChip icon="design.currency.coin" amount={coins} label="Coins" />}
            {xp > 0 && <CurrencyChip icon="xp_levelup" amount={xp} label="XP" />}
            {tools != null && <AmountChips amounts={tools} />}
          </Stat>
        )}

        {trigger != null && (
          <Stat label="Trigger">
            <StatusChip tone="info" size="sm" uppercase title="Counter this achievement listens to">
              {humanizeCounter(trigger)}
            </StatusChip>
          </Stat>
        )}
      </div>
    </section>
  );
}

export default AchievementCard;
