extends SceneTree
## Dev utility: render the Castle contributions screen over the live Main HUD and save a
## PNG. Run NON-headless so the GPU draws the parchment card, iron border, drop shadow,
## Cinzel title, progress bars, and contribute buttons:
##   godot --path godot --script res://tools/castle_capture.gd -- <out_path.png>
## Seeds a partial contribution + on-hand inventory so the bars are visibly mid-progress
## and the Contribute buttons read as enabled, opens the screen via apply_deeplink, then
## waits a few frames for the parchment styles to settle before saving the PNG at the
## given CLI path (default C:\Users\grima\AppData\Local\Temp\castle.png).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "C:/Users/grima/AppData/Local/Temp/castle.png"

	SaveManager.clear()                          # fresh game so the capture is deterministic
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let deferred _ready run

	# A fresh game auto-shows the 6-step tutorial modal (tutorial_seen=false) on top of
	# everything — dismiss it so the Castle screen captures cleanly + unobstructed.
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	# Seed on-hand inventory so the "Have:" line + Contribute buttons read as actionable,
	# and pre-contribute a little toward each need so the progress bars are mid-fill.
	main.game.inventory["soup"] = 30
	main.game.inventory["meat"] = 25
	main.game.inventory["tile_mine_coal"] = 18
	main.game.contribute_to_castle("soup", 21)
	main.game.contribute_to_castle("meat", 15)
	main.game.contribute_to_castle("coal", 9)

	# Open the Castle screen the same way a deep-link would.
	main.apply_deeplink("castle")

	# Let the modal settle (parchment styles, drop shadow, Cinzel font, bar fills all
	# need a few frames to lay out + draw).
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var n_cards: int = -1
	if main._castle_screen != null:
		n_cards = main._castle_screen._cards.size()
	print("castle_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  cards=%d  soup=%d/%d  visible=%s" % [
		n_cards,
		main.game.castle_contributed_for("soup"), CastleConfig.need_target("soup"),
		str(main._castle_screen != null and main._castle_screen.visible),
	])
	quit(0 if err == OK else 1)
