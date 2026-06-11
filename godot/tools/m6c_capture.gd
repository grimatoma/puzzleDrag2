extends SceneTree
## Dev utility: open the spatial town map IN-GAME (M6c) on a realistic GameState and
## save a 720×1280 PNG. Run NON-headless so the GPU draws the roads, water, fields,
## trees, plaza/props, and the placeholder built houses:
##   godot --path godot --script res://tools/m6c_capture.gd -- <out_path>
##
## Sets up a City-tier town with three built buildings, opens the real Town-route
## screen (now the VillageScreen) via Main._open_townmap(), lets it settle, and
## writes the PNG. The map is fed by REAL state: settlement.plots() drives the lot
## count and game.buildings marks the first N plots as built. (Superseded by
## tools/village_capture.gd, which builds through the real API — kept as a quick
## duck-typed smoke shot.)

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	var err := img.save_png(path)
	print("saved %s (%s, err %d)" % [path, img.get_size(), err])

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://m6c-townmap.png"

	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# A City-tier town (11 plots) with three built buildings on the farm biome. The
	# first 3 lots render as labelled placeholder houses; the remaining 8 stay empty
	# fenced pads. Buildings are honest GameState ids (BuildingConfig), not fakes.
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.active_biome = "farm"
	main.game.buildings = [
		BuildingConfig.LUMBER_CAMP,
		BuildingConfig.COOP,
		BuildingConfig.BAKERY,
	]

	# Open the real town-map screen (lazily builds the shell + renders the plan), then
	# let it settle so every layer + the placeholder houses draw cleanly.
	main._open_townmap()
	for _i in range(6):
		await process_frame

	_save(out_path)
	print("  tier=%s plots=%d buildings=%s lots=%d biome=%s"
		% [main.game.settlement.tier_name(), main.game.settlement.plots(),
		   main.game.buildings, main._townmap_screen.plan_lot_count(), main.game.active_biome])
	quit(0)
