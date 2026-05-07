---
name: check-slice-action
description: Validate that a Redux-style action type is correctly registered in src/state.js. Use when adding a new dispatch type, when an action seems to "do nothing", or when a feature relies on a slice reducer. Catches the SLICE_PRIMARY_ACTIONS / ALWAYS_RUN_SLICES footgun documented in CLAUDE.md.
---

# check-slice-action

The most expensive class of bug in this repo: a new action is dispatched, the slice reducer that handles it is wired, but `coreReducer` returns the same state reference, so `rawReducer` short-circuits and the slice never runs. Symptom: feature appears completely dead.

This has shipped at least twice (`STORY/DISMISS_MODAL` in Pass 2; `magic_seed`/`magic_fertilizer` USE_TOOL variants).

## Inputs

- An action type string (e.g. `"STORY/DISMISS_MODAL"`, `"CARTO/TRAVEL"`).

## Procedure

1. **Find every reducer site that handles the action.** Grep `case "<TYPE>"` and `action.type === "<TYPE>"` across:
   - `src/state.js` (coreReducer + any inline branches in rawReducer/gameReducer)
   - `src/features/*/slice.js`

2. **Classify:**
   - **Pure-slice**: handled only in a slice file, not in `coreReducer`. → Must appear in `SLICE_PRIMARY_ACTIONS` (in `src/state.js`).
   - **Core + slice**: handled in both. → Either coreReducer must mutate state (so the rawReducer doesn't short-circuit), OR the type must appear in `ALWAYS_RUN_SLICES`.
   - **Core only**: handled only in coreReducer. → No registration needed.

3. **Verify the registration.** Open `src/state.js` and confirm the type appears in the matching set if needed.

4. **If misregistered:** add it to the right set with a one-line comment explaining which slice owns it.

5. **Run** `npm test -- --run` to confirm nothing broke.

## Output format

```
Action: <TYPE>
Handlers:
  - src/state.js:<line>  (coreReducer | rawReducer)
  - src/features/<name>/slice.js:<line>
Classification: <pure-slice | core+slice | core-only>
Registration: <OK | MISSING from SLICE_PRIMARY_ACTIONS | MISSING from ALWAYS_RUN_SLICES>
Action: <no-op | adding to set | already correct>
```

## Common pitfalls

- `BOSS/TRIGGER`, `APP/HIRE`, `CARTO/TRAVEL` are pure-slice and must be in `SLICE_PRIMARY_ACTIONS`.
- `CRAFTING/CRAFT_RECIPE` and `USE_TOOL` are core+slice — they're in `ALWAYS_RUN_SLICES` because core sometimes returns same-state when no story beat fires.
- Never assume a slice reducer is running just because the slice file exists. Always grep for the action type in `state.js` to confirm.

## When to invoke

- User adds a new dispatch type.
- A feature "doesn't work" but state inspection shows the dispatch is firing.
- During code review, before merging.
- Pass-N audit subagents should run this on every action mentioned in findings.
