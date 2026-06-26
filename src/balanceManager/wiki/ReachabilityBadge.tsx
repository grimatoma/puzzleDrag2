/**
 * ReachabilityBadge.tsx — derived "can the player reach this?" badge for the wiki.
 *
 * Sits NEXT TO StatusBadge and answers a DIFFERENT question. StatusBadge =
 * "is the feature wired" (hand-maintained WIRED/STUB/PLANNED). This badge =
 * "does an unlock path exist in the data" (derived by src/game/reachability.ts).
 * A thing can be reachable yet stubbed, or wired yet unreachable — two axes, two
 * badges. Visual vocabulary mirrors StatusBadge (same .wiki-status-badge class +
 * the shared UI_COLORS tones) so the pair reads as a matched set.
 */

import React from "react";
import type { Reachability } from "../../game/reachability.js";
import { UI_COLORS } from "../../ui/primitives/palette.js";

const TONE_STYLES = {
  success: { background: "rgba(90,158,75,0.12)", color: UI_COLORS.greenDeep, border: "rgba(90,158,75,0.42)" },
  info: { background: "rgba(126,122,166,0.14)", color: "#5a4f8a", border: "rgba(126,122,166,0.42)" },
  danger: { background: "rgba(194,59,34,0.10)", color: UI_COLORS.redDeep, border: "rgba(194,59,34,0.42)" },
} as const;

const META: Record<Reachability, { label: string; tier: string; tone: keyof typeof TONE_STYLES; description: string }> = {
  reachable: {
    label: "Reachable",
    tier: "REACH",
    tone: "success",
    description: "A player can reach this through the data's unlock paths (board → recipe → station building → zone tier).",
  },
  gated: {
    label: "Gated",
    tier: "GATED",
    tone: "info",
    description: "Reachable only via an optional system (research / buy / daily) — not on the default board.",
  },
  unreachable: {
    label: "Unreachable",
    tier: "NO PATH",
    tone: "danger",
    description: "No unlock path in the configured game — orphaned or scoped out. (Distinct from status: this is about reach, not wiring.)",
  },
};

export interface ReachabilityBadgeProps {
  reach: Reachability;
  /** Smaller compact form for entry cards (matches StatusBadge). */
  compact?: boolean;
  /**
   * When provided, the badge becomes a button that opens the "how is this
   * reachable?" graph. Omit (e.g. on entry cards) to render an inert label.
   */
  onActivate?: () => void;
}

export function ReachabilityBadge({ reach, compact = false, onActivate }: ReachabilityBadgeProps) {
  const meta = META[reach];
  const tone = TONE_STYLES[meta.tone];
  const className =
    (compact ? "wiki-status-badge wiki-status-badge--compact" : "wiki-status-badge") +
    (onActivate ? " wiki-status-badge--button" : "");
  const style = { background: tone.background, color: tone.color, borderColor: tone.border };
  const content = (
    <>
      {meta.label}
      <span className="wiki-status-badge__tier" aria-hidden="true">{meta.tier}</span>
    </>
  );

  if (onActivate) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={onActivate}
        title={`${meta.description} — click to see how.`}
        aria-label={`Reachability: ${meta.label}. Show how it is reachable.`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={className}
      style={style}
      title={meta.description}
      aria-label={`Reachability: ${meta.label}`}
    >
      {content}
    </span>
  );
}
