extends SceneTree
## Dev utility: show how the building loadout reshapes the board. Run NON-headless:
##   godot --path godot --script res://tools/m3b_capture.gd -- <dir>
## Writes <dir>/m3b-staples.png (Camp, staples-only board) and
## <dir>/m3b-built.png (Village with Lumber Camp + Coop + Garden placed — the
## board now spawns trees/birds/veg). Migration evidence.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	img.save_png(path)
	print("saved ", path)

func _rebuild_board(main) -> void:
	# Re-pool and regenerate the visible board from the current loadout.
	main.board.set_tile_pool(main.game.active_tile_pool())
	main.board.setup_new_board()

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame

	# 1. Camp — staples only (grass + wheat). No spawners yet.
	_rebuild_board(main)
	main._refresh_buildings()
	main._refresh_settlement()
	main._status_label.text = "Camp — staples only (grass + wheat)"
	for _i in range(6):
		await process_frame
	_save(dir + "/m3b-staples.png")

	# 2. Jump to Village and place all three spawners (skip the grind for the shot).
	main.game.settlement.tier = TownConfig.TIER_VILLAGE
	main.game.inventory = {"hay_bundle": 40, "flour": 40, "plank": 40}
	main.game.build(BuildingConfig.LUMBER_CAMP)
	main.game.build(BuildingConfig.COOP)
	main.game.build(BuildingConfig.GARDEN)
	_rebuild_board(main)
	main._refresh_buildings()
	main._refresh_settlement()
	main._refresh_totals()
	main._status_label.text = "Built Lumber + Coop + Garden — trees, birds, veg now spawn"
	for _i in range(6):
		await process_frame
	_save(dir + "/m3b-built.png")

	print("  categories=%s buildings=%s plots=%d/%d"
		% [main.game.active_categories(), main.game.buildings,
		   main.game.plots_used(), main.game.settlement.plots()])
	quit(0)
