extends SceneTree
## Ad-hoc verifier: load each SpriteFrames .tres passed after `--` and assert the
## v2 tile contract (one looping "idle" animation with N frames at the project fps).
## Run: <godot> --headless --path godot --script res://tools/verify_sf.gd -- <res://....tres> [...]
func _initialize() -> void:
	var any_fail := false
	for p in OS.get_cmdline_user_args():
		var res := load(p)
		if res == null or not (res is SpriteFrames):
			print("FAIL  ", p, "  (did not load as SpriteFrames — imported?)")
			any_fail = true
			continue
		var sf := res as SpriteFrames
		var a := &"idle"
		var ok := sf.has_animation(a)
		var loops := sf.get_animation_loop(a) if ok else false
		var fps := sf.get_animation_speed(a) if ok else 0.0
		var n := sf.get_frame_count(a) if ok else 0
		print("%s  idle=%s loop=%s fps=%s frames=%d  anims=%s"
			% [p, ok, loops, fps, n, str(sf.get_animation_names())])
		if not ok or not loops or n <= 0:
			any_fail = true
	quit(1 if any_fail else 0)
