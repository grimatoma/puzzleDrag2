extends SceneTree
## Dev utility: render the real Main scene and capture the M4e board "juice" —
## the reward chip flying from the board toward the coin pill (the original game's
## "rewardTrajectory") plus the refilled tiles popping in mid scale-in. Run
## NON-headless so the GPU actually draws the parchment chip, shadows, and tweens:
##   godot --path godot --script res://tools/m4e_capture.gd -- <dir>
## Writes <dir>/m4e-juice.png. We drive a REAL 4-grass chain through the same drag
## entry points the pointer uses and FINISH it (so _resolve fires, the chain_resolved
## signal lands, and Main spawns one reward chip), then await only a HANDFUL of frames
## so the chip is captured MID-FLIGHT (the flight is ~0.7s ≈ 42 frames at 60fps) while
## the fresh refill tiles are still mid scale-in.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()                         # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let the deferred _ready run

	var game: GameState = main.game
	# ── A representative mid-game state (mirrors m4b) ────────────────────────────
	game.settlement.tier = TownConfig.TIER_CITY
	game.coins = 1240
	game.buildings = [BuildingConfig.LUMBER_CAMP, BuildingConfig.COOP]
	game.inventory = {
		"hay_bundle": 48,
		"flour": 31,
		"eggs": 12,
		"soup": 9,
		"plank": 26,
		"bread": 5,
		"block": 17,
		"iron_bar": 8,
		"coke": 4,
		"cut_gem": 2,
	}
	# Sit hay_bundle one short of a whole unit (grass threshold) so the 4-chain we
	# drive lands a WHOLE UNIT → the reward chip reads "+1 hay_bundle" in gold.
	var grass_threshold: int = Constants.threshold_for(Constants.Tile.GRASS)
	game.progress = {"hay_bundle": maxi(0, grass_threshold - 1)}
	main._last_res = "hay_bundle"
	main._last_threshold = grass_threshold
	game.seed_orders(1337)
	game.refill_orders()

	var board: Board = main.board
	var t := Constants.Tile
	# Deterministic board with an L of grass in the top-left so a clean 4-chain threads
	# down-then-right through known cells (everything else non-grass).
	board.grid = [
		[t.GRASS, t.GRASS, t.WHEAT,  t.CARROT, t.COW,    t.HORSE],
		[t.GRASS, t.PANSY,  t.APPLE,  t.PANSY,  t.WHEAT,  t.CARROT],
		[t.GRASS, t.GRASS,  t.COW,    t.HORSE,  t.APPLE,  t.WHEAT],
		[t.PIG,   t.COW,    t.HORSE,  t.APPLE,  t.OAK,    t.WHEAT],
		[t.COW,   t.HORSE,  t.APPLE,  t.OAK,    t.CARROT, t.PIG],
		[t.HORSE, t.APPLE,  t.OAK,    t.WHEAT,  t.PIG,    t.COW],
	]
	board._build_tiles()
	main._layout()
	main._refresh_meta()
	main._refresh_settlement()
	main._refresh_buildings()
	main._refresh_orders()
	main._refresh_biome()
	main._refresh_boss()
	main._refresh_rats()
	main._refresh_totals()
	main._refresh_chain_progress()
	await process_frame

	# Drive a 4-long GRASS chain through the SAME drag entry points the pointer uses,
	# then FINISH it so _resolve runs: tiles pop out, the board collapses + refills
	# (new tiles start mid scale-in), and chain_resolved fires → Main flies ONE reward
	# chip from the board toward the coin pill. Cells (col,row): (0,0)→(0,1)→(0,2)→(1,2).
	board._begin_drag(Vector2i(0, 0))
	board._extend_drag(Vector2i(0, 1))
	board._extend_drag(Vector2i(0, 2))
	board._extend_drag(Vector2i(1, 2))
	board._finish_drag()

	main._status_label.text = "Chain of 4  →  +1 Hay Bundle"

	# Await only a HANDFUL of frames so the reward chip is caught MID-FLIGHT (it lives
	# ~0.7s) and a couple of refilled tiles are still mid scale-in.
	for _i in range(7):
		await process_frame

	var img := root.get_texture().get_image()
	var out_path := dir + "/m4e-juice.png"
	var err := img.save_png(out_path)
	print("m4e capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	# Report how many FX chips are alive (board has been resolved, so _path is empty).
	var fx_children: int = main._fx_layer.get_child_count() if main._fx_layer != null else -1
	print("  fx_layer children (live reward chips)=%d" % fx_children)
	quit(0 if err == OK else 1)
