/**
 * StatusBadge.tsx — Plain-language implementation-status badge for the wiki.
 *
 * Shown in BOTH developer and player views. Translates the raw WikiStatus tier
 * into a human-readable label (e.g. "In game now") while keeping the precise
 * tier visible as a small mono suffix for both players and planners (always
 * shown — the wiki is living documentation).
 *
 * Tone colors are sourced from the shared UI_COLORS palette (same values used
 * by StatusChip's TONES map) so the two components stay visually consistent.
 */

import React from "react";
import type { WikiStatus } from "./status.js";
import { WIKI_STATUS_LEGEND } from "./status.js";
import { STATUS_TONES } from "../../ui/primitives/statusTones.js";

// ─── Plain-language labels ────────────────────────────────────────────────────

const PLAYER_LABELS: Record<WikiStatus, string> = {
  WIRED:      "In game now",
  PARTIAL:    "Partly in",
  STUB:       "Placeholder",
  "DOC-ONLY": "Designed",
  PLANNED:    "On the roadmap",
};

// ─── Tone → style mappings ────────────────────────────────────────────────────
//
// Sourced from the shared STATUS_TONES map (src/ui/primitives/statusTones.ts)
// so this badge stays in lock-step with StatusChip and ReachabilityBadge.

const TONE_STYLES = STATUS_TONES;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StatusBadgeProps {
  status: WikiStatus;
  /** When true, renders a smaller compact form suitable for entry cards. */
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const meta = WIKI_STATUS_LEGEND[status];
  const toneStyle = TONE_STYLES[meta.tone];
  const playerLabel = PLAYER_LABELS[status];

  return (
    <span
      className={compact ? "wiki-status-badge wiki-status-badge--compact" : "wiki-status-badge"}
      style={{
        background: toneStyle.background,
        color: toneStyle.color,
        borderColor: toneStyle.border,
      }}
      title={meta.description}
      aria-label={`Status: ${playerLabel}`}
    >
      {playerLabel}
      {/* Tier token always shown — the wiki is living docs, so the precise
          tier is useful for players checking status and planners alike. */}
      <span className="wiki-status-badge__tier" aria-hidden="true">
        {status}
      </span>
    </span>
  );
}
