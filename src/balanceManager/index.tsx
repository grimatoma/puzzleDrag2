// Wiki shell entry — the player-facing game wiki served at `/b/` (its own Vite
// entry, see `b/index.html`).
//
// This used to be a 21-tab Dev Panel editor shell. The editor write layer was
// removed earlier (the panel became read-only), and the tab shell has now been
// collapsed into a Wikipedia-style article namespace: `WikiShell` owns the
// header, sidebar, command palette, hash routing, and the (tab, focus)-driven
// main pane (category pages, entity articles, narrative pages, and the two
// surviving developer utility tabs).
//
// `BalanceManagerApp` is a thin wrapper around `WikiShell`. `TabProps` /
// `BalanceDraft` live in `./tabProps.js` and are re-exported here for any
// remaining consumers.

import React from "react";
import WikiShell from "./wiki/WikiShell.jsx";

export type { BalanceDraft, TabProps } from "./tabProps.js";

export default function BalanceManagerApp() {
  return <WikiShell />;
}
