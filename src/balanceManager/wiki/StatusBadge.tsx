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
import { UI_COLORS } from "../../ui/primitives/palette.js";

// ─── Plain-language labels ────────────────────────────────────────────────────

const PLAYER_LABELS: Record<WikiStatus, string> = {
  WIRED:      "In game now",
  PARTIAL:    "Partly in",
  STUB:       "Placeholder",
  "DOC-ONLY": "Designed",
  PLANNED:    "On the roadmap",
};

// ─── Tone → CSS variable mappings ─────────────────────────────────────────────
//
// These mirror StatusChip's TONES map exactly — text colors come from
// UI_COLORS so both components stay in sync with the shared palette.

const TONE_STYLES: Record<
  "success" | "info" | "warning" | "danger" | "slate",
  { background: string; color: string; border: string }
> = {
  success: {
    background: "rgba(90,158,75,0.12)",
    color: UI_COLORS.greenDeep,
    border: "rgba(90,158,75,0.42)",
  },
  info: {
    background: "rgba(126,122,166,0.14)",
    color: "#5a4f8a",
    border: "rgba(126,122,166,0.42)",
  },
  warning: {
    background: "rgba(226,178,74,0.16)",
    color: "#7a5810",
    border: "rgba(226,178,74,0.5)",
  },
  danger: {
    background: "rgba(194,59,34,0.10)",
    color: UI_COLORS.redDeep,
    border: "rgba(194,59,34,0.42)",
  },
  slate: {
    background: "rgba(90,94,102,0.14)",
    color: "#3a3e42",
    border: "rgba(90,94,102,0.38)",
  },
};

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
