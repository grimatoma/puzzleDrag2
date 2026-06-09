extends CanvasLayer
## The CARTOGRAPHY world map — T26: the FULL illustrated 11-node parchment map (was a trimmed
## 3-node hub). A from-config render of CartographyConfig: REGIONS as soft blobs, the 14 roads
## as dashed/solid lines, 11 node PINS state-styled by the live travel state (hidden=fogged,
## discovered=outline, visited=filled, current=highlighted), a legend, and a per-node DETAIL
## PANEL (name + lore subtitle + flavour quote + kind + level + entry cost + dangers + a
## Travel/Enter button gated by the travel rules). A parchment VIEW (one of the persistent
## bottom-nav primary views), modelled on the prior CartographyScreen + AchievementsScreen:
## `extends CanvasLayer`, a build-once static shell (`setup(g)` → `_build_shell()` once →
## `refresh()`), `open()` re-renders, a `closed` signal, and a hidden close Button registered in
## `_action_buttons["close"]` (a primary VIEW is left via the bottom nav / ESC-back).
##
## NO class_name on purpose — Main preloads this script so the port never needs an --import pass
## to register a new global (mirrors AchievementsScreen / TileCollection / Chronicle / Townsfolk).
##
## DECOUPLED mutation: the screen never mutates GameState. The DETAIL panel's Travel/Enter button
## emits `travel_requested(node_id)`; Main is the single mutation point — it calls game.travel_to,
## then runs the biome-change refresh / boss-start / toast. Everything the screen reads (the node
## states, the gating, the current node) comes from the live GameState (map_current /
## map_node_state / travel_block_reason / can_travel_to / coins / player_level). Nothing faked.
##
## Headless-test contract. Buttons live in `_action_buttons` under stable keys: "close" and —
## when the selected node is travelable — "travel:<id>" (the enabled detail-panel button). The
## screen exposes pure helpers — current_node_id(), is_current(id), node_state(id),
## selected_node_id(), select_node(id) — and tracks the drawn node screen-centres in
## `_node_centers` (id → Vector2). REAL DATA from CartographyConfig + GameState.

var game: GameState

signal closed
## Emitted when an ENABLED Travel/Enter button is pressed. Argument is the node id. Main is the
## single mutation point: it calls game.travel_to(id) + runs the biome/boss/toast follow-up.
signal travel_requested(node_id)
## T22 — emitted when the "Found Settlement" button is pressed for a discovered, unfounded
## settlement node. Argument is the node id. Main is the single mutation point: it opens the
## founder biome picker, then calls game.found_settlement(id, biome).
signal found_requested(node_id)

## action id → Button, for headless tests. Keys: "close", and "travel:<selected_id>" when the
## selected node is travelable RIGHT NOW.
var _action_buttons: Dictionary = {}

## The map panel (the nested _draw painter) + the dynamic detail-panel body.
var _map: Control
var _detail_body: VBoxContainer
var _built: bool = false

## The node the player has TAPPED/selected in the map (drives the detail panel). Defaults to the
## current node on each open(). A test can drive it via select_node(id).
var _selected: String = "home"

## id:String → the rendered screen-space node centre, recomputed each map _draw. Lets the tap
## hit-test + tests find a node's drawn position.
var _node_centers: Dictionary = {}

# ── parchment palette (matches AchievementsScreen / InventoryScreen journal tokens) ──
const COL_TITLE := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY := Palette.INK
const COL_MUTED := Palette.INK_MID
const COL_VALUE := Palette.GOLD
const COL_PANEL := Palette.PARCHMENT
const MAP_HEIGHT := 320.0

# Warm cartography field colours (a sandy aged-map frame behind the region blobs).
const MAP_FIELD := Color8(0xe9, 0xd9, 0xb4)        # warm sand field
const MAP_FIELD_EDGE := Color8(0xcf, 0xb9, 0x8c)   # darker frame band for depth
const ROAD_OPEN := Color8(0xb0, 0x8a, 0x52)        # an OPEN road (between two reachable nodes)
const ROAD_OPEN_UNDER := Color8(0x8a, 0x6a, 0x3a, 0xcc)  # the open-road dirt underlay
const ROAD_WAIT := Color8(0xa1, 0x8a, 0x63)        # a road into the fog (drawn dashed)
const NODE_HIDDEN := Color8(0x9a, 0x90, 0x7e)      # a hidden node's fogged disc

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
	# Default the selection to the current node each time the view is opened.
	if game != null:
		_selected = current_node_id()
	refresh()

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                   # modal, above the HUD (layer 1)
	visible = false

	# Opaque VIEW background — the world map is one of the persistent bottom-nav VIEWS, so it
	# paints the warm app-frame parchment over the board. Reserve the top-bar band + bottom-nav
	# strip so the persistent HUD top bar + nav bar show; MOUSE_FILTER_STOP eats clicks here.
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
	style.set_content_margin_all(16)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var width_cap := UiKit.make_width_cap()
	panel.add_child(width_cap)

	# A vertical scroll so the map + legend + detail panel never overflow on a short viewport.
	var scroll := UiKit.make_vscroll()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	width_cap.add_child(scroll)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 12)
	scroll.add_child(root_vbox)

	# Title + flavour lede.
	var title := Label.new()
	title.text = "🧭 World Map"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	root_vbox.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "Chart the Long Return — tap a place to read it, then travel its road."
	subtitle.add_theme_font_size_override("font_size", 15)
	subtitle.add_theme_color_override("font_color", COL_MUTED)
	root_vbox.add_child(subtitle)

	# Hidden close affordance — created + wired but NOT added to the visible tree, so it never
	# renders yet still backs ESC/back, apply_deeplink("board"), and the close-button tests.
	var close_btn := Button.new()
	close_btn.visible = false
	close_btn.connect("pressed", Callable(self, "close"))
	_action_buttons["close"] = close_btn

	# The map panel: a nested Control that paints the regions + roads + node pins in its _draw.
	var map_card := PanelContainer.new()
	map_card.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PAPER))
	map_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(map_card)

	_map = _MapView.new()
	_map.screen = self
	_map.custom_minimum_size = Vector2(0, MAP_HEIGHT)
	_map.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# The map ACCEPTS clicks (tap a pin to select it) — STOP, not IGNORE.
	_map.mouse_filter = Control.MOUSE_FILTER_STOP
	map_card.add_child(_map)

	# Legend keying the four node states + the two road styles.
	root_vbox.add_child(_build_legend())

	# The per-node DETAIL panel — a parchment card rebuilt each refresh() from the selected node.
	var detail_card := PanelContainer.new()
	detail_card.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PARCHMENT_SOFT))
	detail_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(detail_card)

	_detail_body = VBoxContainer.new()
	_detail_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_body.add_theme_constant_override("separation", 6)
	detail_card.add_child(_detail_body)

# ── render ────────────────────────────────────────────────────────────────────

## Repaint the map + rebuild the detail panel from the live travel state.
func refresh() -> void:
	if not _built or game == null:
		return
	# Keep the selection valid (a real node); default to the current node.
	if not CartographyConfig.has_node(_selected):
		_selected = current_node_id()
	_rebuild_detail()
	if _map != null:
		_map.queue_redraw()

## Select a node (the map tap target / a test driver) and re-render the detail panel + map.
func select_node(node_id: String) -> void:
	if not CartographyConfig.has_node(node_id):
		return
	_selected = node_id
	refresh()

# ── detail panel ────────────────────────────────────────────────────────────────

## Rebuild the detail panel for the selected node: name + kind/level/cost row, lore subtitle,
## flavour quote, description, dangers, and a context-aware Travel/Enter button.
func _rebuild_detail() -> void:
	for child in _detail_body.get_children():
		_detail_body.remove_child(child)
		child.queue_free()
	_action_buttons.erase("travel:" + _selected)
	# Drop any stale travel:* / found:* keys from a previous selection.
	for k in _action_buttons.keys():
		if String(k).begins_with("travel:") or String(k).begins_with("found:"):
			_action_buttons.erase(k)

	var node: Dictionary = CartographyConfig.by_id(_selected)
	if node.is_empty():
		return
	var nid: String = _selected
	var kind: String = String(node.get("kind", ""))
	var state: String = node_state(nid)

	# Header: icon + name (+ "◉ here" when current).
	var head := HBoxContainer.new()
	head.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_theme_constant_override("separation", 8)
	_detail_body.add_child(head)

	var icon_lbl := Label.new()
	icon_lbl.text = String(node.get("icon", ""))
	icon_lbl.add_theme_font_size_override("font_size", 26)
	icon_lbl.add_theme_color_override("font_color", CartographyConfig.NODE_COLORS.get(kind, COL_BODY))
	head.add_child(icon_lbl)

	var name_lbl := Label.new()
	var nm: String = String(node.get("name", nid))
	name_lbl.text = ("◉ %s" % nm) if is_current(nid) else nm
	name_lbl.add_theme_font_size_override("font_size", 22)
	name_lbl.add_theme_color_override("font_color", COL_VALUE if is_current(nid) else COL_TITLE)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(name_lbl)

	# Lore subtitle.
	var lore: Dictionary = CartographyConfig.lore_for(nid)
	if not lore.is_empty():
		var sub := Label.new()
		sub.text = String(lore.get("subtitle", ""))
		sub.add_theme_font_size_override("font_size", 13)
		sub.add_theme_color_override("font_color", COL_HEADER)
		_detail_body.add_child(sub)

	# Kind / level / cost meta row.
	var meta := Label.new()
	var meta_parts: Array = [CartographyConfig.KIND_LABELS.get(kind, kind)]
	meta_parts.append("Level %d" % CartographyConfig.level_req(nid))
	var cost: int = CartographyConfig.entry_cost(nid)
	if cost > 0:
		meta_parts.append("%d coins" % cost)
	else:
		meta_parts.append("free")
	meta.text = "  ·  ".join(meta_parts)
	meta.add_theme_font_size_override("font_size", 13)
	meta.add_theme_color_override("font_color", COL_MUTED)
	_detail_body.add_child(meta)

	# Description.
	var desc := Label.new()
	desc.text = String(node.get("description", ""))
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.add_theme_font_size_override("font_size", 14)
	desc.add_theme_color_override("font_color", COL_BODY)
	_detail_body.add_child(desc)

	# Flavour quote (the epitaph + speaker).
	if not lore.is_empty():
		var quote := Label.new()
		var speaker: String = String(lore.get("speaker", ""))
		quote.text = "“%s”%s" % [String(lore.get("epitaph", "")), ("  — " + speaker) if speaker != "" else ""]
		quote.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		quote.add_theme_font_size_override("font_size", 13)
		quote.add_theme_color_override("font_color", COL_MUTED)
		_detail_body.add_child(quote)

	# Dangers.
	var dangers: Array = node.get("dangers", [])
	if not dangers.is_empty():
		var dl := Label.new()
		dl.text = "⚠ Dangers: " + ", ".join(_humanize_list(dangers))
		dl.add_theme_font_size_override("font_size", 12)
		dl.add_theme_color_override("font_color", Palette.EMBER)
		_detail_body.add_child(dl)

	# T22 — Founding affordance: a discovered/visited, UNFOUNDED settlement node (farm/mine/harbor)
	# shows the per-zone settlement status + a "Found Settlement" button (or a muted reason). A
	# FOUNDED settlement shows its biome + completion status. home is always founded (never shown
	# as foundable). Non-settlement nodes (event/festival/boss/capital) skip this block entirely.
	if game != null and CartographyConfig.settlement_type_for_zone(nid) != "" and state != "hidden":
		_detail_body.add_child(_make_settlement_section(nid))

	# The Travel/Enter button (or a disabled reason hint).
	_detail_body.add_child(_make_travel_button(nid, kind, state))

## The context-aware Travel/Enter button for the selected node. When travel is allowed it reads
## a kind-appropriate verb, is enabled, emits travel_requested on press, and registers under
## "travel:<id>". When blocked it shows a muted reason + stays disabled. The current node shows
## a disabled "You are here". Mirrors the React travel gate (slice.ts) surfaced as button state.
func _make_travel_button(nid: String, kind: String, _state: String) -> Button:
	var btn := Button.new()
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var reason: String = game.travel_block_reason(nid)

	if reason == "here":
		btn.text = "You are here"
		btn.disabled = true
		UiKit.style_button(btn, Palette.EMBER, 8, 16, true)
		return btn

	if reason == "":
		# Travelable now — a positive call-to-action.
		btn.text = _travel_verb(kind, nid)
		btn.disabled = false
		UiKit.style_action_button(btn, _accent_for(kind), 8, 16)
		btn.connect("pressed", Callable(self, "_on_travel_pressed").bind(nid))
		_action_buttons["travel:" + nid] = btn
		return btn

	# Blocked — show why, disabled.
	btn.text = _block_label(reason, nid)
	btn.disabled = true
	UiKit.style_button(btn, Palette.IRON, 8, 16, true)
	return btn

## The button verb for a travelable node, by kind: Enter the board for a board node, the activity
## verb for a non-board node, or plain "Travel" elsewhere. Fast-travel (already visited) reads
## "Travel to <name>" so it's clear it's a free hop. (Batch 9 C5: the verb table now lives in
## CartographyConfig — this resolves the fast/visited flag and delegates.)
func _travel_verb(kind: String, nid: String) -> String:
	return CartographyConfig.travel_verb(kind, game.map_visited(nid))

## A short muted reason label for a blocked travel button. (Batch 9 C5: the reason→label table
## now lives in CartographyConfig beside the gate data it reads.)
func _block_label(reason: String, nid: String) -> String:
	return CartographyConfig.block_label(reason, nid)

func _on_travel_pressed(nid: String) -> void:
	emit_signal("travel_requested", nid)

# ── T22 founding section ─────────────────────────────────────────────────────────

## The settlement status + founding affordance for a settlement node `nid`. A FOUNDED settlement
## shows its biome name + a "✓ Founded" / "★ Complete" status. An UNFOUNDED one shows the founding
## cost + a "Found Settlement" button when the player can found it now (prior settlement complete +
## affordable), else a muted reason. home is reported as always-founded. Reads everything live from
## GameState — never mutates; the button emits `found_requested(nid)`.
func _make_settlement_section(nid: String) -> Control:
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_theme_constant_override("separation", 4)
	var type: String = CartographyConfig.settlement_type_for_zone(nid)

	if game.is_settlement_founded(nid):
		# Founded — show its biome + completion status.
		var biome_id: String = game.settlement_biome_id(nid)
		var biome: Dictionary = CartographyConfig.biome_def(type, biome_id)
		var biome_label: String = "%s %s" % [String(biome.get("icon", "")), String(biome.get("name", biome_id))] if not biome.is_empty() else biome_id
		var done: bool = game.settlement_completed(nid)
		var status := Label.new()
		status.text = ("★ Complete · %s settlement" % biome_label) if done else ("✓ Founded · %s settlement" % biome_label)
		status.add_theme_font_size_override("font_size", 13)
		status.add_theme_color_override("font_color", COL_VALUE if done else COL_HEADER)
		box.add_child(status)
		return box

	# Unfounded settlement — show the cost + a Found button (or a muted reason).
	var cost: int = game.settlement_founding_cost()
	var can_pay: bool = game.coins >= cost
	var prior_done: bool = game.completed_settlement_count() >= 1
	var btn := Button.new()
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if not prior_done:
		btn.text = "🔒 Complete a settlement first"
		btn.disabled = true
		UiKit.style_button(btn, Palette.IRON, 8, 16, true)
	elif not can_pay:
		btn.text = "🔒 Found Settlement (%d 🪙)" % cost
		btn.disabled = true
		UiKit.style_button(btn, Palette.IRON, 8, 16, true)
	else:
		btn.text = "🪙 Found Settlement (%d)" % cost
		btn.disabled = false
		UiKit.style_action_button(btn, Palette.EMBER, 8, 16)
		btn.connect("pressed", Callable(self, "_on_found_pressed").bind(nid))
		_action_buttons["found:" + nid] = btn
	box.add_child(btn)
	return box

func _on_found_pressed(nid: String) -> void:
	emit_signal("found_requested", nid)

# ── legend ──────────────────────────────────────────────────────────────────────

func _build_legend() -> Control:
	var flow := HFlowContainer.new()
	flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	flow.add_theme_constant_override("h_separation", 14)
	flow.add_theme_constant_override("v_separation", 4)
	flow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for spec in [["current", "You are here"], ["visited", "Visited"], ["discovered", "Discovered"],
			["hidden", "Unknown"], ["road", "Open road"], ["road_wait", "Into the fog"]]:
		flow.add_child(_legend_item(String(spec[0]), String(spec[1])))
	return flow

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

func _draw_legend_swatch(sw: Control, kind: String) -> void:
	var c := Vector2(11.0, sw.size.y * 0.5)
	match kind:
		"current":
			sw.draw_arc(c, 7.0, 0.0, TAU, 24, Palette.GOLD_BRIGHT, 2.0, true)
			sw.draw_circle(c, 4.5, CartographyConfig.NODE_COLORS["home"])
		"visited":
			sw.draw_circle(c, 5.5, CartographyConfig.NODE_COLORS["farm"])
			sw.draw_arc(c, 5.5, 0.0, TAU, 24, Palette.GOLD, 1.5, true)
		"discovered":
			sw.draw_arc(c, 5.5, 0.0, TAU, 24, Palette.INK_MID, 2.0, true)
		"hidden":
			sw.draw_circle(c, 5.5, NODE_HIDDEN)
		"road":
			sw.draw_line(Vector2(1.0, c.y), Vector2(21.0, c.y), ROAD_OPEN, 3.0, true)
		"road_wait":
			_draw_dashed_on(sw, Vector2(1.0, c.y), Vector2(21.0, c.y), ROAD_WAIT, 2.5, 4.0, 3.0)

## Draw a dashed line on any CanvasItem `ci` (used by both the legend and the map).
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

## The node id the player is currently AT, from the live travel state (map_current). Falls back
## to the active_biome-derived node when game/map state is unavailable.
func current_node_id() -> String:
	if game == null:
		return "home"
	if String(game.map_current) != "" and CartographyConfig.has_node(game.map_current):
		return game.map_current
	return CartographyConfig.current_id(game.active_biome)

## True when node `id` is the player's current location.
func is_current(id: String) -> bool:
	return current_node_id() == id

## The currently-selected node id (drives the detail panel).
func selected_node_id() -> String:
	return _selected

## The map-display STATE for a node, driving the pin style + the legend:
##   "current"    — the player is here (the gold "you are here" ring),
##   "visited"    — been here before (a filled gold-rimmed disc; fast-travel target),
##   "discovered" — adjacent to a visited node, not yet visited (an outlined disc),
##   "hidden"     — not yet discovered (a fogged disc with a "?").
func node_state(id: String) -> String:
	if is_current(id):
		return "current"
	if game == null:
		return "hidden"
	return game.map_status(id)

## True when node `id` can be travelled to RIGHT NOW (an enabled travel button would show).
func node_is_travelable(id: String) -> bool:
	if game == null:
		return false
	return game.can_travel_to(id)

# ── input: tap a pin to select it ───────────────────────────────────────────────

## A tap inside the map panel — find the nearest drawn node centre within a hit radius and select
## it. Routed from _MapView._gui_input (the map panel is MOUSE_FILTER_STOP). One event type only
## (the mouse button), per the project's touch=mouse emulation note in CLAUDE.md.
func _on_map_tapped(pos: Vector2) -> void:
	var best_id: String = ""
	var best_d: float = 32.0   # hit radius (px)
	for id in _node_centers.keys():
		var c: Vector2 = _node_centers[id]
		var d: float = pos.distance_to(c)
		if d < best_d:
			best_d = d
			best_id = String(id)
	if best_id != "":
		select_node(best_id)

# ── small format helpers ────────────────────────────────────────────────────────

## The accent colour for a travelable button by kind (the node tint, ember for the boss).
func _accent_for(kind: String) -> Color:
	match kind:
		"boss":
			return Palette.EMBER
		_:
			return CartographyConfig.NODE_COLORS.get(kind, Palette.EMBER)

## Turn snake_case danger ids into Title Case words ("gas_vent" → "Gas Vent").
func _humanize_list(items: Array) -> Array:
	var out: Array = []
	for it in items:
		out.append(String(it).capitalize())
	return out

# ── nested map view (the _draw painter + tap input) ─────────────────────────────
## A Control whose _draw paints the world map: REGIONS as soft blobs, the EDGES as roads, the
## NODES as state-styled pins fit from 0..100 layout space into the panel rect. Records each
## node's drawn screen-centre back onto the parent screen's _node_centers so the tap hit-test +
## tests can find them. Routes a click to screen._on_map_tapped. Reads everything from
## `screen.game` + CartographyConfig — no state of its own.
class _MapView extends Control:
	var screen   ## the owning CartographyScreen

	## Fit the 0..100 layout bbox into the panel rect (scaled + centred), with a small inset so
	## node labels don't clip the edges.
	func _fit_centers() -> Dictionary:
		const PAD := 28.0
		const INSET_X := 0.06
		const INSET_Y := 0.10
		var w := maxf(1.0, size.x - 2.0 * PAD)
		var h := maxf(1.0, size.y - 2.0 * PAD)
		var out: Dictionary = {}
		for n in CartographyConfig.all():
			# Layout space is already a 0..100 viewBox — map straight into the inset rect.
			var nx: float = float(n.get("x", 0.0)) / 100.0
			var ny: float = float(n.get("y", 0.0)) / 100.0
			nx = INSET_X + nx * (1.0 - 2.0 * INSET_X)
			ny = INSET_Y + ny * (1.0 - 2.0 * INSET_Y)
			out[String(n.get("id", ""))] = Vector2(PAD + nx * w, PAD + ny * h)
		return out

	## Map a 0..100 layout point into the same fitted panel space (for the region blobs).
	func _fit_point(lx: float, ly: float) -> Vector2:
		const PAD := 28.0
		const INSET_X := 0.06
		const INSET_Y := 0.10
		var w := maxf(1.0, size.x - 2.0 * PAD)
		var h := maxf(1.0, size.y - 2.0 * PAD)
		var nx: float = (lx / 100.0)
		var ny: float = (ly / 100.0)
		nx = INSET_X + nx * (1.0 - 2.0 * INSET_X)
		ny = INSET_Y + ny * (1.0 - 2.0 * INSET_Y)
		return Vector2(PAD + nx * w, PAD + ny * h)

	func _draw() -> void:
		if screen == null:
			return
		# Warm aged-map field + a darker inner frame band for depth.
		draw_rect(Rect2(Vector2.ZERO, size), screen.MAP_FIELD, true)
		draw_rect(Rect2(Vector2.ONE * 1.5, size - Vector2.ONE * 3.0), screen.MAP_FIELD_EDGE, false, 4.0)

		# Region blobs (UNDER the roads + nodes) — soft translucent ellipses.
		for r in CartographyConfig.REGIONS:
			var rc := _fit_point(float(r.get("cx", 0.0)), float(r.get("cy", 0.0)))
			var rx_pt := _fit_point(float(r.get("cx", 0.0)) + float(r.get("rx", 0.0)), float(r.get("cy", 0.0)))
			var ry_pt := _fit_point(float(r.get("cx", 0.0)), float(r.get("cy", 0.0)) + float(r.get("ry", 0.0)))
			var rad := Vector2(absf(rx_pt.x - rc.x), absf(ry_pt.y - rc.y))
			var fill: Color = r.get("fill", screen.MAP_FIELD)
			_draw_ellipse(rc, rad, Color(fill, 0.42))

		var centers := _fit_centers()

		# Roads (under the nodes). A road is OPEN (solid) when BOTH endpoints are at least
		# DISCOVERED; a road that leads into the fog (an endpoint still hidden) is dashed.
		for e in CartographyConfig.EDGES:
			var a_id: String = String(e[0])
			var b_id: String = String(e[1])
			if not centers.has(a_id) or not centers.has(b_id):
				continue
			var a: Vector2 = centers[a_id]
			var b: Vector2 = centers[b_id]
			var a_known: bool = screen.node_state(a_id) != "hidden"
			var b_known: bool = screen.node_state(b_id) != "hidden"
			if a_known and b_known:
				draw_line(a, b, screen.ROAD_OPEN_UNDER, 6.0, true)   # dirt underlay
				draw_line(a, b, screen.ROAD_OPEN, 3.0, true)         # walkable core
			else:
				screen._draw_dashed_on(self, a, b, screen.ROAD_WAIT, 2.5, 8.0, 6.0)

		var selected: String = screen.selected_node_id()

		# Nodes — state-styled pins.
		for n in CartographyConfig.all():
			var id: String = String(n.get("id", ""))
			var c: Vector2 = centers[id]
			var state: String = screen.node_state(id)
			var kind: String = String(n.get("kind", ""))
			var tint: Color = CartographyConfig.NODE_COLORS.get(kind, Palette.INK)
			var r := 16.0

			# Selection ring (under everything) so the player sees what the detail panel describes.
			if id == selected:
				draw_arc(c, r + 10.0, 0.0, TAU, 40, Palette.EMBER, 2.0, true)

			match state:
				"hidden":
					# A fogged disc with a "?" — discovered-but-unknown territory.
					draw_circle(c, r, Color(screen.NODE_HIDDEN, 0.7))
					draw_arc(c, r, 0.0, TAU, 40, Palette.INK_MID, 1.5, true)
					_draw_centered_text("?", c, 18, Palette.PARCHMENT)
				"discovered":
					# An OUTLINED disc (a known-but-unvisited place): faint fill, kind-tinted rim.
					draw_circle(c, r, Color(tint, 0.30))
					draw_arc(c, r, 0.0, TAU, 40, tint, 2.5, true)
					_draw_centered_text(String(n.get("icon", "")), c, 16, Palette.INK)
				"visited":
					# A FILLED disc, gold-rimmed.
					draw_circle(c, r, tint)
					draw_arc(c, r, 0.0, TAU, 40, Palette.GOLD, 2.0, true)
					_draw_centered_text(String(n.get("icon", "")), c, 16, Palette.PARCHMENT)
				"current":
					# Filled + a bright gold "you are here" ring.
					draw_arc(c, r + 6.0, 0.0, TAU, 48, Palette.GOLD_BRIGHT, 3.5, true)
					draw_circle(c, r, tint)
					draw_arc(c, r, 0.0, TAU, 40, Palette.GOLD_BRIGHT, 2.0, true)
					_draw_centered_text(String(n.get("icon", "")), c, 16, Palette.PARCHMENT)

			# Name below the node — only for known nodes (hidden stays anonymous).
			if state != "hidden":
				var label := String(n.get("name", id))
				if id == screen.current_node_id():
					label = "◉ " + label
				_draw_centered_text(label, c + Vector2(0.0, r + 13.0), 11,
					Palette.GOLD if id == screen.current_node_id() else Palette.INK)

		# Publish the drawn centres for the tap hit-test / tests.
		screen._node_centers = centers

	## Tap → select. ONE event type (the mouse button) per the touch=mouse emulation note.
	func _gui_input(event: InputEvent) -> void:
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			screen._on_map_tapped(event.position)
			accept_event()

	## A filled translucent ellipse via a triangle fan (Godot has no draw_ellipse primitive).
	func _draw_ellipse(c: Vector2, rad: Vector2, col: Color) -> void:
		var pts := PackedVector2Array()
		var segs := 36
		for i in range(segs):
			var ang := TAU * float(i) / float(segs)
			pts.append(c + Vector2(cos(ang) * rad.x, sin(ang) * rad.y))
		draw_colored_polygon(pts, col)

	## Draw `text` horizontally centred on `pos` with the fallback font.
	func _draw_centered_text(text: String, pos: Vector2, fs: int, col: Color) -> void:
		var font := ThemeDB.fallback_font
		if font == null or text == "":
			return
		var w: float = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string(font, pos + Vector2(-w / 2.0, fs * 0.35), text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
