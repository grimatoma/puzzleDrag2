/**
 * DailyRewardsTrack.tsx — "Reward" section for a daily-login-reward article.
 *
 * For a single day's article, surfaces what that login day grants:
 *   - coins / runes as currency chips
 *   - a tool grant ("{amount}× {tool}") with the tool's baked icon
 *   - an unlocked tile ("Unlocks {tile}") with the tile icon, clickable through
 *     to the tile's wiki article via wikiNavTarget("tiles", …)
 * Milestone days (7 / 14 / 30) get a small badge.
 *
 * COMPUTE is reused from the static DAILY_REWARDS map (constants.ts) — the same
 * source of truth the in-game login-reward flow uses.
 *
 * Returns null when the day grants nothing. Export `hasDailyReward` for TOC
 * gating.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import DesignIcon from "../../../ui/primitives/Icon.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";

// ─── Shapes ─────────────────────────────────────────────────────────────────

interface DailyRewardLike {
  day?: number;
  coins?: number;
  runes?: number;
  tool?: string;
  amount?: number;
  unlockTile?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MILESTONE_DAYS = new Set([7, 14, 30]);

const CURRENCY_META: Record<string, { icon: string; label: string }> = {
  coins: { icon: "design.currency.coin", label: "Coins" },
  runes: { icon: "design.currency.building-token", label: "Runes" },
};

// ─── Gating ───────────────────────────────────────────────────────────────────

/** Cheap precheck for TOC gating — true when the day grants anything. */
export function hasDailyReward(day: DailyRewardLike | null | undefined): boolean {
  if (day == null) return false;
  return (
    Boolean(day.coins) ||
    Boolean(day.runes) ||
    Boolean(day.tool) ||
    Boolean(day.unlockTile)
  );
}

// ─── Chip helpers ─────────────────────────────────────────────────────────────

/** A currency chip rendered with the design SVG currency icon. */
function CurrencyChip({ kind, amount }: { kind: string; amount: number }) {
  const meta = CURRENCY_META[kind] ?? { icon: kind, label: kind };
  return (
    <span className="hl-cost-tag" title={`${amount} ${meta.label}`}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <DesignIcon iconKey={meta.icon} size={20} title="" />
        <span style={{ fontWeight: 700 }}>{amount}</span>
        <span style={{ color: COLORS.inkSubtle }}>{meta.label}</span>
      </span>
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface DailyRewardsTrackProps {
  day: DailyRewardLike;
}

/** Render a login day's reward, or null when the day grants nothing. */
export function DailyRewardsTrack({ day }: DailyRewardsTrackProps) {
  const { navigate } = useBalanceNav();
  if (!hasDailyReward(day)) return null;

  const dayNum = typeof day.day === "number" ? day.day : null;
  const isMilestone = dayNum != null && MILESTONE_DAYS.has(dayNum);

  const toolKey = typeof day.tool === "string" && day.tool.length > 0 ? day.tool : null;
  const toolAmount = typeof day.amount === "number" && day.amount > 0 ? day.amount : 1;
  const toolLabel = toolKey != null ? iconLabel(toolKey) ?? toolKey : null;

  const unlockTile =
    typeof day.unlockTile === "string" && day.unlockTile.length > 0 ? day.unlockTile : null;
  const tileLabel = unlockTile != null ? iconLabel(unlockTile) ?? unlockTile : null;

  return (
    <section id="daily-reward">
      <div className="wiki-section-heading mb-2">Reward</div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {dayNum != null && (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: COLORS.ink }}
          >
            Day <span className="wiki-mono">{dayNum}</span>
          </span>
        )}

        {isMilestone && (
          <StatusChip tone="gold" size="sm" uppercase title="Milestone login day">
            Milestone
          </StatusChip>
        )}

        {Boolean(day.coins) && <CurrencyChip kind="coins" amount={Number(day.coins)} />}
        {Boolean(day.runes) && <CurrencyChip kind="runes" amount={Number(day.runes)} />}

        {toolKey != null && (
          <span className="hl-cost-tag" title={`${toolAmount}× ${toolLabel}`}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon iconKey={toolKey} size={20} />
              <span style={{ fontWeight: 700 }}>{toolAmount}×</span>
              <span style={{ color: COLORS.inkSubtle }}>{toolLabel}</span>
            </span>
          </span>
        )}

        {unlockTile != null && (
          <button
            type="button"
            title={`tiles:${unlockTile}`}
            onClick={() => navigate(wikiNavTarget("tiles", unlockTile))}
            className="hl-cost-tag hover:opacity-80"
            style={{ cursor: "pointer", border: "none", transition: "opacity 120ms ease" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon iconKey={unlockTile} size={20} />
              <span style={{ color: COLORS.inkSubtle }}>Unlocks</span>
              <span style={{ fontWeight: 700 }}>{tileLabel}</span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

export default DailyRewardsTrack;
