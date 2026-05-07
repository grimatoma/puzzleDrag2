# Game Spec — Hearthwood Vale

*Last updated 2026-05-06. This is the authoritative game design reference.*
*For implementation order, see ROADMAP.md.*

---

## 1. Vision

A cosy farming puzzle game. The player drags chains of matching tiles on a 6×6 board to harvest resources. Longer chains produce upgraded goods. Those goods fund a growing settlement — buildings, workers, NPCs, and a story that ends with the Harvest Festival.

**Priority order:** Farm → Story → Economy → Workers → Species → Mine → Sea (much later).  
Each environment is only added once the previous one is polished and high-value.

---

## 2. Core Loop

```
Enter a puzzle session
→ Drag chains of 3+ matching tiles
→ Long chains (≥ threshold) spawn upgraded resources at the endpoint
→ Collect resources into persistent inventory
→ Fulfill NPC orders for coins
→ Spend coins on buildings and workers
→ Buildings unlock new recipes, tools, and story beats
→ Workers reduce chain thresholds, improving future sessions
→ Story advances until the Harvest Festival win condition
→ Sandbox continues after win
```

---

## 3. Currencies

| Currency | Earned By | Spent On |
|---|---|---|
| **Coins (◉)** | Fulfilling orders, selling resources, quests | Buildings, tools, market, hiring workers |
| **Runes** | Mysterious Ore (Mine tile), boss victories, quests | Mine/premium entry, Magic Portal, certain buildings |
| **Workers** | Housing buildings (1/season; Phase 4.6), IAP stub (Phase 4.6) | Hiring staff — every hire costs 1 Worker + goods (Phase 4.6) |
| **Bombs** | Powder Store building (2/season end) | Mine worker hire costs |
| **Influence** | Building decorations (Phase 8.5: violet bed +20, stone lantern +35, apple sapling +60), royal quests (Phase 7) | Magic Portal summons (Phase 8.6) |

**Sell/buy asymmetry:** Sell prices are emergency rates (roughly 5–10% of buy). Selling resources is never optimal play.

---

## 4. Puzzle Board

### Grid
6 columns × 6 rows. Tiles fill from above after each collection. Board is always full at the start of each action.

### Valid Chain
- 3 or more adjacent identical tiles.
- Adjacency includes all 8 directions (diagonals count).
- A continuous path; no tile may appear twice; path may not cross itself.
- Release to commit the chain. Any shorter drag is cancelled.

### Chain Threshold Model (LOCKED)

Each resource has a **threshold** — the minimum chain length required to spawn one upgraded resource at the chain's endpoint. Reaching a multiple of the threshold spawns one upgrade per multiple.

```
Hay threshold = 6
  Chain 3  →  collect 3 hay, no upgrade
  Chain 6  →  collect 6 hay + 1 wheat spawns at endpoint
  Chain 12 →  collect 12 hay + 2 wheat spawn at endpoint
  Chain 18 →  collect 18 hay + 3 wheat spawn at endpoint
```

Upgraded resources appear on the board at the endpoint tile position during the next fill cycle. They are **not auto-collected** — the player must chain them manually.

#### Base Threshold Table

| Tile | Threshold | Upgrades To | Terminal? |
|---|---|---|---|
| Hay | 6 | Wheat | — |
| Wheat | 5 | Grain | — |
| Grain | 4 | Flour | ✓ terminal |
| Log | 5 | Plank | — |
| Plank | 4 | Beam | ✓ terminal |
| Berry | 7 | Jam | ✓ terminal |
| Egg | — | — | ✓ terminal |
| Stone | 8 | Cobble | — |
| Cobble | 6 | Block | ✓ terminal |
| Ore | 6 | Ingot | ✓ terminal |
| Coal | 7 | Coke | ✓ terminal |
| Gem | 5 | CutGem | ✓ terminal |
| Gold | — | — | ✓ terminal |

Terminal resources are collected as-is regardless of chain length.

### Overchaining

Overchaining is the core skill expression mechanic. No cap on the number of upgrades.

**Star markers during drag:**
A ★ appears at the tile at position T, 2T, 3T... (where T = resource threshold). The star shows which upgraded resource will spawn.

**Visual escalation by multiple:**
- 1× threshold: gold ★, small, subtle sway
- 2× threshold: gold ★★, larger, faster sway, brighter glow halo
- 3× threshold: gold ★★★, largest, pulsing orange-white burst, screen micro-shake on commit

**On commit:** `upgradeCount = floor(chainLength ÷ threshold)` upgraded tiles are placed at the endpoint.

**Floater text:** `+N Hay  ★×K` where K is the upgrade count.

### Dead Board

After every board fill, check for at least one valid 3-tile chain. If none exists, auto-shuffle the board without consuming a turn. Show a "No moves — reshuffled" floater.

### Turn Economy

- Normal chains consume 1 session turn.
- Tools and free moves do **not** consume turns.
- Sessions are 10 turns. After 10 turns, the season ends.

---

## 5. Session Tools

Tools are consumable board-manipulation items. Using a tool does **not** consume a session turn. Tools are acquired via crafting (Workshop), buildings (Powder Store), or the store.

All tools operate directly on the Phaser board — they are not inventory shortcuts.

### Current Tools

| Tool | Board Effect | Acquire |
|---|---|---|
| Scythe (clear) | Remove 6 random tiles and collect their resources | Starting stock |
| Seedpack (basic) | Replace 5 random tiles with the biome's base resource | Starting stock |
| Lockbox (rare) | Replace 3 random tiles with the biome's rare resource | Starting stock |
| Reshuffle Horn | Randomise all tile positions (full 360° spin animation) | Earn via almanac/quests |

### Priority Farm Tools (Phase 10)

| Tool | Board Effect | Craft Cost | Phase |
|---|---|---|---|
| Rake | Collect all hay tiles | 1 Plank (per §6 wood chain) | 10.1 |
| Axe | Collect all log tiles | 1 Stone | 10.1 |
| Fertilizer | All next-fill tiles are grain | 1 Hay + 1 Dirt | 10.1 |
| Cat | Remove all rat tiles | 2 Stone + 1 Water | 10.5 |
| Bird Cage | Collect all egg tiles | 1 Hay | 10.6 |
| Scythe (full) | Collect all grain tiles | 1 Stone | 10.6 |
| Rifle | Remove all wolf tiles | 1 Plank + 1 Stone + 1 Ingot | 10.8 |
| Hound | Scatter wolves for 5 turns | 1 Bread + 3 Stone | 10.8 |

### Magic Tools (Phase 8.6, Portal-only)

Cost paid in **Influence** (Phase 8.5). Player picks (no random draw, per §18).

| Tool | Effect | Influence cost |
|---|---|---|
| Magic Wand | Collect all tiles of a chosen type | 80 |
| Hourglass | Undo last move (restore previous grid + inventory + turnsUsed) | 120 |
| Magic Seed | Session lasts 5 extra turns | 100 |
| Fertilizer (magic) | All refill tiles are grain for 3 turns | 60 |

---

## 6. Farm Biome

The primary and first-priority environment. All other features are built around Farm.

### Farm Resource Chains

```
Hay → Wheat → Grain → Flour    (grass/grain chain, 4 tiers)
Log → Plank → Beam              (wood chain, 3 tiers)
Berry → Jam                     (berry chain, 2 tiers)
Egg                             (terminal, no upgrade)
```

### Farm Session Turn Counter

10 turns per session. Turns map to 4 seasons within a year:

| Turns Used | Season |
|---|---|
| 0–2 | Spring |
| 3–5 | Summer |
| 6–8 | Autumn |
| 9–10 | Winter |

### Season Effects

| Season | Effect |
|---|---|
| Spring | Harvest bonus: +20% resource gain from chains |
| Summer | Orders pay 2× coins |
| Autumn | Chains produce 2× upgrades |
| Winter | Chains must be 5+ tiles; shorter chains are cancelled |

### Farm Tile Pool (board spawn weights)

Base pool: `[hay, hay, hay, log, log, wheat, berry, berry, egg]`. Weights are modified by active species and hired workers with `pool_weight` effects.

### Farm Hazards (Phase 10)

| Hazard | Behavior | Counter | Phase |
|---|---|---|---|
| Rats | Active; eat plants each turn; chain 3+ to remove | Cat tool, Ratcatcher worker | 10.4 (rats) + 10.5 (Cat tool) |
| Fire | Spreads to adjacent tiles each turn | Chain fire tiles to extinguish | 10.7 |
| Wolves | Chase and eat bird/herd tiles | Rifle tool (clear), Hound tool (5-turn scatter) | 10.8 |

---

## 7. Mine Biome (Deferred — add after Farm is polished)

### Mine Resource Chains

```
Stone → Cobble → Block          (rock chain)
Ore → Ingot                     (metal chain)
Coal → Coke                     (carbon chain)
Gem → CutGem                    (crystal chain)
Gold                            (terminal)
```

Mine sessions consume **supplies** (converted from grain via Kitchen building) instead of a days counter. Entry options: free (standard), 100◉ + 10 shovels (better), 2 Runes (premium).

### Mysterious Ore

A special tile that spawns among Dirt tiles with a countdown timer. Must be chained with adjacent Dirt tiles before the countdown expires. Success = 1 Rune. Failure = degrades to ordinary Dirt.

### Mine Hazards (Phase 9)

| Hazard | Behavior | Counter |
|---|---|---|
| Cave-in | Locks a row behind rubble | Chain 3+ stone in an adjacent row |
| Gas vent | 2×2 region; ignored = lose next turn | Chain into the 2×2 within 3 turns; Canary worker reduces spawn rate |
| Lava | Spreads each turn; destroys resources | Water Pump tool |
| Moles | Consume adjacent tiles each turn | Explosives tool |

(Exploding Gas in earlier drafts has been folded into the Gas vent hazard.)

---

## 8. Sea Biome (Much Later)

Full Sea biome deferred until Mine is polished and high-value.

Sea introduces a **ship navigation mechanic** (player moves a ship to reach chests). Different from Farm and Mine. All Sea design decisions are TBD.

---

## 9. Season System (Full Year Loop)

A full game year = 4 seasons = 40 turns.

**Season cycle:**
- Each session uses 10 turns.
- After 10 turns, the season ends → Season Summary modal → next season begins.
- After 4 seasons (one full year), the year resets. Boss events coincide with year transitions.

**Boss events** occur once per year. A boss presents a challenge (collect N of resource X in Y turns). Each boss applies a board modifier for its duration.

| Boss | Challenge | Board Modifier |
|---|---|---|
| Frostmaw | Collect 30 logs | Minimum chain length: 5 |
| Quagmire | Harvest 50 hay | Extra log/hay respawn tiles |
| Ember Drake | Smelt 3 ingots | Heat tiles appear (deal with or lose resources) |
| Old Stoneface | Quarry 20 stone | Rubble tiles block until cleared |

Boss window: 1 full season (10 turns). Boss rewards scale by year: `200◉ × year_number`.

**Weather events** (1–3 turns): roll each season unless a boss is active.

| Weather | Effect |
|---|---|
| Rain | Berry tiles yield 2× |
| Harvest Moon | Chains produce 1 extra upgrade |
| Drought | Wheat and grain spawn 50% rarer |
| Frost | Tile collapse animation is slower (purely visual) |

---

## 10. Economy

### Market Prices

| Resource | Sell | Buy |
|---|---|---|
| Hay | 0◉ | 40◉ |
| Wheat | 2◉ | 60◉ |
| Grain | 4◉ | 80◉ |
| Flour | 6◉ | 100◉ |
| Log | 2◉ | 60◉ |
| Plank | 4◉ | 80◉ |
| Beam | 7◉ | 110◉ |
| Berry | 3◉ | 70◉ |
| Jam | 5◉ | 90◉ |
| Egg | 3◉ | 70◉ |
| Stone | 1◉ | 50◉ |
| Cobble | 3◉ | 70◉ |
| Block | 6◉ | 100◉ |
| Ore | 3◉ | 70◉ |
| Ingot | 6◉ | 100◉ |
| Coal | 2◉ | 60◉ |
| Coke | 4◉ | 80◉ |
| Gem | 7◉ | 120◉ |
| CutGem | 14◉ | 200◉ |
| Gold | 5◉ | 100◉ |

### Supply Chain (Mine Entry)

Grain → Kitchen building → Supplies → Mine session entry.  
Conversion: 3 Grain = 1 Supply. Mine entry costs 3 Supplies.

---

## 11. Buildings

All buildings are persistent. Once built they are always active.

| ID | Name | Cost | Level | Effect |
|---|---|---|---|---|
| hearth | Hearth | pre-built | 1 | Core story building; lights the vale |
| mill | Mill | 200◉ + 30 plank | 1 | Unlocks flour production |
| bakery | Bakery | 500◉ + 40 plank + 10 stone | 1 | Crafting station (bread recipes) |
| inn | Inn | 400◉ + 20 plank | 2 | Unlocks hiring Pip and Tuck |
| granary | Granary | 300◉ + 20 plank | 1 | Unlocks hiring Hilda; increases inventory cap |
| larder | Larder | 700◉ + 30 plank + 20 stone | 3 | Crafting station (preserve recipes) |
| forge | Forge | 1200◉ + 60 stone + 20 ingot | 8 | Crafting station (metalwork recipes) |
| caravan_post | Caravan Post | 800◉ + 40 plank | 8 | Unlocks the Market screen |
| kitchen | Kitchen | 400◉ + 20 plank | 3 | Converts grain → supplies for Mine entry |
| housing | Housing Block | 300◉ + 25 plank | 2 | Produces 1 Worker per season |
| powder_store | Powder Store | 600◉ + 30 stone + 5 ingot | 5 | Produces 2 Bombs per season end |
| portal | Magic Portal | 2000◉ + 5 runes | 10 | Spend Influence to summon magic tools |
| workshop | Workshop | 500◉ + 20 plank + 10 stone | 4 | Craft tools from resources |

### Crafting Recipes

| Recipe | Station | Inputs | Output |
|---|---|---|---|
| Bread Loaf | Bakery | flour×3 + egg×1 | Bread |
| Honey Roll | Bakery | flour×2 + egg×1 + jam×1 | Honey Roll |
| Harvest Pie | Bakery | flour×2 + jam×1 + egg×1 | Pie |
| Preserve | Larder | jam×2 + egg×1 | Preserve |
| Tincture | Larder | berry×3 + jam×1 | Tincture |
| Hinge | Forge | ingot×2 + coke×1 | Hinge |
| Cobble Path | Forge | stone×5 + plank×2 | Cobble Path |
| Lantern | Forge | ingot×1 + coke×1 + plank×1 | Lantern |
| Gold Ring | Forge | gold×1 + ingot×2 | Gold Ring |
| Gem Crown | Forge | cutgem×1 + gold×2 | Gem Crown |
| Iron Frame | Forge | beam×2 + ingot×1 | Iron Frame |
| Stonework | Forge | block×2 + coke×1 | Stonework |

---

## 12. Worker System

Workers permanently reduce tile-to-resource thresholds. They are hired once and their effect is always active. All hires cost 1 Worker (generic unit from Housing) + specific goods.

### Effect Model

Each worker's entry in the data shows the **maximum effect** — the effect when the worker's slot is completely filled. Per-hire effect = `max_effect ÷ max_count`.

**Effect types:**
- `threshold_reduce`: Reduces the chain threshold for a resource
- `pool_weight`: Increases spawn weight of a resource in the board pool
- `bonus_yield`: Adds extra collected units per chain of that type
- `season_bonus`: Passive per-season inventory addition (coins or resources)

**Display:** Show max slot count as a plain number, e.g. "3" (not "3/3").

### Farm Workers

| Worker | Max | Effect (fully hired) | Hire Cost |
|---|---|---|---|
| Hilda (Farmhand) | 3 | Hay threshold 6 → 3 | 1 Worker + 6 Hay + 8 Bread |
| Pip (Forager) | 2 | Berry spawn weight +2 | 1 Worker + 4 Berry + 4 Bread |
| Wila (Cellarer) | 2 | Jam +2 bonus yield per chain | 1 Worker + 6 Jam + 4 Bread |
| Tuck (Lookout) | 1 | +30 coins per season | 1 Worker + 10 Bread |
| Osric (Smith) | 2 | Ore threshold 6 → 4 | 1 Worker + 4 Ingot + 8 Bread |
| Dren (Miner) | 2 | Stone threshold 8 → 6 | 1 Worker + 6 Stone + 6 Bread |

### Mine Workers (Phase 9)

Workers for Mine resources follow the same model; data in `src/features/apprentices/data.js`. Full mine worker catalog (Canary, Geologist, +others from REFERENCE_CATALOG §9) is deferred to Phase 9 (Mine Biome) — they ship together with the cavern board, hazards, and Mysterious Ore so the mine biome lands as one playable horizontal slice.

### Worker Wage

Workers cost a wage per season (deducted at `CLOSE_SEASON`). If coins are insufficient, production pauses this season but the worker is **not fired** — the debt rolls over. Worker is re-activated next season if the player can cover wages.

| Worker | Wage |
|---|---|
| Hilda | 15◉/season |
| Pip | 12◉/season |
| Wila | 20◉/season |
| Tuck | 20◉/season |
| Osric | 40◉/season |
| Dren | 25◉/season |

---

## 13. Species System

Every tile type is a **species** with discoverable traits and an active/inactive toggle. Only **1 species per category** may be active simultaneously.

### Discovery Methods

| Method | How |
|---|---|
| Chain discovery | Making a long chain of the prerequisite species auto-discovers the next in the tree |
| Research | Accumulate a cumulative total of a resource across sessions (shown as %) |
| Direct buy | Pay coins immediately to skip research |

### Active Toggle

- Only 1 species per category is active at session start.
- Swapping active species deactivates the previous one in that category.
- Inactive species do not appear in the board tile pool.

### Free Moves (Farm)

Chaining a free-move species grants extra turns that do **not** consume the session turn counter.

| Species | Free Moves per Chain |
|---|---|
| Turkey | +2 |
| Clover | +2 |
| Melon (buy-only) | +5 |

### Farm Species Unlock Tree

```
Grass category:   Hay (default) → [Meadow Grass: chain 20 hay] → [Spiky Grass: research 50]
Grain category:   Wheat (chain-discover from hay) → Grain (research 30 wheat) → Flour (research 50 grain)
Wood category:    Log (default) → Plank (chain-discover) → Beam (research 30 plank)
Berry category:   Berry (default) → Jam (chain-discover)
Bird category:    Egg (default) → Turkey (research 20 egg) → Clover (buy: 200◉)
```

---

## 14. NPCs, Orders & Mood

### NPCs

5 named NPCs live in the vale. Each gives orders, receives gifts, and has a bond level that modifies order rewards.

| NPC | Role | Favorite Gift |
|---|---|---|
| Mira | Baker | Flour |
| Old Tomas | Beekeeper | Jam |
| Bram | Smith | Ingot |
| Sister Liss | Physician | Jam |
| Wren | Scout | Plank |

### Mood & Bond

- Bond starts at **5 (Warm, ×1.00 reward modifier)** for all NPCs.
- Bond increases via: delivering orders (+0.3), giving favorite gift (+0.5), giving any gift (+0.2).
- Bond decreases: −0.1 per season if bond > 5 (slow decay back to baseline for neglect).
- Below 5: no decay — the floor is Warm.

**Bond bands:**

| Bond | Name | Order Modifier |
|---|---|---|
| 1–4 | Sour | ×0.70 |
| 5–6 | Warm | ×1.00 |
| 7–8 | Liked | ×1.15 |
| 9–10 | Beloved | ×1.25 |

### Orders

3 active orders at all times. One order slot per NPC (no duplicate NPCs across the 3 slots). Orders request resources or crafted items. Fulfilling an order pays coins and increases bond.

Order reward modifier from bond is displayed on each order card (e.g., `+135◉ ×1.25`).

---

## 15. Story & Win Condition

### Story Arc Overview

Hearthwood Vale was a thriving settlement that fell into ruin. The player is its new caretaker.

#### Act 1 — First Light (Levels 1–3)

- The Hearth is cold. **Wren** finds you at the abandoned vale.
- Trigger: Collect 20 Hay → Light the Hearth.
- Beat: **Mira** arrives when the Hearth is lit. Tutorial for orders.
- Task: Bake the first Bread Loaf. Mira teaches crafting.
- Beat: **Old Tomas** arrives and asks for Jam.
- Milestone: Build the Mill. The vale is no longer starving.

#### Act 2 — Roots (Levels 4–8)

- **Bram** arrives. He needs a Forge.
- Task: Build the Forge. Craft your first Iron Hinge.
- Beat: A harsh winter — Bram warns about **Frostmaw** (boss intro).
- Task: Survive the Frostmaw boss event (30 logs in 1 season).
- Milestone: Build the Inn. Pip and Tuck can now be hired.
- **Sister Liss** arrives. She needs Berries for medicine.
- Beat: Liss heals a sick child using your Berries.

#### Act 3 — Seasons (Levels 9–15)

- **Wren** discovers the Mine entrance (Mine biome unlocked narratively).
- Task: Gather Stone + Coal to open the Mine.
- Beat: The Caravan Post opens. Far markets become accessible.
- Milestone: Complete all 8 buildings.
- Beat: Harvest Festival announced.
- **Win condition:** Collect 50 each of Hay, Wheat, Grain, Berry, Log → fill the festival larder.
- Credits → sandbox mode continues with `isWon: true`.

### Story State

Tracked via `storyAct`, `storyBeat`, and `storyFlags` object. Story beats check for: resource counts, buildings built, crafts completed, orders delivered, boss victories.

---

## 16. Quests & Almanac

### Daily Quests (per season)

6 quest slots reset each season. Each quest: a resource/crafting target, a coin + XP reward, and a progress bar. Fulfilled by playing normally.

### Almanac

10 progression tiers with increasing XP requirements. Tier rewards include tools, coins, and at Tier 5 a structural reward (permanent extra starting tool or +1 daily quest slot). Tiers 6–10 include crafting blueprints and cosmetic unlocks.

### Daily Login Streak

| Day | Reward |
|---|---|
| 1 | 25◉ |
| 2 | 50◉ |
| 3 | 1 Seedpack tool |
| 4 | 75◉ |
| 5 | 1 Lockbox tool |
| 7 | 150◉ + 1 Reshuffle Horn |
| 14 | 300◉ + 1 Rune |
| 30 | 1000◉ + 3 Runes |

---

## 17. XP & Levelling

Linear XP curve: every level costs the same amount of XP (`XP_PER_LEVEL = 150`).

XP earned by: completing chains (1 XP per chain), fulfilling orders (5 XP), building buildings (10 XP), boss victories (25 XP), claiming quest rewards (20 XP each).

Target: reach level 2 within approximately 1 session of normal play.

---

## 18. Locked Design Decisions

| Topic | Decision |
|---|---|
| Win condition | Story-based — 3-act arc ending in Harvest Festival |
| Chain upgrade model | Per-resource threshold; endpoint spawning only |
| Upgrade cap | None — upgrades limited only by available tiles |
| Stars (★) | Not implemented |
| HUD modifier | Not implemented |
| Free move trigger | Chaining the species (not just having it active) |
| Active species limit | 1 per category at session start |
| Magic Portal summons | Player choice, not random draw |
| Field state saving | Yes — Silos/Barns preserve tile layout between sessions |
| Boss window | 1 season (10 turns), not 5 seasons |
| NPC starting bond | 5 (Warm, ×1.00) — mood is a bonus layer, not a tax |
| Apprentice wages | Balanced so resource value covers wage at fair-market rate |
| Worker effect model | Max effect = fully hired; per-hire = max ÷ max_count |
| Worker display | Show max count as plain number, e.g. "3" not "3/3" |
| Worker on missed wage | Pause production (debt rolls over); no auto-fire |
| Priority order | Farm first, Mine second, Sea much later |
| Realm tier | Based on number of towns/zones owned |
| Daily login | Present with escalating rewards |
| XP scaling | Linear (150 XP/level) |
| Worker unit | From Housing buildings (1/season) + IAP stub |
| Bombs | From Powder Store building (2/season) |
| Architect / Archaeologist | Omit |
| Stars (★ score) | Omit for now |
| Envelope icon | Skip |
| Sea biome | Deferred — only after Mine is polished and high-value |

---

## 19. Open Questions

| # | Question |
|---|---|
| 1 | Potions — exact source building TBD |
| 2 | Swamp tile behavior + spread rules TBD |
| 3 | Castle contribution system ("Castle Needs: N") TBD |
| 4 | Free move cap — can multiple free-move species stack? (Assume no cap for now) |
| 5 | Species research — is progress global (yes) or per-session? |
| 6 | Boss victory reward pool — exact reward items beyond coins? |
| 7 | Sandbanks, Barrels — deferred with Sea biome |
