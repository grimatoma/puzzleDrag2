extends CanvasLayer
## The daily login-streak reward modal — a parchment card shown ONCE per login tick
## when a new streak day is claimed (Main fires game.login_tick on launch and, on a
## fresh claim, opens this with the returned day + reward). Also reachable on demand
## via apply_deeplink("daily")/"streak" for QA, where it shows the CURRENT streak day's
## reward without re-granting (the grant already happened in login_tick). Mirrors the
## TutorialModal / StoryModal pattern: warm-scrim backdrop + centred PanelContainer +
## UiKit-styled button, built entirely in code (no .tscn dependency).
##
## FLOW
##   1. Main calls setup(game) once.
##   2. open_for(day, reward) renders "Day N" + the reward chips and shows the modal.
##   3. The player taps "Collect" → the modal emits `collected` then `closed`; Main
##      hides it + resets the router.
##
## SINGLE SOURCE OF TRUTH. The modal NEVER grants anything — the coins/runes/tool were
## already credited by game.login_tick before this opens. The "Collect" button is purely
## an acknowledgement that dismisses the card (matching the React daily_streak modal,
## which is also display-only — LOGIN_TICK does the granting).
##
## NO class_name — preloaded by Main (const DailyStreakModalScript := preload(...)) so the
## port never needs --import to register it as a global (mirrors TutorialModal / StoryModal).
##
## HEADLESS-TEST CONTRACT
##   Every actionable button is in `_action_buttons` (key "collect"). `_title_label`,
##   `_day_label`, and `_reward_label` are the rendered Labels a test can assert.

var game: GameState

signal closed
## Emitted when the player taps Collect. Signals intent to the caller (Main) to hide +
## reset the router. Always followed by `closed`.
signal collected

## Stable button registry for headless tests. Keys: "collect".
var _action_buttons: Dictionary = {}

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

## The day + reward currently presented (set by open_for, read by tests).
var _day: int = 0
var _reward: Dictionary = {}

# Static shell nodes (the day + reward text is set each open_for).
var _title_label: Label           ## "Daily Reward" header (Cinzel serif)
var _day_label: Label             ## "Day N" — the streak day
var _reward_label: Label          ## the reward summary line (coins / runes / tool)
var _collect_btn: Button          ## "Collect" dismiss button

# Palette mirrors (TutorialModal / StoryModal tokens).
const COL_TITLE := Palette.INK
const COL_BODY  := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 420.0

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
## Does NOT show the modal — call open_for(day, reward) to present it.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Render `day` + `reward` and show the modal. The reward dict is the same shape as
## DailyRewardConfig.reward_for_day ({coins?, runes?, tool?, amount?}).
func open_for(day: int, reward: Dictionary) -> void:
	if not _built:
		return
	_day = day
	_reward = reward.duplicate(true)
	_render()
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6                                   # same top tier as TutorialModal (above StoryModal)
	visible = false

	# Warm-brown scrim (matches TutorialModal / StoryModal).
	var backdrop := UiKit.make_scrim()
	add_child(backdrop)

	# Full-rect CenterContainer centres the parchment card at its own min size.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	# Shared modal card surface (UiKit.modal_card_box) — one builder for every
	# centred-card modal so radius/border/shadow can never drift again.
	panel.add_theme_stylebox_override("panel", UiKit.modal_card_box(28))
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 16)
	panel.add_child(col)

	# Title — Cinzel display serif, centred.
	_title_label = Label.new()
	_title_label.text = "Daily Reward"
	_title_label.add_theme_font_size_override("font_size", 28)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
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

	# "Day N" — the prominent streak-day line, in the gold accent.
	_day_label = Label.new()
	_day_label.text = "Day 1"
	_day_label.add_theme_font_size_override("font_size", 34)
	_day_label.add_theme_color_override("font_color", Palette.GOLD)
	_day_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_day_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if heading_font != null:
		_day_label.add_theme_font_override("font", heading_font)
	col.add_child(_day_label)

	# Reward summary — the day's coins / runes / tool grant, wrapping.
	_reward_label = Label.new()
	_reward_label.text = ""
	_reward_label.add_theme_font_size_override("font_size", 19)
	_reward_label.add_theme_color_override("font_color", COL_BODY)
	_reward_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_reward_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_reward_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_reward_label)

	# Collect button — the single dismiss action (the grant already happened).
	_collect_btn = Button.new()
	_collect_btn.text = "Collect"
	_collect_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(_collect_btn, Palette.GO_GREEN, 10, 20)
	_collect_btn.connect("pressed", Callable(self, "_on_collect"))
	col.add_child(_collect_btn)
	_action_buttons["collect"] = _collect_btn

# ── render ─────────────────────────────────────────────────────────────────────

## Render the current day + reward into the labels.
func _render() -> void:
	if not _built:
		return
	_day_label.text = "Day %d" % _day
	_reward_label.text = reward_summary(_reward)

## A player-facing one-line summary of a reward dict ({coins?, runes?, tool?, amount?}).
## Coins read "N ◉", runes read "N runes", a tool reads "Name ×amount" (resolved via
## ToolConfig). Parts are joined with "  ·  ". An empty reward reads "—" so the card
## never shows a blank reward line. Pure + headless-testable.
static func reward_summary(reward: Dictionary) -> String:
	var parts: Array = []
	var coins_amt: int = int(reward.get("coins", 0))
	if coins_amt > 0:
		parts.append("%d ◉" % coins_amt)
	var runes_amt: int = int(reward.get("runes", 0))
	if runes_amt > 0:
		var rune_word: String = "rune" if runes_amt == 1 else "runes"
		parts.append("%d %s" % [runes_amt, rune_word])
	var tool_id: String = String(reward.get("tool", ""))
	if tool_id != "":
		var amount: int = int(reward.get("amount", 1))
		var label: String = ToolConfig.tool_label(tool_id)
		if label == "":
			label = tool_id
		parts.append("%s ×%d" % [label, amount])
	if parts.is_empty():
		return "—"
	return "  ·  ".join(parts)

# ── action handlers ────────────────────────────────────────────────────────────

## Collect — emit `collected` then close (the single exit path). The reward is already
## banked (login_tick granted it); this just acknowledges + dismisses.
func _on_collect() -> void:
	emit_signal("collected")
	close()

# ── pure helpers (testable without rendering internals) ────────────────────────

## The streak day currently presented (0 when none).
func current_day() -> int:
	return _day
