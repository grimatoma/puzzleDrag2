extends SceneTree
## Dev utility: render the Main scene with the M8d ToolPalette HUD visible so the
## parchment tool strip (Bomb + Scythe buttons) shows alongside the full board. Run
## NON-headless so the GPU actually draws the parchment surfaces and shadows:
##   godot --path godot --script res://tools/m8d_capture.gd -- <output_path.png>
## Writes the PNG at the given path (default /tmp/m8d-palette.png). 720×1280 viewport.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "/tmp/m8d-palette.png"
	SaveManager.clear()                         # start from a clean save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let _ready run (grants bomb + scythe)

	var game: GameState = main.game
	# ── A representative mid-game state showing the palette in context ────────────
	# City-tier settlement, healthy coin purse, a varied stockpile so the chip grid
	# is populated, and leftover chain progress so the bar shows a partial fill.
	game.settlement.tier = TownConfig.TIER_CITY
	game.coins = 740
	game.buildings = [BuildingConfig.LUMBER_CAMP, BuildingConfig.COOP]
	game.inventory = {
		"hay_bundle": 24,
		"flour": 12,
		"eggs": 6,
		"plank": 10,
		"block": 8,
	}
	game.progress = {"hay_bundle": 3}
	main._last_res = "hay_bundle"
	main._last_threshold = Constants.threshold_for(Constants.Tile.GRASS)
	game.seed_orders(1337)
	game.refill_orders()

	# ── Starter tools are already granted by _ready (bomb + scythe) ──────────────
	# Ensure the palette is freshly rebuilt with the representative state above.
	main._refresh_tools()

	# ── Board: a deterministic farm board with a GRASS L in the top-left ─────────
	var board: Board = main.board
	var t := Constants.Tile
	board.grid = [
		[t.GRASS, t.GRASS, t.WHEAT,  t.CARROT, t.COW,    t.HORSE],
		[t.GRASS, t.PANSY, t.APPLE,  t.PANSY,  t.WHEAT,  t.CARROT],
		[t.GRASS, t.GRASS, t.COW,    t.HORSE,  t.APPLE,  t.WHEAT],
		[t.PIG,   t.COW,   t.HORSE,  t.APPLE,  t.OAK,    t.WHEAT],
		[t.COW,   t.HORSE, t.APPLE,  t.OAK,    t.CARROT, t.PIG],
		[t.HORSE, t.APPLE, t.OAK,    t.WHEAT,  t.PIG,    t.COW],
	]
	board._build_tiles()
	main._layout()

	# Push the seeded state through every HUD refresher.
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

	# Hold a 4-long GRASS chain so the chain path stays drawn (mid-drag, never resolved).
	board._begin_drag(Vector2i(0, 0))
	board._extend_drag(Vector2i(0, 1))
	board._extend_drag(Vector2i(0, 2))
	board._extend_drag(Vector2i(1, 2))

	main._chain_label.text = "Chain: 4"
	main._status_label.text = "Click a tool button to use it!"

	for _i in range(20):                        # let everything settle for a clean shot
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("m8d capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  palette_visible=%s  tool_buttons=%s" % [
		str(main._tool_palette_box.visible),
		str(main._tool_buttons.keys()),
	])
	quit(0 if err == OK else 1)
