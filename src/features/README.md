Each feature owns two files:

- `index.jsx` — exports `default` (the React component, receives `{ state, dispatch }`) and either `viewKey` (full-screen) or `modalKey` (modal overlay), or both.
- `slice.js` — reducer slice exporting `initial` (object spread into global state) and `reduce(state, action)` (returns state unchanged if action unrecognised)

**Auto-discovery:** `FeatureModals`/`FeatureScreens` in `src/ui.jsx` use `import.meta.glob` to load every `features/*/index.jsx` and mount the component whose `viewKey`/`modalKey` matches `state.view`/`state.modal`. **No edits to `ui.jsx` required.**

**Bottom nav:** if the feature should be nav-reachable, add a `{key, label}` item to the `items` array in `BottomNav` in `src/ui.jsx`. Trigger via `dispatch({type:'SET_VIEW', view:'<key>'})`.

**Modals:** open via `dispatch({type:'OPEN_MODAL', modal:'<key>'})`, close via `dispatch({type:'CLOSE_MODAL'})`.

**Action types:** namespace as `'<FEATURE>/ACTION'` (e.g. `'CRAFTING/CRAFT_RECIPE'`).

**State composition:** `initialState()` spreads all `slice.initial` objects. Main reducer falls through to each slice's `reduce()` after the top-level switch's `default`.
