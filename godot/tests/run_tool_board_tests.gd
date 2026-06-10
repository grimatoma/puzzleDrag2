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
##   • Starter grant: a FRESH Main has the scythe×2 + bomb×1 + rake×1 starter rack; a LOADED
##     game with existing tools is NOT double-granted.
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
	await _test_tool_board_kind_filter()
	SaveManager.clear()

# ── starter grant (fresh-only, no double-grant) ──────────────────────────────

func _test_starter_grant_fresh_only() -> void:
	var main = await _fresh_main()
	_check(main.game != null, "fresh Main owns a GameState")
	# A3 — a fresh game is granted the starter rack: scythe×2 + bomb×1 + rake×1 (all real
	# ToolConfig ids; the honest port equivalent of the React fresh-game tool grant).
	_check(main.game.tool_count("scythe") == 2, "fresh Main starter-granted 2 scythe")
	_check(main.game.tool_count("bomb") == 1, "fresh Main starter-granted 1 bomb")
	_check(main.game.tool_count("rake") == 1, "fresh Main starter-granted 1 rake")
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
	_check(loaded.game.tool_count("rake") == 0, "loaded game NOT double-granted a starter rake")
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
	# The slots are now icon-only (matching React's tool strip); the tool name + charge
	# count live in the tooltip (the icon carries the visual meaning, a dark corner chip
	# shows the count). Assert the tooltip still carries name + "×N".
	if main._tool_buttons.has("bomb"):
		var lbl: String = main._tool_buttons["bomb"].tooltip_text
		_check("Bomb" in lbl, "M8d: bomb button tooltip includes 'Bomb'")
		_check("×1" in lbl,   "M8d: bomb button tooltip includes '×1'")
	if main._tool_buttons.has("scythe"):
		var lbl: String = main._tool_buttons["scythe"].tooltip_text
		_check("Scythe" in lbl, "M8d: scythe button tooltip includes 'Scythe'")
		# A3 — scythe is granted ×2 in the starter rack, so its tooltip reads "×2".
		_check("×2" in lbl,     "M8d: scythe button tooltip includes '×2' (starter ×2)")
	# A3 — the starter rack also includes a rake (tap tool); it should be in the palette.
	_check(main._tool_buttons.has("rake"), "M8d: _tool_buttons has 'rake' (starter rake)")

	# ── 2. Two-tap activate: first press INSPECTS, second press FIRES (instant tool) ──
	# (React PuzzleActionPanel parity: a tool tap inspects it in the action panel; the
	# already-inspected slot — or the panel's action button — activates it.)
	# Lay a board with GRASS tiles so scythe (clear_random_n 6) has tiles to clear.
	var board: Board = main.board
	board.grid = _full(T.GRASS)
	board._build_tiles()
	_check(main._tool_buttons.has("scythe"), "M8d: scythe button present before press")
	main._tool_buttons["scythe"].pressed.emit()
	# FIRST press only inspects: no charge spent, the action panel flips to its TOOL view.
	_check(main.game.tool_count("scythe") == 2, "panel: first press inspects — no charge spent")
	_check(main._hud._action_tool.visible, "panel: TOOL view visible after inspecting scythe")
	_check(not main._hud._action_idle.visible, "panel: stockpile hidden while a tool is inspected")
	_check("INSPECT" in main._hud._tool_armed_title.text,
		"panel: instant tool header reads TOOL INSPECT (got '%s')" % main._hud._tool_armed_title.text)
	# SECOND press (the slot is rebuilt on refresh — re-fetch it) activates: 2 → 1.
	main._tool_buttons["scythe"].pressed.emit()
	_check(main.game.tool_count("scythe") == 1, "M8d: scythe charge 2 → 1 after activate press")
	_check(main._tool_buttons.has("scythe"), "M8d: scythe button still present at 1 charge")
	# The tool stays inspected after an instant use, so the NEXT press fires directly.
	board.grid = _full(T.GRASS)
	board._build_tiles()
	main._tool_buttons["scythe"].pressed.emit()
	_check(not main._tool_buttons.has("scythe"),
		"M8d: scythe button removed from _tool_buttons after its last charge was spent")
	_check(main.game.tool_count("scythe") == 0, "M8d: scythe charge 0 after last press")
	# With the spent tool gone the panel falls back to the stockpile (idle) view.
	_check(main._hud._action_idle.visible, "panel: back to stockpile after the tool is spent")

	main.free()
	await process_frame
	SaveManager.clear()

	# ── 3. Two-tap arm: inspect then ARM the bomb (tap tool) — status hint + targeting ──
	var main2 = await _fresh_main()
	var board2: Board = main2.board
	board2.grid = _full(T.GRASS)
	board2._build_tiles()
	_check(main2._tool_buttons.has("bomb"), "M8d: bomb button present before press")
	main2._tool_buttons["bomb"].pressed.emit()
	# FIRST press inspects (TOOL READY — armable, not yet armed).
	_check(not main2.game.is_tool_armed(), "panel: first press inspects — bomb not armed yet")
	_check("READY" in main2._hud._tool_armed_title.text,
		"panel: tap-tool header reads TOOL READY (got '%s')" % main2._hud._tool_armed_title.text)
	# SECOND press arms it (tap tool path in use_tool).
	main2._tool_buttons["bomb"].pressed.emit()
	_check(main2.game.is_tool_armed(), "M8d: game.is_tool_armed() true after activate press")
	_check(board2._targeting,          "M8d: board._targeting true after activate press")
	_check("ARMED" in main2._hud._tool_armed_title.text,
		"panel: header flips to TOOL ARMED (got '%s')" % main2._hud._tool_armed_title.text)
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
	# The armed mode ended → the panel returns to the stockpile (idle) view.
	_check(main2._hud._action_idle.visible, "panel: back to stockpile after the tap fired")

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

# ── Board-kind filter: only tools relevant to the active board show on the hotbar ──────
# React parity: src/ui/puzzleToolFilter.ts visiblePuzzleTools limits the strip to tools
# whose ToolEntry.boardKind matches the active board (or "all"). The port mirrors the
# board-kind half via ToolConfig.is_tool_visible_on_board, read by Hud._refresh_tools.

func _test_tool_board_kind_filter() -> void:
	print("\n── Hotbar board-kind filter ───────────────────────")

	# 1. Pure ToolConfig accessors (no scene needed) — the new board_kind column + helpers.
	_check(ToolConfig.tool_board_kind("water_pump") == "mine", "water_pump board_kind is 'mine'")
	_check(ToolConfig.tool_board_kind("scythe") == "farm", "scythe board_kind is 'farm'")
	_check(ToolConfig.tool_board_kind("bomb") == "all", "bomb board_kind is 'all'")
	_check(ToolConfig.tool_board_kind("not_a_tool") == "all", "unknown id board_kind falls back to 'all'")
	# The harbor biome IS React's "fish" board (getPuzzleBoardKind).
	_check(ToolConfig.board_kind_for_biome("harbor") == "fish", "harbor biome maps to the 'fish' board")
	_check(ToolConfig.board_kind_for_biome("mine") == "mine", "mine biome maps to the 'mine' board")
	_check(ToolConfig.board_kind_for_biome("farm") == "farm", "farm biome maps to the 'farm' board")
	# A mine tool is hidden on the farm board; an "all" tool shows on both. The mine spawnable
	# set is passed so the hazard half of the filter sees lava (water_pump's target).
	var mine_haz: Array = ["cave_in", "gas_vent", "lava", "mole"]
	_check(not ToolConfig.is_tool_visible_on_board("water_pump", "farm", mine_haz),
		"water_pump is NOT board-visible on the farm (wrong board)")
	_check(ToolConfig.is_tool_visible_on_board("water_pump", "mine", mine_haz),
		"water_pump IS board-visible on the mine (lava spawnable)")
	_check(ToolConfig.is_tool_visible_on_board("bomb", "farm"), "bomb ('all') is board-visible on the farm")
	_check(ToolConfig.is_tool_visible_on_board("bomb", "mine"), "bomb ('all') is board-visible on the mine")
	_check(not ToolConfig.is_tool_visible_on_board("scythe", "mine"),
		"scythe ('farm') is NOT board-visible on the mine")

	# Hazard half of the filter (React puzzleToolFilter.ts): a hazard-only tool needs at least one
	# of its targets in `spawnable`. A general tool (empty hazard_targets) ignores spawnable.
	_check(ToolConfig.tool_hazard_targets("water_pump") == ["lava"], "water_pump counters ['lava']")
	_check(ToolConfig.tool_hazard_targets("explosives") == ["cave_in", "mole"],
		"explosives counters ['cave_in','mole']")
	_check(ToolConfig.tool_hazard_targets("cat") == ["rats"], "cat counters ['rats']")
	_check(ToolConfig.tool_hazard_targets("rifle") == ["wolves"], "rifle counters ['wolves']")
	_check(ToolConfig.tool_hazard_targets("hound") == ["wolves"], "hound counters ['wolves']")
	_check(ToolConfig.tool_hazard_targets("bomb").is_empty(), "bomb is a general tool (no hazard targets)")
	_check(ToolConfig.tool_hazard_targets("miners_hat").is_empty(),
		"miners_hat is NOT a hazard counter (reveal_tiles)")
	# water_pump on the mine but lava NOT spawnable → hidden (the core hazard gate).
	_check(not ToolConfig.is_tool_visible_on_board("water_pump", "mine", ["cave_in", "mole"]),
		"water_pump is HIDDEN on a mine board where lava can't spawn")
	# explosives needs only ONE of its two targets present.
	_check(ToolConfig.is_tool_visible_on_board("explosives", "mine", ["mole"]),
		"explosives SHOWS when only mole (one of its targets) is spawnable")
	# cat (rats) hidden on a farm board where rats aren't spawnable yet (pre-Town-2).
	_check(not ToolConfig.is_tool_visible_on_board("cat", "farm", ["wolves"]),
		"cat is HIDDEN on a farm board where rats can't spawn")
	_check(ToolConfig.is_tool_visible_on_board("cat", "farm", ["rats", "wolves"]),
		"cat SHOWS on a farm board where rats can spawn")

	# 2. Live HUD: grant a mine-only tool on a fresh FARM Main — it must NOT join the hotbar,
	# while the farm/all starter tools still do. This is the core regression the task asks for.
	var main = await _fresh_main()
	_check(main.game.active_biome == "farm", "fresh Main starts on the farm board")
	main.game.grant_tool("water_pump", 1)
	main._refresh_tools()
	_check(main._tool_buttons.has("scythe"), "farm starter scythe shows on the farm hotbar")
	_check(main._tool_buttons.has("bomb"),   "board-agnostic bomb shows on the farm hotbar")
	_check(main._tool_buttons.has("rake"),   "farm starter rake shows on the farm hotbar")
	_check(not main._tool_buttons.has("water_pump"),
		"mine-only water_pump is HIDDEN on the farm board (board-kind filter)")

	# 3. Flip the active board to the mine: water_pump + bomb now show; the farm-only scythe/rake hide.
	main.game.active_biome = "mine"
	main._refresh_tools()
	_check(main._tool_buttons.has("water_pump"),
		"mine-only water_pump SHOWS once the active board is the mine")
	_check(main._tool_buttons.has("bomb"), "board-agnostic bomb still shows on the mine board")
	_check(not main._tool_buttons.has("scythe"),
		"farm-only scythe is HIDDEN on the mine board (board-kind filter)")
	_check(not main._tool_buttons.has("rake"),
		"farm-only rake is HIDDEN on the mine board (board-kind filter)")

	main.free()
	await process_frame
	SaveManager.clear()

	# 4. Hazard-spawnability half (the OTHER React filter): on a FRESH farm Main (pre-Town-2),
	# rats can't spawn yet but wolves can. So Cat (rats counter) is HIDDEN while Rifle (wolves
	# counter) SHOWS — even though both are farm tools and both are owned.
	var m2 = await _fresh_main()
	_check(m2.game.active_biome == "farm", "fresh Main starts on the farm board")
	_check(not m2.game.rats_enabled(), "fresh Main has not finished Town 2 (rats disabled)")
	m2.game.grant_tool("cat", 1)
	m2.game.grant_tool("rifle", 1)
	m2.game.grant_tool("water_pump", 1)
	m2._refresh_tools()
	_check(m2.game.spawnable_hazards().has("wolves"), "wolves ARE spawnable on the farm board")
	_check(not m2.game.spawnable_hazards().has("rats"), "rats are NOT spawnable pre-Town-2")
	_check(m2._tool_buttons.has("rifle"),
		"Rifle (wolves counter) SHOWS on the farm — wolves are spawnable")
	_check(not m2._tool_buttons.has("cat"),
		"Cat (rats counter) is HIDDEN on the farm pre-Town-2 — rats can't spawn yet")
	_check(not m2._tool_buttons.has("water_pump"),
		"mine-only water_pump still hidden on the farm (board-kind)")

	# Finish Town 2 → rats become spawnable → Cat now SHOWS.
	m2.game.town2_complete = true
	m2._refresh_tools()
	_check(m2.game.spawnable_hazards().has("rats"), "rats ARE spawnable once Town 2 is complete")
	_check(m2._tool_buttons.has("cat"),
		"Cat (rats counter) SHOWS on the farm once rats can spawn (Town 2 done)")

	m2.free()
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
