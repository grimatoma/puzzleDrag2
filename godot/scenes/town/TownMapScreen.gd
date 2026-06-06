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
## Headless-test contract. The close Button is registered in `_action_buttons`
## under the key "close" (emits `closed`); plan_lot_count() exposes the rendered
## lot count so a test can assert the plan was built from real state.

var game: GameState

signal closed

## action id → Button, for headless tests. Currently just "close".
var _action_buttons: Dictionary = {}

const TownMapScript := preload("res://scenes/town/TownMap.gd")

# The seed zone for the layout (the home town). Deterministic per TownLayout.
const ZONE_ID := "home"
const FALLBACK_VIEW := Vector2(720, 1280)

# Static shell, built once in setup(); the map is re-rendered each refresh().
var _built: bool = false
var _map: Node2D                 ## the TownMap renderer node
var _map_host: Control           ## full-rect Control the map is parented under
var _last_plan: Dictionary = {}  ## the plan from the most recent refresh()

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
	_map_host = Control.new()
	_map_host.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map_host.mouse_filter = Control.MOUSE_FILTER_IGNORE
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

# ── test helpers ────────────────────────────────────────────────────────────

## Lot count of the most recently rendered plan (for the headless wiring test).
func plan_lot_count() -> int:
	if _last_plan.is_empty():
		return 0
	return (_last_plan.get("lots", []) as Array).size()
