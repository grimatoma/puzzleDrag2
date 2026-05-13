# Dialogue / Story Editor Progress

Status date: 2026-05-13.

## Overall Status

Implementation pass complete for the feasible non-deferred items in `docs/dialog_todo.md`.

Completed:

- Touch-drag story cards.
- Choice reorder controls.
- Safe draft beat id rename with `queueBeat` rewrite.
- Flags tab new-flag creation.
- Flags tab metadata editing for label, description, category, and default.
- Flags tab cross-reference for beats triggered by a flag.
- `FLAG_READS` drift guard for direct non-editor story flag reads.
- Story editor validation warnings for missing `queueBeat` targets and unregistered flags.
- Canvas warning badges.
- Stateful preview improvements for flags, bond deltas, currencies, direct `queueBeat`, and simple flag/bond-triggered downstream beats.
- Preview legacy `body` rendering now uses the runtime `beatLines` helper, matching speaker-prefix cleanup from the live story modal.
- The live game story stage panel is exported from `src/ui/Modals.jsx` and reused by `/story/` preview for the shared modal title/body/speaker/footer shell.
- Optional repeat cooldowns for repeat side/story beats, measured in story-evaluation events after firing.
- Same-dispatch `flag_set` reactions: flag triggers cascade immediately, then flag-conditioned beats get a filtered follow-up pass.
- Perpetual `/story/` unsaved badge fix using normalized story-slice comparison.
- Body-vs-lines cleanup by collapsing authoring to the Lines editor and converting legacy body text on edit.
- Canvas fit-to-screen.
- Canvas minimap.
- Directional keyboard navigation between visible story cards.
- Near-source auto-placement for newly created branch beats.
- Built-in side-beat suppression and restoration from the story editor.
- `/story/` localStorage draft sync from other tabs when the editor has no local dirty changes.
- Focused unit tests for pure story-editor helpers and flag override metadata support.
- Browser smoke coverage for the saved balance-draft dialog to runtime story modal seam.

Partially completed:

- Smoke/e2e: added a Playwright seam test, but it could not be executed locally because the environment cannot run Node-based tooling.

Deferred:

- No remaining non-design TODOs from `docs/dialog_todo.md`.

## Changed Files

Product code:

- `src/balanceManager/index.jsx`
- `src/balanceManager/tabs/FlagsTab.jsx`
- `src/flagReads.js`
- `src/storyEditor/Inspector.jsx`
- `src/storyEditor/PreviewModal.jsx`
- `src/storyEditor/index.jsx`
- `src/storyEditor/shared.jsx`
- `src/ui/Modals.jsx`
- `src/config/applyOverrides.js`
- `src/flags.js`
- `src/features/story/slice.js`
- `src/state.js`
- `src/story.js`

Tests:

- `src/__tests__/bm-config-overrides.test.js`
- `src/__tests__/coverage-round-2.test.js`
- `src/__tests__/flag-reads-drift.test.js`
- `src/__tests__/flags.test.js`
- `src/__tests__/side-beats.test.js`
- `src/__tests__/story-editor-model.test.js`
- `tests/e2e/dialog-draft.spec.js`

Docs:

- `docs/dialog_todo.md`
- `docs/dialog_progress.md`
- `docs/dialog_execution_plan.md`

## Implementation Notes

Story editor:

- Card touch drag now uses node-level touch handling and skips canvas pan when a touch starts on a story node or interactive child.
- Canvas touch pan/pinch remains available from empty/background areas.
- Choice cards have up/down reorder buttons that preserve ids and outcomes.
- Draft beat ids can be renamed through a draft-only inspector field. The rename validates format and uniqueness, rewrites array-form `queueBeat` references, and carries selection/layout/collapse/preview state forward.
- Story warnings are computed with pure helpers and surfaced in the inspector plus as card badges.
- Dirty state compares normalized `draft.story` data against the saved baseline rather than the whole cloned draft shape.
- The separate Body field is removed from editor authoring. Existing body-only beats still display through the Lines editor and save as `lines` on edit.
- New branch beats created from a choice are placed near the source card/choice row instead of only in the drafts lane.
- The minimap shows visible cards, current viewport, and selected card, and click-pans the canvas.
- Arrow keys move selection toward the nearest visible node in that direction; Enter previews the selected beat.
- Built-in side beats can be suppressed; suppressing a fork records its built-in choice subtree so the graph does not leave orphan branch-resolution cards.
- A header restore action clears all suppressed built-in side beats.
- Clean editors listen for `hearth.balance.draft` storage events from other tabs and refresh their saved baseline; dirty editors ignore cross-tab sync to avoid clobbering local work.

Repeat cooldowns:

- `repeatCooldown` is sanitized through `applyStoryOverrides` for `newBeats` and `beats` patches.
- Repeat side beats with a cooldown skip matching triggers while `state.story.repeatCooldowns[beatId]` is positive.
- Cooldowns tick down on each story-evaluation event and are stored separately from completion flags.
- Repeat beats no longer receive permanent `_fired_` markers when they omit `onComplete.setFlag`.
- Limitation: cooldowns are currently beat-level only. Flag registry triggers do not have their own cooldown field.

Flag reactions:

- `applyFlagTriggersWithResult` now settles flag-trigger cascades to a fixed point within the same dispatch.
- `evaluateAndApplyStoryBeat` runs a narrowly filtered post-flag pass for `flag_set` / `flag_cleared` story and side beats after registered flags change.
- The post-flag pass deliberately skips unrelated event/resource triggers so discrete repeat beats cannot fire twice from one game event.

Smoke / e2e:

- Added `tests/e2e/dialog-draft.spec.js`.
- The test seeds `hearth.balance.draft` with an editor-authored side beat, reloads the game, dispatches a matching build event, and asserts the runtime story modal renders the draft title and line.
- This is the closest stable seam test without adding brittle full editor authoring selectors.

Flags tab:

- `flags` was added to the Balance Manager and story editor draft clone schemas so flag overrides survive local draft edits.
- New flags are stored in `draft.flags.new`.
- Built-in flag metadata edits are stored in `draft.flags.byId.<id>`.
- Existing trigger editing is preserved and now works for override-created flags too.
- The tab now folds current draft flag metadata into its effective registry view.
- The inspector shows "beats this flag triggers" by scanning effective story beats.
- Non-story code reads are centralized in `src/flagReads.js`.
- `src/__tests__/flag-reads-drift.test.js` scans direct source reads so CI can catch when the curated map falls behind.

Preview:

- Preview keeps a lightweight simulated state for flags, bonds, and supported currencies.
- Picking a choice applies beat `onComplete.setFlag` and choice outcomes.
- Dialogue lines are derived with the runtime `beatLines` helper, so legacy body-only beats get the same speaker-prefix cleanup as the live game modal.
- The preview reuses the exported `StoryStagePanel` from the live modal implementation while keeping editor-only chrome outside that shared component.
- Direct `queueBeat` still wins.
- If there is no direct queue target, preview can continue into the first unvisited beat whose `flag_set`, `flag_cleared`, or `bond_at_least` trigger matches the simulated state.
- Limitation: this is not a full game-state simulation for inventory/resource gates or act-order main-chain progression.

## Blockers or Unclear Requirements

- `node`, `npm`, and `npx` are not available on PATH in this environment. Attempts to run Vitest via `npx` and via `./node_modules/.bin/vitest` failed because `node` is missing.
- No `typecheck` script exists in `package.json`.
- True browser e2e was not practical without a runnable Node toolchain.

## Validation Commands Discovered

From `package.json`:

- `npm run dev`
- `npm run build`
- `npm run test:e2e`
- `npm run lint`
- `npm run test`
- `npm run test:watch`
- `npm run test:ui`
- `npm run test:coverage`
- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:install`

From CI:

- `npm run lint`
- `npm run test:coverage`
- `npm run build`

From Vitest config:

- Unit tests include `tests/**/*.test.js` and `src/**/*.test.js`.
- E2E tests under `tests/e2e/**` are excluded from Vitest.
- Test environment is `node`.

From Playwright config:

- Test directory is `tests/e2e`.
- Browser project is Chromium using iPhone 13 landscape settings.
- Base URL is `http://localhost:5173/puzzleDrag2/`.
- Vite web server is started with `node ./node_modules/vite/bin/vite.js`.

## Validation Run

Attempted:

- `npx vitest run src/__tests__/story-editor-model.test.js`
- `npx vitest run src/__tests__/flags.test.js src/__tests__/story-triggers.test.js src/__tests__/story-dialogue.test.js src/__tests__/story-engine-coverage.test.js`
- `./node_modules/.bin/vitest run src/__tests__/story-editor-model.test.js`
- `./node_modules/.bin/vitest run src/__tests__/flags.test.js src/__tests__/story-triggers.test.js src/__tests__/story-dialogue.test.js src/__tests__/story-engine-coverage.test.js`
- `npm run lint`
- `npm run test`
- `npm run build`
- `git diff --check`

Results:

- Vitest via `npx`: failed because `npx` is not installed.
- Vitest via local binary: failed because `node` is not installed.
- `npm run lint`: failed because `npm` is not installed.
- `npm run test`: failed because `npm` is not installed.
- `npm run build`: failed because `npm` is not installed.
- `npm run test:e2e`: not runnable because `npm` is not installed.
- `which node` and `which npm`: no executable found.
- `git diff --check`: passed after the final minimap, keyboard navigation, flag-reaction, drift-guard, and e2e seam-test edits.

Recommended validation once Node is available:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e` for the touch/canvas/preview flows

## Known Risks

- The preview is intentionally a lightweight state simulation, not a full runtime replay.
- Flags tab imports effective story editor helpers to scan draft-aware references; this keeps behavior consistent but broadens the dependency surface.
- Browser interaction changes could not be executed locally because the Node runtime is missing.
