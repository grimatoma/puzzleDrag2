extends SceneTree
## Dev utility: render Main + a deep-linked screen at an ARBITRARY window size + stretch
## aspect, so we can check modal overflow / scrolling on short or wide viewports (the
## now-possible shapes after stretch=expand). Run NON-headless:
##   godot --path godot --script res://tools/screen_capture.gd -- <w> <h> <aspect> <deeplink> <out_path>
## <aspect>: keep | expand | keep_height | keep_width | ignore
## <deeplink>: any Main.apply_deeplink id ("menu", "quests", "inventory", "town", "tiles", …),
##             or "board" / "" for the bare board HUD.
## Example: ... -- 720 640 expand menu C:/.../_caps/menu_short.png

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var w: int = int(args[0]) if args.size() > 0 else 720
	var h: int = int(args[1]) if args.size() > 1 else 1280
	var aspect_name: String = args[2] if args.size() > 2 else "expand"
	var deeplink: String = args[3] if args.size() > 3 else ""
	var out_path: String = args[4] if args.size() > 4 else "res://_cap.png"

	var win := root
	DisplayServer.window_set_size(Vector2i(w, h))
	win.size = Vector2i(w, h)
	match aspect_name:
		"expand": win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
		"keep_height": win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP_HEIGHT
		"keep_width": win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP_WIDTH
		"ignore": win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_IGNORE
		_: win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP

	SaveManager.clear()                          # fresh deterministic game
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let deferred _ready run

	# Dismiss the first-load tutorial so the target screen captures unobstructed.
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	if deeplink != "" and deeplink != "board":
		main.apply_deeplink(deeplink)

	for _i in range(24):
		await process_frame
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("screen_capture window=%s logical=%s aspect=%s deeplink=%s -> %s (err %d)" % [
		img.get_size(), root.get_visible_rect().size, aspect_name, deeplink, out_path, err])
	quit(0 if err == OK else 1)
