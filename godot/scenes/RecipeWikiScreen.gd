extends CanvasLayer
## Recipe Wiki — a read-only reference of all craftable recipes, rendered as a
## scrollable parchment card. Mirrors the AchievementsScreen / TileCollectionScreen
## pattern exactly: extends CanvasLayer, setup(g)/open()/refresh(), signal closed,
## _action_buttons["close"], parchment card + scrim + Cinzel title, a ScrollContainer
## body cleared + rebuilt each refresh(). Data comes from RecipeConfig.RECIPE_IDS
## and the static helpers (recipe_name, recipe_inputs, recipe_output, recipe_qty,
## recipe_station) + BuildingConfig.building_name for the station display.
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/RecipeWikiScreen.gd")) so the port never needs an
## --import pass to register a new global. Pure read-only: the only actionable
## Control is "✕ Close"; everything else is MOUSE_FILTER_IGNORE.
##
## Screen auto-grows as RecipeConfig.RECIPES grows — adding a new recipe to
## RecipeConfig.RECIPE_IDS gives it a card here for free.

var game: GameState

signal closed

## action id → Button. Currently just "close".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the current recipe catalog.
var _body: VBoxContainer
var _built: bool = false

## Header label, rebuilt each refresh().
var _header_label: Label

## recipe_id:String → the rendered card PanelContainer, rebuilt each refresh().
## Lets a test fetch a specific card (e.g. assert BREAD renders its inputs + station).
var _cards: Dictionary = {}

# ── parchment palette (matches AchievementsScreen / TileCollectionScreen tokens) ──
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_INPUT  := Palette.MOSS    # ingredient tint — warm green
const COL_OUTPUT := Palette.EMBER   # output tint — amber
const COL_PANEL  := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 560.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

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

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                   # modal, above the HUD (layer 1)
	visible = false

	# Full-rect warm-brown scrim. MOUSE_FILTER_STOP so clicks behind it never reach
	# the board while the wiki is open.
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Centered panel: a full-rect Control holds a panel pinned with comfortable margins;
	# a width-cap MarginContainer keeps it tidy on wide viewports.
	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.offset_left = 24
	panel.offset_right = -24
	panel.offset_top = 48
	panel.offset_bottom = -48
	# Parchment card — warm fill, iron border, rounded corners, generous padding,
	# soft drop shadow so it floats over the warm scrim.
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
	style.set_corner_radius_all(16)
	style.set_content_margin_all(20)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	# Keep the panel from sprawling on wide viewports.
	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	# A non-scrolling column: title row + header line pinned at the top, then a
	# ScrollContainer that owns the (potentially long) recipe list.
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

	# Header line — "N recipes" (gold), rebuilt each refresh().
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

	# The dynamic body — cleared + rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from RecipeConfig.RECIPE_IDS: the header count
## line, then one card per recipe in stable RECIPE_IDS order. Every recipe gets
## exactly one card (tracked in `_cards`).
func refresh() -> void:
	if not _built:
		return
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()

	var total: int = RecipeConfig.RECIPE_IDS.size()
	_header_label.text = "%d recipe%s" % [total, "" if total == 1 else "s"]

	for id in RecipeConfig.RECIPE_IDS:
		var card := _make_recipe_card(String(id))
		_body.add_child(card)
		_cards[String(id)] = card

## A single recipe card: a soft-parchment chip holding:
##   • the recipe name in Cinzel (ember, large)
##   • "at <Station name>" (muted, small)
##   • the formula line: "input×n + input×n → output×qty" (colour-tinted)
## Optionally tints input names green and the output name amber for quick scanning.
func _make_recipe_card(id: String) -> PanelContainer:
	var rec_name: String = RecipeConfig.recipe_name(id)
	var station_id: String = RecipeConfig.recipe_station(id)
	var station_label: String = BuildingConfig.building_name(station_id)
	var inputs: Dictionary = RecipeConfig.recipe_inputs(id)
	var output: String = RecipeConfig.recipe_output(id)
	var qty: int = RecipeConfig.recipe_qty(id)

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 5)
	chip.add_child(col)

	# ── Recipe name (Cinzel, ember) ────────────────────────────────────────────
	var name_lbl := Label.new()
	name_lbl.text = rec_name if rec_name != "" else id
	name_lbl.add_theme_font_size_override("font_size", 22)
	name_lbl.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		name_lbl.add_theme_font_override("font", heading_font)
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(name_lbl)

	# ── Station line ("at Bakery" / "at Kitchen") ─────────────────────────────
	var station_lbl := Label.new()
	var station_text: String = ("at %s" % station_label) if station_label != "" else ("at %s" % station_id)
	station_lbl.text = station_text
	station_lbl.add_theme_font_size_override("font_size", 14)
	station_lbl.add_theme_color_override("font_color", COL_MUTED)
	station_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(station_lbl)

	# ── Formula line ───────────────────────────────────────────────────────────
	# "flour×3 + eggs×1 → bread×1" built from the recipe data. Rendered as a
	# single-line RichTextLabel so we can tint input names green and output amber
	# without extra nodes. Falls back to a plain Label in headless if RTL isn't ideal.
	var formula: String = _build_formula(inputs, output, qty)
	var formula_lbl := Label.new()
	formula_lbl.text = formula
	formula_lbl.add_theme_font_size_override("font_size", 17)
	formula_lbl.add_theme_color_override("font_color", COL_BODY)
	formula_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	formula_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(formula_lbl)

	return chip

# ── pure helpers ─────────────────────────────────────────────────────────────

## Build the formula string: "flour×3 + eggs×1 → bread×1".
## Inputs are iterated in insertion order (the dict is ordered in GDScript 4),
## joined with " + ", then "→ output×qty" is appended.
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
