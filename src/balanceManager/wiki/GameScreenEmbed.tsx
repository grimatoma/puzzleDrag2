/**
 * GameScreenEmbed.tsx — static screenshot of a named visual-testing scenario.
 *
 * Wiki content pages place a `<div data-game-visual="<scenario-id>">`; the
 * renderer swaps it for this component. Historically this booted the real game
 * in an `<iframe>`, which surfaced a full, interactive game instance mid-article
 * (and broke entirely if the visual-testing bridge wasn't present in the build).
 * It now shows a committed screenshot instead — an illustration, not a live game.
 *
 * Screenshots live in `assets/game-screens/` and are mapped by id in
 * `gameScreenImages.ts`; regenerate them with `tools/capture-wiki-screens.mjs`.
 */

import React from "react";
import { COLORS } from "../shared.jsx";
import { gameScreenImageFor } from "./gameScreenImages.js";

export interface GameScreenEmbedProps {
  /** A scenario id from `src/visualTesting/matrix.js`, e.g. "board-farm-idle". */
  scenarioId: string;
  /** Optional alt text; defaults to a description of the scenario. */
  alt?: string;
}

/**
 * Renders a static screenshot for the scenario. If no screenshot is bundled for
 * the id, renders nothing rather than a broken image or a live game instance.
 */
export function GameScreenEmbed({ scenarioId, alt }: GameScreenEmbedProps) {
  const src = gameScreenImageFor(scenarioId);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt ?? `Game screen: ${scenarioId}`}
      loading="lazy"
      style={{
        width: "100%",
        height: "auto",
        border: `2px solid ${COLORS.border}`,
        borderRadius: 8,
        background: COLORS.parchmentDeep,
        display: "block",
      }}
    />
  );
}
