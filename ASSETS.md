# Game Asset Inventory

Every visual and audio asset in the game. The purpose of this document is to describe
**what each asset does, when it appears, what states it has, and how it behaves** — not
what it should look like. That is for the artist to decide.

Currently all art is procedurally generated (Canvas 2D API) or plain CSS. Everything
listed here needs to be replaced with real production assets.

---

## How to Read This Document

- **Key** — the internal identifier used to reference the texture in code
- **Size** — the logical (CSS) pixel dimensions; export 2× for retina
- **Location** — source file and approximate line numbers where the asset is used
- **Purpose** — what role the asset plays in the game
- **States** — every distinct visual condition the asset must support
- **Animations** — timing and easing data for any animated behavior

---

## Part 1: Game Board

The board is rendered by Phaser 3 inside a canvas element. It is a 6-column × 7-row grid
of draggable tiles. The player drags to connect 3 or more matching adjacent tiles.

---

### 1.1 Tile Textures

Each resource has **two textures**: one for the idle/unselected state and one for the
selected/in-chain state. Tiles are square with a visible background shape (currently a
rounded rectangle with a soft shadow).

**Logical size:** 74 × 74 px  
**Export:** 1× and 2× (148 × 148 px), transparent background  
**Location:** `src/textures.js` lines 1–236, used in `src/TileObj.js`

#### Farm Biome — 10 Resources

The Farm biome is the starting biome. Resources follow upgrade chains:
`hay → wheat → grain → flour`, `log → plank → beam`, `berry → jam`, `egg` (terminal).

Tier indicates position in the upgrade chain (1 = raw, 3 = most processed).

| Key | Label | Tier | Chain |
|-----|-------|------|-------|
| `hay` | Hay | 1 | Grass/grain |
| `wheat` | Wheat | 1 | Grass/grain |
| `grain` | Grain | 2 | Grass/grain |
| `flour` | Flour | 3 | Grass/grain |
| `log` | Log | 1 | Wood |
| `plank` | Plank | 2 | Wood |
| `beam` | Beam | 3 | Wood |
| `egg` | Egg | 1 | (terminal) |
| `berry` | Berry | 1 | Berry |
| `jam` | Jam | 2 | Berry |

#### Mine Biome — 10 Resources

The Mine biome unlocks at player level 2. Upgrade chains:
`stone → cobble → block`, `ore → ingot`, `coal → coke`, `gem → cutgem`, `gold` (terminal).

| Key | Label | Tier | Chain |
|-----|-------|------|-------|
| `stone` | Stone | 1 | Rock |
| `cobble` | Cobble | 2 | Rock |
| `block` | Block | 3 | Rock |
| `ore` | Ore | 1 | Metal |
| `ingot` | Ingot | 2 | Metal |
| `coal` | Coal | 1 | Carbon |
| `coke` | Coke | 2 | Carbon |
| `gem` | Gem | 1 | Crystal |
| `cutgem` | Cut Gem | 2 | Crystal |
| `gold` | Gold | 1 | (terminal) |

#### Tile States

Every tile (both biomes) must support all of the following states:

| State | Trigger | Behavior |
|-------|---------|----------|
| **Idle** | Default | Tile resting on board, not interacted with |
| **Hover** | Cursor over tile during drag | Subtle acknowledgment that tile is reachable |
| **Selected** | Tile added to the active drag chain | Visually distinct from idle; part of a connected sequence |
| **Pulse** | Moment tile is first added to chain | One-shot burst animation, then settles into Selected; scale 1.0 → 1.12 → 1.06×, 90 ms, Sine.Out |
| **Collect** | Chain successfully completed | Tile shrinks and disappears; scale + alpha → 0, ±25° random rotation, 180 ms, staggered 15 ms per tile |
| **Drop / Spawn** | Tile falls after board collapses | Tile enters from above the board and lands in its new row |
| **Shuffle** | Player uses Reshuffle Horn tool | Full 360° spin in place, 280–300 ms |
| **Biome Switch** | Player switches between Farm and Mine | Same spin as shuffle |

---

### 1.2 Upgrade Star (Spark)

**Key:** `spark`  
**Size:** 72 × 72 px  
**Export:** 1× and 2× (144 × 144 px), transparent background  
**Location:** `src/textures.js` lines 238–266, spawned in `src/GameScene.js`

**Purpose:** A floating indicator that appears above every 3rd tile in an active chain,
signaling that an upgrade is about to occur when the chain is collected. A small preview
of the upgraded resource appears alongside it.

| State / Animation | Behavior |
|-------------------|----------|
| **Pop-in** | Spawns at scale 0, angle −20°; animates to scale 0.72, angle +15°; 320 ms, Back.Out easing |
| **Idle sway** | Continuously rocks ±10° after spawning; 950 ms yoyo loop, Sine.InOut |
| **Resource preview** | A miniature tile icon (scale 0.32×) fades in adjacent to the star 110 ms after pop-in, showing what resource the upgrade will produce; 260 ms, Back.Out |
| **Dismiss** | Disappears instantly when chain is cancelled or collected |

---

### 1.3 Board Background

**Location:** `src/GameScene.js` lines 137–166  
**Purpose:** Full-viewport background visible behind and around the board during gameplay.

There are **5 variants**: one per season for the Farm biome, and one fixed variant for
the Mine biome (Mine has no seasonal visual change).

| Variant | Condition |
|---------|-----------|
| Spring background | Farm biome, turns 1–8 of the year |
| Summer background | Farm biome, turns 9–16 |
| Autumn background | Farm biome, turns 17–24 |
| Winter background | Farm biome, turns 25–32 |
| Mine background | Mine biome active, any season |

The background transitions instantly when the season changes.

---

### 1.4 Board Frame

**Location:** `src/GameScene.js` lines 137–166  
**Purpose:** A decorative border that surrounds the 6×7 tile grid. Currently a plain
rounded rectangle.

**Logical dimensions:** the grid itself is 444 × 518 px (6 × 74 = 444, 7 × 74 = 518);
the frame adds ~14 px of padding on all sides, giving a total frame area of ~472 × 546 px.

**Variants:**

| Variant | Condition |
|---------|-----------|
| Farm frame | Farm biome active |
| Mine frame | Mine biome active |

The frame can be a 9-slice / stretchable asset.

---

### 1.5 Board Decorations (Farm Only)

**Location:** `src/GameScene.js` lines 151–158  
**Purpose:** Organic decorative elements rendered on either side of the board frame when
there is enough horizontal space. Currently repeating ellipses colored by season accent.
Not present in Mine biome.

These are optional embellishments flanking the frame — the artist can define what they
should be.

---

### 1.6 Drag Chain Visuals

These are drawn at runtime directly onto Phaser graphics objects (not pre-baked textures).
The artist defines the visual language; engineering will implement it.

| Element | Role | Current Implementation |
|---------|------|----------------------|
| **Path line** | Connects each tile in the chain with a continuous line | Three-layer line: wide soft outer glow + medium core + thin highlight; 9–22 px total width |
| **Node dot** | Marks each tile's center point on the path | Three concentric circles: glow ring, main dot, inner highlight; 7 px radius |
| **Expand ring burst** | Pulse effect at the moment a tile is added | Circle that expands outward from the tile center and fades; 340 ms, Quad.Out |

**Path animations:**

| Animation | Behavior |
|-----------|----------|
| **Segment grow** | Each new line segment draws itself from the previous tile to the current one; 160 ms, Quad.Out |
| **Line pulse** | Entire path breathes (opacity 0.78 → 1.0 yoyo loop); 680 ms, Sine.InOut |
| **Ring burst** | Radius grows ~4×, alpha 0.9 → 0; 340 ms, Quad.Out |

---

### 1.7 Chain Badge

**Location:** `src/GameScene.js` lines 479–517  
**Purpose:** A small floating badge above the board that appears during a drag and displays
the current chain length and any pending upgrade count. Example text: `chain × 5` or
`chain × 6   +2★`. In landscape layouts it appears inside the side panel instead.

No entrance/exit animation. Appears and disappears with the drag gesture.

---

### 1.8 Resource Gain Floater

**Location:** `src/GameScene.js` lines 521–526  
**Purpose:** Text that pops up at the collection point and floats upward when a chain is
collected. Format: `+8 Wheat` or `+6 Wheat  ★2`. Phaser text object, not a texture.

| Animation step | Behavior |
|----------------|----------|
| Pop-in | Scale 0.7 → 1.0; 120 ms, Back.Out |
| Float | Moves 58 px upward while fading to transparent; 780 ms, starting 120 ms after pop |
| Destroy | Removed at end of float |

**Note on typography:** this uses the game's display font; see Part 8 (Typography).

---

## Part 2: Screens

The game has 8 distinct view screens. The bottom navigation (Part 5.2) switches between them.

---

### 2.1 Board Screen

**Trigger:** Default starting screen; also accessible via Board button in nav  
**Canvas:** Phaser game canvas occupies the main area  
**Surrounding UI:** HUD top bar (Part 5.1), side panel (Part 5.3, landscape only),
mobile dock (Part 5.4, portrait only)

This is the core gameplay screen. See Part 1 for all board asset details.

---

### 2.2 Town Screen

**Trigger:** Game loads here on first run; accessible via Town button in nav  
**Location:** `src/ui.jsx` lines 555–646

**Purpose:** The town overview where the player sees and purchases buildings. Buildings
are positioned in a 2D scene illustration.

#### Scene / Background

The town scene is a stylized 2D landscape viewed from a slight angle, with buildings
positioned on it. There are 3 location variants (the player travels between them via the
Map screen):

| Location | Description |
|----------|-------------|
| **Hearthwood Vale** | The starting farm village |
| **Ironridge Camp** | The mine settlement, unlocked at level 2 |
| **Home** | A neutral hub location |

Each location needs a full background illustration that fits the game's design space
(1100 × 600 px logical).

#### Buildings

8 buildings, each positioned at a specific coordinate in the scene. Buildings have 3
construction states and an optional "active station" state:

| State | Condition | Visual |
|-------|-----------|--------|
| **Built** | Player has constructed it | Appears as a real building in the scene |
| **Unbuilt — affordable** | Not built, player has enough coins/resources | Shows cost; interactable |
| **Unbuilt — unaffordable** | Not built, player lacks resources | Shows cost; indicates shortfall |
| **Locked** | Player level requirement not met | Shows level requirement; non-interactable |

| Building | Starting State | Level Req | Crafting Station? |
|----------|---------------|-----------|-------------------|
| **Hearth** | Pre-built | — | No |
| **Mill** | Must build | 1 | No |
| **Bakery** | Must build | 1 | Yes |
| **Inn** | Must build | 2 | No |
| **Granary** | Must build | 1 | No |
| **Larder** | Must build | 3 | Yes |
| **Forge** | Must build | 8 | Yes |
| **Caravan Post** | Must build | 8 | No |

Each building occupies a specific footprint in the scene. Approximate widths range from
80 px (small) to 160 px (large).

---

### 2.3 Inventory Screen

**Trigger:** Inventory button in nav  
**Location:** `src/ui.jsx`

**Purpose:** Displays all resources and crafted items the player currently holds, with
counts.

**Contents:**
- Two sections: Resources and Crafted Items
- Each entry: an icon for the resource/item, its name, and current count
- Empty state when no items

Resources and items share the same icon style as the board tile icons (see 1.1).

---

### 2.4 Quests & Almanac Screen

**Trigger:** Quests button in nav  
**Location:** `src/ui.jsx`

**Purpose:** Two-tab screen for daily quests and a long-term progression track (the Almanac).

#### Daily Quests Tab

6 quest slots. Each quest card shows:
- Quest description text
- Coin + XP reward
- Progress bar + counter (e.g., `30/30`)
- Claim button

| Quest card state | Condition |
|-----------------|-----------|
| In progress | Incomplete |
| Claimable | Goal met, not yet collected |
| Claimed | Already collected this season |

Quests reset each season.

#### Almanac Tab

A horizontal progression strip of 10 reward tiers. Shows overall XP progress toward the
next tier.

Each tier card:
- Tier number
- Reward icon and description
- Claim button

| Tier card state | Condition |
|----------------|-----------|
| Locked | XP not yet reached |
| Claimable | XP reached, not collected |
| Claimed | Already collected |

---

### 2.5 Crafting Screen

**Trigger:** Craft button in nav, or tapping a crafting station building in Town  
**Location:** `src/ui.jsx`

**Purpose:** Combine collected resources to produce crafted items that earn coins.
Three crafting stations, each unlocked by building the corresponding building.

**Station tabs:** Bakery · Larder · Forge

| Station tab state | Condition |
|------------------|-----------|
| Active | Currently selected |
| Inactive (built) | Built but not selected |
| Locked | Building not yet constructed |

#### Recipes

12 recipes spread across the three stations. Each recipe card shows:
- Recipe name
- Tier badge (Tier 2 or Tier 3 recipes have a badge; Tier 1 do not)
- Input requirements (each ingredient shown as a chip with resource name and quantity)
- Coin reward
- Craft button
- Times-crafted count (shown if > 0)

| Recipe card state | Condition |
|------------------|-----------|
| Craftable | All inputs present, station built, level met |
| Missing inputs | Some ingredients insufficient |
| Station not built | Building not constructed |
| Level locked | Player level too low |

**Full recipe list:**

| Recipe | Station | Inputs | Tier |
|--------|---------|--------|------|
| Bread Loaf | Bakery | flour×3 + egg×1 | 1 |
| Honey Roll | Bakery | flour×2 + egg×1 + jam×1 | 1 |
| Harvest Pie | Bakery | flour×2 + jam×1 + egg×1 | 1 |
| Preserve | Larder | jam×2 + egg×1 | 1 |
| Tincture | Larder | berry×3 + jam×1 | 1 |
| Hinge | Forge | ingot×2 + coke×1 | 2 |
| Cobble Path | Forge | stone×5 + plank×2 | 1 |
| Lantern | Forge | ingot×1 + coke×1 + plank×1 | 2 |
| Gold Ring | Forge | gold×1 + ingot×2 | 2 |
| Gem Crown | Forge | cutgem×1 + gold×2 | 2 |
| Iron Frame | Forge | beam×2 + ingot×1 | 3 |
| Stonework | Forge | block×2 + coke×1 | 3 |

---

### 2.6 Achievements Screen

**Trigger:** Trophies option in menu modal  
**Location:** `src/ui.jsx`

**Purpose:** Tracks 23 milestones across 7 categories. Two tabs: Trophies and Collection.

#### Trophies Tab

Cards grouped by category (Harvest, Chains, Orders, Buildings, Seasons, Resources, Crafting).

Each trophy card:
- Icon (large)
- Name + description
- Progress bar + counter
- Reward description
- Claim button (when complete)

| Trophy card state | Condition |
|------------------|-----------|
| Locked | Not yet progressed |
| In progress | Partially met |
| Claimable | Goal met, reward not collected |
| Claimed | Reward already collected |

#### Collection Tab

A grid of every resource (Farm and Mine). Shows how many of each the player has ever
collected.

| Resource chip state | Condition |
|--------------------|-----------|
| Undiscovered | Never harvested; icon hidden, shows `?` |
| Discovered | At least 1 ever harvested; shows icon and lifetime count |

Footer shows total discovered count and total resources ever harvested.

---

### 2.7 Orders Screen

**Trigger:** Orders button in nav  
**Location:** `src/ui.jsx`

**Purpose:** Lists active NPC delivery orders. The player collects the right resources
or crafted items and delivers them to earn coins.

Each order card shows:
- NPC avatar and name (see Part 6 for NPCs)
- Request description
- Coin reward
- Progress bar and counter
- Delivery prompt when ready

| Order card state | Condition |
|-----------------|-----------|
| Pending | Player does not yet have enough |
| Ready | Player has all required items; card is tappable |
| Crafted (partial) | Items needed are craftable but not yet crafted |

Orders can be for raw resources or for crafted recipes.

---

### 2.8 Cartography (Map) Screen

**Trigger:** Map button in nav  
**Location:** `src/ui.jsx`

**Purpose:** A map of locations the player can travel between. The player's current
location determines which biome is active on the board.

#### Map

Displayed as an SVG (100 × 100 viewBox, rendered to fill the panel). Shows 9 nodes
connected by 11 edges.

**Node states:**

| State | Condition |
|-------|-----------|
| Current | Player is here; pulsing ring animation |
| Discovered | Player has visited; shows name and location kind |
| Undiscovered | Not yet visited; shows `?`, reduced opacity |
| Selected (non-current) | Player has tapped it in this session |

**Node types** (each type needs a distinct visual treatment):

| Type | Description |
|------|-------------|
| home | Hub settlement |
| farm | Farm biome location |
| mine | Mine biome location |
| festival | Special event location |
| event | Scripted event node |
| boss | Boss challenge node |

**Edge states:**

| State | Condition |
|-------|-----------|
| Known | Both connected nodes have been discovered |
| Partially known | One or both nodes undiscovered; reduced opacity |

#### Side Panel (node detail)

Appears when a node is tapped. Shows:
- Node name and type label
- Level requirement
- Status message and/or Travel button

| Travel button state | Condition |
|--------------------|-----------|
| Enabled | Node is adjacent to current, level met |
| Locked | Level requirement not met |
| Not adjacent | Not reachable from current node |
| Current | "You are here" |

**9 map nodes:**

| Node | Type | Level Req |
|------|------|-----------|
| Hearthwood Vale | home | 1 |
| Greenmeadow | farm | 1 |
| Wild Orchard | farm | 2 |
| The Crossroads | event | 2 |
| Cracked Quarry | mine | 2 |
| Lanternlit Caves | mine | 4 |
| Drifter's Fairground | festival | 3 |
| Black Forge | mine | 5 |
| The Pit | boss | 6 |

---

## Part 3: Modals and Overlays

Modals appear over the current screen. All have a semi-transparent backdrop behind them.

---

### 3.1 Menu / Settings Modal

**Trigger:** Menu button (≡) in the HUD  
**Location:** `src/ui.jsx`

A multi-section modal with a main menu, settings toggles, and an about section.

#### Main Menu

Buttons:
- Resume (close modal)
- Go to Town (with inline confirmation if on the board — see below)
- Show Tutorial
- Go Fullscreen
- Settings (switches to settings section)
- About (switches to about section)
- Trophies (opens achievements screen)
- Reset Save (with inline confirmation)

**Confirmation sub-states:** "Go to Town" and "Reset Save" each have a secondary
confirmation step that appears inline, replacing the button area with a warning message
and Confirm / Cancel buttons.

#### Settings Section

Toggle rows for:
- Sound Effects
- Music
- Haptics
- Reduced Motion
- Color-Blind Mode

Each row: label + on/off toggle switch.

#### About Section

Static text panel. Contains a hidden 5-tap easter egg on the title icon.

Dev-only buttons (visible in development builds):
- Trigger Boss
- +100 All Items
- +1000 Gold
- Reset Game

---

### 3.2 Season Transition Modal

**Trigger:** Automatically when the player exhausts all 8 turns in a season  
**Location:** `src/ui.jsx` lines 650–683

**Purpose:** Summarises the completed season and announces the incoming season.
The player must tap the button to continue.

**Contents:**
- Large season icon for the incoming season (one of the 4 season icons; see Part 4.2)
- Title: "[Previous Season] ends"
- Flavour text naming the location
- Season effect badge describing the incoming season's gameplay modifier
- Stats grid (4 values): resources harvested, upgrades made, orders delivered, coins earned
- End-of-season bonus description
- Continue button

**Entrance animation:** fade in, 200 ms ease-out.

---

### 3.3 Boss Challenge Modal

**Trigger:** A boss node is entered on the map  
**Location:** `src/ui.jsx`

**Purpose:** Presents a time-limited challenge. The player must meet a goal within a
set number of turns. Can be accepted or declined.

#### Expanded view

- Boss character name and description
- Goal text
- Progress bar with counter and percentage
- Turns remaining counter
- Weather condition badge (if active — a mid-run modifier)
- Accept button (primary)
- Decline button (secondary)

#### Minimised view

Once accepted, collapses to a small persistent card in a corner of the screen:
- Boss name
- Progress summary
- Mini progress bar
- Turns remaining
- Weather badge (if active)
- Close/expand button

| Weather badge state | Condition |
|--------------------|-----------|
| Not shown | No active weather modifier |
| Shown | Active modifier; color and icon vary by weather type |

---

### 3.4 Townsfolk Modal

**Trigger:** Townsfolk button in nav  
**Location:** `src/ui.jsx` lines 478–512

**Purpose:** View and interact with the 5 NPCs. Three tabs.

#### Mood Tab

One card per NPC showing:
- NPC avatar (see Part 6)
- Name and role
- Bond level displayed as a row of 10 hearts (filled / half / empty)
- Current mood (with emoji)
- Order reward modifier based on mood
- Gift button — opens inline gift picker

| Heart fill states | Meaning |
|------------------|---------|
| Full hearts | High bond |
| Half hearts | Medium bond |
| Empty hearts | Low bond |

**Mood states:**
| Mood | Emoji |
|------|-------|
| Happy | 😊 |
| Neutral | 😐 |
| Sad | 😠 |

**Gift picker** (inline, opens below NPC card):
- Grid of all items currently in inventory
- Each item shows its icon and name
- Favourite gift: marked with gold star badge
- Disliked gift: marked with red X badge
- Empty state: text message if inventory empty

#### Apprentices Tab

See 3.5.

#### Orders Tab

Compact version of the Orders screen (see 2.7).

---

### 3.5 Apprentices Modal

**Trigger:** Apprentices tab in Townsfolk modal  
**Location:** `src/ui.jsx`

**Purpose:** Hire NPCs to passively produce resources each season.

Two sections:

**On the Payroll** — currently hired apprentices. Each card:
- Apprentice avatar
- Name and role
- Resource production list (what they produce per season)
- Wage cost per season
- Fire button

**Available to Hire** — unhired apprentices. Each card:
- Apprentice avatar
- Name and role
- Production list
- Hire cost
- Requirement indicator
- Hire button

| Hire button state | Condition |
|------------------|-----------|
| Enabled | Affordable + requirements met |
| Unaffordable | Not enough coins |
| Locked | Requirement not met (building or level) |

**Requirement states** (inline chip):
- Met: positive indicator
- Unmet: negative indicator

**6 apprentices:**

| Name | Role | Produces | Wage | Hire Cost | Requirement |
|------|------|---------|------|-----------|-------------|
| Hilda | Farmhand | hay×8, log×4 | 30◉/season | 200◉ | Granary built |
| Dren | Miner | stone×6, ore×3 | 50◉/season | 350◉ | Level 2 |
| Pip | Forager | berry×5, egg×2 | 25◉/season | 150◉ | Inn built |
| Osric | Smith Apprentice | ingot×1, plank×4 | 80◉/season | 500◉ | Forge built or Level 4 |
| Wila | Cellarer | jam×2, flour×3 | 40◉/season | 300◉ | Bakery built |
| Tuck | Lookout | coins×25 | 20◉/season | 100◉ | Inn built |

---

### 3.6 Tutorial Modal

**Trigger:** Automatically on first game load; also via "Show Tutorial" in menu  
**Location:** `src/ui.jsx` (alwaysMounted)

**Purpose:** 6-step guided introduction to the game. NPC characters deliver each step.
Can be skipped at any time.

The modal can appear as a center overlay or as a corner toast depending on the step.

Steps involve:
1. Introduction to dragging tiles
2. Forming chains of matching tiles
3. The upgrade mechanic (every 3rd tile)
4. Delivering orders
5. Biomes
6. Seasonal modifiers

Each step shows an NPC avatar, NPC name, and instructional text. Navigation: next/skip.

---

### 3.7 NPC Speech Bubble

**Trigger:** Various game events (season changes, level-ups, reaching milestones, etc.)  
**Auto-dismiss:** After a configurable duration (default 1800 ms)  
**Location:** `src/ui.jsx` lines 696–718

**Purpose:** A brief contextual message from one of the NPCs. Appears bottom-center,
above the nav bar.

**Contents:**
- NPC avatar (see Part 6)
- NPC name and role
- Speech text (1–2 sentences)

**Entrance animation:** `bubblein` — scales in with a spring overshoot;
340 ms, `cubic-bezier(.34, 1.56, .64, 1)`.

---

### 3.8 Tool Detail Modal (Long-press)

**Trigger:** Long-pressing a tool button (mobile) or held click (desktop)  
**Location:** `src/ui.jsx`

**Purpose:** Displays the full name and description of a tool.

**Contents:**
- Tool icon (large)
- Tool name
- Description text
- Close button

---

### 3.9 Tool Tooltip (Hover)

**Trigger:** Hovering over a tool button on desktop  
**Location:** `src/ui.jsx`

Small floating tooltip positioned above the hovered button. Contains the tool name and
a short description. Has a downward-pointing arrow notch at the bottom edge.

---

## Part 4: Phaser Textures (Non-Tile)

---

### 4.1 Season Icons

**Size:** 42 × 42 px  
**Export:** 1× and 2× (84 × 84 px), transparent background  
**Location:** `src/textures.js` lines 268–329  
**Purpose:** Used in the HUD season bar (small) and season transition modal (large, ~48 px).

4 icons, one per season:

| Key | Season | Appears when |
|-----|--------|-------------|
| `season_flower` | Spring | Turns 1–8 |
| `season_sun` | Summer | Turns 9–16 |
| `season_leaf` | Autumn | Turns 17–24 |
| `season_snow` | Winter | Turns 25–32 |

These are static — no animation required.

---

## Part 5: Persistent UI

These elements are always visible while the relevant screen is active.

---

### 5.1 HUD — Top Bar

**Location:** `src/ui.jsx` lines 26–71  
**Always visible** at the top of every screen.

| Element | Description | Appears when |
|---------|-------------|-------------|
| **Menu button** | Opens the menu modal | Always |
| **Season bar** | Shows current season icon, name, effect label, turn progress, turns remaining | Board screen only |
| **Turn dots** | 8 small circles showing turn progress within current season | Board screen only |
| **XP bar** | Progress bar toward next player level, with level number badge | Non-board screens |
| **Coin display** | Current coin count | Non-board screens |
| **Buildings count** | Number of buildings constructed | Non-board screens |

**Turn dot states:**
| State | Condition |
|-------|-----------|
| Filled | Turn already used |
| Current | The active turn (has glow/outline) |
| Empty | Future turn |

---

### 5.2 Bottom Navigation Bar

**Location:** `src/ui.jsx` lines 444–476  
**Visible on all screens** (desktop/landscape layout).

7 navigation items in a horizontal pill-shaped bar:

| Label | Destination | Icon |
|-------|-------------|------|
| Board | Board screen | ◳ |
| Town | Town screen | ⌂ |
| Inventory | Inventory screen | 🎒 |
| Quests | Quests screen | 📜 |
| Craft | Crafting screen | 🔨 |
| Map | Cartography screen | 🗺️ |
| Townsfolk | Townsfolk modal | 👥 |

| Item state | Condition |
|-----------|-----------|
| Active | Current screen or modal |
| Inactive | All others |
| Hover | Cursor over item |

---

### 5.3 Side Panel (Landscape / Desktop)

**Location:** `src/ui.jsx` lines 114–172  
**Visible on the Board screen in landscape layout**, to the right of the game canvas.

Contains (from top to bottom):
- Chain badge (only visible during an active drag)
- Tools section
- Biome switcher
- Orders section (compact)

#### Tools Section

Grid of 4 tool buttons. Each button shows:
- Tool icon
- Tool name
- Count badge (number of uses remaining)

**4 tools:**

| Tool | Icon | Function |
|------|------|---------|
| Scythe (clear) | ⚔ | Clears the board, adds +5 basic resources |
| Seedpack (basic) | + | Adds +5 basic resources instantly |
| Lockbox (rare) | ★ | Adds +2 rare resources |
| Reshuffle Horn (shuffle) | ↻ | Randomises all tile positions |

| Tool button state | Condition |
|------------------|-----------|
| Active | Uses remaining > 0 |
| Disabled | 0 uses remaining |
| Hover | Cursor over, not disabled |

#### Biome Switcher

Two buttons, one per biome:

| Button state | Condition |
|-------------|-----------|
| Active | Currently selected biome |
| Inactive | Unselected biome, available |
| Locked | Mine biome, player level < 2 |

---

### 5.4 Mobile Dock (Portrait / Small Screen)

**Location:** `src/ui.jsx` lines 371–440  
**Visible on the Board screen in portrait/small-screen layout**, as a fixed bar at the bottom.

Two tap targets: Tools and Orders. Each shows a badge with a count if relevant.

Tapping opens a **bottom sheet** that slides up from the bottom edge of the screen:
- Drag handle bar at top
- Switches between Tools content and Orders content

| Bottom sheet state | Condition |
|-------------------|-----------|
| Closed | Default |
| Open — Tools | Tools button tapped |
| Open — Orders | Orders button tapped |

---

## Part 6: Characters / NPCs

5 named NPC characters appear throughout the game: in orders, speech bubbles, the
Townsfolk modal, the Quests screen, and as gift recipients.

Each NPC needs a **portrait / avatar**. Currently a colored circle with a single
initial letter. The avatar appears at different sizes:
- Speech bubble: 40 × 40 px displayed
- Townsfolk modal card: 40 × 40 px displayed
- Compact order cards: 24 × 24 px displayed

**Export size:** 64 × 64 px (1× and 2×), transparent or circular crop.

| NPC | Role | Associated color (current) |
|-----|------|--------------------------|
| **Mira** | Baker | `#d6612a` |
| **Old Tomas** | Beekeeper | `#c8923a` |
| **Bram** | Smith | `#5a6973` |
| **Sister Liss** | Physician | `#8d3a5c` |
| **Wren** | Scout | `#4f6b3a` |

The same NPCs appear as the apprenticeable characters (Hilda, Dren, Pip, Osric, Wila, Tuck
are additional characters who appear only in the Apprentices modal — they also need avatars).

---

## Part 7: Audio

All 8 sounds are currently synthesized via the Web Audio API. These need real recorded
or produced audio files.

**Required formats:** MP3 + OGG (for browser cross-compatibility)

| Key | Trigger | Character of current synth sound |
|-----|---------|----------------------------------|
| `chainStart` | Player taps the first tile to begin a chain | Rising tone, 80 ms, short |
| `chainCollect` | Chain completed and resources collected | Three-note ascending figure, ~240 ms total |
| `upgrade` | A tile upgrades during collection | Rising sweep, 120 ms, bright |
| `seasonTurn` | Season changes | Low bell tone, 400 ms, natural decay |
| `npcBubble` | An NPC speech bubble appears | Short soft pop, 60 ms |
| `levelUp` | Player gains a level | Four-note major arpeggio, ~400 ms total |
| `coinSpend` | Coins spent to build or purchase | Short shimmer, 100 ms |
| `error` | Invalid action attempted | Descending tone, 150 ms |

**Settings:** The player can independently toggle Sound Effects and Music (music is
currently unused). A haptic vibration (40 ms) fires alongside `chainCollect` if the
player enables haptics.

---

## Part 8: Typography

The game uses two text contexts: Phaser-rendered text (inside the game canvas) and
CSS-rendered text (all React UI panels).

| Context | Current font | Used for |
|---------|-------------|---------|
| Phaser display text | Arial bold | Floater text, chain badge, chain labels |
| Phaser tile glyphs (upper-tier resources) | Newsreader / Times New Roman serif | Single-glyph icon on processed resource tiles |
| CSS UI text | System sans-serif (Tailwind defaults) | All panel labels, buttons, counts, descriptions |

All three contexts should use a consistent game font. The glyph on processed-resource
tiles can remain a font glyph or become a dedicated icon sprite.

---

## Part 9: Cursor

**Location:** `src/TileObj.js` (Phaser's `useHandCursor: true` on all tiles)

| State | Condition |
|-------|-----------|
| Default | Over non-interactive areas |
| Pointer / hand | Over any board tile |
| Drag / grab | Active drag in progress (currently same as pointer) |

A custom cursor is optional but would replace the browser default in all three states.

---

## Part 10: Export Specifications

| Asset category | Logical size | Export scales | Format | Background |
|---------------|-------------|--------------|--------|-----------|
| Tile textures (all 20 resources × 2 states) | 74 × 74 px | 1× and 2× | PNG | Transparent |
| Upgrade star (spark) | 72 × 72 px | 1× and 2× | PNG | Transparent |
| Season icons (×4) | 42 × 42 px | 1× and 2× | PNG | Transparent |
| Board frame (Farm + Mine) | ~472 × 546 px | 1× and 2× | PNG or 9-slice PNG | Transparent |
| Board backgrounds (×5) | 960 × 640 px | 1× | PNG or JPG | Opaque |
| Town scene backgrounds (×3) | 1100 × 600 px | 1× | PNG or JPG | Opaque |
| Building illustrations (×8) | 80–160 px wide (varies) | 1× and 2× | PNG | Transparent |
| NPC avatars (×5 main + ×6 apprentices) | 64 × 64 px | 1× and 2× | PNG | Transparent |
| Custom cursor (optional, ×3 states) | 32 × 32 px | 1× and 2× | PNG or CUR | Transparent |
| Audio SFX (×8) | — | — | MP3 + OGG | — |

---

## Part 11: Asset Count Summary

| Category | Count |
|----------|-------|
| Tile textures (20 resources × 2 states) | 40 |
| Upgrade star | 1 |
| Season icons | 4 |
| Board frames | 2 |
| Board backgrounds | 5 |
| Town scene backgrounds | 3 |
| Building illustrations | 8 |
| NPC / character avatars (5 + 6) | 11 |
| Custom cursor states (optional) | 3 |
| **Total image assets** | **77** |
| Audio SFX | 8 |
| Typeface(s) | 1–2 |
