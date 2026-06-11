class_name VillageScreen
extends CanvasLayer
## Town-map rebuild Phase 2 — the Stardew-style top-down VILLAGE view on the Town
## nav route, now fully GAMESTATE-DRIVEN. Ground is painted from the hand-authored
## VillageLayout cell catalog into a TileMapLayer built from
## TownArtConfig.build_tileset(); buildings / landmarks / decor are floor-anchored
## Sprite2Ds under a Y-sorted World node; pan/zoom is a transform on that World
## (no Camera2D), clamped so the village never fully leaves view.
##
## CONTRACT (byte-compatible with the old TownMapScreen, so Main only swapped the
## var type + constructor — see Main._open_townmap):
##   signals  closed / state_changed / board_requested / start_farming_requested
##            / ledger_requested / boons_requested
##   lifecycle setup(g) / open() / close() / plan_lot_count()
##   _action_buttons static keys: board, ledger, boons, close, build_open,
##            zoom_in, zoom_out, recenter. Panel keys are added/removed as panels
##            open/close: "demolish" (built-plot card), "build:<id>" +
##            "picker_close" (build-picker card).
##
## PHASE 2 — REAL state, tap routing, build/demolish:
##   · STAGE + PADS each refresh(): _render_stage derives from the CURRENT tier's
##     plot grant (VillageLayout.stage_for_plot_count(plan_lot_count())) — never
##     cached at build time. On a stage change the decor is RE-placed (cleared
##     first); the pad/grass paint under EVERY catalog plot is repainted each
##     refresh (built → grass, visible-empty → pad, beyond the lot grant →
##     grass), so both stage INCREASES and DECREASES repaint correctly.
##   · BUILDINGS: the first game.buildings.size() visible plots carry building
##     sprites (BuildingConfig.shape_of(id) → TownArtConfig art); the remaining
##     visible plots render as empty pads. ORDINAL placement — GameState has no
##     per-plot model; game.build(id) APPENDS, so a new building renders on the
##     next ordinal empty plot (same model note as the old TownMapScreen).
##   · TAPS: landmark > plot. The FARM landmark emits start_farming_requested;
##     the MINE/FISH landmarks launch their expedition through the SAME GameState
##     guards TownScreen uses (can_enter_mine / can_enter_harbor+town2_complete),
##     then emit state_changed (Main re-pools the board) AND board_requested
##     (Main routes to the live board) — locked, they show a small toast instead.
##     An EMPTY plot opens the build picker; a BUILT plot opens the info/demolish
##     card; bare ground dismisses any open panel.
##   · the 🔨 Build overlay button opens the build picker for the first empty
##     plot (the Phase-1 interim ledger routing is gone).
##   · walking NPCs (Phase 3) live in their OWN y-sorted World child —
##     VillageNpcs.gd owns the A* grid, spawn, FSM and SpriteFrames; this
##     screen only instantiates it, forwards the stage on refresh(), and
##     forwards visibility. Water animation arrives in Phase 4.
##
## INPUT GOTCHA (CLAUDE.md): the project enables BOTH emulate_mouse_from_touch
## AND emulate_touch_from_mouse, so one physical drag arrives as a real
## InputEventScreenDrag AND a synthesized InputEventMouseMotion. This handler
## listens to the MOUSE path ONLY (like UiKit.make_vscroll) — never add
## ScreenDrag/ScreenTouch branches here or panning will double-count.

var game: GameState

signal closed
## Emitted after a build / demolish / expedition-launch mutates `game`, so Main
## can re-pool the board, save, refresh HUD (routed to Main._on_town_changed).
signal state_changed
## The explicit board-return affordance ("▶ Board" / "▶ Start Farming" overlay
## button) AND the tail of a successful mine/fish expedition launch. Main routes
## it: live run/expedition/boss → board, idle → the Start Farming picker.
signal board_requested
## Emitted when the player TAPS the farm-field landmark on the village map (the
## on-map "Start Farming" affordance). Main wires this to the StartFarmingModal.
signal start_farming_requested
## "📋 Town Ledger" overlay button. Main routes this through
## apply_deeplink("town") to open the TownScreen ledger.
signal ledger_requested
## "✨ Boons" overlay button. Main routes through apply_deeplink("boons").
signal boons_requested

## action id → Button, for headless tests. Static keys: board, ledger, boons,
## close, build_open, zoom_in, zoom_out, recenter. Per-panel keys (added on open,
## dropped on close): demolish, build:<id>, picker_close.
var _action_buttons: Dictionary = {}

const FALLBACK_VIEW := Vector2(720, 1280)
## Bottom strip (px) left to the persistent nav bar — the backdrop + _map_host
## stop this far short of the bottom so the nav stays visible + tappable.
const NAV_RESERVE := UiKit.NAV_RESERVE
const TILE := TownArtConfig.TILE
## A soft danger tone for the Demolish button (matches TownScreen.COL_DANGER).
const COL_DANGER := Color("#b06a52")
## The transient notice bubble for locked-expedition taps (no class_name on
## Toast — preloaded, mirroring Main's const ToastScript).
const ToastScript := preload("res://scenes/Toast.gd")

## Zoom feel — multiplicative step per +/− tap (matches the old screen's 1.35),
## with the range computed from the live host rect each layout:
##   fit  (the on-open zoom)  = COVER  — the village fills the host (~2.5× for
##                              16px tiles on the 720×1280 portrait viewport)
##   min                      = CONTAIN — zoomed out far enough to see the
##                              whole village (parchment bands letterbox it)
##   max                      = fit × MAX_OVER_FIT
const ZOOM_STEP := 1.35
const MAX_OVER_FIT := 2.5

## Tap-vs-drag disambiguation (same numbers as the old screen): a LEFT press
## records _press_pos; moving past DRAG_THRESHOLD with the button held becomes
## a drag-PAN and the release no longer resolves a tap.
const DRAG_THRESHOLD := 8.0

# Static shell, built once in setup(); buildings re-placed each refresh().
var _built: bool = false
var _map_host: Control        ## clipping host the World pans/zooms inside
var _world: Node2D            ## the pan/zoom transform target (y-sorted)
var _ground: TileMapLayer     ## flat ground paint (NOT y-sorted)
var _props: Node2D            ## decor sprites (y-sorted with buildings)
var _buildings: Node2D        ## building + landmark sprites (y-sorted)
var _npcs: VillageNpcs        ## walking villagers (Phase 3; y-sorted sibling)
var _board_btn: Button
var _build_btn: Button
## The currently-open interaction panel (build picker or demolish info), or null
## when none is open. A fresh full-rect Control holding a scrim + parchment card.
var _panel: Control = null
## The transient locked-expedition notice bubble (a Toast), lazily created.
var _toast: ToastScript = null
## The growth stage the village currently renders at — derived EVERY refresh()
## from the live tier's plot grant (stage_for_plot_count(plan_lot_count())).
var _render_stage: int = 1
## Grass alternative-tile ids on the grass atlas source ([0] == the base tile);
## a deterministic per-cell hash picks one so the field isn't one repeated tile.
var _grass_alts: Array[int] = [0]

# ── camera state (a transform on _world, clamped to the host rect) ───────────
var _zoom: float = 1.0
var _fit_zoom: float = 1.0
var _min_zoom: float = 0.5
var _max_zoom: float = 6.0
var _cam_offset: Vector2 = Vector2.ZERO   ## world origin in host px
## False until the player pans/zooms; while false a host resize re-FITS the
## village instead of preserving a stale transform.
var _user_adjusted: bool = false

var _press_pos: Vector2 = Vector2.ZERO
var _dragging: bool = false

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
	# Fit-to-view on every open (the old screen re-fit each open too).
	_user_adjusted = false
	_refit()

func close() -> void:
	_close_panel()
	if _toast != null:
		_toast.dismiss()
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                    # modal, above the HUD (layer 1)
	visible = false

	# Opaque warm backdrop. This screen is the "Town" tab — a persistent
	# bottom-nav VIEW — so the backdrop reserves UiKit.TOPBAR_RESERVE at the TOP
	# (revealing the persistent HUD top bar) and stops NAV_RESERVE short of the
	# bottom, leaving the nav bar (a LOWER CanvasLayer) visible + tappable.
	var backdrop := UiKit.make_view_backdrop()
	backdrop.offset_top = UiKit.TOPBAR_RESERVE
	backdrop.offset_bottom = -NAV_RESERVE
	add_child(backdrop)

	# Clipping host the village World hangs under. MOUSE_FILTER_STOP so it
	# receives gui_input (tap-vs-drag pan + wheel zoom) and stray clicks never
	# leak to the board behind. clip_contents so a zoomed/panned village never
	# paints over the persistent HUD top bar or bottom nav.
	_map_host = Control.new()
	_map_host.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map_host.offset_top = UiKit.TOPBAR_RESERVE
	_map_host.offset_bottom = -NAV_RESERVE
	_map_host.mouse_filter = Control.MOUSE_FILTER_STOP
	_map_host.clip_contents = true
	_map_host.connect("gui_input", Callable(self, "_on_map_gui_input"))
	_map_host.connect("resized", Callable(self, "_on_host_resized"))
	add_child(_map_host)

	# The village world: ONE Node2D the camera transform lives on. Y-sorted so
	# the floor-anchored sprites under Props/Buildings interleave correctly
	# (a tree behind a house draws behind it). NEAREST here propagates to every
	# child via TEXTURE_FILTER_PARENT_NODE — and each layer/sprite also sets it
	# explicitly per the TownArtConfig contract (16px art blurs otherwise).
	_world = Node2D.new()
	_world.y_sort_enabled = true
	_world.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_map_host.add_child(_world)

	# Ground — flat paint, never y-sorted (it sits at y 0, under every sprite).
	_ground = TileMapLayer.new()
	_ground.y_sort_enabled = false
	_ground.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_world.add_child(_ground)
	_paint_ground()

	# Props — stage-tagged decor (trees / fences / flowers / plaza dressing).
	_props = Node2D.new()
	_props.y_sort_enabled = true
	_world.add_child(_props)

	# Buildings — game.buildings sprites + the three board landmarks.
	_buildings = Node2D.new()
	_buildings.y_sort_enabled = true
	_world.add_child(_buildings)

	# Initial stage from the live tier's plot grant (refresh() re-derives it
	# every call — see the STAGE FLOW note above refresh()).
	_render_stage = VillageLayout.stage_for_plot_count(plan_lot_count())
	_place_props()

	# Walking villagers (Phase 3) — a self-contained y-sorted World child whose
	# sprites sort against the building sprites by the shared floor line. All
	# NPC behavior (A* grid, spawn, wander FSM) lives in VillageNpcs.gd.
	_npcs = VillageNpcs.new()
	_world.add_child(_npcs)
	_npcs.setup(_render_stage)
	_npcs.set_running(visible)

	_build_overlay()
	_refit()
	# Main hides primary views via `.visible = false` (not close()), so react to
	# RAW visibility: dismiss the layer-5 toast (it's a nested CanvasLayer that
	# would otherwise keep rendering over the next view) and pause/resume the
	# villagers' _process work.
	connect("visibility_changed", Callable(self, "_on_screen_visibility_changed"))

## Floating UI over the village: title pill, ▶ Board, Ledger, Boons, Build,
## zoom stack — same placement + signals as the old TownMapScreen overlay.
func _build_overlay() -> void:
	var overlay := Control.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)
	## Top inset clears the persistent HUD top bar revealed above the view.
	var overlay_top: float = float(UiKit.TOPBAR_RESERVE) + 18.0

	# Title pill — the in-fiction settlement name, top-left.
	var title := Label.new()
	title.text = "🏡 " + _settlement_name()
	UiKit.set_font_size(title, Typography.Role.TITLE)
	title.add_theme_color_override("font_color", Palette.INK)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	var title_box := PanelContainer.new()
	title_box.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PARCHMENT))
	title_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_box.set_anchors_preset(Control.PRESET_TOP_LEFT)
	title_box.offset_left = 18
	title_box.offset_top = overlay_top
	title_box.add_child(title)
	overlay.add_child(title_box)

	# "▶ Board" — top-right; emits board_requested (Main: live run → board,
	# idle → Start Farming picker). Relabelled each refresh() from run state.
	var board_btn := Button.new()
	board_btn.text = "▶ Board"
	UiKit.style_button(board_btn, Palette.EMBER, 6, Typography.size(Typography.Role.SUBHEAD))
	board_btn.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	board_btn.offset_right = -18
	board_btn.offset_top = overlay_top
	board_btn.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	board_btn.connect("pressed", Callable(self, "_on_board_button"))
	overlay.add_child(board_btn)
	_board_btn = board_btn
	_action_buttons["board"] = board_btn

	# "📋 Town Ledger" — top-left under the title pill.
	var ledger_btn := Button.new()
	ledger_btn.text = "📋 Town Ledger"
	UiKit.style_button(ledger_btn, Palette.GOLD, 6, Typography.size(Typography.Role.SUBHEAD))
	ledger_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	ledger_btn.offset_left = 18
	ledger_btn.offset_top = overlay_top + 52.0
	ledger_btn.connect("pressed", Callable(self, "_on_ledger_button"))
	overlay.add_child(ledger_btn)
	_action_buttons["ledger"] = ledger_btn

	# "✨ Boons" — top-left under the Town Ledger button.
	var boons_btn := Button.new()
	boons_btn.text = "✨ Boons"
	UiKit.style_button(boons_btn, Palette.EMBER, 6, Typography.size(Typography.Role.SUBHEAD))
	boons_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	boons_btn.offset_left = 18
	boons_btn.offset_top = overlay_top + 100.0
	boons_btn.connect("pressed", Callable(self, "_on_boons_button"))
	overlay.add_child(boons_btn)
	_action_buttons["boons"] = boons_btn

	# Hidden close affordance — wired but NOT added to the overlay, so it never
	# renders yet still backs ESC/back, apply_deeplink("board"), and the
	# close-button tests (_action_buttons["close"]). Same trick as the old screen.
	var close_btn := Button.new()
	close_btn.visible = false
	close_btn.connect("pressed", Callable(self, "close"))
	_action_buttons["close"] = close_btn

	# "🔨 Build · N/M plots" — bottom-right, live GameState counts. Opens the
	# build picker for the first EMPTY plot (exactly what a tap on an empty pad
	# resolves to — ordinal index == game.buildings.size()). Registered as
	# "build_open".
	_build_btn = Button.new()
	_build_btn.text = "🔨 Build"
	UiKit.style_action_button(_build_btn, Palette.GO_GREEN, 8, Typography.size(Typography.Role.SUBHEAD))
	_build_btn.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	_build_btn.offset_right = -18
	_build_btn.offset_bottom = -18 - NAV_RESERVE
	_build_btn.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_build_btn.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_build_btn.connect("pressed", Callable(self, "_on_build_button"))
	overlay.add_child(_build_btn)
	_action_buttons["build_open"] = _build_btn

	# Zoom / recenter stack, bottom-left.
	var zoom_box := VBoxContainer.new()
	zoom_box.add_theme_constant_override("separation", 8)
	zoom_box.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	zoom_box.offset_left = 18
	zoom_box.offset_bottom = -18 - NAV_RESERVE
	zoom_box.grow_vertical = Control.GROW_DIRECTION_BEGIN
	overlay.add_child(zoom_box)

	var zoom_in_btn := _make_zoom_btn("+")
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
	UiKit.style_button(btn, Palette.EMBER, 8, Typography.size(Typography.Role.HEADING))
	for state in ["normal", "hover", "pressed", "focus"]:
		var sb: StyleBox = btn.get_theme_stylebox(state)
		if sb is StyleBoxFlat:
			(sb as StyleBoxFlat).set_corner_radius_all(999)
	return btn

## The home settlement's display name from config, with the literal fallback
## (same source StartFarmingModal._zone_name uses for the home zone).
func _settlement_name() -> String:
	var z: Dictionary = CartographyConfig.by_id("home")
	var nm: String = String(z.get("name", ""))
	return nm if nm != "" else "Hearthwood Vale"

# ── ground paint ───────────────────────────────────────────────────────────────

## Paint the full village grid ONCE: grass is the implicit default everywhere
## (varied via deterministic flip alternatives), the explicit non-grass kinds
## come from VillageLayout.ground_cells() — iterated ONCE per its contract.
## Plot pads are painted separately (_paint_plots, per refresh).
func _paint_ground() -> void:
	var ts: TileSet = TownArtConfig.build_tileset()
	_register_grass_variants(ts)
	_ground.tile_set = ts

	# cell -> kind reverse map, built from ONE ground_cells() call.
	var explicit: Dictionary = {}
	var ground: Dictionary = VillageLayout.ground_cells()
	for kind: String in ground.keys():
		for c in ground[kind]:
			explicit[c] = kind

	var grid: Vector2i = VillageLayout.grid_size()
	for y in range(grid.y):
		for x in range(grid.x):
			var c := Vector2i(x, y)
			if explicit.has(c):
				_ground.set_cell(c, TownArtConfig.ground_source_id(String(explicit[c])), Vector2i.ZERO)
			else:
				_paint_grass(c)

## Paint one implicit-grass cell with a deterministically hashed flip variant
## so the open field never reads as a single repeated tile.
func _paint_grass(c: Vector2i) -> void:
	var alt: int = _grass_alts[posmod(c.x * 73856093 ^ c.y * 19349663, _grass_alts.size())]
	_ground.set_cell(c, TownArtConfig.ground_source_id("grass"), Vector2i.ZERO, alt)

## Add H/V/HV flip alternatives to the grass atlas source (variety on a single
## 16px tile, no extra art). Safe when the grass texture failed to load
## headless-without-import: _grass_alts then stays [0].
func _register_grass_variants(ts: TileSet) -> void:
	_grass_alts = [0]
	var sid: int = TownArtConfig.ground_source_id("grass")
	if not ts.has_source(sid):
		return
	var src := ts.get_source(sid) as TileSetAtlasSource
	if src == null:
		return
	for i in range(1, 4):
		var alt: int = src.create_alternative_tile(Vector2i.ZERO)
		var td: TileData = src.get_tile_data(Vector2i.ZERO, alt)
		td.flip_h = (i & 1) == 1
		td.flip_v = (i & 2) == 2
		_grass_alts.append(alt)

## Repaint the ground under EVERY catalog plot (not just the rendered stage's):
##   index <  built_count            → grass (the building sprite covers it)
##   built_count <= index < visible  → "pad" (a prepared dirt lot, tappable)
##   index >= visible_count          → grass (beyond the tier's lot grant)
## Walking the FULL catalog each refresh is what makes stage/lot-count DECREASES
## paint correctly too — a plot that fell out of the visible set reverts to
## grass instead of keeping a stale pad. 35 plots × 9 cells is trivially cheap.
func _paint_plots(visible_count: int, built_count: int) -> void:
	var all_plots: Array = VillageLayout.plots()
	var pad_sid: int = TownArtConfig.ground_source_id("pad")
	for i in range(all_plots.size()):
		var p: Dictionary = all_plots[i]
		for c in VillageLayout.footprint_cells(p["cell"], p["footprint"]):
			if i >= built_count and i < visible_count:
				_ground.set_cell(c, pad_sid, Vector2i.ZERO)
			else:
				_paint_grass(c)

# ── sprites (props / landmarks / buildings) ───────────────────────────────────

## (Re-)place the stage-filtered decor. CLEARS the previous decor first
## (detach + free, so child counts are correct the same frame) — called from
## _build_shell and again from refresh() whenever the rendered stage changes,
## so a stage increase adds the new dressing and a decrease removes it.
func _place_props() -> void:
	for child in _props.get_children():
		_props.remove_child(child)
		child.queue_free()
	for d: Dictionary in VillageLayout.decor_for_stage(_render_stage):
		var art_id: String = String(d["art_id"])
		var cell: Vector2i = d["cell"]
		var s := _make_sprite(art_id, _floor_pos(cell, Vector2i.ONE))
		s.name = "decor_%d_%d_%s" % [cell.x, cell.y, art_id]
		_props.add_child(s)

## Re-place the building + landmark sprites from `building_ids` (game.buildings:
## ids → BuildingConfig.shape_of → TownArtConfig art) onto the first N VISIBLE
## plots, then repaint the pad/grass ground under every catalog plot. Rebuilds
## from scratch each refresh — the sprite count is tiny and the ordinal model
## means any build/demolish can shift every assignment.
func _rebuild_buildings(building_ids: Array) -> void:
	for child in _buildings.get_children():
		_buildings.remove_child(child)
		child.queue_free()

	# Buildings on the first N visible plots (ordinal — see the class header).
	var plots: Array = _visible_plots()
	var count: int = mini(building_ids.size(), plots.size())
	for i in range(count):
		var p: Dictionary = plots[i]
		var art_id: String = BuildingConfig.shape_of(String(building_ids[i]))
		var s := _make_sprite(art_id, _floor_pos(p["cell"], p["footprint"]))
		s.name = "building_%d_%s" % [i, art_id]
		_buildings.add_child(s)

	# The three board-entrance landmarks at their fixed VillageLayout cells.
	var landmarks: Dictionary = VillageLayout.landmarks()
	for id: String in landmarks.keys():
		var lm: Dictionary = landmarks[id]
		var s := _make_sprite(id, _floor_pos(lm["cell"], lm["footprint"]))
		s.name = "landmark_" + id
		_buildings.add_child(s)

	_paint_plots(plots.size(), count)

## The plots the player can actually use right now: the rendered stage's plot
## list truncated to the live tier's lot grant (plan_lot_count()). plots() is
## ordered stage-ascending, so plots_for_stage(stage) is a prefix of the full
## catalog and this slice is a prefix of THAT — index i here == catalog index i.
func _visible_plots() -> Array:
	var plots: Array = VillageLayout.plots_for_stage(_render_stage)
	return plots.slice(0, mini(plan_lot_count(), plots.size()))

## Floor-center-bottom of a footprint anchored at top-left `cell`, in world px —
## the point a sprite's TownArtConfig anchor is pinned to (and the y its
## Y-sorting uses, so sprites sort by their floor line).
func _floor_pos(cell: Vector2i, footprint: Vector2i) -> Vector2:
	return Vector2(
		(float(cell.x) + float(footprint.x) * 0.5) * float(TILE),
		float(cell.y + footprint.y) * float(TILE))

## A floor-anchored NEAREST sprite for `art_id` at world `pos`. Missing art
## degrades to a flat Palette square of the footprint size (the same graceful
## fallback tier as Tile.gd) — the screen always renders headless.
func _make_sprite(art_id: String, pos: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.centered = false
	s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var tex: Texture2D = TownArtConfig.texture_for(art_id)
	if tex != null:
		s.texture = tex
		s.offset = -TownArtConfig.anchor_of(art_id)
	else:
		var fp: Vector2i = TownArtConfig.footprint_of(art_id)
		var px := Vector2i(fp.x * TILE, fp.y * TILE)
		s.texture = _fallback_texture(px)
		s.offset = -Vector2(float(px.x) * 0.5, float(px.y))
	s.position = pos
	return s

## Flat warm placeholder texture (missing-art fallback only).
static func _fallback_texture(px: Vector2i) -> Texture2D:
	var img := Image.create(maxi(1, px.x), maxi(1, px.y), false, Image.FORMAT_RGBA8)
	img.fill(Palette.INK_MID)
	return ImageTexture.create_from_image(img)

# ── render / refresh ──────────────────────────────────────────────────────────

## STAGE FLOW. Re-derive the growth stage from the CURRENT tier's plot grant,
## re-place the decor when it changed, re-place the building sprites from
## game.buildings, repaint the pad/grass ground under every plot, and refresh
## the live-state overlay labels. Called on setup(), every open(), and after
## every build/demolish/expedition from this screen — cheap enough to run
## every time (a few dozen sprites + ~300 ground cells).
func refresh() -> void:
	if not _built or game == null:
		return
	var stage: int = VillageLayout.stage_for_plot_count(plan_lot_count())
	if stage != _render_stage:
		_render_stage = stage
		_place_props()
	_rebuild_buildings(game.buildings)
	# Villager crowd tracks the rendered stage (no-op while it's unchanged, so
	# a plain refresh never scatters the walkers).
	if _npcs != null:
		_npcs.set_stage(stage)
	# Build button label: LIVE GameState plot counts (matches the old screen and
	# the React "Build · N/N plots"). Disabled when every plot is filled.
	if _build_btn != null:
		_build_btn.text = "🔨 Build · %d/%d plots" % [game.buildings.size(), plan_lot_count()]
		_build_btn.disabled = game.plots_free() <= 0
	# Relabel the board-return affordance from the live run state (old-screen
	# parity): live run/expedition/boss → "▶ Board"; idle at home → Main routes
	# the press to the Start Farming picker, so say what it actually does.
	if _board_btn != null:
		var board_live: bool = game.farm_run_active \
			or game.active_biome != "farm" or game.is_boss_active()
		_board_btn.text = "▶ Board" if board_live else "▶ Start Farming"

## The lot count the CURRENT TIER grants (max(1, game.settlement.plots())) —
## the screen's single source for the visible-plot slice, the stage derivation,
## and the Build-button label (and the number the headless wiring test asserts).
func plan_lot_count() -> int:
	if game == null:
		return 0
	return max(1, game.settlement.plots())

## RAW visibility flip (Main hides primary views via `.visible = false`, which
## bypasses close()): kill the nested layer-5 toast so it can't linger over the
## next view, and stop ticking the villagers while hidden.
func _on_screen_visibility_changed() -> void:
	if not visible and _toast != null:
		_toast.dismiss()
	if _npcs != null:
		_npcs.set_running(visible)

# ── camera (transform on _world, clamped) ─────────────────────────────────────

## Live host rect, falling back to the portrait default minus the reserved
## bands when layout hasn't run (e.g. headless before first frame).
func _host_size() -> Vector2:
	if _map_host != null:
		var hs: Vector2 = _map_host.size
		if hs.x > 0.0 and hs.y > 0.0:
			return hs
	return Vector2(FALLBACK_VIEW.x,
		maxf(1.0, FALLBACK_VIEW.y - float(UiKit.TOPBAR_RESERVE) - float(NAV_RESERVE)))

## The village's full pixel size (grid × 16px tiles).
func _world_px() -> Vector2:
	var grid: Vector2i = VillageLayout.grid_size()
	return Vector2(float(grid.x * TILE), float(grid.y * TILE))

func _recompute_zoom_bounds() -> void:
	var host: Vector2 = _host_size()
	var wpx: Vector2 = _world_px()
	_fit_zoom = maxf(host.x / wpx.x, host.y / wpx.y)   # COVER — fills the host
	_min_zoom = minf(host.x / wpx.x, host.y / wpx.y)   # CONTAIN — whole village
	_max_zoom = _fit_zoom * MAX_OVER_FIT

## Reset to the on-open framing: cover-fit zoom, village centred.
func _refit() -> void:
	_recompute_zoom_bounds()
	_zoom = _fit_zoom
	_cam_offset = (_host_size() - _world_px() * _zoom) * 0.5
	_clamp_camera()
	_apply_camera()

## Clamp per axis: when the zoomed village overflows the host the view stays
## inside it (no gap past an edge); when it fits, centre that axis. The village
## can therefore never be panned/zoomed fully out of view.
func _clamp_camera() -> void:
	var host: Vector2 = _host_size()
	var wpx: Vector2 = _world_px() * _zoom
	if wpx.x >= host.x:
		_cam_offset.x = clampf(_cam_offset.x, host.x - wpx.x, 0.0)
	else:
		_cam_offset.x = (host.x - wpx.x) * 0.5
	if wpx.y >= host.y:
		_cam_offset.y = clampf(_cam_offset.y, host.y - wpx.y, 0.0)
	else:
		_cam_offset.y = (host.y - wpx.y) * 0.5

func _apply_camera() -> void:
	if _world == null:
		return
	_world.scale = Vector2(_zoom, _zoom)
	# Integer-px offset keeps NEAREST-filtered 16px art crisp while panning.
	_world.position = _cam_offset.round()

## Zoom by `factor` keeping the host-px `anchor` point fixed (wheel zoom).
func zoom_at(factor: float, anchor: Vector2) -> void:
	var nz: float = clampf(_zoom * factor, _min_zoom, _max_zoom)
	if is_equal_approx(nz, _zoom):
		return
	var world_pt: Vector2 = (anchor - _cam_offset) / _zoom
	_zoom = nz
	_cam_offset = anchor - world_pt * _zoom
	_user_adjusted = true
	_clamp_camera()
	_apply_camera()

func pan_by(rel: Vector2) -> void:
	_cam_offset += rel
	_user_adjusted = true
	_clamp_camera()
	_apply_camera()

func _on_zoom_in() -> void:
	zoom_at(ZOOM_STEP, _host_size() * 0.5)

func _on_zoom_out() -> void:
	zoom_at(1.0 / ZOOM_STEP, _host_size() * 0.5)

func _on_recenter() -> void:
	_user_adjusted = false
	_refit()

## Host laid out / viewport resized: re-fit while the player hasn't adjusted
## the camera; otherwise just re-clamp the existing transform into the new rect.
func _on_host_resized() -> void:
	if not _built:
		return
	_recompute_zoom_bounds()
	if _user_adjusted:
		_zoom = clampf(_zoom, _min_zoom, _max_zoom)
		_clamp_camera()
		_apply_camera()
	else:
		_refit()

# ── input (MOUSE path only — see the class-header gotcha) ─────────────────────

## gui_input on the map host: wheel zoom (cursor-anchored), tap-vs-drag pan.
## event.position is local to _map_host — exactly the space the camera offset
## lives in, so it feeds zoom_at/pan_by/_resolve_tap with no extra transform.
func _on_map_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom_at(ZOOM_STEP, event.position)
			return
		if event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom_at(1.0 / ZOOM_STEP, event.position)
			return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_press_pos = event.position
			_dragging = false
		else:
			if not _dragging:
				_resolve_tap(event.position)
			_dragging = false
		return
	if event is InputEventMouseMotion:
		if (event.button_mask & MOUSE_BUTTON_MASK_LEFT) != 0:
			if not _dragging and event.position.distance_to(_press_pos) > DRAG_THRESHOLD:
				_dragging = true
			if _dragging:
				pan_by(event.relative)

# ── tap routing (Phase 2): landmark > plot > bare ground ─────────────────────

## Resolve a TAP at host-px `pos`. Priority: a LANDMARK hit (farm → Start
## Farming, mine/fish → expedition launch) wins over a PLOT hit (built → info/
## demolish card, empty pad → build picker); a tap on bare ground dismisses any
## open panel. (The interaction panels sit on a full-rect STOP scrim, so taps
## never reach here while one is open.)
func _resolve_tap(pos: Vector2) -> void:
	var cell: Vector2i = _cell_at_host_point(pos)
	var landmarks: Dictionary = VillageLayout.landmarks()
	for id: String in landmarks.keys():
		var lm: Dictionary = landmarks[id]
		if Rect2i(lm["cell"], lm["footprint"]).has_point(cell):
			_on_landmark_tapped(id)
			return
	var plots: Array = _visible_plots()
	for i in range(plots.size()):
		var p: Dictionary = plots[i]
		if Rect2i(p["cell"], p["footprint"]).has_point(cell):
			if game != null and i < game.buildings.size():
				_open_info_for_plot(i)
			else:
				_open_build_picker_for_plot(i)
			return
	_close_panel()

## host px → village grid cell (may be out of bounds — callers range-check).
func _cell_at_host_point(pos: Vector2) -> Vector2i:
	var world_pt: Vector2 = (pos - _cam_offset) / _zoom
	return Vector2i(floori(world_pt.x / float(TILE)), floori(world_pt.y / float(TILE)))

## A board-entrance landmark was tapped. Farm stays the Start Farming signal
## (Main wires it to the StartFarmingModal); mine/fish launch their expedition
## through the SAME GameState guards TownScreen's Expedition section uses.
func _on_landmark_tapped(id: String) -> void:
	match id:
		"board_farm":
			emit_signal("start_farming_requested")
		"board_mine":
			_try_enter_mine()
		"board_fish":
			_try_enter_harbor()

## MINE landmark tap. Mirrors TownScreen's enter-mine gating (the button there
## is disabled unless game.can_enter_mine()): blocked → a small toast naming the
## first failing guard; already out in the mine → just return to the live board.
## On a successful launch: state_changed FIRST (Main._on_town_changed re-pools
## the board onto the mine + raises the input gate), THEN board_requested (Main
## routes to the board — _board_should_be_active() is now true, so
## apply_deeplink("board") lands on the live expedition, the same funnel a
## TownScreen launch rides).
func _try_enter_mine() -> void:
	if game == null:
		return
	_close_panel()
	if game.is_in_mine():
		emit_signal("board_requested")
		return
	if not game.can_enter_mine():
		_notice(_mine_block_text())
		return
	var res: Dictionary = game.enter_mine()
	if not bool(res.get("ok", false)):
		_notice(_mine_block_text())
		return
	refresh()
	emit_signal("state_changed")
	emit_signal("board_requested")

## FISH-dock landmark tap. Mirrors TownScreen's enter-harbor gating exactly:
## can_enter_harbor() AND town2_complete (the Town-3 framing — the harbor opens
## once the Town-2 capstone falls). Same launch tail as the mine.
func _try_enter_harbor() -> void:
	if game == null:
		return
	_close_panel()
	if game.is_in_harbor():
		emit_signal("board_requested")
		return
	if not (game.can_enter_harbor() and game.town2_complete):
		_notice(_harbor_block_text())
		return
	var res: Dictionary = game.enter_harbor()
	if not bool(res.get("ok", false)):
		_notice(_harbor_block_text())
		return
	refresh()
	emit_signal("state_changed")
	emit_signal("board_requested")

## Why the mine can't launch right now — the FIRST failing guard, in
## can_enter_mine's order (already_out → tier → supplies).
func _mine_block_text() -> String:
	if game.active_biome != "farm":
		return "Already out on an expedition."
	if game.settlement.tier < TownConfig.TIER_CITY:
		return "⛏ Reach %s to brave the mine." % TownConfig.tier_name(TownConfig.TIER_CITY)
	if game.qty("supplies") <= 0:
		return "⛏ No supplies — pack farm food at the Kitchen first."
	return "The mine is closed."

## Why the harbor can't launch right now — TownScreen's gate order (already_out
## → town2_complete → supplies).
func _harbor_block_text() -> String:
	if game.active_biome != "farm":
		return "Already out on an expedition."
	if not game.town2_complete:
		return "🌊 Defeat %s to unlock the harbor." % BossConfig.boss_name(BossConfig.CAPSTONE)
	if game.qty("supplies") <= 0:
		return "🌊 No supplies — pack farm food at the Kitchen first."
	return "The harbor is closed."

## Show a transient notice bubble (a Toast owned by this screen, lifted above
## the village layer so it renders over the opaque backdrop). show_toast flips
## visible synchronously, so headless tests can assert it without awaiting.
func _notice(text: String) -> void:
	if _toast == null:
		_toast = ToastScript.new()
		add_child(_toast)
		_toast.setup()
		_toast.layer = 5   # above this screen (4), below the layer-6 modals
	_toast.show_toast(text)

# ── interaction panels (build picker / built-plot info card) ──────────────────

## Open the BUILT-plot info card for ordinal plot `index`: the building's name,
## kind, and a Demolish button. `game.buildings[index]` is the id rendered on
## that plot (ordinal model). Registered as `_action_buttons["demolish"]`.
func _open_info_for_plot(index: int) -> void:
	if game == null or index < 0 or index >= game.buildings.size():
		return
	var id: String = String(game.buildings[index])
	var card := _begin_panel("🏠 " + BuildingConfig.building_name(id))

	card.add_child(_make_label("Built · %s" % BuildingConfig.building_kind(id), Palette.INK_MID))

	var demo := Button.new()
	demo.text = "Demolish"
	UiKit.style_button(demo, COL_DANGER, 6, 0, true)
	# Bind the id shown on this plot. NOTE: game.demolish(id) erases the FIRST
	# occurrence of that id in the flat list — with duplicate buildings the
	# ordinal re-flow may visually clear a DIFFERENT plot than the one tapped
	# (GameState has no per-plot model; same caveat as the ordinal render).
	demo.connect("pressed", Callable(self, "_do_demolish").bind(id))
	card.add_child(demo)
	_action_buttons["demolish"] = demo

## Open the EMPTY-plot build picker: the FULL building roster (the React-parity
## card list) — tier-locked rows show "Requires <Tier>" + a 🔒 (no button);
## unlocked rows get a Build button enabled iff game.can_build(id), else a
## disabled "Need items". Registered as `_action_buttons["build:<id>"]` plus
## `_action_buttons["picker_close"]`.
##
## ORDINAL placement: the picker is opened FROM a specific empty plot, but
## game.build(id) APPENDS to the flat buildings list, so the new building
## renders on the next ordinal empty plot (see the class-header model note).
## The `_index` arg only decides built-vs-empty + which card to open.
func _open_build_picker_for_plot(_index: int) -> void:
	if game == null:
		return
	var card := _begin_panel("Build on this plot")

	if game.plots_free() <= 0:
		card.add_child(_make_label("No free plots — demolish one first.", Palette.INK_MID))

	# Nudge when NOTHING is buildable yet (early Camp tier has no unlocked
	# buildings): tell the player how to unlock their first one.
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

	# The FULL building roster as cards (matching the React picker) — the picker
	# is never empty. Rats-hazard buildings are skipped (parity with TownScreen —
	# they have their own gated section).
	for id in BuildingConfig.ALL_BUILD_IDS:
		if BuildingConfig.is_hazard_building(id):
			continue
		card.add_child(_make_build_row(id))

## One building card in the picker (React parity): the produced-good icon (the
## building's output resource stands in — a Bakery shows bread), the name +
## one-line description, the cost as resource chips, and the action — a Build
## button (enabled when game.can_build(id), else a disabled "Need items") for
## unlocked buildings, or "Requires <Tier>" + a 🔒 when tier-locked.
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
		UiKit.set_font_size(emoji, Typography.Role.TITLE)
		emoji.add_theme_color_override("font_color", Palette.INK_MID if tier_locked else Palette.INK)
		row.add_child(emoji)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 2)
	row.add_child(col)

	var name_lbl := Label.new()
	name_lbl.text = BuildingConfig.building_name(id)
	UiKit.set_font_size(name_lbl, Typography.Role.SUBHEAD)
	name_lbl.add_theme_color_override("font_color", Palette.INK if not tier_locked else Palette.INK_MID)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		name_lbl.add_theme_font_override("font", hf)
	col.add_child(name_lbl)

	var desc: String = String(info.get("desc", ""))
	if desc != "":
		var desc_lbl := Label.new()
		desc_lbl.text = desc
		UiKit.set_font_size(desc_lbl, Typography.Role.META)
		desc_lbl.add_theme_color_override("font_color", Palette.INK_MID)
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		col.add_child(desc_lbl)

	if tier_locked:
		col.add_child(_make_label("Requires %s" % TownConfig.tier_name(req_tier), Palette.INK_MID))
	else:
		col.add_child(_make_cost_chips(BuildingConfig.building_cost(id)))

	# Action: 🔒 when tier-locked, else a Build / "Need items" button.
	if tier_locked:
		var lock := Label.new()
		lock.text = "🔒"
		UiKit.set_font_size(lock, Typography.Role.SUBHEAD)
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

## Render a cost Dictionary {resource:qty} as a row of icon+×N chips; empty →
## a muted "free". Falls back to a text name when an icon is missing.
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
		UiKit.set_font_size(lbl, Typography.Role.LABEL)
		lbl.add_theme_color_override("font_color", Palette.INK)
		one.add_child(lbl)
		box.add_child(one)
	return box

## Build `id` through the SAME GameState API as TownScreen, then dismiss the
## panel, re-render (the new building sprite shows on the next ordinal plot),
## and emit state_changed on success.
func _do_build(id: String) -> void:
	var result: Dictionary = game.build(id)
	_close_panel()
	refresh()
	if bool(result.get("ok", false)):
		emit_signal("state_changed")

## Demolish `id` through the SAME GameState API, then dismiss the panel,
## re-render (the plot reverts to an empty pad), and emit state_changed.
func _do_demolish(id: String) -> void:
	var result: Dictionary = game.demolish(id)
	_close_panel()
	refresh()
	if bool(result.get("ok", false)):
		emit_signal("state_changed")

# ── panel scaffolding (scrim + parchment card — ported from the old screen) ───

## Tear down the open interaction panel (if any) and drop its action buttons
## from `_action_buttons` so tests + handlers never read a stale node. The
## STATIC overlay entries are preserved — only the per-panel keys
## (demolish / build:<id> / picker_close) are dropped.
const _STATIC_ACTION_KEYS := ["close", "board", "ledger", "boons", "build_open", "zoom_in", "zoom_out", "recenter"]
func _close_panel() -> void:
	if _panel != null:
		_panel.queue_free()
		_panel = null
	var kept: Dictionary = {}
	for k in _STATIC_ACTION_KEYS:
		if _action_buttons.has(k):
			kept[k] = _action_buttons[k]
	_action_buttons = kept

## Build a fresh panel: a translucent scrim (clicking it closes the panel)
## holding a centred parchment card with a title row (heading + ✖) pinned above
## a SCROLLING content area. Returns the scroll's content VBox for the caller
## to fill — a short card (the demolish info) stays content-sized, a tall one
## (the full build roster) caps to the viewport and scrolls. Any previously-
## open panel is torn down first.
func _begin_panel(title_text: String) -> VBoxContainer:
	_close_panel()

	# Scrim — full-rect, eats clicks so the village underneath doesn't react;
	# clicking the bare scrim dismisses the panel.
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
	# Near-full-width card, capped for tablets/desktop.
	card.custom_minimum_size = Vector2(minf(_viewport_size().x - 36.0, 560.0), 0)
	center.add_child(card)

	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	card.add_child(body)

	# Title row: heading + a ✖ close affordance (registered as "picker_close").
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_theme_constant_override("separation", 12)
	var title := Label.new()
	title.text = title_text
	UiKit.set_font_size(title, Typography.Role.TITLE)
	title.add_theme_color_override("font_color", Palette.INK)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	var x_btn := Button.new()
	x_btn.text = "✖"
	x_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(x_btn, Palette.EMBER, 6, 0, true)
	x_btn.connect("pressed", Callable(self, "_close_panel"))
	title_row.add_child(x_btn)
	_action_buttons["picker_close"] = x_btn

	body.add_child(title_row)

	# Scrolling content area under the pinned title. The caller fills the
	# returned VBox; the deferred fit then clamps the scroll to its content
	# height (viewport-capped) so short panels stay compact and the build
	# roster scrolls instead of running off the fold.
	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(scroll)

	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 10)
	scroll.add_child(content)

	# Deferred: runs after the caller has filled `content` (same frame), so the
	# measure sees the real row heights.
	_fit_panel_scroll.call_deferred(scroll, content)
	return content

## Clamp an open panel's scroll to its content height (viewport-capped). Split
## out so the deferred call survives a panel closed before it lands.
func _fit_panel_scroll(scroll: ScrollContainer, content: Control) -> void:
	if _panel == null or scroll == null or not is_instance_valid(scroll):
		return
	UiKit.fit_scroll_height(scroll, content, 220.0)

## Clicking the bare scrim (outside the card) dismisses the panel.
func _on_scrim_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_close_panel()

## A wrapping body Label in the given color.
func _make_label(text: String, color: Color) -> Label:
	var lbl := Label.new()
	lbl.text = text
	UiKit.set_font_size(lbl, Typography.Role.SUBHEAD)
	lbl.add_theme_color_override("font_color", color)
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return lbl

# Live viewport size, falling back to the portrait default when none is
# available (e.g. a headless run with no window). Used by the panel card width.
func _viewport_size() -> Vector2:
	var vp := get_viewport()
	if vp != null:
		var sz: Vector2 = vp.get_visible_rect().size
		if sz.x > 0.0 and sz.y > 0.0:
			return sz
	return FALLBACK_VIEW

# ── overlay button handlers ───────────────────────────────────────────────────

func _on_board_button() -> void:
	_close_panel()
	emit_signal("board_requested")

func _on_ledger_button() -> void:
	_close_panel()
	emit_signal("ledger_requested")

func _on_boons_button() -> void:
	_close_panel()
	emit_signal("boons_requested")

## The prominent 🔨 Build button: open the build picker for the first EMPTY
## plot — exactly what a tap on an empty pad resolves to (ordinal index ==
## game.buildings.size()). When every plot is full the picker still opens and
## shows the "No free plots" hint (parity with the tap path).
func _on_build_button() -> void:
	if game == null:
		return
	_open_build_picker_for_plot(game.buildings.size())
