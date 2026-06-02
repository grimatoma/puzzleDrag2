/**
 * KeeperEncounter.tsx — "Keeper encounter" section for the Game Wiki.
 *
 * For a keeper article, surfaces the founding-bargain choice the player faces
 * once a settlement is built up: the keeper's title + emoji + "appears after N
 * buildings", then TWO side-by-side outcome cards:
 *   - Coexist  → the keeper stays; reward is Embers (mossy-green card).
 *   - Drive Out → an opt-in Keeper Trial; reward is Core Ingots (ember card).
 *
 * COMPUTE is reused from the static KEEPERS catalog (src/keepers.ts) — the same
 * source of truth the in-game encounter uses.
 *
 * Returns null when the keeper has neither outcome. Export `hasKeeperEncounter`
 * for TOC gating.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";

// ─── Shapes ─────────────────────────────────────────────────────────────────

interface KeeperPath {
  label?: string;
  pitch?: string[];
  embers?: number;
  coreIngots?: number;
}

interface KeeperLike {
  name?: string;
  title?: string;
  icon?: string;
  appearsAfterBuildings?: number;
  coexist?: KeeperPath | null;
  driveout?: KeeperPath | null;
}

// ─── Gating ───────────────────────────────────────────────────────────────────

/** Cheap precheck for TOC gating — true when the keeper has either outcome. */
export function hasKeeperEncounter(keeper: KeeperLike | null | undefined): boolean {
  if (keeper == null) return false;
  return keeper.coexist != null || keeper.driveout != null;
}

// ─── Outcome card ─────────────────────────────────────────────────────────────

interface OutcomeCardProps {
  /** Card heading — "Coexist" / "Drive Out". */
  pathLabel: string;
  /** Flavor label from the keeper's path (the in-game choice text). */
  choice?: string;
  /** First line of pitch flavor, if any. */
  flavor?: string;
  /** Reward icon key (baked-Icon registry key). */
  rewardIcon: string;
  /** Reward amount. */
  rewardAmount: number;
  /** Reward label — "Embers" / "Core Ingots". */
  rewardLabel: string;
  /** Accent palette for the card. */
  accent: string;
  /** Soft background tint. */
  tint: string;
}

function OutcomeCard({
  pathLabel,
  choice,
  flavor,
  rewardIcon,
  rewardAmount,
  rewardLabel,
  accent,
  tint,
}: OutcomeCardProps) {
  return (
    <div
      style={{
        flex: "1 1 220px",
        minWidth: 200,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
        borderRadius: 10,
        background: tint,
        border: `1px solid ${accent}`,
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ color: accent }}
      >
        {pathLabel}
      </div>

      {choice != null && (
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>
          “{choice}”
        </div>
      )}

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          alignSelf: "flex-start",
          padding: "3px 10px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.55)",
          border: `1px solid ${accent}`,
          color: COLORS.ink,
          fontWeight: 700,
        }}
        title={`${rewardAmount} ${rewardLabel}`}
      >
        <Icon iconKey={rewardIcon} size={20} />
        <span className="wiki-mono">+{rewardAmount}</span>
        <span style={{ color: COLORS.inkSubtle, fontWeight: 600 }}>{rewardLabel}</span>
      </span>

      {flavor != null && flavor.length > 0 && (
        <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
          {flavor}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface KeeperEncounterProps {
  keeper: KeeperLike;
}

/**
 * Render the keeper's founding-bargain encounter (Coexist vs Drive Out), or
 * null when the keeper has no outcomes.
 */
export function KeeperEncounter({ keeper }: KeeperEncounterProps) {
  if (!hasKeeperEncounter(keeper)) return null;

  const coexist = keeper.coexist ?? null;
  const driveout = keeper.driveout ?? null;
  const appearsAfter =
    typeof keeper.appearsAfterBuildings === "number" ? keeper.appearsAfterBuildings : null;

  return (
    <section id="keeper-encounter">
      <div className="wiki-section-heading mb-2">Keeper encounter</div>

      {/* Header strip: emoji + title + appears-after */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
          marginBottom: 12,
        }}
      >
        {keeper.icon != null && (
          <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden="true">
            {keeper.icon}
          </span>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {keeper.title != null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>
              {keeper.title}
            </span>
          )}
          {appearsAfter != null && (
            <span className="text-[11px]" style={{ color: COLORS.inkSubtle }}>
              Appears after{" "}
              <span className="wiki-mono" style={{ fontWeight: 700 }}>
                {appearsAfter}
              </span>{" "}
              buildings
            </span>
          )}
        </div>
      </div>

      {/* Two outcome cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {coexist != null && (
          <OutcomeCard
            pathLabel="Coexist"
            choice={coexist.label}
            flavor={coexist.pitch?.[0]}
            rewardIcon="cur_embers"
            rewardAmount={Number(coexist.embers) || 0}
            rewardLabel="Embers"
            accent={COLORS.greenDeep}
            tint="rgba(90,158,75,0.14)"
          />
        )}
        {driveout != null && (
          <OutcomeCard
            pathLabel="Drive Out"
            choice={driveout.label}
            flavor={driveout.pitch?.[0]}
            rewardIcon="cur_core_ingot"
            rewardAmount={Number(driveout.coreIngots) || 0}
            rewardLabel="Core Ingots"
            accent={COLORS.emberDeep}
            tint="rgba(214,97,42,0.14)"
          />
        )}
      </div>
    </section>
  );
}

export default KeeperEncounter;
