extends SceneTree
## Capture the chain-resolve CASCADE mid-flight: force a clean horizontal grass run,
## resolve it, then grab frames at intervals so the pop → settle → refill phases are
## each visible in a separate PNG. Run NON-headless:
##   godot --path godot --script res://tools/cascade_capture.gd -- <out_dir>

var _main

func _hush() -> void:
	# Keep story/tutorial/daily modals out of the shot so the board cascade is visible.
	for m in [_main._story_modal, _main._tutorial_modal, _main._daily_modal]:
		if m != null: m.visible = false

func _snap(out_dir: String, name: String) -> void:
	_hush()
	var img := root.get_texture().get_image()
	img.save_png("%s/%s.png" % [out_dir, name])
	print("cascade snap ", name)

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_dir: String = args[0] if args.size() > 0 else "res://tools/_caps2"
	DirAccess.make_dir_recursive_absolute(out_dir)
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)
	root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	_main = main
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null: main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()
	var board = main.board
	# A clean 6-long horizontal grass run on the top row.
	for c in Constants.COLS:
		board.grid[0][c] = Constants.Tile.GRASS
	board._build_tiles()
	for _i in range(4): await process_frame

	var path: Array = []
	for c in Constants.COLS:
		path.append(Vector2i(c, 0))
	board.try_resolve(path)

	# Grab frames across the cascade: pop wave, hold, collapse, refill pop-in.
	# Hush every frame so a chain-triggered story beat never covers the board.
	await _wait(2)
	_snap(out_dir, "cascade_1_pop")          # tiles popping out, staggered
	await _wait(6)
	_snap(out_dir, "cascade_2_gap")          # pop done / collapse about to start
	await _wait(6)
	_snap(out_dir, "cascade_3_fall")         # survivors dropping + fresh tiles falling
	await _wait(14)
	_snap(out_dir, "cascade_4_settled")      # fully settled, full board again
	quit(0)

func _wait(n: int) -> void:
	for _i in range(n):
		_hush()
		await process_frame
