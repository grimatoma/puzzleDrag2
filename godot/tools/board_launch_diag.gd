extends SceneTree
## Diagnose "the game board is not launching": boot Main fresh, walk the real
## Start Farming flow (open picker -> press Start), and dump what is actually
## visible / active / on top afterwards.
##   godot --headless --path godot --script res://tools/board_launch_diag.gd

func _dump(m, tag: String) -> void:
	print("--- ", tag, " ---")
	print("  board.visible=", m.board.visible, " board.active=", m.board.is_active() if m.board.has_method("is_active") else "?")
	print("  game.farm_run_active=", m.game.farm_run_active, " coins=", m.game.coins,
		" turns_left=", m.game.farm_run_turns_left)
	print("  router modal=", m._router.current_modal())
	var names := {}
	for o in m._overlay_list():
		if o != null and is_instance_valid(o) and o.visible:
			var lyr: int = int(o.layer) if "layer" in o else -1
			names[o.get_script().resource_path.get_file()] = lyr
	print("  visible overlays=", names)

func _initialize() -> void:
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)

	SaveManager.clear()
	var m = load("res://scenes/Main.tscn").instantiate()
	root.add_child(m)
	await process_frame
	m.game.mark_tutorial_seen()
	if m._tutorial_modal != null: m._tutorial_modal.visible = false
	for _i in range(8): await process_frame
	if m._tutorial_modal != null: m._tutorial_modal.visible = false

	_dump(m, "fresh boot")

	# Open the Start Farming picker the way the town-map farm pad does.
	m._open_startfarming()
	for _i in range(8): await process_frame
	var sf = m._startfarming_modal
	print("picker open: visible=", sf != null and sf.visible)
	if sf != null:
		var start_btn: Button = sf._action_buttons.get("start")
		print("  start btn: text='", start_btn.text, "' disabled=", start_btn.disabled)
		print("  selected_categories=", sf.selected_categories())
		# Press Start exactly like a player.
		start_btn.emit_signal("pressed")
	for _i in range(12): await process_frame

	_dump(m, "after Start pressed")
	print("  grid filled=", m.board.grid != null and m.board.grid.size() > 0 if "grid" in m.board else "?")
	quit(0)
