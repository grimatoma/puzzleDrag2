extends CanvasLayer
## The Hearthlands title splash — the first thing a player sees on launch. A
## full-screen pixel-art dusk vista (the hearth cottage on its moss hill, gold
## windows burning, Hearthwood Vale's distant lights in the valley) with the
## game title set in Cinzel over the night sky. Fades in, breathes (the warm
## window/moon/star glow overlay pulses), then fades out — on tap, ESC/back, or
## automatically after HOLD seconds — and frees itself.
##
## ART  res://assets/splash/splash.png       — 720x1280 scene (x4 nearest from
##                                             a 180x320 native pixel canvas)
##      res://assets/splash/splash_glow.png  — warm-emission overlay, pulsed
## Both are authored by godot/tools/gen_splash.py (deterministic; rerun it to
## restyle the art, the scene code is layout-only). Drawn KEEP_ASPECT_COVERED
## with NEAREST filtering so the pixels stay crisp squares at any viewport.
##
## USAGE (from Main):
##   _splash = SplashScreenScript.new(); add_child(_splash); _splash.setup()
##   _splash.finished.connect(...)   # fires exactly once, after the fade-out
## Main gates creation to real interactive runs (not headless, dialogs enabled),
## the same gate the auto-open town home uses. Layer 12 — above every modal
## (tutorial is 6), so whatever _ready opened underneath is revealed on dismiss.
##
## NO class_name — preloaded by Main (const SplashScreenScript := preload(...))
## so the port never needs --import to register it (mirrors Toast + every modal).
##
## HEADLESS-TEST CONTRACT
##   setup() builds synchronously and flips `visible` true (no animation wait).
##   `is_showing()` reports liveness; close() begins the fade-out exactly once
##   (idempotent); dismiss() hides + emits `finished` IMMEDIATELY (no tween), so
##   headless suites can drive the whole lifecycle without pumping frames.
##   `_title_label` / `_hint_label` / `_art` / `_glow` are inspectable.

## Fired exactly once when the splash is done (faded out or dismissed).
signal finished

const TITLE := "Hearthlands"
const SUBTITLE := "· Hearthwood Vale ·"
const HINT := "Tap to begin"

# Timing (seconds): fade-in, time on screen before auto-dismiss, fade-out.
const FADE_IN := 0.5
const HOLD := 3.2
const FADE_OUT := 0.45
# The glow overlay breathes between these alphas (sine, GLOW_PERIOD per cycle).
const GLOW_LOW := 0.45
const GLOW_HIGH := 1.0
const GLOW_PERIOD := 1.6

var _root: Control                  ## full-rect container every layer hangs off
var _backdrop: ColorRect            ## opaque indigo scrim (direct child — see _build_shell)
var _art: TextureRect               ## the pixel-art scene
var _glow: TextureRect              ## warm-emission overlay (alpha pulsed)
var _title_label: Label
var _subtitle_label: Label
var _hint_label: Label
var _built: bool = false
var _closing: bool = false          ## close() latch — the fade-out runs once
var _done: bool = false             ## finished has been emitted
var _life_tween: Tween              ## fade-in → hold → close
var _glow_tween: Tween              ## looping breathe pulse

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Build + show the splash. Synchronous: `visible` is true when this returns
## (the fade-in tween only animates alpha on top of an already-shown tree).
func setup() -> void:
	if _built:
		return
	_built = true
	layer = 12
	_build_shell()
	visible = true
	_life_tween = create_tween()
	_root.modulate.a = 0.0
	_backdrop.modulate.a = 0.0
	_life_tween.tween_property(_root, "modulate:a", 1.0, FADE_IN)
	_life_tween.parallel().tween_property(_backdrop, "modulate:a", 1.0, FADE_IN)
	_life_tween.tween_interval(HOLD)
	_life_tween.tween_callback(Callable(self, "close"))
	_start_glow_pulse()

## Begin the fade-out (idempotent — tap, ESC and the auto-timer can all race
## here safely; only the first call runs). Ends in dismiss().
func close() -> void:
	if _closing or _done:
		return
	_closing = true
	if _life_tween != null and _life_tween.is_valid():
		_life_tween.kill()
	var out := create_tween()
	out.tween_property(_root, "modulate:a", 0.0, FADE_OUT)
	out.parallel().tween_property(_backdrop, "modulate:a", 0.0, FADE_OUT)
	out.tween_callback(Callable(self, "dismiss"))

## Hide + finish IMMEDIATELY (no animation): emit `finished` once and free.
## The headless-test entry point; also the tail of the animated close().
func dismiss() -> void:
	if _done:
		return
	_done = true
	_closing = true
	for t in [_life_tween, _glow_tween]:
		if t != null and t.is_valid():
			t.kill()
	visible = false
	finished.emit()
	queue_free()

## True while the splash is on screen (built and not yet dismissed).
func is_showing() -> bool:
	return _built and not _done and visible

# ── input ──────────────────────────────────────────────────────────────────────

## Any key/tap skips the splash. The backdrop ColorRect already converts taps
## via Main's auto-wired backdrop dismiss (close()); this catches ESC/back and
## any press the backdrop misses so the splash is never in the player's way.
func _input(event: InputEvent) -> void:
	if _closing or _done:
		return
	if event is InputEventKey and event.pressed:
		close()
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.pressed:
		close()
		get_viewport().set_input_as_handled()

# ── shell ──────────────────────────────────────────────────────────────────────

func _build_shell() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)

	# Backdrop: night-indigo behind the art (covers any extreme aspect ratio the
	# COVERED stretch can't) — and the MOUSE_FILTER_STOP scrim Main's
	# _install_overlay_dismiss auto-wires to close(), giving tap-anywhere-to-skip
	# through the same path every modal uses.
	_backdrop = ColorRect.new()
	_backdrop.color = Color8(0x0e, 0x10, 0x24)   # the art's vignette indigo
	_backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	_backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_backdrop)
	move_child(_backdrop, 0)   # behind _root so labels/art draw above it

	_art = _make_layer("res://assets/splash/splash.png")
	_glow = _make_layer("res://assets/splash/splash_glow.png")

	# Title block — Cinzel over the upper sky (the art keeps that region calm).
	_title_label = _make_text(TITLE, 64, Color8(0xff, 0xd2, 0x48))   # Palette.GOLD_BRIGHT
	_title_label.anchor_top = 0.17
	_title_label.anchor_bottom = 0.17
	_subtitle_label = _make_text(SUBTITLE, Typography.size(Typography.Role.HEADING), Color8(0xe9, 0xdf, 0xc6))   # Palette.DIM
	_subtitle_label.anchor_top = 0.245
	_subtitle_label.anchor_bottom = 0.245

	# Tap hint — bottom band (the art darkens there so it reads), gently blinking.
	_hint_label = _make_text(HINT, Typography.size(Typography.Role.TITLE), Color8(0xf6, 0xef, 0xe0))   # Palette.PARCHMENT
	_hint_label.anchor_top = 0.92
	_hint_label.anchor_bottom = 0.92
	var blink := create_tween().set_loops()
	blink.tween_property(_hint_label, "modulate:a", 0.55, 0.9) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	blink.tween_property(_hint_label, "modulate:a", 1.0, 0.9) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

## A full-rect, aspect-covered, NEAREST-filtered art layer. Returns the node
## (already added under _root); a missing texture leaves the rect empty — the
## indigo backdrop + labels still make a presentable splash (graceful, like
## Tile.gd's placeholder stage).
func _make_layer(path: String) -> TextureRect:
	var tr := TextureRect.new()
	tr.set_anchors_preset(Control.PRESET_FULL_RECT)
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST   # crisp pixel squares
	tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if ResourceLoader.exists(path):
		tr.texture = load(path)
	_root.add_child(tr)
	return tr

## A centred display label (Cinzel when available) with an ink outline + soft
## shadow so it reads over both the star field and the parchment-bright moon.
func _make_text(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.set_anchors_preset(Control.PRESET_FULL_RECT)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color8(0x12, 0x14, 0x2e))
	l.add_theme_constant_override("outline_size", max(4, size / 8))
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
	l.add_theme_constant_override("shadow_offset_y", 3)
	var f: Font = UiKit.heading_font()
	if f != null:
		l.add_theme_font_override("font", f)
	_root.add_child(l)
	return l

## The breathing glow: a looping sine pulse on the emission overlay's alpha.
func _start_glow_pulse() -> void:
	if _glow == null:
		return
	_glow.modulate.a = GLOW_LOW
	_glow_tween = create_tween().set_loops()
	_glow_tween.tween_property(_glow, "modulate:a", GLOW_HIGH, GLOW_PERIOD / 2.0) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_glow_tween.tween_property(_glow, "modulate:a", GLOW_LOW, GLOW_PERIOD / 2.0) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
