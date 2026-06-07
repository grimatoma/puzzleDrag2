extends SceneTree
## Dev utility: render the Decorations screen over the live Main HUD and save a PNG. Run
## NON-headless so the GPU draws the parchment card, iron border, drop shadow, Cinzel title,
## cost chips, the violet "+N ✨" grants, and the Build buttons:
##   godot --path godot --script res://tools/decorations_capture.gd -- <out_path.png>
## Seeds plenty of coins + the cost items so the Build buttons read as ENABLED, builds a
## couple so the ×N badges + Influence header show real values, opens the screen via
## apply_deeplink, then waits a few frames for the parchment styles to settle before saving
## the PNG at the given CLI path (default C:\Users\grima\AppData\Local\Temp\decorations.png).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "C:/Users/grima/AppData/Local/Temp/decorations.png"

	SaveManager.clear()                          # fresh game so the capture is deterministic
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let deferred _ready run

	# A fresh game auto-shows the 6-step tutorial modal (tutorial_seen=false) on top of
	# everything — dismiss it so the Decorations screen captures cleanly + unobstructed.
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	# Seed plenty of coins + every cost item so the Build buttons read as enabled across the
	# catalog (including the harbor-themed costs that aren't produced in the live port yet).
	main.game.coins = 5000
	main.game.inventory["tile_grass_grass"] = 40
	main.game.inventory["tile_mine_stone"] = 40
	main.game.inventory["tile_mine_coal"] = 40
	main.game.inventory["tile_fish_kelp"] = 40
	main.game.inventory["tile_fish_oyster"] = 40
	main.game.inventory["plank"] = 40
	main.game.inventory["berry"] = 40
	main.game.inventory["iron_bar"] = 40
	# Build a couple so the ×N badges + the Influence header read with real values.
	main.game.build_decoration("violet_bed")
	main.game.build_decoration("violet_bed")
	main.game.build_decoration("stone_lantern")

	# Open the Decorations screen the same way a deep-link would.
	main.apply_deeplink("decorations")

	# Let the modal settle (parchment styles, drop shadow, Cinzel font, chips all need a
	# few frames to lay out + draw).
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var n_cards: int = -1
	if main._decorations_screen != null:
		n_cards = main._decorations_screen._cards.size()
	print("decorations_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  cards=%d  influence=%d  violet_bed×%d  visible=%s" % [
		n_cards,
		main.game.influence,
		main.game.decoration_count("violet_bed"),
		str(main._decorations_screen != null and main._decorations_screen.visible),
	])
	quit(0 if err == OK else 1)
