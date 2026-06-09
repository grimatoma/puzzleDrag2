class_name RecipeConfig
extends RefCounted
## Crafting recipe catalog — ported VERBATIM from the React `RECIPES` map
## (src/constants.ts:905-965). A recipe consumes raw inventory inputs at a STATION
## building (a BuildingConfig id) and produces EITHER a refined GOOD (added to the
## shared inventory) or a TOOL (granted a charge). The station building must be built
## AND the settlement tier must clear the recipe's tier gate before it can be crafted.
##
## Six stations (React parity):
##   workshop  → TOOLS (rake / axe / rifle / hound / drill / water_pump / …)  — output_kind "tool"
##   bakery    → baked GOODS (bread / honeyroll / harvestpie / …)             — output_kind "good"
##   larder    → preserved GOODS (preserve / tincture / chowder)              — output_kind "good"
##   forge     → metal/stone GOODS (iron_hinge / lantern / goldring / …)      — output_kind "good"
##   kitchen   → expedition-food GOODS (supplies / iron_ration)              — output_kind "good"
##   smokehouse→ cured GOODS (cured_meat)                                     — output_kind "good"
##
## The WORKSHOP is the in-game source of TOOLS the port previously only granted via
## the Portal / direct grants. Every workshop recipe's `output` is a real ToolConfig
## member (verified by the recipe tests) so craft() can route it through grant_tool().
##
## PORT MAPPING NOTES (faithful adaptations from the React source):
##   - BREAD / SUPPLIES keep their EXISTING port behaviour byte-for-byte. The React
##     `rec_supplies` is { flour: 5 }; the port's SUPPLIES has always been
##     { bread: 1, flour: 2 } (its own first-pass economy, wired into enter_mine). The
##     port keeps its inputs — changing them would alter mine-expedition economy. This
##     is the ONE input deviation from the React verbatim list; every other recipe is
##     ported exactly (item → output, inputs verbatim, tier verbatim, station verbatim).
##   - The `tier` field is a recipe-level gate. React tiers (1/2/3) map to a MINIMUM
##     settlement tier via RECIPE_TIER_MIN_SETTLEMENT: tier 1 → Camp (no effective gate,
##     so a tier-1 recipe is craftable as soon as its station is built — keeps BREAD/
##     SUPPLIES unchanged at the default Camp tier), tier 2 → Town, tier 3 → City. This
##     is the port's single-settlement analogue of React's level/Town-1→2→3 gating.
##   - `qty` is 1 for every recipe (React produces 1 unit per craft).
##   - output_kind ∈ {"good","tool"}: "good" adds `output` to inventory (cap-clamped),
##     "tool" grants `output` as a tool charge (GameState.craft routes on this).
##
## Registered as a `class_name` global (like BuildingConfig / Constants) so its consts
## and helpers are reachable WITHOUT a live autoload — headless tests run before the
## scene tree exists. Stateless: never instantiated.

# ── Recipe ids ────────────────────────────────────────────────────────────────
# Recipe id == its output key (the port keys recipes by output, matching how the
# existing BREAD/SUPPLIES + the wiki/economy tests reference them). React keys them
# rec_<item> with item-key aliases; the port uses the item key directly throughout.

# Workshop (tools) — output is a ToolConfig id; output_kind "tool".
const RAKE: String = "rake"
const AXE: String = "axe"
const SICKLE: String = "sickle"
const FERTILIZER: String = "fertilizer"
const CAT: String = "cat"
const BIRD_CAGE: String = "bird_cage"
const SCYTHE_FULL: String = "scythe_full"
const RIFLE: String = "rifle"
const HOUND: String = "hound"
const HOE: String = "hoe"
const STONE_HAMMER: String = "stone_hammer"
const IRON_PICK: String = "iron_pick"
const AUGER: String = "auger"
const BLAST_CHARGE: String = "blast_charge"
const BIRD_FEED: String = "bird_feed"
const SAPLING: String = "sapling"
const WATER_PUMP: String = "water_pump"
const EXPLOSIVES: String = "explosives"
const TRIMMER: String = "trimmer"
const PLOUGH: String = "plough"
const FRUIT_PICKER: String = "fruit_picker"
const HERDERS_CROOK: String = "herders_crook"
const MILK_CHURN: String = "milk_churn"
const SADDLE: String = "saddle"
const BEE: String = "bee"
const TERRIER: String = "terrier"
const DRILL: String = "drill"
const COAL_HAMMER: String = "coal_hammer"
const GOLD_PICK: String = "gold_pick"
const MAGNET: String = "magnet"
const COAL_TRANSMUTER: String = "coal_transmuter"
const FISH_OIL_BOTTLED: String = "fish_oil_bottled"

# Bakery (goods).
const BREAD: String = "bread"
const HONEYROLL: String = "honeyroll"
const HARVESTPIE: String = "harvestpie"
const FESTIVAL_LOAF: String = "festival_loaf"
const WEDDING_PIE: String = "wedding_pie"

# Larder (goods).
const PRESERVE: String = "preserve"
const TINCTURE: String = "tincture"
const CHOWDER: String = "chowder"

# Forge (goods).
const IRON_HINGE: String = "iron_hinge"
const COBBLEPATH: String = "cobblepath"
const LANTERN: String = "lantern"
const GOLDRING: String = "goldring"
const GEMCROWN: String = "gemcrown"
const IRONFRAME: String = "ironframe"
const STONEWORK: String = "stonework"

# Kitchen (goods).
const SUPPLIES: String = "supplies"
const IRON_RATION: String = "iron_ration"

# Smokehouse (goods).
const CURED_MEAT: String = "cured_meat"

## Output-kind discriminants.
const KIND_GOOD: String = "good"
const KIND_TOOL: String = "tool"

## Recipe-tier → minimum settlement tier the craft gate requires. React recipe tiers
## (1/2/3) map onto the port's Camp→City ladder: tier 1 imposes NO effective gate (Camp
## is the default tier, so a tier-1 recipe is craftable the moment its station is built —
## this is why BREAD/SUPPLIES, both React tier 1, stay craftable byte-identically), tier 2
## requires Town, tier 3 requires City. A recipe with an unknown tier falls back to Camp.
const RECIPE_TIER_MIN_SETTLEMENT: Dictionary = {
	1: TownConfig.TIER_CAMP,     # 1 — always met
	2: TownConfig.TIER_TOWN,     # 4
	3: TownConfig.TIER_CITY,     # 5
}

## Recipe catalog keyed by recipe id (== output key). Each entry:
##   name:        String      — display name
##   station:     String      — BuildingConfig id whose building must be built to craft
##   inputs:      Dictionary  — resource_key:String -> int, consumed from inventory
##   output:      String      — resource key (good) OR tool id (tool) produced
##   qty:         int         — units produced per craft (always 1)
##   tier:        int         — recipe-level gate (React tier; see RECIPE_TIER_MIN_SETTLEMENT)
##   output_kind: String      — KIND_GOOD (bank to inventory) | KIND_TOOL (grant a tool)
##   desc:        String      — one-line player-facing description
const RECIPES: Dictionary = {
	# ── Workshop (TOOLS) — src/constants.ts:907-943,959. output_kind "tool". ──────
	RAKE:        {"name": "Rake",        "station": BuildingConfig.WORKSHOP, "inputs": {"plank": 1},                       "output": "rake",        "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Clears a connected clump of matching tiles."},
	AXE:         {"name": "Axe",         "station": BuildingConfig.WORKSHOP, "inputs": {"block": 1},                       "output": "axe",         "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Fells every tree tile on the board."},
	SICKLE:      {"name": "Sickle",      "station": BuildingConfig.WORKSHOP, "inputs": {"plank": 1, "iron_bar": 1},        "output": "sickle",      "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Reaps a tapped row of tiles."},
	FERTILIZER:  {"name": "Fertilizer",  "station": BuildingConfig.WORKSHOP, "inputs": {"hay_bundle": 1, "dirt": 1},       "output": "fertilizer",  "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Biases the next farm fills toward the grain staple."},
	CAT:         {"name": "Cat",         "station": BuildingConfig.WORKSHOP, "inputs": {"block": 2, "dirt": 1},            "output": "cat",         "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Shoos every rat off the board."},
	BIRD_CAGE:   {"name": "Bird Cage",   "station": BuildingConfig.WORKSHOP, "inputs": {"hay_bundle": 1},                  "output": "bird_cage",   "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Clears a single bird tile across the board."},
	SCYTHE_FULL: {"name": "Scythe",      "station": BuildingConfig.WORKSHOP, "inputs": {"block": 1},                       "output": "scythe_full", "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Mows every grain tile on the board."},
	RIFLE:       {"name": "Rifle",       "station": BuildingConfig.WORKSHOP, "inputs": {"plank": 1, "block": 1, "iron_bar": 1}, "output": "rifle",  "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Drives off the whole wolf pack."},
	HOUND:       {"name": "Hound",       "station": BuildingConfig.WORKSHOP, "inputs": {"bread": 1, "block": 3},           "output": "hound",       "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Scatters the wolves, scaring them for several turns."},
	HOE:         {"name": "Hoe",         "station": BuildingConfig.WORKSHOP, "inputs": {"plank": 1, "block": 1},           "output": "hoe",         "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Clears a single vegetable tile across the board."},
	STONE_HAMMER:{"name": "Stone Hammer","station": BuildingConfig.WORKSHOP, "inputs": {"block": 2, "plank": 1},          "output": "stone_hammer","qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Smashes every stone tile on the board."},
	IRON_PICK:   {"name": "Iron Pick",   "station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 1, "plank": 1},        "output": "iron_pick",   "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Clears a single iron-ore tile across the board."},
	AUGER:       {"name": "Auger",       "station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 1, "plank": 1},        "output": "auger",       "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Bores out a tapped column of tiles."},
	BLAST_CHARGE:{"name": "Blast Charge","station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 1, "coke": 1},         "output": "blast_charge","qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Clears a tapped cross of tiles."},
	BIRD_FEED:   {"name": "Bird Feed",   "station": BuildingConfig.WORKSHOP, "inputs": {"flour": 1, "hay_bundle": 2},      "output": "bird_feed",   "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Biases the next farm fills toward birds."},
	SAPLING:     {"name": "Sapling",     "station": BuildingConfig.WORKSHOP, "inputs": {"plank": 1, "hay_bundle": 2},      "output": "sapling",     "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Biases the next farm fills toward trees."},
	WATER_PUMP:  {"name": "Water Pump",  "station": BuildingConfig.WORKSHOP, "inputs": {"plank": 1, "block": 1},           "output": "water_pump",  "qty": 1, "tier": 2, "output_kind": KIND_TOOL, "desc": "Floods every lava cell into rubble and clears the lava hazard."},
	EXPLOSIVES:  {"name": "Explosives",  "station": BuildingConfig.WORKSHOP, "inputs": {"hay_bundle": 1, "dirt": 1},       "output": "explosives",  "qty": 1, "tier": 2, "output_kind": KIND_TOOL, "desc": "Clears a cave-in and the mole hazard."},
	TRIMMER:     {"name": "Trimmer",     "station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 1, "plank": 1},        "output": "trimmer",     "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Trims every tree back to open grass."},
	PLOUGH:      {"name": "Plough",      "station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 1, "plank": 2},        "output": "plough",      "qty": 1, "tier": 2, "output_kind": KIND_TOOL, "desc": "Clears every grass and grain tile on the board."},
	FRUIT_PICKER:{"name": "Fruit Picker","station": BuildingConfig.WORKSHOP, "inputs": {"plank": 2},                       "output": "fruit_picker","qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Clears every fruit tile on the board."},
	HERDERS_CROOK:{"name": "Herder's Crook","station": BuildingConfig.WORKSHOP, "inputs": {"plank": 1, "hay_bundle": 1},  "output": "herders_crook","qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Clears every herd tile on the board."},
	MILK_CHURN:  {"name": "Milk Churn",  "station": BuildingConfig.WORKSHOP, "inputs": {"plank": 2, "iron_bar": 1},        "output": "milk_churn",  "qty": 1, "tier": 2, "output_kind": KIND_TOOL, "desc": "Clears every cattle tile on the board."},
	SADDLE:      {"name": "Saddle",      "station": BuildingConfig.WORKSHOP, "inputs": {"plank": 1, "iron_bar": 1, "hay_bundle": 2}, "output": "saddle", "qty": 1, "tier": 2, "output_kind": KIND_TOOL, "desc": "Clears every mount tile on the board."},
	BEE:         {"name": "Bee",         "station": BuildingConfig.WORKSHOP, "inputs": {"honey": 1, "hay_bundle": 1},      "output": "bee",         "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Pollinates flowers into fruit."},
	TERRIER:     {"name": "Terrier",     "station": BuildingConfig.WORKSHOP, "inputs": {"bread": 1, "block": 2},           "output": "terrier",     "qty": 1, "tier": 1, "output_kind": KIND_TOOL, "desc": "Chases every rat off the board."},
	DRILL:       {"name": "Drill",       "station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 2, "coke": 1, "plank": 1}, "output": "drill",   "qty": 1, "tier": 3, "output_kind": KIND_TOOL, "desc": "Turns loose dirt into stone across the board."},
	COAL_HAMMER: {"name": "Coal Hammer", "station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 1, "plank": 1},        "output": "coal_hammer", "qty": 1, "tier": 2, "output_kind": KIND_TOOL, "desc": "Clears every coal tile on the board."},
	GOLD_PICK:   {"name": "Gold Pick",   "station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 2, "gold_bar": 1, "plank": 1}, "output": "gold_pick", "qty": 1, "tier": 3, "output_kind": KIND_TOOL, "desc": "Clears every gold tile on the board."},
	MAGNET:      {"name": "Magnet",      "station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 2, "coke": 1},         "output": "magnet",      "qty": 1, "tier": 3, "output_kind": KIND_TOOL, "desc": "Pulls nearby iron ore into easy-to-chain stone."},
	COAL_TRANSMUTER:{"name": "Coal Transmuter","station": BuildingConfig.WORKSHOP, "inputs": {"iron_bar": 2, "coke": 2, "block": 1}, "output": "coal_transmuter", "qty": 1, "tier": 3, "output_kind": KIND_TOOL, "desc": "Transmutes nearby ores into coal."},
	FISH_OIL_BOTTLED:{"name": "Fish Oil (Bottled)","station": BuildingConfig.WORKSHOP, "inputs": {"fish_oil": 1, "plank": 1}, "output": "fish_oil_bottled", "qty": 1, "tier": 1, "output_kind": KIND_GOOD, "desc": "Refined kelp-and-fish oil sealed in a corked plank flask, worth 80 coins."},

	# ── Bakery (GOODS) — src/constants.ts:946-948,961-962. ────────────────────────
	BREAD: {
		"name": "Bread",
		"station": BuildingConfig.BAKERY,
		"inputs": {"flour": 3, "eggs": 1},
		"output": "bread",
		"qty": 1,
		"tier": 1,
		"output_kind": KIND_GOOD,
		# Flavor description carried VERBATIM from React ITEMS.bread.desc (src/constants.ts).
		"desc": "A wholesome loaf baked from flour and eggs, sold for 125 coins at the Bakery.",
	},
	HONEYROLL:    {"name": "Honey Roll",    "station": BuildingConfig.BAKERY, "inputs": {"flour": 2, "eggs": 1, "jam": 1}, "output": "honeyroll",    "qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A sweet honey roll glazed with jam, commanding 175 coins at market."},
	HARVESTPIE:   {"name": "Harvest Pie",   "station": BuildingConfig.BAKERY, "inputs": {"flour": 2, "jam": 1, "eggs": 1}, "output": "harvestpie",   "qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A hearty harvest pie filled with jam and egg, prized by townsfolk for 175 coins."},
	FESTIVAL_LOAF:{"name": "Festival Loaf", "station": BuildingConfig.BAKERY, "inputs": {"flour": 3, "jam": 2, "eggs": 1}, "output": "festival_loaf","qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A rich, fruit-studded bread baked for seasonal feasts. Each unit grants 2 expedition turns."},
	WEDDING_PIE:  {"name": "Wedding Pie",   "station": BuildingConfig.BAKERY, "inputs": {"pie": 1, "honey": 1, "jam": 2}, "output": "wedding_pie",   "qty": 1, "tier": 3, "output_kind": KIND_GOOD, "desc": "A massive, multi-layered berry pie served at Hearthwood weddings. Each unit grants 3 expedition turns."},

	# ── Larder (GOODS) — src/constants.ts:949-950,958. ────────────────────────────
	PRESERVE: {"name": "Preserve Jar",   "station": BuildingConfig.LARDER, "inputs": {"jam": 2, "eggs": 1}, "output": "preserve", "qty": 1, "tier": 1, "output_kind": KIND_GOOD, "desc": "Bottled berry preserves sealed with egg-white, fetching 100 coins at the Larder."},
	TINCTURE: {"name": "Berry Tincture", "station": BuildingConfig.LARDER, "inputs": {"jam": 3},            "output": "tincture", "qty": 1, "tier": 1, "output_kind": KIND_GOOD, "desc": "A medicinal berry tincture used by Sister Liss, sold for 125 coins."},
	CHOWDER:  {"name": "Chowder",        "station": BuildingConfig.LARDER, "inputs": {"fish_fillet": 2, "milk": 1, "soup": 1}, "output": "chowder", "qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A creamy seafood chowder thick with fillet, milk, and root vegetables. Larder favourite at 280 coins."},

	# ── Forge (GOODS) — src/constants.ts:951-957. ─────────────────────────────────
	IRON_HINGE: {"name": "Iron Hinge", "station": BuildingConfig.FORGE, "inputs": {"iron_bar": 2, "coke": 1}, "output": "iron_hinge", "qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A forged iron hinge used in building construction, worth 175 coins."},
	COBBLEPATH: {"name": "Cobble Path", "station": BuildingConfig.FORGE, "inputs": {"block": 5, "plank": 2}, "output": "cobblepath", "qty": 1, "tier": 1, "output_kind": KIND_GOOD, "desc": "Laid cobblestones that pave trade paths, sold to caravans for 200 coins."},
	LANTERN:    {"name": "Iron Lantern","station": BuildingConfig.FORGE, "inputs": {"iron_bar": 1, "coke": 1, "plank": 1}, "output": "lantern", "qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A wrought-iron lantern that lights the evening market, selling for 150 coins."},
	GOLDRING:   {"name": "Gold Ring",  "station": BuildingConfig.FORGE, "inputs": {"gold_bar": 1, "iron_bar": 2}, "output": "goldring", "qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A gleaming gold ring favoured by merchants, commanding 225 coins at the forge."},
	GEMCROWN:   {"name": "Gem Crown",  "station": BuildingConfig.FORGE, "inputs": {"cut_gem": 1, "gold_bar": 2}, "output": "gemcrown", "qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A jewelled crown set with cut gems — the Forge's most prestigious commission, worth 325 coins."},
	IRONFRAME:  {"name": "Iron Frame", "station": BuildingConfig.FORGE, "inputs": {"plank": 2, "iron_bar": 1}, "output": "ironframe", "qty": 1, "tier": 3, "output_kind": KIND_GOOD, "desc": "A structural iron frame used in advanced buildings and caravan reinforcement, worth 275 coins."},
	STONEWORK:  {"name": "Stonework",  "station": BuildingConfig.FORGE, "inputs": {"block": 2, "coke": 1}, "output": "stonework", "qty": 1, "tier": 3, "output_kind": KIND_GOOD, "desc": "Dressed stonework for walls and facades — the final tier of Forge crafting, worth 300 coins."},

	# ── Kitchen (GOODS) — src/constants.ts:963-964. ───────────────────────────────
	# SUPPLIES keeps the EXISTING port inputs {bread:1, flour:2} (NOT React's {flour:5}) —
	# see the header note: the port's mine-expedition economy is wired to these inputs.
	SUPPLIES: {
		"name": "Supplies",
		"station": BuildingConfig.KITCHEN,
		"inputs": {"bread": 1, "flour": 2},
		"output": "supplies",
		"qty": 1,
		"tier": 1,
		"output_kind": KIND_GOOD,
		# Flavor description carried VERBATIM from React ITEMS.supplies.desc (src/constants.ts).
		"desc": "Travel rations packed at the Kitchen. Three supplies grant standard Mine entry.",
	},
	IRON_RATION: {"name": "Iron Ration", "station": BuildingConfig.KITCHEN, "inputs": {"flour": 5, "meat": 1, "iron_bar": 1}, "output": "iron_ration", "qty": 1, "tier": 2, "output_kind": KIND_GOOD, "desc": "A calorie-dense block of dried grain and fat. Each unit grants 4 expedition turns."},

	# ── Smokehouse (GOODS) — src/constants.ts:960. ────────────────────────────────
	CURED_MEAT: {"name": "Cured Meat", "station": BuildingConfig.SMOKEHOUSE, "inputs": {"meat": 2, "coke": 1}, "output": "cured_meat", "qty": 1, "tier": 1, "output_kind": KIND_GOOD, "desc": "Salted and dried meat that lasts for weeks. Each unit grants 2 expedition turns."},
}

## Stable display / iteration order for the recipes. Grouped by station so the wiki's
## station tabs read in a sensible order: Bakery + Kitchen FIRST (so the existing
## RecipeWiki default-station tests still resolve the Bakery as the first tab), then
## Workshop, Larder, Forge, Smokehouse.
const RECIPE_IDS: Array = [
	# Bakery
	BREAD, HONEYROLL, HARVESTPIE, FESTIVAL_LOAF, WEDDING_PIE,
	# Kitchen
	SUPPLIES, IRON_RATION,
	# Workshop (tools)
	RAKE, AXE, SICKLE, FERTILIZER, CAT, BIRD_CAGE, SCYTHE_FULL, RIFLE, HOUND, HOE,
	STONE_HAMMER, IRON_PICK, AUGER, BLAST_CHARGE, BIRD_FEED, SAPLING, WATER_PUMP,
	EXPLOSIVES, TRIMMER, PLOUGH, FRUIT_PICKER, HERDERS_CROOK, MILK_CHURN, SADDLE,
	BEE, TERRIER, DRILL, COAL_HAMMER, GOLD_PICK, MAGNET, COAL_TRANSMUTER, FISH_OIL_BOTTLED,
	# Larder
	PRESERVE, TINCTURE, CHOWDER,
	# Forge
	IRON_HINGE, COBBLEPATH, LANTERN, GOLDRING, GEMCROWN, IRONFRAME, STONEWORK,
	# Smokehouse
	CURED_MEAT,
]

# ── Static helpers (usable without an instance) ──────────────────────────────

## True when `id` names a real recipe.
static func is_recipe(id: String) -> bool:
	return RECIPES.has(id)

static func recipe_name(id: String) -> String:
	if not is_recipe(id):
		return ""
	return String(RECIPES[id].get("name", ""))

## Inputs consumed by `id` (a COPY, so callers can't mutate the const).
static func recipe_inputs(id: String) -> Dictionary:
	if not is_recipe(id):
		return {}
	var inputs: Dictionary = RECIPES[id].get("inputs", {})
	return inputs.duplicate()

static func recipe_output(id: String) -> String:
	if not is_recipe(id):
		return ""
	return String(RECIPES[id].get("output", ""))

static func recipe_qty(id: String) -> int:
	if not is_recipe(id):
		return 0
	return int(RECIPES[id].get("qty", 0))

## One-line flavor description of `id` (verbatim from the React produced-item desc),
## shown in the RecipeWiki detail card. "" for unknown ids.
static func recipe_desc(id: String) -> String:
	if not is_recipe(id):
		return ""
	return String(RECIPES[id].get("desc", ""))

## BuildingConfig id of the station that crafts `id` ("" for unknown ids).
static func recipe_station(id: String) -> String:
	if not is_recipe(id):
		return ""
	return String(RECIPES[id].get("station", ""))

## Recipe-level tier gate (React tier; 1 for unknown ids — the most permissive default).
static func recipe_tier(id: String) -> int:
	if not is_recipe(id):
		return 1
	return int(RECIPES[id].get("tier", 1))

## The MINIMUM settlement tier required to craft `id` (its recipe tier mapped through
## RECIPE_TIER_MIN_SETTLEMENT). Tier-1 recipes return Camp (always met).
static func recipe_min_settlement_tier(id: String) -> int:
	return int(RECIPE_TIER_MIN_SETTLEMENT.get(recipe_tier(id), TownConfig.TIER_CAMP))

## Output kind of `id`: KIND_GOOD (bank to inventory) | KIND_TOOL (grant a tool charge).
## Unknown ids report KIND_GOOD (the inert default — there is no good/tool to route).
static func recipe_output_kind(id: String) -> String:
	if not is_recipe(id):
		return KIND_GOOD
	return String(RECIPES[id].get("output_kind", KIND_GOOD))

## True when `id` outputs a TOOL (granted a charge), false when it banks a good.
static func is_tool_recipe(id: String) -> bool:
	return recipe_output_kind(id) == KIND_TOOL

## Recipe ids whose station == `building_id`, in stable order (empty for unknown
## or station-less buildings).
static func recipes_for_station(building_id: String) -> Array:
	var out: Array = []
	for id in RECIPE_IDS:
		if recipe_station(id) == building_id:
			out.append(id)
	return out
