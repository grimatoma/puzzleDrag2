extends SceneTree
## Headless unit-test runner for T30 — the rich RUN-SUMMARY telemetry + the close_season
## side-effects (session_ended story beat, freeMoves reset, board-preserve decision) + the
## HarvestModal pure dashboard helpers. Run from the godot/ project root:
##   godot --headless --script res://tests/run_run_summary_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_story_tests.gd.

const T := Constants.Tile
const HarvestModalScript := preload("res://scenes/HarvestModal.gd")

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Run-summary (T30) tests ────────────────────────")
	# Telemetry lifecycle on GameState
	_test_telemetry_resets_at_start()
	_test_no_accumulation_without_a_run()
	_test_accumulates_chains_longest_resources_coins()
	_test_best_moment_is_longest_chain()
	_test_accumulates_supplies_consumed()
	_test_accumulates_bond_deltas()
	_test_accumulates_beats_fired()
	_test_build_run_summary_snapshot_shape()
	# close_season side-effects
	_test_close_season_fires_session_ended()
	_test_close_season_resets_free_moves()
	_test_close_season_board_preserve_decision()
	# HarvestModal pure dashboard helpers
	_test_harvest_recap_line()
	_test_harvest_best_moment_line()
	_test_harvest_bonds_summary_line()
	_test_harvest_beats_summary_line()
	# Render smoke — actually build the modal node + the dashboard sections (catches node-build
	# runtime errors the pure helpers can't). Needs the tree, so it's awaited.
	await _test_harvest_dashboard_renders()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helper ────────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _approx(a: float, b: float, eps: float = 0.001) -> bool:
	return absf(a - b) <= eps

## Start a bounded farm run with enough coins to pay the entry cost (so it always succeeds). No
## fertilizer (keeps the budget the base 10). Returns the start result.
func _start_run(g: GameState) -> Dictionary:
	g.coins = 1000
	return g.start_farm_run([], false)

# ── telemetry lifecycle ───────────────────────────────────────────────────────

func _test_telemetry_resets_at_start() -> void:
	var g := GameState.new()
	# Dirty the telemetry, then start a run — it must reset to a fresh accumulator.
	g.run_chains_played = 99
	g.run_longest_chain = 42
	g.run_total_coins = 777
	g.run_resources_gained = {"flour": 9}
	g.run_beats_fired = ["x"]
	g.run_supplies_consumed = {"supplies": 3}
	var r := _start_run(g)
	_check(bool(r.get("ok", false)), "start_farm_run succeeds with coins on hand")
	_check(g.run_chains_played == 0, "start resets run_chains_played to 0")
	_check(g.run_longest_chain == 0, "start resets run_longest_chain to 0")
	_check(g.run_total_coins == 0, "start resets run_total_coins to 0")
	_check(g.run_resources_gained.is_empty(), "start resets run_resources_gained to empty")
	_check(g.run_beats_fired.is_empty(), "start resets run_beats_fired to empty")
	_check(g.run_supplies_consumed.is_empty(), "start resets run_supplies_consumed to empty")
	# bonds_at_start is snapshotted for every roster NPC.
	_check(g.run_bonds_at_start.size() == NpcConfig.all_ids().size(),
		"start snapshots a bond baseline for every roster NPC")

func _test_no_accumulation_without_a_run() -> void:
	# With NO active run, credit_chain must NOT touch the telemetry (byte-identical to pre-T30).
	var g := GameState.new()
	g.credit_chain(T.GRASS, 6)
	_check(g.run_chains_played == 0, "no run active → credit_chain does not bump chains_played")
	_check(g.run_resources_gained.is_empty(), "no run active → no resources accumulated")
	_check(g.run_best_chain.is_empty(), "no run active → no best-moment recorded")

func _test_accumulates_chains_longest_resources_coins() -> void:
	var g := GameState.new()
	_start_run(g)
	# Two grass chains (GRASS → hay_bundle, threshold 6): 6 → 1 unit, then 4 → 0 units (carry 4).
	var c1 := g.credit_chain(T.GRASS, 6)
	var c2 := g.credit_chain(T.GRASS, 4)
	_check(g.run_chains_played == 2, "two chains → chains_played == 2")
	_check(g.run_longest_chain == 6, "longest_chain tracks the longest single chain (6)")
	# resources_gained accumulates PRODUCED units (the first chain made 1 hay; the second made 0).
	_check(int(g.run_resources_gained.get("hay_bundle", 0)) == 1,
		"resources_gained accumulates produced units (1 hay from the chain of 6)")
	# total_coins sums the per-chain coins_gain reported by credit_chain.
	var expected_coins: int = int(c1["coins_gain"]) + int(c2["coins_gain"])
	_check(g.run_total_coins == expected_coins,
		"total_coins sums each chain's coins_gain (got %d, want %d)" % [g.run_total_coins, expected_coins])

func _test_best_moment_is_longest_chain() -> void:
	var g := GameState.new()
	_start_run(g)
	g.credit_chain(T.GRASS, 4)   # shorter first
	g.credit_chain(T.GRASS, 9)   # the longest → becomes the best moment
	g.credit_chain(T.GRASS, 5)   # shorter after — must NOT replace the best
	var best: Dictionary = g.run_best_chain
	_check(int(best.get("count", 0)) == 9, "best_chain.count is the LONGEST chain (9)")
	_check(String(best.get("key", "")) == Constants.string_key(T.GRASS),
		"best_chain.key is the chained tile's string key")
	_check(int(best.get("coin_gain", 0)) > 0, "best_chain records the coin gain of that chain")

func _test_accumulates_supplies_consumed() -> void:
	# enter_mine / enter_harbor convert ALL supplies into turns; the telemetry records the count.
	var g := GameState.new()
	_start_run(g)
	g.settlement.tier = TownConfig.TIER_CITY    # mine unlocks at City
	g.inventory["supplies"] = 4
	var r := g.enter_mine()
	_check(bool(r.get("ok", false)), "enter_mine succeeds with supplies + City tier")
	_check(int(g.run_supplies_consumed.get("supplies", 0)) == 4,
		"entering the mine records 4 supplies consumed")

func _test_accumulates_bond_deltas() -> void:
	# Fill an order from an NPC → that NPC's bond rises by BOND_GAIN_PER_FILL → a positive delta.
	var g := GameState.new()
	_start_run(g)
	var npc: String = String(NpcConfig.all_ids()[0])
	var start_bond: float = g.npc_bond(npc)
	g.orders = [{"resource": "hay_bundle", "qty": 3, "reward": 10, "npc": npc, "base_reward": 10}]
	g.inventory["hay_bundle"] = 10
	var r := g.fill_order(0)
	_check(bool(r.get("ok", false)), "fill_order succeeds")
	var deltas: Dictionary = g.run_bond_deltas()
	_check(deltas.has(npc), "the requesting NPC has a recorded bond delta after a fill")
	var expected: float = roundf((g.npc_bond(npc) - start_bond) * 10.0) / 10.0
	_check(_approx(float(deltas.get(npc, 0.0)), expected),
		"the bond delta is round1(end - start) (got %s)" % str(deltas.get(npc, 0.0)))
	_check(float(deltas[npc]) > 0.0, "filling an order yields a POSITIVE bond delta")

func _test_accumulates_beats_fired() -> void:
	# A chain that crosses the light_hearth threshold (20 hay) fires act1_light_hearth DURING the run
	# → it lands in run_beats_fired with its title.
	var g := GameState.new()
	_start_run(g)
	g.inventory["hay_bundle"] = 19         # one short of the 20-hay light_hearth gate
	g.credit_chain(T.GRASS, 6)             # +1 hay → 20 → fires act1_light_hearth
	_check(g.story.is_fired("act1_light_hearth"), "the chain fires act1_light_hearth")
	_check(g.run_beats_fired.has("act1_light_hearth"),
		"a beat fired DURING the run is recorded in run_beats_fired")

func _test_build_run_summary_snapshot_shape() -> void:
	var g := GameState.new()
	_start_run(g)
	g.credit_chain(T.GRASS, 7)
	var s := g.build_run_summary()
	for key in ["biome", "zone", "turns_budget", "fertilizer_used", "chains_played",
			"longest_chain", "best_chain", "total_upgrades", "total_coins",
			"resources_gained", "bond_deltas", "supplies_consumed", "beats"]:
		_check(s.has(key), "build_run_summary includes '%s'" % key)
	_check(int(s["chains_played"]) == 1, "snapshot carries the live chains_played (1)")
	_check(int(s["longest_chain"]) == 7, "snapshot carries the live longest_chain (7)")
	_check(int(s["turns_budget"]) == g.farm_run_budget, "snapshot carries the run turn budget")
	_check(s["beats"] is Array, "snapshot beats is an Array of {id,title}")

# ── close_season side-effects ─────────────────────────────────────────────────

func _test_close_season_fires_session_ended() -> void:
	# close_season posts a "session_ended" event. With the act3_finish prerequisites met DURING the
	# run (flag.rats_arrived + inventory.block >= 50), the session_ended cascade must fire act3_finish
	# at the boundary — proving the post is wired + cascades.
	var g := GameState.new()
	_start_run(g)
	# Stand up the act3_finish prerequisites without firing it yet: set the gating flags/inventory.
	g.story.flags["rats_arrived"] = true
	g.story.flags[StoryEngine.fired_key("act3_rats")] = true
	g.story.flags[StoryEngine.fired_key("act2_frostmaw_felled")] = true
	g.story.flags["frostmaw_felled"] = true
	g.inventory["block"] = 60        # >= 50 → act3_finish inventory gate met
	_check(not g.story.is_fired("act3_finish"), "act3_finish has NOT fired before the boundary")
	g.close_season()
	_check(g.story.is_fired("act3_finish"),
		"close_season's session_ended event cascades to fire the ready act3_finish beat")
	_check(g.story.has_flag("settlement_lives"), "act3_finish set settlement_lives at the boundary")

func _test_close_season_resets_free_moves() -> void:
	var g := GameState.new()
	_start_run(g)
	g.tile_free_moves = 5
	g.fill_bias_turns = 3
	g.fill_bias_target = T.GRASS
	g.close_season()
	_check(g.tile_free_moves == 0, "close_season zeroes banked tile_free_moves")
	_check(g.fill_bias_turns == 0, "close_season clears the fill-bias turns")
	_check(g.fill_bias_target == Constants.EMPTY, "close_season clears the fill-bias target")

func _test_close_season_board_preserve_decision() -> void:
	# With no preserve building the decision is false. Force the board_preserve_biomes channel via a
	# Silo/Barn-style building if available; otherwise assert the default-false path (no fake).
	var g := GameState.new()
	_start_run(g)
	var res := g.close_season()
	_check(res.has("preserve_board"), "close_season result carries the preserve_board decision")
	_check(bool(res["preserve_board"]) == false,
		"preserve_board is FALSE for a fresh game (no Silo/Barn preserve building)")
	# Sanity: the preserved_biomes channel list is also reported (empty for a fresh game).
	_check(res.has("preserved_biomes") and (res["preserved_biomes"] as Array).is_empty(),
		"preserved_biomes is reported + empty for a fresh game")

# ── HarvestModal pure dashboard helpers ────────────────────────────────────────

func _test_harvest_recap_line() -> void:
	# Legacy recap line still builds correctly (unchanged contract).
	var line := HarvestModalScript.recap_line({"budget": 10, "coins": 120, "runes": 0})
	_check(line.contains("10 turns"), "recap_line mentions the turn budget")
	_check(line.contains("120 coins"), "recap_line mentions the coins")
	_check(not line.contains("rune"), "recap_line omits runes when zero")
	var line2 := HarvestModalScript.recap_line({"budget": 20, "coins": 5, "runes": 2})
	_check(line2.contains("2 runes"), "recap_line includes runes when > 0")

func _test_harvest_best_moment_line() -> void:
	var line := HarvestModalScript.best_moment_line({"count": 9, "key": Constants.string_key(T.GRASS)})
	_check(line.contains("9 tiles"), "best_moment_line names the chain length")
	_check(line.to_lower().contains("chain"), "best_moment_line reads as a chain callout")
	var generic := HarvestModalScript.best_moment_line({"count": 4, "key": ""})
	_check(generic.begins_with("Chain"), "best_moment_line falls back to 'Chain' for an empty key")

func _test_harvest_bonds_summary_line() -> void:
	var empty := HarvestModalScript.bonds_summary_line({})
	_check(empty == "", "bonds_summary_line is empty when no bonds moved")
	var line := HarvestModalScript.bonds_summary_line({"mira": 0.6, "wren": -0.1})
	# Biggest absolute move first → Mira leads.
	_check(line.find("Mira") < line.find("Wren"), "bonds_summary_line orders by biggest absolute move")
	_check(line.contains("+0.6"), "bonds_summary_line formats a positive delta")
	_check(line.contains("-0.1"), "bonds_summary_line formats a negative delta")

## Render smoke: build a real HarvestModal node, drive a content-rich run, and open it in run-end
## mode. Asserts the dashboard is visible, carries the live summary, and that every dashboard section
## actually built child nodes (no runtime error during _render_dashboard). Then re-open in legacy mode
## and assert the dashboard hides — proving the mode toggle works.
func _test_harvest_dashboard_renders() -> void:
	var g := GameState.new()
	_start_run(g)
	# A content-rich run: a long chain, a threshold beat, a bond move, supplies spent.
	g.inventory["hay_bundle"] = 19
	g.credit_chain(T.GRASS, 9)          # longest chain + crosses 20 hay → fires light_hearth
	g.credit_chain(T.GRASS, 4)
	var npc: String = String(NpcConfig.all_ids()[0])
	g.orders = [{"resource": "hay_bundle", "qty": 1, "reward": 5, "npc": npc, "base_reward": 5}]
	g.inventory["hay_bundle"] = 5
	g.fill_order(0)                      # +bond → a bond delta
	var modal := HarvestModalScript.new()
	root.add_child(modal)
	modal.setup(g)
	await process_frame
	modal.open_for_run_end({"season": "Autumn", "budget": 10, "coins": g.coins, "runes": 0})
	await process_frame
	_check(modal.visible, "the modal is visible after open_for_run_end")
	_check(modal.is_dashboard_visible(), "the rich dashboard is shown in run-end mode")
	var rs: Dictionary = modal.run_summary()
	_check(int(rs.get("longest_chain", 0)) == 9, "the rendered dashboard carries the live longest chain (9)")
	_check(int(rs.get("chains_played", 0)) == 2, "the rendered dashboard carries chains_played (2)")
	# The dashboard VBox built section nodes (metrics + best moment + tally + beats + bonds).
	var dash: VBoxContainer = modal._dashboard
	_check(dash.get_child_count() > 0, "the dashboard built child section nodes (got %d)" % dash.get_child_count())
	# The "return_town" CTA exists + reads "Return to Town".
	var cta: Button = modal._action_buttons.get("return_town", null)
	_check(cta != null and cta.text == "Return to Town", "the run-end CTA reads 'Return to Town'")
	# Re-open in LEGACY mode → the dashboard hides + the CTA reverts to "Continue".
	modal.open_for({"season": "Spring", "budget": 10, "coins": 50, "runes": 0})
	await process_frame
	_check(not modal.is_dashboard_visible(), "legacy open_for hides the rich dashboard")
	_check(cta.text == "Continue", "legacy mode reverts the CTA to 'Continue'")
	modal.queue_free()

func _test_harvest_beats_summary_line() -> void:
	var empty := HarvestModalScript.beats_summary_line([])
	_check(empty == "", "beats_summary_line is empty with no beats")
	var line := HarvestModalScript.beats_summary_line([
		{"id": "a", "title": "First Light"},
		{"id": "b", "title": ""},                # untitled → skipped
		{"id": "c", "title": "The First Delivery"},
	])
	_check(line.contains("First Light") and line.contains("The First Delivery"),
		"beats_summary_line lists the titled beats")
	_check(not line.contains("· ·"), "beats_summary_line skips untitled beats (no empty segment)")
