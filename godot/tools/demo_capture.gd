extends SceneTree
## Dev utility: capture a highlighted chain and the post-resolve board, to
## evidence the interaction pipeline. NON-headless:
##   godot --path godot --script res://tools/demo_capture.gd -- <dir>
## Writes <dir>/chain.png and <dir>/resolved.png.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	img.save_png(path)
	print("saved ", path)

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	var board: Board = main.board
	var t := Constants.Tile
	board.grid = [
		[t.GRASS, t.GRASS, t.GRASS, t.WHEAT,  t.COW,    t.HORSE],
		[t.GRASS, t.GRASS, t.GRASS, t.PANSY,  t.WHEAT,  t.CARROT],
		[t.GRASS, t.GRASS, t.GRASS, t.COW,    t.HORSE,  t.APPLE],
		[t.PIG,   t.COW,   t.HORSE, t.APPLE,  t.OAK,    t.WHEAT],
		[t.COW,   t.HORSE, t.APPLE, t.OAK,    t.CARROT, t.PIG],
		[t.HORSE, t.APPLE, t.OAK,   t.WHEAT,  t.PIG,    t.COW],
	]
	board._build_tiles()
	board.layout_for(Vector2(720, 1280))
	await process_frame

	# A 6-long GRASS chain → 1 hay_bundle (threshold 6).
	var path := [
		Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0),
		Vector2i(2, 1), Vector2i(2, 2), Vector2i(1, 2),
	]
	for cell in path:
		board._set_highlight(cell, true)
	main._on_chain_changed(path.size())
	await process_frame
	_save(dir + "/chain.png")

	board.try_resolve(path)
	for _i in range(40):
		await process_frame
	_save(dir + "/resolved.png")
	quit(0)
