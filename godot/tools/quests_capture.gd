extends SceneTree
## Dev utility: render the Quests screen over the live Main HUD and save a PNG. Run
## NON-headless so the GPU draws the parchment cards, progress bars, claim buttons, and
## the Almanac XP track:
##   godot --path godot --script res://tools/quests_capture.gd -- <out_path.png>
## Seeds a fresh game, rolls the 6 deterministic quests, completes a couple of them (so
## the capture shows a MIX of in-progress + claimable rows), and awards almanac XP so a
## few tiers are unlocked. Default out path C:\Users\grima\AppData\Local\Temp\quests.png.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "C:/Users/grima/AppData/Local/Temp/quests.png"

	SaveManager.clear()                          # fresh game so the capture is deterministic
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let deferred _ready run

	# Dismiss the first-load tutorial modal so the Quests screen captures unobstructed.
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	# Roll the 6 quests, then complete a couple so the screen shows in-progress AND
	# claimable rows, and award XP so the Almanac track has unlocked tiers.
	main.game.ensure_quests()
	if main.game.quests.size() >= 1:
		main.game.quests[0]["progress"] = main.game.quests[0]["target"]
	if main.game.quests.size() >= 3:
		main.game.quests[2]["progress"] = main.game.quests[2]["target"]
	if main.game.quests.size() >= 2:
		main.game.quests[1]["progress"] = int(main.game.quests[1]["target"] / 2)
	main.game.coins = 1200
	main.game.award_xp(380)                      # ~level 3 (150 XP/level) → a few tiers claimable

	main.apply_deeplink("quests")

	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("quests_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  quests=%d  xp=%d  level=%d" % [main.game.quests.size(), main.game.almanac_xp, main.game.almanac_level])
	quit(0 if err == OK else 1)
