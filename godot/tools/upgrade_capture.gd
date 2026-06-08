extends SceneTree
## A1b live-verify: force a ≥6 BIRDS chain on the LIVE home farm board and confirm an UPGRADE
## tile (PIG / herd, birds→herd in the home upgradeMap) actually appears on the board after the
## chain resolves — the React core loop end-to-end (Main installs board.upgrade_provider →
## GameState.upgrade_spawn). Also confirms a FRUIT chain (fruit→GOLD) injects NO upgrade tile.
## Captures the post-chain board to a PNG. Run NON-headless:
##   godot --path godot --script res://tools/upgrade_capture.gd -- <out_path.png>

func _grid_count(grid: Array, tile: int) -> int:
	var n := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://_caps/a1b_upgrade.png"

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

	var board = main.board
	print("on farm: %s | upgrade_provider valid: %s" % [
		main.game.active_biome == "farm", board.upgrade_provider.is_valid()])

	# Force the top two rows to PHEASANT (birds) and the rest to GRASS, so the only chain is a
	# clean 6-bird run across the top row and the refill (grass-weighted) never re-adds birds.
	for r in Constants.ROWS:
		for c in Constants.COLS:
			board.grid[r][c] = Constants.Tile.PHEASANT if r <= 1 else Constants.Tile.GRASS
	board._build_tiles()
	var pig_before := _grid_count(board.grid, Constants.Tile.PIG)

	# Resolve a 6-bird chain across row 0 → upgrade_spawn(home, PHEASANT, 6) → 1 PIG.
	var path: Array = []
	for c in range(6):
		path.append(Vector2i(c, 0))
	var ok: bool = board.try_resolve(path)
	# Let the collapse/refill tweens (and the upgrade pop-in) settle for the screenshot.
	for _i in range(40):
		await process_frame

	var pig_after := _grid_count(board.grid, Constants.Tile.PIG)
	print("BIRDS→PIG: chain ok=%s | PIG before=%d after=%d" % [ok, pig_before, pig_after])
	if pig_after < 1:
		push_error("A1b FAIL: a 6-bird chain did NOT spawn a PIG upgrade tile")

	# Now a FRUIT chain (fruit→GOLD): force top rows to APPLE, chain 6 → expect NO upgrade tile.
	for r in Constants.ROWS:
		for c in Constants.COLS:
			board.grid[r][c] = Constants.Tile.APPLE if r <= 1 else Constants.Tile.GRASS
	board._build_tiles()
	var apple_before := _grid_count(board.grid, Constants.Tile.APPLE)
	var fpath: Array = []
	for c in range(6):
		fpath.append(Vector2i(c, 0))
	var fok: bool = board.try_resolve(fpath)
	for _i in range(20):
		await process_frame
	var apple_after := _grid_count(board.grid, Constants.Tile.APPLE)
	# fruit→GOLD: 6 chained, 6 un-chained survive, none injected → exactly 6 apples remain.
	print("FRUIT→GOLD: chain ok=%s | APPLE before=%d after=%d (expect 6, no upgrade injected)" % [
		fok, apple_before, apple_after])
	if apple_after != 6:
		push_error("A1b FAIL: fruit→GOLD did not behave as coins-only (no upgrade tile)")

	# Re-show the PIG board for the capture: redo the birds chain so the screenshot shows the
	# herd upgrade tile that the headline mechanic produces.
	for r in Constants.ROWS:
		for c in Constants.COLS:
			board.grid[r][c] = Constants.Tile.PHEASANT if r <= 1 else Constants.Tile.GRASS
	board._build_tiles()
	var p2: Array = []
	for c in range(6):
		p2.append(Vector2i(c, 0))
	board.try_resolve(p2)
	for _i in range(40):
		await process_frame
	var pig_final := _grid_count(board.grid, Constants.Tile.PIG)
	print("CAPTURE board PIG count=%d" % pig_final)

	# Hide any auto-popped modal (story / harvest / tutorial) so the board + PIG is unobstructed.
	for m in [main._story_modal, main._harvest_modal, main._tutorial_modal]:
		if m != null:
			m.visible = false
	await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("upgrade_capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	var pass_ok := (pig_after >= 1) and (apple_after == 6) and (err == OK)
	quit(0 if pass_ok else 1)
