extends SceneTree
## Visual regression harness — scenario × viewport golden-diff suite.
##
## Renders each game surface and compares it to a committed golden under
## tests/visual/__goldens__/<platform>/<scenario>/<viewport>.png (platform = OS.get_name(),
## e.g. "Windows" / "Linux"). This sidesteps the cross-platform pixel divergence (Windows/NVIDIA
## vs Linux/llvmpipe) by tagging goldens per platform.
##
## VIEWPORTS (M11 desktop framing). The game is authored at 720×1280 (logical content size, kept
## as content_scale_size for BOTH viewports so stretch=keep frames it). The suite captures two
## window shapes:
##   • portrait 720×1280 — native; window == content, no bars. Runs for ALL scenarios.
##   • desktop  1280×800 — landscape; window ≠ content, so the portrait content PILLARBOXES
##     centred. Runs for a representative subset (DESKTOP_SCENARIOS) where framing matters.
## The per-viewport golden filename (portrait.png / desktop.png) lets both coexist per scenario.
##
## Modes (per scenario × viewport):
##   • Golden EXISTS for the current platform → tolerant per-pixel diff (channel delta > 12 ⇒
##     differing pixel; FAIL the scenario if differing pixels > 1.0% of total).
##   • Golden MISSING for the current platform → render-smoke: assert the capture is exactly the
##     viewport's window size AND not a uniform/blank frame (real content present). A real check.
##
## Both modes contribute checks to the "N checks, M failure(s)" tally; exit 0 on all-pass.
##
## HEADLESS: Godot's headless display server produces NO rendering (blank frames), so this
## harness SKIPS CLEANLY when DisplayServer.get_name() == "headless" — keeping the existing
## headless CI sweep green. The real diff runs where a renderer exists (the dev's GPU machine
## or xvfb+opengl3 in CI).
##
## Run NON-headless so the GPU actually draws:
##   godot --path godot --script res://tests/run_visual_tests.gd                # diff mode
##   godot --path godot --script res://tests/run_visual_tests.gd -- --update    # refresh goldens
##
## On a real diff FAILURE the capture is written to tests/visual/__captures__/<scenario>-<viewport>.png
## (with the differing-pixel %) so a human can inspect. Goldens are loaded via
## Image.load_from_file(globalize_path(...)) — NOT the resource importer — and tests/visual/
## carries a .gdignore so Godot never imports the PNGs (no .import sidecars).

# ── Tuning ───────────────────────────────────────────────────────────────────────────────
# Logical content size — the base resolution the game is authored at. With stretch=keep this
# is ALWAYS the content_scale_size regardless of the on-screen window shape; the engine then
# letterboxes (portrait window) or pillarboxes (landscape window) the rendered result. Both
# viewports below keep THIS as content_scale_size and only differ in the WINDOW (capture) size.
const CONTENT_SIZE := Vector2i(720, 1280)

# Viewports the suite renders at. Each row: { name, size: Vector2i (the WINDOW size we resize to) }.
#   • portrait 720×1280 — the native authored size; window == content, no bars. Runs for ALL
#     scenarios (full coverage, unchanged).
#   • desktop 1280×800 — a LANDSCAPE desktop window. Window ≠ content, so stretch=keep frames
#     the 720×1280 portrait content centred — the meaningful framing test. Runs for a
#     representative subset (DESKTOP_SCENARIOS below) where framing matters.
#
# CAPTURE-SIZE NOTE. With stretch=keep + content_scale_mode=canvas_items, the root viewport's
# render target (what root.get_texture() yields) is the LARGEST CONTENT_SIZE-aspect rect that
# FITS the window — the engine pillarboxes by leaving the surrounding window area to the OS
# compositor (the bars aren't in the root texture). So the captured frame is:
#   portrait 1280-tall window → 720×1280 (window == fit, no shrink)
#   desktop  800-tall window  → height-bound: 800 × round(720/1280*800) = 450×800 (a fitted 9:16)
# This 9:16 capture IS the desktop-framed content as the player sees it centred in the window —
# correctly scaled, aspect-preserved, no clipping/distortion. _capture_size() computes it so the
# render-smoke size check (and the goldens) key on the real captured dimensions, not the window.
const VIEWPORTS := [
	{"name": "portrait", "size": Vector2i(720, 1280)},
	{"name": "desktop", "size": Vector2i(1280, 800)},
]

## The captured-frame size for a given WINDOW size: CONTENT_SIZE scaled to FIT (keep-aspect)
## inside the window — mirrors what stretch=keep/canvas_items renders into root.get_texture().
func _capture_size(win_size: Vector2i) -> Vector2i:
	var scale: float = minf(
		float(win_size.x) / float(CONTENT_SIZE.x),
		float(win_size.y) / float(CONTENT_SIZE.y))
	return Vector2i(roundi(CONTENT_SIZE.x * scale), roundi(CONTENT_SIZE.y * scale))

# Scenarios captured at the desktop (landscape) viewport — a representative subset spanning the
# board, the town map, both world maps, the inventory ledger, and a centred modal, so desktop
# pillarbox framing is proven across the surface shapes without re-shooting all 19 scenarios.
const DESKTOP_SCENARIOS := ["board-farm-idle", "board-farm-chain", "town-map", "cartography", "inventory", "menu"]

const CHANNEL_TOLERANCE := 12        # per-channel delta above which a pixel is "different"
const DIFF_FAIL_FRACTION := 0.01     # FAIL if differing pixels > 1.0% of total
const SETTLE_FRAMES := 22            # frames to await after seeding/deeplink before capture
# render-smoke: minimum distinct-ish colours for "has content". CALIBRATION (review-4): a
# genuinely blank/uniform frame measures < 10; a sparse-but-fully-rendered parchment modal
# (inventory empty-state, chronicle, daily card …) measures 116-192 under CI's llvmpipe
# software GL — the old 200 flagged every one of those real screens as BLANK (the standing
# godot-visual job failure). 80 keeps an 8× margin over a uniform frame while passing the
# sparsest real screen with headroom.
const SMOKE_MIN_DISTINCT := 80
const BOARD_RNG_SEED := 0xC0FFEE     # fixed board seed → deterministic tile layout per scenario

const GOLDEN_ROOT := "res://tests/visual/__goldens__"
const CAPTURE_ROOT := "res://tests/visual/__captures__"

var _checks: int = 0
var _failures: int = 0
var _update_mode: bool = false

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

# ── Scenario seed helpers (reused from the matching tools/*_capture.gd) ─────────────────────
# Each takes the live Main node and mutates its GameState the way the matching capture tool
# does. No fakes — every mutation is a real GameState path the live game performs.

## Settle in-flight tweens to a deterministic end state. The board's pop-in (0.13s) and fall
## (0.22s) tweens already complete within SETTLE_FRAMES at 60fps, so this is belt-and-suspenders:
## it rebuilds the board WITHOUT animation if the scene exposes that path, otherwise it's a
## harmless extra frame. Tweens are node-bound and not externally enumerable in Godot 4, so the
## reliable determinism guarantee comes from the fixed board seed + ample settle frames above.
func _freeze_tweens(main) -> void:
	# Pin any time-based, NON-frame-deterministic animation to a fixed end state so the
	# captured frame is identical across process launches. The only such animation in the
	# captured surfaces is the Toast's fade tween (FADE_IN→HOLD→FADE_OUT on _bubble.modulate.a):
	# its alpha at the fixed settle-frame count drifts run-to-run (separate GPU/timer state),
	# producing a multi-percent diff on the semi-transparent bubble. Kill the tween and pin the
	# bubble to FULL opacity so the toast is deterministically, fully visible every run.
	if main == null:
		return
	var toast = main._toast
	if toast != null and toast.visible and toast._bubble != null:
		if toast._tween != null and toast._tween.is_valid():
			toast._tween.kill()
		toast._bubble.modulate.a = 1.0
	# Pin the chain drag visuals (the ChainOverlay's sway/pulse phase + each selected tile's
	# lift pulse) to a fixed state so the board-farm-chain golden is identical every run. No-op
	# when no chain is held (overlay has no points; no tile is selected).
	if main.board != null:
		if main.board._chain_overlay != null:
			main.board._chain_overlay.freeze()
		for row in main.board.tiles:
			for t in row:
				if t != null:
					t.freeze_selection()
		# Pin the armed-tool frame pulse (board-farm-tool-armed golden): the red rings'
		# alpha breathes on _armed_phase, advanced per-frame while targeting — stop the
		# processing and zero the phase so the captured ring intensity is identical
		# every run. No-op when no tool is armed (processing is already off).
		if main.board._targeting:
			main.board.set_process(false)
			main.board._armed_phase = 0.0
			main.board.queue_redraw()

func _dismiss_tutorial(main) -> void:
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()

func _dismiss_story(main) -> void:
	main.game.story.beat_queue.clear()
	if main._story_modal != null:
		main._story_modal.visible = false

func _seed_none(_main) -> void:
	pass

## Task E — board-farm-idle now needs an ACTIVE bounded farm run so the playing board + season
## bar render exactly as the pre-feature golden did. The HUD season bar is HIDDEN when
## `not game.farm_run_active` (a deliberate feature change), so without a live run the captured
## board frame would LOSE the season strip and the board would gate inert (town-home backdrop).
## Marking a fresh run active (turn 0/10, the legacy home budget) reproduces the prior season-bar
## state EXACTLY (fresh Spring, empty progress) and flips the board playable. We then drive the
## REAL wired refresh paths (apply_deeplink("board") flips the board active + hides the auto-opened
## town overlay; _refresh_season_bar re-shows the strip) so the rendered frame matches the golden.
func _seed_board_farm_run(main) -> void:
	var game: GameState = main.game
	game.farm_run_active = true
	game.farm_run_budget = 10
	game.farm_run_turns_left = 10
	game.farm_run_zone = "home"
	game.farm_turns_used = 0
	game.active_biome = "farm"
	# Flip the board to its live/playable state and dismiss the idle-farm town overlay that
	# _ready auto-opened (now reachable because farm_run_active is true), then re-show the season
	# bar the run just armed. These are the same real paths the live game runs on run-start.
	main.apply_deeplink("board")
	main._refresh_season_bar()

## board-farm-stocked — the live farm run PLUS a populated inventory, so the idle action
## panel's chip grid renders real counts (and their cap-fill washes) instead of the
## all-dimmed empty roster. Mix of roster goods + one non-roster extra (block).
func _seed_board_farm_stocked(main) -> void:
	_seed_board_farm_run(main)
	var game: GameState = main.game
	game.inventory = {
		"flour": 5, "jam": 2, "hay_bundle": 14, "eggs": 3,
		"plank": 7, "soup": 1, "block": 3,
	}
	main._refresh_totals()

func _seed_achievements(main) -> void:
	# Mirrors tools/m10ach_capture.gd — drive a realistic mix of unlocked + mid-progress
	# trophies through the real wired paths.
	var game: GameState = main.game
	var t := Constants.Tile
	for _i in range(12):
		game.credit_chain(t.GRASS, 4)
	game.credit_chain(t.WHEAT, 3)
	game.credit_chain(t.CARROT, 3)
	game.credit_chain(t.APPLE, 3)
	game.credit_chain(t.OAK, 3)
	game.credit_chain(t.PANSY, 3)
	game.credit_chain(t.STONE, 18)
	game.credit_chain(t.GEM, 9)

func _seed_chronicle(main) -> void:
	# Mirrors tools/chronicle_capture.gd — mark a spread of beats fired across acts.
	_dismiss_story(main)
	var game: GameState = main.game
	for bid in [
		"act1_arrival", "act1_light_hearth", "act1_first_order", "act1_hamlet",
		"act2_kitchen", "act2_city_expedition", "act2_frostmaw_felled", "act3_rats",
	]:
		game.story.flags[StoryEngine.fired_key(bid)] = true

func _seed_townsfolk(main) -> void:
	# Mirrors tools/townsfolk_capture.gd — varied bonds so the bands show variety.
	_dismiss_story(main)
	var game: GameState = main.game
	var bonds: Dictionary = game.npcs.get("bonds", {})
	bonds["mira"] = 8.0
	bonds["bram"] = 3.0
	game.npcs["bonds"] = bonds

func _seed_cartography(main) -> void:
	# Mirrors tools/cartography_capture.gd — City-tier, Town-2-complete farm settlement
	# so both mine + harbor travel buttons read as enabled.
	var game: GameState = main.game
	game.settlement.tier = TownConfig.TIER_CITY
	game.coins = 980
	game.town2_complete = true
	game.active_biome = "farm"
	game.inventory = {"supplies": 8, "stone": 12, "flour": 6}
	_dismiss_story(main)

func _seed_castle(main) -> void:
	# Mirrors tools/castle_capture.gd — partial contribution + on-hand inventory.
	var game: GameState = main.game
	game.inventory["soup"] = 30
	game.inventory["meat"] = 25
	game.inventory["tile_mine_coal"] = 18
	game.contribute_to_castle("soup", 21)
	game.contribute_to_castle("meat", 15)
	game.contribute_to_castle("coal", 9)

func _seed_decorations(main) -> void:
	# Mirrors tools/decorations_capture.gd — plenty of coins + cost items, a couple built.
	var game: GameState = main.game
	game.coins = 5000
	game.inventory["tile_grass_grass"] = 40
	game.inventory["tile_mine_stone"] = 40
	game.inventory["tile_mine_coal"] = 40
	game.inventory["tile_fish_kelp"] = 40
	game.inventory["tile_fish_oyster"] = 40
	game.inventory["plank"] = 40
	game.inventory["berry"] = 40
	game.inventory["iron_bar"] = 40
	game.build_decoration("violet_bed")
	game.build_decoration("violet_bed")
	game.build_decoration("stone_lantern")

func _seed_portal(main) -> void:
	# Mirrors tools/portal_capture.gd — portal built + influence, a couple summoned.
	var game: GameState = main.game
	game.portal_built = true
	game.influence = 150
	game.summon_magic_tool("magic_wand")
	game.summon_magic_tool("miners_hat")

func _seed_charter(main) -> void:
	# Mirrors tools/charter_capture.gd — story flags + choice_log so the Terms tab shows a mix.
	var game: GameState = main.game
	game.turn = 12
	game.story.flags = {
		"intro_seen": true,
		"hearth_lit": true,
		"keeper_path_bound": true,
		"settlement_lives": true,
	}
	game.story.choice_log = [
		{"beat_id": "act1_arrival", "choice_id": "name"},
		{"beat_id": "act1_first_order", "choice_id": "deliver"},
		{"beat_id": "frostmaw_aftermath", "choice_id": "bind"},
	]

func _seed_quests(main) -> void:
	# Mirrors tools/quests_capture.gd — roll the 6 quests, complete a couple, award XP.
	var game: GameState = main.game
	game.ensure_quests()
	if game.quests.size() >= 1:
		game.quests[0]["progress"] = game.quests[0]["target"]
	if game.quests.size() >= 3:
		game.quests[2]["progress"] = game.quests[2]["target"]
	if game.quests.size() >= 2:
		game.quests[1]["progress"] = int(game.quests[1]["target"] / 2)
	game.coins = 1200
	game.award_xp(380)

func _seed_daily(main) -> void:
	# Mirrors tools/daily_capture.gd — set a streak day with a rich reward.
	var game: GameState = main.game
	game.daily_streak_day = 14
	game.daily_last_claimed = "2026-06-06"

func _seed_recipes(main) -> void:
	# Build the Bakery + stock ingredients so the recipe detail card renders the RICH
	# "Ready to craft" state — green Craft button + covered have/need chips — matching
	# React's crafting-bakery golden (which shows a built, stocked Bakery). Without this
	# a fresh Camp save shows "Station not built" + a disabled Craft, hiding the parity.
	var game: GameState = main.game
	if not game.buildings.has(BuildingConfig.BAKERY):
		game.buildings.append(BuildingConfig.BAKERY)
	game.inventory["flour"] = 12
	game.inventory["eggs"] = 12
	game.coins = 1200

func _seed_tutorial(main) -> void:
	# Tutorial: re-open the modal at step 0 (a fresh game auto-shows it; ensure it's up).
	if main._tutorial_modal != null:
		main._tutorial_modal.open()

func _seed_story_prompt(main) -> void:
	# Mirrors tools/story_capture.gd — present the arrival beat modal.
	if main._story_modal == null or not main._story_modal.visible:
		main._drain_story_queue()
	if main._story_modal != null:
		main._story_modal.open_for("act1_arrival")

# ── NEW (visual-expand) seed helpers ─────────────────────────────────────────────
# Each drives REAL GameState the way the live game does, then leans on the matching
# deeplink (and, where the screen needs a second interaction, a `post` Callable in the
# scenario row — see _scenarios()) to land on the intended surface.

func _seed_leaveboard(main) -> void:
	# Put the player ON an expedition (the SAME mutation enter_mine() makes) so the HUD
	# Town button's leave-confirm GATE arms for real. deeplink "leaveboard" then calls
	# arm() (not preview()), rendering the biome-specific "Leave the mine?" confirm card.
	var game: GameState = main.game
	game.active_biome = "mine"
	game.mine_turns_left = 6

func _seed_debug(main) -> void:
	# Seed real coins/runes/influence so the DEBUG readout shows non-zero values (the
	# modal reads g.coins / g.runes / g.influence live via readout_lines). deeplink "debug".
	var game: GameState = main.game
	game.coins = 4200
	game.runes = 18
	game.influence = 350

func _seed_inventory_search_empty(main) -> void:
	# Seed a few owned goods so the ledger has rows, then (in the row's `post` step, after
	# the inventory deeplink opens the screen) type a no-match query so the "No items match
	# '…'" empty-state line renders — the distinct content for this golden.
	var game: GameState = main.game
	game.inventory = {"flour": 12, "plank": 8, "eggs": 5}

func _seed_chronicle_empty(main) -> void:
	# A FRESH game with NO fired beats → the chronicle's empty state ("Your story begins…").
	# NOTE: _ready's start_story_session() fires the arrival beat IMMEDIATELY (post_story_event
	# calls apply_beat, which sets flags[_fired_act1_arrival]=true the moment it's enqueued — not
	# when it's presented). So clearing the queue alone isn't enough; we must also wipe the fired
	# markers so fired_count() == 0. Reset the whole story state to a clean slate (flags + queue +
	# choice_log) — the chronicle reads ONLY fired markers, so an empty flags dict yields 0 chapters.
	_dismiss_story(main)
	var game: GameState = main.game
	game.story.flags = {}
	game.story.choice_log = []
	game.story.beat_queue.clear()

func _seed_town_built_out(main) -> void:
	# Build a few REAL buildings through game.build() (NOT a direct buildings = [...] poke):
	# raise the tier so the spawners/refiner are unlocked, stock the inventory their costs
	# need, then build. The town map then renders these as placed houses on the first lots.
	var game: GameState = main.game
	game.settlement.tier = TownConfig.TIER_VILLAGE   # unlocks Lumber Camp, Coop, Garden, Bakery
	game.active_biome = "farm"
	game.inventory = {"hay_bundle": 40, "flour": 40, "plank": 40, "eggs": 20}
	game.build(BuildingConfig.LUMBER_CAMP)
	game.build(BuildingConfig.COOP)
	game.build(BuildingConfig.GARDEN)

func _seed_town_build_picker(main) -> void:
	# City tier (11 plots) + a generous inventory so the build-picker rows read as ENABLED
	# (can_build true). The picker is opened in the row's `post` step after the townmap
	# deeplink. Mirrors tools/m6d_capture.gd — the picker's "ready" state.
	var game: GameState = main.game
	game.settlement.tier = TownConfig.TIER_CITY
	game.active_biome = "farm"
	game.inventory = {"plank": 40, "flour": 40, "hay_bundle": 40, "eggs": 20}

## Task E — the "Start Farming" picker modal over the idle town home. Seed enough coins that the
## entry cost (50) is comfortably affordable, so the cost reads green + the Start CTA is ENABLED
## ("Start (50 🪙)") — the rich, actionable state. The `startfarming` deeplink opens the modal the
## way the live town-pad tap does (Main._open_startfarming lazily builds + wires + opens it).
func _seed_startfarming_modal(main) -> void:
	var game: GameState = main.game
	game.coins = 320
	game.active_biome = "farm"

## Task E — the run-end "Harvest Complete / Return to Town" HarvestModal (open_for_run_end). Mirror
## the live note_farm_turn() ended-boundary summary: the run just spent its 10-turn budget over a
## Winter close with a realistic coin/rune stockpile, so the recap + the "+25 🪙 return bonus" line
## render. Open the modal directly via the SAME _open_harvest_run_end path the live run-end uses (it
## lazily builds + wires the modal, then calls open_for_run_end). The summary carries no explicit
## coins_granted — the modal defaults the bonus line to SEASON_END_BONUS_COINS, matching the live flow.
func _seed_harvest_run_end(main) -> void:
	var game: GameState = main.game
	# Put the run in its ended-but-unclosed state so the modal reads off a coherent live GameState
	# (the live run-end surfaces the modal BEFORE close_season runs — see Main._game_chain_resolved).
	game.farm_run_active = true
	game.farm_run_budget = 10
	game.farm_run_turns_left = 0
	game.farm_turns_used = 10
	game.active_biome = "farm"
	game.coins = 184
	main._open_harvest_run_end({
		"harvest": true,
		"ended": true,
		"season": "Winter",
		"turns_used": 10,
		"turns_left": 0,
		"budget": 10,
		"coins": game.coins,
		"runes": game.runes,
	})

# ── NEW (visual-expand) post-deeplink interaction steps ──────────────────────────
# These run AFTER apply_deeplink has opened the target screen (the deeplink builds +
# shows the modal), so they can drive a second-level interaction the seed can't reach.

func _post_inventory_search(main) -> void:
	# Type a query that matches NO owned good so the "No items match '…'" line renders.
	if main._inventory_screen != null and main._inventory_screen._search_field != null:
		main._inventory_screen._search_field.text = "zzzzz"
		main._inventory_screen._on_search_changed("zzzzz")

func _post_charter_term(main) -> void:
	# Open the FIRST term's detail overlay (the in-screen detail PanelContainer).
	if main._charter_screen != null:
		var terms: Array = CharterConfig.all()
		if not terms.is_empty():
			var first_id: String = String((terms[0] as Dictionary).get("id", ""))
			main._charter_screen._on_open_term(first_id)

func _post_farm_chain(main) -> void:
	# Drive a live 7-tile GRASS drag (6 across the top row, then one down into the second row) so
	# the golden matches React's board-farm-chain-7 reference: the glowing stage-tinted path, the
	# upgrade STAR at the 6-tile threshold boundary, the "×N" upgrade hover marker on the 7th (head)
	# cell, the lifted selected tiles, and the HUD "1/6 +1" live readout. Forces the top two rows
	# to GRASS first (a clean run that matches what the live game does).
	var board = main.board
	if board == null:
		return
	for c in Constants.COLS:
		board.grid[0][c] = Constants.Tile.GRASS
		if Constants.ROWS > 1:
			board.grid[1][c] = Constants.Tile.GRASS
	board._build_tiles()
	board._begin_drag(Vector2i(0, 0))
	for c in range(1, Constants.COLS):
		board._extend_drag(Vector2i(c, 0))
	# 7th tile: drop into the second row below the last top-row cell (8-adjacent), so the chain
	# crosses the 6-tile threshold (1 upgrade earned) and the head sits on a different cell than
	# the star — exactly React's chain-of-7 state.
	if Constants.ROWS > 1:
		board._extend_drag(Vector2i(Constants.COLS - 1, 1))

func _post_farm_tool_armed(main) -> void:
	# Inspect + ARM the starter bomb through the REAL wired path: use_tool arms it, the
	# action panel flips to its TOOL ARMED view (red header dot + DISARM footer), the
	# hotbar slot highlights, and the board frame pulses the red targeting rings
	# (frozen to phase 0 by _freeze_tweens for determinism).
	main.use_tool("bomb")

func _post_town_build_picker(main) -> void:
	# Open the build picker on the FIRST empty plot — exactly what a tap on an empty
	# pad resolves to (ordinal plot index == game.buildings.size() is the first
	# un-built plot; the VillageScreen's 🔨 Build button does the same).
	if main._townmap_screen != null:
		main._townmap_screen._open_build_picker_for_plot(main.game.buildings.size())

# ── Scenario table ─────────────────────────────────────────────────────────────────────────
# Each row: { id, deeplink, seed: Callable(main) -> void }. `id` maps 1:1 to a parity-matrix
# golden:<id> row. `deeplink` is fed to main.apply_deeplink (after seeding) — except the
# tutorial/story-prompt scenarios where the seed itself drives the modal.
func _scenarios() -> Array:
	# Every row carries an `expect` string — a one-line human description of what the golden should
	# show. It is printed per scenario in the run output (so the suite self-documents) and is the
	# canonical "what we expect to see" for a reviewer re-baselining the goldens.
	return [
		# board-farm-idle / -chain now seed an ACTIVE farm run so the HUD season bar renders (it is
		# hidden when no run is active — see Hud._refresh_season_bar). The board tiles are the same
		# pinned-RNG layout either way; only the season-bar visibility depends on the run.
		{"id": "board-farm-idle", "expect": "Active farm run: 6x6 farm board, HUD season strip (fresh Spring, 10 turns), 'Chain tiles to gather' hint, empty stockpile.", "deeplink": "",            "seed": Callable(self, "_seed_board_farm_run"), "post_dismiss_tutorial": true},
		# The board mid-DRAG: stage-tinted chain path + upgrade star + "×N" hover marker + lifted
		# tiles + the live HUD chain readout. The `post` step drives the drag; _freeze_tweens pins
		# the overlay/selection animation so the capture is deterministic.
		{"id": "board-farm-chain", "expect": "Mid-drag 7-tile grass chain: glowing path, upgrade STAR at the 6-tile threshold, 'x1' marker on the head cell, HUD 'Hay Bundle 1/6 +1'.", "deeplink": "",           "seed": Callable(self, "_seed_board_farm_run"), "post": Callable(self, "_post_farm_chain"), "post_dismiss_tutorial": true},
		# The board with a tap-target tool ARMED: the action panel's TOOL ARMED view, the
		# gold-edged hotbar slot, and the board's red targeting pulse (phase-pinned).
		{"id": "board-farm-tool-armed", "expect": "Board with a tap-target tool ARMED: the action panel's TOOL ARMED view, a gold-edged hotbar slot, and the board's red targeting pulse.", "deeplink": "",      "seed": Callable(self, "_seed_board_farm_run"), "post": Callable(self, "_post_farm_tool_armed"), "post_dismiss_tutorial": true},
		# The idle action panel with a POPULATED stockpile: counted chips with their
		# cap-fill washes + the owned/total KINDS header (the empty-board golden only
		# ever showed dimmed placeholder chips).
		{"id": "board-farm-stocked", "expect": "Idle board action panel with a POPULATED stockpile: counted resource chips with cap-fill washes + the owned/total KINDS header.", "deeplink": "",         "seed": Callable(self, "_seed_board_farm_stocked"), "post_dismiss_tutorial": true},
		{"id": "town-map",        "expect": "Settlement map for a fresh save: laid-out plots (empty), river + bridges, central plaza, 'Build 0/3 plots'.", "deeplink": "townmap",     "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "inventory",       "expect": "Inventory ledger for a fresh save: the ledger chrome with an empty / zero-count state.", "deeplink": "inventory",   "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "orders",          "expect": "Town/orders ledger (carded) for a fresh save; cost labels are human-readable (not raw keys).", "deeplink": "town",        "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "menu",            "expect": "The game menu modal (Settings / Wiki / New Game) over a dimmed backdrop.", "deeplink": "menu",        "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "achievements",    "expect": "Achievements with a mix of unlocked + mid-progress trophies and progress bars.", "deeplink": "achievements","seed": Callable(self, "_seed_achievements"), "post_dismiss_tutorial": true},
		{"id": "tiles",           "expect": "Tile collection: family tabs + a grid of tile cards (icon + name) + a detail panel whose 'Produces:' line shows a human label, with tiles in their correct categories.", "deeplink": "tiles",       "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "chronicle",       "expect": "Chronicle timeline showing ~8 fired story beats across acts 1-3.", "deeplink": "chronicle",   "seed": Callable(self, "_seed_chronicle"),    "post_dismiss_tutorial": true},
		{"id": "townsfolk",       "expect": "Townsfolk roster with NPC bonds at varied levels (Mira 8, Bram 3), readable NPC names.", "deeplink": "townsfolk",   "seed": Callable(self, "_seed_townsfolk"),    "post_dismiss_tutorial": true},
		{"id": "cartography",     "expect": "World map at City tier (Town 2 complete): node graph with mine + harbor travel buttons ENABLED.", "deeplink": "cartography", "seed": Callable(self, "_seed_cartography"),  "post_dismiss_tutorial": true},
		{"id": "castle",          "expect": "Castle contribution screen: partial contributions (soup/meat/coal) with progress + on-hand inventory.", "deeplink": "castle",      "seed": Callable(self, "_seed_castle"),       "post_dismiss_tutorial": true},
		{"id": "decorations",     "expect": "Decorations shop: 5000 coins, violet_bed x2 + stone_lantern built, cost chips with human labels (not raw keys).", "deeplink": "decorations", "seed": Callable(self, "_seed_decorations"),  "post_dismiss_tutorial": true},
		{"id": "portal",          "expect": "Magic Portal: built, influence 150, Magic Wand + Miner's Hat summoned; summon options with influence costs.", "deeplink": "portal",      "seed": Callable(self, "_seed_portal"),       "post_dismiss_tutorial": true},
		{"id": "charter",         "expect": "Charter Terms tab: term cards with met/unmet status from the seeded flags + choice log.", "deeplink": "charter",     "seed": Callable(self, "_seed_charter"),      "post_dismiss_tutorial": true},
		{"id": "quests",          "expect": "Quests: 6 rolled quests (a couple complete, one half-done), XP/level + coins.", "deeplink": "quests",      "seed": Callable(self, "_seed_quests"),       "post_dismiss_tutorial": true},
		{"id": "daily",           "expect": "Daily-reward streak at day 14 with a reward card + claim CTA.", "deeplink": "daily",       "seed": Callable(self, "_seed_daily"),        "post_dismiss_tutorial": true},
		{"id": "recipes",         "expect": "Bakery recipe in the 'Ready to craft' state: green Craft button + covered have/need ingredient chips (human labels).", "deeplink": "recipes",     "seed": Callable(self, "_seed_recipes"),      "post_dismiss_tutorial": true},
		# tutorial + story-prompt: the seed drives the modal; do NOT dismiss the tutorial/story.
		{"id": "tutorial",        "expect": "First-load tutorial modal at step 0 with intro copy + Next CTA over a dimmed backdrop.", "deeplink": "",            "seed": Callable(self, "_seed_tutorial"),     "post_dismiss_tutorial": false},
		{"id": "story-prompt",    "expect": "Story modal presenting the act1_arrival beat: title, narrative text, and Skip/Next choice buttons over a dimmed board.", "deeplink": "",            "seed": Callable(self, "_seed_story_prompt"), "post_dismiss_tutorial": false},
		# ── NEW (visual-expand) — modal/empty-state/built-out surfaces ──────────────────────
		# Each renders a state whose screen already exists. Rows with a `post` Callable drive a
		# SECOND interaction (search text / term detail / build picker) AFTER the deeplink opens
		# the screen. All capture at the portrait viewport only (no desktop golden needed).
		{"id": "leaveboard",             "expect": "'Leave the mine?' confirm card (on a mine expedition) with Stay/Leave buttons over a dimmed board.", "deeplink": "leaveboard", "seed": Callable(self, "_seed_leaveboard"),            "post_dismiss_tutorial": true},
		{"id": "toast",                  "expect": "A toast notification bubble pinned fully opaque over a screen.", "deeplink": "toast",      "seed": Callable(self, "_seed_none"),                  "post_dismiss_tutorial": true},
		{"id": "debug",                  "expect": "Debug modal with live readouts reflecting the seed: coins 4200, runes 18, influence 350.", "deeplink": "debug",      "seed": Callable(self, "_seed_debug"),                 "post_dismiss_tutorial": true},
		{"id": "inventory-search-empty", "expect": "Inventory with a no-match search ('zzzzz') showing the \"No items match\" empty-state line.", "deeplink": "inventory",  "seed": Callable(self, "_seed_inventory_search_empty"), "post": Callable(self, "_post_inventory_search"),  "post_dismiss_tutorial": true},
		{"id": "chronicle-empty",        "expect": "Chronicle empty state (fresh game, 0 fired beats): 'Your story begins...'.", "deeplink": "chronicle",  "seed": Callable(self, "_seed_chronicle_empty"),       "post_dismiss_tutorial": true},
		{"id": "charter-term-dialog",    "expect": "Charter with the first term's detail overlay open (in-screen detail panel).", "deeplink": "charter",    "seed": Callable(self, "_seed_charter"),               "post": Callable(self, "_post_charter_term"),      "post_dismiss_tutorial": true},
		{"id": "town-built-out",         "expect": "Village-tier town map with Lumber Camp / Coop / Garden placed as houses (labels are human names), remaining lots empty, 'Build 3/7 plots'.", "deeplink": "townmap",    "seed": Callable(self, "_seed_town_built_out"),        "post_dismiss_tutorial": true},
		{"id": "town-build-picker",      "expect": "City-tier town map with the build picker open on the first empty lot; build rows ENABLED (costs covered).", "deeplink": "townmap",    "seed": Callable(self, "_seed_town_build_picker"),     "post": Callable(self, "_post_town_build_picker"), "post_dismiss_tutorial": true},
		# ── Task E (farm-run feature) — the two NEW scenario goldens (portrait only) ─────────
		# start-farming-modal: the bounded-run picker over the town home (cost/picker/budget).
		# harvest-run-end: the run-end "Return to Town" HarvestModal with the +25 return bonus.
		{"id": "start-farming-modal",    "expect": "Start-Farming picker over the town home: entry cost 50 affordable (green) + enabled 'Start (50 coin)' CTA.", "deeplink": "startfarming", "seed": Callable(self, "_seed_startfarming_modal"), "post_dismiss_tutorial": true},
		{"id": "harvest-run-end",        "expect": "Run-end 'Harvest Complete / Return to Town' modal: Winter, 10/10 turns, '+25 coin return bonus' line.", "deeplink": "",             "seed": Callable(self, "_seed_harvest_run_end"),   "post_dismiss_tutorial": true},
	]

# ── Capture pipeline ───────────────────────────────────────────────────────────────────────
## Build a fresh Main, size the WINDOW to `vp_size`, seed, deeplink, settle, capture. The
## content_scale_size is ALWAYS pinned to CONTENT_SIZE (720×1280) so stretch=keep frames the
## portrait content: at the portrait viewport window==content (no bars); at the desktop
## (landscape) viewport window≠content so the content pillarboxes centred. Frees Main before
## returning so scenarios never stack. Returns the captured Image (or null on error).
func _capture_scenario(scn: Dictionary, vp_size: Vector2i) -> Image:
	SaveManager.clear()                                  # deterministic fresh game per scenario

	# Pin the WINDOW to this viewport's size and the logical content to 720×1280 BEFORE
	# instancing so the first layout already targets the right shape. Keeping content_scale_size
	# at CONTENT_SIZE (NOT vp_size) is what makes the desktop viewport pillarbox instead of
	# re-flowing the HUD — the deliverable is graceful framing, which stretch=keep provides.
	DisplayServer.window_set_size(vp_size)
	root.set_content_scale_size(CONTENT_SIZE)
	# Block until the window's real framebuffer reaches the expected size before building the scene,
	# so the whole layout + settle + capture runs at the correct size. The FIRST scenario of a run
	# otherwise races a cold-start resize that the OS clamps SHORT (the renderable client area comes
	# up 720×1175 instead of 720×1280) → a spurious 100% size-mismatch diff (the long-standing
	# board-farm-idle/portrait flake). _await_capture_size re-asserts the size + polls the actual
	# captured dimensions until they settle (see there).
	await _await_capture_size(vp_size)

	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                                  # let deferred _ready run

	# Pin the board's RNG to a fixed seed and rebuild so the tile layout is identical every
	# run. The board renders behind EVERY modal (translucently), so without this the random
	# grass arrangement leaks into every scenario's diff. _ready() called rng.randomize() +
	# setup_new_board(); re-seed and rebuild for determinism.
	if main.board != null:
		main.board.rng.seed = BOARD_RNG_SEED
		main.board.setup_new_board()

	# Dismiss the first-load tutorial unless the scenario IS the tutorial/story modal.
	if bool(scn.get("post_dismiss_tutorial", true)):
		_dismiss_tutorial(main)

	# Seed the gameplay state for this scenario.
	var seed_cb: Callable = scn["seed"]
	seed_cb.call(main)

	# Navigate (after seeding so the screen reads the seeded state on open).
	var dl: String = String(scn.get("deeplink", ""))
	if dl != "":
		main.apply_deeplink(dl)

	# Optional SECOND interaction, run AFTER the deeplink has opened/built the target screen
	# (e.g. type a no-match search query, open a term-detail overlay, open the build picker).
	# The screen node only exists once apply_deeplink has created it, so this must run here.
	if scn.has("post"):
		var post_cb: Callable = scn["post"]
		post_cb.call(main)

	# Re-layout against the pinned viewport and let everything settle (parchment styles,
	# drop shadows, fonts, bars, tweens).
	main._layout()
	for _i in range(SETTLE_FRAMES):
		await process_frame

	# Freeze: settle any still-running tweens (board pop-in/fall) to their final state so the
	# captured frame is timing-independent, then render one more frame so the result is drawn.
	_freeze_tweens(main)
	await process_frame

	# Belt-and-braces: if the framebuffer still hasn't reached vp_size (a slow first-scenario
	# resize), wait a little longer so the capture matches the golden's dimensions.
	await _await_capture_size(vp_size)
	var img := root.get_texture().get_image()

	# Tear down so the next scenario starts clean.
	main.free()
	await process_frame

	return img

## Await until the actual CAPTURED framebuffer reaches the expected size for this viewport
## (CONTENT_SIZE fitted to the window — see _capture_size). Window resizes apply asynchronously,
## and crucially DisplayServer.window_get_size() reports the REQUESTED size BEFORE the renderable
## client area has actually grown — so polling it gives a false "settled". The first scenario of a
## run otherwise captures a short frame (e.g. 720×1175 instead of 720×1280) → a spurious 100%
## size-mismatch diff (the long-standing board-farm-idle/portrait flake). Polling the real
## get_image() size is authoritative. Capped at ~150 frames so a genuinely unreachable size can't
## hang the suite — it just proceeds and any true mismatch surfaces as a normal diff.
func _await_capture_size(vp_size: Vector2i) -> bool:
	var want: Vector2i = _capture_size(vp_size)
	for _i in range(150):
		if root.get_texture().get_image().get_size() == want:
			return true
		# Re-ASSERT the window size periodically, not just wait: on a cold start the very first
		# resize gets clamped by the OS (the renderable client area comes up short — 720×1175 vs
		# the requested 1280), and only a SUBSEQUENT window_set_size call (once the window is fully
		# realized) actually grows it. Re-issuing the request every few frames lifts that clamp.
		if _i % 8 == 0:
			DisplayServer.window_set_position(Vector2i.ZERO)
			DisplayServer.window_set_size(vp_size)
		await process_frame
	# Size never settled — report it so callers can SKIP rather than fail (a bare-X/xvfb
	# environment with no window manager never applies a landscape resize; review-4).
	return false

# ── Image comparison ───────────────────────────────────────────────────────────────────────
## Golden slot for a scenario × viewport: <root>/<platform>/<scenario>/<viewport>.png. The
## per-viewport filename is why portrait + desktop goldens coexist under one scenario dir.
func _golden_path(scn_id: String, vp_name: String) -> String:
	return "%s/%s/%s/%s.png" % [GOLDEN_ROOT, OS.get_name(), scn_id, vp_name]

func _golden_exists(scn_id: String, vp_name: String) -> bool:
	return FileAccess.file_exists(_golden_path(scn_id, vp_name))

## Load a golden via Image.load_from_file (globalized path) — never the resource importer.
func _load_golden(scn_id: String, vp_name: String) -> Image:
	var abs := ProjectSettings.globalize_path(_golden_path(scn_id, vp_name))
	return Image.load_from_file(abs)

## Ensure a directory exists for the given res:// path (creates recursively).
func _ensure_dir(res_path: String) -> void:
	var abs := ProjectSettings.globalize_path(res_path)
	DirAccess.make_dir_recursive_absolute(abs)

## Write `img` to the per-platform golden slot for `scn_id` × `vp_name`.
func _write_golden(scn_id: String, vp_name: String, img: Image) -> int:
	_ensure_dir("%s/%s/%s" % [GOLDEN_ROOT, OS.get_name(), scn_id])
	var abs := ProjectSettings.globalize_path(_golden_path(scn_id, vp_name))
	return img.save_png(abs)

## Write a failing capture to __captures__/<scenario>-<viewport>.png for human inspection.
func _write_capture(scn_id: String, vp_name: String, img: Image) -> void:
	_ensure_dir(CAPTURE_ROOT)
	var abs := ProjectSettings.globalize_path("%s/%s-%s.png" % [CAPTURE_ROOT, scn_id, vp_name])
	img.save_png(abs)

## Render-smoke heuristic: image is exactly `expected` size AND has real content (not a
## uniform/near-uniform frame). "Has content" = at least SMOKE_MIN_DISTINCT distinct quantised
## colours sampled across the frame. Returns { size_ok, content_ok, distinct }.
func _render_smoke(img: Image, expected: Vector2i) -> Dictionary:
	var size_ok: bool = img.get_width() == expected.x and img.get_height() == expected.y
	var seen := {}
	# Sample on a stride so the scan stays cheap (~ every 6th px in each axis).
	var step := 6
	var x := 0
	while x < img.get_width():
		var y := 0
		while y < img.get_height():
			var c := img.get_pixel(x, y)
			# Quantise to ~5-bit per channel so anti-aliasing noise doesn't inflate the count.
			var key := (int(c.r * 31) << 10) | (int(c.g * 31) << 5) | int(c.b * 31)
			seen[key] = true
			y += step
		x += step
	var distinct: int = seen.size()
	return {"size_ok": size_ok, "content_ok": distinct >= SMOKE_MIN_DISTINCT, "distinct": distinct}

## Tolerant per-pixel diff. Returns { ok, diff_frac, diff_px, total, size_ok }.
func _diff(golden: Image, actual: Image) -> Dictionary:
	var size_ok: bool = golden.get_width() == actual.get_width() \
		and golden.get_height() == actual.get_height()
	if not size_ok:
		return {"ok": false, "diff_frac": 1.0, "diff_px": -1, "total": 0, "size_ok": false}
	var w := golden.get_width()
	var h := golden.get_height()
	var total := w * h
	var diff_px := 0
	for y in range(h):
		for x in range(w):
			var a := golden.get_pixel(x, y)
			var b := actual.get_pixel(x, y)
			var dr: float = abs(a.r - b.r) * 255.0
			var dg: float = abs(a.g - b.g) * 255.0
			var db: float = abs(a.b - b.b) * 255.0
			if dr > CHANNEL_TOLERANCE or dg > CHANNEL_TOLERANCE or db > CHANNEL_TOLERANCE:
				diff_px += 1
	var frac: float = float(diff_px) / float(total) if total > 0 else 1.0
	return {"ok": frac <= DIFF_FAIL_FRACTION, "diff_frac": frac, "diff_px": diff_px,
		"total": total, "size_ok": true}

# ── Entry point ─────────────────────────────────────────────────────────────────────────────
func _initialize() -> void:
	# Headless display server produces NO rendering — skip cleanly so the CI sweep stays green.
	if DisplayServer.get_name() == "headless":
		print("run_visual_tests: skipped (no rendering backend — headless)")
		print("0 checks, 0 failure(s)")
		quit(0)
		return

	var user_args := OS.get_cmdline_user_args()
	_update_mode = user_args.has("--update")

	# Pin UI motion OFF so every capture is the settled end-state, never a frame caught
	# mid-fade/mid-pop (UiFx drives the overlay/nav transitions on rendering backends).
	UiFx.enabled = false

	print("\n── Visual regression harness ───────────────────────")
	print("  platform=%s  content=%dx%d  viewports=%s  mode=%s" % [
		OS.get_name(), CONTENT_SIZE.x, CONTENT_SIZE.y,
		", ".join(VIEWPORTS.map(func(v): return "%s(%dx%d)" % [v["name"], v["size"].x, v["size"].y])),
		"UPDATE" if _update_mode else "DIFF"])

	# Iterate viewport (outer) × scenario (inner). portrait runs for ALL scenarios; desktop runs
	# only for DESKTOP_SCENARIOS (the framing-representative subset) — so portrait coverage is
	# unchanged and desktop adds a focused pillarbox check.
	for vp in VIEWPORTS:
		var vp_name: String = vp["name"]
		var vp_size: Vector2i = vp["size"]
		# Probe non-native window shapes once per viewport: under a bare X server with no
		# window manager (CI's xvfb), the landscape resize is silently never applied, so every
		# desktop scenario used to fail size=BAD with a portrait capture (review-4). When the
		# environment can't reach the shape, SKIP the viewport (it's a framing check, fully
		# covered on the golden platform) instead of reporting 6 false failures.
		if vp_size != Vector2i(CONTENT_SIZE):
			DisplayServer.window_set_size(vp_size)
			if not await _await_capture_size(vp_size):
				print("  SKIP  %s viewport — window resize to %dx%d not applied (no WM?); framing covered by the golden platform" % [
					vp_name, vp_size.x, vp_size.y])
				continue
		for scn in _scenarios():
			var scn_id: String = scn["id"]
			if vp_name == "desktop" and not DESKTOP_SCENARIOS.has(scn_id):
				continue   # desktop viewport is a representative subset only

				if vp_name == "portrait":
					print("  - %s : %s" % [scn_id, String(scn.get("expect", "(no expect set)"))])

				var img := await _capture_scenario(scn, vp_size)
			var tag := "%s/%s" % [scn_id, vp_name]   # scenario × viewport label in the tally

			if img == null:
				_check(false, "%s — capture produced a null image" % tag)
				continue

			if _update_mode:
				var werr := _write_golden(scn_id, vp_name, img)
				_check(werr == OK, "%s — wrote golden (%dx%d) err=%d" % [
					tag, img.get_width(), img.get_height(), werr])
				continue

			if _golden_exists(scn_id, vp_name):
				# Tolerant pixel-diff against the committed golden for this platform × viewport.
				var golden := _load_golden(scn_id, vp_name)
				if golden == null:
					_check(false, "%s — golden failed to load from %s" % [tag, _golden_path(scn_id, vp_name)])
					continue
				var res := _diff(golden, img)
				if not bool(res["ok"]):
					_write_capture(scn_id, vp_name, img)
				_check(bool(res["ok"]), "%s — pixel-diff %.3f%% (%d/%d px > tol %d) ≤ %.1f%%%s" % [
					tag, float(res["diff_frac"]) * 100.0, int(res["diff_px"]), int(res["total"]),
					CHANNEL_TOLERANCE, DIFF_FAIL_FRACTION * 100.0,
					"" if bool(res["ok"]) else "  → wrote __captures__/%s-%s.png" % [scn_id, vp_name]])
			else:
				# No golden for this platform × viewport → render-smoke (size + non-blank content).
				# Expect the FITTED capture size (CONTENT_SIZE scaled into the window), not the raw
				# window size — see the CAPTURE-SIZE NOTE on VIEWPORTS.
				var smoke := _render_smoke(img, _capture_size(vp_size))
				var ok: bool = bool(smoke["size_ok"]) and bool(smoke["content_ok"])
				if not ok:
					_write_capture(scn_id, vp_name, img)
				_check(ok, "%s — render-smoke size=%s content=%s (%d distinct ≥ %d) [no %s golden]" % [
					tag,
					"OK" if bool(smoke["size_ok"]) else "BAD(%dx%d)" % [img.get_width(), img.get_height()],
					"OK" if bool(smoke["content_ok"]) else "BLANK",
					int(smoke["distinct"]), SMOKE_MIN_DISTINCT, OS.get_name()])

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
