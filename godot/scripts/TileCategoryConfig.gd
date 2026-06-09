class_name TileCategoryConfig
extends RefCounted
## Tile-CATEGORY taxonomy — the single source of truth for the per-category display
## attributes (heading label, emoji glyph, family grouping, representative farm tile) and
## the tile-key name-stripping prefix list. Before this catalog these tables lived DUPLICATED
## across 5+ scenes/scripts and drifted:
##   • StartFarmingModal.CATEGORY_GLYPH (~10 rows) + _category_label() (~10 rows + title-case fallback)
##   • TileCollectionScreen.CATEGORY_TO_FAMILY + FAMILY_LABEL + FAMILIES + _category_heading()
##   • TileCollectionScreen.DROP_PREFIXES + UiKit.pretty_name DROP_PREFIXES + TileVariantUi.DROP_PREFIXES
##     (THREE copies, each slightly different — one carried "fish"/"coin", others did not)
##   • the three slightly-different "strip tile_ prefix + title-case" derivations
## This consolidates that metadata so every consumer derives from ONE place.
##
## VOCABULARY — the Godot SHORT category ids (Constants.CATEGORY values), the canonical
## category vocabulary every port consumer already keys off. These are NOT the React plural
## ids (vegetables/fruits/flowers/herd_animals/mounts/bird) — the port translated those long
## ago, and the live data flow confirms it: StartFarmingModal's category ids come from
## ZoneConfig.eligible_categories() = the KEYS of CartographyConfig's upgrade_map = short ids
## (grass/grain/trees/birds/veg/fruit, + herd for the orchard); season_spawn_summary passes the
## same short ids (season_drops keys). So no consumer ever passes a React plural here. A defensive
## PLURAL ALIAS map (below) still normalises a React-plural id to its short id on lookup, so a
## stray plural key resolves to byte-identical output — belt-and-suspenders per the batch spec.
##
## BEHAVIOUR-PRESERVING — this is a DEDUP, not a parity-text change. Every label/glyph/heading/
## family/representative-tile a user or the board sees is BYTE-IDENTICAL to the pre-dedup output.
## The label/glyph values match the port's existing tables (which were already the React verbatim
## values for the farm categories). Headings reproduce TileCollectionScreen._category_heading's
## specials exactly. The DROP_PREFIXES const is the union of the three former copies MINUS "coin"
## (see the DROP_PREFIXES note below for why "coin" is intentionally excluded).
##
## Registered as a `class_name` global (like Constants / ResourceConfig / ZoneConfig) so its
## consts + static helpers are reachable WITHOUT a live autoload — headless tests run before the
## scene tree exists. Stateless: never instantiated.

# ── Family ids (TileCollectionScreen FAMILIES order) ──────────────────────────────
## The top-level family tabs, in tab order. React SUB_CATEGORIES with the port's "Other" label
## for "uncategorized" (FAMILY_LABEL below preserves TileCollectionScreen's exact labels).
const FAMILIES: Array = ["farm", "mining", "water", "hazards", "uncategorized"]

## family id → tab label. Byte-identical to TileCollectionScreen.FAMILY_LABEL (note "Other" for
## uncategorized, the port's choice — React SUB_CATEGORY_LABELS used "Uncategorized").
const FAMILY_LABEL := {
	"farm": "Farm",
	"mining": "Mining",
	"water": "Water",
	"hazards": "Hazards",
	"uncategorized": "Other",
}

# ── Category prefix-strip list (shared = union − "coin") ──────────────────────────
## The canonical tile-key prefix list dropped when deriving a display name. The three former copies
## were each slightly different:
##   • UiKit.pretty_name           : grass grain bird veg fruit flower tree herd cattle mount mine special fish
##   • TileCollectionScreen        : grass grain bird veg fruit flower tree herd cattle mount mine special      (no fish/coin)
##   • TileVariantUi               : grass grain bird veg fruit flower tree herd cattle mount mine special fish coin
## The shared list = the UNION of the three MINUS "coin" — i.e. exactly UiKit's old list (which
## already carried "fish"). Why this exact set:
##
##   • "fish" stays (it was in UiKit's list). It now ALSO applies to TileCollectionScreen, which
##     derives its grid/detail labels straight from this strip (it does NOT consult the catalog
##     display_name first — see TileCollectionScreen.display_name_for → _derive_display_name). So the
##     five fish tiles "tile_fish_<x>" now render "Sardine"/"Mackerel"/"Clam"/"Oyster"/"Kelp" in the
##     Tile Collection instead of "Fish Sardine"/… . This is an INTENTIONAL parity IMPROVEMENT: it
##     makes the Tile Collection consistent with UiKit's cost-chip labels and the TileVariantConfig
##     catalog display_name ("Sardine", …) that the chooser/wiki already show. Dropping "fish" to
##     avoid it would instead REGRESS UiKit's labels, so "fish" must stay.
##
##   • "coin" is DELIBERATELY EXCLUDED. It only ever appeared in TileVariantUi's copy, where it was
##     DEAD: every coin tile ("tile_coin_golden") is a catalog tile, so TileVariantUi.display_name
##     returns the catalog display_name ("Golden Coin") and never reaches this strip. Adding "coin"
##     to the shared list therefore gives ZERO upside but one DOWNSIDE — it would hit
##     TileCollectionScreen (which has no catalog precedence) and turn its coin label from the
##     pre-dedup "Coin Golden" into the strictly-worse "Golden" (which doesn't even match the
##     catalog's "Golden Coin"). Excluding "coin" keeps "tile_coin_golden" → "Coin Golden",
##     byte-identical to the pre-dedup TileCollectionScreen output.
const DROP_PREFIXES := [
	"grass", "grain", "bird", "veg", "fruit", "flower",
	"tree", "herd", "cattle", "mount", "mine", "special", "fish",
]

# ── Plural-alias normalisation (defensive) ────────────────────────────────────────
## React-plural category id → the port's short id. The live port never passes these (see header),
## but normalising on lookup means a stray React-plural key still resolves to byte-identical output.
const PLURAL_ALIAS := {
	"trees": "trees",            # already plural in the port ("trees" IS the short id)
	"birds": "birds",            # already the port's id
	"vegetables": "veg",
	"fruits": "fruit",
	"flowers": "flower",
	"herd_animals": "herd",
	"mounts": "mount",
	"bird": "birds",             # React singular "bird" → port plural "birds"
}

# ── The catalog, keyed by Godot short category id ─────────────────────────────────
## Each row carries the UNION of the previously-duplicated per-category attributes:
##   label   — display heading (TileCollectionScreen._category_heading + StartFarmingModal._category_label
##             agree for the farm categories; the heading specials add coin/fish_pearl/rat/rubble).
##             For the farm categories this is byte-identical to BOTH old tables.
##   glyph   — emoji fallback (StartFarmingModal.CATEGORY_GLYPH, React verbatim). "" when none.
##   family  — farm | mining | water | hazards | uncategorized (TileCollectionScreen.CATEGORY_TO_FAMILY).
##   tile    — the representative Constants.Tile enum (GameState.FARM_CATEGORY_TO_TILE); -1 (Constants.EMPTY)
##             for non-farm categories (only the farm categories have a representative tile).
##
## NOTE on label vs heading: TileCollectionScreen._category_heading and StartFarmingModal._category_label
## produced the SAME string for every farm category (Grass/Grain/Trees/Birds/Vegetables/Fruits/Flowers/
## Herd Animals/Cattle/Mounts). The heading additionally specialises the mine/hazard/treasure categories
## (Treasure, Giant Pearl, Rat (Hazard), Rubble (Hazard)). `label` here is the HEADING value; both
## consumers read it. For categories with no explicit row, both helpers fall back to title-casing the id
## (substr capitalize), which the accessors below reproduce.
const CATEGORIES := {
	# ── Farm categories — label + glyph + family + representative tile (the full
	# GameState.FARM_CATEGORY_TO_TILE map; FARM_CATEGORY_TILE is the 6-key base-spawn subset). ──
	"grass":  {"label": "Grass",        "glyph": "🌿", "family": "farm", "tile": Constants.Tile.GRASS},
	"grain":  {"label": "Grain",        "glyph": "🌾", "family": "farm", "tile": Constants.Tile.WHEAT},
	"trees":  {"label": "Trees",        "glyph": "🌳", "family": "farm", "tile": Constants.Tile.OAK},
	"birds":  {"label": "Birds",        "glyph": "🐦", "family": "farm", "tile": Constants.Tile.PHEASANT},
	"veg":    {"label": "Vegetables",   "glyph": "🥕", "family": "farm", "tile": Constants.Tile.CARROT},
	"fruit":  {"label": "Fruits",       "glyph": "🍎", "family": "farm", "tile": Constants.Tile.APPLE},
	"flower": {"label": "Flowers",      "glyph": "🌸", "family": "farm", "tile": Constants.Tile.PANSY},
	"herd":   {"label": "Herd Animals", "glyph": "🐖", "family": "farm", "tile": Constants.Tile.PIG},
	"cattle": {"label": "Cattle",       "glyph": "🐄", "family": "farm", "tile": Constants.Tile.COW},
	"mount":  {"label": "Mounts",       "glyph": "🐎", "family": "farm", "tile": Constants.Tile.HORSE},
	# ── Mine categories — heading is the title-cased id (no _category_heading special), no glyph,
	# family "mining", no representative farm tile. ──
	"stone":  {"label": "Stone",    "glyph": "", "family": "mining", "tile": Constants.EMPTY},
	"iron":   {"label": "Iron",     "glyph": "", "family": "mining", "tile": Constants.EMPTY},
	"copper": {"label": "Copper",   "glyph": "", "family": "mining", "tile": Constants.EMPTY},
	"coal":   {"label": "Coal",     "glyph": "", "family": "mining", "tile": Constants.EMPTY},
	"dirt":   {"label": "Dirt",     "glyph": "", "family": "mining", "tile": Constants.EMPTY},
	"gem":    {"label": "Gem",      "glyph": "", "family": "mining", "tile": Constants.EMPTY},
	"gold":   {"label": "Gold",     "glyph": "", "family": "mining", "tile": Constants.EMPTY},
	"coin":   {"label": "Treasure", "glyph": "", "family": "mining", "tile": Constants.EMPTY},
	# ── Water categories. ──
	"fish":       {"label": "Fish",        "glyph": "", "family": "water", "tile": Constants.EMPTY},
	"fish_pearl": {"label": "Giant Pearl", "glyph": "", "family": "water", "tile": Constants.EMPTY},
	# ── Hazard categories — _category_heading specials for rat/rubble; fire/lava/gas/mysterious_ore
	# title-case via the fallback (they have no detail-panel row today, kept here for completeness). ──
	"rat":            {"label": "Rat (Hazard)",    "glyph": "", "family": "hazards", "tile": Constants.EMPTY},
	"rubble":         {"label": "Rubble (Hazard)", "glyph": "", "family": "hazards", "tile": Constants.EMPTY},
	"fire":           {"label": "Fire",            "glyph": "", "family": "hazards", "tile": Constants.EMPTY},
	"lava":           {"label": "Lava",            "glyph": "", "family": "hazards", "tile": Constants.EMPTY},
	"gas":            {"label": "Gas",             "glyph": "", "family": "hazards", "tile": Constants.EMPTY},
	"mysterious_ore": {"label": "Mysterious Ore",  "glyph": "", "family": "hazards", "tile": Constants.EMPTY},
}

# ── Static accessors (house style — usable without an instance) ───────────────────

## Normalise a (possibly React-plural) category id to the port's short id. Identity for an id
## already in the catalog; maps a known React plural via PLURAL_ALIAS; otherwise returns it
## unchanged (so the title-case fallback still fires for a genuinely-unknown id).
static func _normalize(cat: String) -> String:
	if CATEGORIES.has(cat):
		return cat
	if PLURAL_ALIAS.has(cat):
		return String(PLURAL_ALIAS[cat])
	return cat

## Title-case fallback for an unknown category id ("xyz" → "Xyz"). Mirrors the trailing
## substr-capitalize branch BOTH _category_label and _category_heading shared.
static func _title_case(cat: String) -> String:
	if cat.length() > 0:
		return cat.substr(0, 1).to_upper() + cat.substr(1)
	return cat

## The display LABEL / HEADING for a category id. Byte-identical to BOTH the former
## StartFarmingModal._category_label and TileCollectionScreen._category_heading for every
## category they handled (the heading specials are folded into the catalog rows). For an
## unknown id, title-cases it (the shared fallback). NOTE: _category_heading returned "Other"
## for an EMPTY ("") category — heading() preserves that; label() (the StartFarmingModal path)
## never received "" so its title-case-of-"" ("") behaviour is moot.
static func label(cat: String) -> String:
	var c: String = _normalize(cat)
	if CATEGORIES.has(c):
		return String(CATEGORIES[c]["label"])
	return _title_case(c)

## The display HEADING for a category id, mirroring TileCollectionScreen._category_heading
## EXACTLY — including its special-case that an EMPTY id ("") returns "Other". For every
## non-empty id this equals label().
static func heading(cat: String) -> String:
	if cat == "":
		return "Other"
	return label(cat)

## The emoji GLYPH fallback for a category id (StartFarmingModal.CATEGORY_GLYPH). "" when the
## category has no glyph (mine/water/hazard categories). The StartFarmingModal call site uses
## CATEGORY_GLYPH.get(cat, "•"), so callers that want the "•" default should pass glyph()'s ""
## through their own default — glyph_or(cat, "•") gives the exact old behaviour.
static func glyph(cat: String) -> String:
	var c: String = _normalize(cat)
	if CATEGORIES.has(c):
		return String(CATEGORIES[c]["glyph"])
	return ""

## glyph() with a caller-supplied fallback, reproducing the old CATEGORY_GLYPH.get(cat, default)
## semantics in ONE place (StartFarmingModal passed "•"). Returns `default` when the category has
## no glyph (either unknown OR a glyph-less mine/water/hazard category).
static func glyph_or(cat: String, default_glyph: String) -> String:
	var g: String = glyph(cat)
	return g if g != "" else default_glyph

## The FAMILY id for a category ("farm"/"mining"/"water"/"hazards"/"uncategorized"). Mirrors
## TileCollectionScreen.CATEGORY_TO_FAMILY.get(cat, "uncategorized") — an unknown category falls
## back to "uncategorized".
static func family(cat: String) -> String:
	var c: String = _normalize(cat)
	if CATEGORIES.has(c):
		return String(CATEGORIES[c]["family"])
	return "uncategorized"

## The representative Constants.Tile enum for a FARM category (the GameState.FARM_CATEGORY_TO_TILE
## value); Constants.EMPTY (-1) for a non-farm category or unknown id.
static func representative_tile(cat: String) -> int:
	var c: String = _normalize(cat)
	if CATEGORIES.has(c):
		return int(CATEGORIES[c]["tile"])
	return Constants.EMPTY

## The tab label for a family id (TileCollectionScreen.FAMILY_LABEL.get(fam, fam)).
static func family_label(fam: String) -> String:
	return String(FAMILY_LABEL.get(fam, fam))

## The family ids in tab order (a fresh COPY so callers can't mutate the const).
static func families() -> Array:
	return FAMILIES.duplicate()

## The canonical prefix-strip list (a fresh COPY so callers can't mutate the const).
static func drop_prefixes() -> Array:
	return DROP_PREFIXES.duplicate()

# ── Shared display-name derivation (the ONE implementation all three consumers call) ──

## Derive a human-readable display name from a tile STRING_KEY: strip the redundant "tile_"
## prefix, drop a leading category segment (DROP_PREFIXES), then title-case each remaining word.
## "tile_grass_grass" → "Grass", "tile_mine_iron_ore" → "Iron Ore", "tile_special_dirt" → "Dirt".
##
## This is the SINGLE implementation that replaces the three former copies:
##   TileCollectionScreen._derive_display_name, TileVariantUi.display_name's fallback, and the
##   tile branch of UiKit.pretty_name. It uses the explicit per-word substr-capitalize (NOT
##   String.capitalize()) — that is what 2 of the 3 copies + the existing tests assert, and it is
##   byte-identical to String.capitalize() for every lowercase snake_case tile key in the catalog
##   (verified by the new suite over all STRING_KEYS). An empty key returns "".
static func display_name_from_key(key: String) -> String:
	if key == "":
		return ""
	var s: String = key
	if s.begins_with("tile_"):
		s = s.substr(5)
	var parts: Array = s.split("_")
	if parts.size() >= 2 and DROP_PREFIXES.has(String(parts[0])):
		parts.remove_at(0)
	var words: Array = []
	for p in parts:
		var ps: String = String(p)
		if ps.length() > 0:
			words.append(ps.substr(0, 1).to_upper() + ps.substr(1))
	return " ".join(words)
