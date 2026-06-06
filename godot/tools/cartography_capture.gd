extends SceneTree
## Dev utility: render the real Main scene with the CARTOGRAPHY world map open so the 3-zone
## view (home / mine / harbor), the roads, the "you are here" gold ring on the current zone,
## and the per-zone travel rows (with the mine + harbor expedition buttons ENABLED) all show in
## one shot. Run NON-headless so the GPU actually draws the parchment surfaces + map nodes:
##   godot --path godot --script res://tools/cartography_capture.gd -- <out>
## <out> may be a full file path (…/cartography.png) or a directory (writes <dir>/cartography.png).
## Writes a 720×1280 PNG. Migration evidence for the cartography world-map slice.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var arg: String = args[0] if args.size() > 0 else "res://"
	var out_path: String = arg if arg.to_lower().ends_with(".png") else (arg + "/cartography.png")

	SaveManager.clear()                         # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let the deferred _ready run

	var game: GameState = main.game
	# A City-tier, Town-2-complete settlement on the farm with supplies banked, so BOTH the
	# mine + harbor travel buttons read as enabled (town2_complete unlocks them; supplies + City
	# satisfy the launch guards; on the farm = not already on an expedition).
	game.settlement.tier = TownConfig.TIER_CITY
	game.coins = 980
	game.town2_complete = true
	game.active_biome = "farm"
	game.inventory = {
		"supplies": 8,
		"stone": 12,
		"flour": 6,
	}

	# Suppress the story-beat modal (the arrival beat fires on session start) so it doesn't
	# cover the map in the shot: drain the queue and hide any presented modal.
	game.story.beat_queue.clear()
	if main._story_modal != null:
		main._story_modal.visible = false

	# Open the world map the REAL way (lazily creates + wires the screen, sets the router).
	main._open_cartography()
	main._layout()
	for _i in range(20):                        # let everything settle for a clean shot
		await process_frame

	var screen = main._cartography_screen
	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("cartography capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  current_zone=%s mine_travelable=%s harbor_travelable=%s visible=%s"
		% [screen.current_zone_id(), screen.zone_is_travelable("mine"),
		   screen.zone_is_travelable("harbor"), screen.visible])
	quit(0 if err == OK else 1)
