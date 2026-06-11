extends SceneTree
## Dev utility: open the Phase-2 VillageScreen IN-GAME on a realistic GameState
## and save a 720×1280 PNG. Run NON-headless (foreground — background
## non-headless renders are flaky on Windows) so the GPU draws the ground
## TileMapLayer, the floor-anchored building/decor sprites, and the overlay:
##   godot --path godot --script res://tools/village_capture.gd -- <out_path>
##
## Defaults to res://tools/_caps/village.png (_caps/ is gitignored). Sets up a
## City-tier town, GRANTS resources, and BUILDS several buildings through the
## REAL game.build() API (no direct buildings pokes) so the capture shows the
## GameState-driven village: building sprites on the first ordinal plots, empty
## pads on the rest, landmarks + decor around them. Opens the real screen via
## Main._open_townmap(), settles, and writes the PNG — the phase's visual
## acceptance evidence. A second _wide shot zooms out to the CONTAIN fit.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	var err := img.save_png(path)
	print("saved %s (%s, err %d)" % [path, img.get_size(), err])

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://tools/_caps/village.png"
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_path).get_base_dir())

	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# Keep the first-load tutorial out of the shot (standard capture-tool move).
	main.game.mark_tutorial_seen()
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false

	# A City-tier town built up through the REAL build API: grant the resources
	# the costs need, then game.build() a spread of spawners / refiners /
	# landmarks. The village renders these on the first ordinal plots; the
	# remaining lots show as prepared pads (the buildings-with-pads mix the
	# capture is meant to show).
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.active_biome = "farm"
	var grant := {"hay_bundle": 200, "flour": 200, "plank": 200, "eggs": 80,
		"block": 120, "iron_bar": 40, "soup": 40}
	for k in grant:
		main.game.inventory[k] = grant[k]
	for id in [
		BuildingConfig.LUMBER_CAMP, BuildingConfig.COOP, BuildingConfig.GARDEN,
		BuildingConfig.BAKERY, BuildingConfig.MILL, BuildingConfig.GRANARY,
		BuildingConfig.SILO, BuildingConfig.CHAPEL, BuildingConfig.WORKSHOP,
		BuildingConfig.STABLE,
	]:
		var res: Dictionary = main.game.build(id)
		if not bool(res.get("ok", false)):
			print("  build FAILED: %s → %s" % [id, str(res)])
	main._refresh_hud_all()                      # top-bar pills reflect the tier

	# Open the real village screen (lazily builds the shell + fits the camera),
	# then let it settle so the TileMapLayer + sprites + overlay draw cleanly.
	main._open_townmap()
	for _i in range(6):
		await process_frame

	# Phase 3 — walking villagers: deterministically advance the wander FSM a
	# few simulated seconds so the crowd is caught MID-STREET (walking between
	# cells), not all standing on their spawn points. Foreground _process walks
	# them too; the manual step() just guarantees the pose regardless of how
	# fast the settle frames ran.
	var npcs = main._townmap_screen._npcs
	for _i in range(40):
		npcs.step(0.1)
	var walking: int = 0
	for v in npcs._villagers:
		if v.state == VillageNpcs.STATE_WALK:
			walking += 1
	print("  villagers=%d walking=%d" % [npcs._villagers.size(), walking])
	for _i in range(2):
		await process_frame

	_save(out_path)

	# Second shot zoomed out to the CONTAIN fit — the whole village in frame
	# (letterboxed), for checking buildings/pads/landmarks/river at a glance.
	var screen = main._townmap_screen
	while screen._zoom > screen._min_zoom + 0.001:
		screen.zoom_at(1.0 / VillageScreen.ZOOM_STEP, screen._host_size() * 0.5)
	for _i in range(3):
		await process_frame
	var wide_path: String = out_path.get_basename() + "_wide." + out_path.get_extension()
	_save(wide_path)
	print("  tier=%s plots=%d buildings=%s lots=%d stage=%d zoom=%.2f"
		% [main.game.settlement.tier_name(), main.game.settlement.plots(),
		   main.game.buildings, main._townmap_screen.plan_lot_count(),
		   main._townmap_screen._render_stage, main._townmap_screen._zoom])
	quit(0)
