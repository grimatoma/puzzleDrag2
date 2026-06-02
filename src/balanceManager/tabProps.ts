// Shared tab-prop types for the Dev Panel / wiki shell.
//
// These types are imported both by `index.tsx` (which re-exports them so the
// legacy tab files can keep importing from `../index.jsx`) and by `WikiShell`
// (which renders the two surviving utility tabs — IconsTab, AnimationsDemoTab).
// Living in their own tiny module keeps `WikiShell ↔ index` free of an import
// cycle.

import type { BalanceDraft as BalanceDraftSchema } from "../config/schemas/index.js";

/** Effective game config — committed balance.json merged over defaults. */
export type BalanceDraft = BalanceDraftSchema;

// Props passed to every lazy tab. Individual tabs destructure only the fields
// they need (e.g. RationsTab ignores focus); typing them uniformly lets us
// render <ActiveComponent {...props}/> against a heterogeneous union without
// fighting every overload.
//
// `updateDraft` is retained as a no-op. The panel is read-only — field
// primitives in `shared.tsx` render static values — but the tabs still pass
// mutation callbacks through this prop, so keeping it (inert) avoids a
// multi-file signature sweep. Any add/remove button still wired to it is dead:
// calling it does nothing.
export interface TabProps {
  draft: BalanceDraft;
  updateDraft: (updater: (draft: BalanceDraft) => void) => void;
  focus?: string | null;
}
