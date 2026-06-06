extends SceneTree
## Dev utility: render the real Main scene in the M4a parchment look with a live
## mid-drag chain so the orange/gold chain-path overlay shows. Run NON-headless so
## the GPU actually draws the field card, shadow, and glowing path:
##   godot --path godot --script res://tools/m4a_capture.gd -- <dir>
## Writes <dir>/m4a-parchment.png. Migration progress evidence (the parchment
## visual identity: warm backdrop, framed field-tinted board, chain-path render).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()                         # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let the deferred _ready run

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
	var out_path := dir + "/m4a-parchment.png"
	var err := img.save_png(out_path)
	print("m4a capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  chain_len=%d valid=%s" % [board._path.size(), board._path.size() >= board.min_chain])
	quit(0 if err == OK else 1)
