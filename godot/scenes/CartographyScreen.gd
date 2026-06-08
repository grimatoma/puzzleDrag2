extends CanvasLayer
## The CARTOGRAPHY world-map modal — a MINIMAL ADDITIVE slice that visualizes the three
## ported zones (home / mine / harbor from CartographyConfig) and serves as an ALTERNATE
## entry point into the EXISTING expeditions. A parchment card over a warm scrim, modelled
## EXACTLY on scenes/AchievementsScreen.gd: `extends CanvasLayer`, a build-once static
## shell (`setup(g)` → `_build_shell()` once → `refresh()`), `open()` re-renders, a
## `closed` signal, and a close Button registered in `_action_buttons["close"]`.
##
## NO class_name on purpose — Main preloads this script (preload(".../CartographyScreen.gd"))
## so the port never needs an --import pass to register a new global (mirrors AchievementsScreen
## / TileCollection / Chronicle / Townsfolk).
##
## Two pieces inside the card:
##   1. A MAP panel (a nested Control whose `_draw` paints the CartographyConfig.EDGES as
##      roads, then each ZONE as a labelled, kind-tinted node circle positioned by its
##      0..100 x/y fitted into the panel; the CURRENT zone — CartographyConfig.current_id(
##      game.active_biome) — gets a gold "you are here" ring).
##   2. A ROW per zone: name + a context-aware travel button:
##        • home   → disabled "🏡 … — home" / "You are here" when current.
##        • mine   → 🔒 locked (town2_complete false) / ⛏ Enter the Mine (can_enter_mine())
##                   / a disabled "need supplies / leave biome" hint otherwise.
##        • harbor → same shape with can_enter_harbor() / ⚓ Sail to the Harbor.
##      An ENABLED travel button emits `travel_requested(zone_id)`; the screen stays DECOUPLED
##      from GameState mutation — Main performs the real enter_mine/enter_harbor + biome
##      refresh (the SAME path the TownScreen expedition uses).
##
## Headless-test contract. Buttons live in `_action_buttons` under stable keys: "close",
## "travel:mine", "travel:harbor" (home has no actionable travel button). The screen exposes
## pure helpers — current_zone_id(), is_current(id), zone_is_travelable(id) — and tracks the
## drawn node screen-centres in `_node_centers` (id → Vector2) so a test can assert the
## current zone is the highlighted one. REAL DATA: zones from CartographyConfig, gating from
## GameState (town2_complete / can_enter_mine / can_enter_harbor / active_biome). Nothing faked.

var game: GameState

signal closed
## Emitted when an ENABLED travel button is pressed. Argument is the zone id ("mine"/"harbor").
## Main is the single mutation point: it calls game.enter_mine()/enter_harbor() + refreshes the
## biome, exactly like the TownScreen expedition's state_changed → _on_town_changed path.
signal travel_requested(zone_id)

## action id → Button, for headless tests. Keys: "close", "travel:mine", "travel:harbor".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each refresh().
var _body: VBoxContainer
var _map: Control                       ## the nested _draw map panel
var _built: bool = false

## id:String → the rendered screen-space node centre, recomputed each map _draw. Lets a test
## (or the highlight) find a zone's drawn position. Filled by _MapView during draw.
var _node_centers: Dictionary = {}

# ── parchment palette (matches AchievementsScreen / InventoryScreen journal tokens) ──
const COL_TITLE := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY := Palette.INK
const COL_MUTED := Palette.INK_MID
const COL_VALUE := Palette.GOLD
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 560.0
const MAP_HEIGHT := 300.0

# Per-kind node tint (home warm ember, mine grey iron, harbor sea blue) — echoes the
# React NODE_COLORS for the three ported kinds.
const KIND_TINT := {
	"home": Color8(0xbb, 0x3b, 0x2f),     # warm
	"mine": Color8(0x7c, 0x83, 0x88),     # grey
	"harbor": Color8(0x4a, 0x8a, 0xaa),   # blue
}

# Warm cartography palette (a sandy aged-map field + warm roads), replacing the flat pale
# page so the map reads as warm parchment territory.
const MAP_FIELD := Color8(0xe9, 0xd9, 0xb4)        # warm sand field
const MAP_FIELD_EDGE := Color8(0xcf, 0xb9, 0x8c)   # darker frame band for depth
const ROAD_WALK := Color8(0xb0, 0x8a, 0x52)        # walkable road core (warm tan)
const ROAD_DIRT := Color8(0x8a, 0x6a, 0x3a, 0xcc)  # walkable road underlay (dirt)
const ROAD_WAIT := Color8(0xa1, 0x8a, 0x63)        # waiting road (muted, drawn dashed)
const NODE_READY_RIM := Palette.GOLD               # "ready" zones get a gold rim
const NODE_LOCKED := Color8(0x9a, 0x90, 0x7e)      # locked zones desaturate to muted grey

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render. Safe to call again.
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

	# Opaque VIEW background (not a dim modal scrim). The world map is one of the five
	# persistent bottom-nav VIEWS, so it paints the warm app-frame parchment over the
	# board. It reserves UiKit.TOPBAR_RESERVE at the TOP so the persistent layer-1 HUD top
	# bar shows ABOVE the view, and stops UiKit.NAV_RESERVE short of the bottom so the
	# persistent nav bar (a LOWER CanvasLayer) shows through + stays tappable;
	# MOUSE_FILTER_STOP eats clicks in the band it covers.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_top = UiKit.TOPBAR_RESERVE   # reveal the persistent HUD top bar above
	backdrop.offset_bottom = -UiKit.NAV_RESERVE  # leave the bottom nav strip unpainted
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-bleed view content: a full-rect Control holds a panel pinned edge-to-edge (no card
	# margins), reserving the top-bar band + bottom-nav strip.
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
	# shadow, so it reads as a full-brightness page under the persistent top bar.
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var width_cap := UiKit.make_width_cap()
	panel.add_child(width_cap)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Fill the card's full height so the map can expand into it (otherwise the map +
	# three zone rows hug the top and leave a large empty parchment void below).
	root_vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 12)
	width_cap.add_child(root_vbox)

	# Title row: "🧭 World Map" heading spanning the row. The visible "✕ Close" is GONE — a
	# primary nav VIEW is left via the bottom nav / ESC-back, not a card close button. A
	# non-rendered close Button is still created + wired below so ESC/back, the "board"
	# deep-link, and the headless tests (which press _action_buttons["close"]) keep working.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "🧭 World Map"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	# Hidden close affordance — created + wired but NOT added to the visible row, so it never
	# renders yet still backs ESC/back, apply_deeplink("board"), and the close-button tests.
	var close_btn := Button.new()
	close_btn.visible = false
	close_btn.connect("pressed", Callable(self, "close"))
	_action_buttons["close"] = close_btn

	# Flavor subtitle under the title (parity with React's cartography lede).
	var subtitle := Label.new()
	subtitle.text = "Roads link the vale — chart your expeditions from here."
	subtitle.add_theme_font_size_override("font_size", 15)
	subtitle.add_theme_color_override("font_color", COL_MUTED)
	root_vbox.add_child(subtitle)

	# The map panel: a nested Control that paints the roads + node circles in its _draw.
	# Wrapped in a parchment-soft card so it reads as a framed map within the journal.
	var map_card := PanelContainer.new()
	map_card.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PAPER))
	map_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Grow the map to absorb the spare height (it keeps MAP_HEIGHT as a floor); the
	# zone rows below stay at their natural height pinned under the expanded map.
	map_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(map_card)

	_map = _MapView.new()
	_map.screen = self
	_map.custom_minimum_size = Vector2(0, MAP_HEIGHT)
	_map.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_map.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_card.add_child(_map)

	# Legend — a wrapping row keying the node states (lit hearth / ready / locked) and the
	# two road styles (a solid walkable road vs a dashed road still waiting to be opened).
	root_vbox.add_child(_build_legend())

	# The dynamic body — the per-zone travel rows hang off this, cleared + rebuilt each refresh.
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 8)
	root_vbox.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Repaint the map + rebuild the per-zone rows from CartographyConfig + live GameState.
func refresh() -> void:
	if not _built or game == null:
		return
	# Rebuild the travel rows.
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_action_buttons.erase("travel:mine")
	_action_buttons.erase("travel:harbor")

	for z in CartographyConfig.all():
		_body.add_child(_make_zone_row(z as Dictionary))

	# Repaint the map (re-highlights the current zone).
	if _map != null:
		_map.queue_redraw()

## One zone row: a soft-parchment chip with the kind-tinted icon + name (+ "◉ here" when
## current) and a context-aware travel button. The button's enabled state + label come
## straight from GameState; an ENABLED press emits `travel_requested(id)`.
func _make_zone_row(z: Dictionary) -> PanelContainer:
	var id: String = String(z.get("id", ""))
	var zname: String = String(z.get("name", id))
	var icon: String = String(z.get("icon", ""))
	var current: bool = is_current(id)

	var chip := PanelContainer.new()
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	chip.add_child(row)

	# Icon dot — a small kind-tinted swatch label so the row matches the map node colour.
	var icon_lbl := Label.new()
	icon_lbl.text = icon
	icon_lbl.add_theme_font_size_override("font_size", 22)
	icon_lbl.add_theme_color_override("font_color", KIND_TINT.get(String(z.get("kind", "")), COL_BODY))
	row.add_child(icon_lbl)

	var name_lbl := Label.new()
	name_lbl.text = ("◉ %s" % zname) if current else zname
	name_lbl.add_theme_font_size_override("font_size", 18)
	name_lbl.add_theme_color_override("font_color", COL_VALUE if current else COL_BODY)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_lbl)

	var btn := Button.new()
	btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(btn, Palette.EMBER, 6, 16, true)   # with_disabled so disabled states read
	_configure_travel_button(btn, id, current)
	row.add_child(btn)

	return chip

## Set a travel button's label + disabled state + wiring for a zone, per the rules:
##   • home   → always disabled. "🏡 Hearthwood Vale — home" / "You are here" (current).
##   • mine   → 🔒 locked when not town2_complete; ⛏ Enter the Mine when can_enter_mine();
##              else a disabled "Need supplies / leave biome" hint.
##   • harbor → same shape with can_enter_harbor() / ⚓ Sail to the Harbor.
## Only ENABLED expedition buttons connect `pressed` → _on_travel_pressed(id); they're
## registered in _action_buttons under "travel:<id>" so a test can drive them.
func _configure_travel_button(btn: Button, id: String, current: bool) -> void:
	match id:
		"home":
			btn.text = "You are here" if current else "🏡 Hearthwood Vale — home"
			btn.disabled = true
		"mine":
			_configure_expedition_button(btn, id, "⛏ Enter the Mine", game.town2_complete and game.can_enter_mine())
			# town2_complete is the gate; surface it explicitly when locked.
			if not game.town2_complete:
				btn.text = "🔒 Defeat the boss to unlock"
				btn.disabled = true
		"harbor":
			_configure_expedition_button(btn, id, "⚓ Sail to the Harbor", game.town2_complete and game.can_enter_harbor())
			if not game.town2_complete:
				btn.text = "🔒 Defeat the boss to unlock"
				btn.disabled = true

## Shared expedition-button setup (mine + harbor share the shape): when `enabled`, the
## button reads `active_label`, is clickable, and emits travel_requested on press; when
## disabled (but unlocked), it reads a "need supplies / leave biome" hint. The locked
## (not town2_complete) case is overridden by the caller AFTER this.
func _configure_expedition_button(btn: Button, id: String, active_label: String, enabled: bool) -> void:
	if enabled:
		btn.text = active_label
		btn.disabled = false
		btn.connect("pressed", Callable(self, "_on_travel_pressed").bind(id))
		_action_buttons["travel:" + id] = btn
	else:
		# Unlocked but not launchable right now — the only remaining reasons are: not on
		# the farm (already on an expedition) or no supplies. A single honest hint.
		btn.text = "Need supplies / on the farm"
		btn.disabled = true

func _on_travel_pressed(id: String) -> void:
	emit_signal("travel_requested", id)

# ── legend ──────────────────────────────────────────────────────────────────────

## A wrapping legend keying the three node states and the two road styles. Each item is a
## tiny drawn swatch + a muted label; the swatches reuse the same colours the map draws.
func _build_legend() -> Control:
	var flow := HFlowContainer.new()
	flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	flow.add_theme_constant_override("h_separation", 14)
	flow.add_theme_constant_override("v_separation", 4)
	flow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for spec in [["current", "Lit hearth"], ["ready", "Ready"], ["locked", "Locked"],
			["road", "Traveled"], ["road_wait", "Waiting"]]:
		flow.add_child(_legend_item(String(spec[0]), String(spec[1])))
	return flow

## One legend item: a 22×16 drawn swatch + its label.
func _legend_item(kind: String, label: String) -> HBoxContainer:
	var item := HBoxContainer.new()
	item.add_theme_constant_override("separation", 5)
	item.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sw := Control.new()
	sw.custom_minimum_size = Vector2(22, 16)
	sw.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sw.draw.connect(_draw_legend_swatch.bind(sw, kind))
	item.add_child(sw)
	var lbl := Label.new()
	lbl.text = label
	lbl.add_theme_font_size_override("font_size", 12)
	lbl.add_theme_color_override("font_color", COL_MUTED)
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	item.add_child(lbl)
	return item

## Paint one legend swatch (a node dot or a road line) onto its Control.
func _draw_legend_swatch(sw: Control, kind: String) -> void:
	var c := Vector2(11.0, sw.size.y * 0.5)
	match kind:
		"current":
			sw.draw_arc(c, 7.0, 0.0, TAU, 24, Palette.GOLD_BRIGHT, 2.0, true)
			sw.draw_circle(c, 4.5, KIND_TINT["home"])
		"ready":
			sw.draw_circle(c, 5.5, KIND_TINT["mine"])
			sw.draw_arc(c, 5.5, 0.0, TAU, 24, NODE_READY_RIM, 2.0, true)
		"locked":
			sw.draw_circle(c, 5.5, NODE_LOCKED)
			sw.draw_arc(c, 5.5, 0.0, TAU, 24, Palette.IRON, 1.5, true)
		"road":
			sw.draw_line(Vector2(1.0, c.y), Vector2(21.0, c.y), ROAD_WALK, 3.0, true)
		"road_wait":
			_draw_dashed_on(sw, Vector2(1.0, c.y), Vector2(21.0, c.y), ROAD_WAIT, 2.5, 4.0, 3.0)

## Draw a dashed line on any CanvasItem `ci` (used by both the legend and the map). Walks
## from `from` to `to` painting `dash`-long segments separated by `gap`.
func _draw_dashed_on(ci: CanvasItem, from: Vector2, to: Vector2, col: Color, width: float, dash: float, gap: float) -> void:
	var dir := to - from
	var length := dir.length()
	if length <= 0.0:
		return
	var unit := dir / length
	var step := dash + gap
	var d := 0.0
	while d < length:
		var seg_end := minf(d + dash, length)
		ci.draw_line(from + unit * d, from + unit * seg_end, col, width, true)
		d += step

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## The zone id the player is currently at, from GameState.active_biome.
func current_zone_id() -> String:
	if game == null:
		return "home"
	return CartographyConfig.current_id(game.active_biome)

## True when zone `id` is the player's current location.
func is_current(id: String) -> bool:
	return current_zone_id() == id

## True when zone `id` can be travelled to RIGHT NOW (an enabled travel button would show).
## home is never "travelable" (you go home by ending an expedition); mine/harbor require
## town2_complete AND the GameState launch guard.
func zone_is_travelable(id: String) -> bool:
	if game == null:
		return false
	match id:
		"mine":
			return game.town2_complete and game.can_enter_mine()
		"harbor":
			return game.town2_complete and game.can_enter_harbor()
		_:
			return false

## Map-display state for a zone, driving the node tint, the legend, and the road style:
##   "current" — the player is here (the lit hearth / "you are here" gold ring),
##   "ready"   — unlocked + walkable (home is always reachable; an expedition once the
##               capstone boss is down — town2_complete),
##   "locked"  — not yet unlocked (the boss isn't defeated → a dashed "waiting" road).
func zone_state(id: String) -> String:
	if is_current(id):
		return "current"
	if id == "home":
		return "ready"               # home is always walkable (end an expedition to return)
	if game != null and game.town2_complete:
		return "ready"
	return "locked"

# ── nested map view (the _draw painter) ────────────────────────────────────────
## A tiny Control whose _draw paints the world map: EDGES as roads, ZONES as labelled
## kind-tinted node circles fit from 0..100 layout space into the panel rect, and the
## current zone wrapped in a gold "you are here" ring. Records each node's drawn
## screen-centre back onto the parent screen's _node_centers so tests/highlights can find
## them. Reads everything from `screen.game` + CartographyConfig — no state of its own.
class _MapView extends Control:
	var screen   ## the owning CartographyScreen (for game + _node_centers)

	## Fit the zones' bounding box into the panel rect (scaled + CENTRED to fill it), with a
	## small inset so node labels don't clip the edges. This is what spreads the cluster out
	## across the whole map instead of leaving it crammed in one corner with a big void.
	func _fit_centers() -> Dictionary:
		const PAD := 26.0
		const INSET_X := 0.16    # keep nodes off the L/R edges so labels have room
		const INSET_Y := 0.14
		var minx := INF
		var miny := INF
		var maxx := -INF
		var maxy := -INF
		for z in CartographyConfig.all():
			var x := float(z.get("x", 0.0))
			var y := float(z.get("y", 0.0))
			minx = minf(minx, x)
			maxx = maxf(maxx, x)
			miny = minf(miny, y)
			maxy = maxf(maxy, y)
		var spanx := maxf(1.0, maxx - minx)
		var spany := maxf(1.0, maxy - miny)
		var w := maxf(1.0, size.x - 2.0 * PAD)
		var h := maxf(1.0, size.y - 2.0 * PAD)
		var out: Dictionary = {}
		for z in CartographyConfig.all():
			var nx: float = (float(z.get("x", 0.0)) - minx) / spanx      # 0..1 across the bbox
			var ny: float = (float(z.get("y", 0.0)) - miny) / spany
			nx = INSET_X + nx * (1.0 - 2.0 * INSET_X)
			ny = INSET_Y + ny * (1.0 - 2.0 * INSET_Y)
			out[String(z.get("id", ""))] = Vector2(PAD + nx * w, PAD + ny * h)
		return out

	func _draw() -> void:
		if screen == null:
			return
		# Warm aged-map field + a darker inner frame band for depth.
		draw_rect(Rect2(Vector2.ZERO, size), screen.MAP_FIELD, true)
		draw_rect(Rect2(Vector2.ONE * 1.5, size - Vector2.ONE * 3.0), screen.MAP_FIELD_EDGE, false, 5.0)

		var centers := _fit_centers()

		# Roads (under the nodes). A SOLID walkable road when the destination is unlocked;
		# a DASHED "waiting" road when it's still locked (boss not yet down).
		for e in CartographyConfig.EDGES:
			var a_id: String = String(e[0])
			var b_id: String = String(e[1])
			if not centers.has(a_id) or not centers.has(b_id):
				continue
			var a: Vector2 = centers[a_id]
			var b: Vector2 = centers[b_id]
			# Home is always reachable, so the NON-home endpoint sets the road state.
			var dest: String = b_id if a_id == "home" else a_id
			if screen.zone_state(dest) == "locked":
				screen._draw_dashed_on(self, a, b, screen.ROAD_WAIT, 3.0, 9.0, 7.0)
			else:
				draw_line(a, b, screen.ROAD_DIRT, 7.0, true)    # dirt underlay
				draw_line(a, b, screen.ROAD_WALK, 3.5, true)    # walkable core

		var current_id: String = screen.current_zone_id()

		# Nodes — a kind-tinted disc; the current one wrapped in a gold "you are here" ring,
		# "ready" zones rimmed in gold, "locked" zones desaturated with an iron rim.
		for z in CartographyConfig.all():
			var id: String = String(z.get("id", ""))
			var c: Vector2 = centers[id]
			var state: String = screen.zone_state(id)
			var tint: Color = screen.KIND_TINT.get(String(z.get("kind", "")), Palette.INK)
			if state == "locked":
				tint = screen.NODE_LOCKED
			var r := 20.0
			if state == "current":
				draw_arc(c, r + 7.0, 0.0, TAU, 48, Palette.GOLD_BRIGHT, 4.0, true)
			draw_circle(c, r, tint)
			var rim: Color = screen.NODE_READY_RIM if state == "ready" else Palette.IRON
			draw_arc(c, r, 0.0, TAU, 48, rim, 2.5 if state == "ready" else 2.0, true)
			# Icon glyph centred on the disc.
			_draw_centered_text(String(z.get("icon", "")), c, 20, Palette.PARCHMENT)
			# Name below the node (gold for the current zone).
			var label := String(z.get("name", id))
			if id == current_id:
				label = "◉ " + label
			_draw_centered_text(label, c + Vector2(0.0, r + 16.0), 13,
				Palette.GOLD if id == current_id else Palette.INK)

		# Publish the drawn centres for tests / the highlight.
		if screen._node_centers is Dictionary:
			screen._node_centers = centers

	# Draw `text` horizontally centred on `pos` (baseline a touch below centre) with the
	# fallback font. No-op when no font is available (the disc + ring still read).
	func _draw_centered_text(text: String, pos: Vector2, fs: int, col: Color) -> void:
		var font := ThemeDB.fallback_font
		if font == null or text == "":
			return
		var w: float = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string(font, pos + Vector2(-w / 2.0, fs * 0.35), text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
