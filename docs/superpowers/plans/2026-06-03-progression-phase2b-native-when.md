# Progression Phase 2b-lite — Native `when:` beats (keep the typed picker)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Store every story/side beat's trigger natively as a `when: Cond` and evaluate it directly (no per-event bridge call), while the Story Editor keeps its friendly typed picker — it now **compiles** the picked type→`when:` on save and **decompiles** `when:`→type on load. Composite (AND/OR) authoring becomes possible in code; the picker degrades to a read-only summary for conditions it can't represent. Behaviour is preserved (existing story/side-beat suites stay green; bond beats get a dedicated test).

**Architecture:** Extend `src/config/progression/storyBridge.ts` with `condToTrigger` (inverse of `beatTriggerToCond`), `isFlagOnlyCond`, `isStateCond`, and `npc.*.bond` snapshot facts. Migrate `STORY_BEATS`/`SIDE_BEATS` data from `trigger:` to `when:` (`beatTriggerToCond` for standard types; a hand-written composite for `bond_at_least`). Route the runtime through `evaluate(beat.when, …)`. Update the editor (`Inspector.tsx`, `shared.tsx`) + the override sanitizer to speak `when:`.

**Tech stack:** TS, Vitest, React (Story Editor). Reuses Phase-1 `evaluate`/`factIdsIn`/`describeCond` + Phase-2a `beatTriggerToCond`/`buildFactSnapshot`.

**Out of scope:** a recursive Cond-tree builder UI (the picker stays); deleting `StoryTriggerType`/`BeatTrigger` (they remain the picker's vocabulary). `SAVE_SCHEMA_VERSION` unchanged (beats are config, not saved).

---

### Task 1: Bridge additions (TDD)

**Files:** modify `src/config/progression/storyBridge.ts` (+ `index.ts` re-export); test `src/__tests__/progression-bridge2b.test.ts`.

- [ ] **Step 1 — failing tests:**
  - `buildFactSnapshot(event, totals, flags, bonds)` adds `npc.<id>.bond` for each `bonds` entry (extend the existing 3-arg signature with an optional 4th `bonds: Record<string, number> = {}`).
  - `isFlagOnlyCond(cond)` → true iff `factIdsIn(cond)` is non-empty and every id starts with `flag.`. (`{fact:"flag.x"}`→true; `{not:{fact:"flag.x"}}`→true; `{fact:"level"}`→false.)
  - `isStateCond(cond)` → true iff no referenced fact starts with `event.`. (`{fact:"resource.x.total",op:"gte",value:1}`→true; `{all:[{fact:"event.type",op:"eq",value:"session_start"}]}`→false.)
  - `condToTrigger(cond): BeatTrigger | null` — inverse of `beatTriggerToCond` for the 12 picker types; **round-trips**: for each standard `BeatTrigger t`, `condToTrigger(beatTriggerToCond(t))` deep-equals `t`. Returns `null` for the composite bond `when:`, `order_fulfilled`/`keeper_confronted` (not picker types), and any unrecognised shape.
- [ ] **Step 2 — run, confirm fail.** `npx vitest run src/__tests__/progression-bridge2b.test.ts`
- [ ] **Step 3 — implement.** In `storyBridge.ts`: extend `buildFactSnapshot`; add `isFlagOnlyCond`/`isStateCond` (use `factIdsIn` from `./conditions.js`); add `condToTrigger` (match the exact shapes `beatTriggerToCond` emits — e.g. an `{all:[{fact:"event.type",op:"eq",value:"building_built"},{fact:"event.id",op:"eq",value:ID}]}` → `{type:"building_built", id:ID}`; `{fact:\`flag.${F}\`}` → `{type:"flag_set", flag:F}`; `{not:{fact:\`flag.${F}\`}}` → `{type:"flag_cleared", flag:F}`; `{fact:\`resource.${K}.total\`,op:"gte",value:N}` → `{type:"resource_total", key:K, amount:N}`; etc.). Re-export all four from `index.ts`.
- [ ] **Step 4 — run, confirm pass.**
- [ ] **Step 5 — commit:** `feat(progression): bridge bonds-snapshot + condToTrigger/isFlagOnlyCond/isStateCond`

---

### Task 2: Beat type + data migration

**Files:** modify `src/story.ts` (`Beat` interface; `STORY_BEATS`; `SIDE_BEATS`). Test: `src/__tests__/progression-when-migration.test.ts`.

- [ ] **Step 1 — failing migration test:** for every beat in `STORY_BEATS` and `SIDE_BEATS`, assert `beat.when` is defined and `beat.trigger` is undefined; and that for every non-bond beat, `beat.when` deep-equals `beatTriggerToCond(<the original trigger>)` (keep a small fixture map of original triggers in the test). For `mira_letter_1` (bond), assert `beat.when` equals `{ all: [ { fact: "npc.mira.bond", op: "gte", value: 8 }, { any: [ { fact: "event.type", op: "eq", value: "session_start" }, { fact: "event.type", op: "eq", value: "session_ended" } ] } ] }`.
- [ ] **Step 2 — run, confirm fail.**
- [ ] **Step 3 — migrate the data + type.** Add `when?: Cond` to `Beat` (import `Cond` from `./config/progression/types.js`); keep `trigger?: BeatTrigger` on the interface (still used by tests/editor types) but REMOVE it from every entry in `STORY_BEATS`/`SIDE_BEATS`, replacing with `when:` (standard types → the `beatTriggerToCond` value, written out literally; `bond_at_least` → the composite above). Beats with no trigger (choice-queued) stay with neither.
- [ ] **Step 4 — run the migration test + the full existing story suites:** `npx vitest run src/__tests__/progression-when-migration.test.ts tests/phase-2-story.test.ts src/__tests__/side-beats.test.ts src/__tests__/story-win.test.ts` — they will still reference the OLD runtime until Task 3; expect failures only where tests read `.trigger` (fix those in Task 5/6). The migration test must pass.
- [ ] **Step 5 — commit:** `refactor(story): author beats with native when: (bond_at_least → composite settle condition)`

---

### Task 3: Runtime evaluates `when:` directly

**Files:** modify `src/story.ts` (`evaluateStoryTriggers`, `sideTriggerMatches`, `evaluateSideBeats`).

- [ ] **Step 1 — main beats** (`evaluateStoryTriggers`, ~:478-496): replace the `onlyFlagConditions` guard `next.trigger?.type !== "flag_set"/"flag_cleared"` with `next.when && !isFlagOnlyCond(next.when)` → skip; replace `if (!next.trigger || !conditionMatches(next.trigger, event, totals, flags))` with `if (!next.when || !evaluate(next.when, buildFactSnapshot(event, totals, state.flags ?? {})))`.
- [ ] **Step 2 — side beats** (`sideTriggerMatches`, ~:522-541): build the snapshot with bonds — `const snap = buildFactSnapshot(event, inventoryForStory(gameState), flags, gameState?.npcs?.bonds ?? {})`. **Delete** the `t.type === "bond_at_least"` special block (now expressed in `when:`). Replace `STATE_CONDITION_TYPES.has(t.type)` repeat-pin with `isStateCond(beat.when)`. Replace the final `conditionMatches(t, …)` with `evaluate(beat.when, snap)`. (Keep the `beat.repeat`/cooldown + fired-marker logic intact. Note: the bond `when:` already carries the settle clause, so its firing stays settle-only.) Replace `const t = beat.trigger` reads with `beat.when` checks (`if (!beat.when) return false`).
- [ ] **Step 3 — side onlyFlagConditions** (`evaluateSideBeats`, ~:575): replace `beat.trigger?.type !== "flag_set"/"flag_cleared"` with `beat.when && !isFlagOnlyCond(beat.when)` → continue.
- [ ] **Step 4 — imports:** add `evaluate`, `buildFactSnapshot`, `isFlagOnlyCond`, `isStateCond` imports in `story.ts`. Leave `conditionMatches` exported (still used by `flags.ts`; flags have no live triggers, so unaffected).
- [ ] **Step 5 — run:** `npx vitest run tests/phase-2-story.test.ts src/__tests__/side-beats.test.ts src/__tests__/story-win.test.ts` plus a new bond test: assert `mira_letter_1` fires on a `session_start` event when `npcs.bonds.mira ≥ 8`, and does NOT fire on a non-settle event or when bond < 8. Fix until green. `npm run typecheck` clean.
- [ ] **Step 6 — commit:** `refactor(story): evaluate beat.when natively; bond_at_least via settle-composite`

---

### Task 4: Story Editor — compile on save, decompile on load

**Files:** modify `src/storyEditor/Inspector.tsx`, `src/storyEditor/shared.tsx`, `src/storyEditor/types.ts`. (Read these first; mirror existing style.)

- [ ] **Step 1 — TriggerEditor (Inspector.tsx ~439-470):** on load, derive the picker's working trigger from the beat via `condToTrigger(beat.when)`; if `null` (composite / non-picker), render a read-only "Advanced condition" row showing `describeCond(beat.when)` with a note that it's edited in code. On save, instead of `{ trigger: next }`, write `onEditBeat(beatId, { when: beatTriggerToCond(next) })`. `TriggerFields`/`defaultTriggerFor`/`TRIGGER_TYPES` stay as-is (they operate on the working `BeatTrigger`).
- [ ] **Step 2 — triggerSummary (shared.tsx ~82-105):** accept the beat's `when`; if `condToTrigger(when)` is non-null, reuse the existing per-type summary; else return `describeCond(when)`.
- [ ] **Step 3 — validation (shared.tsx ~267-340):** the flag-reference check must walk `when` — collect flag ids via `factIdsIn(when).filter(f => f.startsWith("flag.")).map(f => f.slice(5))` and warn on unregistered ones (same as before, but sourced from `when`).
- [ ] **Step 4 — types.ts:** make the editor read `beat.when`; keep `RuntimeTrigger`/`BeatTrigger` for the picker working value.
- [ ] **Step 5 — run the editor's tests** (`grep -rl storyEditor src/__tests__ tests` and run them) + `npm run typecheck`. Fix until green.
- [ ] **Step 6 — commit:** `feat(story-editor): typed picker compiles to/from beat.when; advanced summary for composite`

---

### Task 5: Override sanitizer + remaining tests

**Files:** modify `src/config/applyOverrides.ts` (sanitize/apply for `when:`); update tests `src/__tests__/bm-config-overrides.test.ts`, `src/__tests__/story-catalog-invariants.test.ts`, and any `.trigger`-authoring tests surfaced by grep.

- [ ] **Step 1 — sanitizeCond:** add a `sanitizeCond(raw): Cond | undefined` validating the `Cond` shape (leaf `{fact:string, op?:Op, value?}` with a known fact family via `isKnownFact`; `all`/`any` arrays; `not`). In `applyStoryOverrides` (~:688-770) and the newBeats/patch paths, accept a `when` field via `sanitizeCond` (keep `sanitizeTrigger` for any legacy `trigger` patch, compiling it via `beatTriggerToCond`). Keep behaviour: unknown/invalid → dropped.
- [ ] **Step 2 — update tests:** rewrite `story-catalog-invariants.test.ts` to assert the bridge/`isKnownFact` covers what the editor can author (instead of enum↔sanitizer coverage); update `bm-config-overrides.test.ts` trigger cases to `when:`/`sanitizeCond`; fix any other suite that authored `trigger:` objects to use `when:`.
- [ ] **Step 3 — run** the affected suites + `npm run typecheck`. Green.
- [ ] **Step 4 — commit:** `feat(config): sanitize/apply beat when: overrides; update trigger tests`

---

### Task 6: Full gate

- [ ] `npm run lint` · `npm run typecheck` · `npm run typecheck:test-files` → PASS
- [ ] `npm test` → PASS (story/side-beat/editor/override + new suites green)
- [ ] `npm run build` → PASS
- [ ] **Visual:** the Story Editor (`/story/`) is in the visual suite (`story.desktop-smoke.spec.ts`) and the Dev Panel trigger UI may render — run `npm run test:visual`. If it runs and existing goldens pass, regenerate only any intended `/story/`-trigger-UI diff with `test:visual:update` (revert unrelated platform diffs). If the platform mismatches the committed goldens (as in Phase 1), DEFER and note it. State the outcome in the PR.

---

## Self-review
1. **Coverage:** bridge inverse + helpers (T1), data→`when:` incl. bond composite (T2), runtime native eval (T3), editor compile/decompile + advanced summary (T4), override sanitizer + tests (T5), gate (T6). Picker kept; enum kept as picker vocab; no save bump — all per the chosen "2b-lite".
2. **Risk:** the bond settle-coupling is the danger — pinned by the composite `when:` + a dedicated firing test (T3 step 5) + existing side-beat suite.
3. **Type consistency:** `condToTrigger`/`isFlagOnlyCond`/`isStateCond`/`buildFactSnapshot(…,bonds)` signatures defined in T1 and used unchanged in T3-T5; `Beat.when: Cond` defined in T2 and consumed everywhere after.
