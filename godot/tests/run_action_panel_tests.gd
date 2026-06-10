extends SceneTree
## Headless integration tests for the board ACTION PANEL (the React PuzzleActionPanel
## port — godot/scenes/Hud.gd): ONE fixed card between the tool hotbar and the board
## that swaps between three exclusive states by what the player is doing:
##   IDLE  — the stockpile chip grid (React IdleView)
##   CHAIN — the live chain readout (React ChainView)
##   TOOL  — the inspected/armed tool detail (React ToolView)
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_action_panel_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Driven on a real instantiated Main scene (the run_tool_board_tests pattern) through
## the REAL wired paths: Board drags (_begin_drag/_extend_drag/_finish_drag →
## chain_changed → Main._on_chain_changed → Hud.set_live_chain), the hotbar slot taps
## (_on_tool_slot_tapped), and Main.use_tool/_disarm_tool. Asserts:
##   • exactly one state visible at a time, with React's chain > tool > idle priority;
##   • the ChainView math: "len/thr" counter, the carried base fill ("carried+len/thr"),
##     the loop past the threshold ("rem/thr +cycles"), the too-short header, the stage
##     banner at earned >= 1, the "+N" earned badge, the hazard "×N" fallback, and the
##     UPGRADE TO footer naming the zone's upgrade target;
##   • the ToolView flow: inspect (READY) → arm (ARMED) → disarm/fire → back to idle,
##     and the chain-end inspect reset (React's chainInfo-null effect);
##   • the panel band geometry: the panel and the board can never overlap.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── Action panel (React PuzzleActionPanel port) ────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	await _test_states_and_chain_math()
	await _test_tool_flow()
	await _test_fill_bias_flow()
	await _test_geometry()

## A full 6x6 grid where every cell holds `tile`.
func _full(tile: int) -> Array:
	var g: Array = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			row.append(tile)
		g.append(row)
	return g

## Spin up a fresh Main scene (clears the save first so _ready starts a new game).
func _fresh_main():
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run
	return main

## Drag a horizontal run of `n` cells along the top row (real Board drag path).
func _drag_top_row(board, n: int) -> void:
	board._begin_drag(Vector2i(0, 0))
	for c in range(1, n):
		board._extend_drag(Vector2i(c, 0))

func _test_states_and_chain_math() -> void:
	var main = await _fresh_main()
	var hud = main._hud
	var board = main.board
	board.set_active(true)
	board.grid = _full(T.GRASS)
	board._build_tiles()

	# ── default: IDLE (stockpile) ──
	_check(hud._action_idle.visible, "default state is IDLE (stockpile grid)")
	_check(not hud._action_chain.visible and not hud._action_tool.visible,
		"chain + tool views hidden at rest")

	# ── live drag below the minimum: CHAIN with the too-short header ──
	_drag_top_row(board, 2)
	_check(hud._action_chain.visible, "a 2-tile drag flips the panel to CHAIN")
	_check(not hud._action_idle.visible, "stockpile hidden during a drag")
	_check("1 MORE" in hud._chain_head_right.text,
		"too-short header counts the shortfall (got '%s')" % hud._chain_head_right.text)
	_check(hud._chain_prog_label.text == "2/6",
		"counter reads '2/6' (GRASS threshold 6; got '%s')" % hud._chain_prog_label.text)

	# ── valid chain: header names the produced resource; footer names the target ──
	board._extend_drag(Vector2i(2, 0))
	_check("HAY BUNDLE CHAIN" in hud._chain_head_right.text,
		"valid-chain header names the produced resource (got '%s')" % hud._chain_head_right.text)
	_check(not hud._chain_stage_label.visible, "no stage banner below one earned upgrade")
	_check(not hud._chain_earn_badge.visible, "no +N badge below one earned upgrade")
	_check(hud._chain_upg_row.visible, "the UPGRADE TO footer shows for a producer chain")
	_check(hud._chain_upg_count.text == "3/6",
		"footer progress reads '3/6' (got '%s')" % hud._chain_upg_count.text)
	_check(hud._chain_upg_name.text != "", "footer names the upgrade target tile")

	# ── past the threshold: the bar LOOPS, the banner + badge light up ──
	for c in range(3, Constants.COLS):
		board._extend_drag(Vector2i(c, 0))
	board._extend_drag(Vector2i(Constants.COLS - 1, 1))   # 7th tile, 8-adjacent below
	_check(hud._chain_prog_label.text == "1/6 +1",
		"looped counter reads '1/6 +1' at 7 tiles (got '%s')" % hud._chain_prog_label.text)
	_check(hud._chain_stage_label.visible and hud._chain_stage_label.text == "BONUS!",
		"stage banner reads BONUS! at one earned upgrade")
	_check(hud._chain_earn_badge.visible, "+N badge shows at one earned upgrade")
	_check(hud._chain_earn_label.text == "+1", "+N badge reads '+1'")

	# ── drag end: back to IDLE ──
	board._finish_drag()
	for _i in 4:
		await process_frame
	_check(hud._action_idle.visible, "panel returns to IDLE after the chain resolves")

	# ── carried progress feeds the base fill + the "carried+len/thr" counter ──
	# The 7-chain above banked progress 1 (7 % 6). Drag 3 more: carried 1 + live 3.
	board.grid = _full(T.GRASS)
	board._build_tiles()
	_check(int(main.game.progress.get("hay_bundle", 0)) == 1,
		"the resolved 7-chain carried progress 1 (7 %% 6)")
	_drag_top_row(board, 3)
	_check(hud._chain_prog_label.text == "1+3/6",
		"carried counter reads '1+3/6' (got '%s')" % hud._chain_prog_label.text)
	_check(hud._chain_fill_carried.visible, "the carried base fill renders")
	board._finish_drag()
	for _i in 4:
		await process_frame

	# ── hazard chain (no producer): plain ×N, no fills, no footer ──
	board.grid = _full(T.RAT)
	board._build_tiles()
	_drag_top_row(board, 3)
	_check(hud._action_chain.visible, "a RAT drag still flips the panel to CHAIN")
	_check(hud._chain_prog_label.text == "×3",
		"hazard counter reads '×3' (got '%s')" % hud._chain_prog_label.text)
	_check(not hud._chain_fill_carried.visible, "no carried fill for a hazard chain")
	_check(not hud._chain_upg_row.visible, "no UPGRADE TO footer for a hazard chain")
	board._finish_drag()
	for _i in 4:
		await process_frame

	main.free()
	await process_frame
	SaveManager.clear()

func _test_tool_flow() -> void:
	var main = await _fresh_main()
	var hud = main._hud
	var board = main.board
	board.set_active(true)
	board.grid = _full(T.GRASS)
	board._build_tiles()

	# ── inspect a tap tool: TOOL view in READY mode ──
	hud._on_tool_slot_tapped("bomb")
	_check(hud._action_tool.visible, "tapping a hotbar slot flips the panel to TOOL")
	_check("TOOL READY" in hud._tool_armed_title.text,
		"tap-tool header reads TOOL READY (got '%s')" % hud._tool_armed_title.text)
	_check(hud._tool_action_btn.text == "◎ ARM", "footer button offers ARM")
	_check(not main.game.is_tool_armed(), "inspecting does not arm")

	# ── a drag interrupts the inspect: CHAIN wins, and the end resets to IDLE ──
	_drag_top_row(board, 3)
	_check(hud._action_chain.visible and not hud._action_tool.visible,
		"a live chain takes priority over the tool inspect (React: chain > tool)")
	board._finish_drag()
	for _i in 4:
		await process_frame
	_check(hud._action_idle.visible,
		"chain end with nothing armed resets the inspect (React chainInfo-null effect)")

	# ── arm via the panel button: ARMED mode + DISARM affordance ──
	board.grid = _full(T.GRASS)
	board._build_tiles()
	hud._on_tool_slot_tapped("bomb")
	hud._on_tool_action_pressed()                # ◎ ARM → Main.use_tool arms it
	_check(main.game.is_tool_armed(), "the panel ARM button arms the tool")
	_check("TOOL ARMED" in hud._tool_armed_title.text,
		"header flips to TOOL ARMED (got '%s')" % hud._tool_armed_title.text)
	_check(hud._tool_action_btn.text == "✕ DISARM", "footer button offers DISARM while armed")
	_check(board._targeting, "the board is in targeting mode while armed")

	# ── an armed tool SURVIVES a chain-end reset (React keeps the armed inspect) ──
	_drag_top_row(board, 2)
	board._finish_drag()                          # too short — nothing resolves
	for _i in 2:
		await process_frame
	_check(hud._action_tool.visible and "ARMED" in hud._tool_armed_title.text,
		"the armed tool view survives a chain ending (armed ≠ plain inspect)")

	# ── disarm via the panel button: back to IDLE, board calm ──
	hud._on_tool_action_pressed()                # ✕ DISARM → Main._disarm_tool
	_check(not main.game.is_tool_armed(), "the panel DISARM button disarms")
	_check(not board._targeting, "the board leaves targeting mode on disarm")
	_check(hud._action_idle.visible, "panel returns to IDLE after disarm")

	main.free()
	await process_frame
	SaveManager.clear()

## Fill-bias (fertilizer &c) is armed via the transient bias, NOT pending_tool, so the action
## panel + hotbar must surface it through the SAME armed affordances as a tap-tool (React
## treats an armed fertilizer like an armed tool). Asserts: inspect → arm flips the panel to
## the ARMED fill_bias view with a DISARM button + a lit hotbar slot; the armed view survives
## a chain ending; DISARM refunds the spent charge and returns to IDLE; and tapping ANOTHER
## tool while a fill_bias is armed TRANSFERS the arming (disarm+refund the old, arm the new).
func _test_fill_bias_flow() -> void:
	var main = await _fresh_main()
	var hud = main._hud
	var board = main.board
	board.set_active(true)
	board.grid = _full(T.GRASS)
	board._build_tiles()

	# Own one fertilizer (a fill_bias tool) + one bomb (a tap tool, for the transfer check).
	main.game.grant_tool("fertilizer", 1)
	main.game.grant_tool("bomb", 1)
	hud._refresh_tools()
	_check(hud._tool_buttons.has("fertilizer"), "the fertilizer hotbar slot is built")

	# ── inspect the fill_bias tool: TOOL view in INSPECT mode (instant "USE NOW", not armed) ──
	hud._on_tool_slot_tapped("fertilizer")
	_check(hud._action_tool.visible, "tapping the fertilizer slot flips the panel to TOOL")
	_check("TOOL INSPECT" in hud._tool_armed_title.text,
		"un-armed fill_bias header reads TOOL INSPECT (got '%s')" % hud._tool_armed_title.text)
	_check(hud._tool_action_btn.text == "✓ USE NOW", "un-armed fill_bias footer offers USE NOW")
	_check(not main.game.is_fill_bias_armed(), "inspecting does not arm the bias")
	_check(not hud._is_armed_fill_bias("fertilizer"), "fertilizer slot not yet armed-highlighted")

	# ── arm via a second slot tap: the bias ARMS, the panel flips to the DISARM affordance ──
	hud._on_tool_slot_tapped("fertilizer")
	_check(main.game.is_fill_bias_armed(), "the second tap arms the fill_bias")
	_check(main.game.fill_bias_target == T.WHEAT, "fertilizer arms the bias to WHEAT")
	_check(main.game.tool_count("fertilizer") == 0, "arming spent the fertilizer charge (1 → 0)")
	_check(hud._action_tool.visible, "the panel stays on TOOL for the armed bias")
	_check("TOOL ARMED" in hud._tool_armed_title.text,
		"armed fill_bias header reads TOOL ARMED (got '%s')" % hud._tool_armed_title.text)
	_check(hud._tool_action_btn.text == "✕ DISARM", "armed fill_bias footer offers DISARM")
	_check(hud._is_armed_fill_bias("fertilizer"),
		"the fertilizer slot is armed-highlighted (drives the hotbar slot highlight)")
	_check(main.game.armed_fill_bias_tool() == "fertilizer",
		"the armed-bias tool id resolves to fertilizer")

	# ── the armed fill_bias SURVIVES a chain ending (armed ≠ plain inspect) ──
	_drag_top_row(board, 2)
	board._finish_drag()                          # too short — nothing resolves
	for _i in 2:
		await process_frame
	_check(hud._action_tool.visible and "ARMED" in hud._tool_armed_title.text,
		"the armed fill_bias view survives a chain ending")

	# ── DISARM via the panel button: the charge is REFUNDED, panel back to IDLE ──
	hud._on_tool_action_pressed()                 # ✕ DISARM → Main._disarm_tool (refund path)
	_check(not main.game.is_fill_bias_armed(), "the panel DISARM button disarms the bias")
	_check(main.game.fill_bias_target == Constants.EMPTY, "the bias target is cleared on disarm")
	_check(main.game.tool_count("fertilizer") == 1, "DISARM refunds the spent charge (0 → 1)")
	_check(hud._action_idle.visible, "panel returns to IDLE after the fill_bias disarms")

	# ── TRANSFER: tapping bomb while the fill_bias is armed disarms+refunds it, arms bomb ──
	hud._on_tool_slot_tapped("fertilizer")        # inspect …
	hud._on_tool_slot_tapped("fertilizer")        # … then arm the bias again
	_check(main.game.is_fill_bias_armed() and main.game.tool_count("fertilizer") == 0,
		"(setup) fill_bias re-armed for the transfer check")
	hud._on_tool_slot_tapped("bomb")              # tap a DIFFERENT tool → transfer the arming
	_check(not main.game.is_fill_bias_armed(),
		"tapping another tool disarms the fill_bias (React maybeTransferArming)")
	_check(main.game.tool_count("fertilizer") == 1, "the transfer refunds the fill_bias charge")
	_check(main.game.pending_tool == "bomb" and main.game.is_tool_armed(),
		"the transfer arms the newly-tapped tap-tool (bomb)")
	_check(hud._action_tool.visible and "ARMED" in hud._tool_armed_title.text,
		"the panel now shows the bomb armed (transfer complete)")

	main.free()
	await process_frame
	SaveManager.clear()

func _test_geometry() -> void:
	var main = await _fresh_main()
	var hud = main._hud
	# The fixed bands: the board's top edge (Main._layout uses hud.board_top()) must sit
	# BELOW the action panel's bottom edge — the regression this panel replaced was the
	# floating stockpile card painting over the board's bottom tile row.
	_check(hud.board_top() >= hud.PANEL_TOP + hud.PANEL_H,
		"the board band starts below the action panel (no overlap by construction)")
	var board = main.board
	var board_bottom: float = board.position.y + board.board_pixel_size().y
	var vp: Vector2 = root.get_visible_rect().size
	_check(board_bottom <= vp.y - float(UiKit.NAV_RESERVE),
		"the board's bottom row clears the bottom nav (got bottom %.0f, nav top %.0f)"
			% [board_bottom, vp.y - float(UiKit.NAV_RESERVE)])
	_check(board.position.y >= hud.board_top() - 0.5,
		"Main parks the board at the HUD's board_top line")
	main.free()
	await process_frame
	SaveManager.clear()
