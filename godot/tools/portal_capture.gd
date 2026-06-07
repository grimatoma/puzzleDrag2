extends SceneTree
## Dev utility: render the Magic Portal screen (in its BUILT / summon state) over the live Main
## HUD and save a PNG. Run NON-headless so the GPU draws the parchment card, iron border, drop
## shadow, Cinzel title, the "✨ Influence: N" header, the per-tool cards (name + effect text +
## ×count badge), and the violet Summon buttons:
##   godot --path godot --script res://tools/portal_capture.gd -- <out_path.png>
## Seeds portal_built = true + 150 influence (so several Summon buttons read as ENABLED), summons
## a couple so a ×N badge shows, opens the screen via apply_deeplink, then waits a few frames for
## the parchment styles to settle before saving the PNG at the given CLI path
## (default C:\Users\grima\AppData\Local\Temp\portal.png).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "C:/Users/grima/AppData/Local/Temp/portal.png"

	SaveManager.clear()                          # fresh game so the capture is deterministic
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let deferred _ready run

	# A fresh game auto-shows the 6-step tutorial modal (tutorial_seen=false) on top of
	# everything — dismiss it so the Portal screen captures cleanly + unobstructed.
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	# Build the portal + seed some Influence so the BUILT (summon) state renders with a couple
	# affordable tools (at 150 influence: miners_hat 50, magic_fertilizer 60, magic_wand 80,
	# golden_carrot 90, magic_seed 100 are summonable; the pricier ones read as disabled).
	main.game.portal_built = true
	main.game.influence = 150
	# Summon a couple so the ×N owned badges read with real values.
	main.game.summon_magic_tool("magic_wand")    # 80 -> influence 70
	main.game.summon_magic_tool("miners_hat")    # 50 -> influence 20

	# Open the Portal screen the same way a deep-link would.
	main.apply_deeplink("portal")

	# Let the modal settle (parchment styles, drop shadow, Cinzel font, cards all need a few
	# frames to lay out + draw).
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var n_cards: int = -1
	if main._portal_screen != null:
		n_cards = main._portal_screen._cards.size()
	print("portal_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  cards=%d  built=%s  influence=%d  magic_wand×%d  visible=%s" % [
		n_cards,
		str(main.game.portal_built),
		main.game.influence,
		main.game.tool_count("magic_wand"),
		str(main._portal_screen != null and main._portal_screen.visible),
	])
	quit(0 if err == OK else 1)
