extends SceneTree
## Dev utility: render the real Main scene, drive one grass chain through the
## GameState economy, and screenshot the M2 HUD (coins / turn / collected). Run
## NON-headless so the GPU actually draws:
##   godot --path godot --script res://tools/m2_capture.gd -- <out_path>
## Used for migration progress evidence (docs/assets/godot/m2-hud.png).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://m2_hud.png"
	SaveManager.clear()                         # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let the deferred _ready run

	var board: Board = main.board
	var t := Constants.Tile
	# Deterministic board with a 3x3 grass block in the top-left.
	board.grid = [
		[t.GRASS, t.GRASS, t.GRASS, t.WHEAT,  t.COW,    t.HORSE],
		[t.GRASS, t.GRASS, t.GRASS, t.PANSY,  t.WHEAT,  t.CARROT],
		[t.GRASS, t.GRASS, t.GRASS, t.COW,    t.HORSE,  t.APPLE],
		[t.PIG,   t.COW,   t.HORSE, t.APPLE,  t.OAK,    t.WHEAT],
		[t.COW,   t.HORSE, t.APPLE, t.OAK,    t.CARROT, t.PIG],
		[t.HORSE, t.APPLE, t.OAK,   t.WHEAT,  t.PIG,    t.COW],
	]
	board._build_tiles()
	main._layout()
	await process_frame

	# A 6-long GRASS chain → 1 hay_bundle (threshold 6), routed through the live
	# GameState accumulator so the HUD shows Coins / Turn / Collected populated.
	var path := [
		Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0),
		Vector2i(2, 1), Vector2i(2, 2), Vector2i(1, 2),
	]
	board.try_resolve(path)
	for _i in range(45):                        # let pop + fall-in tweens settle
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("m2 capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  coins=%d turn=%d inventory=%s" % [main.game.coins, main.game.turn, main.game.inventory])
	quit(0 if err == OK else 1)
