extends SceneTree
## Dev utility: open and render the Town UI panel. Run NON-headless:
##   godot --path godot --script res://tools/m3e_capture.gd -- <dir>
## Writes <dir>/m3e-town.png — the real Control-based Town screen with
## Settlement / Buildings / Refine / Market / Orders sections and action
## buttons (replaces the temporary dev keys). Migration evidence.

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

	# A Village mid-game: spawners + bakery placed, raw goods stocked, orders live.
	main.game.settlement.tier = TownConfig.TIER_VILLAGE
	main.game.inventory = {"hay_bundle": 22, "flour": 26, "eggs": 12, "soup": 9, "plank": 18, "bread": 3}
	main.game.coins = 150
	main.game.build(BuildingConfig.LUMBER_CAMP)
	main.game.build(BuildingConfig.COOP)
	main.game.build(BuildingConfig.BAKERY)
	main.board.set_tile_pool(main.game.active_tile_pool())
	main.board.setup_new_board()
	main.game.seed_orders(4)
	main.game.orders = []
	main.game.refill_orders()

	# Open the real Town panel (lazily builds + lays out the Control tree).
	main._open_town()
	for _i in range(10):
		await process_frame
	_save(dir + "/m3e-town.png")

	print("  tier=%s coins=%d buildings=%s orders=%d"
		% [main.game.settlement.tier_name(), main.game.coins,
		   main.game.buildings, main.game.orders.size()])
	quit(0)
