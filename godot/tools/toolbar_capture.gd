extends SceneTree
## Capture the board tool strip at rest and with a tool armed, to review the icon-slot
## tool bar (count chips + ember-highlighted armed slot) against React's board-farm-tool-*.
##   godot --path godot --script res://tools/toolbar_capture.gd

func _shot(path: String) -> void:
	for _i in range(20):
		await process_frame
	root.get_texture().get_image().save_png(path)

func _initialize() -> void:
	var out_dir := "res://tools/_caps"
	DirAccess.make_dir_recursive_absolute(out_dir)
	root.size = Vector2i(720, 1280)
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()
	# Make sure both starter tools are present.
	main.game.grant_tool("bomb", 3)
	main.game.grant_tool("scythe", 2)
	main._refresh_tools()
	await _shot("%s/toolbar_rest.png" % out_dir)

	# Arm the bomb (tap-target) → slot highlights + the armed banner shows.
	main.use_tool("bomb")
	main._refresh_tools()
	await _shot("%s/toolbar_armed.png" % out_dir)

	print("toolbar_capture done")
	quit(0)
