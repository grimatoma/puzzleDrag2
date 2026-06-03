/**
 * NarrativePage.tsx — Renders a top-level authored narrative page (Overview,
 * Progression, Design decisions, Story, …) for the wiki shell.
 *
 * Loads the authored HTML fragment for the given slug via `pageFor` and renders
 * it through HtmlBody (which rewires [[wikilinks]], data-wiki anchors, and game
 * visual embeds). When no page has been authored yet, shows a graceful note
 * rather than a blank pane.
 */

import React from "react";
import { pageFor } from "./htmlContent.js";
import HtmlBody from "./HtmlBody.jsx";
import { COLORS } from "../shared.jsx";

export function NarrativePage({ slug }: { slug: string }) {
  const src = pageFor(slug);
  if (!src) {
    return (
      <div className="text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
        This page hasn’t been written yet: {slug}
      </div>
    );
  }
  return (
    <article className="wiki-prose">
      <HtmlBody source={src} />
    </article>
  );
}
