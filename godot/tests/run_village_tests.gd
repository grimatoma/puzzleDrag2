extends SceneTree
## Headless tests for the Phase-1 VillageScreen — the Stardew-style top-down
## village view that replaced TownMapScreen on the Town nav route.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_village_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## NOTE: assets must be imported first (godot --headless --path godot --import),
## otherwise ground/sprite texture lookups miss (same caveat as
## run_town_assets_tests.gd).
##
## Layers:
##   1. Screen contract — the six signals, the 8 Phase-1 _action_buttons keys,
##      plan_lot_count() == TownConfig.tier_plots(tier), open/close lifecycle.
##   2. World render — Ground TileMapLayer paints the FULL village grid with
##      the right kinds (explicit kinds + pads under empty plots + varied
##      grass); Props match the rendered stage's decor; Buildings hold the
##      static spread + the 3 landmarks, floor-anchored.
##   3. Camera — fit-on-open, zoom in/out/recenter via the registered buttons,
##      pan + zoom clamped so the village never leaves the host rect.
##   4. Tap routing — a tap on the farm landmark emits start_farming_requested
##      (the only Phase-1 tappable); a drag-pan suppresses the tap.

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── VillageScreen (town-map rebuild Phase 1) tests ─")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	# ── 1. Screen contract ─────────────────────────────────────────────────────
	var game := GameState.new()
	var screen := VillageScreen.new()
	root.add_child(screen)
	screen.setup(game)
	screen.open()
	await process_frame
	_check(screen.visible, "setup() + open() headless → screen visible, no errors")

	for sig in ["closed", "state_changed", "board_requested",
			"start_farming_requested", "ledger_requested", "boons_requested"]:
		_check(screen.has_signal(sig), "has_signal('%s')" % sig)

	for key in ["board", "ledger", "boons", "close", "build_open",
			"zoom_in", "zoom_out", "recenter"]:
		_check(screen._action_buttons.has(key) and screen._action_buttons[key] is Button,
			"_action_buttons['%s'] is a Button" % key)

	_check(screen.plan_lot_count() == max(1, TownConfig.tier_plots(game.settlement.tier)),
		"plan_lot_count() (%d) == tier_plots(tier %d)"
		% [screen.plan_lot_count(), game.settlement.tier])
	game.settlement.tier = TownConfig.TIER_CITY
	_check(screen.plan_lot_count() == TownConfig.tier_plots(TownConfig.TIER_CITY),
		"plan_lot_count() tracks the live tier (City → %d)" % screen.plan_lot_count())
	game.settlement.tier = TownConfig.TIER_CAMP

	# Build button reads LIVE GameState counts (Phase-1 interim: routes to ledger).
	_check("Build" in (screen._action_buttons["build_open"] as Button).text,
		"build_open label reads 'Build …' (got '%s')" % (screen._action_buttons["build_open"] as Button).text)
	var ledger_hits: Array = []
	screen.ledger_requested.connect(func() -> void: ledger_hits.append(1))
	(screen._action_buttons["build_open"] as Button).emit_signal("pressed")
	_check(ledger_hits.size() == 1,
		"Phase-1 interim: pressing build_open emits ledger_requested")
	(screen._action_buttons["ledger"] as Button).emit_signal("pressed")
	_check(ledger_hits.size() == 2, "pressing 'ledger' emits ledger_requested")

	var board_hits: Array = []
	screen.board_requested.connect(func() -> void: board_hits.append(1))
	(screen._action_buttons["board"] as Button).emit_signal("pressed")
	_check(board_hits.size() == 1, "pressing 'board' emits board_requested")
	var boons_hits: Array = []
	screen.boons_requested.connect(func() -> void: boons_hits.append(1))
	(screen._action_buttons["boons"] as Button).emit_signal("pressed")
	_check(boons_hits.size() == 1, "pressing 'boons' emits boons_requested")

	# Idle home (no run, farm biome, no boss) → the board button says Start Farming.
	_check((screen._action_buttons["board"] as Button).text == "▶ Start Farming",
		"idle home → board button relabelled '▶ Start Farming'")
	game.farm_run_active = true
	screen.refresh()
	_check((screen._action_buttons["board"] as Button).text == "▶ Board",
		"live run → board button relabelled '▶ Board'")
	game.farm_run_active = false

	# ── 2. World render ────────────────────────────────────────────────────────
	var grid: Vector2i = VillageLayout.grid_size()
	var painted: int = screen._ground.get_used_cells().size()
	_check(painted == grid.x * grid.y,
		"Ground paints the FULL grid (%d cells == %d×%d)" % [painted, grid.x, grid.y])

	# Every explicit non-grass kind cell carries that kind's source id.
	var ground: Dictionary = VillageLayout.ground_cells()
	var kind_ok := true
	for kind: String in ground.keys():
		var sid: int = TownArtConfig.ground_source_id(kind)
		for c in ground[kind]:
			if screen._ground.get_cell_source_id(c) != sid:
				kind_ok = false
	_check(kind_ok, "every explicit ground cell painted with its kind's source id")

	# Pads under EMPTY plots of the rendered stage; grass under BUILT plots.
	var stage: int = screen._render_stage
	_check(stage == VillageLayout.stage_for_plot_count(VillageScreen.STATIC_BUILDINGS.size()),
		"rendered stage (%d) derives from the static building count" % stage)
	var plots: Array = VillageLayout.plots_for_stage(stage)
	var built_n: int = mini(VillageScreen.STATIC_BUILDINGS.size(), plots.size())
	_check(plots.size() > built_n,
		"the rendered stage leaves >0 empty plots (%d plots, %d built)" % [plots.size(), built_n])
	var pad_sid: int = TownArtConfig.ground_source_id("pad")
	var grass_sid: int = TownArtConfig.ground_source_id("grass")
	var pads_ok := true
	var built_grass_ok := true
	for i in range(plots.size()):
		var p: Dictionary = plots[i]
		for c in VillageLayout.footprint_cells(p["cell"], p["footprint"]):
			var got: int = screen._ground.get_cell_source_id(c)
			if i < built_n and got != grass_sid:
				built_grass_ok = false
			if i >= built_n and got != pad_sid:
				pads_ok = false
	_check(pads_ok, "every EMPTY plot cell painted 'pad'")
	_check(built_grass_ok, "every BUILT plot cell painted grass (building covers it)")

	# Grass variety: the flip alternatives registered and actually used.
	_check(screen._grass_alts.size() == 4, "4 grass paint variants registered (base + 3 flips)")
	var alts_seen: Dictionary = {}
	for y in range(grid.y):
		for x in range(grid.x):
			var c := Vector2i(x, y)
			if screen._ground.get_cell_source_id(c) == grass_sid:
				alts_seen[screen._ground.get_cell_alternative_tile(c)] = true
	_check(alts_seen.size() >= 3,
		"grass field uses ≥3 distinct variants (got %d)" % alts_seen.size())

	# Buildings: static spread + 3 landmarks, all floor-anchored sprites.
	# (refresh() ran twice — setup + open — so queue_free'd stale children may
	# still be in-tree this frame; count only the live ones.)
	await process_frame
	var live: Array = []
	for ch in screen._buildings.get_children():
		if not ch.is_queued_for_deletion():
			live.append(ch)
	_check(live.size() == built_n + 3,
		"Buildings holds %d sprites (%d static + 3 landmarks), got %d"
		% [built_n + 3, built_n, live.size()])
	for id in ["board_farm", "board_mine", "board_fish"]:
		var node: Node = screen._buildings.get_node_or_null("landmark_" + id)
		_check(node is Sprite2D and (node as Sprite2D).texture != null,
			"landmark sprite '%s' present with a texture" % id)
	var anchors_ok := true
	for ch in live:
		var sp := ch as Sprite2D
		if sp == null or sp.centered or sp.texture == null \
				or sp.texture_filter != CanvasItem.TEXTURE_FILTER_NEAREST:
			anchors_ok = false
	_check(anchors_ok, "every building/landmark sprite: texture, centered=false, NEAREST")

	# Props match the rendered stage's decor entries.
	var decor: Array = VillageLayout.decor_for_stage(stage)
	_check(screen._props.get_child_count() == decor.size(),
		"Props child count (%d) == decor entries for stage %d (%d)"
		% [screen._props.get_child_count(), stage, decor.size()])
	_check(screen._ground.texture_filter == CanvasItem.TEXTURE_FILTER_NEAREST,
		"Ground TileMapLayer uses NEAREST filtering")
	_check(screen._world.y_sort_enabled and screen._props.y_sort_enabled
		and screen._buildings.y_sort_enabled and not screen._ground.y_sort_enabled,
		"Y-sort on World/Props/Buildings, NOT on Ground")

	# ── 3. Camera ─────────────────────────────────────────────────────────────
	var host: Vector2 = screen._host_size()
	var wpx: Vector2 = screen._world_px()
	_check(is_equal_approx(screen._zoom, screen._fit_zoom),
		"open() lands at fit zoom (%.3f)" % screen._zoom)
	_check(is_equal_approx(screen._fit_zoom, maxf(host.x / wpx.x, host.y / wpx.y)),
		"fit zoom is the COVER fit of the host rect")
	var z0: float = screen._zoom
	(screen._action_buttons["zoom_in"] as Button).emit_signal("pressed")
	_check(screen._zoom > z0, "zoom_in button raises the zoom (%.3f → %.3f)" % [z0, screen._zoom])
	var z1: float = screen._zoom
	(screen._action_buttons["zoom_out"] as Button).emit_signal("pressed")
	_check(screen._zoom < z1, "zoom_out button lowers the zoom")
	screen.pan_by(Vector2(120.0, -80.0))
	(screen._action_buttons["recenter"] as Button).emit_signal("pressed")
	_check(is_equal_approx(screen._zoom, screen._fit_zoom),
		"recenter restores the fit zoom")
	# Clamp: a huge pan can never pull the village out of the host rect.
	screen.pan_by(Vector2(99999.0, 99999.0))
	_check(screen._cam_offset.x <= 0.001 and screen._cam_offset.y <= 0.001,
		"pan clamps at the village's top-left edge")
	screen.pan_by(Vector2(-99999.0, -99999.0))
	var min_off: Vector2 = screen._host_size() - screen._world_px() * screen._zoom
	_check(screen._cam_offset.x >= min_off.x - 0.001 and screen._cam_offset.y >= min_off.y - 0.001,
		"pan clamps at the village's bottom-right edge")
	# Zoom clamps to [contain, fit × MAX_OVER_FIT].
	for _i in range(20):
		(screen._action_buttons["zoom_out"] as Button).emit_signal("pressed")
	_check(screen._zoom >= screen._min_zoom - 0.001,
		"zoom-out clamps at the CONTAIN fit (whole village visible)")
	for _i in range(40):
		(screen._action_buttons["zoom_in"] as Button).emit_signal("pressed")
	_check(screen._zoom <= screen._max_zoom + 0.001, "zoom-in clamps at max zoom")
	# Wheel zoom routes through gui_input (mouse path).
	(screen._action_buttons["recenter"] as Button).emit_signal("pressed")
	var zw: float = screen._zoom
	var wheel := InputEventMouseButton.new()
	wheel.button_index = MOUSE_BUTTON_WHEEL_UP
	wheel.pressed = true
	wheel.position = Vector2(200.0, 300.0)
	screen._on_map_gui_input(wheel)
	_check(screen._zoom > zw, "wheel-up via gui_input zooms in")

	# ── 4. Tap routing (farm landmark only in Phase 1) ────────────────────────
	(screen._action_buttons["recenter"] as Button).emit_signal("pressed")
	var farm_hits: Array = []
	screen.start_farming_requested.connect(func() -> void: farm_hits.append(1))
	# Host-px point over the farm landmark's centre (world → host transform).
	var farm: Dictionary = VillageLayout.landmarks()["board_farm"]
	var farm_world := Vector2(
		(float((farm["cell"] as Vector2i).x) + 1.5) * float(TownArtConfig.TILE),
		(float((farm["cell"] as Vector2i).y) + 1.5) * float(TownArtConfig.TILE))
	var farm_host: Vector2 = farm_world * screen._zoom + screen._cam_offset
	screen._resolve_tap(farm_host)
	_check(farm_hits.size() == 1, "tap on the farm landmark emits start_farming_requested")
	# A tap on open plaza ground does nothing in Phase 1.
	var plaza_world := Vector2(17.0 * 16.0, 14.0 * 16.0)
	screen._resolve_tap(plaza_world * screen._zoom + screen._cam_offset)
	_check(farm_hits.size() == 1, "tap on plaza ground emits nothing (Phase 1)")
	# A drag suppresses the tap: press, move past the threshold, release on farm.
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	press.position = farm_host - Vector2(40.0, 0.0)
	screen._on_map_gui_input(press)
	var move := InputEventMouseMotion.new()
	move.position = farm_host
	move.relative = Vector2(40.0, 0.0)
	move.button_mask = MOUSE_BUTTON_MASK_LEFT
	screen._on_map_gui_input(move)
	var release := InputEventMouseButton.new()
	release.button_index = MOUSE_BUTTON_LEFT
	release.pressed = false
	release.position = farm_host
	screen._on_map_gui_input(release)
	_check(farm_hits.size() == 1, "a drag-pan release does NOT fire the farm tap")

	# ── close() emits closed ──────────────────────────────────────────────────
	var closed_hits: Array = []
	screen.closed.connect(func() -> void: closed_hits.append(1))
	screen.close()
	_check(closed_hits.size() == 1, "close() emits 'closed'")
	_check(not screen.visible, "close() hides the screen")

	screen.queue_free()
	await process_frame
