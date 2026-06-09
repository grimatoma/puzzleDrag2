extends SceneTree
## Headless unit-test runner for the MYSTERIOUS ORE → Rune loop (T23, ported from
## src/features/mine/mysterious_ore.ts). Covers the pure MineHazardLogic ore helpers
## (deterministic, seeded RNG): spawn once per session (mine-only, on a non-blocked cell), the
## 5-turn countdown degrading to DIRT, capture (ore + >= 2 DIRT → +1 rune), invalid chains, and the
## GameState wiring (spawn_mysterious_ore_on_fill / tick / try_capture_mysterious_ore + save/load).
## Run from godot/:
##   godot --headless --script res://tests/run_mysterious_ore_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as run_mine_hazards_tests.gd.

const T := Constants.Tile
var MHL := MineHazardLogic

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Mysterious Ore → Rune tests ─────────────────────")
	_test_constants()
	_test_spawn_once_and_mine_only()
	_test_spawn_avoids_blocked()
	_test_countdown_degrade_to_dirt()
	_test_chain_valid()
	_test_chain_invalid()
	_test_gamestate_capture()
	_test_gamestate_tick_spawn()
	_test_save_load()
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

func _rng(s: int) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = s
	return r

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

func _mine_state(turns: int = 5) -> GameState:
	var g := GameState.new()
	g.active_biome = "mine"
	g.mine_turns_left = turns
	return g

# ── constants ────────────────────────────────────────────────────────────────────

func _test_constants() -> void:
	_check(Constants.MYSTERIOUS_ORE_TURNS == 5, "MYSTERIOUS_ORE_TURNS == 5")
	_check(Constants.REQUIRED_DIRT_IN_CHAIN == 2, "REQUIRED_DIRT_IN_CHAIN == 2")

# ── spawn (mysterious_ore.ts spawnMysteriousOre) ─────────────────────────────────

func _test_spawn_once_and_mine_only() -> void:
	# Off the mine → never spawns.
	var off := MHL.spawn_mysterious_ore(_grid(T.STONE), {}, false, _rng(1))
	_check(not bool(off.get("ok", false)), "off the mine: no ore spawn")
	# In the mine, with no live ore → spawns one MYSTERIOUS_ORE tile + a 5-turn countdown.
	var sp := MHL.spawn_mysterious_ore(_grid(T.STONE), {}, true, _rng(1))
	_check(bool(sp.get("ok", false)), "in the mine: ore spawns")
	_check(_count(sp["grid"], T.MYSTERIOUS_ORE) == 1, "exactly one MYSTERIOUS_ORE tile on the board")
	_check(int(sp["ore"].get("turns_left", 0)) == Constants.MYSTERIOUS_ORE_TURNS, "ore seeded with a 5-turn countdown")
	# One at a time: with an ore already live, a second spawn is a no-op.
	var sp2 := MHL.spawn_mysterious_ore(sp["grid"], sp["ore"], true, _rng(2))
	_check(not bool(sp2.get("ok", false)), "one-at-a-time: no second ore while one is live")

func _test_spawn_avoids_blocked() -> void:
	# A board that is HALF blocked (top three rows RUBBLE) → over many seeds the ore always lands on
	# a NON-blocked cell (the 32-try loop reliably finds one when many exist). Mirrors React's
	# blocked-cell avoidance (spawnMysteriousOre's `blocked` predicate + retry loop).
	for s in range(1, 60):
		var grid := _grid(T.STONE)
		for r in 3:
			for c in Constants.COLS:
				grid[r][c] = T.RUBBLE   # top half blocked
		var sp := MHL.spawn_mysterious_ore(grid, {}, true, _rng(s))
		var orr: int = int(sp["ore"].get("row", -1))
		var orc: int = int(sp["ore"].get("col", -1))
		# The landed cell (read from the PRE-stamp grid) must not have been a blocked tile.
		var pre: int = T.RUBBLE if orr < 3 else T.STONE
		if MHL.tile_blocked_by_hazard(pre):
			_check(false, "ore landed on a blocked cell at seed %d (row %d)" % [s, orr])
			return
	_check(true, "ore avoids blocked cells across 59 seeds on a half-blocked board")

# ── countdown / degrade (mysterious_ore.ts tickMysteriousOre) ────────────────────

func _test_countdown_degrade_to_dirt() -> void:
	var grid := _grid(T.STONE)
	grid[2][2] = T.MYSTERIOUS_ORE
	var ore: Dictionary = {"row": 2, "col": 2, "turns_left": 2}
	var t1 := MHL.tick_mysterious_ore(grid, ore)
	_check(int(t1["ore"].get("turns_left", 0)) == 1, "ore countdown 2 → 1")
	_check(not bool(t1.get("expired", false)), "ore not expired at 1")
	var t2 := MHL.tick_mysterious_ore(t1["grid"], t1["ore"])
	_check(bool(t2.get("expired", false)), "ore expires at 0")
	_check(t2["ore"].is_empty(), "ore state cleared on expiry")
	_check(int(t2["grid"][2][2]) == T.DIRT, "expired ore degrades to DIRT (tile_special_dirt)")

# ── chain validity (mysterious_ore.ts isMysteriousChainValid) ────────────────────

func _test_chain_valid() -> void:
	# Ore + 2 dirt → valid.
	var chain: Array = [
		{"row": 0, "col": 0, "tile": T.MYSTERIOUS_ORE},
		{"row": 0, "col": 1, "tile": T.DIRT},
		{"row": 0, "col": 2, "tile": T.DIRT},
	]
	_check(MHL.is_mysterious_chain_valid(chain), "ore + 2 dirt is a valid capture chain")
	# Ore + 3 dirt → still valid (more than required).
	var chain3: Array = [
		{"tile": T.MYSTERIOUS_ORE}, {"tile": T.DIRT}, {"tile": T.DIRT}, {"tile": T.DIRT},
	]
	_check(MHL.is_mysterious_chain_valid(chain3), "ore + 3 dirt is valid")

func _test_chain_invalid() -> void:
	# Ore + only 1 dirt → invalid (below REQUIRED_DIRT_IN_CHAIN).
	var one_dirt: Array = [{"tile": T.MYSTERIOUS_ORE}, {"tile": T.DIRT}, {"tile": T.STONE}]
	_check(not MHL.is_mysterious_chain_valid(one_dirt), "ore + 1 dirt is NOT valid")
	# 2 dirt but NO ore → invalid (the chain must contain the ore).
	var no_ore: Array = [{"tile": T.DIRT}, {"tile": T.DIRT}, {"tile": T.DIRT}]
	_check(not MHL.is_mysterious_chain_valid(no_ore), "2 dirt without the ore is NOT valid")
	# Empty chain → invalid.
	_check(not MHL.is_mysterious_chain_valid([]), "empty chain is NOT valid")

# ── GameState capture (try_capture_mysterious_ore) ───────────────────────────────

func _test_gamestate_capture() -> void:
	var g := _mine_state(5)
	g.mysterious_ore = {"row": 1, "col": 1, "turns_left": 3}
	var before_runes := g.runes
	# An invalid chain (ore + 1 dirt) does NOT capture.
	var bad := g.try_capture_mysterious_ore([{"tile": T.MYSTERIOUS_ORE}, {"tile": T.DIRT}, {"tile": T.STONE}])
	_check(not bool(bad.get("captured", false)), "invalid chain: no capture")
	_check(g.runes == before_runes, "invalid chain: runes unchanged")
	_check(g.has_active_mysterious_ore(), "ore still live after a failed capture")
	# A valid chain (ore + 2 dirt) captures → +1 rune, ore cleared.
	var good := g.try_capture_mysterious_ore([{"tile": T.MYSTERIOUS_ORE}, {"tile": T.DIRT}, {"tile": T.DIRT}])
	_check(bool(good.get("captured", false)), "valid chain: captured")
	_check(g.runes == before_runes + 1, "valid capture grants +1 rune")
	_check(not g.has_active_mysterious_ore(), "ore cleared after capture (no double-grant)")
	# A second capture attempt with no live ore is a no-op.
	var again := g.try_capture_mysterious_ore([{"tile": T.MYSTERIOUS_ORE}, {"tile": T.DIRT}, {"tile": T.DIRT}])
	_check(not bool(again.get("captured", false)), "no double-capture once the ore is gone")
	# Off the mine, capture never fires.
	var farm := GameState.new()
	farm.mysterious_ore = {"row": 0, "col": 0, "turns_left": 3}
	var off := farm.try_capture_mysterious_ore([{"tile": T.MYSTERIOUS_ORE}, {"tile": T.DIRT}, {"tile": T.DIRT}])
	_check(not bool(off.get("captured", false)), "off the mine: no capture")

# ── GameState spawn + tick ───────────────────────────────────────────────────────

func _test_gamestate_tick_spawn() -> void:
	# spawn_mysterious_ore_on_fill seeds the live ore + stamps the grid.
	var g := _mine_state(5)
	var sp := g.spawn_mysterious_ore_on_fill(_grid(T.STONE), _rng(11))
	_check(bool(sp.get("ok", false)), "spawn_mysterious_ore_on_fill seeds the ore in the mine")
	_check(g.has_active_mysterious_ore(), "GameState ore live after spawn")
	_check(_count(sp["grid"], T.MYSTERIOUS_ORE) == 1, "spawn stamped the ore tile on the returned grid")
	# tick_mine_hazards ticks the ore countdown; at 0 it degrades + reports ore_expired.
	var g2 := _mine_state(5)
	g2.mysterious_ore = {"row": 0, "col": 5, "turns_left": 1}
	var grid := _grid(T.STONE)
	grid[0][5] = T.MYSTERIOUS_ORE
	var tr := g2.tick_mine_hazards(grid, _rng(13))
	_check(bool(tr.get("ore_expired", false)), "tick reports the ore expiry")
	_check(not g2.has_active_mysterious_ore(), "GameState ore cleared on expiry")
	_check(int(tr["grid"][0][5]) == T.DIRT, "expired ore degraded to DIRT on the ticked grid")

# ── save / load ──────────────────────────────────────────────────────────────────

func _test_save_load() -> void:
	var g := _mine_state(4)
	g.mysterious_ore = {"row": 3, "col": 2, "turns_left": 4}
	var loaded := GameState.from_dict(g.to_dict())
	_check(loaded.has_active_mysterious_ore(), "save/load preserves the live ore")
	_check(int(loaded.mysterious_ore.get("turns_left", 0)) == 4, "save/load preserves the ore countdown")
	_check(int(loaded.mysterious_ore.get("row", -1)) == 3 and int(loaded.mysterious_ore.get("col", -1)) == 2,
		"save/load preserves the ore cell")
	# A non-mine save drops the ore.
	var d := g.to_dict()
	d["active_biome"] = "farm"
	d["mine_turns_left"] = 0
	var loaded_farm := GameState.from_dict(d)
	_check(not loaded_farm.has_active_mysterious_ore(), "non-mine save loads with no ore")
	# A zero-countdown ore is dropped on load.
	var g2 := _mine_state(4)
	var d2 := g2.to_dict()
	d2["mysterious_ore"] = {"row": 1, "col": 1, "turns_left": 0}
	var loaded2 := GameState.from_dict(d2)
	_check(not loaded2.has_active_mysterious_ore(), "elapsed-countdown ore dropped on load")
