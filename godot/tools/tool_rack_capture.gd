extends SceneTree
## Dev utility: grant a set of tools then screenshot the board so we can confirm the
## tool RACK renders each tool's icon (and see how it copes with many owned tools).
## Run NON-headless (needs real rendering):
##   godot --path godot --script res://tools/tool_rack_capture.gd -- <ids_csv> <out_path> [w] [h]
## <ids_csv>: comma-separated tool ids, e.g. "bird_cage,hoe,plough,trimmer,bee"
##            use "ALL" to grant every ToolConfig.TOOL_IDS tool.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var ids_csv: String = args[0] if args.size() > 0 else "ALL"
	var out_path: String = args[1] if args.size() > 1 else "res://_rack.png"
	var w: int = int(args[2]) if args.size() > 2 else 540
	var h: int = int(args[3]) if args.size() > 3 else 960

	var win := root
	DisplayServer.window_set_size(Vector2i(w, h))
	win.size = Vector2i(w, h)
	win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame

	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	var ids: Array = []
	if ids_csv == "ALL":
		ids = ToolConfig.TOOL_IDS.duplicate()
	else:
		for s in ids_csv.split(","):
			ids.append(s.strip_edges())
	for id in ids:
		main.game.grant_tool(String(id), 3)
	main._refresh_tools()

	for _i in range(24):
		await process_frame
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("tool_rack_capture ids=%d window=%s -> %s (err %d)" % [ids.size(), img.get_size(), out_path, err])
	quit(0 if err == OK else 1)
