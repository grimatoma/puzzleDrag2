extends SceneTree
## Headless unit-test runner for the FARM HAZARDS port (T7 fire / T8 wolves / T9 rats + T10 tags).
## Covers the pure HazardLogic (deterministic, seeded RNG): rat spawn gate + cap + tick-eat
## (plant blanked, avoids_rats skipped, deadly_pests cull) + chain-3 clear reward; wolf spawn
## gate + tick-eat-bird + scared countdown + rifle clears + hound scatters; fire spawn gated OFF
## by default + (force-enabled) spread + extinguish reward; the single-active cap; and the
## GameState hazards save/load round-trip + the rifle/hound tool wiring. Run from godot/:
##   godot --headless --script res://tests/run_farm_hazards_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as run_rats_tests.gd. `class_name` globals are aliased with
## `var` (not const) because a class_name ref is not a constant expression in 4.6.

const T := Constants.Tile
var HL := HazardLogic
var TC := TownConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Farm hazards (rats / fire / wolves) tests ───────")
	_test_tags()
	_test_attracts_rats_rate()
	_test_rat_spawn_gate_and_cap()
	_test_rat_tick_eat()
	_test_rat_chain_clear()
	_test_deadly_pests()
	_test_fire_gated_off()
	_test_fire_spread_and_extinguish()
	_test_wolf_spawn_gate()
	_test_wolf_tick_eat_and_scared()
	_test_single_active_cap()
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

## A full 6x6 grid of a single tile (default GRASS).
func _grid(fill: int = T.GRASS) -> Array:
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

func _empties(grid: Array) -> int:
	return _count(grid, Constants.EMPTY)

# ── T10 tags ────────────────────────────────────────────────────────────────────

func _test_tags() -> void:
	_check(HL.has_tag(T.GRAIN_MANNA, "attracts_rats"), "Manna attracts_rats")
	_check(HL.has_tag(T.FRUIT_JACKFRUIT, "attracts_rats"), "Jackfruit attracts_rats")
	_check(HL.has_tag(T.WHEAT, "avoids_rats"), "Wheat avoids_rats")
	_check(HL.has_tag(T.TREE_CYPRESS, "avoids_rats"), "Cypress avoids_rats")
	_check(HL.has_tag(T.TREE_CYPRESS, "deadly_pests"), "Cypress deadly_pests (dual tag)")
	_check(HL.has_tag(T.VEG_BEET, "deadly_pests"), "Beet deadly_pests")
	_check(HL.has_tag(T.BIRD_PHOENIX, "deadly_pests"), "Phoenix deadly_pests")
	_check(not HL.has_tag(T.GRASS, "avoids_rats"), "Grass has no avoids_rats tag")
	# is_plant / is_bird
	_check(HL.is_plant(T.GRASS), "grass is a plant (eatable)")
	_check(not HL.is_plant(T.WHEAT), "wheat is NOT eatable (avoids_rats)")
	_check(HL.is_plant(T.FRUIT_BLACKBERRY), "blackberry is a plant")
	_check(HL.is_bird(T.PHEASANT), "pheasant is a bird (wolf-eatable)")
	_check(not HL.is_bird(T.GRASS), "grass is not a bird")

func _test_attracts_rats_rate() -> void:
	var g := _grid(T.GRASS)
	_check(is_equal_approx(HL.effective_rat_spawn_rate(0.10, g), 0.10), "no attractor tiles → base rate 0.10")
	g[0][0] = T.GRAIN_MANNA
	g[0][1] = T.FRUIT_JACKFRUIT
	_check(is_equal_approx(HL.effective_rat_spawn_rate(0.10, g), 0.20),
		"2 attractor tiles → 0.10 + 2×0.05 = 0.20")
	# Cap at 1.0.
	var full := _grid(T.GRAIN_MANNA)
	_check(HL.effective_rat_spawn_rate(0.10, full) == 1.0, "many attractors cap the rate at 1.0")

# ── T9 rats ──────────────────────────────────────────────────────────────────────

func _test_rat_spawn_gate_and_cap() -> void:
	var g := _grid(T.GRASS)
	var haz := HL.default_state()
	# Below threshold: no spawn even on a guaranteed-low roll.
	var none := HL.roll_rat_spawn(g, haz, 50, 99, _rng(1))
	_check(none.is_empty(), "hay==50 (not >50) → no rat spawn")
	none = HL.roll_rat_spawn(g, haz, 99, 50, _rng(1))
	_check(none.is_empty(), "flour==50 (not >50) → no rat spawn")
	# Above threshold + a forced low roll → a spawn. Seed search until we get one (rate 0.10).
	var got := {}
	for s in range(1, 400):
		got = HL.roll_rat_spawn(g, haz, 99, 99, _rng(s))
		if not got.is_empty():
			break
	_check(not got.is_empty(), "hay>50 AND flour>50 → a rat eventually spawns over seeds")
	if not got.is_empty():
		_check(int(got.get("age", -1)) == 0, "a freshly-spawned rat has age 0")
	# Cap: 4 active rats → never spawns.
	var capped := HL.default_state()
	capped["rats"] = [
		{"row": 0, "col": 0, "age": 0}, {"row": 0, "col": 1, "age": 0},
		{"row": 0, "col": 2, "age": 0}, {"row": 0, "col": 3, "age": 0},
	]
	var blocked := HL.roll_rat_spawn(g, capped, 99, 99, _rng(5))
	_check(blocked.is_empty(), "cap RAT_MAX_ACTIVE (4) → no further spawn")
	# Statistical spawn rate ~10% over many seeds.
	var hits := 0
	for s in range(0, 2000):
		if not HL.roll_rat_spawn(_grid(T.GRASS), HL.default_state(), 99, 99, _rng(s)).is_empty():
			hits += 1
	_check(hits > 100 and hits < 320, "rat spawn rate ~10%% over 2000 seeds (got %d)" % hits)

func _test_rat_tick_eat() -> void:
	# Rat at (1,1) with a grass plant above it and wheat (avoids_rats) below it. The rat eats
	# the FIRST eligible neighbour (up,down,left,right order → up = grass).
	var g := _grid(T.WHEAT)
	g[0][1] = T.GRASS              # above the rat — a plant
	g[1][1] = T.RAT
	var haz := HL.default_state()
	haz["rats"] = [{"row": 1, "col": 1, "age": 0}]
	var res := HL.tick_rats(g, haz)
	var ng: Array = res["grid"]
	_check(int(ng[0][1]) == Constants.EMPTY, "rat ate the adjacent grass (blanked to EMPTY)")
	_check(int(HL.rats_of(res["hazards"])[0].get("age", -1)) == 1, "rat aged +1 after the tick")
	# avoids_rats skip: a rat surrounded ONLY by wheat (avoids_rats) eats nothing but still ages.
	var g2 := _grid(T.WHEAT)
	g2[2][2] = T.RAT
	var haz2 := HL.default_state()
	haz2["rats"] = [{"row": 2, "col": 2, "age": 3}]
	var res2 := HL.tick_rats(g2, haz2)
	_check(_empties(res2["grid"]) == 0, "rat surrounded by wheat eats nothing (no blank — wheat avoids_rats)")
	_check(int(HL.rats_of(res2["hazards"])[0].get("age", -1)) == 4, "starving rat still ages +1")

func _test_rat_chain_clear() -> void:
	var haz := HL.default_state()
	haz["rats"] = [
		{"row": 1, "col": 1, "age": 1}, {"row": 1, "col": 2, "age": 1}, {"row": 1, "col": 3, "age": 1},
	]
	# A 3-rat chain clears them for +5×3 = 15 coins.
	var chain3 := [
		{"row": 1, "col": 1, "tile": T.RAT}, {"row": 1, "col": 2, "tile": T.RAT}, {"row": 1, "col": 3, "tile": T.RAT},
	]
	var ok := HL.try_clear_rat_chain(haz, chain3)
	_check(bool(ok.get("ok", false)), "3-rat chain is a valid clear")
	_check(int(ok.get("coins_delta", 0)) == 15, "3-rat clear pays 5×3 = 15 coins")
	_check(HL.rats_of(ok["hazards"]).is_empty(), "all 3 rats removed from hazards")
	# A 2-rat chain is rejected.
	var bad := HL.try_clear_rat_chain(haz, [{"row": 1, "col": 1}, {"row": 1, "col": 2}])
	_check(not bool(bad.get("ok", false)), "2-rat chain rejected (below 3)")

func _test_deadly_pests() -> void:
	# A Beet chain at (2,2)-(2,3)-(2,4) with a rat at (1,2) (adjacent to the chain) → culled.
	var haz := HL.default_state()
	haz["rats"] = [{"row": 1, "col": 2, "age": 0}, {"row": 5, "col": 5, "age": 0}]
	var chain := [
		{"row": 2, "col": 2, "tile": T.VEG_BEET},
		{"row": 2, "col": 3, "tile": T.VEG_BEET},
		{"row": 2, "col": 4, "tile": T.VEG_BEET},
	]
	var res := HL.try_deadly_pests_kill(haz, chain)
	_check(int(res.get("killed", 0)) == 1, "deadly_pests Beet chain culls the 1 adjacent rat")
	_check(int(res.get("coins_delta", 0)) == 5, "deadly cull pays 5 coins/rat")
	_check(HL.rats_of(res["hazards"]).size() == 1, "the far rat (5,5) survives the cull")
	# No deadly tile in the chain → no-op.
	var none := HL.try_deadly_pests_kill(haz, [{"row": 2, "col": 2, "tile": T.GRASS}])
	_check(int(none.get("killed", 0)) == 0, "a non-deadly chain culls nothing")

# ── T7 fire ──────────────────────────────────────────────────────────────────────

func _test_fire_gated_off() -> void:
	# Fire is OFF by default: roll_farm_hazard never returns a fire spawn when fire_enabled=false,
	# even on a guaranteed-low roll, even with no other hazard active.
	var any_fire := false
	for s in range(0, 500):
		var r := HL.roll_farm_hazard(_grid(T.GRASS), HL.default_state(), false, 0, 0, _rng(s))
		if String(r.get("kind", "")) == "fire":
			any_fire = true
			break
	_check(not any_fire, "fire NEVER spawns when fire_enabled=false (gated off by default)")
	# GameState mirrors this: a fresh GameState has fire_hazard_enabled() false.
	var g := GameState.new()
	_check(not g.fire_hazard_enabled(), "fresh GameState.fire_hazard_enabled() is false (matches React default-off)")
	g.fire_hazard_force = true
	_check(g.fire_hazard_enabled(), "fire_hazard_force=true force-enables fire (for tests/tuning)")

func _test_fire_spread_and_extinguish() -> void:
	# Force-enabled fire spawns ~4% over seeds.
	var fires := 0
	for s in range(0, 2000):
		var r := HL.roll_farm_hazard(_grid(T.GRASS), HL.default_state(), true, 0, 0, _rng(s))
		if String(r.get("kind", "")) == "fire":
			fires += 1
	_check(fires > 30 and fires < 140, "force-enabled fire spawns ~4%% over 2000 seeds (got %d)" % fires)
	# Spread: one fire cell spreads to an adjacent free cell when the roll is below 0.50. Search a
	# seed that spreads (rate 0.50, so most seeds do).
	var spread_seen := false
	for s in range(0, 50):
		var haz := HL.default_state()
		haz["fire"] = {"cells": [{"row": 2, "col": 2}]}
		var res := HL.tick_fire(_grid(T.GRASS), haz, _rng(s))
		if HL.fire_cells_of(res["hazards"]).size() == 2:
			# The spread cell's resource was burned to EMPTY.
			_check(_empties(res["grid"]) == 1, "fire spread burns the spread cell's resource (1 EMPTY)")
			spread_seen = true
			break
	_check(spread_seen, "fire spreads to a 2nd cell on a spreading seed")
	# Extinguish: chaining the 2 fire cells clears them for +2×2 = 4 coins.
	var ehaz := HL.default_state()
	ehaz["fire"] = {"cells": [{"row": 2, "col": 2}, {"row": 2, "col": 4}]}
	var ext := HL.try_extinguish_fire(ehaz, [{"row": 2, "col": 2}, {"row": 2, "col": 4}])
	_check(bool(ext.get("ok", false)), "chaining fire tiles extinguishes them")
	_check(int(ext.get("coins_delta", 0)) == 4, "extinguish pays 2×2 = 4 coins")
	_check(HL.fire_cells_of(ext["hazards"]).is_empty(), "fire cleared entirely (no cells remain)")
	# A chain with no fire is a no-op.
	var noext := HL.try_extinguish_fire(ehaz, [{"row": 0, "col": 0}])
	_check(not bool(noext.get("ok", false)), "a non-fire chain extinguishes nothing")

# ── T8 wolves ─────────────────────────────────────────────────────────────────────

func _test_wolf_spawn_gate() -> void:
	# Below the bird threshold (eggs<=30, no turkey): no wolf spawn.
	var below := false
	for s in range(0, 500):
		var r := HL.roll_farm_hazard(_grid(T.GRASS), HL.default_state(), false, 5, 0, _rng(s))
		if String(r.get("kind", "")) == "wolf":
			below = true
			break
	_check(not below, "no wolf spawn below the bird threshold (eggs=5)")
	# eggs>30 → wolves spawn ~6% over seeds.
	var wolves := 0
	for s in range(0, 2000):
		var r := HL.roll_farm_hazard(_grid(T.GRASS), HL.default_state(), false, 50, 0, _rng(s))
		if String(r.get("kind", "")) == "wolf":
			wolves += 1
	_check(wolves > 40 and wolves < 200, "wolves spawn ~6%% when eggs>30 over 2000 seeds (got %d)" % wolves)

func _test_wolf_tick_eat_and_scared() -> void:
	# A non-scared wolf at (1,1) with a bird (pheasant) above it eats it.
	var g := _grid(T.GRASS)
	g[0][1] = T.PHEASANT
	var haz := HL.default_state()
	haz["wolves"] = {"list": [{"row": 1, "col": 1, "scared": false}], "scared_turns": 0}
	var res := HL.tick_wolves(g, haz)
	_check(int(res["grid"][0][1]) == Constants.EMPTY, "non-scared wolf ate the adjacent bird")
	# A scared wolf eats nothing.
	var g2 := _grid(T.GRASS)
	g2[0][1] = T.PHEASANT
	var haz2 := HL.default_state()
	haz2["wolves"] = {"list": [{"row": 1, "col": 1, "scared": true}], "scared_turns": 5}
	var res2 := HL.tick_wolves(g2, haz2)
	_check(int(res2["grid"][0][1]) == T.PHEASANT, "scared wolf eats nothing")
	_check(int(HL.wolves_of(res2["hazards"]).get("scared_turns", -1)) == 4,
		"scared_turns decrements each tick (5 → 4)")
	# Scared countdown wears off after 5 ticks → wolf un-scares.
	var s := haz2
	for _i in 5:
		s = HL.tick_wolves(_grid(T.GRASS), s)["hazards"]
	_check(not bool(HL.wolves_list_of(s)[0].get("scared", true)), "wolf un-scares after 5 ticks")
	# Rifle clears, Hound scatters.
	var rifle_haz := HazardLogic.clear_wolves(haz)
	_check(HL.wolves_list_of(rifle_haz).is_empty(), "clear_wolves (Rifle) removes all wolves")
	var hound_haz := HazardLogic.scatter_wolves(haz)
	_check(bool(HL.wolves_list_of(hound_haz)[0].get("scared", false)), "scatter_wolves (Hound) scares wolves")
	_check(int(HL.wolves_of(hound_haz).get("scared_turns", -1)) == Constants.WOLF_SCARED_TURNS,
		"scatter_wolves arms scared_turns to WOLF_SCARED_TURNS (5)")

# ── single-active cap ──────────────────────────────────────────────────────────────

func _test_single_active_cap() -> void:
	# A rat already active → roll_farm_hazard never spawns fire/wolf (even force-enabled + rich).
	var haz := HL.default_state()
	haz["rats"] = [{"row": 0, "col": 0, "age": 0}]
	var any := false
	for s in range(0, 300):
		var r := HL.roll_farm_hazard(_grid(T.GRASS), haz, true, 99, 99, _rng(s))
		if not r.is_empty():
			any = true
			break
	_check(not any, "single-active cap: a live rat blocks any new fire/wolf spawn")

# ── GameState tick + tool wiring ────────────────────────────────────────────────────

func _test_gamestate_tick_and_tools() -> void:
	# Rifle clears wolves through use_tool_on_grid with no turn cost / no grid change.
	var g := GameState.new()
	g.hazards["wolves"] = {"list": [{"row": 1, "col": 1, "scared": false}], "scared_turns": 0}
	g.grant_tool(ToolConfig.RIFLE, 1)
	var grid := _grid(T.GRASS)
	var r := g.use_tool_on_grid(ToolConfig.RIFLE, grid)
	_check(bool(r.get("ok", false)), "Rifle use_tool_on_grid ok")
	_check(g.active_wolves().is_empty(), "Rifle cleared the wolves")
	_check(g.tool_count(ToolConfig.RIFLE) == 0, "Rifle consumed its charge")
	_check(r["grid"] == grid, "Rifle did not change the grid (wolves are overlays)")
	# Hound scatters wolves for 5 turns.
	var g2 := GameState.new()
	g2.hazards["wolves"] = {"list": [{"row": 1, "col": 1, "scared": false}], "scared_turns": 0}
	g2.grant_tool(ToolConfig.HOUND, 1)
	var r2 := g2.use_tool_on_grid(ToolConfig.HOUND, _grid(T.GRASS))
	_check(bool(r2.get("ok", false)), "Hound use_tool_on_grid ok")
	_check(bool(g2.active_wolves()[0].get("scared", false)), "Hound scattered (scared) the wolves")
	_check(int(HazardLogic.wolves_of(g2.hazards).get("scared_turns", -1)) == Constants.WOLF_SCARED_TURNS,
		"Hound armed scared_turns to 5")
	# tick_farm_hazards integration: a rat eats a plant and the grid reports changed.
	var g3 := GameState.new()
	g3.town2_complete = true                       # rats enabled
	var grid3 := _grid(T.WHEAT)
	grid3[0][1] = T.GRASS                           # a plant above the rat
	grid3[1][1] = T.RAT
	g3.hazards["rats"] = [{"row": 1, "col": 1, "age": 0}]
	var tr := g3.tick_farm_hazards(grid3, _rng(7))
	_check(bool(tr.get("changed", false)), "tick_farm_hazards reports changed when a rat eats")
	_check(int(tr["grid"][0][1]) == Constants.EMPTY, "tick_farm_hazards: the eaten plant is blanked on the grid")
	# A chain through rats clears them + credits coins via GameState.clear_rat_chain.
	var g4 := GameState.new()
	g4.coins = 0
	g4.hazards["rats"] = [
		{"row": 0, "col": 0, "age": 0}, {"row": 0, "col": 1, "age": 0}, {"row": 0, "col": 2, "age": 0},
	]
	var cr := g4.clear_rat_chain([
		{"row": 0, "col": 0, "tile": T.RAT}, {"row": 0, "col": 1, "tile": T.RAT}, {"row": 0, "col": 2, "tile": T.RAT},
	])
	_check(bool(cr.get("ok", false)) and g4.coins == 15, "GameState.clear_rat_chain pays 15 coins for 3 rats")

# ── save / load ─────────────────────────────────────────────────────────────────────

func _test_save_load() -> void:
	var g := GameState.new()
	g.hazards["rats"] = [{"row": 1, "col": 2, "age": 3}]
	g.hazards["fire"] = {"cells": [{"row": 0, "col": 0}]}
	g.hazards["wolves"] = {"list": [{"row": 4, "col": 5, "scared": true}], "scared_turns": 2}
	var d := g.to_dict()
	_check(d.has("hazards"), "to_dict carries the hazards key")
	var loaded := GameState.from_dict(d)
	_check(loaded.active_rats().size() == 1, "from_dict restores 1 rat")
	_check(int(loaded.active_rats()[0].get("age", -1)) == 3, "rat age round-trips (3)")
	_check(loaded.active_fire_cells().size() == 1, "from_dict restores 1 fire cell")
	_check(loaded.active_wolves().size() == 1, "from_dict restores 1 wolf")
	_check(bool(loaded.active_wolves()[0].get("scared", false)), "wolf scared flag round-trips")
	_check(int(HazardLogic.wolves_of(loaded.hazards).get("scared_turns", -1)) == 2,
		"wolf scared_turns round-trips (2)")
	# A pre-hazards save (no key) loads all-inactive.
	var old := {"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 1}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "", "boss_hp": 0, "town2_complete": false}
	var o := GameState.from_dict(old)
	_check(not o.any_farm_hazard_active(), "pre-hazards save loads with all hazards inactive")
	# A corrupt over-cap rat list clamps to the cap.
	var corrupt := old.duplicate(true)
	var many: Array = []
	for i in 10:
		many.append({"row": 0, "col": i, "age": 0})
	corrupt["hazards"] = {"rats": many, "fire": {}, "wolves": {}}
	var cc := GameState.from_dict(corrupt)
	_check(cc.active_rats().size() == Constants.RAT_MAX_ACTIVE, "corrupt over-cap rat list clamps to RAT_MAX_ACTIVE")
