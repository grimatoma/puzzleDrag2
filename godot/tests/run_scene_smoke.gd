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
		_check(_resolved["resource"] == "hay_bundle", "resolved resource is hay_bundle (GRASS family)")
		_check(_resolved["length"] == 3, "resolved chain length is 3")

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

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _on_resolved(key: int, length: int, resource: String, units: int) -> void:
	_resolved = {"key": key, "length": length, "resource": resource, "units": units}

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
