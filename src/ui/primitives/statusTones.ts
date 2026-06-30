/**
 * statusTones.ts — single source of truth for status-badge tone colors.
 *
 * StatusChip, StatusBadge (wiki) and ReachabilityBadge (wiki) all render the
 * same translucent "tone" pills (success/info/warning/danger/slate/…). They
 * previously each carried a verbatim copy of these rgba triples, which drifted
 * out of sync. They now all import this map, so the status vocabulary has one
 * definition. Text colors lean on the shared UI_COLORS palette where one fits.
 */

import { UI_COLORS } from "./palette.js";

export type Tone =
  | "default"
  | "muted"
  | "success"
  | "warning"
  | "danger"
  | "ember"
  | "gold"
  | "slate"
  | "info";

export interface ToneSpec {
  background: string;
  color: string;
  border: string;
}

export const STATUS_TONES: Record<Tone, ToneSpec> = {
  default: {
    background: UI_COLORS.parchmentDeep,
    color: UI_COLORS.inkLight,
    border: UI_COLORS.border,
  },
  muted: {
    background: "rgba(43,34,24,0.06)",
    color: UI_COLORS.inkSubtle,
    border: "rgba(43,34,24,0.16)",
  },
  success: {
    background: "rgba(90,158,75,0.12)",
    color: UI_COLORS.greenDeep,
    border: "rgba(90,158,75,0.42)",
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
  ember: {
    background: "rgba(214,97,42,0.12)",
    color: UI_COLORS.emberDeep,
    border: "rgba(214,97,42,0.42)",
  },
  gold: {
    background: "rgba(244,214,90,0.35)",
    color: "#6a4f10",
    border: "rgba(176,154,80,0.65)",
  },
  slate: {
    background: "rgba(90,94,102,0.14)",
    color: "#3a3e42",
    border: "rgba(90,94,102,0.38)",
  },
  info: {
    background: "rgba(126,122,166,0.14)",
    color: "#5a4f8a",
    border: "rgba(126,122,166,0.42)",
  },
};
