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
import { STATUS_TONES } from "../../ui/primitives/statusTones.js";

// Tones sourced from the shared STATUS_TONES map so this badge stays in
// lock-step with StatusBadge (its sibling) and StatusChip.
const TONE_STYLES = STATUS_TONES;

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
