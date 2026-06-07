extends SceneTree
## Capture the leave-board confirm modal (preview) over the live HUD.
##   godot --path godot --script res://tools/m5_capture.gd -- <out.png>
func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "C:/Users/grima/AppData/Local/Temp/m5.png"
	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()
	main.apply_deeplink("leaveboard")   # previews the expedition-leave confirm
	for _i in range(20):
		await process_frame
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("m5_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	quit(0 if err == OK else 1)
