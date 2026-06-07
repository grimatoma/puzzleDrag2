extends SceneTree
## Dev utility: render the tutorial onboarding modal (step 1 — "Welcome to Hearthwood Vale")
## over the live Main HUD and save a PNG. Run NON-headless so the GPU draws the parchment
## card, iron border, drop shadow, Cinzel title, body text, step indicator, and buttons:
##   godot --path godot --script res://tools/tutorial_capture.gd -- <out_path.png>
## Instances Main with a FRESH game (tutorial_seen=false) so the modal auto-shows at step 0,
## then waits a few frames for the parchment styles to settle before saving the PNG at the
## given CLI path (default C:\Users\grima\AppData\Local\Temp\tutorial.png).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "C:/Users/grima/AppData/Local/Temp/tutorial.png"

	SaveManager.clear()                          # fresh game → tutorial_seen=false → auto-show
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let deferred _ready run

	# _ready with tutorial_seen=false already called _open_tutorial(), so the modal is up.
	# Pin to step 0 explicitly for a stable, representative capture.
	if main._tutorial_modal != null:
		main._tutorial_modal.open()

	# Let the modal settle (parchment styles, drop shadow, Cinzel font all need a few frames).
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var shown_step: int = -1
	var shown_title: String = ""
	if main._tutorial_modal != null:
		shown_step = main._tutorial_modal._current_step
		if main._tutorial_modal._title_label != null:
			shown_title = main._tutorial_modal._title_label.text
	print("tutorial_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  step=%d  title=%s  tutorial_seen=%s" % [shown_step, shown_title, str(main.game.tutorial_seen)])
	quit(0 if err == OK else 1)
