extends SceneTree
## Dev utility: open and render the M4f settings/menu modal. Run NON-headless so the
## GPU draws the parchment card, iron border, drop shadow, and pill-styled buttons:
##   godot --path godot --script res://tools/m4f_capture.gd -- <dir>
## Writes <dir>/m4f-menu.png — the centered parchment "⚙ Menu" modal over the warm
## scrim, with the Sound / New Game / Close pill buttons. Migration evidence.

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	var err := img.save_png(path)
	print("saved %s (%s, err %d)" % [path, img.get_size(), err])

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var dir: String = args[0] if args.size() > 0 else "res://"
	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# A little stockpile so the HUD behind the scrim isn't bare (the menu is the focus,
	# but a populated board + top-bar reads as the real game under the modal).
	main.game.coins = 84
	main.game.inventory = {"hay_bundle": 12, "flour": 9, "plank": 4}
	main._refresh_totals()
	main._refresh_meta()

	# Open the settings/menu modal (lazily builds + lays out its Control tree), then let
	# it settle so the parchment styles, shadow, and Cinzel font all draw cleanly.
	main._open_menu()
	for _i in range(16):
		await process_frame

	_save(dir + "/m4f-menu.png")
	print("  audio_muted=%s sound_btn='%s'"
		% [main.game.audio_muted, main._menu_screen._action_buttons["toggle_sound"].text])
	quit(0)
