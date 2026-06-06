extends SceneTree
## Headless unit-test runner for the M3i mine RUBBLE hazard (cave-in clutter on the
## Town-2 expedition). Covers the RUBBLE hazard tile (no resource, "rubble" category,
## append-only enum ordinals), the mine-pool rubble seeding (and the farm pool staying
## rubble-free), the Board STONE-chain clearing of adjacent rubble (mining through it),
## the _adjacent_rubble_cells adjacency helper, the off-switch (no clear when the flag
## is false), and the farm staying unaffected (a GRASS chain never clears rubble).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_rubble_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_rats_tests.gd. `class_name` globals
## are aliased with `var` (not const) because a class_name ref is not a constant
## expression in 4.6. The Board tests instantiate a Board node, add it to the SceneTree
## root, and await a frame (mirroring run_rats_tests) so _ready + _resolve's tweens run.

const T := Constants.Tile
# class_name globals → plain member vars (not const; see header note).
var TC := TownConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Mine rubble hazard tests ───────────────────────")
	_test_rubble_tile()
	_test_mine_pool_seeding()
	await _test_stone_chain_clears_rubble()
	await _test_adjacent_rubble_cells()
	await _test_no_clear_when_off()
	await _test_farm_grass_never_clears_rubble()
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

## A GameState parked IN the mine with `turns` expedition turns. Sets the biome +
## turns directly (as run_mine_tests does) so the tests don't have to walk the City +
## supplies gate just to inspect the mine pool.
func _mine_state(turns: int = 5) -> GameState:
	var g := GameState.new()
	g.active_biome = "mine"
	g.mine_turns_left = turns
	return g

## Count occurrences of `tile` in a pool Array.
func _count(pool: Array, tile: int) -> int:
	var n := 0
	for x in pool:
		if int(x) == tile:
			n += 1
	return n

func _grid_count(grid: Array, tile: int) -> int:
	var n := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n

# ── RUBBLE tile ─────────────────────────────────────────────────────────────

func _test_rubble_tile() -> void:
	_check(Constants.produced_resource(T.RUBBLE) == "",
		"RUBBLE produces nothing (produced_resource is '')")
	_check(Constants.threshold_for(T.RUBBLE) == Constants.NO_THRESHOLD,
		"RUBBLE has no threshold (threshold_for returns the NO_THRESHOLD sentinel)")
	# Chaining rubble yields 0 units via the same path RAT uses (credit_chain with an
	# empty produced resource + no threshold → no inventory, progress carries on "").
	var g := GameState.new()
	var res := g.credit_chain(T.RUBBLE, 6)
	_check(res.get("resource", "x") == "", "credit_chain(RUBBLE) resource is '' (nothing produced)")
	_check(int(res.get("units", -1)) == 0, "chain of 6 RUBBLE yields 0 units")
	_check(g.inventory.is_empty(), "RUBBLE chain adds nothing to inventory")

	_check(Constants.category_of(T.RUBBLE) == "rubble", "RUBBLE category is 'rubble'")
	_check(Constants.string_key(T.RUBBLE) == "rubble", "RUBBLE string key is 'rubble'")

	# Appending RUBBLE must NOT have renumbered any existing farm/mine/rat ordinal.
	_check(int(T.GRASS) == 0, "GRASS is still ordinal 0")
	_check(int(T.HORSE) == 9, "HORSE is still ordinal 9 (farm tail)")
	_check(int(T.STONE) == 10, "STONE is still ordinal 10 (mine head)")
	_check(int(T.GEM) == 14, "GEM is still ordinal 14 (mine tail)")
	_check(int(T.RAT) == 15, "RAT is still ordinal 15 (rats hazard)")
	_check(int(T.RUBBLE) == 16, "RUBBLE is the new appended ordinal 16")
	_check(Constants.RUBBLE_POOL_SLOTS == 2, "RUBBLE_POOL_SLOTS is 2")
	# RUBBLE is a real color (not the MAGENTA fallback).
	_check(Constants.color_for(T.RUBBLE) == Color(0.34, 0.30, 0.27),
		"RUBBLE has its dark cave-rock grey-brown color")

# ── mine-pool seeding (and the farm pool staying clean) ───────────────────────

func _test_mine_pool_seeding() -> void:
	# In the mine: active_biome_pool() is MINE_POOL + exactly RUBBLE_POOL_SLOTS rubble.
	var g := _mine_state(5)
	_check(g.is_in_mine(), "(setup) state reports is_in_mine() true")
	_check(g.mine_hazard_active(), "mine_hazard_active() true while mining")
	var pool: Array = g.active_biome_pool()
	_check(_count(pool, T.RUBBLE) == Constants.RUBBLE_POOL_SLOTS,
		"mine pool has exactly RUBBLE_POOL_SLOTS (%d) rubble" % Constants.RUBBLE_POOL_SLOTS)
	# Every MINE_POOL tile is still present at its original count alongside the rubble.
	_check(_count(pool, T.STONE) == _count(Constants.MINE_POOL, T.STONE),
		"mine pool keeps every STONE slot (staple) alongside the rubble")
	_check(_count(pool, T.GEM) == _count(Constants.MINE_POOL, T.GEM),
		"mine pool keeps the GEM slot alongside the rubble")
	_check(pool.size() == Constants.MINE_POOL.size() + Constants.RUBBLE_POOL_SLOTS,
		"mine pool = MINE_POOL + RUBBLE_POOL_SLOTS (no other additions)")
	# The pool returned is a COPY — mutating it must not corrupt MINE_POOL itself.
	_check(_count(Constants.MINE_POOL, T.RUBBLE) == 0,
		"the canonical MINE_POOL const is NOT mutated (still rubble-free)")

	# On the farm: NO rubble (it's a mine-only hazard).
	var farm := GameState.new()
	_check(not farm.is_in_mine(), "(setup) fresh state is on the farm")
	_check(not farm.mine_hazard_active(), "mine_hazard_active() false on the farm")
	_check(_count(farm.active_biome_pool(), T.RUBBLE) == 0,
		"farm pool (active_biome_pool on the farm) has NO rubble")
	# Even a Town-3 farm (rats enabled) gets rats but never rubble.
	var farm3 := GameState.new()
	farm3.town2_complete = true
	_check(_count(farm3.active_biome_pool(), T.RUBBLE) == 0,
		"Town-3 farm pool (rats enabled) still has NO rubble")
	_check(_count(farm3.active_tile_pool(), T.RUBBLE) == 0,
		"active_tile_pool (farm) never seeds rubble")

# ── Board: a STONE chain clears adjacent rubble (mining through it) ───────────

func _test_stone_chain_clears_rubble() -> void:
	# The stone L at (0,0)-(1,0)-(0,1) has a single RUBBLE at (1,1), 8-adjacent to all
	# three cells, plus a FAR rubble at (5,5) that must survive. Everything else is
	# IRON_ORE, so the only chainable STONE is that L and refill never re-adds STONE or
	# RUBBLE (the tile_pool is a single non-stone, non-rubble mine tile).
	var b := Board.new()
	b.clear_rubble_on_stone = true
	b.tile_pool = [T.IRON_ORE]
	root.add_child(b)
	await process_frame
	b.grid = _stone_chain_with_rubble_grid()
	b._build_tiles()
	_check(_grid_count(b.grid, T.RUBBLE) == 2, "(setup) two rubble: one adjacent to the L, one far")

	var ok := b.try_resolve([Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)])
	_check(ok, "stone 3-chain resolves")
	# The adjacent rubble is gone; the far rubble (5,5) survives.
	_check(b.grid[5][5] == T.RUBBLE, "rubble NOT adjacent to the chain survives at (5,5)")
	_check(_grid_count(b.grid, T.RUBBLE) == 1,
		"exactly the one adjacent rubble was cleared (far rubble remains)")

	# Board stays full (collapse + refill backfilled the chain + cleared rubble cell).
	var empties := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if b.grid[r][c] == Constants.EMPTY:
				empties += 1
	_check(empties == 0, "board is full after the stone chain (no EMPTY cells)")
	b.queue_free()

# ── _adjacent_rubble_cells adjacency helper ──────────────────────────────────

func _test_adjacent_rubble_cells() -> void:
	var b := Board.new()
	root.add_child(b)
	await process_frame
	# A grid where (1,1) and (5,5) are RUBBLE; the path is the stone L at the top-left.
	b.grid = _stone_chain_with_rubble_grid()
	var adj: Array = b._adjacent_rubble_cells([Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)])
	_check(adj.size() == 1, "_adjacent_rubble_cells returns exactly one cell for the L path")
	_check(adj.has(Vector2i(1, 1)), "the one adjacent rubble is (1,1)")
	_check(not adj.has(Vector2i(5, 5)), "the far rubble (5,5) is NOT 8-adjacent to the L")

	# A path with NO rubble neighbours returns an empty list.
	var none: Array = b._adjacent_rubble_cells([Vector2i(3, 3)])
	_check(none.is_empty(), "_adjacent_rubble_cells is empty when no rubble is adjacent")

	# Distinctness: a path that brackets a single rubble from two sides returns it once.
	# Rubble at (1,1); path cells (0,1) and (2,1) are both 8-adjacent to it.
	var dup: Array = b._adjacent_rubble_cells([Vector2i(0, 1), Vector2i(2, 1)])
	_check(dup.size() == 1 and dup.has(Vector2i(1, 1)),
		"a rubble adjacent to two path cells is returned exactly once (distinct)")
	b.queue_free()

# ── off-switch: no clear when clear_rubble_on_stone is false ──────────────────

func _test_no_clear_when_off() -> void:
	var b := Board.new()
	b.clear_rubble_on_stone = false                # the off state (e.g. on the farm)
	b.tile_pool = [T.IRON_ORE]
	root.add_child(b)
	await process_frame
	_check(not b.clear_rubble_on_stone, "Board.clear_rubble_on_stone defaults / stays false")
	b.grid = _stone_chain_with_rubble_grid()
	b._build_tiles()
	_check(_grid_count(b.grid, T.RUBBLE) == 2, "(setup) two rubble present")
	var ok := b.try_resolve([Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)])
	_check(ok, "stone 3-chain resolves (flag off)")
	_check(b.grid[1][1] == T.RUBBLE, "flag off: the adjacent rubble at (1,1) is NOT cleared")
	_check(_grid_count(b.grid, T.RUBBLE) == 2, "flag off: both rubble tiles survive a stone chain")
	b.queue_free()

# ── farm: a GRASS chain never clears rubble ──────────────────────────────────

func _test_farm_grass_never_clears_rubble() -> void:
	# Even with clear_rubble_on_stone ON, a NON-stone (grass) chain leaves rubble alone —
	# rubble only clears via STONE. (And on the real farm, rubble is never seeded at all.)
	var b := Board.new()
	b.clear_rubble_on_stone = true
	b.tile_pool = [T.WHEAT]
	root.add_child(b)
	await process_frame
	b.grid = _grass_chain_with_rubble_grid()
	b._build_tiles()
	_check(_grid_count(b.grid, T.RUBBLE) == 1, "(setup) one rubble adjacent to the grass L")
	var ok := b.try_resolve([Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)])
	_check(ok, "grass 3-chain resolves")
	_check(_grid_count(b.grid, T.RUBBLE) == 1,
		"a GRASS chain does NOT clear adjacent rubble (only STONE mines through it)")
	b.queue_free()

	# And with the Master-Ratcatcher grass sweep ON, a grass chain clears RATS, not rubble.
	var b2 := Board.new()
	b2.clear_rats_on_grass = true                  # grass sweeps rats
	b2.clear_rubble_on_stone = true                # stone would sweep rubble, but no stone here
	b2.tile_pool = [T.WHEAT]
	root.add_child(b2)
	await process_frame
	b2.grid = _grass_chain_with_rubble_grid()
	b2._build_tiles()
	var ok2 := b2.try_resolve([Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)])
	_check(ok2, "grass 3-chain resolves (both sweep flags on)")
	_check(_grid_count(b2.grid, T.RUBBLE) == 1,
		"grass sweep + rubble flag: a grass chain still leaves rubble (rubble is STONE-only)")
	b2.queue_free()

# ── grid builders ─────────────────────────────────────────────────────────────

## A grid with a STONE L in the top-left (cells (0,0),(1,0),(0,1)), a RUBBLE at (1,1)
## (8-adjacent to every cell of the L), and a FAR RUBBLE at (5,5) (not adjacent to the
## L). Everything else is IRON_ORE, so the ONLY chainable STONE is that L and the only
## rubble cells are the two placed.
func _stone_chain_with_rubble_grid() -> Array:
	var t := Constants.Tile
	return [
		[t.STONE,    t.STONE,    t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE],
		[t.STONE,    t.RUBBLE,   t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE],
		[t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE],
		[t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE],
		[t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE],
		[t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.IRON_ORE, t.RUBBLE],
	]

## A grid with a GRASS L in the top-left (cells (0,0),(1,0),(0,1)) and a single RUBBLE
## at (1,1) — 8-adjacent to every cell of the L. Everything else is WHEAT. Used to prove
## a GRASS chain never mines through rubble (only STONE does).
func _grass_chain_with_rubble_grid() -> Array:
	var t := Constants.Tile
	return [
		[t.GRASS, t.GRASS,  t.WHEAT, t.WHEAT, t.WHEAT, t.WHEAT],
		[t.GRASS, t.RUBBLE, t.WHEAT, t.WHEAT, t.WHEAT, t.WHEAT],
		[t.WHEAT, t.WHEAT,  t.WHEAT, t.WHEAT, t.WHEAT, t.WHEAT],
		[t.WHEAT, t.WHEAT,  t.WHEAT, t.WHEAT, t.WHEAT, t.WHEAT],
		[t.WHEAT, t.WHEAT,  t.WHEAT, t.WHEAT, t.WHEAT, t.WHEAT],
		[t.WHEAT, t.WHEAT,  t.WHEAT, t.WHEAT, t.WHEAT, t.WHEAT],
	]
