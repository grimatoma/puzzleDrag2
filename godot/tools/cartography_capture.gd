extends SceneTree
## Dev utility: render the real Main scene with the CARTOGRAPHY world map open so the FULL
## 11-node illustrated parchment map (region blobs, dashed/solid roads, state-styled node pins,
## the gold "you are here" ring) + the per-node detail panel show in one shot. Run NON-headless
## so the GPU actually draws the parchment surfaces + map:
##   godot --path godot --script res://tools/cartography_capture.gd -- <out>
## <out> may be a full file path (…/cartography.png) or a directory (writes <dir>/cartography.png).
## Writes a 720×1280 PNG. Migration evidence for the T26 cartography world-map slice.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var arg: String = args[0] if args.size() > 0 else "res://"
	var out_path: String = arg if arg.to_lower().ends_with(".png") else (arg + "/cartography.png")

	SaveManager.clear()                         # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let the deferred _ready run

	var game: GameState = main.game
	# A City-tier settlement on the farm with coins + supplies banked, and several nodes already
	# explored, so the map shows a mix of visited / discovered / hidden pins + a travelable
	# detail panel. Visit a few nodes the REAL way (travel_to) so the discovery ring is populated.
	game.settlement.tier = TownConfig.TIER_CITY
	game.coins = 980
	game.town2_complete = true
	game.almanac_level = 6
	game.active_biome = "farm"
	game.inventory = {
		"supplies": 8,
		"stone": 12,
		"flour": 6,
	}
	game.travel_to("meadow")
	game.travel_to("crossroads")
	game.travel_to("home")     # fast-travel back so the current pin is the hearth

	# Suppress the story-beat modal (the arrival beat fires on session start) so it doesn't
	# cover the map in the shot: drain the queue and hide any presented modal.
	game.story.beat_queue.clear()
	if main._story_modal != null:
		main._story_modal.visible = false

	# Open the world map the REAL way (lazily creates + wires the screen, sets the router).
	main._open_cartography()
	# Select a discovered, travelable node so the detail panel shows a node + an enabled button.
	main._cartography_screen.select_node("quarry")
	main._layout()
	for _i in range(20):                        # let everything settle for a clean shot
		await process_frame

	var screen = main._cartography_screen
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("cartography capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  current_node=%s selected=%s quarry_state=%s quarry_travelable=%s visible=%s"
		% [screen.current_node_id(), screen.selected_node_id(), screen.node_state("quarry"),
		   screen.node_is_travelable("quarry"), screen.visible])
	quit(0 if err == OK else 1)
