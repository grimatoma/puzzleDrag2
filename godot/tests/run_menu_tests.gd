extends SceneTree
## Headless tests for the M4f settings/menu modal (scenes/MenuScreen.gd + its wiring
## into scenes/Main.gd). Three layers:
##
##   1. GameState persistence — audio_muted / reduce_motion / text_size_index default,
##      round-trip through SaveManager.save → load_state, appear in to_dict(), and are
##      legacy-safe (an old save without the field loads at the default; an out-of-range
##      text_size_index clamps into Typography.TEXT_SCALES).
##   2. MenuScreen wiring — the modal builds, exposes its action buttons, and emitting
##      `pressed` on them fires the right intent signal (toggle_sound / toggle_motion /
##      cycle_text_size / closed). The screen emits signals; Main owns the state flips, so
##      the test verifies the buttons exist, the signals fire, and the screen does NOT
##      mutate game state itself.
##   3. Main integration — the real Main scene wires the menu handlers; calling
##      _on_toggle_sound() flips game.audio_muted AND mutes the Audio service, and
##      _on_cycle_text_size() advances+wraps text_size_index, sets Typography.scale, and
##      persists. A final invalidation guard proves _reapply_text_scale() frees AND nulls
##      every cached overlay screen so they rebuild at the new scale.
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
var _motion_toggle_count: int = 0
var _text_size_count: int = 0
var _newgame_count: int = 0
var _closed_count: int = 0
var _navigate_count: int = 0
var _navigate_last: String = ""

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

func _on_toggle_motion() -> void:
	_motion_toggle_count += 1

func _on_cycle_text_size() -> void:
	_text_size_count += 1

func _on_new_game() -> void:
	_newgame_count += 1

func _on_closed() -> void:
	_closed_count += 1

func _on_navigate(id: String) -> void:
	_navigate_count += 1
	_navigate_last = id

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

	# Reduce Motion preference: defaults false, serialized, round-trips, legacy-safe.
	var m0 := GameState.new()
	_check(m0.reduce_motion == false, "reduce_motion defaults to false (motion on)")
	_check(m0.to_dict().has("reduce_motion"), "to_dict() contains the reduce_motion key")
	m0.reduce_motion = true
	SaveManager.clear()
	SaveManager.save(m0)
	var m1: GameState = SaveManager.load_state()
	_check(m1.reduce_motion == true, "reduce_motion survives save → load_state (true)")
	SaveManager.clear()
	_check(legacy.reduce_motion == false, "from_dict() with no reduce_motion defaults to false")

	# Text Size preference: index defaults 0 (Normal), serialized, round-trips, legacy-safe,
	# and an out-of-range index from a hand-edited/foreign save clamps into TEXT_SCALES.
	var t0 := GameState.new()
	_check(t0.text_size_index == 0, "text_size_index defaults to 0 (Normal)")
	_check(t0.to_dict().has("text_size_index"), "to_dict() contains the text_size_index key")
	_check(int(t0.to_dict()["text_size_index"]) == 0, "to_dict() text_size_index == 0 by default")
	t0.text_size_index = 1
	SaveManager.clear()
	SaveManager.save(t0)
	var t1: GameState = SaveManager.load_state()
	_check(t1.text_size_index == 1, "text_size_index survives save → load_state (1)")
	SaveManager.clear()
	_check(legacy.text_size_index == 0, "from_dict() with no text_size_index defaults to 0 (legacy-safe)")
	# An out-of-range stored index clamps to the last valid TEXT_SCALES slot (not a crash/OOB).
	var t_oob: GameState = GameState.from_dict({"text_size_index": 99})
	_check(t_oob.text_size_index == Typography.TEXT_SCALES.size() - 1,
		"from_dict() clamps an out-of-range text_size_index to TEXT_SCALES.size()-1 (2)")

	# ── 2. MenuScreen wiring ──────────────────────────────────────────────────
	var game := GameState.new()
	var menu := MenuScreen.new()
	root.add_child(menu)
	menu.setup(game)
	await process_frame
	menu.open()
	menu.connect("sound_toggle_requested", Callable(self, "_on_toggle_sound"))
	menu.connect("motion_toggle_requested", Callable(self, "_on_toggle_motion"))
	menu.connect("text_size_cycle_requested", Callable(self, "_on_cycle_text_size"))
	menu.connect("new_game_requested", Callable(self, "_on_new_game"))
	menu.connect("closed", Callable(self, "_on_closed"))
	menu.connect("navigation_requested", Callable(self, "_on_navigate"))

	_check(menu.visible, "menu is visible after open()")
	_check(menu._action_buttons.has("toggle_sound"), "_action_buttons has 'toggle_sound'")
	_check(menu._action_buttons.has("new_game"), "_action_buttons has 'new_game'")
	_check(menu._action_buttons.has("close"), "_action_buttons has 'close'")

	# ── Settings submenu: a Fullscreen toggle + a Show Tutorial entry (review tasks 13/14) ──
	_check(menu._action_buttons.has("toggle_fullscreen"), "_action_buttons has 'toggle_fullscreen'")
	_check(menu._action_buttons.has("show_tutorial"), "_action_buttons has 'show_tutorial'")
	# The fullscreen button labels the windowed state on the headless (windowed) test path.
	var fs_btn: Variant = menu._action_buttons.get("toggle_fullscreen")
	_check(fs_btn != null and fs_btn.text == "Go Fullscreen",
		"Fullscreen button reads 'Go Fullscreen' while windowed")
	# Pressing Show Tutorial closes the menu + emits navigation_requested('tutorial') (Main
	# re-opens the tutorial via apply_deeplink — the replay path).
	var before_tut_nav := _navigate_count
	var before_tut_closed := _closed_count
	_check(_press(menu, "show_tutorial"), "pressed the 'show_tutorial' button")
	_check(_navigate_count == before_tut_nav + 1, "Show Tutorial fired navigate once")
	_check(_navigate_last == "tutorial", "Show Tutorial carried the 'tutorial' deep-link id")
	_check(_closed_count == before_tut_closed + 1, "Show Tutorial also closed the menu")
	menu.open()   # re-open for the remaining checks
	# SKIP "Game Wiki" — the standalone port ships no wiki screen (no fake dead link).
	_check(not menu._action_buttons.has("nav:wiki"), "menu does NOT add a (non-existent) Game Wiki entry")

	# ── "More" navigation section ──────────────────────────────────────────────
	# Every secondary screen that moved out of the old left-strip HUD into the menu has
	# a "nav:<id>" button. Spot-check a representative few, then prove pressing one
	# CLOSES the menu and emits navigation_requested(id) (Main routes that through apply_deeplink).
	for id in ["achievements", "chronicle", "castle", "decorations", "portal", "charter", "quests", "tiles", "daily", "debug"]:
		_check(menu._action_buttons.has("nav:" + id), "_action_buttons has 'nav:%s'" % id)
	# review-3 — the Town LEDGER ("Market & Town") is now a "More" entry: the 🔨 Craft bottom-nav
	# tab opens the crafting UI, so the ledger moved off the nav into the menu (+ a town-map button).
	_check(menu._action_buttons.has("nav:town"), "menu DOES surface the Town ledger ('nav:town')")
	# The bottom-nav primary tabs (townmap/inventory/craft/map/townsfolk) are NOT duplicated.
	_check(not menu._action_buttons.has("nav:inventory"), "menu does NOT duplicate the Inventory tab")
	# "Recipes" was dropped — it's the SAME screen the Craft nav tab now opens (no menu dupe).
	_check(not menu._action_buttons.has("nav:recipes"), "menu does NOT duplicate the crafting screen ('nav:recipes' dropped)")

	var before_nav := _navigate_count
	var before_nav_closed := _closed_count
	_check(_press(menu, "nav:chronicle"), "pressed the 'nav:chronicle' More button")
	_check(_navigate_count == before_nav + 1, "navigate signal fired once")
	_check(_navigate_last == "chronicle", "navigate carried the 'chronicle' deep-link id")
	_check(_closed_count == before_nav_closed + 1, "pressing a More button also closed the menu")
	_check(not menu.visible, "menu hidden after a More button is pressed")
	# Re-open the menu for the remaining (toggle/new-game/close) checks below.
	menu.open()

	# Sound label reflects the (unmuted) game preference.
	var sound_btn: Variant = menu._action_buttons.get("toggle_sound")
	_check(sound_btn != null and sound_btn.text == "Sound: On",
		"Sound button reads 'Sound: On' when not muted")

	# Reduce Motion toggle: registered, labelled from the (motion-on) preference, and
	# pressing it fires `motion_toggle_requested` without flipping the flag here (Main owns that).
	_check(menu._action_buttons.has("toggle_motion"), "_action_buttons has 'toggle_motion'")
	var motion_btn: Variant = menu._action_buttons.get("toggle_motion")
	_check(motion_btn != null and motion_btn.text == "Reduce Motion: Off",
		"Reduce Motion button reads 'Off' when motion is on")
	var before_motion := _motion_toggle_count
	_check(_press(menu, "toggle_motion"), "pressed the 'toggle_motion' button")
	_check(_motion_toggle_count == before_motion + 1, "motion_toggle_requested fired once")
	_check(game.reduce_motion == false, "MenuScreen did NOT flip reduce_motion itself (Main owns it)")
	# Label re-syncs from the flag (the Main callback path).
	game.reduce_motion = true
	menu.refresh_motion_label()
	_check(motion_btn.text == "Reduce Motion: On", "refresh_motion_label() reads 'On' when reduced")
	game.reduce_motion = false
	menu.refresh_motion_label()

	# Text Size cycle: registered, labelled "Normal" at index 0, and pressing it fires
	# `text_size_cycle_requested` WITHOUT changing the index here (Main owns the flip).
	_check(menu._action_buttons.has("cycle_text_size"), "_action_buttons has 'cycle_text_size'")
	var text_size_btn: Variant = menu._action_buttons.get("cycle_text_size")
	_check(text_size_btn != null and text_size_btn.text == "Text Size: Normal",
		"Text Size button reads 'Text Size: Normal' at index 0")
	var before_text_size := _text_size_count
	_check(_press(menu, "cycle_text_size"), "pressed the 'cycle_text_size' button")
	_check(_text_size_count == before_text_size + 1, "text_size_cycle_requested fired once")
	_check(game.text_size_index == 0, "MenuScreen did NOT change text_size_index itself (Main owns it)")
	# Label re-syncs from an externally-set index (the Main callback path).
	game.text_size_index = 1
	menu.refresh_text_size_label()
	_check(text_size_btn.text == "Text Size: Large", "refresh_text_size_label() reads 'Large' at index 1")
	game.text_size_index = 0
	menu.refresh_text_size_label()

	# Pressing the Sound button fires `sound_toggle_requested` (and does NOT flip the flag here —
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

	# Pressing New Game fires `new_game_requested`.
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

	# ── Regression guard: the floating ⚙ menu button exists AND opens the menu ──
	# The Main→Hud extraction once dropped this button (its top-bar space stayed
	# reserved, but its creation was lost), leaving the board with no visible way to
	# open the menu. Assert the node is present and that pressing it routes
	# menu_requested → Main._open_menu.
	var menu_button := main.find_child("MenuButton", true, false)
	_check(menu_button != null, "HUD has the floating ⚙ MenuButton")
	_check(menu_button is Button and menu_button.text == "⚙", "MenuButton is a ⚙ Button")
	if main._menu_screen != null:
		main._menu_screen.visible = false
	if menu_button != null:
		menu_button.emit_signal("pressed")
		await process_frame
		_check(main._menu_screen != null and main._menu_screen.visible,
			"pressing the ⚙ button opened the MenuScreen (menu_requested → _open_menu)")
		main._menu_screen.visible = false

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

	# Pressing a "More" nav button routes through Main: the menu closes + emits navigate,
	# and Main opens the matching secondary screen via apply_deeplink (the SAME path the
	# old left-strip HUD buttons used). Spot-check the Chronicle entry end-to-end.
	main._menu_screen._action_buttons["nav:chronicle"].emit_signal("pressed")
	await process_frame
	_check(not main._menu_screen.visible, "menu closed after pressing a More nav button")
	_check(main._chronicle_screen != null and main._chronicle_screen.visible,
		"pressing 'nav:chronicle' opened the Chronicle screen via apply_deeplink")
	_check(main._router.current_modal() == ViewRouter.Modal.CHRONICLE,
		"_router.current_modal() == CHRONICLE after the More-nav deeplink")
	SaveManager.clear()

	# ── Text Size: Main owns the cycle (mirrors the _on_toggle_sound integration above) ──
	# Calling _on_cycle_text_size() directly advances the persisted index (with wrap),
	# sets the global Typography.scale to the matching multiplier, and persists each change.
	_check(main.has_method("_on_cycle_text_size"), "Main has _on_cycle_text_size()")
	_check(main.game.text_size_index == 0, "fresh Main game starts at text_size_index 0")
	main._on_cycle_text_size()
	_check(main.game.text_size_index == 1, "_on_cycle_text_size() advanced index 0 → 1")
	_check(Typography.scale == Typography.TEXT_SCALES[1], "Typography.scale == TEXT_SCALES[1] after first cycle")
	var after_1: GameState = SaveManager.load_state()
	_check(after_1.text_size_index == 1, "_on_cycle_text_size() persisted index 1 to the save")
	main._on_cycle_text_size()
	_check(main.game.text_size_index == 2, "_on_cycle_text_size() advanced index 1 → 2")
	_check(Typography.scale == Typography.TEXT_SCALES[2], "Typography.scale == TEXT_SCALES[2] after second cycle")
	main._on_cycle_text_size()
	_check(main.game.text_size_index == 0, "_on_cycle_text_size() wrapped index 2 → 0")
	_check(Typography.scale == Typography.TEXT_SCALES[0], "Typography.scale == TEXT_SCALES[0] after wrap")
	var after_wrap: GameState = SaveManager.load_state()
	_check(after_wrap.text_size_index == 0, "_on_cycle_text_size() persisted the wrapped index 0")
	SaveManager.clear()

	# ── Invalidation guard (review Issue 2): _reapply_text_scale frees + NULLs cached overlays ──
	# Lazily open a few cached secondary screens so their member vars are non-null, then prove
	# _reapply_text_scale() invalidated (freed AND nulled) every one so they rebuild fresh at the
	# new scale. Guards against a "freed-but-not-nulled" regression if a screen is added later.
	main._open_inventory()
	main._open_chronicle()
	main._open_achievements()
	await process_frame
	_check(main._inventory_screen != null, "inventory screen is non-null after _open_inventory()")
	_check(main._chronicle_screen != null, "chronicle screen is non-null after _open_chronicle()")
	_check(main._achievements_screen != null, "achievements screen is non-null after _open_achievements()")
	main._reapply_text_scale()
	_check(main._inventory_screen == null, "_reapply_text_scale() nulled _inventory_screen (invalidated)")
	_check(main._chronicle_screen == null, "_reapply_text_scale() nulled _chronicle_screen (invalidated)")
	_check(main._achievements_screen == null, "_reapply_text_scale() nulled _achievements_screen (invalidated)")
	_check(main._hud != null, "_reapply_text_scale() left a live HUD (rebuilt, not dead)")
	SaveManager.clear()

	# Hygiene: this suite mutated the global Typography.scale via _on_cycle_text_size — reset it
	# to the Normal default so the static var doesn't leak into any later-loaded suite.
	Typography.scale = 1.0

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
