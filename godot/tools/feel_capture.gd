extends SceneTree
## Dev utility: capture the new board "feel" FX — a mid-resolve frame (shake + radial flash +
## spark burst + floating gain text + upgrade burst) and an armed-tap-tool frame (the red board
## frame pulse + armed banner). Run NON-headless:
##   godot --path godot --script res://tools/feel_capture.gd -- <out_dir>

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_dir: String = args[0] if args.size() > 0 else "res://_caps"

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	var board = main.board
	# A full grass field so a clean 6-chain resolves; chain across row 2 so the FX centre sits
	# mid-board (not clipped at an edge), then capture a few frames into the burst.
	for r in Constants.ROWS:
		for c in Constants.COLS:
			board.grid[r][c] = Constants.Tile.GRASS
	board._build_tiles()
	# A 12-tile S-chain (row 2 L→R, drop, row 3 R→L) → stage DOUBLE, 2 upgrades → bigger
	# shake/flash + 2 stars, so the escalation reads.
	var path: Array = []
	for c in range(6):
		path.append(Vector2i(c, 2))
	for c in range(5, -1, -1):
		path.append(Vector2i(c, 3))
	board.try_resolve(path)
	# Capture EARLY (frame 4) to catch the radial flash + spark burst near their peak. A resolve
	# fires a story beat → a modal that would cover the board FX, so suppress every auto-modal.
	for _i in range(4):
		main.game.story.beat_queue.clear()
		for m in [main._story_modal, main._harvest_modal, main._tutorial_modal]:
			if m != null:
				m.visible = false
		await process_frame
	var img := root.get_texture().get_image()
	print("feel_resolve -> err %d" % img.save_png(out_dir + "/feel_resolve.png"))

	# Let the FX settle, then arm a tap-target tool to show the red armed frame pulse + banner.
	for _i in range(70):
		await process_frame
	main.game.grant_tool(ToolConfig.BOMB, 2)
	main._hud._refresh_tools()
	board.set_targeting(true)
	main._hud.show_tool_armed_banner(ToolConfig.BOMB)
	for _i in range(16):
		main.game.story.beat_queue.clear()
		for m in [main._story_modal, main._harvest_modal, main._tutorial_modal]:
			if m != null:
				m.visible = false
		await process_frame
	var img2 := root.get_texture().get_image()
	print("feel_armed -> err %d" % img2.save_png(out_dir + "/feel_armed.png"))

	quit(0)
