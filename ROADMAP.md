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
| 5 | Species (discovery, research, free moves) | Spec'd | [`roadmap/phase-5-species.md`](./roadmap/phase-5-species.md) |
| 6 | NPC Social (gifts, dialog pools, mood UI) | Spec'd | [`roadmap/phase-6-npc-social.md`](./roadmap/phase-6-npc-social.md) |
| 7 | Quests / Almanac / Achievements | Spec'd | [`roadmap/phase-7-progression.md`](./roadmap/phase-7-progression.md) |
| 8 | Boss + Weather (1-season window, scaling rewards) | Spec'd | [`roadmap/phase-8-boss-weather.md`](./roadmap/phase-8-boss-weather.md) |
| 9 | Mine Biome (resources, hazards, workers) | Spec'd | [`roadmap/phase-9-mine.md`](./roadmap/phase-9-mine.md) |
| 10 | Farm Depth (priority tools, tile pool tuning) | Spec'd | [`roadmap/phase-10-farm-depth.md`](./roadmap/phase-10-farm-depth.md) |
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

### Phase 5 — Species
Every tile resource becomes a discoverable species across five categories — grass, grain, wood, berry, bird — with one active species per category at session start, and inactive species excluded from the board pool entirely. Discovery flows through three methods locked in GAME_SPEC §13: chain-length (a chain of 20 hay reveals Meadow Grass, a chain of 6 hay reveals Wheat), research (cumulative resource totals tracked globally across sessions, persisted in save), and direct buy via coins. The board pool wiring layers active-species choices with Phase 4's worker `pool_weight` effects — workers only stack on resources whose species is active, never resurrecting an inactive resource. Free-move species (Turkey, Clover, Melon) grant extra turns when *chained* — not just activated — per the locked free-move trigger rule. A category-tabbed Species panel surfaces discovery progress, active toggles, and locked-tier hints. Exit: a fresh save discovers Wheat on the first 6-hay chain, swapping active species changes the next board fill, and chaining Turkey grants 2 free moves that don't tick the session counter.

### Phase 6 — NPC social
Turns the 5 NPCs from silent order vending machines into a system the player can read and push. Every order card now surfaces the speaking NPC's bond band and reward multiplier inline (`+135◉ ×1.15 · Liked`), reading from a single locked table (Sour ×0.70 / Warm ×1.00 / Liked ×1.15 / Beloved ×1.25) seeded at the §18 starting value of 5/Warm. A gift modal per NPC accepts any inventory item — favorites (Mira flour, Tomas/Liss jam, Bram ingot, Wren plank) bump bond +0.5, anything else +0.2 — with a one-gift-per-NPC-per-season cooldown to prevent grinding. Dialog pools fill out the (5 NPCs × 4 seasons × 4 bands) = 80-cell matrix so order delivery, gift acceptance, and story-beat arrivals pull a season-flavored, bond-flavored line via a deterministic `pickDialog`. Exit: a fresh save can push Mira from Warm to Liked across one season of deliveries-plus-gifts, see the order modifier step from ×1.00 to ×1.15, and hear her voice change with the season.

### Phase 7 — Quests / Almanac / Achievements
Adds the short / medium / long-horizon progression spine the post-Phase-2 sandbox is missing. Six daily quest slots reset every season, rolled deterministically from `(saveSeed, year, season)` against a 12-template pool covering collect-resource, craft-item, fulfil-orders, use-tool, and chain-length categories — each claim pays coins plus the §17-locked 20 XP. A 5-tier almanac feeds on every XP source from §17 (1/chain, 5/order, 10/build, 25/boss, 20/quest) at the locked linear 150 XP/level curve, with tier rewards stepping up to a *structural* tier-5 unlock that flips `startingExtraScythe = true` so every subsequent session begins with one bonus Scythe. Twelve achievements (≥10 ship requirement) tick quietly in the background — `chains_committed`, `bosses_defeated`, `distinct_resources_chained`, `festival_won` — and pop a single-line "Achievement unlocked: <name>" floater on milestone crossings. Tiers 6–10 of the almanac (cosmetics + blueprints per §16) are deferred to Phase 11 polish. Exit: a fresh save can claim a full season's quests, level the almanac to 2 in one session, and unlock 4+ achievements during normal play.

### Phase 8 — Boss + Weather
Makes the §18-locked 1-season (10-turn) boss window actually *feel* different from a normal season. Each of the four canonical bosses applies a visible board modifier — Frostmaw freezes 2 columns (no chains through them), Ember Drake spawns heat tiles that burn an inventory unit if not chained within 2 turns, Old Stoneface drops 4 rubble blocks that only clear via adjacent 3+ stone chains, and Mossback (year-2 spring alternate) hides ~4 mystery tiles that flip on chain. Reward replaces Phase 0's flat ±200◉ with a two-piece formula: base = `200◉ × year_number` (locked §9), plus a margin-of-victory bonus that pays half-margin scaling capped at 2× target — so 60 logs vs Frostmaw's 30 pays 1.5× the year base, while 30 exactly pays 1.0×, and 29 pays nothing (no flag flip, no rune). The non-boss seasons get a small weather banner rolled from a 100-weight table (40 None / 20 Rain / 15 Harvest Moon / 15 Drought / 10 Frost): rain doubles berry yields, harvest moon adds +1 upgrade per chain, drought halves wheat+grain spawn weights, frost slows the collapse tween (purely visual). Boss seasons skip the weather roll. Exit: a fresh save can play through year 1 → 2 hitting all 4 boss types, see margin-scaled coin payouts, save+reload mid-boss without losing modifier state, and observe weather roll only during non-boss seasons.

### Phase 9 — Mine biome
Opens the second biome the moment Phase 2's `act3_mine_opened` beat fires and Phase 3's supply-or-rune entry fee is paid. The board palette flips from warm Farm green to cool cavern grey, and the spawn pool swaps to a locked 9-slot mix of stone / ore / coal / dirt + rare gem feeding the Phase 1 thresholds (stone→cobble at 8, cobble→block at 6, ore→ingot at 6, coal→coke at 7, gem→cutgem at 5; ingot and gold terminal). Once per mine session a Mysterious Ore tile spawns with a 5-turn countdown — chaining it together with ≥ 2 Dirt tiles yields exactly +1 Rune (Phase 3 currency); letting it expire degrades it to plain Dirt with no reward. Hazards bite at a 5% per-fillBoard rate, capped at 1 active: cave-ins lock a row behind rubble until cleared by a 3+ stone chain in an adjacent row, and gas vents glow on a 2×2 region for 3 turns then steal the next turn if ignored. Two new mine-only workers extend the Phase 4 catalog under its locked max-effect model — Canary (max 2 → -50% gas vent spawn rate at full hire) and Geologist (max 2 → +1 ore + +1 gem pool weight at full hire) — both gated by Phase 4.5 shared housing capacity. Exit: a fresh save can fire the mine beat, pay the entry fee, switch biomes, capture a Mysterious Ore for a Rune, clear a cave-in, and hire both mine workers without breaking the Farm side of the game.

### Phase 10 — Farm depth
Polishes the Farm to high-value before any further Mine work, honouring the locked Farm-first priority order. Three new Workshop-craftable tools — Rake (clears all hay tiles, 1 plank), Axe (clears all log tiles, 1 stone), Fertilizer (next refill spawns all grain, 1 hay + 1 dirt) — extend the Phase 1 board-tool tray under the same locked no-turn-cost contract, animating directly on the canvas instead of editing inventory in the dark. A per-season tile-pool modifier layer (spring berry +1, summer wheat +1, autumn log +2, winter stone +1 / hay −1) sits on top of the §6 base pool and stacks additively with Phase 4 worker `pool_weight` and Phase 5 species filtering — without touching the four locked §6 season effects (harvest +20%, summer 2× coins, autumn 2× upgrades, winter min-chain-5). Four §11 late-game Forge recipes (Iron Frame, Stonework, Gem Crown, Gold Ring) close out the Mine → Forge → Market loop and become Phase 7-quest-targetable outputs. The §6 Rats hazard ships as an active threat: when hay > 50 AND wheat > 50, each fillBoard rolls 10% (cap 4 active) to spawn a Rat that eats one adjacent plant tile per turn — chain 3+ rats together to clear them at +5◉ each, with the §6 Cat tool counter deferred to a later phase. Exit: a fresh save can craft and use all three new tools without spending a turn, eyeball-distinguish a spring board from a winter board, forge and sell all four late-game items via Phase 3 Market, and survive a rat infestation triggered by abundance.

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
