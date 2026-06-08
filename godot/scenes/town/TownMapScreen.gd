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
## Bottom strip (px) left to the persistent nav bar — the backdrop + _map_host stop this
## far short of the bottom so the nav (a lower CanvasLayer) shows through + stays tappable.
const NAV_RESERVE := 76
## A soft danger tone for the Demolish button (matches TownScreen.COL_DANGER).
const COL_DANGER := Color("#b06a52")

# Static shell, built once in setup(); the map is re-rendered each refresh().
var _built: bool = false
var _map                         ## the TownMap renderer node (TownMap.gd Node2D)
var _map_host: Control           ## full-rect Control the map is parented under
var _last_plan: Dictionary = {}  ## the plan from the most recent refresh()
## The prominent "Build · <built>/<plots> plots" button (bottom-right, matches React).
## Opens the build picker for the first empty plot; its label is refreshed each render().
var _build_btn: Button
## M6d — the currently-open interaction panel (build picker or demolish info), or
## null when none is open. A fresh CanvasLayer-child Control holding a scrim + card.
var _panel: Control = null

## Zoom/pan interaction state. A LEFT press records _press_pos; if the cursor then
## moves past DRAG_THRESHOLD with the button held it becomes a drag-PAN (and the
## release no longer resolves a lot click), so a tap still builds/demolishes but a
## drag pans the map — the standard tap-vs-drag disambiguation.
var _press_pos: Vector2 = Vector2.ZERO
var _dragging: bool = false
const DRAG_THRESHOLD := 8.0

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

	# Parchment backdrop — a warm full-rect fill so the map sits on paper. This screen is
	# the "Town" tab — one of the five persistent bottom-nav VIEWS — so the backdrop stops
	# NAV_HEIGHT (76px) short of the bottom, leaving the persistent nav bar (a LOWER
	# CanvasLayer) visible + tappable. MOUSE_FILTER_STOP eats clicks above that strip so
	# nothing leaks to the board behind the open map.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_bottom = -76                 # leave the bottom nav strip unpainted
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-rect host Control that the TownMap (a Node2D) hangs under, so the map
	# draws over the backdrop and under the floating title/close controls.
	# M6d: MOUSE_FILTER_STOP so it receives gui_input — left clicks pick a lot and
	# mouse motion drives the hover highlight. (The backdrop below already eats any
	# stray click so nothing leaks to the board behind the open map.)
	# View-mode: stop NAV_HEIGHT (76px) short of the bottom so this STOP control never
	# covers the persistent nav strip — taps there fall through to the nav buttons on the
	# lower CanvasLayer. The map renders into this reserved rect (see _viewport_size).
	_map_host = Control.new()
	_map_host.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map_host.offset_bottom = -76
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

	# Prominent "Build · <built>/<plots> plots" button, bottom-right (matches React's
	# TownGround build affordance). Opens the build picker for the first empty plot — the
	# explicit, discoverable path to building (clicking a raw plot still works too). Its
	# label is refreshed each render() from the live plot counts. Registered as "build_open".
	_build_btn = Button.new()
	_build_btn.text = "🔨 Build"
	UiKit.style_action_button(_build_btn, Palette.GO_GREEN, 8, 20)
	_build_btn.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	_build_btn.offset_right = -18
	# Lifted above the reserved bottom-nav strip (NAV_RESERVE 76 + an 18px gap) so the
	# Build button never overlaps the persistent nav bar showing through below.
	_build_btn.offset_bottom = -18 - NAV_RESERVE
	_build_btn.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_build_btn.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_build_btn.connect("pressed", Callable(self, "_on_build_button"))
	overlay.add_child(_build_btn)
	_action_buttons["build_open"] = _build_btn

	# Zoom / recenter controls, bottom-LEFT (matches React's TownGround map controls).
	# A vertical stack of small round parchment buttons: ＋ zoom in, − zoom out, ⟳
	# recenter (reset to the content-aware fit). They drive the live TownMap view
	# transform (real zoom/pan — no fakes). Lifted above the reserved bottom-nav strip.
	var zoom_box := VBoxContainer.new()
	zoom_box.add_theme_constant_override("separation", 8)
	zoom_box.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	zoom_box.offset_left = 18
	zoom_box.offset_bottom = -18 - NAV_RESERVE
	zoom_box.grow_vertical = Control.GROW_DIRECTION_BEGIN
	overlay.add_child(zoom_box)

	var zoom_in_btn := _make_zoom_btn("＋")
	zoom_in_btn.connect("pressed", Callable(self, "_on_zoom_in"))
	zoom_box.add_child(zoom_in_btn)
	_action_buttons["zoom_in"] = zoom_in_btn

	var zoom_out_btn := _make_zoom_btn("−")
	zoom_out_btn.connect("pressed", Callable(self, "_on_zoom_out"))
	zoom_box.add_child(zoom_out_btn)
	_action_buttons["zoom_out"] = zoom_out_btn

	var recenter_btn := _make_zoom_btn("⟳")
	recenter_btn.connect("pressed", Callable(self, "_on_recenter"))
	zoom_box.add_child(recenter_btn)
	_action_buttons["recenter"] = recenter_btn

## A small (~46px) round parchment control button for the zoom/recenter stack.
func _make_zoom_btn(glyph: String) -> Button:
	var btn := Button.new()
	btn.text = glyph
	btn.custom_minimum_size = Vector2(46, 46)
	UiKit.style_button(btn, Palette.EMBER, 8, 22)
	# Fully-rounded so the controls read as circular map buttons (React parity).
	for state in ["normal", "hover", "pressed", "focus"]:
		var sb: StyleBox = btn.get_theme_stylebox(state)
		if sb is StyleBoxFlat:
			(sb as StyleBoxFlat).set_corner_radius_all(999)
	return btn

func _on_zoom_in() -> void:
	if _map != null:
		_map.zoom_in()

func _on_zoom_out() -> void:
	if _map != null:
		_map.zoom_out()

func _on_recenter() -> void:
	if _map != null:
		_map.recenter()

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
	# Fit the map into the map-HOST rect (viewport minus the reserved nav strip), not the
	# raw viewport — so the content-aware fit AND the lot_at_screen click math both use the
	# same space the host occupies. (event.position in _on_map_gui_input is local to
	# _map_host, which is exactly this rect.)
	var vp: Vector2 = _map_render_size()
	_map.render_plan(plan, vp.x, vp.y, built)
	# Refresh the prominent Build button's label with the live built/total plot counts
	# (matches React's "Build · N/N plots"). Disabled when every plot is already filled.
	if _build_btn != null:
		_build_btn.text = "🔨 Build · %d/%d plots" % [built.size(), plot_count]
		_build_btn.disabled = game.plots_free() <= 0

# Live viewport size, falling back to the portrait default when none is available
# (e.g. a headless run with no window).
func _viewport_size() -> Vector2:
	var vp := get_viewport()
	if vp != null:
		var sz: Vector2 = vp.get_visible_rect().size
		if sz.x > 0.0 and sz.y > 0.0:
			return sz
	return FALLBACK_VIEW

# The rect the map fits into: the map-host Control's real laid-out size when available,
# else the viewport (or fallback) minus the reserved bottom nav strip. Using the host's
# own size keeps the map fit and the lot-click hit-test (event.position is local to the
# host) in exact agreement.
func _map_render_size() -> Vector2:
	if _map_host != null:
		var hs: Vector2 = _map_host.size
		if hs.x > 0.0 and hs.y > 0.0:
			return hs
	var vp: Vector2 = _viewport_size()
	return Vector2(vp.x, maxf(1.0, vp.y - float(NAV_RESERVE)))

# ── M6d: interaction (click a plot → build / demolish) ────────────────────────

## gui_input on the map host. A bare TAP resolves a build-slot lot (build / demolish /
## dismiss); a DRAG (button held + moved past DRAG_THRESHOLD) PANS the map instead and
## suppresses the lot click on release; plain motion drives the hover highlight. The
## event position is already LOCAL to _map_host (a full-rect Control whose top-left is
## the viewport origin), which is the same screen space TownMap.render_plan fit into —
## so it feeds straight into lot_at_screen/set_hover_lot/pan_by with no extra transform.
func _on_map_gui_input(event: InputEvent) -> void:
	if _map == null:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			# Begin a press: remember where, assume tap until it moves enough to be a drag.
			_press_pos = event.position
			_dragging = false
		else:
			# Release: a tap (no drag) resolves the lot under the cursor.
			if not _dragging:
				_resolve_lot_click(event.position)
			_dragging = false
		return
	if event is InputEventMouseMotion:
		if (event.button_mask & MOUSE_BUTTON_MASK_LEFT) != 0:
			# Button held → once past the threshold this is a drag-pan, not a tap.
			if not _dragging and event.position.distance_to(_press_pos) > DRAG_THRESHOLD:
				_dragging = true
				_map.set_hover_lot(-1)
			if _dragging:
				_map.pan_by(event.relative)
			return
		# No button held → hover highlight tracks the cursor.
		_map.set_hover_lot(_map.lot_at_screen(event.position))

## Resolve a TAP at screen `pos`: open the built-lot info card, the empty-lot build
## picker, or (on bare ground) dismiss any open panel. Split out of _on_map_gui_input
## so the tap path is shared and the drag path can skip it.
func _resolve_lot_click(pos: Vector2) -> void:
	var lot: int = _map.lot_at_screen(pos)
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

	# Nudge when NOTHING is buildable yet (early Camp tier has no unlocked buildings):
	# tell the player how to unlock their first one, so the picker is never a dead end.
	var any_now := false
	for aid in BuildingConfig.available_at_tier(game.settlement.tier):
		if not BuildingConfig.is_hazard_building(aid) and game.can_build(aid):
			any_now = true
			break
	if not any_now and game.settlement.tier < TownConfig.MAX_TIER:
		var hint := _make_label(
			"Gather resources and tier up to %s (Craft tab) to unlock your first building." %
				TownConfig.tier_name(game.settlement.tier + 1),
			Palette.GOLD)
		hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		card.add_child(hint)

	# Show the FULL building roster as cards (matching the React picker): each card has the
	# produced-good icon, name + description, the cost as resource chips, and a Build button
	# (enabled when affordable, else a disabled "Need items"); tier-locked rows show
	# "Requires <Tier>" + a 🔒 instead. The picker is never empty.
	for id in BuildingConfig.ALL_BUILD_IDS:
		# Skip rats-hazard buildings here (parity with TownScreen — they have their own
		# gated section; the map picker offers the standard spawners/refiners).
		if BuildingConfig.is_hazard_building(id):
			continue
		card.add_child(_make_build_row(id))

## One building card in the picker (React parity): the produced-good icon (the port has no
## building art, so the building's output resource stands in — a Bakery shows bread), the
## name (Cinzel) + one-line description, the cost as resource chips, and the action — a Build
## button (enabled when game.can_build(id), else a disabled "Need items") for unlocked
## buildings, or "Requires <Tier>" + a 🔒 when tier-locked. Build wiring + the
## _action_buttons["build:<id>"] key are unchanged from the old flat rows.
func _make_build_row(id: String) -> PanelContainer:
	var info: Dictionary = BuildingConfig.BUILDINGS.get(id, {})
	var req_tier: int = BuildingConfig.unlock_tier(id)
	var tier_locked: bool = game.settlement.tier < req_tier

	var chip := PanelContainer.new()
	chip.add_theme_stylebox_override("panel", UiKit.row_box())
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	chip.add_child(row)

	# Icon — the produced good (bread/eggs/plank/…) as a building stand-in; 🏠 when none.
	var res: String = String(info.get("resource", ""))
	var icon: TextureRect = UiKit.make_icon(res, 34.0) if res != "" else null
	if icon != null:
		row.add_child(icon)
	else:
		var emoji := Label.new()
		emoji.text = "🏠"
		emoji.add_theme_font_size_override("font_size", 28)
		emoji.add_theme_color_override("font_color", Palette.INK_MID if tier_locked else Palette.INK)
		row.add_child(emoji)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 2)
	row.add_child(col)

	var name_lbl := Label.new()
	name_lbl.text = BuildingConfig.building_name(id)
	name_lbl.add_theme_font_size_override("font_size", 18)
	name_lbl.add_theme_color_override("font_color", Palette.INK if not tier_locked else Palette.INK_MID)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		name_lbl.add_theme_font_override("font", hf)
	col.add_child(name_lbl)

	var desc: String = String(info.get("desc", ""))
	if desc != "":
		var desc_lbl := Label.new()
		desc_lbl.text = desc
		desc_lbl.add_theme_font_size_override("font_size", 12)
		desc_lbl.add_theme_color_override("font_color", Palette.INK_MID)
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		col.add_child(desc_lbl)

	if tier_locked:
		col.add_child(_make_label("Requires %s" % TownConfig.tier_name(req_tier), Palette.INK_MID))
	else:
		col.add_child(_make_cost_chips(BuildingConfig.building_cost(id)))

	# Action: 🔒 when tier-locked, else a Build / "Need items" button (same wiring as before).
	if tier_locked:
		var lock := Label.new()
		lock.text = "🔒"
		lock.add_theme_font_size_override("font_size", 20)
		lock.add_theme_color_override("font_color", Palette.INK_MID)
		row.add_child(lock)
	else:
		var build_btn := Button.new()
		var affordable: bool = game.can_build(id)
		build_btn.text = "Build" if affordable else "Need items"
		build_btn.disabled = not affordable
		build_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		UiKit.style_action_button(build_btn, Palette.GO_GREEN, 6, 0)
		build_btn.connect("pressed", Callable(self, "_do_build").bind(id))
		row.add_child(build_btn)
		_action_buttons["build:" + id] = build_btn

	return chip

## Render a cost Dictionary {resource:qty} as a row of icon+×N chips (matching the React
## cost block); empty → a muted "free". Falls back to a text name when an icon is missing.
func _make_cost_chips(cost: Dictionary) -> Control:
	if cost.is_empty():
		return _make_label("free", Palette.MOSS)
	var box := HBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	for k in cost.keys():
		var one := HBoxContainer.new()
		one.add_theme_constant_override("separation", 3)
		var ic: TextureRect = UiKit.make_icon(String(k), 20.0)
		if ic != null:
			one.add_child(ic)
		var lbl := Label.new()
		lbl.text = ("×%d" % int(cost[k])) if ic != null else ("%s ×%d" % [UiKit.pretty_name(String(k)), int(cost[k])])
		lbl.add_theme_font_size_override("font_size", 15)
		lbl.add_theme_color_override("font_color", Palette.INK)
		one.add_child(lbl)
		box.add_child(one)
	return box

## The prominent "Build" button (bottom-right) was pressed: open the build picker for the
## first EMPTY plot — exactly what a click on an empty lot resolves to (lot index ==
## built_count is the first un-built slot). When every plot is full the picker still opens
## and shows the "No free plots — demolish one first." hint (parity with the click path).
func _on_build_button() -> void:
	if game == null or _map == null:
		return
	_open_build_picker_for_lot(_map.built_count())

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
