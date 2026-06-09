extends SceneTree
## Headless unit tests for BossModifierLogic (T24) — the pure board-modifier rules ported from
## src/features/bosses/modifiers.ts. Covers apply_to_fresh_grid for each modifier type (frozen
## column count, rubble/hidden K-cell Fisher-Yates pick, heat empty-then-spawn, respawn_boost
## boost+factor), the cell_chainable / cell_frozen / cell_hidden / cell_heat / cell_rubble queries,
## heat tick aging + burn-after-threshold, hidden reveal (all + single), and spawn_bias.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_boss_modifiers_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

var BML := BossModifierLogic

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Boss modifier logic tests ──────────────────────")
	_test_freeze_columns()
	_test_rubble_blocks()
	_test_hide_resources()
	_test_heat_tiles()
	_test_respawn_boost()
	_test_chainable_queries()
	_test_reveal()
	_test_min_chain_and_unknown()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

## A seeded RNG (deterministic picks across runs).
func _rng(seed: int = 12345) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = seed
	return r

# ── freeze_columns ─────────────────────────────────────────────────────────────

func _test_freeze_columns() -> void:
	var mod := {"type": "freeze_columns", "params": {"n": 2}}
	var st := BML.apply_to_fresh_grid(mod, 6, 6, _rng())
	_check(st.has("frozen_columns"), "freeze_columns yields a frozen_columns key")
	var cols: Array = st["frozen_columns"]
	_check(cols.size() == 2, "freeze_columns picks exactly n=2 columns")
	_check(cols[0] != cols[1], "the two frozen columns are distinct")
	for c in cols:
		_check(int(c) >= 0 and int(c) < 6, "frozen column %d is in range" % int(c))
	# Every cell in a frozen column is unchainable + reports frozen; other columns are chainable.
	var fc: int = int(cols[0])
	var other: int = -1
	for c in 6:
		if not cols.has(c):
			other = c
			break
	_check(not BML.cell_chainable(st, 0, fc), "a frozen-column cell is NOT chainable")
	_check(BML.cell_frozen(st, fc), "cell_frozen true for a frozen column")
	_check(BML.cell_chainable(st, 0, other), "a non-frozen-column cell IS chainable")
	_check(not BML.cell_frozen(st, other), "cell_frozen false for a non-frozen column")

# ── rubble_blocks ──────────────────────────────────────────────────────────────

func _test_rubble_blocks() -> void:
	var mod := {"type": "rubble_blocks", "params": {"count": 4}}
	var st := BML.apply_to_fresh_grid(mod, 6, 6, _rng())
	_check(st.has("rubble"), "rubble_blocks yields a rubble key")
	var cells: Array = st["rubble"]
	_check(cells.size() == 4, "rubble_blocks picks exactly count=4 cells")
	# Distinct cells (Fisher-Yates over the full grid never repeats).
	var seen := {}
	var distinct := true
	for cell in cells:
		var k := "%d,%d" % [int(cell["row"]), int(cell["col"])]
		if seen.has(k):
			distinct = false
		seen[k] = true
	_check(distinct, "the 4 rubble cells are distinct")
	var r0: int = int(cells[0]["row"])
	var c0: int = int(cells[0]["col"])
	_check(not BML.cell_chainable(st, r0, c0), "a rubble cell is NOT chainable")
	_check(BML.cell_rubble(st, r0, c0), "cell_rubble true on a rubble cell")

# ── hide_resources ─────────────────────────────────────────────────────────────

func _test_hide_resources() -> void:
	var mod := {"type": "hide_resources", "params": {"hidden": 4}}
	var st := BML.apply_to_fresh_grid(mod, 6, 6, _rng())
	_check(st.has("hidden"), "hide_resources yields a hidden key")
	var cells: Array = st["hidden"]
	_check(cells.size() == 4, "hide_resources picks exactly hidden=4 cells")
	var r0: int = int(cells[0]["row"])
	var c0: int = int(cells[0]["col"])
	_check(not BML.cell_chainable(st, r0, c0), "a hidden cell is NOT chainable")
	_check(BML.cell_hidden(st, r0, c0), "cell_hidden true on a hidden cell")

# ── heat_tiles ─────────────────────────────────────────────────────────────────

func _test_heat_tiles() -> void:
	var mod := {"type": "heat_tiles", "params": {"spawnPerTurn": 1, "burnAfter": 2}}
	var st := BML.apply_to_fresh_grid(mod, 6, 6, _rng())
	_check(st.has("heat") and (st["heat"] as Array).is_empty(), "heat_tiles starts with an EMPTY heat list (spawns per turn)")

	# Spawn one heat tile — it lands at age 0 and is chainable (heat tiles are chainable; the cost is the burn).
	var rng := _rng()
	var spawned := BML.spawn_heat(st, 6, 6, 1, rng)
	_check(spawned.size() == 1, "spawn_heat adds one cell")
	_check((st["heat"] as Array).size() == 1, "the heat list now holds one entry")
	var h0: Dictionary = (st["heat"] as Array)[0]
	_check(BML.cell_heat(st, int(h0["row"]), int(h0["col"])), "cell_heat true on the spawned heat cell")
	_check(BML.cell_chainable(st, int(h0["row"]), int(h0["col"])), "a heat cell stays CHAINABLE")

	# Tick burn: a fresh heat (age 0) with burnAfter 2 survives two ticks (0→1, 1→2), burns on the third (2→3 > 2).
	var inv := {"flour": 5, "eggs": 2}
	var b1 := BML.tick_heat(st, 2, inv, rng)   # age 0 → 1, survives
	_check(b1 == 0, "tick 1: heat age 0→1 burns nothing (1 <= burnAfter 2)")
	_check((st["heat"] as Array).size() == 1, "tick 1: heat cell survives")
	var b2 := BML.tick_heat(st, 2, inv, rng)   # age 1 → 2, survives
	_check(b2 == 0, "tick 2: heat age 1→2 burns nothing (2 <= burnAfter 2)")
	_check((st["heat"] as Array).size() == 1, "tick 2: heat cell survives")
	var total_before: int = int(inv.get("flour", 0)) + int(inv.get("eggs", 0))
	var b3 := BML.tick_heat(st, 2, inv, rng)   # age 2 → 3 > 2, BURNS one item, cell consumed
	_check(b3 == 1, "tick 3: heat age 2→3 (>2) burns ONE inventory item")
	_check((st["heat"] as Array).is_empty(), "tick 3: the burned heat cell is consumed")
	var total_after: int = int(inv.get("flour", 0)) + int(inv.get("eggs", 0))
	_check(total_after == total_before - 1, "tick 3: exactly one inventory unit was removed")

	# Burn with an EMPTY inventory burns nothing (no crash).
	var st2 := {"heat": [{"row": 0, "col": 0, "age": 5}]}
	var empty_inv := {}
	var b_empty := BML.tick_heat(st2, 2, empty_inv, rng)
	_check(b_empty == 0, "tick with empty inventory burns nothing (and the cell is still consumed)")

# ── respawn_boost ──────────────────────────────────────────────────────────────

func _test_respawn_boost() -> void:
	var mod := {"type": "respawn_boost", "params": {"boost": ["tile_tree_oak", "tile_grass_grass"], "factor": 1.5}}
	var st := BML.apply_to_fresh_grid(mod, 6, 6, _rng())
	_check(st.get("boost", []) == ["tile_tree_oak", "tile_grass_grass"], "respawn_boost carries the boost list")
	_check(abs(float(st.get("factor", 0.0)) - 1.5) < 0.001, "respawn_boost carries factor 1.5")
	var bias := BML.spawn_bias(st)
	_check(abs(float(bias.get("tile_tree_oak", 0.0)) - 1.5) < 0.001, "spawn_bias maps oak → 1.5")
	_check(abs(float(bias.get("tile_grass_grass", 0.0)) - 1.5) < 0.001, "spawn_bias maps grass → 1.5")
	# A non-boost modifier yields no bias.
	var st_freeze := BML.apply_to_fresh_grid({"type": "freeze_columns", "params": {"n": 2}}, 6, 6, _rng())
	_check(BML.spawn_bias(st_freeze).is_empty(), "a non-respawn_boost modifier yields an empty spawn_bias")

# ── chainable queries (empty state = everything chainable) ───────────────────────

func _test_chainable_queries() -> void:
	_check(BML.cell_chainable({}, 0, 0), "empty modifier_state: every cell chainable")
	_check(not BML.cell_frozen({}, 0), "empty modifier_state: no frozen columns")
	_check(not BML.cell_hidden({}, 0, 0), "empty modifier_state: no hidden cells")
	_check(not BML.cell_heat({}, 0, 0), "empty modifier_state: no heat cells")
	_check(not BML.cell_rubble({}, 0, 0), "empty modifier_state: no rubble cells")

# ── reveal (all + single) ────────────────────────────────────────────────────────

func _test_reveal() -> void:
	var st := {"hidden": [{"row": 1, "col": 1}, {"row": 2, "col": 3}, {"row": 4, "col": 0}]}
	# Reveal a single cell that IS hidden.
	_check(BML.reveal_cell(st, 1, 1), "reveal_cell returns true for a hidden cell")
	_check(not BML.cell_hidden(st, 1, 1), "the revealed cell is no longer hidden")
	_check((st["hidden"] as Array).size() == 2, "reveal_cell removed exactly one hidden entry")
	# Reveal a cell that ISN'T hidden → no-op false.
	_check(not BML.reveal_cell(st, 5, 5, ), "reveal_cell returns false for a non-hidden cell")
	# Reveal ALL — returns what was hidden, clears the list.
	var was := BML.reveal_all(st)
	_check(was.size() == 2, "reveal_all returns the 2 remaining hidden cells")
	_check((st["hidden"] as Array).is_empty(), "reveal_all clears the hidden list")
	_check(BML.reveal_all(st).is_empty(), "reveal_all on a now-empty hidden list returns []")

# ── min_chain + unknown modifier ─────────────────────────────────────────────────

func _test_min_chain_and_unknown() -> void:
	var st := BML.apply_to_fresh_grid({"type": "min_chain", "params": {"length": 4}}, 6, 6, _rng())
	_check(st.is_empty(), "min_chain yields an EMPTY board overlay (the bar is read off the boss)")
	_check(BML.cell_chainable(st, 0, 0), "min_chain leaves every cell chainable (it's a chain-length gate, not a cell gate)")
	var unk := BML.apply_to_fresh_grid({"type": "nonsense", "params": {}}, 6, 6, _rng())
	_check(unk.is_empty(), "an unknown modifier type yields an empty overlay")
	# clear() always returns an empty bag.
	_check(BML.clear({"frozen_columns": [1, 2], "heat": [{"row": 0, "col": 0, "age": 1}]}).is_empty(),
		"clear() strips every overlay → empty bag")
