extends SceneTree
## Dev utility: render the CHRONICLE timeline (scenes/ChronicleScreen.gd) over the live
## Main HUD with a few beats marked fired, and save a 720×1280 PNG. Run NON-headless so
## the GPU draws the parchment card, iron border, drop shadow, the Cinzel "📜 Chronicle"
## title + "Act N" sub-headings, and the timeline cards:
##   godot --path godot --script res://tools/chronicle_capture.gd -- <out_path.png>
## Instances Main, marks a handful of _fired_* flags across acts so the timeline reads
## richly (grouped by Act), opens the chronicle, and saves the PNG at the given CLI path
## (default /tmp/chronicle.png). Migration evidence for the timeline half of the story UI.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "/tmp/chronicle.png"

	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# Dismiss the arrival beat modal _ready put up so the chronicle isn't behind it.
	if main._story_modal != null:
		main._story_modal.visible = false

	var game: GameState = main.game
	# Mark a spread of beats fired across all three acts so the timeline groups richly. Use
	# the engine's fired-marker convention (StoryEngine.fired_key) — the same flags the live
	# engine sets — so the chronicle (which reads those markers) lists them.
	for bid in [
		"act1_arrival", "act1_light_hearth", "act1_first_order", "act1_hamlet",
		"act2_kitchen", "act2_city_expedition", "act2_frostmaw_felled",
		"act3_rats",
	]:
		game.story.flags[StoryEngine.fired_key(bid)] = true

	# Open the chronicle (lazily builds + lays out its Control tree), then let it settle so
	# the parchment styles, shadow, Act sub-headings, and Cinzel font all draw cleanly.
	main._open_chronicle()
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var screen = main._chronicle_screen
	print("chronicle_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  fired=%d / total=%d  cards=%d" % [
		screen.fired_count(), screen.total_count(), screen._rows.size()])
	quit(0 if err == OK else 1)
