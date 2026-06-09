extends SceneTree
## Headless tests for Batch 9 — "scene copy / reason→message tables" config migration.
##
## This batch moved a few drift-prone copy tables + constants OUT of the view scripts and INTO
## their owning configs (byte-identical), and fixed four hardcoded-string BUGS. This suite is the
## guard that the moved copy is byte-identical to the original and that the bug literals are gone.
##
## COVERED:
##   B — Constants.STARTER_TOOLS (scythe×2 / bomb×1 / rake×1, in that order)
##   C5 — CartographyConfig.travel_verb / .block_label (moved from CartographyScreen)
##   C6 — BuildingConfig.build_hint (moved from Main) + Constants.start_farm_fail_text (moved from Main)
##   D7 — Constants.MAX_FARM_SLOTS (== StartFarmingModal.MAX_SLOTS == 8)
##   D8 — TutorialConfig.TUTORIAL_NPC (== "wren")
##   D9 — Constants.HARVEST_TALLY_MAX (== 8)
##   A3 — BossConfig.MINE_MASTERY_THRESHOLD interpolates (== 12, the old literal)
##   A4 — Constants.MIN_CHAIN is the base "Drag N+" value (== 3) + boss can raise it (storm → 4)
##
## Same dependency-free harness as the other tests/run_*.gd. `class_name` globals are referenced
## directly. Run from the godot/ project root:
##   godot --headless --script res://tests/run_scene_copy_config_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── Batch 9 scene-copy / config-migration tests ────")
	_test_starter_tools()
	_test_travel_verb()
	_test_block_label()
	_test_build_hint()
	_test_start_farm_fail_text()
	_test_renamed_constants()
	_test_bugfix_thresholds()
	_test_view_delegates_match_config()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── B: Constants.STARTER_TOOLS ───────────────────────────────────────────────

func _test_starter_tools() -> void:
	var st: Array = Constants.STARTER_TOOLS
	_check(st.size() == 3, "STARTER_TOOLS has 3 rows (got %d)" % st.size())
	# Exact tools / counts / ORDER — scythe×2, bomb×1, rake×1.
	var expected: Array = [["scythe", 2], ["bomb", 1], ["rake", 1]]
	var ok := st.size() == 3
	for i in mini(3, st.size()):
		if String(st[i]["id"]) != String(expected[i][0]):
			ok = false
		if int(st[i]["count"]) != int(expected[i][1]):
			ok = false
	_check(ok, "STARTER_TOOLS == scythe×2, bomb×1, rake×1 (exact ids/counts/order)")
	# Every id is a REAL ToolConfig id (no fakes).
	for row in st:
		_check(ToolConfig.has_tool(String(row["id"])), "STARTER_TOOLS id '%s' is a real ToolConfig tool" % String(row["id"]))

# ── C5: CartographyConfig.travel_verb ────────────────────────────────────────

func _test_travel_verb() -> void:
	# Every kind, both fast (visited) and not-fast — byte-identical to the old CartographyScreen table.
	_check(CartographyConfig.travel_verb("home", false) == "Travel home", "travel_verb home/not-fast")
	_check(CartographyConfig.travel_verb("home", true) == "Return to the Hearth", "travel_verb home/fast")
	_check(CartographyConfig.travel_verb("farm", false) == "Farm here", "travel_verb farm/not-fast")
	_check(CartographyConfig.travel_verb("farm", true) == "Travel to the fields", "travel_verb farm/fast")
	_check(CartographyConfig.travel_verb("mine", false) == "⛏ Descend the mine", "travel_verb mine/not-fast")
	_check(CartographyConfig.travel_verb("mine", true) == "⛏ Return to the mine", "travel_verb mine/fast")
	_check(CartographyConfig.travel_verb("fish", false) == "⚓ Sail the harbor", "travel_verb fish/not-fast")
	_check(CartographyConfig.travel_verb("fish", true) == "⚓ Return to the harbor", "travel_verb fish/fast")
	_check(CartographyConfig.travel_verb("boss", false) == "⚔ Face the Pit", "travel_verb boss")
	_check(CartographyConfig.travel_verb("festival", false) == "🎪 Visit the fair", "travel_verb festival")
	_check(CartographyConfig.travel_verb("event", false) == "🎲 Walk the Crossroads", "travel_verb event")
	_check(CartographyConfig.travel_verb("capital", false) == "Travel", "travel_verb unknown/default → 'Travel'")

# ── C5: CartographyConfig.block_label ────────────────────────────────────────

func _test_block_label() -> void:
	_check(CartographyConfig.block_label("needs_tokens", "oldcapital") == "🔒 Needs the 3 Hearth-Tokens", "block_label needs_tokens")
	_check(CartographyConfig.block_label("unreachable", "quarry") == "🔒 No road from here yet", "block_label unreachable")
	# level / cost interpolate from the node's gate data. quarry: level 2, entry_cost 100.
	_check(CartographyConfig.level_req("quarry") == 2, "quarry level_req == 2 (fixture)")
	_check(CartographyConfig.entry_cost("quarry") == 100, "quarry entry_cost == 100 (fixture)")
	_check(CartographyConfig.block_label("level", "quarry") == "🔒 Requires Level 2", "block_label level interpolates node level (Requires Level 2)")
	_check(CartographyConfig.block_label("cost", "quarry") == "🔒 Needs 100 coins", "block_label cost interpolates node cost (Needs 100 coins)")
	_check(CartographyConfig.block_label("anything_else", "quarry") == "🔒 Locked", "block_label unknown reason → '🔒 Locked'")

# ── C6: BuildingConfig.build_hint ────────────────────────────────────────────

func _test_build_hint() -> void:
	_check(BuildingConfig.build_hint("exists") == "already built", "build_hint exists")
	_check(BuildingConfig.build_hint("locked") == "need a higher tier", "build_hint locked")
	_check(BuildingConfig.build_hint("no_plot") == "no free plot", "build_hint no_plot")
	_check(BuildingConfig.build_hint("insufficient") == "not enough resources", "build_hint insufficient")
	_check(BuildingConfig.build_hint("whatever") == "unavailable", "build_hint unknown → 'unavailable'")

# ── C6: Constants.start_farm_fail_text ───────────────────────────────────────

func _test_start_farm_fail_text() -> void:
	_check(Constants.start_farm_fail_text("no_coins") == "Not enough coin to start.", "start_farm_fail_text no_coins")
	_check(Constants.start_farm_fail_text("no_fertilizer") == "No fertilizer on hand.", "start_farm_fail_text no_fertilizer")
	_check(Constants.start_farm_fail_text("already_running") == "A farm run is already underway.", "start_farm_fail_text already_running")
	_check(Constants.start_farm_fail_text("???") == "Cannot start a run right now.", "start_farm_fail_text unknown → default")

# ── D7/D8/D9: renamed constants keep their original VALUE ─────────────────────

func _test_renamed_constants() -> void:
	# D7 — the picker slot cap (was StartFarmingModal.MAX_SLOTS := 8).
	_check(Constants.MAX_FARM_SLOTS == 8, "Constants.MAX_FARM_SLOTS == 8 (the old modal MAX_SLOTS)")
	# D9 — the harvest-tally chip cap (was an inline `8`).
	_check(Constants.HARVEST_TALLY_MAX == 8, "Constants.HARVEST_TALLY_MAX == 8 (the old inline mini(8, …))")
	# D8 — the tutorial speaker id (was TutorialModal.TUTORIAL_NPC := "wren"), a real roster member.
	_check(TutorialConfig.TUTORIAL_NPC == "wren", "TutorialConfig.TUTORIAL_NPC == 'wren'")
	_check(NpcConfig.display_name(TutorialConfig.TUTORIAL_NPC) != "", "TUTORIAL_NPC resolves to a real NPC display name (no fake)")

# ── A3/A4: the bug-fix thresholds the prose now interpolates ──────────────────

func _test_bugfix_thresholds() -> void:
	# A3 — the "need City + N mine goods" prose now interpolates this (was a baked "12").
	_check(BossConfig.MINE_MASTERY_THRESHOLD == 12, "BossConfig.MINE_MASTERY_THRESHOLD == 12 (the prose's interpolated value)")
	# A4 — the "Drag N+" hint now interpolates the live min-chain (base 3, a boss can raise it).
	_check(Constants.MIN_CHAIN == 3, "Constants.MIN_CHAIN == 3 (the base 'Drag N+' value)")
	# storm's min_chain modifier raises the effective bar to 4 (boss-raised path the hint must follow).
	_check(BossConfig.boss_min_chain(BossConfig.STORM) == 4, "boss_min_chain(storm) == 4 (a boss CAN raise 'Drag N+')")
	_check(BossConfig.boss_min_chain(BossConfig.FROSTMAW) == Constants.MIN_CHAIN, "boss_min_chain(frostmaw) falls back to MIN_CHAIN")

# ── delegates: the view functions still return the config value ───────────────

func _test_view_delegates_match_config() -> void:
	# CartographyScreen._travel_verb / _block_label and Main._build_hint / _start_farm_fail_text are
	# now thin delegates. Build the view scripts headlessly (RefCounted-free Control nodes) and prove
	# the delegate returns exactly what the config returns — so the move is behavior-preserving.
	var game := GameState.new_game()

	# CartographyScreen delegates.
	var carto = load("res://scenes/CartographyScreen.gd").new()
	carto.game = game
	root.add_child(carto)
	# home is the start node and is visited → fast travel verb.
	var fast_home: bool = game.map_visited("home")
	_check(carto._travel_verb("home", "home") == CartographyConfig.travel_verb("home", fast_home),
		"CartographyScreen._travel_verb delegates to config (home)")
	_check(carto._block_label("level", "quarry") == CartographyConfig.block_label("level", "quarry"),
		"CartographyScreen._block_label delegates to config (level/quarry)")
	carto.queue_free()

	# Main delegates — Main.gd is the root scene script; instance the bare script (no _ready scene
	# build needed for these two pure delegates, which don't touch nodes).
	var main_node = load("res://scenes/Main.gd").new()
	_check(main_node._build_hint("locked") == BuildingConfig.build_hint("locked"),
		"Main._build_hint delegates to BuildingConfig (locked)")
	_check(main_node._start_farm_fail_text("no_coins") == Constants.start_farm_fail_text("no_coins"),
		"Main._start_farm_fail_text delegates to Constants (no_coins)")
	main_node.free()
