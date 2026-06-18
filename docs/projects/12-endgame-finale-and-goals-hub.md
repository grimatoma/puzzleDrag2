# Endgame: Old Capital Finale + Goals Hub

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

The game has two opposite holes at the two ends of the engagement curve. At the **far end**, the longest-horizon goal — collect all three Hearth-Tokens to open the Old Capital — terminates in a dead stub. The UI literally reads *"🏛 The Ember awaits — finale soon"* and the capital map node has no board and nothing to do; the real terminal beat (`act3_win`) fires much earlier off a festival-larder condition and then the game drops to sandbox. So the player who completes three settlements (the hardest thing the game asks) gets a non-clickable label as a reward. At the **near end**, the retention systems that should pull a player back daily — the Almanac XP track, daily quests, the login streak, achievements, boons, festivals — are buried behind a settings sub-menu or a tab toggle; the bottom nav (Town / Inventory / Craft / Map / Townsfolk) surfaces none of them, so a returning player has no "what should I do next" anchor.

This brief is **two related parts in one doc** because both touch story flags, the cartography surface, and the persisted shape, and shipping them together avoids two separate save-shape touches. **Part A** authors a minimal-but-real Old Capital finale (unlock → short story beat sequence reusing the existing StoryModal → a capstone payoff + a Chronicle/Charter epilogue reactive to the player's `choiceLog`). **Part B** adds a single "Goals" hub panel reachable from the nav that aggregates the next Almanac tier, the next settlement tier-up, active daily quests, and the daily streak into one glanceable screen.

## Background & current state (VERIFIED)

I opened every file below and corrected the seed brief where it had drifted. Discrepancies are called out inline with **CORRECTION**.

### Part A — the token/finale plumbing

- **Tokens exist and are real (SHIPPED).** `src/features/zones/data.ts`:
  - `HEARTH_TOKEN_FOR_TYPE` (`:582`) = `{ farm: "heirloomSeed", mine: "pactIron", harbor: "tidesingerPearl" }`.
  - `isOldCapitalUnlocked(state)` (`:589`) returns true iff `state.heirlooms[tok] >= 1` for all three token keys.
  - `hearthTokenCount(state)` (`:596`) returns 0–3.
  - `grantEarnedHearthTokens(state)` (`:606`) idempotently sets `heirlooms.<tok> = 1` for every founded + completed settlement. **CORRECTION to seed brief:** it is in `src/features/zones/data.ts`, not `zones/data.js` (the repo is `.ts`; CLAUDE.md's `.js` references are doc drift). It is invoked from `src/state.ts` and `src/state/keeperTrials.ts` (grep: `grantEarnedHearthTokens` → those two prod files + the test).
  - **CORRECTION — token storage keys.** The persisted heirloom keys are **`heirloomSeed` / `pactIron` / `tidesingerPearl`** (camelCase, set by `HEARTH_TOKEN_FOR_TYPE`). The lore display ids in `src/features/cartography/lore.ts` `HEARTH_TOKENS` (`:94`) are the *different* strings `seed` / `iron` / `pearl`. These two id spaces are NOT the same and a finale must read the camelCase storage keys (or call `isOldCapitalUnlocked` / `hearthTokenCount`).
- **REAL BUG to fix in passing.** `src/features/cartography/index.tsx` `HearthTokensStrip` (`:590-599`) reads `h.seed`, `h.iron`, `h.pearl` from `state.heirlooms` — but the granter writes `heirloomSeed`/`pactIron`/`tidesingerPearl`. **So the top-of-map Hearth-Token strip never lights up**, even with all three earned. The `NodePanel` status chips use `isOldCapitalUnlocked` / `hearthTokenCount` (correct keys) so the node lock text is right — but the header strip is silently dead. Fix the strip's keys as part of Part A (it's the same surface).
- **The capital node is a stub (DORMANT).** `src/features/cartography/data.ts` node `oldcapital` (`:444-453`): `kind: "capital"`, `requiresHearthTokens: true`, `boards: {}`, `buildings: []`, `plotCount: 0`. Lore in `lore.ts` (`:81-87`): subtitle "Anchor of the Pact · the first hearth", hearth line "…waiting on the three tokens."
- **The locked-stub UI string.** `src/features/cartography/index.tsx`:
  - `getNodeStatus` (`:85-86`): a `requiresHearthTokens` node returns `"capital-ready"` when unlocked else `"capital-locked"`.
  - `ActionButton` (`:341`) for `status === "capital-ready"` (`:406-412`) renders a **non-clickable `<div>`** reading **`🏛 The Ember awaits — finale soon`**. `capital-locked` (`:399-405`) renders "Collect all three Hearth-Tokens". The status chip (`:214-215`) shows `🏛 Hearth-Tokens N/3` / `🏛 The Ember awaits`. So today even a fully-unlocked capital does nothing on tap — there is no `onTravel`/dispatch wired for it. This is the dead end to replace.
- **`act3_win` is the current terminal (SHIPPED), and it is NOT the token finale.** `src/story.ts` `STORY_BEATS` last entry `act3_win` (`:296-315`): scene `dawn`, fires on a five-resource festival-larder condition (50 each of grass/wheat/flour/blackberry/oak), gated additionally by `state.flags.festival_announced` (`evaluateStoryTriggers` special-case `:593`), sets flag `isWon`. Its own body comment (`:301-303`) says *"The recurring-festival / Old-Capital-finale rework is a later phase."* On dismiss, `src/features/story/slice.ts` `dismissCurrentModal` (`:52-58`) flips `story.sandbox = true` and ticks the `festival_won` achievement. **So `act3_win` → sandbox is the real terminal today; the token finale is unbuilt.**
- **The story engine can host the finale with zero new machinery (SHIPPED).**
  - A beat is `{ id, title, scene?, lines[]|body, when?, choices?, onComplete? }` (`src/story.ts:56-82`). `STORY_BEATS` are act-ordered and fire in strict order via `nextPendingBeat` / `evaluateStoryTriggers` (`:519`, `:581`). `SIDE_BEATS` fire opportunistically and may carry `choices`.
  - `StoryModal` (`src/ui/Modals.tsx:490`) renders any queued beat: multi-line + choices → center-stage panel; a one-liner → bottom bar; and `act3_win` gets a **gilded full-bleed `WinBeat`** treatment hard-keyed on `beat.id === "act3_win"` (`:534-537`). The finale can opt into the same gilded path by extending that `if` to its beat id.
  - Choices record into `story.choiceLog` (`src/features/story/slice.ts` `STORY/PICK_CHOICE` `:107-129`): `{ beatId, choiceId, ts, value? }`. `applyChoiceOutcome` (`src/story.ts:902`) supports `setFlag/clearFlag/bondDelta/resources/coins/embers/coreIngots/gems/heirlooms/queueBeat` — enough to grant a capstone payoff directly from a choice with **no new reducer code**.
  - `applyBeatResult` (`src/story.ts:717`) handles `setFlag/spawnNPC/unlockBiome/advanceAct/spawnBoss` for `onComplete`.
- **Charter already names the finale (SHIPPED, dormant link).** `src/features/charter/index.tsx` `PACT_TERMS` term **VI** `capital_last` (`:80-88`): *"The old capital opens only when three settlements have stood. Three tokens, three roads, then the gate."* `relatedBeats: ["act3_festival", "act3_win"]`. The Charter derives honored/violated/pending per term from `choiceLog` + flags (`deriveTermState` `:96`). Adding finale beat ids to term VI's `relatedBeats` makes the finale's choices show up under the pact automatically.
- **Chronicle is the epilogue surface (SHIPPED).** `src/features/chronicle/index.tsx` lists `STORY_BEATS` whose `onComplete.setFlag` is set, as a timeline. A finale beat with `onComplete.setFlag` appears here for free. **CORRECTION to seed brief:** the choice-reactive prose lives in the **Charter** (term VI + per-beat choice rows), and the Chronicle is the *beat timeline*; "Chronicle epilogue reactive to choiceLog" is most cheaply realized as (a) a finale beat in the Chronicle timeline + (b) the finale beat's choices surfacing under Charter term VI. The finale modal itself can also read `state.story.choiceLog` to reflect the player's biggest past choice (e.g. keeper coexist vs driveout) in its closing line.

### Part B — the retention surfaces

- **Bottom nav (SHIPPED) exposes 5 views.** `src/ui.tsx` `BottomNav` (`:55-72`): `town`, `inventory`, `crafting` (label "Craft"), `cartography` (label "Map"), `townsfolk`. No Goals/quests/almanac/streak entry. Each `<Tab>` dispatches `SET_VIEW`.
- **Almanac is a TAB inside Quests, not its own view. CORRECTION to seed brief.** `src/features/almanac/index.tsx` is literally a 2-line stub: *"Almanac content is now inside the Quests tab (Daily / Almanac toggle). This file is intentionally empty to avoid registering a duplicate view."* The real Almanac UI + data is `src/features/almanac/data.ts` (`ALMANAC_TIERS` tiers 1–10, `XP_PER_LEVEL = 150`, `awardXp`, `claimAlmanacTier`) rendered by `src/features/quests/index.tsx` under `TABS = ["daily","almanac"]` (`:48`). `state.almanac = { xp, level, claimed{} }`.
- **Quests (SHIPPED).** `src/features/quests/` — `viewKey = "quests"` (`index.tsx:127`). `data.ts`: `rollQuests(saveSeed, year, season)` → 6 deterministic quests; `tickQuest`, `claimQuest`; `QUEST_CLAIM_XP = 20`. Active quests live in `state.quests` (array of `{ id, target, progress, claimed, reward{coins,xp} }`). Quest claiming awards almanac XP. Reachable as a view but **not on the nav** (router `VIEWS_WITH_TAB` includes `quests` but nothing navigates there from the main shell).
- **Achievements (SHIPPED, semi-buried).** `viewKey = "achievements"` (`src/features/achievements/index.tsx:43`). Only entry point today is the settings menu's **🏆 Trophies** button (`src/features/settings/index.tsx:117` dispatches `CLOSE_MODAL` then `SET_VIEW achievements`).
- **Daily streak: ALREADY IMPLEMENTED. CORRECTION to seed brief.** The seed says "Depends on doc 01 (LOGIN_TICK) for the streak to be live." The reducer is **already shipped**: `src/state.ts` handles `case "LOGIN_TICK"` (`:1323-…`) — first login → day 1, idempotent same-day, +1 consecutive (cap 30), reset on a ≥2-day gap, credits `DAILY_REWARDS[day]`. `state.dailyStreak = { lastClaimedDate, currentDay }` is in initial state (day 0 / null). `DAILY_REWARDS` (`src/constants.ts`) and `dayKeyForDate` exist. There is a full passing suite `src/__tests__/daily-streak.test.ts`. **The ONLY missing piece is that nothing dispatches `LOGIN_TICK`** — grep for `LOGIN_TICK` across `*.tsx`/`prototype.tsx` returns zero dispatch sites. So "doc 01" reduces to *one line*: dispatch `LOGIN_TICK { today: dayKeyForDate(new Date()) }` on app mount. This brief should **not** re-implement the streak; it should (a) read `state.dailyStreak` for display, and (b) add a one-line on-mount dispatch if doc 01 hasn't landed yet (cheap, idempotent, safe to do here — flag it as overlapping doc 01).
- **Tier-up data for the hub (SHIPPED).** `src/features/zones/data.ts`: `settlementTier(state, zoneId)` (`:425`), `currentTierDef(zoneId, tier)` (`:433`), `maxTier(zoneId)` (`:420`), `plotsForTier` (`:451`). `src/ui/Town.tsx` (`:140-167`) already computes "next rung" exactly: founded + `maxTier ≥ 0` + `tier < maxTier` → `currentTierDef(zoneId, tier+1)` → `next.upgradeCost`, and dispatches `TIER_UP { zoneId }`. Home ladder = 6 rungs Camp→Manor (`cartography/data.ts:252-285`); quarry ladder gated on `home` tier 4 (`:345`). The hub's "next tier-up" card reuses these selectors and the existing `TIER_UP` action.
- **`SET_VIEW`, `TIER_UP`, `LOGIN_TICK` are CORE reducer actions** (handled directly in `src/state.ts`'s `coreReducer`), so the hub dispatches them without any slice registration. See the slice-footgun note below for the one action you might add.

### Persistence reality (VERIFIED — affects both parts)

- `src/state/persistence.ts` saves the **whole `GameState` minus a VOLATILE blocklist** `{modal, bubble, view, viewParams, pendingView, craftingTab}` (`:6`, `:39`). It is a **blocklist, not a whitelist** — so any NEW persisted field (a new story flag, a new top-level object) is saved automatically with **no code change** and **no schema bump** *to write it*.
- `loadSavedState` is **version-gated with NO migration** (`:23-29`): a save whose `version !== SAVE_SCHEMA_VERSION` is **deleted** and the player starts fresh. `SAVE_SCHEMA_VERSION = 45` (`src/constants.ts:207`). See `docs/archive/projects/08-save-migration-ladder.md`.
- **Consequence for this brief:** the finale flag (e.g. `story.flags.oldcapital_finale_seen`) and any small additive field default falsy/`?? default` on an old save, so reading them is safe **without** a bump. Therefore **prefer additive, default-safe story flags and avoid bumping `SAVE_SCHEMA_VERSION`** for this work — a bump wipes every save and is only justified if doc 08's migration ladder has landed. If you find you *must* change a persisted shape in a non-default-safe way, depend on doc 08 and add a migrator there; do not bump bare.

## Scope

**In scope**

- Part A:
  - A finale unlock path off the existing `isOldCapitalUnlocked(state)` — make the `capital-ready` cartography affordance **actionable** (button instead of dead `<div>`), dispatching into the finale.
  - A short authored finale beat sequence (2–4 beats) added to `src/story.ts` reusing `StoryModal` (including an optional gilded treatment for the opener via the `WinBeat` path).
  - A capstone payoff: a title/cosmetic + a coin/rune/heirloom grant via a choice `outcome` (no new reducer), plus a permanent flag (`oldcapital_finale_seen`) so it is one-shot.
  - Choice-reactive closing prose: the finale's final line reflects the player's recorded `choiceLog` (e.g. keeper coexist vs driveout count), and the finale beats are wired into **Charter term VI** (`capital_last.relatedBeats`) and appear in the **Chronicle**.
  - Fix the `HearthTokensStrip` key bug (`seed/iron/pearl` → `heirloomSeed/pactIron/tidesingerPearl`).
- Part B:
  - A single **Goals hub** view (`src/features/goals/index.tsx`, `viewKey = "goals"`) aggregating, read-only-with-jump-actions: next Almanac tier (+claim if ready), next settlement tier-up (+`TIER_UP` if affordable), active daily quests (progress + claim), and the daily streak (`currentDay` / next reward).
  - A nav entry for it in `BottomNav` (replace `townsfolk` slot or add a 6th tab — see plan), and a router-reachable `#/goals`.
  - A one-line on-mount `LOGIN_TICK` dispatch **iff doc 01 hasn't already added it** (idempotent; coordinate to avoid a double dispatch).

**Out of scope / non-goals**

- The recurring-festival rework, multi-capital content, or any new board/zone at the capital (the node stays board-less; the finale is narrative + payoff).
- Re-implementing the daily streak, DAILY_REWARDS, almanac XP, quest rolling, or tier-up logic — all exist; the hub only *reads and dispatches existing actions*.
- A save-migration ladder (that is doc 08). This brief deliberately avoids a `SAVE_SCHEMA_VERSION` bump.
- New art/PixelLab assets, Phaser canvas changes, or MapScene/PhaserMap rework beyond making the existing capital affordance clickable in the React panel.
- Reworking the achievements/boons/festivals screens themselves (the hub may *link* to them but does not redesign them).

## Implementation plan

### Part A — Old Capital finale

1. **Author the finale beats in `src/story.ts`.** Add to `STORY_BEATS` (after `act3_win`) — or, to keep them independent of the act-ordered chain and avoid disturbing `act3_win`'s strict-order gate, add them to `SIDE_BEATS` and queue the first via a choice/dispatch. Recommended: a single **main finale beat** + 1–2 queued resolution beats. Sketch:

   ```ts
   // SIDE_BEATS (so it doesn't perturb act-ordered nextPendingBeat)
   {
     id: "oldcapital_finale",
     title: "The First Hearth",
     scene: "dawn",
     lines: [
       { speaker: null, text: "The gate of the Old Capital stands open. Three tokens hum in your hand." },
       { speaker: "wren", text: "This is where the line began, and where it was supposed to end. You brought it back." },
       { speaker: null, text: "The Ember lifts — and reads the record of every choice you made to get here." },
     ],
     // Fires the next settle-moment once the capital is unlocked AND not yet seen.
     when: { all: [
       { fact: "flag_set", flag: "oldcapital_unlocked_event" },   // see step 2
       { fact: "flag_cleared", flag: "oldcapital_finale_seen" },
     ]},
     choices: [
       { id: "kindle", label: "Kindle the First Hearth.",
         outcome: { setFlag: ["oldcapital_finale_seen", "title_keeper_of_the_first_hearth"],
                    coins: 1000, heirlooms: { emberCrown: 1 }, queueBeat: "oldcapital_epilogue" } },
     ],
     onComplete: { setFlag: "oldcapital_finale_seen" },
   },
   {
     id: "oldcapital_epilogue",
     title: "The Long Return",
     scene: "hearth",
     lines: [ /* closing line; can be chosen at runtime from choiceLog — see step 5 */ ],
   },
   ```

   **CONFIRM the `when:` vocabulary** against `src/config/progression/storyBridge.ts` / `conditions.ts` before finalizing — the brief above uses `flag_set`/`flag_cleared` facts which `evaluateStoryTriggers` already supports (see `act3_win` flag gate and the `onlyFlagConditions` path). If a `flag_cleared` leaf is awkward, gate purely on `flag_set: oldcapital_unlocked_event` and rely on the one-shot `setFlag: oldcapital_finale_seen` + `sideBeatFired` to prevent re-fire.

2. **Wire the unlock → finale trigger.** The cleanest minimal path that *fires a previously-dead path*:
   - In `src/features/cartography/index.tsx` `ActionButton`, change the `capital-ready` branch (`:406-412`) from a `<div>` to a real `<button>` whose `onClick` dispatches a new lightweight action **or** reuses `CARTO/TRAVEL` plus a finale open. Recommended: dispatch `{ type: "STORY/OPEN_FINALE" }` (a tiny new action) OR set the flag that the side-beat watches. Simplest with zero new reducer surface: dispatch a story event by setting `oldcapital_unlocked_event` via an existing action. If you add `STORY/OPEN_FINALE`, it must:
     - set `story.flags.oldcapital_unlocked_event = true`, then run `evaluateAndApplyStoryBeat(state, { type: "session_start" })` (or a dedicated event) so `evaluateSideBeats` picks up `oldcapital_finale` and queues the modal.
   - **SLICE FOOTGUN (mandatory check):** if you add `STORY/OPEN_FINALE`, it will **silently no-op** unless it is registered. It is handled in `story/slice.ts`? Then add `"STORY/OPEN_FINALE"` to `SLICE_PRIMARY_ACTIONS` in `src/state.ts` (`:1590`). If instead `coreReducer` handles it and returns a changed state, registration is automatic (the `afterCore !== state` path runs slices). **Run the `check-slice-action` skill on the new action before claiming it works.** Add a unit test that dispatches it and asserts `story.queuedBeat?.id === "oldcapital_finale"`.
   - Alternative with NO new action: have the button dispatch the existing `CARTO/TRAVEL { nodeId: "oldcapital" }` and emit the finale via the existing story-event pipeline keyed on arrival at a `capital` node. Pick whichever is least invasive after reading `cartography/slice.ts` for how `CARTO/TRAVEL` already emits events.

3. **Capstone payoff.** Grant via the choice `outcome` (step 1) — `coins`, optional `runes`/`heirlooms.emberCrown` (a cosmetic heirloom id), and a **title flag** `title_keeper_of_the_first_hearth`. `applyChoiceOutcome` already handles `coins`/`heirlooms`/`setFlag` (`src/story.ts:902`). If you want the title shown somewhere (e.g. Charter ribbon or Town header), read the flag there — but a visible title surface is optional polish, not required for "real finale."

4. **Charter + Chronicle wiring.** In `src/features/charter/index.tsx`, add the finale beat ids to term VI: `capital_last.relatedBeats = ["act3_festival", "act3_win", "oldcapital_finale", "oldcapital_epilogue"]` and consider an `honoredFlags: ["oldcapital_finale_seen"]` so the term flips to **honored** at the finale. The Chronicle (`src/features/chronicle/index.tsx`) auto-lists any `STORY_BEATS` beat with `onComplete.setFlag`; if the finale lives in `SIDE_BEATS` it will NOT appear in the Chronicle (which only reads `STORY_BEATS`). **Decide:** either put `oldcapital_finale` in `STORY_BEATS` (appears in Chronicle, but mind the strict-order gate — give it an act ≥ 3 and a flag-only `when:` so it never blocks an earlier pending beat) or extend Chronicle to also scan the finale. Putting it in `STORY_BEATS` with `act: 3` + a flag-gated `when:` is the lowest-friction choice; verify it does not wedge `nextPendingBeat`.

5. **Choice-reactive closing line.** In `StoryModal` (or a small helper), when rendering `oldcapital_epilogue`, read `state.story.choiceLog` and count keeper paths (`choiceId` of `coexist`/`drive_out`, or flags `keeper_path_coexist`/`keeper_path_driveout`) to pick one of two closing strings ("you kept the old guardians" vs "you cleared the hearths"). This is render-time only — no new persisted state. Keep it a pure function of `choiceLog` so it is unit-testable.

6. **Fix `HearthTokensStrip` (the real bug).** `src/features/cartography/index.tsx:594-598`: change `h.seed/h.iron/h.pearl` to `h.heirloomSeed/h.pactIron/h.tidesingerPearl`. Note the `HEARTH_TOKENS` `id`s are `seed/iron/pearl`, so the `earned[t.id]` lookup at `:603` keys on the *lore* id — map lore id → storage key (e.g. a `{ seed: "heirloomSeed", iron: "pactIron", pearl: "tidesingerPearl" }` lookup) so the strip lights correctly. Add a test that all three tokens earned ⇒ strip shows all lit.

7. **Gilded opener (optional).** To give the finale the same full-bleed treatment as `act3_win`, extend `src/ui/Modals.tsx:535` `if (beat.id === "act3_win")` to `if (beat.id === "act3_win" || beat.id === "oldcapital_finale")` so it routes through `WinBeat`.

### Part B — Goals hub

8. **Create `src/features/goals/index.tsx`** exporting `default` + `export const viewKey = "goals"`. It receives `{ state, dispatch }`. Build four cards (all read existing selectors/state — no new logic):
   - **Daily streak**: `state.dailyStreak.currentDay`, today's reward from `DAILY_REWARDS`, next milestone day. (Display only; the reward is auto-credited by `LOGIN_TICK`.)
   - **Next Almanac tier**: `state.almanac.{xp, level}`, `XP_PER_LEVEL`, `ALMANAC_TIERS.find(t => t.level === level && !claimed[t.tier])`; show XP-to-next; if a claimable tier exists, a **Claim** button dispatching the existing almanac-claim action (find it: grep `claimAlmanacTier` callers / the quests slice action). Fallback: a "Go to Almanac" jump → `SET_VIEW quests` + tab `almanac`.
   - **Next tier-up**: reuse the `Town.tsx:140-167` logic — `settlementTier`/`currentTierDef(zone, tier+1)`/`upgradeCost`; show cost + a **Grow** button dispatching `TIER_UP { zoneId: state.mapCurrent }` (gate `disabled` like Town does).
   - **Active daily quests**: `state.quests` filtered to unclaimed, each with `progress/target` and a **Claim** button when `progress >= target` (dispatch the existing quest-claim action — grep `claimQuest` callers / `quests/slice.ts`). Or jump to `SET_VIEW quests`.
   - Each card should also offer a one-tap "open the full screen" jump so the hub is an index, not a replacement.

9. **Add the nav entry.** In `src/ui.tsx` `BottomNav` (`:60-71`) add `<Tab itemKey="goals" iconKey="ui_star" label="Goals" />`. Five tabs is the current count; a 6th may crowd mobile. **Decision needed:** either (a) add a 6th tab (verify mobile width via the live check below), or (b) replace the least-used slot. Townsfolk is a candidate to demote into the Goals hub or the menu, but that is a product call — default to **adding a 6th tab** and visually verifying, since removing Townsfolk is a separate concern. Pick an icon that exists in the icon set (`ui_star` is safe; check `IconCanvas`/`hasIcon`).

10. **Router.** `goals` becomes routable automatically because `KNOWN_VIEWS` is built from feature `viewKey` exports (`src/router.ts:28-38`). No router edit needed unless you want a `tab` segment (you don't). Confirm `#/goals` resolves after the feature is added.

11. **On-mount `LOGIN_TICK` (coordinate with doc 01).** If doc 01 has NOT landed, add a single `useEffect` on app mount (in `prototype.tsx` near other mount effects) dispatching `{ type: "LOGIN_TICK", payload: { today: dayKeyForDate(new Date()) } }`. It is idempotent (same-day re-open is a no-op per `state.ts:1327`). If doc 01 already added it, do nothing — do not double-dispatch.

12. **Slice footgun for Part B:** the hub dispatches only **existing** actions (`SET_VIEW`, `TIER_UP`, `LOGIN_TICK`, and the existing almanac/quest claim actions). `SET_VIEW`, `TIER_UP`, `LOGIN_TICK` are core-reducer-handled. The almanac/quest **claim** actions already work from the Quests screen, so they are already wired — just reuse the exact action types. No new registration is needed for Part B. (Only Part A's optional `STORY/OPEN_FINALE` needs the slice check.)

## Success criteria

- [ ] With all three tokens earned, the cartography panel for the capital shows an **actionable** control (a button, not the dead "finale soon" div), and tapping it opens a finale story modal.
- [ ] The finale plays a 2–4 line beat sequence via the existing `StoryModal`, ending in a choice that grants the capstone payoff (coins + cosmetic/title flag) exactly **once** (re-opening after `oldcapital_finale_seen` does not re-grant).
- [ ] The finale's closing line differs based on the player's `choiceLog` (e.g. keeper coexist vs driveout), proven by a pure helper test on two synthetic logs.
- [ ] Charter term VI (`capital_last`) flips to **honored** (or shows the finale's choice rows) after the finale; the finale beat appears in the Chronicle timeline.
- [ ] `HearthTokensStrip` at the top of the map lights all three tokens when earned (regression test for the `seed`→`heirloomSeed` key bug).
- [ ] A **Goals** tab exists on the bottom nav and `#/goals` is reachable; it renders four cards: daily streak, next Almanac tier, next tier-up, active daily quests.
- [ ] Each Goals card reflects live state (streak day matches `state.dailyStreak.currentDay`; tier-up cost matches `currentTierDef(zone, tier+1).upgradeCost`; claimable quests/tiers show a working Claim that mutates state).
- [ ] The Goals **Grow** button performs a `TIER_UP` identical to the Town button (same dispatch, same gating).
- [ ] No `SAVE_SCHEMA_VERSION` bump; an existing v45 save loads and runs both features (new flags default falsy).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

**Gating commands (must pass before PR):**
- `npm run lint` — zero new errors.
- `npm run typecheck` — `tsc --noEmit` clean (watch for `state.almanac`/`state.dailyStreak`/`state.heirlooms` index-sig narrowing — coerce at read sites like the existing code does).
- `npm test` — all vitest green, including the new tests below.
- `npm run build` — production build succeeds (catches the feature-glob registration of `goals/index.tsx`).

**New unit tests (vitest, node env, no canvas):**
- `src/__tests__/oldcapital-finale.test.ts`:
  - `isOldCapitalUnlocked` false with 0/3 and 2/3 tokens, true at 3/3 (set `heirlooms.heirloomSeed/pactIron/tidesingerPearl = 1`).
  - Dispatching the finale trigger (the new action or arrival path) sets `story.queuedBeat.id === "oldcapital_finale"` **only** when unlocked and `oldcapital_finale_seen` is falsy.
  - Picking the finale choice sets `oldcapital_finale_seen` + the title flag and adds the coin/heirloom payoff; a second dispatch does **not** re-grant (one-shot).
  - The closing-line helper returns the coexist string for a `choiceLog` with keeper coexist and the driveout string otherwise.
- `src/__tests__/hearth-token-strip.test.ts` (or extend `hearth-tokens.test.ts`): with all three storage keys set, the strip's per-token `earned` map is all true (assert the lore-id→storage-key mapping).
- `src/__tests__/goals-hub.test.ts`: a pure selector test — "next Almanac tier", "next tier-up", "claimable quests count" given a synthetic state match the values rendered. Reuse `settlementTier`/`currentTierDef` and `ALMANAC_TIERS`.
- If you add `STORY/OPEN_FINALE`: a slice-registration test that dispatching it through `gameReducer` actually changes `story` (proves it is NOT no-op'd by the SLICE_PRIMARY_ACTIONS footgun).

**Manual in-game check (live host, per CLAUDE.md):**
- Spin a worktree Vite on a spare port with base `/puzzleDrag2/` (`node ../../../node_modules/vite/bin/vite.js`), since `:5173` serves MAIN. `preview_screenshot` HANGS here — assert via DOM + `getComputedStyle`, and drive state via `window.__hearthVisual.dispatch/state/freeze`.
- Grant tokens: `window.__hearthVisual.dispatch` a state with `heirlooms` set, or play to 3/3; open Map → capital node → confirm the button (not the dead div) and that tapping opens the finale modal. Confirm the top token strip lights.
- Open the Goals tab; confirm the four cards and that **Grow**/**Claim** mutate `window.__hearthVisual.state`.
- `window.__phaserScene` is only needed if you touch the MapScene (you should not — the change is in the React `NodePanel`/`ActionButton`).

**Informational (not gating):** `npm run test:e2e` and `npm run test:visual` — e2e/visual are NOT in CI and visual goldens are **not regenerable on this Windows host** (DOM drifts 3–5%, Phaser WebGL ~38%). Do not trust a local golden regen; if you add an e2e flow (e.g. open Goals from nav), run it locally for signal only and re-baseline goldens only on a canonical host.

After code changes: `graphify update .`.

## Double-check / adversarial review

- **"Did the dead path actually fire?"** The whole point of Part A is to light up a path that never ran. Prove it: a test that, *before* the change, the capital control is inert (no dispatch) and *after*, dispatching the trigger queues `oldcapital_finale`. In-game, freeze state at 3/3 tokens and confirm the modal opens — a skeptic will say "you authored a beat that never gets reached." Show the trigger → `evaluateSideBeats`/`evaluateStoryTriggers` → `STORY/BEAT_FIRED` → `queuedBeat` chain with a unit test, not just by eyeballing the modal.
- **One-shot integrity.** Re-open the capital after kindling: the finale must NOT re-fire and must NOT re-grant coins. `sideBeatFired`/the `oldcapital_finale_seen` flag must hold across a save round-trip (persist → reload). Test: dispatch finale, serialize via `persistStateNow`, reload via `loadSavedState`, assert flag survives and re-trigger is a no-op.
- **Slice no-op trap.** If you added `STORY/OPEN_FINALE` and it appears to "do nothing," it is almost certainly the `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` footgun (`src/state.ts:1590/1639`). Run the `check-slice-action` skill; confirm with a reducer test, not by clicking.
- **Token key bug regression.** The `seed`/`heirloomSeed` mismatch is exactly the kind of bug that "looks fixed" until you check both surfaces. Verify BOTH the header strip (Part A fix) and the node-panel status (already correct) light up off the *same* earned state in one test.
- **Save safety / rollback.** Confirm NO `SAVE_SCHEMA_VERSION` change in the diff (`git diff src/constants.ts`). Load a pre-change v45 save (or a synthetic one missing `oldcapital_finale_seen`/`dailyStreak`) and confirm the app runs and the hub renders with sensible defaults. Rollback is trivial: the features are additive (new file + a nav line + new beats + one key fix); reverting the commit restores the stub with no data loss because nothing destructive was written.
- **Nav crowding.** A 6th tab can overflow on a 380px mobile viewport. Verify the TabBar at mobile width (DOM/`getComputedStyle`, since screenshots hang). If it overflows, fall back to demoting a slot into the hub/menu — but get product sign-off before removing Townsfolk.
- **Double `LOGIN_TICK`.** If both this brief and doc 01 add an on-mount dispatch, the streak still can't double-count (same-day is idempotent), but two effects is sloppy — grep for an existing `LOGIN_TICK` dispatch before adding one.

## Risks & gotchas

- **Two id namespaces for tokens.** `heirloomSeed/pactIron/tidesingerPearl` (storage, set by `HEARTH_TOKEN_FOR_TYPE`) vs `seed/iron/pearl` (lore `HEARTH_TOKENS`). Always read storage keys (or `isOldCapitalUnlocked`/`hearthTokenCount`). The strip bug is this exact trap.
- **`act3_win` strict-order gate.** `STORY_BEATS` fire in order via `nextPendingBeat`; a new `STORY_BEATS` entry with a never-true `when:` can wedge the chain. If you put the finale in `STORY_BEATS`, give it `act: 3` and a flag-only `when:` so it can never become the blocking pending beat ahead of a real one. Safer default: `SIDE_BEATS` (opportunistic) + extend the Chronicle scan if you want it on the timeline.
- **Chronicle only scans `STORY_BEATS`** (`chronicle/index.tsx:14`). A `SIDE_BEATS` finale won't appear there unless you also scan SIDE_BEATS or surface it via the Charter (which is the more reactive home anyway).
- **Persistence is a blocklist** — every non-VOLATILE field is saved. A typo'd extra top-level field will quietly persist forever; keep new state under `story.flags` where possible.
- **No save migration.** Do not bump `SAVE_SCHEMA_VERSION`; a bump wipes all saves and there is no ladder yet (doc 08). Keep all new shape additive and default-safe.
- **Visual goldens are not regenerable here** and e2e/visual are not in CI. Don't gate on them; don't trust a local regen.
- **`preview_screenshot` hangs on this host; `:5173` is MAIN, not the worktree.** Verify via DOM asserts + `window.__hearthVisual`/`window.__phaserScene` on a worktree Vite at a spare port with base `/puzzleDrag2/`.
- **CLAUDE.md says `.js/.jsx`; the files are `.ts/.tsx`.** Trust the code paths in this doc.

## References

- `src/features/zones/data.ts` — `HEARTH_TOKEN_FOR_TYPE` (`:582`), `isOldCapitalUnlocked` (`:589`), `hearthTokenCount` (`:596`), `grantEarnedHearthTokens` (`:606`), tier selectors `settlementTier`/`currentTierDef`/`maxTier`/`plotsForTier` (`:420-455`).
- `src/features/cartography/data.ts` — `oldcapital` node (`:444-453`), `MapNode.requiresHearthTokens` (`:78`).
- `src/features/cartography/lore.ts` — `NODE_LORE.oldcapital` (`:81`), `HEARTH_TOKENS` (`:94`, the `seed/iron/pearl` id space).
- `src/features/cartography/index.tsx` — `getNodeStatus` (`:85`), `ActionButton` capital branches (`:399-412`, the dead "finale soon" div), `HearthTokensStrip` (`:590`, the key bug), `NodePanel` (`:488`).
- `src/story.ts` — beat schema (`:56-105`), `STORY_BEATS`/`act3_win` (`:114-316`), `SIDE_BEATS` (`:325`), `evaluateStoryTriggers` (`:581`), `evaluateSideBeats` (`:668`), `applyBeatResult` (`:717`), `applyChoiceOutcome` (`:902`), `interpolateBeatText` (`:883`).
- `src/features/story/slice.ts` — `STORY/BEAT_FIRED`/`PICK_CHOICE`/`DISMISS_MODAL`, `dismissCurrentModal` win→sandbox (`:45-70`), `choiceLog` write (`:119`).
- `src/state/storyEffects.ts` — `evaluateAndApplyStoryBeat` (`:31`) — the event → beat pipeline to fire the finale.
- `src/ui/Modals.tsx` — `StoryModal` (`:490`), gilded `WinBeat` keyed on `act3_win` (`:535`).
- `src/features/charter/index.tsx` — `PACT_TERMS` term VI `capital_last` (`:80-88`), `deriveTermState` (`:96`).
- `src/features/chronicle/index.tsx` — timeline that scans `STORY_BEATS` `onComplete.setFlag`.
- `src/ui.tsx` — `BottomNav` (`:55-72`).
- `src/router.ts` — `KNOWN_VIEWS` from feature `viewKey`s (`:28-38`).
- `src/features/almanac/data.ts` — `ALMANAC_TIERS`, `XP_PER_LEVEL`, `awardXp`, `claimAlmanacTier`; `src/features/almanac/index.tsx` (empty stub note); `src/features/quests/index.tsx` Daily/Almanac tabs (`:48`).
- `src/features/quests/data.ts` — `rollQuests`/`tickQuest`/`claimQuest`, `QUEST_CLAIM_XP`.
- `src/ui/Town.tsx:140-167` — the canonical "next tier-up" + `TIER_UP` dispatch to mirror in the hub.
- `src/state.ts` — `LOGIN_TICK` (`:1323`), `TIER_UP` (`:749`), `SLICE_PRIMARY_ACTIONS` (`:1590`), `ALWAYS_RUN_SLICES` (`:1639`).
- `src/state/persistence.ts` — blocklist save (`:6,:39`), version gate no-migration (`:23-29`).
- `src/constants.ts` — `SAVE_SCHEMA_VERSION = 45` (`:207`), `DAILY_REWARDS`, `dayKeyForDate`.
- `src/__tests__/daily-streak.test.ts` — proves `LOGIN_TICK`/`dailyStreak`/`DAILY_REWARDS` already work.
- `docs/archive/projects/08-save-migration-ladder.md` — depend on this before any persisted-shape change requiring a bump.
- `.claude/skills/check-slice-action` — run for any new dispatched action (Part A's `STORY/OPEN_FINALE`).
- CLAUDE.md (slice footgun, persistence, validation commands, live-verify, visual-golden host limits).
