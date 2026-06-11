extends SceneTree
## Headless tests for the "Start Farming" UI (Task B): the StartFarmingModal picker/confirm
## card and the farm board-pad tap affordance on the town map.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_start_farming_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI auto-discovers + gates on it.
##
## Three layers (no real input events — drive accessors/signals directly, like
## run_townmap_tests):
##   1. StartFarmingModal — setup(game) builds the shell headlessly; preview_budget(); the
##      locked-on per-category SLOT + CHOOSER picker (default active variant == base tile;
##      open_chooser → choose_ a discovered variant updates active_variant_for + GameState; a
##      buy-variant flow grants coins → buy → it becomes choosable); Start enabled/disabled by
##      affordability + its start_requested(selected, use_fertilizer) emission.
##   2. TownMap.board_at_screen — the farm pad's screen centre round-trips to "farm"; a
##      far-off point returns "".
##   3. TownMapScreen.start_farming_requested — a tap on the farm pad fires the signal once
##      and opens NO build/demolish panel.

const StartFarmingModalScript := preload("res://scenes/StartFarmingModal.gd")
const TownMapScript := preload("res://scenes/town/TownMap.gd")

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
	print("\n── Start Farming UI (Task B) tests ────────────────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	await _test_modal()
	await _test_modal_orchard_preview()
	await _test_board_at_screen()
	await _test_screen_signal()
	await _test_main_wiring()
	await _test_expedition_input_gate()
	await _test_run_end_dismiss()
	await _test_apply_deeplink_board_gate()
	await _test_natural_expedition_exit_gate()

# ── 1. StartFarmingModal ───────────────────────────────────────────────────────

func _test_modal() -> void:
	# Build the modal BEFORE add_child to prove the shell builds without a live viewport.
	var game := GameState.new()
	game.coins = 50
	var m = StartFarmingModalScript.new()
	m.setup(game)
	_check(m._built, "setup(game) built the shell (headless, before add_child)")

	# Budget preview == game.farm_run_turn_budget(false) == 10 for the home zone.
	_check(m.preview_budget() == 10, "preview_budget() == 10 (game.farm_run_turn_budget(false))")

	# The home zone is locked-on: selected_categories() == every eligible category.
	var eligible: Array = ZoneConfig.eligible_categories("home")
	_check(m.selected_categories() == eligible,
		"selected_categories() == ZoneConfig.eligible_categories('home') (%s)" % str(eligible))
	# One locked-on SLOT button registered per category (NOT an on/off toggle).
	for c in eligible:
		_check(m._action_buttons.has("slot_" + String(c)), "registered a 'slot_%s' button" % String(c))

	# Each category's DEFAULT active variant == its base tile (the GameState default seed).
	for c in eligible:
		var cat: String = String(c)
		var expected: String = TileVariantConfig.default_active_by_category().get(cat, "")
		_check(m.active_variant_for(cat) == expected,
			"default active_variant_for('%s') == base '%s' (got '%s')" % [cat, expected, m.active_variant_for(cat)])

	# Now mount + open so the live render runs (affordable case).
	root.add_child(m)
	m.open()
	await process_frame
	_check(m.visible, "open() shows the modal")
	_check(m.chooser_open_for() == "", "no chooser open immediately after open()")
	_check(m._action_buttons.has("start") and not m._action_buttons["start"].disabled,
		"coins == 50 (>= 50 cost) → Start button ENABLED")

	# ── Zone-spawn info (review task 16): the season-drops "i" summary ──
	# A fresh game is Spring; the summary names the season's top categories from ZoneConfig.
	_check(m._current_season_name() == "Spring", "fresh game season is Spring")
	var summary: String = m.season_spawn_summary()
	# Spring's heaviest home-zone drop is grass (0.38) → "Grass 38%"; trees + grain also appear.
	_check(summary.contains("Grass 38%"), "Spring spawn summary leads with 'Grass 38%%' (got '%s')" % summary)
	_check(summary.contains("Trees") and summary.contains("Grain"),
		"Spring spawn summary lists Trees + Grain too")
	# Categories with weight 0 this season (flower/herd/cattle/mount) are omitted.
	_check(not summary.contains("Flower") and not summary.contains("Mount"),
		"zero-weight categories are omitted from the spawn summary")
	# The info card nodes exist + were filled on open().
	_check(m._spawn_info_title != null and m._spawn_info_title.text.contains("Spring"),
		"the spawn-info header names the current season")
	_check(m._spawn_info_body != null and m._spawn_info_body.text == summary,
		"the spawn-info body shows the season summary")

	# ── CHOOSER: open the grass slot → pick a DISCOVERED variant → active updates ──
	# Grass has a default base (tile_grass_grass) plus a 'default' heather? No — pick a known
	# discovered sibling. tile_grass_heather is chain-method (locked); we need a DISCOVERED one.
	# tile_grass_grass is default-discovered and is the base. We want to switch to a different
	# discovered variant: discover tile_grass_meadow directly (a chain-method variant) so it is
	# choosable, then pick it.
	game.discover_tile("tile_grass_meadow")
	m._action_buttons["slot_grass"].emit_signal("pressed")
	await process_frame
	_check(m.chooser_open_for() == "grass", "tapping slot_grass opened the chooser for 'grass'")
	_check(m._action_buttons.has("choose_tile_grass_meadow"),
		"the chooser lists a 'choose_' button for the discovered tile_grass_meadow")
	_check(m._action_buttons.has("choose_tile_grass_grass"),
		"the chooser lists a 'choose_' button for the base tile_grass_grass")
	m._action_buttons["choose_tile_grass_meadow"].emit_signal("pressed")
	await process_frame
	_check(m.active_variant_for("grass") == "tile_grass_meadow",
		"choosing tile_grass_meadow set the active variant")
	_check(game.active_tile_id_for_category("grass") == "tile_grass_meadow",
		"GameState.active_tile_id_for_category('grass') matches the chosen variant")
	_check(m.chooser_open_for() == "", "choosing a variant closed the chooser")

	# ── BUY flow: a buy-method variant becomes choosable after a buy ──
	# tile_bird_clover is a buy-method flower variant (coinCost 200), but flower is not a home
	# eligible category. Use a category we can open. Birds has no buy variant in the home set
	# either; clover sits under 'flower'. Instead use the chooser's buy path on the 'fruit'
	# category: tile_bird_melon is a buy-method FRUIT variant (coinCost 500).
	game.coins = 600
	m._action_buttons["slot_fruit"].emit_signal("pressed")
	await process_frame
	_check(m.chooser_open_for() == "fruit", "tapping slot_fruit opened the chooser for 'fruit'")
	_check(m._action_buttons.has("buy_tile_bird_melon"),
		"the locked buy-variant tile_bird_melon shows a 'buy_' button")
	_check(not m._action_buttons.has("choose_tile_bird_melon"),
		"the undiscovered buy-variant is NOT yet choosable")
	_check(not game.is_tile_discovered("tile_bird_melon"), "tile_bird_melon undiscovered pre-buy")
	m._action_buttons["buy_tile_bird_melon"].emit_signal("pressed")
	await process_frame
	_check(game.is_tile_discovered("tile_bird_melon"), "buying tile_bird_melon discovered it")
	_check(game.coins == 100, "buying tile_bird_melon spent 500 coins (600 → 100)")
	_check(m.chooser_open_for() == "fruit", "the chooser stays open after a buy")
	_check(m._action_buttons.has("choose_tile_bird_melon"),
		"the bought variant is now choosable (a 'choose_' button)")
	m._action_buttons["choose_tile_bird_melon"].emit_signal("pressed")
	await process_frame
	_check(m.active_variant_for("fruit") == "tile_bird_melon",
		"the freshly-bought variant can be activated")
	m._close_chooser()

	# Pressing Start emits start_requested(selected, false) then closes.
	var probe := {"fired": 0, "selected": [], "fert": null}
	m.start_requested.connect(func(sel: Array, fert: bool) -> void:
		probe.fired += 1
		probe.selected = sel
		probe.fert = fert)
	m._action_buttons["start"].emit_signal("pressed")
	await process_frame
	_check(probe.fired == 1, "Start fired start_requested exactly once")
	_check(probe.selected == eligible, "start_requested selection == all eligible categories")
	_check(probe.fert == false, "start_requested use_fertilizer == false (NO-FAKE: no primitive)")
	_check(not m.visible, "Start closed the modal")
	m.queue_free()
	await process_frame

	# Unaffordable case: a fresh modal with coins < 50 → Start disabled.
	var poor := GameState.new()
	poor.coins = 49
	var m2 = StartFarmingModalScript.new()
	m2.setup(poor)
	root.add_child(m2)
	m2.open()
	await process_frame
	_check(m2._action_buttons["start"].disabled, "coins == 49 (< 50 cost) → Start button DISABLED")
	_check("Not enough coin" in m2._action_buttons["start"].text,
		"unaffordable Start label reads 'Not enough coin' (got '%s')" % m2._action_buttons["start"].text)
	m2.queue_free()
	await process_frame

# ── 1b. StartFarmingModal at the ORCHARD (per-node board-template preview) ──────

## The modal PREVIEWS the ACTIVE farm zone, not a hardcoded home. Standing on the orchard node
## (board template ORCHARD_FARM: 7 categories incl. "herd", base 12, fruit-heavy Spring) the modal's
## slot set, budget, and season summary must follow the orchard — proving _zone resolves through
## game._active_farm_zone() rather than HOME_ZONE.
func _test_modal_orchard_preview() -> void:
	var game := GameState.new()
	game.map_current = "orchard"  # standing on the orchard farm node, no run active
	_check(game._active_farm_zone() == "orchard",
		"orchard: _active_farm_zone() resolves to 'orchard' (map_current, no run)")

	var m = StartFarmingModalScript.new()
	m.setup(game)
	root.add_child(m)
	m.open()
	await process_frame

	# Slot set follows the orchard's 7 eligible categories (incl. "herd"), not home's 6.
	var orchard_cats: Array = ZoneConfig.eligible_categories("orchard")
	_check(m.selected_categories() == orchard_cats,
		"orchard: selected_categories() == ZoneConfig.eligible_categories('orchard') (%s)" % str(orchard_cats))
	_check(orchard_cats.has("herd"),
		"orchard: the eligible set CONTAINS 'herd' (home/meadow lacks it)")
	_check(m._action_buttons.has("slot_herd"),
		"orchard: a 'slot_herd' button was registered (the orchard-only category slot)")

	# Budget follows the orchard base (12), no fertilizer.
	_check(m.preview_budget() == 12,
		"orchard: preview_budget() == 12 (orchard base, no fertilizer); got %d" % m.preview_budget())

	# The season summary is the orchard's fruit-heavy Spring — distinct from the home summary.
	var home_game := GameState.new()  # a fresh home game for the comparison summary
	var hm = StartFarmingModalScript.new()
	hm.setup(home_game)
	var home_summary: String = hm.season_spawn_summary()
	var orchard_summary: String = m.season_spawn_summary()
	_check(orchard_summary != home_summary,
		"orchard: season_spawn_summary() differs from the home summary (orchard is fruit-heavy)")
	hm.queue_free()
	m.queue_free()
	await process_frame

# ── 2. TownMap.board_at_screen ─────────────────────────────────────────────────

func _test_board_at_screen() -> void:
	var town_map: Node2D = TownMapScript.new()
	root.add_child(town_map)
	# A plan WITH a farm board (board_kinds includes "farm").
	var plan := TownLayout.build_plan("home", 7, ["farm"])
	town_map.render_plan(plan, 720.0, 1280.0, [])
	await process_frame
	_check(town_map._scale > 0.0, "render_plan produced a positive scale")

	var farm_center: Vector2 = town_map.board_screen_center("farm")
	_check(farm_center.x != INF, "board_screen_center('farm') resolved a finite centre")
	_check(town_map.board_at_screen(farm_center) == "farm",
		"board_at_screen(centre of farm pad) == 'farm' (round-trips)")
	_check(town_map.board_at_screen(Vector2(-9999.0, -9999.0)) == "",
		"board_at_screen(far outside) == '' (no board hit)")
	town_map.queue_free()
	await process_frame

# ── 3. TownMapScreen.start_farming_requested ───────────────────────────────────

func _test_screen_signal() -> void:
	var game := GameState.new()
	game.settlement.tier = TownConfig.TIER_VILLAGE
	var screen := TownMapScreen.new()
	root.add_child(screen)
	screen.setup(game)
	screen.open()
	await process_frame

	var map = screen._map
	_check(map != null, "TownMapScreen exposes its TownMap node")
	var farm_center: Vector2 = map.board_screen_center("farm")
	_check(farm_center.x != INF, "the rendered plan has a farm board pad")
	_check(map.board_at_screen(farm_center) == "farm", "farm pad centre resolves to 'farm' on the live screen")

	var probe := {"fired": 0}
	screen.start_farming_requested.connect(func() -> void: probe.fired += 1)

	# Drive the tap-resolution path directly (mirrors how run_townmap_tests drives clicks).
	screen._resolve_lot_click(farm_center)
	await process_frame
	_check(probe.fired == 1, "tapping the farm pad fired start_farming_requested exactly once")
	# The farm-pad tap must NOT open a build/demolish panel — it's its own affordance.
	_check(not screen._action_buttons.has("demolish"), "farm-pad tap opened NO demolish (built-lot) panel")
	_check(not screen._action_buttons.has("picker_close"), "farm-pad tap opened NO build picker")

	screen.queue_free()
	await process_frame

# ── 4. Main wiring (Task C): start a run → live board; end a run → back to town ─────────────

## Drive the Task C Main orchestration through its handler methods (no real input events): a
## successful _on_start_farming makes the board LIVE with a run active and lands on the board
## (router NONE); a failed start surfaces no run; and _on_season_return ends the run, makes the
## board INERT again, and reopens the town home.
func _test_main_wiring() -> void:
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Fresh headless launch → no run → the board is gated INERT (town-is-home; headless does NOT
	# auto-open town, so the board is rendered-but-inert).
	_check(not main.game.farm_run_active, "fresh launch: no farm run active")
	_check(not main.board.active, "fresh launch (no run): board is INERT")

	# A FAILED start (no coin) surfaces no run and leaves the board inert.
	main.game.coins = 0
	main._on_start_farming([], false)
	await process_frame
	_check(not main.game.farm_run_active, "start with 0 coins → no run started")
	_check(not main.board.active, "failed start leaves the board inert")

	# A SUCCESSFUL start → run active, board live, lands on the board (router NONE), picker closed.
	main.game.coins = 50
	main._on_start_farming(["trees"], false)
	await process_frame
	_check(main.game.farm_run_active, "successful start → farm_run_active")
	_check(main.board.active, "successful start → board is LIVE")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"successful start lands on the board (router NONE)")
	_check(main._startfarming_modal == null or not main._startfarming_modal.visible,
		"successful start closed the picker modal")
	_check(main.game.coins == 0, "successful start charged the 50-coin entry cost")

	# End the run via the run-end return path → close_season clears the run, board goes inert,
	# the town home reopens, and the +25 return bonus landed.
	var coins_before: int = main.game.coins
	main._on_season_return()
	await process_frame
	_check(not main.game.farm_run_active, "_on_season_return cleared the run")
	_check(not main.board.active, "_on_season_return made the board INERT (back to town)")
	_check(main.game.coins == coins_before + 25, "_on_season_return granted the +25 return bonus")
	_check(main._townmap_screen != null and main._townmap_screen.visible,
		"_on_season_return reopened the town home (town map visible)")

	main.queue_free()
	await process_frame
	SaveManager.clear()

# ── 5. BUG C1: the expedition / boss input gate ────────────────────────────────

## A non-farm expedition (mine/harbor) and a boss fight are PLAYABLE board sessions even with
## NO farm run active — the board must be LIVE for them. Regression for BUG C1, where the gate
## only checked farm_run_active so entering the mine / starting a boss left the board INERT and
## the expedition/fight unplayable. Drives the REAL wiring: game.enter_mine() + main._on_town_changed()
## (exactly what the TownScreen state_changed / cartography travel path calls).
func _test_expedition_input_gate() -> void:
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Fresh launch, no run → board INERT (the town-is-home baseline).
	_check(not main.game.farm_run_active, "C1 setup: fresh launch has no farm run")
	_check(not main.board.active, "C1: fresh launch (no run) → board INERT")

	# Enter the MINE the real way (City tier + supplies), then run the town-changed funnel.
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.inventory["supplies"] = 3
	var mine_res: Dictionary = main.game.enter_mine()
	_check(bool(mine_res.get("ok", false)), "C1 setup: enter_mine() succeeded at City + supplies")
	main._on_town_changed()
	await process_frame
	_check(main.game.is_in_mine(), "C1: is_in_mine() true after entering")
	_check(main.board.active, "C1: entering the mine (no run) makes the board LIVE")

	# Leave the mine the real way → back on the farm with no run → board INERT again.
	main.game.leave_mine()
	main._on_town_changed()
	await process_frame
	_check(not main.game.is_in_mine(), "C1: left the mine (back on the farm)")
	_check(not main.board.active, "C1: leaving the mine with no run makes the board INERT again")

	# BOSS: fought ON the farm board (active_biome stays 'farm'), so the gate must go live for it.
	# Meet the boss gate (City + 12 combined mine goods), start the fight, run the funnel.
	main.game.inventory["block"] = 12
	var boss_res: Dictionary = main.game.start_boss()
	_check(bool(boss_res.get("ok", false)), "C1 setup: start_boss() succeeded (City + 12 mine goods)")
	_check(main.game.is_boss_active(), "C1 setup: boss is active")
	_check(main.game.active_biome == "farm", "C1 setup: the boss is fought on the farm board")
	main._on_town_changed()
	await process_frame
	_check(main.board.active, "C1: a boss fight on the farm (no run) makes the board LIVE")

	main.queue_free()
	await process_frame
	SaveManager.clear()

# ── 6. BUG I1: dismissing the run-end modal completes the return (no exploit) ───

## The run-end "Harvest Complete" modal must complete the return-to-town (close_season → +25,
## run cleared, board inert) NO MATTER how it is dismissed — including a scrim-tap / ESC that
## fires only `closed` (NOT the "Return to Town" CTA's return_to_town). Regression for BUG I1,
## where a dismiss bypassed close_season, leaving the run live + the board active → unlimited
## re-harvest. Also confirms the CTA path grants exactly +25 once (no double-grant via the
## idempotent close_season guard).
func _test_run_end_dismiss() -> void:
	# ── 6a. DISMISS (not the CTA) still completes the return ──
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	main.game.coins = 50
	main._on_start_farming(["trees"], false)
	await process_frame
	_check(main.game.farm_run_active, "I1 setup: run started")
	_check(main.board.active, "I1 setup: board live during the run")

	# Park the run one farm turn short of its budget, then resolve ONE benign farm chain so the
	# NEXT note_farm_turn() crosses the boundary → the run ENDS and the run-end modal opens.
	main.game.farm_turns_used = main.game.farm_run_budget - 1
	main._on_chain_resolved(Constants.Tile.GRASS, 1)
	await process_frame
	_check(main.game.farm_run_active and main.game.farm_run_turns_left == 0,
		"I1: a chain at the budget ends the run (ended-but-unclosed: active && 0 turns left)")
	_check(not main.board.active, "I1: the board goes INERT the instant the run ends")
	_check(main._harvest_modal != null and main._harvest_modal.visible,
		"I1: the run-end HarvestModal opened")

	var coins_before: int = main.game.coins
	# DISMISS via the modal's own close() — the scrim/ESC path — NOT the Return-to-Town CTA.
	main._harvest_modal.close()
	await process_frame
	_check(not main.game.farm_run_active, "I1: a DISMISS completed the return (run cleared)")
	_check(main.game.farm_run_turns_left == 0, "I1: turns_left stays 0 after the return")
	_check(main.game.coins == coins_before + 25, "I1: a DISMISS granted the +25 close_season bonus")
	_check(not main.board.active, "I1: the board stays INERT after the dismiss-return")
	_check(main._townmap_screen != null and main._townmap_screen.visible,
		"I1: the dismiss-return reopened the town home")

	main.queue_free()
	await process_frame
	SaveManager.clear()

	# ── 6b. CTA "Return to Town" grants EXACTLY +25 once (no double-grant) ──
	var main2 = packed.instantiate()
	root.add_child(main2)
	await process_frame
	main2.game.coins = 50
	main2._on_start_farming(["trees"], false)
	await process_frame
	main2.game.farm_turns_used = main2.game.farm_run_budget - 1
	main2._on_chain_resolved(Constants.Tile.GRASS, 1)
	await process_frame
	_check(main2._harvest_modal != null and main2._harvest_modal.visible,
		"I1 (CTA): the run-end modal opened")
	var coins_before2: int = main2.game.coins
	# Press the run-end CTA. It emits return_to_town (→ _on_season_return → close_season grants +25
	# and clears the run), THEN close() → closed → _on_harvest_closed sees the run already cleared
	# (farm_run_active == false) → hide only, NO second return. Net: exactly one +25.
	main2._harvest_modal._action_buttons["return_town"].emit_signal("pressed")
	await process_frame
	_check(not main2.game.farm_run_active, "I1 (CTA): the CTA cleared the run")
	_check(main2.game.coins == coins_before2 + 25,
		"I1 (CTA): the CTA granted EXACTLY +25 (no double-grant via idempotent close_season)")
	_check(not main2.board.active, "I1 (CTA): the board is INERT after the CTA return")

	main2.queue_free()
	await process_frame
	SaveManager.clear()

# ── 7. BUG C1 Hole A: apply_deeplink("board") respects the full gate ──────────
## apply_deeplink("board") must NOT re-inert a live mine/harbor/boss board (it used
## to gate on farm_run_active ONLY, so an expedition was bounced to the town map).
## Conversely, with no run/expedition/boss it must redirect to the town home (gate
## stays false).
func _test_apply_deeplink_board_gate() -> void:
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame

	# ── 7a. While IN THE MINE: apply_deeplink("board") keeps the board LIVE ──────
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.inventory["supplies"] = 3
	var mine_res: Dictionary = main.game.enter_mine()
	_check(bool(mine_res.get("ok", false)), "Hole A setup: enter_mine() succeeded")
	main._on_town_changed()
	await process_frame
	_check(main.board.active, "Hole A setup: board is LIVE in the mine")

	# Now navigate away (open inventory) then call apply_deeplink("board") — must NOT
	# bounce to town (the pre-fix bug) and must keep the board LIVE.
	main.apply_deeplink("inventory")
	await process_frame
	main.apply_deeplink("board")
	await process_frame
	_check(main.board.active,
		"Hole A: apply_deeplink('board') while in mine keeps board LIVE (not bounced)")

	# ── 7b. With NO run/expedition/boss: apply_deeplink("board") stays inert ──────
	main.game.leave_mine()
	main._on_town_changed()
	await process_frame
	_check(not main.board.active, "Hole A setup: board INERT after leaving mine, no run")
	main.apply_deeplink("board")
	await process_frame
	_check(not main.board.active,
		"Hole A: apply_deeplink('board') with no run stays INERT (redirect to town)")
	_check(main._townmap_screen != null and main._townmap_screen.visible,
		"Hole A: the redirect landed on the town home")

	main.queue_free()
	await process_frame
	SaveManager.clear()

# ── 8. BUG C1 Hole B: natural mine exit lowers the board gate ─────────────────
## When a mine expedition naturally expires (last turn consumed via _on_chain_resolved),
## note_mine_turn() flips active_biome back to "farm" and the exit branch re-pools +
## regenerates the farm board — but previously NEVER lowered the gate, leaving an idle
## farm board LIVE. Drives the REAL _on_chain_resolved path.
func _test_natural_expedition_exit_gate() -> void:
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame

	# Enter mine with exactly 1 supply → 1 mine turn (so the NEXT chain resolves exits).
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.inventory["supplies"] = 1
	var mine_res: Dictionary = main.game.enter_mine()
	_check(bool(mine_res.get("ok", false)), "Hole B setup: enter_mine() with 1 supply succeeded")
	main._on_town_changed()
	await process_frame
	_check(main.board.active, "Hole B setup: board LIVE during the mine expedition")
	_check(main.game.mine_turns_left == 1, "Hole B setup: exactly 1 mine turn remaining")

	# Resolve one chain → note_mine_turn() hits 0 → expedition exits → farm board regenerates.
	# Use a STONE chain (mine tile) to exercise the mine credit path; length 1 is enough to tick.
	main._on_chain_resolved(Constants.Tile.STONE, 1)
	await process_frame

	# The expedition must be over and the gate must be lowered.
	_check(main.game.active_biome == "farm",
		"Hole B: after natural mine exit active_biome == 'farm'")
	_check(not main.game.farm_run_active,
		"Hole B: after natural mine exit farm_run_active == false")
	_check(not main.board.active,
		"Hole B: after natural mine exit board is INERT (gate lowered)")

	main.queue_free()
	await process_frame
	SaveManager.clear()
