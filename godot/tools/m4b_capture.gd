extends SceneTree
## Dev utility: render the real Main scene in the M4b HUD rework so the new top-bar
## pills, chain-progress bar, and stockpile chip panel all show in one shot. Run
## NON-headless so the GPU actually draws the parchment surfaces, shadows, and the
## glowing chain path:
##   godot --path godot --script res://tools/m4b_capture.gd -- <dir>
## Writes <dir>/m4b-hud.png. Migration progress evidence for the HUD milestone:
## the clean structure (parchment top-bar of pills + chain-progress bar + stockpile
## chips) that replaces the old 11-stacked-labels HUD.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()                         # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let the deferred _ready run

	var game: GameState = main.game
	# ── A representative mid-game state ──────────────────────────────────────────
	# A City-tier settlement with a couple of placed spawners (so the tier pill reads
	# "City · 2/11"), a healthy coin purse, and a varied stockpile (food + mine goods)
	# so the chip grid is full enough to read at a glance.
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
	# Leftover chain progress so the chain-progress bar shows a partial fill: 4/6
	# hay_bundle (grass threshold 6) → a ~67% MOSS→GOLD fill.
	game.progress = {"hay_bundle": 4}
	main._last_res = "hay_bundle"
	main._last_threshold = Constants.threshold_for(Constants.Tile.GRASS)
	# Refill the order board so the compact orders line is populated.
	game.seed_orders(1337)
	game.refill_orders()

	var board: Board = main.board
	var t := Constants.Tile
	# Deterministic board with an L of grass in the top-left so a clean 4-chain
	# threads down-then-right through known cells (everything else non-grass).
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
	# Push the seeded state through every HUD refresher so the pills + chips + bar
	# all reflect the representative state above.
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

	# Drive a 4-long GRASS chain through the SAME drag entry points the pointer
	# uses, then STOP mid-drag (never _finish_drag) so the chain path stays drawn.
	# Cells (col,row): (0,0)→(0,1)→(0,2)→(1,2) — a vertical run that turns right.
	board._begin_drag(Vector2i(0, 0))
	board._extend_drag(Vector2i(0, 1))
	board._extend_drag(Vector2i(0, 2))
	board._extend_drag(Vector2i(1, 2))

	main._chain_label.text = "Chain: 4"
	main._status_label.text = "Drag adjacent matching tiles to chain them."
	for _i in range(20):                        # let everything settle for a clean shot
		await process_frame

	var img := root.get_texture().get_image()
	var out_path := dir + "/m4b-hud.png"
	var err := img.save_png(out_path)
	print("m4b capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  chain_len=%d valid=%s" % [board._path.size(), board._path.size() >= board.min_chain])
	quit(0 if err == OK else 1)
