extends SceneTree
## Dev utility: render the TOWNSFOLK roster screen (scenes/TownsfolkScreen.gd) over the
## live Main HUD with a spread of varied bonds, and save a 720×1280 PNG. Run NON-headless
## so the GPU draws the parchment card, iron border, drop shadow, the Cinzel "👥 Townsfolk"
## title, round avatar swatches, names, roles, and the band-tinted bond bars:
##   godot --path godot --script res://tools/townsfolk_capture.gd -- <out_path.png>
## Sets mira→8.0 (Liked) and bram→3.0 (Sour) so the bars show band variety; the others
## stay at the Warm default 5.0. Saves the PNG at the given CLI path.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "/tmp/townsfolk.png"

	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# Dismiss the arrival beat modal _ready may have put up so the roster isn't behind it.
	if main._story_modal != null:
		main._story_modal.visible = false

	var game: GameState = main.game

	# Set varied bonds so the bands show variety in the capture.
	# mira  → 8.0 → Liked  · ×1.15 (positive green fill)
	# bram  → 3.0 → Sour   · ×0.70 (muted rose fill)
	# wren, tomas, liss stay at 5.0 → Warm · ×1.00 (neutral fill)
	var bonds: Dictionary = game.npcs.get("bonds", {})
	bonds["mira"] = 8.0
	bonds["bram"] = 3.0
	game.npcs["bonds"] = bonds

	# Open the townsfolk screen (lazily builds + lays out its Control tree), then let it
	# settle so the parchment styles, shadow, avatar swatches, and Cinzel font all draw.
	main._open_townsfolk()
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var tf_screen = main._townsfolk_screen
	print("townsfolk_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  cards=%d  header='%s'" % [
		tf_screen.npc_count() if tf_screen != null else 0,
		tf_screen._header_label.text if tf_screen != null else ""])
	quit(0 if err == OK else 1)
