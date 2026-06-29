Each feature under `src/features/<name>/` owns two files:

- `index.tsx` — exports `default` (the React component, receives `{ state, dispatch }`) and either `viewKey` (full-screen) or `modalKey` (modal overlay), or both.
- `slice.ts` — a reducer slice exporting `initial` (object spread into global state) and `reduce(state, action)`. It **must return the same `state` reference unchanged** for unrecognised actions — the core reducer relies on that referential equality to gate side-effects.

> Source is TypeScript (`.ts`/`.tsx`), but import specifiers still use `.js` extensions (NodeNext resolution): `import { reduce } from "./slice.js"`.

**UI components are auto-discovered.** `FeatureModals`/`FeatureScreens` in `src/ui.tsx` use `import.meta.glob("./features/*/index.{jsx,tsx}", { eager: true })` to load every feature and mount whichever component's `viewKey`/`modalKey` matches `state.view`/`state.modal`. **No edit to `ui.tsx` is needed to add a screen or modal.**

**Reducer slices are NOT auto-discovered — this is the #1 footgun.** A new slice must be:

1. imported in `src/state.ts`, and
2. added to the `slices` array (around `src/state.ts:99`).

Additionally, if an action type is owned *exclusively* by a slice (the core reducer has no handler for it), it must be listed in `SLICE_PRIMARY_ACTIONS` (or `ALWAYS_RUN_SLICES` when the core reducer also partially handles it), near `src/state.ts:1751`. Otherwise the reducer short-circuits: when `coreReducer` returns the same state reference, slices are skipped and the action silently "does nothing". Use the **check-slice-action** skill to validate this.

**Bottom nav:** if the feature should be nav-reachable, add a `{key, label}` item to the `items` array in `BottomNav` in `src/ui.tsx`. Navigate via `dispatch({type:'SET_VIEW', view:'<key>'})`.

**Modals:** open via `dispatch({type:'OPEN_MODAL', modal:'<key>'})`, close via `dispatch({type:'CLOSE_MODAL'})`.

**Action types:** namespace as `'<FEATURE>/ACTION'` (e.g. `'CRAFTING/CRAFT_RECIPE'`).
