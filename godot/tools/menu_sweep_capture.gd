extends SceneTree
## Dev utility: sweep every menu/screen deep-link and save one PNG per surface, in a
## single run. Visual-polish QA evidence — run NON-headless so the GPU draws:
##   xvfb-run -a godot --path godot --rendering-driver opengl3 \
##     --script res://tools/menu_sweep_capture.gd -- <out_dir>
## UI motion (UiFx) stays ON; each capture waits well past the open transition so the
## settled end-state is what lands in the PNG.

const SHOTS := [
	"town", "townmap", "inventory", "recipes", "cartography", "townsfolk",
	"menu", "achievements", "tiles", "chronicle", "castle", "decorations",
	"portal", "boons", "charter", "quests", "daily", "tutorial", "debug",
	"startfarming",
]

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_dir: String = args[0] if args.size() > 0 else "/tmp/godot-ui-shots"
	DirAccess.make_dir_recursive_absolute(out_dir)
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	for _i in range(40):
		await process_frame
	# Dismiss any launch modal (tutorial/story/daily) so each shot shows only its target.
	while main._close_top_overlay():
		for _i in range(10):
			await process_frame
	# Board first (no deeplink needed).
	await _snap(out_dir, "board")
	for id in SHOTS:
		if not main.apply_deeplink(String(id)):
			print("  skip (unknown deeplink): %s" % id)
			continue
		for _i in range(30):                # open transition (≤0.25s) + layout settle
			await process_frame
		await _snap(out_dir, String(id))
		main._close_top_overlay()
		for _i in range(10):
			await process_frame
	print("sweep done → %s" % out_dir)
	quit(0)

func _snap(out_dir: String, name: String) -> void:
	var img := root.get_texture().get_image()
	var path := "%s/%s.png" % [out_dir, name]
	var err := img.save_png(path)
	print("  %s %s (err %d)" % [name, img.get_size(), err])
