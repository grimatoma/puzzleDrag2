extends CanvasLayer
## M11 — Tile Collection browser. A read-only parchment modal over a warm scrim that
## renders ALL 17 WIRED tiles (Constants.STRING_KEYS) as a scrollable gallery grouped by
## category. Each tile card shows:
##   • the tile ART — a TextureRect loading res://assets/tiles/<key>.png (v1 PNG); if the
##     PNG is absent, a small colored placeholder rect via Constants.color_for(tile).
##   • a display name derived from the STRING_KEY (strip "tile_", drop the category
##     prefix, replace underscores with spaces, Title Case).
##   • the category label (e.g. "Grass", "Grain", …).
##   • "Produces: <resource>" from Constants.PRODUCES; hazards with "" show
##     "Hazard — no yield".
##
## Tile discovery / research / buy / tile abilities are a LATER milestone — the React
## codebase's discovery/ability economy is NOT ported. This browser shows WHAT is in
## play, not how to unlock or spend tiles. A footer note says so explicitly.
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/TileCollectionScreen.gd")) so the port never needs an
## --import pass to register a new global. Modelled EXACTLY on AchievementsScreen.gd:
## `extends CanvasLayer`, setup(g)/open()/refresh(), signal closed, _action_buttons["close"],
## parchment card + scrim + Cinzel title, ScrollContainer+VBoxContainer body, category
## sub-headings, UiKit/Palette styling.

var game: GameState

signal closed

## action id → Button. Currently just "close".
var _action_buttons: Dictionary = {}

## Static shell built once in setup(); body cleared + repopulated each refresh().
var _body: VBoxContainer
var _built: bool = false

## Header label "N tiles in play", rebuilt each refresh().
var _header_label: Label

## tile enum int → the rendered card Control, rebuilt each refresh().
## Lets tests assert the card count and inspect specific tile cards.
var _cards: Dictionary = {}

## All category ids in display order. Derived from the tile enum order so new tiles
## appended to the enum automatically land in the right section.
const CATEGORY_ORDER: Array = [
	"grass", "grain", "birds", "veg", "fruit", "flower",
	"trees", "herd", "cattle", "mount",
	"stone", "iron", "copper", "coal", "dirt", "gem", "gold", "coin",
	"fish", "fish_pearl",
	"rat", "rubble",
]

# ── parchment palette (matches AchievementsScreen / InventoryScreen tokens) ──────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 600.0

## Tile art size in the card (px). 56px reads cleanly at 720 wide with a 2-col grid.
const ART_SIZE: int = 56

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render. Safe to call again
## (the shell is only built the first time).
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true
	refresh()

func open() -> void:
	visible = true
	refresh()

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                   # modal, above the HUD (layer 1)
	visible = false

	# Opaque VIEW background (not a dim modal scrim). B2 promotes this menu sub-page to a
	# full-brightness VIEW: it paints the warm app-frame parchment over the board (no longer
	# dimmed behind), reserving UiKit.TOPBAR_RESERVE at the TOP so the persistent layer-1 HUD
	# top bar shows ABOVE the view, and stopping UiKit.NAV_RESERVE short of the bottom so the
	# persistent nav bar (a LOWER CanvasLayer) shows through + stays tappable; MOUSE_FILTER_STOP
	# eats clicks in the band it covers.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_top = UiKit.TOPBAR_RESERVE   # reveal the persistent HUD top bar above
	backdrop.offset_bottom = -UiKit.NAV_RESERVE  # leave the bottom nav strip unpainted
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-bleed view content: a full-rect Control holds a panel pinned edge-to-edge (no card
	# margins), reserving the top-bar band + bottom-nav strip; a width-cap MarginContainer keeps
	# line length tidy on wide viewports.
	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	# Full-bleed: no L/R card margins; the backdrop already reserves the top band so only a
	# small inner pad is needed at the top; the bottom clears the persistent nav strip.
	panel.offset_left = 0
	panel.offset_right = 0
	panel.offset_top = UiKit.TOPBAR_RESERVE + 8
	panel.offset_bottom = -UiKit.NAV_RESERVE
	# Flat page fill (NOT a floating card) — parchment, no corner radius, no border, no drop
	# shadow, so it reads as a full-brightness page under the persistent top bar. This menu
	# sub-page KEEPS its visible "✕ Close" (the legitimate back-to-board affordance).
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	# Keep the panel from sprawling on wide viewports.
	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	# A non-scrolling column: title row + header line pinned at top, then a
	# ScrollContainer that owns the (potentially long) tile gallery.
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "📖 Tiles" heading + right-aligned "✕ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "📖 Tile Collection"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	var close_btn := Button.new()
	close_btn.text = "✕ Close"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(close_btn, Palette.EMBER, 6, 20)
	close_btn.connect("pressed", Callable(self, "close"))
	title_row.add_child(close_btn)
	_action_buttons["close"] = close_btn

	# Header line — "N tiles in play" (gold), rebuilt each refresh().
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 18)
	_header_label.add_theme_color_override("font_color", COL_VALUE)
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_vbox.add_child(_header_label)

	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(scroll)

	# Dynamic body — cleared + rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

# ── render ─────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from Constants.STRING_KEYS: the header count line,
## then a section (sub-heading + a 2-col grid of tile cards) per category. Every tile
## in STRING_KEYS gets exactly one card (tracked in `_cards`).
func refresh() -> void:
	if not _built:
		return
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()

	var total: int = Constants.STRING_KEYS.size()
	_header_label.text = "%d tiles in play" % total

	# Group tile enum values by their category id.
	var cat_to_tiles: Dictionary = {}
	for tile_val in Constants.STRING_KEYS.keys():
		var cat: String = Constants.category_of(int(tile_val))
		if not cat_to_tiles.has(cat):
			cat_to_tiles[cat] = []
		(cat_to_tiles[cat] as Array).append(int(tile_val))

	# Render in CATEGORY_ORDER (any category not listed still renders at the end).
	var rendered_cats: Array = []
	for cat in CATEGORY_ORDER:
		if cat_to_tiles.has(cat) and not (cat_to_tiles[cat] as Array).is_empty():
			_build_category_section(cat, cat_to_tiles[cat] as Array)
			rendered_cats.append(cat)
	# Trailing catch-all for any unknown categories not in CATEGORY_ORDER.
	for cat in cat_to_tiles.keys():
		if not rendered_cats.has(cat):
			_build_category_section(cat, cat_to_tiles[cat] as Array)

	# Footer note: honest about deferred mechanics.
	_build_footer()

## Build one category section: an iron hairline, an ember Cinzel sub-heading, then a
## 2-column grid of tile cards.
func _build_category_section(cat: String, tiles: Array) -> void:
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_body.add_child(rule)

	var header := Label.new()
	header.text = _category_heading(cat)
	header.add_theme_font_size_override("font_size", 22)
	header.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		header.add_theme_font_override("font", heading_font)
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(header)

	# 2-column grid of tile cards.
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	_body.add_child(grid)

	for tile_val in tiles:
		var card := _make_tile_card(int(tile_val))
		grid.add_child(card)
		_cards[int(tile_val)] = card

## A single tile card: a soft-parchment chip holding an HBox of [art | info column].
## Art: a TextureRect (~ART_SIZEpx) loading the v1 PNG, or a colored placeholder rect.
## Info column: display name (bold ink), category label (muted), "Produces: X" (gold/muted).
func _make_tile_card(tile_val: int) -> PanelContainer:
	var key: String = Constants.string_key(tile_val)
	var display_name: String = _derive_display_name(key)
	var cat_label: String = _category_heading(Constants.category_of(tile_val))
	var produces: String = Constants.produced_resource(tile_val)
	var produces_text: String
	if produces == "":
		produces_text = "Hazard — no yield"
	else:
		produces_text = "Produces: %s" % produces

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 10)
	chip.add_child(row)

	# ── Art: TextureRect (v1 PNG) or colored placeholder ──────────────────────
	var art_path: String = "res://assets/tiles/%s.png" % key
	if key != "" and ResourceLoader.exists(art_path):
		# load() is ResourceLoader-cached (CACHE_MODE_REUSE), so rebuilding chips on every
		# refresh reuses the already-loaded Texture2D instead of re-reading the PNG from disk.
		# (Tile._texture_for is int-keyed by tile type, so it doesn't fit this string-key path.)
		var tex := load(art_path) as Texture2D
		var art := TextureRect.new()
		art.texture = tex
		art.custom_minimum_size = Vector2(ART_SIZE, ART_SIZE)
		art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		art.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		art.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(art)
	else:
		# Colored placeholder: a small colored rect sized to ART_SIZE × ART_SIZE.
		var placeholder := ColorRect.new()
		placeholder.custom_minimum_size = Vector2(ART_SIZE, ART_SIZE)
		placeholder.color = Constants.color_for(tile_val)
		placeholder.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(placeholder)

	# ── Info column ────────────────────────────────────────────────────────────
	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.mouse_filter = Control.MOUSE_FILTER_IGNORE
	info.add_theme_constant_override("separation", 3)
	row.add_child(info)

	var name_lbl := Label.new()
	name_lbl.text = display_name
	name_lbl.add_theme_font_size_override("font_size", 18)
	name_lbl.add_theme_color_override("font_color", COL_BODY)
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	info.add_child(name_lbl)

	var cat_lbl := Label.new()
	cat_lbl.text = cat_label
	cat_lbl.add_theme_font_size_override("font_size", 13)
	cat_lbl.add_theme_color_override("font_color", COL_MUTED)
	cat_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	info.add_child(cat_lbl)

	var prod_lbl := Label.new()
	prod_lbl.text = produces_text
	prod_lbl.add_theme_font_size_override("font_size", 14)
	prod_lbl.add_theme_color_override("font_color",
		COL_MUTED if produces == "" else COL_VALUE)
	prod_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	info.add_child(prod_lbl)

	return chip

## Footer row: honest note about deferred mechanics.
func _build_footer() -> void:
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.4)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_body.add_child(rule)

	var note := Label.new()
	note.text = "Tile discovery, research, buy, and tile abilities are a later milestone — not yet ported from the React build."
	note.add_theme_font_size_override("font_size", 13)
	note.add_theme_color_override("font_color", COL_MUTED)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(note)

# ── display-name derivation ────────────────────────────────────────────────────

## Derive a human-readable display name from a tile STRING_KEY.
## Rules (applied in order):
##   1. Strip a leading "tile_" prefix.
##   2. Split on "_".
##   3. If there are ≥2 segments and the first segment matches a known category
##      prefix (e.g. "grass", "grain", "bird", "veg", …), drop ONLY the first segment
##      when it is a redundant category label (i.e. the remaining segments already
##      uniquely name the tile). Category prefixes to drop:
##        grass, grain, bird, veg, fruit, flower, tree, herd, cattle, mount, mine, special
##   4. Replace underscores in remaining segments with spaces.
##   5. Title-case each word.
##
## Examples:
##   "tile_grass_grass"   → strip "tile_" → "grass_grass" → segments ["grass","grass"]
##                          → drop first (cat prefix "grass") → ["grass"] → "Grass"
##   "tile_grain_wheat"   → "grain_wheat" → ["grain","wheat"] → drop "grain" → "Wheat"
##   "tile_mine_iron_ore" → "mine_iron_ore" → ["mine","iron","ore"] → drop "mine" → "Iron Ore"
##   "tile_bird_pheasant" → "bird_pheasant" → ["bird","pheasant"] → drop "bird" → "Pheasant"
##   "tile_special_dirt"  → "special_dirt" → ["special","dirt"] → drop "special" → "Dirt"
##   "rat"                → no "tile_" → ["rat"] → "Rat"
##   "rubble"             → ["rubble"] → "Rubble"
static func _derive_display_name(key: String) -> String:
	if key == "":
		return ""
	var s: String = key
	if s.begins_with("tile_"):
		s = s.substr(5)   # strip "tile_"
	var parts: Array = s.split("_")
	# Category prefixes that should be dropped when leading (they add no info).
	const DROP_PREFIXES := [
		"grass", "grain", "bird", "veg", "fruit", "flower",
		"tree", "herd", "cattle", "mount", "mine", "special",
	]
	if parts.size() >= 2 and DROP_PREFIXES.has(String(parts[0])):
		parts.remove_at(0)
	# Title-case each remaining word and join with spaces.
	var words: Array = []
	for p in parts:
		var ps: String = String(p)
		if ps.length() > 0:
			words.append(ps.substr(0, 1).to_upper() + ps.substr(1))
	return " ".join(words)

## Convert a category id ("grass", "iron", …) to a title-cased heading string.
static func _category_heading(cat: String) -> String:
	if cat == "":
		return "Other"
	# Special cases for multi-word-ish categories.
	match cat:
		"iron":       return "Iron"
		"copper":     return "Copper"
		"coal":       return "Coal"
		"gem":        return "Gem"
		"gold":       return "Gold"
		"coin":       return "Treasure"
		"dirt":       return "Dirt"
		"stone":      return "Stone"
		"mount":      return "Mounts"
		"fish":       return "Fish"
		"fish_pearl": return "Giant Pearl"
		"rat":        return "Rat (Hazard)"
		"rubble":     return "Rubble (Hazard)"
	# Default: title-case the id.
	if cat.length() > 0:
		return cat.substr(0, 1).to_upper() + cat.substr(1)
	return cat

# ── pure helpers (usable + testable without rendering) ────────────────────────

## Total number of wired tiles (= Constants.STRING_KEYS.size()).
static func tile_count() -> int:
	return Constants.STRING_KEYS.size()

## Display name for a tile enum value. Delegates to _derive_display_name via string_key.
static func display_name_for(tile_val: int) -> String:
	return _derive_display_name(Constants.string_key(tile_val))
