# Dialogue / Story Editor Execution Plan

Source: `docs/dialog_todo.md`.
Baseline inspected on 2026-05-12. This is a planning document only; no product code has been implemented for this pass.

## Validation Commands

Commands discovered from `package.json`, `vitest.config.js`, `playwright.config.js`, and `.github/workflows/ci.yml`:

- `npm run lint` - ESLint over `src/` and `prototype.jsx`.
- `npm run test` - Vitest unit suite, with includes `tests/**/*.test.js` and `src/**/*.test.js`.
- `npm run test:coverage` - CI test command with V8 coverage thresholds.
- `npm run build` - Vite production build. Part of CI.
- `npm run test:e2e:install` - install Chromium before first Playwright run in a fresh environment.
- `npm run test:e2e` - Playwright suite in `tests/e2e`, using Vite web server at `http://localhost:5173/puzzleDrag2/`.
- `npm run test:e2e:headed` - headed Playwright debug run.

Recommended targeted commands during dialog work:

- `npx vitest run src/__tests__/story-editor-model.test.js`
- `npx vitest run src/__tests__/flags.test.js src/__tests__/story-triggers.test.js src/__tests__/story-dialogue.test.js src/__tests__/story-engine-coverage.test.js`
- `npx playwright test tests/e2e/<new-dialog-spec>.spec.js`

Before merging a milestone, run at least:

- `npm run lint`
- `npm run test`
- `npm run build`

For milestones that touch browser interaction, drag, localStorage, or story runtime flow, also run:

- `npm run test:e2e`

## Milestone 1 - Touch-Drag Cards

Goal: Make touch input able to pick up and drag story editor cards while preserving one-finger canvas pan and two-finger pinch zoom.

Exact files likely to change:

- `src/storyEditor/index.jsx`
- `src/storyEditor/shared.jsx` only if drag helpers are extracted for testability
- `src/__tests__/story-editor-model.test.js` only if shared pure helpers are added
- A future Playwright spec under `tests/e2e/` if automated coverage is added

Implementation steps:

1. Add touch handlers to `TreeNode` or the node wrapper that mirror `onNodeMouseDown`.
2. Track node touch drag state in the existing `nodeDrag` ref, using the active touch identifier so pinch gestures do not steal card drags.
3. In the canvas touch handlers, ignore touches that started on node cards or card buttons.
4. Keep button hit targets (`PreviewPlay`, collapse toggle) from initiating card drag.
5. Persist moved touch positions through existing `moveNode` and `writeNodePositions`.
6. Manually test touch mode in Playwright's existing iPhone landscape project or a local mobile emulator.

Acceptance criteria:

- A single finger on a card moves that card and persists its layout in `hearth.story.layout`.
- A tap on a card without movement still selects it.
- Preview and collapse buttons on cards still work on touch.
- One-finger drag on empty canvas still pans.
- Two-finger pinch still zooms.
- Mouse drag behavior is unchanged.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-editor-model.test.js`
- `npm run build`
- `npm run test:e2e` after adding or adapting browser coverage

Risk level: Medium. Touch event routing can easily regress canvas pan or button taps.

Dependencies: None.

Implement now or deferred: Implement now. Highest-value mobile/tablet usability fix.

## Milestone 2 - Choice Reorder

Goal: Let authors reorder a beat's choices in the inspector so fork-card and in-game choice order match author intent.

Exact files likely to change:

- `src/storyEditor/Inspector.jsx`
- `src/storyEditor/shared.jsx` if a reusable reorder helper is extracted
- `src/__tests__/story-editor-model.test.js` or a new targeted unit test if pure helpers are extracted

Implementation steps:

1. Add move-up and move-down controls to `ChoiceCard`.
2. Wire controls through `ChoicesBlock` to reorder the full `choices` array.
3. Preserve each choice `id`, `label`, and `outcome` exactly while reordering.
4. Disable or hide move-up on the first choice and move-down on the last choice.
5. Confirm canvas fork rows update immediately from `effectiveChoices`.
6. Confirm saved overrides preserve reordered array form under `draft.story`.

Acceptance criteria:

- Authors can reorder all choices on built-in and draft beats.
- Choice ids do not change during reorder.
- Choice outcomes, including `queueBeat`, remain attached to the same choice.
- Reordered choices appear in the same order in inspector, canvas fork card, preview, and saved draft.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-editor-model.test.js`
- `npm run build`

Risk level: Low. Scoped UI change using existing array-form choice overrides.

Dependencies: None.

Implement now or deferred: Implement now.

## Milestone 3 - Draft Beat ID Rename

Goal: Allow renaming an author-created draft beat id and re-point all draft `queueBeat` references to the new id.

Exact files likely to change:

- `src/storyEditor/index.jsx`
- `src/storyEditor/Inspector.jsx`
- `src/storyEditor/shared.jsx`
- `src/__tests__/story-editor-model.test.js`

Implementation steps:

1. Add a draft-only id edit control in the inspector header or a dedicated metadata section.
2. Validate id format against the existing draft id conventions, likely lowercase letters, numbers, and underscores.
3. Reject blank ids and ids already present in `allBeatIds(draft)`.
4. In one draft update, change `story.newBeats[index].id`.
5. Re-point every effective array-form choice whose `outcome.queueBeat` equals the old id. Cover both `story.beats` and `story.newBeats`.
6. Move local layout position from `nodePositions[oldId]` to `nodePositions[newId]`.
7. Move selected id, collapsed state, and preview state from old id to new id where applicable.
8. Add unit coverage for graph references after rename.

Acceptance criteria:

- Draft beat ids can be renamed without losing title, lines, choices, trigger, repeat, or onComplete.
- All authored `queueBeat` references are updated from old id to new id.
- Canvas edges still point at the renamed beat.
- Layout position follows the renamed beat.
- Built-in beat ids cannot be renamed.
- Duplicate or invalid ids are blocked with an inline warning.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-editor-model.test.js`
- `npm run build`

Risk level: Medium. References, layout, selection, and saved draft identity all have to move together.

Dependencies: None, but easier after Milestone 2 because choice-array editing will already be fresh.

Implement now or deferred: Implement now.

## Milestone 4 - Flag Creation and Metadata Editing

Goal: Expose `flags.new` and `flags.byId.<id>` editing in the Flags tab so designers can create flags and edit label, description, category, default, and triggers without hand-editing code or JSON.

Exact files likely to change:

- `src/balanceManager/tabs/FlagsTab.jsx`
- `src/balanceManager/shared.jsx` if new shared small controls are needed
- `src/config/applyOverrides.js` only if sanitizer gaps are found
- `src/__tests__/flags.test.js`
- `src/__tests__/bm-config-overrides.test.js` if existing override coverage lives there

Implementation steps:

1. Add a "+ New flag" action to `FlagsTab`.
2. Create a draft override entry under `draft.flags.new`.
3. Validate new flag ids against non-empty, unique, lowercase-style ids.
4. Add editable fields for registered and override-created flag metadata: label, description, category, and default.
5. For built-in flags, write metadata patches to `draft.flags.byId.<id>`.
6. For override-created flags, update the matching `draft.flags.new[]` entry.
7. Keep existing trigger editing intact and point it to the same override entry as metadata.
8. Update tests for `applyFlagOverrides` if any new sanitizer behavior is required.

Acceptance criteria:

- Designers can create a new flag from the UI.
- New flags appear in the table without refreshing.
- Metadata edits persist to the balance draft in the schema already supported by `applyFlagOverrides`.
- Built-in flag source/id remain immutable.
- Duplicate flag ids are blocked.
- Trigger editing continues to work for both built-in and newly created flags.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/flags.test.js src/__tests__/bm-config-overrides.test.js`
- `npm run build`

Risk level: Medium. The UI must distinguish registry flags, override-created flags, and ad-hoc references cleanly.

Dependencies: None.

Implement now or deferred: Implement now.

## Milestone 5 - Preview and State Simulation Improvements

Goal: Make branch preview more faithful to runtime state, or provide a strong bridge from the editor preview into the Simulate tab.

Exact files likely to change:

- `src/storyEditor/PreviewModal.jsx`
- `src/storyEditor/index.jsx`
- `src/balanceManager/tabs/SimulateTab.jsx`
- `src/balanceManager/tabs/StoryTab.jsx` if cross-link copy is updated
- `src/story.js` only if a pure shared simulation helper is extracted
- `src/__tests__/story-dialogue.test.js`
- `src/__tests__/story-engine-coverage.test.js`

Implementation steps:

1. Decide first pass scope: cross-link to Simulate, inline state-tracking preview, or both.
2. Prefer extracting reusable pure simulation helpers from `SimulateTab` rather than duplicating preview state logic.
3. Apply choice outcomes in preview state, including flags, bonds, currencies, and queued beats.
4. After a choice sets or clears flags, evaluate whether downstream `flag_set` or guarded beats should become visible in the preview path.
5. Surface current simulated flags/resources/bonds in compact debug badges only where useful.
6. Add an "Open in Simulate" affordance from preview or inspector if full simulation remains in Balance Manager.

Acceptance criteria:

- Preview no longer only follows literal `queueBeat` chains when state changes should affect the next dialog.
- Choice outcomes visibly affect preview state.
- Missing target warnings remain visible.
- Simulate tab and preview do not diverge in outcome application semantics.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-dialogue.test.js src/__tests__/story-engine-coverage.test.js src/__tests__/story-triggers.test.js src/__tests__/flags.test.js`
- `npm run build`
- `npm run test:e2e` if browser flow is covered

Risk level: High. Stateful preview can drift from runtime if helper logic is duplicated.

Dependencies: Milestone 4 helps because flag metadata/creation will be clearer.

Implement now or deferred: Implement now after Milestones 1-4.

## Milestone 6 - Validation Warnings

Goal: Add inline and canvas warnings for typo-prone references, especially unregistered flags and missing beat targets.

Exact files likely to change:

- `src/storyEditor/Inspector.jsx`
- `src/storyEditor/index.jsx`
- `src/storyEditor/shared.jsx`
- `src/balanceManager/tabs/FlagsTab.jsx` if shared flag validation is reused there
- `src/flags.js` only if lookup helpers need expansion
- `src/__tests__/story-editor-model.test.js`
- `src/__tests__/flags.test.js`

Implementation steps:

1. Add pure validation helpers for a draft: unknown `queueBeat`, unknown `setFlag`/`clearFlag`, unknown `trigger.flag`, and unreached draft beat.
2. Use `STORY_FLAGS` and local override-created flags to compute known flag ids.
3. Show warnings beside flag editors in `FlagTags` and trigger fields.
4. Show warning badges on canvas cards with missing outgoing targets.
5. Keep the existing preview missing-target warning.
6. Add tests for validation helper output.

Acceptance criteria:

- A choice pointing to a missing beat warns in inspector and on the canvas.
- `flag_set`, `setFlag`, and `clearFlag` typos warn when the flag is not registered or newly created.
- Warnings do not block saving unless a later product decision says they should.
- `_fired_*` implicit flags are not falsely treated as authoring errors.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-editor-model.test.js src/__tests__/flags.test.js`
- `npm run build`

Risk level: Medium. False positives would make the editor noisy.

Dependencies: Best after Milestone 4, so newly created flags are included in known ids.

Implement now or deferred: Implement now after flag editing.

## Milestone 7 - Unsaved Changes Fix

Goal: Fix the perpetual "Unsaved changes" badge in `/story/` by comparing normalized story data rather than full cloned draft object identity/shape.

Exact files likely to change:

- `src/storyEditor/index.jsx`
- `src/storyEditor/shared.jsx` if normalized comparison helper is extracted
- `src/__tests__/story-editor-model.test.js`

Implementation steps:

1. Confirm current baseline: `cloneDraft(BALANCE_OVERRIDES)` creates a full known-section shape, so full JSON compare differs from source.
2. Create a normalized comparison for only the `story` slice, or normalized full draft sections if broader dirty tracking is desired.
3. Use that comparison for `isDirty`.
4. Ensure an empty story draft and absent story draft compare as clean.
5. Add unit tests for clean, story-edited, and non-story-section differences as appropriate.

Acceptance criteria:

- Fresh `/story/` load does not show "Unsaved changes" when no story edits exist.
- Editing story content shows "Unsaved changes".
- Saving clears or suppresses dirty state consistently with the persisted draft.
- Non-story Balance Manager differences do not falsely dirty the story editor if story-only comparison is chosen.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-editor-model.test.js`
- `npm run build`

Risk level: Low to Medium. Dirty-state semantics must match user expectations across shared balance draft storage.

Dependencies: None.

Implement now or deferred: Implement now. It is a small quality fix.

## Milestone 8 - Body vs Lines Cleanup

Goal: Collapse beat dialogue editing to one clear authoring surface so `body` is not silently ignored when `lines` exists.

Exact files likely to change:

- `src/storyEditor/Inspector.jsx`
- `src/storyEditor/PreviewModal.jsx`
- `src/storyEditor/shared.jsx`
- `src/config/applyOverrides.js` if migration/sanitization changes are needed
- `src/story.js` only if canonical runtime helpers should be reused in preview/editor
- `src/__tests__/story-editor-model.test.js`
- `src/__tests__/story-dialogue.test.js`

Implementation steps:

1. Decide canonical editor representation. Recommended: expose `lines` only, with a one-click or automatic conversion from existing `body`.
2. In inspector, remove or hide the separate body textarea when lines are present.
3. For beats with only `body`, display equivalent narrator or parsed speaker lines in the line editor.
4. On edit, write `lines` and clear `body` for that beat override to avoid conflicting fields.
5. Confirm preview and canvas still fall back to `body` for untouched built-ins.
6. Add tests for round-tripping body-only and lines-based beats.

Acceptance criteria:

- Authors cannot create a confusing override where both body and lines compete.
- Existing body-only built-in beats remain visible and editable.
- Edited body-only beats save as a clear single representation.
- Runtime dialogue rendering remains unchanged.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-editor-model.test.js src/__tests__/story-dialogue.test.js`
- `npm run build`

Risk level: Medium. Migration behavior can unintentionally change existing built-in dialogue overrides.

Dependencies: None, but easier after preview/state work if dialogue rendering helpers are touched there.

Implement now or deferred: Deferred until after validation warnings and dirty-state fix.

## Milestone 9 - Reusable Modal Preview

Goal: Refactor the in-game story modal into a prop-driven component reused by the `/story/` preview, so preview and live game visuals do not drift.

Exact files likely to change:

- `src/ui/Modals.jsx`
- `src/storyEditor/PreviewModal.jsx`
- `src/storyEditor/index.jsx`
- Potential new file: `src/ui/StoryDialog.jsx` or `src/ui/StoryModalView.jsx`
- `src/__tests__/story-dialogue.test.js` if pure render-data helpers are extracted

Implementation steps:

1. Inspect the current in-game story modal markup in `src/ui/Modals.jsx`.
2. Extract presentational modal content into a prop-driven component that accepts beat title, scene, lines, prompt, choices, badges, and callbacks.
3. Keep runtime dispatch behavior in `Modals.jsx`.
4. Make `PreviewModal.jsx` provide preview callbacks and simulated state while reusing the same presentational component.
5. Preserve accessibility attributes on the in-game modal, including dialog role and title id.
6. Verify visual parity manually or with Playwright screenshots if e2e is expanded.

Acceptance criteria:

- Runtime story modal behavior is unchanged.
- `/story/` preview uses the same visual component as the live game.
- The preview still supports breadcrumbs, restart/back, and open-in-editor chrome around the shared modal where needed.
- No duplicate story-modal styling remains except editor-only shell controls.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-dialogue.test.js`
- `npm run build`
- `npm run test:e2e`

Risk level: High. Shared UI refactors can regress live modal behavior.

Dependencies: Better after Milestone 5, because preview data flow should be settled first.

Implement now or deferred: Deferred.

## Milestone 10 - Canvas QoL

Goal: Improve navigation and layout work in the story canvas with fit-to-screen, better auto-placement, minimap, and keyboard navigation.

Exact files likely to change:

- `src/storyEditor/index.jsx`
- `src/storyEditor/shared.jsx`
- `src/__tests__/story-editor-model.test.js` if placement helpers are extracted
- A future Playwright spec under `tests/e2e/` if keyboard/navigation coverage is added

Implementation steps:

1. Add fit-to-screen based on graph bounds and visible container size.
2. Add smarter new-branch placement near the source choice when `createDraftBeat({ queuedBy })` is used.
3. Add keyboard navigation between selected nodes, likely following graph edges and sidebar order.
4. Consider minimap only after fit and placement are complete.
5. Keep layout reset and existing node position overrides intact.

Acceptance criteria:

- Fit-to-screen centers visible graph without changing persisted node positions.
- New branch beats appear near their source choice instead of only in the drafts lane when enough context exists.
- Keyboard navigation selects nearby/logical nodes and keeps inspector in sync.
- Existing pan, zoom, drag, collapse, and reset layout continue to work.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-editor-model.test.js`
- `npm run build`
- `npm run test:e2e` if browser coverage is added

Risk level: Medium. Canvas transforms and persisted positions are easy to make subtly inconsistent.

Dependencies: Milestone 1 should land first because it changes input handling.

Implement now or deferred: Deferred.

## Milestone 11 - Repeat Cooldowns

Goal: Add an optional cooldown to repeating story or flag triggers, such as "at most once per N turns/events/settles".

Exact files likely to change:

- `src/story.js`
- `src/flags.js`
- `src/state.js`
- `src/config/applyOverrides.js`
- `src/storyEditor/Inspector.jsx`
- `src/balanceManager/tabs/FlagsTab.jsx`
- `src/__tests__/story-triggers.test.js`
- `src/__tests__/side-beats.test.js`
- `src/__tests__/flags.test.js`

Implementation steps:

1. Define semantics precisely: cooldown measured in turns, events, sessions, or settle moments.
2. Extend trigger or beat schema with a sanitized cooldown field.
3. Persist last-fired metadata in story state, separate from boolean flags.
4. Update story beat evaluator to honor cooldown for `repeat` beats.
5. Decide whether flag triggers need cooldowns too or only beat triggers.
6. Add editor controls for cooldown only when repeat is enabled.
7. Add tests for one-shot, repeat-without-cooldown, and repeat-with-cooldown.

Acceptance criteria:

- Existing one-shot beats are unchanged.
- Existing `repeat: true` behavior remains unchanged unless cooldown is set.
- A cooldown prevents re-fire until the configured interval passes.
- Persisted save state handles cooldown metadata safely.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/story-triggers.test.js src/__tests__/side-beats.test.js src/__tests__/flags.test.js`
- `npm run test`
- `npm run build`

Risk level: High. This changes engine semantics and persisted state.

Dependencies: Requires product decision on cooldown units.

Implement now or deferred: Deferred.

## Milestone 12 - Flag Cross-Reference

Goal: Show inverse references in the Flags tab, especially "beats this flag triggers".

Exact files likely to change:

- `src/balanceManager/tabs/FlagsTab.jsx`
- `src/storyEditor/shared.jsx` only if shared flag/beat scanning helpers are extracted
- `src/__tests__/flags.test.js` or a new pure helper test if extraction occurs

Implementation steps:

1. Extend flag collection to scan `STORY_BEATS`, `SIDE_BEATS`, and draft beats for beat triggers that read each flag.
2. Include `trigger.type === "flag_set"` and `trigger.type === "flag_cleared"`.
3. Show cross-reference entries in the flag inspector.
4. Optionally add links that open `/story/` with the beat selected if routing support is added later.
5. Consider replacing or reducing the hand-maintained `FLAG_READS` map over time.

Acceptance criteria:

- For a selected flag, the Flags tab lists beats whose triggers depend on that flag.
- Draft beats are included when present in the balance draft.
- Unknown/ad-hoc flags still display useful references.
- No existing set-by/read-by information is lost.

Validation commands:

- `npm run lint`
- `npx vitest run src/__tests__/flags.test.js`
- `npm run build`

Risk level: Low to Medium. Mostly a read-only analysis/UI improvement.

Dependencies: Milestone 4 is helpful but not required.

Implement now or deferred: Deferred.

## Milestone 13 - Smoke / E2E Test

Goal: Add browser coverage for the main authoring seam: author a dialog, save, reload game, and confirm it fires.

Exact files likely to change:

- New file under `tests/e2e/`, likely `tests/e2e/story-editor.spec.js` or `tests/e2e/dialog-authoring.spec.js`
- `tests/e2e/helpers.js` if helper utilities are needed for localStorage draft setup or story modal assertions
- `playwright.config.js` only if a second project or route setup is needed
- Possibly `src/storyEditor/index.jsx` if stable selectors are added
- Possibly `src/ui/Modals.jsx` if stable selectors are added

Implementation steps:

1. Add stable `data-testid` selectors only where role/text selectors are too brittle.
2. Drive `/story/` in Playwright: create a draft beat, add a trigger or branch, save.
3. Reload the game route and seed state/event conditions so the authored dialog fires.
4. Assert story modal title/body/choice appears.
5. Keep the test narrow to avoid a slow full authoring suite.
6. Document whether it should join CI or remain optional. Current CI does not run `npm run test:e2e`.

Acceptance criteria:

- E2E test proves saved story draft is consumed by the game runtime.
- Test is deterministic and does not depend on prior localStorage.
- Test runs with the existing Playwright config and Vite webServer.
- Added selectors, if any, are semantic and low-noise.

Validation commands:

- `npm run test:e2e:install` in fresh environments
- `npx playwright test tests/e2e/story-editor.spec.js`
- `npm run test:e2e`
- `npm run lint`
- `npm run build`

Risk level: Medium. Browser authoring tests can be flaky unless selectors and state setup are deliberate.

Dependencies: Best after Milestones 1-7, when the critical editor behaviors and warnings have settled.

Implement now or deferred: Deferred until after the highest-value editor fixes are implemented.

## Suggested Sequence

1. Milestone 1 - Touch-drag cards.
2. Milestone 2 - Choice reorder.
3. Milestone 3 - Draft beat id rename.
4. Milestone 4 - Flag creation and metadata editing.
5. Milestone 5 - Preview/state simulation improvements.
6. Milestone 6 - Validation warnings.
7. Milestone 7 - Unsaved changes fix.
8. Milestone 8 - Body vs lines cleanup.
9. Milestone 9 - Reusable modal preview.
10. Milestone 10 - Canvas QoL.
11. Milestone 11 - Repeat cooldowns.
12. Milestone 12 - Flag cross-reference.
13. Milestone 13 - Smoke/e2e test.

