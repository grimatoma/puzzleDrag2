extends SceneTree
## Headless tests for the Typography module.
##
## Verifies BASE values, scale math, Role↔BASE coverage, and the TEXT_SCALES /
## TEXT_SIZE_LABELS tables.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_typography_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

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
	print("\n── Typography tests ────────────────────────────────")

	# ── BASE values at default scale 1.0 ─────────────────────────────────────
	_check(Typography.scale == 1.0,
		"Typography.scale defaults to 1.0")
	_check(Typography.size(Typography.Role.BODY) == 17,
		"size(BODY) == 17 at scale 1.0")
	_check(Typography.size(Typography.Role.CAPTION) == 14,
		"size(CAPTION) == 14 at scale 1.0")
	_check(Typography.size(Typography.Role.TITLE) == 30,
		"size(TITLE) == 30 at scale 1.0")
	_check(Typography.size(Typography.Role.KEEPER_ICON) == 60,
		"size(KEEPER_ICON) == 60 at scale 1.0")

	# ── Scale math ────────────────────────────────────────────────────────────
	Typography.scale = 1.3
	_check(Typography.size(Typography.Role.BODY) == 22,
		"size(BODY) == 22 at scale 1.3  (round(17*1.3)=round(22.1)=22)")

	Typography.scale = 1.15
	_check(Typography.size(Typography.Role.BODY) == 20,
		"size(BODY) == 20 at scale 1.15  (round(17*1.15)=round(19.55)=20)")

	# Reset scale so the static var is left at its default (hygiene).
	Typography.scale = 1.0

	# ── Every enum role is present in BASE ────────────────────────────────────
	for role in Typography.Role.values():
		_check(Typography.BASE.has(role),
			"BASE contains Role value %d (%s)" % [role, Typography.Role.keys()[role]])

	# ── BASE has exactly one entry per role (no extra / missing keys) ─────────
	_check(Typography.BASE.size() == Typography.Role.values().size(),
		"BASE.size() == Role.values().size()  (%d entries)" % Typography.Role.values().size())

	# ── TEXT_SCALES / TEXT_SIZE_LABELS ────────────────────────────────────────
	_check(Typography.TEXT_SCALES.size() == 3,
		"TEXT_SCALES has 3 entries")
	_check(Typography.TEXT_SCALES.size() == Typography.TEXT_SIZE_LABELS.size(),
		"TEXT_SCALES.size() == TEXT_SIZE_LABELS.size()")
	_check(Typography.TEXT_SCALES[0] == 1.0,
		"TEXT_SCALES[0] == 1.0 (Normal is the identity scale)")

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
