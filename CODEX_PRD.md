# Codex System — PRD (Picture Set 1)

*Reference screenshots: 5 images from a "New Puzzlonia"-style farming/puzzle game showing
a dual-page book UI accessible from a left-side icon bar.*

---

## Overview

A persistent in-game **Codex** (book modal) surfaces three distinct player-facing systems,
each occupying its own tab in a left icon bar and rendered as a two-page open book:

| Tab icon | Section | What it shows |
|---|---|---|
| Puzzle piece | **Compendium** | Discoverable entities (plants, animals) by category |
| Bookmark | **Records** | Milestone statistics + kingdom summary |
| Trophy cup | **Trophies** | Tiered achievement trophies |

The left page of the book is always a scrollable grid/list. The right page is a contextual
detail view that updates when the player taps any item on the left.

---

## 1. Trophy System

### 1a. Trophy Tiers

Trophies are grouped into named metal tiers that unlock sequentially:

- **Wooden Trophies** — entry tier, example count: 11 total
- **Tin Trophies** — next tier, example count: 9 total
- (Additional tiers implied by design: Bronze, Silver, Gold, etc.)

Each tier is labeled with a header and a `earned/total` counter (e.g. `4/11`).

### 1b. Trophy Grid (left page)

- Earned trophies render as **full-color trophy icons**.
- Unearned trophies render as **tan silhouettes**.
- A silhouette can show a **percentage badge** (e.g. `50%`, `61%`, `40%`, `3%`) indicating
  partial progress toward the unlock condition.
- Trophies are laid out in a 5-column grid, rows wrapping across tiers.
- A small **red down-arrow** marker appears above the currently selected trophy.

### 1c. Trophy Detail (right page)

Tapping any trophy shows:

```
[Large trophy icon — full color if earned, silhouette if not]

[Trophy name]          ← e.g. "Popcorn"

[Challenge description] ← e.g. "Find new plant: Corn"

Reward:
  +50 [crown icon]
```

- **Trophy name** is displayed in large serif text at top.
- **Challenge description** is a single sentence describing exactly what unlocks it.
- **Reward** is always expressed as a quantity + currency icon (crown in these examples).

### 1d. Design Notes

- The percentage on silhouettes lets players know which trophies they're close to without
  revealing the exact condition (the condition is on the detail page).
- Trophies that reference discovery ("Find new plant: Corn") tie the Trophy system directly
  to the Compendium, creating cross-system motivation.

---

## 2. Records System (Statistics + Kingdom Summary)

### 2a. Milestone Statistics (left page)

The left page lists **cumulative action counters**, each with a milestone track:

| Stat label | Example value | Goal | Reward |
|---|---|---|---|
| (unlabeled, first row) | — | — | +10 pickaxe-coins |
| Visits on the fields | 22 / 400 | 400 | +50 pickaxe-coins |
| Visits in the mine | 4 / 10 | 10 | +20 pickaxe-coins |
| Moves on the fields | 255 / 250 | 250 | +20 pickaxe-coins |
| Moves in the mine | 41 / 200 | 200 | +20 pickaxe-coins |

**Visual treatment:**
- Each stat row has a label (`"Visits on the fields: 22/400"`) in large bold text, with the
  current value in **green** when in progress, and presumably a different state when done.
- Below the label is a row of **5 flag milestone icons**; flags fill left-to-right as
  progress accumulates; each flag represents ~20% of the goal.
- The reward coin amount sits to the right of the flag row.
- A **completed milestone** row is highlighted with a **green background** and the reward
  button becomes a prominent green pill (e.g. `+20 [pickaxe-coin]`), indicating the player
  can or did collect it.

### 2b. Kingdom Summary (right page)

The right page shows a high-level summary of the player's realm:

```
Total Progress: 8/224           ← aggregate across all codex entries

[Emblem / shield badge]         ← decorative crest with tools and wheat

New Puzzlonia                   ← kingdom name
is a fief                       ← realm type (tier label)

Its vast and rich lands boast 20 buildings in 2 towns, and 4 skilled
workers. Its vaults hold 1820 gold, 12 runes, 111 assorted goods and
23 tools.

According to the scholars, there are 6 known plants and 3 known
animals living in the country's [lands].
```

**Key fields:**

| Field | Example |
|---|---|
| Total Progress | 8 / 224 (all discovered entries across entire codex) |
| Realm type | "is a fief" (progression tier) |
| Buildings | 20 |
| Towns | 2 |
| Workers | 4 |
| Gold | 1820 |
| Runes | 12 |
| Assorted goods | 111 |
| Tools | 23 |
| Known plants | 6 |
| Known animals | 3 |

- The "scholars" flavor text auto-generates from live game state, keeping the summary fresh.
- The `Total Progress: N/224` counter is a single global discovery counter spanning both
  the Compendium and Trophies, giving players a meta-completion goal.

---

## 3. Compendium System

### 3a. Category Organization (left page)

Discovered entities are grouped into named **categories** with an icon and `found/total`
counter:

```
[Category icon] Grass ................. 2/6
[Category icon] Birds ................. 2/11
```

- Each category is a collapsible or stacked section.
- Items within a category appear in a **5-column grid**.
- **Discovered items** render as full-color illustrations.
- **Undiscovered items** render as tan silhouettes.

### 3b. Discovery Status Badges

Each item in the grid can carry one of two small overlay badges:

| Badge | Appearance | Meaning |
|---|---|---|
| Active | Green circle with white ✓ | This entity is currently active in the world |
| Inactive | Blue circle with white ✗ | This entity exists but is not currently active |
| None | — | Not yet discovered (silhouette only) |

Some items additionally carry a **gold crown-shield icon** (visible on certain birds/rows),
suggesting a rare or special-tier variant.

### 3c. Entity Categories Seen

**Plants:**
- **Grass** (2/6) — contains items like Meadow Grass

**Animals:**
- **Birds** (2/11) — contains Turkey, Chicken, and 9 undiscovered variants

### 3d. Entity Detail View (right page)

Tapping any discovered item opens its detail on the right page:

```
[Category icon]  [Entity Name]          ← header
                                        ← dotted separator line
[Farmer portrait]  [Entity illustration]    Active: [✓ or □]

• Gives a chance to find: [icon]
  [Discovery hint text]

• [Primary trait — benefit or behavior]

• [Personality/quirk trait]
```

**Examples:**

**Chicken**
- Active: ✓ (green)
- "Gives a chance to find: [leaf] Start by collecting long chains."
- "Great to produce eggs, slow to get bonus herd animals."
- "Not very courageous."

**Turkey**
- Active: ☐ (inactive)
- "Gives a chance to find: [leaf] Start by collecting long chains."
- "2 free moves."
- "Welcomes all pilgrims."

**Meadow Grass**
- Active: ☐ (inactive)
- "Gives a chance to find: [leaf] Start by collecting long chains."
- "Great to produce haystacks, slow to get bonus grain."
- "Highly allergenic."

### 3e. Trait Structure (3-bullet pattern)

Every entity detail follows a strict 3-bullet template:

1. **Discovery hint** — always starts with "Gives a chance to find: [icon]" followed by a
   one-line mechanic hint (e.g. "Start by collecting long chains."). This tells the player
   *how* to unlock the next undiscovered entity in this category.
2. **Primary benefit** — describes the main gameplay function this entity provides once
   active (production, bonus, ability).
3. **Personality/flavor** — a short, humorous or atmospheric trait with no direct gameplay
   implication (e.g. "Not very courageous.", "Welcomes all pilgrims.", "Highly allergenic.").

### 3f. Active Toggle

- Each entity can be **Active** or **Inactive**.
- Only one or a small set of entities per category appear to be active simultaneously.
- The Active state presumably determines whether the entity spawns on the game board or
  contributes its bonuses to the active session.
- The toggle is displayed prominently in the detail view and reflected by the badge on the
  grid icon.

---

## 4. UI / Navigation Shell

### 4a. Left Icon Bar (tab navigation)

Five icon buttons on the left edge of the book modal:

| Position | Icon | Section |
|---|---|---|
| 1 (top) | Speech bubble | Social / Chat (out of scope for this set) |
| 2 | Puzzle piece (red) | Compendium |
| 3 | Bookmark (orange) | Records / Statistics |
| 4 | Trophy cup (gold, active) | Trophies |
| 5 (bottom) | Gear | Settings (out of scope) |

The active tab is highlighted with its accent color; others are muted.

### 4b. Book Layout

- The modal is styled as an **open book** with two visible pages, parchment texture.
- A red **close button (✗)** sits in the upper-right corner of the right page.
- Section headers use serif text; body text uses a lighter serif/slab.
- Dotted lines separate title from body in detail views.
- Percentage badges on silhouettes use a rounded rect with a dark background over the icon.

### 4c. Cross-system Linking

- Trophy challenges reference Compendium entries ("Find new plant: Corn" → Compendium →
  Plants → Corn is the undiscovered next entry).
- The Kingdom Summary's "known plants / known animals" counters are derived from Compendium
  discovery counts.
- `Total Progress: N/224` aggregates across Trophies + Compendium, unifying all three
  sections under one completion number.

---

## 6. World Map & Location System (Picture Sets 2 & 4)

### 6a. Kingdom Overview Map

A zoomed-out top-down map of the entire kingdom ("New Puzzlonia") with distinct named
locations connected by paths:

| Location | Type | Notes |
|---|---|---|
| Axeter | Main town | Central castle, bakery, market, mine access |
| Shipwreck | Coastal settlement | Beach, wrecked ship landmark, market tent |
| (3+ locked zones) | Future settlements | Gold dashed-circle + padlock until unlocked |

- The bottom bar carries a persistent "New Puzzlonia" banner label with mascot chickens.
- A floating tooltip on tap of the XP bar reads: "Complete challenges and play on puzzle
  boards to gain experience and level up. Gain levels to unlock new buildings."
- Locked zones are encircled by a dashed gold ring; tapping them shows a level requirement.

### 6b. Location View (Zoomed In)

Each location is a distinct isometric village scene:

- **Named signpost** floats above the scene (e.g. "Axeter", "Shipwreck").
- Multiple **buildings** with floating yellow "!" indicators for available actions.
- Roaming **characters** (soldiers, farmers, merchants) as ambient NPCs.
- **Environmental landmarks**: cave entrance, mine, shipwreck, hay piles, magic crystal portal.
- **River / terrain** varies per location (forest, beach/ocean, mountains).
- The bottom bar shows context-sensitive shortcuts that match the location's available actions.

Shipwreck example buildings: market tent, storage barn, yellow house, well, hay storage.
Axeter example buildings: bakery (oven), striped market, small house, dark brewery hut,
paint/dye shop, magic crystal formation, mine entrance.

### 6c. Experience & Level System

- Player level shown in the top-right gold shield badge (e.g. **Level 10**).
- XP earned by: (1) completing challenges, (2) playing puzzle boards.
- Leveling up unlocks new buildings.
- The XP bar in the top-right HUD shows `current/max` (e.g. `616/5000`).

---

## 7. Building & Property System (Picture Sets 2 & 4)

### 7a. Building Shop Panel

A 3×N grid of buildable structures and decorations, same left-panel / right-detail layout
as the Codex but with a **dark brown** background instead of parchment.

**Item states:**
- Quantity badge `0` = not built, `N` = owned count
- Padlock overlay = locked (requires level or prior build)
- White selection border on active item

**Detail panel (right side):**

```
[Item name]                            ← header text, white on dark
[Item thumbnail  |  0/max qty]
[Description of effect]

[Resource requirement grid]            ← only for non-decoration buildings
  [res icon] owned/needed  ...

[Build button]   [N runes button]      ← OR just coin price for decorations
```

For **decorations**, the detail also includes a flavor explanation box:
> "Decorations make everything prettier and, when built, drop influence."

### 7b. Building Catalog (examples)

| Building | Effect | Cost |
|---|---|---|
| Sorceress's Hut | Watch ads to earn a reward | 100◉ |
| Mine | Mine more valuable resources | 13 runes + resources |
| Violet Flowers (decoration) | +20 influence on build | 80◉ (qty up to 5) |
| White Flowers (decoration) | (influence) | ◉ |
| Red / Yellow / Red Bush flowers | (influence) | ◉ |
| Tent/camp | (locked until level N) | — |
| Small house | (locked) | — |

**Mine resource requirements (example):**
- Dirt: 4/4 ✓ (green)
- Coal: 4/14 ✗ (red — player is short)
- Metal bars: 8/8 ✓ (green)

### 7c. Property / Territory Upgrades

A separate panel (accessed from the kingdom map, not the village building shop) for
purchasing **land expansions** that modify passive game parameters:

```
[Left: 2-item grid]   [Right: detail]
  Tower (qty 0)         [Property name]
  Beach (qty 0, sel.)   [Description]
                        [Effect highlight, e.g. "New time: 22 hours"]
                        [Secondary info box: one-time build reward]
                        [Price button: e.g. 1500◉]
```

**Beach example:**
- "You will get runes from the castle 1 hour faster."
- "New time: 22 hours" (highlighted in orange — shows updated value)
- One-time build reward: +1 rune
- Price: 1500◉

**Castle / Rune Timer:** The castle passively generates runes on a real-time cooldown
(base ~23 hours). Each "speed" property built reduces that cooldown by 1 hour. This is
the primary use case for the Property system.

---

## 8. Inventory & Goods System (Picture Set 3)

### 8a. Goods Grid

A 2-row grid (up to ~5 columns wide) of all owned goods, each with a quantity badge.

**Goods seen:**

| Good | Qty (example) | Sell | Buy |
|---|---|---|---|
| Hay | 1 | +1◉ | 40◉ |
| Wood planks | 11 | — | — |
| Bread | 19 | — | — |
| Eggs | 11 | — | — |
| Vegetables (bowl) | 2 | — | — |
| Meat | 0 | — | — |
| Dirt/coal | 4 | — | — |
| Gravel/stone | 4 | — | — |
| Metal bars | 8 | — | — |

### 8b. Good Detail Panel

```
[Good name]

[Large illustration]  qty badge

Sell:
  [+N◉ green button]

Buy:
  [N◉ orange button]
```

- **Sell price** is dramatically lower than **Buy price** (Hay: sell 1, buy 40) — classic
  asymmetric economy to prevent sell-looping.
- The sell button is green (positive action), buy button is orange (cost action).

---

## 9. Tools System (Picture Set 3)

### 9a. Tools Grid

A 3×N scrollable grid of owned tools, each with a `current/max` quantity badge.
The grid uses the same dark brown panel as the Building Shop.

### 9b. Tool Categories

**Regular tools** — craftable with goods and/or purchasable with coins:

| Tool | Effect | Bonus | Max | Craft cost | Buy CTA |
|---|---|---|---|---|---|
| Rake | Collect all grass tiles | +10★ | 5 | 11 wood /1 | Buy More |
| Shovel | Collect all dirt tiles | +10★ | 5 | 11 wood /1 | Buy More |
| Axe | Collect all tree tiles | +20★ | 5 | 8 metal /1 | Buy More |
| Hoe | Collect all vegetable tiles | +30★ | 3 | 11 wood/1 + 19 bread/2 | Craft / 60◉ |
| Herder's Crook | Collect all herd animals | +30★ | 3 | 11 wood/1 + 11 eggs/1 | Craft / 60◉ |
| Hourglass | Undo your last move | +200★ | 1 | — | Buy More |
| Magic Wand | Collect all puzzles of a chosen type | +200★ | 1 | — | Buy More |

Notes on regular tools:
- Tools with `N/max` badge where N > max (e.g. Axe 7/5) are **over-capped** — no new
  buy allowed until stock is consumed below max.
- "Craft" tools show resource requirements in the detail panel; "Buy More" tools do not
  (they are purchased directly or obtained as drops).

**Magic tools** — cannot be crafted; obtained only through the "portal" (Sorceress's Hut
or IAP):

| Tool | Effect | Bonus |
|---|---|---|
| Golden Carrot | Transform all grass into vegetables | +200★ |
| Metal Mirror | Change all metals to rocks | +200★ |
| Magic Seed | A year on the fields lasts twice as long | — |

- Magic tools always show a locked gray padlock + tooltip: *"Magical tools can only be
  summoned through a portal."*
- They do not have a craft recipe or direct buy price in this panel.

### 9c. Tool Detail Panel Structure

```
[Tool name]  (white title on dark)

[Illustration thumbnail]  current/max qty
[Description of board effect]
[+N ★ score bonus]           ← shown for most tools

[Resource cost grid]         ← only for craftable tools
  [res icon] owned/needed

[Craft button]  [N◉ buy button]   ← for craftable tools
[Buy More button]                 ← for stock tools
[Lock icon + portal message]     ← for magic tools
```

The **★ bonus** represents prestige/score points awarded when the tool is *used*, not held.

---

## 10. Worker / Apprentice Hire System (Picture Set 3)

### 10a. Worker Grid

A 2×2 (expandable) grid of hirable worker characters. Each cell shows:
- Worker illustration
- Hire count badge (gray `N` = hired N times; gold badge if at recommended max)

Workers seen:

| Worker | Badge color | Hired | Max |
|---|---|---|---|
| Reaper (green hood, scythe) | gray | 1 | 2 |
| Peasant (pitchfork + sack) | gray | 1 | 3 |
| Lumberjack (red shirt, axe) | **gold** | 2 | 2 |
| Poultryman (white, chicken) | gray | 0 | 1 |

The **gold badge** on the Lumberjack indicates at-max hires.

### 10b. Worker Detail Panel

```
[Worker name]  (white title on dark)

[Illustration thumbnail]  hired/max indicator
[Description of benefit]

Now: [input resource icon] N = [output resource icon] 1

[Resource requirement grid]
  [res icon] owned/needed ...

[Hire button]    (or locked Hire)
```

**"Now: X = 1" formula** — shows the current *conversion ratio* for this worker's specialty,
which decreases with each hire. The player can see the direct mechanical effect of hiring
before committing.

**Worker catalog:**

| Worker | Benefit | Now ratio (example) | Hire cost |
|---|---|---|---|
| Reaper | 1 less grain to make bread | 9 grain = 1 bread | 4 workers + 19 bread |
| Peasant | 8 less grass to gather hay | 47 grass = 1 hay | 4 workers + 2 hay + 19 bread |
| Lumberjack | 1 less tree to gather wood | 6 trees = 1 wood | 4 workers + 11 wood + 19 bread |
| Poultryman | 1 bird less to gather eggs | 8 birds = 1 egg | 4 workers + 11 eggs + 19 bread |

- The Peasant hire button showed a **padlock** icon (locked despite having a Hire button
  label) — implies a prerequisite condition beyond just having the resources.
- Resource badges: green = have enough, **red = insufficient**.

---

## 11. IAP / Store System (Picture Set 2)

### 11a. "Extras and Bundle Packs" Panel

A scrollable two-column grid of purchasable items. Header uses decorative serif text
with ornamental curls. Close button (red ✗) in upper-right.

**Bundles (variable content packs):**

| Item | Contents | Price |
|---|---|---|
| Magic tools for the farm | 20 resource bags + 1 magic wand | $2.99 |
| 10 Workers | 10 worker units | $2.99 |
| 5 Runes | 5 runes | Facebook Like (free) |

**Permanent upgrades (one-time purchase):**

| Upgrade | Effect | Price |
|---|---|---|
| Tools limit ×2 | Double the max stack size for all tools | $4.99 |
| 2× more challenges | Double the number of active challenges | $5.99 |
| Bonuses 2× more often | Building bonuses trigger at half the normal cooldown | $5.99 |
| Unlock 42 more colors | Expands the color palette (for decorations/paint?) | $3.99 |

**Utility:**

| Action | CTA |
|---|---|
| Restore purchases | "Restore" button (circular arrows icon) |

### 11b. UI Details

- Purchase buttons are **green pill buttons** with white bold price text.
- Social reward (Facebook Like → 5 runes) uses a **blue pill button** labeled "Like" with
  the FB logo — free-to-earn via social engagement.
- Each item has a distinctive icon in a starburst/scallop frame to the left of the text.
- The panel scrolls vertically; the top portion shows bundle packs, bottom shows permanents.

---

## 12. Implementation Scope (this codebase)

Existing stubs:
- `src/features/achievements/` → Trophies system (§1)
- `src/features/almanac/` → Compendium system (§3)
- `src/features/cartography/` → World Map system (§6)
- `src/features/crafting/` → Tools crafting system (§9)
- `src/features/inventory/` → Goods inventory (§8)
- `src/features/apprentices/` → Worker/Hire system (§10)

**Full feature checklist (all picture sets):**

### Codex / Book UI (§1–4)
- [ ] **Trophy tiers** — metal-tier grouping (`wooden`, `tin`, …) in achievements data
- [ ] **Trophy percentage preview** — partial progress badge on silhouettes
- [ ] **Compendium category grid** — 5-col icon grid with found/total per category
- [ ] **Discovery badges** — active ✓ / inactive ✗ overlay per compendium item
- [ ] **Entity detail panel** — 3-bullet trait template + active toggle (right page)
- [ ] **Records page** — cumulative stat counters with 5-flag milestone track + reward collect
- [ ] **Kingdom summary panel** — auto-generated realm description from live game state
- [ ] **Total Progress counter** — single `N/224` counter across all codex entries
- [ ] **Cross-system links** — trophy challenges reference compendium entry keys

### World Map & Navigation (§6)
- [ ] **Kingdom overview map** — zoomable full-realm view with named location nodes
- [ ] **Location nodes** — locked (padlock + dashed ring) / unlocked states
- [ ] **Location travel** — tap node to zoom into that village's building scene
- [ ] **XP/Level system** — XP bar in HUD, leveling unlocks buildings, tooltip explanation
- [ ] **Experience tooltip** — tap XP bar → show gain method + unlock benefit

### Building & Property System (§7)
- [ ] **Building shop panel** — dark 3×N grid + right detail, resource requirement badges
- [ ] **Resource sufficiency badges** — green (enough) / red (insufficient) per ingredient
- [ ] **Decoration buildings** — influence-drop mechanic on placement
- [ ] **Locked buildings** — padlock overlay, unlock via level or prerequisite
- [ ] **Build with runes** — alternate currency purchase path alongside coin price
- [ ] **Property/land panel** — territory upgrades with "New time: N hours" display
- [ ] **Castle rune timer** — passive rune generation, reduced by building properties
- [ ] **Build one-time reward** — rune/resource drop on first construction

### Inventory & Economy (§8)
- [ ] **Goods grid panel** — 2-row grid with quantity badges
- [ ] **Sell/Buy detail** — asymmetric pricing (sell << buy) with separate button colors
- [ ] **Resource requirement display** — `owned/needed` badge system (green/red)

### Tools System (§9)
- [ ] **Tools grid panel** — 3×N scrollable dark grid
- [ ] **Tool quantity cap** — `current/max` badges; overcap state (N > max)
- [ ] **Regular tool detail** — effect description + star bonus + craft/buy actions
- [ ] **Magic tool detail** — portal-only lock message, no craft recipe
- [ ] **Star bonus display** — prestige points shown per tool, awarded on use
- [ ] **Craft action** — use goods to craft tools; "Craft" + "coin buy" dual CTAs
- [ ] **Buy More action** — for non-craftable tools (Hourglass, Magic Wand, Axe, Rake, etc.)
- [ ] **Two-column tool actions** — Craft (green) + coin-buy (orange) side-by-side

### Workers / Apprentices (§10)
- [ ] **Worker grid** — 2×N grid with hired-count badge (gray/gold for max)
- [ ] **"Now: X = 1" formula display** — live conversion ratio in detail panel
- [ ] **Resource requirement grid** — green/red sufficiency badges for hiring cost
- [ ] **Hire lock condition** — lock icon on Hire button when prerequisite unmet
- [ ] **Gold badge at max** — badge color changes when worker is fully hired

### IAP / Store (§11)
- [ ] **"Extras and Bundle Packs" panel** — scrollable 2-col grid
- [ ] **Permanent upgrades** — Tools ×2, Challenges ×2, Bonuses ×2, Colors +42
- [ ] **Bundle packs** — variable-content multi-item bundles (e.g. magic tools pack)
- [ ] **Social reward** — "Like" CTA replaces price button for free rewards
- [ ] **Restore purchases** — standard IAP restore action

---

## 13. Compendium — Collections & Zone Discovery (Picture Set 5)

### 13a. Collections vs. Entity Categories

The Compendium left page has two distinct types of content:

| Type | Layout | Example |
|---|---|---|
| **Entity category** | 5-col icon grid, found/total counter | Trees 6/6, Birds 9/11 |
| **Collection** | Horizontal row of 5 specific illustrated items, name + reward | Magnificent Feathers, Armament Collection |

Collections are separated from entity categories by a padlock-and-curl divider, indicating
they unlock progressively rather than filling as the player discovers entities.

### 13b. Collection Structure

```
[Category icon]  [Collection name]           [reward badge: +N ◉ or +N% ★]
[Item 1]  [Item 2]  [Item 3]  [Item 4]  [Item 5]
                                              (all full-color or silhouettes)
Discover in: Zone X, Zone Y
```

- **Reward badge** sits in the top-right of the collection row (e.g. `+1000 ◉`, `+5% ★`).
- **Discovery hint** at the bottom names the zones where these items can be found.
- A **padlock icon** in the top-right of the row header separates unlocked from locked
  collections.
- A **green border** on the entire row indicates the currently selected collection.

### 13c. Collection Catalog (examples from set 5)

| Collection | Contents | Zones | Reward |
|---|---|---|---|
| Magnificent Feathers | 5 feathers (blue, pink, fire, white, striped) | 3, 5, 6 | +1000◉ |
| Witch's Workshop | Voodoo doll, crystal ball, cauldron, wand, pumpkin | 3, 5 | — |
| Tribal Artifacts | (partially visible) | — | — |
| Rare Beetles | 5 beetle silhouettes (all undiscovered) | 6 | +5%★ |
| Armament Collection | Sword, helmet, poison bottle, cannonballs, cannon | 6 | — |
| Pioneer Tools | (partially visible) | — | +1 envelope |

### 13d. Extended Entity Categories (higher-level save)

At level 71 the Compendium shows categories not visible in earlier sets:

**Trees (6/6 — fully discovered):** All 6 trees collected. Includes Palm Tree as a late
entry. The Palm Tree detail (right page):
- Active: ☐ (not active)
- "Can be collected with coconuts."
- "2 free moves."
- "A tree in the palm of your hand." (flavor/pun)

**Birds (9/11):** 9 of 11 discovered including Turkey, Pheasant, Chicken, Black Hen,
Rooster, Crow, Pelican, colorful exotic bird, Yellow Chick — 2 remaining silhouettes.

### 13e. Chest Mechanics Tutorial (right page — Collections tab)

When a collection is selected, the right page shows a **visual mechanics tutorial**
(not a detail panel). Two chest types are illustrated:

**Field and Mine Chests:**
```
[orange dot: 3] → [chest] → [field of crop tiles] → [pirate chest: opened]
"Start with the map and draw a line over correct puzzles."
```
- Player draws a line of 3+ correct puzzle-board tiles → a chest appears at the end.

**Sea Chests:**
```
[orange dot: 2] → [chest] → [sea tiles] → [ship] → [chest: opened]
"Draw a line to place a chest. Move the ship to the chest to open it."
```
- Player draws a 2-step line on sea tiles → chest placed → player navigates ship to it.

Both tutorials use an orange circle origin-point, dashed arrow lines, and a pointing-finger
tap icon to show the gesture. This panel is persistent on the right while browsing
collections on the left.

---

## 14. Quests Tab (Picture Set 5)

### 14a. Tab

The **speech-bubble tab** (top of the left icon bar) opens the Quests/Manual view. The tab
turns red/pink and is marked with a "!" badge when new quests are available.

### 14b. Left Page: Quests

```
~~~  Quests  ~~~           (decorative header with curl ornaments)

┌─────────────────────────────────────────┐
│ [NPC portrait]  [resource icon]         │
│                 Collect N  (M left)     │
│                                         │
│                 Reward: +90 [crown]     │
└─────────────────────────────────────────┘
```

- Each quest is a **card** with a rounded white background.
- **NPC portrait** (worker character) on the left — shows who is requesting the resource.
- **Resource icon** in a speech bubble indicates what to collect.
- **Progress text**: "Collect N (M left)" where M decrements as the player collects.
- **Reward**: crown currency shown in green text with a crown icon.
- Multiple quests stack vertically; examples: Collect 1 honeycomb (+90◉), Collect 15 meat (+90◉).

### 14c. Right Page: Manual

```
~~~  Manual  ~~~

[NPC portrait — named quest giver]

  [Speech bubble: narrative flavor text]
```

- A distinct **named NPC** (e.g. a purple-hatted governor figure) delivers story context.
- The speech bubble contains a single sentence explaining the thematic reason for the
  current quest batch (e.g. "It's governor's daughter's birthday, we need to prepare for
  the party!").
- The Manual text changes with each quest batch, providing narrative continuity.

---

## 15. Zone Map — Full Kingdom (Picture Set 5)

### 15a. Zone Layout

The full kingdom map is labeled "**Zones**" in the bottom banner and contains exactly
**6 zones + 1 castle node**:

| Node | Location | Terrain features |
|---|---|---|
| Zone One | West coast | Windmill, haystacks, beach, sheep |
| Zone Two | Center-left | Red-roofed town, river crossing |
| Zone Three | South-west | Large farm, sheep/pigs roaming |
| Zone Four | North center | Island, accessible via bridge |
| Zone Five | South center | Large river harbor town (most developed) |
| Zone Six | East/ocean | Coastal pirate town, ship on water |
| **Castle** | Center | Large fortified castle, central hub |

All zones show yellow "!" markers when actions are pending. The Castle is a prominent
separate node with its own "!" indicator.

### 15b. Zone-Based Progression

- Zones unlock sequentially (not shown locked in this high-level save, but see §6).
- Collections reference zones: "Discover in: Zone Three, Zone Five, Zone Six."
- Each zone has its own puzzle board, building set, and NPC roster.
- Zone Five (late game) shows the widest building variety (harbor, mine, mill, lighthouse,
  market, residential, bakery, windmill, stone arch, chicken coop, orchard).

### 15c. Zone Five — Building Density (advanced example)

Zone Five contains the following interactive structures:

Left bank (mining/industrial):
- Mining catapult, mine cart tracks, dark forge workshops, grinding wheel, smelter

River / harbor:
- Multi-level dock with nets and buoys
- Lighthouse
- Fishing/pirate sailing ship
- Mermaid decoration (ambient)

Center / town:
- Multi-story mill/brewery
- Tavern / inn
- Market stall with chalkboard
- Clock-tower building

Right bank (farm / residential):
- Windmill / grain silo
- Bakery / stone oven
- Residential house
- Chicken coop / hen house
- Orchard
- Hay storage with wheat icon
- Stone arch portal

### 15d. In-World Building Tap Tooltip

Tapping any building in a zone view shows a **small floating tooltip card**:

```
┌───────────────────────────────────┐
│  [Building name]                  │
│  [One-line description]           │
│                                   │
│   [🏠 Build/info btn]  [🔧 Upgrade btn] │
└───────────────────────────────────┘
```

Example: "House — Sweet home for 4 new workers." + two green circular action buttons
(one for building info/buy, one for upgrade).

Ambient NPC speech bubbles: Animals (goat, cow) appear as floating face icons with a white
speech bubble near their building — indicating they want attention or have a pending action.

---

## 16. Session Start Modals (Picture Set 5)

### 16a. Farming Session Start — "Let's go farming!"

A modal presented before entering a farm puzzle board. Shows all tile types the player will
encounter this session:

```
           Let's go farming!

┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐
│ 🌿 │  │ 🌾 │  │ 🥕 │  │ 🍎 │  │ 🪷 🔍│
└────┘  └────┘  └────┘  └────┘  └────┘
┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐
│ 🌳 │  │ 🦃 │  │ 🐷 │  │ 🐄 │  │ 🦬 │
└────┘  └────┘  └────┘  └────┘  └────┘

  [ Use ]  [x2 bag × 2]    [ 150◉ | 16📅 ]
```

- **10 tile types** arranged in a 2×5 grid (rounded square cells, tan background).
- A **magnifying glass badge** on a tile (lotus flower) marks it as rare/hidden.
- **"Use" button** (green) + consumable item preview: lets player activate a x2 resource
  bag (qty 2 available) before entering — doubles resources collected this session.
- **Cost pill** (orange): shows session entry cost in coins (150◉) and a calendar badge
  (16) — likely the day of the current month or seasonal turn number.

**Tile types seen:**
Grass, Wheat field, Carrot, Apple/Tomato, Lotus (rare), Tree/bush, Turkey, Pig, Cow,
Highland Cow/Yak

### 16b. Mine Session Start — "Let's dig"

A modal for entering a mine puzzle. Structured differently from farming:

**Top section — chain progress tracker:**
```
[●●●●●●●]  (gray dots = steps in the mining chain, some filled)
[rock icon]  [gem icon]  floating above dots   [2 🪣 counter]
```
Shows the player how many chain steps are in this session and what tier of resource
they're currently targeting.

**Main section — current goods inventory:**
A 2×4 grid showing goods the player brings in (or their current stock), each with:
- Quantity badge (e.g. 301 bread, 118 eggs)
- Sell price below (`N ◉` — what each item sells for per unit)

| Good | Qty | Sell value |
|---|---|---|
| Bread | 301 | 1◉ |
| Eggs | 118 | 3◉ |
| Vegetables | 27 | 6◉ |
| Ham/Meat | 29 | 10◉ |
| Pie/Tart | 0 | 20◉ |
| Milk | 3 | 20◉ |
| Honeycomb | 0 | 20◉ |
| Horseshoe | 1 | 35◉ |

**Bottom — entry CTAs (three options):**
- Blue pill: `2 [rune] [gem]` — pay 2 runes to enter
- Orange pill: `100◉ / 10🪣` — pay 100 coins + 10 shovels
- Gray/white "Let's dig" button — free entry (uses standard tools)

The **dual-cost design** gives players a choice between premium currency (runes) and
consumable tools, with the free option still available.

---

## 17. Updated Implementation Scope Additions (§12 addendum)

### Compendium — Collections (§13)
- [ ] **Collections section** — horizontal 5-item row with name, reward badge, zone hint
- [ ] **Zone discovery hint** — "Discover in: Zone X, Zone Y" text per collection
- [ ] **Reward badge variants** — coin reward (`+N◉`) and percentage bonus (`+N%★`)
- [ ] **Padlock section divider** — separates locked collections from available ones
- [ ] **Green selection border** — highlights active/selected collection row
- [ ] **Chest tutorial panel** — right page shows Field/Mine chest + Sea Chest diagrams

### Quests System (§14)
- [ ] **Quests tab** — speech-bubble tab with red "!" badge when active
- [ ] **Quest card** — NPC portrait + speech-bubble resource + "Collect N (M left)" + reward
- [ ] **Manual panel** — named story NPC with flavor text matching quest batch theme
- [ ] **Crown reward display** — green "Reward: +N [crown]" in each card

### Zone Map (§15)
- [ ] **6-zone + Castle layout** — named zone nodes with terrain variety
- [ ] **Zone Five density** — document as template for what advanced zones should contain
- [ ] **Building tap tooltip** — floating card on building tap: name + description + 2 CTAs
- [ ] **Animal NPC speech bubbles** — ambient face-bubble on buildings with pending actions

### Session Start Modals (§16)
- [ ] **Farming session modal** — 2×5 tile type preview + consumable "Use" button + cost pill
- [ ] **Rare tile badge** — magnifying glass overlay for hidden/rare tile types
- [ ] **Mine session modal** — chain tracker + goods inventory grid + 3-CTA entry (rune/tool/free)
- [ ] **Sell-value display** — each good in mine modal shows its per-unit sell price

---

*More picture sets to follow — this doc will be extended.*
