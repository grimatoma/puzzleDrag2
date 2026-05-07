# Reference Catalog — Source Game Mechanics

> **This file describes the *reference/source game*, not Hearthwood Vale.**
> Tile names, resource chains, thresholds, and worker catalogs here belong to the
> game this project is inspired by. Use this as a reference when expanding into new
> resource types (Vegetables, Fruits, Cattle, Sea) — not as a spec for current code.
> The authoritative spec for our game is `GAME_SPEC.md`.

*Sources: reference game screenshots (sets 1–5) + merged GDD/gameplay doc. Gaps still
remaining are marked `[GAP]`.*

---

## Status

| Source | Content |
|---|---|
| Screenshot sets 1–5 | UI layouts, visual inventory, session modals, zones |
| Merged GDD (docx) | Full resource chains, all tile species, full tool catalog, all workers, exact thresholds, hazards |

**Key corrections from GDD vs. earlier screenshot-only assumptions:**
- Crowns = Influence (same currency, two names in UI)
- Stars (★) are a per-tool-use score metric, not a spendable currency
- "2 free moves" on species traits is a literal in-session mechanic
- Chain thresholds convert directly during puzzle play — no buildings required for basic conversions
- All 3 environments (Farm, Mine, Sea) use the same core line-drawing mechanic

---

## 1. Core Loop

```
Enter a puzzle session (Farm / Mine / Sea)
    → Draw chains of 3+ matching tiles
    → Chains above threshold spawn higher-tier tiles at the endpoint
    → Session ends when days/supplies run out
    → Harvested resources enter persistent inventory
    → Spend resources on buildings, workers, tools, quests
    → Buildings/workers improve future session thresholds and yields
    → New buildings unlock new environments and species
```

Farm is the foundation. Farm produces bread/food, which buys supplies for Mine and Sea
expeditions. Mine and Sea produce construction materials and rare currencies that unlock
higher-tier buildings and tools.

---

## 2. Currencies

| Currency | Source | Spent On |
|---|---|---|
| **Gold (◉)** | Puzzle sessions, selling resources, quests, chests | Buildings, tools, market, hiring workers, buying species |
| **Runes** | Mysterious Ore (mine countdown tile), chests, portal, IAP | Mine/sea premium entry, certain buildings, Magic Portal summons |
| **Influence (= Crown)** | Decorations built, royal quests, social actions | Magic Portal summons, special unlocks |
| **Stars (★)** | Using tools during sessions (+12 to +232 per tool use) | Score/prestige — `[GAP]` whether spendable or purely cumulative |
| **Potions** | `[GAP]` source unclear | Speed up species research; some rare worker hire costs |
| **Bombs** | `[GAP]` presumably Mine drops | Several Mine worker hire costs |
| **Bread / Food** | Farm: 6 grain tiles → 1 bread | Worker hiring, Mine/Sea supplies via Kitchen building |
| **Supplies** | Kitchen converts food → supplies | Mine and Sea session turns |

**Sell/buy asymmetry** is extreme (Hay: sell 0◉, buy 40◉). Selling is an emergency option,
not normal play.

---

## 3. Puzzle Board — Core Rules (All Environments)

- **Grid**: 6×6 (standard).
- **Valid chain**: 3+ adjacent identical tiles, including diagonals (8 directions).
- **Path**: Continuous line; no tile reused; no self-crossing.
- **Commit**: Release finger/mouse to collect the chain.
- **Refill**: Tiles disappear; board refills from above.
- **Turn cost**: Normal chains consume 1 day/supply. Tools and free moves do not.
- **Dead board**: If no valid 3-tile chain exists, board auto-shuffles without consuming a turn.

### Chain Threshold and Tiering

The core strategic mechanic: **chains long enough produce higher-tier resources at the endpoint**.

- When the chain reaches a threshold, a **star marker** appears on that tile during
  selection — showing the player exactly where an upgrade will spawn.
- Overchaining past the threshold can spawn a second upgraded resource if the chain
  continues to a second multiple of the threshold.
- Skilled play routes chains so the upgrade endpoint is adjacent to other same-type tiles.

### Threshold Table (from GDD)

| Base Tile | Base Threshold | Produces | Worker That Reduces It |
|---|---|---|---|
| Grass | 6 (Peasant max: −8 → 10 grass needed) | 1 Hay | Peasant |
| Trees | 6 | 1 Wood | Lumberjack |
| Grain | 6 | 1 Bread | Reaper |
| Birds | 6 | 1 Eggs | Poultryman |
| Vegetables | 6 | 1 Soup | Vegetable Picker |
| Herd Animals | 5 | 1 Meat | Herder |
| Fruits | 7 | 1 Pie | Fruit Picker |
| Cattle | 6 | 1 Milk | Dairywoman |
| Flowers | 10 | 1 Honey | Orchardist |
| Mounts | 10 | 1 Horseshoe | Rancher |
| Dirt | 9 (Digger max: −4 → 9 dirt) | 1 Dirt pile | Digger |
| Rubble | 7 | 1 Rubble pile | Excavator |
| Stone | 8 | 1 Stone block | Stone Miner |
| Iron | 7 | 1 Iron bar | Iron Miner |
| Coal | 7 | 1 Coal cart | Coal Miner |
| Silver | 7 | 1 Silver bar | Silver Miner |
| Fish (deep water) | 5 | 1 Fish | Fisherman |
| Shallow Water | 5 | 1 Salt | Cook |

### Free Moves

Certain species, when active on the board, grant **free moves** — extra session turns that
don't decrement the day/supply counter:

| Species | Free Moves |
|---|---|
| Turkey | +2 |
| Palm Tree | +2 |
| Clover | +2 |
| Melon (rare, buy-only) | +5 |

`[GAP]` Exact trigger: does chaining the tile grant free moves, or does having it active add
them at session start?

---

## 4. Farm Session

**Counter**: Days in the year (turns).
**Entry**: Bread/food or coins. A number shown (e.g. "16") is `[GAP]` — likely remaining
days in the season or a quest counter.

### Before the Session
"Let's go farming!" modal shows:
- All tile types appearing this session (10 slots, 2×5 grid)
- Magnifying glass badge on rare/discoverable tiles
- Option to use a ×2 resource bag (doubles yield for the whole session)

### Farm Resource Chain and Prices

| Base → Product | Sell | Buy | Castle Needs |
|---|---|---|---|
| Grass (6) → Hay | 0◉ | 40◉ | — |
| Trees (6) → Wood | 4◉ | 40◉ | — |
| Grain (6) → Bread | 4◉ | 60◉ | — |
| Birds (6) → Eggs | 5◉ | 80◉ | — |
| Vegetables (6) → Soup | 20◉ | 220◉ | 53 |
| Herd Animals (5) → Meat | 21◉ | 240◉ | 47 |
| Fruits (7) → Pie | 90◉ | 840◉ | — |
| Cattle (6) → Milk | 100◉ | 900◉ | — |
| Flowers (10) → Honey | 300◉ | 1500◉ | — |
| Mounts (10) → Horseshoe | 400◉ | 1600◉ | — |

### Farm Hazards

| Hazard | Behavior | Counter |
|---|---|---|
| **Rats** | Active pests; eat plants when hungry; require chaining 3+ to remove | Cat tool, Terrier tool, Ratcatcher worker, Kennel building |
| **Fire** | Spreads to adjacent tiles each turn; destroys resources | Chain fire tiles to extinguish |
| **Wolves** | Eat certain animals; chase specific tile types (birds, sheep) | Rifle tool, Hound tool |

---

## 5. Mine Session

**Counter**: Supplies (bought or converted from food via Kitchen).

### Entry Paths (three tiers)
1. **Free ("Let's dig")** — standard session
2. **100◉ + 10 shovels** — better supply allocation
3. **2 Runes** — premium, likely best rewards

### Mine Resource Chain and Prices

| Base → Product | Sell | Buy | Castle Needs |
|---|---|---|---|
| Dirt (9) → Dirt pile | 1◉ | 40◉ | — |
| Rubble (7) → Rubble pile | 12◉ | 120◉ | — |
| Stone (8) → Stone block | 10◉ | 80◉ | — |
| Iron (7) → Iron bar | 11◉ | 100◉ | — |
| Coal (7) → Coal cart | 40◉ | 260◉ | 43 |
| Silver (7) → Silver bar | 40◉ | 300◉ | — |
| Diamond (10) → Diamond | 110◉ | 1000◉ | — |
| Gold (4) → Gold ingot | 110◉ | 1000◉ | — |
| Mysterious Ore + Dirt (countdown) → **Rune** | — | — | — |

### The Mysterious Ore Mechanic
- A **Mysterious Ore** tile appears among dirt tiles with a visible countdown timer
- Must be chained with dirt tiles before the countdown expires
- Success → 1 Rune (premium currency)
- Failure → degrades into ordinary dirt
- Creates urgency; rewards board awareness

### Mine Hazards

| Hazard | Behavior | Counter |
|---|---|---|
| **Lava** | Spreads to adjacent tiles over time; destroys resources | Water Pump tool |
| **Exploding Gas** | 3 connected clouds → explosion destroying surrounding tiles; tap individual clouds to neutralize before they connect | Flint tool (→ rubble), Sapper worker |
| **Moles** | `[GAP]` — mentioned in Explosives tool description | Explosives tool |

---

## 6. Sea Session

**Counter**: Voyage supplies / turns.
**Unique mechanic**: Player controls a **ship** that navigates tiles to reach chests.

### Sea Resource Chain and Prices

| Resource | Sell | Buy | Castle Needs |
|---|---|---|---|
| Shallow Water (5) → Salt | 11◉ | 80◉ | — |
| Deep Water (4) → Water bucket | 11◉ | 80◉ | — |
| Fish → Filled Net → Squid → Serpent → Oil | 600◉ | 2000◉ | — |
| Spice Island (2) → Spice | 40◉ | 320◉ | — |
| Cocoa Island (2) → Cocoa | 160◉ | 1280◉ | 33 |
| Squid (3) → Ink | 160◉ | 1280◉ | 12 |
| Silk Island (3) → Silk | 600◉ | 2000◉ | — |
| Sea Serpent (4) → Oil | 600◉ | 2000◉ | — |
| Jade Island (4) → Jade | 800◉ | 4000◉ | — |
| Oyster/Clam (4) → Pearl | 800◉ | 4000◉ | — |

### Sea Hazards

| Hazard | Behavior | Counter |
|---|---|---|
| **Sharks** | Move through water; consume fish | Shark Bait tool |
| **Ice/Icebergs** | Static blockers | `[GAP]` |
| **Storms** | `[GAP]` | Barometer tool |
| **Whirlpools** | `[GAP]` | Lucky Medallion (converts to coins) |

### Chest Mechanics

**Field/Mine chests**: Draw a chain of 3+ correct puzzle tiles → chest spawns at endpoint.

**Sea chests**: Draw a line of 2+ sea tiles → chest placed → navigate the ship to it → opens.

**Chest rarity**: Common / Uncommon / Rare. Found via Map tools, opened via Key tools.

---

## 7. Species / Tile Catalog System

Every tile type on the puzzle board is a **species** with a visual illustration, active/inactive
toggle, star bonus per collection, trait bullets, and special tile interactions.

### Discovery Methods

| Method | How It Works |
|---|---|
| **Chain discovery** | Long chains of the prerequisite species → chance to unlock the next in the tree |
| **Research (collect N)** | Accumulate a cumulative total over many sessions (shown as % with Potion speed-up) |
| **Special challenge** | Complete a specific challenge event |
| **Buy directly** | Pay coins immediately ("Find Now: N Coins") |

### Reading the species tables

Every entry below corresponds to one slot in the in-game Compendium. Columns:

- **Name** — display name. Bracketed names (e.g. `[Beet]`) are the catalog identity of an
  Unknown silhouette that has not yet been discovered; the silhouette's flavor text usually
  hints at the true species.
- **Looks** — what the tile/species illustration depicts in the Compendium.
- **Status / Unlock** — current player state: `Active` means already discovered and toggle-able
  on the board; otherwise the unlock path (chain prerequisite + N% research progress, flat
  research target, special challenge, daily reward, or coin buy-out via "Find Now").
- **Description & Actions** — full trait text from the Compendium, including star yield, free
  moves, hazard interactions, co-collection partners, and flavor tagline.

Star yield ("N stars when collected"), bonus coins, and free-move grants are **per-collection
bonuses** that fire every time a chain of that species is harvested. "Gives a chance to find"
hints at random extra spawn loot when the chain is long. "A long chain gives X" means
overchaining produces a bonus tile of category X at the endpoint.

### Grass

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Meadow Grass | Green grass | Active | Great to produce haystacks, slow to get bonus grain. Always greener on the other side. |
| Heather | Grass with purple flowers | Active | Eaten by rats. Grows on wuthering heights. |
| Clover | Green clover patch | Active | 2 stars when collected. Gives a chance to find: Start by collecting long chains. 2 free moves. Brings you luck. |
| `[Spiky Grass]` | Silhouette of spiky grass | 2% progress · Discover by long chains of Meadow Grass · Find Now: 245◉ | Can be collected with mounts. Straight from the Great Plains. |

### Grain

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Wheat | Golden wheat | Active | Avoided by rats. For those who like bread and games. |
| Corn | Tall corn stalks | Active | Can be collected with grass. Popcorn is yummy. |
| Buckwheat | Green stalks with white tops | Active | A long chain gives herd animals. Some do like it. Really. |
| Manna | Fluffy white crop | 96% progress · Collect 200 · Speed-up: 1 Potion | 3 stars when collected. Attracts rats. Extremely nutritious. |
| Rice | Rice stalks in water | Active | Resistant to swamp. Can be collected with starfruits. Responsible for the rice of an empire. |

### Vegetables

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Carrot | Orange carrot | Active | Easy to collect. Good for your eyes. |
| Eggplant | Purple eggplant | Active | A long chain gives vegetables. Tastes great with scrambled eggs. |
| Turnip | Pink and white turnip | Active | Gives a chance to find: Start by collecting long chains. Great to produce soup, slow to get bonus fruits. You cannot squeeze blood from it. |
| `[Beet]` | Silhouette of a beet | 72% progress · Discover by long chains of Turnips · Find Now: 27◉ | 5 stars when collected. Gives a chance to find: Start by collecting long chains. Deadly to pests. Are you ready for borscht? |
| `[Root Veg]` | Silhouette of a root veg | Locked | To unlock this species you must first research `[Beet Silhouette]`. |
| Cucumber | Green cucumber | Active | Gives a chance to find: Start by collecting long chains. Avoided by rats. It is cool. |
| `[Squash]` | Silhouette of a squash | 13% progress · Discover by long chains of Cucumbers · Find Now: 87◉ | Can be collected with grain. Loves playing racquet. |
| `[Mushroom]` | Silhouette of a mushroom | Special challenge unlock · Find Now: 100◉ | Resistant to swamp. Can be collected with rambutans. Everybody likes him. He's a fungi. |
| `[Pepper #1]` | Silhouette of a pepper | Locked | Unlocked only by completing a special collection. |
| `[Pepper #2]` | Silhouette of a pepper | Locked | To unlock this species you must first research `[Pepper Silhouette]`. |
| `[Broccoli]` (Rare) | Silhouette of broccoli | Find Now: 250◉ (buy-only) | A long chain gives flowers. Not the best choice for a bouquet. This species can only be bought. |

### Fruits

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Apple | Red apple | Active | Gives a chance to find: Start by collecting long chains. Great to produce pies. One a day keeps the doctor away. |
| `[Pear]` | Silhouette of a pear | 86% progress · Discover by long chains of Apples · Find Now: 13◉ | Avoided by rats. It is pear-shaped. |
| Golden Apple (Rare) | Gold apple | Active | 12 stars when collected. 5 coins when collected. For the most beautiful. |
| Blackberry | Blackberry | Active | 6 stars when collected. Gives a chance to find: Start by collecting long chains. Easy to collect. It's ironic that it replaces the apple. |
| `[Rambutan]` | Silhouette of a rambutan | 0% progress · Discover by long chains of Blackberries · Find Now: 150◉ | Gives a chance to find: Start by collecting long chains. Resistant to swamp. Can be collected with mushrooms. Badly needs a haircut. |
| `[Starfruit]` | Silhouette of a starfruit | Locked | To unlock this species you must first research `[Rambutan Silhouette]`. |
| Coconut | Brown coconut | Active | Avoided by rats. Can be collected with palms. Because of its sound, often mistaken for a horse. |
| Lemon | Yellow lemon | Active | Gives a chance to find: Start by collecting long chains. Great to get bonus flowers, slow to produce pie. Easily obtained from life. |
| `[Jackfruit]` | Silhouette of jackfruit | 0% progress · Discover by long chains of Lemons · Find Now: 200◉ | Gives a chance to find: Start by collecting long chains. Gives two times more pie. A long chain gives rats. Doesn't know jack. |
| `[Fruit (locked)]` | Silhouette of a fruit | Locked | To unlock this species you must first research `[Jackfruit Silhouette]`. |
| `[Melon]` (Rare) | Silhouette of a melon | Find Now: 200◉ (buy-only) | 6 stars when collected. You just need one to collect. 5 free moves. On your fields forever. This species can only be bought. |

### Flowers

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Pansy | Purple flower | Active | Great to produce honey. It actually is a very manly flower. |
| Water Lily | Pink lily/lotus on a pad | 40% progress · Collect 15 · Speed-up: 31 Potions | 24 stars when collected. Resistant to swamp. Can be collected with reed. Leaves a lasting impression. |

### Trees

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Oak | Standard tree | Active | Great to produce wood, slow to get bonus birds. Grows from little acorns. |
| Birch | Tree with white trunk | Active | Great to get bonus birds, slow to produce wood. Tall and flexible. |
| Willow | Weeping willow | Active | 2 stars when collected. A long chain gives vegetables. Listen to the wind in its boughs. |
| Fir | Evergreen tree | Active | Can be collected with sheep. Perfect for the winter holidays. |
| Cypress | Tall skinny tree | Active | Deadly to pests. Eaten by wolves. Can be a bit prickly. |
| Palm Tree | Palm tree | Active | Can be collected with coconuts. 2 free moves. A tree in the palm of your hand. |

### Birds

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Turkey | Brown turkey | Active | 2 free moves. Welcomes all pilgrims. |
| Pheasant | Pheasant | Active | Can be collected with grass. Pleasant. |
| Chicken | White chicken | Active | Great to produce eggs, slow to get bonus herd animals. Not very courageous. |
| Hen | Black hen | Active | Great to get bonus herd animals, slow to produce eggs. Not always wet. |
| Rooster | Colorful rooster | Active | 4 stars when collected. Avoided by wolves. Can spell cock-a-doodle-doo. |
| Wild Goose | Canadian goose | Active | Attracts wolves. Prone to wanderlust. |
| Goose | White goose | 39% progress · Collect 200 · Speed-up: 18 Potions | A long chain gives vegetables. Its quill is said to be quite dangerous. |
| Parrot | Colorful macaw | Active | 3 stars when collected. Can be collected with trees. Her name is Polly and she wants a cracker. |
| Phoenix (Rare) | Fiery bird | Active | 2 stars when collected. Attracts wolves. Deadly to pests. Can light your fire. |
| `[Dodo]` (Rare) | Silhouette of a dodo | Find Now: 250◉ (buy-only) | All are automatically collected when you make a chain. A proactive bird, always says "do, do!". This species can only be bought. |
| `[Pig-in-Disguise]` (Rare) | Silhouette of a pig in disguise | Find Now: 100,000◉ (buy-only) | 2 stars when collected. Copies the last long chain bonus. "Day 236: They still think I'm a bird." This species can only be bought. |

### Herd Animals

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Pig | Pink pig | Active | More experience for long chains. Surprisingly tidy. |
| Hog | Grey hog | Active | Gives a chance to find: Start by collecting long chains. Great to produce meat, slow to get bonus cattle. Not into healthy food. |
| `[Boar]` | Silhouette of a boar | 78% progress · Discover by long chains of Hogs · Find Now: 21◉ | Gives a chance to find: Start by collecting long chains. Can be collected with vegetables. Works hard not to appear a bore. |
| `[Boar-tier locked]` | Silhouette of an animal | Locked | To unlock this species you must first research `[Boar Silhouette]`. |
| Sheep | White sheep | Active | Gives a chance to find: Start by collecting long chains. Avoided by wolves. Very silent. |
| `[Alpaca]` | Silhouette of an alpaca/fluffy sheep | 20% progress · Discover by long chains of Sheep · Find Now: 80◉ | Gives a chance to find: Start by collecting long chains. Avoided by wolves. It's never cold. |
| `[Alpaca-tier locked]` | Silhouette of an animal | Locked | To unlock this species you must first research `[Alpaca Silhouette]`. |
| Goat | Brown goat | Active | Gives a chance to find: Start by collecting long chains. Can be collected with rats. Stubborn, eats everything. |
| `[Ram]` | Silhouette of a horned ram | 1% progress · Discover by long chains of Goats · Find Now: 99◉ | Gives a chance to find: Start by collecting long chains. Can be collected with carrots. Sports a fashionable beard. |
| `[Ram-tier locked]` | Silhouette of an animal | Locked | To unlock this species you must first research `[Ram Silhouette]`. |
| `[Warthog]` (Rare) | Silhouette of a warthog | Find Now: 250◉ (buy-only) | Avoided by wolves. A long chain gives mounts. A savage pig from a wild, savage age. This species can only be bought. |

### Cattle

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Cow | Brown and white cow | Active | Easy to collect. Sorry for the lactose intolerance! |
| Longhorn | Brown cow with long horns | Active | 24 stars when collected. Gives a chance to find: Start by collecting long chains. Hardcore vegan. |
| `[Cattle locked #1]` | Silhouette of cattle | Locked | To unlock this species you must first research the prerequisite silhouette. |
| `[Cattle locked #2]` | Silhouette of cattle | Locked | To unlock this species you must first research the prerequisite silhouette. |
| `[Triceratops]` (Rare) | Silhouette of a triceratops | Daily Rewards day 30 only | Avoided by wolves. Gives two times more milk. Played in the movie Cretaceous Park. |

### Mounts

| Name | Looks | Status / Unlock | Description & Actions |
|---|---|---|---|
| Horse | Brown horse | Active | Gives a chance to find: Start by collecting long chains. Easy to collect. Look at it. It's amazing! |
| `[Donkey]` | Silhouette of a donkey | 0% progress · Discover by long chains of Horses · Find Now: 250◉ | Can be collected with vegetables. Great to produce horseshoes, slow to get bonus coins. After he got his PhD, he's a real smart ass. |
| Moose | Brown moose | Active | 29 stars when collected. Resistant to swamp. He loves chocolate mousse. |
| `[Mammoth]` (Rare) | Silhouette of a mammoth | Find Now: 300◉ (buy-only) | 58 stars when collected. You just need one to collect. A mean mammoth is just a woolly bully. This species can only be bought. |

### Rare / Buy-Only Species — quick reference

| Species | Category | Cost / Condition | Notable trait |
|---|---|---|---|
| Golden Apple | Fruit | Active (already discovered) | 12★ per collection · +5◉ per collection |
| `[Melon]` | Fruit | Buy-only · 200◉ | 6★ · +5 free moves · permanent on fields · single-tile collect |
| `[Broccoli]` | Vegetable | Buy-only · 250◉ | Long chain → flowers |
| `[Warthog]` | Herd | Buy-only · 250◉ | Avoided by wolves · long chain → mounts |
| Phoenix | Bird | Active | 2★ · attracts wolves · deadly to pests |
| `[Dodo]` | Bird | Buy-only · 250◉ | Auto-collects all when a chain is made |
| `[Pig-in-Disguise]` | Bird | Buy-only · 100,000◉ | 2★ · copies last long-chain bonus |
| `[Triceratops]` | Cattle | Daily Rewards day 30 | Avoided by wolves · 2× milk yield |
| `[Mammoth]` | Mount | Buy-only · 300◉ | 58★ · single-tile collect |

### Species Special Interactions (cross-cutting tags)

- **Resistant to swamp**: Rice, Moose, Water Lily, Mushroom, Rambutan — chain through swamp
  tiles without yield penalty.
- **Avoided by rats**: Wheat, Coconut, Cypress, Pear, Cucumber — rats will not consume these.
- **Attracts rats**: Manna, Jackfruit (long chain) — increases rat hazard pressure when active.
- **Avoided by wolves**: Rooster, Sheep, Alpaca, Warthog, Triceratops — wolves skip these.
- **Attracts wolves**: Wild Goose, Phoenix — wolf hazards spawn more frequently.
- **Eaten by wolves**: Cypress — chain it before wolves reach it.
- **Eaten by rats**: Heather — chain it before rats reach it.
- **Deadly to pests**: Cypress, Beet, Phoenix — kill rats/pests on contact.
- **Co-collection partners** ("Can be collected with X"): Coconut + Palm Tree, Corn + Grass,
  Pheasant + Grass, Fir + Sheep, Parrot + Trees, Rice + Starfruit, Squash + Grain, Mushroom +
  Rambutan, Rambutan + Mushroom, Donkey + Vegetables, Boar + Vegetables, Goat + Rats,
  Ram + Carrots, Spiky Grass + Mounts, Water Lily + Reed.
- **Free-move grants**: Turkey (+2), Palm Tree (+2), Clover (+2), Melon (+5).
- **Per-collection coin/star bonuses**: Golden Apple (+5◉, 12★), Blackberry (6★),
  Rooster (4★), Parrot (3★), Manna (3★), Phoenix (2★), Pig-in-Disguise (2★), Willow (2★),
  Clover (2★), Beet (5★), Melon (6★), Longhorn (24★), Water Lily (24★), Moose (29★),
  Mammoth (58★).
- **"Long chain gives X"** (overchain bonus tile): Buckwheat → herd animals, Eggplant → vegetables,
  Goose → vegetables, Willow → vegetables, Broccoli → flowers, Warthog → mounts,
  Jackfruit → rats (penalty).
- **"Gives two times more"**: Jackfruit → 2× pie, Triceratops → 2× milk.
- **Single-tile collect**: Melon, Mammoth — one tile completes the chain.
- **Auto-collect on chain made**: Dodo — clears all instances when any chain is committed.
- **Copies last long-chain bonus**: Pig-in-Disguise — repeats whichever overchain reward fired most recently.
- **Permanent on fields**: Melon — once placed, never removed by fills.

---

## 8. Tool System

Tools are **consumable, turn-free board-manipulation items**. Primary use: reshape the board
to set up larger manual chains, not just to collect resources.

### Acquisition
- **Workshop-crafted**: require specific resources
- **Portal-only (magic)**: summoned with Influence via Magic Portal; give 232★ each

### Farm Tools

| Tool | Effect | Craft Cost | ★ |
|---|---|---|---|
| Rake | Collect all grass | — | +10 |
| Axe | Collect all trees | 1 Stone | +24 |
| Sapling | Turn all grass into trees | 1 Coal + 1 Water | +24 |
| Trimmer | Replace all trees with grass | 1 Bread + 1 Stone | +29 |
| Scythe | Collect all grain | 1 Stone | +24 |
| Fertilizer | All refill tiles are grain | 1 Hay + 1 Dirt | +12 |
| Plough | Collect all grass AND grain | 1 Coal + 1 Stone | +24 |
| Bird Cage | Collect all birds | 1 Hay | +24 |
| Bird Feed | Turn all grain into birds | 2 Bread + 1 Water | +12 |
| Hoe | Collect all vegetables | 1 Wood + 2 Bread | +35 |
| Fruit Picker | Collect all fruits | 1 Wood + 1 Bread + 2 Stone + 1 Water | +116 |
| Milk Churn | Collect all cattle | 1 Wood + 1 Bread + 2 Stone + 1 Bucket | +116 |
| Bee | Collect all flowers | 1 Wood + 1 Stone + 1 Squid | +174 |
| Wheelbarrow | Remove all swamp tiles | 3 Coal | +12 |
| Cat | Remove all rats | 2 Stone + 1 Water | +24 |
| Rifle | Remove all wolves | 1 Wood + 1 Stone + 1 Silver | +58 |
| Terrier | Scare rats, make space for vegetables | 3 Bread + 1 Stone + 2 Silver | +58 |
| Hound | Scare wolves, make space for herd animals | 1 Bread + 3 Stone + 2 Silver | +58 |

### Mine Tools

| Tool | Effect | Craft Cost | ★ |
|---|---|---|---|
| Shovel | Collect all dirt | — | +10 |
| Stone Hammer | Collect all stones | 1 Wood + 1 Stone | +24 |
| Iron Pick | Collect all iron | 1 Wood + 1 Stone | +24 |
| Explosives | Collect all rubble + remove moles | 1 Hay + 1 Dirt | +12 |
| Flint | Turn all gas into rubble | 2 Coal | +24 |
| Water Pump | Change lava into rubble | 1 Water | +24 |
| Drill | Collect all iron AND stones | 2 Bombs | +24 |
| Magnet | Collect all iron + attract more iron | 1 Coal + 1 Dirt + 1 Bucket | +24 |
| Silver Pick | Collect all silver | 2 Wood + 2 Stone | +35 |
| Coal Transmuter | Turn all silver into coal | 1 Wood + 1 Stone + 2 Buckets | +58 |
| Diamond Hammer | Collect all diamonds | 3 Wood + 3 Stone | +116 |
| Gold Pick | Collect all gold | 3 Wood + 3 Stone | +116 |
| Iron Ration | Refill 6 mine supply moves | 3 Buckets + 1 Spice | +116 |

### Sea Tools (most work on 3×3 areas, not board-wide)

| Tool | Effect | Craft Cost | ★ |
|---|---|---|---|
| Compasses | Swap any two tiles | 1 Wood + 1 Stone | +12 |
| Flag | Shallow → deep water | 1 Hay + 1 Wood + 2 Buckets | +12 |
| Oar | Deep → shallow water | 1 Hay + 1 Wood + 2 Water | +12 |
| Buoy | Collect all tiles between 3 buoys | 1 Stone + 1 Stone block + 1 Silver | +12 |
| Fishing Net | Collect all fish in 3×3 | 1 Hay + 1 Bucket | +12 |
| Spice Grinder | Collect all spice in 3×3 | 1 Wood + 1 Stone | +12 |
| Squid Trap | Collect all squid in 3×3 | 1 Bread + 2 Stone | +12 |
| Harpoon | Collect all serpents in 3×3 | 2 Bread + 1 Stone + 2 Stone block | +12 |
| Scissors | Collect all silk in 3×3 | 2 Hay + 1 Wood + 2 Silver | +12 |
| Chisel | Collect all jade in 3×3 | 1 Wood + 1 Stone + 1 Water | +12 |
| Fishing Hook | Change all land tiles into sea creatures | 2 Bread + 1 Coal + 2 Silver | +12 |
| Shark Bait | Remove all sharks | 1 Meat | +12 |
| Barometer | Remove all storms | 1 Silver | +12 |

### Chest / Map Tools

| Tool | Effect |
|---|---|
| Common / Uncommon / Rare Map | Start looking for a chest of that rarity |
| Common / Rare / Very Rare Key | Open a chest of matching rarity |
| Uncommon / Rare Spyglass | Find a chest of that rarity |

### Portal-Only Magic Tools (all: 232★, Influence cost)

| Tool | Effect |
|---|---|
| Magic Wand | Collect all tiles of a chosen type |
| Hourglass | Undo last move |
| Golden Idol | Transform all grass into cattle |
| Golden Carrot | Transform all grass into vegetables |
| Golden Sheep | Transform all trees into herd animals |
| Philosopher's Stone | Transform all metals into gold |
| Rose-colored Glass | Transform all dirt into diamonds |
| Magic Lamp | Transform all gas into bonus coins |
| Stone Mirror | Change all rocks to metals |
| Metal Mirror | Change all metals to rocks |
| Coal Detector | Collect dirt/rubble, find coal |
| Silver Detector | Collect dirt/rubble, find silver |
| Steering Wheel | +5 additional ship moves (sea) |
| Gold Sextant | Change sandbanks into spice islands |
| Gold Fish | Change sandbanks into fish |
| Lucky Medallion | Change whirlpools into coins |
| Magic Seed | Farm year lasts twice as long |

---

## 9. Worker System

Workers permanently reduce tile-to-resource thresholds. They never expire. Max hire count
determines the floor ratio. All hires cost `1 Worker` (generic resource unit) + specific goods.

### Farm Workers

| Worker | Max | Effect (maxed ratio) | Hire Cost |
|---|---|---|---|
| Peasant | 5/5 | 10 grass = 1 hay | 1 Worker + 6 Hay + 8 Bread |
| Reaper | 4/4 | 6 grain = 1 bread | 1 Worker + 10 Bread |
| Lumberjack | 5/5 | 1 tree = 1 wood | 1 Worker + 6 Wood + 8 Bread |
| Grain Trader | 4/4 | 4 grain = 1 vegetable | 1 Worker + 8 Bread + 10 Stone + 10 Coal |
| Vegetable Picker | 4/4 | 6 veg = 1 soup | 1 Worker + 10 Hay + 20 Bread + 10 Stone + 15 Iron |
| Gardener | 3/3 | 5 veg = 1 fruit | 1 Worker + 8 Hay + 16 Bread + 12 Stone + 4 Soup |
| Fruit Picker | 2/2 | 7 fruit = 1 pie | 1 Worker + 6 Hay + 10 Bread + 12 Stone + 2 Soup |
| Orchardist | 2/2 | 6 fruit = 1 flower | 1 Worker + 9 Hay + 16 Bread + 10 Stone + 9 Soup |
| Poultryman | 1/1 | 8 birds = 1 egg | 1 Worker + 19 Bread + 11 Eggs |
| Farmer | 3/4 | 7 birds = 1 herd animal | 1 Worker + 12 Bread + 10 Stone + 8 Meat |
| Herder | 3/4 | 5 herd = 1 meat | 1 Worker + 4 Hay + 10 Bread + 12 Stone + 16 Meat |
| Dairywoman | 2/2 | 6 cattle = 1 milk | 1 Worker + 6 Hay + 3 Soup + 3 Meat + 15 Iron |
| Rancher | 2/2 | 6 cattle = 1 mount | 1 Worker + 9 Hay + 9 Bread + 12 Stone + 9 Soup |
| Ratcatcher | 2/2 | 10 rats = 1 coin | 1 Worker + 6 Wood + 6 Coal + 12 Bombs |
| Sapper | 2/2 | 7 gas = 1 coin | 1 Worker + 6 Wood + 6 Coal + 15 Bombs |

### Mine Workers

| Worker | Max | Effect (maxed) | Hire Cost |
|---|---|---|---|
| Digger | 4/4 | 9 dirt = 1 pile | 1 Worker + 5 Bread + 5 Coal |
| Excavator | 3/3 | 7 rubble = 1 pile | 1 Worker + 4 Hay + 4 Bread + 8 Coal |
| Stone Miner | 3/3 | 8 stone = 1 block | 1 Worker + 8 Bread + 4 Stone |
| Engineer | 3/4 | 5 stone = 1 coal | 1 Worker + 8 Bread + 12 Stone + 12 Iron |
| Coal Miner | 3/4 | 7 coal = 1 cart | 1 Worker + 12 Bread + 10 Stone + 8 Coal + 16 Iron |
| Jeweler | 2/4 | 6 coal = 1 diamond | 1 Worker + 9 Bread + 10 Stone + 12 Iron + 4 Silver |
| Iron Miner | 3/3 | 7 iron = 1 iron bar | 1 Worker + 8 Bread + 4 Iron bar |
| Alchemist | 3/4 | 4 iron = 1 silver | 1 Worker + 8 Bread + 12 Stone + 12 Iron + 6 Silver |
| Silver Miner | 3/4 | 7 silver = 1 bar | 1 Worker + 12 Bread + 8 Stone + 8 Coal + 16 Silver bar |
| Sculptor | 3/3 | 10 rubble = 1 coin | 1 Worker + 4 Hay + 4 Bread + 4 Coal + 8 Bombs |

### Sea Workers

| Worker | Max | Effect (maxed) | Hire Cost |
|---|---|---|---|
| Deckhand | 4/4 | 4 deep water = 1 bucket | 1 Worker + 5 Wood + 5 Stone + 5 Buckets |
| Fisherman | 4/4 | 5 deep water = 1 fish | 1 Worker + 10 Bread + 5 Buckets |
| Boatwoman | 4/4 | 2 fish = 1 net | 1 Worker + 6 Bread + 5 Stone + 10 Buckets |
| Trawlerman | 5/5 | 2 fish = 1 squid | 1 Worker + 18 Hay + 12 Iron bar + 6 Squid |
| Harpooner | 3/3 | 4 squid = 1 serpent | 1 Worker + 16 Hay + 12 Iron bar + 12 Squid |
| Oilman | 3/3 | 3 serpents = 1 oil | 1 Worker + 12 Stone + 12 Iron bar + 12 Squid |
| Artisan | 2/2 | 4 clam = 1 pearl | 1 Worker + 3 Stone + 3 Silver bar + 3 Pearl |
| Buccaneer | 1/1 | 6 oyster = 1 coin | 1 Worker + 4 Silver bar + 4 Pearl + 2 Map |
| Cook | 4/4 | 5 shallow water = 1 salt | 1 Worker + 5 Bread + 5 Salt |
| Chef | 4/4 | 2 islands = 1 spice | 1 Worker + 10 Stone + 10 Salt |
| Navigator | 5/5 | 5 spice island = 1 cocoa island | 1 Worker + 18 Wood + 12 Stone + 6 Spice |
| Confectioner | 4/5 | 2 islands = 1 cocoa | 1 Worker + 10 Bread + 10 Stone + 5 Spice |
| Captain | 3/3 | 4 cocoa island = 1 silk island | 1 Worker + 16 Wood + 10 Stone + 12 Spice |
| Explorer | 2/2 | 5 silk island = 1 jade island | 1 Worker + 15 Wood + 10 Stone + 3 Jade |
| Antiquarian | 2/2 | 4 islands = 1 jade | 1 Worker + 3 Soup + 3 Soup (red/borscht) + 3 Jade |
| Pirate | 1/1 | 5 jade island = 1 coin | 1 Worker + 4 Gold + 2 Potions + 2 Barrels |

---

## 10. Building System

Buildings are persistent; they unlock resource chains, improve yields, expand capacity,
and counter hazards.

### Building Categories

| Category | Examples | Function |
|---|---|---|
| Core progression | Camp → Settlement → Village Hall → Town Center | Main HQ; upgrades unlock zones and buildings |
| Housing | Cottage, House (+4 workers) | Increases worker capacity |
| Crafting | Workshop tiers | Craft tools; may expand tool inventory caps |
| Farm unlocks | Farm, Meadow | Enable crops, birds, herd animals |
| Farm bonuses | Windmill, Yard, Animal Pen, Silo, Barns, Greenhouse, Well | Higher spawn rates; free moves; longer sessions; save field state |
| Farm hazard counters | Ratcatcher building, Kennel | Free rat/wolf removal moves |
| Mine unlocks | Cave | Enables mine sessions |
| Mine bonuses | Forge, Mine Shafts, Larder, Pantry | More ore; more supplies/session length |
| Sea unlocks | Harbor, Dock | Enables voyages; Dock may save sea board between sessions |
| Sea bonuses | Fishing Net building, Fishing Boat, Spice Guild | More fish; unlock Spice Islands tile type |
| Economy | Market, Kitchen | Market: buy/sell resources; Kitchen: food → supplies |
| Utility | Architect, Archaeologist, Magic Portal, Sorceress's Hut | Move buildings; find chests; summon tools/workers; watch ads |
| Decorations | Flowers, bushes, paint | Generate Influence on build; cosmetic |

### The Magic Portal
- Built in the village (costs resources)
- Consumes **Influence (Crowns)** to summon magic tools and rare workers
- `[GAP]` Whether summons are random draws or player-selected

### The Sorceress's Hut
- Costs 100◉ to build
- After building, player watches ads to earn a reward (the free-to-play path to magic tools)

### Influence (Crown) Economy
- **Earned by**: building decorations (e.g., Violet Flowers: +20 Influence each), royal quests, social
- **Spent on**: Magic Portal summons, special unlocks

### Map Blockers
Overworld obstacles (trees, rocks, roads) require resource payments to clear — function as
quest-like progression gates.

### Property / Territory Upgrades
Map-level purchases that modify global parameters:
- **Beach** (1500◉): castle rune timer −1h; one-time +1 rune on build
- Each property permanently shortens the Castle's passive rune timer

---

## 11. The Castle

Central hub node (not a zone). Two functions:

1. **Passive rune generation**: ~1 rune per 23h base timer; Beach and similar properties
   reduce it by 1h each
2. **Castle resource contributions**: certain resources have "Castle Needs: N" targets

| Resource | Castle Needs |
|---|---|
| Soup | 53 |
| Meat | 47 |
| Coal | 43 |
| Cocoa | 33 |
| Ink | 12 |

`[GAP]` What the Castle contribution system unlocks — royal quests, Castle upgrades, or
a separate leaderboard/social mechanic.

---

## 12. Zone / World System

The kingdom has **6 zones + 1 Castle node**:

| Zone | Location | Character |
|---|---|---|
| Zone One | West coast | Windmill, haystacks, beach |
| Zone Two | Center-left | River-crossing town |
| Zone Three | South-west | Large farm, roaming animals |
| Zone Four | North center | Island settlement |
| Zone Five | South center | Large river harbor (most developed) |
| Zone Six | East/ocean | Coastal pirate town, ship on water |
| Castle | Center | Central hub, rune generation |

- Zones unlock sequentially as the player levels up (XP from puzzle boards + challenges)
- Each zone has its own puzzle board, building set, NPC roster, and discoverable species
- Zone Five at late game has: mining complex, harbor/dock, lighthouse, mill, tavern,
  market, bakery, windmill, residential house, chicken coop, orchard, stone arch portal

### In-World Building Tap Tooltip
Tapping a building shows: name + one-line description + two action buttons (build/upgrade).
Example: "House — Sweet home for 4 new workers."

---

## 13. Quest and Challenge System

| Type | Description | Reward |
|---|---|---|
| Basic quests | "Collect N of resource X (M left)" | Crowns/coins |
| Challenges | Short-term goals: use tools, build structures, hire workers | XP, gold, influence, tools, unlock triggers |
| Royal quests | Large resource contributions (tied to Castle or social) | Large Influence grants |
| Daily rewards | Consecutive login streak | Gold, runes, influence, tools, supplies |
| Exploration blockers | Pay resource bundle to clear map obstacle | Access to new area |

The **Manual** panel (right page of Quests tab) shows a named story NPC delivering
narrative context for the current quest batch.

---

## 14. Monetization

| Feature | Free Path | Paid Path |
|---|---|---|
| Magic tools | Sorceress's Hut (ads) | IAP bundle ($2.99: 20 bags + 1 wand) |
| Runes | Castle timer, Mysterious Ore, chests | Buy directly |
| Influence | Decorations, quests | Buy directly |
| Workers | Farm resources + hiring | "10 Workers" bundle ($2.99) |
| Session length | Magic Seed (portal) | — |
| Tool capacity | Default cap | Tools limit ×2 ($4.99 permanent) |
| Challenges | Base count | 2× more challenges ($5.99 permanent) |
| Bonus frequency | Default | Bonuses 2× more often ($5.99 permanent) |
| Colors | Default palette | 42 more colors ($3.99 permanent) |

---

## 15. Open Questions

| # | Gap | Context |
|---|---|---|
| 1 | Stars — spendable or score-only? | Tools give 12–232★; no spend UI seen |
| 2 | Potions — source and acquisition | Used to speed research; some worker hire costs |
| 3 | Bombs — source and acquisition | Mine worker hire costs (Ratcatcher, Sapper, Sculptor) |
| 4 | Barrels — what they are | Pirate worker hire cost |
| 5 | "+0%" / "+16%" HUD modifier | Top-right of HUD; changes with progression |
| 6 | Free move trigger | Does chaining the species grant free moves, or does having it Active add them at session start? |
| 7 | Active entity limit per category | Can all 9 discovered birds be active simultaneously? |
| 8 | Magic Portal summon — random draw or player choice? | Costs Influence; selection mechanic not shown |
| 9 | Castle contribution system | "Castle Needs: N" resources — what unlocks when filled? |
| 10 | Swamp tiles — source and behavior | Several species are "resistant to swamp"; Wheelbarrow removes swamp |
| 11 | Sandbanks — tile type details | Gold Sextant converts them; appear in sea sessions |
| 12 | Ship navigation input | Sea chest tutorial shows ship movement but exact gesture not clear |
| 13 | Field state saving | GDD mentions Silos/Barns "save field state" — does this preserve tile layout between sessions? |
| 14 | Architect and Archaeologist mechanics | "Move buildings" and "find treasure chests" — exact interactions unclear |
| 15 | Realm tier progression above "fief" | Kingdom summary shows tier label; progression conditions unknown |
| 16 | Daily login streak reward schedule | Referenced but schedule not documented |
| 17 | XP → level scaling | Level 10 vs Level 71 visible; exact XP curve unknown |
| 18 | Envelope icon (Pioneer Tools collection reward) | Seen in Compendium screenshot; reward type unclear |
| 19 | Worker generic unit ("1 Worker" in hire costs) | Is this a resource produced by housing or hired separately? |
| 20 | Whether overchaing star count has a cap | Can one chain produce 3+ upgrades? |
