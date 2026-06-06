extends SceneTree
## Dev utility: show the Town-3 rats hazard. Run NON-headless:
##   godot --path godot --script res://tools/m3h_capture.gd -- <dir>
## Writes <dir>/m3h-rats.png — rats infesting the farm board after Town 2 is
## complete, with Ratcatcher shoo charges in the HUD. Migration evidence.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	img.save_png(path)
	print("saved ", path)

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame

	# City + Town 2 beaten → rats active. Build both Ratcatcher buildings.
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.town2_complete = true
	main.game.inventory = {"plank": 30, "hay_bundle": 30, "eggs": 12, "flour": 10}
	main.game.coins = 260
	main.game.build(BuildingConfig.RATCATCHER)
	main.game.build(BuildingConfig.MASTER_RATCATCHER)
	main.board.set_tile_pool(main.game.active_biome_pool())
	main.board.clear_rats_on_grass = main.game.has_master_ratcatcher()
	main.board.setup_new_board()

	# Drop a few rats in known cells so the hazard reads clearly in the shot.
	var t := Constants.Tile
	for cell in [Vector2i(1, 1), Vector2i(3, 2), Vector2i(0, 4), Vector2i(4, 4), Vector2i(2, 5)]:
		main.board.grid[cell.y][cell.x] = t.RAT
	main.board._build_tiles()

	main._refresh_settlement()
	main._refresh_buildings()
	main._refresh_meta()
	main._refresh_rats()
	main._status_label.text = "🐀 Rats infest the board — shoo them or chain grass beside them."
	for _i in range(8):
		await process_frame
	_save(dir + "/m3h-rats.png")

	print("  rats_enabled=%s ratcatcher=%s master=%s charges=%d"
		% [main.game.rats_enabled(), main.game.has_ratcatcher(),
		   main.game.has_master_ratcatcher(), main.game.ratcatcher_charges_left()])
	quit(0)
