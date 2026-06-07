extends SceneTree
## Dev utility: render the Daily Streak reward modal over the live Main HUD and save a PNG.
## Run NON-headless so the GPU draws the parchment card + reward summary:
##   godot --path godot --script res://tools/daily_capture.gd -- <out_path.png>
## Seeds a streak day with a rich reward (day 14 = 300 coins + 1 rune) and opens the modal
## via the "daily" deep-link (preview path — no re-grant). Default temp/daily.png.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "C:/Users/grima/AppData/Local/Temp/daily.png"

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame

	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	# Set a streak day with a visually rich reward, then open the modal in preview mode.
	main.game.daily_streak_day = 14
	main.game.daily_last_claimed = "2026-06-06"
	main.apply_deeplink("daily")

	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("daily_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  streak_day=%d" % main.game.daily_streak_day)
	quit(0 if err == OK else 1)
