extends SceneTree
## Headless integration tests for M8c — the (M8a/M8b-tested) tool API wired into the
## LIVE board. Run from the godot/ project root:
##   godot --headless --script res://tests/run_tool_board_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## The pure layers (ToolEffects, ToolConfig, GameState.use_tool_on_grid) are covered by
## run_tools_tests.gd. THIS suite proves the WIRING: Main.use_tool / _on_tool_target +
## Board.apply_external_grid + Board targeting mode (set_targeting / cell_tapped), all
## driven on a real instantiated Main scene (the pattern from run_townmap_tests /
## run_inventory_tests / run_scene_smoke). It asserts:
##   • Instant tool: use_tool fires it NOW — the live grid changes, the cleared type is
##     gone, the charge decrements, and the chain credit landed in inventory.
##   • Tap tool: use_tool ARMS it (board targeting + game armed); a tapped cell fires
##     it (3x3 cleared+resolved), consumes the charge, leaves targeting + disarms.
##   • Guard: use_tool with no charges → false, board untouched, not targeting.
##   • Starter grant: a FRESH Main has the bomb/scythe starter set; a LOADED game with
##     existing tools is NOT double-granted.
##   • Regression: chains still resolve when NOT targeting (the normal drag/resolve
##     path is unaffected by the targeting branch).

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0
var _resolved: Dictionary = {}

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── Tools on the live board (M8c) ──────────────────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── grid fixture helpers (mirror run_tools_tests) ────────────────────────────

## A full 6x6 grid where every cell holds `tile`.
func _full(tile: int) -> Array:
	var g: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(tile)
		g.append(row)
	return g

## Count cells equal to `tile`.
func _count_of(grid: Array, tile: int) -> int:
	var n: int = 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == tile:
				n += 1
	return n

## Spin up a fresh Main scene (clears the save first so _ready starts a new game).
func _fresh_main():
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run
	return main

func _run() -> void:
	await _test_starter_grant_fresh_only()
	await _test_use_instant_tool()
	await _test_use_tap_tool()
	await _test_use_guard_no_charges()
	await _test_chain_resolves_when_not_targeting()
	await _test_tool_palette()
	SaveManager.clear()

# ── starter grant (fresh-only, no double-grant) ──────────────────────────────

func _test_starter_grant_fresh_only() -> void:
	var main = await _fresh_main()
	_check(main.game != null, "fresh Main owns a GameState")
	# A fresh game is granted the minimal starter set (bomb + scythe).
	_check(main.game.tool_count("bomb") == 1, "fresh Main starter-granted 1 bomb")
	_check(main.game.tool_count("scythe") == 1, "fresh Main starter-granted 1 scythe")
	main.free()
	await process_frame

	# A LOADED game with existing tools must NOT be re-granted. Stand up a save that
	# already owns a DIFFERENT tool count, persist it, then load a fresh Main: it must
	# keep exactly what was saved (no bomb/scythe top-up) because game.tools wasn't empty.
	var seeded := GameState.new()
	seeded.grant_tool("stone_hammer", 2)   # a non-starter tool, so a double-grant would show
	SaveManager.save(seeded)
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var loaded = packed.instantiate()
	root.add_child(loaded)
	await process_frame
	_check(loaded.game.tool_count("stone_hammer") == 2, "loaded game kept its saved stone_hammer charges")
	_check(loaded.game.tool_count("bomb") == 0, "loaded game NOT double-granted a starter bomb")
	_check(loaded.game.tool_count("scythe") == 0, "loaded game NOT double-granted a starter scythe")
	loaded.free()
	await process_frame
	SaveManager.clear()

# ── instant tool on the live board ───────────────────────────────────────────

func _test_use_instant_tool() -> void:
	var main = await _fresh_main()
	var board: Board = main.board
	_check(board != null, "Main created a Board")
	# Use stone_hammer (instant; clears all STONE → credits 'block'). Grant a couple so
	# we can see the charge decrement, and lay down a controlled grid with a known STONE
	# count. The fresh FARM board's refill pool is staples-only (no STONE), so after the
	# tool's collapse+refill the board can contain ZERO stone — a clean assertion.
	main.game.grant_tool("stone_hammer", 2)
	var g := _full(T.GRASS)
	g[0][0] = T.STONE
	g[0][1] = T.STONE
	g[3][3] = T.STONE
	g[5][5] = T.STONE   # 4 STONE total
	board.grid = g
	board._build_tiles()

	var block_before: int = main.game.qty("block")
	var ok: bool = main.use_tool("stone_hammer")
	_check(ok, "use_tool('stone_hammer') returned true (instant fired)")
	# The cleared type is gone from the LIVE board (staples-only pool can't refill STONE).
	_check(_count_of(board.grid, T.STONE) == 0, "no STONE remains on the live board after the instant tool")
	# Charge decremented 2 → 1.
	_check(main.game.tool_count("stone_hammer") == 1, "stone_hammer charge decremented (2 → 1)")
	# The chain credit landed: STONE produces 'block', so inventory gained block (or
	# progress carried) exactly like a chain of 4 would. Inventory grew by the units a
	# credit_chain(STONE,4) yields (compared against a twin so thresholds match).
	var twin := GameState.new()
	var expected := twin.credit_chain(T.STONE, 4)
	_check(main.game.qty("block") == block_before + int(expected["units"]),
		"instant tool credited 'block' like credit_chain(STONE,4) (units gained %d)" % int(expected["units"]))
	# Verify the carry-over progress matched the twin too — proves credit_chain ran with
	# the right length even when it's below the threshold (units 0 but progress moved).
	_check(int(main.game.progress.get("block", 0)) == int(twin.progress.get("block", 0)),
		"instant tool's 'block' carry-over progress matches credit_chain(STONE,4)")
	_check(int(twin.progress.get("block", 0)) == 4,
		"sanity: credit_chain(STONE,4) leaves 4 'block' progress (below threshold)")
	# And the board is still a full, live board (every cell filled + a Tile node present).
	var empties := 0
	var missing := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if board.grid[r][c] == Constants.EMPTY:
				empties += 1
			if board.tiles[r][c] == null:
				missing += 1
	_check(empties == 0, "board is full after apply_external_grid (collapse + refill)")
	_check(missing == 0, "every cell has a live Tile node after apply_external_grid")
	# Not targeting — an instant tool never arms.
	_check(not board._targeting, "board is NOT in targeting mode after an instant tool")
	_check(not main.game.is_tool_armed(), "no tool armed after an instant tool")
	main.free()
	await process_frame
	SaveManager.clear()

# ── tap tool on the live board ───────────────────────────────────────────────

func _test_use_tap_tool() -> void:
	var main = await _fresh_main()
	var board: Board = main.board
	# A fresh Main already has 1 bomb (starter grant); use that. Lay a controlled grid:
	# a 3x3 GEM block centred at (2,2) so the whole blast credits one resource (cut_gem),
	# the rest GRASS. The fresh farm pool is staples-only so no GEM can refill back in.
	_check(main.game.tool_count("bomb") == 1, "starter bomb present for the tap test")
	var g := _full(T.GRASS)
	for r in range(1, 4):
		for c in range(1, 4):
			g[r][c] = T.GEM   # 9 GEM in the 3x3 the bomb will clear
	board.grid = g
	board._build_tiles()

	# use_tool on a TAP tool ARMS it: targeting on + game armed, charge NOT yet spent.
	var armed_ok: bool = main.use_tool("bomb")
	_check(armed_ok, "use_tool('bomb') returned true (tap tool armed)")
	_check(board._targeting, "board is in targeting mode after arming a tap tool")
	_check(main.game.is_tool_armed(), "game.is_tool_armed() true after arming a tap tool")
	_check(main.game.pending_tool == "bomb", "pending_tool names the armed bomb")
	_check(main.game.tool_count("bomb") == 1, "tap tool charge NOT spent on arming")

	# Tap the centre cell — fires the armed bomb on the 3x3 around (2,2).
	var gem_before: int = main.game.qty("cut_gem")
	var twin := GameState.new()
	var expected := twin.credit_chain(T.GEM, 9)
	board.cell_tapped.emit(Vector2i(2, 2))
	# The 3x3 GEM block is cleared (staples pool can't refill GEM).
	_check(_count_of(board.grid, T.GEM) == 0, "the tapped 3x3 GEM block is cleared off the live board")
	# Charge consumed 1 → 0 (and the key erased — see use_tool_on_grid).
	_check(main.game.tool_count("bomb") == 0, "bomb charge consumed by the tap (1 → 0)")
	# Targeting + pending cleared after the tap fired.
	_check(not board._targeting, "board left targeting mode after the tap fired")
	_check(not main.game.is_tool_armed(), "pending_tool cleared after the tap fired")
	# The blast credited cut_gem like a chain of 9 GEM (units + carry-over both match).
	_check(main.game.qty("cut_gem") == gem_before + int(expected["units"]),
		"tap tool credited 'cut_gem' like credit_chain(GEM,9) (units gained %d)" % int(expected["units"]))
	_check(int(main.game.progress.get("cut_gem", 0)) == int(twin.progress.get("cut_gem", 0)),
		"tap tool's 'cut_gem' carry-over progress matches credit_chain(GEM,9)")
	# Board still full + live.
	var empties := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if board.grid[r][c] == Constants.EMPTY:
				empties += 1
	_check(empties == 0, "board is full after the tap tool's apply_external_grid")
	main.free()
	await process_frame
	SaveManager.clear()

# ── guard: no charges ─────────────────────────────────────────────────────────

func _test_use_guard_no_charges() -> void:
	var main = await _fresh_main()
	var board: Board = main.board
	# stone_hammer is NOT in the starter set, so a fresh Main owns 0 → use must refuse.
	_check(main.game.tool_count("stone_hammer") == 0, "fresh Main owns 0 stone_hammer (no starter)")
	var g := _full(T.GRASS)
	g[0][0] = T.STONE   # a STONE the tool WOULD clear if it ran
	board.grid = g
	board._build_tiles()
	var ok: bool = main.use_tool("stone_hammer")
	_check(not ok, "use_tool with no charges returned false")
	# Board untouched — the STONE we placed is still there, nothing collapsed/refilled.
	_check(board.grid[0][0] == T.STONE, "board grid unchanged after a refused tool")
	_check(_count_of(board.grid, T.STONE) == 1, "exactly the one placed STONE remains (no apply ran)")
	# Not targeting, nothing armed.
	_check(not board._targeting, "board is NOT in targeting mode after a refused tool")
	_check(not main.game.is_tool_armed(), "no tool armed after a refused tool")
	main.free()
	await process_frame
	SaveManager.clear()

# ── regression: chains still resolve when NOT targeting ──────────────────────

func _test_chain_resolves_when_not_targeting() -> void:
	var main = await _fresh_main()
	var board: Board = main.board
	# Targeting is OFF by default — the normal drag/resolve path must work unchanged.
	_check(not board._targeting, "board starts NOT targeting (normal chaining)")
	board.grid = _known_grid()                 # deterministic top-left GRASS L
	board._build_tiles()
	board.layout_for(Vector2(720, 1280))
	_resolved = {}
	board.chain_resolved.connect(_on_resolved)
	var path := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)]
	var ok: bool = board.try_resolve(path)
	_check(ok, "try_resolve accepts a valid 3-chain while NOT targeting")
	_check(not _resolved.is_empty(), "chain_resolved fired on a normal resolve (targeting did not block it)")
	if not _resolved.is_empty():
		_check(int(_resolved["length"]) == 3, "resolved chain length is 3")
		_check(Constants.produced_resource(int(_resolved["key"])) == "hay_bundle",
			"resolved tile is GRASS family (produces hay_bundle)")
	# Board still full after the normal resolve.
	var empties := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if board.grid[r][c] == Constants.EMPTY:
				empties += 1
	_check(empties == 0, "board is full after a normal chain resolve")
	board.chain_resolved.disconnect(_on_resolved)
	main.free()
	await process_frame
	SaveManager.clear()

func _on_resolved(key: int, length: int) -> void:
	_resolved = {"key": key, "length": length}

# ── M8d: ToolPalette HUD integration ─────────────────────────────────────────

func _test_tool_palette() -> void:
	print("\n── ToolPalette (M8d) ──────────────────────────────")

	# ── 1. After _ready, palette is visible + starter tools are in _tool_buttons ──
	var main = await _fresh_main()
	_check(main._tool_palette_box != null, "M8d: _tool_palette_box exists")
	_check(main._tool_palette_box.visible, "M8d: palette visible after starter grant")
	_check(main._tool_buttons.has("bomb"),   "M8d: _tool_buttons has 'bomb'")
	_check(main._tool_buttons.has("scythe"), "M8d: _tool_buttons has 'scythe'")
	# Labels must include the tool names + charge counts.
	if main._tool_buttons.has("bomb"):
		var lbl: String = main._tool_buttons["bomb"].text
		_check("Bomb" in lbl, "M8d: bomb button label includes 'Bomb'")
		_check("×1" in lbl,   "M8d: bomb button label includes '×1'")
	if main._tool_buttons.has("scythe"):
		var lbl: String = main._tool_buttons["scythe"].text
		_check("Scythe" in lbl, "M8d: scythe button label includes 'Scythe'")
		_check("×1" in lbl,     "M8d: scythe button label includes '×1'")

	# ── 2. Pressing scythe button fires the instant tool, palette updates ────────
	# Lay a board with GRASS tiles so scythe (clear_random_n 6) has tiles to clear.
	var board: Board = main.board
	board.grid = _full(T.GRASS)
	board._build_tiles()
	# scythe is instant — pressing its button fires it now.
	_check(main._tool_buttons.has("scythe"), "M8d: scythe button present before press")
	main._tool_buttons["scythe"].pressed.emit()
	# After the emit, _refresh_tools ran and the scythe (1 charge → 0) is removed.
	_check(not main._tool_buttons.has("scythe"),
		"M8d: scythe button removed from _tool_buttons after its charge was spent")
	# Charge is gone.
	_check(main.game.tool_count("scythe") == 0, "M8d: scythe charge 0 after button press")

	main.free()
	await process_frame
	SaveManager.clear()

	# ── 3. Pressing bomb button ARMS it (tap tool) — status hint + targeting ─────
	var main2 = await _fresh_main()
	var board2: Board = main2.board
	board2.grid = _full(T.GRASS)
	board2._build_tiles()
	_check(main2._tool_buttons.has("bomb"), "M8d: bomb button present before press")
	main2._tool_buttons["bomb"].pressed.emit()
	# After pressing, the bomb is armed (tap tool path in use_tool).
	_check(main2.game.is_tool_armed(), "M8d: game.is_tool_armed() true after bomb button press")
	_check(board2._targeting,          "M8d: board._targeting true after bomb button press")
	# Status label shows the targeting hint.
	var hint: String = main2._status_label.text
	_check("Tap" in hint or "tap" in hint, "M8d: status label shows a targeting hint after arming bomb")
	# Resolve the tap: fire the bomb at (2,2).
	main2._on_tool_target(Vector2i(2, 2))
	_check(not main2.game.is_tool_armed(),  "M8d: game disarmed after _on_tool_target")
	_check(not board2._targeting,           "M8d: board left targeting after _on_tool_target")
	# _after_tool_used (via _on_tool_target) called _refresh_tools → bomb is gone.
	_check(main2.game.tool_count("bomb") == 0, "M8d: bomb charge 0 after tap fired")
	_check(not main2._tool_buttons.has("bomb"), "M8d: bomb button removed after charge spent")

	main2.free()
	await process_frame
	SaveManager.clear()

	# ── 4. Empty tools → palette hidden, _tool_buttons empty ─────────────────────
	var main3 = await _fresh_main()
	# Drain all tools manually (game.tools cleared by erasing each key).
	main3.game.tools.clear()
	main3._refresh_tools()
	_check(not main3._tool_palette_box.visible, "M8d: palette hidden when game.tools empty")
	_check(main3._tool_buttons.is_empty(),      "M8d: _tool_buttons empty when no tools")
	main3.free()
	await process_frame
	SaveManager.clear()

## A deterministic board with a top-left GRASS L (reused from run_scene_smoke).
func _known_grid() -> Array:
	var t := Constants.Tile
	return [
		[t.GRASS, t.GRASS, t.WHEAT,  t.PIG,    t.COW,    t.HORSE],
		[t.GRASS, t.APPLE, t.OAK,    t.PANSY,  t.WHEAT,  t.CARROT],
		[t.OAK,   t.CARROT,t.PIG,    t.COW,    t.HORSE,  t.APPLE],
		[t.PIG,   t.COW,   t.HORSE,  t.APPLE,  t.OAK,    t.WHEAT],
		[t.COW,   t.HORSE, t.APPLE,  t.OAK,    t.CARROT, t.PIG],
		[t.HORSE, t.APPLE, t.OAK,    t.WHEAT,  t.PIG,    t.COW],
	]
