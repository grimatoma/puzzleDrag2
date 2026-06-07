extends SceneTree
## Dev utility: render Main with an IN-PROGRESS chain selected, to verify the tile
## selection lift/pulse + ChainOverlay path. Forces the top row to a single tile type,
## then drives Board's drag path across it. Run NON-headless:
##   godot --path godot --script res://tools/chain_capture.gd -- <out_path.png>

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://_chain.png"

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	var board = main.board
	# Force the top two rows to GRASS so we can chain a clean horizontal run.
	for c in Constants.COLS:
		board.grid[0][c] = Constants.Tile.GRASS
		board.grid[1][c] = Constants.Tile.GRASS
	board._build_tiles()
	# Drive a 6-tile horizontal drag across the top row (selects each tile).
	board._begin_drag(Vector2i(0, 0))
	for c in range(1, Constants.COLS):
		board._extend_drag(Vector2i(c, 0))

	# Let the pulse tween reach a visible amplitude before grabbing the frame.
	for _i in range(22):
		await process_frame
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("chain_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	quit(0 if err == OK else 1)
