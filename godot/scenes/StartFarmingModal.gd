extends CanvasLayer
## The "Start Farming" modal — a parchment card that opens the bounded farm RUN. This is the
## port's analogue of React's src/features/zones/StartFarmingModal.tsx, faithful to the
## ACTIVE-VARIANT-PER-CATEGORY model (NOT an on/off category toggle, which was the old port).
##
## The home zone exposes <= 8 categories (React mustPick === false), so every category slot is
## LOCKED ON and shows that category's ACTIVE variant (its icon + display name + a small "✎"
## change affordance). Tapping a slot opens a CHOOSER popup (an in-modal sub-panel on a higher
## sub-layer) listing the DISCOVERED variants in that category — each a row with icon + name +
## tier/ability summary, the active one marked. Picking one calls game.set_active_tile(cat, id)
## and updates the slot. LOCKED (undiscovered) variants render greyed with their unlock STATUS
## (mirrors React effects.ts statusFor); a `buy`-method locked variant gets a "Buy N◉" button
## calling game.buy_tile(id) — once bought it becomes selectable.
##
## On Start it emits `start_requested(selected, use_fertilizer)` — the list of active category
## ids + false (the port has no fertilizer primitive; see the NO-FAKE note). Main wires that to
## GameState.start_farm_run() and reacts. Cancel just dismisses.
##
## NO class_name — preloaded by Main (const StartFarmingModalScript := preload(...)) so the port
## never needs --import to register it (mirrors LeaveBoardModal / HarvestModal).
##
## HEADLESS-TEST CONTRACT
##   `_action_buttons` (stable keys):
##     "slot_<cat>"      — one per eligible category; opens the chooser for that category
##     "choose_<tileid>" — picks a discovered variant (present ONLY while a chooser is open)
##     "buy_<tileid>"    — buys a locked buy-variant (present ONLY while a chooser is open)
##     "use_fertilizer"  — the T12 fertilizer CheckBox (ONLY present when game has ≥1 fert
##                         in its tool inventory; hidden + ignored when absent)
##     "start"           — confirm; disabled when coins < entry cost
##     "cancel"          — dismiss
##   Helpers: active_variant_for(cat) -> String (the active variant id for a category),
##     open_chooser(cat), chooser_open_for() -> String ("" when no chooser is open),
##     preview_budget() -> int (reflects toggle state), selected_categories() -> Array.
##   Tests build with `.new()` + setup(game) BEFORE add_child, so the shell must build WITHOUT a
##   live viewport (CenterContainer, no get_viewport() during build).

var game: GameState

## Shared tile-variant UI helpers (display name, tile-art icon, status string, ability summary),
## preloaded as a const so no class_name / --import is needed.
const TVU := preload("res://scripts/TileVariantUi.gd")

## Emitted on Start: the chosen category ids + the fertilizer flag (true only when the player
## has ≥1 fertilizer AND the toggle is checked). Always followed by `closed`.
signal start_requested(selected: Array, use_fertilizer: bool)
signal closed

## Stable button registry for headless tests (keys per the header contract).
var _action_buttons: Dictionary = {}

## True once _build_shell() has run.
var _built: bool = false

## The eligible category ids for the home zone, in declaration order (frozen at build).
var _categories: Array = []

## category id -> the slot's button node (so _render can restyle/relabel it).
var _slot_buttons: Dictionary = {}
## category id -> the slot's icon container (so _render can swap the active variant's art).
var _slot_icon_holders: Dictionary = {}
## category id -> the slot's primary name Label.
var _slot_name_labels: Dictionary = {}
## category id -> the slot's secondary (category) Label.
var _slot_sub_labels: Dictionary = {}

## The category whose chooser is open ("" when none).
var _chooser_cat: String = ""

## Whether the fertilizer toggle is checked (T12). Only relevant when the player has ≥1
## fertilizer; the toggle row is hidden otherwise so _fertilizer_checked effectively stays
## false for players with none, keeping the budget unchanged.
var _fertilizer_checked: bool = false

# Static shell nodes (text re-set each open()).
var _title_label: Label
var _budget_label: Label
var _budget_sub_label: Label
var _cost_value_label: Label
var _start_btn: Button
var _cancel_btn: Button
var _slot_grid: GridContainer
var _spawn_info_title: Label    ## "This season (Spring) spawns:" header
var _spawn_info_body: Label     ## the ranked category-weight summary line

# Fertilizer toggle row (T12) — built once, shown/hidden based on availability.
var _fert_row: HBoxContainer = null
var _fert_check: CheckBox = null

# Chooser sub-layer (built lazily on first open).
var _chooser_layer: CanvasLayer
var _chooser_title: Label
var _chooser_list: VBoxContainer

# Palette mirrors.
const COL_TITLE := Palette.INK
const COL_BODY := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 480.0
const SLOT_ICON_PX: int = 52
const ROW_ICON_PX: int = 40

## React CATEGORY_GLYPH fallback (used when a category has no active variant art).
const CATEGORY_GLYPH := {
	"grass": "🌿",
	"grain": "🌾",
	"trees": "🌳",
	"birds": "🐦",
	"veg": "🥕",
	"fruit": "🍎",
	"flower": "🌸",
	"herd": "🐖",
	"cattle": "🐄",
	"mount": "🐎",
}

## The most slots the picker ever shows (React MAX_SLOTS). The home zone has <= 8.
const MAX_SLOTS := 8

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again. Does NOT show the modal.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Re-render the live state (slots + budget + cost) and show the card.
## Resets the fertilizer toggle to unchecked each time the modal opens (a fresh choice per run).
func open() -> void:
	if not _built:
		return
	_close_chooser()
	_fertilizer_checked = false
	if _fert_check != null:
		_fert_check.button_pressed = false
	_render()
	visible = true

func close() -> void:
	_close_chooser()
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6
	visible = false

	_categories = ZoneConfig.eligible_categories(ZoneConfig.HOME_ZONE)

	# Warm-brown scrim (Main._install_overlay_dismiss wires a tap to close()).
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# CenterContainer centres the parchment card at its own min size (no viewport math).
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(16)
	style.set_content_margin_all(26)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 12)
	panel.add_child(col)

	var heading_font: Font = UiKit.heading_font()

	# Title — "Start Farming — <home name>".
	_title_label = Label.new()
	_title_label.text = "Start Farming — %s" % _home_name()
	_title_label.add_theme_font_size_override("font_size", 26)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	col.add_child(_title_label)

	# Intro line — React's mustPick === false copy: tap a slot to pick a variant.
	var intro := Label.new()
	intro.text = "These %d tile types will be on the field. Tap a slot to pick a variant." % _categories.size()
	intro.add_theme_font_size_override("font_size", 13)
	intro.add_theme_color_override("font_color", Palette.INK_MID)
	intro.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(intro)

	# Iron hairline under the header.
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	# The locked-on category SLOT grid (React's grid-cols-4 of TileSlot).
	_slot_grid = GridContainer.new()
	_slot_grid.columns = 4
	_slot_grid.add_theme_constant_override("h_separation", 8)
	_slot_grid.add_theme_constant_override("v_separation", 8)
	_slot_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_child(_slot_grid)

	for c in _categories:
		var cat: String = String(c)
		_slot_grid.add_child(_build_slot(cat))

	# Zone-spawn info (React's "i" season-drops affordance) — a compact card listing what the
	# home zone spawns MOST this season (read from ZoneConfig.season_drops for the current
	# season). It re-renders on open() as the season advances. Built once here, filled in _render.
	_build_spawn_info(col)

	# T12 — Fertilizer toggle (shown only when game has ≥1 fertilizer, hidden otherwise).
	# Mirrors the React StartFarmingModal "Use Fertilizer — doubles turns (×2)" checkbox.
	# The toggle is built once and visibility is updated in _render(); when hidden it has no
	# effect on the emitted use_fertilizer flag.
	_fert_row = HBoxContainer.new()
	_fert_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_fert_row.add_theme_constant_override("separation", 8)
	_fert_row.visible = false  # hidden until fertilizer is available

	_fert_check = CheckBox.new()
	_fert_check.text = ""
	_fert_check.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_fert_check.connect("toggled", Callable(self, "_on_fert_toggled"))
	_fert_row.add_child(_fert_check)
	_action_buttons["use_fertilizer"] = _fert_check

	var fert_lbl := Label.new()
	fert_lbl.text = "Use Fertilizer — doubles turns (×2)"
	fert_lbl.add_theme_font_size_override("font_size", 14)
	fert_lbl.add_theme_color_override("font_color", Palette.MOSS)
	fert_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	fert_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	fert_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fert_row.add_child(fert_lbl)
	col.add_child(_fert_row)

	# Turn-budget preview card.
	var budget_card := PanelContainer.new()
	budget_card.add_theme_stylebox_override("panel", UiKit.row_box())
	budget_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var budget_col := VBoxContainer.new()
	budget_col.add_theme_constant_override("separation", 2)
	budget_card.add_child(budget_col)

	_budget_label = Label.new()
	_budget_label.add_theme_font_size_override("font_size", 16)
	_budget_label.add_theme_color_override("font_color", Palette.INK)
	budget_col.add_child(_budget_label)

	_budget_sub_label = Label.new()
	_budget_sub_label.add_theme_font_size_override("font_size", 12)
	_budget_sub_label.add_theme_color_override("font_color", Palette.INK_MID)
	budget_col.add_child(_budget_sub_label)
	col.add_child(budget_card)

	# Cost row.
	var cost_row := HBoxContainer.new()
	cost_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cost_row.add_theme_constant_override("separation", 8)
	var cost_lbl := Label.new()
	cost_lbl.text = "Cost to start"
	cost_lbl.add_theme_font_size_override("font_size", 14)
	cost_lbl.add_theme_color_override("font_color", Palette.INK)
	cost_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cost_row.add_child(cost_lbl)

	_cost_value_label = Label.new()
	_cost_value_label.add_theme_font_size_override("font_size", 16)
	_cost_value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	cost_row.add_child(_cost_value_label)
	col.add_child(cost_row)

	# Start — primary confirm; disabled when unaffordable.
	_start_btn = Button.new()
	_start_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(_start_btn, Palette.GO_GREEN, 10, 18)
	_start_btn.connect("pressed", Callable(self, "_on_start"))
	col.add_child(_start_btn)
	_action_buttons["start"] = _start_btn

	# Cancel — quiet iron secondary button.
	_cancel_btn = Button.new()
	_cancel_btn.text = "Cancel"
	_cancel_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_cancel_btn, Palette.IRON, 10, 18)
	_cancel_btn.connect("pressed", Callable(self, "_on_cancel"))
	col.add_child(_cancel_btn)
	_action_buttons["cancel"] = _cancel_btn

	# The chooser sub-layer (built once, kept hidden until a slot opens it).
	_build_chooser_layer()

## Build the zone-spawn info card: a parchment-soft inset panel with a small "i" header naming
## the current season + a ranked one-line summary of what the home zone spawns most heavily
## (the React season-drops "i" affordance). Filled by _render() from ZoneConfig.season_drops.
func _build_spawn_info(col: VBoxContainer) -> void:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
	sb.border_color = Color(Palette.MOSS, 0.7)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(10)
	card.add_theme_stylebox_override("panel", sb)
	col.add_child(card)

	var c := VBoxContainer.new()
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.add_theme_constant_override("separation", 2)
	card.add_child(c)

	_spawn_info_title = Label.new()
	_spawn_info_title.text = "ⓘ What spawns this season"
	_spawn_info_title.add_theme_font_size_override("font_size", 13)
	_spawn_info_title.add_theme_color_override("font_color", Palette.MOSS)
	_spawn_info_title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.add_child(_spawn_info_title)

	_spawn_info_body = Label.new()
	_spawn_info_body.text = ""
	_spawn_info_body.add_theme_font_size_override("font_size", 12)
	_spawn_info_body.add_theme_color_override("font_color", Palette.INK_MID)
	_spawn_info_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_spawn_info_body.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.add_child(_spawn_info_body)

## Build one locked-on category SLOT: a parchment button with an icon area, the active variant
## name, the category label, and a "✎" change badge in the corner. Tapping it opens the chooser.
func _build_slot(cat: String) -> Control:
	var wrap := Control.new()
	wrap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	wrap.custom_minimum_size = Vector2(0, 104)

	var btn := Button.new()
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.toggle_mode = false
	# Slots are always ON in the home zone → styled like a selected/active variant.
	UiKit.style_action_button(btn, Palette.GO_GREEN, 6, 0)
	btn.connect("pressed", Callable(self, "open_chooser").bind(cat))
	wrap.add_child(btn)
	_slot_buttons[cat] = btn
	_action_buttons["slot_" + cat] = btn

	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 2)
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	btn.add_child(vbox)

	# Icon holder (centre) — swapped to the active variant's art in _render.
	var icon_holder := CenterContainer.new()
	icon_holder.custom_minimum_size = Vector2(0, SLOT_ICON_PX)
	icon_holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(icon_holder)
	_slot_icon_holders[cat] = icon_holder

	var name_lbl := Label.new()
	name_lbl.add_theme_font_size_override("font_size", 12)
	name_lbl.add_theme_color_override("font_color", Palette.INK)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(name_lbl)
	_slot_name_labels[cat] = name_lbl

	var sub_lbl := Label.new()
	sub_lbl.add_theme_font_size_override("font_size", 10)
	sub_lbl.add_theme_color_override("font_color", Palette.INK_MID)
	sub_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(sub_lbl)
	_slot_sub_labels[cat] = sub_lbl

	# "✎" change affordance, top-right corner (decorative; the whole slot opens the chooser).
	var edit := Label.new()
	edit.text = "✎"
	edit.add_theme_font_size_override("font_size", 12)
	edit.add_theme_color_override("font_color", Palette.INK_MID)
	edit.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	edit.offset_left = -18
	edit.offset_top = 3
	edit.offset_right = -4
	edit.mouse_filter = Control.MOUSE_FILTER_IGNORE
	btn.add_child(edit)

	return wrap

## Build the chooser sub-layer ONCE: a higher CanvasLayer (above the card) with its own scrim +
## a parchment panel holding a title row and a scrollable list of variant rows (rebuilt per open).
func _build_chooser_layer() -> void:
	_chooser_layer = CanvasLayer.new()
	_chooser_layer.layer = 7
	_chooser_layer.visible = false
	add_child(_chooser_layer)

	var scrim := ColorRect.new()
	scrim.color = Color(0, 0, 0, 0.5)
	scrim.set_anchors_preset(Control.PRESET_FULL_RECT)
	scrim.mouse_filter = Control.MOUSE_FILTER_STOP
	# Tapping the scrim closes the chooser.
	scrim.gui_input.connect(func(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and (ev as InputEventMouseButton).pressed:
			_close_chooser())
	_chooser_layer.add_child(scrim)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chooser_layer.add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(440, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = Palette.PARCHMENT
	style.set_corner_radius_all(16)
	style.set_content_margin_all(18)
	style.border_color = Palette.IRON
	style.set_border_width_all(3)
	style.shadow_size = 14
	style.shadow_color = Color(0, 0, 0, 0.30)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var pcol := VBoxContainer.new()
	pcol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pcol.add_theme_constant_override("separation", 10)
	panel.add_child(pcol)

	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pcol.add_child(title_row)

	_chooser_title = Label.new()
	_chooser_title.text = "Choose tile"
	_chooser_title.add_theme_font_size_override("font_size", 18)
	_chooser_title.add_theme_color_override("font_color", Palette.INK)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		_chooser_title.add_theme_font_override("font", hf)
	_chooser_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(_chooser_title)

	var close_btn := Button.new()
	close_btn.text = "✕"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(close_btn, Palette.IRON, 4, 16)
	close_btn.connect("pressed", Callable(self, "_close_chooser"))
	title_row.add_child(close_btn)

	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.custom_minimum_size = Vector2(0, 360)
	pcol.add_child(scroll)

	_chooser_list = VBoxContainer.new()
	_chooser_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_chooser_list.add_theme_constant_override("separation", 6)
	scroll.add_child(_chooser_list)

# ── render ─────────────────────────────────────────────────────────────────────

## Re-render the live preview: each slot's active variant (icon + name), the fertilizer
## toggle visibility + budget preview, the cost row, and the Start button label + state.
func _render() -> void:
	if not _built:
		return
	for c in _categories:
		_render_slot(String(c))

	# T12: show the fertilizer toggle only when the player has ≥1 fertilizer. When the row
	# becomes hidden also uncheck it (reset the transient state — mirrors React's pattern of
	# only passing use_fertilizer when the checkbox is checked AND available).
	var has_fert: bool = game != null and game._has_fertilizer()
	if _fert_row != null:
		_fert_row.visible = has_fert
	if not has_fert and _fertilizer_checked:
		_fertilizer_checked = false
		if _fert_check != null:
			_fert_check.button_pressed = false

	var budget: int = preview_budget()
	var base: int = ZoneConfig.base_turns(ZoneConfig.HOME_ZONE)
	_budget_label.text = "Turns this run: %d" % budget
	if has_fert and _fertilizer_checked:
		_budget_sub_label.text = "Base %d × 2 (fertilizer)" % base
	else:
		_budget_sub_label.text = "Base %d" % base

	var cost: int = ZoneConfig.entry_cost(ZoneConfig.HOME_ZONE)
	var coins: int = game.coins if game != null else 0
	var can_afford: bool = coins >= cost
	_cost_value_label.text = "%d 🪙" % cost
	_cost_value_label.add_theme_color_override("font_color", Palette.GO_GREEN if can_afford else Palette.EMBER)

	_start_btn.text = "Start (%d 🪙)" % cost if can_afford else "Not enough coin"
	_start_btn.disabled = not can_afford

	# Zone-spawn info — name the current season + its ranked spawn summary.
	if _spawn_info_title != null:
		_spawn_info_title.text = "ⓘ %s spawns" % _current_season_name()
	if _spawn_info_body != null:
		_spawn_info_body.text = season_spawn_summary()

## Render one slot from the live active variant for its category.
func _render_slot(cat: String) -> void:
	var id: String = active_variant_for(cat)
	var holder: CenterContainer = _slot_icon_holders.get(cat)
	var name_lbl: Label = _slot_name_labels.get(cat)
	var sub_lbl: Label = _slot_sub_labels.get(cat)
	if holder == null or name_lbl == null or sub_lbl == null:
		return
	for child in holder.get_children():
		child.queue_free()
	var tile: int = TileVariantConfig.tile_for(id) if id != "" else Constants.EMPTY
	var icon := _make_tile_icon(tile, SLOT_ICON_PX)
	if icon != null:
		holder.add_child(icon)
	else:
		var glyph := Label.new()
		glyph.text = String(CATEGORY_GLYPH.get(cat, "•"))
		glyph.add_theme_font_size_override("font_size", 30)
		glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(glyph)
	name_lbl.text = _variant_name(id) if id != "" else _category_label(cat)
	sub_lbl.text = _category_label(cat) if id != "" else "Pick a tile"

# ── chooser ─────────────────────────────────────────────────────────────────────

## Open the chooser popup for `cat`: rebuild the variant rows (discovered = pickable, locked =
## greyed with a status line + an optional Buy button), then show the sub-layer.
func open_chooser(cat: String) -> void:
	if not _built:
		return
	_chooser_cat = cat
	_chooser_title.text = "Choose %s tile" % _category_label(cat)
	_rebuild_chooser_rows(cat)
	_chooser_layer.visible = true

## Rebuild the chooser's variant rows for `cat`. Clears stale "choose_*"/"buy_*" registry keys.
func _rebuild_chooser_rows(cat: String) -> void:
	for child in _chooser_list.get_children():
		child.queue_free()
	# Drop any prior per-variant action buttons from the registry.
	for k in _action_buttons.keys():
		if String(k).begins_with("choose_") or String(k).begins_with("buy_"):
			_action_buttons.erase(k)

	var ids: Array = TileVariantConfig.for_category(cat)
	var active_id: String = active_variant_for(cat)
	if ids.is_empty():
		var empty := Label.new()
		empty.text = "No %s tiles unlocked yet. Research or buy new variants in the Tiles browser." % _category_label(cat)
		empty.add_theme_font_size_override("font_size", 13)
		empty.add_theme_color_override("font_color", Palette.INK_MID)
		empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_chooser_list.add_child(empty)
		return

	for id_v in ids:
		var id: String = String(id_v)
		_chooser_list.add_child(_build_variant_row(cat, id, id == active_id))

## Build one chooser row for variant `id`: icon + name + tier/chain chips + ability summary, and
## either marked Active, pickable (discovered, not active), or greyed locked (with status + Buy).
func _build_variant_row(cat: String, id: String, is_active: bool) -> Control:
	var discovered: bool = game != null and game.is_tile_discovered(id)
	var d: Dictionary = TileVariantConfig.discovery_of(id)
	var method: String = String(d.get("method", ""))

	var row := PanelContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var rb := UiKit.row_box()
	if is_active:
		rb.border_color = Palette.GO_GREEN
		rb.set_border_width_all(3)
	row.add_theme_stylebox_override("panel", rb)

	var hbox := HBoxContainer.new()
	hbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_theme_constant_override("separation", 10)
	row.add_child(hbox)

	# Icon (greyed when locked).
	var icon_holder := CenterContainer.new()
	icon_holder.custom_minimum_size = Vector2(ROW_ICON_PX, ROW_ICON_PX)
	icon_holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var icon := _make_tile_icon(TileVariantConfig.tile_for(id), ROW_ICON_PX)
	if icon != null:
		if not discovered:
			icon.modulate = Color(1, 1, 1, 0.45)
		icon_holder.add_child(icon)
	hbox.add_child(icon_holder)

	# Info column.
	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.add_theme_constant_override("separation", 2)
	hbox.add_child(info)

	var name_row := HBoxContainer.new()
	name_row.add_theme_constant_override("separation", 6)
	info.add_child(name_row)

	var name_lbl := Label.new()
	name_lbl.text = _variant_name(id)
	name_lbl.add_theme_font_size_override("font_size", 14)
	name_lbl.add_theme_color_override("font_color", Palette.INK if discovered else Palette.INK_MID)
	name_row.add_child(name_lbl)

	var tier: int = TileVariantConfig.tier_of(id)
	if tier > 0:
		name_row.add_child(_chip("Tier %d" % tier))

	if is_active:
		var act := Label.new()
		act.text = "● Active"
		act.add_theme_font_size_override("font_size", 11)
		act.add_theme_color_override("font_color", Palette.GO_GREEN)
		name_row.add_child(act)

	# Description (first sentence of the React catalog description — the variant's summary).
	var desc_full: String = TVU.description(id)
	if desc_full != "":
		# Show only the first sentence (up to the first ".") as the compact summary line.
		var dot_pos: int = desc_full.find(".")
		var desc_line: String = (desc_full.substr(0, dot_pos + 1) if dot_pos >= 0 else desc_full)
		var desc_lbl := Label.new()
		desc_lbl.text = desc_line
		desc_lbl.add_theme_font_size_override("font_size", 11)
		desc_lbl.add_theme_color_override("font_color", Palette.INK_MID)
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		info.add_child(desc_lbl)

	# Status line (mirrors React effects.ts statusFor).
	var status := Label.new()
	status.text = _status_for(id)
	status.add_theme_font_size_override("font_size", 11)
	status.add_theme_color_override("font_color", Palette.INK_MID)
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info.add_child(status)

	# Ability summary.
	var ability_text: String = _ability_summary(id)
	if ability_text != "":
		var ab := Label.new()
		ab.text = ability_text
		ab.add_theme_font_size_override("font_size", 11)
		ab.add_theme_color_override("font_color", Palette.MOSS)
		ab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		info.add_child(ab)

	# Action column (right).
	if discovered:
		# Whole row picks the variant (a transparent overlay button keeps the layout readable).
		var pick := Button.new()
		pick.flat = true
		pick.set_anchors_preset(Control.PRESET_FULL_RECT)
		pick.connect("pressed", Callable(self, "_on_choose").bind(cat, id))
		row.add_child(pick)
		_action_buttons["choose_" + id] = pick
	elif method == "buy":
		var cost: int = int(d.get("coinCost", 0))
		var buy := Button.new()
		buy.text = "Buy %d 🪙" % cost
		buy.size_flags_horizontal = Control.SIZE_SHRINK_END
		buy.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var afford: bool = game != null and game.coins >= cost
		UiKit.style_action_button(buy, Palette.GOLD if afford else Palette.IRON, 6, 13)
		buy.disabled = not afford
		buy.connect("pressed", Callable(self, "_on_buy").bind(cat, id))
		hbox.add_child(buy)
		_action_buttons["buy_" + id] = buy

	return row

func _close_chooser() -> void:
	_chooser_cat = ""
	if _chooser_layer != null:
		_chooser_layer.visible = false

## The category whose chooser is open ("" when none).
func chooser_open_for() -> String:
	return _chooser_cat

# ── action handlers ────────────────────────────────────────────────────────────

## A discovered variant was picked: set it active, close the chooser, re-render the slots.
func _on_choose(cat: String, id: String) -> void:
	if game != null:
		game.set_active_tile(cat, id)
	_close_chooser()
	_render()

## A locked buy-variant's Buy button was pressed: purchase it (marks it discovered + spends
## coins), then rebuild the chooser rows so it becomes pickable. Mirrors React BUY_TILE — buying
## discovers ONLY; the player still activates it separately by tapping the (now pickable) row.
func _on_buy(cat: String, id: String) -> void:
	if game != null:
		game.buy_tile(id)
	# Stay in the chooser so the player can now pick the freshly-bought variant.
	_rebuild_chooser_rows(cat)
	_render()  # update the affordability tint on the Start row / cost too

## Start — emit the active category ids and the fertilizer flag (true only when the toggle
## is checked AND the player actually has a fertilizer). The GameState.start_farm_run guard
## will reject a true flag with no fertilizer anyway, but we double-check here for safety.
func _on_start() -> void:
	var use_fert: bool = _fertilizer_checked and game != null and game._has_fertilizer()
	emit_signal("start_requested", selected_categories(), use_fert)
	close()

## T12: fertilizer toggle toggled — update the state flag and re-render the budget preview.
func _on_fert_toggled(checked: bool) -> void:
	_fertilizer_checked = checked
	_render()

func _on_cancel() -> void:
	close()

# ── pure helpers (testable without rendering internals) ────────────────────────

## The active variant id for a category (the live GameState value, or "" if none/no game).
func active_variant_for(cat: String) -> String:
	if game == null:
		return ""
	return game.active_tile_id_for_category(cat)

## The eligible/active category ids (home zone has all categories on). Returns a fresh Array.
func selected_categories() -> Array:
	return _categories.duplicate()

## The turn budget the preview shows, reflecting the current fertilizer toggle state.
## When fertilizer is available and the toggle is on → farm_run_turn_budget(true) (×2);
## otherwise farm_run_turn_budget(false) (base). Falls back to the zone base with no game.
func preview_budget() -> int:
	if game != null:
		return game.farm_run_turn_budget(_fertilizer_checked and game._has_fertilizer())
	return ZoneConfig.base_turns(ZoneConfig.HOME_ZONE)

## The current farm season NAME the spawn-info reflects. Reads the live GameState season; a
## fresh (no-run) game is Spring (turns_used 0). Falls back to "Spring" with no game.
func _current_season_name() -> String:
	if game == null:
		return "Spring"
	return game.current_season_name()

## A ranked one-line summary of what the home zone spawns this season, read from
## ZoneConfig.season_drops for the current season. Lists the eligible categories with a
## positive weight, sorted by weight DESC, each as "Label NN%" (the weight is a 0..1 share).
## Pure + headless-testable — the single source of the spawn-info copy.
func season_spawn_summary() -> String:
	var season: String = _current_season_name()
	var drops: Dictionary = ZoneConfig.season_drops(ZoneConfig.HOME_ZONE, season)
	if drops.is_empty():
		return "No data for this season."
	var rows: Array = []
	for cat in drops.keys():
		var w: float = float(drops[cat])
		if w > 0.0:
			rows.append({"cat": String(cat), "w": w})
	rows.sort_custom(func(a, b): return float(a["w"]) > float(b["w"]))
	var parts: Array = []
	for r in rows:
		parts.append("%s %d%%" % [_category_label(String(r["cat"])), int(round(float(r["w"]) * 100.0))])
	return "  ·  ".join(parts)

## The home settlement display name from config, with a literal fallback.
func _home_name() -> String:
	var z: Dictionary = CartographyConfig.by_id(ZoneConfig.HOME_ZONE)
	var nm: String = String(z.get("name", ""))
	return nm if nm != "" else "Hearthwood Vale"

## A small rounded chip Label (tier / chain badges in the chooser rows).
func _chip(text: String) -> Control:
	var c := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(Palette.IRON, 0.30)
	sb.border_color = Color(Palette.IRON, 0.5)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(999)
	sb.content_margin_left = 6
	sb.content_margin_right = 6
	sb.content_margin_top = 1
	sb.content_margin_bottom = 1
	c.add_theme_stylebox_override("panel", sb)
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 10)
	lbl.add_theme_color_override("font_color", Palette.INK)
	c.add_child(lbl)
	return c

## A human title-cased category label ("veg" → "Vegetables" etc., mirroring React CATEGORY_LABEL).
func _category_label(cat: String) -> String:
	match cat:
		"grass":  return "Grass"
		"grain":  return "Grain"
		"trees":  return "Trees"
		"birds":  return "Birds"
		"veg":    return "Vegetables"
		"fruit":  return "Fruits"
		"flower": return "Flowers"
		"herd":   return "Herd Animals"
		"cattle": return "Cattle"
		"mount":  return "Mounts"
	if cat.length() > 0:
		return cat.substr(0, 1).to_upper() + cat.substr(1)
	return cat

## The display name for a variant id (shared derivation).
func _variant_name(id: String) -> String:
	return TVU.display_name(id)

## A tile-art icon for a Constants.Tile (from res://assets/tiles/<key>.png), or null when no PNG.
func _make_tile_icon(tile: int, px: int) -> TextureRect:
	return TVU.make_tile_icon(tile, px)

## The unlock-status string for variant `id` (mirrors React effects.ts statusFor).
func _status_for(id: String) -> String:
	return TVU.status_for(game, id)

## A one-line ability summary for variant `id` ("" when no abilities).
func _ability_summary(id: String) -> String:
	return TVU.ability_summary(id)
