extends SceneTree
## Visual repro of the "board not launching" report: boot fresh, walk the REAL player
## path (town map -> Start Farming pad -> Start), saving a PNG at each step.
## Run NON-headless, foreground:
##   godot --path godot --script res://tools/board_launch_capture.gd -- <outdir>

func _shot(path: String) -> void:
	var img := root.get_texture().get_image()
	var err := img.save_png(path)
	print("shot -> ", path, " (err ", err, ")")

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var outdir: String = args[0] if args.size() > 0 else "user://_caps"
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)

	SaveManager.clear()
	var m = load("res://scenes/Main.tscn").instantiate()
	root.add_child(m)
	await process_frame
	m.game.mark_tutorial_seen()
	if m._tutorial_modal != null: m._tutorial_modal.visible = false
	for _i in range(30): await process_frame
	if m._tutorial_modal != null: m._tutorial_modal.visible = false
	for _i in range(10): await process_frame
	_shot(outdir + "/1_boot.png")

	# The town map's Start Farming pad (real wiring: start_farming_requested -> _open_startfarming).
	if m._townmap_screen != null:
		m._townmap_screen.emit_signal("start_farming_requested")
	else:
		m._open_startfarming()
	for _i in range(20): await process_frame
	_shot(outdir + "/2_picker.png")

	var sf = m._startfarming_modal
	if sf != null:
		var start_btn: Button = sf._action_buttons.get("start")
		print("start disabled=", start_btn.disabled)
		start_btn.emit_signal("pressed")
	for _i in range(40): await process_frame
	_shot(outdir + "/3_after_start.png")
	print("farm_run_active=", m.game.farm_run_active, " board.visible=", m.board.visible)
	# What overlays are visible now?
	for o in m._overlay_list():
		if o != null and is_instance_valid(o) and o.visible:
			print("visible overlay: ", o.get_script().resource_path.get_file(), " layer=", int(o.layer))
	quit(0)
