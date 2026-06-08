extends SceneTree
## QA dev utility: render detail-heavy screens from a RICH granted state (high tier,
## built buildings, full inventory, coins/runes/influence) so detail panels render with
## real content (orders, filled plots, resource rows, enabled Craft, affordable buys).
## NOT a gameplay path — a capture aid for the menu/detail-panel QA pass. Run NON-headless:
##   godot --path godot --script res://tools/qa_grant_capture.gd -- <w> <h> <aspect> <out_dir> [id...]
## <aspect>: keep | expand | keep_height | keep_width | ignore

func _hide_autos(main) -> void:
	if main._tutorial_modal != null: main._tutorial_modal.visible = false
	if main._story_modal != null: main._story_modal.visible = false
	if main._daily_modal != null: main._daily_modal.visible = false
	if main._harvest_modal != null: main._harvest_modal.visible = false

func _cap(main, id: String, out_dir: String) -> void:
	main.apply_deeplink(id)
	for _i in range(24): await process_frame
	_hide_autos(main)
	for _i in range(6): await process_frame
	var img := root.get_texture().get_image()
	var err := img.save_png("%s/%s.png" % [out_dir, id])
	print("grantcap %s logical=%s -> %s/%s.png (err %d)" % [id, root.get_visible_rect().size, out_dir, id, err])
	main.apply_deeplink("board")
	for _i in range(6): await process_frame

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var w: int = int(args[0]) if args.size() > 0 else 720
	var h: int = int(args[1]) if args.size() > 1 else 1280
	var aspect_name: String = args[2] if args.size() > 2 else "expand"
	var out_dir: String = args[3] if args.size() > 3 else "res://tools/_caps"
	var ids: Array = []
	for i in range(4, args.size()):
		ids.append(args[i])
	if ids.is_empty():
		ids = ["town", "townmap", "inventory", "recipes", "castle", "decorations",
			"portal", "quests", "townsfolk", "achievements"]

	DirAccess.make_dir_recursive_absolute(out_dir)
	DisplayServer.window_set_size(Vector2i(w, h))
	root.size = Vector2i(w, h)
	match aspect_name:
		"expand": root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND
		"keep_height": root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP_HEIGHT
		"keep_width": root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP_WIDTH
		"ignore": root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_IGNORE
		_: root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	_hide_autos(main)
	main.game.mark_tutorial_seen()

	# ── grant a rich state (capture-only) ───────────────────────────────────────
	main.game.coins = 9999
	main.game.runes = 50
	main.game.influence = 320
	var grant := {"flour": 60, "bread": 90, "eggs": 40, "hay_bundle": 80, "plank": 40,
		"supplies": 24, "honey": 14, "milk": 20, "block": 30, "meat": 28, "soup": 18,
		"pie": 12, "coal": 30, "stone": 40, "iron_bar": 16, "horseshoe": 10}
	for k in grant: main.game.inventory[k] = grant[k]
	# Tier up to the max so plots exist + every building unlocks.
	main.game.settlement.tier = TownConfig.MAX_TIER
	main.game.award_xp(600)
	# Build the standard (non-hazard) buildings via the real API so plots fill + spawners wire.
	for bid in BuildingConfig.ALL_BUILD_IDS:
		if not BuildingConfig.is_hazard_building(bid):
			main.game.build(bid)
	main.game.refill_orders()
	main._refresh_totals(); main._refresh_meta(); main._refresh_settlement()
	main._refresh_buildings(); main._refresh_orders()
	for _i in range(10): await process_frame

	for id in ids:
		await _cap(main, String(id), out_dir)
	print("qa_grant_capture done (tier=%d buildings=%s)" % [main.game.settlement.tier, str(main.game.buildings)])
	quit(0)
