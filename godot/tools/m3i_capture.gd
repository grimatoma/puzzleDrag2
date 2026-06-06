extends SceneTree
## Dev utility: show the M3i mine RUBBLE hazard. Run NON-headless:
##   godot --path godot --script res://tools/m3i_capture.gd -- <dir>
## Writes <dir>/m3i-rubble.png — a Town-2 mine expedition where cave-in rubble
## (dark grey-brown) clutters the board among the mine ores; clear it by mining
## through it (a STONE chain sweeps adjacent rubble). Migration evidence.

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

	# Put the game into a City-tier mine expedition. Set the biome + turns directly
	# (the mine-entry gate is exercised by the tests; here we just want the mine board).
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.active_biome = "mine"
	main.game.mine_turns_left = 7
	main.game.inventory = {"block": 14, "iron_bar": 9, "coke": 3, "cut_gem": 1}
	main.game.coins = 180
	# Re-pool the board onto the mine (MINE_POOL + rubble) and turn on mining-through:
	# a STONE chain clears adjacent rubble while on the expedition.
	main.board.set_tile_pool(main.game.active_biome_pool())
	main.board.clear_rubble_on_stone = main.game.is_in_mine()
	main.board.setup_new_board()

	# Drop a few rubble tiles in known cells so the hazard reads clearly in the shot —
	# spread across the board, set next to STONE where possible so the "mine through it"
	# read is obvious.
	var t := Constants.Tile
	for cell in [Vector2i(1, 1), Vector2i(3, 0), Vector2i(0, 3), Vector2i(4, 2), Vector2i(2, 4), Vector2i(5, 5)]:
		main.board.grid[cell.y][cell.x] = t.RUBBLE
	main.board._build_tiles()

	main._refresh_settlement()
	main._refresh_buildings()
	main._refresh_meta()
	main._refresh_totals()
	main._refresh_biome()
	main._status_label.text = "⛏ Cave-in rubble clutters the mine — clear it by mining (chain stone beside it)."
	for _i in range(10):
		await process_frame
	_save(dir + "/m3i-rubble.png")

	print("  in_mine=%s turns=%d rubble_clear=%s rubble_on_board=%d"
		% [main.game.is_in_mine(), main.game.mine_turns_left,
		   main.board.clear_rubble_on_stone, _grid_count(main.board.grid, t.RUBBLE)])
	quit(0)

func _grid_count(grid: Array, tile: int) -> int:
	var n := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n
