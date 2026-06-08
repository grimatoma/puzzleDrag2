extends CanvasLayer
## Recipe Wiki — an interactive crafting reference rendered as a parchment card.
## Mirrors the AchievementsScreen / TownScreen pattern: extends CanvasLayer,
## setup(g)/open()/refresh(), `closed` + `state_changed` signals, _action_buttons,
## parchment card + scrim + Cinzel title.
##
## LAYOUT (React crafting-view parity): a STATION tab bar (one tab per real station —
## the port's Bakery + Kitchen; no fake Larder/Forge/Workshop), a list of that
## station's recipes as selectable rows with resource ICONS, and a SELECTED-RECIPE
## detail card with per-input have/need chips + a green Craft button. Crafting calls
## the real GameState.craft() and emits `state_changed` so Main refreshes the HUD.
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/RecipeWikiScreen.gd")) so the port never needs an --import.
##
## Data: RecipeConfig (RECIPE_IDS / recipe_name / recipe_inputs / recipe_output /
## recipe_qty / recipe_station) + BuildingConfig.building_name + GameState
## (inventory / can_craft / has_building / craft). The screen auto-grows as
## RecipeConfig.RECIPES grows.

var game: GameState

signal closed
signal state_changed   ## emitted after a successful craft so Main re-renders the HUD

## action id → Button. "close" + (when a recipe is selected) "craft".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the current recipe catalog + live inventory.
var _body: VBoxContainer
var _built: bool = false

## Header label, rebuilt each refresh().
var _header_label: Label

## station building_id:String → its tab Button. Built once in the shell.
var _station_buttons: Dictionary = {}

## recipe_id:String → the rendered list-row PanelContainer for the ACTIVE station
## (rebuilt each refresh()). Lets a test fetch a specific row.
var _cards: Dictionary = {}

## The active station tab (a BuildingConfig id) + the currently selected recipe id.
var _active_station: String = ""
var _selected_recipe: String = ""

# ── parchment palette (matches AchievementsScreen / TownScreen tokens) ──────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
## Warm rust tint for an under-stocked input chip (have < need) — reads "short" without
## the harsh pure-red the parchment palette avoids.
const COL_SHORT  := Color8(0xb0, 0x52, 0x3a)
const PANEL_MAX_WIDTH := 560.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render. Safe to call again.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true
	_ensure_selection()
	refresh()

func open() -> void:
	visible = true
	_ensure_selection()
	refresh()

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

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
	var width_cap := UiKit.make_width_cap()
	panel.add_child(width_cap)

	# A non-scrolling column: title row + station tab row pinned at the top, then a
	# ScrollContainer that owns the recipe list + selected-recipe detail card.
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "📜 Recipes" heading + right-aligned "✕ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "📜 Recipes"
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

	# Station tab row: one segmented tab per real station (Bakery / Kitchen), with the
	# "N recipes" count pushed to the right.
	var tab_row := HBoxContainer.new()
	tab_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tab_row.add_theme_constant_override("separation", 6)
	root_vbox.add_child(tab_row)

	for station_id in _stations():
		var btn := Button.new()
		btn.text = BuildingConfig.building_name(station_id)
		btn.add_theme_font_size_override("font_size", 16)
		btn.connect("pressed", Callable(self, "_on_station_tab").bind(station_id))
		tab_row.add_child(btn)
		_station_buttons[station_id] = btn

	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 15)
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

	# The dynamic body — cleared + rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

# ── selection state ────────────────────────────────────────────────────────────

## Ensure `_active_station` + `_selected_recipe` name real, consistent values: default
## the station to the first station, and the selected recipe to the first recipe of the
## active station.
func _ensure_selection() -> void:
	var stations: Array = _stations()
	if _active_station == "" or not stations.has(_active_station):
		_active_station = String(stations[0]) if not stations.is_empty() else ""
	var recipes: Array = RecipeConfig.recipes_for_station(_active_station)
	if _selected_recipe == "" or not recipes.has(_selected_recipe):
		_selected_recipe = String(recipes[0]) if not recipes.is_empty() else ""

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it for the active station: a selectable row per recipe
## (tracked in `_cards`), then the selected recipe's detail card with have/need chips +
## the Craft button. The header reads the TOTAL recipe count (across all stations).
func refresh() -> void:
	if not _built:
		return
	_ensure_selection()
	_sync_station_tabs()
	_action_buttons.erase("craft")
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()

	var total: int = RecipeConfig.RECIPE_IDS.size()
	_header_label.text = "%d recipe%s" % [total, "" if total == 1 else "s"]

	for id in RecipeConfig.recipes_for_station(_active_station):
		var row := _make_recipe_row(String(id))
		_body.add_child(row)
		_cards[String(id)] = row

	if _selected_recipe != "":
		_body.add_child(_make_detail_card(_selected_recipe))

# ── station tabs ───────────────────────────────────────────────────────────────

## The distinct stations across the recipe catalog, in RECIPE_IDS order. The port's
## real stations (Bakery, Kitchen) — derived, so this auto-grows with new recipes.
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
	_selected_recipe = ""    # re-default to the new station's first recipe
	_ensure_selection()
	refresh()

## Apply the segmented active/inactive look to the station tab buttons.
func _sync_station_tabs() -> void:
	for key in _station_buttons.keys():
		UiKit.style_segment(_station_buttons[key], String(key) == _active_station)

func _on_select_recipe(id: String) -> void:
	if id == _selected_recipe:
		return
	_selected_recipe = id
	refresh()

# ── recipe list row (selectable, with icons) ────────────────────────────────────

## One selectable recipe row: the recipe name (Cinzel) over an icon formula
## ([flour]×3 [eggs]×1 → [bread]×1). The selected row reads with an ember border.
func _make_recipe_row(id: String) -> PanelContainer:
	var selected: bool = (id == _selected_recipe)
	var row := PanelContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var sb := UiKit.row_box()
	if selected:
		sb = sb.duplicate() as StyleBoxFlat
		sb.border_color = Palette.EMBER
		sb.set_border_width_all(2)
	row.add_theme_stylebox_override("panel", sb)
	# Click anywhere on the row to select it.
	row.gui_input.connect(func(event: InputEvent) -> void:
		var tap: bool = (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed) \
			or (event is InputEventScreenTouch and event.pressed)
		if tap:
			_on_select_recipe(id)
	)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 5)
	row.add_child(col)

	var name_lbl := Label.new()
	name_lbl.text = RecipeConfig.recipe_name(id)
	name_lbl.add_theme_font_size_override("font_size", 20)
	name_lbl.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		name_lbl.add_theme_font_override("font", heading_font)
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(name_lbl)

	# Icon formula: input icons + ×n, an arrow, then the output icon + ×qty.
	var formula := HBoxContainer.new()
	formula.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	formula.mouse_filter = Control.MOUSE_FILTER_IGNORE
	formula.add_theme_constant_override("separation", 4)
	col.add_child(formula)

	var inputs: Dictionary = RecipeConfig.recipe_inputs(id)
	var first := true
	for key in inputs.keys():
		if not first:
			formula.add_child(_plain("+", 16, COL_MUTED))
		first = false
		_add_icon_qty(formula, String(key), int(inputs[key]), COL_BODY)
	formula.add_child(_plain("→", 18, COL_MUTED))
	_add_icon_qty(formula, RecipeConfig.recipe_output(id), RecipeConfig.recipe_qty(id), COL_VALUE)

	# Status subtitle on the row (React parity: each recipe card shows Ready / Missing inputs).
	var st: Dictionary = _craft_status(id)
	if String(st["text"]) != "":
		col.add_child(_plain(String(st["text"]), 13, st["color"]))

	return row

## Append an icon (if art exists) + a "×n" label to `box`. Falls back to the resource
## name when there's no icon so the formula always reads.
func _add_icon_qty(box: HBoxContainer, key: String, n: int, qty_col: Color) -> void:
	var icon := UiKit.make_icon(key, 24)
	if icon != null:
		box.add_child(icon)
	else:
		box.add_child(_plain(UiKit.pretty_name(key), 15, COL_BODY))
	box.add_child(_plain("×%d" % n, 16, qty_col))

func _plain(text: String, size: int, col: Color) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", size)
	lbl.add_theme_color_override("font_color", col)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return lbl

# ── selected-recipe detail card (have/need chips + Craft) ───────────────────────

## The detail card for the selected recipe: the output, an "at <Station>" line, a row
## of per-input have/need chips (green when covered, rose when short), and a Craft
## button (filled green when craftable, disabled with a reason otherwise).
func _make_detail_card(id: String) -> PanelContainer:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var sb := UiKit.card_box(Palette.PARCHMENT_SOFT)
	card.add_theme_stylebox_override("panel", sb)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 8)
	card.add_child(col)

	# Output header: big icon + "Bread ×1" + the station line.
	var head := HBoxContainer.new()
	head.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_theme_constant_override("separation", 8)
	col.add_child(head)

	var out_icon := UiKit.make_icon(RecipeConfig.recipe_output(id), 40)
	if out_icon != null:
		out_icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		head.add_child(out_icon)

	var head_col := VBoxContainer.new()
	head_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head_col.add_theme_constant_override("separation", 1)
	head.add_child(head_col)

	var out_name := Label.new()
	out_name.text = "%s ×%d" % [RecipeConfig.recipe_name(id), RecipeConfig.recipe_qty(id)]
	out_name.add_theme_font_size_override("font_size", 20)
	out_name.add_theme_color_override("font_color", COL_HEADER)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		out_name.add_theme_font_override("font", hf)
	head_col.add_child(out_name)

	var station_id: String = RecipeConfig.recipe_station(id)
	var station_lbl := Label.new()
	station_lbl.text = "at %s" % BuildingConfig.building_name(station_id)
	station_lbl.add_theme_font_size_override("font_size", 13)
	station_lbl.add_theme_color_override("font_color", COL_MUTED)
	head_col.add_child(station_lbl)

	# Status sub-line (React crafting-view parity): Ready to craft / Station not built /
	# Missing inputs — coloured moss (ready) / muted (no station) / rose (short).
	var status: Dictionary = _craft_status(id)
	var status_lbl := Label.new()
	status_lbl.text = String(status["text"])
	status_lbl.add_theme_font_size_override("font_size", 14)
	status_lbl.add_theme_color_override("font_color", status["color"])
	status_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	head_col.add_child(status_lbl)

	# Flavor description of the produced good (verbatim React item desc) — React shows
	# `recipe.desc || itemDef.desc` in the selected-recipe detail card.
	var desc_text: String = RecipeConfig.recipe_desc(id)
	if desc_text != "":
		var desc_lbl := Label.new()
		desc_lbl.text = desc_text
		desc_lbl.add_theme_font_size_override("font_size", 13)
		desc_lbl.add_theme_color_override("font_color", COL_BODY)
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		desc_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		col.add_child(desc_lbl)

	# Input chips — one per input: [icon] name  have/need (green when covered, rose short).
	var chips := HFlowContainer.new()
	chips.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chips.add_theme_constant_override("h_separation", 6)
	chips.add_theme_constant_override("v_separation", 6)
	col.add_child(chips)

	var inputs: Dictionary = RecipeConfig.recipe_inputs(id)
	for key in inputs.keys():
		chips.add_child(_input_chip(String(key), int(inputs[key])))

	# Craft button — filled green when craftable, otherwise disabled with a reason.
	var craftable: bool = game != null and game.can_craft(id)
	var craft_btn := Button.new()
	craft_btn.text = "Craft"
	craft_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(craft_btn, Palette.GO_GREEN, 8, 18)
	craft_btn.disabled = not craftable
	craft_btn.connect("pressed", Callable(self, "_on_craft").bind(id))
	col.add_child(craft_btn)
	_action_buttons["craft"] = craft_btn

	# (The not-craftable reason is now shown as the coloured status sub-line in the head.)

	return card

## {text:String, color:Color} craft status for the selected-recipe card + row badges
## (React parity): "Ready to craft" (moss) when craftable, "Station not built" (muted)
## when the station isn't built, else "Missing inputs" (rose).
func _craft_status(id: String) -> Dictionary:
	if game == null:
		return {"text": "", "color": COL_MUTED}
	var station_id: String = RecipeConfig.recipe_station(id)
	if not game.has_building(station_id):
		return {"text": "Station not built", "color": COL_MUTED}
	if game.can_craft(id):
		return {"text": "Ready to craft", "color": Palette.MOSS}
	return {"text": "Missing inputs", "color": COL_SHORT}

## A single input chip: [icon] have/need, tinted green when the player has enough of
## this input, rose when short. Reads live inventory.
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
		row.add_child(_plain(UiKit.pretty_name(key), 13, COL_BODY))

	var count := Label.new()
	count.text = "%d/%d" % [have, need]
	count.add_theme_font_size_override("font_size", 14)
	count.add_theme_color_override("font_color", Palette.MOSS if covered else COL_SHORT)
	count.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	count.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(count)

	return chip

## Why `id` can't be crafted right now: station not built, or short on inputs.
func _craft_reason(id: String) -> String:
	if game == null:
		return ""
	var station_id: String = RecipeConfig.recipe_station(id)
	if not game.has_building(station_id):
		return "Build the %s to craft this." % BuildingConfig.building_name(station_id)
	return "Not enough ingredients."

## Craft the selected recipe via the real GameState path; on success refresh + tell
## Main (state_changed) to re-render the HUD stockpile.
func _on_craft(id: String) -> void:
	if game == null:
		return
	var res: Dictionary = game.craft(id)
	if bool(res.get("ok", false)):
		emit_signal("state_changed")
	refresh()

# ── pure helpers (kept for the view tests) ─────────────────────────────────────

## Build the formula string: "flour×3 + eggs×1 → bread×1".
static func _build_formula(inputs: Dictionary, output: String, qty: int) -> String:
	var parts: Array = []
	for key in inputs.keys():
		var n: int = int(inputs[key])
		parts.append("%s×%d" % [String(key), n])
	var lhs: String = " + ".join(parts) if not parts.is_empty() else "—"
	var rhs: String = "%s×%d" % [output, qty] if output != "" else "—"
	return "%s  →  %s" % [lhs, rhs]

## Total recipes in the catalog (= RecipeConfig.RECIPE_IDS.size()).
static func recipe_count() -> int:
	return RecipeConfig.RECIPE_IDS.size()
