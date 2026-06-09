extends SceneTree
## Headless tests for T12 — Fertilizer run-entry item + extraTurn additive.
##
## Covers:
##   1. _has_fertilizer reflects the tool count (0 → false, 1+ → true).
##   2. start_farm_run(use_fertilizer=true) consumes one fertilizer charge + doubles the budget.
##   3. start_farm_run(use_fertilizer=true) with 0 fertilizer is rejected (no_fertilizer reason).
##   4. extraTurn structural flag (+1 additive to farm_run_turn_budget).
##   5. Combined: extraTurn + fertilizer → (base + 1) × 2.
##   6. Combined: extraTurn + turn_budget_bonus building + fertilizer.
##   7. StartFarmingModal: toggle hidden when no fertilizer, shown when available.
##   8. StartFarmingModal: preview_budget reflects the toggle.
##   9. StartFarmingModal: Start emits use_fertilizer=true when checked + available.
##  10. StartFarmingModal: Start emits use_fertilizer=false when unchecked (even with fert).
##  11. Save / load round-trip of fertilizer count.
##
## Run:
##   godot --headless --path <worktree>/godot --script res://tests/run_fertilizer_tests.gd
## Exits 0 on all pass, 1 on any failure.

const StartFarmingModalScript := preload("res://scenes/StartFarmingModal.gd")

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
	print("\n── T12 Fertilizer + extraTurn tests ─────────────────")
	await _run()
	print("─────────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	_test_has_fertilizer_reflects_count()
	_test_start_farm_run_consumes_fertilizer()
	_test_start_farm_run_rejected_without_fertilizer()
	_test_extraturn_additive()
	_test_extraturn_with_fertilizer()
	_test_extraturn_plus_building_plus_fertilizer()
	await _test_modal_toggle_hidden_when_no_fert()
	await _test_modal_toggle_shown_when_available()
	await _test_modal_preview_reflects_toggle()
	await _test_modal_start_emits_true_when_checked()
	await _test_modal_start_emits_false_when_unchecked()
	_test_save_load_fertilizer_count()

# ── 1. _has_fertilizer reflects the tool count ─────────────────────────────────

func _test_has_fertilizer_reflects_count() -> void:
	var g := GameState.new()
	_check(not g._has_fertilizer(), "_has_fertilizer() false with 0 fertilizer (fresh game)")
	g.grant_test_fertilizer(1)
	_check(g._has_fertilizer(), "_has_fertilizer() true after grant_test_fertilizer(1)")
	_check(g.tool_count(ToolConfig.FERTILIZER) == 1, "tool_count('fertilizer') == 1 after grant")
	g.grant_test_fertilizer(2)
	_check(g._has_fertilizer(), "_has_fertilizer() true after grant_test_fertilizer(2) more")
	_check(g.tool_count(ToolConfig.FERTILIZER) == 3, "tool_count('fertilizer') == 3 total")

# ── 2. start_farm_run consumes one fertilizer and doubles the budget ────────────

func _test_start_farm_run_consumes_fertilizer() -> void:
	var g := GameState.new()
	g.coins = 50
	g.grant_test_fertilizer(1)
	_check(g._has_fertilizer(), "(setup) fertilizer available")
	var base_budget: int = g.farm_run_turn_budget(false)
	_check(base_budget == 10, "(setup) base budget == 10 (no fertilizer)")
	_check(g.farm_run_turn_budget(true) == 20, "farm_run_turn_budget(true) == 20 (×2)")

	var res := g.start_farm_run([], true)
	_check(bool(res.get("ok", false)), "start_farm_run(true) succeeded")
	_check(int(res.get("budget", -1)) == 20, "returned budget == 20 (×2)")
	_check(g.farm_run_budget == 20, "farm_run_budget == 20 after start with fertilizer")
	_check(g.farm_run_turns_left == 20, "farm_run_turns_left == 20")
	_check(g.farm_run_used_fertilizer, "farm_run_used_fertilizer == true")
	# Fertilizer was consumed: count should be 0.
	_check(not g._has_fertilizer(), "fertilizer consumed: _has_fertilizer() false after run start")
	_check(g.tool_count(ToolConfig.FERTILIZER) == 0, "tool_count('fertilizer') == 0 after consumption")

	# Multiple fertilizers: only one is consumed.
	var g2 := GameState.new()
	g2.coins = 50
	g2.grant_test_fertilizer(3)
	var res2 := g2.start_farm_run([], true)
	_check(bool(res2.get("ok", false)), "start with 3 fertilizers succeeds")
	_check(g2.tool_count(ToolConfig.FERTILIZER) == 2, "only ONE fertilizer consumed (3 → 2)")

# ── 3. start_farm_run rejected when no fertilizer ──────────────────────────────

func _test_start_farm_run_rejected_without_fertilizer() -> void:
	var g := GameState.new()
	g.coins = 50
	# With 0 fertilizer: requesting use_fertilizer=true must be rejected.
	var res := g.start_farm_run([], true)
	_check(not bool(res.get("ok", false)), "start_farm_run(use_fertilizer=true) rejected with 0 fert")
	_check(String(res.get("reason", "")) == "no_fertilizer",
		"rejection reason == 'no_fertilizer'")
	_check(not g.farm_run_active, "no run started after rejection")
	_check(g.coins == 50, "coins unchanged after rejected start")

	# With 0 fertilizer: requesting false still succeeds (budget stays base).
	var res2 := g.start_farm_run([], false)
	_check(bool(res2.get("ok", false)), "start_farm_run(use_fertilizer=false) succeeds without fert")
	_check(g.farm_run_budget == 10, "budget == 10 (no fertilizer, no extraTurn)")
	_check(not g.farm_run_used_fertilizer, "farm_run_used_fertilizer == false")

# ── 4. extraTurn additive (+1 to the base before ×multiplier) ─────────────────

func _test_extraturn_additive() -> void:
	var g := GameState.new()
	_check(g.farm_run_turn_budget(false) == 10, "(setup) no extraTurn → budget 10")

	# Latch the extraTurn structural flag (mirrors React tools.extraTurn = true from Almanac).
	g.almanac_structural["extraTurn"] = true
	_check(g.farm_run_turn_budget(false) == 11, "extraTurn → budget 11 (10 + 1)")

	# Unlatch → back to 10.
	g.almanac_structural.erase("extraTurn")
	_check(g.farm_run_turn_budget(false) == 10, "erase extraTurn → budget back to 10")

	# False value: treated as not set.
	g.almanac_structural["extraTurn"] = false
	_check(g.farm_run_turn_budget(false) == 10, "extraTurn=false → budget still 10")

# ── 5. extraTurn + fertilizer: (base + 1) × 2 ─────────────────────────────────

func _test_extraturn_with_fertilizer() -> void:
	var g := GameState.new()
	g.almanac_structural["extraTurn"] = true
	_check(g.farm_run_turn_budget(false) == 11, "(setup) extraTurn → base 11")
	_check(g.farm_run_turn_budget(true) == 22, "extraTurn + fertilizer → 22 ((10+1)×2)")

	# Verify a real run: grant fert + sufficient coins.
	g.coins = 50
	g.grant_test_fertilizer(1)
	var res := g.start_farm_run([], true)
	_check(bool(res.get("ok", false)), "start with extraTurn + fertilizer succeeded")
	_check(g.farm_run_budget == 22, "farm_run_budget == 22 (extraTurn + fertilizer)")

# ── 6. extraTurn + turn_budget_bonus building + fertilizer ────────────────────

func _test_extraturn_plus_building_plus_fertilizer() -> void:
	var g := GameState.new()
	g.almanac_structural["extraTurn"] = true
	g.coins = 10000
	g.inventory["hay_bundle"] = 50
	g.inventory["flour"] = 50
	# Build a Granary (turn_budget_bonus +1, needs hamlet tier).
	g.settlement.tier = TownConfig.TIER_HAMLET
	var br := g.build(BuildingConfig.GRANARY)
	_check(bool(br.get("ok", false)), "(setup) built Granary (turn_budget_bonus +1)")
	# additive = 1 (building) + 1 (extraTurn) = 2; without fertilizer → 10+2=12.
	_check(g.farm_run_turn_budget(false) == 12, "Granary + extraTurn → budget 12")
	# With fertilizer → (10+2)×2 = 24.
	_check(g.farm_run_turn_budget(true) == 24, "Granary + extraTurn + fertilizer → budget 24")

# ── 7. StartFarmingModal: toggle hidden when no fertilizer ─────────────────────

func _test_modal_toggle_hidden_when_no_fert() -> void:
	var g := GameState.new()
	g.coins = 50
	var m = StartFarmingModalScript.new()
	m.setup(g)
	root.add_child(m)
	m.open()
	await process_frame
	_check(not g._has_fertilizer(), "(setup) no fertilizer")
	# The use_fertilizer CheckBox must NOT be visible when no fertilizer.
	if m._fert_row != null:
		_check(not m._fert_row.visible, "fertilizer row hidden when no fertilizer")
	else:
		_check(false, "fertilizer toggle row (_fert_row) was not built")
	m.queue_free()
	await process_frame

# ── 8. StartFarmingModal: toggle shown when fertilizer available ───────────────

func _test_modal_toggle_shown_when_available() -> void:
	var g := GameState.new()
	g.coins = 50
	g.grant_test_fertilizer(1)
	var m = StartFarmingModalScript.new()
	m.setup(g)
	root.add_child(m)
	m.open()
	await process_frame
	_check(g._has_fertilizer(), "(setup) fertilizer available")
	if m._fert_row != null:
		_check(m._fert_row.visible, "fertilizer row VISIBLE when fertilizer available")
	else:
		_check(false, "fertilizer toggle row (_fert_row) was not built")
	# Toggle is registered in _action_buttons.
	_check(m._action_buttons.has("use_fertilizer"),
		"'use_fertilizer' registered in _action_buttons when fert available")
	m.queue_free()
	await process_frame

# ── 9. StartFarmingModal: preview_budget reflects toggle ──────────────────────

func _test_modal_preview_reflects_toggle() -> void:
	var g := GameState.new()
	g.coins = 50
	g.grant_test_fertilizer(1)
	var m = StartFarmingModalScript.new()
	m.setup(g)
	root.add_child(m)
	m.open()
	await process_frame
	# Unchecked: budget == base (10).
	_check(not m._fertilizer_checked, "(setup) toggle unchecked on open")
	_check(m.preview_budget() == 10, "preview_budget == 10 when unchecked")
	# Check the toggle → budget should double.
	m._fert_check.button_pressed = true
	await process_frame
	_check(m._fertilizer_checked, "toggle checked after set button_pressed=true")
	_check(m.preview_budget() == 20, "preview_budget == 20 when fertilizer toggle checked")
	# Uncheck → back to 10.
	m._fert_check.button_pressed = false
	await process_frame
	_check(m.preview_budget() == 10, "preview_budget back to 10 after uncheck")
	m.queue_free()
	await process_frame

# ── 10. StartFarmingModal: Start emits use_fertilizer=true when checked ────────

func _test_modal_start_emits_true_when_checked() -> void:
	var g := GameState.new()
	g.coins = 50
	g.grant_test_fertilizer(1)
	var m = StartFarmingModalScript.new()
	m.setup(g)
	root.add_child(m)
	m.open()
	await process_frame
	# Check the toggle.
	m._fert_check.button_pressed = true
	await process_frame
	var probe := {"fired": 0, "fert": null}
	m.start_requested.connect(func(sel: Array, fert: bool) -> void:
		probe.fired += 1
		probe.fert = fert)
	m._action_buttons["start"].emit_signal("pressed")
	await process_frame
	_check(probe.fired == 1, "Start fired exactly once")
	_check(probe.fert == true,
		"use_fertilizer == true emitted when toggle checked + fertilizer available")
	m.queue_free()
	await process_frame

# ── 11. StartFarmingModal: Start emits use_fertilizer=false when unchecked ─────

func _test_modal_start_emits_false_when_unchecked() -> void:
	var g := GameState.new()
	g.coins = 50
	g.grant_test_fertilizer(2)
	var m = StartFarmingModalScript.new()
	m.setup(g)
	root.add_child(m)
	m.open()
	await process_frame
	# Do NOT check the toggle (it opens unchecked).
	_check(not m._fertilizer_checked, "(setup) toggle unchecked")
	var probe := {"fert": true}  # pre-set to true to prove it's overwritten false
	m.start_requested.connect(func(_sel: Array, fert: bool) -> void:
		probe.fert = fert)
	m._action_buttons["start"].emit_signal("pressed")
	await process_frame
	_check(probe.fert == false,
		"use_fertilizer == false emitted when toggle unchecked (even with fert in inventory)")
	m.queue_free()
	await process_frame

# ── 12. Save / load round-trip of fertilizer count ─────────────────────────────

func _test_save_load_fertilizer_count() -> void:
	var g := GameState.new()
	g.grant_test_fertilizer(3)
	_check(g.tool_count(ToolConfig.FERTILIZER) == 3, "(setup) 3 fertilizer charges")
	var d := g.to_dict()
	# The tools dict is persisted; check the key survives round-trip.
	var tools_dict: Dictionary = d.get("tools", {})
	_check(int(tools_dict.get(ToolConfig.FERTILIZER, 0)) == 3,
		"to_dict carries fertilizer count 3")
	var loaded := GameState.from_dict(d)
	_check(loaded.tool_count(ToolConfig.FERTILIZER) == 3,
		"from_dict restores fertilizer count 3")
	_check(loaded._has_fertilizer(), "restored game _has_fertilizer() == true")

	# A pre-fertilizer save (no "fertilizer" key in tools) loads as 0 charges.
	var old_save := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 1}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "", "boss_hp": 0, "town2_complete": false,
		"tools": {},
	}
	var o := GameState.from_dict(old_save)
	_check(not o._has_fertilizer(), "pre-fertilizer save loads with 0 charges (_has_fertilizer false)")
