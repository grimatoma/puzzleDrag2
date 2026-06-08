extends SceneTree
## Minimal, FAST verification (2 Main instances, run FOREGROUND) of the modal dismiss
## fixes: (1) tap the scrim closes a just-scrolled modal whose Close-button first click
## SmoothScroll eats; (2) ESC / ui_cancel closes the top modal.
##   godot --path godot --script res://tools/dismiss_diag.gd

func _click(pos: Vector2) -> void:
	for pressed in [true, false]:
		var ev := InputEventMouseButton.new()
		ev.button_index = MOUSE_BUTTON_LEFT
		ev.pressed = pressed
		ev.position = pos
		ev.global_position = pos
		root.push_input(ev)

func _wheel(pos: Vector2) -> void:
	# Real OS wheel events come as a press AND a release; sending only the press makes
	# the viewport think the wheel button is held and capture later mouse events.
	for pressed in [true, false]:
		var ev := InputEventMouseButton.new()
		ev.button_index = MOUSE_BUTTON_WHEEL_DOWN
		ev.pressed = pressed
		ev.position = pos
		ev.global_position = pos
		ev.factor = 1.0
		root.push_input(ev)

func _initialize() -> void:
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)
	root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND

	# (0) scrim tap on a FRESH modal (no scroll) — isolates wiring from the scroll state
	SaveManager.clear()
	var m0 = load("res://scenes/Main.tscn").instantiate()
	root.add_child(m0)
	await process_frame
	m0.game.mark_tutorial_seen()
	if m0._tutorial_modal != null: m0._tutorial_modal.visible = false
	m0.apply_deeplink("achievements")
	for _i in range(24): await process_frame
	if m0._tutorial_modal != null: m0._tutorial_modal.visible = false
	# Is the backdrop wired? Find the first ColorRect child of the achievements layer.
	var bd = null
	for ch in m0._achievements_screen.get_children():
		if ch is ColorRect: bd = ch; break
	print("[wire] backdrop found=", bd != null, " wired_meta=", (bd != null and bd.has_meta("_dismiss_wired")),
		" mouse_filter=", (bd.mouse_filter if bd != null else -1))
	# hovered control at the scrim point
	var mm := InputEventMouseMotion.new(); mm.position = Vector2(12, 640); mm.global_position = Vector2(12, 640)
	root.push_input(mm); await process_frame
	var hov = root.gui_get_hovered_control()
	print("[wire] hovered at (12,640) = ", (hov.get_class() if hov != null else "<null>"))
	print("[scrim0] before tap (fresh), achievements.visible=", (m0._achievements_screen != null and m0._achievements_screen.visible))
	_click(Vector2(12, 640))
	for _i in range(18): await process_frame
	print("[scrim0] after fresh scrim tap, achievements.visible=", (m0._achievements_screen != null and m0._achievements_screen.visible))
	m0.queue_free()
	await process_frame

	# (1) scrim tap closes a scrolled modal
	SaveManager.clear()
	var m1 = load("res://scenes/Main.tscn").instantiate()
	root.add_child(m1)
	await process_frame
	m1.game.mark_tutorial_seen()
	if m1._tutorial_modal != null: m1._tutorial_modal.visible = false
	m1.apply_deeplink("achievements")
	for _i in range(24): await process_frame
	if m1._tutorial_modal != null: m1._tutorial_modal.visible = false
	# scroll so SmoothScroll enters the click-eating state
	var sc = m1.find_children("", "SmoothScrollContainer", true, false)
	if sc.size() > 0:
		var center = sc[0].global_position + sc[0].size * 0.5
		for _w in range(5):
			_wheel(center)
			for _i in range(3): await process_frame
	print("[scrim] before tap, achievements.visible=", (m1._achievements_screen != null and m1._achievements_screen.visible))
	_click(Vector2(12, 640))   # left scrim margin (card starts at x=24)
	for _i in range(18): await process_frame
	print("[scrim] after scrim tap, achievements.visible=", (m1._achievements_screen != null and m1._achievements_screen.visible))
	m1.queue_free()
	await process_frame

	# (2) ESC closes the top modal
	SaveManager.clear()
	var m2 = load("res://scenes/Main.tscn").instantiate()
	root.add_child(m2)
	await process_frame
	m2.game.mark_tutorial_seen()
	if m2._tutorial_modal != null: m2._tutorial_modal.visible = false
	m2.apply_deeplink("townsfolk")
	for _i in range(24): await process_frame
	if m2._tutorial_modal != null: m2._tutorial_modal.visible = false
	print("[esc] before, townsfolk.visible=", (m2._townsfolk_screen != null and m2._townsfolk_screen.visible))
	var esc := InputEventAction.new(); esc.action = "ui_cancel"; esc.pressed = true
	root.push_input(esc)
	for _i in range(18): await process_frame
	print("[esc] after ESC, townsfolk.visible=", (m2._townsfolk_screen != null and m2._townsfolk_screen.visible))
	m2.queue_free()
	await process_frame
	quit(0)
