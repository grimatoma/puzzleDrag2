extends SceneTree
## Dev utility: open and render the M4g dedicated Inventory ledger. Run NON-headless so
## the GPU draws the parchment card, iron border, drop shadow, group headers, the
## per-resource rows (count + sell value), and the total-value footer:
##   godot --path godot --script res://tools/m4g_capture.gd
## Writes the migration-evidence PNG to the docs assets folder.

const OUT_PATH := "C:/Users/grima/Documents/aiDev/puzzleDrag2/docs/assets/godot/m4g-inventory.png"

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	var err := img.save_png(path)
	print("saved %s (%s, err %d)" % [path, img.get_size(), err])

func _initialize() -> void:
	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# A rich spread across all groups so every section + the value math reads clearly:
	#   Farm goods: hay_bundle, flour, eggs, plank, honey, meat
	#   Refined:    bread, supplies (supplies non-sellable → "—")
	#   Mine:       block, iron_bar, coke, cut_gem
	main.game.coins = 240
	main.game.inventory = {
		"hay_bundle": 38, "flour": 21, "eggs": 9, "plank": 14, "honey": 3, "meat": 5,
		"bread": 7, "supplies": 4,
		"block": 26, "iron_bar": 12, "coke": 4, "cut_gem": 2,
	}
	main._refresh_totals()
	main._refresh_meta()

	# Open the Inventory ledger (lazily builds + lays out its Control tree), then let
	# it settle so the parchment styles, shadow, and Cinzel font all draw cleanly.
	main._open_inventory()
	for _i in range(16):
		await process_frame

	_save(OUT_PATH)
	var inv = main._inventory_screen
	print("  total_value=%d kinds=%d total_units=%d"
		% [inv.total_value(), inv.kinds(), inv.total_units()])
	quit(0)
