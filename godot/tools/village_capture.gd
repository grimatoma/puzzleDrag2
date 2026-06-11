extends SceneTree
## Dev utility: open the Phase-1 VillageScreen IN-GAME on a realistic GameState
## and save a 720×1280 PNG. Run NON-headless (foreground — background
## non-headless renders are flaky on Windows) so the GPU draws the ground
## TileMapLayer, the floor-anchored building/decor sprites, and the overlay:
##   godot --path godot --script res://tools/village_capture.gd -- <out_path>
##
## Defaults to res://tools/_caps/village.png (_caps/ is gitignored). Sets up a
## City-tier town with three built buildings (the live counts feed the 🔨 Build
## button label; the Phase-1 village itself draws the static spread), opens the
## real screen via Main._open_townmap(), settles, and writes the PNG — the
## phase's visual acceptance evidence.

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

	# A City-tier town with three honest BuildingConfig ids — drives the Build
	# button's live "N/M plots" label (the Phase-1 village art is static).
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.active_biome = "farm"
	main.game.buildings = [
		BuildingConfig.LUMBER_CAMP,
		BuildingConfig.COOP,
		BuildingConfig.BAKERY,
	]
	main._refresh_hud_all()                      # top-bar pills reflect the tier

	# Open the real village screen (lazily builds the shell + fits the camera),
	# then let it settle so the TileMapLayer + sprites + overlay draw cleanly.
	main._open_townmap()
	for _i in range(6):
		await process_frame

	_save(out_path)

	# Second shot zoomed out to the CONTAIN fit — the whole village in frame
	# (letterboxed), for checking the full layout/landmarks/river at a glance.
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
