extends RefCounted
## Shared, pure UI helpers for the tile-variant collection (display name, tile-art icon, unlock
## status string, ability summary). Used by both StartFarmingModal (the picker chooser) and
## TileCollectionScreen (the browser detail panel) so the two surfaces read identically.
##
## NO class_name — preloaded by each consumer as a const and called statically
## (const TVU := preload("res://scripts/TileVariantUi.gd"); TVU.status_for(...)). Keeping it off
## the global class registry means the port never needs an --import pass to use it.
##
## These mirror src/features/tileCollection/effects.ts (statusFor / getTileDetailViewModel) and
## the React AbilitySummary, translated to the GDScript catalog (TileVariantConfig). Display
## names use the same derivation as TileCollectionScreen._derive_display_name so a variant reads
## the same wherever it appears.

## Category prefixes dropped when deriving a display name (mirrors
## TileCollectionScreen._derive_display_name / UiKit.pretty_name DROP_PREFIXES).
const DROP_PREFIXES := [
	"grass", "grain", "bird", "veg", "fruit", "flower",
	"tree", "herd", "cattle", "mount", "mine", "special", "fish", "coin",
]

## Human-readable display name for a variant id ("tile_grass_meadow" → "Meadow Grass",
## "tile_mine_iron_ore" → "Ore"). Returns the catalog display_name via TileVariantConfig when
## available (the React displayName, verbatim); falls back to a title-case derivation for
## non-catalog ids (hazards). Mirrors React displayName.
static func display_name(id: String) -> String:
	if id == "":
		return ""
	# Prefer the catalog display_name (set for all 75 catalog variants).
	if TileVariantConfig.is_tile(id):
		return TileVariantConfig.display_name(id)
	# Non-catalog (rat, rubble, fish_pearl): fall back to title-case derivation.
	var s: String = id
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

## The player-facing description for a variant id. Returns the catalog description when
## available (the React description, verbatim), or "" for non-catalog ids.
static func description(id: String) -> String:
	return TileVariantConfig.description(id)

## A square TextureRect for a board tile's art (res://assets/tiles/<key>.png), or null when no
## PNG exists for that tile — callers fall back to a colored square / category glyph. Mirrors the
## v1-PNG path TileCollectionScreen already uses (board tile art is keyed `tile_<...>`, NOT under
## assets/resources, so UiKit.make_icon — which reads assets/resources — does not resolve these).
static func make_tile_icon(tile: int, px: int) -> TextureRect:
	if tile == Constants.EMPTY:
		return null
	var key: String = Constants.string_key(tile)
	if key == "":
		return null
	var path: String = "res://assets/tiles/%s.png" % key
	if not ResourceLoader.exists(path):
		return null
	var tex := load(path) as Texture2D
	if tex == null:
		return null
	var rect := TextureRect.new()
	rect.texture = tex
	rect.custom_minimum_size = Vector2(px, px)
	rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	rect.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	rect.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return rect

## Strip the family prefix off a chain/research target key for a readable status line
## ("tile_grass_grass" → "Grass"). Mirrors React effects.ts displayKey via display_name.
static func _display_key(k: String) -> String:
	if k.begins_with("tile_"):
		return display_name(k)
	# Non-tile keys (e.g. "eggs") read as title-case.
	return UiKit.pretty_name(k)

## The unlock-status string for a variant id (mirrors React effects.ts statusFor): a different
## line for default / discovered-by-method / still-locked-by-method, including live research
## progress for research variants. `game` may be null (treats everything as undiscovered).
static func status_for(game: GameState, id: String) -> String:
	var d: Dictionary = TileVariantConfig.discovery_of(id)
	var method: String = String(d.get("method", ""))
	var discovered: bool = game != null and game.is_tile_discovered(id)

	if method == "default":
		return "Default — always available"

	if discovered:
		match method:
			"chain":
				return "Discovered — chain %d %s to find" % [int(d.get("chainLength", 0)), _display_key(String(d.get("chainLengthOf", "")))]
			"research":
				return "Discovered — researched %s" % _display_key(String(d.get("researchOf", "")))
			"buy":
				return "Discovered — purchased"
			"daily":
				return "Discovered — Day %d daily reward" % int(d.get("day", 0))
			"building":
				return "Discovered — built the %s" % _building_name(String(d.get("buildingId", "")))
		return "Discovered"

	# Not yet discovered.
	match method:
		"research":
			var p: int = game.tile_research_progress.get(id, 0) if game != null else 0
			return "Researching %s: %d / %d" % [_display_key(String(d.get("researchOf", ""))), p, int(d.get("researchAmount", 0))]
		"chain":
			return "Locked — chain %d %s to discover" % [int(d.get("chainLength", 0)), _display_key(String(d.get("chainLengthOf", "")))]
		"buy":
			return "Buy %d 🪙" % int(d.get("coinCost", 0))
		"daily":
			return "Locked — Day %d daily reward" % int(d.get("day", 0))
		"building":
			return "Locked — build the %s" % _building_name(String(d.get("buildingId", "")))
	return "Locked"

## The detail-panel ACTION for a variant id, mirroring React getTileDetailViewModel: a Dictionary
## { action, label, disabled } where action ∈ {activate, active, buy, research, chain, daily,
## building, ""}. `game` may be null.
static func detail_action(game: GameState, id: String, category: String) -> Dictionary:
	var d: Dictionary = TileVariantConfig.discovery_of(id)
	var method: String = String(d.get("method", ""))
	var discovered: bool = game != null and game.is_tile_discovered(id)
	var active: bool = discovered and game != null and game.active_tile_id_for_category(category) == id

	if discovered:
		if active:
			return {"action": "active", "label": "Active", "disabled": true}
		return {"action": "activate", "label": "Activate", "disabled": false}
	match method:
		"buy":
			var cost: int = int(d.get("coinCost", 0))
			var afford: bool = game != null and game.coins >= cost
			return {"action": "buy", "label": "Buy %d 🪙" % cost, "disabled": not afford}
		"research":
			var p: int = game.tile_research_progress.get(id, 0) if game != null else 0
			return {"action": "research", "label": "Research %d / %d" % [p, int(d.get("researchAmount", 0))], "disabled": true}
		"chain":
			return {"action": "chain", "label": "Chain %d %s" % [int(d.get("chainLength", 0)), _display_key(String(d.get("chainLengthOf", "")))], "disabled": true}
		"daily":
			return {"action": "daily", "label": "Day %d reward" % int(d.get("day", 0)), "disabled": true}
		"building":
			return {"action": "building", "label": "Build the %s" % _building_name(String(d.get("buildingId", ""))), "disabled": true}
	return {"action": "", "label": "Locked", "disabled": true}

## A one-line human-readable ability summary for a variant id ("" when no abilities). Mirrors the
## React AbilitySummary intents for the ported ability ids.
static func ability_summary(id: String) -> String:
	var parts: Array = []
	for ab in TileVariantConfig.abilities_of(id):
		var s: String = _ability_phrase(ab)
		if s != "":
			parts.append(s)
	if parts.is_empty():
		return ""
	return "✦ " + "  ·  ".join(parts)

static func _ability_phrase(ab: Dictionary) -> String:
	var aid: String = String(ab.get("id", ""))
	var params: Dictionary = ab.get("params", {})
	match aid:
		"free_moves":
			return "+%d free moves each run" % int(params.get("count", 0))
		"coin_bonus_flat":
			return "+%d coins per chain" % int(params.get("amount", 0))
		"coin_bonus_per_tile":
			return "+%d coins per tile chained" % int(params.get("amount", 0))
		"free_turn_if_chain":
			return "Free turn on a chain of %d+" % int(params.get("minChain", 0))
		"pool_weight":
			return "+%d %s tiles on the board" % [int(params.get("amount", 0)), _display_key(String(params.get("target", "")))]
	return ""

## Human-readable building name for a building id (falls back to the id). Mirrors React buildingName.
static func _building_name(bid: String) -> String:
	if bid == "":
		return "a building"
	if BuildingConfig.is_building(bid):
		var nm: String = BuildingConfig.building_name(bid)
		if nm != "":
			return nm
	return bid
