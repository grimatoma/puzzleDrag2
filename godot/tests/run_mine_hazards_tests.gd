extends SceneTree
## Headless unit-test runner for the MINE HAZARDS port (T11 cave_in / gas_vent / lava / mole + the
## T14b water_pump / explosives tools). Covers the pure MineHazardLogic (deterministic, seeded RNG):
## the mine-only spawn gate + 5% base rate + single-active cap + weighted pick; gas countdown →
## cost-a-turn + disperse-by-chain; lava spread + blocks; mole consume + hop; cave_in buried row +
## clear-by-stone-chain-adjacent; tile_blocked_by_hazard; the water_pump / explosives effects; and
## the GameState mine-hazard save/load round-trip + tool wiring. Run from godot/:
##   godot --headless --script res://tests/run_mine_hazards_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as run_farm_hazards_tests.gd. `class_name` globals are aliased
## with `var` (not const) because a class_name ref is not a constant expression in 4.6.

const T := Constants.Tile
var MHL := MineHazardLogic
var TC := TownConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Mine hazards (cave_in / gas / lava / mole) tests ─")
	_test_constants_and_tiles()
	_test_tile_blocked()
	_test_spawn_gate_and_rate()
	_test_spawn_single_active_and_boss()
	_test_weighted_pick()
	_test_gas_countdown_and_cost()
	_test_gas_disperse_by_chain()
	_test_lava_spread_and_block()
	_test_mole_consume_and_hop()
	_test_cave_in_clear_by_stone()
	_test_water_pump()
	_test_explosives()
	_test_gamestate_tick_and_tools()
	_test_save_load()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── helpers ────────────────────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

## A seeded RNG (deterministic). `s` selects the stream.
func _rng(s: int) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = s
	return r

## A full 6x6 grid of a single tile (default STONE — the mine staple).
func _grid(fill: int = T.STONE) -> Array:
	var g: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(fill)
		g.append(row)
	return g

func _count(grid: Array, tile: int) -> int:
	var n := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if int(grid[r][c]) == tile:
				n += 1
	return n

## A GameState parked IN the mine with `turns` expedition turns (sets biome + turns directly).
func _mine_state(turns: int = 5) -> GameState:
	var g := GameState.new()
	g.active_biome = "mine"
	g.mine_turns_left = turns
	return g

# ── constants + tile catalog ────────────────────────────────────────────────────

func _test_constants_and_tiles() -> void:
	_check(Constants.MINE_HAZARD_BASE_RATE == 0.05, "MINE_HAZARD_BASE_RATE == 0.05")
	_check(int(Constants.MINE_HAZARD_WEIGHTS["cave_in"]) == 25, "cave_in weight 25")
	_check(int(Constants.MINE_HAZARD_WEIGHTS["gas_vent"]) == 40, "gas_vent weight 40")
	_check(int(Constants.MINE_HAZARD_WEIGHTS["lava"]) == 20, "lava weight 20")
	_check(int(Constants.MINE_HAZARD_WEIGHTS["mole"]) == 15, "mole weight 15")
	_check(Constants.GAS_VENT_TURNS == 3, "GAS_VENT_TURNS == 3")
	_check(Constants.MOLE_TURNS == 3, "MOLE_TURNS == 3")
	# Tiles produce nothing (board-only hazards).
	_check(Constants.produced_resource(T.LAVA) == "", "LAVA produces nothing")
	_check(Constants.produced_resource(T.GAS) == "", "GAS produces nothing")
	_check(Constants.produced_resource(T.MYSTERIOUS_ORE) == "", "MYSTERIOUS_ORE produces nothing")
	_check(Constants.threshold_for(T.LAVA) == Constants.NO_THRESHOLD, "LAVA has NO_THRESHOLD")
	_check(Constants.threshold_for(T.MYSTERIOUS_ORE) == Constants.NO_THRESHOLD, "MYSTERIOUS_ORE has NO_THRESHOLD")
	# String keys mirror the React board keys.
	_check(Constants.string_key(T.LAVA) == "lava", "LAVA key 'lava'")
	_check(Constants.string_key(T.GAS) == "gas", "GAS key 'gas'")
	_check(Constants.string_key(T.MYSTERIOUS_ORE) == "mysterious_ore", "MYSTERIOUS_ORE key 'mysterious_ore'")
	# color_for never returns the MAGENTA unknown sentinel for the new tiles.
	_check(Constants.color_for(T.LAVA) != Color.MAGENTA, "LAVA has a real color")
	_check(Constants.color_for(T.GAS) != Color.MAGENTA, "GAS has a real color")
	_check(Constants.color_for(T.MYSTERIOUS_ORE) != Color.MAGENTA, "MYSTERIOUS_ORE has a real color")

# ── tile_blocked_by_hazard (hazards.ts:157) ──────────────────────────────────────

func _test_tile_blocked() -> void:
	_check(MHL.tile_blocked_by_hazard(T.RUBBLE), "RUBBLE is blocked")
	_check(MHL.tile_blocked_by_hazard(T.LAVA), "LAVA is blocked")
	_check(not MHL.tile_blocked_by_hazard(T.GAS), "GAS is NOT blocked (chainable counter)")
	_check(not MHL.tile_blocked_by_hazard(T.MYSTERIOUS_ORE), "MYSTERIOUS_ORE is NOT blocked (chainable)")
	_check(not MHL.tile_blocked_by_hazard(T.STONE), "STONE is not blocked")

# ── spawn gate + base rate (hazards.ts rollHazard) ───────────────────────────────

func _test_spawn_gate_and_rate() -> void:
	var mh: Dictionary = MHL.default_state()
	# Not in the mine → never spawns.
	_check(MHL.roll_mine_hazard(mh, false, false, _rng(1)).is_empty(), "off the mine: no spawn")
	# In the mine but the base-rate roll missed (a seed whose first randf >= 0.05).
	# Find a seed that misses: randf() is deterministic per seed; we just assert the gate is
	# RESPECTED by forcing a high-threshold situation. A miss returns {}.
	var miss := false
	for s in range(1, 40):
		if MHL.roll_mine_hazard(mh, true, false, _rng(s)).is_empty():
			miss = true
			break
	_check(miss, "in the mine: some seeds miss the 5% rate (no spawn)")
	# And some seeds HIT (the rate is reachable).
	var hit := false
	for s in range(1, 400):
		if not MHL.roll_mine_hazard(mh, true, false, _rng(s)).is_empty():
			hit = true
			break
	_check(hit, "in the mine: some seeds hit the 5% rate (a spawn occurs)")

func _test_spawn_single_active_and_boss() -> void:
	# A boss active → never spawns even in the mine.
	var mh: Dictionary = MHL.default_state()
	var any_with_boss := false
	for s in range(1, 200):
		if not MHL.roll_mine_hazard(mh, true, true, _rng(s)).is_empty():
			any_with_boss = true
			break
	_check(not any_with_boss, "boss active: no mine hazard spawns")
	# A hazard already active → single-active cap blocks a new spawn.
	var mh_active: Dictionary = {"cave_in": {"row": 2}, "gas_vent": {}, "lava": {}, "mole": {}}
	_check(MHL.any_active(mh_active), "cave_in counts as active")
	var any_when_active := false
	for s in range(1, 200):
		if not MHL.roll_mine_hazard(mh_active, true, false, _rng(s)).is_empty():
			any_when_active = true
			break
	_check(not any_when_active, "single-active cap: no spawn while one hazard is live")

func _test_weighted_pick() -> void:
	# Over many seeds (forcing past the rate by sampling many), all four hazard ids appear.
	var mh: Dictionary = MHL.default_state()
	var seen: Dictionary = {}
	for s in range(1, 4000):
		var sp: Dictionary = MHL.roll_mine_hazard(mh, true, false, _rng(s))
		if not sp.is_empty():
			seen[String(sp.get("id", ""))] = true
	_check(seen.has("cave_in"), "weighted pick yields cave_in over many seeds")
	_check(seen.has("gas_vent"), "weighted pick yields gas_vent over many seeds")
	_check(seen.has("lava"), "weighted pick yields lava over many seeds")
	_check(seen.has("mole"), "weighted pick yields mole over many seeds")
	# gas_vent (weight 40) should be the MOST common — a sanity check on the weighting.
	var counts: Dictionary = {"cave_in": 0, "gas_vent": 0, "lava": 0, "mole": 0}
	for s in range(1, 4000):
		var sp: Dictionary = MHL.roll_mine_hazard(mh, true, false, _rng(s))
		if not sp.is_empty():
			counts[String(sp.get("id", ""))] += 1
	_check(int(counts["gas_vent"]) >= int(counts["mole"]), "gas_vent (w40) at least as common as mole (w15)")

# ── gas vent (hazards.ts _tickGasVent) ───────────────────────────────────────────

func _test_gas_countdown_and_cost() -> void:
	# A gas vent at (2,2) with 3 turns: ticks 3→2→1, then EXPIRES (cost a turn + clears the GAS cell).
	var grid := _grid(T.STONE)
	grid[2][2] = T.GAS
	var mh: Dictionary = {"cave_in": {}, "gas_vent": {"row": 2, "col": 2, "turns_remaining": 3}, "lava": {}, "mole": {}}
	var r := _rng(7)
	var t1 := MHL.tick_mine_hazards(grid, mh, r)
	_check(int(MHL.gas_vent_of(t1["mine_hazards"]).get("turns_remaining", 0)) == 2, "gas 3 → 2")
	_check(not bool(t1.get("gas_cost_turn", false)), "gas tick (rem 2): no turn cost yet")
	var t2 := MHL.tick_mine_hazards(t1["grid"], t1["mine_hazards"], r)
	_check(int(MHL.gas_vent_of(t2["mine_hazards"]).get("turns_remaining", 0)) == 1, "gas 2 → 1")
	var t3 := MHL.tick_mine_hazards(t2["grid"], t2["mine_hazards"], r)
	_check(MHL.gas_vent_of(t3["mine_hazards"]).is_empty(), "gas expires at 0 (cleared)")
	_check(bool(t3.get("gas_cost_turn", false)), "gas expiry COSTS a turn")
	_check(String(t3.get("floater", "")) == "You cough through it.", "gas expiry floater 'You cough through it.'")
	_check(int(t3["grid"][2][2]) != T.GAS, "gas cell cleared off the board on expiry")

func _test_gas_disperse_by_chain() -> void:
	# Chaining THROUGH the gas cell disperses the vent (no turn cost) before its timer expires.
	var mh: Dictionary = {"cave_in": {}, "gas_vent": {"row": 1, "col": 1, "turns_remaining": 2}, "lava": {}, "mole": {}}
	# A chain that does NOT include the gas tile → no disperse.
	var chain_miss: Array = [{"row": 4, "col": 0, "tile": T.STONE}, {"row": 4, "col": 1, "tile": T.STONE}, {"row": 4, "col": 2, "tile": T.STONE}]
	var miss := MHL.disperse_gas(mh, chain_miss)
	_check(not bool(miss.get("ok", false)), "chain not touching gas: no disperse")
	# A chain that DOES include the gas tile → disperse.
	var chain_hit: Array = [{"row": 1, "col": 1, "tile": T.GAS}, {"row": 1, "col": 2, "tile": T.GAS}]
	var hit := MHL.disperse_gas(mh, chain_hit)
	_check(bool(hit.get("ok", false)), "chain through gas: dispersed")
	_check(MHL.gas_vent_of(hit["mine_hazards"]).is_empty(), "gas vent cleared after disperse")

# ── lava (hazards.ts _tickLava) ──────────────────────────────────────────────────

func _test_lava_spread_and_block() -> void:
	# A single lava cell spreads to ONE orthogonal neighbour per tick (stamping LAVA there).
	var grid := _grid(T.STONE)
	grid[2][2] = T.LAVA
	var mh: Dictionary = {"cave_in": {}, "gas_vent": {}, "lava": {"cells": [{"row": 2, "col": 2}]}, "mole": {}}
	var before := _count(grid, T.LAVA)
	var t := MHL.tick_mine_hazards(grid, mh, _rng(3))
	var after := _count(t["grid"], T.LAVA)
	_check(after == before + 1, "lava spreads to exactly one new cell per tick")
	_check(MHL.lava_cells_of(t["mine_hazards"]).size() == 2, "lava hazard now tracks 2 cells")
	# The spread cell is orthogonally adjacent to the seed.
	var cells: Array = MHL.lava_cells_of(t["mine_hazards"])
	var new_cell: Dictionary = cells[1]
	var dr: int = absi(int(new_cell.get("row", -9)) - 2)
	var dc: int = absi(int(new_cell.get("col", -9)) - 2)
	_check((dr + dc) == 1, "lava spread cell is orthogonally adjacent to the seed")

# ── mole (hazards.ts _tickMole) ──────────────────────────────────────────────────

func _test_mole_consume_and_hop() -> void:
	# A mole at (2,2) with turns 3 consumes one adjacent tile (→ EMPTY) and decrements to 2.
	var grid := _grid(T.STONE)
	var mh: Dictionary = {"cave_in": {}, "gas_vent": {}, "lava": {}, "mole": {"row": 2, "col": 2, "turns_remaining": 3}}
	var t1 := MHL.tick_mine_hazards(grid, mh, _rng(5))
	_check(_count(t1["grid"], Constants.EMPTY) == 1, "mole consumes exactly one adjacent tile")
	_check(int(MHL.mole_of(t1["mine_hazards"]).get("turns_remaining", -1)) == 2, "mole timer 3 → 2")
	# Drain to 0, then the next tick HOPS (resets to MOLE_TURNS, no consume).
	var t2 := MHL.tick_mine_hazards(t1["grid"], t1["mine_hazards"], _rng(5))   # 2 → 1
	var t3 := MHL.tick_mine_hazards(t2["grid"], t2["mine_hazards"], _rng(5))   # 1 → 0
	_check(int(MHL.mole_of(t3["mine_hazards"]).get("turns_remaining", -1)) == 0, "mole timer reaches 0")
	var t4 := MHL.tick_mine_hazards(t3["grid"], t3["mine_hazards"], _rng(5))   # 0 → hop, reset to 3
	var hopped := MHL.mole_of(t4["mine_hazards"])
	_check(int(hopped.get("turns_remaining", -1)) == Constants.MOLE_TURNS, "mole hop resets timer to MOLE_TURNS")
	# After the hop the mole is at a (possibly) new cell; the timer reset is the key signal.

# ── cave-in clear (hazards.ts clearCaveIn) ───────────────────────────────────────

func _test_cave_in_clear_by_stone() -> void:
	# Cave-in buried row 3. A 3+ STONE chain with a cell in row 2 or row 4 (adjacent) clears it.
	var mh: Dictionary = {"cave_in": {"row": 3}, "gas_vent": {}, "lava": {}, "mole": {}}
	# Too-few stone → no clear.
	var short_chain: Array = [{"row": 2, "col": 0, "tile": T.STONE}, {"row": 2, "col": 1, "tile": T.STONE}]
	_check(not bool(MHL.clear_cave_in(mh, short_chain).get("ok", false)), "2-stone chain does NOT clear cave-in")
	# 3 stone but NOT adjacent to the buried row → no clear.
	var far_chain: Array = [{"row": 0, "col": 0, "tile": T.STONE}, {"row": 0, "col": 1, "tile": T.STONE}, {"row": 0, "col": 2, "tile": T.STONE}]
	_check(not bool(MHL.clear_cave_in(mh, far_chain).get("ok", false)), "3-stone chain far from the row does NOT clear")
	# 3 stone in row 2 (adjacent to buried row 3) → clears.
	var good_chain: Array = [{"row": 2, "col": 0, "tile": T.STONE}, {"row": 2, "col": 1, "tile": T.STONE}, {"row": 2, "col": 2, "tile": T.STONE}]
	var ok := MHL.clear_cave_in(mh, good_chain)
	_check(bool(ok.get("ok", false)), "3-stone chain adjacent to the buried row clears the cave-in")
	_check(MHL.cave_in_of(ok["mine_hazards"]).is_empty(), "cave-in cleared after a valid stone chain")
	# A non-STONE chain adjacent to the row does NOT clear.
	var iron_chain: Array = [{"row": 2, "col": 0, "tile": T.IRON_ORE}, {"row": 2, "col": 1, "tile": T.IRON_ORE}, {"row": 2, "col": 2, "tile": T.IRON_ORE}]
	_check(not bool(MHL.clear_cave_in(mh, iron_chain).get("ok", false)), "non-stone chain does NOT clear cave-in")

# ── water_pump / explosives (toolPowerRuntime.ts) ────────────────────────────────

func _test_water_pump() -> void:
	# Water Pump floods every LAVA cell → RUBBLE + clears the lava hazard.
	var grid := _grid(T.STONE)
	grid[2][2] = T.LAVA
	grid[2][3] = T.LAVA
	var mh: Dictionary = {"cave_in": {}, "gas_vent": {}, "lava": {"cells": [{"row": 2, "col": 2}, {"row": 2, "col": 3}]}, "mole": {}}
	var wp := MHL.apply_water_pump(grid, mh)
	_check(int(wp.get("cleared", 0)) == 2, "water pump clears both lava cells")
	_check(_count(wp["grid"], T.LAVA) == 0, "no LAVA tiles remain after water pump")
	_check(int(wp["grid"][2][2]) == T.RUBBLE and int(wp["grid"][2][3]) == T.RUBBLE, "lava cells become RUBBLE")
	_check(MHL.lava_cells_of(wp["mine_hazards"]).is_empty(), "lava hazard cleared after water pump")

func _test_explosives() -> void:
	# Explosives clears the cave_in (un-buries its RUBBLE row → EMPTY) + the mole hazard.
	var grid := _grid(T.STONE)
	for c in Constants.COLS:
		grid[3][c] = T.RUBBLE   # the buried cave-in row
	var mh: Dictionary = {"cave_in": {"row": 3}, "gas_vent": {}, "lava": {}, "mole": {"row": 1, "col": 1, "turns_remaining": 2}}
	var ex := MHL.apply_explosives(grid, mh)
	_check(int(ex.get("cleared", 0)) == 2, "explosives clears 2 hazards (cave-in + mole)")
	_check(MHL.cave_in_of(ex["mine_hazards"]).is_empty(), "cave-in cleared after explosives")
	_check(MHL.mole_of(ex["mine_hazards"]).is_empty(), "mole cleared after explosives")
	# The buried row's RUBBLE is blanked (the caller collapses/refills it).
	var row3_rubble := 0
	for c in Constants.COLS:
		if int(ex["grid"][3][c]) == T.RUBBLE:
			row3_rubble += 1
	_check(row3_rubble == 0, "explosives un-buries the cave-in rubble row")

# ── GameState tick + tools wiring ────────────────────────────────────────────────

func _test_gamestate_tick_and_tools() -> void:
	# tick_mine_hazards is a no-op off the mine.
	var farm := GameState.new()
	var fr := farm.tick_mine_hazards(_grid(T.GRASS), _rng(1))
	_check(not bool(fr.get("changed", false)), "tick_mine_hazards is a no-op on the farm")
	# A mine GameState ticks its live gas vent down + costs a turn on expiry.
	var g := _mine_state(5)
	g.mine_hazards = {"cave_in": {}, "gas_vent": {"row": 0, "col": 0, "turns_remaining": 1}, "lava": {}, "mole": {}}
	var grid := _grid(T.STONE)
	grid[0][0] = T.GAS
	var tr := g.tick_mine_hazards(grid, _rng(9))
	_check(bool(tr.get("gas_cost_turn", false)), "GameState.tick_mine_hazards reports the gas turn cost")
	_check(g.active_gas_vent().is_empty(), "GameState gas vent cleared after expiry")
	# Water Pump tool via use_tool_on_grid (a STATE power on mine_hazards + grid).
	var g2 := _mine_state(5)
	g2.mine_hazards = {"cave_in": {}, "gas_vent": {}, "lava": {"cells": [{"row": 3, "col": 3}]}, "mole": {}}
	var grid2 := _grid(T.STONE)
	grid2[3][3] = T.LAVA
	g2.grant_tool(ToolConfig.WATER_PUMP, 1)
	var wp := g2.use_tool_on_grid(ToolConfig.WATER_PUMP, grid2)
	_check(bool(wp.get("ok", false)), "water_pump tool fires through use_tool_on_grid")
	_check(g2.active_lava_cells().is_empty(), "water_pump tool clears the lava hazard")
	_check(g2.tool_count(ToolConfig.WATER_PUMP) == 0, "water_pump consumed a charge")
	_check(int(wp["grid"][3][3]) == T.RUBBLE, "water_pump returned grid has lava → rubble")
	# Explosives tool clears cave-in + mole.
	var g3 := _mine_state(5)
	g3.mine_hazards = {"cave_in": {"row": 2}, "gas_vent": {}, "lava": {}, "mole": {"row": 4, "col": 4, "turns_remaining": 1}}
	g3.grant_tool(ToolConfig.EXPLOSIVES, 1)
	var ex := g3.use_tool_on_grid(ToolConfig.EXPLOSIVES, _grid(T.STONE))
	_check(bool(ex.get("ok", false)), "explosives tool fires through use_tool_on_grid")
	_check(g3.active_cave_in().is_empty() and g3.active_mole().is_empty(), "explosives tool clears cave-in + mole")
	# Cave-in clear by a stone chain through GameState.
	var g4 := _mine_state(5)
	g4.mine_hazards = {"cave_in": {"row": 3}, "gas_vent": {}, "lava": {}, "mole": {}}
	var chain: Array = [{"row": 2, "col": 0, "tile": T.STONE}, {"row": 2, "col": 1, "tile": T.STONE}, {"row": 2, "col": 2, "tile": T.STONE}]
	_check(bool(g4.clear_cave_in_chain(chain).get("ok", false)), "GameState.clear_cave_in_chain clears via stone chain")
	_check(g4.active_cave_in().is_empty(), "GameState cave-in cleared after the stone chain")
	# Leaving the mine clears all mine hazards.
	var g5 := _mine_state(5)
	g5.mine_hazards = {"cave_in": {"row": 1}, "gas_vent": {}, "lava": {}, "mole": {}}
	g5.leave_mine()
	_check(not MHL.any_active(g5.mine_hazards), "leave_mine clears all mine hazards")

# ── save / load round-trip ───────────────────────────────────────────────────────

func _test_save_load() -> void:
	var g := _mine_state(4)
	g.mine_hazards = {
		"cave_in": {"row": 2},
		"gas_vent": {},
		"lava": {"cells": [{"row": 1, "col": 1}, {"row": 1, "col": 2}]},
		"mole": {"row": 5, "col": 5, "turns_remaining": 2},
	}
	var loaded := GameState.from_dict(g.to_dict())
	_check(int(loaded.active_cave_in().get("row", -1)) == 2, "save/load preserves cave_in row")
	_check(loaded.active_lava_cells().size() == 2, "save/load preserves lava cells")
	_check(int(loaded.active_mole().get("turns_remaining", -1)) == 2, "save/load preserves mole timer")
	# A non-mine save drops the mine hazards (they can never bleed onto the farm).
	var farm := GameState.new()
	farm.active_biome = "farm"
	var d := g.to_dict()
	d["active_biome"] = "farm"
	d["mine_turns_left"] = 0
	var loaded_farm := GameState.from_dict(d)
	_check(not MHL.any_active(loaded_farm.mine_hazards), "non-mine save loads with no mine hazards")
	# normalise drops malformed / out-of-range entries.
	var corrupt := MHL.normalise({"cave_in": {"row": 99}, "lava": {"cells": [{"row": -1, "col": 0}]}})
	_check(MHL.cave_in_of(corrupt).is_empty(), "normalise drops an out-of-range cave_in row")
	_check(MHL.lava_cells_of(corrupt).is_empty(), "normalise drops out-of-range lava cells")
