# Story Tree Editor Write-Back Loop

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

The `/story/` **Story Tree Editor** is the most substantial authoring tool in the repo (~15 files: canvas graph, inspector, validation, paths, playthrough, find-replace, markdown export). Today it is a **write-only dead end**: you can edit a beat, the editor saves a draft to `localStorage["hearth.balance.draft"]`, but **nothing in the running game ever reads that draft for story content**. The function every comment and the schema doc-string names as the consumer — `applyStoryOverrides` — **does not exist anywhere in `src/`**. So editing a beat in `/story/` changes literally nothing in the game.

This brief closes that loop. We make authored story edits actually reach the in-game `StoryModal` (`src/ui/Modals.tsx`), turning the editor from a diagramming toy into a real content pipeline. That makes the thin campaign (15 main beats + 8 side beats) cheap to expand without hand-editing `src/story.ts` and rebuilding mental models of the act ladder each time.

## Background & current state (VERIFIED)

I opened every key file. Several claims in the seed brief are **wrong** and are corrected here.

### The dead reference (CONFIRMED)
`applyStoryOverrides` is referenced in exactly four places, all prose — **no implementation, no call site**:
- `src/storyEditor/index.tsx:4` — header comment: "they flow through `applyStoryOverrides` on the game's next load".
- `src/storyEditor/shared.tsx:530` — `effectiveBeat` JSDoc: "Mirrors what `applyStoryOverrides` would produce".
- `src/storyEditor/ValidationPanel.tsx:141` — UI text: "`applyStoryOverrides` on the next game load."
- `src/config/schemas/story.ts:3` — schema doc: "full beat shape validated by applyStoryOverrides."

`grep applyStoryOverrides src/` returns only those. It is vaporware.

### The override pipeline is inert (CONFIRMED)
`src/config/balance/load.ts` is explicit (lines 4-10): `balance.json` was deleted, the canonical constants ARE the balance, and "the panel is read-only today, so in practice nothing overrides the constants." `loadBalanceOverrides()` (load.ts:59) merges `balanceFile` (an empty `{}`) with `readBalanceDraft()` and runs it through `parseBalanceOverrides`. The result is exported once as `BALANCE_OVERRIDES` in `src/constants.ts:1200`. **Crucially, nothing consumes `BALANCE_OVERRIDES.story`** — the story system (`src/story.ts`) imports nothing from the balance/draft layer. `storyOverridesSchema` (`src/config/schemas/story.ts`) exists and is presumably wired into `parseBalanceOverrides`, so a `draft.story` survives parsing — but then dies unread.

### How the draft is shaped (CONFIRMED)
The editor (`src/storyEditor/index.tsx:738`) seeds its working state from `cloneDraft(BALANCE_OVERRIDES)` and on save calls `writeBalanceDraft(draft)` (index.tsx:801-806) → `localStorage["hearth.balance.draft"]`. The story slice of the draft has this shape (validated by `storyOverridesSchema`, `src/config/schemas/story.ts`):
```
draft.story = {
  beats?:           { [beatId]: { title?, scene?, body?, lines?, choices?, trigger?, when?, onComplete?, repeat?, repeatCooldown? } },
  newBeats?:        Beat[],                 // author-created side/resolution beats
  suppressedBeats?: string[],               // built-in beats to hide/disable
  repeatCooldowns?: { [beatId]: number },
}
```
`beats[id]` is a **partial patch** over a built-in; `newBeats[]` are whole new beats; `suppressedBeats[]` removes built-ins.

### The merge logic ALREADY EXISTS — in the editor only (KEY FINDING)
`effectiveBeat(beatId, draft)` in `src/storyEditor/shared.tsx:532-568` is a near-complete reference implementation of the merge `applyStoryOverrides` must perform. It already:
- resolves an author-created beat from `draft.story.newBeats`,
- honours `draft.story.suppressedBeats` (returns `null`),
- layers `draft.story.beats[id]` field-by-field onto the built-in,
- runs every patch through the **shared sanitizers** in `src/config/storySanitizers.ts` (`sanitizeBeatLines`, `sanitizeChoiceArray`, `sanitizeChoiceOutcome`, `sanitizeBeatOnComplete`, `sanitizeBeatRepeatCooldown`, `sanitizeBeatTrigger`/`sanitizeTrigger`, and `sanitizeCond`).

The runtime `applyStoryOverrides` should reuse those same sanitizers so the editor canvas and the game agree byte-for-byte.

### The `when:` vs `trigger:` vocabulary (CORRECTED — seed brief understated this)
There are TWO firing vocabularies on a `Beat` (`src/story.ts:51-76`):
- **`trigger?: BeatTrigger`** — LEGACY. The type still exists but **no built-in beat ENTRY carries it** (story.ts:64-68); they all migrated to `when:`.
- **`when?: Cond`** — NATIVE. Evaluated at runtime by `evaluate(when, snapshot)` (story.ts:595, 641).

The Inspector's `TriggerEditor` (`src/storyEditor/Inspector.tsx:449-470`) lets the author edit the firing condition and **persists it as `when:`** (compiles a picked trigger → `Cond` via `beatTriggerToCond`, writes `{ when: <Cond>, trigger: undefined }`). **But `effectiveBeat` in shared.tsx only reads `ov.trigger` (shared.tsx:556) — it never reads `ov.when`.** So today even the editor's own canvas preview silently drops `when:` edits, and `storySanitizers.sanitizeCond` is defined but never called by `effectiveBeat`. **`applyStoryOverrides` MUST handle `when:` (via `sanitizeCond`) or re-authored firing conditions will be lost** — and the editor's `effectiveBeat` should be fixed to match (see plan step 7).

### How a beat reaches the StoryModal (CONFIRMED — the target)
1. A game event runs `evaluateAndApplyStoryBeat` (`src/state/storyEffects.ts:31`).
2. It calls `evaluateStoryTriggers(baseStory, event, totals)` (story.ts:581) which walks `nextPendingBeat` → iterates **`STORY_BEATS`** (story.ts:520) and returns the first beat whose `when:` matches.
3. Side beats: `evaluateSideBeats(next, event)` (story.ts:668) iterates **`SIDE_BEATS`** directly.
4. The fired beat object is dispatched as `STORY/BEAT_FIRED` → `src/features/story/slice.ts:74` queues the **literal beat object** into `state.story.queuedBeat` / `beatQueue`.
5. `StoryModal` (`src/ui/Modals.tsx:487-515`) renders `state.story.queuedBeat`, running its `lines` through `interpolateBeatText`.

**Therefore: the queued beat IS the object from `STORY_BEATS`/`SIDE_BEATS`.** To make an edited beat reach the modal, the override must reshape those two arrays *before* the evaluators read them. They are module-level `const` arrays consumed in ~8 spots (`STORY_BEATS`: story.ts:448, 507, 520; `SIDE_BEATS`: story.ts:449, 675; plus editor/chronicle/itemReferences importers).

### Beat counts (CORRECTED)
Seed brief says "16 main + 14 side (30 total)". **Actual: 15 main + 8 side = 23 total** (counted from `src/story.ts`):
- **STORY_BEATS (15):** `act1_arrival, act1_first_harvest, act1_light_hearth, act1_first_order, act1_build_granary, act1_keeper_trial, act2_bram_arrives, act2_first_hinge, act2_frostmaw, act2_liss_arrives, act3_mine_found, act3_mine_opened, act3_caravan, act3_festival, act3_win`
- **SIDE_BEATS (8):** `tutorial_beat_4, mira_letter_1, mira_letter_sent, mira_letter_kept, mira_letter_read, frostmaw_keeper, frostmaw_keeper_coexist, frostmaw_keeper_driveout`

The round-trip target is "all 23 beats survive override with no loss", not 30.

### SHIPPED vs DORMANT/DEAD summary
| Piece | Status |
|---|---|
| `/story/` editor, draft persistence, `effectiveBeat` preview merge | SHIPPED (works in-editor only) |
| `storyOverridesSchema`, `storySanitizers.ts` | SHIPPED (validators exist, unused at runtime) |
| `applyStoryOverrides` | **DEAD** (named everywhere, implemented nowhere) |
| Game reading `draft.story` for content | **DEAD** (the whole point of this brief) |
| `effectiveBeat` honouring `ov.when` | **MISSING** (editor reads only `ov.trigger`) |

## Scope

**In scope** (we recommend **Option A: runtime overrides** — see Implementation plan for the A-vs-B decision):
- Implement `applyStoryOverrides(builtinBeats, draftStory)` reusing `src/config/storySanitizers.ts`, producing overridden `STORY_BEATS` / `SIDE_BEATS` for the running game.
- Wire it so `src/story.ts`'s evaluators (`nextPendingBeat`, `evaluateStoryTriggers`, `evaluateSideBeats`, `findBeat`, `isBeatComplete`) read the **effective** beats, not the raw built-ins.
- Round-trip all 23 built-in beats through an empty override (must be a no-op) and through a non-empty override (must apply).
- Handle `beats[]` patches, `newBeats[]`, `suppressedBeats[]`, and BOTH `when:` and legacy `trigger:` vocabularies.
- Fix `effectiveBeat` (editor) to also read `ov.when` so editor preview and runtime agree.
- Tests proving an edited beat's new `lines`/`title`/`choices`/`when` reaches `StoryModal` (via the reducer, not the canvas).
- Update the four stale prose references (load.ts:8, ValidationPanel.tsx:141, schemas/story.ts:3, editor header) to describe the now-live path.

**Out of scope / non-goals:**
- **Option B (codegen to `src/story.ts`)** — evaluated and rejected as primary (see plan). Do not build it.
- No new editor UI, fields, or `when:` editor changes beyond the `effectiveBeat` read fix.
- No `SAVE_SCHEMA_VERSION` bump — overrides live in `hearth.balance.draft`, NOT in the gameplay save (`hearth.save`). The persisted gameplay shape is untouched (see Risks).
- No balance/economy overrides — story slice only.
- No Phaser/canvas work — story flows entirely through React reducer + DOM modal.
- No new persisted game state. `state.story.queuedBeat` already holds whatever beat object we feed it.

## Implementation plan

### Decision: Option A (runtime overrides) over Option B (codegen)
The seed brief asks to recommend one. **Recommend Option A.** Rationale specific to this repo:
- **The merge already exists** (`effectiveBeat` + `storySanitizers.ts`). Option A is ~80% reuse; Option B means writing a brand-new TS-emitter that round-trips `when: Cond` trees, `lines`, escaped strings, and act ordering into source — a large, fragile surface with no existing harness.
- **Iteration speed** — the editor already syncs live via the `storage` event (index.tsx:825-836); a runtime override means "save, reload game, see it" with zero build step.
- **Safety** — overrides are sandboxed in `localStorage`, never touch committed source, and every patch is sanitizer-whitelisted, so a malformed draft cannot corrupt the campaign.
- Option B's only real win (reviewable diffs) can be added LATER as an *export* button on top of A; the markdown exporter (`src/storyEditor/exportMarkdown.ts`) already proves the editor can serialize. Keep this brief tight: ship A.

### Steps (Option A)

1. **Create `src/state/applyStoryOverrides.ts`** (new, pure, node-testable — no DOM/Phaser). Export:
   ```ts
   import type { Beat } from "../story.js";
   import {
     sanitizeBeatLines, sanitizeChoiceArray, sanitizeBeatOnComplete,
     sanitizeBeatRepeatCooldown, sanitizeBeatTrigger,
   } from "../config/storySanitizers.js";
   import { sanitizeCond } from "../config/storySanitizers.js";

   export interface StoryOverrides {
     beats?: Record<string, Record<string, unknown>>;
     newBeats?: Beat[];
     suppressedBeats?: string[];
     repeatCooldowns?: Record<string, number>;
   }

   /** Apply a draft.story override onto one built-in beat. Mirror of editor effectiveBeat. */
   function applyBeatPatch(base: Beat, ov: Record<string, unknown>): Beat { /* … */ }

   /** Returns a NEW array: built-ins (patched, minus suppressed) followed by newBeats. */
   export function applyStoryOverrides(builtins: readonly Beat[], story: StoryOverrides | null | undefined): Beat[] { /* … */ }
   ```
   `applyBeatPatch` must port `effectiveBeat`'s logic (shared.tsx:538-566) field-for-field BUT additionally:
   - read `ov.when` → `sanitizeCond(ov.when)`; if present set `merged.when` and `delete merged.trigger`.
   - keep the legacy `ov.trigger` → `sanitizeBeatTrigger` path for draft round-trips.
   - apply `ov.scene === ""` → clears, etc. (same empty-string semantics the editor uses).
   The function must be **pure and total**: unknown fields ignored, never throws.

2. **Add the effective-beat accessor to `src/story.ts`.** The cleanest minimal-churn wiring: compute the effective arrays once at module load from `BALANCE_OVERRIDES.story`, replacing the direct `STORY_BEATS`/`SIDE_BEATS` reads inside the evaluators with module-local effective copies. Concretely:
   ```ts
   import { applyStoryOverrides } from "./state/applyStoryOverrides.js";
   import { BALANCE_OVERRIDES } from "./constants.js";   // already the merged draft

   const storyOv = (BALANCE_OVERRIDES as { story?: StoryOverrides }).story ?? null;
   const splitNew = (ov: StoryOverrides | null, predicate) => …;  // route newBeats by act? see note
   export const EFFECTIVE_STORY_BEATS = applyStoryOverrides(STORY_BEATS as Beat[], mainOv);
   export const EFFECTIVE_SIDE_BEATS  = applyStoryOverrides(SIDE_BEATS  as Beat[], sideOv);
   ```
   Then change the SIX internal consumers to read the effective arrays:
   - `findBeat` (story.ts:448-449)
   - `isBeatComplete` (story.ts:507)
   - `nextPendingBeat` (story.ts:520)
   - `evaluateStoryTriggers` (via `nextPendingBeat` — already covered)
   - `evaluateSideBeats` loop (story.ts:675)
   Keep `STORY_BEATS`/`SIDE_BEATS` exported unchanged (the editor, chronicle, itemReferences, and tests import the raw built-ins as the "source of truth to diff against") — only the **runtime evaluators** switch to the effective arrays.

   **`newBeats` routing note:** `newBeats[]` is a flat list in the draft. A new beat with `when:` belongs in the main chain only if it has an `act`; otherwise treat it as a side beat (matches the editor's lane model — drafts default to the side lane). Decide the split by `typeof beat.act === "number"` → main, else → side. Document this in the function header. (Most authored drafts are side/resolution beats, so the side bucket is the common case.)

3. **AVOID the circular import.** `src/constants.ts` exports `BALANCE_OVERRIDES`; `src/story.ts` would import from `constants.ts`. Verify there is no existing `constants → story` import cycle (`graphify path "src/story.ts" "src/constants.ts"`). If a cycle exists, instead inject overrides lazily: read `readBalanceDraft()` (load.ts) directly in story.ts at module load, or expose a `setStoryOverrides()` initializer called from `src/state.ts` boot. Prefer reading `BALANCE_OVERRIDES.story` if the import graph is clean — it is the already-validated value.

4. **SLICE-ACTION FOOTGUN — verify, do not assume.** This change adds NO new action type (we reshape the data the existing `STORY/BEAT_FIRED` path already carries), so `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` in `src/state.ts` need no edit. **Still run the `check-slice-action` skill** to confirm `STORY/BEAT_FIRED`, `STORY/PICK_CHOICE`, `STORY/DISMISS_MODAL` remain registered and routed to `src/features/story/slice.ts` — if a refactor accidentally drops one, edited beats would queue but never advance. (The slice handles these three; see slice.ts:1-3, 72-145.)

5. **Sanitizer parity for `when:`.** `sanitizeCond` (storySanitizers.ts:172) already validates a `Cond` tree against `isKnownFact` + known ops. Use it verbatim in `applyBeatPatch`. Do NOT invent a new validator.

6. **Author-created `newBeats` need a `when:` to ever fire as triggers.** A `newBeat` with no `when:` and no incoming `queueBeat` is unreachable (the editor already warns about this — "⚠ unreached", index.tsx ExpandedCard). `applyStoryOverrides` should pass `when:` through `sanitizeCond` for newBeats too. Resolution beats (queued by a choice's `queueBeat`) correctly carry no `when:` and are reached via `applyChoiceOutcome` → queue, which reads the beat by id through `findBeat`/the effective array — so they MUST be present in the effective array even with no condition.

7. **Fix the editor's `effectiveBeat` to read `ov.when`** (`src/storyEditor/shared.tsx:543-566`). Add, alongside the existing `ov.trigger` branch:
   ```ts
   if (Object.prototype.hasOwnProperty.call(ov, "when")) {
     const c = sanitizeCond(ov.when);
     if (c) { merged.when = c; delete merged.trigger; } else delete merged.when;
   }
   ```
   Import `sanitizeCond` (already exported from storySanitizers.ts; re-exported via shared.tsx). This makes the canvas preview match the runtime and stops silent loss of re-authored conditions.

8. **Update stale prose** (now-true): `src/config/balance/load.ts:4-10` (remove "nothing overrides the constants" for story), `src/storyEditor/ValidationPanel.tsx:141`, `src/config/schemas/story.ts:3`, `src/storyEditor/index.tsx:4-11`. Make them describe the live `applyStoryOverrides` path.

9. **Run `graphify update .`** after code changes (CLAUDE.md rule).

## Success criteria

- [ ] `src/state/applyStoryOverrides.ts` exists, is pure (imported in a node-env vitest with no DOM/Phaser), and exports `applyStoryOverrides`.
- [ ] `applyStoryOverrides(STORY_BEATS, null)` and `(STORY_BEATS, {})` return arrays **deep-equal to the input** (empty override = exact no-op) for all 15 main beats; same for all 8 side beats.
- [ ] A `beats[id]` patch on a built-in changes `title`/`scene`/`body`/`lines`/`choices`/`onComplete.setFlag`/`repeat`/`repeatCooldown` in the effective array; untouched fields (e.g. `act`, `when`) survive.
- [ ] A `beats[id].when` override changes the firing condition in the effective array (validated via `sanitizeCond`); an invalid `when` is dropped, not crashed on.
- [ ] A `suppressedBeats: ["mira_letter_1"]` removes that beat from the effective `SIDE_BEATS` (it no longer fires).
- [ ] A `newBeats: [{ id, when, lines, … }]` entry appears in the correct effective array and fires through `evaluateStoryTriggers`/`evaluateSideBeats`.
- [ ] **End-to-end (the headline):** with a draft loaded, dispatching the triggering event produces a `state.story.queuedBeat` whose `title`/`lines`/`choices`/`when`-derived firing reflects the override — proven through the real reducer, then surfaced by `StoryModal` (`src/ui/Modals.tsx`).
- [ ] Editor `effectiveBeat` now reads `ov.when`; `src/__tests__/story-editor-model.test.ts` gains a case proving a `when` override survives the canvas merge.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` all green; `npm run build` succeeds.
- [ ] No `SAVE_SCHEMA_VERSION` change; existing saves load unchanged.
- [ ] The four stale `applyStoryOverrides`-is-vaporware comments now describe a live path.

## Validation — how to verify

**Gating (must pass before PR):**
```bash
npm run lint
npm run typecheck
npm test            # vitest, node env, fake localStorage, NO canvas
npm run build
```

**New unit tests (add these):**
1. `src/__tests__/applyStoryOverrides.test.ts` (NEW):
   - `it("empty/null override is a deep no-op over STORY_BEATS and SIDE_BEATS")` — `expect(applyStoryOverrides(STORY_BEATS, {})).toEqual(STORY_BEATS)` (and `null`), for both arrays — proves the 23-beat round-trip with no loss.
   - `it("patches title/scene/body/lines/choices on a built-in")` — patch `act1_arrival`, assert merged fields + that `act:1` and original `when` survive.
   - `it("overrides when: via sanitizeCond and drops legacy trigger")`.
   - `it("rejects an invalid when: without throwing")` — pass `{ when: { fact: "not.a.real.fact" } }`, assert beat keeps original `when`/no `when`.
   - `it("suppressedBeats removes a built-in side beat")`.
   - `it("newBeats with act → main bucket, without act → side bucket")`.
2. `src/__tests__/story-writeback-e2e.test.ts` (NEW — the loop proof):
   - Build a `GameState` (reuse the stub pattern from `src/__tests__/story-slice.test.ts` / `story-triggers.test.ts`), seed `BALANCE_OVERRIDES.story` (or call the override path with a hand-built draft — see note), fire the event that triggers `act1_arrival`, run `evaluateAndApplyStoryBeat` (`src/state/storyEffects.ts`), and assert `state.story.queuedBeat.title === "<overridden title>"` and `.lines` reflect the override. This proves the previously-dead path now fires.
   - Because `BALANCE_OVERRIDES` is computed at module import, the e2e test should exercise `applyStoryOverrides` against the built-in arrays directly + assert the evaluator reads the effective array — OR, if step 3 used a `setStoryOverrides()` initializer, call it in the test. Prefer a design where the effective arrays are computed from an injectable override so the test does not depend on `localStorage` import-time state.
3. Extend `src/__tests__/story-editor-model.test.ts`: `it("layers a when override onto a built-in")` — `draftWith({ beats: { act1_first_harvest: { when: { fact: "resource.tile_grass_grass.total", op: "gte", value: 99 } } } })` → `effectiveBeat(...).when.value === 99`.

**Informational (not gating — cannot run reliably on this Windows host):**
- `npm run test:e2e` / `npm run test:visual` — story content is DOM, not canvas; visual goldens are NOT regenerable here (DOM drifts 3-5%) and e2e isn't in CI. Run only on a canonical host if you touch modal layout (we don't).

**Manual in-game check (this host):**
1. Spin a worktree Vite on a spare port: `node ../../../node_modules/vite/bin/vite.js` with base `/puzzleDrag2/` (the `:5173` server serves MAIN, not this worktree).
2. Open `/story/`, edit `act1_arrival`'s title to a sentinel ("WRITEBACK OK"), Cmd/Ctrl-S to save.
3. Reload the game tab at `/`. Drive the reducer via `window.__hearthVisual.dispatch` to fire `session_start` (or start a fresh run). Assert the modal text via DOM + `getComputedStyle` — `preview_screenshot` HANGS on this host, do NOT rely on it. Inspect `window.__hearthVisual.state().story.queuedBeat.title`.
4. Confirm the title is the sentinel. Clearing `localStorage["hearth.balance.draft"]` + reload reverts to the built-in.

## Double-check / adversarial review

**Prove the dead path now fires (the core "did I really wire it" check):**
- Before: `grep applyStoryOverrides src/` → only comments. After: it must return a real `export function` in `src/state/applyStoryOverrides.ts` AND an import in `src/story.ts`. If `src/story.ts` does not import it, the evaluators still read raw built-ins and the loop is still dead — the most likely silent failure.
- Add a deliberately failing assertion first (TDD): write `story-writeback-e2e.test.ts` asserting the overridden title BEFORE implementing; confirm it FAILS (proves the test actually exercises the path), then implement until green. This is the only way to be sure the previously-never-fired path now fires.

**Edge cases a skeptic will attack:**
- **Empty override must be a perfect no-op.** If `applyStoryOverrides(STORY_BEATS, {})` mutates ordering, drops `when`, or coerces `lines`, the live campaign breaks for every player even with no draft. The `.toEqual` round-trip test is the guard. Watch for: sanitizers that normalize a 1-element `setFlag` array to a string (storySanitizers.ts:29) — the no-op test must compare against the BUILT-IN shape; if any built-in stores `setFlag` as a 1-element array, the no-op would "change" it. Verify built-ins are already in normalized form, or only apply the sanitizer when an override key is present (the editor's `effectiveBeat` only sanitizes the `ov.*` patch, never the base — match that: **never run the base beat through a sanitizer**, only the patch).
- **Suppressing a beat that is a `queueBeat` target** (e.g. `mira_letter_sent`) would orphan a choice. Don't auto-fix; the editor's validation already warns. Just ensure suppression doesn't crash the evaluator.
- **`newBeats` with a duplicate id of a built-in** — decide precedence (newBeats should win, matching editor `effectiveBeat` which checks `draftBeats` first, shared.tsx:534). Test it.
- **Circular import** (`constants ↔ story`) — if it appears, the whole module graph can fail to load with a cryptic "undefined is not a function". Check `graphify path` before wiring; have the lazy-init fallback ready (plan step 3).
- **Act ordering** — `nextPendingBeat` returns the first incomplete beat with `act ≤ state.act` in array order (story.ts:520). If an override reorders the array or a `newBeat` lands mid-act, the strict-order guarantee can skip/block. Keep built-ins in original order; append newBeats at the end of their bucket.

**Rollback safety:** The change is data-shaping only; clearing `localStorage["hearth.balance.draft"]` instantly reverts every player to built-ins. No save migration, so no risk of save corruption. Reverting the PR restores the exact prior behaviour. If `applyStoryOverrides` throws on a malformed draft (it must NOT — it's total), wrap the module-load call in a try/catch that falls back to raw built-ins so a bad draft can never brick the game.

## Risks & gotchas

- **`SAVE_SCHEMA_VERSION` is a tripwire, but NOT relevant here.** Story overrides live in `hearth.balance.draft` (a separate key, `src/config/balance/load.ts:12`), NOT in the gameplay save. `src/state/persistence.ts` is version-gated by `SAVE_SCHEMA_VERSION` (`src/constants.ts:207` = 45) with NO migration — a bump WIPES every save. **Do not bump it.** This task changes no persisted gameplay shape. (Doc 08 is the save-migration ladder; not needed here.)
- **The queued beat is a live object reference.** `STORY/BEAT_FIRED` stores the beat object into `state.story.queuedBeat` and it gets persisted with the save. If an override changes a beat that's mid-queue in an old save, the save still holds the OLD object. That's acceptable (the override applies on the next fire), but don't assume re-loading a save re-applies overrides to already-queued beats.
- **Editor `effectiveBeat` and runtime `applyStoryOverrides` must not drift.** They are two implementations of one merge. They share `storySanitizers.ts`; keep the field list identical (this is why step 7 fixes the editor's `when` gap in the same PR). Consider extracting a single shared `applyBeatPatch` both call — but only if it doesn't drag editor-only deps into the runtime bundle (shared.tsx imports React/IconCanvas; keep `applyStoryOverrides.ts` React-free).
- **`storySanitizers.ts` is the trust boundary.** A draft is untrusted (localStorage, hand-editable). Every field MUST pass through a sanitizer; never spread `ov` raw onto a beat. The legacy `applyOverrides.ts` apply-pipeline was deleted (storySanitizers.ts:9-12); these sanitizers are the only survivors — reuse them, don't reinvent.
- **Three Vite entries.** `/story/` (`src/storyEditorEntry.tsx`) is a Phaser-free bundle; `applyStoryOverrides.ts` must stay Phaser-free and DOM-free so it's safe to import from both `src/story.ts` (game bundle) and tests.
- **`graphify update .`** after edits (CLAUDE.md); the file/symbol facts above are AST-true as of this brief but re-query before relying on line numbers.

## References

- `src/story.ts` — `STORY_BEATS` (l.114), `SIDE_BEATS` (l.325), `Beat`/`BeatTrigger`/`when` types (l.51-82), `nextPendingBeat` (l.519), `evaluateStoryTriggers` (l.581), `evaluateSideBeats` (l.668), `findBeat` (l.447), `applyBeatResult` (l.717), `interpolateBeatText` (l.883).
- `src/storyEditor/shared.tsx` — `effectiveBeat` (l.532, the merge to mirror), `draftBeats`/`suppressedBeatIds` (l.500-522).
- `src/config/storySanitizers.ts` — every validator to reuse; `sanitizeCond` (l.172) for `when:`.
- `src/config/schemas/story.ts` — `storyOverridesSchema` (the draft shape).
- `src/config/balance/load.ts` — `readBalanceDraft`/`writeBalanceDraft`/`loadBalanceOverrides`, the inert-pipeline comment (l.4-10).
- `src/constants.ts` — `BALANCE_OVERRIDES` (l.1200), `SAVE_SCHEMA_VERSION` (l.207).
- `src/state/storyEffects.ts` — `evaluateAndApplyStoryBeat` (l.31, the runtime evaluator entry).
- `src/features/story/slice.ts` — `STORY/BEAT_FIRED` queueing the beat (l.74), the three story actions to keep registered.
- `src/ui/Modals.tsx` — `StoryModal` reads `state.story.queuedBeat` (l.487-515, the success target).
- `src/storyEditor/Inspector.tsx` — `TriggerEditor` persists `when:` (l.449-470, why the `when` gap matters).
- `src/storyEditor/index.tsx` — `saveDraft`/`writeBalanceDraft` (l.801), live `storage` sync (l.825).
- Tests to model on: `src/__tests__/story-editor-model.test.ts`, `story-slice.test.ts`, `story-triggers.test.ts`, `storySanitizers.test.ts`, `story-catalog-invariants.test.ts`.
- Skills: **`check-slice-action`** (run for step 4), `phaser-scene-debug` (only if anything unexpectedly touches canvas — it shouldn't).
- CLAUDE.md house rules: validation commands, merge-commit PR workflow, `graphify update .` after edits.
