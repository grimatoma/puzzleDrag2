extends SceneTree
## Grant resources/coins, then capture town(craft) / castle / quests / inventory so the
## filled action-button style + themed scrollbar can be reviewed in an ENABLED state.
##   godot --path godot --script res://tools/action_capture.gd

func _cap(main, id: String) -> void:
	main.apply_deeplink(id)
	for _i in range(24): await process_frame
	if main._tutorial_modal != null: main._tutorial_modal.visible = false
	if main._story_modal != null: main._story_modal.visible = false
	for _i in range(4): await process_frame
	root.get_texture().get_image().save_png("res://tools/_caps/act_%s.png" % id)
	main.apply_deeplink("board")
	for _i in range(6): await process_frame

func _initialize() -> void:
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)
	root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null: main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()
	var grant := {"flour": 40, "bread": 80, "eggs": 30, "hay_bundle": 40, "plank": 20,
		"supplies": 12, "honey": 8, "milk": 12, "block": 18, "meat": 20, "soup": 14, "pie": 8, "coal": 20}
	for k in grant: main.game.inventory[k] = grant[k]
	main.game.coins = 5000
	main.game.award_xp(380)
	main._refresh_totals(); main._refresh_meta()
	for _i in range(10): await process_frame
	await _cap(main, "town")
	await _cap(main, "castle")
	await _cap(main, "quests")
	await _cap(main, "inventory")
	print("action_capture done")
	quit(0)
