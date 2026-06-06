class_name TownMapScreen
extends CanvasLayer
## M6c — the spatial town-map screen: the in-game home for the TownMap renderer
## (scenes/town/TownMap.gd). It mirrors InventoryScreen's structure — a lazy
## setup(game) that builds the shell ONCE, an open() that re-renders from the
## latest state, a `closed` signal, and a "close" button registered in
## `_action_buttons` for the headless test — but instead of a parchment ledger it
## hosts a full-viewport TownMap fed by REAL GameState data.
##
## REAL DATA. The plan is built from GameState every refresh():
##   plot_count  = game.settlement.plots()      (total plots at the current tier)
##   built       = game.buildings.duplicate()   (the built building ids, in order)
##   board_kinds = [game.active_biome]           (e.g. ["farm"])
## TownLayout.build_plan("home", plot_count, board_kinds) is deterministic, and the
## first `built.size()` lots are rendered as placeholder houses labelled with their
## building id. Nothing is faked — these stand in for real built buildings (full
## iso building art is a later milestone).
##
## LAYOUT. A parchment backdrop fills the screen; the TownMap (a Node2D) is added
## under a full-rect Control and render_plan()'d at the live viewport size so the
## content-aware fit fills the portrait viewport. A floating title pill ("🗺
## Hearthwood Vale") and a "✕ Close" button sit on top, styled via UiKit.
##
## M6d — INTERACTIVE plots. The map host Control now captures gui_input: a left
## click is mapped to a build-slot lot via TownMap.lot_at_screen(). A click on a
## BUILT lot (index < built_count) opens an info card with a Demolish button; a
## click on an EMPTY lot opens a build-picker card listing the tier's buildings.
## Both call straight through to the SAME tested GameState build/demolish API and
## then refresh() the map — no new per-plot state.
##
## ORDINAL placement (model note). GameState has NO per-plot placement: game.buildings
## is a flat ordered list, and the map renders it onto the first N lots in order.
## So clicking a SPECIFIC empty plot opens the picker and game.build(id) APPENDS —
## the new house renders on the next ordinal empty lot, not necessarily the one
## clicked. Demolishing a built lot removes that lot's building id (game.buildings[i]).
## True per-plot placement is a later spatial-model milestone; this milestone
## deliberately stays within the existing flat-list state.
##
## Headless-test contract. The close Button is registered in `_action_buttons`
## under the key "close" (emits `closed`); plan_lot_count() exposes the rendered
## lot count so a test can assert the plan was built from real state. M6d adds
## "demolish" (the built-lot info card's button), "build:<id>" + "picker_close"
## (the build-picker card), and exposes _open_build_picker_for_lot / _open_info_for_lot
## so tests + the capture tool can drive a panel without synthesising real input.

var game: GameState

signal closed
## M6d — emitted after a build/demolish mutates `game`, so Main can re-pool the
## board, save, and refresh its HUD (mirrors TownScreen.state_changed).
signal state_changed

## action id → Button, for headless tests. Static keys: "close". Panel keys are
## added/removed as panels open/close: "demolish" (built-lot card),
## "build:<id>" + "picker_close" (build-picker card).
var _action_buttons: Dictionary = {}

const TownMapScript := preload("res://scenes/town/TownMap.gd")

# The seed zone for the layout (the home town). Deterministic per TownLayout.
const ZONE_ID := "home"
const FALLBACK_VIEW := Vector2(720, 1280)
## A soft danger tone for the Demolish button (matches TownScreen.COL_DANGER).
const COL_DANGER := Color("#b06a52")

# Static shell, built once in setup(); the map is re-rendered each refresh().
var _built: bool = false
var _map                         ## the TownMap renderer node (TownMap.gd Node2D)
var _map_host: Control           ## full-rect Control the map is parented under
var _last_plan: Dictionary = {}  ## the plan from the most recent refresh()
## M6d — the currently-open interaction panel (build picker or demolish info), or
## null when none is open. A fresh CanvasLayer-child Control holding a scrim + card.
var _panel: Control = null

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
	_close_panel()
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                    # modal, above the HUD (layer 1)
	visible = false

	# Parchment backdrop — a warm full-rect fill so the map sits on paper, and a
	# MOUSE_FILTER_STOP so clicks never reach the board behind the open map.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-rect host Control that the TownMap (a Node2D) hangs under, so the map
	# draws over the backdrop and under the floating title/close controls.
	# M6d: MOUSE_FILTER_STOP so it receives gui_input — left clicks pick a lot and
	# mouse motion drives the hover highlight. (The backdrop below already eats any
	# stray click so nothing leaks to the board behind the open map.)
	_map_host = Control.new()
	_map_host.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map_host.mouse_filter = Control.MOUSE_FILTER_STOP
	_map_host.connect("gui_input", Callable(self, "_on_map_gui_input"))
	add_child(_map_host)

	_map = TownMapScript.new()
	_map_host.add_child(_map)

	# Floating UI layer over the map: a title pill (top-left) + a close button
	# (top-right). A full-rect, click-through Control holds both.
	var overlay := Control.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)

	# Title pill — the in-fiction settlement name, top-left.
	var title := Label.new()
	title.text = "🗺 Hearthwood Vale"
	title.add_theme_font_size_override("font_size", 26)
	title.add_theme_color_override("font_color", Palette.INK)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	var title_box := PanelContainer.new()
	title_box.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PARCHMENT))
	title_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_box.set_anchors_preset(Control.PRESET_TOP_LEFT)
	title_box.offset_left = 18
	title_box.offset_top = 18
	title_box.add_child(title)
	overlay.add_child(title_box)

	# Close button — top-right, parchment pill (matches the other modals).
	var close_btn := Button.new()
	close_btn.text = "✕ Close"
	UiKit.style_button(close_btn, Palette.EMBER, 6, 20)
	close_btn.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	close_btn.offset_right = -18
	close_btn.offset_top = 18
	close_btn.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	close_btn.connect("pressed", Callable(self, "close"))
	overlay.add_child(close_btn)
	_action_buttons["close"] = close_btn

# ── render ────────────────────────────────────────────────────────────────────

## Rebuild the TownLayout plan from REAL GameState data and render it into the
## TownMap at the current viewport size (content-aware fit). Called on setup() and
## every open(), so the map always reflects the latest plots + built buildings.
func refresh() -> void:
	if not _built or game == null or _map == null:
		return
	var plot_count: int = max(1, game.settlement.plots())
	var built: Array = game.buildings.duplicate()
	var board_kinds: Array = [game.active_biome]
	var plan: Dictionary = TownLayout.build_plan(ZONE_ID, plot_count, board_kinds)
	_last_plan = plan
	var vp: Vector2 = _viewport_size()
	_map.render_plan(plan, vp.x, vp.y, built)

# Live viewport size, falling back to the portrait default when none is available
# (e.g. a headless run with no window).
func _viewport_size() -> Vector2:
	var vp := get_viewport()
	if vp != null:
		var sz: Vector2 = vp.get_visible_rect().size
		if sz.x > 0.0 and sz.y > 0.0:
			return sz
	return FALLBACK_VIEW

# ── M6d: interaction (click a plot → build / demolish) ────────────────────────

## gui_input on the map host: a left click picks a build-slot lot and opens the
## matching panel; mouse motion drives the TownMap hover highlight. The event
## position is already LOCAL to _map_host (a full-rect Control whose top-left is the
## viewport origin), which is the same screen space TownMap.render_plan fit into —
## so it feeds straight into lot_at_screen/set_hover_lot with no extra transform.
func _on_map_gui_input(event: InputEvent) -> void:
	if _map == null:
		return
	if event is InputEventMouseMotion:
		_map.set_hover_lot(_map.lot_at_screen(event.position))
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var lot: int = _map.lot_at_screen(event.position)
		if lot < 0:
			# A click on empty ground (not on a lot) just dismisses any open panel.
			_close_panel()
			return
		if lot < _map.built_count():
			_open_info_for_lot(lot)
		else:
			_open_build_picker_for_lot(lot)

## Open the BUILT-lot info card for build slot `lot`: shows the building's name and
## a Demolish button. `game.buildings[lot]` is the id rendered on that ordinal lot
## (the map fills lots[0..N-1] from the flat buildings list in order). Registered
## as `_action_buttons["demolish"]`.
func _open_info_for_lot(lot: int) -> void:
	if game == null or lot < 0 or lot >= game.buildings.size():
		return
	var id: String = String(game.buildings[lot])
	var card := _begin_panel("🏠 " + BuildingConfig.building_name(id))

	var kind_lbl := _make_label("Built · %s" % BuildingConfig.building_kind(id), Palette.INK_MID)
	card.add_child(kind_lbl)

	var demo := Button.new()
	demo.text = "Demolish"
	UiKit.style_button(demo, COL_DANGER, 6, 0, true)
	# bind the id so demolish targets THIS lot's building, not "the last built".
	demo.connect("pressed", Callable(self, "_do_demolish").bind(id))
	card.add_child(demo)
	_action_buttons["demolish"] = demo

## Open the EMPTY-lot build picker for build slot `lot`: one row per building
## available at the current tier, each with a Build button enabled iff
## game.can_build(id) (which already requires a free plot). Registered as
## `_action_buttons["build:<id>"]` plus a `_action_buttons["picker_close"]`.
##
## ORDINAL placement: the picker is opened FROM a specific empty plot, but
## game.build(id) APPENDS to the flat buildings list, so the new house renders on
## the next ordinal empty lot (which is fine — see the class header model note). The
## `lot` arg only decides built-vs-empty + which card to open.
func _open_build_picker_for_lot(_lot: int) -> void:
	if game == null:
		return
	var card := _begin_panel("Build on this plot")

	if game.plots_free() <= 0:
		card.add_child(_make_label("No free plots — demolish one first.", Palette.INK_MID))

	for id in BuildingConfig.available_at_tier(game.settlement.tier):
		# Skip rats-hazard buildings here (parity with TownScreen — they have their
		# own gated section; the map picker offers the standard spawners/refiners).
		if BuildingConfig.is_hazard_building(id):
			continue
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var cost_text: String = _format_cost(BuildingConfig.building_cost(id))
		var label := _make_label("%s  (%s)" % [BuildingConfig.building_name(id), cost_text], Palette.INK)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		var build_btn := Button.new()
		build_btn.text = "Build"
		# can_build already gates on tier, free plot, and full cost in inventory.
		build_btn.disabled = not game.can_build(id)
		build_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		UiKit.style_button(build_btn, Palette.MOSS, 6, 0, true)
		build_btn.connect("pressed", Callable(self, "_do_build").bind(id))
		row.add_child(build_btn)
		_action_buttons["build:" + id] = build_btn

		card.add_child(row)

## Build `id` through the SAME GameState API as TownScreen, then dismiss the panel,
## re-render the map (so the new house shows), and emit state_changed on success.
func _do_build(id: String) -> void:
	var result: Dictionary = game.build(id)
	_close_panel()
	refresh()
	if bool(result.get("ok", false)):
		emit_signal("state_changed")

## Demolish `id` through the SAME GameState API, then dismiss the panel, re-render
## (the lot reverts to empty), and emit state_changed on success.
func _do_demolish(id: String) -> void:
	var result: Dictionary = game.demolish(id)
	_close_panel()
	refresh()
	if bool(result.get("ok", false)):
		emit_signal("state_changed")

# ── M6d: panel scaffolding (scrim + parchment card) ───────────────────────────

## Tear down the open interaction panel (if any) and drop its action buttons from
## `_action_buttons` so tests + handlers never read a stale node. The "close" entry
## is preserved (it's the static title-bar button, not part of a panel).
func _close_panel() -> void:
	if _panel != null:
		_panel.queue_free()
		_panel = null
	if _map != null:
		_map.set_hover_lot(-1)
	var keep: Variant = _action_buttons.get("close")
	_action_buttons.clear()
	if keep != null:
		_action_buttons["close"] = keep

## Build a fresh panel: a translucent scrim (clicking it closes the panel) holding a
## centred parchment card with a title row (heading + ✕). Returns the card's content
## VBox for the caller to fill. Any previously-open panel is torn down first.
func _begin_panel(title_text: String) -> VBoxContainer:
	_close_panel()

	# Scrim — full-rect, eats clicks so the map underneath doesn't react; clicking
	# the bare scrim dismisses the panel.
	_panel = Control.new()
	_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	var scrim := ColorRect.new()
	scrim.color = Color(0.17, 0.13, 0.08, 0.55)
	scrim.set_anchors_preset(Control.PRESET_FULL_RECT)
	scrim.mouse_filter = Control.MOUSE_FILTER_STOP
	scrim.connect("gui_input", Callable(self, "_on_scrim_input"))
	_panel.add_child(scrim)
	add_child(_panel)

	# Centred parchment card.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel.add_child(center)

	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PARCHMENT))
	card.custom_minimum_size = Vector2(360, 0)
	center.add_child(card)

	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	card.add_child(body)

	# Title row: heading + a ✕ close affordance (registered as "picker_close").
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_theme_constant_override("separation", 12)
	var title := Label.new()
	title.text = title_text
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", Palette.INK)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	var x_btn := Button.new()
	x_btn.text = "✕"
	x_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(x_btn, Palette.EMBER, 6, 0, true)
	x_btn.connect("pressed", Callable(self, "_close_panel"))
	title_row.add_child(x_btn)
	_action_buttons["picker_close"] = x_btn

	body.add_child(title_row)
	return body

## Clicking the bare scrim (outside the card) dismisses the panel.
func _on_scrim_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_close_panel()

# ── label / cost helpers (parity with TownScreen) ─────────────────────────────

## A wrapping body Label in the given color.
func _make_label(text: String, color: Color) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 18)
	lbl.add_theme_color_override("font_color", color)
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return lbl

## Format a resource-cost Dictionary like "plank 8, flour 4"; empty → "free".
func _format_cost(cost: Dictionary) -> String:
	if cost.is_empty():
		return "free"
	var parts: Array = []
	for k in cost.keys():
		parts.append("%s %d" % [k, int(cost[k])])
	return ", ".join(parts)

# ── test helpers ────────────────────────────────────────────────────────────

## Lot count of the most recently rendered plan (for the headless wiring test).
func plan_lot_count() -> int:
	if _last_plan.is_empty():
		return 0
	return (_last_plan.get("lots", []) as Array).size()
