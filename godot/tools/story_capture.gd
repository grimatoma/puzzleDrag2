extends SceneTree
## Dev utility: render the story BEAT MODAL (scenes/StoryModal.gd) over the live Main HUD
## and save a 720×1280 PNG. Run NON-headless so the GPU draws the parchment card, iron
## border, drop shadow, the Cinzel beat title, the speaker:text line rows, and the
## Continue button:
##   godot --path godot --script res://tools/story_capture.gd -- <out_path.png>
## Instances Main (its _ready posts session_start + drains the queue, so the arrival beat
## modal is already up), then saves the PNG at the given CLI path (default
## /tmp/story-beat.png). Migration evidence for the beat-modal half of the story UI.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "/tmp/story-beat.png"

	SaveManager.clear()                          # ignore any leftover test save → fresh act-1
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# _ready already called start_story_session() + _drain_story_queue(), so the beat modal
	# is presenting the front of the queue (act1_arrival). Re-drain defensively in case the
	# first frame hadn't built the HUD yet, then make sure we're showing the arrival beat.
	if main._story_modal == null or not main._story_modal.visible:
		main._drain_story_queue()
	# Pin to the arrival beat for a stable, representative capture.
	if main._story_modal != null:
		main._story_modal.open_for("act1_arrival")

	# Let the modal settle so the parchment styles, shadow, and Cinzel font draw cleanly.
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var shown: String = ""
	if main._story_modal != null:
		shown = main._story_modal.current_beat_id()
	print("story_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  beat shown=%s  queue=%s" % [shown, str(main.game.story.beat_queue)])
	quit(0 if err == OK else 1)
