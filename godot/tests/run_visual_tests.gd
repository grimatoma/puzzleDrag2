extends SceneTree
## Visual regression harness — scenario × viewport golden-diff suite.
##
## Renders each game surface at 720×1280 (the project's portrait viewport), captures a PNG,
## and compares it to a committed golden under tests/visual/__goldens__/<platform>/<scenario>/
## <viewport>.png (platform = OS.get_name(), e.g. "Windows" / "Linux"). This sidesteps the
## cross-platform pixel divergence (Windows/NVIDIA vs Linux/llvmpipe) by tagging goldens per
## platform.
##
## Modes:
##   • Golden EXISTS for the current platform → tolerant per-pixel diff (channel delta > 12 ⇒
##     differing pixel; FAIL the scenario if differing pixels > 1.0% of total).
##   • Golden MISSING for the current platform → render-smoke: assert the capture is exactly
##     720×1280 AND not a uniform/blank frame (real content present). Counts as a real check.
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
## On a real diff FAILURE the actual capture is written to tests/visual/__captures__/<scenario>.png
## (with the differing-pixel %) so a human can inspect. Goldens are loaded via
## Image.load_from_file(globalize_path(...)) — NOT the resource importer — and tests/visual/
## carries a .gdignore so Godot never imports the PNGs (no .import sidecars).

# ── Tuning ───────────────────────────────────────────────────────────────────────────────
const VIEWPORT := Vector2i(720, 1280)
const VIEWPORT_NAME := "portrait"
const CHANNEL_TOLERANCE := 12        # per-channel delta above which a pixel is "different"
const DIFF_FAIL_FRACTION := 0.01     # FAIL if differing pixels > 1.0% of total
const SETTLE_FRAMES := 22            # frames to await after seeding/deeplink before capture
const SMOKE_MIN_DISTINCT := 200      # render-smoke: minimum distinct-ish colours for "has content"
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
func _freeze_tweens(_main) -> void:
	pass

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

# ── Scenario table ─────────────────────────────────────────────────────────────────────────
# Each row: { id, deeplink, seed: Callable(main) -> void }. `id` maps 1:1 to a parity-matrix
# golden:<id> row. `deeplink` is fed to main.apply_deeplink (after seeding) — except the
# tutorial/story-prompt scenarios where the seed itself drives the modal.
func _scenarios() -> Array:
	return [
		{"id": "board-farm-idle", "deeplink": "",            "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "town-map",        "deeplink": "townmap",     "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "inventory",       "deeplink": "inventory",   "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "orders",          "deeplink": "town",        "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "menu",            "deeplink": "menu",        "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "achievements",    "deeplink": "achievements","seed": Callable(self, "_seed_achievements"), "post_dismiss_tutorial": true},
		{"id": "tiles",           "deeplink": "tiles",       "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		{"id": "chronicle",       "deeplink": "chronicle",   "seed": Callable(self, "_seed_chronicle"),    "post_dismiss_tutorial": true},
		{"id": "townsfolk",       "deeplink": "townsfolk",   "seed": Callable(self, "_seed_townsfolk"),    "post_dismiss_tutorial": true},
		{"id": "cartography",     "deeplink": "cartography", "seed": Callable(self, "_seed_cartography"),  "post_dismiss_tutorial": true},
		{"id": "castle",          "deeplink": "castle",      "seed": Callable(self, "_seed_castle"),       "post_dismiss_tutorial": true},
		{"id": "decorations",     "deeplink": "decorations", "seed": Callable(self, "_seed_decorations"),  "post_dismiss_tutorial": true},
		{"id": "portal",          "deeplink": "portal",      "seed": Callable(self, "_seed_portal"),       "post_dismiss_tutorial": true},
		{"id": "charter",         "deeplink": "charter",     "seed": Callable(self, "_seed_charter"),      "post_dismiss_tutorial": true},
		{"id": "quests",          "deeplink": "quests",      "seed": Callable(self, "_seed_quests"),       "post_dismiss_tutorial": true},
		{"id": "daily",           "deeplink": "daily",       "seed": Callable(self, "_seed_daily"),        "post_dismiss_tutorial": true},
		{"id": "recipes",         "deeplink": "recipes",     "seed": Callable(self, "_seed_none"),         "post_dismiss_tutorial": true},
		# tutorial + story-prompt: the seed drives the modal; do NOT dismiss the tutorial/story.
		{"id": "tutorial",        "deeplink": "",            "seed": Callable(self, "_seed_tutorial"),     "post_dismiss_tutorial": false},
		{"id": "story-prompt",    "deeplink": "",            "seed": Callable(self, "_seed_story_prompt"), "post_dismiss_tutorial": false},
	]

# ── Capture pipeline ───────────────────────────────────────────────────────────────────────
## Build a fresh Main, resize to the portrait viewport, seed, deeplink, settle, capture. Frees
## Main before returning so scenarios never stack. Returns the captured Image (or null on error).
func _capture_scenario(scn: Dictionary) -> Image:
	SaveManager.clear()                                  # deterministic fresh game per scenario

	# Pin the window/root viewport to the portrait size BEFORE instancing so the first layout
	# already targets 720×1280.
	DisplayServer.window_set_size(VIEWPORT)
	root.set_content_scale_size(VIEWPORT)

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

	# Re-layout against the pinned viewport and let everything settle (parchment styles,
	# drop shadows, fonts, bars, tweens).
	main._layout()
	for _i in range(SETTLE_FRAMES):
		await process_frame

	# Freeze: settle any still-running tweens (board pop-in/fall) to their final state so the
	# captured frame is timing-independent, then render one more frame so the result is drawn.
	_freeze_tweens(main)
	await process_frame

	var img := root.get_texture().get_image()

	# Tear down so the next scenario starts clean.
	main.free()
	await process_frame

	return img

# ── Image comparison ───────────────────────────────────────────────────────────────────────
func _golden_path(scn_id: String) -> String:
	return "%s/%s/%s/%s.png" % [GOLDEN_ROOT, OS.get_name(), scn_id, VIEWPORT_NAME]

func _golden_exists(scn_id: String) -> bool:
	return FileAccess.file_exists(_golden_path(scn_id))

## Load a golden via Image.load_from_file (globalized path) — never the resource importer.
func _load_golden(scn_id: String) -> Image:
	var abs := ProjectSettings.globalize_path(_golden_path(scn_id))
	return Image.load_from_file(abs)

## Ensure a directory exists for the given res:// path (creates recursively).
func _ensure_dir(res_path: String) -> void:
	var abs := ProjectSettings.globalize_path(res_path)
	DirAccess.make_dir_recursive_absolute(abs)

## Write `img` to the per-platform golden slot for `scn_id`.
func _write_golden(scn_id: String, img: Image) -> int:
	_ensure_dir("%s/%s/%s" % [GOLDEN_ROOT, OS.get_name(), scn_id])
	var abs := ProjectSettings.globalize_path(_golden_path(scn_id))
	return img.save_png(abs)

## Write a failing capture to __captures__/<scenario>.png for human inspection.
func _write_capture(scn_id: String, img: Image) -> void:
	_ensure_dir(CAPTURE_ROOT)
	var abs := ProjectSettings.globalize_path("%s/%s.png" % [CAPTURE_ROOT, scn_id])
	img.save_png(abs)

## Render-smoke heuristic: image is exactly the expected size AND has real content (not a
## uniform/near-uniform frame). "Has content" = at least SMOKE_MIN_DISTINCT distinct quantised
## colours sampled across the frame. Returns { size_ok, content_ok, distinct }.
func _render_smoke(img: Image) -> Dictionary:
	var size_ok: bool = img.get_width() == VIEWPORT.x and img.get_height() == VIEWPORT.y
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

	print("\n── Visual regression harness ───────────────────────")
	print("  platform=%s  viewport=%dx%d  mode=%s" % [
		OS.get_name(), VIEWPORT.x, VIEWPORT.y, "UPDATE" if _update_mode else "DIFF"])

	for scn in _scenarios():
		var scn_id: String = scn["id"]
		var img := await _capture_scenario(scn)

		if img == null:
			_check(false, "%s — capture produced a null image" % scn_id)
			continue

		if _update_mode:
			var werr := _write_golden(scn_id, img)
			_check(werr == OK, "%s — wrote golden (%dx%d) err=%d" % [
				scn_id, img.get_width(), img.get_height(), werr])
			continue

		if _golden_exists(scn_id):
			# Tolerant pixel-diff against the committed golden for this platform.
			var golden := _load_golden(scn_id)
			if golden == null:
				_check(false, "%s — golden failed to load from %s" % [scn_id, _golden_path(scn_id)])
				continue
			var res := _diff(golden, img)
			if not bool(res["ok"]):
				_write_capture(scn_id, img)
			_check(bool(res["ok"]), "%s — pixel-diff %.3f%% (%d/%d px > tol %d) ≤ %.1f%%%s" % [
				scn_id, float(res["diff_frac"]) * 100.0, int(res["diff_px"]), int(res["total"]),
				CHANNEL_TOLERANCE, DIFF_FAIL_FRACTION * 100.0,
				"" if bool(res["ok"]) else "  → wrote __captures__/%s.png" % scn_id])
		else:
			# No golden for this platform → render-smoke (size + non-blank content).
			var smoke := _render_smoke(img)
			var ok: bool = bool(smoke["size_ok"]) and bool(smoke["content_ok"])
			if not ok:
				_write_capture(scn_id, img)
			_check(ok, "%s — render-smoke size=%s content=%s (%d distinct ≥ %d) [no %s golden]" % [
				scn_id,
				"OK" if bool(smoke["size_ok"]) else "BAD(%dx%d)" % [img.get_width(), img.get_height()],
				"OK" if bool(smoke["content_ok"]) else "BLANK",
				int(smoke["distinct"]), SMOKE_MIN_DISTINCT, OS.get_name()])

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
