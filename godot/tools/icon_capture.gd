extends SceneTree
## Grant a spread of resources + coins, then capture board / inventory / town so the
## resource-icon wiring can be reviewed against a PROGRESSED state (a fresh game has an
## empty stockpile, which hides the icons entirely).
##   godot --path godot --script res://tools/icon_capture.gd

func _cap(main, id: String, out_dir: String) -> void:
	if id != "" and id != "board":
		main.apply_deeplink(id)
	for _i in range(24):
		await process_frame
	var img := root.get_texture().get_image()
	img.save_png("%s/icons_%s.png" % [out_dir, (id if id != "" else "board")])
	if id != "" and id != "board":
		# close the modal so the next deeplink opens cleanly
		main.apply_deeplink("board")
		for _i in range(6):
			await process_frame

func _initialize() -> void:
	var out_dir := "res://tools/_caps"
	DirAccess.make_dir_recursive_absolute(out_dir)
	var win := root
	DisplayServer.window_set_size(Vector2i(720, 1280))
	win.size = Vector2i(720, 1280)
	win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	# Grant a representative stockpile + coins so every surface has data to draw.
	var grant := {
		"flour": 12, "bread": 80, "eggs": 7, "hay_bundle": 20, "plank": 5,
		"horseshoe": 4, "supplies": 3, "honey": 2, "milk": 6, "block": 9,
		"meat": 5, "soup": 3, "pie": 2, "jam": 4,
	}
	for k in grant:
		main.game.inventory[k] = grant[k]
	main.game.coins = 5000
	main.game.award_xp(380)        # → Lv 3, ~53% into the level (XP fill check)
	main._refresh_totals()
	main._refresh_meta()
	for _i in range(12):
		await process_frame

	await _cap(main, "board", out_dir)
	await _cap(main, "inventory", out_dir)
	await _cap(main, "town", out_dir)
	print("icon_capture done")
	quit(0)
