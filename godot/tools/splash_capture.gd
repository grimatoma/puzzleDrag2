extends SceneTree
## Boot the real Main scene (windowed) and screenshot the launch splash — the
## visual-evidence capture for SplashScreen.gd. Two frames are taken: one just
## after the fade-in lands, and a second ~48 frames later. On a real-speed run
## the second catches the opposite phase of the glow breathe; on a slow
## software-GL run (xvfb) frames lag wall-clock, so by then the splash has
## auto-dismissed and the shot shows the REVEAL (town home + tutorial under
## the splash) — equally useful evidence, just label-aware when reviewing.
##   xvfb-run godot --path godot --script res://tools/splash_capture.gd
## Writes tools/_caps/splash_in.png and tools/_caps/splash_pulse.png.

func _initialize() -> void:
	var out_dir := "res://tools/_caps"
	DirAccess.make_dir_recursive_absolute(out_dir)
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)
	root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND

	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._splash == null:
		push_error("splash did not auto-show (dialogs disabled / headless?)")
		quit(1)
		return
	# ~0.7s: fade-in (0.5s) complete, glow on its first swell.
	for _i in range(42):
		await process_frame
	root.get_texture().get_image().save_png("%s/splash_in.png" % out_dir)
	# ~0.8s later: opposite phase of the 1.6s glow cycle.
	for _i in range(48):
		await process_frame
	root.get_texture().get_image().save_png("%s/splash_pulse.png" % out_dir)
	print("splash_capture done")
	quit(0)
