class_name Audio
extends Node
## Runtime SFX service — synthesizes every sound effect into an AudioStreamWAV at
## init and plays them on game events through a small AudioStreamPlayer pool.
##
## Ported from the original React+Phaser game's Web Audio engine
## (src/audio/index.ts). There, each sound is one or more "steps" fed to
## OscillatorNodes with a gain envelope; here we compute the same PCM samples in
## GDScript (same oscillator waveforms + linear attack/decay envelope + frequency
## glide) and bake them into 16-bit mono AudioStreamWAVs.
##
## This is a PLAIN Node (NOT an autoload): Main owns one via `Audio.new()` so the
## headless `--script` test harness can instantiate it directly without depending
## on autoload setup. In headless mode the dummy audio driver makes `play()` a
## no-op, which is fine — the audio test verifies the generated DATA, not sound.

const MIX_RATE: int = 22050        ## synthesis sample rate (mono, 16-bit)
const _POOL_SIZE: int = 6          ## round-robin AudioStreamPlayer pool size

## Step list per SFX. A step is:
##   {freq, freq_end?(glide target), dur(ms), type(sine|square|triangle|sawtooth),
##    gain, delay?(seconds, start offset for arpeggios/sequences)}
## Multi-step sounds (chain_collect, fanfare) sum each step in at its delay.
## Params mirror src/audio/index.ts exactly.
const SFX: Dictionary = {
	# Short rising bleep: 200Hz → 400Hz, sine, 80ms.
	"chain_start": [
		{"freq": 200.0, "freq_end": 400.0, "dur": 80, "type": "sine", "gain": 0.07},
	],
	# Bright triple bleep: 440 / 554 / 660 Hz, square, 50ms each, ~80ms apart.
	"chain_collect": [
		{"freq": 440.0, "dur": 50, "type": "square", "gain": 0.05, "delay": 0.00},
		{"freq": 554.0, "dur": 50, "type": "square", "gain": 0.05, "delay": 0.08},
		{"freq": 660.0, "dur": 50, "type": "square", "gain": 0.05, "delay": 0.16},
	],
	# Sparkle: 880Hz → 1318Hz, sine, 120ms.
	"upgrade": [
		{"freq": 880.0, "freq_end": 1318.0, "dur": 120, "type": "sine", "gain": 0.06},
	],
	# Warm bell: 220Hz, triangle, 400ms with natural decay.
	"tier_up": [
		{"freq": 220.0, "dur": 400, "type": "triangle", "gain": 0.10},
	],
	# Soft pop: 300Hz → 200Hz, sine, 60ms.
	"pop": [
		{"freq": 300.0, "freq_end": 200.0, "dur": 60, "type": "sine", "gain": 0.05},
	],
	# Major-chord arpeggio: C4-E4-G4-C5 (262/330/392/524 Hz), square, 80ms each.
	"fanfare": [
		{"freq": 262.0, "dur": 80, "type": "square", "gain": 0.05, "delay": 0.0},
		{"freq": 330.0, "dur": 80, "type": "square", "gain": 0.05, "delay": 0.1},
		{"freq": 392.0, "dur": 80, "type": "square", "gain": 0.05, "delay": 0.2},
		{"freq": 524.0, "dur": 80, "type": "square", "gain": 0.06, "delay": 0.3},
	],
	# Coin shimmer: 600Hz → 800Hz, square, 100ms.
	"coin": [
		{"freq": 600.0, "freq_end": 800.0, "dur": 100, "type": "square", "gain": 0.05},
	],
	# Descending buzz (error/denied): 400Hz → 200Hz, sawtooth, 150ms.
	"buzz": [
		{"freq": 400.0, "freq_end": 200.0, "dur": 150, "type": "sawtooth", "gain": 0.06},
	],
	# Low, slow whoosh (entering the mine): 180Hz → 90Hz, triangle, 350ms.
	"whoosh": [
		{"freq": 180.0, "freq_end": 90.0, "dur": 350, "type": "triangle", "gain": 0.08},
	],
}

var muted: bool = false

var _streams: Dictionary = {}              ## name -> AudioStreamWAV
var _players: Array[AudioStreamPlayer] = []
var _next_player: int = 0                   ## round-robin cursor

func _ready() -> void:
	# Synthesize every SFX into an AudioStreamWAV once.
	for name in SFX:
		_streams[name] = _synth(SFX[name])
	# A small pool of players for overlapping playback (chain_collect + upgrade etc).
	for i in _POOL_SIZE:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)

func set_muted(m: bool) -> void:
	muted = m

## Play a named SFX. No-op when muted, when the name is unknown, or when no stream
## was generated. Grabs the next pooled player (round-robin) so overlapping calls
## don't cut each other off. Safe in headless (dummy driver makes play() a no-op).
func play(name: String) -> void:
	if muted:
		return
	if not _streams.has(name):
		return
	var stream: AudioStream = _streams[name]
	if stream == null:
		return
	if _players.is_empty():
		return
	var p: AudioStreamPlayer = _players[_next_player]
	_next_player = (_next_player + 1) % _players.size()
	p.stream = stream
	p.play()

## True when a stream was generated for `name`.
func has_sfx(name: String) -> bool:
	return _streams.has(name) and _streams[name] != null

## The generated stream for `name`, or null when unknown — handy for the test.
func stream_for(name: String) -> AudioStream:
	return _streams.get(name, null)

# ── synthesis ─────────────────────────────────────────────────────────────────

## Build one AudioStreamWAV from a list of steps. The buffer is long enough to
## cover the latest (delay + dur); each step's samples are summed in at its delay
## offset, then the mix is clamped to [-1,1] and written as 16-bit LE PCM.
func _synth(steps: Array) -> AudioStreamWAV:
	# Total length = max over steps of (delay + dur).
	var total_sec: float = 0.0
	for step in steps:
		var delay: float = float(step.get("delay", 0.0))
		var dur_sec: float = float(int(step["dur"])) / 1000.0
		total_sec = maxf(total_sec, delay + dur_sec)
	var total_samples: int = int(ceil(total_sec * MIX_RATE))
	if total_samples <= 0:
		total_samples = 1

	# Float mix buffer, summed across steps.
	var mix := PackedFloat32Array()
	mix.resize(total_samples)

	for step in steps:
		var freq: float = float(step["freq"])
		var freq_end: float = float(step.get("freq_end", freq))
		var dur_sec: float = float(int(step["dur"])) / 1000.0
		var type: String = String(step["type"])
		var gain: float = float(step.get("gain", 0.06))
		var delay: float = float(step.get("delay", 0.0))

		var start: int = int(round(delay * MIX_RATE))
		var n: int = int(round(dur_sec * MIX_RATE))
		if n <= 0:
			continue
		# Short linear attack (~4ms), then linear decay to 0 over the rest of the
		# step — so tones don't click and bells/whooshes ring out.
		var attack: int = mini(n - 1, int(round(0.004 * MIX_RATE)))
		var phase: float = 0.0
		for i in n:
			var idx: int = start + i
			if idx < 0 or idx >= total_samples:
				continue
			# Frequency glide: lerp freq → freq_end across the step.
			var frac: float = float(i) / float(n)
			var f: float = lerpf(freq, freq_end, frac)
			var sample: float = _osc(type, phase)
			phase += f / float(MIX_RATE)
			# Envelope.
			var env: float = 1.0
			if attack > 0 and i < attack:
				env = float(i) / float(attack)
			else:
				var rem: int = n - i              # samples left including this one
				env = float(rem) / float(n - attack) if (n - attack) > 0 else 0.0
			mix[idx] += sample * gain * env

	# Clamp + convert to 16-bit LE bytes.
	var bytes := PackedByteArray()
	bytes.resize(total_samples * 2)
	for i in total_samples:
		var s: int = int(clampf(mix[i], -1.0, 1.0) * 32767.0)
		bytes[i * 2] = s & 0xFF
		bytes[i * 2 + 1] = (s >> 8) & 0xFF

	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = MIX_RATE
	wav.stereo = false
	wav.data = bytes
	return wav

## One oscillator sample for `type` at fractional `phase` (cycles).
func _osc(type: String, phase: float) -> float:
	var p: float = fposmod(phase, 1.0)
	match type:
		"square":
			return 1.0 if p < 0.5 else -1.0
		"triangle":
			return 2.0 * abs(2.0 * p - 1.0) - 1.0
		"sawtooth":
			return 2.0 * p - 1.0
		_:  # sine
			return sin(TAU * phase)
