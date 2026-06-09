extends SceneTree
## Headless tests for the M10 Achievements VIEW (scenes/AchievementsScreen.gd + its
## wiring into scenes/Main.gd + the ViewRouter.ACHIEVEMENTS modal). The achievements
## LOGIC (counters / unlocks / rewards) is covered by run_achievements_tests.gd; this
## suite covers the trophy SCREEN over that logic. Four layers:
##
##   1. AchievementsScreen pure helpers — total_count() == AchievementConfig.all().size(),
##      unlocked_count() counts the unlocked set, is_unlocked(id), row_progress(entry)
##      delegates to GameState.achievement_progress (quantity + distinct counters).
##   2. AchievementsScreen rendering — setup() builds the shell, refresh() renders one
##      row per catalog entry (tracked in `_rows`), the header reads "N / total unlocked",
##      an unlocked achievement's row is present while a zero-progress one renders locked.
##   3. ViewRouter — the new ACHIEVEMENTS modal: resolve("achievements")/("trophies"),
##      modal_id round-trip, known_ids() completeness (pure-state assertions live here).
##   4. Main integration — _open_achievements() lazily creates + reuses the screen and
##      sets the router modal; apply_deeplink("achievements") shows it; ("board") closes it.
##
## Same dependency-free harness as run_inventory_tests.gd / run_router_tests.gd.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_achievements_view_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const AchievementsScreenScript := preload("res://scenes/AchievementsScreen.gd")

var _checks: int = 0
var _failures: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_closed() -> void:
	_closed_count += 1

## Press the action button registered under `key`. Returns true if it existed.
func _press(screen, key: String) -> bool:
	var btn: Variant = screen._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Achievements VIEW (M10) tests ──────────────────")

	# ── 1 + 2. AchievementsScreen helpers + rendering ─────────────────────────
	# A GameState with first_steps unlocked (1 chain) + some category progress so a
	# couple of rows read unlocked/mid-progress, while most stay locked at 0.
	var game := GameState.new()
	# Earn first_steps (1 committed chain) + trusted_friend would need 5 orders; instead
	# directly drive a couple counters via the wired bump path so the screen reads real
	# unlocked + partial state.
	game.bump_counter("chains_committed")            # first_steps unlocks (threshold 1)
	game.bump_counter("veg_chained", 30)             # veg_patron (threshold 50) → 30/50 partial

	var screen = AchievementsScreenScript.new()
	root.add_child(screen)
	screen.setup(game)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "achievements screen is visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")

	# total_count() == the catalog size; one row rendered per catalog entry.
	var catalog_size: int = AchievementConfig.all().size()
	_check(screen.total_count() == catalog_size,
		"total_count() == AchievementConfig.all().size() (%d)" % catalog_size)
	_check(screen._rows.size() == catalog_size,
		"one rendered row per catalog entry (_rows.size() == %d)" % catalog_size)
	# Every catalog id has a row.
	var all_have_rows := true
	for entry in AchievementConfig.all():
		if not screen._rows.has(String((entry as Dictionary).get("id", ""))):
			all_have_rows = false
	_check(all_have_rows, "every catalog id has a rendered row in _rows")

	# unlocked_count() / is_unlocked — first_steps unlocked, veg_patron + tireless locked.
	_check(screen.is_unlocked("first_steps"), "is_unlocked('first_steps') == true (1 chain)")
	_check(not screen.is_unlocked("tireless"), "is_unlocked('tireless') == false (0 progress)")
	_check(not screen.is_unlocked("veg_patron"), "is_unlocked('veg_patron') == false (30/50)")
	_check(screen.unlocked_count() == 1, "unlocked_count() == 1 (only first_steps)")

	# row_progress delegates to GameState.achievement_progress (quantity counters).
	var fs_entry: Dictionary = AchievementConfig.get_achievement("first_steps")
	var veg_entry: Dictionary = AchievementConfig.get_achievement("veg_patron")
	var tir_entry: Dictionary = AchievementConfig.get_achievement("tireless")
	var mm_entry: Dictionary = AchievementConfig.get_achievement("mine_master")
	# first_steps + tireless share the chains_committed counter (= 1 after one bump).
	_check(screen.row_progress(fs_entry) == 1, "row_progress(first_steps) == 1")
	_check(screen.row_progress(tir_entry) == 1, "row_progress(tireless) == 1 (shares chains_committed)")
	_check(screen.row_progress(veg_entry) == 30, "row_progress(veg_patron) == 30 (partial)")
	# mine_chained was never bumped → its trophy reads 0 progress.
	_check(screen.row_progress(mm_entry) == 0, "row_progress(mine_master) == 0 (untouched counter)")

	# Header reads "N / total unlocked".
	_check(screen._header_label.text == "1 / %d unlocked" % catalog_size,
		"header reads '1 / %d unlocked'" % catalog_size)

	# A distinct counter: achievement_progress reports the distinct-key count.
	game.bump_counter("distinct_resources_chained", 1, "flour")
	game.bump_counter("distinct_resources_chained", 1, "eggs")
	game.bump_counter("distinct_resources_chained", 1, "flour")   # repeat — no bump
	var nat_entry: Dictionary = AchievementConfig.get_achievement("naturalist")
	_check(screen.row_progress(nat_entry) == 2,
		"row_progress(naturalist) == 2 distinct (delegates to achievement_progress)")

	# ── Tabs + Collection (Trophies | Collection segmented toggle) ─────────────
	_check(screen._tab_buttons.has("trophies") and screen._tab_buttons.has("collection"),
		"_tab_buttons has both 'trophies' and 'collection'")
	_check(screen._tab == "trophies", "default tab is 'trophies'")

	# GameState.distinct_seen exposes the chained-resource set the codex lights up.
	var seen: Dictionary = game.distinct_seen("distinct_resources_chained")
	_check(seen.has("flour") and seen.has("eggs"),
		"distinct_seen('distinct_resources_chained') == {flour, eggs}")
	_check(game.distinct_seen("nonexistent_counter").is_empty(),
		"distinct_seen(unknown counter) is empty")

	# The collection roster is non-empty and discovered_count counts only chained
	# resources within it (flour is a farm-roster resource → at least 1 discovered).
	_check(screen.collection_total() > 0, "collection_total() > 0 (roster has resources)")
	_check(screen.discovered_count() >= 1 and screen.discovered_count() <= screen.collection_total(),
		"discovered_count() in [1, total] (flour chained)")

	# Switching to the Collection tab re-renders: _tab flips, the count line reads
	# "N / M discovered", and switching back restores the trophy rows.
	screen._on_tab("collection")
	_check(screen._tab == "collection", "_on_tab('collection') sets _tab")
	_check(screen._header_label.text == "%d / %d discovered" % [screen.discovered_count(), screen.collection_total()],
		"collection header reads 'N / M discovered'")
	screen._on_tab("trophies")
	_check(screen._tab == "trophies", "_on_tab('trophies') restores trophies tab")
	_check(screen._rows.size() == catalog_size, "trophy rows re-rendered after returning to trophies tab")

	# Pressing Close fires `closed` and hides the modal.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "achievements hidden after close")

	# A fresh, zero-progress GameState renders every row locked + a "0 / N" header.
	var fresh_game := GameState.new()
	var fresh_screen = AchievementsScreenScript.new()
	root.add_child(fresh_screen)
	fresh_screen.setup(fresh_game)
	await process_frame
	fresh_screen.open()
	_check(fresh_screen.unlocked_count() == 0, "fresh game: unlocked_count() == 0")
	_check(fresh_screen._header_label.text == "0 / %d unlocked" % catalog_size,
		"fresh game header reads '0 / %d unlocked'" % catalog_size)
	_check(fresh_screen._rows.size() == catalog_size, "fresh game still renders all rows")
	_check(not fresh_screen.is_unlocked("first_steps"), "fresh game: first_steps locked")

	# ── 3. ViewRouter — the new ACHIEVEMENTS modal (pure-state assertions) ─────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.ACHIEVEMENTS)
	_check(r.current_modal() == ViewRouter.Modal.ACHIEVEMENTS,
		"current_modal() == ACHIEVEMENTS after open_modal")
	_check(r.is_open(ViewRouter.Modal.ACHIEVEMENTS), "is_open(ACHIEVEMENTS) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_ach := ViewRouter.resolve("achievements")
	_check(bool(d_ach.get("ok", false)), "resolve('achievements') ok")
	_check(int(d_ach.get("modal", -1)) == ViewRouter.Modal.ACHIEVEMENTS,
		"resolve('achievements') modal == ACHIEVEMENTS")
	_check(int(d_ach.get("view", -1)) == ViewRouter.View.BOARD,
		"resolve('achievements') view == BOARD")
	var d_tro := ViewRouter.resolve("trophies")
	_check(bool(d_tro.get("ok", false)), "resolve('trophies') ok (alias)")
	_check(int(d_tro.get("modal", -1)) == ViewRouter.Modal.ACHIEVEMENTS,
		"resolve('trophies') modal == ACHIEVEMENTS")
	_check(ViewRouter.modal_id(ViewRouter.Modal.ACHIEVEMENTS) == "achievements",
		"modal_id(ACHIEVEMENTS) == 'achievements'")
	var ids := ViewRouter.known_ids()
	_check(ids.has("achievements"), "known_ids() contains 'achievements'")
	_check(ids.has("trophies"), "known_ids() contains 'trophies'")

	# ── 4. Main integration ───────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's close-via-
	# board idiom hides the overlay + resets the router instead of redirecting to the town home.
	main.game.farm_run_active = true

	_check(main.has_method("_open_achievements"), "Main has _open_achievements()")
	_check(main.has_method("_on_achievements_closed"), "Main has _on_achievements_closed()")
	_check(main._achievements_screen == null, "achievements screen lazily created (null before open)")

	# Opening lazily creates + shows the screen + sets the router modal.
	main._open_achievements()
	_check(main._achievements_screen != null, "_open_achievements() lazily created the screen")
	_check(main._achievements_screen.visible, "achievements visible after _open_achievements()")
	_check(main._router.current_modal() == ViewRouter.Modal.ACHIEVEMENTS,
		"_router.current_modal() == ACHIEVEMENTS after _open_achievements()")
	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._achievements_screen
	main._open_achievements()
	_check(main._achievements_screen == first_ref, "_open_achievements() reuses the one screen")

	# apply_deeplink("achievements") shows it + sets the router modal.
	main.apply_deeplink("board")                 # close first to start from a clean modal state
	var ok_ach: bool = main.apply_deeplink("achievements")
	_check(ok_ach, "apply_deeplink('achievements') returns true")
	_check(main._achievements_screen != null and main._achievements_screen.visible,
		"apply_deeplink('achievements') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.ACHIEVEMENTS,
		"_router.current_modal() == ACHIEVEMENTS after apply_deeplink('achievements')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._achievements_screen.visible, "achievements hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
