extends CanvasLayer
## The "Start Farming" modal — a parchment card that opens the bounded farm RUN: the player
## picks which tile categories to bias onto the field, sees the turn budget + the coin cost,
## and confirms. This is the port's analogue of React's src/features/zones/StartFarmingModal.tsx
## (the FARM/ENTER dialog), trimmed to the ONE zone the Godot port plays today — the home
## village ("home"). It is purely a PICKER + a CONFIRM: it never mutates GameState itself.
## On Start it emits `start_requested(selected, use_fertilizer)`; Main (Task C) wires that to
## GameState.start_farm_run() and reacts to the result. Cancel just dismisses the card.
##
## Mirrors the LeaveBoardModal / HarvestModal pattern: a lazy setup(game) that builds the shell
## ONCE (guarded by `_built`), open() (re-render live state + show), close() (hide + emit
## `closed`), an `_action_buttons` Dictionary for headless tests, a warm full-rect
## MOUSE_FILTER_STOP ColorRect backdrop + a centred PanelContainer card on `layer = 6`. The
## full-rect STOP backdrop lets Main._install_overlay_dismiss auto-wire tap-to-cancel later
## (no extra work needed here).
##
## NO class_name — preloaded by Main (const StartFarmingModalScript := preload(...)) so the
## port never needs --import to register it as a global (mirrors LeaveBoardModal / HarvestModal).
##
## HEADLESS-TEST CONTRACT
##   Every actionable button is in `_action_buttons`:
##     "cat_<id>" — one toggle per eligible tile category (grass/grain/trees/birds/veg/fruit)
##     "start"    — the confirm; disabled when coins < entry cost
##     "cancel"   — dismiss
##   selected_categories() returns the currently-selected category ids; preview_budget()
##   returns the turn budget shown (game.farm_run_turn_budget(false)). Tests build the modal
##   with `.new()` + `setup(game)` BEFORE add_child, so the shell must build WITHOUT a live
##   viewport (no get_viewport() calls during build; the card is centred via CenterContainer).

var game: GameState

## Emitted on Start: the chosen category ids + the fertilizer flag. Always false here — the
## port has no fertilizer/fill-bias primitive yet (see the NO-FAKE note on the toggle omission),
## so the ×2 path stays honest. Always followed by `closed` (Start closes the card).
signal start_requested(selected: Array, use_fertilizer: bool)
signal closed

## Stable button registry for headless tests. Keys: "cat_<id>", "start", "cancel".
var _action_buttons: Dictionary = {}

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

## Per-category selected state, keyed by category id ("grass" → true). All categories start
## selected (the home zone exposes <= 8, so React leaves them all picked / mustPick == false).
var _selected: Dictionary = {}

## The eligible category ids for the home zone, in declaration order (frozen at build).
var _categories: Array = []

# Static shell nodes (text re-set each open()).
var _title_label: Label            ## "Start Farming — Hearthwood Vale"
var _budget_label: Label           ## "Turns this run: 10"
var _budget_sub_label: Label       ## muted "Base 10"
var _cost_value_label: Label       ## the cost number, tinted by affordability
var _start_btn: Button             ## the confirm; disabled when unaffordable
var _cancel_btn: Button            ## dismiss

# Palette mirrors (LeaveBoardModal / HarvestModal tokens).
const COL_TITLE := Palette.INK
const COL_BODY := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 460.0
const HOME_ZONE := "home"

## React CATEGORY_GLYPH (the godot eligible set; default 🌱 for any id without a glyph).
const CATEGORY_GLYPH := {
	"grass": "🌿",
	"grain": "🌾",
	"trees": "🌳",
	"birds": "🐦",
	"veg": "🥕",
	"fruit": "🍎",
}
## The most slots the picker ever shows (React MAX_SLOTS). The home zone has <= 8 so every slot
## is selected by default; carried for parity with the React cap.
const MAX_SLOTS := 8

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once). Does NOT
## show the modal — call open() to (re-)render the live state and present it.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Re-render the live state (budget + cost + affordability) and show the card.
func open() -> void:
	if not _built:
		return
	_render()
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6                                   # top tier (matches LeaveBoardModal / HarvestModal)
	visible = false

	# Resolve the eligible categories + the home name from config (NOT viewport-dependent, so
	# this is headless-safe). All categories start selected.
	_categories = ZoneConfig.eligible_categories(HOME_ZONE)
	for c in _categories:
		_selected[String(c)] = true

	# Warm-brown scrim (matches LeaveBoardModal / HarvestModal). MOUSE_FILTER_STOP so clicks
	# behind it never reach the board; Main._install_overlay_dismiss wires a tap to close().
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-rect CenterContainer centres the parchment card at its own min size (no viewport math).
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(16)
	style.set_content_margin_all(28)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 14)
	panel.add_child(col)

	var heading_font: Font = UiKit.heading_font()

	# Title — "Start Farming — <home name>" (Cinzel display serif, centred).
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

	# Intro line — these categories will be on the field (the home zone has <= 8, all picked).
	var intro := Label.new()
	intro.text = "These %d tile types will be on the field. Tap to include or drop one." % _categories.size()
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

	# Tile-category picker — a 4-column grid of toggle buttons (React's grid-cols-4).
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_child(grid)

	for c in _categories:
		var cat: String = String(c)
		var btn := Button.new()
		btn.toggle_mode = true
		btn.button_pressed = true
		btn.text = "%s\n%s" % [_glyph_for(cat), UiKit.pretty_name(cat)]
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.custom_minimum_size = Vector2(0, 64)
		btn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		btn.connect("toggled", Callable(self, "_on_category_toggled").bind(cat))
		grid.add_child(btn)
		_action_buttons["cat_" + cat] = btn
		_style_category_button(btn, true)

	# NO-FAKE: the React modal has a "Use Fertilizer — doubles turns" checkbox, but the Godot
	# port has NO fertilizer / fill-bias primitive (GameState._has_fertilizer() is always false
	# and start_farm_run honestly REJECTS use_fertilizer == true). Shipping a ×2 toggle here
	# would be a fake control, so it is OMITTED — the eventual start_requested payload's
	# use_fertilizer is hard-wired to false. The ×2 formula stays wired + tested in GameState
	# (farm_run_turn_budget(true) == 20); only the AVAILABILITY is stubbed.

	# Turn-budget preview card — "Turns this run: N" + a muted "Base N" subline. Honest: no
	# "+ buildings" / "× fertilizer" rider, since neither primitive exists in the port yet.
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

	# Cost row — "Cost to start: <N> 🪙"; the number is tinted by affordability in _render().
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

	# Start — the primary confirm (filled moss/green). Disabled when coins < entry cost.
	_start_btn = Button.new()
	_start_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(_start_btn, Palette.GO_GREEN, 10, 18)
	_start_btn.connect("pressed", Callable(self, "_on_start"))
	col.add_child(_start_btn)
	_action_buttons["start"] = _start_btn

	# Cancel — a quiet iron secondary button.
	_cancel_btn = Button.new()
	_cancel_btn.text = "Cancel"
	_cancel_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_cancel_btn, Palette.IRON, 10, 18)
	_cancel_btn.connect("pressed", Callable(self, "_on_cancel"))
	col.add_child(_cancel_btn)
	_action_buttons["cancel"] = _cancel_btn

# ── render ─────────────────────────────────────────────────────────────────────

## Re-render the live preview: the turn budget, the cost number + its affordability tint, and
## the Start button label + enabled state.
func _render() -> void:
	if not _built:
		return
	var budget: int = preview_budget()
	var base: int = ZoneConfig.base_turns(HOME_ZONE)
	_budget_label.text = "Turns this run: %d" % budget
	_budget_sub_label.text = "Base %d" % base

	var cost: int = ZoneConfig.entry_cost(HOME_ZONE)
	var coins: int = game.coins if game != null else 0
	var can_afford: bool = coins >= cost
	_cost_value_label.text = "%d 🪙" % cost
	_cost_value_label.add_theme_color_override("font_color", Palette.GO_GREEN if can_afford else Palette.EMBER)

	_start_btn.text = "Start (%d 🪙)" % cost if can_afford else "Not enough coin"
	_start_btn.disabled = not can_afford

# ── action handlers ────────────────────────────────────────────────────────────

## A category toggle changed: store the new selected state + restyle the button.
func _on_category_toggled(pressed: bool, cat: String) -> void:
	_selected[cat] = pressed
	var btn = _action_buttons.get("cat_" + cat)
	if btn is Button:
		_style_category_button(btn, pressed)

## Start — emit the chosen selection (use_fertilizer always false, see the NO-FAKE note) then
## close. The ACTUAL run starts in GameState.start_farm_run, wired by Main (Task C) off this signal.
func _on_start() -> void:
	emit_signal("start_requested", _selected_list(), false)
	close()

## Cancel — just dismiss the card.
func _on_cancel() -> void:
	close()

# ── pure helpers (testable without rendering internals) ────────────────────────

## The currently-selected category ids, in the zone's declaration order.
func selected_categories() -> Array:
	return _selected_list()

## The turn budget the preview shows — game.farm_run_turn_budget(false) (10 for the home zone),
## or the zone base when no game is wired.
func preview_budget() -> int:
	if game != null:
		return game.farm_run_turn_budget(false)
	return ZoneConfig.base_turns(HOME_ZONE)

## Build the selected-id list in declaration order (a fresh Array each call).
func _selected_list() -> Array:
	var out: Array = []
	for c in _categories:
		var cat: String = String(c)
		if bool(_selected.get(cat, false)):
			out.append(cat)
	return out

## The home settlement display name from config ("Hearthwood Vale"), with a literal fallback
## if the config lookup ever comes back empty.
func _home_name() -> String:
	var z: Dictionary = CartographyConfig.by_id("home")
	var nm: String = String(z.get("name", ""))
	return nm if nm != "" else "Hearthwood Vale"

## The glyph for a category id (React CATEGORY_GLYPH), defaulting to 🌱.
func _glyph_for(cat: String) -> String:
	return String(CATEGORY_GLYPH.get(cat, "🌱"))

## Style a category toggle by its selected state: a filled moss button when selected (a clear
## "on the field"), a quiet parchment pill when dropped. Mirrors React's selected/unselected slot.
func _style_category_button(btn: Button, selected: bool) -> void:
	if selected:
		UiKit.style_action_button(btn, Palette.GO_GREEN, 6, 0)
	else:
		UiKit.style_button(btn, Palette.EMBER, 6, 0)
