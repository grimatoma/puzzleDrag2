# Development Roadmap — Hearthwood Vale

*Last updated 2026-05-06. For game design and mechanics, see [GAME_SPEC.md](./GAME_SPEC.md).*

This document is the **index**. Each phase has its own detail file in [`roadmap/`](./roadmap/) — load only the file for the phase you are working on.

---

## How to use this document

**Working on a phase?** Open the matching detail file. Each one is self-contained.

**Standard task structure** (used in every phase detail file):

1. **What this delivers** — player-facing one-liner.
2. **Completion Criteria** — binary checklist, written *before* any code is touched. If any item is unchecked, the task is not done.
3. **Validation Spec (write before code — red phase)** — exact test cases to write first and watch fail. Includes unit tests and a gameplay-simulation script (persona, steps, designer reflection).
4. **Implementation** — file references and approach to make the tests green.
5. **Manual Verify Walk-through** — ordered browser steps. You must perform them; typing tests alone is not enough.
6. **Phase Sign-off Gate** at the end of each phase — all conditions must hold before the next phase starts.

**TDD red-green rule.** Write the test file, run it, confirm the failure is the *expected* failure (not a compile error). Only then write implementation code.

**Horizontal slice rule.** Each phase must produce a fully playable, fun-to-open game. Do not start a new phase until the current one is genuinely enjoyable.

**Farm → Mine → Sea.** Do not add Mine until Farm is polished. Do not schedule Sea until Mine is polished.

---

## Current State (as of this roadmap)

**Working:**
- Phaser 3 board renders and accepts drag-chain input
- Board collapses and refills after each chain
- Chain is collected; resources go to inventory
- React shell: HUD, side panel, bottom nav, season modal
- Save/load via localStorage
- NPC orders system (3 active orders)
- Crafting (Bakery, Larder, Forge recipes)
- Town building screen
- Apprentices UI (hire/fire — but effects are inert)
- Achievements, quests, almanac (scaffolded)
- Audio (synthesized)
- Boss system (Frostmaw works; others broken)

**Broken / Missing:**
- Chain upgrade model is `every 3rd tile` — wrong; must be per-resource threshold
- Tools (Scythe, Seedpack, Lockbox) add inventory directly, bypass the board
- Workers are hired but have no effect on gameplay
- Dead boards can softlock (no auto-shuffle)
- NPC mood starts at Sour (×0.70 tax) instead of Warm
- `TURN_IN_ORDER` mood bonus never fires (ordering bug)
- `MAX_TURNS` = 8 (should be 10); `seasonsCycled` lives in achievements slice not core
- Drought and frost weather do nothing
- Boss window is 5 seasons (should be 1); reward is flat ±200◉
- Ember Drake counts any craft as a forge event
- No story system, no win condition

---

## Phases at a glance

Each phase is a horizontal slice — a fully playable improvement, not a half-built feature. Detail files live in `roadmap/`.

| # | Phase | Status | Detail file |
|---|-------|--------|-------------|
| 0 | Critical Bug Fixes | Spec'd | [`roadmap/phase-0-bug-fixes.md`](./roadmap/phase-0-bug-fixes.md) |
| 1 | Chain Mechanic Overhaul + Board Tools | Spec'd | [`roadmap/phase-1-chain-mechanic.md`](./roadmap/phase-1-chain-mechanic.md) |
| 2 | Story System & Win Condition | Spec'd | [`roadmap/phase-2-story.md`](./roadmap/phase-2-story.md) |
| 3 | Economy (market, supply chain, runes, daily streak) | Spec'd | [`roadmap/phase-3-economy.md`](./roadmap/phase-3-economy.md) |
| 4 | Workers (data model, effects, wages, housing) | Spec'd | [`roadmap/phase-4-workers.md`](./roadmap/phase-4-workers.md) |
| 5 | Species (discovery, research, free moves) | Pending | `roadmap/phase-5-species.md` |
| 6 | NPC Social (gifts, dialog pools, mood UI) | Pending | `roadmap/phase-6-npc-social.md` |
| 7 | Quests / Almanac / Achievements | Pending | `roadmap/phase-7-progression.md` |
| 8 | Boss + Weather (1-season window, scaling rewards) | Pending | `roadmap/phase-8-boss-weather.md` |
| 9 | Mine Biome (resources, hazards, workers) | Pending | `roadmap/phase-9-mine.md` |
| 10 | Farm Depth (priority tools, tile pool tuning) | Pending | `roadmap/phase-10-farm-depth.md` |
| 11 | Polish & Accessibility | Pending | `roadmap/phase-11-polish.md` |
| 12 | Infrastructure (test runner, save migrations, build pipeline) | Pending | `roadmap/phase-12-infrastructure.md` |

---

## Phase summaries

### Phase 0 — Critical Bug Fixes
12 small fixes that must land before any feature work. Removes silent data corruption, dead-code mechanics, and constant mismatches (grid 6×6, MAX_TURNS=10, mood ordering bug, NPC bond floor, Ember Drake forge gating, drought/frost effects, dev menu gating). Exit: `runSelfTests()` returns zero failures and a fresh game shows the spec'd starting conditions.

### Phase 1 — Chain Mechanic Overhaul + Board Tools
Replaces the global "every 3rd tile" upgrade rule with per-resource thresholds (hay→wheat at 6, grain→flour at 4, etc.). Adds endpoint upgrade spawning, escalating star markers (1×/2×/3×), dead-board auto-shuffle, and three working tools (Scythe / Seedpack / Lockbox) that visibly modify the board instead of silently adding inventory. Exit: 10 sessions played, no softlocks, every upgrade lands at the chain endpoint.

### Phase 2 — Story System & Win Condition
Adds the 13-beat 3-act arc from GAME_SPEC §15. Beats: Wren arrival → Mira (hearth lit) → Tomas (first bread) → Mill → Bram → Iron → Frostmaw → Liss → Mine → Caravan → Festival → Win. Includes story state slice, a pure trigger evaluator, queued modal UI, NPC arrival side effects, and the Harvest Festival win condition (50 each of hay/wheat/grain/berry/log → sandbox mode). Exit: a fresh save plays through to win in real beat order.

### Phase 3 — Economy
Turns coins from a single-purpose scoreboard into a real economy. Caravan Post unlocks a Market with deterministic ±15% per-season price drift on all 20 sellable resources. Kitchen converts grain → supplies to gate standard Mine entry (3 supplies); runes earned from Mysterious Ore and boss victories pay for premium Mine entry, the Magic Portal, and a wildcard-tile board consumable. Powder Store grants 2 Bombs per `CLOSE_SEASON` — a tactical 3×3 board clear with the same no-turn-cost contract as the Phase 1 tools. A daily login streak modal credits the GAME_SPEC §16 reward ladder (day 1 = 25◉, day 7 = 150◉ + Reshuffle Horn, day 14 = 300◉ + 1 rune, day 30 = 1000◉ + 3 runes). Exit: a fresh save can take both supply and rune paths into the Mine, and the Market drift is visibly worth checking each season.

### Phase 4 — Workers wired
Workers stop being decorative wallet decorations and start changing the board. The data model is locked to a max-effect shape — every worker entry stores its full-slot value, with per-hire computed as `max ÷ maxCount` so a third Hilda completes the listed effect rather than tripling it. A pure `computeWorkerEffects(state)` aggregator feeds three Phaser registry channels — `effectiveThresholds`, `effectivePoolWeights`, `bonusYields` — which replace the raw Phase 1 thresholds at chain commit and shape the next board fill. Wages debit on `CLOSE_SEASON` against the same coin pool the Market uses; missed wages roll into `state.workers.debt`, pause production until cleared, and auto-repay against the next order or sale — no auto-fire. Housing capacity gates total hires (1 baseline + 1 per Housing built), with slot counts shown as plain numbers ("3", never "3/3") per the locked display rule. Exit: a fresh save can hire all 3 Hilda, watch chains of 3 hay upgrade where they previously didn't, deliberately under-fund wages, and recover via an order payment.

### Phase 5 — Species *(spec pending)*
Data model with categories (companion / mount / familiar). One active per category. Discovery via chain length thresholds. Research timer. Active species modifies board pool weights and grants free-moves per season. UI panel for browse/equip. Exit criteria TBD.

### Phase 6 — NPC social *(spec pending)*
Bond modifier visible on every order card. Gift system: select an inventory item, hand to NPC, bond change varies by favorite item. Dialog pools per NPC × season × bond band. Exit criteria TBD.

### Phase 7 — Quests / Almanac / Achievements *(spec pending)*
6 daily quest slots that reset per season. 5-tier almanac with structural reward at tier 5. Achievement counters wired to live game events. Exit criteria TBD.

### Phase 8 — Boss + Weather *(spec pending)*
Boss seasons compressed to 1 in 4. Reward scales with margin of victory. Board modifiers per boss (Frostmaw freezes 2 columns, Ember Drake heats them, Mossback hides resources). Weather slot integrated with boss season. Exit criteria TBD.

### Phase 9 — Mine biome *(spec pending)*
Stone → cobble (×6) and ore → coal → ingot resource chain. Mysterious Ore unlocked at level 4. Hazards: cave-in (lose a row), gas vent (skip a turn). Mine-specific workers (canary, geologist). Exit criteria TBD.

### Phase 10 — Farm depth *(spec pending)*
Priority Farm tools from GAME_SPEC §6 (Wheelbarrow, Dewdrop Vial, Heat Lamp). Tile pool tuning per season for Farm. Late-game crafting recipes. Exit criteria TBD.

### Phase 11 — Polish & Accessibility *(spec pending)*
Color-blind palette toggle, keyboard chain construction, screen-reader announcements for floaters and modals, motion-reduction setting. Exit criteria TBD.

### Phase 12 — Infrastructure *(spec pending)*
A real test runner (Vitest) replacing the in-game `runSelfTests()`. Save-file schema migrations for old saves. CI pipeline. Vite build optimisation. Exit criteria TBD.

---

## Dependency graph (high level)

```
Phase 0 (bug fixes) ─┐
                     ▼
Phase 1 (chain + tools) ─┐
                         ▼
                   Phase 2 (story) ─────────┐
                         │                  │
                         ▼                  │
            Phase 3 (economy) ◄──┐          │
                         │       │          │
                         ▼       │          │
            Phase 4 (workers) ───┤          │
                         │       │          │
                         ▼       │          │
            Phase 5 (species) ───┤          │
                         │       │          │
                         ▼       │          │
            Phase 6 (npc social) ┤          │
                         │       │          │
                         ▼       │          │
       Phase 7 (quests/almanac) ─┤          │
                         │       │          │
                         ▼       │          │
       Phase 8 (boss/weather) ───┘          │
                         │                  │
                         ▼                  │
              Phase 9 (mine) ◄──────────────┤
                         │                  │
                         ▼                  │
         Phase 10 (farm depth) ◄────────────┘
                         │
                         ▼
         Phase 11 (polish/a11y)
                         │
                         ▼
       Phase 12 (infrastructure)  ← can start in parallel any time
```

**Critical path:** 0 → 1 → 2 unlocks everything else. After Phase 2, Phases 3–8 can be reordered based on momentum (recommended order: 3 → 4 → 7 for "feel of progression", then 5 → 6 for character depth, then 8 to make boss seasons matter). Phase 9 (Mine) gates on Phase 2's `act3_mine_opened` beat. Phase 12 (infrastructure) can be picked up at any time it becomes painful to live without.
