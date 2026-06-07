extends SceneTree
## Dev utility: render Main at an ARBITRARY window size + stretch aspect so we can
## verify responsive layout (the "grow to the screen on a foldable" goal). Run
## NON-headless:
##   godot --path godot --script res://tools/size_capture.gd -- <w> <h> <aspect> <out_path>
## <aspect> is one of: keep | expand | keep_height | keep_width | ignore
## Examples:
##   ... -- 720 1280 keep   _cap_portrait_keep.png
##   ... -- 1080 1200 expand _cap_wide_expand.png

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var w: int = int(args[0]) if args.size() > 0 else 720
	var h: int = int(args[1]) if args.size() > 1 else 1280
	var aspect_name: String = args[2] if args.size() > 2 else "keep"
	var out_path: String = args[3] if args.size() > 3 else "res://_cap.png"

	var win := root
	# Resize the on-screen window first so the viewport matches a real device.
	DisplayServer.window_set_size(Vector2i(w, h))
	win.size = Vector2i(w, h)

	# Apply the requested content-scale aspect at runtime (overrides project.godot).
	match aspect_name:
		"expand":
			win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
		"keep_height":
			win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP_HEIGHT
		"keep_width":
			win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP_WIDTH
		"ignore":
			win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_IGNORE
		_:
			win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP

	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	for _i in range(50):
		await process_frame
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("size_capture %s aspect=%s -> %s (err %d)" % [img.get_size(), aspect_name, out_path, err])
	quit(0 if err == OK else 1)
