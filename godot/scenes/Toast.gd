extends CanvasLayer
## A transient on-screen toast — an auto-dismissing parchment bubble that fades in,
## holds, then fades out. The port's lightweight feedback channel for REAL one-off
## events (an order filled, a build completed, a tool summoned) that don't warrant a
## full modal. Styled like the HUD pills (UiKit.make_pill look: rounded parchment,
## iron hairline, ink text) so it reads as part of the cozy journal UI.
##
## Pinned near the BOTTOM-CENTRE of the screen, above the stockpile, so it never
## covers the board drag area or the top-bar pills. MOUSE_FILTER_IGNORE throughout —
## it never eats a click; it's purely informational.
##
## USAGE (from Main):
##   _toast = ToastScript.new(); add_child(_toast); _toast.setup()
##   _toast.show_toast("Order filled! +18 🪙")
## Each call REPLACES whatever's showing (restarts the fade), so a burst of events
## doesn't stack a pile of bubbles — the latest message wins.
##
## NO class_name — preloaded by Main (const ToastScript := preload(...)) so the port
## never needs --import to register it (mirrors the other lazily-created UI nodes).
##
## HEADLESS-TEST CONTRACT
##   `_label` is the rendered message Label. `is_showing()` reports whether a toast is
##   currently visible. `current_text()` returns the live message. dismiss() hides it
##   immediately (used by tests + when a modal takes over). The fade is driven by a
##   Tween, but show_toast() flips `visible` true SYNCHRONOUSLY so a headless test sees
##   it without waiting on the animation.

## The pinned bubble (a PanelContainer styled like a HUD pill); built once in setup().
var _bubble: PanelContainer
var _label: Label                 ## the message text Label
var _built: bool = false
var _tween: Tween                 ## the active fade tween (killed + replaced each show)

# Timing (seconds): fade-in, hold, fade-out. Mirrors a snappy notification feel.
const FADE_IN := 0.18
const HOLD := 2.2
const FADE_OUT := 0.45
# Geometry: the bubble's resting offset_top (above the stockpile card) and how far
# below it the slide-in starts.
const REST_TOP := -150.0
const RISE_PX := 12.0

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Build the static bubble ONCE (hidden). Safe to call again (built once).
func setup() -> void:
	if not _built:
		_build_shell()
		_built = true

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 3                                   # above the HUD (layer 1) + FX (layer 2),
	visible = false                             # below the modals (layer 6)

	# Anchor a full-rect, click-through Control so we can pin the bubble near the
	# bottom-centre regardless of viewport size.
	var anchor := Control.new()
	anchor.set_anchors_preset(Control.PRESET_FULL_RECT)
	anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(anchor)

	# The bubble itself: pinned to the bottom-centre, growing upward. Same rounded
	# parchment-pill look as the HUD pills (UiKit.make_pill), scaled up for a message.
	_bubble = PanelContainer.new()
	_bubble.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_bubble.grow_vertical = Control.GROW_DIRECTION_BEGIN   # grow UP from the bottom anchor
	_bubble.offset_top = REST_TOP                          # sit above the stockpile card
	_bubble.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_bubble.custom_minimum_size = Vector2(0, 0)
	_bubble.add_theme_stylebox_override("panel", _bubble_box())
	anchor.add_child(_bubble)

	var margin := MarginContainer.new()
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_top", 9)
	margin.add_theme_constant_override("margin_bottom", 9)
	_bubble.add_child(margin)

	_label = Label.new()
	_label.text = ""
	UiKit.set_font_size(_label, Typography.Role.SUBHEAD)
	_label.add_theme_color_override("font_color", Palette.INK)
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	# Toast messages are short single lines — DON'T autowrap (autowrap with no width budget
	# collapses the pill to one glyph per line). The label sizes to its text; the bubble then
	# wraps that text snugly. A long message just makes a wider pill (capped by the screen).
	_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	_label.clip_text = false
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		_label.add_theme_font_override("font", heading_font)
	margin.add_child(_label)

## The bubble surface: rounded parchment fill, iron hairline border, soft drop shadow
## — a scaled-up HUD pill so the toast reads as part of the same journal UI.
func _bubble_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT
	sb.border_color = Palette.IRON
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(999)               # fully-rounded pill ends
	sb.shadow_size = 8
	sb.shadow_color = Color(0, 0, 0, 0.22)
	sb.shadow_offset = Vector2(0, 3)
	return sb

# ── show / dismiss ─────────────────────────────────────────────────────────────

## Show `text` as a transient toast: set the message, make the bubble visible, and run
## a fade-in → hold → fade-out tween that hides it at the end. Calling again REPLACES the
## current toast (kills the old tween, restarts). `visible` flips true synchronously so a
## headless test sees the toast immediately (without awaiting the animation). A blank/empty
## `text` is ignored (no phantom empty bubble).
func show_toast(text: String) -> void:
	if not _built:
		setup()
	if text.strip_edges() == "":
		return
	_label.text = text
	visible = true
	# Restart the fade cycle from scratch each call.
	if _tween != null and _tween.is_valid():
		_tween.kill()
	# Set the starting alpha BEFORE the tween so a synchronous read sees a faded-in bubble
	# start point; the tween then animates modulate.a in → hold → out. The bubble also
	# RISES ~12px into its resting spot while fading in (offset_top is reset each call so
	# a replaced mid-flight toast can't drift), then drops back out on the fade.
	_bubble.modulate.a = 0.0
	_bubble.offset_top = REST_TOP + RISE_PX
	_tween = create_tween()
	_tween.set_parallel(true)
	_tween.tween_property(_bubble, "modulate:a", 1.0, FADE_IN)
	_tween.tween_property(_bubble, "offset_top", REST_TOP, FADE_IN * 1.6) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	_tween.set_parallel(false)
	_tween.tween_interval(HOLD)
	_tween.set_parallel(true)
	_tween.tween_property(_bubble, "modulate:a", 0.0, FADE_OUT)
	_tween.tween_property(_bubble, "offset_top", REST_TOP + RISE_PX * 0.5, FADE_OUT) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	_tween.set_parallel(false)
	_tween.tween_callback(Callable(self, "_on_fade_done"))

## Hide the toast immediately, killing any running fade. Used by tests + when a modal
## takes the foreground (so a lingering bubble doesn't bleed through a scrim).
func dismiss() -> void:
	if _tween != null and _tween.is_valid():
		_tween.kill()
		_tween = null
	visible = false
	if _bubble != null:
		_bubble.modulate.a = 1.0
		_bubble.offset_top = REST_TOP

## Fade-out finished — hide the bubble (the tween already drove alpha to 0).
func _on_fade_done() -> void:
	visible = false
	if _bubble != null:
		_bubble.modulate.a = 1.0   # reset for the next show_toast
		_bubble.offset_top = REST_TOP

# ── pure helpers (testable without rendering internals) ────────────────────────

## True while a toast is currently on screen.
func is_showing() -> bool:
	return visible

## The live message text (empty when nothing has been shown).
func current_text() -> String:
	return _label.text if _label != null else ""
