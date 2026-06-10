extends SceneTree
## Visual evidence for the 2026-06-10 bug-fix batch: town map (gear alignment, nav
## contrast, Start Farming button), zoomed map clipping, build picker scroll, Start
## Farming modal slots, inventory expand-in-place, craft rows with hero icons.
##   godot --path godot --script res://tools/fixes_capture.gd -- res://_caps

func _shot(path: String) -> void:
	var img := root.get_texture().get_image()
	img.save_png(path)
	print("shot -> ", path)

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var outdir: String = args[0] if args.size() > 0 else "user://_caps"
	DisplayServer.window_set_size(Vector2i(720, 1280))
	root.size = Vector2i(720, 1280)

	SaveManager.clear()
	var m = load("res://scenes/Main.tscn").instantiate()
	root.add_child(m)
	await process_frame
	m.game.mark_tutorial_seen()
	if m._tutorial_modal != null: m._tutorial_modal.visible = false
	# Grant goods so inventory/craft/build surfaces render rich.
	m.game.inventory["hay_bundle"] = 14
	m.game.inventory["flour"] = 9
	m.game.inventory["bread"] = 3
	m.game.inventory["eggs"] = 5
	m.game.coins = 120
	m._refresh_totals()
	for _i in range(30): await process_frame
	if m._tutorial_modal != null: m._tutorial_modal.visible = false
	for _i in range(8): await process_frame
	_shot(outdir + "/f1_townmap.png")

	# Zoom IN twice + pan — the map must stay clipped inside its host band.
	for _z in range(4):
		m._townmap_screen._on_zoom_in()
	m._townmap_screen._map.pan_by(Vector2(120, 140))
	for _i in range(8): await process_frame
	_shot(outdir + "/f2_townmap_zoomed.png")
	m._townmap_screen._on_recenter()

	# Build picker (full roster, should scroll inside the viewport).
	m._townmap_screen._on_build_button()
	for _i in range(14): await process_frame
	_shot(outdir + "/f3_build_picker.png")
	m._townmap_screen._close_panel()

	# Start Farming modal (slots should be parchment, not green).
	m._open_startfarming()
	for _i in range(14): await process_frame
	_shot(outdir + "/f4_startfarming.png")
	m._startfarming_modal.close()

	# Inventory: expand the flour row in place.
	m.apply_deeplink("inventory")
	for _i in range(14): await process_frame
	m._inventory_screen.toggle_expand("res:flour")
	for _i in range(14): await process_frame
	_shot(outdir + "/f5_inventory_expanded.png")

	# Craft view: hero-icon rows + detail card.
	m.apply_deeplink("craft")
	for _i in range(14): await process_frame
	_shot(outdir + "/f6_craft.png")
	quit(0)
