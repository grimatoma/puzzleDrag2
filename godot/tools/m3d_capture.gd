extends SceneTree
## Dev utility: show the Orders coin-sink. Run NON-headless:
##   godot --path godot --script res://tools/m3d_capture.gd -- <dir>
## Writes <dir>/m3d-orders.png — a Village with active orders in the HUD and
## one just filled for coins. Migration evidence.

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

	# Village with the spawners + bakery, so orders can request eggs/soup/bread.
	main.game.settlement.tier = TownConfig.TIER_VILLAGE
	main.game.inventory = {"hay_bundle": 30, "flour": 24, "eggs": 14, "soup": 10, "plank": 20}
	main.game.coins = 25
	main.game.build(BuildingConfig.LUMBER_CAMP)
	main.game.build(BuildingConfig.COOP)
	main.game.build(BuildingConfig.GARDEN)
	main.board.set_tile_pool(main.game.active_tile_pool())
	main.board.setup_new_board()

	# Deterministic order board, then fill the first order we can satisfy.
	main.game.seed_orders(7)
	main.game.orders = []
	main.game.refill_orders()
	var filled := {}
	for i in main.game.orders.size():
		if main.game.can_fill_order(i):
			filled = main.game.fill_order(i)
			break

	main._refresh_buildings()
	main._refresh_settlement()
	main._refresh_totals()
	main._refresh_meta()
	main._refresh_orders()
	if not filled.is_empty():
		main._status_label.text = "Filled order: %d×%s → +%d coins" % [filled["qty"], filled["resource"], filled["reward"]]
	for _i in range(6):
		await process_frame
	_save(dir + "/m3d-orders.png")

	print("  coins=%d orders=%s" % [main.game.coins, main.game.orders])
	quit(0)
