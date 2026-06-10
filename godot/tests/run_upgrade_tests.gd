extends SceneTree
## Headless unit-test runner for A1b — the upgradeMap-driven UPGRADE-TILE spawn (the React
## core loop: src/GameScene.ts nextUpgradeTile + utils.ts upgradeCountForChain +
## features/zones/data.ts nextResourceForZone). Covers:
##   - the FULL home category → tile map (FARM_CATEGORY_TO_TILE), incl. the upgrade-only
##     targets herd/cattle/mount → PIG/COW/HORSE that never BASE-spawn;
##   - the pure GameState.upgrade_spawn helper for the home zone (birds→PIG, grass/trees→
##     PHEASANT, grain→CARROT, veg→APPLE, fruit→GOLD-no-tile, below-threshold → 0,
##     hazard/mine tiles → 0);
##   - the Board injecting the queued upgrades into the refill so the board actually CONTAINS
##     the upgrade tile after a chain and stays a live (chainable) board;
##   - the off-path (no provider, or the mine/harbor biome) leaving the board upgrade-free.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_upgrade_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_rubble_tests.gd. `class_name` globals
## (GameState/ZoneConfig/Board/Constants/BoardLogic) are referenced statically (no instance
## needed for the pure helpers); the Board tests instantiate a Board, add it to the SceneTree
## root, and await a frame so _ready + _resolve's tweens run.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Upgrade-tile spawn tests (A1b) ─────────────────")
	_test_full_category_tile_map()
	_test_upgrade_spawn_home_zone()
	_test_upgrade_spawn_edge_cases()
	_test_upgrade_spawn_effective_threshold()
	await _test_board_injects_birds_to_pig()
	await _test_board_injects_grass_to_pheasant()
	await _test_board_fruit_spawns_no_upgrade()
	await _test_board_no_provider_is_plain_refill()
	await _test_board_below_threshold_no_upgrade()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion + helpers ───────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _grid_count(grid: Array, tile: int) -> int:
	var n := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n

## A Board wired with a deterministic seed, a SINGLE-tile refill pool (so the only way the
## given upgrade tile can appear is via the upgrade injection — never a pool draw), and the
## A1b upgrade provider for the home zone. Added to the root + a frame awaited so _ready runs.
func _upgrade_board(pool_tile: int, seed: int = 1234) -> Board:
	var b := Board.new()
	b.tile_pool = [pool_tile]
	b.rng.seed = seed
	b.upgrade_provider = func(tile_type: int, length: int) -> Dictionary:
		return GameState.upgrade_spawn(ZoneConfig.HOME_ZONE, tile_type, length)
	root.add_child(b)
	return b

## A grid whose top TWO rows are all `key` (so a horizontal chain of `len` is always legal and
## of a single type) and every other cell is `filler` (a non-matching tile so nothing else
## chains). Returns a fresh 6x6 Array.
func _top_chain_grid(key: int, filler: int) -> Array:
	var g: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(key if r <= 1 else filler)
		g.append(row)
	return g

## The horizontal path across row 0 of length `n` (cells (0,0)..(n-1,0)).
func _row0_path(n: int) -> Array:
	var p: Array = []
	for c in n:
		p.append(Vector2i(c, 0))
	return p

# ── FARM_CATEGORY_TO_TILE: the FULL inverse, incl. upgrade-only targets ────────

func _test_full_category_tile_map() -> void:
	var m := GameState.FARM_CATEGORY_TO_TILE
	# The six BASE-spawn eligible categories map to their tiles.
	_check(int(m["grass"]) == T.GRASS, "FARM_CATEGORY_TO_TILE grass → GRASS")
	_check(int(m["grain"]) == T.WHEAT, "FARM_CATEGORY_TO_TILE grain → WHEAT")
	_check(int(m["trees"]) == T.OAK, "FARM_CATEGORY_TO_TILE trees → OAK")
	_check(int(m["birds"]) == T.PHEASANT, "FARM_CATEGORY_TO_TILE birds → PHEASANT")
	_check(int(m["veg"]) == T.CARROT, "FARM_CATEGORY_TO_TILE veg → CARROT")
	_check(int(m["fruit"]) == T.APPLE, "FARM_CATEGORY_TO_TILE fruit → APPLE")
	# The UPGRADE-ONLY targets (NOT in the base-spawn FARM_CATEGORY_TILE) DO map here.
	_check(int(m["herd"]) == T.PIG, "FARM_CATEGORY_TO_TILE herd → PIG (upgrade-only target)")
	_check(int(m["cattle"]) == T.COW, "FARM_CATEGORY_TO_TILE cattle → COW (upgrade-only target)")
	_check(int(m["mount"]) == T.HORSE, "FARM_CATEGORY_TO_TILE mount → HORSE (upgrade-only target)")
	_check(int(m["flower"]) == T.PANSY, "FARM_CATEGORY_TO_TILE flower → PANSY")
	# Cross-check: the upgrade-only targets are deliberately ABSENT from the base-spawn map.
	for cat in ["herd", "cattle", "mount", "flower"]:
		_check(not GameState.FARM_CATEGORY_TILE.has(cat),
			"base-spawn FARM_CATEGORY_TILE still EXCLUDES upgrade-only '%s'" % cat)

# ── GameState.upgrade_spawn for the home zone (the headline cases) ─────────────

func _test_upgrade_spawn_home_zone() -> void:
	var H := ZoneConfig.HOME_ZONE
	# birds (threshold 6): 12 → 2 PIGs (herd). This re-introduces PIG as an UPGRADE.
	var birds := GameState.upgrade_spawn(H, T.PHEASANT, 12)
	_check(int(birds["count"]) == 2, "12 birds (thr 6) → count 2")
	_check(int(birds["tile"]) == T.PIG, "birds upgrade tile is PIG (herd)")
	# grass (threshold 6): 6 → 1 PHEASANT (birds).
	var grass := GameState.upgrade_spawn(H, T.GRASS, 6)
	_check(int(grass["count"]) == 1, "6 grass (thr 6) → count 1")
	_check(int(grass["tile"]) == T.PHEASANT, "grass upgrade tile is PHEASANT (birds)")
	# trees (threshold 6): also → birds (PHEASANT); 6 → 1.
	var trees := GameState.upgrade_spawn(H, T.OAK, 6)
	_check(int(trees["count"]) == 1 and int(trees["tile"]) == T.PHEASANT,
		"6 trees (thr 6) → 1 PHEASANT (trees→birds)")
	# grain (threshold 5): 5 → 1 CARROT (veg).
	var grain := GameState.upgrade_spawn(H, T.WHEAT, 5)
	_check(int(grain["count"]) == 1 and int(grain["tile"]) == T.CARROT,
		"5 grain (thr 5) → 1 CARROT (grain→veg)")
	# veg (threshold 6): 6 → 1 APPLE (fruit).
	var veg := GameState.upgrade_spawn(H, T.CARROT, 6)
	_check(int(veg["count"]) == 1 and int(veg["tile"]) == T.APPLE,
		"6 veg (thr 6) → 1 APPLE (veg→fruit)")
	# fruit → GOLD sentinel: NO upgrade tile (coins only).
	var fruit := GameState.upgrade_spawn(H, T.APPLE, 7)
	_check(int(fruit["count"]) == 0, "7 fruit → count 0 (fruit→GOLD: coins, no tile)")
	_check(int(fruit["tile"]) == Constants.EMPTY, "fruit upgrade tile is EMPTY (GOLD sentinel)")

func _test_upgrade_spawn_edge_cases() -> void:
	var H := ZoneConfig.HOME_ZONE
	# Below threshold: a 3-chain of birds (threshold 6) earns no upgrade.
	var below := GameState.upgrade_spawn(H, T.PHEASANT, 3)
	_check(int(below["count"]) == 0 and int(below["tile"]) == Constants.EMPTY,
		"3 birds (below thr 6) → count 0, tile EMPTY")
	# Mine tile on the home zone: STONE's category ('stone') has no home upgradeMap entry → 0.
	var mine := GameState.upgrade_spawn(H, T.STONE, 12)
	_check(int(mine["count"]) == 0 and int(mine["tile"]) == Constants.EMPTY,
		"mine STONE on home zone → count 0 (no zone upgrade target)")
	# Hazard tile (RAT, NO_THRESHOLD) → 0 regardless of length.
	var rat := GameState.upgrade_spawn(H, T.RAT, 99)
	_check(int(rat["count"]) == 0, "RAT (NO_THRESHOLD hazard) → count 0")
	# An unknown zone → 0 (no upgradeMap).
	var unknown := GameState.upgrade_spawn("nope", T.GRASS, 12)
	_check(int(unknown["count"]) == 0, "unknown zone → count 0")
	# Exactly at threshold yields 1; just under yields 0 (floor boundary).
	_check(int(GameState.upgrade_spawn(H, T.GRASS, 6)["count"]) == 1, "grass len==thr → 1")
	_check(int(GameState.upgrade_spawn(H, T.GRASS, 5)["count"]) == 0, "grass len==thr-1 → 0")
	_check(int(GameState.upgrade_spawn(H, T.GRASS, 11)["count"]) == 1, "grass len 11 (thr 6) → 1")
	_check(int(GameState.upgrade_spawn(H, T.GRASS, 12)["count"]) == 2, "grass len 12 (thr 6) → 2")

# ── upgrade_spawn honours the EFFECTIVE (worker/ability-reduced) threshold ─────
# React counts upgrade tiles over its effectiveThresholds registry (src/GameScene.ts
# upgradeCountForChain); in the port credit_chain banks units and the HUD's "+N" badge BOTH
# divide by GameState.effective_threshold. The spawn must use that SAME reduced threshold, or a
# hired threshold-reduction worker under-spawns relative to the units it credits (and below the
# badge it shows). The static helper exposes this via the threshold_override arg (default -1 →
# RAW, so pure callers and a fresh game stay byte-identical); the instance upgrade_spawn_active
# passes effective_threshold(source_tile).
func _test_upgrade_spawn_effective_threshold() -> void:
	var H := ZoneConfig.HOME_ZONE
	# WHEAT (grain, RAW threshold 5) upgrades to veg → CARROT. A 4-chain is below the raw
	# threshold (default override) so it spawns nothing.
	_check(int(GameState.upgrade_spawn(H, T.WHEAT, 4)["count"]) == 0,
		"raw thr 5: 4-wheat chain → 0 (default override)")
	# An explicit effective threshold of 2 (what 3 farmers yield) → floor(4/2) = 2 CARROTs.
	var forced := GameState.upgrade_spawn(H, T.WHEAT, 4, 2)
	_check(int(forced["count"]) == 2 and int(forced["tile"]) == T.CARROT,
		"threshold_override 2: 4-wheat chain → 2 CARROT (grain→veg)")
	# A negative override falls back to the RAW threshold — the static default contract.
	_check(int(GameState.upgrade_spawn(H, T.WHEAT, 4, -1)["count"]) == 0,
		"threshold_override -1 → raw threshold (5) → 0")

	# Instance path: a hired threshold-reduction worker drives the count through
	# effective_threshold. 3 farmers → grain eff_threshold 2 → a 4-wheat chain spawns 2 CARROTs,
	# matching the units credit_chain banks for the same chain (run_workers_tests covers that).
	var farmed := GameState.new()
	farmed.workers[WorkerConfig.FARMER] = 3
	_check(farmed.effective_threshold(T.WHEAT) == 2, "(setup) 3 farmers → wheat eff_threshold 2")
	var up := farmed.upgrade_spawn_active(H, T.WHEAT, 4)
	_check(int(up["count"]) == 2,
		"3 farmers: 4-wheat chain spawns 2 upgrade tiles (was 0 with the raw threshold)")
	_check(int(up["tile"]) == T.CARROT, "3 farmers: the upgrade tile is CARROT (grain→veg)")

	# Determinism contract: a fresh game (0 workers) spawns the SAME count as the static RAW
	# helper — effective == raw, byte-identical to the pre-workers economy.
	var fresh := GameState.new()
	_check(int(fresh.upgrade_spawn_active(H, T.WHEAT, 5)["count"])
			== int(GameState.upgrade_spawn(H, T.WHEAT, 5)["count"]),
		"0 workers: instance path == static raw helper (byte-identical)")

# ── Board: a resolved BIRDS chain ≥6 injects PIG upgrade tiles ─────────────────

func _test_board_injects_birds_to_pig() -> void:
	# Pool is GRASS only, so a PIG on the board can ONLY have come from the upgrade injection
	# (never a pool draw). Top two rows are PHEASANT (birds), the rest GRASS, so the row-0
	# chain of 6 birds is the only birds chain and refill draws grass.
	var b := _upgrade_board(T.GRASS)
	await process_frame
	b.grid = _top_chain_grid(T.PHEASANT, T.GRASS)
	b._build_tiles()
	_check(_grid_count(b.grid, T.PIG) == 0, "(setup) no PIG before the chain")
	# Chain 6 birds across row 0 → upgrade_spawn → count 1 PIG.
	var ok := b.try_resolve(_row0_path(6))
	_check(ok, "6-bird chain resolves")
	_check(_grid_count(b.grid, T.PIG) == 1,
		"after a 6-bird chain the board contains exactly 1 PIG (herd upgrade tile)")
	# The PIG is a REAL board tile: the board is full + still a live (chainable) board.
	var empties := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if b.grid[r][c] == Constants.EMPTY:
				empties += 1
	_check(empties == 0, "board is full after the upgrade injection (no EMPTY cells)")
	_check(BoardLogic.has_valid_chain(b.grid), "board remains a live, chainable board")
	# The PIG sits in the freshly-refilled TOP region (an injected refill cell), not a survivor.
	var pig_in_top := false
	for r in range(0, Constants.ROWS):
		for c in Constants.COLS:
			if b.grid[r][c] == T.PIG:
				pig_in_top = true
	_check(pig_in_top, "the injected PIG is present on the board grid")
	b.queue_free()

# ── Board: grass → PHEASANT (a 12-grass chain injects 2 birds) ─────────────────

func _test_board_injects_grass_to_pheasant() -> void:
	# Pool is WHEAT only, so PHEASANT can ONLY come from the upgrade injection. We need a
	# 12-cell grass chain — the whole top two rows (12 cells) are grass; snake across both.
	var b := _upgrade_board(T.WHEAT)
	await process_frame
	b.grid = _top_chain_grid(T.GRASS, T.WHEAT)
	b._build_tiles()
	_check(_grid_count(b.grid, T.PHEASANT) == 0, "(setup) no PHEASANT before the chain")
	# Snake path over the 12 grass cells (row 0 left→right, then row 1 right→left) — every
	# step is 8-adjacent, single-type, no revisits → a legal 12-chain.
	var path: Array = []
	for c in Constants.COLS:
		path.append(Vector2i(c, 0))
	for c in range(Constants.COLS - 1, -1, -1):
		path.append(Vector2i(c, 1))
	_check(path.size() == 12, "(setup) snake path is 12 cells")
	var ok := b.try_resolve(path)
	_check(ok, "12-grass chain resolves")
	# grass (threshold 6) at len 12 → 2 PHEASANT upgrade tiles.
	_check(_grid_count(b.grid, T.PHEASANT) == 2,
		"a 12-grass chain (thr 6) injects exactly 2 PHEASANT upgrade tiles (grass→birds)")
	_check(BoardLogic.has_valid_chain(b.grid), "board still live after the 2-tile upgrade")
	b.queue_free()

# ── Board: a FRUIT chain (→ GOLD) spawns NO upgrade tile (coins only) ──────────

func _test_board_fruit_spawns_no_upgrade() -> void:
	# Pool is GRASS only. Top two rows are APPLE (fruit), rest GRASS. fruit→GOLD so NO upgrade
	# tile should appear — the only APPLEs left must be survivors of the original two rows that
	# weren't chained (we chain only row 0's 6 apples, leaving row 1's 6 to collapse down).
	var b := _upgrade_board(T.GRASS)
	await process_frame
	b.grid = _top_chain_grid(T.APPLE, T.GRASS)
	b._build_tiles()
	var apples_before := _grid_count(b.grid, T.APPLE)
	_check(apples_before == 12, "(setup) 12 apples (two rows) before the chain")
	var ok := b.try_resolve(_row0_path(6))
	_check(ok, "6-fruit chain resolves")
	# 6 apples were chained away; the other 6 survive (collapse down). NO new apple is injected
	# (fruit→GOLD), so the count is exactly the 6 survivors — never 7+.
	_check(_grid_count(b.grid, T.APPLE) == 6,
		"fruit→GOLD: only the 6 un-chained apples survive — NO upgrade APPLE injected")
	# And no OTHER farm upgrade tile leaked in (the refill pool is grass-only).
	_check(_grid_count(b.grid, T.PIG) == 0 and _grid_count(b.grid, T.CARROT) == 0,
		"fruit→GOLD spawns no upgrade tile of any kind")
	b.queue_free()

# ── Board: no provider installed → plain pool refill (mine/harbor parity) ──────

func _test_board_no_provider_is_plain_refill() -> void:
	# No upgrade_provider (the default — exactly the mine/harbor case, and any pre-A1b caller).
	# A 6-bird chain credits normally but injects NOTHING; the refill is a pure GRASS pool draw.
	var b := Board.new()
	b.tile_pool = [T.GRASS]
	b.rng.seed = 4321
	# upgrade_provider left UNSET (invalid Callable).
	root.add_child(b)
	await process_frame
	_check(not b.upgrade_provider.is_valid(), "(setup) no upgrade_provider installed")
	b.grid = _top_chain_grid(T.PHEASANT, T.GRASS)
	b._build_tiles()
	var ok := b.try_resolve(_row0_path(6))
	_check(ok, "6-bird chain resolves with no provider")
	_check(_grid_count(b.grid, T.PIG) == 0,
		"no provider: a 6-bird chain injects NO PIG (board refills from the pool only)")
	b.queue_free()

# ── Board: a below-threshold farm chain injects nothing ───────────────────────

func _test_board_below_threshold_no_upgrade() -> void:
	# A 3-bird chain (below the birds threshold of 6) earns no upgrade — count floors to 0.
	var b := _upgrade_board(T.GRASS, 777)
	await process_frame
	b.grid = _top_chain_grid(T.PHEASANT, T.GRASS)
	b._build_tiles()
	var ok := b.try_resolve(_row0_path(3))
	_check(ok, "3-bird chain resolves")
	_check(_grid_count(b.grid, T.PIG) == 0,
		"below-threshold (3 < 6) bird chain injects NO PIG")
	b.queue_free()
