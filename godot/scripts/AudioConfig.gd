class_name AudioConfig
extends RefCounted
## SFX sound-design CATALOG — the data table of which sound effects exist and how each
## one is synthesized. Moved verbatim out of the runtime audio service node (Audio.gd) so
## the *content/balance* layer (sounds + their per-step tuning) lives in a `*Config.gd`
## like every other catalog, while Audio.gd keeps only the ENGINE tuning (mix rate, pool
## size, oscillator/envelope synthesis code).
##
## Params mirror the original React+Phaser Web Audio engine (src/audio/index.ts) exactly,
## and are byte-identical to what previously lived inline in Audio.gd — moving them here is
## purely organizational: the generated audio is unchanged.
##
## Step list per SFX. A step is:
##   {freq, freq_end?(glide target), dur(ms), type(sine|square|triangle|sawtooth),
##    gain, delay?(seconds, start offset for arpeggios/sequences)}
## Multi-step sounds (chain_collect, fanfare) sum each step in at its delay.
##
## Registered as a `class_name` global (like ResourceConfig / ToolConfig / RecipeConfig) so
## its const + static helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists. Stateless: never instantiated.
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

# ── Static helpers (usable without an instance) ──────────────────────────────────

## True when `name` names a real SFX entry.
static func has(name: String) -> bool:
	return SFX.has(name)

## The synthesis step list for `name`, or an empty Array for an unknown name.
static func steps(name: String) -> Array:
	if not SFX.has(name):
		return []
	return SFX[name]

## Every SFX name. Unordered (Dictionary key order = insertion order).
static func names() -> Array:
	return SFX.keys()
