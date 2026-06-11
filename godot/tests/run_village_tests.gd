extends SceneTree
## Headless tests for the Phase-2 VillageScreen — the Stardew-style top-down
## village view on the Town nav route, now fully GameState-driven (plots from
## the live tier, buildings from game.buildings, tap routing into the build
## picker / demolish card / expedition launches).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_village_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## NOTE: assets must be imported first (godot --headless --path godot --import),
## otherwise ground/sprite texture lookups miss (same caveat as
## run_town_assets_tests.gd).
##
## Layers:
##   1. Screen contract — the six signals, the 8 static _action_buttons keys,
##      plan_lot_count() == TownConfig.tier_plots(tier), open/close lifecycle.
##   2. World render from REAL state — a fresh Camp GameState renders ALL its
##      granted plots as empty pads (0 buildings), full-grid ground paint with
##      the right kinds, varied grass, the 3 landmarks, stage-filtered decor.
##   3. Build / demolish through the REAL picker buttons — build ×3 via
##      build:<id> → 3 building sprites + the rest pads, state_changed
##      observed; pad tap opens the picker (locked rows absent), built tap
##      opens the info card, demolish reverts the plot to a pad.
##   4. Landmark taps — farm → start_farming_requested; mine/fish locked →
##      notice toast, no crash, no signals; mine/fish unlocked → expedition
##      launched + state_changed + board_requested (the TownScreen funnel).
##   5. Stage / lot math — _render_stage honors stage_for_plot_count(
##      plan_lot_count()) across a tier change; pads repaint on BOTH stage
##      decrease and increase (the full-catalog repaint).
##   6. Camera — fit-on-open, zoom in/out/recenter via the registered buttons,
##      pan + zoom clamped so the village never leaves the host rect.
##   7. Drag-pan suppresses the tap.

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
	print("\n── VillageScreen (town-map rebuild Phase 2) tests ─")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

## Host-px point over the centre of a landmark/plot footprint (world → host).
func _host_point(screen: VillageScreen, cell: Vector2i, footprint: Vector2i) -> Vector2:
	var world := Vector2(
		(float(cell.x) + float(footprint.x) * 0.5) * float(TownArtConfig.TILE),
		(float(cell.y) + float(footprint.y) * 0.5) * float(TownArtConfig.TILE))
	return world * screen._zoom + screen._cam_offset

## Live (not queued-for-deletion) children of `node`.
func _live_children(node: Node) -> Array:
	var out: Array = []
	for ch in node.get_children():
		if not ch.is_queued_for_deletion():
			out.append(ch)
	return out

## Count of live building_* sprites under the screen's Buildings node.
func _building_sprite_count(screen: VillageScreen) -> int:
	var n: int = 0
	for ch in _live_children(screen._buildings):
		if String(ch.name).begins_with("building_"):
			n += 1
	return n

## Per-plot pad/grass paint census over the screen's visible plots: returns
## {pads: int, grass: int, mixed: int} counting plots whose 9 cells are all
## pad, all grass, or inconsistently painted (always a bug).
func _plot_paint_census(screen: VillageScreen) -> Dictionary:
	var pad_sid: int = TownArtConfig.ground_source_id("pad")
	var out := {"pads": 0, "grass": 0, "mixed": 0}
	for p: Dictionary in screen._visible_plots():
		var pad_cells: int = 0
		var cells: Array = VillageLayout.footprint_cells(p["cell"], p["footprint"])
		for c in cells:
			if screen._ground.get_cell_source_id(c) == pad_sid:
				pad_cells += 1
		if pad_cells == cells.size():
			out["pads"] += 1
		elif pad_cells == 0:
			out["grass"] += 1
		else:
			out["mixed"] += 1
	return out

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

	for key in ["board", "close", "build_open",
			"zoom_in", "zoom_out", "recenter"]:
		_check(screen._action_buttons.has(key) and screen._action_buttons[key] is Button,
			"_action_buttons['%s'] is a Button" % key)
	# The on-map "Town Ledger" / "Boons" buttons (and the title pill) were removed
	# (parity with main's TownMapScreen change a8ea14a6): the ledger and Boons are
	# reached via the ☰ menu; ledger_requested / boons_requested stay latent routes.
	_check(not screen._action_buttons.has("ledger"), "no on-map 'ledger' button (removed)")
	_check(not screen._action_buttons.has("boons"), "no on-map 'boons' button (removed)")

	_check(screen.plan_lot_count() == max(1, TownConfig.tier_plots(game.settlement.tier)),
		"plan_lot_count() (%d) == tier_plots(tier %d)"
		% [screen.plan_lot_count(), game.settlement.tier])
	game.settlement.tier = TownConfig.TIER_CITY
	_check(screen.plan_lot_count() == TownConfig.tier_plots(TownConfig.TIER_CITY),
		"plan_lot_count() tracks the live tier (City → %d)" % screen.plan_lot_count())
	game.settlement.tier = TownConfig.TIER_CAMP

	var board_hits: Array = []
	screen.board_requested.connect(func() -> void: board_hits.append(1))
	(screen._action_buttons["board"] as Button).emit_signal("pressed")
	_check(board_hits.size() == 1, "pressing 'board' emits board_requested")

	# Idle home (no run, farm biome, no boss) → the board button says Start Farming.
	_check((screen._action_buttons["board"] as Button).text == "▶ Start Farming",
		"idle home → board button relabelled '▶ Start Farming'")
	game.farm_run_active = true
	screen.refresh()
	_check((screen._action_buttons["board"] as Button).text == "▶ Board",
		"live run → board button relabelled '▶ Board'")
	game.farm_run_active = false
	screen.refresh()

	# ── 2. World render from REAL state (fresh Camp: 5 pads, 0 buildings) ──────
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

	# Stage derives from the LIVE tier's plot grant (Camp = 5 plots → stage 1
	# since the 2026-06-10 staged-growth re-tune).
	_check(screen._render_stage == VillageLayout.stage_for_plot_count(screen.plan_lot_count()),
		"rendered stage (%d) == stage_for_plot_count(plan_lot_count() %d)"
		% [screen._render_stage, screen.plan_lot_count()])
	_check(screen._visible_plots().size() == screen.plan_lot_count(),
		"visible plots (%d) == the tier's lot grant (%d)"
		% [screen._visible_plots().size(), screen.plan_lot_count()])
	# Fresh game: 0 buildings → EVERY visible plot is an all-pad lot; plots past
	# the lot grant stay grass.
	_check(_building_sprite_count(screen) == 0, "fresh Camp: 0 building sprites")
	var census: Dictionary = _plot_paint_census(screen)
	_check(int(census["pads"]) == screen.plan_lot_count() and int(census["mixed"]) == 0,
		"fresh Camp: all %d visible plots painted as pads (got %s)"
		% [screen.plan_lot_count(), str(census)])
	var grass_sid: int = TownArtConfig.ground_source_id("grass")
	var pad_sid: int = TownArtConfig.ground_source_id("pad")
	var beyond_ok := true
	var all_plots: Array = VillageLayout.plots()
	for i in range(screen.plan_lot_count(), all_plots.size()):
		var p: Dictionary = all_plots[i]
		for c in VillageLayout.footprint_cells(p["cell"], p["footprint"]):
			if screen._ground.get_cell_source_id(c) != grass_sid:
				beyond_ok = false
	_check(beyond_ok, "plots beyond the tier's lot grant stay grass (no stray pads)")

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

	# Landmarks always present, floor-anchored NEAREST sprites.
	for id in ["board_farm", "board_mine", "board_fish"]:
		var node: Node = screen._buildings.get_node_or_null("landmark_" + id)
		_check(node is Sprite2D and (node as Sprite2D).texture != null,
			"landmark sprite '%s' present with a texture" % id)
	var anchors_ok := true
	for ch in _live_children(screen._buildings):
		var sp := ch as Sprite2D
		if sp == null or sp.centered or sp.texture == null \
				or sp.texture_filter != CanvasItem.TEXTURE_FILTER_NEAREST:
			anchors_ok = false
	_check(anchors_ok, "every building/landmark sprite: texture, centered=false, NEAREST")

	# Props match the rendered stage's decor entries (clear-before-place: exact).
	var decor: Array = VillageLayout.decor_for_stage(screen._render_stage)
	_check(_live_children(screen._props).size() == decor.size(),
		"Props child count (%d) == decor entries for stage %d (%d)"
		% [_live_children(screen._props).size(), screen._render_stage, decor.size()])
	_check(screen._ground.texture_filter == CanvasItem.TEXTURE_FILTER_NEAREST,
		"Ground TileMapLayer uses NEAREST filtering")
	_check(screen._world.y_sort_enabled and screen._props.y_sort_enabled
		and screen._buildings.y_sort_enabled and not screen._ground.y_sort_enabled,
		"Y-sort on World/Props/Buildings, NOT on Ground")

	# ── 3. Build / demolish through the REAL picker ────────────────────────────
	# Village tier + a stocked inventory so several builds are affordable
	# (lumber_camp hay8+flour4, coop plank6+flour6, garden plank6+hay10).
	game.settlement.tier = TownConfig.TIER_VILLAGE
	game.inventory = {"plank": 60, "flour": 60, "hay_bundle": 60, "eggs": 20}
	screen.refresh()
	var changed := {"n": 0}
	screen.state_changed.connect(func() -> void: changed.n += 1)

	# Build ×3 via the REAL picker action buttons (build_open opens the picker —
	# Phase 1's interim ledger routing is GONE).
	for want_id in [BuildingConfig.LUMBER_CAMP, BuildingConfig.COOP, BuildingConfig.GARDEN]:
		(screen._action_buttons["build_open"] as Button).emit_signal("pressed")
		_check(screen._action_buttons.has("picker_close"),
			"build_open opened the picker (key 'build:%s' round)" % want_id)
		var key: String = "build:" + String(want_id)
		_check(screen._action_buttons.has(key) and not (screen._action_buttons[key] as Button).disabled,
			"picker row '%s' is present + ENABLED" % key)
		(screen._action_buttons[key] as Button).emit_signal("pressed")
	_check(game.buildings == [BuildingConfig.LUMBER_CAMP, BuildingConfig.COOP, BuildingConfig.GARDEN],
		"three picker builds landed in game.buildings (got %s)" % str(game.buildings))
	_check(changed.n == 3, "each successful build emitted state_changed (3 total)")
	_check(not screen._action_buttons.has("picker_close"), "the picker closes after a build")
	_check(_building_sprite_count(screen) == 3, "3 building sprites placed on the first plots")
	census = _plot_paint_census(screen)
	_check(int(census["pads"]) == screen.plan_lot_count() - 3
		and int(census["grass"]) == 3 and int(census["mixed"]) == 0,
		"pad↔building swap: 3 built plots grass-under-sprite, %d pads (got %s)"
		% [screen.plan_lot_count() - 3, str(census)])
	# Build-button label tracks the live counts.
	_check("3/%d" % screen.plan_lot_count() in (screen._action_buttons["build_open"] as Button).text,
		"build_open label shows the live 3/%d counts" % screen.plan_lot_count())

	# Pad TAP → picker opens; picker_close dismisses; tier-locked rows have NO
	# build:<id> button (the old picker's "Requires <Tier>" + 🔒 semantics).
	var plots: Array = screen._visible_plots()
	var empty_plot: Dictionary = plots[3]   # first un-built plot
	screen._resolve_tap(_host_point(screen, empty_plot["cell"], empty_plot["footprint"]))
	_check(screen._action_buttons.has("picker_close"), "tapping an empty pad opens the build picker")
	_check(screen._action_buttons.has("build:" + BuildingConfig.BAKERY),
		"Village-tier picker offers the Bakery (unlocked row)")
	_check(not screen._action_buttons.has("build:" + BuildingConfig.WORKSHOP),
		"Town-tier Workshop row is LOCKED at Village (no build button — 🔒 row)")
	_check(not screen._action_buttons.has("build:" + BuildingConfig.RATCATCHER),
		"rats-hazard buildings never appear in the picker")
	(screen._action_buttons["picker_close"] as Button).emit_signal("pressed")
	_check(not screen._action_buttons.has("picker_close"), "picker_close dismisses the picker")
	_check(screen._action_buttons.has("build_open"), "static keys survive the panel close")

	# Built-plot TAP → info card with a demolish button; demolish shrinks
	# game.buildings and the plot reverts to a pad.
	var built_plot: Dictionary = plots[0]
	screen._resolve_tap(_host_point(screen, built_plot["cell"], built_plot["footprint"]))
	_check(screen._action_buttons.has("demolish"), "tapping a BUILT plot opens the info/demolish card")
	(screen._action_buttons["demolish"] as Button).emit_signal("pressed")
	_check(game.buildings == [BuildingConfig.COOP, BuildingConfig.GARDEN],
		"demolish removed plot 0's building (got %s)" % str(game.buildings))
	_check(changed.n == 4, "the demolish emitted state_changed")
	_check(_building_sprite_count(screen) == 2, "a building sprite reverted to a pad (2 left)")
	census = _plot_paint_census(screen)
	_check(int(census["pads"]) == screen.plan_lot_count() - 2 and int(census["mixed"]) == 0,
		"pad count grew back after the demolish (got %s)" % str(census))

	# Bare-ground tap dismisses an open panel (and opens nothing).
	(screen._action_buttons["build_open"] as Button).emit_signal("pressed")
	_check(screen._action_buttons.has("picker_close"), "picker open before the bare-ground tap")
	screen._resolve_tap(_host_point(screen, Vector2i(16, 13), Vector2i.ONE))   # plaza street
	_check(not screen._action_buttons.has("picker_close"),
		"a tap on bare ground dismisses the open panel")

	# ── 4. Landmark taps ───────────────────────────────────────────────────────
	var lms: Dictionary = VillageLayout.landmarks()
	var farm_hits: Array = []
	screen.start_farming_requested.connect(func() -> void: farm_hits.append(1))
	var farm_lm: Dictionary = lms["board_farm"]
	screen._resolve_tap(_host_point(screen, farm_lm["cell"], farm_lm["footprint"]))
	_check(farm_hits.size() == 1, "tap on the farm landmark emits start_farming_requested")
	_check(not screen._action_buttons.has("picker_close") and not screen._action_buttons.has("demolish"),
		"the farm tap opened NO build/demolish panel")

	# MINE locked (Village tier, no supplies): no crash, a notice toast, no signals.
	board_hits.clear()
	changed.n = 0
	var mine_lm: Dictionary = lms["board_mine"]
	var mine_pt: Vector2 = _host_point(screen, mine_lm["cell"], mine_lm["footprint"])
	screen._resolve_tap(mine_pt)
	_check(board_hits.is_empty() and changed.n == 0,
		"locked mine tap: no board_requested / state_changed")
	_check(screen._toast != null and screen._toast.is_showing(),
		"locked mine tap shows a notice toast")
	_check("City" in screen._toast.current_text(),
		"the mine notice names the City-tier gate (got '%s')" % screen._toast.current_text())

	# FISH locked (town2 incomplete): notice names the capstone, no signals.
	var fish_lm: Dictionary = lms["board_fish"]
	var fish_pt: Vector2 = _host_point(screen, fish_lm["cell"], fish_lm["footprint"])
	screen._resolve_tap(fish_pt)
	_check(board_hits.is_empty() and changed.n == 0,
		"locked fish tap: no board_requested / state_changed")
	_check(screen._toast.is_showing()
		and BossConfig.boss_name(BossConfig.CAPSTONE) in screen._toast.current_text(),
		"the harbor notice names the Town-2 capstone (got '%s')" % screen._toast.current_text())

	# MINE unlocked (City + supplies): launches the expedition → state_changed
	# AND board_requested (the TownScreen funnel), biome flips to the mine.
	game.settlement.tier = TownConfig.TIER_CITY
	game.inventory["supplies"] = 3
	screen.refresh()
	screen._resolve_tap(mine_pt)
	_check(game.is_in_mine() and game.mine_turns_left == 3,
		"unlocked mine tap launched the expedition (3 supplies → 3 turns)")
	_check(changed.n == 1 and board_hits.size() == 1,
		"mine launch emitted state_changed + board_requested")
	# Already out: a second mine tap just returns to the live board (no re-launch).
	screen._resolve_tap(mine_pt)
	_check(board_hits.size() == 2 and changed.n == 1,
		"mine tap while already out re-emits board_requested only")
	game.leave_mine()
	screen.refresh()

	# FISH unlocked (town2 complete + supplies): same funnel via enter_harbor.
	game.town2_complete = true
	game.inventory["supplies"] = 2
	board_hits.clear()
	changed.n = 0
	screen._resolve_tap(fish_pt)
	_check(game.is_in_harbor() and game.harbor_turns_left == 2,
		"unlocked fish tap launched the harbor voyage (2 supplies → 2 turns)")
	_check(changed.n == 1 and board_hits.size() == 1,
		"harbor launch emitted state_changed + board_requested")
	game.leave_harbor()
	game.town2_complete = false
	game.settlement.tier = TownConfig.TIER_VILLAGE   # reset for the stage-math section
	screen.refresh()

	# ── 5. Stage / lot math across refresh() ──────────────────────────────────
	# Tier UP (Village 15 → City 25): more pads appear on the next refresh and
	# the stage keeps honoring stage_for_plot_count(plan_lot_count()).
	var pads_before: int = int(_plot_paint_census(screen)["pads"])
	game.settlement.tier = TownConfig.TIER_CITY
	screen.refresh()
	_check(screen._render_stage == VillageLayout.stage_for_plot_count(screen.plan_lot_count()),
		"after a tier change the stage re-derives from plan_lot_count()")
	var pads_after: int = int(_plot_paint_census(screen)["pads"])
	_check(screen._visible_plots().size() == TownConfig.tier_plots(TownConfig.TIER_CITY),
		"City tier → %d visible plots" % TownConfig.tier_plots(TownConfig.TIER_CITY))
	_check(pads_after == pads_before + (TownConfig.tier_plots(TownConfig.TIER_CITY)
		- TownConfig.tier_plots(TownConfig.TIER_VILLAGE)),
		"tier-up grew the pad count (%d → %d)" % [pads_before, pads_after])

	# ── 5b. STAGED GROWTH (2026-06-10 re-tune): every tier lands exactly on
	# the next VillageLayout stage band (5/10/15/20/25 ⇒ stages 1..5), so the
	# village physically grows on each tier-up — more pads AND more decor.
	var ladder_ok := true
	var decor_ok := true
	for t in range(TownConfig.TIER_CAMP, TownConfig.MAX_TIER + 1):
		game.settlement.tier = t
		screen.refresh()
		if screen._visible_plots().size() != TownConfig.tier_plots(t) \
				or screen._render_stage != t:
			ladder_ok = false
		if _live_children(screen._props).size() \
				!= VillageLayout.decor_for_stage(t).size():
			decor_ok = false
	_check(ladder_ok,
		"tier ladder walks the stage bands (5/10/15/20/25 plots ⇒ stages 1..5)")
	_check(decor_ok, "each tier's decor matches its stage band (village dresses up)")

	# ── 5c. SAVE OVERFLOW: a save holding MORE buildings than the tier grant
	# (a pre-re-tune save, e.g. 8 buildings at Camp's 5 lots) must still render
	# EVERY built building; pads never appear past the grant; new builds stay
	# blocked by the plot guard.
	game.settlement.tier = TownConfig.TIER_CAMP
	var kept_buildings: Array = game.buildings.duplicate()
	game.buildings = []
	for i in range(8):
		game.buildings.append("overflow_dummy_%d" % i)
	screen.refresh()
	_check(screen._visible_plots().size() == 8,
		"overflow: visible plots extend to the 8 built (grant is 5)")
	_check(_building_sprite_count(screen) == 8,
		"overflow: ALL 8 built buildings render")
	census = _plot_paint_census(screen)
	_check(int(census["pads"]) == 0 and int(census["mixed"]) == 0,
		"overflow: zero pads (nothing buildable past the grant; got %s)" % str(census))
	_check(game.plots_free() == 0, "overflow: plots_free clamps to 0 (no new builds)")
	game.buildings = kept_buildings
	screen.refresh()
	_check(screen._visible_plots().size() == TownConfig.tier_plots(TownConfig.TIER_CAMP),
		"clearing the overflow restores the tier's own grant")

	# Stage DECREASE then INCREASE (forced through the internals — refresh()
	# itself always re-derives the stage from the live grant): pads beyond the
	# small stage's plot set revert to grass, decor shrinks to the stage's
	# entries — then ONE refresh() restores the live-state stage, pads, and
	# decor exactly (the full-catalog repaint + clear-before-place make this
	# symmetric).
	game.settlement.tier = TownConfig.TIER_CITY
	screen.refresh()
	screen._render_stage = 1
	screen._place_props()
	screen._rebuild_buildings(game.buildings)
	_check(_live_children(screen._props).size() == VillageLayout.decor_for_stage(1).size(),
		"forced stage 1: decor shrank to the stage-1 entries (no accumulation)")
	_check(screen._visible_plots().size() == VillageLayout.plots_for_stage(1).size(),
		"forced stage 1: visible plots == the stage-1 plot set")
	var stray_pads := false
	for i in range(VillageLayout.plots_for_stage(1).size(), all_plots.size()):
		var p2: Dictionary = all_plots[i]
		for c in VillageLayout.footprint_cells(p2["cell"], p2["footprint"]):
			if screen._ground.get_cell_source_id(c) == pad_sid:
				stray_pads = true
	_check(not stray_pads, "stage DECREASE reverted out-of-stage pads to grass")
	screen.refresh()
	_check(screen._render_stage == VillageLayout.stage_for_plot_count(screen.plan_lot_count()),
		"refresh() restored the live-state stage (%d)" % screen._render_stage)
	_check(_live_children(screen._props).size()
		== VillageLayout.decor_for_stage(screen._render_stage).size(),
		"stage INCREASE re-placed the full decor set exactly (no dupes)")
	_check(int(_plot_paint_census(screen)["pads"]) == screen._visible_plots().size() - 2,
		"stage INCREASE repainted the full pad set (visible minus 2 built)")
	game.settlement.tier = TownConfig.TIER_CAMP
	screen.refresh()

	# ── 6. Camera ─────────────────────────────────────────────────────────────
	var host: Vector2 = screen._host_size()
	var wpx: Vector2 = screen._world_px()
	screen.open()   # re-fit (the sections above didn't touch the camera)
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

	# ── 7. A drag-pan suppresses the tap ──────────────────────────────────────
	(screen._action_buttons["recenter"] as Button).emit_signal("pressed")
	var farm_host: Vector2 = _host_point(screen, farm_lm["cell"], farm_lm["footprint"])
	farm_hits.clear()
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
	_check(farm_hits.is_empty(), "a drag-pan release does NOT fire the farm tap")

	# ── close() emits closed ──────────────────────────────────────────────────
	var closed_hits: Array = []
	screen.closed.connect(func() -> void: closed_hits.append(1))
	screen.close()
	_check(closed_hits.size() == 1, "close() emits 'closed'")
	_check(not screen.visible, "close() hides the screen")

	screen.queue_free()
	await process_frame
