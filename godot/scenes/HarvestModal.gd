extends CanvasLayer
## The HARVEST season-summary modal (A2) — a parchment card shown when the farm season cycle
## completes (GameState.note_farm_turn returns {harvest:true}). It recaps the season that just
## ended + the turn/economy snapshot and is dismissed by a single "Continue" (the farm
## continues — a fresh Spring cycle has ALREADY begun in state). Mirrors the React parchment
## dialogs (title-cased heading, warm scrim, UiKit-styled CTA) and the DailyStreakModal pattern.
##
## SINGLE SOURCE OF TRUTH. The modal NEVER grants anything — it is purely informational (no
## economy change). note_farm_turn already wrapped the cycle + Main already saved; "Continue"
## just dismisses the card.
##
## NO class_name — preloaded by Main (const HarvestModalScript := preload(...)) so the port
## never needs --import to register it as a global (mirrors DailyStreakModal / StoryModal).
##
## HEADLESS-TEST CONTRACT
##   Every actionable button is in `_action_buttons` (key "continue"). `_title_label`,
##   `_season_label`, and `_recap_label` are the rendered Labels a test can assert. The pure
##   helper recap_line(summary) builds the recap string without a tree.

var game: GameState

signal closed

## Stable button registry for headless tests. Keys: "continue".
var _action_buttons: Dictionary = {}

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

## The summary dict currently presented (set by open_for, read by tests). Shape is the
## note_farm_turn() return: { harvest, season, turns_used, budget, coins, runes }.
var _summary: Dictionary = {}

# Static shell nodes (text set each open_for).
var _title_label: Label            ## "Harvest — {Season} ends" (Cinzel serif, title-cased)
var _season_label: Label           ## the prominent season name that just ended (gold)
var _recap_label: Label            ## the recap line (turns + coins/runes snapshot)
var _continue_btn: Button          ## the single dismiss action

# Palette mirrors (DailyStreakModal / StoryModal tokens).
const COL_TITLE := Palette.INK
const COL_BODY  := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 440.0

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
## Does NOT show the modal — call open_for(summary) to present it.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Render `summary` (the note_farm_turn() dict) and show the modal.
func open_for(summary: Dictionary) -> void:
	if not _built:
		return
	_summary = summary.duplicate(true)
	_render()
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6                                   # top tier (above the HUD + the routed modals)
	visible = false

	# Warm-brown scrim (matches DailyStreakModal / StoryModal). MOUSE_FILTER_STOP so clicks
	# behind it never reach the board; Main's _on_child_entered wires a tap to close().
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

	var heading_font: Font = UiKit.heading_font()

	# Title — Cinzel display serif, centred, title-cased ("Harvest — Winter ends").
	_title_label = Label.new()
	_title_label.text = "Harvest"
	_title_label.add_theme_font_size_override("font_size", 28)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	col.add_child(_title_label)

	# Iron hairline under the title.
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	# The prominent season name that just ended, in the gold accent.
	_season_label = Label.new()
	_season_label.text = ""
	_season_label.add_theme_font_size_override("font_size", 30)
	_season_label.add_theme_color_override("font_color", Palette.GOLD)
	_season_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_season_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if heading_font != null:
		_season_label.add_theme_font_override("font", heading_font)
	col.add_child(_season_label)

	# Recap line — turns spent + the coins/runes snapshot, wrapping.
	_recap_label = Label.new()
	_recap_label.text = ""
	_recap_label.add_theme_font_size_override("font_size", 17)
	_recap_label.add_theme_color_override("font_color", COL_BODY)
	_recap_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_recap_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_recap_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_recap_label)

	# Continue — the single dismiss action (nothing is granted; the cycle already wrapped).
	_continue_btn = Button.new()
	_continue_btn.text = "Continue"
	_continue_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(_continue_btn, Palette.GO_GREEN, 10, 20)
	_continue_btn.connect("pressed", Callable(self, "_on_continue"))
	col.add_child(_continue_btn)
	_action_buttons["continue"] = _continue_btn

# ── render ─────────────────────────────────────────────────────────────────────

## Render the current summary into the labels.
func _render() -> void:
	if not _built:
		return
	var season: String = String(_summary.get("season", "the season"))
	_title_label.text = "Harvest — %s ends" % season
	_season_label.text = "%s harvested" % season
	_recap_label.text = recap_line(_summary)

## A player-facing recap of a harvest summary dict ({season, budget, coins, runes}). Reads
## "A full year of {budget} turns is in. Your stores: N coins · N runes." — informational only.
## Runes are omitted when zero (they appear only after the harbor arc). Pure + headless-testable.
static func recap_line(summary: Dictionary) -> String:
	var budget: int = int(summary.get("budget", 0))
	var coins: int = int(summary.get("coins", 0))
	var runes: int = int(summary.get("runes", 0))
	var stores: Array = ["%d coins" % coins]
	if runes > 0:
		var rune_word: String = "rune" if runes == 1 else "runes"
		stores.append("%d %s" % [runes, rune_word])
	var turns_phrase: String = "A full year of %d turns is in." % budget if budget > 0 else "A full year is in."
	return "%s  A fresh Spring begins. Your stores: %s." % [turns_phrase, "  ·  ".join(stores)]

# ── action handlers ────────────────────────────────────────────────────────────

## Continue — dismiss the card (the fresh Spring cycle already began; nothing to grant).
func _on_continue() -> void:
	close()

# ── pure helpers (testable without rendering internals) ────────────────────────

## The season name currently presented ("" when none).
func current_season() -> String:
	return String(_summary.get("season", ""))
