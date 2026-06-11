extends CanvasLayer
## The leave-FARMING-SESSION confirmation modal — a parchment card that asks the player to
## confirm ending a live bounded farm RUN early (the top-left "◀ Leave" back button on the
## puzzle board page opens it). This is the farm-run counterpart of LeaveBoardModal (which
## confirms abandoning a mine/harbor EXPEDITION); here the player is on the farm, mid-run,
## and "leaving" means ending the session right now and banking a harvest summary.
##
## WHAT CONFIRM DOES. The modal itself mutates NOTHING — it only signals intent. On Confirm it
## emits `confirmed`; Main reacts by snapshotting the run summary and presenting the run-end
## HarvestModal (whose "Return to Town" path runs GameState.close_season() — the +25 return
## bonus, bond decay, quest reroll, and the run clear that makes the NEXT farm visit start
## fresh). On Cancel it just closes. Keeping the mutation in Main/GameState (single source of
## truth) mirrors LeaveBoardModal.
##
## Mirrors the LeaveBoardModal / HarvestModal pattern: warm-scrim backdrop + centred
## PanelContainer + UiKit-styled buttons, built entirely in code (no .tscn dependency).
##
## NO class_name — preloaded by Main (const LeaveFarmModalScript := preload(...)) so the port
## never needs an --import pass to register it as a global (mirrors LeaveBoardModal / every
## lazy modal).
##
## HEADLESS-TEST CONTRACT
##   Every actionable button is in `_action_buttons` (keys "confirm", "cancel").
##   `_title_label` / `_body_label` are the rendered Labels a test can assert.

var game: GameState

signal closed
## Emitted when the player taps Confirm ("Leave"). Signals intent to Main to end the run with a
## summary (Main snapshots build_run_summary() + opens the run-end HarvestModal). Always followed
## by `closed`.
signal confirmed

## Stable button registry for headless tests. Keys: "confirm", "cancel".
var _action_buttons: Dictionary = {}

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

# Static shell nodes.
var _title_label: Label           ## "Leave the farm?" header
var _body_label: Label            ## the reassurance line (a summary follows; next visit is fresh)
var _confirm_btn: Button          ## "Leave" — the emphasized confirm
var _cancel_btn: Button           ## "Keep Farming" — cancel, stay in the session

# Palette mirrors (LeaveBoardModal tokens).
const COL_TITLE := Palette.INK
const COL_BODY  := Palette.INK_MID
const PANEL_MAX_WIDTH := 440.0

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
## Does NOT show the modal — call open() to present it.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Present the confirm card. Unlike LeaveBoardModal.arm() there is no biome gate — Main only
## opens this while a bounded farm run is live, so it always shows when asked.
func open() -> void:
	if not _built:
		return
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6                                   # same top tier as LeaveBoardModal / HarvestModal
	visible = false

	# Warm-brown scrim (matches LeaveBoardModal / HarvestModal).
	var backdrop := UiKit.make_scrim()
	add_child(backdrop)

	# Full-rect CenterContainer centres the parchment card at its own min size.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	# Shared modal card surface (UiKit.modal_card_box) — one builder for every centred-card modal.
	panel.add_theme_stylebox_override("panel", UiKit.modal_card_box(28))
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 16)
	panel.add_child(col)

	# Title — Cinzel display serif, centred.
	_title_label = Label.new()
	_title_label.text = "Leave the farm?"
	UiKit.set_font_size(_title_label, Typography.Role.TITLE)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	col.add_child(_title_label)

	# Iron hairline under the title (mirrors LeaveBoardModal).
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	# Body — the reassurance line: ending now banks a summary, and the next visit is a fresh run.
	_body_label = Label.new()
	_body_label.text = "End your farming session now? You'll get a harvest summary, and your next visit to the farm starts a fresh run."
	UiKit.set_font_size(_body_label, Typography.Role.SUBHEAD)
	_body_label.add_theme_color_override("font_color", COL_BODY)
	_body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_body_label)

	# Button row — Cancel ("Keep Farming") on the left, Confirm ("Leave") on the right.
	var btn_row := HBoxContainer.new()
	btn_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn_row.add_theme_constant_override("separation", 12)
	col.add_child(btn_row)

	_cancel_btn = Button.new()
	_cancel_btn.text = "Keep Farming"
	_cancel_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_cancel_btn, Palette.IRON, 10, Typography.size(Typography.Role.SUBHEAD))
	_cancel_btn.connect("pressed", Callable(self, "_on_cancel"))
	btn_row.add_child(_cancel_btn)
	_action_buttons["cancel"] = _cancel_btn

	_confirm_btn = Button.new()
	_confirm_btn.text = "Leave"
	_confirm_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Primary confirm — a FILLED ember button so it reads as the emphasized action; "Keep Farming"
	# stays a quiet parchment/iron button (mirrors LeaveBoardModal's weighting).
	UiKit.style_action_button(_confirm_btn, Palette.EMBER, 10, Typography.size(Typography.Role.SUBHEAD))
	_confirm_btn.connect("pressed", Callable(self, "_on_confirm"))
	btn_row.add_child(_confirm_btn)
	_action_buttons["confirm"] = _confirm_btn

# ── action handlers ────────────────────────────────────────────────────────────

## Confirm — emit `confirmed` (Main ends the run + shows the summary) then close.
func _on_confirm() -> void:
	emit_signal("confirmed")
	close()

## Cancel — keep farming, just dismiss the card.
func _on_cancel() -> void:
	close()
