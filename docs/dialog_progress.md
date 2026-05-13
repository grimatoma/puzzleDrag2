# Dialogue / Story Editor Progress

Status date: 2026-05-12.

## Overall Status

Implementation pass substantially complete for the feasible non-deferred items in `docs/dialog_todo.md`.

Completed:

- Touch-drag story cards.
- Choice reorder controls.
- Safe draft beat id rename with `queueBeat` rewrite.
- Flags tab new-flag creation.
- Flags tab metadata editing for label, description, category, and default.
- Flags tab cross-reference for beats triggered by a flag.
- Story editor validation warnings for missing `queueBeat` targets and unregistered flags.
- Canvas warning badges.
- Stateful preview improvements for flags, bond deltas, currencies, direct `queueBeat`, and simple flag/bond-triggered downstream beats.
- Perpetual `/story/` unsaved badge fix using normalized story-slice comparison.
- Body-vs-lines cleanup by collapsing authoring to the Lines editor and converting legacy body text on edit.
- Canvas fit-to-screen.
- Near-source auto-placement for newly created branch beats.
- Focused unit tests for pure story-editor helpers and flag override metadata support.

Partially completed:

- Canvas QoL: fit-to-screen and smarter new branch placement are done; minimap and keyboard navigation remain deferred.
- `FLAG_READS` drift: story trigger cross-references are derived now; non-story code reads still use the curated map.
- Smoke/e2e: added closest practical unit seam tests, but not a browser e2e test because the local environment cannot run Node-based tooling.

Deferred:

- Reusable in-game modal preview component: deferred because it touches live modal behavior and is higher-risk than the completed functional preview improvements.
- Repeat cooldowns: deferred pending a product/schema decision on whether cooldowns are measured in turns, events, sessions, or settle moments.
- Instant same-dispatch `flag_set` firing: still deliberately deferred because it requires flag-change event plumbing.
- Built-in side-beat disable/suppress remains unimplemented.
- Story editor live sync across multiple tabs remains unimplemented.

## Changed Files

Product code:

- `src/balanceManager/index.jsx`
- `src/balanceManager/tabs/FlagsTab.jsx`
- `src/storyEditor/Inspector.jsx`
- `src/storyEditor/PreviewModal.jsx`
- `src/storyEditor/index.jsx`
- `src/storyEditor/shared.jsx`

Tests:

- `src/__tests__/flags.test.js`
- `src/__tests__/story-editor-model.test.js`

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

Flags tab:

- `flags` was added to the Balance Manager and story editor draft clone schemas so flag overrides survive local draft edits.
- New flags are stored in `draft.flags.new`.
- Built-in flag metadata edits are stored in `draft.flags.byId.<id>`.
- Existing trigger editing is preserved and now works for override-created flags too.
- The tab now folds current draft flag metadata into its effective registry view.
- The inspector shows "beats this flag triggers" by scanning effective story beats.

Preview:

- Preview keeps a lightweight simulated state for flags, bonds, and supported currencies.
- Picking a choice applies beat `onComplete.setFlag` and choice outcomes.
- Direct `queueBeat` still wins.
- If there is no direct queue target, preview can continue into the first unvisited beat whose `flag_set`, `flag_cleared`, or `bond_at_least` trigger matches the simulated state.
- Limitation: this is not a full game-state simulation for inventory/resource gates or act-order main-chain progression.

## Blockers or Unclear Requirements

- `node`, `npm`, and `npx` are not available on PATH in this environment. Attempts to run Vitest via `npx` and via `./node_modules/.bin/vitest` failed because `node` is missing.
- No `typecheck` script exists in `package.json`.
- Repeat cooldowns need product semantics before implementation.
- Full modal reuse should be handled as a separate targeted refactor because live game modal regressions would be more costly than the current preview drift.
- True browser e2e was not practical without a runnable Node toolchain.

## Validation Commands Discovered

From `package.json`:

- `npm run dev`
- `npm run build`
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
- `git diff --check`

Results:

- Vitest via `npx`: failed because `npx` is not installed.
- Vitest via local binary: failed because `node` is not installed.
- `which node` and `which npm`: no executable found.
- `git diff --check`: passed.

Recommended validation once Node is available:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e` for the touch/canvas/preview flows

## Known Risks

- The preview is intentionally a lightweight state simulation, not a full runtime replay.
- Flags tab imports effective story editor helpers to scan draft-aware references; this keeps behavior consistent but broadens the dependency surface.
- Browser interaction changes could not be executed locally because the Node runtime is missing.

