extends CanvasLayer
## The HARVEST modal — a parchment card with two modes:
##   • LEGACY season-summary (A2, open_for): shown when the always-on farm season cycle completes
##     (GameState.note_farm_turn returns {harvest:true}). It recaps the season that just ended +
##     the turn/economy snapshot and is dismissed by a single "Continue" (the farm continues — a
##     fresh Spring cycle has ALREADY begun in state).
##   • RUN-END "Return to Town" (Task C, open_for_run_end): shown when a bounded farm RUN reaches
##     its turn budget. It adds a "+N 🪙 return bonus" recap line and the CTA reads "Return to
##     Town" + emits return_to_town (Main wires that to close_season() + reopening the town).
## Mirrors the React parchment dialogs (title-cased heading, warm scrim, UiKit-styled CTA) and the
## DailyStreakModal pattern.
##
## SINGLE SOURCE OF TRUTH. The modal NEVER grants anything — it is purely informational (no
## economy change). note_farm_turn already wrapped the cycle + Main already saved; "Continue"
## just dismisses the card.
##
## NO class_name — preloaded by Main (const HarvestModalScript := preload(...)) so the port
## never needs --import to register it as a global (mirrors DailyStreakModal / StoryModal).
##
## HEADLESS-TEST CONTRACT
##   Every actionable button is in `_action_buttons` — key "continue" (legacy season-summary) and
##   key "return_town" (run-end "Return to Town" CTA). `_title_label`, `_season_label`, and
##   `_recap_label` are the rendered Labels a test can assert. The pure helper recap_line(summary)
##   builds the recap string without a tree.

var game: GameState

signal closed
## Task C — emitted by the RUN-END "Return to Town" CTA (open_for_run_end mode). Main wires this
## to close_season() + reopening the town. The legacy informational open_for() "Continue" path
## does NOT emit it (it just dismisses — the always-on cycle already wrapped a fresh Spring).
signal return_to_town

## Stable button registry for headless tests. Keys: "continue", "return_town".
var _action_buttons: Dictionary = {}

## Task C — true while the modal is showing a bounded-RUN end (open_for_run_end): the recap gains
## a return-bonus line and the CTA reads "Return to Town" + emits return_to_town. False for the
## legacy informational season recap (open_for, "Continue" dismiss). Set per open_*; read by _render.
var _run_end_mode: bool = false

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

## The summary dict currently presented (set by open_for, read by tests). Shape is the
## note_farm_turn() return: { harvest, season, turns_used, budget, coins, runes }.
var _summary: Dictionary = {}

# Static shell nodes (text set each open_for).
var _title_label: Label            ## "Harvest — {Season} ends" (Cinzel serif, title-cased)
var _season_label: Label           ## the prominent season name that just ended (gold)
var _recap_label: Label            ## the recap line (turns + coins/runes snapshot)
var _bonus_label: Label            ## Task C — the "+N 🪙 return bonus" line (run-end mode only)
var _continue_btn: Button          ## the single dismiss action (legacy "Continue" / run-end "Return to Town")

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

## Render `summary` (the note_farm_turn() dict) and show the modal in the LEGACY informational
## season-recap mode (a single "Continue" dismiss; nothing is granted — the always-on cycle has
## already wrapped a fresh Spring). Unchanged for the no-run case.
func open_for(summary: Dictionary) -> void:
	if not _built:
		return
	_run_end_mode = false
	_summary = summary.duplicate(true)
	_render()
	visible = true

## Task C — render the bounded-RUN end summary and show the modal in RUN-END mode: the same recap
## PLUS a "+N 🪙 return bonus" line, and the primary CTA reads "Return to Town" (emitting
## return_to_town → Main runs close_season() + reopens the town). `summary` is the note_farm_turn()
## dict at the ended boundary; the return-bonus number defaults to 25 (SEASON_END_BONUS_COINS) when
## the dict carries no explicit "coins_granted" (note_farm_turn does not — close_season grants it).
func open_for_run_end(summary: Dictionary) -> void:
	if not _built:
		return
	_run_end_mode = true
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

	# Task C — the return-bonus line, shown ONLY in run-end mode (hidden for the legacy recap).
	# Gold to echo the coin reward; text + visibility are set in _render.
	_bonus_label = Label.new()
	_bonus_label.text = ""
	_bonus_label.add_theme_font_size_override("font_size", 17)
	_bonus_label.add_theme_color_override("font_color", Palette.GOLD)
	_bonus_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_bonus_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_bonus_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_bonus_label.visible = false
	col.add_child(_bonus_label)

	# The single primary CTA. Legacy mode → "Continue" (dismiss). Run-end mode → "Return to Town"
	# (emit return_to_town then close). The label + which handler fires are set in _render per mode;
	# the button is registered under BOTH keys so the existing "continue" test contract holds AND
	# run-end tests can find it via "return_town".
	_continue_btn = Button.new()
	_continue_btn.text = "Continue"
	_continue_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(_continue_btn, Palette.GO_GREEN, 10, 20)
	_continue_btn.connect("pressed", Callable(self, "_on_primary_cta"))
	col.add_child(_continue_btn)
	_action_buttons["continue"] = _continue_btn
	_action_buttons["return_town"] = _continue_btn

# ── render ─────────────────────────────────────────────────────────────────────

## Render the current summary into the labels. In RUN-END mode the return-bonus line is shown and
## the CTA reads "Return to Town"; otherwise the legacy "Continue" recap is shown.
func _render() -> void:
	if not _built:
		return
	var season: String = String(_summary.get("season", "the season"))
	_title_label.text = "Harvest — %s ends" % season
	_season_label.text = "%s harvested" % season
	_recap_label.text = recap_line(_summary)
	if _run_end_mode:
		var bonus: int = int(_summary.get("coins_granted", Constants.SEASON_END_BONUS_COINS))
		_bonus_label.text = "+%d 🪙 return bonus" % bonus
		_bonus_label.visible = true
		_continue_btn.text = "Return to Town"
	else:
		_bonus_label.visible = false
		_continue_btn.text = "Continue"

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

## The primary CTA was pressed. RUN-END mode → emit return_to_town (Main runs close_season() +
## reopens the town) THEN close. LEGACY mode → just dismiss (the fresh Spring cycle already began;
## nothing to grant). Emitting before close() keeps the "closed" signal firing last in both modes.
func _on_primary_cta() -> void:
	if _run_end_mode:
		emit_signal("return_to_town")
	close()

# ── pure helpers (testable without rendering internals) ────────────────────────

## The season name currently presented ("" when none).
func current_season() -> String:
	return String(_summary.get("season", ""))
