# Game Mechanics Reference

*Synthesized from reference game screenshots (sets 1–5). Each section explains what a
system does and how it connects to others. Open questions are marked `[GAP]`.*

---

## 1. Core Loop

The game is a **farming/city-builder wrapped around a tile-matching puzzle**. The puzzle
produces resources; resources build the town; the town unlocks better puzzle options; repeat.

```
Play puzzle board
    → collect resource tiles
    → resources enter inventory
    → spend resources on buildings / workers / tools / quests
    → buildings/workers improve future puzzle sessions
    → new puzzle sessions unlock more resources and discoveries
```

Every other system is either a way to improve this loop or a way to track progress through it.

---

## 2. Currencies

There are at least four distinct currencies, each with different sources and sinks:

| Currency | Icon | How you earn it | What you spend it on |
|---|---|---|---|
| **Gold coins** (◉) | Gold coin with pickaxe | Selling resources, quest rewards, milestone rewards | Buildings, tools, buying resources, crafting |
| **Runes** | Blue diamond | Castle passive timer (~1 per 23h), quest rewards | Mine session entry, building certain structures |
| **Crowns** | Gold crown | Quest completion, trophy rewards | [GAP — not clearly shown being spent] |
| **Stars** (★) | Gold star | Using tools on puzzle board | [GAP — prestige/score only, or spendable?] |

**Coin economy note:** The sell/buy asymmetry is extreme (Hay: sell 1◉, buy 40◉). This
means selling resources is almost never worth it — inventory is for building and questing,
not trading. The buy price exists as an emergency option, not a normal path.

**Rune economy note:** Runes drip in passively from the Castle (very slowly — 1 per ~23h
base, reducible by building Beach and similar properties). They're a premium gate on mine
access and certain buildings.

`[GAP]` What crowns are spent on. They appear as trophy/quest rewards but no spend UI is
visible in the screenshots.

`[GAP]` Whether stars are purely cosmetic session scores or feed into a persistent ranking.

---

## 3. Puzzle Board (The Farming Session)

### What it is
The primary gameplay: a board of tiles the player chains together. The codebase already
implements this (drag 3+ matching tiles → collect them → board collapses).

### Session setup
Before entering, the player sees a **"Let's go farming!" modal** showing:
- Which tile types will appear this session (10 slots, 2 rows of 5)
- Whether any tile is marked **rare** (magnifying glass badge — these are harder to find
  and likely tied to Compendium discovery)
- Option to use a **×2 resource bag** (consumable, doubles yield for the session)
- Entry cost: coins + a date/turn counter

### What tiles produce
Each tile type corresponds to a resource category:
- Grass → Hay (after processing)
- Wheat → Grain/Bread (after processing)
- Carrot/Apple/Vegetables → Vegetable goods
- Tree → Wood → Planks (after processing)
- Birds (Turkey, Chicken) → Eggs, Meat
- Animals (Pig, Cow, Yak) → Meat, Milk, higher-tier goods

`[GAP]` Exactly how raw tiles become processed goods (is it automatic or does it happen
at specific buildings like the bakery?).

`[GAP]` What the calendar number (e.g. "16") on the entry cost means — whether it's a
season/turn limit, a countdown, or something else.

### Tile rarity and discovery
- The magnifying glass badge marks tiles as **rare/discoverable** — collecting them in
  sufficient quantities (particularly in long chains) triggers Compendium discovery of new
  entities in that category.
- The Compendium entity detail says "Gives a chance to find: [icon] Start by collecting
  long chains." — so discovery probability scales with chain length, not just collection.

---

## 4. The Mine Session

### What it is
A second puzzle mode, separate from farming, accessed from mine buildings on the map.
Produces higher-value resources (metal bars, gems, runes).

### Session setup
The **mine modal** shows:
- A **chain progress tracker** at the top (dots = stages in this session; as you complete
  chains, dots fill and you advance toward rarer resource tiers)
- Current goods inventory with per-unit sell values (shows what you already have)
- Three entry paths:
  1. **Free** ("Let's dig") — uses standard shovel tools from inventory
  2. **Coin + tools** (100◉ + 10 shovels) — better entry conditions
  3. **Rune** (2 runes) — premium, likely best rewards or unlimited shovels

`[GAP]` What the chain tracker stages represent — does advancing stages unlock rarer
mineral tiers, or does it track session time/turns?

`[GAP]` Whether free entry is always available or requires owning at least 1 shovel.

### Mine resources
Dirt → Coal → Gravel → Metal bars → (presumably gems/runes at higher tiers). These are
distinct from farm resources and required for mine-specific buildings and tools.

---

## 5. The Worker System

### What workers do
Workers permanently reduce the **input-to-output ratio** for a specific conversion. They
don't produce resources automatically — they make the player's manual collection more
efficient.

Each worker type targets one conversion:
- **Reaper**: grain needed to make bread (reduces by 1 per hire, e.g. "Now: 9 grain = 1 bread")
- **Peasant**: grass needed to gather hay (reduces by 8 per hire, e.g. "Now: 47 grass = 1 hay")
- **Lumberjack**: trees needed to gather wood (reduces by 1 per hire, e.g. "Now: 6 trees = 1 wood")
- **Poultryman**: birds needed to gather eggs (reduces by 1 per hire, e.g. "Now: 8 birds = 1 egg")

### Hiring mechanics
- Workers have a max hire count (1–3 seen across types).
- Each hire costs: a base worker unit count + specific resources (varies by worker type).
- Some hires are **locked** despite having resources — there's a hidden prerequisite (level?
  building? prior hire?).
- The **"Now: X = 1"** formula in the detail panel updates live to show the current ratio
  before committing.

### How this connects
Workers make every future puzzle session more efficient — the same number of tiles produces
more goods. This is the primary long-term progression multiplier. Workers are more valuable
than tools because tools are consumable but workers are permanent.

`[GAP]` Whether the input-to-output ratio has a floor (can you reduce it to 1:1 or even
better?), and what happens at max hires.

`[GAP]` What the "base worker unit" resource represents — it appears as a worker-character
icon with a count (e.g., 4/1 = "need 1, have 4"), implying workers-as-resource, which
suggests some mechanic produces or hires generic workers separately.

---

## 6. The Tool System

### What tools do
Tools are **single-use consumables** played during a puzzle session. Each tool clears an
entire category of tiles from the board in one action, and awards prestige stars.

The key design: tools trade consumable inventory for a board-state shortcut. A Rake
collects **all** grass tiles at once instead of chaining them manually.

### Tool categories and their mechanics

**Board-clearing tools** (regular, craftable or purchasable):
| Tool | Clears | Stars |
|---|---|---|
| Rake | All grass tiles | +10★ |
| Shovel | All dirt tiles | +10★ |
| Axe | All tree tiles | +20★ |
| Hoe | All vegetable tiles | +30★ |
| Herder's Crook | All herd animal tiles | +30★ |
| Magic Wand | All tiles of a chosen type | +200★ |
| Hourglass | Undoes last move | +200★ |

**Board-transforming magic tools** (portal-only, higher power):
| Tool | Effect | Stars |
|---|---|---|
| Golden Carrot | Transforms all grass tiles into vegetables | +200★ |
| Metal Mirror | Transforms all metal tiles into rocks | +200★ |
| Magic Seed | Doubles the length of the current farming session | — |

### Two acquisition paths
- **Regular tools**: craft from goods (e.g., 11 wood + 19 bread for a Hoe) OR buy with
  coins (60◉). Some only have "Buy More" with no craft recipe.
- **Magic tools**: locked to the "portal" — this is the Sorceress's Hut (watch ads) or IAP.
  They cannot be crafted. Portal mechanic is the only access.

### Inventory cap
Each tool has a max stack (e.g., Rake: 5, Axe: 5, Hourglass: 1). Quantity can exceed the
cap (e.g., Axe showing 7/5) — overcapped items can be used but not restocked until below cap.

`[GAP]` When exactly tools are played during a puzzle session — is there a tool button in
the HUD, or are they drag-and-drop onto the board?

`[GAP]` How the Magic Wand "chosen type" selection works — does a type-picker appear?

---

## 7. The Building System

### What buildings do
Buildings in the zone view expand the player's capabilities. Unlike workers (which improve
ratios), buildings **unlock new resource types, session options, or passive effects**.

### Building categories

**Production buildings** — unlock new resource chains:
- Mine: enables mining sessions, produces metal-tier resources

**Capacity buildings** — expand limits:
- House: "+4 new workers" (unlocks hiring more workers)

**Special/unique buildings**:
- Sorceress's Hut: watch ads → earn reward (the "portal" for magic tools)
- Bakery/oven: `[GAP]` — presumably converts grain to bread
- Market/stall: `[GAP]` — presumably enables buying/selling resources
- Windmill: `[GAP]` — presumably processes grain faster

**Decoration buildings** — aesthetic + influence:
- Flowers, bushes, shrubs: award **influence** when built. 
  Example: Violet Flowers — "Gain 20 influence." Built up to 5 copies.

### Building costs
Two patterns:
1. **Resource cost**: show a grid of resource icons with `owned/needed` badges (green = OK,
   red = insufficient). Built with coins or with runes as an alternate path.
2. **Coin-only cost**: single price button (e.g., 100◉ for Sorceress's Hut, 80◉ per flower).

### Influence
Decorations produce **influence** when built. Influence is `[GAP]` — not clearly shown
being spent, but likely feeds into zone development tier or NPC happiness.

### Building in the zone vs. property upgrades
Two separate build systems:
- **Zone buildings** (in the village view) — functional structures bought with resources/coins
- **Properties** (on the world map panel) — territory upgrades that modify global parameters
  (e.g., Beach: castle produces runes 1h faster). These cost large amounts of coins (1500◉).

---

## 8. The Compendium (Discovery System)

### What it does
The Compendium tracks every entity the player has **discovered** during gameplay. It serves
three functions:
1. **Log**: shows what exists in the game world (even undiscovered slots as silhouettes)
2. **Active selector**: lets the player control which entities appear on the puzzle board
3. **Progress tracker**: feeds into the Total Progress counter

### Categories of discoverable things
Entities are grouped into biological categories:
- Plants: Grass (subtypes: Meadow Grass, etc. — 6 total)
- Trees (6 total, e.g., Palm Tree)
- Birds (11 total, e.g., Turkey, Chicken, Pheasant, Crow, Rooster...)
- `[GAP]` Animals (Pig, Cow, etc. — likely a separate category not fully shown)

### How discovery works
- Play long chains on the puzzle board
- Tiles marked with a magnifying glass (rare) are discoverable entities
- Each undiscovered entity in the Compendium shows: "Gives a chance to find: [icon] Start
  by collecting long chains." — implying longer chains = higher discovery probability
- Once discovered, the entity appears full-color and its detail panel unlocks

### The Active toggle
Each entity can be set **Active** or **Inactive**. This is the critical mechanic:
- **Active** entities appear as tile types in future puzzle sessions
- **Inactive** entities are known but don't spawn on the board
- Only a limited number can be active simultaneously per category (implied by the UI showing
  one ✓ and multiple ✗ in the same category)
- This lets the player **specialize** their board — e.g., keep only Chicken active in Birds
  to maximize egg yield, or only Meadow Grass active in Grass to target haystacks

`[GAP]` Whether there's a hard limit on simultaneous active entities per category, or
per session total.

`[GAP]` Whether the active selection persists across sessions or resets.

### Entity traits (3-bullet structure)
Each discovered entity has three traits:
1. **Discovery method**: how to find the next entry ("collect long chains")
2. **Primary production trait**: what this entity is good at and its tradeoff ("great to
   produce eggs, slow to get bonus herd animals")
3. **Personality/quirk**: flavor with possible hidden mechanic ("2 free moves", "Welcomes
   all pilgrims", "Not very courageous")

`[GAP]` Whether the "2 free moves" trait on Turkey and Palm Tree is a literal game mechanic
(player gets 2 undo moves when this entity is active) or purely flavor.

### Collections
A separate subsection of the Compendium tracks **themed item sets** — 5 specific objects
that appear across multiple zones:

- Collections are zone-gated (items only discoverable in certain zones)
- Completing a collection grants a one-time reward (coins or % bonus)
- Items within a collection appear in chests (Field/Mine chests, Sea chests) or are found
  through special puzzle-board interactions

`[GAP]` Exactly how collection items are found — is it the same chain mechanic, or do
they drop from chests specifically?

---

## 9. The Zone / World System

### What zones are
The kingdom is divided into **6 zones + 1 central Castle**. Each zone is a named settlement
with its own:
- Puzzle board (farm, mine, or sea-based)
- Set of buildings to construct
- Set of NPCs
- Set of discoverable entities and collection items
- Quest givers

### Zone unlock progression
Zones unlock sequentially as the player levels up. At early levels only Zone One (and
presumably the Castle) is accessible. By Level 71, all 6 zones are open with "!" markers.

### What you do in a zone
Within a zone, the player can:
- Enter a **puzzle session** (farming or mining) to collect resources
- **Build buildings** (using resources) to expand the zone
- **Interact with NPCs** (getting quests, hiring workers)
- Tap buildings to see their tooltip and upgrade/build options

### The Castle
The Castle is a central hub, not a zone. It:
- Generates runes passively on a timer (~1 per 23h)
- `[GAP]` Presumably provides quests or is the main quest hub
- Timer can be shortened by building territory properties (e.g., Beach: −1h)

### Zone progression signals
The zone view shows several indicators of pending actions:
- Yellow "!" over buildings = a quest or interaction is available
- Golden crown icon = a reward is ready to collect
- Animal speech bubble (goat/cow face) = a specific animal-related action is pending
- Highlighted item in the bottom bar (wheat icon on haystack) = a tile type is available
  to enter and collect

### Sea zones
Zone Six and the Shipwreck settlement involve ocean/sea content. The Sea Chest mechanic
(draw a line → navigate ship to the chest) implies some zones have **ship navigation** as
a puzzle variant rather than or in addition to tile-matching.

`[GAP]` How the sea puzzle board works — is it a modified tile grid with water tiles, or
a completely different gameplay mode?

---

## 10. The Quest System

### What quests do
Quests give the player **specific resource collection goals** and reward crowns. They also
provide narrative framing (the Manual) for why the player needs those resources.

### Quest structure
Each quest:
- Is given by an NPC (shown as their portrait with a resource in a speech bubble)
- States a collection target: "Collect N (M left)" — M decrements as the player collects
- Rewards crowns on completion (+90◉ in examples)
- Multiple quests run simultaneously (at least 2 shown at once)

### The Manual
The right page of the Quests tab shows a **named story NPC** (a governor, merchant, etc.)
giving narrative context for the current quest batch. This is flavor — it explains *why*
these resources are needed right now (birthday party, seasonal event, etc.).

### Quest-trophy connection
Trophies reference the same collection actions as quests: "Find new plant: Corn" is both
a trophy condition and the kind of thing a quest might ask for. The two systems reinforce
the same player actions.

`[GAP]` Whether quests refresh on a timer, require player action to accept, or are
auto-assigned when the previous batch is completed.

`[GAP]` Whether crowns from quests are meaningful (see Currency gaps above).

---

## 11. The Trophy / Achievement System

### What trophies do
Trophies are **one-time milestones** that reward the player for reaching specific game
events. They are NOT repeatable — each has a single condition and a single reward.

### Tier structure
Trophies are grouped into metal tiers (Wooden, Tin, and presumably higher). Tiers unlock
sequentially — you likely must complete most of Wooden before Tin becomes accessible.

### Trophy conditions (types seen)
- **Discovery trophies**: "Find new plant: Corn" — tied to Compendium discovery
- `[GAP]` What other condition types exist (milestone counts, building construction, etc.)

### Partial progress
Silhouette trophies show a percentage (e.g., 50%, 61%) indicating how far along the player
is toward the unlock condition — without revealing what the condition is. The condition
only appears when you tap the trophy to read its detail.

### Reward
Each trophy gives a fixed crown reward (+50◉ per crown in examples). Since trophies are
one-time, they function as a long-tail drip of currency for engaged players.

---

## 12. The Records / Statistics System

### What it tracks
Cumulative action counters across the player's entire history:
- Visits to the fields (puzzle sessions played at farm zones)
- Visits to the mine (sessions at mine zones)
- Moves on the fields (total tile collections in farm sessions)
- Moves in the mine (total tile collections in mine sessions)

### Milestone rewards
Each counter has a target value. When reached, it pays out a coin reward (e.g., +20◉ for
reaching 250 field moves). The row highlights green and shows a collect button. After
collection, the counter presumably resets to track toward the next milestone.

### Kingdom Summary
The right side of the Records tab shows a snapshot of the player's realm:
- Total codex progress (e.g., 8/224 entries discovered)
- Realm tier ("is a fief" — implies progression tiers for the kingdom title)
- Building/town/worker counts, vault contents, discovery counts
- This is auto-generated from live game state — a dynamic "about my kingdom" card

`[GAP]` What "Total Progress: N/224" counts exactly — all compendium entries + all
trophies + all collections combined? Or just compendium?

`[GAP]` What the realm tiers are above "fief" and what unlocks them.

---

## 13. Session Economy & Progression Pacing

### How a session generates progress

One farm puzzle session produces:
- Raw resources (grass, grain, trees, birds, animals) based on tiles chained
- Potentially a **rare discovery** if long chains were played on a rare tile type
- Stars if tools were used
- Advance toward milestone counters

The **Active entity selection** (Compendium) and **Worker upgrades** together determine
the yield profile of each session. A specialized setup (only one active entity type +
relevant worker maxed out) produces vastly more of a specific good than a generic setup.

### Bottlenecks
- **Runes**: trickle in at ~1/23h base. Building Beach reduces this. Runes gate mine access
  and some buildings — they're the primary "wait or pay" mechanic.
- **Worker prerequisites**: some workers are locked even when you have resources. The
  hidden prerequisite (likely a building, e.g., must have House built before hiring) creates
  a dependency order that prevents rushing.
- **Collection zone-gating**: collection items only drop in specific zones. To complete
  Magnificent Feathers you must unlock and visit Zone Three, Five, and Six — so collection
  completion is tied to zone progression, not just play time.

---

## 14. IAP / Monetization Layer

### What you can buy
Two categories:
1. **Direct resources**: bundles of coins, workers, runes, magic tools — accelerate
   existing progression without changing the rules
2. **Permanent multipliers**: tools limit ×2, challenges ×2, bonus frequency ×2 — change
   the game's caps and rates permanently for the account

### The "portal" / Sorceress's Hut connection
Magic tools (Golden Carrot, Metal Mirror, Magic Seed) can only be obtained through:
- The Sorceress's Hut (watch ads — earns one tool per watch)
- IAP ("Magic tools for the farm" bundle: 20 resource bags + 1 wand for $2.99)

This means the ad-watch building is the free-to-play path to magic tools, and IAP is
the skip. The building must be constructed first (100◉) before the player can watch ads.

### Social reward
5 runes can be earned by "Liking" on Facebook — a free once-only reward gated on social
action rather than real money.

`[GAP]` Whether the "Bonuses 2× more often" upgrade means building bonuses (influence
drops) or some other bonus type.

`[GAP]` What "2× more challenges" means — whether challenges are a separate content type
not clearly shown in the screenshots.

---

## 15. Open Questions Summary

The following mechanics are referenced in the UI but not fully explained by the screenshots.
These are the gaps to fill with either more screenshots or design decisions:

| # | Gap | Where it appears |
|---|---|---|
| 1 | What crowns are spent on | Currency earned from quests/trophies, no spend UI seen |
| 2 | What stars (★) feed into | Tool use gives +10 to +200★; no spend or leaderboard UI seen |
| 3 | How raw tiles become processed goods | Farm session produces grass → is hay automatic or via building? |
| 4 | What influence does | Decoration buildings drop it on build; no spend UI seen |
| 5 | What "2 free moves" means on Turkey/Palm Tree | Entity trait — literal undo mechanic or flavor? |
| 6 | Active entity hard limit per category | Can you have 3 active birds, or only 1? |
| 7 | Sea puzzle mechanics | Ship navigation + sea tiles — same board or different mode? |
| 8 | How collection items are found | Chests only, or also chain-based discovery? |
| 9 | Chain tracker stages in mine modal | What each dot/stage represents |
| 10 | Calendar number on farm session entry | "16" — turn count, date, or season progress? |
| 11 | Quest refresh / acceptance mechanic | Auto-assigned or player-triggered? |
| 12 | Worker prerequisite lock condition | What unlocks the locked Hire button? |
| 13 | What "Total Progress: N/224" counts | All systems combined, or compendium only? |
| 14 | Realm tier progression above "fief" | What titles exist and how they unlock |
| 15 | What challenges are (the "2× more challenges" IAP) | A content type not shown in screenshots |
| 16 | Free mine entry requirements | Does "Let's dig" always work or need shovels? |
| 17 | Whether "+0%" / "+16%" HUD modifier is mood/bond | Visible in HUD — what it multiplies |
| 18 | Whether stars are purely session score | Do they accumulate? Are they shown on leaderboards? |
| 19 | What the envelope icon on Pioneer Tools collection means | A mail/delivery reward type? |
| 20 | How Sea Chests reward differs from Field Chests | Different loot tables? |
