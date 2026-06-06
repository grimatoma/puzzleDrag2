extends SceneTree
## Dev utility: render the M3 tier-ladder HUD before/after a tier-up. Run
## NON-headless so the GPU draws:
##   godot --path godot --script res://tools/m3a_capture.gd -- <dir>
## Writes <dir>/m3a-camp.png (Camp + "Press T" affordance) and
## <dir>/m3a-hamlet.png (after advancing to Hamlet). Migration evidence.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	img.save_png(path)
	print("saved ", path)

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()                         # ignore any leftover save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                         # let the deferred _ready run

	# Stock the inventory so the Camp→Hamlet tier-up is affordable (revised cost is
	# hay_bundle 12 + flour 6; give a little surplus to show it survives).
	main.game.inventory = {"hay_bundle": 16, "flour": 8, "plank": 6}
	main.game.coins = 28
	main.game.turn = 9
	main._refresh_totals()
	main._refresh_meta()
	main._refresh_settlement()
	for _i in range(3):
		await process_frame
	_save(dir + "/m3a-camp.png")                # Camp, "▲ Press T to advance to Hamlet"

	# Advance one tier (same path the T key drives).
	var res: Dictionary = main.game.try_tier_up()
	main._refresh_totals()
	main._refresh_meta()
	main._refresh_settlement()
	main._status_label.text = "Town advanced  →  %s" % res.get("name", "")
	for _i in range(3):
		await process_frame
	_save(dir + "/m3a-hamlet.png")              # Hamlet · cap 300 · 5 plots

	print("  tier=%d name=%s plots=%d cap=%d inventory=%s"
		% [main.game.settlement.tier, main.game.settlement.tier_name(),
		   main.game.settlement.plots(), main.game.settlement.cap(), main.game.inventory])
	quit(0)
