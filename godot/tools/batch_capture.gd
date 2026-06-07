extends SceneTree
## Dev utility: render a BATCH of deep-linked screens, each from a fresh Main, at a given
## window size + stretch aspect. One process, many PNGs — for side-by-side parity review.
## Run NON-headless:
##   godot --path godot --script res://tools/batch_capture.gd -- <w> <h> <aspect> <out_dir> <id1> <id2> ...
## <aspect>: keep | expand | keep_height | keep_width | ignore
## ids: any Main.apply_deeplink id, or "board"/"" for the bare board HUD.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var w: int = int(args[0]) if args.size() > 0 else 720
	var h: int = int(args[1]) if args.size() > 1 else 1280
	var aspect_name: String = args[2] if args.size() > 2 else "expand"
	var out_dir: String = args[3] if args.size() > 3 else "res://tools/_caps"
	var ids: Array = []
	for i in range(4, args.size()):
		ids.append(args[i])
	if ids.is_empty():
		ids = ["board", "town", "townmap", "inventory", "menu", "townsfolk", "castle", "quests", "achievements", "cartography"]

	DirAccess.make_dir_recursive_absolute(out_dir)
	var win := root
	DisplayServer.window_set_size(Vector2i(w, h))
	win.size = Vector2i(w, h)
	match aspect_name:
		"expand": win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
		"keep_height": win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP_HEIGHT
		"keep_width": win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP_WIDTH
		"ignore": win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_IGNORE
		_: win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP

	for id in ids:
		SaveManager.clear()
		var main = load("res://scenes/Main.tscn").instantiate()
		root.add_child(main)
		await process_frame
		if main._tutorial_modal != null:
			main._tutorial_modal.visible = false
		main.game.mark_tutorial_seen()
		if id != "" and id != "board":
			main.apply_deeplink(id)
		for _i in range(24):
			await process_frame
		var img := root.get_texture().get_image()
		var fname: String = String(id) if String(id) != "" else "board"
		var out_path := "%s/%s.png" % [out_dir, fname]
		var err := img.save_png(out_path)
		print("cap %s logical=%s -> %s (err %d)" % [fname, root.get_visible_rect().size, out_path, err])
		main.queue_free()
		await process_frame
		await process_frame

	quit(0)
