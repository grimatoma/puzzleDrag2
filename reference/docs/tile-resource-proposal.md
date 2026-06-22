# Tile → Resource Proposal

## The rule

A tile is the **living/growing source**; the tier‑1 resource is the **one good it yields**.

- **Animals → their natural yield** (egg, milk, wool, meat, cheese, honey). The source and yield already differ, so no "factory" step is needed.
- **Crops → one processing step** (flour, plank, juice, broth). A crop turning into a picture of itself is a dud, so it gets the first pantry good.

**Category default is a default, not a law.** Most tiles in a category produce the category resource, but any tile may override it. Goats sit in the `herd` category but make **cheese**; sheep sit in `herd` but make **wool**. This is per‑tile (`tilePowers[id].producesResource`), no new category required.

Anything that combines two or more tier‑1 resources is a **tier‑2 recipe** (bread, soup, pie), not a tile output.

---

## Farm

| Tile | Category | Tier‑1 resource | Note |
|---|---|---|---|
| Grass | grass | Hay Bale | |
| Meadow Grass | grass | Hay Bale | |
| Spiky Grass | grass | Hay Bale | |
| Clover | grass | Hay Bale | **move out of `bird`** — clover is forage |
| Wheat | grain | Flour | |
| Corn | grain | Flour | answers "corn→flour, not corn→corn" |
| Buckwheat | grain | Flour | |
| Manna | grain | Flour | |
| Rice | grain | Flour | |
| Oak | tree | Plank | |
| Birch | tree | Plank | |
| Willow | tree | Plank | |
| Fir | tree | Plank | |
| Cypress | tree | Plank | |
| Palm | tree | Plank | |
| Apple | fruit | Juice | |
| Pear | fruit | Juice | |
| Golden Apple | fruit | Juice | |
| Rambutan | fruit | Juice | |
| Starfruit | fruit | Juice | |
| Coconut | fruit | Juice | |
| Lemon | fruit | Juice | |
| Jackfruit | fruit | Juice | |
| Blackberry | fruit | **Jam** | override — berries preserve, don't press |
| Melon | fruit | Juice | **move out of `bird`** — melon is a fruit |
| Carrot | veg | **Broth** | see open question below |
| Eggplant | veg | Broth | |
| Turnip | veg | Broth | |
| Beet | veg | Broth | |
| Cucumber | veg | Broth | |
| Squash | veg | Broth | |
| Mushroom | veg | Broth | |
| Pepper | veg | Broth | |
| Broccoli | veg | Broth | |
| Pansy | flower | Honey | |
| Water Lily | flower | Honey | |
| Heather | flower | Honey | **move out of `grass`** — flowering shrub |
| Turkey | bird | Egg | |
| Pheasant | bird | Egg | |
| Chicken | bird | Egg | |
| Hen | bird | Egg | |
| Rooster | bird | Egg | |
| Wild Goose | bird | Egg | |
| Goose | bird | Egg | |
| Parrot | bird | Egg | |
| Phoenix | bird | Egg | |
| Dodo | bird | Egg | |
| Pig‑in‑Disguise | bird | Egg | |
| Pig | herd | Meat | |
| Hog | herd | Meat | |
| Boar | herd | Meat | |
| Warthog | herd | Meat | |
| Sheep | herd | **Wool** | override |
| Alpaca | herd | **Wool** | override |
| Ram | herd | **Wool** | override |
| Goat | herd | **Cheese** | override |
| Cow | cattle | Milk | |
| Longhorn | cattle | Milk | |
| Triceratops | cattle | Milk | |
| Horse | mount | Horseshoe | |
| Donkey | mount | Horseshoe | |
| Moose | mount | Horseshoe | |
| Mammoth | mount | Horseshoe | |

**Changes from today:** fruit `Pie`→`Juice` (pie becomes tier‑2), veg `Soup`→`Broth` (soup becomes tier‑2), sheep/alpaca/ram `Meat`→`Wool`, goat `Meat`→`Cheese`, and three misfiled tiles moved (clover, melon, heather). New tier‑1 resources to add: **Juice, Broth, Wool, Cheese**.

---

## Mine — already clean, no changes

| Tile | Category | Tier‑1 resource |
|---|---|---|
| Stone | mine | Block |
| Iron Ore | mine | Iron Bar |
| Copper Ore | mine | Copper Bar |
| Coal | mine | Coke |
| Gem | mine | Cut Gem |
| Gold | mine | Gold Bar |
| Dirt | special | Dirt |

Every one is raw ore/rock → smelted or cut form. This is the model the farm should match.

---

## Water — already clean, no changes

| Tile | Category | Tier‑1 resource | Note |
|---|---|---|---|
| Sardine | fish | Fillet | animal → processed (filleted) |
| Mackerel | fish | Fillet | |
| Clam | fish | Sea Shells | animal → yield |
| Oyster | fish | Pearls | animal → yield |
| Kelp | fish | Fish Oil | "crop" → processed |

Consistent with the rule: the kelp (a plant) is processed; the shellfish give a yield.

---

## Tier‑2 recipes (combine tier‑1 resources)

These already exist in `RECIPES`. They're the second tier — a tile never outputs these directly.

| Item | Station | Inputs |
|---|---|---|
| Bread | bakery | flour ×3 + eggs ×1 |
| Honeyroll | bakery | flour ×2 + eggs ×1 + jam ×1 |
| Harvest Pie | bakery | flour ×2 + jam ×1 + eggs ×1 |
| Festival Loaf | bakery | flour ×3 + jam ×2 + eggs ×1 |
| Wedding Pie | bakery | pie ×1 + honey ×1 + jam ×2 |
| Preserve | larder | jam ×2 + eggs ×1 |
| Tincture | larder | jam ×3 |
| Chowder | larder | fillet ×2 + milk ×1 + soup ×1 |
| Cured Meat | smokehouse | meat ×2 + coke ×1 |
| Iron Ration | kitchen | flour ×5 + meat ×1 + iron bar ×1 |
| Supplies | kitchen | flour ×5 |

**Demote from tile output to tier‑2 recipe** (they are composites today masquerading as tier‑1):

| Item | Suggested inputs |
|---|---|
| Soup | broth ×2 + meat ×1 |
| Pie | juice ×1 + flour ×2 |
| **Pickle Jar** | broth ×1 + (vinegar/brine) — the home for your "pickled carrot" idea |
| Stew | broth ×1 + meat ×1 |
| Cheese Wheel | cheese ×2 + milk ×1 *(optional, if cheese tier‑1 feels too valuable raw)* |

---

## Open question: carrot / vegetable tier‑1

You're right that a **picked carrot isn't a usable recipe ingredient**, so the veg tier‑1 needs to be a cooked/processed base, and **Pickle Jar moves to tier‑2**.

My recommendation is **Broth** (one root vegetable simmered down) because it reads as a single‑source processed good *and* it's a natural recipe base for soup, stew, and chowder. Alternatives if "broth" feels off:

- **Stock** — same idea, slightly more "base ingredient."
- **Mash** — root veg mashed; reads well for carrot/turnip/beet/squash.
- **Chopped Veg / Mirepoix** — most flexible as an ingredient, least "transformed."

All four keep veg parallel to grain→flour and tree→plank: raw thing → one usable pantry good, with the fancier dishes (soup, pickles, stew) sitting one tier up.
