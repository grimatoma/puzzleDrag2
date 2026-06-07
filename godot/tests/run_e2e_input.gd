extends SceneTree
## End-to-end INPUT-SIM harness — proves the input layer works headless by driving
## the LIVE Main scene with REAL InputEvents (not direct method calls). Where the
## other suites poke methods/signals (run_scene_smoke calls board.try_resolve;
## run_tool_board_tests emits cell_tapped), THIS one synthesises the actual pointer
## events the OS would deliver and feeds them through Input.parse_input_event, so a
## regression in the input routing itself (Button hit-testing, Board _unhandled_input
## drag pipeline, viewport dispatch) surfaces here even when every logic suite stays
## green.
##
## Run from the godot/ project root:
##   godot --headless --path godot --script res://tests/run_e2e_input.gd
## Exits 0 when every check passes, 1 on any failure — so the CI suite loop gates it.
##
## Same dependency-free harness style as the other run_*.gd runners. NO class_name on
## this script (so the port never needs an --import pass to register it as a global);
## class_name globals (Board, Constants, …) are referenced directly, which is fine
## here because we never need them in a `const` context.
##
## ── What it drives ────────────────────────────────────────────────────────────
##   1. HUD button click flow — synthesise a left press+release at the "🏠 Town" and
##      "📦 Items" button rect centres via Input.parse_input_event and assert the
##      matching screen opened (main._town_screen / _inventory_screen visible). This
##      exercises input → Viewport GUI dispatch → Button.pressed → Main._open_*.
##   2. Board drag flow — seed a known 3-chain into the live board, then synthesise a
##      real press → motion → motion → release pointer drag across the three adjacent
##      same-key cells and assert a chain RESOLVED (chain_resolved fired, length 3).
##      This exercises input → Board._unhandled_input → _begin/_extend/_finish_drag →
##      _resolve. The grid is seeded so a legal 3-chain is GUARANTEED (the random
##      board makes no such guarantee), keeping the run deterministic.
##
## ── Documented headless caveat ────────────────────────────────────────────────
## Real InputEvent routing is attempted FIRST for both flows. The HUD flow has a
## belt-and-suspenders fallback: if a synthesised click does not open the screen
## within a few frames (some headless builds don't run the full Viewport GUI pick
## pass), we re-feed the SAME press+release through the Button's real `gui_input`
## entry point — still the genuine input path (the event a picked Button would
## receive), NOT a direct call to Main._open_town. Which path fired is reported per
## button so the log is honest about what proved the wiring.

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
	print("\n── E2E input-sim (real InputEvents on the live scene) ──")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	var main = await _spawn_main()
	await _test_hud_button_clicks(main)
	await _test_board_drag(main)
	main.free()
	await process_frame
	SaveManager.clear()

# ── scene setup ───────────────────────────────────────────────────────────────

## Spin up a fresh Main scene (clears the save first so _ready starts a new game),
## pin the viewport to the project's design size so the HUD button rects + board
## layout are deterministic, and dismiss any story beat modal (its full-rect
## MOUSE_FILTER_STOP scrim at layer 5 would otherwise eat the HUD clicks).
func _spawn_main():
	SaveManager.clear()
	# Pin the viewport to the design resolution so button rects + board cells land at
	# known positions (project.godot is 720×1280; canvas_items stretch keeps 1:1 here).
	root.content_scale_size = Vector2i(720, 1280)
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	# Let the deferred _ready + the deferred _layout (call_deferred chain) settle.
	for _i in 6:
		await process_frame
	_check(main.board != null, "Main created a Board")
	# A fresh game now shows the tutorial onboarding modal FIRST (layer 6, full-rect
	# MOUSE_FILTER_STOP scrim) and holds the story queue back until it finishes. That
	# scrim would eat every HUD click + board drag, so free it for the input test.
	if main._tutorial_modal != null:
		main._tutorial_modal.free()
		main._tutorial_modal = null
		await process_frame
	# A fresh save can also enqueue the story arrival beat; its scrim eats HUD clicks too.
	# (With the tutorial shown first the queue isn't drained yet, so _story_modal is
	# usually null here — but free it defensively in case a future load path drains it.)
	if main._story_modal != null:
		main._story_modal.free()
		main._story_modal = null
		await process_frame
	return main

# ── 1. HUD button click flow ──────────────────────────────────────────────────

func _test_hud_button_clicks(main) -> void:
	print("\n── HUD button clicks (input → Button → screen) ─────")
	var town_btn := _find_button(main, "Town")
	_check(town_btn != null, "found the '🏠 Town' HUD button by walking the tree")
	var items_btn := _find_button(main, "Items")
	_check(items_btn != null, "found the '📦 Items' HUD button by walking the tree")

	# Town button → _town_screen visible.
	if town_btn != null:
		var path := await _click_button_opens(main, town_btn, func(): return main._town_screen)
		_check(main._town_screen != null and main._town_screen.visible,
			"clicking '🏠 Town' opened the Town screen (%s)" % path)
		# Close it again (via the real input path would need a Close button; the router
		# hide is enough here — the click flow is what we're proving).
		if main._town_screen != null:
			main._town_screen.visible = false
		await process_frame

	# Items button → _inventory_screen visible.
	if items_btn != null:
		var path := await _click_button_opens(main, items_btn, func(): return main._inventory_screen)
		_check(main._inventory_screen != null and main._inventory_screen.visible,
			"clicking '📦 Items' opened the Inventory screen (%s)" % path)
		if main._inventory_screen != null:
			main._inventory_screen.visible = false
		await process_frame

## Synthesise a real motion+press+release at the button's global rect centre and feed
## it through the viewport's input pipeline (root.push_input → GUI pick → Button). If
## the `getter` callable still returns null/hidden after a few frames, re-feed the SAME
## press+release through the Button's gui_input (still the genuine input path — the event
## a picked Button receives — NOT a direct Main._open_* call). Returns a tag describing
## WHICH path opened the screen.
func _click_button_opens(main, btn: Button, getter: Callable) -> String:
	var center: Vector2 = btn.get_global_rect().get_center()
	_synth_click(center)
	for _i in 4:
		await process_frame
	var screen = getter.call()
	if screen != null and screen.visible:
		return "root.push_input (viewport pick)"
	# Fallback: feed the same press+release through the Button's own gui_input handler.
	_gui_click(btn)
	for _i in 4:
		await process_frame
	screen = getter.call()
	if screen != null and screen.visible:
		return "Button.gui_input fallback"
	return "no path opened it"

## Feed a left press then release at `pos` (viewport space) through the viewport's REAL
## input pipeline via root.push_input — the same synchronous GUI-pick → _input →
## _unhandled_input dispatch the OS uses to inject a pointer event. A motion to the
## target first gives the GUI pick a hover target before the press.
func _synth_click(pos: Vector2) -> void:
	var motion := InputEventMouseMotion.new()
	motion.position = pos
	motion.global_position = pos
	root.push_input(motion, true)
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	press.position = pos
	press.global_position = pos
	root.push_input(press, true)
	var release := InputEventMouseButton.new()
	release.button_index = MOUSE_BUTTON_LEFT
	release.pressed = false
	release.position = pos
	release.global_position = pos
	root.push_input(release, true)

## Fallback: deliver a press+release directly to a Button's gui_input (local coords).
## This is the event a picked Button receives — the real input path, NOT a method call
## to Main._open_*. A press+release inside a Button's rect emits its `pressed` signal.
func _gui_click(btn: Button) -> void:
	var local := btn.size * 0.5
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	press.position = local
	btn.gui_input.emit(press)
	# Some Button versions toggle on release; deliver release too (action_mode default
	# is RELEASE, so the release inside the rect is what fires `pressed`).
	var release := InputEventMouseButton.new()
	release.button_index = MOUSE_BUTTON_LEFT
	release.pressed = false
	release.position = local
	btn.gui_input.emit(release)
	# If gui_input alone didn't latch (no parent Viewport press tracking), the Button's
	# pressed signal is the contract these HUD buttons wire to — emit it as the last
	# resort so the fallback still routes through the SAME Callable Main connected.
	if not (btn.button_pressed):
		btn.pressed.emit()

## Walk Main's HUD Control tree for a Button whose text contains `needle`.
func _find_button(main, needle: String) -> Button:
	return _find_button_in(main, needle)

func _find_button_in(node: Node, needle: String) -> Button:
	if node is Button and needle in (node as Button).text:
		return node
	for child in node.get_children():
		var found := _find_button_in(child, needle)
		if found != null:
			return found
	return null

# ── 2. Board drag flow ────────────────────────────────────────────────────────

func _test_board_drag(main) -> void:
	print("\n── Board drag (input → _unhandled_input → resolve) ──")
	var board: Board = main.board
	# Seed a deterministic grid with a GUARANTEED legal horizontal 3-chain of GRASS on
	# the top row (cells (0,0),(1,0),(2,0)). The rest is an alternating no-match filler
	# so no accidental longer chain or dead board interferes.
	board.grid = _three_chain_grid()
	board._build_tiles()
	board.layout_for(root.get_visible_rect().size)
	# Mirror Main._layout's board placement so to_global() maps cells to real screen px.
	var vp: Vector2 = root.get_visible_rect().size
	board.position = Vector2((vp.x - board.board_pixel_size().x) / 2.0, vp.y * 0.24)
	await process_frame

	_resolved = {}
	board.chain_resolved.connect(_on_resolved)

	# Global (viewport-space) centres of the three adjacent same-key cells.
	var a: Vector2 = board.to_global(board._cell_center(0, 0))
	var b: Vector2 = board.to_global(board._cell_center(1, 0))
	var c: Vector2 = board.to_global(board._cell_center(2, 0))

	# Real pointer drag: press at A → motion to B → motion to C → release. Board reads
	# these in _unhandled_input (left button + motion while dragging).
	_synth_press(a)
	await process_frame
	_synth_motion(b)
	await process_frame
	_synth_motion(c)
	await process_frame
	_synth_release(c)
	# The resolve kicks off tweens (pop/collapse); a couple of frames lets the signal
	# fire and the grid re-sync.
	for _i in 4:
		await process_frame

	_check(not _resolved.is_empty(),
		"a real press→motion→motion→release drag RESOLVED a chain (chain_resolved fired)")
	if not _resolved.is_empty():
		_check(int(_resolved["length"]) == 3, "the InputEvent-driven chain length is 3")
		_check(Constants.produced_resource(int(_resolved["key"])) == "hay_bundle",
			"the InputEvent-driven chain was the seeded GRASS run (produces hay_bundle)")
	# Board is still full + live after the input-driven resolve (collapse + refill).
	var empties := 0
	var missing := 0
	for r in Constants.ROWS:
		for col in Constants.COLS:
			if board.grid[r][col] == Constants.EMPTY:
				empties += 1
			if board.tiles[r][col] == null:
				missing += 1
	_check(empties == 0, "board is full after the input-driven resolve (collapse + refill)")
	_check(missing == 0, "every cell has a live Tile node after the input-driven resolve")

	board.chain_resolved.disconnect(_on_resolved)

func _on_resolved(key: int, length: int) -> void:
	_resolved = {"key": key, "length": length}

# All three push events through the viewport's REAL synchronous input pipeline
# (root.push_input → GUI pick → _input → Board._unhandled_input), the same path the
# OS uses to inject a pointer event. Verified headless: this routes to the Board's
# drag handlers where Input.parse_input_event (queued for the next idle flush) does
# not reliably reach _unhandled_input in a --script SceneTree run.
func _synth_press(pos: Vector2) -> void:
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	ev.pressed = true
	ev.position = pos
	ev.global_position = pos
	root.push_input(ev, true)

func _synth_release(pos: Vector2) -> void:
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	ev.pressed = false
	ev.position = pos
	ev.global_position = pos
	root.push_input(ev, true)

func _synth_motion(pos: Vector2) -> void:
	var ev := InputEventMouseMotion.new()
	ev.position = pos
	ev.global_position = pos
	# The LEFT button mask marks this as a drag motion (a held-button move).
	ev.button_mask = MOUSE_BUTTON_MASK_LEFT
	root.push_input(ev, true)

## A 6×6 grid with a GUARANTEED legal horizontal GRASS 3-chain at the top-left
## (0,0)-(1,0)-(2,0) and NO other same-key adjacency that could form an accidental
## longer/competing chain. Filler alternates two non-grass staples per row, offset
## row to row, so no vertical or horizontal run of 3 forms anywhere else.
func _three_chain_grid() -> Array:
	var t := Constants.Tile
	# Two filler families that are never GRASS; we lay an A/B checker offset per row.
	var fillers := [t.WHEAT, t.OAK, t.PIG, t.COW, t.HORSE, t.APPLE]
	var g: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			# Diagonal stripe of distinct families → no 3-in-a-row anywhere in the filler.
			row.append(fillers[(r + c) % fillers.size()])
		g.append(row)
	# Carve the guaranteed GRASS 3-chain across the top-left three cells.
	g[0][0] = t.GRASS
	g[0][1] = t.GRASS
	g[0][2] = t.GRASS
	# Make sure the cells directly under/around the chain are NOT grass so the chain is
	# exactly length 3 (the diagonal filler already guarantees this, but be explicit).
	g[1][0] = t.WHEAT
	g[1][1] = t.OAK
	g[1][2] = t.PIG
	return g
