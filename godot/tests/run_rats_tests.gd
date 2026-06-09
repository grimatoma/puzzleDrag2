extends SceneTree
## Headless unit-test runner for the M3h Town-3 rats hazard + the Ratcatcher /
## Master Ratcatcher buildings. Covers the RAT hazard tile (no resource, "rat"
## category, append-only enum ordinals), rats_enabled + the farm-pool rat seeding,
## the building gating (City + rats_enabled), Ratcatcher charges, the Board
## clear_all_rats "shoo", the Master Ratcatcher flag, and save/load round-tripping.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_rats_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_boss_tests.gd. `class_name`
## globals are aliased with `var` (not const) because a class_name ref is not a
## constant expression in 4.6. The Board test instantiates a Board node, adds it to
## the SceneTree root, and awaits a frame (mirroring run_scene_smoke) so _ready runs.

const T := Constants.Tile
# class_name globals → plain member vars (not const; see header note).
var BC := BuildingConfig
var TC := TownConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Town-3 rats hazard tests ───────────────────────")
	_test_rat_tile()
	_test_rats_enabled_and_pool()
	_test_building_gating()
	_test_ratcatcher_charges()
	await _test_board_clear_all_rats()
	await _test_master_ratcatcher_flag()
	await _test_positional_rat_lifecycle()
	_test_save_load()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion + setup helpers ─────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

## A GameState parked at City tier with rats enabled (Town 2 complete) and `extra`
## resources — the state where the rats buildings become buildable.
func _city_rats_state(extra: Dictionary = {}) -> GameState:
	var g := GameState.new()
	g.settlement.tier = TC.TIER_CITY
	g.town2_complete = true
	for k in extra.keys():
		_give(g, k, int(extra[k]))
	return g

## Count occurrences of `tile` in a pool Array.
func _count(pool: Array, tile: int) -> int:
	var n := 0
	for x in pool:
		if int(x) == tile:
			n += 1
	return n

# ── RAT tile ──────────────────────────────────────────────────────────────────

func _test_rat_tile() -> void:
	_check(Constants.produced_resource(T.RAT) == "", "RAT produces nothing (produced_resource is '')")
	_check(Constants.threshold_for(T.RAT) == Constants.NO_THRESHOLD,
		"RAT has no threshold (threshold_for returns the NO_THRESHOLD sentinel)")
	_check(Constants.category_of(T.RAT) == "rat", "RAT category is 'rat'")
	_check(Constants.string_key(T.RAT) == "rat", "RAT string key is 'rat'")
	# Appending RAT must NOT have renumbered any existing farm/mine ordinal.
	_check(int(T.GRASS) == 0, "GRASS is still ordinal 0")
	_check(int(T.HORSE) == 9, "HORSE is still ordinal 9 (farm tail)")
	_check(int(T.STONE) == 10, "STONE is still ordinal 10 (mine head)")
	_check(int(T.GEM) == 14, "GEM is still ordinal 14 (mine tail)")
	_check(int(T.RAT) == 15, "RAT is the new appended ordinal 15")
	_check(Constants.RAT_POOL_SLOTS == 2, "RAT_POOL_SLOTS is 2")
	# RAT is a real color (not the MAGENTA fallback).
	_check(Constants.color_for(T.RAT) == Color(0.36, 0.34, 0.38), "RAT has its drab grey color")

# ── rats_enabled + the farm pool (T9: rats are NO LONGER pool-seeded) ──────────

func _test_rats_enabled_and_pool() -> void:
	# Fresh state: rats off, farm pool has no rats.
	var fresh := GameState.new()
	_check(not fresh.rats_enabled(), "fresh state: rats_enabled false")
	_check(_count(fresh.active_tile_pool(), T.RAT) == 0, "fresh farm pool has no RAT")

	# T9 CHANGE: rats are now POSITIONAL (HazardLogic.roll_rat_spawn each fill + they EAT plants),
	# NOT seeded into the refill pool. So even with rats_enabled the farm pool stays rat-free — the
	# old "pool gains RAT_POOL_SLOTS" assertions are obsolete and replaced here.
	var base := GameState.new()           # rats off, same fresh Spring base
	var base_pool: Array = base.active_tile_pool()
	var g := GameState.new()
	g.town2_complete = true
	_check(g.rats_enabled(), "town2_complete → rats_enabled true")
	var pool: Array = g.active_tile_pool()
	_check(_count(pool, T.RAT) == 0,
		"T9: farm pool has NO rats even when enabled (rats are positional, not pool-seeded)")
	# The season-weighted base is unchanged — enabling rats no longer touches the pool at all.
	_check(_count(pool, T.GRASS) == _count(base_pool, T.GRASS),
		"farm grass slots unchanged by rats")
	_check(_count(pool, T.WHEAT) == _count(base_pool, T.WHEAT),
		"farm wheat slots unchanged by rats")
	_check(pool.size() == base_pool.size(),
		"T9: farm pool size identical with rats on (no pool seeding)")

	# Mine pool is unaffected — rats are a farm-only hazard.
	var m := GameState.new()
	m.town2_complete = true
	m.active_biome = "mine"
	m.mine_turns_left = 5
	var mine_pool: Array = m.active_biome_pool()
	_check(_count(mine_pool, T.RAT) == 0, "mine pool (active_biome_pool while mining) has NO rats")

# ── building gating (City + rats_enabled) ─────────────────────────────────────

func _test_building_gating() -> void:
	# City tier but Town 2 NOT done → hazard buildings locked (rats not enabled).
	var no_rats := GameState.new()
	no_rats.settlement.tier = TC.TIER_CITY
	_give(no_rats, "plank", 50)
	_give(no_rats, "hay_bundle", 50)
	_give(no_rats, "eggs", 50)
	_check(not no_rats.can_build(BC.RATCATCHER),
		"City but no Town 2 → can_build(ratcatcher) false")
	var locked := no_rats.build(BC.RATCATCHER)
	_check(locked.get("ok", true) == false, "build(ratcatcher) without rats → ok false")
	_check(locked.get("reason", "") == "locked", "build(ratcatcher) without rats → reason 'locked'")

	# City + rats enabled + cost → can build the Ratcatcher, then the Master.
	var g := _city_rats_state({"plank": 50, "hay_bundle": 50, "eggs": 50})
	_check(g.can_build(BC.RATCATCHER), "City + rats + cost → can_build(ratcatcher) true")
	var r := g.build(BC.RATCATCHER)
	_check(bool(r.get("ok", false)), "build(ratcatcher) succeeds")
	_check(g.has_ratcatcher(), "has_ratcatcher() true after build")
	_check(g.can_build(BC.MASTER_RATCATCHER), "can_build(master_ratcatcher) true")
	var mr := g.build(BC.MASTER_RATCATCHER)
	_check(bool(mr.get("ok", false)), "build(master_ratcatcher) succeeds")
	_check(g.has_master_ratcatcher(), "has_master_ratcatcher() true after build")

	# The hazard buildings are classified correctly and never feed the pool.
	_check(BC.is_hazard_building(BC.RATCATCHER), "is_hazard_building(ratcatcher) true")
	_check(BC.is_hazard_building(BC.MASTER_RATCATCHER), "is_hazard_building(master_ratcatcher) true")
	_check(not BC.is_spawner(BC.RATCATCHER), "ratcatcher is NOT a spawner")
	_check(not BC.is_refiner(BC.RATCATCHER), "ratcatcher is NOT a refiner")
	# A built Ratcatcher adds NOTHING to the pool (no tile/category). T9: rats are not pool-seeded,
	# so the pool stays the season base — a built Ratcatcher (a hazard building) is pool-neutral.
	var base_pool: Array = GameState.new().active_tile_pool()
	var pool: Array = g.active_tile_pool()
	_check(_count(pool, T.RAT) == 0,
		"T9: built Ratcatcher leaves the pool rat-free (rats are positional, not pool-seeded)")
	_check(pool.size() == base_pool.size(),
		"hazard buildings contribute no extra pool tiles")
	_check(not g.active_categories().has("rat"),
		"hazard buildings add no 'rat' (or any) board CATEGORY via active_categories")

# ── Ratcatcher charges ────────────────────────────────────────────────────────

func _test_ratcatcher_charges() -> void:
	# Without a Ratcatcher: no charges, can't shoo.
	var none := _city_rats_state()
	_check(none.ratcatcher_charges_left() == 0, "no Ratcatcher → 0 charges left")
	_check(not none.can_shoo_rats(), "no Ratcatcher → can_shoo_rats false")
	_check(not none.use_ratcatcher_charge(), "use_ratcatcher_charge with no Ratcatcher → false")

	# With a Ratcatcher: 5 charges, spend them down to 0.
	var g := _city_rats_state({"plank": 50, "hay_bundle": 50})
	_check(g.build(BC.RATCATCHER)["ok"], "(setup) built the Ratcatcher")
	_check(BuildingConfig.RATCATCHER_CHARGES == 5, "BuildingConfig.RATCATCHER_CHARGES is 5")
	_check(g.ratcatcher_charges_left() == 5, "fresh Ratcatcher has 5 charges")
	_check(g.can_shoo_rats(), "can_shoo_rats true with charges")
	for i in 5:
		_check(g.use_ratcatcher_charge(), "use_ratcatcher_charge #%d returns true" % (i + 1))
	_check(g.ratcatcher_charges_left() == 0, "0 charges left after 5 uses")
	_check(not g.can_shoo_rats(), "can_shoo_rats false at 0 charges")
	_check(not g.use_ratcatcher_charge(), "sixth use_ratcatcher_charge returns false")
	_check(g.ratcatcher_charges_used == 5, "charges_used capped at 5 (sixth use did not increment)")

# ── Board.clear_all_rats ──────────────────────────────────────────────────────

func _test_board_clear_all_rats() -> void:
	var board := Board.new()
	root.add_child(board)
	await process_frame                        # let the deferred _ready run

	# Build a known grid full of staples with several rats sprinkled in.
	board.tile_pool = [T.GRASS, T.WHEAT]       # rats are NEVER in the refill pool
	board.grid = _rat_grid()
	board._build_tiles()
	var before := _grid_count(board.grid, T.RAT)
	_check(before == 4, "(setup) test grid has 4 rats")

	var cleared := board.clear_all_rats()
	_check(cleared == 4, "clear_all_rats returns the rat count (4)")
	_check(_grid_count(board.grid, T.RAT) == 0, "no rats remain in the grid after a shoo")

	# Board stays full (collapse + refill backfilled every blanked cell).
	var empties := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if board.grid[r][c] == Constants.EMPTY:
				empties += 1
	_check(empties == 0, "board is full after clear_all_rats (collapse + refill)")

	# clear_all_rats on a rat-free board is a no-op returning 0.
	var again := board.clear_all_rats()
	_check(again == 0, "clear_all_rats on a rat-free board returns 0")

	board.queue_free()

# ── Master Ratcatcher flag + grass-chain adjacency clear ──────────────────────

func _test_master_ratcatcher_flag() -> void:
	# GameState flag reflects the building; Main sets Board.clear_rats_on_grass from it.
	var g := _city_rats_state({"plank": 50, "eggs": 50, "hay_bundle": 50})
	_check(not g.has_master_ratcatcher(), "no Master Ratcatcher initially")
	_check(g.build(BC.MASTER_RATCATCHER)["ok"], "(setup) built the Master Ratcatcher")
	_check(g.has_master_ratcatcher(), "has_master_ratcatcher() true once built")

	# Board flag is a plain bool the test can toggle; Main mirrors it from the
	# GameState getter (see Main._ready / _on_town_changed).
	var flag_board := Board.new()
	root.add_child(flag_board)
	await process_frame
	_check(not flag_board.clear_rats_on_grass, "Board.clear_rats_on_grass defaults false")
	flag_board.clear_rats_on_grass = g.has_master_ratcatcher()
	_check(flag_board.clear_rats_on_grass, "Board flag set from has_master_ratcatcher()")
	flag_board.queue_free()

	# Exercise the _resolve adjacency clear on a Board in the tree (no live viewport
	# or input needed — try_resolve drives the same path the drag does; the board must
	# be in the tree because _resolve creates tweens). The grass L at (0,0)-(1,0)-(0,1)
	# has a single RAT at (1,1), 8-adjacent to all three cells.
	var b2 := Board.new()
	b2.clear_rats_on_grass = true
	b2.tile_pool = [T.WHEAT]                    # refill never re-adds GRASS or RAT here
	root.add_child(b2)
	await process_frame
	b2.grid = _grass_chain_with_rat_grid()
	b2._build_tiles()
	_check(_grid_count(b2.grid, T.RAT) == 1, "(setup) one rat adjacent to the grass L")
	var ok := b2.try_resolve([Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)])
	_check(ok, "grass 3-chain resolves")
	_check(_grid_count(b2.grid, T.RAT) == 0,
		"Master Ratcatcher: the adjacent rat was swept up with the grass chain")
	b2.queue_free()

	# With the flag OFF the same grass chain leaves the rat alone.
	var b3 := Board.new()
	b3.clear_rats_on_grass = false
	b3.tile_pool = [T.WHEAT]
	root.add_child(b3)
	await process_frame
	b3.grid = _grass_chain_with_rat_grid()
	b3._build_tiles()
	_check(b3.try_resolve([Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)]),
		"grass 3-chain resolves (flag off)")
	_check(_grid_count(b3.grid, T.RAT) == 1,
		"flag off: the adjacent rat is NOT cleared by a grass chain")
	b3.queue_free()

# ── T9 positional rat lifecycle on a LIVE board ────────────────────────────────
# The new rat model: rats are positional cells that EAT adjacent plants (via GameState.
# tick_farm_hazards) and are cleared by chaining 3+ rat tiles (GameState.clear_rat_chain),
# landed on the live Board via apply_hazard_state / clear_hazard_cells.

func _test_positional_rat_lifecycle() -> void:
	var board := Board.new()
	board.tile_pool = [T.WHEAT]                 # refill never re-adds GRASS/RAT here
	root.add_child(board)
	await process_frame

	# A board with a RAT at (1,1) and a GRASS plant above it. tick_farm_hazards eats the grass.
	var g := GameState.new()
	g.town2_complete = true                     # rats enabled
	var grid := _full_grid(T.WHEAT)
	grid[0][1] = T.GRASS
	grid[1][1] = T.RAT
	board.grid = grid
	board._build_tiles()
	g.hazards["rats"] = [{"row": 1, "col": 1, "age": 0}]
	var tick: Dictionary = g.tick_farm_hazards(board.grid, board.rng)
	_check(int(tick["grid"][0][1]) == Constants.EMPTY, "tick_farm_hazards: rat ate the grass on the live grid")
	board.apply_hazard_state(tick["grid"], g.active_rats(), g.active_fire_cells(), g.active_wolves())
	# The rat tile is re-stamped at (1,1) after collapse/refill (positional, pinned).
	_check(board.grid[1][1] == T.RAT, "rat tile stays pinned at (1,1) after the tick lands")
	_check(int(g.active_rats()[0].get("age", -1)) == 1, "the rat aged +1")
	board.queue_free()

	# Chain-3 rats → cleared for +15 coins, removed from the board.
	var b2 := Board.new()
	b2.tile_pool = [T.WHEAT]
	root.add_child(b2)
	await process_frame
	var g2 := GameState.new()
	g2.town2_complete = true
	g2.coins = 0
	var grid2 := _full_grid(T.WHEAT)
	grid2[0][0] = T.RAT
	grid2[0][1] = T.RAT
	grid2[0][2] = T.RAT
	b2.grid = grid2
	b2._build_tiles()
	g2.hazards["rats"] = [
		{"row": 0, "col": 0, "age": 0}, {"row": 0, "col": 1, "age": 0}, {"row": 0, "col": 2, "age": 0},
	]
	var chain := [
		{"row": 0, "col": 0, "tile": T.RAT}, {"row": 0, "col": 1, "tile": T.RAT}, {"row": 0, "col": 2, "tile": T.RAT},
	]
	var cr: Dictionary = g2.clear_rat_chain(chain)
	_check(bool(cr.get("ok", false)), "3-rat chain clears via GameState.clear_rat_chain")
	_check(g2.coins == 15, "rat chain pays +15 coins (5×3)")
	_check(g2.active_rats().is_empty(), "all rats removed from hazards after the chain clear")
	b2.queue_free()

## A full 6x6 grid of a single tile.
func _full_grid(fill: int) -> Array:
	var out: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(fill)
		out.append(row)
	return out

# ── save / load of the rats state ─────────────────────────────────────────────

func _test_save_load() -> void:
	# Build both rat buildings, spend 2 charges, round-trip → all preserved.
	var g := _city_rats_state({"plank": 50, "eggs": 50, "hay_bundle": 50})
	_check(g.build(BC.RATCATCHER)["ok"], "(setup) built Ratcatcher")
	_check(g.build(BC.MASTER_RATCATCHER)["ok"], "(setup) built Master Ratcatcher")
	g.use_ratcatcher_charge()
	g.use_ratcatcher_charge()
	_check(g.ratcatcher_charges_used == 2, "(setup) 2 charges spent")

	var d := g.to_dict()
	_check(int(d.get("ratcatcher_charges_used", -1)) == 2, "to_dict carries ratcatcher_charges_used 2")
	_check(bool(d.get("town2_complete", false)), "to_dict carries town2_complete true")

	var loaded := GameState.from_dict(d)
	_check(loaded.town2_complete, "from_dict restores town2_complete")
	_check(loaded.rats_enabled(), "loaded state has rats enabled")
	_check(loaded.has_ratcatcher(), "from_dict restores the Ratcatcher building")
	_check(loaded.has_master_ratcatcher(), "from_dict restores the Master Ratcatcher building")
	_check(loaded.ratcatcher_charges_used == 2, "from_dict restores charges_used 2")
	_check(loaded.ratcatcher_charges_left() == 3, "3 charges left after restore")

	# A corrupt NEGATIVE charges-used clamps to 0 on load.
	var neg := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 5}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "", "boss_hp": 0, "town2_complete": true,
		"ratcatcher_charges_used": -7,
	}
	var n := GameState.from_dict(neg)
	_check(n.ratcatcher_charges_used == 0, "negative ratcatcher_charges_used clamps to 0 on load")

	# A save with no rats key defaults to 0 (back-compat with pre-M3h saves).
	var old := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 1}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "", "boss_hp": 0, "town2_complete": false,
	}
	var o := GameState.from_dict(old)
	_check(o.ratcatcher_charges_used == 0, "pre-M3h save (no rats key) loads charges_used 0")
	_check(not o.rats_enabled(), "pre-M3h save loads with rats disabled")

# ── grid builders ─────────────────────────────────────────────────────────────

## A full 6x6 grid of staples with exactly 4 RAT cells sprinkled in.
func _rat_grid() -> Array:
	var t := Constants.Tile
	return [
		[t.GRASS, t.RAT,   t.WHEAT,  t.GRASS,  t.WHEAT,  t.GRASS],
		[t.WHEAT, t.GRASS, t.RAT,    t.WHEAT,  t.GRASS,  t.WHEAT],
		[t.GRASS, t.WHEAT, t.GRASS,  t.RAT,    t.WHEAT,  t.GRASS],
		[t.WHEAT, t.GRASS, t.WHEAT,  t.GRASS,  t.WHEAT,  t.GRASS],
		[t.GRASS, t.WHEAT, t.GRASS,  t.WHEAT,  t.RAT,    t.WHEAT],
		[t.WHEAT, t.GRASS, t.WHEAT,  t.GRASS,  t.WHEAT,  t.GRASS],
	]

## A grid with a grass L in the top-left (cells (0,0),(1,0),(0,1)) and a single RAT
## at (1,1) — 8-adjacent to every cell of the L. Everything else is WHEAT, so the
## ONLY chainable grass is that L and the only rat is the adjacent one.
func _grass_chain_with_rat_grid() -> Array:
	var t := Constants.Tile
	return [
		[t.GRASS, t.GRASS, t.WHEAT,  t.WHEAT,  t.WHEAT,  t.WHEAT],
		[t.GRASS, t.RAT,   t.WHEAT,  t.WHEAT,  t.WHEAT,  t.WHEAT],
		[t.WHEAT, t.WHEAT, t.WHEAT,  t.WHEAT,  t.WHEAT,  t.WHEAT],
		[t.WHEAT, t.WHEAT, t.WHEAT,  t.WHEAT,  t.WHEAT,  t.WHEAT],
		[t.WHEAT, t.WHEAT, t.WHEAT,  t.WHEAT,  t.WHEAT,  t.WHEAT],
		[t.WHEAT, t.WHEAT, t.WHEAT,  t.WHEAT,  t.WHEAT,  t.WHEAT],
	]

func _grid_count(grid: Array, tile: int) -> int:
	var n := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n
