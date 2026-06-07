extends SceneTree
## Dev utility: render the Charter screen (Terms tab) over the live Main HUD and save a
## PNG. Run NON-headless so the GPU draws the parchment card, iron border, drop shadow,
## the Cinzel title, the settlement ribbon, the Terms/All-choices tab toggle, the six
## term cards (roman numeral + title + caption + a state-coloured pill), and the closing
## italic note:
##   godot --path godot --script res://tools/charter_capture.gd -- <out_path.png>
## Seeds a story state with a few flags (intro_seen / hearth_lit / keeper_path_bound /
## settlement_lives) + a few choice_log rows (incl. the keeper bind choice + act1_arrival
## + act1_first_order) so the Terms tab shows a MIX of honored + pending pills and the
## timeline (if you flipped to it) would have entries. Opens on the Terms tab, then waits
## a few frames for the parchment styles to settle before saving the PNG at the given CLI
## path (default C:\Users\grima\AppData\Local\Temp\charter.png).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "C:/Users/grima/AppData/Local/Temp/charter.png"

	SaveManager.clear()                          # fresh game so the capture is deterministic
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let deferred _ready run

	# A fresh game auto-shows the 6-step tutorial modal (tutorial_seen=false) on top of
	# everything — dismiss it so the Charter screen captures cleanly + unobstructed.
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	# Seed a story state so the Terms tab shows a MIX of honored / pending pills:
	#   intro_seen        → term I (found_first) honored
	#   hearth_lit        → term IV (no_empty_hearths) honored
	#   keeper_path_bound → term V (drive_out_bite) honored (the keeper was BOUND)
	#   settlement_lives  → term VI (capital_last) honored
	#   (terms II audit_embers + III three_names stay PENDING — no matching flag/row)
	main.game.turn = 12
	main.game.story.flags = {
		"intro_seen": true,
		"hearth_lit": true,
		"keeper_path_bound": true,
		"settlement_lives": true,
	}
	# A few choice_log rows so the timeline (All-choices tab) + the term detail "Where it
	# was tested" lists have real entries (the keeper bind choice resolves its label).
	main.game.story.choice_log = [
		{"beat_id": "act1_arrival", "choice_id": "name"},
		{"beat_id": "act1_first_order", "choice_id": "deliver"},
		{"beat_id": "frostmaw_aftermath", "choice_id": "bind"},
	]

	# Open the Charter screen the same way a deep-link would (lands on the Terms tab).
	main.apply_deeplink("charter")

	# Let the modal settle (parchment styles, drop shadow, Cinzel font, cards all need a
	# few frames to lay out + draw).
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var n_cards: int = -1
	if main._charter_screen != null:
		n_cards = main._charter_screen._cards.size()
	print("charter_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  cards=%d  tab=%s  turn=%d  visible=%s" % [
		n_cards,
		str(main._charter_screen.get("_tab")) if main._charter_screen != null else "?",
		main.game.turn,
		str(main._charter_screen != null and main._charter_screen.visible),
	])
	quit(0 if err == OK else 1)
