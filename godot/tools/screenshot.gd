extends SceneTree
## Dev utility: render the main scene for a few frames and save a PNG, then
## quit. Run NON-headless so the GPU actually draws:
##   godot --path godot --script res://tools/screenshot.gd -- <out_path>
## Used for migration progress evidence and quick visual sanity checks.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://m1_board.png"
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	for _i in range(40):                # let layout + fall-in tweens settle
		await process_frame
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("screenshot %s -> %s (err %d)" % [img.get_size(), out_path, err])
	quit(0 if err == OK else 1)
