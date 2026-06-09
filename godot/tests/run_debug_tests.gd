extends SceneTree
## Headless tests for the developer DEBUG overlay (M-infra):
##   DebugModal.readout_lines — PURE readout reads the seeded GameState values correctly
##   DebugModal.grant_specs   — each quick-grant maps to a REAL GameState/SaveManager method
##   DebugModal.jump_targets  — one deduped button per DISTINCT deep-link modal
##   DebugModal build/shell   — builds without error; readout labels + jump/grant/close buttons
##   DebugModal.apply_grant   — a grant mutates state (+500 coins, +5 runes, +100 influence, …)
##   ViewRouter               — DEBUG modal resolve/modal_id/known_ids round-trip
##   Main integration         — apply_deeplink("debug") opens it; "board" closes it; deep-link-only
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_debug_tests.gd
## Exits 0 when every check passes, 1 on any failure.

const DebugModalScript := preload("res://scenes/DebugModal.gd")

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
func _press(modal, key: String) -> bool:
	var btn: Variant = modal._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

## Find a readout line that starts with `prefix` (e.g. "Coins:"). "" if none.
func _line_with(lines: PackedStringArray, prefix: String) -> String:
	for l in lines:
		if String(l).begins_with(prefix):
			return String(l)
	return ""

func _initialize() -> void:
	print("\n── Developer DEBUG overlay tests ───────────────────")

	# ── 1. readout_lines — PURE, reads REAL seeded GameState ──────────────────
	var game := GameState.new()
	game.coins = 1234
	game.runes = 7
	game.influence = 42
	game.turn = 3
	game.inventory = {"wheat": 5, "flour": 2, "empty": 0}   # 2 with count > 0
	game.quests = [{"id": "a"}, {"id": "b"}, {"id": "c"}]    # 3 rolled
	game.almanac_level = 4
	game.daily_streak_day = 9
	game.active_biome = "mine"
	game.town2_complete = true

	var lines: PackedStringArray = DebugModalScript.readout_lines(game)
	_check(lines.size() >= 11, "readout_lines has >= 11 lines (got %d)" % lines.size())
	_check(_line_with(lines, "Coins:") == "Coins: 1234", "readout Coins line correct")
	_check(_line_with(lines, "Runes:") == "Runes: 7", "readout Runes line correct")
	_check(_line_with(lines, "Influence:") == "Influence: 42", "readout Influence line correct")
	_check(_line_with(lines, "Turn:") == "Turn: 3", "readout Turn line correct")
	_check(_line_with(lines, "Inventory items:") == "Inventory items: 2",
		"readout Inventory items counts only count>0 entries")
	_check(_line_with(lines, "Quests rolled:") == "Quests rolled: 3", "readout Quests rolled correct")
	_check(_line_with(lines, "Almanac level:") == "Almanac level: 4", "readout Almanac level correct")
	_check(_line_with(lines, "Daily streak day:") == "Daily streak day: 9",
		"readout Daily streak day correct")
	_check(_line_with(lines, "Active biome:") == "Active biome: mine", "readout Active biome correct")
	_check(_line_with(lines, "Town 2 complete:") == "Town 2 complete: yes",
		"readout Town 2 complete reflects flag")
	# Tier line includes the TownConfig-resolved name.
	var tier_line := _line_with(lines, "Tier:")
	_check(tier_line.contains(TownConfig.tier_name(game.settlement.tier)),
		"readout Tier line includes TownConfig tier name")

	# null game yields a graceful placeholder (no crash).
	var null_lines: PackedStringArray = DebugModalScript.readout_lines(null)
	_check(null_lines.size() == 1 and String(null_lines[0]) == "(no game)",
		"readout_lines(null) -> ['(no game)']")

	# ── 2. grant_specs — every listed method REALLY exists ────────────────────
	var specs: Array = DebugModalScript.grant_specs()
	_check(specs.size() >= 6, "grant_specs has >= 6 entries (got %d)" % specs.size())
	var spec_methods_ok := true
	var spec_ids: Array = []
	for spec in specs:
		spec_ids.append(String(spec.get("id", "")))
		var method: String = String(spec.get("method", ""))
		if method == "":
			continue   # direct field write — no backing method to assert
		var target: String = String(spec.get("target", ""))
		if target == "game":
			if not game.has_method(method):
				spec_methods_ok = false
				print("    (missing GameState.%s)" % method)
		elif target == "save":
			# SaveManager is a class_name; assert the (static) method is reachable via has_method
			# on a fresh instance (has_method also finds static methods in Godot 4).
			if not SaveManager.new().has_method(method):
				spec_methods_ok = false
				print("    (missing SaveManager.%s)" % method)
	_check(spec_methods_ok, "every grant_specs() method exists on its target (GameState/SaveManager)")
	_check(spec_ids.has("coins500"), "grant_specs has 'coins500'")
	_check(spec_ids.has("runes5"), "grant_specs has 'runes5'")
	_check(spec_ids.has("influence100"), "grant_specs has 'influence100'")
	_check(spec_ids.has("tierup"), "grant_specs has 'tierup'")
	_check(spec_ids.has("rollquests"), "grant_specs has 'rollquests'")
	_check(spec_ids.has("clearsave"), "grant_specs has 'clearsave'")
	# Bulk QA grants ported from the React debug modal.
	_check(spec_ids.has("maxtier"), "grant_specs has 'maxtier'")
	_check(spec_ids.has("fillitems"), "grant_specs has 'fillitems'")
	_check(spec_ids.has("filltools"), "grant_specs has 'filltools'")
	_check(spec_ids.has("buildall"), "grant_specs has 'buildall'")
	# The specific REAL methods.
	_check(game.has_method("try_tier_up"), "GameState.try_tier_up exists (Tier up)")
	_check(game.has_method("reroll_quests"), "GameState.reroll_quests exists (Roll quests)")
	_check(game.has_method("grant_tool"), "GameState.grant_tool exists (+100 each tool)")
	_check(game.has_method("build"), "GameState.build exists (Build all)")
	_check(SaveManager.new().has_method("clear"), "SaveManager.clear exists (Clear save)")

	# all_resource_keys — PURE, derived from live config, deduped, no hazard/coin blanks.
	var res_keys: PackedStringArray = DebugModalScript.all_resource_keys()
	_check(res_keys.size() >= 10, "all_resource_keys has >= 10 keys (got %d)" % res_keys.size())
	_check(res_keys.has("hay_bundle"), "all_resource_keys includes farm staple 'hay_bundle'")
	_check(res_keys.has("block"), "all_resource_keys includes mine good 'block'")
	_check(res_keys.has("bread"), "all_resource_keys includes recipe output 'bread'")
	_check(res_keys.has("supplies"), "all_resource_keys includes recipe output 'supplies'")
	_check(not res_keys.has(""), "all_resource_keys drops the empty hazard/coin entries")

	# ── 3. jump_targets — deduped, one per DISTINCT modal, no 'debug' ─────────
	var jumps: PackedStringArray = DebugModalScript.jump_targets()
	_check(jumps.size() >= 15, "jump_targets has >= 15 deduped entries (got %d)" % jumps.size())
	_check(jumps.has("board"), "jump_targets includes 'board' (empty id normalised)")
	_check(jumps.has("town"), "jump_targets includes 'town'")
	_check(not jumps.has("debug"), "jump_targets EXCLUDES 'debug' (no self-jump)")
	# Aliases collapse: only ONE of {inventory, items}, {cartography, world}, {map, townmap}.
	_check(jumps.has("inventory") and not jumps.has("items"),
		"jump_targets keeps 'inventory', drops alias 'items'")
	_check(jumps.has("cartography") and not jumps.has("world"),
		"jump_targets keeps 'cartography', drops alias 'world'")
	# Every jump target resolves to a distinct modal.
	var seen_modals: Dictionary = {}
	var all_distinct := true
	for id in jumps:
		var lookup := "" if id == "board" else id
		var modal := int(ViewRouter.resolve(lookup).get("modal", -1))
		if seen_modals.has(modal):
			all_distinct = false
		seen_modals[modal] = true
	_check(all_distinct, "every jump_targets entry maps to a DISTINCT modal")

	# ── 4. DebugModal — builds without error; readout + buttons present ───────
	var modal = DebugModalScript.new()
	root.add_child(modal)
	modal.setup(game)
	modal.connect("closed", Callable(self, "_on_closed"))
	await process_frame

	_check(not modal.visible, "modal hidden before open()")
	modal.open()
	await process_frame
	_check(modal.visible, "modal visible after open()")

	# Readout labels rendered, one per readout line, text matches readout_lines(game).
	_check(modal._readout_labels.size() == lines.size(),
		"readout label count == readout_lines count")
	var first_label_ok := false
	if modal._readout_labels.size() > 0:
		first_label_ok = (modal._readout_labels[0] as Label).text == lines[0]
	_check(first_label_ok, "first readout label text matches readout_lines[0]")

	# One jump button per jump target, registered under "jump:<id>".
	var jump_btn_count := 0
	for key in modal._action_buttons:
		if String(key).begins_with("jump:"):
			jump_btn_count += 1
	_check(jump_btn_count == jumps.size(),
		"one 'jump:<id>' button per jump target (%d)" % jumps.size())
	_check(modal._action_buttons.has("jump:town"), "_action_buttons has 'jump:town'")

	# One grant button per grant spec, registered under "grant:<id>".
	var grant_btn_count := 0
	for key in modal._action_buttons:
		if String(key).begins_with("grant:"):
			grant_btn_count += 1
	_check(grant_btn_count == specs.size(),
		"one 'grant:<id>' button per grant spec (%d)" % specs.size())
	_check(modal._action_buttons.has("close"), "_action_buttons has 'close'")

	# ── 5. apply_grant — a grant mutates state as expected ───────────────────
	var coins_before := game.coins
	var grant_res: Dictionary = modal.apply_grant("coins500")
	_check(game.coins == coins_before + 500, "apply_grant('coins500') adds 500 coins")
	_check(typeof(grant_res) == TYPE_DICTIONARY, "apply_grant returns a Dictionary")

	var runes_before := game.runes
	modal.apply_grant("runes5")
	_check(game.runes == runes_before + 5, "apply_grant('runes5') adds 5 runes")

	var infl_before := game.influence
	modal.apply_grant("influence100")
	_check(game.influence == infl_before + 100, "apply_grant('influence100') adds 100 influence")

	# Roll quests re-rolls the board (quest_day bumps; quests refreshed).
	var qday_before := game.quest_day
	modal.apply_grant("rollquests")
	_check(game.quest_day == qday_before + 1, "apply_grant('rollquests') bumps quest_day")

	# ── Bulk QA grants ────────────────────────────────────────────────────────
	# Max tier jumps the settlement straight to City.
	modal.apply_grant("maxtier")
	_check(game.settlement.tier == TownConfig.TIER_CITY, "apply_grant('maxtier') -> City tier")
	_check(game.settlement.is_max_tier(), "apply_grant('maxtier') leaves the settlement maxed")

	# +100 each item tops every resource toward the cap. hay_bundle starts at 0 here, so it
	# lands at min(100, cap); at City the cap is well above 100, so it should read exactly 100.
	modal.apply_grant("fillitems")
	var hay := int(game.inventory.get("hay_bundle", 0))
	_check(hay >= 100, "apply_grant('fillitems') grants hay_bundle >= 100 (got %d)" % hay)
	var bread_qty := int(game.inventory.get("bread", 0))
	_check(bread_qty >= 100, "apply_grant('fillitems') grants recipe-output bread >= 100 (got %d)" % bread_qty)

	# +100 each tool grants 100 charges of every ToolConfig tool.
	modal.apply_grant("filltools")
	var all_tools_100 := true
	for tid in ToolConfig.TOOL_IDS:
		if game.tool_count(tid) < 100:
			all_tools_100 = false
	_check(all_tools_100, "apply_grant('filltools') grants >= 100 of every ToolConfig tool")

	# Build all force-places every BuildingConfig id (bypassing tier/plot/cost/rats gates).
	var build_res: Dictionary = modal.apply_grant("buildall")
	var all_built := true
	for bid in BuildingConfig.ALL_BUILD_IDS:
		if not game.has_building(bid):
			all_built = false
	_check(all_built, "apply_grant('buildall') places every BuildingConfig id")
	_check(int(build_res.get("buildings", 0)) >= BuildingConfig.ALL_BUILD_IDS.size(),
		"apply_grant('buildall') reports the full building count")
	# Idempotent: a second Build all does not duplicate any building.
	var count_after_first := game.buildings.size()
	modal.apply_grant("buildall")
	_check(game.buildings.size() == count_after_first, "apply_grant('buildall') is idempotent (no dupes)")

	# Readout re-renders after a grant (the coin label reflects the new total).
	var coin_label_text := (modal._readout_labels[0] as Label).text
	_check(coin_label_text == "Coins: %d" % game.coins,
		"readout coin label refreshed after grants")

	# Pressing the registered grant button fires apply_grant too.
	var coins_pre_btn := game.coins
	_check(_press(modal, "grant:coins500"), "pressed 'grant:coins500' button")
	_check(game.coins == coins_pre_btn + 500, "grant button press adds 500 coins")

	# Close button emits `closed`.
	var clo_before := _closed_count
	_check(_press(modal, "close"), "pressed 'close' button")
	_check(_closed_count == clo_before + 1, "closed signal fired once on close")
	_check(not modal.visible, "modal hidden after close")

	# ── 6. ViewRouter — DEBUG modal round-trip ───────────────────────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.DEBUG)
	_check(r.current_modal() == ViewRouter.Modal.DEBUG, "current_modal() == DEBUG after open_modal")
	_check(r.is_open(ViewRouter.Modal.DEBUG), "is_open(DEBUG) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_dbg := ViewRouter.resolve("debug")
	_check(bool(d_dbg.get("ok", false)), "resolve('debug') ok")
	_check(int(d_dbg.get("modal", -1)) == ViewRouter.Modal.DEBUG, "resolve('debug') modal == DEBUG")
	_check(int(d_dbg.get("view", -1)) == ViewRouter.View.BOARD, "resolve('debug') view == BOARD")
	_check(ViewRouter.modal_id(ViewRouter.Modal.DEBUG) == "debug", "modal_id(DEBUG) == 'debug'")
	_check(ViewRouter.known_ids().has("debug"), "known_ids() contains 'debug'")

	# ── 7. Main integration — deep-link-only open/close ──────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's close-via-
	# board idiom hides the overlay + resets the router instead of redirecting to the town home.
	main.game.farm_run_active = true
	# Dismiss any auto-shown tutorial/story so it doesn't interfere.
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	if main._story_modal != null:
		main._story_modal.visible = false

	_check(main.has_method("_open_debug"), "Main has _open_debug()")
	_check(main.has_method("_on_debug_closed"), "Main has _on_debug_closed()")
	# No permanent HUD button — debug starts un-created (deep-link-only).
	_check(main._debug_modal == null, "debug modal NOT created on load (no HUD button)")

	var ok_dbg: bool = main.apply_deeplink("debug")
	_check(ok_dbg, "apply_deeplink('debug') returns true")
	_check(main._debug_modal != null and main._debug_modal.visible,
		"apply_deeplink('debug') lazily creates + shows the modal")
	_check(main._router.current_modal() == ViewRouter.Modal.DEBUG,
		"_router.current_modal() == DEBUG after apply_deeplink('debug')")
	# The modal got the Main back-reference (jump grid + HUD refresh path wired).
	_check(main._debug_modal.main == main, "debug modal holds the Main back-reference")

	# A grant through the live modal mutates the real game + refreshes the HUD without error.
	var live_coins: int = main.game.coins
	main._debug_modal.apply_grant("coins500")
	_check(main.game.coins == live_coins + 500, "live grant adds 500 coins to Main's game")

	# A jump button routes through Main.apply_deeplink — pressing 'jump:town' opens Town.
	_press(main._debug_modal, "jump:town")
	await process_frame
	_check(main._router.current_modal() == ViewRouter.Modal.TOWN,
		"pressing 'jump:town' routes through apply_deeplink -> TOWN modal")
	# Return to board so the jumped-to Town surface is closed before re-testing debug.
	main.apply_deeplink("board")
	await process_frame

	# apply_deeplink("debug") again re-opens it (router back to DEBUG).
	main.apply_deeplink("debug")
	_check(main._router.current_modal() == ViewRouter.Modal.DEBUG,
		"apply_deeplink('debug') re-opens after a jump")
	_check(main._debug_modal != null and main._debug_modal.visible,
		"debug modal visible again after re-open")

	# apply_deeplink("board") closes it; modal hides + router resets to NONE.
	main.apply_deeplink("board")
	_check(main._debug_modal == null or not main._debug_modal.visible,
		"debug modal hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
