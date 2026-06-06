extends SceneTree
## Dev utility: show the capstone boss (Frostmaw) active in the HUD. Run NON-headless:
##   godot --path godot --script res://tools/m3g_capture.gd -- <dir>
## Writes <dir>/m3g-boss.png — Frostmaw engaged (HP bar + raised min-chain),
## over the board (now real Stage-2 PNG tile art). Migration evidence.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	img.save_png(path)
	print("saved ", path)

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame

	# City tier + mine mastery (block + iron_bar >= 12), then summon Frostmaw.
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.inventory = {"block": 8, "iron_bar": 6, "coke": 4, "plank": 10}
	main.game.coins = 320
	var started: Dictionary = main.game.start_boss()
	main.board.set_min_chain(main.game.boss_min_chain())
	# Grind it part-way down so the HP bar reads mid-fight (40 → 16).
	main.game.damage_boss(8)
	main.game.damage_boss(8)
	main.game.damage_boss(8)
	main._status_label.text = "Frostmaw appears! Chains of 4+ to break it."
	main._refresh_meta()
	main._refresh_settlement()
	main._refresh_boss()
	for _i in range(8):
		await process_frame
	_save(dir + "/m3g-boss.png")

	print("  started=%s boss_active=%s hp=%d town2_complete=%s"
		% [started.get("ok", false), main.game.boss_active, main.game.boss_hp,
		   main.game.town2_complete])
	quit(0)
