extends SceneTree
## Headless scene-wiring smoke test. Instantiates the real Main scene (HUD +
## Board), drives one valid chain through the board's resolve path, and asserts
## the collapse+refill leaves a full board and that the resolved signal carries
## the right resource. Run from the godot/ project root:
##   godot --headless --script res://tests/run_scene_smoke.gd
## Exits 0 on success, 1 on any failure.

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
	print("\n── Scene smoke (Main + Board wiring) ──────────────")
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                        # let the deferred _ready run
	_check(main.board != null, "Main created a Board")

	var board: Board = main.board
	board.grid = _known_grid()                 # deterministic top-left GRASS L
	board._build_tiles()
	board.layout_for(Vector2(720, 1280))
	board.chain_resolved.connect(_on_resolved)

	var path := [Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)]
	var ok: bool = board.try_resolve(path)
	_check(ok, "try_resolve accepts a valid 3-chain")
	_check(not _resolved.is_empty(), "chain_resolved signal fired")
	if not _resolved.is_empty():
		var key: int = int(_resolved["key"])
		# Economy now lives in GameState; derive the resource from the chained tile.
		_check(Constants.produced_resource(key) == "hay_bundle",
			"resolved tile is GRASS family (produces hay_bundle)")
		_check(_resolved["length"] == 3, "resolved chain length is 3")
		# Credit the chain through GameState and confirm the accumulator path.
		var game := GameState.new()
		var res := game.credit_chain(key, int(_resolved["length"]))
		_check(res["resource"] == "hay_bundle", "GameState credits hay_bundle for GRASS")
		_check(game.turn == 1, "GameState turn advanced after crediting one chain")

	var empties := 0
	var missing := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if board.grid[r][c] == Constants.EMPTY:
				empties += 1
			if board.tiles[r][c] == null:
				missing += 1
	_check(empties == 0, "board is full after resolve (collapse + refill)")
	_check(missing == 0, "every cell has a live Tile node after resolve")
	_check(main._chain_label != null, "HUD chain label was built")
	# FIX 2: the build-time chain prompt placeholder must derive from Constants.MIN_CHAIN
	# (no baked "Drag 3+" literal), so the static text tracks the base min-chain value.
	if main._chain_label != null:
		_check(main._chain_label.text == "Drag %d+ matching tiles" % Constants.MIN_CHAIN,
			"HUD chain prompt placeholder interpolates Constants.MIN_CHAIN")

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _on_resolved(key: int, length: int) -> void:
	_resolved = {"key": key, "length": length}

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
