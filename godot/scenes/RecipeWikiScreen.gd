extends CanvasLayer
## Recipe Wiki — interactive crafting list using the same expand-in-place pattern as
## InventoryScreen. Tapping a recipe row expands it in place to reveal the input chips
## and Craft button; the separate detail card below the list is gone.
##
## LAYOUT (InventoryScreen parity): a STATION tab bar (Bakery, Kitchen, …), an optional
## ⊞ Grid / ≣ List view toggle (list = expandable rows, grid = compact icon+name chips),
## and a list/grid body rebuilt each refresh(). The shared expand helpers live in UiKit
## (make_expandable_chip / begin_expand_details / add_expand_eyebrow / make_expand_body_text)
## so both screens use exactly the same chip-and-details component.
##
## NO class_name on purpose — Main preloads this script so the port never needs --import.
##
## Data: RecipeConfig + BuildingConfig + GameState. Auto-grows with new recipes.

var game: GameState

signal closed
signal state_changed   ## emitted after a successful craft so Main re-renders the HUD

## action id → Button. "close" + "view_toggle" (static); "craft" when a row is expanded.
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each refresh().
var _body: VBoxContainer
var _built: bool = false

## Header label (recipe count), rebuilt each refresh().
var _header_label: Label

## station building_id → its tab Button (built once in the shell).
var _station_buttons: Dictionary = {}

## recipe_id → the rendered expandable chip PanelContainer for the active station
## (rebuilt each refresh()). Lets tests fetch a specific row.
var _cards: Dictionary = {}

## The active station tab (a BuildingConfig id).
var _active_station: String = ""

## The currently expanded recipe id ("" = none). Tapping a row toggles it; tapping
## another moves the expansion. Collapses when the station tab switches.
var _expanded: String = ""

## Body view mode: "list" (expandable rows, default) or "grid" (compact icon+name chips).
const VIEW_LIST := "list"
const VIEW_GRID := "grid"
var _view: String = VIEW_LIST
var _view_btn: Button

# ── parchment palette (matches AchievementsScreen / TownScreen tokens) ──────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
const COL_SHORT  := Color8(0xb0, 0x52, 0x3a)
const PANEL_MAX_WIDTH := 560.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true
	_ensure_station()
	refresh()

func open() -> void:
	visible = true
	_ensure_station()
	refresh()

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4
	visible = false

	var backdrop := UiKit.make_view_backdrop()
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

	# Title row: "🔨 Craft" heading + ⊞/≣ view toggle (mirrors InventoryScreen).
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "🔨 Craft"
	UiKit.set_font_size(title, Typography.Role.DISPLAY)
	title.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	_view_btn = Button.new()
	_view_btn.text = "⊞ Grid"
	_view_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(_view_btn, Palette.EMBER, 6, Typography.size(Typography.Role.SUBHEAD))
	_view_btn.connect("pressed", Callable(self, "_on_view_toggle"))
	title_row.add_child(_view_btn)
	_action_buttons["view_toggle"] = _view_btn

	# Hidden close affordance — wired but not rendered (primary view, left via nav/ESC).
	var close_btn := Button.new()
	close_btn.visible = false
	close_btn.connect("pressed", Callable(self, "close"))
	_action_buttons["close"] = close_btn

	# Station tab row.
	var tab_row := HBoxContainer.new()
	tab_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tab_row.add_theme_constant_override("separation", 6)
	root_vbox.add_child(tab_row)

	for station_id in _stations():
		var btn := Button.new()
		btn.text = BuildingConfig.building_name(station_id)
		UiKit.set_font_size(btn, Typography.Role.SUBHEAD)
		btn.connect("pressed", Callable(self, "_on_station_tab").bind(station_id))
		tab_row.add_child(btn)
		_station_buttons[station_id] = btn

	_header_label = Label.new()
	_header_label.text = ""
	UiKit.set_font_size(_header_label, Typography.Role.LABEL)
	_header_label.add_theme_color_override("font_color", COL_VALUE)
	_header_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_header_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_header_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tab_row.add_child(_header_label)

	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(scroll)

	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 8)
	scroll.add_child(_body)

# ── station state ──────────────────────────────────────────────────────────────

## Ensure `_active_station` names a real station; default to the first one.
func _ensure_station() -> void:
	var stations: Array = _stations()
	if _active_station == "" or not stations.has(_active_station):
		_active_station = String(stations[0]) if not stations.is_empty() else ""

# ── render ────────────────────────────────────────────────────────────────────

func refresh() -> void:
	if not _built:
		return
	_ensure_station()
	_sync_station_tabs()
	_action_buttons.erase("craft")
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()

	var total: int = RecipeConfig.RECIPE_IDS.size()
	_header_label.text = "%d recipe%s" % [total, "" if total == 1 else "s"]

	if _view == VIEW_GRID:
		_render_grid()
		return

	for id in RecipeConfig.recipes_for_station(_active_station):
		var row := _make_recipe_row(String(id))
		_body.add_child(row)
		_cards[String(id)] = row

# ── station tabs ───────────────────────────────────────────────────────────────

func _stations() -> Array:
	var out: Array = []
	var seen: Dictionary = {}
	for id in RecipeConfig.RECIPE_IDS:
		var st: String = RecipeConfig.recipe_station(String(id))
		if st != "" and not seen.has(st):
			seen[st] = true
			out.append(st)
	return out

func _on_station_tab(station_id: String) -> void:
	if station_id == _active_station:
		return
	_active_station = station_id
	_expanded = ""   # collapse any expanded row when switching station
	_ensure_station()
	refresh()

func _sync_station_tabs() -> void:
	for key in _station_buttons.keys():
		UiKit.style_segment(_station_buttons[key], String(key) == _active_station)

# ── expand-in-place ────────────────────────────────────────────────────────────

## Toggle the expansion for `entry_key` (a recipe id): tapping the expanded row collapses
## it, tapping another moves the expansion. Public — headless tests drive it directly.
func toggle_expand(entry_key: String) -> void:
	_expanded = "" if _expanded == entry_key else entry_key
	refresh()

## The currently expanded recipe id ("" when none). Headless contract.
func expanded_key() -> String:
	return _expanded

# ── recipe list row (expandable, with inline detail) ────────────────────────────

## One expandable recipe row: output icon hero on the left, recipe name + status subtitle
## in the centre column, optional ×qty on the right. Tapping expands inline to show the
## inputs (have/need chips) and the Craft button — no separate detail card below the list.
func _make_recipe_row(id: String) -> PanelContainer:
	var chip := UiKit.make_expandable_chip(id, _expanded, Callable(self, "toggle_expand"))
	var col: VBoxContainer = chip.get_child(0)

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 12)
	col.add_child(row)

	# Output icon hero.
	var output: String = RecipeConfig.recipe_output(id)
	var hero := UiKit.make_icon(output, 44)
	if hero != null:
		hero.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(hero)
	else:
		var glyph := Label.new()
		var g: String = ResourceConfig.glyph(output)
		glyph.text = g if g != "" else "🍲"
		UiKit.set_font_size(glyph, Typography.Role.DISPLAY)
		glyph.add_theme_color_override("font_color", COL_BODY)
		glyph.custom_minimum_size = Vector2(44, 44)
		glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		glyph.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(glyph)

	var name_col := VBoxContainer.new()
	name_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_col.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	name_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_col.add_theme_constant_override("separation", 2)
	row.add_child(name_col)

	var name_lbl := Label.new()
	name_lbl.text = RecipeConfig.recipe_name(id)
	UiKit.set_font_size(name_lbl, Typography.Role.SUBHEAD)
	name_lbl.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		name_lbl.add_theme_font_override("font", heading_font)
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_col.add_child(name_lbl)

	var st: Dictionary = _craft_status(id)
	if String(st["text"]) != "":
		name_col.add_child(_plain(String(st["text"]), Typography.size(Typography.Role.BODY), st["color"]))

	var qty: int = RecipeConfig.recipe_qty(id)
	if qty > 1:
		var qty_lbl := _plain("×%d" % qty, Typography.size(Typography.Role.SUBHEAD), COL_VALUE)
		qty_lbl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(qty_lbl)

	# Expanded inline details: station eyebrow, optional description, input chips, Craft button.
	if _expanded == id:
		var details := UiKit.begin_expand_details(col)

		var station_id: String = RecipeConfig.recipe_station(id)
		UiKit.add_expand_eyebrow(details, "Recipe · %s" % BuildingConfig.building_name(station_id), COL_HEADER)

		var desc_text: String = RecipeConfig.recipe_desc(id)
		if desc_text != "":
			details.add_child(UiKit.make_expand_body_text(desc_text, COL_MUTED))

		# Input chips — have/need, green when covered, rose when short.
		var chips := HFlowContainer.new()
		chips.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		chips.add_theme_constant_override("h_separation", 6)
		chips.add_theme_constant_override("v_separation", 6)
		details.add_child(chips)

		var inputs: Dictionary = RecipeConfig.recipe_inputs(id)
		for key in inputs.keys():
			chips.add_child(_input_chip(String(key), int(inputs[key])))

		# Craft button.
		var craftable: bool = game != null and game.can_craft(id)
		var craft_btn := Button.new()
		craft_btn.text = "Craft"
		craft_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		UiKit.style_action_button(craft_btn, Palette.GO_GREEN, 8, Typography.size(Typography.Role.SUBHEAD))
		craft_btn.disabled = not craftable
		craft_btn.connect("pressed", Callable(self, "_on_craft").bind(id))
		details.add_child(craft_btn)
		_action_buttons["craft"] = craft_btn

	return chip

# ── grid view ──────────────────────────────────────────────────────────────────

func _render_grid() -> void:
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	_body.add_child(grid)

	for id in RecipeConfig.recipes_for_station(_active_station):
		grid.add_child(_make_grid_chip(String(id)))

func _make_grid_chip(id: String) -> PanelContainer:
	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 2)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_child(col)

	var output: String = RecipeConfig.recipe_output(id)
	var icon := UiKit.make_icon(output, 36.0)
	if icon != null:
		var holder := CenterContainer.new()
		holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(icon)
		col.add_child(holder)
	else:
		var glyph := Label.new()
		var g: String = ResourceConfig.glyph(output)
		glyph.text = g if g != "" else "🍲"
		UiKit.set_font_size(glyph, Typography.Role.TITLE)
		glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
		col.add_child(glyph)

	var name_lbl := Label.new()
	name_lbl.text = RecipeConfig.recipe_name(id)
	UiKit.set_font_size(name_lbl, Typography.Role.BODY)
	name_lbl.add_theme_color_override("font_color", COL_BODY)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(name_lbl)

	var st: Dictionary = _craft_status(id)
	var status_lbl := Label.new()
	status_lbl.text = String(st["text"])
	UiKit.set_font_size(status_lbl, Typography.Role.CAPTION)
	status_lbl.add_theme_color_override("font_color", st["color"])
	status_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(status_lbl)

	return chip

# ── view toggle ────────────────────────────────────────────────────────────────

func _on_view_toggle() -> void:
	_view = VIEW_GRID if _view == VIEW_LIST else VIEW_LIST
	if _view_btn != null:
		_view_btn.text = "≣ List" if _view == VIEW_GRID else "⊞ Grid"
	refresh()

func set_view(mode: String) -> void:
	if mode != VIEW_LIST and mode != VIEW_GRID:
		return
	if mode == _view:
		return
	_view = mode
	if _view_btn != null:
		_view_btn.text = "≣ List" if _view == VIEW_GRID else "⊞ Grid"
	refresh()

func view_mode() -> String:
	return _view

# ── craft status helpers ───────────────────────────────────────────────────────

func _craft_status(id: String) -> Dictionary:
	if game == null:
		return {"text": "", "color": COL_MUTED}
	var station_id: String = RecipeConfig.recipe_station(id)
	if not game.has_building(station_id):
		return {"text": "Station not built", "color": COL_MUTED}
	var min_tier: int = RecipeConfig.recipe_min_settlement_tier(id)
	if game.settlement.tier < min_tier:
		return {"text": "Requires %s" % TownConfig.tier_name(min_tier), "color": COL_MUTED}
	if game.can_craft(id):
		return {"text": "Ready to craft", "color": Palette.MOSS}
	return {"text": "Missing inputs", "color": COL_SHORT}

func _input_chip(key: String, need: int) -> PanelContainer:
	var have: int = 0
	if game != null:
		have = int(game.inventory.get(key, 0))
	var covered: bool = have >= need

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT
	sb.border_color = Palette.MOSS if covered else COL_SHORT
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(8)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	chip.add_theme_stylebox_override("panel", sb)

	var row := HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 5)
	chip.add_child(row)

	var icon := UiKit.make_icon(key, 22)
	if icon != null:
		icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(icon)
	else:
		row.add_child(_plain(UiKit.pretty_name(key), Typography.size(Typography.Role.BODY), COL_BODY))

	var count := Label.new()
	count.text = "%d/%d" % [have, need]
	UiKit.set_font_size(count, Typography.Role.LABEL)
	count.add_theme_color_override("font_color", Palette.MOSS if covered else COL_SHORT)
	count.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	count.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(count)

	return chip

func _on_craft(id: String) -> void:
	if game == null:
		return
	var res: Dictionary = game.craft(id)
	if bool(res.get("ok", false)):
		emit_signal("state_changed")
	refresh()

# ── helpers ────────────────────────────────────────────────────────────────────

func _plain(text: String, size: int, col: Color) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", size)
	lbl.add_theme_color_override("font_color", col)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return lbl

# ── pure helpers (kept for view tests) ─────────────────────────────────────────

static func _build_formula(inputs: Dictionary, output: String, qty: int) -> String:
	var parts: Array = []
	for key in inputs.keys():
		var n: int = int(inputs[key])
		parts.append("%s×%d" % [String(key), n])
	var lhs: String = " + ".join(parts) if not parts.is_empty() else "—"
	var rhs: String = "%s×%d" % [output, qty] if output != "" else "—"
	return "%s  →  %s" % [lhs, rhs]

static func recipe_count() -> int:
	return RecipeConfig.RECIPE_IDS.size()
