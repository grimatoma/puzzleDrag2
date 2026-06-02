/**
 * BossDifficulty.tsx — "Difficulty" assessment section for the Game Wiki.
 */

import React from "react";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey } from "../refs.js";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { assessBoss, BOSS_TIER_LABEL, type BossLike } from "../../bossBalance.js";

const TIER_TONE: Record<string, "success" | "default" | "warning" | "ember"> = {
  gentle: "success",
  steady: "default",
  hard: "warning",
  brutal: "ember",
};

function targetAmount(boss: BossLike): number {
  return Number(boss?.target?.amount) || 0;
}

export function hasBossDifficulty(boss: BossLike | null | undefined): boolean {
  return boss != null && targetAmount(boss) > 0;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div
        className="text-[9px] font-bold uppercase tracking-wide"
        style={{ color: COLORS.inkSubtle }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.ink, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

export interface BossDifficultyProps {
  boss: BossLike;
}

export function BossDifficulty({ boss }: BossDifficultyProps) {
  if (!hasBossDifficulty(boss)) return null;

  const assessment = assessBoss(boss);
  const { perTurnTarget, tier, modifier } = assessment;
  const tone = TIER_TONE[tier.id] ?? "default";
  const tierLabel = BOSS_TIER_LABEL[tier.id] ?? tier.label;

  const resource = String(boss?.target?.resource ?? "");
  const amount = targetAmount(boss);
  const resourceLabel = (resource && iconLabel(resource)) || resource;
  const season = typeof boss?.season === "string" ? boss.season : null;

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
          {resource ? (
            <ConceptRefForKey
              entityKey={resource}
              fieldName="resource"
              label={resourceLabel}
              detail={`${amount}×`}
              variant="inline"
            />
          ) : (
            <span className="wiki-mono">{amount}×</span>
          )}
        </Stat>

        {season != null && (
          <Stat label="Season">
            <ConceptRefForKey
              entityKey={season.charAt(0).toUpperCase() + season.slice(1)}
              conceptId="seasons"
              label={season}
              variant="inline"
            />
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
