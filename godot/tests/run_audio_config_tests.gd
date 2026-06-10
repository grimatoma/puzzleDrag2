extends SceneTree
## Headless tests for AudioConfig.gd — the SFX sound-design catalog moved out of the
## runtime audio service node (Audio.gd) in the config-migration batch. Verifies the
## catalog has the expected 11 effects, that a couple of step param sets survived the
## move BYTE-IDENTICAL, and that the runtime Audio service still synthesizes a stream
## for every catalog name when reading from AudioConfig.SFX (the wiring guard — proves
## the move is behavior-preserving). Headless runs the DUMMY audio driver, so creating
## the Audio node + synthesizing is safe (no sound, just data).
##
## Same dependency-free harness as tests/run_audio_tests.gd; `class_name` globals are
## referenced directly (AudioConfig.SFX is a const, so it IS a constant expression).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_audio_config_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

# The 9 SFX the catalog must define.
var _names: Array = [
	"chain_start", "chain_collect", "upgrade", "tier_up",
	"pop", "fanfare", "coin", "buzz", "whoosh",
	"tap", "swish",   # port-side UI nav pair (no React counterpart)
]

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
	print("\n── AudioConfig (SFX catalog) tests ────────────────")

	# Catalog membership: exactly the expected 11 names, no more, no fewer
	# (the original 9 React-parity effects + the port-side UI nav pair: tap, swish).
	_check(AudioConfig.SFX.size() == 11, "AudioConfig.SFX has 11 effects (got %d)" % AudioConfig.SFX.size())
	for name in _names:
		_check(AudioConfig.SFX.has(name), "AudioConfig.SFX has '%s'" % name)
		_check(AudioConfig.has(name), "AudioConfig.has('%s')" % name)
	# names() returns the same set.
	var ns: Array = AudioConfig.names()
	_check(ns.size() == 11, "AudioConfig.names() returns 11 names (got %d)" % ns.size())
	var all_present: bool = true
	for name in _names:
		if not ns.has(name):
			all_present = false
	_check(all_present, "AudioConfig.names() contains every expected name")

	# Spot-check #1 — chain_start: one step freq 200→400, dur 80, sine, gain 0.07.
	var cs: Array = AudioConfig.steps("chain_start")
	_check(cs.size() == 1, "chain_start has 1 step (got %d)" % cs.size())
	if cs.size() == 1:
		var s: Dictionary = cs[0]
		_check(float(s["freq"]) == 200.0, "chain_start freq == 200.0")
		_check(float(s["freq_end"]) == 400.0, "chain_start freq_end == 400.0")
		_check(int(s["dur"]) == 80, "chain_start dur == 80")
		_check(String(s["type"]) == "sine", "chain_start type == sine")
		_check(float(s["gain"]) == 0.07, "chain_start gain == 0.07")

	# Spot-check #2 — fanfare: 4 square steps C4/E4/G4/C5 (262/330/392/524) at delays 0/0.1/0.2/0.3.
	var fa: Array = AudioConfig.steps("fanfare")
	_check(fa.size() == 4, "fanfare has 4 steps (got %d)" % fa.size())
	if fa.size() == 4:
		var freqs: Array = [262.0, 330.0, 392.0, 524.0]
		var delays: Array = [0.0, 0.1, 0.2, 0.3]
		var gains: Array = [0.05, 0.05, 0.05, 0.06]
		var ok := true
		for i in 4:
			var step: Dictionary = fa[i]
			if float(step["freq"]) != freqs[i]: ok = false
			if float(step["delay"]) != delays[i]: ok = false
			if int(step["dur"]) != 80: ok = false
			if String(step["type"]) != "square": ok = false
			if float(step["gain"]) != gains[i]: ok = false
		_check(ok, "fanfare = 4 square steps 262/330/392/524 Hz at delays 0/0.1/0.2/0.3, dur 80, gain 0.05/0.05/0.05/0.06")

	# steps() of an unknown name is an empty Array.
	_check(AudioConfig.steps("nonexistent").is_empty(), "steps('nonexistent') is empty")

	# Wiring guard: the runtime Audio service (now reading AudioConfig.SFX) must still
	# generate a stream for every catalog name — proves the move is behavior-preserving.
	var a := Audio.new()
	root.add_child(a)
	await process_frame                        # let _ready synthesize the streams
	for name in _names:
		_check(a.has_sfx(name), "Audio synthesized a stream for '%s' (from AudioConfig)" % name)

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
