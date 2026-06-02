/**
 * BossDifficulty.tsx — "Difficulty" assessment section for the Game Wiki.
 *
 * For a boss article, surfaces the derived difficulty read of the encounter:
 *   - a color-coded tier chip (gentle / steady / hard / brutal)
 *   - the per-turn target the player must average over the boss window
 *   - the raw defeat target (amount× resource) with a navigable resource icon
 *   - the season the boss appears in
 *   - the board modifier badge + its hint
 *
 * COMPUTE is reused from bossBalance.ts (assessBoss / BOSS_TIER_LABEL — pure,
 * keyed off the static BOSSES catalog). Returns null when the boss has no
 * usable target (assessBoss can't produce a meaningful per-turn read).
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import { conceptForKey } from "../conceptEntities.js";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { assessBoss, BOSS_TIER_LABEL, type BossLike } from "../../bossBalance.js";

/** StatusChip tone per difficulty tier id. */
const TIER_TONE: Record<string, "success" | "default" | "warning" | "ember"> = {
  gentle: "success",
  steady: "default",
  hard: "warning",
  brutal: "ember",
};

/** Read the numeric defeat target off a boss, or 0 when absent. */
function targetAmount(boss: BossLike): number {
  return Number(boss?.target?.amount) || 0;
}

/** Cheap precheck for TOC gating — true when the boss has a defeat target. */
export function hasBossDifficulty(boss: BossLike | null | undefined): boolean {
  return boss != null && targetAmount(boss) > 0;
}

/** A small labelled stat block used in the difficulty row. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div
        className="text-[9px] font-bold uppercase tracking-wide"
        style={{ color: COLORS.inkSubtle }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.ink }}>
        {children}
      </div>
    </div>
  );
}

export interface BossDifficultyProps {
  boss: BossLike;
}

/**
 * Render the difficulty assessment for `boss`, or null when there is no
 * usable defeat target.
 */
export function BossDifficulty({ boss }: BossDifficultyProps) {
  const { navigate } = useBalanceNav();
  if (!hasBossDifficulty(boss)) return null;

  const assessment = assessBoss(boss);
  const { perTurnTarget, tier, modifier } = assessment;
  const tone = TIER_TONE[tier.id] ?? "default";
  const tierLabel = BOSS_TIER_LABEL[tier.id] ?? tier.label;

  const resource = String(boss?.target?.resource ?? "");
  const amount = targetAmount(boss);
  const resourceLabel = (resource && iconLabel(resource)) || resource;
  const resourceConcept = resource ? conceptForKey(resource) : null;
  const season = typeof boss?.season === "string" ? boss.season : null;

  const resourceContent = (
    <>
      <span className="wiki-mono" style={{ color: COLORS.inkSubtle }}>{amount}×</span>
      {resource && (
        <Icon iconKey={resource} size={18} style={{ verticalAlign: "middle" }} />
      )}
      <span style={{ fontWeight: 600 }}>{resourceLabel}</span>
    </>
  );

  return (
    <section id="boss-difficulty">
      <div className="wiki-section-heading mb-2">Difficulty</div>

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
        <Stat label="Tier">
          <StatusChip tone={tone} size="sm" uppercase title={tier.hint}>
            {tierLabel}
          </StatusChip>
        </Stat>

        <Stat label="Per turn">
          <span className="wiki-mono" style={{ fontWeight: 700 }}>
            ~{perTurnTarget}
          </span>
          <span style={{ color: COLORS.inkSubtle }}>{resourceLabel}/turn</span>
        </Stat>

        <Stat label="Defeat target">
          {resourceConcept != null ? (
            <button
              type="button"
              title={`${resourceConcept}:${resource}`}
              onClick={() => navigate(wikiNavTarget(resourceConcept, resource))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: COLORS.ink,
              }}
              className="hover:opacity-80"
            >
              {resourceContent}
            </button>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {resourceContent}
            </span>
          )}
        </Stat>

        {season != null && (
          <Stat label="Season">
            <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{season}</span>
          </Stat>
        )}

        <Stat label="Board modifier">
          <span title={modifier.hint} style={{ fontWeight: 600 }}>
            {modifier.label}
          </span>
        </Stat>
      </div>
    </section>
  );
}

export default BossDifficulty;
