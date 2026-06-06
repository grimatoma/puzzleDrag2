extends SceneTree
## Dev utility: open and render the re-skinned (M4c parchment) Town panel. Run
## NON-headless so the GPU draws the parchment fills, iron borders, drop shadow,
## and pill-styled buttons:
##   godot --path godot --script res://tools/m4c_capture.gd -- <dir>
## Writes <dir>/m4c-town.png — the real Control-based Town screen with Settlement /
## Buildings / Refine / Market / Orders sections in the leather-bound-journal look
## (parchment card on a warm scrim, ember section headers, accent-coded action
## buttons), with both enabled and disabled buttons visible. Migration evidence.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	var err := img.save_png(path)
	print("saved %s (%s, err %d)" % [path, img.get_size(), err])

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# A Village mid-game: spawners + a bakery placed, raw goods stocked, orders live.
	# This makes multiple sections render with BOTH enabled and disabled buttons:
	#  - Buildings: Lumber Camp/Coop/Bakery show "Demolish"; the rest show "Build"
	#    (some affordable → enabled, some not → disabled).
	#  - Refine: "Craft" is enabled for recipes whose station + inputs are present.
	#  - Market: "Sell 1" rows for each owned sellable resource.
	#  - Orders: "Fill" enabled where the resource is in stock, disabled otherwise.
	#  - Settlement: an affordable/unaffordable "Advance to <tier>" tier-up button.
	main.game.settlement.tier = TownConfig.TIER_VILLAGE
	main.game.inventory = {
		"hay_bundle": 22, "flour": 26, "eggs": 12, "soup": 9, "plank": 18, "bread": 3,
	}
	main.game.coins = 150
	main.game.build(BuildingConfig.LUMBER_CAMP)
	main.game.build(BuildingConfig.COOP)
	main.game.build(BuildingConfig.BAKERY)
	main.board.set_tile_pool(main.game.active_tile_pool())
	main.board.setup_new_board()
	main.game.seed_orders(4)
	main.game.orders = []
	main.game.refill_orders()

	# Open the real Town panel (lazily builds + lays out the Control tree), then let
	# it settle so the parchment styles, shadow, and font all draw cleanly.
	main._open_town()
	for _i in range(16):
		await process_frame

	_save(dir + "/m4c-town.png")
	print("  tier=%s coins=%d buildings=%s orders=%d"
		% [main.game.settlement.tier_name(), main.game.coins,
		   main.game.buildings, main.game.orders.size()])
	quit(0)
