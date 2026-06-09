extends CanvasLayer
## The Tile Collection browser — the GDScript port of the React tiles-wiki browser
## (src/features/tileCollection, getCategoryViewModel / getTileDetailViewModel). A full-
## brightness VIEW (opaque parchment over the board, reserving the top-bar + bottom-nav bands)
## with FAMILY TABS (Farm / Mining / Water / Hazards / Uncategorized), a grid of the tiles in
## the selected family, and a DETAIL PANEL for a tapped tile showing its tier, description,
## abilities, produced resource, an unlock STATUS line, and an ACTION button.
##
## The action set mirrors React getTileDetailViewModel exactly:
##   discovered → "Activate" (set_active_tile; disabled + "Active" when already active)
##   buy        → "Buy N🪙"  (buy_tile; disabled when coins < cost)
##   research   → "Research P / Goal" (disabled, informational)
##   chain      → "Chain N <res>"     (disabled, informational)
##   daily      → "Day N reward"      (disabled, informational)
##   building   → "Build the <name>"  (disabled, informational)
##
## NO class_name — Main preloads this script so the port never needs an --import pass. Keeps the
## existing open/close/`closed`/`_action_buttons["close"]` contract, the opaque view shell
## (TOPBAR_RESERVE top + NAV_RESERVE bottom), UiKit.make_vscroll, and the width cap.
##
## HEADLESS-TEST CONTRACT
##   `_action_buttons` keys: "close", "tab_<family>" (one per family), "tile_<id>" (select a
##     tile for the detail panel — id is the catalog string id, or the tile's string_key for
##     non-catalog hazards), "detail_action" (the detail action button, present only while a
##     tile is selected and it has an action).
##   `_cards`: tile-enum-int → the rendered grid card Control for tiles in the CURRENT tab.
##   Helpers: selected_tab() -> String, selected_tile_id() -> String ("" when none),
##     detail_action_label() -> String, tile_count() (static), display_name_for(tile) (static).

var game: GameState

signal closed

## Shared tile-variant UI helpers (display name, tile-art icon, status string, action, abilities).
const TVU := preload("res://scripts/TileVariantUi.gd")

## action id → Button ("close", "tab_<family>", "tile_<id>", "detail_action").
var _action_buttons: Dictionary = {}

## tile enum int → its rendered grid card Control (current tab only). Rebuilt per tab.
var _cards: Dictionary = {}

## Static shell built once; the grid + detail repopulate on tab/tile change.
var _built: bool = false
var _header_label: Label
var _tabs_row: HBoxContainer
var _grid: GridContainer
var _detail_panel: PanelContainer
var _detail_body: VBoxContainer
var _grid_scroll: ScrollContainer

## The currently-selected family tab and tile.
var _selected_tab: String = "farm"
var _selected_tile_id: String = ""

# ── families ────────────────────────────────────────────────────────────────────
## Top-level family tabs (React SUB_CATEGORIES) → a label. Order is the tab order.
const FAMILIES: Array = ["farm", "mining", "water", "hazards", "uncategorized"]
const FAMILY_LABEL := {
	"farm": "Farm",
	"mining": "Mining",
	"water": "Water",
	"hazards": "Hazards",
	"uncategorized": "Other",
}
## Godot category id → family (React CATEGORY_TO_SUBCATEGORY translated to godot ids).
const CATEGORY_TO_FAMILY := {
	"grass": "farm", "grain": "farm", "birds": "farm", "veg": "farm", "fruit": "farm",
	"flower": "farm", "trees": "farm", "herd": "farm", "cattle": "farm", "mount": "farm",
	"stone": "mining", "iron": "mining", "copper": "mining", "coal": "mining",
	"dirt": "mining", "gem": "mining", "gold": "mining", "coin": "mining",
	"fish": "water", "fish_pearl": "water",
	"rat": "hazards", "rubble": "hazards",
}

# ── parchment palette ─────────────────────────────────────────────────────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
const ART_SIZE: int = 48
const DETAIL_ART: int = 72

# ── lifecycle ──────────────────────────────────────────────────────────────────

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
	layer = 4
	visible = false

	# Opaque VIEW background reserving the persistent top bar (top) + bottom nav (bottom).
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_top = UiKit.TOPBAR_RESERVE
	backdrop.offset_bottom = -UiKit.NAV_RESERVE
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.offset_left = 0
	panel.offset_right = 0
	panel.offset_top = UiKit.TOPBAR_RESERVE + 8
	panel.offset_bottom = -UiKit.NAV_RESERVE
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var width_cap := UiKit.make_width_cap()
	panel.add_child(width_cap)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "📖 Tile Collection" + "✖ Close".
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
	close_btn.text = "✖ Close"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(close_btn, Palette.EMBER, 6, 20)
	close_btn.connect("pressed", Callable(self, "close"))
	title_row.add_child(close_btn)
	_action_buttons["close"] = close_btn

	# Header line — "N tiles in play" (kept for the existing test + a clear count).
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 18)
	_header_label.add_theme_color_override("font_color", COL_VALUE)
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_vbox.add_child(_header_label)

	# Family tab row (React TabBar — UiKit.style_segment).
	_tabs_row = HBoxContainer.new()
	_tabs_row.add_theme_constant_override("separation", 6)
	root_vbox.add_child(_tabs_row)
	for fam in FAMILIES:
		var tb := Button.new()
		tb.text = String(FAMILY_LABEL.get(fam, fam))
		tb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tb.connect("pressed", Callable(self, "_on_tab").bind(String(fam)))
		_tabs_row.add_child(tb)
		_action_buttons["tab_" + String(fam)] = tb

	# Body: a horizontal split — the tile GRID (scroll) on the left, the DETAIL panel on the
	# right. On a portrait phone the detail panel sits BELOW (a VBox), so use a VBox of
	# [grid-scroll | detail] which reads top-to-bottom and keeps the width cap tidy.
	var body := VBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 10)
	root_vbox.add_child(body)

	_grid_scroll = UiKit.make_vscroll()
	_grid_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_grid_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_grid_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(_grid_scroll)

	_grid = GridContainer.new()
	_grid.columns = 3
	_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_grid.add_theme_constant_override("h_separation", 8)
	_grid.add_theme_constant_override("v_separation", 8)
	_grid_scroll.add_child(_grid)

	# Detail panel — a parchment card below the grid (rebuilt per selected tile).
	_detail_panel = PanelContainer.new()
	_detail_panel.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PARCHMENT))
	_detail_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(_detail_panel)

	_detail_body = VBoxContainer.new()
	_detail_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_body.add_theme_constant_override("separation", 6)
	_detail_panel.add_child(_detail_body)

# ── render ─────────────────────────────────────────────────────────────────────

## Re-render the header, tab styling, the tile grid for the selected tab, and the detail panel.
func refresh() -> void:
	if not _built:
		return
	_header_label.text = "%d tiles in play" % Constants.STRING_KEYS.size()
	_style_tabs()
	_rebuild_grid()
	_rebuild_detail()

## Style the family tabs by the active one (React segmented control).
func _style_tabs() -> void:
	for fam in FAMILIES:
		var btn: Button = _action_buttons.get("tab_" + String(fam))
		if btn != null:
			UiKit.style_segment(btn, String(fam) == _selected_tab, Palette.EMBER, 6)

## Rebuild the tile grid for the selected family. One card per tile in that family, tracked in
## `_cards` keyed by the tile enum int.
func _rebuild_grid() -> void:
	for child in _grid.get_children():
		_grid.remove_child(child)
		child.queue_free()
	_cards.clear()
	# Drop stale per-tile select buttons from the registry.
	for k in _action_buttons.keys():
		if String(k).begins_with("tile_"):
			_action_buttons.erase(k)

	for tile_val in _tiles_in_family(_selected_tab):
		var card := _make_grid_card(int(tile_val))
		_grid.add_child(card)
		_cards[int(tile_val)] = card

## The tile enum values belonging to a family, in Constants.STRING_KEYS (enum) order.
func _tiles_in_family(family: String) -> Array:
	var out: Array = []
	for tile_val in Constants.STRING_KEYS.keys():
		var cat: String = Constants.category_of(int(tile_val))
		var fam: String = String(CATEGORY_TO_FAMILY.get(cat, "uncategorized"))
		if fam == family:
			out.append(int(tile_val))
	return out

## A single tile grid card: a parchment chip with the tile art, its display name, and a small
## lock/active marker. Tapping it selects the tile for the detail panel. Registered as
## "tile_<id>" where id is the catalog string id (or the tile string_key for non-catalog tiles).
func _make_grid_card(tile_val: int) -> Control:
	var id: String = _id_for_tile(tile_val)
	var display_name: String = display_name_for(tile_val)
	var discovered: bool = _is_discovered(id)
	var active: bool = _is_active(tile_val, id)

	var btn := Button.new()
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.custom_minimum_size = Vector2(0, 96)
	var selected: bool = (id == _selected_tile_id and id != "")
	UiKit.style_button(btn, Palette.EMBER, 6, 0)
	if selected:
		# Highlight the selected card with a green action box.
		UiKit.style_action_button(btn, Palette.GO_GREEN, 6, 0)
	btn.connect("pressed", Callable(self, "_on_tile").bind(tile_val))
	_action_buttons["tile_" + id] = btn

	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 2)
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	btn.add_child(vbox)

	var icon_holder := CenterContainer.new()
	icon_holder.custom_minimum_size = Vector2(0, ART_SIZE)
	icon_holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var icon := TVU.make_tile_icon(tile_val, ART_SIZE)
	if icon != null:
		if not discovered:
			icon.modulate = Color(1, 1, 1, 0.45)
		icon_holder.add_child(icon)
	else:
		var ph := ColorRect.new()
		ph.custom_minimum_size = Vector2(ART_SIZE, ART_SIZE)
		ph.color = Constants.color_for(tile_val)
		ph.mouse_filter = Control.MOUSE_FILTER_IGNORE
		icon_holder.add_child(ph)
	vbox.add_child(icon_holder)

	var name_lbl := Label.new()
	# Marker prefix: ● for the active variant, 🔒 for an undiscovered tile.
	var marker: String = ""
	if active:
		marker = "● "
	elif not discovered and id != "":
		marker = "🔒 "
	name_lbl.text = marker + display_name
	name_lbl.add_theme_font_size_override("font_size", 12)
	name_lbl.add_theme_color_override("font_color", Palette.INK if discovered else Palette.INK_MID)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(name_lbl)

	return btn

## Rebuild the detail panel for the selected tile (or a "tap a tile" placeholder).
func _rebuild_detail() -> void:
	for child in _detail_body.get_children():
		_detail_body.remove_child(child)
		child.queue_free()
	_action_buttons.erase("detail_action")

	if _selected_tile_id == "":
		var hint := Label.new()
		hint.text = "Tap a tile above to see its details."
		hint.add_theme_font_size_override("font_size", 14)
		hint.add_theme_color_override("font_color", COL_MUTED)
		hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_detail_body.add_child(hint)
		return

	var id: String = _selected_tile_id
	var tile_val: int = _tile_for_id(id)
	var category: String = Constants.category_of(tile_val) if tile_val != Constants.EMPTY else ""

	# Header: art + name + tier.
	var head := HBoxContainer.new()
	head.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_theme_constant_override("separation", 12)
	_detail_body.add_child(head)

	var art_holder := CenterContainer.new()
	art_holder.custom_minimum_size = Vector2(DETAIL_ART, DETAIL_ART)
	art_holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var art := TVU.make_tile_icon(tile_val, DETAIL_ART)
	if art != null:
		art_holder.add_child(art)
	else:
		var ph := ColorRect.new()
		ph.custom_minimum_size = Vector2(DETAIL_ART, DETAIL_ART)
		ph.color = Constants.color_for(tile_val)
		art_holder.add_child(ph)
	head.add_child(art_holder)

	var head_col := VBoxContainer.new()
	head_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head_col.add_theme_constant_override("separation", 3)
	head.add_child(head_col)

	var name_lbl := Label.new()
	name_lbl.text = display_name_for(tile_val)
	name_lbl.add_theme_font_size_override("font_size", 22)
	name_lbl.add_theme_color_override("font_color", COL_HEADER)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		name_lbl.add_theme_font_override("font", hf)
	head_col.add_child(name_lbl)

	var meta := Label.new()
	var tier: int = TileVariantConfig.tier_of(id) if TileVariantConfig.is_tile(id) else 0
	var cat_label: String = _category_heading(category)
	meta.text = "%s · Tier %d" % [cat_label, tier]
	meta.add_theme_font_size_override("font_size", 12)
	meta.add_theme_color_override("font_color", COL_MUTED)
	head_col.add_child(meta)

	# Produced resource.
	var produces: String = Constants.produced_resource(tile_val)
	var prod := Label.new()
	prod.text = ("Hazard — no yield" if produces == "" else "Produces: %s" % UiKit.pretty_name(produces))
	prod.add_theme_font_size_override("font_size", 14)
	prod.add_theme_color_override("font_color", COL_MUTED if produces == "" else COL_VALUE)
	_detail_body.add_child(prod)

	# Abilities (human-readable).
	if TileVariantConfig.is_tile(id):
		var ab_text: String = TVU.ability_summary(id)
		if ab_text != "":
			var ab := Label.new()
			ab.text = ab_text
			ab.add_theme_font_size_override("font_size", 13)
			ab.add_theme_color_override("font_color", Palette.MOSS)
			ab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_detail_body.add_child(ab)

	# Status line.
	var status := Label.new()
	status.text = (TVU.status_for(game, id) if TileVariantConfig.is_tile(id)
		else "Board hazard — not a collectible tile variant.")
	status.add_theme_font_size_override("font_size", 13)
	status.add_theme_color_override("font_color", COL_MUTED)
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_detail_body.add_child(status)

	# Description (player-facing flavour text from the React catalog).
	if TileVariantConfig.is_tile(id):
		var desc_text: String = TVU.description(id)
		if desc_text != "":
			var desc := Label.new()
			desc.text = desc_text
			desc.add_theme_font_size_override("font_size", 13)
			desc.add_theme_color_override("font_color", COL_BODY)
			desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			desc.mouse_filter = Control.MOUSE_FILTER_IGNORE
			_detail_body.add_child(desc)

	# Action button (mirrors getTileDetailViewModel). Non-catalog hazards have no action.
	if TileVariantConfig.is_tile(id):
		var act: Dictionary = TVU.detail_action(game, id, category)
		var action: String = String(act.get("action", ""))
		if action != "":
			var btn := Button.new()
			btn.text = String(act.get("label", ""))
			btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var disabled: bool = bool(act.get("disabled", true))
			btn.disabled = disabled
			var accent: Color = Palette.IRON
			match action:
				"activate": accent = Palette.GO_GREEN
				"buy":      accent = Palette.GOLD
				_:          accent = Palette.IRON
			UiKit.style_action_button(btn, accent, 8, 15)
			btn.connect("pressed", Callable(self, "_on_detail_action").bind(id, action, category))
			_detail_body.add_child(btn)
			_action_buttons["detail_action"] = btn

# ── action handlers ────────────────────────────────────────────────────────────

func _on_tab(family: String) -> void:
	_selected_tab = family
	# Keep the selected tile only if it still belongs to this tab; else clear it.
	if _selected_tile_id != "":
		var t: int = _tile_for_id(_selected_tile_id)
		var fam: String = String(CATEGORY_TO_FAMILY.get(Constants.category_of(t), "uncategorized"))
		if fam != family:
			_selected_tile_id = ""
	refresh()

func _on_tile(tile_val: int) -> void:
	_selected_tile_id = _id_for_tile(tile_val)
	_rebuild_grid()   # restyle the selected card
	_rebuild_detail()

## The detail ACTION fired: "activate" sets the active variant, "buy" purchases it. Both then
## re-render so the grid markers + detail action label update. Informational actions (research/
## chain/daily/building) are disabled so they never reach here.
func _on_detail_action(id: String, action: String, category: String) -> void:
	if game == null:
		return
	match action:
		"activate":
			game.set_active_tile(category, id)
		"buy":
			game.buy_tile(id)
	refresh()

# ── helpers ──────────────────────────────────────────────────────────────────

## The catalog string id for a tile enum, or its string_key for non-catalog tiles (rat/rubble).
func _id_for_tile(tile_val: int) -> String:
	var cid: String = TileVariantConfig.id_for_tile(tile_val)
	if cid != "":
		return cid
	return Constants.string_key(tile_val)

## The tile enum for a string id (a catalog id, or a bare string_key for hazards).
func _tile_for_id(id: String) -> int:
	if TileVariantConfig.is_tile(id):
		return TileVariantConfig.tile_for(id)
	# Non-catalog: scan STRING_KEYS for a match.
	for tile_val in Constants.STRING_KEYS.keys():
		if Constants.string_key(int(tile_val)) == id:
			return int(tile_val)
	return Constants.EMPTY

func _is_discovered(id: String) -> bool:
	if not TileVariantConfig.is_tile(id):
		return true   # non-catalog board tiles (hazards) are always "in play"
	return game != null and game.is_tile_discovered(id)

func _is_active(tile_val: int, id: String) -> bool:
	if not TileVariantConfig.is_tile(id) or game == null:
		return false
	var cat: String = Constants.category_of(tile_val)
	return game.active_tile_id_for_category(cat) == id

## Convert a category id to a title-cased heading (mirrors the old _category_heading specials).
static func _category_heading(cat: String) -> String:
	if cat == "":
		return "Other"
	match cat:
		"veg":        return "Vegetables"
		"fruit":      return "Fruits"
		"flower":     return "Flowers"
		"herd":       return "Herd Animals"
		"mount":      return "Mounts"
		"coin":       return "Treasure"
		"fish_pearl": return "Giant Pearl"
		"rat":        return "Rat (Hazard)"
		"rubble":     return "Rubble (Hazard)"
	if cat.length() > 0:
		return cat.substr(0, 1).to_upper() + cat.substr(1)
	return cat

# ── public accessors (headless-test contract) ───────────────────────────────────

func selected_tab() -> String:
	return _selected_tab

func selected_tile_id() -> String:
	return _selected_tile_id

func detail_action_label() -> String:
	var btn: Button = _action_buttons.get("detail_action")
	return btn.text if btn != null else ""

# ── static helpers (kept from the original; used by tests) ──────────────────────

## Total number of wired tiles (= Constants.STRING_KEYS.size()).
static func tile_count() -> int:
	return Constants.STRING_KEYS.size()

## Display name for a tile enum value (shared derivation via the tile's string_key).
static func display_name_for(tile_val: int) -> String:
	return _derive_display_name(Constants.string_key(tile_val))

## Derive a human-readable display name from a tile STRING_KEY. KEPT (the existing suite unit-
## tests this directly) — strips "tile_" + a leading redundant category segment, title-cases.
static func _derive_display_name(key: String) -> String:
	if key == "":
		return ""
	var s: String = key
	if s.begins_with("tile_"):
		s = s.substr(5)
	var parts: Array = s.split("_")
	const DROP_PREFIXES := [
		"grass", "grain", "bird", "veg", "fruit", "flower",
		"tree", "herd", "cattle", "mount", "mine", "special",
	]
	if parts.size() >= 2 and DROP_PREFIXES.has(String(parts[0])):
		parts.remove_at(0)
	var words: Array = []
	for p in parts:
		var ps: String = String(p)
		if ps.length() > 0:
			words.append(ps.substr(0, 1).to_upper() + ps.substr(1))
	return " ".join(words)
