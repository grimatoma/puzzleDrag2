extends CanvasLayer
## The tutorial onboarding modal — a 6-step parchment card shown ONCE to new
## players (and replayable via the "tutorial" deep-link). Mirrors the StoryModal /
## MenuScreen pattern: warm-scrim backdrop + centred PanelContainer + UiKit-styled
## buttons, built entirely in code (no .tscn dependency).
##
## FLOW
##   1. Main calls setup(game) once, then open() when tutorial_seen is false.
##   2. open() starts at step 0 and shows the modal.
##   3. The player taps Next (or "Got it!" on the last step), advancing through all
##      6 steps. On the last step, or if Skip is pressed at any point, the modal
##      emits `finished` then `closed`, and the caller (Main) marks tutorial_seen.
##   4. The modal can be reopened at any time (replay) by calling open() again.
##
## HEADLESS-TEST CONTRACT
##   Every actionable button is in `_action_buttons`:
##     "next"  — the Next / "Got it!" button (advances to the next step or finishes)
##     "skip"  — the Skip button (finishes immediately)
##   `_step_label` and `_body_label` are the rendered Labels for the test to assert.
##   `_indicator_label` is the "Step k / N" indicator Label.
##
## NO class_name — preloaded by Main (const TutorialModalScript := preload(...))
## so the port never needs --import to register it as a global.

var game: GameState

signal closed
## Emitted when the player completes all steps OR skips. Signals intent to the
## caller (Main) to mark tutorial_seen + save. Always followed by `closed`.
signal finished

## Stable button registry for headless tests. Keys: "next", "skip".
var _action_buttons: Dictionary = {}

## The index of the current step (0-based).
var _current_step: int = 0

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

# Static shell nodes rebuilt each open().
var _title_label: Label           ## step title (Cinzel serif)
var _body_label: Label            ## step body text
var _indicator_label: Label       ## "Step k / N"
var _next_btn: Button             ## "Next" / "Got it!" button
var _skip_btn: Button             ## "Skip" button

# Palette mirrors (StoryModal / MenuScreen tokens).
const COL_TITLE := Palette.INK
const COL_BODY  := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 480.0

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
## Does NOT show the modal — call open() to present step 0.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Start the tutorial at step 0 and show. Safe to call at any time for replay.
func open() -> void:
	if not _built:
		return
	_current_step = 0
	_render_step()
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6                                   # above StoryModal (layer 5) so tutorial reads on top
	visible = false

	# Warm-brown scrim (matches StoryModal / MenuScreen).
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-rect CenterContainer centres the parchment card at its own min size.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(16)
	style.set_content_margin_all(28)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 16)
	panel.add_child(col)

	# Title — Cinzel display serif, large, centred.
	_title_label = Label.new()
	_title_label.text = ""
	_title_label.add_theme_font_size_override("font_size", 28)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	col.add_child(_title_label)

	# Iron hairline under the title (mirrors StoryModal).
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	# Body text — muted ink colour, wrapping.
	_body_label = Label.new()
	_body_label.text = ""
	_body_label.add_theme_font_size_override("font_size", 18)
	_body_label.add_theme_color_override("font_color", COL_BODY)
	_body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_body_label)

	# Step indicator — "Step k / N" in a small muted label.
	_indicator_label = Label.new()
	_indicator_label.text = ""
	_indicator_label.add_theme_font_size_override("font_size", 14)
	_indicator_label.add_theme_color_override("font_color", Palette.INK_MID)
	_indicator_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_indicator_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_indicator_label)

	# Button row — Skip on the left, Next on the right.
	var btn_row := HBoxContainer.new()
	btn_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn_row.add_theme_constant_override("separation", 12)
	col.add_child(btn_row)

	_skip_btn = Button.new()
	_skip_btn.text = "Skip"
	_skip_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_skip_btn, Palette.IRON, 10, 18)
	_skip_btn.connect("pressed", Callable(self, "_on_skip"))
	btn_row.add_child(_skip_btn)
	_action_buttons["skip"] = _skip_btn

	_next_btn = Button.new()
	_next_btn.text = "Next"
	_next_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(_next_btn, Palette.GO_GREEN, 10, 18)
	_next_btn.connect("pressed", Callable(self, "_on_next"))
	btn_row.add_child(_next_btn)
	_action_buttons["next"] = _next_btn

# ── render ─────────────────────────────────────────────────────────────────────

## Render the current step's content and update the Next button label.
func _render_step() -> void:
	if not _built:
		return
	var steps: Array = TutorialConfig.all()
	var total: int = steps.size()
	var idx: int = clampi(_current_step, 0, total - 1)
	var step: Dictionary = steps[idx]
	_title_label.text = String(step.get("title", ""))
	_body_label.text = String(step.get("body", ""))
	_indicator_label.text = "Step %d / %d" % [idx + 1, total]
	_next_btn.text = "Got it!" if idx == total - 1 else "Next"

# ── action handlers ────────────────────────────────────────────────────────────

## Next / "Got it!" — advance one step or finish on the last step.
func _on_next() -> void:
	var total: int = TutorialConfig.count()
	if _current_step >= total - 1:
		_finish()
	else:
		_current_step += 1
		_render_step()

## Skip — finish immediately from wherever we are.
func _on_skip() -> void:
	_finish()

## Emit `finished` then close — the single exit path for both Skip and completion.
func _finish() -> void:
	emit_signal("finished")
	close()
