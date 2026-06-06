extends SceneTree
## Dev utility: render the real Main scene on a HARBOR expedition (M3j) so the fish board,
## the giant pearl, the harbor biome pill ("🌊 Harbor · <tide> · N"), and the runes pill all
## show in one shot. Run NON-headless so the GPU actually draws the parchment surfaces +
## fish tiles:
##   godot --path godot --script res://tools/fish_capture.gd -- <out>
## <out> may be a full file path (…/fish.png) or a directory (writes <dir>/fish.png). Writes
## a 720×1280 PNG. Migration evidence for the fish/harbor board milestone: the harbor
## board (fish tiles), the on-board giant pearl, and the harbor/runes HUD.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var arg: String = args[0] if args.size() > 0 else "res://"
	# Accept either a full .png path or a directory.
	var out_path: String = arg if arg.to_lower().ends_with(".png") else (arg + "/fish.png")

	SaveManager.clear()                         # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let the deferred _ready run

	var game: GameState = main.game
	# A City-tier, Town-2-complete settlement with a healthy purse + catch already banked, so
	# the stockpile chips and pills read as a mid-harbor run. town2_complete unlocks the harbor
	# (the Town-3 framing); a couple of prior runes show the runes pill.
	game.settlement.tier = TownConfig.TIER_CITY
	game.coins = 980
	game.town2_complete = true
	game.runes = 2
	game.inventory = {
		"supplies": 8,
		"fish_fillet": 14,
		"sea_shells": 6,
		"pearls": 3,
		"fish_oil": 5,
	}
	# Enter the harbor the REAL way: convert supplies → turns, seed the tide + pearl, then run
	# Main's biome-refresh path (exactly what the Town screen triggers via state_changed →
	# _on_town_changed). That swaps the board onto the FISH_POOL and places the pearl.
	game.enter_harbor()
	# Pin the pearl to a clearly-visible interior cell so the shot frames it well.
	game.fish_pearl = {"row": 2, "col": 3, "turns_left": Constants.PEARL_TURNS}
	main._on_town_changed()
	await process_frame

	# Make sure the pearl tile is on the board at the pinned cell (clear any random one the
	# entry seeded elsewhere first, so there is exactly one pearl in the shot).
	var board: Board = main.board
	var t := Constants.Tile
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if board.grid[r][c] == t.FISH_PEARL:
				board.grid[r][c] = t.FISH_KELP
	board.place_pearl(Vector2i(3, 2))
	board._build_tiles()

	# Suppress the story-beat modal (the arrival beat fires on session start) so it doesn't
	# cover the board in the shot: drain the queue and hide any presented modal.
	game.story.beat_queue.clear()
	if main._story_modal != null:
		main._story_modal.visible = false

	main._layout()
	main._refresh_meta()
	main._refresh_settlement()
	main._refresh_biome()
	main._refresh_runes()
	main._refresh_totals()
	main._chain_label.text = "Chain fish beside the 🦪 pearl to capture a rune"
	main._status_label.text = "🌊 On the harbor — chain 2+ fish next to the giant pearl for a Rune."
	for _i in range(20):                        # let everything settle for a clean shot
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("fish capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  in_harbor=%s tide=%s turns=%d runes=%d pearls_on_board=%d"
		% [game.is_in_harbor(), game.fish_tide, game.harbor_turns_left, game.runes,
		   _grid_count(board.grid, t.FISH_PEARL)])
	quit(0 if err == OK else 1)

func _grid_count(grid: Array, tile: int) -> int:
	var n := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n
