extends SceneTree
## Headless unit tests for the A2 SEASON-UI pure helpers (no scene tree / Control nodes):
##   - Constants.season_turn_ranges (the seasonStrip.tsx `seasonTurnRanges` port that sizes the
##     season-bar segments): the FLOOR split sums EXACTLY to the budget; S=10 → [2,3,2,3];
##     S=12 → [3,3,3,3]; the starts/ends chain correctly; a non-positive budget clamps to 1.
##   - Constants.SEASON_STRIP_PALETTES / SEASON_FIELD_COLORS shape (the verbatim seasonStrip.tsx
##     + puzzleBoard.tsx hex used by the bar + the season-tinted board field).
##   - HarvestModal.recap_line (the pure recap string the harvest summary modal shows).
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_season_ui_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it. Same dependency-
## free harness style as tests/run_seasons_tests.gd. HarvestModal has NO class_name, so it is
## preloaded (matching how Main loads it); only its STATIC recap_line is exercised — no node is
## instantiated, so this stays a pure headless test.

const HarvestModal := preload("res://scenes/HarvestModal.gd")
const HudScript := preload("res://scenes/Hud.gd")

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Season-UI helper tests (A2) ────────────────────")
	_test_season_turn_ranges_budget_10()
	_test_season_turn_ranges_budget_12()
	_test_season_turn_ranges_sum_invariant()
	_test_season_turn_ranges_chaining()
	_test_season_turn_ranges_nonpositive()
	_test_strip_palettes()
	_test_field_colors()
	_test_harvest_recap_line()
	await _test_season_bar_run_gated()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

## Pluck the per-season `count` ints out of a season_turn_ranges() result.
func _counts(ranges: Array) -> Array:
	var out: Array = []
	for r in ranges:
		out.append(int((r as Dictionary).get("count", -1)))
	return out

# ── seasonTurnRanges: the headline segment math (S=10 → [2,3,2,3]) ─────────────

func _test_season_turn_ranges_budget_10() -> void:
	var r: Array = Constants.season_turn_ranges(10)
	_check(r.size() == 4, "season_turn_ranges(10) has 4 seasons")
	_check(_counts(r) == [2, 3, 2, 3], "season_turn_ranges(10) counts == [2,3,2,3]")
	# ends = [2,5,7,10] per the React floor math.
	_check(int((r[0] as Dictionary)["end"]) == 2, "S=10 Spring end == 2")
	_check(int((r[1] as Dictionary)["end"]) == 5, "S=10 Summer end == 5")
	_check(int((r[2] as Dictionary)["end"]) == 7, "S=10 Autumn end == 7")
	_check(int((r[3] as Dictionary)["end"]) == 10, "S=10 Winter end == 10")

func _test_season_turn_ranges_budget_12() -> void:
	var r: Array = Constants.season_turn_ranges(12)
	_check(_counts(r) == [3, 3, 3, 3], "season_turn_ranges(12) counts == [3,3,3,3]")

## The FLOOR split must sum EXACTLY to the budget for ANY budget (the core invariant — the
## last season soaks the remainder so the segments never under/over-fill the strip).
func _test_season_turn_ranges_sum_invariant() -> void:
	for s in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 37]:
		var r: Array = Constants.season_turn_ranges(s)
		var total: int = 0
		for c in _counts(r):
			total += int(c)
		_check(total == s, "season_turn_ranges(%d) counts sum to %d" % [s, s])

## start[0]==0, each season's start == the previous season's end, and the final end == budget.
func _test_season_turn_ranges_chaining() -> void:
	var r: Array = Constants.season_turn_ranges(10)
	_check(int((r[0] as Dictionary)["start"]) == 0, "first season starts at 0")
	var ok := true
	for i in range(1, 4):
		if int((r[i] as Dictionary)["start"]) != int((r[i - 1] as Dictionary)["end"]):
			ok = false
	_check(ok, "each season start == previous season end (contiguous segments)")
	_check(int((r[3] as Dictionary)["end"]) == 10, "final season end == budget")
	# count == end - start for every season.
	var counts_ok := true
	for seg in r:
		var d: Dictionary = seg
		if int(d["count"]) != int(d["end"]) - int(d["start"]):
			counts_ok = false
	_check(counts_ok, "every count == end - start")

## A non-positive budget clamps to 1 (the React `Math.max(1, …)` guard) so the strip always
## has a usable budget — one season gets the single turn, the rest are zero-width.
func _test_season_turn_ranges_nonpositive() -> void:
	var r0: Array = Constants.season_turn_ranges(0)
	var sum0: int = 0
	for c in _counts(r0):
		sum0 += int(c)
	_check(sum0 == 1, "season_turn_ranges(0) clamps to a budget of 1 (counts sum to 1)")
	var rn: Array = Constants.season_turn_ranges(-5)
	var sumn: int = 0
	for c in _counts(rn):
		sumn += int(c)
	_check(sumn == 1, "season_turn_ranges(-5) clamps to a budget of 1")

# ── strip palette (verbatim seasonStrip.tsx SEASON_PALETTES hex) ───────────────

func _test_strip_palettes() -> void:
	_check(Constants.SEASON_STRIP_PALETTES.size() == 4, "four SEASON_STRIP_PALETTES")
	var spring: Dictionary = Constants.SEASON_STRIP_PALETTES[0]
	_check(spring["name"] == "Spring", "strip[0] is Spring")
	_check((spring["bg_top"] as Color).is_equal_approx(Color8(0xfd, 0xe7, 0xf0)), "Spring bg_top == #fde7f0")
	_check((spring["bg_bot"] as Color).is_equal_approx(Color8(0xbf, 0xe3, 0xb3)), "Spring bg_bot == #bfe3b3")
	_check((spring["label"] as Color).is_equal_approx(Color8(0x9a, 0x33, 0x58)), "Spring label == #9a3358")
	var winter: Dictionary = Constants.SEASON_STRIP_PALETTES[3]
	_check(winter["name"] == "Winter", "strip[3] is Winter")
	_check((winter["bg_top"] as Color).is_equal_approx(Color8(0xe5, 0xf0, 0xfa)), "Winter bg_top == #e5f0fa")
	_check((winter["bg_bot"] as Color).is_equal_approx(Color8(0x90, 0xb0, 0xc6)), "Winter bg_bot == #90b0c6")
	_check((winter["label"] as Color).is_equal_approx(Color8(0x1f, 0x3a, 0x5a)), "Winter label == #1f3a5a")

# ── board field tint (verbatim puzzleBoard.tsx field gradient hex) ─────────────

func _test_field_colors() -> void:
	_check(Constants.SEASON_FIELD_COLORS.size() == 4, "four SEASON_FIELD_COLORS")
	var spring: Dictionary = Constants.SEASON_FIELD_COLORS[0]
	_check((spring["top"] as Color).is_equal_approx(Color8(0xdb, 0xe6, 0xb5)), "Spring field top == #dbe6b5")
	_check((spring["bot"] as Color).is_equal_approx(Color8(0xb8, 0xcf, 0x8a)), "Spring field bot == #b8cf8a")
	var winter: Dictionary = Constants.SEASON_FIELD_COLORS[3]
	_check((winter["top"] as Color).is_equal_approx(Color8(0xdd, 0xe4, 0xea)), "Winter field top == #dde4ea")
	_check((winter["bot"] as Color).is_equal_approx(Color8(0xb6, 0xc2, 0xcc)), "Winter field bot == #b6c2cc")

# ── HarvestModal.recap_line (pure recap string) ────────────────────────────────

func _test_harvest_recap_line() -> void:
	# A realistic Winter harvest with coins but no runes — runes are omitted at 0.
	var s := {"harvest": true, "season": "Winter", "turns_used": 0, "budget": 10, "coins": 42, "runes": 0}
	var line: String = HarvestModal.recap_line(s)
	_check(line.contains("10 turns"), "recap_line mentions the 10-turn year")
	_check(line.contains("42 coins"), "recap_line reports the coin snapshot")
	_check(not line.contains("rune"), "recap_line omits runes when zero")
	_check(line.contains("Spring"), "recap_line tells the player a fresh Spring begins")
	# With runes > 0 the snapshot includes them, singular-aware.
	var s2 := {"season": "Autumn", "budget": 10, "coins": 5, "runes": 1}
	var line2: String = HarvestModal.recap_line(s2)
	_check(line2.contains("1 rune") and not line2.contains("1 runes"), "recap_line uses singular 'rune' for 1")
	var s3 := {"season": "Autumn", "budget": 10, "coins": 5, "runes": 3}
	_check(HarvestModal.recap_line(s3).contains("3 runes"), "recap_line uses plural 'runes' for 3")

# ── Season-bar RUN-GATE (Task C): hidden with no run, shown once a run is live ─────────────

## The season bar tracks a bounded farm RUN; the HUD hides it when no run is active (the player is
## in the town home) and shows it once a run starts. Builds the real Hud node headlessly (it is a
## plain Node loaded via preload) and asserts _season_bar_box.visible toggles with farm_run_active.
func _test_season_bar_run_gated() -> void:
	var game := GameState.new()
	var hud = HudScript.new()
	hud.game = game
	root.add_child(hud)
	hud.build()
	await process_frame

	# No run active (a fresh GameState) → the season-bar box is hidden.
	game.farm_run_active = false
	hud._refresh_season_bar()
	_check(hud._season_bar_box != null, "HUD built a season-bar box")
	if hud._season_bar_box != null:
		_check(not hud._season_bar_box.visible,
			"no run active → the season bar is HIDDEN")

	# Start a real run → the season bar is shown.
	game.coins = 50
	_check(bool(game.start_farm_run([], false).get("ok", false)), "(setup) started a farm run")
	hud._refresh_season_bar()
	if hud._season_bar_box != null:
		_check(hud._season_bar_box.visible,
			"run active → the season bar is SHOWN")

	hud.queue_free()
	await process_frame
