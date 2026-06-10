class_name ResourceConfig
extends RefCounted
## Inventory RESOURCE catalog — the single source of truth for every NON-TILE good the
## port carries in GameState.inventory, PLUS the two scalar currencies (runes / influence)
## surfaced as inventory "items". Before this catalog these ~40 resource keys lived as bare
## strings whose label/desc were reconstructed ad-hoc (UiKit.pretty_name's capitalize(),
## inline RecipeConfig descs); this consolidates that metadata so every consumer derives
## from ONE place.
##
## NOT a pricing source. This catalog does NOT consolidate MarketConfig — sell/buy prices
## still flow exclusively from MarketConfig.SELL / MarketConfig.BUY, which remain the
## authoritative, independently-valued market prices. The `value` field here is parity data
## only (React ITEMS[key].value, intrinsic worth) and is currently consumed by NO pricing
## path; it is intentionally DISTINCT from MarketConfig and may diverge (e.g. bread `value`
## = 125 but MarketConfig.SELL bread = 5).
##
## SCOPE — the UNION of every resource key the port already references:
##   • Constants.PRODUCES non-empty values (tile chain outputs: hay_bundle … gold_bar)
##   • RecipeConfig RECIPES output keys that are GOODS (output_kind "good": bread, supplies,
##     the Bakery/Larder/Forge/Kitchen/Smokehouse/Workshop goods). Tool outputs are NOT here
##     (those are ToolConfig ids, kind "tool").
##   • MarketConfig SELL/BUY keys (all already covered by the two sets above).
##   • InventoryScreen FARM/REFINED/MINE group lists + its ITEM_DEFS currencies (runes/influence).
##   • Hud STOCKPILE_ROSTER (the 12 farm chips — all covered).
## NO board tile keys (tile_*), NO tools. The disjoint tile/resource/tool invariant (CLAUDE.md)
## holds: this catalog is the RESOURCE + ITEM namespace only.
##
## METADATA SOURCE — React `src/constants.ts` ITEMS (kind:"resource" rows). `label`, `value`,
## and `desc` are ported BYTE-IDENTICAL from the matching React row (no re-authored copy). The
## per-output flavor `desc` strings that previously lived inline on RecipeConfig rows were moved
## HERE (they are resource metadata, not recipe metadata) — RecipeConfig.recipe_desc now forwards
## to ResourceConfig.desc(output_key).
##
## FAMILY — a production-family grouping id used by InventoryScreen to bucket the ledger:
##   "farm"    → Farm Goods   "refined" → Refined   "mine" → Mine   "other" → Other
## The values reproduce TODAY's exact InventoryScreen grouping (the old hardcoded FARM/REFINED/
## MINE lists), with ONE deliberate reconciliation: `jam` is family "farm" (it was in the Hud
## STOCKPILE_ROSTER but MISSING from the old FARM_RESOURCES list, so it fell into "Other" — a
## drift the config audit flagged; jam is a farm good per React biome:"farm" + the roster, so it
## belongs in Farm). Currencies (runes/influence) are family "other".
##
## Each row:
##   key    — the id (== the inventory key)
##   label  — display name (React ITEMS[key].label; currencies hand-named)
##   kind   — "resource" for goods, "item" for the runes/influence currencies
##   value  — intrinsic worth, int — React ITEMS[key].value (parity data; 0 for currencies).
##            NOT a market price: sell/buy still come from MarketConfig.SELL / .BUY, and no
##            pricing path reads this field today (see the "NOT a pricing source" note above).
##   desc   — flavor text ("" when the React row has none)
##   family — "farm" | "refined" | "mine" | "other"
##   glyph  — only the "item" currencies carry one (runes 🔮, influence ◈); "" otherwise
##   icon   — OPTIONAL asset-filename override; default is `key` (res://assets/resources/<key>.png).
##            No current row overrides it (every PNG basename == its key).
##
## Registered as a `class_name` global (like ToolConfig / RecipeConfig / MarketConfig) so its
## consts + static helpers are reachable WITHOUT a live autoload — headless tests run before the
## scene tree exists. Stateless: never instantiated.

# ── Family ids ──────────────────────────────────────────────────────────────────
const FAMILY_FARM: String = "farm"
const FAMILY_REFINED: String = "refined"
const FAMILY_MINE: String = "mine"
const FAMILY_OTHER: String = "other"

# ── Kind discriminants ────────────────────────────────────────────────────────────
const KIND_RESOURCE: String = "resource"
const KIND_ITEM: String = "item"

## The catalog, keyed by resource/item key. See the header for the field contract.
const RESOURCES: Dictionary = {
	# ── Farm goods (family "farm") — the 10 original InventoryScreen FARM_RESOURCES +
	# `jam` (the deliberate reconciliation: it was in the Hud roster but missing from the old
	# FARM list, so it fell into "Other" — re-filed to Farm here). Labels/values/descs are
	# byte-identical from React ITEMS (src/constants.ts:383-406).
	"hay_bundle": {"key": "hay_bundle", "label": "Hay Bundle", "kind": KIND_RESOURCE, "value": 6,   "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"flour":      {"key": "flour",      "label": "Flour",      "kind": KIND_RESOURCE, "value": 8,   "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"eggs":       {"key": "eggs",       "label": "Eggs",       "kind": KIND_RESOURCE, "value": 5,   "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"soup":       {"key": "soup",       "label": "Soup",       "kind": KIND_RESOURCE, "value": 20,  "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"pie":        {"key": "pie",        "label": "Pie",        "kind": KIND_RESOURCE, "value": 90,  "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"honey":      {"key": "honey",      "label": "Honey",      "kind": KIND_RESOURCE, "value": 300, "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"plank":      {"key": "plank",      "label": "Plank",      "kind": KIND_RESOURCE, "value": 6,   "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"meat":       {"key": "meat",       "label": "Meat",       "kind": KIND_RESOURCE, "value": 21,  "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"milk":       {"key": "milk",       "label": "Milk",       "kind": KIND_RESOURCE, "value": 100, "desc": "", "family": FAMILY_FARM, "glyph": ""},
	"horseshoe":  {"key": "horseshoe",  "label": "Horseshoe",  "kind": KIND_RESOURCE, "value": 400, "desc": "", "family": FAMILY_FARM, "glyph": ""},
	# jam — RECONCILED into Farm (was "Other"). React: biome "farm", value 5, with a desc.
	"jam":        {"key": "jam",        "label": "Jam",        "kind": KIND_RESOURCE, "value": 5,   "desc": "Sweet preserves cooked down from blackberries. Used in tinctures and festival loaves.", "family": FAMILY_FARM, "glyph": ""},

	# ── Refined (family "refined") — the 2 original InventoryScreen REFINED_RESOURCES.
	# bread label is "Bread Loaf" (React), NOT "Bread"; both carry a React desc.
	"bread":      {"key": "bread",      "label": "Bread Loaf", "kind": KIND_RESOURCE, "value": 125, "desc": "A wholesome loaf baked from flour and eggs, sold for 125 coins at the Bakery.", "family": FAMILY_REFINED, "glyph": ""},
	"supplies":   {"key": "supplies",   "label": "Supplies",   "kind": KIND_RESOURCE, "value": 30,  "desc": "Travel rations packed at the Kitchen. Three supplies grant standard Mine entry.", "family": FAMILY_REFINED, "glyph": ""},

	# ── Mine goods (family "mine") — the 5 original InventoryScreen MINE_RESOURCES.
	"block":      {"key": "block",      "label": "Block",      "kind": KIND_RESOURCE, "value": 6,   "desc": "", "family": FAMILY_MINE, "glyph": ""},
	"iron_bar":   {"key": "iron_bar",   "label": "Iron Bar",   "kind": KIND_RESOURCE, "value": 8,   "desc": "", "family": FAMILY_MINE, "glyph": ""},
	"coke":       {"key": "coke",       "label": "Coke",       "kind": KIND_RESOURCE, "value": 9,   "desc": "", "family": FAMILY_MINE, "glyph": ""},
	"cut_gem":    {"key": "cut_gem",    "label": "Cut Gem",    "kind": KIND_RESOURCE, "value": 14,  "desc": "", "family": FAMILY_MINE, "glyph": ""},
	# dirt — React biome "farm" BUT the old MINE_RESOURCES list put it in Mine (it is the
	# special-dirt tile's mine output); keep its existing "Mine" grouping. React value 2 + desc.
	"dirt":       {"key": "dirt",       "label": "Dirt",       "kind": KIND_RESOURCE, "value": 2,   "desc": "Fertile soil hauled up from the special dirt tiles. Used in fertilizer, explosives, and animal pens.", "family": FAMILY_MINE, "glyph": ""},

	# ── Other resources (family "other") — referenced by PRODUCES / recipes / market but not in
	# any of the original three group lists, so they landed in "Other" (unchanged). Labels/values/
	# descs byte-identical from React ITEMS.
	# Mine extras (copper/gold bars — produced by COPPER_ORE/GOLD tiles).
	"copper_bar": {"key": "copper_bar", "label": "Copper Bar", "kind": KIND_RESOURCE, "value": 8,   "desc": "", "family": FAMILY_OTHER, "glyph": ""},
	"gold_bar":   {"key": "gold_bar",   "label": "Gold Bar",   "kind": KIND_RESOURCE, "value": 16,  "desc": "", "family": FAMILY_OTHER, "glyph": ""},
	# Fish / harbor catch (produced by the fish tiles). React label for fish_fillet is "Fillet".
	"fish_fillet":{"key": "fish_fillet","label": "Fillet",     "kind": KIND_RESOURCE, "value": 8,   "desc": "", "family": FAMILY_OTHER, "glyph": ""},
	"fish_oil":   {"key": "fish_oil",   "label": "Fish Oil",   "kind": KIND_RESOURCE, "value": 6,   "desc": "", "family": FAMILY_OTHER, "glyph": ""},
	"sea_shells": {"key": "sea_shells", "label": "Sea Shells", "kind": KIND_RESOURCE, "value": 5,   "desc": "", "family": FAMILY_OTHER, "glyph": ""},
	"pearls":     {"key": "pearls",     "label": "Pearls",     "kind": KIND_RESOURCE, "value": 12,  "desc": "", "family": FAMILY_OTHER, "glyph": ""},
	# Crafted goods (recipe outputs, output_kind "good"). The `desc` strings were MOVED here from
	# the inline RecipeConfig rows — byte-identical to React ITEMS (src/constants.ts:559-575).
	# Bakery
	"honeyroll":     {"key": "honeyroll",     "label": "Honey Roll",        "kind": KIND_RESOURCE, "value": 175, "desc": "A sweet honey roll glazed with jam, commanding 175 coins at market.", "family": FAMILY_OTHER, "glyph": ""},
	"harvestpie":    {"key": "harvestpie",    "label": "Harvest Pie",       "kind": KIND_RESOURCE, "value": 175, "desc": "A hearty harvest pie filled with jam and egg, prized by townsfolk for 175 coins.", "family": FAMILY_OTHER, "glyph": ""},
	"festival_loaf": {"key": "festival_loaf", "label": "Festival Loaf",     "kind": KIND_RESOURCE, "value": 60,  "desc": "A rich, fruit-studded bread baked for seasonal feasts. Each unit grants 2 turns on expeditions.", "family": FAMILY_OTHER, "glyph": ""},
	"wedding_pie":   {"key": "wedding_pie",   "label": "Wedding Pie",       "kind": KIND_RESOURCE, "value": 180, "desc": "A massive, multi-layered berry pie traditionally served at Hearthwood weddings. Each unit grants 3 turns on expeditions.", "family": FAMILY_OTHER, "glyph": ""},
	# Larder
	"preserve":      {"key": "preserve",      "label": "Preserve Jar",      "kind": KIND_RESOURCE, "value": 100, "desc": "Bottled berry preserves sealed with egg-white, fetching 100 coins at the Larder.", "family": FAMILY_OTHER, "glyph": ""},
	"tincture":      {"key": "tincture",      "label": "Berry Tincture",    "kind": KIND_RESOURCE, "value": 125, "desc": "A medicinal berry tincture used by Sister Liss, sold for 125 coins.", "family": FAMILY_OTHER, "glyph": ""},
	"chowder":       {"key": "chowder",       "label": "Chowder",           "kind": KIND_RESOURCE, "value": 280, "desc": "A creamy seafood chowder thick with fillet, milk, and root vegetables. Larder favourite at 280 coins.", "family": FAMILY_OTHER, "glyph": ""},
	# Forge
	"iron_hinge":    {"key": "iron_hinge",    "label": "Iron Hinge",        "kind": KIND_RESOURCE, "value": 175, "desc": "A forged iron hinge used in building construction. Story note: Bram requests these for the Caravan Post.", "family": FAMILY_OTHER, "glyph": ""},
	"cobblepath":    {"key": "cobblepath",    "label": "Cobble Path",       "kind": KIND_RESOURCE, "value": 200, "desc": "Laid cobblestones that pave trade paths, sold to caravans for 200 coins.", "family": FAMILY_OTHER, "glyph": ""},
	"lantern":       {"key": "lantern",       "label": "Iron Lantern",      "kind": KIND_RESOURCE, "value": 150, "desc": "A wrought-iron lantern that lights the evening market, selling for 150 coins.", "family": FAMILY_OTHER, "glyph": ""},
	"goldring":      {"key": "goldring",      "label": "Gold Ring",         "kind": KIND_RESOURCE, "value": 225, "desc": "A gleaming gold ring favoured by merchants, commanding 225 coins at the forge.", "family": FAMILY_OTHER, "glyph": ""},
	"gemcrown":      {"key": "gemcrown",      "label": "Gem Crown",         "kind": KIND_RESOURCE, "value": 325, "desc": "A jewelled crown set with cut gems — the Forge's most prestigious commission, worth 325 coins.", "family": FAMILY_OTHER, "glyph": ""},
	"ironframe":     {"key": "ironframe",     "label": "Iron Frame",        "kind": KIND_RESOURCE, "value": 275, "desc": "A structural iron frame used in advanced buildings and caravan reinforcement, worth 275 coins.", "family": FAMILY_OTHER, "glyph": ""},
	"stonework":     {"key": "stonework",     "label": "Stonework",         "kind": KIND_RESOURCE, "value": 300, "desc": "Dressed stonework for walls and facades — the final tier of Forge crafting, worth 300 coins.", "family": FAMILY_OTHER, "glyph": ""},
	# Kitchen
	"iron_ration":   {"key": "iron_ration",   "label": "Iron Ration",       "kind": KIND_RESOURCE, "value": 120, "desc": "A calorie-dense, hard-packed block of dried grain and fat. Each unit grants 4 turns on expeditions.", "family": FAMILY_OTHER, "glyph": ""},
	# Smokehouse
	"cured_meat":    {"key": "cured_meat",    "label": "Cured Meat",        "kind": KIND_RESOURCE, "value": 45,  "desc": "Salted and dried meat that lasts for weeks. Each unit grants 2 turns on expeditions.", "family": FAMILY_OTHER, "glyph": ""},
	# Workshop GOOD (the only Workshop output that is a good, not a tool).
	"fish_oil_bottled": {"key": "fish_oil_bottled", "label": "Fish Oil (Bottled)", "kind": KIND_RESOURCE, "value": 80, "desc": "Refined kelp-and-fish oil sealed in a corked plank flask. Used by tinkers and tar-mongers, worth 80 coins.", "family": FAMILY_OTHER, "glyph": ""},

	# ── Currencies (kind "item") — the port's scalar valuables surfaced as inventory "items"
	# (InventoryScreen ITEM_DEFS). NOT goods: no Market value (value 0), family "other", a glyph
	# badge instead of a PNG icon. Real GameState scalar counters (game.runes / game.influence).
	"runes":      {"key": "runes",      "label": "Runes",      "kind": KIND_ITEM, "value": 0, "desc": "", "family": FAMILY_OTHER, "glyph": "🔮"},
	"influence":  {"key": "influence",  "label": "Influence",  "kind": KIND_ITEM, "value": 0, "desc": "", "family": FAMILY_OTHER, "glyph": "◈"},
}

# ── Static helpers (usable without an instance) ──────────────────────────────────

## True when `key` names a real catalog row (resource OR currency item).
static func has(key: String) -> bool:
	return RESOURCES.has(key)

## Display name for `key` ("Bread Loaf", "Fillet", "Hay Bundle"). "" for unknown keys —
## callers fall back to their own naming (UiKit.pretty_name keeps capitalize() for non-rows).
static func label(key: String) -> String:
	if not has(key):
		return ""
	return String(RESOURCES[key].get("label", ""))

## Sell/market value of `key` (0 for currencies + unknown keys).
static func value(key: String) -> int:
	if not has(key):
		return 0
	return int(RESOURCES[key].get("value", 0))

## Flavor description of `key` ("" when the row has none / unknown key). The single source of
## the per-good copy — RecipeConfig.recipe_desc forwards here.
static func desc(key: String) -> String:
	if not has(key):
		return ""
	return String(RESOURCES[key].get("desc", ""))

## Kind of `key`: "resource" (a good) | "item" (a currency). "" for unknown keys.
static func kind(key: String) -> String:
	if not has(key):
		return ""
	return String(RESOURCES[key].get("kind", ""))

## Production-family of `key`: "farm" | "refined" | "mine" | "other". "other" for unknown keys
## (so an uncatalogued key never lands in a known group — it trails in Other, like before).
static func family(key: String) -> String:
	if not has(key):
		return FAMILY_OTHER
	return String(RESOURCES[key].get("family", FAMILY_OTHER))

## Glyph badge for `key` (only the currency items carry one: runes 🔮, influence ◈). "" otherwise.
static func glyph(key: String) -> String:
	if not has(key):
		return ""
	return String(RESOURCES[key].get("glyph", ""))

## The asset filename basename for `key`'s icon (res://assets/resources/<basename>.png). Defaults
## to the key itself (the convention); a row may override via an "icon" field (none currently do).
static func icon_basename(key: String) -> String:
	if not has(key):
		return key
	return String(RESOURCES[key].get("icon", key))

## Every catalog key (resources + currency items). Unordered (Dictionary key order = insertion).
static func all_keys() -> Array:
	return RESOURCES.keys()

## Every key whose family == `fam`, in catalog (insertion) order.
static func keys_in_family(fam: String) -> Array:
	var out: Array = []
	for key in RESOURCES.keys():
		if String(RESOURCES[key].get("family", FAMILY_OTHER)) == fam:
			out.append(key)
	return out
