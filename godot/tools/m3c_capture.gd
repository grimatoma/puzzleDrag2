extends SceneTree
## Dev utility: show the refining + market economy. Run NON-headless:
##   godot --path godot --script res://tools/m3c_capture.gd -- <dir>
## Writes <dir>/m3c-economy.png — a Village with a Bakery, bread baked from
## flour+eggs, and coins earned at the Market. Migration evidence.

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

	# Set up a Village with the Bakery placed and raw goods in stock.
	main.game.settlement.tier = TownConfig.TIER_VILLAGE
	main.game.inventory = {"flour": 30, "eggs": 8, "hay_bundle": 30, "plank": 30, "soup": 6}
	main.game.coins = 40
	main.game.build(BuildingConfig.LUMBER_CAMP)
	main.game.build(BuildingConfig.GARDEN)
	main.game.build(BuildingConfig.BAKERY)
	main.board.set_tile_pool(main.game.active_tile_pool())
	main.board.setup_new_board()

	# Bake bread three times (3 flour + 1 egg each), then sell 2 soup for coins.
	for _i in range(3):
		main.game.craft(RecipeConfig.BREAD)
	main.game.sell("soup", 2)

	main._refresh_buildings()
	main._refresh_settlement()
	main._refresh_totals()
	main._refresh_meta()
	main._status_label.text = "Baked 3 bread (flour+eggs) · sold 2 soup at Market"
	for _i in range(6):
		await process_frame
	_save(dir + "/m3c-economy.png")

	print("  coins=%d inventory=%s" % [main.game.coins, main.game.inventory])
	quit(0)
