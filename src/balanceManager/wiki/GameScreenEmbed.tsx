/**
 * GameScreenEmbed.tsx — Lazy iframe that boots the real game at a named
 * visual-testing scenario.
 *
 * The embed is the actual interactive game running inside an iframe, not a
 * screenshot. It uses the same visual-testing bridge as `?visual=<id>` in the
 * dev server and Playwright visual tests. The `visualPanel=0` flag suppresses
 * the scenario-picker overlay so the embed looks clean.
 */

import React from "react";
import { COLORS } from "../shared.jsx";

export interface GameScreenEmbedProps {
  /** A scenario id from `src/visualTesting/matrix.js`, e.g. "board-farm-idle". */
  scenarioId: string;
  /** Height of the iframe in pixels. Defaults to 360. */
  height?: number;
}

/**
 * Renders an iframe pointed at the game entry with `?visual=<scenarioId>`.
 * Loading is deferred (`loading="lazy"`) so it doesn't block wiki page paint.
 */
export function GameScreenEmbed({ scenarioId, height = 360 }: GameScreenEmbedProps) {
  const src = `${import.meta.env.BASE_URL}?visual=${encodeURIComponent(scenarioId)}&visualPanel=0`;
  return (
    <iframe
      src={src}
      title={`Game screen: ${scenarioId}`}
      loading="lazy"
      style={{
        width: "100%",
        height,
        border: `2px solid ${COLORS.border}`,
        borderRadius: 8,
        background: COLORS.parchmentDeep,
        display: "block",
      }}
    />
  );
}
