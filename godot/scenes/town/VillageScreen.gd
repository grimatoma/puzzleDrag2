class_name VillageScreen
extends CanvasLayer
## Town-map rebuild Phase 1 — the Stardew-style top-down VILLAGE view that
## replaces TownMapScreen on the Town nav route. Ground is painted from the
## hand-authored VillageLayout cell catalog into a TileMapLayer built from
## TownArtConfig.build_tileset(); buildings / landmarks / decor are floor-
## anchored Sprite2Ds under a Y-sorted World node; pan/zoom is a transform on
## that World (no Camera2D), clamped so the village never fully leaves view.
##
## CONTRACT (byte-compatible with the old TownMapScreen, so Main only swaps the
## var type + constructor — see Main._open_townmap):
##   signals  closed / state_changed / board_requested / start_farming_requested
##            / ledger_requested / boons_requested
##   lifecycle setup(g) / open() / close() / plan_lot_count()
##   _action_buttons keys: board, ledger, boons, close, build_open,
##            zoom_in, zoom_out, recenter
##
## PHASE 1 IS INTERMEDIATE — a beautiful STATIC village:
##   · buildings: a curated spread of BuildingConfig ids on the first plots of
##     the rendered stage (_rebuild_buildings(STATIC_BUILDINGS)); Phase 2
##     re-points the same call at game.buildings.
##   · build_open: the "🔨 Build" button shows the LIVE GameState plot counts
##     but routes to the Town LEDGER (emit ledger_requested) where building is
##     already possible — the spatial build picker arrives in Phase 2.
##   · taps: only the FARM landmark resolves (emits start_farming_requested,
##     parity with the old farm-pad tap); plot tap-routing arrives in Phase 2.
##   · walking NPCs arrive in Phase 3; water animation in Phase 4.
##
## INPUT GOTCHA (CLAUDE.md): the project enables BOTH emulate_mouse_from_touch
## AND emulate_touch_from_mouse, so one physical drag arrives as a real
## InputEventScreenDrag AND a synthesized InputEventMouseMotion. This handler
## listens to the MOUSE path ONLY (like UiKit.make_vscroll) — never add
## ScreenDrag/ScreenTouch branches here or panning will double-count.

var game: GameState

signal closed
## Emitted after a build/demolish mutates `game` (Phase 2 — nothing mutates from
## this screen in Phase 1), so Main can re-pool the board, save, refresh HUD.
signal state_changed
## The explicit board-return affordance ("▶ Board" / "▶ Start Farming" overlay
## button). Main routes it: live run → board, idle → the Start Farming picker.
signal board_requested
## Emitted when the player TAPS the farm-field landmark on the village map (the
## on-map "Start Farming" affordance). Main wires this to the StartFarmingModal.
signal start_farming_requested
## "📋 Town Ledger" overlay button (and, Phase-1 interim, the 🔨 Build button).
## Main routes it through apply_deeplink("town") to open the TownScreen ledger.
signal ledger_requested
## "✨ Boons" overlay button. Main routes through apply_deeplink("boons").
signal boons_requested

## action id → Button, for headless tests. Phase-1 static keys: board, ledger,
## boons, close, build_open, zoom_in, zoom_out, recenter. (Phase 2 adds the
## per-panel demolish / build:<id> / picker_close keys.)
var _action_buttons: Dictionary = {}

const FALLBACK_VIEW := Vector2(720, 1280)
## Bottom strip (px) left to the persistent nav bar — the backdrop + _map_host
## stop this far short of the bottom so the nav stays visible + tappable.
const NAV_RESERVE := UiKit.NAV_RESERVE
const TILE := TownArtConfig.TILE

## Zoom feel — multiplicative step per +/− tap (matches the old TownMap's 1.35),
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

## Phase-1 STATIC building spread: honest BuildingConfig ids (their `shape`
## picks the art via BuildingConfig.shape_of → TownArtConfig), placed on the
## first plots of the rendered stage. 12 ids → stage_for_plot_count(12) == 3,
## so the village renders mid-grown: 15 plots, 12 built, 3 empty pads, decor
## through stage 3. Phase 2 deletes this and passes game.buildings instead.
const STATIC_BUILDINGS: Array = [
	BuildingConfig.LUMBER_CAMP, BuildingConfig.COOP, BuildingConfig.GARDEN,
	BuildingConfig.BAKERY, BuildingConfig.MILL, BuildingConfig.CHAPEL,
	BuildingConfig.BARN, BuildingConfig.WORKSHOP, BuildingConfig.SILO,
	BuildingConfig.STABLE, BuildingConfig.FORGE, BuildingConfig.HOUSING,
]

# Static shell, built once in setup(); buildings re-placed each refresh().
var _built: bool = false
var _map_host: Control        ## clipping host the World pans/zooms inside
var _world: Node2D            ## the pan/zoom transform target (y-sorted)
var _ground: TileMapLayer     ## flat ground paint (NOT y-sorted)
var _props: Node2D            ## decor sprites (y-sorted with buildings)
var _buildings: Node2D        ## building + landmark sprites (y-sorted)
var _board_btn: Button
var _build_btn: Button
## The growth stage this static village renders at (Phase 2 derives it from
## game.buildings.size() instead).
var _render_stage: int = 1
## Grass alternative-tile ids on the grass atlas source ([0] == the base tile);
## a deterministic per-cell hash picks one so the field isn't one repeated tile.
var _grass_alts: Array = [0]

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

	# Buildings — the static building spread + the three board landmarks.
	_buildings = Node2D.new()
	_buildings.y_sort_enabled = true
	_world.add_child(_buildings)

	# Phase 1 renders a fixed mid-grown stage from the static spread; Phase 2
	# derives this from game.buildings.size() each refresh.
	_render_stage = VillageLayout.stage_for_plot_count(STATIC_BUILDINGS.size())
	_place_props()

	_build_overlay()
	_refit()

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

	# "🔨 Build · N/M plots" — bottom-right, live GameState counts. PHASE-1
	# INTERIM: routes to the Town LEDGER (where building already works) until
	# Phase 2 lands the on-map build picker. Registered as "build_open".
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
## Plot pads are painted separately (_paint_plot_pads, per refresh).
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

## Repaint the ground under every plot of the rendered stage: EMPTY plots get
## the "pad" kind (a prepared dirt lot); BUILT plots revert to grass so the
## building sits on the field (the pad would poke out around small sprites).
func _paint_plot_pads(built_count: int) -> void:
	var plots: Array = VillageLayout.plots_for_stage(_render_stage)
	var pad_sid: int = TownArtConfig.ground_source_id("pad")
	for i in range(plots.size()):
		var p: Dictionary = plots[i]
		for c in VillageLayout.footprint_cells(p["cell"], p["footprint"]):
			if i < built_count:
				_paint_grass(c)
			else:
				_ground.set_cell(c, pad_sid, Vector2i.ZERO)

# ── sprites (props / landmarks / buildings) ───────────────────────────────────

## Place the stage-filtered decor ONCE (static in Phase 1).
func _place_props() -> void:
	for d: Dictionary in VillageLayout.decor_for_stage(_render_stage):
		var art_id: String = String(d["art_id"])
		var cell: Vector2i = d["cell"]
		var s := _make_sprite(art_id, _floor_pos(cell, Vector2i.ONE))
		s.name = "decor_%d_%d_%s" % [cell.x, cell.y, art_id]
		_props.add_child(s)

## Re-place the building + landmark sprites. Phase 1 passes the static spread;
## Phase 2 re-points this same call at game.buildings (ids → BuildingConfig
## shape → art), which is why it rebuilds from scratch each refresh.
func _rebuild_buildings(building_ids: Array) -> void:
	for child in _buildings.get_children():
		child.queue_free()

	# Buildings on the first N plots of the rendered stage.
	var plots: Array = VillageLayout.plots_for_stage(_render_stage)
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

	_paint_plot_pads(count)

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

## Re-place the buildings and refresh the live-state overlay labels. Called on
## setup() and every open(). Phase 2 swaps STATIC_BUILDINGS for game.buildings.
func refresh() -> void:
	if not _built or game == null:
		return
	_rebuild_buildings(STATIC_BUILDINGS)
	# Build button label: LIVE GameState plot counts (matches the old screen and
	# the React "Build · N/N plots"), even though Phase 1 draws a static spread.
	if _build_btn != null:
		var plot_count: int = max(1, game.settlement.plots())
		_build_btn.text = "🔨 Build · %d/%d plots" % [game.buildings.size(), plot_count]
		_build_btn.disabled = game.plots_free() <= 0
	# Relabel the board-return affordance from the live run state (old-screen
	# parity): live run/expedition/boss → "▶ Board"; idle at home → Main routes
	# the press to the Start Farming picker, so say what it actually does.
	if _board_btn != null:
		var board_live: bool = game.farm_run_active \
			or game.active_biome != "farm" or game.is_boss_active()
		_board_btn.text = "▶ Board" if board_live else "▶ Start Farming"

## Lot count for the headless wiring test — the plots the CURRENT TIER grants,
## exactly what the old screen's rendered plan exposed (TownLayout built one lot
## per settlement plot: max(1, game.settlement.plots())).
func plan_lot_count() -> int:
	if game == null:
		return 0
	return max(1, game.settlement.plots())

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

## Resolve a TAP at host-px `pos`. Phase 1: only the FARM landmark is tappable
## (emits start_farming_requested — parity with the old farm-pad tap); plot
## tap-routing (build/demolish cards) arrives in Phase 2.
func _resolve_tap(pos: Vector2) -> void:
	var cell: Vector2i = _cell_at_host_point(pos)
	var farm: Dictionary = VillageLayout.landmarks().get("board_farm", {})
	if farm.is_empty():
		return
	var rect := Rect2i(farm["cell"], farm["footprint"])
	if rect.has_point(cell):
		emit_signal("start_farming_requested")

## host px → village grid cell (may be out of bounds — callers range-check).
func _cell_at_host_point(pos: Vector2) -> Vector2i:
	var world_pt: Vector2 = (pos - _cam_offset) / _zoom
	return Vector2i(floori(world_pt.x / float(TILE)), floori(world_pt.y / float(TILE)))

# ── overlay button handlers ───────────────────────────────────────────────────

func _on_board_button() -> void:
	emit_signal("board_requested")

func _on_ledger_button() -> void:
	emit_signal("ledger_requested")

func _on_boons_button() -> void:
	emit_signal("boons_requested")

## PHASE-1 INTERIM: the Build button opens the Town LEDGER (building/demolish
## already work there) until Phase 2 lands the on-map spatial build picker.
func _on_build_button() -> void:
	emit_signal("ledger_requested")
