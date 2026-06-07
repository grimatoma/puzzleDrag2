extends SceneTree
## Dev utility: render Main with a TAP-target tool ARMED, to verify the "Tool armed"
## ember banner. Instantiates Main, dismisses the tutorial, then arms the bomb (a
## tap-target tool) via use_tool() so the banner populates + shows. Run NON-headless:
##   godot --path godot --script res://tools/armed_capture.gd -- <out_path.png>

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://_armed.png"
	var tool_id: String = args[1] if args.size() > 1 else "bomb"

	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)
	root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND

	SaveManager.clear()                          # fresh game → starter bomb + scythe
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	# Arm a tap-target tool → use_tool arms it + shows the "Tool armed" banner.
	# (Grant it first so non-starter tap tools like sickle/magnet can be armed too.)
	main.game.grant_tool(tool_id, 2)
	main.use_tool(tool_id)

	for _i in range(22):
		await process_frame
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("armed_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	quit(0 if err == OK else 1)
