extends SceneTree
## Headless tests for the M4f settings/menu modal (scenes/MenuScreen.gd + its wiring
## into scenes/Main.gd). Three layers:
##
##   1. GameState persistence — audio_muted defaults false, round-trips through
##      SaveManager.save → load_state, and appears in to_dict().
##   2. MenuScreen wiring — the modal builds, exposes the three action buttons, and
##      emitting `pressed` on them fires the right intent signal (toggle_sound /
##      closed). The screen emits signals; Main owns the mute flip, so the test just
##      verifies the buttons exist + the signals fire.
##   3. Main integration — the real Main scene wires the menu handlers; calling
##      _on_toggle_sound() directly flips game.audio_muted AND mutes the Audio service.
##
## Same dependency-free harness as tests/run_town_ui_tests.gd; `class_name` globals are
## aliased with `var` (not const — a class_name ref isn't a constant expression in 4.6).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_menu_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

var _checks: int = 0
var _failures: int = 0

# Signal counters (MenuScreen layer).
var _toggle_count: int = 0
var _newgame_count: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_toggle_sound() -> void:
	_toggle_count += 1

func _on_new_game() -> void:
	_newgame_count += 1

func _on_closed() -> void:
	_closed_count += 1

## Press the action button registered under `key`. Returns true if it existed.
func _press(menu, key: String) -> bool:
	var btn: Variant = menu._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Menu / settings (M4f) tests ────────────────────")

	# ── 1. GameState persistence ──────────────────────────────────────────────
	var g0 := GameState.new()
	_check(g0.audio_muted == false, "audio_muted defaults to false (sound on)")
	_check(g0.to_dict().has("audio_muted"), "to_dict() contains the audio_muted key")
	_check(bool(g0.to_dict()["audio_muted"]) == false, "to_dict() audio_muted == false by default")

	# Set it true, round-trip through save/load, assert preserved.
	g0.audio_muted = true
	_check(bool(g0.to_dict()["audio_muted"]) == true, "to_dict() reflects audio_muted = true")
	SaveManager.clear()
	_check(SaveManager.save(g0), "SaveManager.save() succeeded")
	var g1: GameState = SaveManager.load_state()
	_check(g1.audio_muted == true, "audio_muted survives save → load_state (true)")
	SaveManager.clear()

	# A save written WITHOUT the field (old save) reads back false (default).
	var legacy: GameState = GameState.from_dict({"coins": 5})
	_check(legacy.audio_muted == false, "from_dict() with no audio_muted defaults to false")

	# ── 2. MenuScreen wiring ──────────────────────────────────────────────────
	var game := GameState.new()
	var menu := MenuScreen.new()
	root.add_child(menu)
	menu.setup(game)
	await process_frame
	menu.open()
	menu.connect("toggle_sound", Callable(self, "_on_toggle_sound"))
	menu.connect("new_game", Callable(self, "_on_new_game"))
	menu.connect("closed", Callable(self, "_on_closed"))

	_check(menu.visible, "menu is visible after open()")
	_check(menu._action_buttons.has("toggle_sound"), "_action_buttons has 'toggle_sound'")
	_check(menu._action_buttons.has("new_game"), "_action_buttons has 'new_game'")
	_check(menu._action_buttons.has("close"), "_action_buttons has 'close'")

	# Sound label reflects the (unmuted) game preference.
	var sound_btn: Variant = menu._action_buttons.get("toggle_sound")
	_check(sound_btn != null and sound_btn.text == "Sound: On",
		"Sound button reads 'Sound: On' when not muted")

	# Pressing the Sound button fires `toggle_sound` (and does NOT flip the flag here —
	# Main owns that).
	var before_toggle := _toggle_count
	_check(_press(menu, "toggle_sound"), "pressed toggle_sound button")
	_check(_toggle_count == before_toggle + 1, "toggle_sound signal fired once")
	_check(game.audio_muted == false, "menu did NOT flip game.audio_muted (Main owns it)")

	# refresh_sound_label() reflects an externally-set mute (Main's job in production).
	game.audio_muted = true
	menu.refresh_sound_label()
	_check(sound_btn.text == "Sound: Off", "refresh_sound_label() shows 'Sound: Off' when muted")
	game.audio_muted = false
	menu.refresh_sound_label()
	_check(sound_btn.text == "Sound: On", "refresh_sound_label() shows 'Sound: On' when unmuted")

	# Pressing New Game fires `new_game`.
	var before_new := _newgame_count
	_check(_press(menu, "new_game"), "pressed new_game button")
	_check(_newgame_count == before_new + 1, "new_game signal fired once")

	# Pressing Close fires `closed` and hides the modal.
	var before_closed := _closed_count
	_check(_press(menu, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not menu.visible, "menu hidden after close")

	# ── 3. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	_check(main.has_method("_open_menu"), "Main has _open_menu()")
	_check(main.has_method("_on_toggle_sound"), "Main has _on_toggle_sound()")
	_check(main.has_method("_on_new_game"), "Main has _on_new_game()")
	_check(main._audio != null, "Main created its Audio service")

	# A fresh game starts unmuted, and the audio service mirrors it (applied in _ready).
	_check(main.game.audio_muted == false, "fresh Main game starts unmuted")
	_check(main._audio.muted == false, "Audio service starts unmuted to match the save")

	# Calling _on_toggle_sound() directly flips BOTH the persisted flag and the service.
	main._on_toggle_sound()
	_check(main.game.audio_muted == true, "_on_toggle_sound() flipped game.audio_muted → true")
	_check(main._audio.muted == true, "_on_toggle_sound() muted the Audio service")
	main._on_toggle_sound()
	_check(main.game.audio_muted == false, "_on_toggle_sound() flipped game.audio_muted → false")
	_check(main._audio.muted == false, "_on_toggle_sound() un-muted the Audio service")

	# The toggle persists: a fresh load_state reflects the last saved preference.
	main._on_toggle_sound()                      # → muted true, saved
	var reloaded: GameState = SaveManager.load_state()
	_check(reloaded.audio_muted == true, "_on_toggle_sound() persisted the mute to the save")
	SaveManager.clear()

	# Opening the menu lazily creates + wires it.
	main._open_menu()
	_check(main._menu_screen != null, "_open_menu() lazily created the MenuScreen")
	_check(main._menu_screen is MenuScreen, "_menu_screen is a MenuScreen")
	_check(main._menu_screen.visible, "menu is visible after _open_menu()")

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
