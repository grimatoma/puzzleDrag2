extends SceneTree
## Print the top bar vs gear-button geometry to verify the ⚙ alignment math.
##   godot --path godot --script res://tools/gear_diag.gd

func _initialize() -> void:
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)
	SaveManager.clear()
	var m = load("res://scenes/Main.tscn").instantiate()
	root.add_child(m)
	for _i in range(30): await process_frame
	var hud = m._hud
	print("topbar h=", hud._topbar.size.y, " gear h=", hud._menu_btn.size.y,
		" gear offset_top=", hud._menu_btn.offset_top,
		" gear global y=", hud._menu_btn.global_position.y,
		" gear bottom=", hud._menu_btn.global_position.y + hud._menu_btn.size.y)
	quit(0)
