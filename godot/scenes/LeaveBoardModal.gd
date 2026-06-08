extends CanvasLayer
## The leave-expedition confirmation modal — a parchment card that asks the player to
## confirm abandoning an active expedition (mine / harbor) back to the farm. This is the
## port's analogue of the React leave-board confirm dialog (src/ui/Hud.tsx): in the port
## the only "board" you can ABANDON mid-run is an expedition, so leaving = snapping back
## to the farm via GameState.leave_mine()/leave_harbor().
##
## DEFAULT-NO-OP ON THE FARM. The confirm only ARMS when active_biome != "farm". Main
## gates the HUD "🏠 Town" button through arm(): on the farm it opens Town immediately
## (no modal); in an expedition it shows THIS card first, and only Confirm actually leaves.
## So the existing farm flow is unchanged — the modal is purely additive.
##
## Mirrors the TutorialModal / DailyStreakModal pattern: warm-scrim backdrop + centred
## PanelContainer + UiKit-styled buttons, built entirely in code (no .tscn dependency).
##
## FLOW
##   1. Main calls setup(game) once.
##   2. arm() reads active_biome and, when in an expedition, renders the biome-specific
##      prompt and shows the card (returns true). On the farm it returns false WITHOUT
##      showing — the caller then just opens Town as usual.
##   3. Confirm → calls game.leave_mine()/leave_harbor(), emits `confirmed` then `closed`.
##      Cancel → emits `closed` only (nothing leaves).
##
## SINGLE SOURCE OF TRUTH. The ACTUAL leave happens in GameState (leave_mine/leave_harbor);
## Main reacts to `confirmed` by running its existing biome-change refresh path so the board
## re-pools onto the farm (no duplicated swap logic here).
##
## NO class_name — preloaded by Main (const LeaveBoardModalScript := preload(...)) so the
## port never needs --import to register it as a global (mirrors TutorialModal / DailyStreakModal).
##
## HEADLESS-TEST CONTRACT
##   Every actionable button is in `_action_buttons` (keys "confirm", "cancel").
##   `_title_label` / `_body_label` are the rendered Labels a test can assert.
##   `armed_biome()` returns the biome the card is currently confirming a leave FROM
##   ("mine" / "harbor"), or "" when not armed.

var game: GameState

signal closed
## Emitted when the player taps Confirm (AFTER the leave has run on GameState). Signals
## intent to the caller (Main) to run its biome-change refresh + reset the router. Always
## followed by `closed`.
signal confirmed

## Stable button registry for headless tests. Keys: "confirm", "cancel".
var _action_buttons: Dictionary = {}

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

## The biome the card is currently confirming a leave FROM ("mine" | "harbor"), or "" when
## the card is not armed. Set by arm(), read by _on_confirm + tests.
var _armed_biome: String = ""

# Static shell nodes (the prompt text is set each arm()).
var _title_label: Label           ## "Leave the mine?" / "Leave the harbor?" header
var _body_label: Label            ## the reassurance line (unbanked progress stays)
var _confirm_btn: Button          ## "Leave" — the destructive confirm
var _cancel_btn: Button           ## "Stay" — cancel, keep the expedition

# Palette mirrors (TutorialModal / DailyStreakModal tokens).
const COL_TITLE := Palette.INK
const COL_BODY  := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 440.0

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
## Does NOT show the modal — call arm() to (conditionally) present it.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Conditionally present the confirm card. When the player is on an EXPEDITION
## (active_biome != "farm"), render the biome-specific prompt, show the card, and
## return true. On the FARM, do NOTHING and return false (the caller proceeds to open
## Town as usual). This is the single gate that keeps the farm flow unchanged.
func arm() -> bool:
	if not _built or game == null:
		return false
	var biome: String = game.active_biome
	if biome == "farm":
		return false
	_armed_biome = biome
	_render()
	visible = true
	return true

## QA/preview path — present the card for `biome` ("mine"/"harbor") WITHOUT requiring the
## player to actually be on that expedition, and WITHOUT it leaving anything on Confirm
## beyond what game.leave_*() does (which is a no-op on the farm). Used by
## apply_deeplink("leaveboard") + the sanity-capture so the modal can be previewed from any
## state. Defaults to "mine".
func preview(biome: String = "mine") -> void:
	if not _built:
		return
	_armed_biome = biome if biome != "" and biome != "farm" else "mine"
	_render()
	visible = true

func close() -> void:
	visible = false
	_armed_biome = ""
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6                                   # same top tier as TutorialModal / DailyStreakModal
	visible = false

	# Warm-brown scrim (matches TutorialModal / DailyStreakModal).
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

	# Title — Cinzel display serif, centred.
	_title_label = Label.new()
	_title_label.text = "Leave the expedition?"
	_title_label.add_theme_font_size_override("font_size", 27)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	col.add_child(_title_label)

	# Iron hairline under the title (mirrors TutorialModal).
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	# Body — the reassurance line (everything gathered is banked already).
	_body_label = Label.new()
	_body_label.text = ""
	_body_label.add_theme_font_size_override("font_size", 18)
	_body_label.add_theme_color_override("font_color", COL_BODY)
	_body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_body_label)

	# Button row — Cancel ("Stay") on the left, Confirm ("Leave") on the right.
	var btn_row := HBoxContainer.new()
	btn_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn_row.add_theme_constant_override("separation", 12)
	col.add_child(btn_row)

	_cancel_btn = Button.new()
	_cancel_btn.text = "Stay"
	_cancel_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_cancel_btn, Palette.IRON, 10, 18)
	_cancel_btn.connect("pressed", Callable(self, "_on_cancel"))
	btn_row.add_child(_cancel_btn)
	_action_buttons["cancel"] = _cancel_btn

	_confirm_btn = Button.new()
	_confirm_btn.text = "Leave"
	_confirm_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Primary confirm — a FILLED ember button so it reads as the emphasized action (React
	# gives the LEAVE confirm weight); "Stay" stays a quiet parchment/iron button.
	UiKit.style_action_button(_confirm_btn, Palette.EMBER, 10, 18)
	_confirm_btn.connect("pressed", Callable(self, "_on_confirm"))
	btn_row.add_child(_confirm_btn)
	_action_buttons["confirm"] = _confirm_btn

# ── render ─────────────────────────────────────────────────────────────────────

## Render the prompt for the currently-armed biome.
func _render() -> void:
	if not _built:
		return
	_title_label.text = prompt_title(_armed_biome)
	_body_label.text = prompt_body(_armed_biome)

## The biome-specific confirm title. Pure + headless-testable.
static func prompt_title(biome: String) -> String:
	match biome:
		"mine":
			return "Leave the mine?"
		"harbor":
			return "Leave the harbor?"
		_:
			return "Leave the expedition?"

## The reassurance line — everything gathered stays in your stores. Pure + testable.
static func prompt_body(biome: String) -> String:
	var place: String = "the expedition"
	match biome:
		"mine":
			place = "the mine"
		"harbor":
			place = "the harbor"
	return "Leave %s and return to the farm? Unbanked progress stays in your stores." % place

# ── action handlers ────────────────────────────────────────────────────────────

## Confirm — actually leave the armed expedition (the REAL mutation, in GameState),
## emit `confirmed` so Main re-pools the board onto the farm, then close.
func _on_confirm() -> void:
	if game != null:
		match _armed_biome:
			"mine":
				game.leave_mine()
			"harbor":
				game.leave_harbor()
	emit_signal("confirmed")
	close()

## Cancel — keep the expedition, just dismiss the card.
func _on_cancel() -> void:
	close()

# ── pure helpers (testable without rendering internals) ────────────────────────

## The biome the card is currently confirming a leave FROM ("mine" | "harbor"), or ""
## when the card is not armed.
func armed_biome() -> String:
	return _armed_biome
