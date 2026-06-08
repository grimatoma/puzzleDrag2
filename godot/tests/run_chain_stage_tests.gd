extends SceneTree
## Headless unit tests for the A3 CHAIN-STAGE pure helpers (no scene tree / Control nodes):
##   - Constants.chain_stage_index(chain_len, threshold): the src/ui/puzzleBoard.tsx port —
##     earned = floor(chain_len / threshold), clamped to 0..4. A non-positive chain or
##     threshold pins stage 0; a very long chain caps at the last stage (FRENZY!).
##   - Constants.chain_stage(chain_len, threshold): the convenience wrapper returning the
##     CHAIN_STAGES entry for that index.
##   - Constants.CHAIN_STAGES: the verbatim escalating palette (top/bot/accent hex + label)
##     ported from src/ui/puzzleBoard.tsx — asserted hex-for-hex so the port can't drift.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_chain_stage_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it. Same dependency-
## free harness style as tests/run_season_ui_tests.gd; Constants is a `class_name` global, so
## its consts + static helpers are referenced WITHOUT a live autoload (no node construction).

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Chain-stage helper tests (A3) ──────────────────")
	_test_stage_index_threshold_6()
	_test_stage_index_threshold_5()
	_test_stage_index_clamp_high()
	_test_stage_index_guards()
	_test_chain_stage_wrapper()
	_test_chain_stages_palette_hex()
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

# ── chain_stage_index: earned = floor(chain_len / threshold), clamped 0..4 ──────

## Threshold 6 (GRASS's threshold): 0..5 → stage 0; 6..11 → 1 (BONUS); 12..17 → 2 (DOUBLE);
## 18..23 → 3 (TRIPLE); 24+ → 4 (FRENZY). The boundary at each multiple of the threshold is
## the first length of the next stage.
func _test_stage_index_threshold_6() -> void:
	_check(Constants.chain_stage_index(3, 6) == 0, "len 3 / thr 6 → stage 0 (below threshold)")
	_check(Constants.chain_stage_index(5, 6) == 0, "len 5 / thr 6 → stage 0 (still below)")
	_check(Constants.chain_stage_index(6, 6) == 1, "len 6 / thr 6 → stage 1 BONUS (exactly 1 unit)")
	_check(Constants.chain_stage_index(11, 6) == 1, "len 11 / thr 6 → stage 1 (just under 2 units)")
	_check(Constants.chain_stage_index(12, 6) == 2, "len 12 / thr 6 → stage 2 DOUBLE (2 units)")
	_check(Constants.chain_stage_index(18, 6) == 3, "len 18 / thr 6 → stage 3 TRIPLE (3 units)")
	_check(Constants.chain_stage_index(24, 6) == 4, "len 24 / thr 6 → stage 4 FRENZY (4 units)")

## Threshold 5 (WHEAT/PIG): each 5 tiles is one earned unit.
func _test_stage_index_threshold_5() -> void:
	_check(Constants.chain_stage_index(4, 5) == 0, "len 4 / thr 5 → stage 0")
	_check(Constants.chain_stage_index(5, 5) == 1, "len 5 / thr 5 → stage 1 BONUS")
	_check(Constants.chain_stage_index(10, 5) == 2, "len 10 / thr 5 → stage 2 DOUBLE")
	_check(Constants.chain_stage_index(15, 5) == 3, "len 15 / thr 5 → stage 3 TRIPLE")
	_check(Constants.chain_stage_index(20, 5) == 4, "len 20 / thr 5 → stage 4 FRENZY")

## A chain far past 4 units still caps at the last stage (4) — never an out-of-bounds index.
func _test_stage_index_clamp_high() -> void:
	_check(Constants.chain_stage_index(30, 5) == 4, "len 30 / thr 5 (6 units) clamps to stage 4")
	_check(Constants.chain_stage_index(100, 6) == 4, "len 100 / thr 6 clamps to stage 4")
	_check(Constants.chain_stage_index(1000, 1) == 4, "huge chain / thr 1 clamps to stage 4")

## Guards: a non-positive chain or threshold pins stage 0 (never negative / OOB).
func _test_stage_index_guards() -> void:
	_check(Constants.chain_stage_index(0, 6) == 0, "len 0 → stage 0")
	_check(Constants.chain_stage_index(-4, 6) == 0, "negative len → stage 0")
	_check(Constants.chain_stage_index(8, 0) == 0, "threshold 0 → stage 0 (guarded)")
	_check(Constants.chain_stage_index(8, -3) == 0, "negative threshold → stage 0 (guarded)")

# ── chain_stage wrapper returns the matching CHAIN_STAGES entry ─────────────────

func _test_chain_stage_wrapper() -> void:
	var s0: Dictionary = Constants.chain_stage(3, 6)
	_check(String(s0.get("label", "x")) == "", "chain_stage(3,6) is stage 0 (empty label)")
	var s1: Dictionary = Constants.chain_stage(6, 6)
	_check(String(s1.get("label", "")) == "BONUS!", "chain_stage(6,6) is stage 1 (BONUS!)")
	var s4: Dictionary = Constants.chain_stage(24, 6)
	_check(String(s4.get("label", "")) == "FRENZY!", "chain_stage(24,6) is stage 4 (FRENZY!)")
	# The wrapper points at the SAME entry the index resolves to.
	_check(Constants.chain_stage(12, 6) == Constants.CHAIN_STAGES[2], "chain_stage(12,6) == CHAIN_STAGES[2]")

# ── CHAIN_STAGES verbatim hex (src/ui/puzzleBoard.tsx) ──────────────────────────

func _test_chain_stages_palette_hex() -> void:
	_check(Constants.CHAIN_STAGES.size() == 5, "five CHAIN_STAGES (0..4)")
	# Stage 0 — base (no label).
	var s0: Dictionary = Constants.CHAIN_STAGES[0]
	_check(s0["top"] == "#f0c14b" and s0["bot"] == "#d97a2a", "stage 0 top/bot == #f0c14b/#d97a2a")
	_check(s0["accent"] == "#e07a3a" and s0["label"] == "", "stage 0 accent #e07a3a, no label")
	# Stage 1 — BONUS!
	var s1: Dictionary = Constants.CHAIN_STAGES[1]
	_check(s1["top"] == "#a3d65a" and s1["bot"] == "#6d9928", "stage 1 top/bot == #a3d65a/#6d9928")
	_check(s1["accent"] == "#5e9a2a" and s1["label"] == "BONUS!", "stage 1 accent #5e9a2a, label BONUS!")
	# Stage 2 — DOUBLE!
	var s2: Dictionary = Constants.CHAIN_STAGES[2]
	_check(s2["top"] == "#7dc2e4" and s2["bot"] == "#3a7eae", "stage 2 top/bot == #7dc2e4/#3a7eae")
	_check(s2["accent"] == "#4082b5" and s2["label"] == "DOUBLE!", "stage 2 accent #4082b5, label DOUBLE!")
	# Stage 3 — TRIPLE!
	var s3: Dictionary = Constants.CHAIN_STAGES[3]
	_check(s3["top"] == "#d8a4f0" and s3["bot"] == "#8a4ec9", "stage 3 top/bot == #d8a4f0/#8a4ec9")
	_check(s3["accent"] == "#9648c6" and s3["label"] == "TRIPLE!", "stage 3 accent #9648c6, label TRIPLE!")
	# Stage 4 — FRENZY!
	var s4: Dictionary = Constants.CHAIN_STAGES[4]
	_check(s4["top"] == "#ffb04a" and s4["bot"] == "#d62828", "stage 4 top/bot == #ffb04a/#d62828")
	_check(s4["accent"] == "#e62828" and s4["label"] == "FRENZY!", "stage 4 accent #e62828, label FRENZY!")
	# Every hex string is a valid Color (the HUD parses them with Color(hex)).
	for stage in Constants.CHAIN_STAGES:
		for key in ["top", "bot", "accent"]:
			var c := Color(String(stage[key]))
			_check(c.a == 1.0, "CHAIN_STAGES %s hex %s parses to an opaque Color" % [key, stage[key]])
