extends SceneTree
## Dev utility: open and render the M11 Tile Collection browser (scenes/TileCollectionScreen.gd)
## and save a 720×1280 PNG. Run NON-headless so the GPU draws the parchment card,
## iron border, drop shadow, category sub-headings, tile art (PNG or colored placeholder),
## display names, produce labels, and the Cinzel title:
##   godot --path godot --script res://tools/tilecol_capture.gd -- <out_path.png>
## Writes the PNG at the given CLI path (default /tmp/tilecol.png). Migration evidence
## for the headline visible feature (tile collection browser over the wired tile set).

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "/tmp/tilecol.png"

	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# Open the tile collection screen (lazily builds + lays out its Control tree),
	# then let it settle so the parchment styles, shadow, tile art, and Cinzel font
	# all draw cleanly.
	main._open_tiles()
	for _i in range(20):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	var tc_screen = main._tile_collection_screen
	print("tilecol capture %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  tiles=%d  cards=%d" % [
		Constants.STRING_KEYS.size(), tc_screen._cards.size()])
	quit(0 if err == OK else 1)
