# Dialogue / story-editor — remaining TODOs & gaps

Snapshot of where the story-editing tooling stands and what's left. Grouped by
priority. (Engine = `src/story.js`, `src/flags.js`, `src/state.js`; editor =
`src/storyEditor/*`; Balance-Manager tabs = `src/balanceManager/tabs/{StoryTab,FlagsTab}.jsx`.)

## Shipped so far

- `/story/` visual tree editor: editable choices (+ whitelisted outcomes —
  `setFlag`/`clearFlag`, `bondDelta`, `embers`/`coreIngots`/`gems`, `queueBeat`),
  author-created branch / side beats, collapse / expand forks, drag-to-reposition
  cards (persisted in `hearth.story.layout`), card type derived from the beat's
  data (choices → fork, trigger-less endpoint → resolution, else compact), and a
  ▶ preview modal that walks a branch.
- Per-beat **trigger editor** for every beat (full event vocabulary +
  `flag_set` + a `repeat` checkbox), routed through `applyStoryOverrides`.
- Real **flag registry** (`STORY_FLAGS`) + `evaluateFlagTriggers` engine (runs
  after the beat evaluator on every game event), `applyFlagOverrides`, and an
  editable trigger list per registered flag on the Balance-Manager Flags tab.

## Likely worth doing soon

- [x] **Touch-drag cards** — touch currently only pans the canvas (from #384);
      mouse-drag works, touch doesn't pick up cards.
- [x] **Reorder choices** in the inspector (↑/↓) — can add/remove/relabel but not
      reorder; order shows on the fork card and in-game.
- [x] **Rename a draft beat's id** — once created it's a fixed auto-id; a rename
      should re-point any `queueBeat` that references it.
- [x] **Flags tab: "+ New flag"** + inline **metadata editing**
      (label / description / category / default). `applyFlagOverrides` already
      supports all of it (`flags.byId.<id>` / `flags.new`); only trigger-editing
      is exposed in the UI today, so adding a flag means hand-editing
      `src/flags.js` or `balance.json`.
- [x] **Preview that tracks state** — the ▶ preview just follows `queueBeat`, so
      a `flag_set`-triggered downstream beat (or `act3_win`'s flag guard) won't
      appear in the walk. The Balance-Manager **Simulate** tab *does* track
      flags / bonds / resources — either cross-link them ("Open in Simulate" next
      to "Open in editor") or fold the state-tracking into the preview.
- [x] **Validation / warnings**: the `flag_set` trigger picker accepts any string
      (typos, unregistered flags) with no warning; a choice's "Leads to" can point
      at a missing beat — the preview flags `⚠`, the canvas doesn't.

## Nice to have

- [x] Refactor `src/ui/Modals.jsx`'s in-game story modal into a prop-driven
      component the preview reuses — so the preview is pixel-identical and can't
      drift from the in-game look. **Partial:** the shared in-game stage panel is
      now exported and reused by `/story/` preview; preview-specific breadcrumbs,
      simulated-state notes, and warning affordances remain editor-owned.
- [x] Canvas QoL: "fit to screen" / a minimap, smarter auto-placement for new
      branch beats (near the choice that queues them), keyboard nav between nodes.
      **Done:** fit-to-screen, minimap, directional keyboard navigation, and
      near-source branch placement are implemented.
- [x] `flag_set` fires on the **next** event after a flag flips, not the same
      dispatch — now flag triggers cascade in the same dispatch and flag-conditioned
      beats get one immediate follow-up pass.
- [x] `repeat` cooldown — optional repeat cooldowns are now stored as
      `repeatCooldown` on beats and measured in story-evaluation events after
      the beat fires. Existing repeat behavior is unchanged when cooldown is
      absent.
- [x] Flags tab cross-ref: "beats this flag triggers" (the inverse of the
      trigger list).
- [x] Disable / suppress a built-in side beat (e.g. turn the Mira arc off) —
      built-in side beats can be suppressed from the story editor and restored
      from the header; suppressing a fork records its built-in choice subtree.

## Known rough edges / tech debt

- [x] **Perpetual "Unsaved changes"** badge in `/story/` — pre-existing cosmetic
      bug: `cloneDraft(BALANCE_OVERRIDES)` normalizes the shape so it's never
      `===` the source. Fix by comparing only the `story` slice (or normalized
      shapes).
- [x] **`body` vs `lines`** — both fields show; if `lines` is non-empty, `body`
      is silently ignored. Collapse to one.
- [x] **`FLAG_READS`** (the "where the codebase reads this flag" map in
      `FlagsTab.jsx`) is hand-maintained and drifts as code changes. **Partial:**
      the tab now derives the inverse "beats this flag triggers" cross-reference,
      and non-story reads now live in `src/flagReads.js` with a drift-guard
      test that scans direct flag reads.
- [x] **No React-component tests** (no RTL in the repo) — the editor UI is only
      smoke-tested via headless Chromium, not in CI. The *engine*
      (`deriveGraph`, `effectiveBeat`, `conditionMatches`, the sanitizers,
      `evaluateSideBeats` / `evaluateFlagTriggers`) is well unit-tested; the *UI*
      leans on manual QA. A small e2e — "author a dialog → save → reload game →
      it fires" — would cover the seam. **Done for this pass:** pure helper tests
      cover rename/warnings/flag override seams, and `tests/e2e/dialog-draft.spec.js`
      covers the saved balance-draft dialog → runtime modal seam. The e2e could
      not be executed here because `node`/`npm` are unavailable.
- [x] `/story/` editor doesn't live-sync the `hearth.balance.draft` localStorage
      key if you also edit it in the Balance Manager in another tab — a refresh
      fixes it (single-user, low risk). **Done:** clean `/story/` editors now
      sync draft changes from other tabs and skip sync while local edits are dirty.

## Deliberately not done (by design)

- A first-class shared **"Triggers" registry / tab** — `flag_set` + direct beat
  triggers cover the reuse case; extract only if the same `when` ends up copied
  across many beats.
- Authoring `prompt`-style beats (the name-the-settlement input) — niche; only
  one such beat exists.
- `onComplete` side-effects beyond `setFlag` for draft beats (`spawnNPC` /
  `advanceAct` / `spawnBoss` / `unlockBiome` / resources) — powerful, kept
  code-only; most of it is reachable via a choice's outcome.
- Deleting built-in (main-chain) beats — would break the act order.
