extends SceneTree
## Headless tests for the M4d SFX service (scripts/Audio.gd, ported from
## src/audio/index.ts). Headless runs the DUMMY audio driver, so play() makes no
## sound — instead we verify the generated DATA: every SFX synthesizes to a
## non-empty 16-bit mono AudioStreamWAV at 22050 Hz, the byte length tracks the
## sound's duration, play() is safe for known/unknown names, mute is honored, and
## the real Main scene actually creates the service (the wiring guard).
##
## Same dependency-free harness as tests/run_scene_smoke.gd; `class_name` globals
## are aliased with `var` because a class_name ref is not a constant expression.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_audio_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

# All SFX the service must synthesize.
var _names: Array = [
	"chain_start", "chain_collect", "upgrade", "tier_up",
	"pop", "fanfare", "coin", "buzz", "whoosh",
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
	print("\n── Audio (SFX synthesis) tests ────────────────────")

	var a := Audio.new()
	root.add_child(a)
	await process_frame                        # let _ready synthesize the streams

	# Every SFX synthesizes to a valid 16-bit mono 22050Hz WAV with data.
	for name in _names:
		_check(a.has_sfx(name), "has_sfx(%s)" % name)
		var s: AudioStream = a.stream_for(name)
		_check(s != null and s is AudioStreamWAV, "stream_for(%s) is an AudioStreamWAV" % name)
		if s is AudioStreamWAV:
			var w: AudioStreamWAV = s
			_check(w.data.size() > 0, "%s has non-empty PCM data (%d bytes)" % [name, w.data.size()])
			_check(w.mix_rate == 22050, "%s mix_rate == 22050" % name)
			_check(w.format == AudioStreamWAV.FORMAT_16_BITS, "%s format == FORMAT_16_BITS" % name)
			_check(not w.stereo, "%s is mono" % name)

	# Byte length is plausible for a single-step SFX: chain_start is 80ms →
	# ≈ 2 * 22050 * 0.08 ≈ 3528 bytes. Allow a generous window for rounding.
	var cs: AudioStreamWAV = a.stream_for("chain_start")
	var expected: int = int(2 * 22050 * 0.080)
	_check(cs != null and absi(cs.data.size() - expected) <= 200,
		"chain_start byte length ≈ %d (got %d)" % [expected, cs.data.size() if cs != null else -1])

	# A longer SFX should be longer: tier_up is 400ms, much bigger than chain_start.
	var tu: AudioStreamWAV = a.stream_for("tier_up")
	_check(tu != null and tu.data.size() > cs.data.size(),
		"tier_up (400ms) buffer larger than chain_start (80ms)")

	# fanfare's last step starts at delay 0.3s + 80ms dur ≈ 0.38s of audio.
	var fa: AudioStreamWAV = a.stream_for("fanfare")
	var fa_expected: int = int(2 * 22050 * 0.380)
	_check(fa != null and absi(fa.data.size() - fa_expected) <= 400,
		"fanfare byte length ≈ %d (got %d)" % [fa_expected, fa.data.size() if fa != null else -1])

	# play() is safe for known + unknown names (no crash, no error).
	a.play("chain_collect")
	a.play("nonexistent")
	_check(true, "play() of a known + unknown name ran without crashing")

	# Muting makes play() a no-op-safe.
	a.set_muted(true)
	_check(a.muted, "set_muted(true) sets the flag")
	a.play("chain_collect")
	_check(true, "play() while muted is no-op-safe")
	a.set_muted(false)

	# Wiring guard: the real Main scene must create the audio service in _ready.
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                        # let the deferred _ready run
	_check(main._audio != null, "Main created its Audio service (_audio wired)")
	_check(main._audio is Audio, "Main._audio is an Audio node")

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
