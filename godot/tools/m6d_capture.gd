extends SceneTree
## Dev utility: open the spatial town map IN-GAME (M6d) on a realistic GameState,
## open the BUILD PICKER on an empty plot, and save a 720×1280 PNG. Run NON-headless
## so the GPU draws the map AND the parchment build-picker card over it:
##   godot --path godot --script res://tools/m6d_capture.gd -- <out_path>
##
## Sets up a City-tier town (11 plots) with two built buildings on the farm biome
## and a generous inventory (so several builds are affordable), opens the real
## TownMapScreen via Main._open_townmap(), then calls the SAME handler a click on an
## empty plot would (_open_build_picker_for_lot) so the picker card renders. The map
## is fed by REAL state — settlement.plots() drives the lot count and game.buildings
## marks the first N lots as built. Migration evidence for the M6d clickable-plot
## build picker + demolish feature.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	var err := img.save_png(path)
	print("saved %s (%s, err %d)" % [path, img.get_size(), err])

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://m6d-buildpicker.png"

	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# A City-tier town (11 plots) with two built buildings on the farm biome, plus a
	# generous inventory so the build picker shows ENABLED Build buttons. Buildings +
	# costs are honest GameState/BuildingConfig values, not fakes.
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.active_biome = "farm"
	main.game.buildings = [BuildingConfig.LUMBER_CAMP, BuildingConfig.COOP]
	main.game.inventory = {"plank": 40, "flour": 40, "hay_bundle": 40, "eggs": 20}

	# Open the real town-map screen (lazily builds the shell + renders the plan), then
	# let it settle so every map layer + the placeholder houses draw cleanly.
	main._open_townmap()
	for _i in range(6):
		await process_frame

	# Open the build picker on the FIRST empty plot — exactly what a left click on an
	# empty lot resolves to (lot index == built_count is the first un-built slot).
	var screen = main._townmap_screen
	var first_empty: int = screen._map.built_count()
	screen._open_build_picker_for_lot(first_empty)
	for _i in range(6):
		await process_frame

	_save(out_path)
	print("  tier=%s plots=%d buildings=%s lots=%d empty_slot_opened=%d biome=%s"
		% [main.game.settlement.tier_name(), main.game.settlement.plots(),
		   main.game.buildings, screen.plan_lot_count(), first_empty, main.game.active_biome])
	quit(0)
