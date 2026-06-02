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
// `BalanceManagerApp` is a thin wrapper around `WikiShell`. The legacy tab
// files under `./tabs/` still exist (a later task retires them) and import
// `TabProps` / `BalanceDraft` from `../index.jsx`; those types now live in
// `./tabProps.js` and are re-exported here so the legacy imports keep resolving
// without creating an `index ↔ WikiShell` import cycle.

import React from "react";
import WikiShell from "./wiki/WikiShell.jsx";

// Re-exported for the legacy tab files (which still import these from
// `../index.jsx`) and for WikiShell, which imports them directly from
// `./tabProps.js`.
export type { BalanceDraft, TabProps } from "./tabProps.js";

export default function BalanceManagerApp() {
  return <WikiShell />;
}
