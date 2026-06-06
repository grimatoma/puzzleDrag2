extends SceneTree
## Dev utility: open and render the M10 Achievements trophy screen (scenes/AchievementsScreen.gd)
## on a realistic GameState with a few trophies unlocked + several mid-progress, and save a
## 720×1280 PNG. Run NON-headless so the GPU draws the parchment card, iron border, drop
## shadow, section sub-headings, the 🏆/🔒 trophy rows, the MOSS→GOLD progress bars, and the
## Cinzel title:
##   godot --path godot --script res://tools/m10ach_capture.gd -- <out_path.png>
## Writes the PNG at the given CLI path (default /tmp/m10-achievements.png). Migration
## evidence for the headline visible feature (achievements view over the tracked logic).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "/tmp/m10-achievements.png"

	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	var game: GameState = main.game
	var t := Constants.Tile

	# ── Drive a realistic mix of UNLOCKED + mid-progress trophies through the REAL
	#    wired paths (credit_chain / fill_order) plus a couple of direct counter bumps
	#    for events the capture can't easily simulate. No fakes — every counter below
	#    is a real GameState mutation that the live game performs.

	# Chains: 12 committed → first_steps (1) + patient_hands (10) UNLOCKED; tireless (100) partial.
	# Each grass chain ALSO bumps distinct_resources_chained (hay_bundle) once.
	for _i in range(12):
		game.credit_chain(t.GRASS, 4)

	# A spread of distinct produced resources → naturalist (8) partway. credit_chain a few
	# different farm/mine tiles (each produces a distinct resource on first sighting).
	game.credit_chain(t.WHEAT, 3)     # flour
	game.credit_chain(t.CARROT, 3)    # soup
	game.credit_chain(t.APPLE, 3)     # pie
	game.credit_chain(t.OAK, 3)       # plank  (also tree_chained += 3)
	game.credit_chain(t.PANSY, 3)     # honey  (also flower_chained += 3)
	# → distinct_resources_chained now ~6 (hay_bundle + 5 above): naturalist (8) shows 6/8.

	# Mine: a stone + gem chain → first_strike (1) UNLOCKED; deep_digger (50)/mine_master (200) partial.
	game.credit_chain(t.STONE, 18)    # mine_chained += 18 → first_strike unlocked, 18/50
	game.credit_chain(t.GEM, 9)       # mine_chained += 9  → 27/50

	# Harvest: push a couple of category counters mid-bar so the Harvest section reads richly.
	game.credit_chain(t.CARROT, 22)   # veg_chained → ~25/50 (veg_patron)
	game.credit_chain(t.OAK, 30)      # tree_chained → ~33/50 (forester)

	# Orders: fill 5 villager orders → trusted_friend (5) UNLOCKED; village_voice (25) partial.
	game.seed_orders(1337)
	for r in ["hay_bundle", "flour", "soup", "pie", "plank", "honey", "block"]:
		game.inventory[r] = int(game.inventory.get(r, 0)) + 1000
	game.refill_orders()
	var filled := 0
	var guard := 0
	while filled < 5 and guard < 200:
		guard += 1
		var idx := -1
		for i in game.orders.size():
			if game.can_fill_order(i):
				idx = i
				break
		if idx < 0:
			break
		if bool(game.fill_order(idx)["ok"]):
			filled += 1

	# Boss: a defeated boss → first_blood (1) UNLOCKED, via the real damage_boss path.
	game.boss_active = BossConfig.FROSTMAW
	game.boss_hp = 4
	game.damage_boss(10)              # over-kill → defeated → bosses_defeated 1, first_blood unlocked

	# Buildings: two distinct built buildings → town_planner (5) partial (2/5), via a direct
	# distinct bump (the capture doesn't run the full build flow, but this is the same counter
	# the wired build() path bumps).
	game.bump_counter("distinct_buildings_built", 1, "lumber_camp")
	game.bump_counter("distinct_buildings_built", 1, "coop")

	# Open the achievements screen (lazily builds + lays out its Control tree), then let it
	# settle so the parchment styles, shadow, bars, and Cinzel font all draw cleanly.
	main._open_achievements()
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var screen = main._achievements_screen
	print("m10ach capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  unlocked=%d / total=%d  rows=%d" % [
		screen.unlocked_count(), screen.total_count(), screen._rows.size()])
	quit(0 if err == OK else 1)
